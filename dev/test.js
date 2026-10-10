/* Parlance end-to-end tests (jsdom). Loads the real multi-file app from the folder that holds index.html.
   Usage: npm i jsdom@24 && node dev/test.js path/to/index.html
   Covers: every lesson and story through the UI, the answer checker, merges/backup/sync, stable review keys
   and migrations, live content packs, the update banner, feedback, the owner Studio loop, the film, sounds and the theme song. */
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const INDEX = path.resolve(process.argv[2] || 'index.html');
const page = fs.readFileSync(INDEX, 'utf8');
let fails = 0, passes = 0;
function ok(cond, msg){ if (cond) passes++; else { fails++; if (fails < 80) console.log('FAIL:', msg); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'https://parlance.test/', ROOT = path.dirname(INDEX);
/* serve the app's own files from disk under a real https origin (so localStorage works); block everything else */
class LocalOnly extends ResourceLoader { fetch(url){ if (!url.startsWith(BASE)) return null; const pr = fs.promises.readFile(path.join(ROOT, decodeURIComponent(url.slice(BASE.length).split('?')[0]))); pr.abort = () => {}; return pr; } }
/* a tiny fake of the Web Audio API so every sound and the film score actually run */
function fakeAudio(w){
  const param = () => ({ value: 1, setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(v){ this.value = v; }, setTargetAtTime(){}, cancelScheduledValues(){} });
  const node = () => ({ connect(){}, disconnect(){}, start(){}, stop(){}, frequency: param(), detune: param(), gain: param(), Q: param(), type: 'sine', buffer: null });
  w.AudioContext = function(){ return { currentTime: 0, sampleRate: 8000, state: 'running', destination: {}, resume: async () => {}, createOscillator: node, createGain: node, createBiquadFilter: node, createBufferSource: node, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), createMediaElementSource: el => { w.__routed = el; return node(); } }; };
  w.__audioCalls = 0;
  /* media elements: jsdom has no playback, so track play/pause/seek by hand */
  const MP = w.HTMLMediaElement.prototype;
  Object.defineProperty(MP, 'paused', { configurable: true, get(){ return this.__paused !== false; } });
  Object.defineProperty(MP, 'currentTime', { configurable: true, get(){ return this.__t || 0; }, set(v){ this.__t = +v; } });
  Object.defineProperty(MP, 'readyState', { configurable: true, get(){ return 4; } });
  MP.play = function(){ this.__paused = false; w.__plays = (w.__plays || 0) + 1; return Promise.resolve(); };
  MP.pause = function(){ this.__paused = true; };
  MP.load = function(){};
}
async function makeDom(opts = {}){
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Could not load link|stylesheet/i.test(String(e && e.message))) errors.push('jsdom: ' + (e && (e.stack || e.message))); });
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + page + '</body></html>', {
    url: BASE + 'index.html', runScripts: 'dangerously', resources: new LocalOnly(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w){
      w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function(){}; w.Element.prototype.scrollTo = function(){};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.onerror = (m, s, l, c, e) => errors.push(String(m) + (e && e.stack ? '\n' + e.stack : ''));
      w.addEventListener('unhandledrejection', ev => errors.push('unhandled: ' + (ev.reason && (ev.reason.stack || ev.reason.message || JSON.stringify(ev.reason)))));
      if (opts.seed) for (const [k, v] of Object.entries(opts.seed)) w.localStorage.setItem(k, JSON.stringify(v));
      if (opts.claude) w.claude = opts.claude;
      if (opts.audio !== false) fakeAudio(w);
      if (opts.node){ w.Blob = Blob; w.Response = Response; w.CompressionStream = CompressionStream; w.DecompressionStream = DecompressionStream; }
    }
  });
  await new Promise(r => { if (dom.window.document.readyState === 'complete') r(); else dom.window.addEventListener('load', r); });
  for (let i = 0; i < 50 && !dom.window.__parlance; i++) await sleep(20);
  return { dom, w: dom.window, errors, P: dom.window.__parlance, E: s => dom.window.eval(s) };
}
/* fake shared database with the same surface the app uses (doc/collection/get/set/update/onSnapshot) */
function fakeDB(store, opts = {}){
  const listeners = [];
  const snapOf = p => ({ id: p.split('/').pop(), exists: store.has(p), data: () => store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : undefined });
  const colDocs = c => [...store.keys()].filter(k => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).sort().map(snapOf);
  const notify = p => { for (const l of listeners) if (p.startsWith(l.c + '/')) l.next({ docs: colDocs(l.c), size: colDocs(l.c).length }); };
  const deny = p => opts.readOnly || (opts.denyPrefix && opts.denyPrefix.some(x => p.startsWith(x)));
  const doc = p => ({ id: p.split('/').pop(), path: p,
    async get(){ return snapOf(p); },
    async set(d){ if (deny(p)) throw { code: 'invalid_argument', message: 'nope' }; if (JSON.stringify(d).includes('undefined')) {} store.set(p, JSON.parse(JSON.stringify(d))); notify(p); },
    async update(d){ if (deny(p)) throw { code: 'invalid_argument', message: 'nope' }; if (!store.has(p)) throw { code: 'invalid_argument' }; store.set(p, { ...store.get(p), ...JSON.parse(JSON.stringify(d)) }); notify(p); } });
  return { doc, collection: c => ({ path: c, doc: id => doc(c + '/' + id), async get(){ const docs = colDocs(c); return { docs, size: docs.length, empty: !docs.length }; },
    onSnapshot(next){ const l = { c, next }; listeners.push(l); setTimeout(() => next({ docs: colDocs(c), size: colDocs(c).length }), 5); return () => listeners.splice(listeners.indexOf(l), 1); } }) };
}
function fakeClaude(store, opts = {}){
  const db = fakeDB(store, opts);
  const user = { async id(){ return opts.uid || 'u_test'; }, async me(){ return { id: opts.uid || 'u_test', name: opts.name || 'Matt Colfax', avatarUrl: '' }; }, async isOwner(){ return !!opts.owner; }, async profiles(ids){ const o = {}; ids.forEach(i => o[i] = { name: i === 'u_learner' ? 'Ana' : '' }); return o; } };
  return { use: async n => n === 'db' ? db : n === 'user' ? user : n === 'sample' ? (opts.sample || null) : null };
}

async function main(){
  /* ---------- 1. content engine: every lesson ---------- */
  const A = await makeDom();
  A.P.S.settings.onboarded = true;
  const P = A.P;
  let lessonCount = 0;
  for (const lang of ['de', 'es']){
    for (const u of P.COURSE[lang].units) for (const l of u.lessons){
      lessonCount++;
      for (let rep = 0; rep < 3; rep++){
        const exs = P.buildLesson(l);
        ok(exs.length >= 12, l.id + ' has ' + exs.length + ' exercises');
        for (const ex of exs){
          const tag = l.id + ' ' + ex.type + ' ' + (ex.item ? ex.item.t : ex.blank ? ex.blank.t : '');
          if (ex.options){
            ok(ex.options.includes(ex.correct), tag + ' correct in options');
            ok(new Set(ex.options).size === ex.options.length, tag + ' options unique');
            ok(ex.options.length >= 3, tag + ' options >= 3 (' + ex.options.length + ')');
            const goods = ex.options.filter(o => P.evaluate(ex, o).ok);
            ok(goods.length === 1, tag + ' exactly one correct option, got ' + JSON.stringify(goods));
          }
          let ans;
          switch (ex.type){
            case 'type-t2e': case 'type-e2t': case 'speak': ans = ex.accepted[0]; break;
            case 'bank-e2t': case 'listen': ans = P.tileTokens(ex.item.t).join(' '); break;
            case 'bank-t2e': ans = P.tileTokens(ex.item.e[0]).join(' '); break;
            case 'match': ans = null; ok(new Set(ex.items.map(i => i.e[0])).size === ex.items.length, tag + ' match meanings distinct'); ok(new Set(ex.items.map(i => i.t)).size === ex.items.length, tag + ' match words distinct'); break;
            default: ans = ex.correct;
          }
          if (ex.tiles){ const pool = ex.tiles.slice(); for (const t of ans.split(' ')){ const i = pool.indexOf(t); ok(i >= 0, tag + ' tile missing: ' + t); if (i >= 0) pool.splice(i, 1); } }
          if (ans != null){ const r = P.evaluate(ex, ans); ok(r.ok && r.level === 'exact', tag + ' expected answer accepted: ' + ans + ' -> ' + JSON.stringify(r)); }
          if (ex.type === 'type-t2e' || ex.type === 'type-e2t') for (const a of ex.accepted) ok(P.evaluate(ex, a).ok, tag + ' variant ' + a);
        }
      }
    }
  }
  ok(lessonCount === 152, 'lesson count ' + lessonCount);
  // units sorted by level, ids unique
  for (const lang of ['de', 'es']){ const lv = P.COURSE[lang].units.map(u => ['A1','A2','B1','B2','C1','C2'].indexOf(u.level)); ok(lv.every((x, i) => i === 0 || x >= lv[i - 1]), lang + ' units sorted'); }
  { const ids = new Set(); for (const lang of ['de','es']) for (const u of P.COURSE[lang].units) for (const l of u.lessons){ ok(!ids.has(l.id), 'unique id ' + l.id); ids.add(l.id); ok(l.vocab.length >= 6 && l.sentences.length >= 4 && l.blanks.length === 3, 'shape ' + l.id); for (const b of l.blanks){ ok(b.t.split('___').length === 2, 'blank ' + b.t); ok(new Set(b.o).size === b.o.length, 'blank opts unique ' + b.t); } } }
  /* stories content */
  for (const st of P.STORIES){
    ok(['de','es'].includes(st.lang) && st.items.length >= 8, 'story shape ' + st.id);
    ok(st.items.filter(x => x.q).length >= 2, 'story questions ' + st.id);
    for (const it of st.items){ if (it.q){ ok(it.o.length === 3 && new Set(it.o).size === 3, 'story q opts ' + st.id + ' ' + it.q); } else { ok(P.CAST[it.who] && P.CAST[it.who].lang === st.lang, 'speaker ' + st.id + ' ' + it.who); ok(it.t && it.e, 'line text ' + st.id); } }
  }
  ok(P.STORIES.length === 16, 'stories ' + P.STORIES.length);
  /* glossary */
  ok(P.glossLookup('ich', 'de') && P.glossLookup('ich', 'de').val === 'I', 'gloss ich');
  ok(P.glossLookup('Kaffee', 'de') && /coffee/.test(P.glossLookup('Kaffee', 'de').val), 'gloss Kaffee ' + JSON.stringify(P.glossLookup('Kaffee', 'de')));
  ok(P.glossLookup('Monate', 'de') && P.glossLookup('Monate', 'de').base === 'monat', 'gloss plural ' + JSON.stringify(P.glossLookup('Monate', 'de')));
  ok(P.glossLookup('¿Qué', 'es') && P.glossLookup('¿Qué', 'es').val === 'what', 'gloss que');
  ok(P.glossLookup('verdes', 'es') && /green/.test(P.glossLookup('verdes', 'es').val), 'gloss verdes ' + JSON.stringify(P.glossLookup('verdes', 'es')));

  /* ---------- 2. checker edge cases ---------- */
  const T = (input, accepted, lang, expectOk, expectLevel, opt) => { const r = P.check(input, accepted, lang, opt); ok(r.ok === expectOk && (!expectLevel || r.level === expectLevel), 'check(' + JSON.stringify(input) + ' vs ' + JSON.stringify(accepted[0]) + ') => ' + JSON.stringify(r)); return r; };
  T('nino', ['niño'], 'es', true, 'accent'); T('Ich heisse Matt', ['Ich heiße Matt.'], 'de', true, 'accent'); T('Ich wohne in Oesterreich', ['Ich wohne in Österreich.'], 'de', true, 'accent');
  T('Strasse', ['die Straße'], 'de', false); T('die strasse', ['die Straße'], 'de', true, 'accent');
  T('Que hora es', ['¿Qué hora es?'], 'es', true, 'accent'); T('I live in Bostn', ['I live in Boston.'], 'en', true, 'typo');
  T('Ich heißt Matt', ['Ich heiße Matt.'], 'de', false); T('Ich möchte ein Kaffee', ['Ich möchte einen Kaffee.'], 'de', false);
  T('Ella es alto', ['Ella es alta.'], 'es', false); T('Er hat braune Haar', ['Er hat braune Haare.'], 'de', false);
  T('Espero que estes bien', ['Espero que estés bien.'], 'es', true, 'accent');
  T('Espero que estas bien', ['Espero que estés bien.'], 'es', false);
  T('Espero que estás bien', ['Espero que estés bien.'], 'es', false);
  T("I'm 30 years old", ['I am thirty years old.'], 'en', true, 'exact'); T("It's 7:30", ['It is seven thirty.'], 'en', true, 'exact');
  T("Don't worry, everything will be fine", ['Don’t worry, everything will be fine.'], 'en', true, 'exact');
  T('Do not worry everything will be fine', ['Don’t worry, everything will be fine.'], 'en', true, 'exact');
  T("If I'd known, I would have come", ['If I had known, I would have come.', 'If I’d known, I would have come.'], 'en', true, 'exact');
  T('Are you ok with that', ['Are you okay with that?'], 'en', true, 'exact');
  T('Wenn ich du waere, wuerde ich gehen', ['Wenn ich du wäre, würde ich gehen.'], 'de', true, 'accent');
  T('Si tuviera dinero, compraria una casa', ['Si tuviera dinero, compraría una casa.'], 'es', true, 'accent');
  T('Si tenía dinero, compraría una casa', ['Si tuviera dinero, compraría una casa.'], 'es', false);

  /* ---------- 3. merge + backup ---------- */
  {
    const a = { done: { x: { at: '2026-10-01', acc: 0.8, times: 1 } }, cards: { k1: { n: 1, ts: 100, due: '2026-10-02' }, k2: { n: 0, ts: 300 } }, xp: 40, custom: {}, start: 'A1', startTs: 0 };
    const b = { done: { y: { at: '2026-10-05', acc: 1, times: 2 }, x: { at: '2026-10-03', acc: 0.9, times: 2 } }, cards: { k1: { n: 3, ts: 200, due: '2026-10-09' }, k2: { n: 5, ts: 100 } }, xp: 55, custom: { c1: { t: 'x', e: ['y'] } }, start: 'B1', startTs: 5 };
    const m = P.mergeLang(a, b);
    ok(m.done.x.acc === 0.9 && m.done.x.times === 2 && m.done.y, 'merge done');
    ok(m.cards.k1.n === 3 && m.cards.k2.n === 0, 'merge cards by ts ' + JSON.stringify(m.cards));
    ok(m.xp === 55 && m.start === 'B1' && m.custom.c1, 'merge xp/start/custom');
    const c = P.mergeCore({ settings: { goal: 10, ts: 5, onboarded: true }, days: { d1: { xp: 5, met: false, q: { lessons: 2, combo: 3 }, qs: ['lesson1', 'combo5', 'story'] } }, badges: { first: '2026-10-02' }, stats: { chests: 2 } }, { settings: { goal: 30, ts: 9 }, days: { d1: { xp: 20, met: true, q: { lessons: 1, combo: 6, stories: 1 }, chest: true }, d2: { xp: 3 } }, badges: { first: '2026-10-01', story1: '2026-10-05' }, stats: { chests: 1, bestCombo: 9 } });
    ok(c.settings.goal === 30 && c.settings.onboarded && c.days.d1.xp === 20 && c.days.d1.met && c.days.d2, 'merge core');
    ok(c.days.d1.q.lessons === 2 && c.days.d1.q.combo === 6 && c.days.d1.q.stories === 1 && c.days.d1.chest && c.days.d1.qs.length === 3, 'merge quests ' + JSON.stringify(c.days.d1));
    ok(c.badges.first === '2026-10-01' && c.badges.story1 && c.stats.chests === 2 && c.stats.bestCombo === 9, 'merge badges/stats ' + JSON.stringify([c.badges, c.stats]));
    const ms = P.mergeLang({ stories: { 'de-s1': { at: '2026-10-01', score: 0.5, times: 1 } } }, { stories: { 'de-s1': { at: '2026-10-03', score: 1, times: 1 }, 'de-s2': { at: '2026-10-04', score: 1, times: 1 } } });
    ok(ms.stories['de-s1'].score === 1 && ms.stories['de-s1'].at === '2026-10-03' && ms.stories['de-s2'], 'merge stories');
    const g = P.mergeGen([{ id: 'a', title: 't', vocab: [], sentences: [], blanks: [], createdAt: 2 }], [{ id: 'b', title: 't', vocab: [], sentences: [], blanks: [], createdAt: 1 }, { id: 'a', title: 'old', vocab: [], sentences: [], blanks: [] }]);
    ok(g.length === 2 && g[0].id === 'b' && g.find(x => x.id === 'a').title === 't', 'merge gen');
    P.S.langs.de.done['de-1-1'] = { at: '2026-10-10', acc: 1, times: 1 };
    const code = await P.makeBackupCode();
    const back = await P.readBackup(code);
    ok(code.startsWith('PRL') && back.state.langs.de.done['de-1-1'], 'backup roundtrip ' + code.slice(0, 5));
    delete P.S.langs.de.done['de-1-1'];
  }
  {
    const N = await makeDom({ node: true });
    N.P.S.langs.es.done['es-2-2'] = { at: '2026-10-10', acc: 1, times: 1 };
    const code = await N.P.makeBackupCode();
    const back = await N.P.readBackup(code);
    ok(code.startsWith('PRL1.') && back.state.langs.es.done['es-2-2'], 'compressed backup roundtrip ' + code.length);
    N.dom.window.close();
  }

  /* ---------- 4. drive the UI through every lesson ---------- */
  const w = A.w, E = A.E;
  const Run = () => E('Run');
  const footBtn = label => [...w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === label);
  function answerCurrent(){
    const ex = Run().cur;
    if (ex.type === 'match'){
      const opts = [...w.document.querySelectorAll('.overlay:not(.out) .match .opt')];
      const left = opts.filter((_, i) => i % 2 === 0), right = opts.filter((_, i) => i % 2 === 1);
      for (const it of ex.items){ const L = left.find(b => b.textContent === it.t); const R = right.find(b => b.textContent === it.e[0]); ok(L && R, 'match buttons ' + it.t); L.click(); R.click(); }
      return 'wait';
    }
    let ans;
    switch (ex.type){
      case 'type-t2e': case 'type-e2t': case 'speak': ans = ex.accepted[0]; break;
      case 'bank-e2t': case 'listen': ans = P.tileTokens(ex.item.t).join(' '); break;
      case 'bank-t2e': ans = P.tileTokens(ex.item.e[0]).join(' '); break;
      default: ans = ex.correct;
    }
    const R = Run(); R.value = ans; R.canCheck = true;
    E('doCheck()');
    const foot = w.document.querySelector('.overlay:not(.out) .ov-foot');
    ok(foot.classList.contains('ok'), 'UI accepted ' + ex.type + ' ' + ans + ' foot=' + foot.className + ' txt=' + foot.textContent.slice(0, 90));
    footBtn('Continue').click();
    return 'next';
  }
  async function finishCurrent(){
    let guard = 0;
    while (Run().active && !Run().finished && guard++ < 220){
      if (answerCurrent() === 'wait'){ await sleep(320); const c = footBtn('Continue'); ok(!!c, 'match feedback'); if (c) c.click(); }
    }
  }
  for (const lang of ['de', 'es']){
    E('S.settings.lang=' + JSON.stringify(lang) + ';render()');
    for (const u of P.COURSE[lang].units) for (const l of u.lessons){
      E('startLesson(' + JSON.stringify(l.id) + ')');
      const start = footBtn('Start exercises'); ok(!!start, 'intro ' + l.id); start.click();
      await finishCurrent();
      ok(Run().finished, 'finished ' + l.id);
      ok(!!P.S.langs[lang].done[l.id], 'done ' + l.id);
      ok(w.document.querySelector('.overlay:not(.out) .stamp'), 'stamp');
      footBtn('Continue').click();
    }
    ok(Object.keys(P.S.langs[lang].cards).length > 750, lang + ' cards ' + Object.keys(P.S.langs[lang].cards).length);
    for (const lv of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) ok(E('levelComplete(' + JSON.stringify(lang) + ',' + JSON.stringify(lv) + ')'), lang + ' level complete ' + lv);
    for (const c of Object.values(P.S.langs[lang].cards)) c.due = '2000-01-01';
    for (let round = 0; round < 3; round++){
      E('startReview(false)'); await finishCurrent(); ok(Run().finished, 'review finished'); footBtn('Continue').click();
    }
    ok(Object.values(P.S.langs[lang].cards).filter(c => c.n >= 1).length >= 60, lang + ' reviewed');
    for (const tab of ['learn', 'stories', 'review', 'talk', 'me']){ E('UI.tab=' + JSON.stringify(tab) + '; render()'); ok(w.document.querySelector('#app').children.length > 0, 'tab ' + tab); }
    E('UI.wordFilter="all"; UI.wordLimit=5000; UI.tab="review"; render()'); ok(w.document.querySelectorAll('.wrow').length > 500, 'all words ' + w.document.querySelectorAll('.wrow').length);
    E('UI.wordLimit=0; UI.wordFilter="v"; render()'); ok(w.document.querySelectorAll('.wrow').length === 150 && [...w.document.querySelectorAll('#word-list button')].some(b => b.textContent.startsWith('Show more')), 'word list paging');
    /* stories: read every one through the UI */
    for (const st of P.STORIES.filter(s => s.lang === lang)){
      E('openStory(' + JSON.stringify(st.id) + ')');
      footBtn('Start reading').click();
      let guard = 0;
      while (!E('Story.finished') && guard++ < 60){
        const q = [...w.document.querySelectorAll('.overlay:not(.out) .squiz:not(.solved)')].pop();
        if (q){
          const item = st.items[E('Story.pos') - 1];
          const opts = [...q.querySelectorAll('.opt')];
          const wrong = opts.find(b => b.textContent !== item.o[0]); wrong.click(); footBtn('Check').click();
          ok(wrong.classList.contains('wrong') && !q.classList.contains('solved'), 'story wrong answer marked ' + st.id);
          opts.find(b => b.textContent === item.o[0]).click(); footBtn('Check').click();
          ok(q.classList.contains('solved'), 'story question solved ' + st.id);
        }
        const c = footBtn('Continue') || footBtn('Finish'); ok(!!c, 'story footer ' + st.id + ' pos ' + E('Story.pos')); if (!c) break; c.click();
      }
      ok(E('Story.finished') && P.S.langs[lang].stories[st.id], 'story finished ' + st.id);
      ok(w.document.querySelector('.overlay:not(.out) .stamp'), 'story stamp');
      ok(w.document.querySelectorAll('.overlay:not(.out) .sline').length === 0, 'story complete screen replaced lines');
      footBtn('Continue').click();
      ok(!E('Story.open'), 'story closed');
    }
    ok(P.STORIES.filter(s => s.lang === lang).every(s => P.S.langs[lang].stories[s.id].score === 0), 'stories score reflects misses');
  }
  // custom (talk-correction) review item
  E('S.langs.de.custom["c-de-test"]={t:"Ich habe gestern Fußball gespielt.",e:["I played soccer yesterday."],alt:[],level:"B1"}; S.langs.de.cards["c-de-test|s|0"]={ef:2.5,n:0,iv:0,due:"1999-01-01",ts:1}; S.settings.lang="de"');
  E('startReview(false)'); ok(Run().queue.some(x => x.srs === 'c-de-test|s|0'), 'custom item queued'); await finishCurrent(); footBtn('Continue').click();
  // onboarding
  E('S.settings.onboarded=false; openOnboarding(false)');
  ok(w.document.querySelector('.overlay.onb'), 'onboarding open');
  footBtn('Get started').click();
  [...w.document.querySelectorAll('.big-choice')].find(b => b.textContent.includes('Español')).click();
  footBtn('Continue').click();
  [...w.document.querySelectorAll('.level-opt')].find(b => b.textContent.startsWith('B2')).click();
  footBtn('Continue').click();
  [...w.document.querySelectorAll('.level-opt')].find(b => b.textContent.startsWith('30')).click();
  footBtn('Continue').click();
  footBtn('Start learning').click();
  ok(P.S.settings.onboarded && P.S.settings.lang === 'es' && P.S.settings.goal === 30 && P.S.langs.es.start === 'B2', 'onboarding saved ' + JSON.stringify([P.S.settings.lang, P.S.settings.goal, P.S.langs.es.start]));
  // badges earned along the way
  for (const b of ['first', 'both', 'levelA1', 'levelB1', 'levelC2', 'flawless', 'words1000', 'story1', 'stories8']) ok(P.S.badges[b], 'badge ' + b);
  // gloss popover
  E('S.settings.lang="de"; UI.tab="learn"; render()');
  E('startLesson("de-7-1")');
  const word = w.document.querySelector('.overlay:not(.out) .tip .say.gl .w');
  ok(!!word, 'lesson intro has tappable words');
  if (word){ word.click(); const g = w.document.querySelector('.gloss'); ok(g && g.textContent.length > 2, 'gloss popover ' + (g && g.textContent)); w.document.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true })); }
  E('endRun()');
  // quests + chest
  {
    const ids = P.questIds(); ok(ids.length === 3 && ids.every(id => P.QUESTS[id]), 'quests ' + ids);
    const d = E('dayRec()'); d.q = { lessons: 5, combo: 20, acc: 3, reviews: 50, stories: 3 }; d.xp = Math.max(d.xp, 60); delete d.chest;
    E('render()'); const chest = w.document.querySelector('.chest.ready'); ok(!!chest, 'chest ready');
    const xp0 = E('todayXP()'); const chests0 = P.S.stats.chests || 0; chest.click();
    ok(E('dayRec().chest') && E('todayXP()') === xp0 + 15 && P.S.stats.chests === chests0 + 1, 'chest opened');
    ok(w.document.querySelector('.sheet .chest.big'), 'chest sheet');
    [...w.document.querySelectorAll('.sheet button')].find(b => b.textContent === 'Collect').click();
  }
  // Me tab: calendar + badges
  E('UI.tab="me"; render()');
  ok(w.document.querySelectorAll('.cal-d:not(.pad)').length >= 28 && w.document.querySelectorAll('.badge-cell.on').length >= 9, 'me calendar & badges');
  // streak + SM-2
  const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  P.S.days = {}; for (const d of [0, 1, 2, 4, 5]) P.S.days[k(d)] = { xp: 25, met: true };
  console.log('  streak with one gap:', JSON.stringify(P.streakInfo()));
  const card = { ef: 2.5, n: 0, iv: 0 }; const ivs = []; for (let i = 0; i < 5; i++){ P.srsUpdate(card, 5); ivs.push(card.iv); }
  ok(ivs[0] === 1 && ivs[1] === 3 && ivs[4] > 20, 'sm2 ' + ivs);
  console.log('page errors (A):', A.errors.length ? A.errors.slice(0, 5) : 'none');
  ok(!A.errors.length, 'no page errors');
  A.dom.window.close();

  /* ---------- 5. sync with a fake account store ---------- */
  {
    const store = new Map();
    store.set('data/users/u_test/de', { blob: JSON.stringify({ done: { 'de-1-1': { at: '2026-10-08', acc: 1, times: 1 } }, cards: { 'de-1-1|v|0': { ef: 2.6, n: 2, iv: 3, due: '2026-10-11', ts: 999 } }, xp: 30 }), updatedAt: 1 });
    store.set('data/users/u_test/core', { blob: JSON.stringify({ settings: { lang: 'de', goal: 30, onboarded: true, ts: Date.now() + 1000 }, days: { '2026-10-08': { xp: 30, met: true } } }), updatedAt: 1 });
    const v1 = { settings: { lang: 'de', goal: 20, speaking: true }, days: { '2026-10-09': { xp: 22, met: true } }, langs: { de: { done: { 'de-1-2': { at: '2026-10-09', acc: 0.9, times: 1 } }, cards: { 'de-1-2|v|0': { ef: 2.5, n: 0, iv: 0, due: '2026-10-10' } }, xp: 22 }, es: { done: {}, cards: {}, xp: 0 } }, gen: { de: [], es: [] } };
    const B = await makeDom({ seed: { 'parlance.v1': v1 }, claude: fakeClaude(store) });
    for (let i = 0; i < 30 && B.E('Remote.status') !== 'synced'; i++) await sleep(50);
    ok(B.E('Remote.status') === 'synced', 'sync status ' + B.E('Remote.status'));
    ok(B.P.S.langs.de.done['de-1-1'] && B.P.S.langs.de.done['de-1-2'], 'merged lessons from both devices');
    ok(B.P.S.settings.goal === 30 && B.P.S.settings.onboarded, 'newer settings won, onboarded');
    ok(B.P.S.days['2026-10-08'] && B.P.S.days['2026-10-09'], 'days merged');
    const remoteDe = JSON.parse(store.get('data/users/u_test/de').blob);
    ok(remoteDe.done['de-1-2'] && remoteDe.done['de-1-1'], 'remote got merged progress');
    ok(B.P.S.owner === 'u_test', 'owner adopted');
    // make progress -> pushed
    B.E('startLesson("de-1-3")'); const st = [...B.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start exercises'); st.click();
    B.E('Run.pos = Run.queue.length; nextEx()');
    for (let i = 0; i < 60 && !JSON.parse(store.get('data/users/u_test/de').blob).done['de-1-3']; i++) await sleep(50);
    ok(JSON.parse(store.get('data/users/u_test/de').blob).done['de-1-3'], 'lesson completion pushed to account');
    // another device writes; visibility pull merges
    const other = JSON.parse((store.get("data/users/u_test/es") || { blob: "{}" }).blob);
    store.set('data/users/u_test/es', { blob: JSON.stringify({ ...other, done: { 'es-1-1': { at: '2026-10-10', acc: 1, times: 1 } } }), updatedAt: 2 });
    B.E('endRun(); syncNow(true)');
    for (let i = 0; i < 40 && !B.P.S.langs.es.done['es-1-1']; i++) await sleep(50);
    ok(B.P.S.langs.es.done['es-1-1'], 'pulled progress from another device');
    ok(JSON.parse(B.w.localStorage.getItem('parlance.v2')).langs.es.done['es-1-1'], 'saved locally');
    ok(B.w.document.querySelector('.greet h1').textContent.includes('Matt'), 'greets by name');
    console.log('page errors (B):', B.errors.length ? B.errors.slice(0, 5) : 'none');
    B.dom.window.close();
  }
  {
    const store = new Map();
    const C = await makeDom({ claude: fakeClaude(store, { readOnly: true }) });
    for (let i = 0; i < 30 && C.E('Remote.status') !== 'device'; i++) await sleep(50);
    ok(C.E('Remote.status') === 'device' && C.E('Remote.readOnly'), 'shared viewer falls back to device storage: ' + C.E('Remote.status'));
    await sleep(2700);
    ok(C.w.document.querySelector('.overlay.onb'), 'new viewer gets onboarding');
    C.P.S.langs.es.done['es-1-1'] = { at: '2026-10-10', acc: 1, times: 1 }; C.E('touch("es")');
    ok(JSON.parse(C.w.localStorage.getItem('parlance.v2')).langs.es.done['es-1-1'], 'device save works for shared viewer');
    console.log('page errors (C):', C.errors.length ? C.errors.slice(0, 5) : 'none');
    C.dom.window.close();
  }
  /* ---------- 6. talk with a cast persona (fake Claude) ---------- */
  {
    const prompts = [];
    const sample = async () => ({ text: '' });
    sample.json = async (input) => { prompts.push(input); return { reply: 'Hallo! Was darf es sein?', reply_en: 'Hi! What can I get you?', correction: { needed: prompts.length > 1, corrected: 'Ich hätte gern einen Kaffee.', corrected_en: 'I would like a coffee.', explanation: 'Use hätte gern to order politely.' }, hint: 'Einen Kaffee, bitte.' }; };
    const claude = { use: async n => n === 'sample' ? sample : null };
    const D = await makeDom({ claude, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de' } } } });
    await sleep(80);
    D.E('UI.tab="talk"; render()');
    const scen = D.w.document.querySelector('.scen'); ok(scen && scen.textContent.includes('Lena'), 'scenario shows cast ' + (scen && scen.textContent));
    scen.click(); await sleep(60);
    ok(Array.isArray(prompts[0]) && prompts[0][0].content.includes('Your name is Lena'), 'persona in instructions');
    ok(D.w.document.querySelector('.overlay.talk .msg.tutor') && D.w.document.querySelector('.overlay.talk .msg-row .cast-av'), 'tutor message with avatar');
    D.E('talkSend("Ich will Kaffee")'); await sleep(60);
    ok(D.w.document.querySelector('.overlay.talk .corr'), 'correction shown');
    for (let i = 0; i < 4; i++){ D.E('talkSend("Danke")'); await sleep(30); }
    D.E('endTalk()'); await sleep(30);
    const save = [...D.w.document.querySelectorAll('.sheet button')].find(b => b.textContent.startsWith('Save')); ok(!!save, 'save corrections sheet'); save.click(); await sleep(30);
    ok(D.P.S.stats.talkBest === 5 && D.P.S.badges.talk, 'talk stats + badge ' + JSON.stringify(D.P.S.stats));
    ok(Object.keys(D.P.S.langs.de.custom).length >= 1, 'fix saved to deck');
    console.log('page errors (D):', D.errors.length ? D.errors.slice(0, 5) : 'none');
    ok(!D.errors.length, 'no page errors D');
    D.dom.window.close();
  }
  /* ---------- 7. update safety: stable keys, migrations, live packs, banner ---------- */
  {
    // legacy index keys from v2/v3 saves migrate to stable text keys and keep their schedule
    const legacy = { v: 3, settings: { onboarded: true, lang: 'de', seenVersion: '3.0.0' }, days: {}, langs: { de: { done: { 'de-1-1': { at: '2026-10-01', acc: 1, times: 1 } }, cards: { 'de-1-1|v|0': { ef: 2.6, n: 3, iv: 9, due: '2026-10-20', ts: 5 }, 'de-1-1|s|1': { ef: 2.5, n: 1, iv: 1, due: '2026-10-11', ts: 5 } }, xp: 30 }, es: {} }, gen: { de: [], es: [] } };
    const M = await makeDom({ seed: { 'parlance.v2': legacy } });
    const cards = M.P.S.langs.de.cards;
    ok(cards['de-1-1|v|~hallo'] && cards['de-1-1|v|~hallo'].n === 3 && !cards['de-1-1|v|0'], 'legacy card key migrated ' + JSON.stringify(Object.keys(cards)));
    ok(Object.keys(cards).some(k => k.startsWith('de-1-1|s|~')), 'sentence key migrated');
    ok(M.P.S.v === 4, 'schema version ' + M.P.S.v);
    ok(M.E('dueEntries("de").length + learnedEntries("de").length') >= 2, 'migrated cards resolve');
    // stable keys are unique within every lesson
    for (const lang of ['de', 'es']) for (const l of M.E('coreOrder(' + JSON.stringify(lang) + ')')){ const vk = l.vocab.map((_, i) => M.P.itemKey(l, 'v', i)), sk = l.sentences.map((_, i) => M.P.itemKey(l, 's', i)); ok(new Set(vk).size === vk.length && new Set(sk).size === sk.length, 'unique item keys ' + l.id); }
    // what's new shows once for people updating from an older version
    await sleep(700);
    ok(M.w.document.querySelector('.sheet .whatsnew'), 'what’s new sheet for updaters');
    ok(M.P.S.settings.seenVersion === M.P.APP_VERSION, 'version marked seen');
    [...M.w.document.querySelectorAll('.sheet button')].find(b => b.textContent.includes('go')).click();
    // live content pack: new unit + a patch of an existing lesson + a story; invalid lessons are skipped
    const lessonJSON = { id: 'de-p1-1', title: 'At the bike shop', tip: { title: 'Separable verbs', body: 'The prefix goes to the end: **Ich pumpe den Reifen auf.**', examples: [['Ich repariere das Fahrrad.', 'I’m fixing the bike.']] },
      vocab: [['das Fahrrad', 'bike|bicycle', 'n'], ['der Reifen', 'tire|tyre', 'm'], ['die Kette', 'chain', 'f'], ['reparieren', 'to repair|to fix'], ['die Bremse', 'brake', 'f'], ['das Licht', 'light', 'n']],
      sentences: [['Mein Fahrrad ist kaputt.', 'My bike is broken.'], ['Der Reifen ist platt.', 'The tire is flat.|The tyre is flat.'], ['Können Sie die Bremse reparieren?', 'Can you repair the brake?|Can you fix the brake?'], ['Das Licht geht nicht.', 'The light doesn’t work.|The light is not working.']],
      blanks: [['Ich ___ das Fahrrad.', 'repariere|reparierst|repariert', 'I’m fixing the bike.'], ['Der ___ ist platt.', 'Reifen|Kette|Licht', 'The tire is flat.'], ['Die ___ ist kaputt.', 'Bremse|Reifen|Licht', 'The brake is broken.']] };
    const patched = JSON.parse(JSON.stringify(lessonJSON)); patched.id = 'de-1-1'; patched.title = 'Hello & goodbye (patched)';
    const docs = [{ id: 'bonus-de', kind: 'pack', lang: 'de', title: 'Bikes', units: [{ title: 'Bonus lessons', level: 'A2', lessons: [lessonJSON, { id: 'de-bad', title: 'Broken', vocab: [], sentences: [], blanks: [] }] }], lessons: [patched],
      stories: [{ id: 'de-s99', level: 'A2', title: 'Ein platter Reifen', en: 'A flat tire', scene: 'shop', items: [['emre', 'Hallo Jonas! Was ist los?', 'Hi Jonas! What’s up?'], ['jonas', 'Mein Reifen ist platt.', 'My tire is flat.'], ['?', 'What is wrong?', 'A flat tire|A broken light|A lost key'], ['emre', 'Kein Problem, ich repariere ihn.', 'No problem, I’ll fix it.']] }] },
      { id: 'config', kind: 'config', latest: '99.0.0' }];
    M.P.applyContentDocs(docs);
    ok(M.E('CORE.has("de-p1-1")') && M.E('getLesson("de-p1-1").level') === 'A2', 'pack lesson added at its level');
    ok(M.E('getLesson("de-1-1").title') === 'Hello & goodbye (patched)' && M.P.S.langs.de.done['de-1-1'], 'patch replaces lesson, progress kept');
    ok(!M.E('CORE.has("de-bad")') && M.P.Packs.errors.some(e => e.includes('de-bad')), 'invalid pack lesson skipped: ' + JSON.stringify(M.P.Packs.errors));
    ok(M.P.allStories().some(s => s.id === 'de-s99'), 'pack story added');
    ok(M.w.document.getElementById('update-banner'), 'update banner shows for newer version');
    ok(JSON.parse(M.w.localStorage.getItem('parlance.content')).length === 2, 'content cached for next visit');
    // the new lesson plays end to end
    M.E('startLesson("de-p1-1")'); [...M.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start exercises').click();
    let g = 0; while (M.E('Run.active && !Run.finished') && g++ < 200){ const ex = M.E('Run.cur'); if (ex.type === 'match'){ M.E('Run.cur.items.length'); M.E('showFeedback(Run.cur, {ok:true, level:"exact"})'); } else { const R = M.E('Run'); R.value = ex.type === 'bank-t2e' ? M.P.tileTokens(ex.item.e[0]).join(' ') : ex.type.startsWith('bank') || ex.type === 'listen' ? M.P.tileTokens(ex.item.t).join(' ') : (ex.accepted ? ex.accepted[0] : ex.correct); R.canCheck = true; M.E('doCheck()'); } [...M.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Continue').click(); }
    ok(M.P.S.langs.de.done['de-p1-1'], 'pack lesson completed');
    ok(Object.keys(M.P.S.langs.de.cards).some(k => k.startsWith('de-p1-1|v|~das_fahrrad')), 'pack lesson cards use stable keys');
    // a pack can be switched off and its lessons disappear without touching progress
    M.P.applyContentDocs([{ ...docs[0], enabled: false }]);
    ok(!M.E('CORE.has("de-p1-1")') && M.P.S.langs.de.done['de-p1-1'], 'disabled pack hidden, progress kept');
    ok(M.E('getLesson("de-1-1").title') === 'Hello & goodbye', 'patch removed with the pack');
    ok(!M.w.document.getElementById('update-banner'), 'banner gone without config');
    console.log('page errors (M):', M.errors.length ? M.errors.slice(0, 5) : 'none'); ok(!M.errors.length, 'no page errors M');
    M.dom.window.close();
  }
  /* ---------- 8. feedback + owner Studio loop ---------- */
  {
    const store = new Map();
    store.set('feedback/u_learner', { items: [{ id: 'f1', at: Date.now() - 5000, type: 'content', text: 'My answer "Hi" should count for Hallo', ctx: { lang: 'de', lessonId: 'de-1-1', exType: 'type-t2e' } }, { id: 'f2', at: Date.now() - 4000, type: 'rating', rating: 1, text: 'Too hard', ctx: { lessonId: 'de-7-1' } }] });
    const prompts = [];
    const sample = async () => ({ text: '' });
    sample.json = async (input) => { prompts.push(input); return { proposals: [{ title: 'Accept “hi” for Hallo', kind: 'content', summary: 'Add hi as an accepted answer.', problem: 'Learners type hi.', change: 'In de-1-1 add “hi” to the accepted English for Hallo.', evidence: ['f1'], impact: 2, effort: 1, areas: ['lessons'] }] }; };
    const F = await makeDom({ claude: fakeClaude(store, { owner: true, sample }), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (let i = 0; i < 40 && !(F.P.Live.owner && F.E('Remote.status') === 'synced'); i++) await sleep(40);
    ok(F.P.Live.owner, 'owner detected');
    // learner-side: send feedback from Me
    F.E('UI.tab="me"; render()');
    [...F.w.document.querySelectorAll('button')].find(b => b.textContent.includes('Send feedback')).click();
    F.w.document.querySelector('.sheet textarea').value = 'Add more food words please';
    [...F.w.document.querySelectorAll('.sheet button')].find(b => b.textContent === 'Send').click();
    for (let i = 0; i < 30 && !(store.get('feedback/u_test') || { items: [] }).items.length; i++) await sleep(30);
    ok((store.get('feedback/u_test') || { items: [] }).items.some(x => x.text === 'Add more food words please' && x.ctx && x.ctx.app), 'feedback stored with context');
    // Studio: synthesize, approve, brief
    ok([...F.w.document.querySelectorAll('button')].some(b => b.textContent === 'Open Studio'), 'Studio entry for owner');
    await F.E('openStudio()');
    ok(F.w.document.querySelectorAll('.fb-item').length === 2, 'inbox lists notes (ratings separate) ' + F.w.document.querySelectorAll('.fb-item').length);
    await F.E('synthesize(false)');
    const props = [...store.keys()].filter(k => k.startsWith('proposals/p'));
    ok(props.length === 1 && store.get(props[0]).status === 'pending' && store.get('proposals/_meta').lastSynthAt, 'proposal created pending');
    ok(typeof prompts[0] === 'string' && prompts[0].includes('My answer') && prompts[0].includes('"rating":1'), 'synthesis prompt includes notes and ratings');
    const approve = [...F.w.document.querySelectorAll('.proposal button')].find(b => b.textContent === 'Approve'); ok(!!approve, 'approve button'); approve.click();
    for (let i = 0; i < 30 && store.get(props[0]).status !== 'approved'; i++) await sleep(30);
    ok(store.get(props[0]).status === 'approved' && !('id' in store.get(props[0])), 'proposal approved, stored without id field');
    // content tools: announce + mark latest
    F.E('Studio.tab="content"; drawStudio()');
    F.w.document.querySelector('.overlay.studio input.input').value = 'New stories!';
    [...F.w.document.querySelectorAll('.overlay.studio button')].find(b => b.textContent === 'Send to everyone').click();
    for (let i = 0; i < 30 && !(store.get('content/config') || {}).announce; i++) await sleep(30);
    ok(store.get('content/config').announce.title === 'New stories!', 'announcement stored');
    F.E('closeStudio()');
    // quick rating on a finish screen
    F.E('startLesson("de-1-2")'); [...F.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start exercises').click(); F.E('Run.pos = Run.queue.length; nextEx()');
    const hard = [...F.w.document.querySelectorAll('.overlay:not(.out) .rate button')].find(b => b.textContent === 'Too hard'); ok(!!hard, 'rating chips on finish'); hard.click();
    for (let i = 0; i < 30 && !(store.get('feedback/u_test').items.some(x => x.type === 'rating')); i++) await sleep(30);
    ok(store.get('feedback/u_test').items.some(x => x.type === 'rating' && x.rating === 1 && x.ctx.lessonId === 'de-1-2'), 'rating stored');
    F.E('endRun()');
    console.log('page errors (F):', F.errors.length ? F.errors.slice(0, 5) : 'none'); ok(!F.errors.length, 'no page errors F');
    F.dom.window.close();
    // a view-only shared viewer: feedback can't be written, so the fallback appears and the note stays queued
    const store2 = new Map();
    const V = await makeDom({ claude: fakeClaude(store2, { readOnly: true }), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
    await sleep(200);
    await V.E('queueFeedback({ id: "fx", at: 1, type: "idea", text: "hola", ctx: {} })');
    ok(V.E('Feedback.canWrite') === false && JSON.parse(V.w.localStorage.getItem('parlance.outbox')).length === 1, 'view-only viewer keeps note in outbox');
    V.E('feedbackFallback({ id: "fx", type: "idea", text: "hola" })'); await sleep(30);
    ok([...V.w.document.querySelectorAll('.sheet button')].some(b => b.textContent === 'Copy note'), 'fallback offers copy');
    console.log('page errors (V):', V.errors.length ? V.errors.slice(0, 5) : 'none'); ok(!V.errors.length, 'no page errors V');
    V.dom.window.close();
  }
  /* ---------- 9. film, sounds, parrot ---------- */
  {
    const G = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (const name of Object.keys(G.E('SOUNDS'))) G.E('playSound(' + JSON.stringify(name) + ', 0.5)');
    G.E('openFilm({ autoplay: false })');
    ok(G.w.document.querySelector('.overlay.film .film-svg'), 'film stage');
    for (const t of [0, 3, 6.5, 10.5, 14, 17, 20, 23.5, 25, 28, 30.5, 33, 35.5]){ G.E('filmSeek(' + t + ')'); }
    G.E('filmSeek(12)');
    ok(G.w.document.querySelector('#f-av-lena').style.visibility === 'visible' && G.w.document.querySelector('#f-card0').style.visibility === 'hidden', 'film scene 3 visible, scene 4 not yet');
    ok(/translate\(296/.test(G.w.document.querySelector('#f-pip').getAttribute('transform')), 'Pip position at 12s ' + G.w.document.querySelector('#f-pip').getAttribute('transform'));
    ok(G.w.document.querySelector('.film-cap').textContent.includes('Berlin'), 'caption at 12s');
    G.E('filmSeek(18.5)'); ok(G.w.document.querySelector('#f-pip-in').classList.contains('cheer'), 'Pip mood follows the film');
    G.E('filmPlay()'); await sleep(120); G.E('filmPause()');
    ok(G.E('Film.t') > 18.5, 'film plays forward ' + G.E('Film.t'));
    G.E('filmSeek(35.5)'); [...G.w.document.querySelectorAll('.overlay.film .ov-foot button')].find(b => b.textContent === 'Close').click();
    ok(G.P.S.settings.filmSeen && !G.E('Film.open'), 'film closes and is remembered');
    ok(G.w.document.querySelector('.hero .pip .p-beak') && G.w.document.querySelector('.hero .pip .p-crest'), 'Pip is a parrot');
    for (const m of ['happy', 'cheer', 'think', 'oops', 'sleep', 'wow']) ok(G.E('pipSVG(' + JSON.stringify(m) + ')').includes('p-wing'), 'pip mood ' + m);
    console.log('page errors (G):', G.errors.length ? G.errors.slice(0, 5) : 'none'); ok(!G.errors.length, 'no page errors G');
    G.dom.window.close();
  }
  /* ---------- 10. theme song: home loop, film score, settings, fallbacks ---------- */
  {
    const M = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    const D = M.w.document, E = M.E;
    for (const src of E('MEDIA.song.sources.map(x => x.src)')) ok(fs.existsSync(path.join(ROOT, src)), 'song file is in the app folder: ' + src);
    ok(E('songSrc()') === E('MEDIA.song.sources[0].src'), 'falls back to the first source when the browser won\'t say');
    ok(M.P.S.settings.homeMusic === true && E('Song.mode') === 'off', 'home music is on by default and silent until the first tap');
    ok(D.querySelector('.top .music-btn.on'), 'music button on Home');
    D.body.dispatchEvent(new M.w.Event('pointerdown', { bubbles: true })); await sleep(700);
    ok(E('Song.unlocked') && E('Song.mode') === 'home' && !E('Song.el.paused') && E('Song.el.loop'), 'first tap starts the looping song on Learn');
    ok(Math.abs(E('Song.vol') - E('homeVol()')) < 1e-9 && E('homeVol()') < 0.5, 'plays softly ' + E('homeVol()'));
    E('songDuck(true)'); ok(E('Song.duck') === E('MEDIA.song.duck'), 'a speaking voice lowers the song'); E('songDuck(false)'); ok(E('Song.duck') === 1, 'and it comes back up');
    [...D.querySelectorAll('.tab')].find(b => b.textContent.includes('Me')).click(); await sleep(800);
    ok(E('Song.mode') === 'off' && E('Song.el.paused'), 'song stops off the home screen');
    ok(D.querySelector('#set-homeMusic') && D.querySelector('#music-vol'), 'Me → Sound has the music switch and volume');
    const mv = D.querySelector('#music-vol'); mv.value = '0.3'; mv.dispatchEvent(new M.w.Event('input')); await sleep(50);
    ok(E('Song.mode') === 'preview' && !E('Song.el.paused') && Math.abs(M.P.S.settings.musicVol - 0.3) < 1e-9, 'moving the slider previews the song');
    await sleep(2600); ok(E('Song.mode') === 'off' && E('Song.el.paused'), 'preview stops on its own');
    [...D.querySelectorAll('.tab')].find(b => b.textContent.includes('Learn')).click(); await sleep(500);
    ok(E('Song.mode') === 'home' && !E('Song.el.paused'), 'back on Learn, the song resumes');
    D.querySelector('.top .music-btn').click(); await sleep(800);
    ok(!M.P.S.settings.homeMusic && E('Song.mode') === 'off' && E('Song.el.paused') && D.querySelector('.top .music-btn:not(.on)'), 'music button turns it off');
    D.querySelector('.top .music-btn').click(); await sleep(400);
    ok(M.P.S.settings.homeMusic && E('Song.mode') === 'home' && !E('Song.el.paused'), 'and back on');
    D.querySelector('.hero .btn-primary').click(); await sleep(800);
    ok(E('Run.active') && E('Song.mode') === 'off' && E('Song.el.paused'), 'song stops when a lesson starts');
    E('Run.active = false; closeOverlay(true); render()'); await sleep(500);
    ok(E('Song.mode') === 'home', 'resumes after the lesson');
    E('openFilm({ autoplay: false })'); await sleep(300);
    ok(E('Song.mode') === 'off', 'home music stops when the film opens');
    E('filmSeek(10)'); E('filmPlay()'); await sleep(30);
    ok(E('Song.mode') === 'film' && E('Film.usingSong') && Math.abs(E('Song.el.currentTime') - 10) < 0.05 && !E('Song.el.loop'), 'film plays the song from its playhead');
    E('filmSeek(20)'); ok(Math.abs(E('Song.el.currentTime') - 20) < 0.05, 'seeking the film moves the song');
    E('Song.el.currentTime = 24'); await sleep(80); ok(Math.abs(E('Film.t') - 24) < 0.3, 'the film follows the song clock ' + E('Film.t'));
    const muteBtn = D.querySelector('.f-mute'); muteBtn.click(); await sleep(250); ok(E('Song.el.paused') && E('Film.muted'), 'sound off stops the song'); muteBtn.click(); await sleep(30); ok(!E('Song.el.paused'), 'sound on restarts it');
    E('filmPause()'); await sleep(300); ok(E('Song.el.paused'), 'pause stops the song');
    E('endFilm(false)'); await sleep(1000);
    ok(E('Song.mode') === 'home' && !E('Song.el.paused') && E('Song.el.loop'), 'home music resumes after the film');
    E('Song.local = false; Song.el.dispatchEvent(new Event("error"))');
    ok(E('Song.failed') && E('Song.mode') === 'off', 'a broken song file fails quietly');
    E('openFilm({ autoplay: false })'); E('filmPlay()');
    ok(!E('Film.usingSong') && E('Music.nodes.length') > 0, 'the film falls back to its synthesized score'); E('filmPause(); endFilm(false)');
    ok(E('cleanSettings({ musicVol: 5 }).musicVol') === 1 && E('cleanSettings({ homeMusic: false }).homeMusic') === false && E('cleanSettings({}).homeMusic') === true && E('cleanSettings({}).musicVol') === 0.6, 'music settings are cleaned');
    console.log('page errors (M):', M.errors.length ? M.errors.slice(0, 5) : 'none'); ok(!M.errors.length, 'no page errors M');
    M.dom.window.close();
  }
  {
    /* the local-copy path: the song is fetched once, played from a blob, and its volume runs through Web Audio */
    const N = await makeDom({ node: true, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
    const E = N.E;
    N.w.fetch = async () => new N.w.Response(new Uint8Array([0, 1, 2, 3]));
    N.w.URL.createObjectURL = () => 'blob:parlance-song';
    E('Song.fetching = null; songPrefetch()'); await sleep(50);
    ok(E('Song.url') === 'blob:parlance-song', 'song fetched into a local copy');
    E('songEl()'); ok(E('Song.local') && E('Song.el.getAttribute("src")') === 'blob:parlance-song', 'element plays the local copy');
    E('Song.el.dispatchEvent(new Event("canplay"))');
    ok(E('Song.routed') && N.w.__routed === E('Song.el'), 'volume runs through Web Audio');
    E('Song.vol = 0.4; songApply(0.1)'); ok(Math.abs(E('Song.gain.gain.value') - 0.4) < 1e-9, 'gain follows the volume');
    const N2 = await makeDom({ node: true, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
    N2.w.fetch = async () => new N2.w.Response(new Uint8Array([0])); N2.w.URL.createObjectURL = () => 'blob:refused';
    N2.E('Song.fetching = null; songPrefetch()'); await sleep(50); N2.E('songEl(); Song.el.dispatchEvent(new Event("error"))');
    ok(!N2.E('Song.failed') && !N2.E('Song.local') && /media\/abc-adventure\.mp4$/.test(N2.E('Song.el.getAttribute("src")')), 'if the local copy is refused, it plays the file directly');
    ok(!N.errors.length && !N2.errors.length, 'no page errors N ' + JSON.stringify(N.errors.concat(N2.errors).slice(0, 3)));
    N.dom.window.close(); N2.dom.window.close();
  }
  console.log('PASS', passes, 'FAIL', fails);
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
