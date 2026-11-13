/* Parlance end-to-end tests (jsdom). Loads the real multi-file app from the folder that holds index.html.
   Usage: npm i jsdom@24 && node dev/test.js path/to/index.html
   Covers: every lesson and story through the UI, the answer checker, merges/backup/sync, stable review keys
   and migrations, live content packs, the update banner, feedback, the owner Studio loop, the film, sounds, the theme song,
   recorded voices, the web version and friends (invites, the league, duels, cheers). */
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const INDEX = path.resolve(process.argv[2] || 'index.html');
const page = fs.readFileSync(INDEX, 'utf8');
let fails = 0, passes = 0;
function ok(cond, msg){ if (cond) passes++; else { fails++; if (fails < 80) console.log('FAIL:', msg); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LANG_IDS = ['de', 'es', 'it'];   // the languages the course teaches
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
    url: BASE + 'index.html' + (opts.hash || ''), runScripts: 'dangerously', resources: new LocalOnly(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w){
      w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function(){}; w.Element.prototype.scrollTo = function(){};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.onerror = (m, s, l, c, e) => errors.push(String(m) + (e && e.stack ? '\n' + e.stack : ''));
      w.addEventListener('unhandledrejection', ev => errors.push('unhandled: ' + (ev.reason && (ev.reason.stack || ev.reason.message || JSON.stringify(ev.reason)))));
      if (opts.seed) for (const [k, v] of Object.entries(opts.seed)) w.localStorage.setItem(k, JSON.stringify(v));
      if (opts.storage) for (const [k, v] of Object.entries(opts.storage)) w.localStorage.setItem(k, v);
      if (opts.web){ w.PARLANCE_WEB = true; w.fetch = opts.web.fetch; }   // the web version, as dev/web.js builds it
      if (opts.ua) Object.defineProperty(w.navigator, 'userAgent', { configurable: true, get: () => opts.ua });
      if (opts.standalone) Object.defineProperty(w.navigator, 'standalone', { configurable: true, get: () => true });
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
  const listeners = store.__listeners || (store.__listeners = []);   // shared by every page using this store, like the real database
  const snapOf = p => ({ id: p.split('/').pop(), exists: store.has(p), data: () => store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : undefined });
  const colDocs = c => [...store.keys()].filter(k => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).sort().map(snapOf);
  const notify = p => { for (const l of listeners) if (p.startsWith(l.c + '/')) l.next({ docs: colDocs(l.c), size: colDocs(l.c).length }); };
  const deny = p => opts.readOnly || (opts.denyPrefix && opts.denyPrefix.some(x => p.startsWith(x)));
  const doc = p => ({ id: p.split('/').pop(), path: p,
    async get(){ return snapOf(p); },
    async set(d){ if (deny(p)) throw { code: 'invalid_argument', message: 'nope' }; if (JSON.stringify(d).includes('undefined')) {} store.set(p, JSON.parse(JSON.stringify(d))); notify(p); },
    async update(d){ if (deny(p)) throw { code: 'invalid_argument', message: 'nope' }; if (!store.has(p)) throw { code: 'invalid_argument' }; store.set(p, { ...store.get(p), ...JSON.parse(JSON.stringify(d)) }); notify(p); },
    async delete(){ if (deny(p)) throw { code: 'invalid_argument', message: 'nope' }; store.delete(p); notify(p); } });
  return { doc, collection: c => ({ path: c, doc: id => doc(c + '/' + id), async get(){ const docs = colDocs(c); return { docs, size: docs.length, empty: !docs.length }; },
    onSnapshot(next){ const l = { c, next }; listeners.push(l); setTimeout(() => next({ docs: colDocs(c), size: colDocs(c).length }), 5); return () => listeners.splice(listeners.indexOf(l), 1); } }) };
}
function fakeClaude(store, opts = {}){
  const db = fakeDB(store, opts);
  const user = { async id(){ return opts.uid || 'u_test'; }, async me(){ return { id: opts.uid || 'u_test', name: opts.name || 'Matt Colfax', avatarUrl: '' }; }, async isOwner(){ return !!opts.owner; }, async profiles(ids){ const o = {}; ids.forEach(i => o[i] = { name: i === 'u_learner' ? 'Ana' : '' }); return o; } };
  return { use: async n => n === 'db' ? db : n === 'user' ? user : n === 'sample' ? (opts.sample || null) : null };
}
/* the same, over a network with lag: a read is a snapshot taken when its answer comes back, a write lands a moment after it is sent.
   lag(path, 'get'|'set') gives the delay in ms (default 20). */
function laggyClaude(store, opts = {}, lag = () => 20){
  const base = fakeClaude(store, opts);
  const slow = d => ({ ...d,
    async get(){ await sleep(lag(d.path, 'get')); const s = await d.get(), v = s.exists ? s.data() : undefined; return { ...s, data: () => v === undefined ? undefined : JSON.parse(JSON.stringify(v)) }; },
    async set(v){ const copy = JSON.parse(JSON.stringify(v)); await sleep(lag(d.path, 'set')); return d.set(copy); } });
  return { use: async n => {
    const x = await base.use(n);
    return n === 'db' ? { ...x, doc: p => slow(x.doc(p)), collection: c => { const col = x.collection(c); return { ...col, doc: id => slow(col.doc(id)) }; } } : x;
  } };
}
/* fake Supabase (Auth + the SQL functions in dev/supabase.sql, with the same access rules) for the web version */
function fakeSupabase(store, opts = {}){
  const users = new Map(), tokens = new Map(), refresh = new Map(), owners = new Set(), profiles = new Map(), recovers = []; let n = 0;
  const pub = u => ({ id: u.id, email: u.email, user_metadata: u.meta });
  const issue = id => { const at = 'at' + (++n), rt = 'rt' + n; tokens.set(at, id); refresh.set(rt, id); return { access_token: at, refresh_token: rt, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: pub(users.get(id)) }; };
  const canRead = (p, me) => { const s = p.split('/'); if (s[0] === 'content' && s.length === 2) return true; if (!me) return false;
    if (s[0] === 'data' && s[1] === 'users' && s.length === 4 && s[2] === me) return true; if (s[0] === 'feedback' && s.length === 2 && s[1] === me) return true;
    if (['cards', 'inbox'].includes(s[0]) && s.length === 4) return true;
    return ['proposals', 'feedback'].includes(s[0]) && s.length === 2 && owners.has(me); };
  const canWrite = (p, me) => { if (!me) return false; const s = p.split('/');
    if (s[0] === 'data' && s[1] === 'users' && s.length === 4 && s[2] === me) return true; if (s[0] === 'feedback' && s.length === 2 && s[1] === me) return true;
    if (s[0] === 'cards' && s.length === 4 && s[1] === me) return true; if (s[0] === 'inbox' && s.length === 4 && (s[3] === me || s[1] === me)) return true;
    return ['content', 'proposals', 'feedback'].includes(s[0]) && s.length === 2 && owners.has(me); };
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => body === undefined ? '' : JSON.stringify(body) });
  const denied = p => res(403, { code: '42501', message: 'not allowed ' + p });
  async function fetch(url, init = {}){
    const u = new URL(url), H = init.headers || {}, a = init.body ? JSON.parse(init.body) : {};
    if (!/^sb_publishable_/.test(H.apikey || '')) return res(401, { message: 'No API key found in request' });
    const bearer = (H.Authorization || '').replace(/^Bearer /, ''), me = bearer ? tokens.get(bearer) : null;
    if (bearer && !me) return res(401, { code: 'PGRST301', message: 'JWT expired' });
    if (u.pathname === '/auth/v1/settings') return res(200, { external: { email: true, google: !!opts.google } });
    if (u.pathname === '/auth/v1/signup'){
      if ([...users.values()].some(x => x.email === a.email)) return res(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      const id = '0000000' + (++n) + '-0000-4000-8000-000000000000'; users.set(id, { id, email: a.email, password: a.password, meta: a.data || {} }); return res(200, issue(id));
    }
    if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password'){
      const x = [...users.values()].find(x => x.email === a.email && x.password === a.password);
      return x ? res(200, issue(x.id)) : res(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (u.pathname === '/auth/v1/token'){ const id = refresh.get(a.refresh_token); if (!id) return res(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }); refresh.delete(a.refresh_token); return res(200, issue(id)); }
    if (u.pathname === '/auth/v1/user'){
      if (!me) return res(401, { code: 401, error_code: 'no_authorization', msg: 'No token' });
      const x = users.get(me);
      if (init.method === 'PUT'){
        if (a.password !== undefined){ if (a.password === x.password) return res(422, { code: 422, error_code: 'same_password', msg: 'New password should be different' }); x.password = a.password; }
        if (a.data) x.meta = { ...x.meta, ...a.data };
      }
      return res(200, pub(x));
    }
    if (u.pathname === '/auth/v1/recover'){
      if (opts.mail === false) return res(400, { code: 400, error_code: 'email_address_not_authorized', msg: 'Email address not authorized' });
      recovers.push({ email: a.email, redirect: u.searchParams.get('redirect_to') }); return res(200, {});
    }
    if (u.pathname === '/auth/v1/logout'){ tokens.delete(bearer); return res(204); }
    switch (u.pathname.replace('/rest/v1/rpc/', '')){
      case 'doc_get': return canRead(a.p, me) ? res(200, store.has(a.p) ? store.get(a.p) : null) : denied(a.p);
      case 'doc_list': return res(200, [...store.keys()].filter(k => k.slice(0, k.lastIndexOf('/')) === a.c && canRead(k, me)).sort().map(k => ({ path: k, data: store.get(k) })));
      case 'doc_set': if (!canWrite(a.p, me)) return denied(a.p); store.set(a.p, JSON.parse(JSON.stringify(a.d))); return res(204);
      case 'doc_update': if (!canWrite(a.p, me)) return denied(a.p); if (!store.has(a.p)) return res(400, { code: 'P0002', message: 'no document' }); store.set(a.p, { ...store.get(a.p), ...a.d }); return res(204);
      case 'doc_delete': if (!canWrite(a.p, me)) return denied(a.p); store.delete(a.p); return res(204);
      case 'is_owner': return res(200, !!me && owners.has(me));
      case 'profile_set': if (!me) return denied('profile'); profiles.set(me, a.n); return res(204);
      case 'profile_names': return res(200, me && owners.has(me) ? a.ids.filter(i => profiles.has(i)).map(i => ({ id: i, name: profiles.get(i) })) : []);
    }
    return res(404, { message: 'not found' });
  }
  return { fetch, users, owners, profiles, recovers, issue, opts };
}
function storageOf(w){ const o = {}; for (let i = 0; i < w.localStorage.length; i++){ const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; }

async function main(){
  /* ---------- 0. the style guide's own script parses (it isn't loaded by the app) ---------- */
  for (const [, code] of fs.readFileSync(path.join(ROOT, 'styleguide.html'), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)){
    let err = null; try { new (require('vm').Script)(code); } catch (e) { err = e.message; }
    ok(!err, 'styleguide.html script parses' + (err ? ': ' + err : ''));
  }
  /* ---------- 1. content engine: every lesson ---------- */
  const A = await makeDom();
  A.P.S.settings.onboarded = true;
  const P = A.P;
  let lessonCount = 0, picLessons = 0;
  for (const lang of LANG_IDS){
    for (const u of P.COURSE[lang].units) for (const l of u.lessons){
      lessonCount++;
      for (let rep = 0; rep < 3; rep++){
        const exs = P.buildLesson(l);
        ok(exs.length >= 12, l.id + ' has ' + exs.length + ' exercises');
        // the lesson opens with a small card of words, the idea comes in bites, and every word still gets a question
        ok(exs[0].type === 'teach' && exs[0].mode === 'words' && exs[0].idxs.length <= 3, l.id + ' starts with a few words');
        ok(exs.filter(e => e.type === 'teach' && e.mode === 'words').flatMap(e => e.idxs).sort().join() === l.vocab.map((_, i) => i).sort().join(), l.id + ' teaches every word exactly once');
        { const bites = exs.filter(e => e.type === 'teach' && e.mode === 'concept'); ok(bites.length >= 1 && bites.length <= 3 && bites.every(b => b.bite.body.length <= 520), l.id + ' idea in 1-3 small bites');
          ok(bites.reduce((a, b) => a + b.bite.examples.length, 0) === l.tip.examples.length && bites.reduce((a, b) => a + b.bite.tables.length, 0) === (l.tip.tables || []).length, l.id + ' every example and table is shown');
          const seen = new Set(); let early = true; for (const e of exs){ if (e.type === 'teach' && e.mode === 'words') e.idxs.forEach(i => seen.add(i)); else if (e.kind === 'v' && e.type !== 'match' && !seen.has(l.vocab.indexOf(e.item))) early = false; }
          ok(early, l.id + ' never asks a word before teaching it');
          // ...and never asks a phrase before showing it, nor one that uses a lesson word that hasn't been taught yet
          const met = new Set(), taught = new Set(); let phraseOk = true, readyOk = true;
          const vk = l.vocab.map(v => { const k = P.lexToks(v.t, l.lang), c = k.filter(x => !P.articlesFor(l.lang).has(x)); return c.length ? c : k; });
          for (const e of exs){
            if (e.type === 'teach' && e.mode === 'words') e.idxs.forEach(i => taught.add(i));
            else if (e.type === 'teach' && e.mode === 'phrases') e.lines.forEach(x => met.add(x.t));
            else if (e.kind === 's' || e.type === 'blank'){
              const text = e.type === 'blank' ? P.blankSaid(e.blank) : e.item.t;
              if (!met.has(text)) phraseOk = false;
              const tk = P.lexToks(text, l.lang);
              if (vk.some((k, i) => !taught.has(i) && k.every(x => tk.includes(x)))) readyOk = false;
            }
          }
          ok(phraseOk, l.id + ' shows each phrase before asking it'); ok(readyOk, l.id + ' asks no phrase that uses a word not taught yet'); }
        { /* picture questions: few, of the level's kind, each about a word with a safe picture, with a different picture on every option */
          const pq = exs.filter(e => e.type.startsWith('pic-')), want = A.E('PIC_EX[' + JSON.stringify(l.level) + ']');
          if (rep === 0 && pq.length) picLessons++;
          ok(pq.length <= A.E('PIC_EX.perLesson'), l.id + ' asks at most ' + A.E('PIC_EX.perLesson') + ' picture questions, got ' + pq.length);
          for (const e of pq){
            const pid = P.picQuiz(e.item, l.lang);
            ok(e.type === want && !!pid, l.id + ' ' + e.item.t + ' picture question is the level’s kind and the word has a safe picture');
            if (e.options){ const ids = e.options.map(o => e.pics[o]); ok(ids.every(Boolean) && new Set(ids).size === ids.length && e.pics[e.correct] === pid, l.id + ' ' + e.item.t + ' every option has its own picture and the right one is the word’s'); }
            else ok(e.pic === pid, l.id + ' ' + e.item.t + ' typed picture is the word’s');
          }
        }
        for (const ex of exs.filter(e => e.type !== 'teach')){
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
            case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break;
            case 'bank-e2t': case 'listen': ans = P.tileTokens(ex.item.t).join(' '); break;
            case 'bank-t2e': ans = P.tileTokens(ex.item.e[0]).join(' '); break;
            case 'match': ans = null; ok(new Set(ex.items.map(i => i.e[0])).size === ex.items.length, tag + ' match meanings distinct'); ok(new Set(ex.items.map(i => i.t)).size === ex.items.length, tag + ' match words distinct'); break;
            default: ans = ex.correct;
          }
          if (ex.tiles){ const pool = ex.tiles.slice(); for (const t of ans.split(' ')){ const i = pool.indexOf(t); ok(i >= 0, tag + ' tile missing: ' + t); if (i >= 0) pool.splice(i, 1); } }
          if (ans != null){ const r = P.evaluate(ex, ans); ok(r.ok && r.level === 'exact', tag + ' expected answer accepted: ' + ans + ' -> ' + JSON.stringify(r)); }
          if (ex.type === 'type-t2e' || ex.type === 'type-e2t' || ex.type === 'pic-type') for (const a of ex.accepted) ok(P.evaluate(ex, a).ok, tag + ' variant ' + a);
        }
      }
    }
  }
  ok(lessonCount === 504, 'lesson count ' + lessonCount);
  /* tips: a hand-cut tip (blank lines) gives one bite per paragraph, and a tip without them is cut as it always was */
  { const bodyA = 'One **alpha** idea.\n\nTwo **bravo** idea.\n\nThree **charlie** idea.\n\nFour.';
    const bs = A.E('tipBites(T("t", ' + JSON.stringify(bodyA) + ', [["alpha one", "a"], ["charlie two", "c"]], [["Plain caption", null, [["x", "**bravo**"]]]]))');
    ok(bs.length === 3 && bs[0].body === 'One **alpha** idea.' && bs[1].body === 'Two **bravo** idea.' && bs[2].body === 'Three **charlie** idea. Four.', 'tipBites: blank lines make one bite per paragraph: ' + JSON.stringify(bs.map(b => b.body)));
    ok(bs[0].examples.length === 1 && bs[0].examples[0].t === 'alpha one' && bs[2].examples.length === 1 && bs[2].examples[0].t === 'charlie two' && bs[1].tables.length === 1 && bs[1].tables[0].cap === 'Plain caption' && bs[0].tables.length === 0 && bs[2].tables.length === 0, 'tipBites: blank lines make one bite per paragraph, each example and table with the paragraph that names it');
    const es91 = A.E('tipBites(getLesson("es-9-1").tip)');
    ok(es91.length === 2 && es91[0].body.startsWith('The **present perfect** is') && es91[1].body.startsWith('Regular endings') && es91[0].tables.map(t => t.cap).join('|') === 'haber (the helper)' && es91[1].tables.map(t => t.cap).join('|') === 'Participles' && es91[0].examples.length === 2 && es91[1].examples.length === 1, 'tipBites: a tip without blank lines is cut as before'); }
  { const TIP_PLACES = {
      'es-1-1': [['Buenas noches y gracias.', 'Greeting and when to use it'], ['¡Hola! ¿Cómo estás?', 'Muy bien, gracias.', 'Asking “How are you?”'], ['Buenos días, señora López.']],
      'de-1-1': [['Guten Morgen, Anna!', 'Greetings through the day'], ['Hallo, wie geht’s?'], ['Danke, gut.', 'Auf Wiedersehen, Herr Braun.']],
      'it-1-1': [['Buonasera e grazie.', 'Greeting and when to use it'], ['Ciao, Marco! A presto.', 'Hello and goodbye'], ['Buongiorno, signora Rossi.']],
      'es-1-2': [['Me llamo Matt.', 'llamarse (reflexive): to be called'], ['¿Cómo te llamas?', '¿Cómo se llama usted?', 'tú or usted?'], ['Mi nombre es Lucía.', 'Mucho gusto, Lucía.']],
      'de-1-2': [['Ich heiße Matt.', 'Present of **heißen** (to be called)'], ['Wie heißt du?', 'Wie heißen Sie?'], ['Mein Name ist Lena.', 'Freut mich, Lena!']],
      'it-1-2': [['Mi chiamo Matt.', 'chiamarsi (reflexive): to be called'], ['Come ti chiami?', 'Come si chiama Lei?', 'tu or Lei?'], ['Piacere, Lucia.']],
      'es-1-3': [['¿De dónde eres?', 'Ana es de Colombia.', 'ser (irregular): to be'], ['Vivo en Boston.', 'vivir (regular -ir): to live'], ['Guadalajara es una ciudad de México.']],
      'de-1-3': [['Anna kommt aus Österreich.'], ['Ich wohne in Boston.', 'Wo wohnst du?', 'Present of **kommen** and **wohnen** (regular verbs)'], ['Berlin ist eine Stadt in Deutschland.']],
      'it-1-3': [['Di dove sei?', 'Marco è di Napoli.', 'essere (irregular): to be'], ['Abito a Boston.', 'abitare (regular -are): to live'], ['Roma è una città in Italia.']],
      'es-1-4': [['Ella es doctora.', 'ser or estar?'], ['Estoy cansado.', 'estar (irregular yo): to be'], ['Estamos muy cansados.', 'Agreement of cansado']],
      'de-1-4': [['Ich bin müde.', 'Present of **sein** (to be)'], ['Er ist Lehrer.', 'Jobs: he and she'], ['Mir geht es auch gut.']],
      'it-1-4': [['Sto bene, grazie.'], ['Come stai?', 'stare (irregular): to be, to feel'], ['Siamo molto stanchi.', 'Anna è molto felice.', 'Agreement of stanco']],
      'es-2-1': [['Dos más tres son cinco.'], ['Tengo dos hermanos.', 'Mi hijo tiene siete años.', 'tener (irregular): to have', 'Plurals'], ['Cuesta cinco dólares.', 'costar (o→ue): to cost']],
      'de-2-1': [['Zwei plus drei ist fünf.', 'Numbers 0–10 (and 10 is **zehn**)'], ['Ich habe zwei Brüder.', 'Present of **haben** (to have)', 'Plurals you meet here'], ['Das kostet fünf Euro.', 'Mein Sohn ist sieben Jahre alt.']],
      'it-2-1': [['Due più tre fa cinque.'], ['Ho due fratelli.', 'Mio figlio ha sette anni.', 'avere (irregular): to have'], ['Costa cinque euro.', 'costare: to cost', 'Plurals']],
      'es-2-2': [['Cuesta doce dólares.', 'Numbers'], ['Cuesta cuarenta y cinco dólares.'], ['Tengo treinta años.', '¿Cuántos años tienes?', 'La casa tiene cincuenta años.', 'tener (irregular): to have']],
      'de-2-2': [['Das kostet zwölf Euro.', 'The tens'], ['Das kostet einundzwanzig Euro.', 'Ones first, then **und**, then the tens'], ['Ich bin dreißig Jahre alt.', 'Wie alt bist du?', 'Das Haus ist fünfzig Jahre alt.']],
      'it-2-2': [['Costa dodici euro.'], ['Mia sorella ha ventuno anni.', 'Numbers'], ['Ho trentacinque anni.', 'Quanti anni hai?', 'avere (irregular): to have']],
      'es-2-3': [['Es la una.'], ['Son las tres y media.', 'Saying the time'], ['Voy a llegar tarde.', 'ir (irregular): to go']],
      'de-2-3': [['Es ist drei Uhr.'], ['Es ist halb acht.', 'Es ist Viertel nach zwei.', 'Telling the time'], ['Ich komme zu spät.']],
      'it-2-3': [['È l’una.'], ['Sono le tre e mezza.', 'Saying the time'], ['Arrivo tardi.', 'arrivare (regular -are): to arrive']],
      'es-2-4': [['Los sábados juego tenis.', 'Days with “on”'], ['Hoy es lunes.'], ['El viernes no trabajo.', 'Jugamos tenis el sábado.', 'Two present-tense verbs']],
      'de-2-4': [['Die Woche hat sieben Tage.', 'Which word?'], ['Am Freitag arbeite ich nicht.'], ['Wir spielen am Samstag Tennis.', 'Present of **arbeiten** and **spielen**']],
      'it-2-4': [['Io lavoro il lunedì.', 'Days with “on”'], ['Oggi è lunedì.'], ['Venerdì non lavoro.', 'Sabato giochiamo a tennis.', 'Two present-tense verbs']]
    };
    const plainT = s => String(s).replace(/\*\*/g, '').toLowerCase();
    for (const lang of LANG_IDS) for (const u of P.COURSE[lang].units) for (const l of u.lessons){
      if (!/\n\s*\n/.test(l.tip.body)) continue;
      const bs = A.E('tipBites(getLesson(' + JSON.stringify(l.id) + ').tip)'), paras = l.tip.body.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).length;
      ok(bs.length === Math.min(3, paras), l.id + ' a hand-cut tip has one bite per paragraph, at most three');
      bs.forEach((b, i) => {
        const bolds = [...b.body.matchAll(/\*\*(.+?)\*\*/g)].map(m => plainT(m[1])).filter(w => w.length > 2);
        for (const e of b.examples) ok(bolds.some(w => plainT(e.t).includes(w)), l.id + ' each example and table sits with the paragraph that names it: example ' + e.t + ' in bite ' + i);
        for (const t of b.tables) ok(bolds.some(w => plainT([t.cap, ...(t.head || []), ...t.rows.flat()].join(' ')).includes(w)), l.id + ' each example and table sits with the paragraph that names it: table ' + t.cap + ' in bite ' + i);
      });
    }
    for (const id of Object.keys(TIP_PLACES)){
      if (!/\n\s*\n/.test(A.E('getLesson(' + JSON.stringify(id) + ').tip.body'))) continue;
      const got = A.E('tipBites(getLesson(' + JSON.stringify(id) + ').tip)').map(b => [...b.examples.map(e => e.t), ...b.tables.map(t => t.cap)]);
      ok(JSON.stringify(got) === JSON.stringify(TIP_PLACES[id]), id + ' tip cards hold what the plan says: ' + JSON.stringify(got));
    }
    ok(Object.keys(TIP_PLACES).length === 24 && Object.keys(TIP_PLACES).every(id => { const body = A.E('getLesson(' + JSON.stringify(id) + ').tip.body'); return /\n\s*\n/.test(body) && body.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).length === 3; }), 'all twenty-four unit 1 and unit 2 tips are cut into three paragraphs'); }
  /* the top bar lets the wordmark wrap away instead of being cut mid-word (layout itself is checked in a browser) */
  { const css = fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8'), brand = (css.match(/\n\.brand\{[^}]*\}/) || [''])[0];
    ok(brand.includes('flex-wrap:wrap') && brand.includes('height:26px') && !css.includes('@media (max-width:400px){\n  .brand-name'), 'the top bar lets the wordmark wrap instead of cutting it'); }
  /* article practice: which nouns are asked, how a question is built, and how answers are graded */
  { const gx = (lang, t) => 'genderEx((l => ({ lesson: l, item: l.vocab.find(v => v.t === ' + JSON.stringify(t) + ') }))(coreOrder(' + JSON.stringify(lang) + ').find(l => l.vocab.some(v => v.t === ' + JSON.stringify(t) + '))))';
    const ev = (lang, t, v) => A.E('evaluate(' + gx(lang, t) + ', ' + JSON.stringify(v) + ')');
    const sameJ = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    ok(sameJ(A.E('genderNoun({ t: "die Stadt", g: "f" }, "de")'), { art: 'die', noun: 'Stadt', plural: false }) && A.E('genderNoun({ t: "die Schuhe", g: "pl" }, "de").plural') === true
      && sameJ(A.E('genderNoun({ t: "l’anno", g: "m" }, "it")'), { art: 'l’', noun: 'anno', plural: false }) && A.E('genderNoun({ t: "lo sconto", g: "m" }, "it").art') === 'lo'
      && A.E('genderNoun({ t: "el agua", g: "f" }, "es")') === null && A.E('genderNoun({ t: "hola", g: null }, "es")') === null && A.E('genderClashes("es").has("papa")') === false, 'article practice: which nouns are asked, without their article');
    const opts = (lang, t) => A.E(gx(lang, t) + '.options.join("|")'), types = [['de', 'die Stadt'], ['es', 'la ciudad'], ['it', 'la città'], ['it', 'gli occhi']].map(([l, t]) => A.E('(x => x.type === "gender" && !("key" in x) && !("srs" in x))(' + gx(l, t) + ')'));
    ok(opts('de', 'die Stadt') === 'der|die|das' && opts('es', 'la ciudad') === 'el|la|los|las' && opts('it', 'la città') === 'il|lo|la|l’' && opts('it', 'gli occhi') === 'i|gli|le' && types.every(Boolean), 'article practice: the buttons for each language, and no review card behind a question');
    ok(sameJ(ev('de', 'die Stadt', 'die'), { ok: true, level: 'exact' }) && sameJ(ev('es', 'la ciudad', 'la'), { ok: true, level: 'exact' }) && sameJ(ev('it', 'l’anno', 'l’'), { ok: true, level: 'exact' }) && sameJ(ev('it', 'l’anno', "l'"), { ok: true, level: 'exact' }), 'article practice: the right article counts');
    const w1 = ev('de', 'die Stadt', 'der'), w2 = ev('es', 'la ciudad', 'el'), w3 = ev('it', 'l’anno', 'la'), w4 = ev('de', 'die Schuhe', 'das');
    ok(!w1.ok && w1.level === 'wrong' && !w2.ok && w2.level === 'wrong' && !w3.ok && w3.level === 'wrong' && !w4.ok && w4.note === 'In the plural, every noun takes die.', "article practice: a wrong article doesn't count");
    const n1 = ev('es', 'la ciudad', 'las'), n2 = ev('es', 'los guantes', 'el'), n3 = ev('it', 'l’anno', 'il'), n4 = ev('it', 'lo sconto', 'il'), n5 = ev('it', 'la città', 'l’'), n6 = ev('it', 'gli occhi', 'i');
    ok(n1.ok === false && n1.level === 'article' && n1.note === 'Right gender, but ciudad is singular: la ciudad.' && n2.note === 'Right gender, but guantes is plural: los guantes.' && n2.level === 'article'
      && n3.level === 'article' && n3.note === 'Right gender. Before a vowel, il and la become l’.' && n4.level === 'article' && n4.note === 'Right gender. Before s + consonant, z, gn, ps or y, use lo, not il.'
      && n5.ok === false && n5.level === 'article' && n6.ok === false && n6.level === 'article', "article practice: the right gender in the wrong number or form is a near miss that doesn't count"); }
  /* word pictures: the mapping and the files follow the rules, and enough lessons ask about them (floors: the shipped numbers, rounded down) */
  { const T = require(path.join(ROOT, 'design', 'pictures', 'tools.js')), log = console.log; console.log = () => {};
    let fails; try { fails = await T.check(); } finally { console.log = log; }
    ok(!fails.length, 'word pictures check: ' + fails.slice(0, 3).join(' | '));
    ok(picLessons >= 60, 'lessons that ask a picture question: ' + picLessons);
    // a lesson word whose text means something else elsewhere opts out with '-' (el partido: a party in es-35-1, a match in es-18-1)
    const word = (id, t) => P.COURSE[id.slice(0, 2)].units.flatMap(u => u.lessons).find(l => l.id === id).vocab.find(v => v.t === t);
    ok(P.picFor(word('es-35-1', 'el partido'), 'es') === null && P.picFor(word('es-18-1', 'el partido'), 'es') === 'soccer' && P.picFor(word('de-22-3', 'weit'), 'de') === null && P.picFor(word('de-6-2', 'weit'), 'de') === 'far', 'a word opts out of its text’s picture only in its own lesson'); }
  // units sorted by level, ids unique
  for (const lang of LANG_IDS){ const lv = P.COURSE[lang].units.map(u => ['A1','A2','B1','B2','C1','C2'].indexOf(u.level)); ok(lv.every((x, i) => i === 0 || x >= lv[i - 1]), lang + ' units sorted'); }
  { const ids = new Set(); for (const lang of LANG_IDS) for (const u of P.COURSE[lang].units) for (const l of u.lessons){ ok(!ids.has(l.id), 'unique id ' + l.id); ids.add(l.id); ok(l.vocab.length >= 6 && l.sentences.length >= 4 && l.blanks.length === 3, 'shape ' + l.id); for (const b of l.blanks){ ok(b.t.split('___').length === 2, 'blank ' + b.t); ok(new Set(b.o).size === b.o.length, 'blank opts unique ' + b.t); } } }
  /* stories content */
  for (const st of P.STORIES){
    ok(LANG_IDS.includes(st.lang) && st.items.length >= 8, 'story shape ' + st.id);
    ok(st.items.filter(x => x.q).length >= 2, 'story questions ' + st.id);
    for (const it of st.items){ if (it.q){ ok(it.o.length === 3 && new Set(it.o).size === 3, 'story q opts ' + st.id + ' ' + it.q); } else { ok(P.CAST[it.who] && P.CAST[it.who].lang === st.lang, 'speaker ' + st.id + ' ' + it.who); ok(it.t && it.e, 'line text ' + st.id); } }
  }
  ok(P.STORIES.length === 27, 'stories ' + P.STORIES.length);
  /* cast figures and story scenes (made in Recraft): a portrait is cropped from each character's figure, a scene shows its cast, a story without a scene keeps its drawn one */
  { const CF = A.E('CAST_FIG'), SA = A.E('STORY_ART');
    for (const [id, c] of Object.entries(P.CAST)) if (c.look){
      ok(c.fig && CF[c.fig], 'cast ' + id + ' has a figure'); const [x, y, side] = CF[c.fig].face;
      ok(side > 0 && CF[c.fig].vb.length === 4 && fs.existsSync(path.join(ROOT, 'media', 'cast', c.fig + '.svg')), 'cast ' + id + ' figure file and face crop');
      const svg = A.E('avatarSVG(' + JSON.stringify(id) + ')'); ok(/<image href="media\/cast\/[a-z]+\.svg"/.test(svg) && !/NaN|undefined/.test(svg), 'portrait of ' + id + ' is cropped from its figure');
    }
    { /* a scene made in Recraft shows its cast (none ship yet, so stage one here) */
      A.E('STORY_ART["de-s1"] = { ar: 1.6, who: [["lena", 30, 3, 52, 1], ["jonas", 70, 3, 52, 0]] }');
      const el = A.E('storyArt({ id: "de-s1", scene: "cafe", lang: "de", cast: ["lena", "jonas"] }, "big")');
      ok(el.classList.contains('has-art') && el.querySelector('.scene-bg') && [...el.querySelectorAll('[data-cast]')].map(f => f.dataset.cast).join() === 'lena,jonas' && el.querySelector('.scene-fig.flip'), 'a scene with art shows its cast, the left one turned to face the other');
      ok(el.querySelector('.scene-frame') && el.querySelector('.scene-frame').contains(el.querySelector('.scene-bg')), 'the scene picture sits in a frame that keeps its shape');
      A.E('delete STORY_ART["de-s1"]'); }
    for (const st of P.STORIES){
      const el = A.E('storyArt(' + JSON.stringify({ id: st.id, scene: st.scene, lang: st.lang, cast: st.cast }) + ', "big")'), a = SA[st.id];
      if (a){
        ok(el.classList.contains('has-art') && el.querySelector('.scene-bg') && el.querySelectorAll('[data-cast]').length === a.who.length, st.id + ' scene shows every figure it stages');
        ok(a.who.length >= 1 && a.who.every(w => st.cast.includes(w[0])) && fs.existsSync(path.join(ROOT, 'media', 'scenes', st.id + '.svg')), st.id + ' stages only its own cast, and its scene file exists');
      } else ok(el.classList.contains('scene') && el.querySelector('svg') && !el.querySelector('[data-cast]'), st.id + ' keeps its drawn scene');
    }
    const packed = A.E('storyArt({ id: "pack-x", scene: "nowhere", lang: "de", cast: [] }, "")'); ok(packed.classList.contains('scene') && packed.querySelector('svg'), 'a pack story with an unknown scene still draws one'); }
  /* every word in every story has a meaning when tapped, learned yet or not */
  for (const st of P.STORIES) for (const it of st.items) if (it.t) for (const part of it.t.split(/\s+/)){
    if (!/[\p{L}]/u.test(part)) continue;
    const core = A.E('coreWord(' + JSON.stringify(part) + ')');
    ok(P.glossLookup(core, st.lang), 'story word has a meaning: ' + st.id + ' ' + core);
  }
  { const g = (wd, l) => P.glossLookup(wd, l) || {};
    ok(g('bezahlst', 'de').base === 'bezahlen' && g('gewartet', 'de').base === 'warten' && g('angerufen', 'de').base === 'anrufen' && g('vende', 'es').base === 'vender' && g('llegamos', 'es').base === 'llegar', 'verb forms find their dictionary form');
    ok(g('Küche', 'de').val === 'kitchen' && g('Este', 'es').val === 'this' && /Lena/.test(g('Lena', 'de').val) && /landlord/.test(g('Brandt', 'de').val) && /taxi/i.test(g('Valentina', 'es').val), 'look-alikes and names ' + JSON.stringify([g('Küche', 'de'), g('Brandt', 'de')])); }
  /* the cast: a portrait for everyone, Talk scenes played by someone who speaks the language, a part for every friend */
  for (const [id, c] of Object.entries(P.CAST)){
    if (id === 'pip') continue;
    const svg = A.E('avatarSVG(' + JSON.stringify(id) + ')');
    ok(LANG_IDS.includes(c.lang) && c.look && A.E('!!HAIR[' + JSON.stringify(c.look.style) + ']') && svg.startsWith('<svg') && !/NaN|undefined/.test(svg), 'portrait ' + id);
    ok(P.STORIES.some(s => s.cast.includes(id)) || A.E('SCENARIOS').some(sc => sc.cast[c.lang] === id), 'has a story or a Talk scene ' + id);
  }
  for (const sc of A.E('SCENARIOS')) for (const lang of LANG_IDS){ const who = sc.cast[lang]; ok(who === 'pip' || (P.CAST[who] && P.CAST[who].lang === lang), 'Talk ' + sc.id + ' ' + lang + ' is played by ' + who); }
  /* the drawn portrait is still what a character without a figure gets (a live pack could add one), with every look it supports */
  { const drawn = id => A.E('(() => { const c = CAST[' + JSON.stringify(id) + '], k = c.fig; c.fig = ""; try { return avatarSVG(' + JSON.stringify(id) + '); } finally { c.fig = k; } })()');
    ok(drawn('leyla').includes('evenodd') && drawn('brandt').includes(P.CAST.brandt.look.tie) && drawn('valentina').includes(P.CAST.valentina.look.ribbon), 'new looks: headscarf, tie, braid ribbons'); }
  ok(A.E('FILM_CAST').map(r => r.length).join() === '6,6,6' && A.E('FILM_CAST.flat().length') === Object.entries(P.CAST).filter(([id, c]) => id !== 'pip' && ['de', 'es', 'it'].includes(c.lang)).length, 'the film meets the Berlin, Mexico City and Rome cast ' + JSON.stringify(A.E('FILM_CAST')));
  ok(A.E('FILM_CAST.every((row, r) => row.every((id, i) => FILM_CUES.some(c => c[1] === "pop" && Math.abs(c[0] - filmCastAt(r, i).t) < 0.01)))'), 'a pop for every face in the film');
  ok(A.E('FILM_CUES.every(c => SOUNDS[c[1]] && c[0] >= 0 && c[0] < FILM_DUR)') && A.E('FILM_CAPTIONS.every(c => c[0] < c[1] && c[1] <= FILM_DUR + 1)') && Math.abs(A.E('bar(1) - bar(0)') - 240 / 99) < 1e-9, 'film cues use real sounds and captions are in order');
  { const ch = A.E('chestSVG()'); ok(['ch-lid', 'ch-lidup', 'ch-loot', 'ch-fly', 'ch-rays', 'ch-spark'].every(k => ch.includes('class="' + k)) && !/NaN|undefined/.test(ch) && A.E('chestSVG()') === ch, 'chest drawing'); }
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
  /* Italian: accents, elisions, and the wrong form of the right word */
  T('Perche sei stanco', ['Perché sei stanco?'], 'it', true, 'accent'); T('E un caffe', ['È un caffè.'], 'it', true, 'accent');
  T('Mangio la pastta', ['Mangio la pasta.'], 'it', true, 'typo'); T('Vorrei l acqua', ['Vorrei l’acqua.'], 'it', true);
  T('Io sono stanca', ['Io sono stanco.'], 'it', false); T('Ho due fratello', ['Ho due fratelli.'], 'it', false);
  T('Se avessi tempo viaggerei', ['Se avessi tempo, viaggerei.'], 'it', true, 'exact'); T('Se avrei tempo, viaggerei', ['Se avessi tempo, viaggerei.'], 'it', false);
  { const g = (wd, l) => P.glossLookup(wd, l) || {};
    ok(/water/.test(g('dell’acqua', 'it').val) && g('l’amico', 'it').val === 'friend' && g('comprato', 'it').base === 'comprare' && g('venduto', 'it').base === 'vendere' && g('Perché', 'it').val, 'Italian words find their meaning: elisions and verb forms ' + JSON.stringify([g('dell’acqua', 'it'), g('l’amico', 'it'), g('comprato', 'it')]));
    ok(/Giulia/.test(g('Giulia', 'it').val) && /landlord|pension/i.test(g('Bianchi', 'it').val || '') , 'the Italian cast’s names have meanings ' + JSON.stringify(g('Bianchi', 'it')));
    ok(A.E('lexToks("l’acqua e un’amica", "it")').join() === 'l,acqua,e,un,amica' && A.E('articlesFor("it").has("gli")') && !A.E('articlesFor("es").has("gli")'), 'Italian elisions split into article and word'); }
  /* the opening subject pronoun is optional in Spanish and Italian, but never swapped for another */
  {
    T('yo dije', ['dije'], 'es', true, 'exact');
    T('dije', ['yo dije'], 'es', true, 'exact');
    T('Tú dijiste la verdad.', ['Dijiste la verdad.'], 'es', true, 'exact');
    T('él dijo', ['ella dijo'], 'es', false);
    T('es para', ['es para ella'], 'es', false);
    T('io parlo', ['parlo'], 'it', true, 'exact');
    T('yo', ['yo'], 'es', true, 'exact');
  }
  /* answers that count without matching exactly say why, and what differs */
  {
    ok(/^Only the ß differs \(heiße\), so it counts\.$/.test(P.check('Ich heisse Matt', ['Ich heiße Matt.'], 'de').note), 'accent note says why it counts');
    ok(/^Only the accent differs \(estés\)/.test(P.check('Espero que estes bien', ['Espero que estés bien.'], 'es').note), 'Spanish accent note');
    ok(/^Only one letter is off \(boston\), so it counts\.$/i.test(P.check('I live in Bostn', ['I live in Boston.'], 'en').note), 'typo note says why it counts');
    const d = P.answerDiff('Das ist schon gut', 'Das ist schön gut.', 'de');
    ok(d.changes.length === 1 && d.changes[0].kind === 'accent' && d.changes[0].yours === 'schon' && d.changes[0].answer === 'schön' && d.yours.join() === ',,accent,' && d.answer.join() === ',,accent,', 'diff marks the umlaut ' + JSON.stringify(d));
    const e = P.answerDiff('I’m very tired', 'I am tired.', 'en');
    ok(e.changes.length === 1 && e.changes[0].yours === 'very' && !e.changes[0].answer && e.yours.join() === ',word,' && e.caught === 3 && e.total === 3, 'diff finds an extra word ' + JSON.stringify(e));
    const s = P.answerDiff('Ich habe einen Hut', 'Ich habe einen Hund.', 'de');
    ok(s.changes.length === 1 && s.changes[0].kind === 'word' && s.changes[0].yours === 'Hut' && s.changes[0].answer === 'Hund' && s.caught === 3 && s.total === 4, 'diff pairs a swapped word ' + JSON.stringify(s));
    ok(P.answerDiff('Wenn ich du waere', 'Wenn ich du wäre.', 'de').changes.map(c => c.kind).join() === 'accent', 'ae counts as ä in the diff');
    ok(P.answerDiff('Ich wohne in Berlinn', 'Ich wohne in Berlin.', 'de').changes.map(c => c.kind).join() === 'spelling', 'diff spots a typo');
    ok(P.answerDiff('It’s 7:30', 'It is seven thirty.', 'en').changes.length === 0, 'diff ignores contractions and numbers');
    const sp = P.evaluate({ type: 'speak', lang: 'de', accepted: ['Ich habe heute keine Zeit.'] }, 'ich habe heute keine');
    ok(sp.ok && sp.level === 'typo' && /^We caught 4 of 5 words, so it counts\./.test(sp.note) && sp.match === 'Ich habe heute keine Zeit.', 'speech says how much came through ' + JSON.stringify(sp));
    const sp2 = P.evaluate({ type: 'speak', lang: 'de', accepted: ['Ich habe heute keine Zeit.'] }, 'ich habe heute keine Zeit mehr');
    ok(sp2.ok && /^Every word came through/.test(sp2.note), 'speech with an extra word ' + JSON.stringify(sp2));
    const L = A.E('coreOrder("de")').find(l => l.vocab.some(v => v.alt.length)), vi = L.vocab.findIndex(v => v.alt.length);
    const ax = A.E('makeEx("type-e2t", coreOrder("de").find(l => l.id === ' + JSON.stringify(L.id) + '), "v", ' + vi + ')');
    const ar = P.evaluate(ax, L.vocab[vi].alt[0]);
    ok(ar.ok && ar.level === 'exact' && ar.alt && ar.note === 'That’s another right way to say it.', 'alternate answer says so ' + JSON.stringify(ar));
    ok(!P.evaluate(ax, L.vocab[vi].t).alt, 'main answer is not an alternate');
    const gl = A.E('coreOrder("de")').find(l => l.vocab.some(v => v.g)), gi = gl.vocab.findIndex(v => v.g);
    const gx = A.E('makeEx("type-t2e", coreOrder("de").find(l => l.id === ' + JSON.stringify(gl.id) + '), "v", ' + gi + ')');
    const ge = gl.vocab[gi].e[0];
    ok(!P.evaluate(gx, /^the /i.test(ge) ? ge.slice(4) : 'the ' + ge).alt, 'adding or dropping “the” is not an alternate');
  }

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
    // notes already seen stay seen, even when the other device's settings are newer
    const seenA = P.mergeCore({ settings: { seenVersion: '4.28.0', seenAnnounce: 'amh2k3j1a', ts: 1 } }, { settings: { seenVersion: '4.20.0', seenAnnounce: '', goal: 30, ts: 9 } });
    ok(seenA.settings.seenVersion === '4.28.0' && seenA.settings.seenAnnounce === 'amh2k3j1a' && seenA.settings.goal === 30, 'merge keeps the version and announcement seen ' + JSON.stringify(seenA.settings));
    ok(P.mergeCore({ settings: { seenAnnounce: 'amh2k3j1a', ts: 1 } }, { settings: { seenAnnounce: 'amg0000aa', ts: 9 } }).settings.seenAnnounce === 'amh2k3j1a', 'merge keeps the later announcement seen');
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

  /* ---------- 3b. word hints: meanings inside the questions, fading with the level ---------- */
  {
    const H = await makeDom(); H.P.S.settings.onboarded = true;
    const hd = H.w.document, ov = () => hd.querySelector('.overlay:not(.out)');
    const open = id => { H.E('endRun(); startLesson(' + JSON.stringify(id) + ')'); [...ov().querySelectorAll('.ov-foot button')].find(b => b.textContent === 'Start lesson' || b.textContent === 'Start over').click(); };
    const show = type => { const i = H.E('Run.queue.findIndex(e => e.type === ' + JSON.stringify(type) + ')'); ok(i >= 0, 'hint test finds a ' + type); H.E('Run.pos = ' + i + '; nextEx()'); };
    const firstLesson = lv => H.P.COURSE.es.units.flatMap(u => u.lessons).find(l => l.level === lv).id;
    H.E('S.settings.lang = "es"');
    // A1: full hints
    open('es-1-1');
    ok(ov().querySelector('.words-btn'), 'A1 lesson has a Words button');
    ov().querySelector('.words-btn').click();
    ok(hd.querySelectorAll('.sheet .wl-row').length === H.E('Run.taught.size') && H.E('Run.taught.size') < H.E('Run.lesson.vocab.length'), 'Words sheet lists only the words met so far');
    hd.querySelectorAll('.sheet-back').forEach(x => x.remove());
    show('blank');
    ok(ov().querySelector('.gap-sent .say.gl .w') && ov().querySelector('.tap-hint'), 'A1 blank has tappable words and the nudge');
    ov().querySelector('.gap-sent .say.gl .w').click();
    const gl = hd.querySelector('.gloss .gl-e');
    ok(gl && gl.textContent && !/Not in the word list/.test(gl.textContent), 'tapping a blank word gives a meaning: ' + (gl && gl.textContent));
    H.E('closeGloss()');
    ok(ov().querySelector('.gap-sent').nextElementSibling && /\S/.test(ov().querySelector('.ex').textContent), 'A1 blank still shows its translation');
    show('bank-t2e');
    ok(ov().querySelector('.prompt .say.gl'), 'sentence prompt is tappable at A1');
    show('mc-t2e');
    ok(!ov().querySelector('.prompt .say.gl') && !ov().querySelector('.tap-hint'), 'a single word being tested is not tappable (it would give the answer away)');
    // B1: tap only, no nudge or Words button
    open(firstLesson('B1'));
    ok(!ov().querySelector('.words-btn'), 'B1 has no Words button');
    show('blank');
    ok(ov().querySelector('.gap-sent .say.gl') && !ov().querySelector('.tap-hint'), 'B1 blank is tappable without the nudge');
    // C1: nothing in the question, translation behind a tap
    open(firstLesson('C1'));
    show('blank');
    ok(!ov().querySelector('.gap-sent .say.gl') && !ov().querySelector('.tap-hint') && !ov().querySelector('.words-btn'), 'C1 question shows no hints');
    const showTr = [...ov().querySelectorAll('.hint-row button')].find(b => /translation/i.test(b.textContent));
    ok(showTr, 'C1 translation waits behind a tap');
    if (showTr){ showTr.click(); ok(!ov().querySelector('.hint-row button') && H.E('Run.cur.blank.e') && ov().textContent.includes(H.E('Run.cur.blank.e')), 'tapping reveals the translation'); }
    // the setting overrides the level
    H.E('S.settings.hints = "always"'); open(firstLesson('C1')); show('blank');
    ok(ov().querySelector('.gap-sent .say.gl'), 'Always keeps hints at C1');
    H.E('S.settings.hints = "off"'); open('es-1-1'); show('blank');
    ok(!ov().querySelector('.gap-sent .say.gl') && !ov().querySelector('.words-btn'), 'Off removes hints at A1');
    ok(H.E('hintMode("A1")') === 'off', 'hintMode respects Off');
    H.E('S.settings.hints = "auto"; endRun()');
    ok(['A1', 'A2'].every(l => H.E('hintMode("' + l + '")') === 'full') && ['B1', 'B2'].every(l => H.E('hintMode("' + l + '")') === 'tap') && ['C1', 'C2'].every(l => H.E('hintMode("' + l + '")') === 'off'), 'auto fades A: full, B: tap, C: off');
    // a bad saved value falls back to auto
    const bad = await makeDom({ seed: { 'parlance.v2': { v: 6, settings: { onboarded: true, hints: 'bogus' }, days: {}, langs: {} } } });
    ok(bad.P.S.settings.hints === 'auto', 'unknown hints setting becomes auto');
    // nearly every word in a lesson sentence or blank has a meaning of its own
    for (const lang of LANG_IDS){
      let total = 0, unknown = 0;
      for (const l of H.P.COURSE[lang].units.flatMap(u => u.lessons)) for (const t of [...l.sentences.map(x => x.t), ...l.blanks.map(b => b.t.replace('___', b.a).replace(/\s*\([^)]*\)/g, ''))]) for (const part of t.split(/\s+/)){   // the English hint in brackets isn't target-language text
        const c = H.E('coreWord')(part); if (!/\p{L}/u.test(c)) continue; total++; if (!H.E('glossLookup')(c, lang)) unknown++;
      }
      ok(unknown / total < 0.02, lang + ' lesson words without a meaning: ' + unknown + ' of ' + total);
    }
    // a save from before Italian (schema 8) has no Italian progress yet and still loads, keeping what it had
    const pre = await makeDom({ seed: { 'parlance.v2': { v: 8, settings: { onboarded: true, lang: 'es' }, days: {}, langs: { es: { done: { 'es-1-1': { at: '2026-10-01', acc: 1, times: 1 } }, cards: {}, xp: 40 } }, extra: { keep: 'me' } } } });
    ok(pre.P.S.langs.it && Object.keys(pre.P.S.langs.it.done).length === 0 && pre.P.S.gen.it && pre.P.S.langs.es.done['es-1-1'] && pre.P.S.v === 12 && pre.P.S.extra && pre.P.S.extra.keep === 'me', 'an older save gets Italian and keeps everything else');
    pre.E('S.settings.lang = "it"; touchSettings(); S.langs.it.done["it-1-1"] = { at: "2026-10-02", acc: 1, times: 1 }; touch("it")');
    ok(JSON.parse(pre.w.localStorage.getItem('parlance.v2')).langs.it.done['it-1-1'] && ['de', 'es', 'it'].every(l => pre.E('SLICES').includes(l) && pre.E('SLICES').includes('gen-' + l)), 'Italian progress is saved, with its own synced slices');
    pre.dom.window.close();
    H.dom.window.close(); bad.dom.window.close();
  }
  /* ---------- 3c. lesson openings: forms tables and the extra-words list ---------- */
  {
    const T3 = await makeDom(); T3.P.S.settings.onboarded = true;
    let withTables = 0, total = 0;
    for (const lang of LANG_IDS) for (const l of T3.P.COURSE[lang].units.flatMap(u => u.lessons)){
      total++;
      const tb = l.tip.tables || [];
      if (tb.length) withTables++;
      ok(tb.length <= 3, l.id + ' has at most 3 tables');
      ok(l.tip.body.length > 0 && l.tip.body.length <= 900, l.id + ' tip body length ' + l.tip.body.length);
      for (const t of tb){
        const cols = (t.head || t.rows[0]).length;
        ok(t.rows.length >= 1 && t.rows.length <= 8 && cols >= 1 && cols <= 4, l.id + ' table size ' + t.rows.length + 'x' + cols);
        ok(t.rows.every(r => r.length === cols && r.every(c => typeof c === 'string' && c.trim())) && (!t.head || t.head.every(c => typeof c === 'string')), l.id + ' table cells');
        ok(!(lang === 'es' && /vosotros/i.test(JSON.stringify(t))), l.id + ' no vosotros');
      }
    }
    ok(withTables >= total * 0.9, 'most lessons have a forms table: ' + withTables + ' of ' + total);
    const ov = () => T3.w.document.querySelector('.overlay:not(.out)');
    T3.E('startLesson("de-1-2")');
    ok(!ov().querySelector('.tip') && !ov().querySelector('.wordlist') && ov().querySelector('.plan'), 'the lesson opening is a short overview, not a wall of text');
    [...ov().querySelectorAll('.ov-foot button')].find(b => b.textContent === 'Start lesson').click();
    ok(ov().querySelector('.teach-words .wl-row'), 'the first card teaches a few words');
    const ci = T3.E('Run.queue.findIndex(e => e.type === "teach" && e.mode === "concept" && e.bite.tables.length)');
    ok(ci > 0, 'the idea arrives after some words'); T3.E('Run.pos = ' + ci + '; nextEx()');
    ok(ov().querySelector('.tip .forms table tbody tr'), 'a bite of the idea shows its forms table');
    ok(T3.E('Run.queue.some(e => e.type === "teach" && e.mode === "phrases")'), 'phrases get their own card before they are asked');
    ok(T3.E('lessonForms(getLesson("es-1-3"))').every(f => f.w && f.val && f.w !== 'Ana'), 'extra words have meanings and skip names');
    // a pack lesson keeps its tables, and bad ones are cleaned
    const pk = T3.E('packTables([["Cap", ["a","b"], [["1","2"],["3","4"]]], "junk", ["x", null, []]])');
    ok(pk.length === 1 && pk[0][2].length === 2, 'pack tables are cleaned');
    T3.dom.window.close();
  }
  /* ---------- 3d. wrong forms: early levels count them and explain, later levels explain and don't count ---------- */
  {
    const F = await makeDom(); F.P.S.settings.onboarded = true;
    const typed = (id, i, value, type) => { const l = F.E('getLesson')(id); return F.P.evaluate(F.E('makeEx')(type || 'type-e2t', l, 's', i), value); };
    let r = typed('es-1-3', 2, '¿Dónde vivo?');
    ok(r.ok && r.level === 'form' && r.diffs && r.diffs[0].expected === 'vives' && /“yo”/.test(r.diffs[0].note) && /“tú”/.test(r.diffs[0].note), 'A1: wrong person counts and is explained ' + JSON.stringify(r));
    r = typed('de-1-2', 1, 'Ich heißt Matt.');
    ok(r.ok && r.level === 'form' && r.diffs[0].yours === 'heißt', 'A1 German: wrong ending counts and is explained');
    r = typed('de-7-1', 1, 'Ich habe gestern einen Film sehe.');
    ok(!r.ok && r.level === 'form' && r.diffs[0].expected === 'gesehen', 'B1: wrong form does not count but is explained ' + JSON.stringify(r));
    r = typed('de-1-1', 0, 'Hallo Welt'); ok(!r.ok && r.level === 'wrong' && !r.diffs, 'a different word is just wrong');
    r = typed('es-1-3', 2, '¿Dónde vives?'); ok(r.ok && r.level === 'exact', 'the right form is still exact');
    // multiple choice: never counts, but says when it was the right word in the wrong form
    let explained = 0;
    for (const l of F.P.COURSE.de.units.flatMap(u => u.lessons)) for (let i = 0; i < l.blanks.length; i++){
      const ex = F.E('blankEx')(l, i);
      for (const o of ex.options) if (o !== ex.correct){ const rr = F.P.evaluate(ex, o); ok(!rr.ok, l.id + ' wrong option never counts'); if (rr.diffs) explained++; }
    }
    ok(explained > 10, 'wrong blank options that are other forms are explained: ' + explained);
    // in the lesson screen
    F.E('S.settings.lang = "es"; endRun(); startLesson("es-1-3")');
    [...F.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click();
    F.E('Run.queue = [makeEx("type-e2t", Run.lesson, "s", 2)]; Run.pos = 0; nextEx()');
    F.E('Run.value = "¿Dónde vivo?"; Run.canCheck = true; doCheck()');
    const foot = F.w.document.querySelector('.overlay:not(.out) .ov-foot');
    ok(foot.classList.contains('ok') && /Close enough/.test(foot.textContent) && foot.querySelector('.fb-diffs li'), 'the answer screen shows why: ' + foot.textContent.slice(0, 160));
    F.dom.window.close();
  }
  /* ---------- 3e. mistakes, form drills, checkpoints and the placement test ---------- */
  {
    const Q = await makeDom(); Q.P.S.settings.onboarded = true;
    const qd = Q.w.document, qov = () => qd.querySelector('.overlay:not(.out)');
    const qfoot = l => [...qd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === l);
    const L = () => Q.P.S.langs.es;
    // form drills come from the tables
    let drills = 0, lessonsWithDrills = 0;
    for (const lang of LANG_IDS) for (const l of Q.P.COURSE[lang].units.flatMap(u => u.lessons)){
      const d = Q.E('formDrills')(l); drills += d.length; if (d.length) lessonsWithDrills++;
      for (const x of d){ const ex = Q.E('formEx')(l, x); ok(ex.mode === 'type' || (ex.options.length === 4 && ex.options.includes(ex.correct) && new Set(ex.options).size === 4), l.id + ' form drill options'); ok(Q.P.evaluate(ex, ex.correct).ok, l.id + ' form drill right answer counts'); }
    }
    ok(lessonsWithDrills >= 40, 'many lessons have form drills: ' + lessonsWithDrills);
    const sein = Q.E('getLesson')('es-1-3'), dr = Q.E('formDrills')(sein);
    if (dr.length){ const ex = Q.E('formEx')(sein, dr[0]); const wrong = ex.options.find(o => o !== ex.correct); const r = Q.P.evaluate(ex, wrong); ok(!r.ok, 'wrong form option never counts'); let rl = null; try { rl = Q.E('reportLink')(ex); } catch (e) {} ok(rl && rl.tagName === 'BUTTON', 'a missed form question can still build its Report link'); }
    // a lesson ends with the form drills
    ok(Q.E('buildLesson')(Q.E('getLesson')('es-1-3')).some(e => e.type === 'form'), 'lessons include form drills');
    // mistakes are noted, listed and cleared
    Q.E('S.settings.lang = "es"');
    Q.E('startLesson("es-1-1")'); qfoot('Start lesson').click();
    const ex0 = Q.E('Run.queue.find(e => e.key && e.type !== "match")'); const idx = Q.E('Run.queue.findIndex(e => e.id === ' + ex0.id + ')');
    Q.E('Run.pos = ' + idx + '; nextEx()');
    Q.E('Run.value = "zzz nope"; Run.canCheck = true; doCheck()');
    ok(L().miss[ex0.key] && L().miss[ex0.key].ts > (L().miss[ex0.key].ok || 0), 'a wrong answer is noted');
    ok(Q.E('mistakeEntries("es").some(e => e.key === ' + JSON.stringify(ex0.key) + ')'), 'it is on the mistakes list');
    Q.E('endRun()');
    Q.E('UI.tab = "review"; render()');
    ok([...qd.querySelectorAll('#app button')].some(b => /Fix my mistakes/.test(b.textContent)), 'the Review tab offers Fix my mistakes');
    { /* Your first week card on Learn */
      const F = await makeDom(); F.P.S.settings.onboarded = true; F.P.S.settings.lang = 'es';
      const fd = F.w.document, fapp = () => fd.querySelector('#app .first-week');
      try { F.w.localStorage.removeItem('parlance.firstweek'); F.w.localStorage.removeItem('parlance.birds'); } catch (e) {}
      F.E('UI.tab = "learn"; render()');
      ok(!fapp(), 'first week: no card before the first lesson');
      F.E('S.langs.es.done["es-1-1"] = { at: today(), acc: 1, times: 1 }; render()');
      const lessonBtn = fd.querySelector('#app .first-week [data-step="lesson"]');
      ok(!!fapp() && !!lessonBtn && lessonBtn.disabled && lessonBtn.closest('li').classList.contains('done') && /1 of /.test(fapp().textContent), 'first week: the card shows after a lesson, with the lesson step ticked');
      fd.querySelector('#app .first-week [data-step="story"]').click();
      const toStories = F.E('UI.tab');
      F.E('UI.tab = "learn"; render()');
      fd.querySelector('#app .first-week [data-step="review"]').click();
      ok(toStories === 'stories' && F.E('UI.tab') === 'review', 'first week: each step\'s button goes where it says');
      F.E('UI.tab = "learn"; render()');
      ok(!fd.querySelector('#app .first-week [data-step="bird"]').closest('li').classList.contains('done'), 'first week: Meet the other birds starts unticked');
      F.E('openBirdPicker()');
      for (let i = 0; i < 100 && !F.E('Object.keys(MASCOTS).every(id => !!Bird.birds[id])'); i++) await sleep(50);   // let the part sheets land before the page closes
      F.E('render()');
      ok(fd.querySelector('#app .first-week [data-step="bird"]').closest('li').classList.contains('done'), 'first week: opening the bird picker ticks Meet the other birds');
      F.E('UI.tab = "learn"; render()');
      [...fapp().querySelectorAll('button')].find(b => b.textContent === 'Hide this').click();
      let stored = ''; try { stored = F.w.localStorage.getItem('parlance.firstweek'); } catch (e) {}
      ok(!fapp() && stored === 'hidden', 'first week: Hide this hides it on this device');
      try { F.w.localStorage.removeItem('parlance.firstweek'); F.w.localStorage.removeItem('parlance.birds'); } catch (e) {}
      F.E('render()');
      ok(!!fapp(), 'first week: the card is back once the hidden flag is cleared');
      F.E('for (let i = 1; i <= 8; i++) S.days["2026-01-0" + i] = { xp: 10, met: false }; render()');
      ok(!fapp(), 'first week: gone after 8 practice days');
      F.dom.window.close();
    }
    { /* the practice grid under the Review button */
      const G = await makeDom(); G.P.S.settings.onboarded = true; G.P.S.settings.lang = 'es';
      const gd = G.w.document, GL = () => G.P.S.langs.es;
      G.E('UI.tab = "review"; render()');
      ok(G.E('practiceTiles("es")').length === 0 && !gd.querySelector('#app .practice-grid'), 'review practice: a new learner sees no practice tiles');
      const l1 = G.E('getLesson')('es-1-1'), wk = G.E('itemKey')(l1, 'v', 0), wk2 = G.E('itemKey')(l1, 'v', 1);
      GL().cards[wk] = { ef: 2.5, n: 0, iv: 0, due: '2999-01-01', last: '2026-10-01', ts: 1 }; GL().cards[wk2] = { ef: 2.5, n: 0, iv: 0, due: '2999-01-01', last: '2026-10-01', ts: 1 };
      G.E('UI.tab = "review"; render()');
      ok(!!gd.querySelector('#app [data-practice="weak"]') && !gd.querySelector('#app [data-practice="mistakes"]') && G.E('mistakeEntries("es").length') === 0, 'review practice: tiles for what applies (no mistakes yet, so no Fix my mistakes tile)');
      GL().miss[wk] = { ts: 5, ok: 0 }; G.E('render()');
      ok(G.E('mistakeEntries("es").length') > 0 && !!gd.querySelector('#app [data-practice="mistakes"]') && /to fix/.test(gd.querySelector('#app [data-practice="mistakes"] .pt-sub').textContent) && gd.querySelectorAll('#app .practice-grid .practice-tile').length === G.E('practiceTiles("es")').length, 'review practice: tiles for what applies (Fix my mistakes appears with a mistake)');
      gd.querySelector('#app [data-practice="weak"]').click();
      ok(G.E('Run.mode') === 'practice', 'review practice: Weakest items starts a practice session');
      G.E('endRun()');
      G.dom.window.close();
    }
    Q.E('startMistakes()');
    let guard = 0;
    while (Q.E('Run.active && !Run.finished') && guard++ < 60){
      const ex = Q.E('Run.cur'); let ans;
      switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = Q.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = Q.P.tileTokens(ex.item.e[0]).join(' '); break;
        case 'match': Q.E('Run.pos++; nextEx()'); continue; default: ans = ex.correct; }
      Q.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); qfoot('Continue').click();
    }
    ok(Q.E('Run.finished'), 'mistakes session finishes');
    ok(!Q.E('mistakeEntries("es").some(e => e.key === ' + JSON.stringify(ex0.key) + ')') || Object.values(L().miss).some(m => m.ok >= m.ts), 'right answers clear mistakes');
    qfoot('Continue').click();
    // merge keeps the newest ok/ts and the best checkpoint
    const m = Q.E('mergeLang')({ miss: { k: { ts: 5, ok: 0 } }, cp: { U: { at: '2026-01-01', acc: 0.5, pass: false } } }, { miss: { k: { ts: 3, ok: 9 } }, cp: { U: { at: '2026-02-01', acc: 0.9, pass: true } } });
    ok(m.miss.k.ts === 5 && m.miss.k.ok === 9 && m.cp.U.pass && m.cp.U.acc === 0.9, 'miss and checkpoint merge');
    // checkpoint: locked until the unit is done, then a 12-question test
    const unit = Q.P.COURSE.es.units[0];
    ok(!Q.E('unitDone')('es', unit), 'unit not done yet');
    for (const l of unit.lessons) L().done[l.id] = { at: '2026-10-01', acc: 1, times: 1 };
    ok(Q.E('unitDone')('es', unit), 'unit done');
    const cpq = Q.E('buildCheckpoint')(unit); ok(cpq.length === 12, 'checkpoint has 12 questions: ' + cpq.length);
    for (let rep = 0; rep < 5; rep++) for (const ex of Q.E('buildCheckpoint')(unit)) ok(Q.P.evaluate(ex, ex.options ? ex.correct : ex.accepted ? ex.accepted[0] : ex.correct).ok || ex.type === 'match' || ex.tiles, 'checkpoint question answerable ' + ex.type);
    Q.E('UI.tab = "learn"; UI.open = new Set(["A1"]); UI.openLang = "es"; render()');
    ok(qd.querySelector('.stations.checkpoint li.next'), 'Learn shows an open checkpoint');
    Q.E('startCheckpoint(COURSE.es.units[0])');
    guard = 0;
    while (Q.E('Run.active && !Run.finished') && guard++ < 60){
      const ex = Q.E('Run.cur'); let ans;
      switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = Q.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = Q.P.tileTokens(ex.item.e[0]).join(' '); break;
        case 'match': Q.E('Run.pos++; nextEx()'); continue; default: ans = ex.correct; }
      Q.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); qfoot('Continue').click();
    }
    ok(Q.E('Run.finished') && L().cp[unit.title] && L().cp[unit.title].pass, 'a perfect checkpoint passes and is saved');
    qfoot('Continue').click();
    ok(Q.P.S.badges.checkpoint1 && Q.P.S.badges.checkpoint100 && !Q.P.S.badges.checkpoint5, 'a perfect checkpoint earns its badges');
    Q.E('S.stats.fixed = 25; S.stats.formsRight = 50; checkBadges({})');
    ok(Q.P.S.badges.fixer && Q.P.S.badges.forms50, 'fixing mistakes and form questions earn badges');
    // test out of a unit (Learn → Test out): the checkpoint before the lessons; saved as outs, never as done
    {
      const to = {};
      to.snap = JSON.stringify({ done: L().done, cp: L().cp, outs: L().outs, badges: Q.P.S.badges, stats: Q.P.S.stats });
      ok(Q.E('SCHEMA_VERSION') === 12 && JSON.stringify(Q.E('cleanLang')({ done: {} }).outs) === '{}', 'test out: SCHEMA_VERSION is 12 and an old slice gets outs {}');
      const mo = Q.E('mergeLang')({ outs: { A: '2026-11-01' } }, { outs: { B: '2026-11-02' } });
      ok(mo.outs.A === '2026-11-01' && mo.outs.B === '2026-11-02' && Q.E('mergeLang')({}, { outs: { B: 'x' } }).outs.B === 'x', 'test out: merges keep outs from both sides');
      ok(!(L().outs || {})[unit.title], 'test out: a normal checkpoint doesn\'t write outs');
      Q.E('UI.tab = "learn"; UI.open = new Set(["A1"]); UI.openLang = "es"; render()');
      ok([...qd.querySelectorAll('.stations.checkpoint li.open')].some(li => li.textContent.includes('Test out')), 'test out: Learn offers Test out on a unit that isn\'t done');
      const units = Q.P.COURSE.es.units;
      const free = units.map((u, i) => ({ u, i })).filter(x => x.i > 0 && x.u.level === 'A1' && !x.u.lessons.some(l => L().done[l.id]) && !L().cp[x.u.title]);
      const U1 = free[0].u, U2 = free[1].u, i1 = free[0].i;
      for (const u of units.slice(0, i1)) for (const l of u.lessons) if (!L().done[l.id]) L().done[l.id] = { at: '2026-10-01', acc: 1, times: 1 };
      const runTest = async (u, right) => {
        Q.E('startCheckpoint(COURSE.es.units[' + units.indexOf(u) + '], true)');
        let g = 0;
        while (Q.E('Run.active && !Run.finished') && g++ < 200){
          const ex = Q.E('Run.cur'); let ans;
          if (!right){
            if (ex.type === 'match'){ Q.E('Run.pos++; nextEx()'); continue; }
            ans = ex.options ? (ex.options.find(o => o !== ex.correct) || 'zzz') : 'zzz';
          } else switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = Q.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = Q.P.tileTokens(ex.item.e[0]).join(' '); break;
            case 'match': Q.E('Run.pos++; nextEx()'); continue; default: ans = ex.correct; }
          Q.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); qfoot('Continue').click();
        }
      };
      ok(Q.E('nextLesson("es")').id === U1.lessons[0].id, 'test out: setup: the next stop is the first lesson of the unit');
      await runTest(U1, true);
      const said = qov() ? qov().textContent : '';
      ok(L().outs && L().outs[U1.title] && L().cp[U1.title].pass && Q.E('nextLesson("es")').unit > units.indexOf(U1) && !U1.lessons.some(l => L().done[l.id]), 'test out: passing moves the next stop past the unit');
      ok(said.includes('Unit tested out.'), 'test out: the finish screen says Tested out');
      qfoot('Continue').click();
      ok(Q.E('lessonState("es", COURSE.es.units[' + units.indexOf(U1) + '].lessons[0], nextLesson("es"))') === 'open' && !Q.E('isDone("es", ' + JSON.stringify(U1.lessons[0].id) + ')') && !Q.E('levelComplete("es", "A1")') && !Q.P.S.badges.levelA1, 'test out: its lessons are open, not done, and A1 is not complete');
      await runTest(U2, false);
      qfoot('Continue').click();
      ok(!(L().outs || {})[U2.title] && L().cp[U2.title] && L().cp[U2.title].pass === false, 'test out: failing writes no outs');
      // put the page back as it was for the checks that follow
      const sn = JSON.parse(to.snap);
      L().done = sn.done; L().cp = sn.cp; L().outs = sn.outs || {}; Q.P.S.badges = sn.badges; Q.P.S.stats = sn.stats;
      Q.E('UI.openLang = null; render()');
    }
    // offline: the service worker is web-only; in the artifact build the module stays off, and Refresh still reloads
    ok(Q.E('Offline.on') === false && Q.E('Offline.reg') === null, 'offline: nothing runs in the artifact');
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      R.P.Live.config = { kind: 'config', latest: '99.0.0' }; R.E('checkUpdateBanner()');
      const rb = R.w.document.querySelector('#update-banner button');
      const quick = await Promise.race([R.E('offlineUpdate()').then(() => true), sleep(500).then(() => false)]);
      rb.click();
      ok(rb.disabled && rb.textContent === 'Updating…', 'offline: Refresh says it is updating');
      for (let i = 0; i < 60 && !R.errors.some(e => /navigation/i.test(e)); i++) await sleep(25);   // jsdom reports location.reload() as "not implemented: navigation"
      ok(quick && R.errors.some(e => /navigation/i.test(e)), 'offline: Refresh still reloads');
      R.w.close();
    }
    { const fcss = fs.readFileSync(path.join(ROOT, 'styles', 'fonts.css'), 'utf8'), urls = [...fcss.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]);
      ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')) && urls.length >= 6 && urls.every(u => fs.existsSync(path.join(ROOT, 'styles', u))), 'fonts: no outside font host'); }
    // offline in the app: Me's card is web-only; Friends says so when there is no connection
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      R.E('UI.tab = "me"; render()');
      ok(!R.w.document.querySelector('#app .offline-card') && R.E('Offline.on') === false, 'offline: no offline card in the artifact');
      Object.defineProperty(R.w.navigator, 'onLine', { get: () => false, configurable: true });
      R.E('UI.tab = "friends"; render()');
      const note = R.w.document.querySelector('#app .friends > .notice');
      ok(note && /Friends needs a connection/.test(note.textContent) && note.previousElementSibling && note.previousElementSibling.matches('header.top'), 'offline: Friends says it needs a connection');
      R.w.close();
    }
    // the finish screen leads somewhere: Next lesson, the unit's checkpoint, a third tile that is never zero
    {
      const fin = async (setup, steps) => {
        const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
        const rd = R.w.document, rl = () => R.P.S.langs.es;
        if (setup) setup(R, rl);
        R.E('startLesson("' + steps.id + '")');
        R.E((steps.first || '') + 'Run.pos = Run.queue.length; nextEx()');
        return { R, rd, rl, foot: () => [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')] };
      };
      const A1 = Q.P.COURSE.es.units[0], firstId = A1.lessons[0].id, lastId = A1.lessons[A1.lessons.length - 1].id;
      {
        const F = await fin(null, { id: firstId });
        const nx = F.R.E('nextLesson("es")'), nb = F.rd.querySelector('.overlay:not(.out) .ov-foot [data-more="next"]'), btns = F.foot();
        ok(nb && nb.textContent === 'Next: ' + nx.title && nx.id !== firstId && btns.length === 2 && btns[1].textContent === 'Continue' && !F.rd.querySelector('[data-more="checkpoint"]'), 'finish: Next starts the next lesson (button)');
        F.R.E('S.settings.autoplay = true; window.__said = []; speak = function(t){ window.__said.push(String(t)); return Promise.resolve(true); }');
        nb.click();
        await sleep(320);
        ok(F.R.E('Run.active') === true && F.R.E('Run.mode') === 'lesson' && F.R.E('Run.lesson.id') === nx.id && F.rd.querySelectorAll('.overlay').length === 1, 'finish: Next starts the next lesson');
        await sleep(800);
        ok(F.R.E('S.settings.autoplay') === true && !F.R.E('window.__said.some(t => PIP_SAYS.es.cheer.includes(t))'), 'finish: the cheer stays on the finish screen');
        F.R.w.close();
      }
      {
        const F = await fin((R, rl) => { for (const l of A1.lessons) if (l.id !== lastId) rl().done[l.id] = { at: '2026-10-01', acc: 1, times: 1 }; }, { id: lastId });
        const text = F.rd.querySelector('.overlay:not(.out)').textContent, cb = F.rd.querySelector('.overlay:not(.out) .ov-foot [data-more="checkpoint"]');
        ok(text.includes('Its checkpoint is open') && text.includes(A1.title) && cb && cb.textContent === 'Take the unit checkpoint' && !F.rd.querySelector('[data-more="next"]'), 'finish: the last lesson of a unit offers its checkpoint');
        cb.click();
        await sleep(320);
        ok(F.R.E('Run.active') === true && F.R.E('Run.mode') === 'checkpoint' && F.rd.querySelectorAll('.overlay').length === 1, 'finish: the checkpoint button starts the checkpoint');
        F.R.w.close();
      }
      {
        const F = await fin(null, { id: firstId, first: 'Run.first = new Map([[1, "wrong"], [2, "exact"], [3, "wrong"], [4, "exact"]]); Run.bestCombo = 0; ' });
        const tile = [...F.rd.querySelectorAll('.overlay:not(.out) .tiles3 .stat')][2], tx = tile ? tile.querySelector('.num').textContent + ' ' + tile.querySelector('.lbl').textContent : '';
        ok(/^[1-9]\d* new words$/.test(tx) && !/streak/.test(tx), 'finish: no zero streak tile: ' + tx);
        F.R.w.close();
      }
      {
        const F = await fin((R, rl) => { for (const l of A1.lessons) rl().done[l.id] = { at: '2026-10-01', acc: 1, times: 1 }; }, { id: lastId });
        ok(F.rd.querySelector('.overlay:not(.out) .complete') && !F.rd.querySelector('[data-more="checkpoint"]') && !F.rd.querySelector('.overlay:not(.out)').textContent.includes('Its checkpoint is open'), 'finish: a repeated lesson shows no unit moment');
        F.R.w.close();
      }
    }
    // a chime that climbs with a run, a bar that glows from five in a row
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0', sfx: true } } } });
      const rd = R.w.document, calls = [];
      R.w.__calls = calls; R.E('window.__playSound0 = window.playSound; window.playSound = (n, v, p) => window.__calls.push([n, p])');
      R.E('startLesson("es-1-1")'); [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click();
      const answer = right => {
        R.E('Run.queue = [makeEx("type-e2t", Run.lesson, "s", 0)]; Run.pos = 0; nextEx()');
        R.E('Run.value = ' + (right ? 'Run.cur.accepted[0]' : '"zzz nope"') + '; Run.canCheck = true; doCheck()');
        return calls[calls.length - 1];
      };
      const near = (a, b) => Math.abs(a - b) < 1e-4;
      const c1 = answer(true), c2 = answer(true), c3 = answer(true);
      ok(c1[0] === 'ok' && near(c1[1], 1) && near(c2[1], Math.pow(2, 1 / 12)) && near(c3[1], Math.pow(2, 2 / 12)), 'juice: the chime climbs with a run: ' + [c1, c2, c3].map(c => c[1]).join(', '));
      const cb = answer(false), c4 = answer(true);
      ok(cb[0] === 'bad' && near(c4[1], 1) && c4[0] === 'ok', 'juice: a miss resets the climb');
      let last = null;
      for (let i = 0; i < 8; i++) last = answer(true);   // nine in a row since the miss, then the tenth
      const tenth = answer(true);
      ok(R.E('Run.combo') === 10 && near(tenth[1], Math.pow(2, 7 / 12)) && near(last[1], Math.pow(2, 7 / 12)), 'juice: the climb stops at seven semitones: ' + tenth[1]);
      ok(R.E('OV.prog.classList.contains("hot")') === true, 'juice: the bar glows from five in a row');
      answer(false);
      ok(R.E('OV.prog.classList.contains("hot")') === false, 'juice: a miss puts the glow out');
      R.E('Run.combo = 0; OV.prog.classList.remove("hot")');
      for (let i = 0; i < 4; i++) answer(true);
      ok(!R.E('OV.prog.classList.contains("hot")'), 'juice: four in a row do not glow yet');
      R.E('window.playSound = window.__playSound0');
      ok(R.E('SOUNDS.bad.length') === 1 && R.E('SOUNDS.done.length') === 1 && R.E('SOUNDS.ok.length') === 2, 'juice: other sounds are unchanged');
      ok(/\.progress i\.hot\{[^}]*var\(--flame\)/.test(fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8')), 'juice: the glow is a style rule');
      R.w.close();
    }
    // company on teach cards: the bird at the foot, with a tip in its bubble
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, cur = () => rd.querySelector('.overlay:not(.out) .ex.teach');
      R.E('startLesson("es-1-1")'); [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click();
      const w1 = cur(), say1 = w1 && w1.querySelector('.teach-pip .pip .pip-say');
      ok(R.E('Run.cur.mode') === 'words' && w1.querySelector('.teach-pip .pip') && say1 && say1.textContent === 'Tap a word to hear it.' && !w1.querySelector('p.hint'), 'teach: the bird keeps you company (words)');
      for (const [mode, say] of [['phrases', 'Say each one out loud.']]){
        const i = R.E('Run.queue.findIndex(e => e.type === "teach" && e.mode === "' + mode + '")');
        R.E('Run.pos = ' + i + '; nextEx()');
        const c = cur(), sy = c && c.querySelector('.teach-pip .pip .pip-say');
        ok(i >= 0 && sy && sy.textContent === say, 'teach: the bird keeps you company (' + mode + ')');
      }
      let ci = R.E('Run.queue.findIndex(e => e.type === "teach" && e.mode === "concept")');
      if (ci < 0){ R.E('endRun(); startLesson("es-1-2")'); [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click(); ci = R.E('Run.queue.findIndex(e => e.type === "teach" && e.mode === "concept")'); }
      R.E('Run.pos = ' + ci + '; nextEx()');
      const cc = cur();
      ok(ci >= 0 && cc.querySelector('.teach-pip .pip') && !cc.querySelector('.teach-pip .pip-say'), 'teach: a concept card has the bird without a bubble');
      R.w.close();
    }
    // motion: one timing system (WP1)
    {
      const tok = fs.readFileSync(path.join(ROOT, 'styles', 'tokens.css'), 'utf8');
      ok(['--dur-press:.12s', '--dur-quick:.2s', '--dur-settle:.5s', '--dur-enter:.32s', '--dur-exit:.18s', '--ease-in:cubic-bezier(.4,0,1,1)'].every(t => tok.includes(t)) && tok.includes('--dur-fast:.15s; --dur:.3s; --dur-slow:.6s;'), 'motion: the timing tokens exist');
      for (const f of ['base', 'components', 'features', 'art']){
        const css = fs.readFileSync(path.join(ROOT, 'styles', f + '.css'), 'utf8');
        const bad = [...css.matchAll(/transition:([^;}]*)/g)].filter(m => !m[1].split(',').every(part => /^\s*none(!important)?\s*$/.test(part) || part.includes('var(--dur')));
        ok(!bad.length, 'motion: every transition uses a duration token (' + f + '.css): ' + (bad[0] ? 'transition:' + bad[0][1] + ' - use a --dur-* token from styles/tokens.css' : ''));
      }
      const bcss = fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8');
      ok(bcss.split('prefers-reduced-motion').length === 2 && bcss.slice(bcss.indexOf('prefers-reduced-motion')).includes('.spark-p{display:none}'), 'motion: one reduced-motion block in base.css');
    }
    // exits, sheets and quick tabs (WP2)
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, bcss = fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8');
      R.E('toast("x")');
      const tt = rd.querySelector('#toast');
      ok(!tt.hidden && tt.classList.contains('in') && bcss.includes('.toast.out{') && bcss.includes('@keyframes toastout'), 'toast: leaves with an exit');
      ok(bcss.includes('.sheet-back.out .sheet{') && bcss.includes('@keyframes sheetout'), 'sheet: the sheet itself leaves');
      const drag = async to => {
        R.E('sheet("T", h("p", null, "x"), [])');
        const g = rd.querySelector('.sheet .grip'), fire = (type, y) => g.dispatchEvent(new R.w.MouseEvent(type, { clientY: y, bubbles: true }));
        fire('pointerdown', 100); fire('pointermove', to); fire('pointerup', to);
        const inline = rd.querySelector('.sheet') ? rd.querySelector('.sheet').style.transform : null;
        await sleep(250);
        return { open: !!rd.querySelector('.sheet-back'), inline };
      };
      const far = await drag(230);
      ok(!far.open, 'sheet: dragging the grip down closes it');
      const near = await drag(140);
      ok(near.open && near.inline === '', 'sheet: dragging the grip down closes it (a short drag springs back)');
      rd.querySelector('.sheet-back').remove();
      const calls = []; let sy = 0;
      R.w.scrollTo = (...a) => calls.push(a); Object.defineProperty(R.w, 'scrollY', { configurable: true, get: () => sy });
      const tap = label => [...rd.querySelectorAll('#tabs .tab')].find(b => b.textContent.startsWith(label)).click();
      R.E('UI.tab = "learn"; render()');
      sy = 640; tap('Stories'); sy = 0; tap('Learn');
      const last = calls[calls.length - 1];
      ok(last && last[0] === 0 && last[1] === 640, 'tabs: a tab remembers its scroll');
      calls.length = 0; tap('Learn');
      ok(calls.length && calls[calls.length - 1][0] && calls[calls.length - 1][0].top === 0 && R.E('UI.scroll.learn') === 0, 'tabs: a tab remembers its scroll (tapping the current tab goes to the top)');
      R.E('setLang("es")');
      ok(R.E('Object.keys(UI.scroll).length') === 0, 'tabs: a tab remembers its scroll (a new language forgets it)');
      ok(bcss.includes('.view.enter>*{animation:rise var(--dur-enter)') && bcss.includes('* 30ms'), 'tabs: the entrance is short');
      R.E('UI.scroll.review = 640; UI.scroll.talk = 640; UI.tab = "learn"; render()');
      R.E('goTab("review")');
      const viaGo = R.E('UI.scroll.review');
      R.E('UI.tab = "learn"; render()'); const due = rd.querySelector('.stat.due'); R.E('UI.scroll.review = 640'); if (due) due.click();
      ok(viaGo === 0 && due && R.E('UI.scroll.review') === 0 && R.E('UI.tab') === 'review', 'tabs: an in-app jump forgets the old position');
      R.w.close();
    }
    // haptics with names and a switch (WP3)
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
      const rec = []; R.w.navigator.vibrate = p => { rec.push(p); return true; };
      const names = ['tap', 'select', 'pair', 'ok', 'heavy', 'miss', 'bad', 'done'], jsFiles = [];
      const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })){ const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.js')) jsFiles.push(f); } };
      walk(path.join(ROOT, 'js'));
      ok(JSON.stringify(Object.keys(R.E('HAPTICS')).sort()) === JSON.stringify([...names].sort()) && !jsFiles.some(f => /haptic\(\s*[\d\[]/.test(fs.readFileSync(f, 'utf8'))), 'haptics: every pattern has a name');
      R.E('haptic("ok")'); R.E('haptic("bad")'); R.E('haptic("nope")');
      ok(rec.length === 2 && rec[0] === 12 && JSON.stringify(rec[1]) === '[18,40,18]', 'haptics: named calls vibrate');
      rec.length = 0; R.E('S.settings.haptics = false'); R.E('haptic("ok")');
      const offOk = rec.length === 0; R.E('S.settings.haptics = true'); R.E('haptic("ok")');
      ok(offOk && rec.length === 1 && rec[0] === 12, 'haptics: the switch turns them off');
      const old = await makeDom({ seed: { 'parlance.v2': { v: 11, settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' }, days: {}, langs: { es: { done: { 'es-1-1': { at: '2026-10-01', acc: 1, times: 1 } }, cards: {}, xp: 40 } }, extra: { keep: 'me' } } } });
      const again = old.E('(() => { const st = JSON.parse(JSON.stringify(S)); const run = MIGRATIONS[MIGRATIONS.length - 1].run; run(st); const a = JSON.stringify(st.settings); run(st); return a === JSON.stringify(st.settings); })()');
      ok(old.P.S.settings.haptics === true && old.P.S.v === old.E('SCHEMA_VERSION') && old.P.S.extra && old.P.S.extra.keep === 'me' && again, 'haptics: an older save loads with vibration on');
      R.E('UI.tab = "me"; render()');
      const withIt = !!R.w.document.querySelector('#set-haptics');
      delete R.w.navigator.vibrate; R.E('render()');
      ok(withIt && !R.w.document.querySelector('#set-haptics'), 'haptics: the switch shows only where the phone can vibrate');
      old.w.close(); R.w.close();
    }
    // a better first look (WP1): no "null" under a short word list, the streak tile's own colors, an honest retake message, a true tile count, a full tap target
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, rl = () => R.P.S.langs.es, rfoot = l => [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === l);
      const answer = async (right) => {
        let g = 0;
        while (R.E('Run.active && !Run.finished') && g++ < 200){
          const ex = R.E('Run.cur'); let ans;
          if (ex.type === 'teach'){ rfoot('Continue').click(); continue; }
          if (!right){
            if (ex.type === 'match'){ R.E('Run.pos++; nextEx()'); continue; }
            ans = ex.options ? (ex.options.find(o => o !== ex.correct) || 'zzz') : 'zzz';
          } else switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = R.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = R.P.tileTokens(ex.item.e[0]).join(' '); break;
            case 'match': R.E('Run.pos++; nextEx()'); continue; default: ans = ex.correct; }
          R.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); rfoot('Continue').click();
        }
      };
      R.E('startLesson(COURSE.es.units[0].lessons[0].id)');
      R.E('Run.started = true; Run.queue = buildLesson(Run.lesson); Run.pos = 0; runHead(); nextEx()');
      await answer(true);
      rfoot('Continue') && rfoot('Continue').click();
      R.E('endRun && Run.active && endRun()');
      R.E('UI.wordFilter = "v"; UI.wordQuery = ""; UI.wordLimit = 0; UI.tab = "review"; render()');
      const wl = rd.querySelector('#word-list'), cardCount = Object.keys(rl().cards).length;
      ok(cardCount > 0 && cardCount < 150 && wl && wl.querySelectorAll('.wrow').length > 0 && ![...wl.childNodes].some(n => n.nodeType === 3 && n.textContent === 'null') && !wl.textContent.includes('null'), 'review: no "null" under a short word list');
      R.E('UI.wordFilter = "all"; UI.wordLimit = 0; render()');
      const lastEl = rd.querySelector('#word-list').lastElementChild;
      ok(lastEl && lastEl.tagName === 'BUTTON' && lastEl.textContent.startsWith('Show more ('), 'review: Show more still appears on a long list');
      const tk = fs.readFileSync(path.join(ROOT, 'styles', 'tokens.css'), 'utf8'), cc = fs.readFileSync(path.join(ROOT, 'styles', 'components.css'), 'utf8');
      const streakRule = (cc.match(/\.stat\.streak\{[^}]*\}/) || [''])[0];
      ok((tk.match(/--streak-bg:/g) || []).length === 3 && (tk.match(/--streak-text:/g) || []).length === 3 && streakRule.includes('var(--streak-bg)') && !streakRule.includes('--bad'), 'learn: the streak tile has its own colors');
      // a failed retake of a passed unit
      const units = R.P.COURSE.es.units, u2 = units[1];
      rl().cp[u2.title] = { at: '2026-10-01', acc: 0.9, pass: true }; rl().outs = rl().outs || {}; rl().outs[u2.title] = '2026-10-01';
      R.E('startCheckpoint(COURSE.es.units[1], true)');
      await answer(false);
      const said = rd.querySelector('.overlay:not(.out)') ? rd.querySelector('.overlay:not(.out)').textContent : '';
      ok(said.includes('to pass') && !said.includes('to test out'), 'checkpoint: a failed retake of a passed unit says "to pass"');
      rfoot('Continue') && rfoot('Continue').click();
      // the weakest tile counts what there is
      const keys = Object.keys(rl().cards); for (const k of keys.slice(8)) delete rl().cards[k];
      const tile = R.E('practiceTiles("es")').find(t => t.id === 'weak');
      ok(Object.keys(rl().cards).length === 8 && tile && tile.sub === 'Your 8 shakiest', 'review: the weakest tile counts what there is');
      ok(/\.linkish\{[^}]*min-height:44px/.test(fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8')), 'links: .linkish is a full tap target');
      R.w.close();
    }
    // a loading screen with shape (WP2): the page starts with a skeleton that the first render replaces
    {
      const raw = fs.readFileSync(INDEX, 'utf8'), probe = new JSDOM(raw).window.document;
      ok(raw.includes('<div class="boot" role="status" aria-label="Loading Parlance">') && probe.querySelectorAll('.sk, .sk-row').length >= 6 && !raw.includes('boot-msg') && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(raw) && !/<style/i.test(raw), 'boot: the page starts with a skeleton, not a sentence');
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      ok(R.w.document.querySelector('#app .boot') === null && !!R.w.document.querySelector('#app .view'), 'boot: the first render replaces the skeleton');
      R.w.close();
      ok(/\.sk\{[^}]*var\(--hair-2\)/.test(fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8')), 'boot: the skeleton is styled from tokens');
    }
    // Me, easier to get around (WP3): chips that jump to its cards
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document;
      R.E('UI.tab = "me"; render()');
      const jump = rd.querySelector('#app .view > .me-jump'), heads = [...rd.querySelectorAll('#app .view > section h3')].map(x => x.textContent.trim());
      const want = [['Badges', 'Badges'], ['Last 7 days', 'This week'], ['Your bird', 'Your bird'], ['Sticker book', 'Stickers'], ['Sound', 'Sound'], ['Practice', 'Practice'], ['Your progress is saved', 'Backup']].filter(([t]) => heads.includes(t)).map(x => x[1]);
      const labels = jump ? [...jump.querySelectorAll('button.chip')].map(b => b.textContent) : [];
      ok(jump && jump.previousElementSibling && jump.previousElementSibling.classList.contains('profile') && want.length >= 5 && JSON.stringify(labels) === JSON.stringify(want), 'me: jump chips list the cards that exist: ' + JSON.stringify(labels));
      const missing = R.E('(() => { const v = viewMe(); v.querySelector(".me-jump").remove(); [...v.querySelectorAll("section")].find(s => s.querySelector("h3") && s.querySelector("h3").textContent === "Practice").remove(); meJump(v); return [...v.querySelectorAll(".me-jump .chip")].map(b => b.textContent); })()');
      ok(!missing.includes('Practice') && missing.includes('Sound') && missing.length === want.length - 1, 'me: jump chips list the cards that exist (a missing card gets no chip)');
      const seen = []; R.w.Element.prototype.scrollIntoView = function(){ seen.push(this); };
      [...jump.querySelectorAll('button.chip')].find(b => b.textContent === 'Sound').click();
      ok(seen.length === 1 && seen[0].tagName === 'SECTION' && seen[0].querySelector('h3').textContent === 'Sound', 'me: a chip scrolls to its card');
      const same = R.E('(() => { const v = viewMe(), withIt = [...v.querySelectorAll("section h3")].map(x => x.textContent.trim()); const keep = meJump; meJump = () => {}; const w = viewMe(); meJump = keep; return JSON.stringify(withIt) === JSON.stringify([...w.querySelectorAll("section h3")].map(x => x.textContent.trim())) && !w.querySelector(".me-jump") && !!v.querySelector(".me-jump"); })()');
      ok(same, 'me: the cards are unchanged');
      ok(/\.me-jump\{[^}]*overflow-x:auto/.test(fs.readFileSync(path.join(ROOT, 'styles', 'components.css'), 'utf8')), 'me: the chip row scrolls inside itself');
      ok(/\.me-jump \.chip\{[^}]*min-height:44px/.test(fs.readFileSync(path.join(ROOT, 'styles', 'components.css'), 'utf8')), 'me: each jump chip is a full tap target');
      R.w.close();
    }
    // the sticker book (P4 WP1): every pictured course word is a sticker; learning collects it, a strong card shines
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, rl = () => R.P.S.langs.es;
      for (const lg of LANG_IDS){
        const want = R.E('(() => { const t = new Set(); for (const u of COURSE.' + lg + '.units) for (const l of u.lessons) for (const v of l.vocab) if (picFor(v, "' + lg + '")) t.add(v.t); return t.size; })()');
        const got = R.E('stickerBook("' + lg + '").total');
        ok(want > 100 && got === want, 'stickers: one sticker per pictured course word (' + lg + '): ' + got + ' of ' + want);
      }
      ok(R.E('stickerBook("es").got') === 0 && R.E('stickerBook("es").shiny') === 0, 'stickers: a new learner has none yet');
      const lessons = R.E('coreOrder("es").slice(0, 3).map(l => l.id)');
      const learnNow = ids => R.E('(() => { for (const id of ' + JSON.stringify(ids) + '){ const l = getLesson(id); l.vocab.forEach((_, i) => { S.langs.es.cards[itemKey(l, "v", i)] = { ef: 2.5, n: 0, iv: 0, due: addDays(today(), 1), last: today(), ts: 1 }; }); } })()');
      learnNow(lessons);
      const learned = R.E('(() => { const t = new Set(); for (const id of ' + JSON.stringify(lessons) + ') for (const v of getLesson(id).vocab) if (picFor(v, "es")) t.add(v.t); return t.size; })()');
      ok(learned > 0 && R.E('stickerBook("es").got') === learned && R.E('stickerBook("es").shiny') === 0, 'stickers: learning a word collects it: ' + learned);
      const one = R.E('(() => { for (const id of ' + JSON.stringify(lessons) + '){ const l = getLesson(id), i = l.vocab.findIndex(v => picFor(v, "es")); if (i >= 0) return { key: itemKey(l, "v", i), t: l.vocab[i].t }; } })()');
      const shinyOf = () => R.E('stickerBook("es").units.flatMap(x => x.items).find(s => s.v.t === ' + JSON.stringify(one.t) + ').shiny');
      rl().cards[one.key].n = 3;
      const shiny3 = shinyOf(); rl().cards[one.key].n = 2;
      ok(shiny3 === true && shinyOf() === false && R.E('STICKERS.shinyAt') === 3, 'stickers: a strong word shines');
      rl().cards[one.key].n = 3;
      const before = JSON.stringify(rl());
      R.E('UI.tab = "me"; render()');
      const card = rd.querySelector('#app .stickers'), sb = R.E('stickerBook("es")');
      ok(!!card && /Sticker book/.test(card.textContent) && card.querySelectorAll('.sticker-strip .sticker').length === Math.min(learned, R.E('STICKERS.recent')) && card.textContent.includes(sb.got + ' of ' + sb.total) && !!card.querySelector('.sticker.shiny'), 'stickers: Me shows the card');
      const open = [...card.querySelectorAll('button')].find(b => b.textContent === 'Open the sticker book'); open.click();
      const ov = rd.querySelector('.overlay.stickers');
      ok(!!ov && ov.querySelectorAll('.sticker').length === sb.total && ov.querySelectorAll('.sticker:not([disabled])').length === sb.got && ov.querySelectorAll('.sticker.shiny').length === sb.shiny && sb.shiny === 1 && ov.querySelectorAll('.sticker.empty').length === sb.total - sb.got, 'stickers: Me shows the book and it opens: ' + (ov && ov.querySelectorAll('.sticker').length) + ' of ' + sb.total);
      ov.querySelector('.ov-head button').click(); await sleep(300);
      ok(!rd.querySelector('.overlay.stickers:not(.out)') && JSON.stringify(rl()) === before, 'stickers: nothing is saved');
      // the finish screen shows the stickers just earned
      R.E('UI.tab = "learn"; render()');
      R.E('startLesson("es-3-1"); finishRun()');
      const fin = rd.querySelector('.overlay:not(.out) .complete'), learnedBlocks = fin ? [...fin.querySelectorAll('.learned')] : [];
      const newSt = learnedBlocks.find(x => /New stickers?/.test(x.textContent));
      ok(!!newSt && newSt.querySelectorAll('.sticker').length >= 1 && newSt.querySelectorAll('.sticker').length <= R.E('STICKERS.recent') && learnedBlocks.some(x => x.textContent.includes('Added to your review deck')), 'stickers: the finish screen shows new stickers');
      R.E('endRun()');
      ok(R.errors.length === 0, 'stickers: no page errors ' + R.errors.slice(0, 2).join(' | '));
      R.w.close();
    }
    // the speed round (P4 WP2): 60 seconds of word questions from your own words, a best per language, capped XP, no card changes
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, rl = () => R.P.S.langs.es, tile = () => rd.querySelector('#app [data-practice="speed"]');
      // learn words one at a time, as many as asked, each adding a new distinct word
      const learnTo = n => R.E('(() => { const L = S.langs.es; for (const l of coreOrder("es")) for (let i = 0; i < l.vocab.length; i++){ if (speedPool("es").length >= ' + n + ') return speedPool("es").length; const k = itemKey(l, "v", i); if (!L.cards[k]) L.cards[k] = { ef: 2.5, n: 1, iv: 1, due: addDays(today(), 3), last: today(), ts: 1 }; } return speedPool("es").length; })()');
      R.E('UI.tab = "review"; render()');
      ok(R.E('speedPool("es").length') === 0 && !tile(), 'speed: needs 8 learned words (none yet, no tile)');
      R.E('startSpeed()');
      ok(R.E('Speed.open') === false && !rd.querySelector('.overlay.speed') && R.E('busy()') === false, 'speed: startSpeed with too few words does nothing');
      ok(learnTo(7) === 7, 'speed: seven words');
      R.E('render()');
      ok(!tile(), 'speed: needs 8 learned words (seven, no tile)');
      R.E('startSpeed()');
      ok(R.E('Speed.open') === false, 'speed: needs 8 learned words (seven, startSpeed leaves it closed)');
      ok(learnTo(8) === 8, 'speed: eight words');
      R.E('render()');
      ok(!!tile() && /60 seconds\. Go!/.test(tile().textContent) && R.E('practiceTiles("es").map(t => t.id).slice(0, 3).join()') === 'weak,listen,speed', 'speed: needs 8 learned words (eight, the tile shows after Weakest items; Listen hands-free sits between)');
      learnTo(30);
      // every question is fair
      let fair = true, why = '';
      const pool = R.E('speedPool("es")'), enOf = Object.fromEntries(pool.map(x => [x.t, x.en]));
      for (let i = 0; i < 50 && fair; i++){
        const q = R.E('speedQ(speedPool("es"), ' + i + ', [])');
        const ens = q.options.map(o => q.toEn ? o : enOf[o]);
        const folded = ens.map(e => R.E('fold(norm(' + JSON.stringify(e) + ', "en"))'));
        if (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.includes(q.correct) || new Set(folded).size !== 4 || q.toEn !== (i % 2 === 0)){ fair = false; why = JSON.stringify(q); }
      }
      ok(fair, 'speed: every question is fair ' + why);
      for (const lg of ['de', 'it']){
        R.E('(() => { const L = S.langs.' + lg + '; for (const l of coreOrder("' + lg + '").slice(0, 2)) l.vocab.forEach((_, i) => { L.cards[itemKey(l, "v", i)] = { ef: 2.5, n: 1, iv: 1, due: addDays(today(), 3), last: today(), ts: 1 }; }); })()');
        const bad = R.E('(() => { const f = s => fold(norm(s, "en")), pool = speedPool("' + lg + '"), byT = Object.fromEntries(pool.map(x => [x.t, x])); let n = 0; const fails = []; for (let i = 0; i < 300; i++){ const q = speedQ(pool, i, []); if (q.options.length !== 4 || new Set(q.options).size !== 4){ fails.push("count " + JSON.stringify(q.options)); continue; } const mine = q.it.item.e.map(f); for (const o of q.options){ if (o === q.correct) continue; if (q.toEn){ if (mine.includes(f(o))) fails.push(q.prompt + " / " + o); } else if (byT[o].item.e.map(f).includes(f(q.it.en))) fails.push(q.prompt + " / " + o); } } return fails.slice(0, 3).join(" | "); })()');
        ok(bad === '', 'speed: no wrong option is also right (' + lg + '): ' + bad);
      }
      ok(R.E('(() => { const p = speedPool("es"), seen = []; for (let i = 0; i < 40; i++){ const q = speedQ(p, i, seen); seen.push(q.it.t); if (seen.length > 5) seen.shift(); if (seen.slice(0, -1).includes(q.it.t)) return false; } return true; })()'), 'speed: a word does not repeat within five questions');
      const cardsBefore = JSON.stringify(rl().cards), missBefore = JSON.stringify(rl().miss), xp0 = rl().xp || 0;
      // right answers score, a wrong one breaks the run
      R.E('UI.tab = "review"; render()');
      tile().click();
      ok(R.E('Speed.open') === true && !!rd.querySelector('.overlay.speed') && R.E('busy()') === true && !!rd.querySelector('.overlay.speed .speed-score') && rd.querySelectorAll('.overlay.speed .opts.speed .opt').length === 4, 'speed: the tile starts a round');
      const pick = text => { const b = [...rd.querySelectorAll('.overlay.speed .opts .opt')].find(x => x.textContent === text); b.click(); return b; };
      const right = () => pick(R.E('Speed.q.correct'));
      const first = right();
      ok(first.classList.contains('right'), 'speed: a right answer turns green');
      pick(R.E('Speed.q.options.find(o => o !== Speed.q.correct)'));
      ok(R.E('Speed.score') === 1 && R.E('Speed.answered') === 1, 'speed: taps while the result shows are ignored');
      await sleep(R.E('SPEED.rightMs') + 100);
      right(); await sleep(R.E('SPEED.rightMs') + 100);
      ok(R.E('Speed.score') === 2 && R.E('Speed.combo') === 2, 'speed: two right in a row');
      const wrongBtn = pick(R.E('Speed.q.options.find(o => o !== Speed.q.correct)'));
      ok(wrongBtn.classList.contains('wrong') && [...rd.querySelectorAll('.overlay.speed .opt.right')].length === 1, 'speed: a wrong answer shows the right one');
      ok(R.E('Speed.score') === 2 && R.E('Speed.combo') === 0 && R.E('Speed.bestCombo') === 2, 'speed: right answers score, wrong ones break the run');
      await sleep(R.E('SPEED.wrongMs') + 100);
      // pausing in the background
      const hide = v => { Object.defineProperty(rd, 'hidden', { configurable: true, get: () => v }); rd.dispatchEvent(new R.w.Event('visibilitychange')); };
      const leftBefore = R.E('Speed.ends - Date.now()');
      hide(true); await sleep(250);
      ok(R.E('Speed.paused') === true, 'speed: the clock stops when the page goes to the background');
      hide(false);
      const resume = [...rd.querySelectorAll('.overlay.speed .speed.paused button')].find(b => b.textContent === 'Resume');
      ok(!!resume && /Paused/.test(rd.querySelector('.overlay.speed').textContent), 'speed: coming back shows Paused and Resume');
      resume.click();
      const leftAfter = R.E('Speed.ends - Date.now()');
      ok(R.E('Speed.paused') === false && !!rd.querySelector('.overlay.speed .opts.speed') && leftAfter > leftBefore - 400 && leftAfter <= leftBefore + 50, 'speed: Resume gives back the time that was left: ' + leftBefore + ' -> ' + leftAfter);
      // the best is kept and XP is capped
      R.E('Speed.score = 20; Speed.answered = 22; speedEnd()');
      ok(R.E('S.stats["speed-es"]') === 20 && (rl().xp || 0) - xp0 === R.E('SPEED.xpCap + XP.review') && R.E('SPEED.xpCap + XP.review') <= 15, 'speed: the best is kept and XP is capped: ' + ((rl().xp || 0) - xp0));
      const fin = rd.querySelector('.overlay.speed .complete');
      ok(!!fin && /New best!/.test(fin.textContent) && fin.querySelector('.stamp.gold') && /20 right/.test(fin.textContent), 'speed: the finish screen celebrates a new best');
      // Play again starts a fresh round
      rd.querySelector('.overlay.speed [data-more="again"]').click();
      ok(R.E('Speed.open') === true && R.E('Speed.score') === 0 && R.E('Speed.over') === false && !!rd.querySelector('.overlay.speed .opts.speed'), 'speed: Play again starts a new round');
      const xp1 = rl().xp || 0;
      R.E('Speed.score = 5; Speed.answered = 6; speedEnd()');
      ok(R.E('S.stats["speed-es"]') === 20 && (rl().xp || 0) - xp1 === 5 + R.E('XP.review') && /Your best is 20/.test(rd.querySelector('.overlay.speed .complete').textContent), 'speed: a later, lower round leaves the best at 20');
      const xp2 = rl().xp || 0;
      R.E('speedEnd()');
      ok((rl().xp || 0) === xp2, 'speed: ending twice pays once');
      rd.querySelector('.overlay.speed [data-more="again"]').click();
      R.E('Speed.score = 0; speedEnd()');
      ok((rl().xp || 0) === xp2 && R.E('S.stats["speed-es"]') === 20, 'speed: a round with no right answers pays nothing');
      ok(JSON.stringify(rl().cards) === cardsBefore && JSON.stringify(rl().miss) === missBefore, 'speed: no review card or mistake changes');
      // Close ends it
      const done = [...rd.querySelectorAll('.overlay.speed .ov-foot button')].find(b => b.textContent === 'Continue'); done.click(); await sleep(300);
      ok(R.E('Speed.open') === false && R.E('busy()') === false && !rd.querySelector('.overlay.speed:not(.out)') && /Best: 20/.test(tile() ? tile().textContent : ''), 'speed: Continue closes it and the tile shows the best');
      tile().click();
      rd.querySelector('.overlay.speed .ov-head button[aria-label="Close"]').click(); await sleep(300);
      ok(R.E('Speed.open') === false && R.E('busy()') === false && !rd.querySelector('.overlay.speed:not(.out)') && R.E('S.stats["speed-es"]') === 20, 'speed: Play again and Close (Close ends it)');
      ok(R.E('mergeStats({ "speed-es": 20, a: 1 }, { "speed-es": 12, a: 4 })["speed-es"]') === 20, 'speed: a stats best merges by maximum');
      ok(R.errors.length === 0, 'speed: no page errors ' + R.errors.slice(0, 2).join(' | '));
      R.w.close();
    }
    // streak milestones and new badges (P4 WP3)
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, rl = () => R.P.S.langs.es;
      const OLD = ['first', 'streak3', 'streak7', 'streak30', 'words50', 'words250', 'words1000', 'flawless', 'combo10', 'review100', 'story1', 'stories8', 'talk', 'chest7', 'friend', 'rival', 'levelA1', 'levelB1', 'levelC2', 'checkpoint1', 'checkpoint5', 'checkpoint100', 'fixer', 'forms50', 'both', 'early', 'night'];
      const NEW = ['streak14', 'streak50', 'streak100', 'streak365', 'stickers50', 'shiny25', 'speed20'];
      const ids = R.E('BADGES.map(b => b.id)');
      ok(ids.length === 34 && new Set(ids).size === 34 && JSON.stringify(ids.filter(i => !NEW.includes(i))) === JSON.stringify(OLD) && NEW.every(i => ids.includes(i)), 'badges: 34 badges, the old ones unchanged');
      const at = i => ids.indexOf(i);
      ok(at('streak7') < at('streak14') && at('streak14') < at('streak30') && at('streak30') + 1 === at('streak50') && at('streak50') + 1 === at('streak100') && at('streak100') + 1 === at('streak365') && at('forms50') + 1 === at('stickers50') && at('stickers50') + 1 === at('shiny25') && at('shiny25') + 1 === at('speed20'), 'badges: the new ones sit where the plan puts them');
      ok(R.E('BADGES.every(b => typeof BADGE_ART[b.icon] === "string" && b.name && b.desc)'), 'badges: every badge has a drawn icon, a name and a description');
      R.E('UI.tab = "me"; render()');
      ok(rd.querySelectorAll('#app .badge-cell').length === 34 && /0 of 34/.test(rd.querySelector('#app .badge-grid').previousElementSibling.textContent), 'badges: Me lists all 34');
      // streak milestones
      R.E('S.days = {}; for (let i = 0; i < 14; i++) S.days[addDays(today(), -i)] = { xp: 25, met: true }');
      const got = R.E('checkBadges({})');
      ok(got.includes('streak14') && got.includes('streak7') && R.P.S.badges.streak14 && !R.P.S.badges.streak30 && !R.P.S.badges.streak50, 'badges: streak milestones: 14 days earns streak14 and not streak50: ' + got.join());
      ok(R.E('checkBadges({})').length === 0, 'badges: a badge is earned once');
      R.E('S.days = {}; for (let i = 0; i < 365; i++) S.days[addDays(today(), -i)] = { xp: 25, met: true }');
      const big = R.E('checkBadges({})');
      ok(['streak30', 'streak50', 'streak100', 'streak365'].every(i => big.includes(i)), 'badges: a year earns every streak badge: ' + big.join());
      // stickers and speed
      const learnPics = n => R.E('(() => { const L = S.langs.es; for (const l of coreOrder("es")) for (let i = 0; i < l.vocab.length; i++){ if (stickerBook("es").got >= ' + n + ') return stickerBook("es").got; if (picFor(l.vocab[i], "es")){ const k = itemKey(l, "v", i); if (!L.cards[k]) L.cards[k] = { ef: 2.5, n: 0, iv: 0, due: addDays(today(), 1), last: today(), ts: 1 }; } } return stickerBook("es").got; })()');
      ok(learnPics(49) === 49 && !R.E('checkBadges({})').includes('stickers50'), 'badges: 49 stickers is not enough');
      learnPics(50);
      ok(R.E('stickerBook("es").got') === 50 && R.E('checkBadges({})').includes('stickers50') && !R.P.S.badges.shiny25 && !R.P.S.badges.speed20, 'badges: stickers and speed: 50 pictured Spanish words earn stickers50');
      R.E('(() => { let n = 0; for (const k of Object.keys(S.langs.es.cards)) if (n < 24){ S.langs.es.cards[k].n = 3; n++; } })()');
      const shinyNow = R.E('stickerBook("es").shiny');
      ok(shinyNow === 24 && !R.E('checkBadges({})').includes('shiny25'), 'badges: 24 shiny stickers is not enough: ' + shinyNow);
      R.E('(() => { for (const k of Object.keys(S.langs.es.cards)) S.langs.es.cards[k].n = 3; })()');
      ok(R.E('stickerBook("es").shiny') >= 25 && R.E('checkBadges({})').includes('shiny25'), 'badges: 25 shiny stickers earn shiny25');
      R.E('S.stats["speed-es"] = 19');
      ok(!R.E('checkBadges({})').includes('speed20'), 'badges: a speed score of 19 is not enough');
      R.E('S.stats["speed-es"] = 20');
      ok(R.E('checkBadges({})').includes('speed20'), 'badges: stickers and speed: a speed score of 20 earns speed20');
      // the milestone moment
      R.E('S.days = {}; for (let i = 0; i < 7; i++) S.days[addDays(today(), -i)] = { xp: 25, met: true }; window.__cf = []; confetti = (host, n) => { window.__cf.push(n); }');
      const finish = badges => { R.E('openOverlay("run"); showComplete({ lang: "es", top: "Lesson complete", title: "Hola", xp: 5, acc: 0.5, h1: "Good practice.", sub: null, third: [1, "day streak"], badges: ' + JSON.stringify(badges) + ', quests: [], onDone: () => {} })'); return rd.querySelector('.overlay:not(.out) .complete'); };
      let c = finish(['streak7']);
      ok(c.querySelector('h1').textContent === '7 days in a row!' && !!c.querySelector('.stamp.gold') && !!c.querySelector('.complete-pip.fly') && c.querySelector('.complete-pip').rig.home === 'fly' && /Good practice\./.test(c.querySelector('h1').nextElementSibling.textContent) && c.textContent.includes('One week strong') && R.E('window.__cf.pop()') === 180, 'milestone: a new streak badge is a moment');
      R.E('closeOverlay(true)');
      R.E('openOverlay("run"); showComplete({ lang: "es", top: "Lesson complete", title: "Hola", xp: 5, acc: 1, h1: "Flawless.", sub: "Next on your route.", third: [1, "day streak"], badges: ["streak3", "streak7"], quests: [], onDone: () => {} })');
      c = rd.querySelector('.overlay:not(.out) .complete');
      ok(c.querySelector('h1').textContent === '7 days in a row!' && c.querySelector('h1').nextElementSibling.textContent === 'Next on your route.' && c.querySelectorAll('.badge-new').length === 2, 'milestone: an existing sub line is kept');
      R.E('closeOverlay(true)');
      c = finish(['streak3']);
      ok(c.querySelector('h1').textContent === 'Good practice.' && !c.querySelector('.stamp.gold') && !c.querySelector('.complete-pip.fly') && R.E('window.__cf.pop()') === 110, 'milestone: the 3-day badge is not a milestone');
      R.E('closeOverlay(true)');
      c = finish([]);
      ok(c.querySelector('h1').textContent === 'Good practice.' && !c.querySelector('.stamp.gold') && c.querySelector('.complete-pip.cheer'), 'milestone: no badge, the finish screen is as before');
      R.E('closeOverlay(true)');
      ok(R.errors.length === 0, 'milestone: no page errors ' + R.errors.slice(0, 2).join(' | '));
      R.w.close();
    }
    // every move has a moment (Q5): no mood or clip of the birds goes unused, and the new moments show up
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document;
      const uiDir = path.join(ROOT, 'js', 'ui');
      const screens = fs.readdirSync(uiDir).filter(f => f.endsWith('.js') && f !== 'film.js').map(f => fs.readFileSync(path.join(uiDir, f), 'utf8')).concat(fs.readFileSync(path.join(ROOT, 'js', 'core', 'art.js'), 'utf8')).join('\n');
      const moodNames = R.E('Object.keys(Bird.BIRD.moods)'), clipNames = R.E('Object.keys(Bird.BIRD.clips)'), moodClip = R.E('Object.fromEntries(Object.entries(Bird.BIRD.moods).map(([k, m]) => [k, m.clip || null]))');
      ok(moodNames.length >= 18 && clipNames.length >= 19, 'birds: the mood and clip tables were read from the app: ' + moodNames.length + ' moods, ' + clipNames.length + ' clips');
      const moodLines = screens.split('\n').filter(l => /\b(pip|teachPip|pipBriefly|setPipMood)\(|\bmood\b/.test(l)).join('\n');   // only lines that ask a bird for a mood
      const moodUsed = m => moodLines.includes("'" + m + "'");
      for (const m of moodNames) ok(moodUsed(m), 'birds: every mood has a moment: "' + m + '" is on no screen. Give it a screen or remove it from the plan that added it');
      for (const c of clipNames){
        const viaMood = Object.keys(moodClip).some(m => moodClip[m] === c && moodUsed(m));
        const direct = new RegExp("play\\('" + c + "'\\)|move: '" + c + "'").test(screens);
        ok(viaMood || direct, 'birds: every clip has a moment: "' + c + '" is played by no screen. Give it a screen or remove it from the plan that added it');
      }
      ok(R.E('PIP_TAPS.some(t => t.mood === "laugh")'), 'birds: a tap can make the bird laugh');
      // a shrugging bird shakes its head
      R.E('window.__plays = []; window.__shrug = pip("shrug", 40); document.body.append(window.__shrug); { const p = window.__shrug.rig.play.bind(window.__shrug.rig); window.__shrug.rig.play = n => { window.__plays.push(n); return p(n); }; }');
      R.E('window.__shrug.click()');
      ok(JSON.stringify(R.E('window.__plays')) === '["shake"]', 'birds: a shrugging bird shakes its head: ' + JSON.stringify(R.E('window.__plays')));
      ok(['talk.js', 'review.js'].every(f => { const src = fs.readFileSync(path.join(ROOT, 'js', 'ui', f), 'utf8'); return /'shrug'/.test(src) && !/'shrug'[^\n;]{0,40}tap: false/.test(src); }), 'birds: the shrugging birds on Talk and Review can be tapped');
      R.E('window.__shrug.remove()');
      // eight in a row laughs, four dances
      R.E('startLesson(COURSE.es.units[0].lessons[0].id)');
      R.E('Run.started = true; Run.queue = buildLesson(Run.lesson); Run.pos = 0; runHead(); nextEx()');
      const fbMood = combo => {
        let g = 0;
        while (g++ < 60){
          const ex = R.E('Run.cur');
          if (ex && ex.options && ex.correct !== undefined && ex.type !== 'match' && !R.E('Run.first.has(Run.cur.id)')) break;
          R.E('Run.pos++; nextEx()');
        }
        R.E('Run.combo = ' + (combo - 1) + '; Run.value = ' + JSON.stringify(R.E('Run.cur.correct')) + '; Run.canCheck = true; doCheck()');
        const el = rd.querySelector('.overlay:not(.out) .fb-pip');
        const cls = el ? el.className : '';
        [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Continue').click();
        return cls;
      };
      const c8 = fbMood(8), c4 = fbMood(4);
      ok(/\blaugh\b/.test(c8) && !/\bdance\b/.test(c8), 'feedback: eight in a row laughs: ' + c8);
      ok(/\bdance\b/.test(c4) && !/\blaugh\b/.test(c4), 'feedback: four in a row still dances: ' + c4);
      R.E('closeOverlay(true)');
      // the finish screen
      R.E('window.__cf = []; confetti = (host, n) => { window.__cf.push(n); }');   // jsdom has no canvas: count the calls instead
      const finishCp = pass => {
        R.E('window.__cf.length = 0; startCheckpoint(COURSE.es.units[0], true)');
        R.E(pass ? 'Run.first.set("a", "exact"); Run.first.set("b", "exact"); finishRun()' : 'Run.first.set("a", "wrong"); Run.first.set("b", "wrong"); finishRun()');
        const c = rd.querySelector('.overlay:not(.out) .complete');
        const out = { cls: c.querySelector('.complete-pip').className, say: c.querySelector('.complete-pip .pip-say').textContent, confetti: R.E('window.__cf.length') > 0 || !!rd.querySelector('.overlay:not(.out) canvas.confetti'), h1: c.querySelector('h1').textContent };
        R.E('closeOverlay(true)');
        return out;
      };
      const bad = finishCp(false), good = finishCp(true);
      ok(/\bsad\b/.test(bad.cls) && R.E('PIP_SAYS.es.oops').includes(bad.say) && !bad.confetti && bad.h1 === 'Not quite yet.', 'finish: a failed checkpoint is gentle: ' + JSON.stringify(bad));
      ok(/\bproud\b/.test(good.cls) && good.confetti, 'finish: a passed checkpoint is proud, with confetti: ' + JSON.stringify(good));
      const finishLesson = acc => {
        R.E('openOverlay("run"); showComplete({ lang: "es", top: "Lesson complete", title: "Hola", xp: 5, acc: ' + acc + ', h1: "x", sub: null, third: [1, "day streak"], badges: [], quests: [], onDone: () => {} })');
        const cls = rd.querySelector('.overlay:not(.out) .complete-pip').className; R.E('closeOverlay(true)'); return cls;
      };
      const fl = finishLesson(1), mi = finishLesson(0.5);
      ok(/\bdance\b/.test(fl) && /\bcheer\b/.test(mi) && !/\bsad\b|\bproud\b/.test(fl + mi), 'finish: lessons are unchanged: ' + fl + ' / ' + mi);
      R.E('window.__cf.length = 0; openOverlay("run"); showComplete({ lang: "es", top: "Checkpoint", title: "x", xp: 3, acc: 0, h1: "Not quite yet.", sub: "y", third: [7, "day streak"], badges: ["streak7"], quests: [], mood: "sad", calm: true, onDone: () => {} })');
      { const p = rd.querySelector('.overlay:not(.out) .complete-pip'); ok(/\bfly\b/.test(p.className) && R.E('PIP_SAYS.es.cheer').includes(p.querySelector('.pip-say').textContent) && R.E('window.__cf.length') > 0, 'finish: a streak milestone still celebrates after a failed checkpoint: ' + p.className); }
      R.E('closeOverlay(true)');
      // before a test
      const readyBefore = rd.querySelectorAll('.pip.ready').length;
      R.E('confirmTestOut(COURSE.es.units[0])');
      const readyNow = [...rd.querySelectorAll('.pip.ready')];
      ok(readyNow.length === readyBefore + 1 && /Test out of this unit\?/.test(rd.body.textContent), 'test out: the bird is ready');
      ok(R.errors.length === 0, 'every move: no page errors ' + R.errors.slice(0, 2).join(' | '));
      R.w.close();
    }
    // touch and scrolling (Q3): controls behave like an app's, text you read stays selectable, the long route skips what is off screen
    {
      const cssOf = f => fs.readFileSync(path.join(ROOT, 'styles', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const bcss = cssOf('base.css'), ccss = cssOf('components.css');
      const rules = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].split(',').map(x => x.trim()), body: m[2].replace(/\s+/g, '') }));
      const ctl = rules(bcss).find(r => r.sel.join(',').startsWith('button,.btn,.chip,.tab'));
      const noSelect = fs.readdirSync(path.join(ROOT, 'styles')).filter(f => f.endsWith('.css')).flatMap(f => rules(cssOf(f)).filter(r => /user-select:none/.test(r.body)).flatMap(r => r.sel.filter(x => ['*', 'html', 'body', '.say', '.w', 'p', '.view'].includes(x)).map(x => f + ' ' + x)));
      ok(!!ctl && /touch-action:manipulation/.test(ctl.body) && /(^|[;{])user-select:none/.test(ctl.body) && !noSelect.length && /\.chip\.static\{[^}]*user-select:text/.test(bcss), 'touch: controls don\'t select or wait ' + (ctl ? '' : '(no rule starts button,.btn,.chip,.tab) ') + noSelect.join(', '));
      ok(bcss.replace(/\s+/g, '').includes('@media(display-mode:standalone){html{overscroll-behavior-y:none}}'), 'touch: no pull-to-reload in the Home Screen app');
      ok(ccss.replace(/\s+/g, '').includes('.unit{content-visibility:auto;contain-intrinsic-size:auto380px}'), 'learn: off-screen units are skipped');
    }
    // every control has a name, and a sheet holds the keyboard focus and gives it back (Q3 WP2, R-10)
    {
      const R = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
      const rd = R.w.document, D = rd;
      const named = el => !!((el.getAttribute('aria-label') || '').trim() || (el.getAttribute('title') || '').trim() || el.textContent.trim() || (el.id && D.querySelector('label[for="' + el.id + '"]')) || el.closest('label'));
      const unnamed = root => [...root.querySelectorAll('button,a[href],input,select,textarea,[role="button"]')].filter(el => el.type !== 'hidden' && !named(el)).map(el => el.outerHTML.slice(0, 120));
      const top = () => rd.querySelector('.overlay:not(.out)'), foot = l => [...rd.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === l);
      const nameCheck = (place, ...roots) => {
        const bad = roots.flatMap(r => r ? unnamed(r) : []);
        ok(!bad.length, 'a11y: every control has a name (' + place + '): ' + bad.slice(0, 5).join(' | '));
      };
      ok(unnamed(R.E('(() => { const d = document.createElement("div"); d.innerHTML = "<button><svg></svg></button><button aria-label=\\"Close\\"></button><a href=\\"#\\">Go</a>"; return d; })()')).length === 1, 'a11y: the walker catches an icon button with no name');
      // the six tabs
      for (const t of ['learn', 'stories', 'review', 'talk', 'friends', 'me']){ R.E('UI.tab = ' + JSON.stringify(t) + '; render()'); nameCheck(t + ' tab', rd.querySelector('#app'), rd.querySelector('#tabs')); }
      // lessons: the intro, the first teach card, then the first three exercises, each before and after it is answered
      const walk = async (id, withTeach) => {
        R.E('endRun(); startLesson(' + JSON.stringify(id) + ')');
        nameCheck(id + ' intro', top());
        foot('Start lesson').click();
        if (withTeach) nameCheck(id + ' first teach card', top());
        for (let n = 0, guard = 0; n < 3 && guard++ < 30;){
          const ex = R.E('Run.cur');
          if (ex.type === 'teach'){ foot('Continue').click(); continue; }
          n++;
          nameCheck(id + ' exercise ' + n + ' (' + ex.type + ')', top());
          if (ex.type === 'match'){
            const opts = [...rd.querySelectorAll('.overlay:not(.out) .match .opt')], left = opts.filter((_, i) => i % 2 === 0), right = opts.filter((_, i) => i % 2 === 1);
            for (const it of ex.items){ const a = left.find(b => b.textContent === it.t), b = right.find(b => b.textContent === it.e[0]); if (a && b){ a.click(); b.click(); } }
            await sleep(320);
          } else {
            let ans;
            switch (ex.type){
              case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break;
              case 'bank-e2t': case 'listen': ans = R.P.tileTokens(ex.item.t).join(' '); break;
              case 'bank-t2e': ans = R.P.tileTokens(ex.item.e[0]).join(' '); break;
              default: ans = ex.correct;
            }
            R.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()');
          }
          nameCheck(id + ' exercise ' + n + ' feedback', top());
          const c = foot('Continue'); if (c) c.click();
        }
      };
      await walk('de-1-1', true);
      await walk('es-3-1', false);
      await walk('it-1-1', false);
      // the finish screen
      R.E('finishRun()'); await sleep(300);
      nameCheck('finish screen', top());
      R.E('endRun(); closeOverlay(true)');
      // a story: its first screen and its first line
      const st = R.E('STORIES.find(s => s.lang === "es").id');
      R.E('openStory(' + JSON.stringify(st) + ')');
      nameCheck('story first screen', top());
      foot('Start reading').click(); await sleep(60);
      nameCheck('story first line', top());
      R.E('endStory()');
      R.E('openStory(' + JSON.stringify(st) + ')'); top().querySelector('.story-listen').click(); await sleep(60);
      nameCheck('story listening footer', top());
      R.E('endStory()'); await sleep(300);
      // the bird picker sheet
      R.E('UI.tab = "me"; render()'); R.E('openBirdPicker()');
      nameCheck('bird picker sheet', rd.querySelector('.sheet-back'));
      rd.querySelector('.sheet-back .sheet-actions button').click(); await sleep(250);
      // the feedback sheet and the restore sheet (fields with only a placeholder used to have no name)
      for (const [place, open] of [['feedback sheet', 'openFeedback({})'], ['restore sheet', 'restoreBackup()']]){
        R.E(open); const sb = rd.querySelector('.sheet-back');
        ok(!!sb && !!sb.querySelector('textarea'), 'a11y: ' + place + ' opened with its field');
        nameCheck(place, sb);
        sb.querySelector('.sheet-actions button').click(); await sleep(250);
      }
      // onboarding's first step
      R.E('S.settings.onboarded = false; openOnboarding(false)');
      nameCheck('onboarding first step', top());
      R.E('S.settings.onboarded = true; closeOverlay(true)');
      // newer screens: the speed round and the Review tile, its finish screen with its extra buttons, the sticker book, the offline card
      R.E('(() => { const L = S.langs.es; for (const l of coreOrder("es")) for (let i = 0; i < l.vocab.length; i++){ if (speedPool("es").length >= 12) return; const k = itemKey(l, "v", i); if (!L.cards[k]) L.cards[k] = { ef: 2.5, n: 1, iv: 1, due: addDays(today(), 3), last: today(), ts: 1 }; } })()');
      R.E('UI.tab = "review"; render()');
      nameCheck('review tab with the speed tile', rd.querySelector('#app'));
      R.E('startSpeed()'); nameCheck('speed round', top());
      R.E('Speed.score = 5; Speed.answered = 6; speedEnd()'); await sleep(200);
      ok(!!rd.querySelector('.overlay [data-more="again"]'), 'a11y: the speed finish screen has its extra button');
      nameCheck('speed finish screen (data-more buttons)', top());
      R.E('endSpeed()');
      R.E('startListen()'); nameCheck('listen hands-free screen', top());
      R.E('listenEnd()'); nameCheck('listen hands-free finish screen', top());
      R.E('endListen()'); await sleep(300);
      R.E('openStickers()'); nameCheck('sticker book', top()); R.E('closeOverlay(true)');
      { let card = null;
        try { R.E('Offline.on = true; UI.tab = "me"; render()'); await sleep(300); card = rd.querySelector('.offline-card'); } catch (e) {}
        if (card) nameCheck('Me offline card', card);
        R.E('Offline.on = false'); }
      // sheets: Tab stays inside, closing gives the focus back
      R.E('UI.tab = "learn"; render()');
      const opener = rd.querySelector('#tabs .tab'); opener.focus();
      const close = R.E('sheet("Two actions", document.createElement("p"), [{ label: "First" }, { label: "Second" }])');
      const acts = [...rd.querySelectorAll('.sheet-back .sheet-actions button')];
      const tab = shiftKey => { const ev = new R.w.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }); rd.dispatchEvent(ev); return ev.defaultPrevented; };
      await sleep(80);
      acts[acts.length - 1].focus();
      const fwd = tab(false) && rd.activeElement === acts[0];
      const back = tab(true) && rd.activeElement === acts[acts.length - 1];
      ok(acts.length === 2 && fwd && back, 'sheet: Tab stays inside: the last control wraps to the first, and Shift+Tab on the first goes to the last');
      ok(rd.querySelector('.sheet-back .sheet').getAttribute('tabindex') === '-1', 'sheet: the box can take focus when it has no control of its own');
      close(); await sleep(250);
      ok(!rd.querySelector('.sheet-back') && rd.activeElement === opener, 'sheet: closing gives the focus back');
      { // a sheet that starts a lesson must not hand the focus to the route behind the lesson
        R.E('UI.tab = "learn"; render()');
        const st = [...rd.querySelectorAll('#app .station')][2]; st.focus();
        R.E('confirmLocked(coreOrder("es")[2])'); await sleep(80);
        [...rd.querySelectorAll('.sheet-back .sheet-actions button')].find(b => b.textContent === 'Start lesson').click(); await sleep(250);
        ok(!!rd.querySelector('.overlay:not(.out)') && !rd.activeElement.closest('#app'), 'sheet: a sheet that starts a lesson leaves the focus off the route');
        R.E('endRun(); closeOverlay(true)'); await sleep(50);
        // a sheet opened from a sheet: the focus goes back to the first opener
        R.E('UI.tab = "learn"; render()');
        const tab = rd.querySelector('#tabs .tab'); tab.focus();
        R.E('window.__B = null; sheet("A", document.createElement("p"), [{ label: "Open B", run: () => { window.__B = sheet("B", document.createElement("p"), [{ label: "Done" }]); } }])'); await sleep(80);
        [...rd.querySelectorAll('.sheet-back .sheet-actions button')].find(b => b.textContent === 'Open B').click(); await sleep(250);
        const bs = [...rd.querySelectorAll('.sheet-back:not(.out)')];
        ok(bs.length === 1 && bs[0].getAttribute('aria-label') === 'B' && rd.activeElement.closest('.sheet-back') === bs[0], 'sheet: opening B from A leaves the focus in B: ' + bs.length);
        R.E('window.__B()'); await sleep(250);
        ok(!rd.querySelector('.sheet-back') && rd.activeElement === tab, 'sheet: a sheet opened from a sheet gives the focus back to the first opener');
      }
      ok(R.errors.length === 0, 'a11y: no page errors ' + R.errors.slice(0, 2).join(' | '));
      R.w.close();
    }
    // Listen hands-free (P5 WP1): your words read aloud in Review. It changes no card, XP or quest, and nothing plays after it is closed
    {
      const T0 = { gapSay: Q.E('LISTEN.gapSay'), gapReveal: Q.E('LISTEN.gapReveal'), gapNext: Q.E('LISTEN.gapNext') };
      const cardsBefore = JSON.stringify(L().cards);
      Q.E('window.__speak0 = speak; window.__onb = Onb.open; Onb.open = false; window.__said = []; speak = function(t){ window.__said.push(String(t)); return new Promise(r => setTimeout(() => r(true), 5)); }; LISTEN.gapSay = LISTEN.gapReveal = LISTEN.gapNext = 1; closeOverlay(true)');
      const seed = n => Q.E('(() => { const L = S.langs.es; L.cards = {}; let k = 0; for (const l of coreOrder("es")) for (let i = 0; i < l.vocab.length && k < ' + n + '; i++, k++) L.cards[itemKey(l, "v", i)] = { ef: 2.5 - k * 0.01, n: 1, iv: 1, due: k < 3 ? today() : addDays(today(), 4), last: today(), ts: 1 }; })()');
      const said = () => Q.E('window.__said.length'), listenTile = () => Q.E('practiceTiles("es").some(t => t.id === "listen")');
      // offered from 6 learned items
      Q.E('S.settings.lang = "es"');
      seed(5); ok(Q.E('learnedEntries("es").length') === 5 && !listenTile(), 'listen: no tile under 6 learned items');
      Q.E('startListen()'); ok(Q.E('Listen.open') === false && !qd.querySelector('.overlay.listen'), 'listen: startListen does nothing under 6 learned items');
      seed(10);
      ok(listenTile() === (Q.E('learnedEntries("es").length') >= 6) && listenTile(), 'listen: offered from 6 learned items');
      Q.E('UI.tab = "review"; render()');
      ok(!!qd.querySelector('[data-practice="listen"]') && /Listen hands-free/.test(qd.querySelector('[data-practice="listen"]').textContent), 'listen: the Review tile is there');
      // due items first, no repeats, at most 20
      { const items = Q.E('listenItems("es")'), texts = [...items].map(i => i.t), due = Q.E('dueEntries("es")');
        ok(new Set(texts).size === texts.length && texts.length <= 20 && texts.length >= 6 && (!due.length || texts[0] === due[0].item.t), 'listen: due items first, no repeats, at most 20: ' + texts.length);
        ok(texts.length === 10 && Q.E('listenItems("es").slice(0, 3).every(i => dueEntries("es").some(e => e.item.t === i.t))'), 'listen: the due ones come before the shaky ones'); }
      const snap = () => JSON.stringify([L().cards, L().xp, L().miss, Q.E('S.days[today()]')]);
      const before = snap();
      // the lock screen and the screen lock, where the phone has them
      Q.E('window.__ms = { metadata: null, playbackState: "none", h: {}, setActionHandler(a, f){ this.h[a] = f; } }; Object.defineProperty(navigator, "mediaSession", { configurable: true, value: window.__ms }); window.MediaMetadata = function(o){ Object.assign(this, o); }; window.__wl = { n: 0, released: 0 }; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl.n++; return { release: async () => { window.__wl.released++; }, addEventListener(){} }; } } })');
      // the song is held while it's open
      const song0 = Q.E('busy()');
      Q.E('startListen()');
      ok(song0 === false && Q.E('busy()') === true && !!qd.querySelector('.overlay.listen'), 'listen: the song is held while it\'s open');
      ok(Q.E('Listen.playing') === true && qd.querySelector('.overlay.listen .ls-t').textContent === Q.E('Listen.items[0].t') && Q.E('window.__said[0]') === Q.E('Listen.items[0].t'), 'listen: it starts at once with the first line');
      { const e0 = qd.querySelector('.overlay.listen .ls-e'), pb = qd.querySelector('.overlay.listen [data-ls="play"]'); pb.focus();
        Q.E('Listen.reveal = true; listenDraw()'); const a1 = qd.activeElement.dataset.ls, same = qd.querySelector('.overlay.listen .ls-e') === e0 && e0.classList.contains('on');
        Q.E('listenPause()');
        ok(a1 === 'play' && qd.activeElement.dataset.ls === 'play' && qd.activeElement.textContent === 'Play', 'listen: a redraw keeps focus on the button you were on: ' + a1 + ' ' + (qd.activeElement.dataset || {}).ls);
        ok(same, 'listen: the meaning fades in on the node that is already there'); }
      ok(Q.E('Object.keys(__ms.h).length') === 4 && Q.E('Object.values(__ms.h).every(f => typeof f === "function")') && Q.E('__ms.metadata.title') === Q.E('Listen.items[0].t') && Q.E('__ms.metadata.album').startsWith('Parlance'), 'listen: the lock screen gets the line and four buttons');
      // pause, next and previous
      Q.E('listenPause()');
      ok(Q.E('Listen.playing') === false && /Play/.test(qd.querySelector('.overlay.listen .ls-controls .btn').textContent), 'listen: pause, next and previous (paused, the button says Play)');
      Q.E('listenStep(1)'); const p1 = Q.E('Listen.pos');
      Q.E('listenStep(-1)'); const p0 = Q.E('Listen.pos');
      Q.E('listenStep(-1)');
      ok(p1 === 1 && p0 === 0 && Q.E('Listen.pos') === 0 && Q.E('Listen.playing') === false, 'listen: pause, next and previous: ' + p1 + ' ' + p0);
      { const n0 = said(); await sleep(150); ok(said() === n0, 'listen: nothing plays while paused'); }
      // the headphone buttons
      Q.E('__ms.h.nexttrack()'); ok(Q.E('Listen.pos') === 1, 'listen: the next button on the headphones skips');
      Q.E('__ms.h.previoustrack()');
      // plays to the end on its own
      Q.E('window.__said.length = 0; __ms.h.play()');
      ok(Q.E('Listen.playing') === true, 'listen: the play button on the headphones starts it again');
      let g = 0; while (!/heard\./.test(qd.querySelector('.overlay.listen') ? qd.querySelector('.overlay.listen').textContent : '') && g++ < 200) await sleep(50);
      const n = Q.E('Listen.items.length');
      ok(/heard\./.test(qd.querySelector('.overlay.listen').textContent) && Q.E('Listen.pos') === n && n === 10, 'listen: plays to the end on its own: ' + Q.E('Listen.pos') + ' of ' + n);
      ok(said() === 2 * n && Q.E('window.__said.every((t, i) => t === Listen.items[i >> 1].t)'), 'listen: every item twice, in order: ' + said());
      ok(/All 10 heard\./.test(qd.querySelector('.overlay.listen h1').textContent) && /still waiting in Review/.test(qd.querySelector('.overlay.listen').textContent), 'listen: the end says what it didn\'t do while reviews are due');
      ok(Q.E('__ms.metadata') === null && Object.values(Q.E('__ms.h')).every(f => f === null), 'listen: the lock screen is cleared when it ends');
      await sleep(30); ok(Q.E('__wl.n') >= 1 && Q.E('__wl.released') === Q.E('__wl.n'), 'listen: the screen is held while it plays and let go at the end: ' + Q.E('__wl.n') + '/' + Q.E('__wl.released'));
      // Again plays it again, Done closes it and nothing is open
      qfoot('Again').click();
      ok(Q.E('Listen.playing') === true && Q.E('Listen.pos') === 0 && !/heard\./.test(qd.querySelector('.overlay.listen').textContent), 'listen: Again starts over');
      Q.E('listenStep(1000)'); ok(/heard\./.test(qd.querySelector('.overlay.listen').textContent), 'listen: skipping past the last item ends it');
      qfoot('Done').click(); await sleep(350);
      ok(Q.E('Listen.open') === false && !qd.querySelector('.overlay.listen') && Q.E('busy()') === false, 'listen: Done closes it and nothing is open');
      ok(snap() === before, 'listen: changes no card, XP or quest');
      // closing in the middle of a line: nothing plays afterwards
      Q.E('window.__said.length = 0; startListen()'); await sleep(40);
      qd.querySelector('.overlay.listen .ov-head button').click(); const n1 = said(); await sleep(300);
      ok(Q.E('Listen.open') === false && !qd.querySelector('.overlay.listen') && said() === n1 && n1 > 0 && n1 < 20 && Q.E('busy()') === false, 'listen: nothing plays after closing: ' + n1 + ' then ' + said());
      ok(Q.E('__ms.metadata') === null && Q.E('__wl.released') === Q.E('__wl.n'), 'listen: closing clears the lock screen and lets go of the screen');
      ok(snap() === before, 'listen: closing early changes no card, XP or quest');
      // a phone with neither Media Session nor Wake Lock, and a line that can't play
      Q.E('delete navigator.mediaSession; delete navigator.wakeLock; speak = function(t){ window.__said.push(String(t)); return Promise.resolve(false); }; window.__said.length = 0; startListen()');
      g = 0; while (!/heard\./.test(qd.querySelector('.overlay.listen').textContent) && g++ < 200) await sleep(50);
      ok(/heard\./.test(qd.querySelector('.overlay.listen').textContent), 'listen: without Media Session, Wake Lock or a voice it still runs to the end');
      Q.E('endListen()'); await sleep(300);
      // the ten-minute worry: a long list stops at 20
      seed(40); ok(Q.E('listenItems("es").length') <= 20 && Q.E('listenItems("es").length') > 6, 'listen: a long list stops at ' + Q.E('listenItems("es").length'));
      ok(Q.errors.length === 0, 'listen: no page errors ' + Q.errors.slice(0, 2).join(' | '));
      Q.E('speak = window.__speak0; LISTEN.gapSay = ' + T0.gapSay + '; LISTEN.gapReveal = ' + T0.gapReveal + '; LISTEN.gapNext = ' + T0.gapNext + '; S.langs.es.cards = JSON.parse(' + JSON.stringify(cardsBefore) + '); closeOverlay(true); Onb.open = window.__onb; UI.tab = "learn"; render()');
    }
    // Listen first (P5 WP2): a story read aloud line by line, text hidden until tapped; finishing pays what reading pays
    {
      const keep = { es: JSON.stringify(Q.E('S.langs.es')), days: JSON.stringify(Q.E('S.days')), stats: JSON.stringify(Q.E('S.stats')), gap: Q.E('LISTEN.storyGap') };
      Q.E('window.__onb = Onb.open; Onb.open = false; window.__said = []; window.__sd = 5; window.__speak0 = speak; speak = function(t){ window.__said.push(String(t)); return new Promise(r => setTimeout(() => r(true), window.__sd)); }; LISTEN.storyGap = 1; closeOverlay(true); S.settings.lang = "es"; delete S.langs.es.stories["es-s1"]');
      Q.E('window.__wl = { n: 0, released: 0 }; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl.n++; return { release: async () => { window.__wl.released++; }, addEventListener(){} }; } } })');
      const items = Q.E('storyById("es-s1").items'), firstQ = [...items].findIndex(i => i.q), said = () => Q.E('window.__said.length');
      const lines = () => qd.querySelectorAll('.overlay:not(.out) .sline'), sfoot = () => qd.querySelector('.overlay:not(.out) .ov-foot button');
      const until = async (f, ms) => { for (let t = 0; t < (ms || 5000) && !f(); t += 20) await sleep(20); return f(); };
      const answer = async () => {   // the right answer, first try
        const q = Q.E('Story.st.items[Story.pos - 1]'), opt = [...qd.querySelectorAll('.overlay:not(.out) .squiz:not(.solved) .opt')].find(b => b.textContent === q.o[0]);
        opt.click(); qfoot('Check').click(); (qfoot('Continue') || qfoot('Finish')).click();
      };
      // the choice is under the cast tags
      Q.E('openStory("es-s1")');
      ok(!!qd.querySelector('.overlay .story-head .story-listen') && /Listen first/.test(qd.querySelector('.story-listen').textContent) && sfoot().textContent === 'Start reading', 'story listening: Listen first sits under the cast tags beside Start reading');
      qd.querySelector('.story-listen').click();
      ok(!qd.querySelector('.story-listen') && Q.E('Story.listen') === true, 'story listening: tapping it hides the button and starts listening');
      ok(await until(() => Q.E('Story.st.items[Story.pos - 1].q')) && lines().length === firstQ && firstQ > 0, 'story listening: Listen first plays lines on its own up to the first question: ' + lines().length + ' of ' + firstQ);
      const spoken = Q.E('window.__said.slice()');
      ok(spoken.length === firstQ && [...items].slice(0, firstQ).every((it, i) => spoken[i] === it.t), 'story listening: every line is spoken, in order: ' + spoken.length);
      await sleep(100); ok(lines().length === firstQ && said() === firstQ, 'story listening: a question stops it');
      // lines start hidden behind Show text
      { const ls = [...lines()];
        ok(ls.length > 0 && ls.every(l => l.querySelector('.sl-reveal') && !l.querySelector('.t')) && ls.every(l => l.querySelector('.sl-reveal').getAttribute('aria-label') || /Show text/.test(l.querySelector('.sl-reveal').textContent)), 'story listening: lines start hidden behind Show text');
        ls[0].querySelector('.sl-reveal').click();
        ok(!ls[0].querySelector('.sl-reveal') && ls[0].querySelector('.t') && ls[0].querySelector('.t').textContent === items[0].t && ls[1].querySelector('.sl-reveal'), 'story listening: Show text shows that line'); }
      ok(!!lines()[0].querySelector('.sl-act button[aria-label="Play line"]') && [...lines()[0].querySelectorAll('.chip-btn')].some(b => b.textContent === 'Translate') && [...lines()[0].querySelectorAll('.chip-btn')].some(b => b.textContent === 'Save'), 'story listening: Translate, Save and Play line are there in listen mode');
      // Pause stops it, Play goes on
      await answer();
      ok(sfoot().textContent === 'Pause' && Q.E('Story.listen') === true, 'story listening: Continue goes on listening (the footer says Pause)');
      const p = Q.E('Story.pos'); sfoot().click();
      ok(Q.E('Story.paused') === true && sfoot().textContent === 'Play', 'story listening: Pause shows Play');
      { const n0 = said(); await sleep(200);
        ok(Q.E('Story.pos') === p && said() === n0, 'story listening: Pause stops it: ' + p + ' then ' + Q.E('Story.pos')); }
      Q.E('window.__sd = 120'); sfoot().click();   // slower lines, so there is a moment to leave in the middle of one
      ok(await until(() => Q.E('Story.pos') > p, 2000), 'story listening: Play moves it on again');
      // the leave sheet pauses it, and only Keep listening goes on
      ok(await until(() => Q.E('Story.st.items[Story.pos - 1].who'), 2000), 'story listening: a line is playing');
      qd.querySelector('.overlay .ov-head button').click(); await sleep(60);
      { const pp = Q.E('Story.pos'), n0 = said(), keepBtn = [...qd.querySelectorAll('.sheet-back:not(.out) .sheet-actions button')].find(b => b.textContent === 'Keep listening');
        await sleep(200);
        ok(Q.E('Story.paused') === true && !!keepBtn && sfoot().textContent === 'Play' && Q.E('Story.pos') === pp && said() === n0, 'story listening: the leave sheet pauses it: ' + pp + ' then ' + Q.E('Story.pos'));
        keepBtn.click();
        ok(Q.E('Story.paused') === false && await until(() => Q.E('Story.pos') > pp, 2000), 'story listening: Keep listening goes on');
        await sleep(250); }
      Q.E('window.__sd = 5');
      // leaving in the middle: nothing plays afterwards
      { const n0 = said(); qd.querySelector('.overlay .ov-head button').click(); await sleep(60);
        const leave = [...qd.querySelectorAll('.sheet-back .sheet-actions button')].find(b => b.textContent === 'Leave'); ok(!!leave, 'story listening: leaving asks first'); leave.click(); const n1 = said(); await sleep(300);
        ok(Q.E('Story.open') === false && Q.E('Story.listen') === false && said() === n1 && !qd.querySelector('.overlay.story') && Q.E('busy()') === false, 'story listening: nothing plays after leaving: ' + n0 + ' ' + n1 + ' ' + said());
        ok(Q.E('__wl.n') >= 1 && Q.E('__wl.released') === Q.E('__wl.n'), 'story listening: the screen is held while it plays and let go on leaving: ' + Q.E('__wl.n') + '/' + Q.E('__wl.released')); }
      // finishing pays what reading pays
      Q.E('window.__said.length = 0; delete S.langs.es.stories["es-s1"]');
      const xp0 = Q.E('S.langs.es.xp'), xpStory = Q.E('XP.story + XP.storyPerfect');
      Q.E('openStory("es-s1")'); qd.querySelector('.story-listen').click();
      for (let g = 0; g < 600 && !Q.E('Story.finished'); g++){
        if (qfoot('Check') && Q.E('Story.st.items[Story.pos - 1].q')) await answer(); else await sleep(20);
      }
      await sleep(50);
      ok(Q.E('Story.finished') === true && !!qd.querySelector('.overlay .complete, .overlay [class*="complete"]'), 'story listening: it finishes with the complete screen');
      ok(Q.E('S.langs.es.xp') - xp0 === xpStory && !!Q.E('S.langs.es.stories["es-s1"]') && Q.E('S.langs.es.stories["es-s1"].score') === 1 && Q.E('S.langs.es.stories["es-s1"].times') === 1, 'story listening: finishing pays what reading pays: ' + (Q.E('S.langs.es.xp') - xp0) + ' of ' + xpStory);
      ok(said() === items.filter(i => i.who).length, 'story listening: every line was spoken once: ' + said());
      { const n1 = said(); await sleep(150); ok(said() === n1 && Q.E('__wl.released') === Q.E('__wl.n'), 'story listening: nothing plays after the end and the screen is let go'); }
      Q.E('endStory()'); await sleep(300);
      // reading mode is unchanged
      Q.E('openStory("es-s1")'); sfoot().click();
      ok(lines().length === 1 && !qd.querySelector('.sl-reveal') && !!lines()[0].querySelector('.t') && sfoot().textContent === 'Continue' && !qd.querySelector('.story-listen') && Q.E('Story.listen') === false, 'story listening: reading mode is unchanged');
      { const n0 = said(); await sleep(120); ok(lines().length === 1 && said() === n0, 'story listening: reading mode waits for Continue'); }
      Q.E('endStory()'); await sleep(300);
      ok(Q.errors.length === 0, 'story listening: no page errors ' + Q.errors.slice(0, 2).join(' | '));
      Q.E('speak = window.__speak0; LISTEN.storyGap = ' + keep.gap + '; delete navigator.wakeLock; S.langs.es = JSON.parse(' + JSON.stringify(keep.es) + '); S.days = JSON.parse(' + JSON.stringify(keep.days) + '); S.stats = JSON.parse(' + JSON.stringify(keep.stats) + '); closeOverlay(true); Onb.open = window.__onb; UI.tab = "learn"; render()');
    }
    // contrast: every color pair the app reads text or a control's edge with passes, in both themes (dev/contrast.js)
    { const CT = require(path.join(ROOT, 'dev', 'contrast.js')), R = CT.report();
      const r1 = CT.ratio('#15301F', '#F3F7EC');
      ok(CT.ratio('#000000', '#FFFFFF') === 21 && CT.ratio('#FFFFFF', '#FFFFFF') === 1 && r1 > 13 && r1 < 13.3 && CT.ratio('var(--x)', '#FFFFFF') === null, 'contrast: the math is right');
      ok(R.failures.length === 0, 'contrast: every pair passes or is a known exception. Fix the color, or if the pair is wrong add it to KNOWN in dev/contrast.js with a reason (Matt decides): ' + R.failures.map(f => f.theme + ' ' + f.fg + ' on ' + f.bg + ' ' + f.ratio + ' < ' + f.min).join('; '));
      ok(R.drift.length === 0, 'contrast: the two dark blocks agree. Differing tokens: ' + R.drift.join(', '));
      ok(Object.keys(CT.KNOWN).length === 0, 'contrast: there are no known exceptions');
    }
    // placement: all right goes to the top, all wrong stays at A1
    const place = async right => {
      Q.E('S.settings.lang = "es"; startPlacement()');
      let g = 0;
      while (Q.E('Run.active && !Run.finished') && g++ < 80){
        const ex = Q.E('Run.cur'); let ans;
        if (right) switch (ex.type){ case 'bank-e2t': ans = Q.P.tileTokens(ex.item.t).join(' '); break; default: ans = ex.correct; }
        else ans = ex.type === 'bank-e2t' ? 'zzz' : '__wrong__';
        Q.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); qfoot('Continue').click();
      }
      const lv = L().start; qfoot('Continue').click(); return lv;
    };
    ok(await place(true) === 'C2', 'a perfect placement starts at C2');
    ok(await place(false) === 'A1', 'a failed placement starts at A1');
    Q.dom.window.close();
  }
  /* ---------- 4. drive the UI through every lesson ---------- */
  const w = A.w, E = A.E;
  const Run = () => E('Run');
  const footBtn = label => [...w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === label);
  function answerCurrent(){
    const ex = Run().cur;
    if (ex.type === 'teach'){ footBtn('Continue').click(); return 'next'; }
    if (ex.type === 'match'){
      const opts = [...w.document.querySelectorAll('.overlay:not(.out) .match .opt')];
      const left = opts.filter((_, i) => i % 2 === 0), right = opts.filter((_, i) => i % 2 === 1);
      for (const it of ex.items){ const L = left.find(b => b.textContent === it.t); const R = right.find(b => b.textContent === it.e[0]); ok(L && R, 'match buttons ' + it.t); L.click(); R.click(); }
      return 'wait';
    }
    let ans;
    switch (ex.type){
      case 'type-t2e': case 'type-e2t': case 'pic-type': case 'speak': ans = ex.accepted[0]; break;
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
  for (const lang of LANG_IDS){
    E('S.settings.lang=' + JSON.stringify(lang) + ';render()');
    for (const u of P.COURSE[lang].units) for (const l of u.lessons){
      E('startLesson(' + JSON.stringify(l.id) + ')');
      const start = footBtn('Start lesson'); ok(!!start, 'intro ' + l.id); start.click();
      await finishCurrent();
      ok(Run().finished, 'finished ' + l.id);
      ok(!!P.S.langs[lang].done[l.id], 'done ' + l.id);
      ok(w.document.querySelector('.overlay:not(.out) .stamp'), 'stamp');
      footBtn('Continue').click();
    }
    { /* pictures: a words card shows them beside the words that have one, and a pick-the-picture question shows four to tap */
      const id = lang + '-1-4';
      E('startLesson(' + JSON.stringify(id) + ')'); footBtn('Start lesson').click();
      const rows = [...w.document.querySelectorAll('.overlay:not(.out) .teach-words .wl-row')];
      ok(rows.some(r => r.querySelector('.pic img, .pic svg')), id + ' the first card shows a picture beside a word that has one');
      ok(rows.length > 0 && rows.every(r => r.querySelector('.wl-pic')), id + ' every row keeps a picture slot so the words line up');
      const pi = E('Run.queue.findIndex(e => e.type === "pic-pick")'); ok(pi > 0, id + ' asks a pick-the-picture question');
      E('Run.pos = ' + pi + '; nextEx()');
      const btns = [...w.document.querySelectorAll('.overlay:not(.out) .opts.pics .opt')];
      ok(btns.length === 4 && btns.every(b => b.querySelector('.pic') && b.getAttribute('aria-label')), id + ' four pictures to tap, each labelled for screen readers');
      ok(btns.every(b => !b.textContent.trim()), id + ' the picture options show no words');
      btns[E('Run.cur.options.indexOf(Run.cur.correct)')].click(); E('doCheck()');
      ok(w.document.querySelector('.overlay:not(.out) .ov-foot').classList.contains('ok'), id + ' the right picture is accepted');
      E('endRun()');
    }
    ok(Object.keys(P.S.langs[lang].cards).length > 750, lang + ' cards ' + Object.keys(P.S.langs[lang].cards).length);
    for (const lv of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) ok(E('levelComplete(' + JSON.stringify(lang) + ',' + JSON.stringify(lv) + ')'), lang + ' level complete ' + lv);
    for (const c of Object.values(P.S.langs[lang].cards)) c.due = '2000-01-01';
    for (let round = 0; round < 3; round++){
      E('startReview(false)'); await finishCurrent(); ok(Run().finished, 'review finished'); footBtn('Continue').click();
    }
    ok(Object.values(P.S.langs[lang].cards).filter(c => c.n >= 1).length >= 60, lang + ' reviewed');
    { /* review and practice ask a few picture questions, the same kinds lessons ask */
      const n = E('(() => { const es = learnedEntries(S.settings.lang, "v").slice(0, 60), q = reviewQueue(es); window.__rq = { es, q }; return q.length; })()');
      const rq = E('window.__rq'), pics = rq.q.filter(x => x.type.startsWith('pic-')), perReview = E('PIC_EX.perReview');
      const evaluate = E('evaluate'), picQuiz = E('picQuiz'), picEx = E('PIC_EX');
      ok(n === 60 && rq.q.every((x, k) => x.srs === rq.es[k].key), lang + ' review: at most three picture questions, in order, each on its own card (' + n + ' questions)');
      ok(pics.length >= 1 && pics.length <= perReview, lang + ' review: at most three picture questions, in order, each on its own card (got ' + pics.length + ')');
      let good = pics.length > 0;
      for (const ex of pics){
        good = good && ex.type === picEx[ex.lesson.level] && !!picQuiz(ex.item, ex.lang);
        if (ex.type === 'pic-type') good = good && evaluate(ex, ex.accepted[0]).ok === true && evaluate(ex, 'zzzz').ok === false;
        else good = good && ex.options.every(o => !!ex.pics[o]) && ex.pics[ex.correct] === picQuiz(ex.item, ex.lang) && evaluate(ex, ex.correct).ok === true && evaluate(ex, ex.options.find(o => o !== ex.correct)).ok === false;
      }
      ok(good, lang + ' review picture questions are the level\'s kind, with a safe picture, graded like lessons');
      const noPic = E('(() => { const es = window.__rq.es.filter(e => !picQuiz(e.item, e.lesson.lang)); return reviewQueue(es).some(x => x.type.startsWith("pic-")); })()');
      const zero = E('(() => { PIC_EX.perReview = 0; const r = reviewQueue(window.__rq.es).some(x => x.type.startsWith("pic-")); PIC_EX.perReview = 3; return r; })()');
      ok(noPic === false && zero === false && E('PIC_EX.perReview') === 3, lang + ' review: no picture questions for words without one, or when perReview is 0');
      const cards = P.S.langs[lang].cards, dues = {};
      for (const [k, c] of Object.entries(cards)){ dues[k] = c.due; c.due = '2999-01-01'; }
      const six = E('learnedEntries(S.settings.lang, "v").filter(e => (e.lesson.level === "A1" || e.lesson.level === "A2") && picQuiz(e.item, e.lesson.lang)).slice(0, 6).map(e => e.key)');
      for (const k of six) cards[k].due = '2000-01-01';
      E('startReview(false)');
      ok(six.length === 6 && Run().queue.length === 6 && Run().queue.some(x => x.type === 'pic-pick'), lang + ' a review session with pictures runs to the end (queue ' + Run().queue.length + ')');
      await finishCurrent();
      ok(Run().finished, lang + ' a review session with pictures finishes');
      footBtn('Continue').click();
      for (const [k, d] of Object.entries(dues)) if (cards[k]) cards[k].due = d;
      if (E('mistakeEntries(S.settings.lang).length')){ E('startMistakes()'); ok(!Run().queue.some(x => x.type.startsWith('pic-')), 'mistake sessions ask no picture questions'); E('endRun()'); }
      else ok(true, 'mistake sessions ask no picture questions (no mistakes to practise)');
    }
    { /* article practice from the Review tab: nouns from finished lessons; no review card or mistake changes */
      const artBtn = () => w.document.querySelector('#app [data-practice="articles"]');
      const cards = P.S.langs[lang].cards, saved = { ...cards }, six = E('genderEntries(S.settings.lang).slice(0, 6).map(e => e.key)');
      for (const k of Object.keys(cards)) delete cards[k];
      E('UI.tab="review"; render()'); ok(!artBtn(), lang + ' a learner with no nouns yet sees no article practice');
      for (const k of six.slice(0, 5)) cards[k] = saved[k]; E('render()'); ok(!artBtn(), lang + ' five nouns are not enough for article practice');
      cards[six[5]] = saved[six[5]]; E('render()'); ok(!!artBtn(), lang + ' six nouns bring article practice');
      Object.assign(cards, saved); E('render()');
      const before = JSON.stringify(P.S.langs[lang].cards) + JSON.stringify(P.S.langs[lang].miss), xp0 = P.S.langs[lang].xp || 0;
      artBtn().click();
      const q = Run().queue, ov = () => w.document.querySelector('.overlay:not(.out)');
      ok(Run().mode === 'genders' && q.length === 12 && q.every(x => x.type === 'gender') && new Set(q.map(x => x.item.t)).size === 12, lang + ' article practice asks 12 different nouns');
      ok(ov().querySelector('.gap-sent .gender-noun').textContent === Run().cur.noun && !ov().querySelector('.gap-sent').textContent.includes(Run().cur.item.t) && ov().querySelectorAll('.gap-opts .tile').length === Run().cur.options.length, lang + ' each noun is shown without its article, with one button per article');
      ok(!!ov().querySelector('.gap-opts.gender-opts') && fs.readFileSync(path.join(ROOT, 'styles', 'components.css'), 'utf8').includes('.gender-opts .tile{min-width:56px}'), lang + ' article buttons are wide enough to tap');
      [...ov().querySelectorAll('.gap-opts .tile')].find(b => b.textContent === Run().cur.correct).click(); E('doCheck()');
      ok(ov().querySelector('.ov-foot').classList.contains('ok') && ov().querySelector('.fb-ans').textContent.includes(Run().cur.item.t), lang + ' the right article is accepted and the whole word is shown');
      footBtn('Continue').click();
      const R = Run(); R.value = R.cur.options.find(o => o !== R.cur.correct); R.canCheck = true; E('doCheck()');
      ok(ov().querySelector('.ov-foot').classList.contains('bad'), lang + ' a wrong article is marked wrong');
      footBtn('Continue').click();
      await finishCurrent();
      ok(Run().finished && ov().querySelector('.stamp').textContent.includes('Articles practiced'), lang + ' article practice finishes');
      ok(JSON.stringify(P.S.langs[lang].cards) + JSON.stringify(P.S.langs[lang].miss) === before && (P.S.langs[lang].xp || 0) > xp0, lang + ' article practice changes no review card or mistake, and earns practice XP');
      footBtn('Continue').click();
    }
    for (const tab of ['learn', 'stories', 'review', 'talk', 'friends', 'me']){ E('UI.tab=' + JSON.stringify(tab) + '; render()'); ok(w.document.querySelector('#app').children.length > 0, 'tab ' + tab); }
    E('UI.tab="me"; render()');
    ok(![...w.document.querySelectorAll('#app button')].some(b => b.textContent.includes('Go to Talk')), 'the Claude version\'s Me has no Go to Talk pointer');
    ok([...w.document.querySelectorAll('#app .setrow')].some(r => r.textContent.includes('Tutor grading') && r.textContent.includes('If a typed answer doesn’t match, Claude checks')), 'the Claude version explains tutor grading as before');
    { /* every level on Learn opens and closes, the last open one too */
      E('UI.tab="learn"; UI.openLang=null; render()');
      const openHeads = () => [...w.document.querySelectorAll('.lvl-head[aria-expanded="true"]')];
      ok(openHeads().length === 1 && w.document.querySelectorAll('.lvl-sec.open .station').length > 0, 'Learn opens one level');
      openHeads()[0].click(); ok(openHeads().length === 0 && !w.document.querySelector('.lvl-sec.open .station'), 'the open level closes');
      E('render()'); ok(openHeads().length === 0, 'and stays closed when Learn redraws');
      w.document.querySelectorAll('.lvl-head')[1].click(); w.document.querySelectorAll('.lvl-head')[2].click(); ok(openHeads().length === 2, 'levels open again');
      E('setLang(' + JSON.stringify(lang === 'de' ? 'es' : 'de') + '); setLang(' + JSON.stringify(lang) + ')'); ok(openHeads().length === 1, 'switching languages starts fresh');
    }
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
  E('startLesson("de-7-1")'); [...w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click();
  E('Run.pos = Run.queue.findIndex(e => e.type === "teach" && e.mode === "concept" && e.bite.examples.length); nextEx()');
  const word = w.document.querySelector('.overlay:not(.out) .tip .say.gl .w');
  ok(!!word, 'the idea cards have tappable words');
  if (word){ word.click(); const g = w.document.querySelector('.gloss'); ok(g && g.textContent.length > 2, 'gloss popover ' + (g && g.textContent)); w.document.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true })); }
  E('endRun()');
  { /* a word nothing knows: the popover shows the whole line, and the tutor looks it up when Claude is there */
    const tap = (txt, en) => { const el = E('(() => { const s = sayText(' + JSON.stringify(txt) + ', "de", { gloss: true, en: ' + JSON.stringify(en) + ' }); document.body.append(s); return s; })()'); el.querySelector('.w').click(); return w.document.querySelector('.gloss:not(.out)'); };
    const close = () => w.document.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
    E('window.__aiSample = AI.sample; AI.sample = null');
    let g = tap('Quatschkopf ist er.', 'He’s a chatterbox.');
    ok(g && g.querySelector('.gl-e.muted') && g.querySelector('.gl-line') && g.textContent.includes('He’s a chatterbox.'), 'an unknown word shows the line’s translation ' + (g && g.textContent)); close();
    E('AI.sample = { json: async () => ({ meaning: "silly chatterbox", base: "Quatschkopf" }) }');
    g = tap('Quatschköpfe sind sie.', 'They’re chatterboxes.'); await sleep(20);
    ok(g && g.querySelector('.gl-e').textContent === 'silly chatterbox' && !g.querySelector('.gl-e.muted') && /from Quatschkopf/.test(g.textContent) && !g.querySelector('.gl-line'), 'the tutor looks up an unknown word ' + (g && g.textContent)); close();
    E('AI.sample = { json: async () => { throw new Error("no") } }');
    g = tap('Quatschköpfe sind sie.', 'They’re chatterboxes.'); ok(g && g.querySelector('.gl-e').textContent === 'silly chatterbox', 'and remembers it'); close();
    E('AI.sample = window.__aiSample; document.querySelectorAll("body > .say").forEach(x => x.remove())');
  }
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
    B.E('startLesson("de-1-3")'); const st = [...B.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson'); st.click();
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
  /* ---------- 6b. answers that count explain why, and what differs (fake tutor) ---------- */
  {
    const prompts = [];
    const sample = async () => ({ text: '' });
    sample.json = async (input) => { prompts.push(input); return { correct: true, note: 'Nice.', why: 'Both greet someone and ask how they are.', differences: [{ yours: 'Hey', expected: 'Hallo', note: 'more casual' }, 'junk', { note: 'no words' }] }; };
    const X = await makeDom({ claude: { use: async n => n === 'sample' ? sample : null }, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (let i = 0; i < 40 && !X.E('AI.ready'); i++) await sleep(20);
    const D = X.w.document, foot = () => D.querySelector('.overlay:not(.out) .ov-foot'), q = s => foot().querySelector(s), qa = s => [...foot().querySelectorAll(s)];
    const cont = () => qa('button').find(b => b.textContent === 'Continue').click();
    X.E('startLesson("de-1-1")'); qa('button').find(b => b.textContent === 'Start lesson').click();
    const l = X.E('Run.lesson');
    const drive = async (type, kind, i, value) => { X.E('Run.queue[Run.pos] = makeEx(' + JSON.stringify(type) + ', Run.lesson, ' + JSON.stringify(kind) + ', ' + i + '); nextEx()'); const R = X.E('Run'); R.value = value; R.canCheck = true; await X.E('doCheck()'); };
    // the tutor accepts a different wording: why it counts, both answers side by side, and its list of differences
    const si = l.sentences.findIndex(s => /^Hallo, wie/.test(s.t));
    await drive('type-e2t', 's', si, 'Hey, wie geht es dir heute?');
    ok(foot().classList.contains('ok') && q('.fb-title').textContent.includes('Accepted'), 'tutor accepted');
    ok(typeof prompts[0] === 'string' && prompts[0].includes('"differences"') && prompts[0].includes('"why"'), 'grading prompt asks why and what differs');
    ok(q('.fb-note') && q('.fb-note').textContent === 'Both greet someone and ask how they are.', 'shows why it counts: ' + (q('.fb-note') && q('.fb-note').textContent));
    ok(q('.fb-cmp') && q('.fb-cmp').textContent.includes('You wrote') && q('.fb-cmp').textContent.includes('Expected'), 'answers side by side');
    ok(qa('.fb-yours mark.dif').map(m => m.textContent).includes('Hey,') && qa('.fb-yours mark.dif').map(m => m.textContent).includes('heute?'), 'your extra words are marked ' + qa('.fb-yours mark.dif').map(m => m.textContent));
    ok(qa('.fb-diffs li').length === 1 && /Hey → Hallo · more casual/.test(q('.fb-diffs li').textContent), 'tutor’s differences listed, junk dropped ' + qa('.fb-diffs li').map(x => x.textContent));
    ok(!q('.fb-report'), 'no report link inside a non-owner’s Claude: feedback is web-only');
    cont();
    // an umlaut typed as ue counts, says why, and marks the word
    const vi = l.vocab.findIndex(v => v.t === 'Tschüss');
    await drive('type-e2t', 'v', vi, 'Tschuess');
    ok(foot().classList.contains('ok') && /^Only the umlaut differs \(Tschüss\)/.test(q('.fb-note').textContent), 'umlaut note ' + q('.fb-note').textContent);
    ok(qa('.fb-ans .w.dif').map(x => x.textContent).join() === 'Tschüss' && qa('.fb-yours mark.dif').map(x => x.textContent).join() === 'Tschuess' && !q('.fb-diffs'), 'umlaut word marked on both sides');
    cont();
    // another listed answer is right, and the main one is shown
    await drive('type-e2t', 'v', vi, 'Tschüs');
    ok(foot().classList.contains('ok') && q('.fb-note').textContent === 'That’s another right way to say it.' && q('.fb-ans').textContent.includes('Tschüss'), 'alternate answer shows the main one');
    cont();
    // an exact answer stays simple
    await drive('type-e2t', 'v', vi, 'Tschüss');
    ok(foot().classList.contains('ok') && !q('.fb-cmp') && !q('.fb-note'), 'exact answer has no comparison');
    cont();
    // speech that is close enough says how much came through and marks what didn't
    const pi = l.sentences.findIndex(s => P.tileTokens(s.t).length >= 4), said = P.tileTokens(l.sentences[pi].t).slice(0, -1).join(' ');
    X.E('S.settings.speaking = true');
    await drive('speak', 's', pi, said);
    ok(foot().classList.contains('ok') && /^We caught \d+ of \d+ words, so it counts\./.test(q('.fb-note').textContent), 'speech note ' + q('.fb-note').textContent);
    ok(q('.fb-k').textContent === 'Heard' && !q('.heard') && qa('.fb-ans .w.dif').length === 1, 'heard vs expected, missing word marked');
    cont();
    X.E('endRun()');
    console.log('page errors (X):', X.errors.length ? X.errors.slice(0, 5) : 'none'); ok(!X.errors.length, 'no page errors X');
    X.dom.window.close();
  }
  /* ---------- 7. update safety: stable keys, migrations, live packs, banner ---------- */
  {
    // legacy index keys from v2/v3 saves migrate to stable text keys and keep their schedule
    const legacy = { v: 3, settings: { onboarded: true, lang: 'de', seenVersion: '3.0.0' }, days: {}, langs: { de: { done: { 'de-1-1': { at: '2026-10-01', acc: 1, times: 1 } }, cards: { 'de-1-1|v|0': { ef: 2.6, n: 3, iv: 9, due: '2026-10-20', ts: 5 }, 'de-1-1|s|1': { ef: 2.5, n: 1, iv: 1, due: '2026-10-11', ts: 5 } }, xp: 30 }, es: {} }, gen: { de: [], es: [] } };
    const M = await makeDom({ seed: { 'parlance.v2': legacy } });
    const cards = M.P.S.langs.de.cards;
    ok(cards['de-1-1|v|~hallo'] && cards['de-1-1|v|~hallo'].n === 3 && !cards['de-1-1|v|0'], 'legacy card key migrated ' + JSON.stringify(Object.keys(cards)));
    ok(Object.keys(cards).some(k => k.startsWith('de-1-1|s|~')), 'sentence key migrated');
    ok(M.P.S.v === 12 && M.P.S.social && M.P.S.social.friends && M.P.S.settings.mascot === 'pip', 'schema version ' + M.P.S.v);
    ok(M.E('dueEntries("de").length + learnedEntries("de").length') >= 2, 'migrated cards resolve');
    // stable keys are unique within every lesson
    for (const lang of LANG_IDS) for (const l of M.E('coreOrder(' + JSON.stringify(lang) + ')')){ const vk = l.vocab.map((_, i) => M.P.itemKey(l, 'v', i)), sk = l.sentences.map((_, i) => M.P.itemKey(l, 's', i)); ok(new Set(vk).size === vk.length && new Set(sk).size === sk.length, 'unique item keys ' + l.id); }
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
    M.E('startLesson("de-p1-1")'); [...M.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click();
    let g = 0; while (M.E('Run.active && !Run.finished') && g++ < 200){ const ex = M.E('Run.cur'); if (ex.type === 'teach'){} else if (ex.type === 'match'){ M.E('Run.cur.items.length'); M.E('showFeedback(Run.cur, {ok:true, level:"exact"})'); } else { const R = M.E('Run'); R.value = ex.type === 'bank-t2e' ? M.P.tileTokens(ex.item.e[0]).join(' ') : ex.type.startsWith('bank') || ex.type === 'listen' ? M.P.tileTokens(ex.item.t).join(' ') : (ex.accepted ? ex.accepted[0] : ex.correct); R.canCheck = true; M.E('doCheck()'); } [...M.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Continue').click(); }
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
    F.E('startLesson("de-1-2")'); [...F.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start lesson').click(); F.E('Run.pos = Run.queue.length; nextEx()');
    const hard = [...F.w.document.querySelectorAll('.overlay:not(.out) .rate button')].find(b => b.textContent === 'Too hard'); ok(!!hard, 'rating chips on finish'); hard.click();
    for (let i = 0; i < 30 && !(store.get('feedback/u_test').items.some(x => x.type === 'rating')); i++) await sleep(30);
    ok(store.get('feedback/u_test').items.some(x => x.type === 'rating' && x.rating === 1 && x.ctx.lessonId === 'de-1-2'), 'rating stored');
    F.E('endRun()');
    // close the loop: ship the approved proposal, and the learner's note is stamped resolved with the version and message
    await F.E('openStudio()');
    F.E('Studio.tab="proposals"; Studio.filter="approved"; drawStudio()');
    const thanksTa = [...F.w.document.querySelectorAll('.overlay.studio .proposal textarea')].find(t => /people? who asked|person who asked/.test(t.placeholder)); ok(!!thanksTa, 'thanks box on an approved proposal');
    thanksTa.value = 'Hi now counts for Hallo.';
    [...F.w.document.querySelectorAll('.overlay.studio .proposal button')].find(b => /Mark shipped/.test(b.textContent)).click();
    for (let i = 0; i < 40 && store.get(props[0]).status !== 'shipped'; i++) await sleep(30);
    const rf = store.get('feedback/u_learner').items.find(x => x.id === 'f1');
    ok(store.get(props[0]).status === 'shipped' && store.get(props[0]).version === F.E('APP_VERSION'), 'proposal marked shipped with the version');
    ok(rf.resolved && rf.resolved.note === 'Hi now counts for Hallo.' && rf.resolved.proposal === props[0].replace('proposals/', '') && rf.resolved.version === F.E('APP_VERSION'), 'the note behind it is closed with the message');
    ok(!store.get('feedback/u_learner').items.find(x => x.id === 'f2').resolved, 'other notes stay open');
    F.E('Studio.tab="feedback"; Studio.fbShow="closed"; drawStudio()');
    ok(F.w.document.querySelectorAll('.overlay.studio .fb-item').length === 1, 'closed notes are listed under Closed');
    // a note straight to the build queue, and a quiet close
    F.E('Studio.fbShow="open"; drawStudio()');
    await F.E('buildFromNote(Studio.fb.find(f => f.text === "Add more food words please"))');
    ok([...store.keys()].some(k => k.startsWith('proposals/p') && store.get(k).source === 'note' && store.get(k).status === 'approved' && store.get(k).evidence.length === 1), 'Build this queues an approved proposal citing the note');
    await F.E('dismissNote(Studio.fb.find(f => f.text === "Add more food words please"))');
    ok(store.get('feedback/u_test').items.find(x => x.text === 'Add more food words please').resolved.quiet === true, 'close without building is quiet');
    F.E('closeStudio()');
    console.log('page errors (F):', F.errors.length ? F.errors.slice(0, 5) : 'none'); ok(!F.errors.length, 'no page errors F');
    F.dom.window.close();
    // the learner opens Parlance after the fix: thanked once, then it never repeats
    {
      const st = new Map(); st.set('feedback/u_learner', { items: [{ id: 'f1', at: 1, type: 'content', text: 'Hi should count', resolved: { at: 5, version: '9.9.9', proposal: 'p1', note: 'Hi now counts for Hallo.' } }, { id: 'f3', at: 2, type: 'idea', text: 'Dark mode', resolved: { at: 5, version: '9.9.9', proposal: 'p2', quiet: true } }, { id: 'f4', at: 3, type: 'idea', text: 'Still open' }] });
      const L = await makeDom({ claude: fakeClaude(st, { uid: 'u_learner' }), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
      L.E('S.settings.seenVersion = APP_VERSION');
      for (let i = 0; i < 60 && !L.w.document.querySelector('.heard'); i++) await sleep(60);
      const heard = L.w.document.querySelector('.heard');
      ok(heard && heard.textContent.includes('Hi should count') && heard.textContent.includes('9.9.9') && heard.textContent.includes('Hi now counts for Hallo.'), 'learner is thanked with their note and the message');
      ok(!heard.textContent.includes('Dark mode') && !heard.textContent.includes('Still open'), 'quiet and open notes get no thanks');
      for (let i = 0; i < 40 && !st.get('feedback/u_learner').items.find(x => x.id === 'f1').heardAt; i++) await sleep(30);
      ok(st.get('feedback/u_learner').items.find(x => x.id === 'f1').heardAt && st.get('feedback/u_learner').items.find(x => x.id === 'f1').resolved.version === '9.9.9', 'thanks is stamped heard and keeps what the owner wrote');
      L.w.document.querySelectorAll('.sheet-back').forEach(e => e.remove());
      ok((await L.E('maybeThanks()')) === false && !L.w.document.querySelector('.heard'), 'the thanks does not come back');
      // seen here, but the heard stamp never reached the account (offline): the next check stamps it, with no second thanks
      const f1 = st.get('feedback/u_learner').items.find(x => x.id === 'f1'); delete f1.heardAt;
      ok((await L.E('maybeThanks()')) === false && !L.w.document.querySelector('.heard'), 'a thanks seen here is not shown again');
      for (let i = 0; i < 40 && !st.get('feedback/u_learner').items.find(x => x.id === 'f1').heardAt; i++) await sleep(30);
      ok(st.get('feedback/u_learner').items.find(x => x.id === 'f1').heardAt, 'a missing heard stamp is written on the next check, so other devices skip it');
      console.log('page errors (L):', L.errors.length ? L.errors.slice(0, 5) : 'none'); ok(!L.errors.length, 'no page errors L');
      L.dom.window.close();
    }
    // sending a note and stamping a thanks heard at the same moment, over a real network's lag: neither write loses the other's change
    {
      const st = new Map(); st.set('feedback/u_learner', { items: [{ id: 'f5', at: 4, type: 'idea', text: 'More stories', resolved: { at: 6, version: '9.9.9', proposal: 'p3', note: 'Three new stories.' }, heardAt: 7 }] });
      const R = await makeDom({ claude: laggyClaude(st, { uid: 'u_learner' }), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
      for (let i = 0; i < 80 && !R.E('Remote.ready'); i++) await sleep(50);
      delete st.get('feedback/u_learner').items[0].heardAt;   // heard already at boot (no sheet); now it's stamped while a note goes out
      await R.E('Promise.all([queueFeedback({ id: "f6", at: 8, type: "idea", text: "Italian songs", ctx: {} }), markHeard([{ id: "f5" }])])');
      const after = st.get('feedback/u_learner').items;
      ok(after.find(x => x.id === 'f5').heardAt && after.some(x => x.id === 'f6'), 'a note sent while a thanks is stamped keeps both ' + JSON.stringify(after.map(x => [x.id, !!x.heardAt])));
      console.log('page errors (R):', R.errors.length ? R.errors.slice(0, 5) : 'none'); ok(!R.errors.length, 'no page errors R');
      R.dom.window.close();
    }
    // inside someone else's Claude, feedback goes to the web version instead
    {
      const st = new Map();
      const N = await makeDom({ claude: fakeClaude(st, { uid: 'u_other' }), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
      await sleep(300);
      ok(N.E('feedbackWebOnly()') === true && N.E('quickRating({})') === null, 'non-owner in Claude: no rating chips');
      N.E('UI.tab="me"; render()');
      [...N.w.document.querySelectorAll('button')].find(b => b.textContent.includes('Send feedback')).click();
      const link = N.w.document.querySelector('.sheet a.btn');
      ok(link && /parlance-iota\.vercel\.app/.test(link.href) && !N.w.document.querySelector('.sheet textarea'), 'Send feedback points to the web version');
      N.dom.window.close();
    }
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
  /* ---------- notes seen on another device stay seen, even when the account sync is slow ---------- */
  {
    const ver = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8').match(/APP_VERSION = '([^']+)'/)[1];
    const ann = 'a' + (Date.now() - 60000).toString(36), config = { kind: 'config', announce: { id: ann, title: 'New stories!', body: 'Three new stories.' } };
    const core = s => ({ blob: JSON.stringify({ settings: { onboarded: true, lang: 'de', ts: 5, ...s }, days: {}, badges: {}, stats: {} }), updatedAt: 5 });
    // this phone was last opened a few versions ago; since then the account saw this version and the announcement on a laptop.
    // The content arrives at once, but the account takes longer than the first screen waits.
    const st = new Map([['content/config', config], ['data/users/u_test/core', core({ seenVersion: ver, seenAnnounce: ann })]]);
    const O = await makeDom({ claude: laggyClaude(st, {}, (p, k) => p.endsWith('/core') && k === 'get' ? 3600 : 20), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '4.20.0', ts: 1 } } } });
    const noteUp = () => !!O.w.document.querySelector('.sheet .whatsnew, .sheet .announce');
    let shown = false;
    for (let i = 0; i < 120 && O.E('Remote.status') !== 'synced'; i++){ await sleep(50); shown = shown || noteUp(); }
    for (let i = 0; i < 30; i++){ await sleep(50); shown = shown || noteUp(); }
    ok(O.E('Remote.status') === 'synced' && !shown, 'what’s new and an announcement seen on another device don’t show again on a slow sync');
    ok(O.P.S.settings.seenVersion === ver && O.P.S.settings.seenAnnounce === ann, 'this device learns they were seen ' + JSON.stringify([O.P.S.settings.seenVersion, O.P.S.settings.seenAnnounce]));
    console.log('page errors (O):', O.errors.length ? O.errors.slice(0, 5) : 'none'); ok(!O.errors.length, 'no page errors O');
    O.dom.window.close();
    // an announcement nobody on this account has seen still shows, once
    const st2 = new Map([['content/config', config], ['data/users/u_test/core', core({ seenVersion: ver, seenAnnounce: '' })]]);
    const Q = await makeDom({ claude: fakeClaude(st2), seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (let i = 0; i < 60 && !Q.w.document.querySelector('.sheet .announce'); i++) await sleep(50);
    ok(Q.w.document.querySelector('.sheet .announce') && Q.P.S.settings.seenAnnounce === ann, 'a new announcement shows after the sync');
    Q.w.document.querySelectorAll('.sheet-back').forEach(e => e.remove());
    Q.E('maybeAnnounce()');
    ok(!Q.w.document.querySelector('.sheet .announce'), 'and only once');
    for (let i = 0; i < 40 && JSON.parse(st2.get('data/users/u_test/core').blob).settings.seenAnnounce !== ann; i++) await sleep(50);
    ok(JSON.parse(st2.get('data/users/u_test/core').blob).settings.seenAnnounce === ann, 'the account remembers it for other devices');
    console.log('page errors (Q):', Q.errors.length ? Q.errors.slice(0, 5) : 'none'); ok(!Q.errors.length, 'no page errors Q');
    Q.dom.window.close();
  }
  /* ---------- resuming a lesson ---------- */
  {
    const seed = { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } };
    const A = await makeDom({ seed });
    const btn = (D, t) => [...D.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent.startsWith(t));
    ok(!A.w.document.querySelector('.card.resume'), 'no resume card before a lesson is started');
    A.E('startLesson("de-1-2")'); btn(A, 'Start lesson').click();
    ok(!A.w.localStorage.getItem('parlance.resume') === false, 'the lesson is saved as soon as it starts');
    A.E('Run.pos = 6; Run.xp = 10; Run.combo = 2; Run.first.set(Run.queue[2].id, "exact"); nextEx()');
    const raw = A.w.localStorage.getItem('parlance.resume'), saved = JSON.parse(raw);
    ok(saved.id === 'de-1-2' && saved.pos === 6 && saved.xp === 10, 'position and score are saved');
    const total = A.E('Run.queue.length'), exId = A.E('Run.queue[6].id');
    A.E('endRun()');   // Leave
    ok(A.w.localStorage.getItem('parlance.resume'), 'leaving keeps the saved lesson');
    A.dom.window.close();
    // a reload: the card on Learn brings the lesson back as it was
    const B = await makeDom({ seed, storage: { 'parlance.resume': raw } });
    const card = B.w.document.querySelector('.card.resume');
    ok(card && card.textContent.includes(B.E('getLesson("de-1-2").title')), 'resume card on Learn');
    [...card.querySelectorAll('button')].find(b => b.textContent === 'Resume lesson').click();
    ok(B.E('Run.started && Run.pos === 6 && Run.xp === 10 && Run.combo === 2 && Run.queue.length === ' + total + ' && Run.cur.id === ' + exId), 'resume restores the place and the score');
    ok(B.E('Run.queue.every(ex => ex.lesson === Run.lesson && (ex.kind !== "v" && ex.kind !== "s" || (ex.kind === "v" ? Run.lesson.vocab : Run.lesson.sentences).includes(ex.item)))'), 'restored exercises point at the lesson’s own items');
    ok(B.E('Run.first.size') === 1 && B.E('Run.taught.size') > 0, 'answers so far and words taught come back');
    ok(B.E('buildLesson(getLesson("de-1-2")).every(ex => ex.id > ' + exId + ')'), 'new exercise ids never reuse the saved ones');
    B.E('Run.pos = Run.queue.length; nextEx()');
    ok(!B.w.localStorage.getItem('parlance.resume'), 'finishing the lesson clears it');
    B.E('endRun()');
    ok(!B.w.document.querySelector('.card.resume'), 'no card once the lesson is done');
    B.dom.window.close();
    // from the lesson's own intro: pick up, or start over
    const C = await makeDom({ seed, storage: { 'parlance.resume': raw } });
    C.E('startLesson("de-1-2")');
    ok(btn(C, 'Pick up where you left off') && !btn(C, 'Start lesson'), 'the intro offers to pick up');
    btn(C, 'Start over').click();
    ok(C.E('Run.pos') === 0 && C.E('Run.started') && C.E('Run.xp') === 0, 'start over begins again');
    ok(JSON.parse(C.w.localStorage.getItem('parlance.resume')).pos === 0, 'start over replaces the saved lesson');
    C.E('endRun()');
    // too old, another account, or a lesson that changed: nothing is offered
    const old = JSON.stringify({ ...saved, at: Date.now() - 8 * 86400000 }), other = JSON.stringify({ ...saved, owner: 'someone-else' });
    const changed = JSON.stringify({ ...saved, sig: [saved.sig[0] + 1, saved.sig[1], saved.sig[2]] });
    for (const [name, s] of [['older than a week', old], ['from another account', other], ['for a changed lesson', changed]]){
      const D = await makeDom({ seed: { 'parlance.v2': { owner: 'me', settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } }, storage: { 'parlance.resume': s } });
      ok(!D.w.document.querySelector('.card.resume'), 'no resume card when it is ' + name);
      D.dom.window.close();
    }
    console.log('page errors (resume):', C.errors.length || B.errors.length ? [...C.errors, ...B.errors].slice(0, 5) : 'none'); ok(!C.errors.length && !B.errors.length, 'no page errors resuming');
    C.dom.window.close();
  }
  /* ---------- 9. film, sounds, parrot ---------- */
  {
    const G = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (const name of Object.keys(G.E('SOUNDS'))) G.E('playSound(' + JSON.stringify(name) + ', 0.5)');
    G.E('openFilm({ autoplay: false, live: true })');
    ok(G.w.document.querySelector('.overlay.film .film-svg'), 'film stage');
    for (const t of [0, 3, 6.5, 9, 11, 14, 17, 20, 23.5, 25, 28, 30.5, 33, 35.5, 38, 41, 44, 49.6]){ G.E('filmSeek(' + t + ')'); }
    G.E('filmSeek(12)');
    ok(G.w.document.querySelector('#f-av-lena').style.visibility === 'visible' && G.w.document.querySelector('#f-phone').style.visibility === 'hidden', 'film scene 3 visible, the phone not yet');
    ok(/translate\(276/.test(G.w.document.querySelector('#f-b-pip').getAttribute('transform')), 'Pip position at 12s ' + G.w.document.querySelector('#f-b-pip').getAttribute('transform'));
    ok(G.w.document.querySelector('.film-cap').textContent.includes('Berlin'), 'caption at 12s');
    G.E('filmSeek(19)'); ok(G.w.document.querySelector('#f-bi-pip').classList.contains('cheer'), 'Pip mood follows the film');
    G.E('filmSeek(8.8)'); ok(['kiwi', 'mango', 'kakadu', 'rojo'].every(id => G.w.document.querySelector('#f-b-' + id).style.visibility === 'visible'), 'the other four birds join Pip on the perch');
    G.E('filmSeek(26)'); ok(G.w.document.querySelector('#pg-story').style.visibility === 'visible' && G.w.document.querySelector('#pg-talk').style.visibility === 'hidden', 'the phone shows the story at 26s');
    G.E('filmSeek(32)'); ok(G.w.document.querySelector('#lg-3').getAttribute('transform') !== G.w.document.querySelector('#lg-0').getAttribute('transform') && /XP/.test(G.w.document.querySelector('#lg-xp3').textContent), 'the league has moving rows');
    G.E('filmSeek(48)'); ok(G.w.document.querySelector('#f-end0').style.visibility === 'visible' && G.w.document.querySelectorAll('#f-bs-pip, #f-bs-kiwi').length === 2, 'the end card');
    G.E('filmPlay()'); await sleep(120); G.E('filmPause()');
    ok(G.E('Film.t') > 19, 'film plays forward ' + G.E('Film.t'));
    G.E('filmSeek(26)'); G.E('filmSeek(12)'); ok(G.w.document.querySelector('.film-cap').textContent.includes('Berlin'), 'scrubbing back brings the caption back');
    G.E('filmSeek(35.5)'); [...G.w.document.querySelectorAll('.overlay.film .ov-foot button')].find(b => b.textContent === 'Close').click();
    ok(G.P.S.settings.filmSeen && !G.E('Film.open'), 'film closes and is remembered');
    ok(!G.w.document.querySelector('.overlay') && !G.w.document.body.classList.contains('locked'), 'closing the film goes straight back to the app');
    { /* the birds are live rigs on the film's clock, and nothing moves the whole stage (that made phones repaint every frame) */
      G.E('openFilm({ autoplay: false, live: true })');
      ok(G.w.document.querySelector('#f-bi-pip svg.rig.f-rig') && G.E('Film.rigs.pip.mood') === 'happy', 'the film’s birds are live rigs');
      G.E('filmSeek(19)'); ok(G.E('Film.rigs.pip.mood') === 'cheer', 'a live bird takes the film’s mood');
      G.E('filmSeek(8.8)'); ok(G.E('Film.rigs.kiwi.mood') === 'wave' && G.E('Film.rigs.pip.mood') === 'love', 'every bird on the perch has its own mood');
      let still = true; for (const t of [0.5, 6, 20, 47]){ G.E('filmSeek(' + t + ')'); if (G.w.document.querySelector('#f-cam').getAttribute('transform')) still = false; }
      ok(still, 'no camera move over the whole stage');
      /* what moves every frame lives on layers the compositor moves (no redrawing): the rays, the glows, the fronds and each firefly */
      G.E('filmSeek(20)');
      const rays = G.w.document.querySelector('#f-rays'), glow = G.w.document.querySelector('#f-glow-a'), fly = G.w.document.querySelector('#f-fl3'), frond = G.w.document.querySelector('#f-fr1');
      ok(rays && rays.tagName === 'DIV' && /rotate\(50\.00deg\)/.test(rays.style.transform) && glow.tagName === 'DIV' && /scale\(/.test(glow.style.transform) && /translate\(calc/.test(fly.style.transform) && /rotate\(.*deg\)/.test(frond.style.transform), 'rays, glows, fireflies and fronds are turned by CSS transforms: ' + rays.style.transform);
      ok(!G.w.document.querySelector('.f-scene #f-rays, .f-scene #f-glow-a, .f-scene .f-fly, .f-scene #f-ring'), 'the scene layer holds none of what changes every frame');
      ok(G.w.document.body.classList.contains('film-cover') && G.E('typeof Rig.hold') === 'function', 'while the film fills the screen, the page behind it is hidden and its birds wait');
      G.E('filmSeek(48)'); ok(G.w.document.querySelector('#f-title').style.opacity === '0' && G.w.document.querySelector('#f-cast').style.opacity === '0' && G.w.document.querySelector('#f-av-lena').style.visibility === 'visible', 'a scene that is over stays hidden even where its parts were shown');
      G.E('filmSeek(49.3); filmPlay()'); for (let i = 0; i < 80 && G.E('Film.open'); i++) await sleep(50);
      ok(!G.E('Film.open') && !G.w.document.querySelector('.overlay') && G.E('UI.tab') === 'learn', 'played to the end, the film goes back into the app by itself');
      ok(!G.w.document.body.classList.contains('film-cover'), 'and the page behind it is back');
      G.E('UI.tab = "me"; render()');
      const wb = [...G.w.document.querySelectorAll('#app button')].find(b => b.textContent.includes('Watch the intro film'));
      wb.click(); ok(G.E('Film.open') && !G.E('Film.setup') && G.w.document.querySelectorAll('.overlay').length === 1, 'Me opens the film');
      [...G.w.document.querySelectorAll('.overlay.film .ov-foot button')].find(b => b.textContent === 'Close').click();
      ok(!G.E('Film.open') && !G.w.document.querySelector('.overlay') && G.E('UI.tab') === 'me' && G.w.document.querySelector('#app').textContent.includes('Watch the intro film'), 'closing it returns to Me as it was');
      G.E('UI.tab = "learn"; render()');
    }
    { /* the film as video: every bird has one, each matches the film as it is now, and the app plays the learner's own */
      const FV = require(path.join(ROOT, 'dev', 'film.js')), man = FV.readManifest(), birds = Object.keys(G.E('MASCOTS'));
      ok(JSON.stringify(G.E('MEDIA.film.birds').slice().sort()) === JSON.stringify(birds.slice().sort()), 'every bird learners can pick has a film video');
      for (const id of birds){ try { await G.E('loadMascot(' + JSON.stringify(id) + ')'); } catch (e) {} }
      ok(G.E('pipSVG("happy", 100, undefined, Bird.birds.rojo)').includes('data-s="patchL"') && !G.E('Bird.birds.rojo.slots.find(s => s.id === "patchL").showWith'), 'Rojo keeps the patches round its eyes when Kakadu loaded first (no bird changes the shared draw order)');
      const stale = birds.filter(id => { const f = path.join(ROOT, 'media', 'film', id + '.mp4'), m = man.birds && man.birds[id]; return !fs.existsSync(f) || fs.statSync(f).size < 100000 || !m || m.print !== FV.filmPrint(G.E(FV.PRINT_EXPR(id)), ROOT); });
      ok(!stale.length, 'each film video matches the film as it is now (if not, run node dev/film.js): ' + stale.join(', '));
      G.E('openFilm({ autoplay: false })');
      const v = G.w.document.querySelector('.overlay.film video.f-video');
      ok(v && v.getAttribute('src') === 'media/film/pip.mp4' && v.muted && !G.w.document.querySelector('.overlay.film .f-scene') && G.E('Film.mode') === 'video', 'the film plays as video, the learner’s bird’s own');
      ok(!G.w.document.querySelector('.overlay.film input[type=range], .overlay.film .f-play') && G.w.document.querySelectorAll('.overlay.film .ov-foot button').length === 1, 'no pause or scrubbing: the one button is the way on');
      G.E('filmSeek(20)'); ok(Math.abs(v.currentTime - 20) < 0.01, 'the video follows the film’s clock');
      /* a video that isn't ready yet: the film and the song wait (with a loading sign), then start with it */
      G.E('Object.defineProperty(Film.video, "readyState", { configurable: true, get: () => 1 }); filmPlay()');
      ok(G.E('Film.pending') && !G.w.document.querySelector('.overlay.film .film-big').hidden && G.E('Song.mode') !== 'film', 'a video still loading: the film and the song wait');
      G.E('Object.defineProperty(Film.video, "readyState", { configurable: true, get: () => 4 }); Film.video.dispatchEvent(new Event("canplay"))');
      ok(!G.E('Film.pending') && G.E('Film.playing') && G.w.document.querySelector('.overlay.film .film-big').hidden, 'and it starts once the video can play');
      /* away from the app it waits; back again, it carries on */
      G.E('Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange"))');
      ok(!G.E('Film.playing') && G.E('Film.away'), 'leaving the app pauses the film');
      G.E('Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); delete document.visibilityState');
      ok(G.E('Film.playing') && !G.E('Film.away'), 'and coming back carries on');
      /* a video that fails: the live film takes over at the same moment */
      G.E('filmSeek(12); Film.video.dispatchEvent(new Event("error"))');
      ok(G.E('Film.mode') === 'live' && G.w.document.querySelector('.overlay.film .f-scene') && !G.w.document.querySelector('.overlay.film video') && G.w.document.querySelector('#f-av-lena').style.visibility === 'visible', 'a video that can’t play hands over to the live film, where it was');
      G.E('endFilm("close")');
      G.E('S.settings.mascot = "kiwi"; openFilm({ autoplay: false })');
      ok(G.w.document.querySelector('.overlay.film video').getAttribute('src') === 'media/film/kiwi.mp4', 'a learner with Kiwi sees Kiwi’s film');
      G.E('endFilm("close"); S.settings.mascot = "pip"; render()');
    }
    { /* first time: the film opens from the welcome screen and flows straight on into setup's first question */
      const O = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: false } } } });
      for (let i = 0; i < 100 && !O.w.document.querySelector('.film-card'); i++) await sleep(25);
      O.w.document.querySelector('.film-card').click();
      ok(O.E('Film.open') && O.E('Film.setup') && O.w.document.querySelectorAll('.overlay').length === 1 && O.w.document.querySelector('.overlay.film'), 'the film opens over the welcome screen and takes its place');
      ok([...O.w.document.querySelectorAll('.overlay.film .ov-foot button')].some(b => b.textContent === 'Continue'), 'in onboarding the film’s button says Continue');
      O.E('filmSeek(49.3)'); for (let i = 0; i < 80 && O.E('Film.open'); i++) await sleep(50);
      ok(!O.E('Film.open') && O.E('Onb.open') && O.E('Onb.step') === 1 && O.w.document.querySelectorAll('.overlay').length === 1 && /What do you want to learn/.test(O.w.document.querySelector('.overlay.onb').textContent), 'played to the end, it flows into setup’s first question');
      ok(O.P.S.settings.filmSeen && !O.P.S.settings.onboarded, 'the film is remembered, and setup is still to do');
      O.E('Onb.step = 0; drawOnb()'); O.w.document.querySelector('.film-card').click(); O.E('filmSeek(20)');
      [...O.w.document.querySelectorAll('.overlay.film .ov-foot button')].find(b => b.textContent === 'Continue').click();
      ok(!O.E('Film.open') && O.E('Onb.step') === 1 && O.w.document.querySelectorAll('.overlay.onb').length === 1, 'Continue skips the rest and goes on into setup');
      console.log('page errors (O):', O.errors.length ? O.errors.slice(0, 5) : 'none'); ok(!O.errors.length, 'no page errors O');
      O.dom.window.close();
    }
    ok(G.w.document.querySelector('.hero .pip [data-s="beak"]') && G.w.document.querySelector('.hero .pip [data-s="crest2"]'), 'Pip is a parrot');
    { const r = G.E('(() => { const e = pip("happy", 60, { tap: false }); document.body.append(e); const rg = e.rig; rg.render(1);  Rig.setHorizon(20); for (let i = 0; i < 40; i++) rg.render(0.05); const hb = Rig.compile(rg.def).byId.head.i; const tilted = rg.frame.chans[hb].r; Rig.setHorizon(90); for (let i = 0; i < 40; i++) rg.render(0.05); const capped = rg.frame.chans[hb].r; Rig.setHorizon(0); for (let i = 0; i < 80; i++) rg.render(0.05); return [tilted, capped, rg.frame.chans[hb].r]; })()');
      ok(r[0] > 15 && r[0] < 25 && r[1] > 25 && r[1] < 32 && Math.abs(r[2]) < 8, 'the head holds level against a turned screen, within reason: ' + r); }
    ok(G.E('Rig.validate(PIP).length') === 0, 'Pip rig validates: ' + G.E('Rig.validate(PIP).join("; ")'));
    for (const m of G.E('PIP_MOODS')){
      ok(G.E('!!PIP.moods[' + JSON.stringify(m) + ']'), 'the rig has the mood ' + m);
      const s = G.E('pipSVG(' + JSON.stringify(m) + ')'); ok(s.includes('data-s="wingL"') && !/NaN|undefined/.test(s), 'pip mood ' + m);
    }
    { const el = G.E('(() => { const e = pip("oops", 60); document.body.append(e); setPipMood(e, "cheer"); return e.rig.mood; })()'); ok(el === 'cheer', 'a live Pip changes mood ' + el); }
    { const r = G.E('(() => { pipTaps = 0; const e = pip("happy", 60, { lang: "de" }); document.body.append(e); e.click(); const hop = e.rig.playing("hop"); e.click(); return [hop, e.rig.mood, e.rig.home]; })()');
      ok(r[0] && r[1] === 'wave' && r[2] === 'happy', 'tapping Pip takes turns: a hop, then a wave ' + JSON.stringify(r)); }
    { const r = G.E('(() => { const e = pip("sleep", 60, { lang: "de" }); document.body.append(e); e.click(); return e.rig.mood; })()'); ok(r === 'wow', 'a sleeping Pip wakes with a start when tapped: ' + r); }
    { const r = G.E('(() => { const e = pip("dance", 60, { tap: false, moveFor: 1 }); document.body.append(e); e.rig._frame(0, 0.05); return e.rig.playing("dance"); })()'); await sleep(40);   // one frame first: the rig's clock starts at 0, and a stop stamped at 0 reads as "not stopped"
      ok(r && !G.E('[...document.querySelectorAll(".pip")].pop().rig.playing("dance")'), 'moveFor ends a looping move'); }
    // a mood's looping clip ends with the mood: after the hello wave the bird rests, its wing still, not waving on
    { const r = G.E('(() => { const e = pip("happy", 60, { tap: false }); document.body.append(e); const R = e.rig, wr = R.def.bones.findIndex(b => b.id === "wingR");' +
        ' R.set("wave"); const a = R.playing("wave"); let flap = 0; for (let i = 0; i < 20; i++){ R._frame(0, 0.05); flap = Math.max(flap, Math.abs(R.frame.chans[wr].r)); }' +
        ' R.set("dance"); const b = [R.playing("wave"), R.playing("dance")]; R.set("happy"); const c = R.playing("dance");' +
        ' let rest = 0; for (let i = 0; i < 40; i++){ R._frame(0, 0.05); if (i > 14) rest = Math.max(rest, Math.abs(R.frame.chans[wr].r)); } return [a, b, c, flap, rest]; })()');
      ok(r[0] === true && r[1][0] === false && r[1][1] === true && r[2] === false, 'a mood’s looping clip ends when the mood changes ' + JSON.stringify(r));
      ok(r[3] > 20 && r[4] < 3, 'the far wing waves in the wave and hangs still after it (' + r[3].toFixed(1) + '° then ' + r[4].toFixed(1) + '°)'); }
    if (G.E('pipMoodNow()') === 'happy'){ G.E('UI.tab = "learn"; UI.animate = true; render()'); await sleep(400); ok(G.E('document.querySelector(".hero .pip").rig.mood') === 'wave', 'Pip waves hello on Learn'); }
    console.log('page errors (G):', G.errors.length ? G.errors.slice(0, 5) : 'none'); ok(!G.errors.length, 'no page errors G');
    G.dom.window.close();
  }
  /* ---------- 9b. your bird: the other birds' rigs, the picker in Me, loading a picked bird, unknown birds ---------- */
  {
    const B = await makeDom({ seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    ok(B.P.S.settings.mascot === 'pip' && B.E('mascot().name') === 'Pip', 'Pip is the bird by default');
    ok(B.E('Object.keys(Bird.birds).join()') === 'pip', 'only Pip’s part sheet loads at first: ' + B.E('Object.keys(Bird.birds).join()'));
    B.E('UI.tab = "me"; render()');
    const card = B.w.document.querySelector('.bird-card');
    ok(card && card.textContent.includes('Pip is a parrot') && card.querySelector('.pip[data-bird="pip"]'), 'Me shows your bird');
    [...card.querySelectorAll('button')].find(b => b.textContent === 'Choose your bird').click();
    const opts = () => [...B.w.document.querySelectorAll('.sheet .bird-opt')];
    ok(opts().length === 5 && opts()[0].getAttribute('aria-checked') === 'true' && !opts()[0].disabled, 'the picker lists five birds, Pip chosen');
    for (let i = 0; i < 100 && opts().some(o => o.disabled); i++) await sleep(25);
    ok(opts().every(o => !o.disabled && o.querySelector('.pip')), 'every bird loads in the picker');
    ok(B.E('Object.keys(MASCOTS).every(id => Bird.birds[id] && Rig.validate(Bird.birds[id]).length === 0)'), 'every bird’s rig validates');
    for (const id of ['kiwi', 'mango', 'kakadu', 'rojo']){
      // a wing's drawing follows its angle, so one on its way up or down is never the folded wing rotated into a blade
      ok(B.E('Bird.birds.' + id + '.swaps.map(w => w.slot).sort().join()') === 'wingL,wingR', id + ': both wings swap their drawing by angle');
      const r = B.E('(() => { const e = pip("happy", 60, { tap: false, def: Bird.birds.' + id + ' }); document.body.append(e); const R = e.rig, wr = R.def.bones.findIndex(b => b.id === "wingR");' +
        ' R.set("wave"); for (let i = 0; i < 12; i++) R._frame(0, 0.05); R.set("happy"); let rest = 0; for (let i = 0; i < 40; i++){ R._frame(0, 0.05); if (i > 14) rest = Math.max(rest, Math.abs(R.frame.chans[wr].r)); } e.remove(); return rest; })()');
      ok(r < 3, id + ': its wing hangs still after the hello wave (' + r.toFixed(1) + '°)');
    }
    ok(B.E('Object.keys(MASCOTS).every(id => PIP_MOODS.every(m => !/NaN|undefined/.test(pipSVG(m, 72, null, Bird.birds[id]))))'), 'every bird draws every mood');
    opts().find(o => o.dataset.bird === 'kiwi').click();
    ok(opts().find(o => o.dataset.bird === 'kiwi').getAttribute('aria-checked') === 'true' && B.P.S.settings.mascot === 'pip', 'tapping a bird picks it, not saved yet');
    const ts0 = B.P.S.settings.ts;
    [...B.w.document.querySelectorAll('.sheet-actions button')].find(b => b.textContent === 'Save').click(); await sleep(250);
    ok(B.P.S.settings.mascot === 'kiwi' && B.P.S.settings.ts >= ts0, 'Save keeps Kiwi');
    ok(B.w.document.querySelector('.bird-card .pip[data-bird="kiwi"] .rig-kiwi') && B.w.document.querySelector('.profile .pip[data-bird="kiwi"]'), 'Me now shows Kiwi');
    ok(B.w.document.querySelector('#toast').textContent.includes('Kiwi'), 'a toast says Kiwi is learning with you');
    ok(B.E('avatar("pip", 40).querySelector(".rig-kiwi") && avatar("pip", 40, null, true).querySelector(".rig-pip")'), 'cast avatars show your bird; a friend’s Pip picture stays Pip');
    ok(B.E('cast("pip").name') === 'Kiwi' && B.E('cast("pip").pitch') === B.E('MASCOTS.kiwi.pitch') && B.E('cast("lena").name') === 'Lena', 'Kiwi speaks for Pip, in its own voice');
    ok(B.E('(() => { Object.assign(Talk, { who: "pip", lang: "de", level: "A1", scen: { prompt: "x" } }); return talkInstructions(); })()').includes('Your name is Kiwi. You are a cheerful, curious budgie'), 'Talk’s persona is your bird');
    B.E('openFilm({ autoplay: false, live: true }); filmSeek(6)');
    ok(B.w.document.querySelector('.film-cap').textContent === 'Meet Kiwi, a budgie who loves to repeat after you.' && B.w.document.querySelector('#f-bi-kiwi .rig-kiwi'), 'the film stars your bird: ' + B.w.document.querySelector('.film-cap').textContent);
    B.E('endFilm(false)'); await sleep(50);
    console.log('page errors (B2):', B.errors.length ? B.errors.slice(0, 5) : 'none'); ok(!B.errors.length, 'no page errors B2');
    B.dom.window.close();
    // a learner who picked Kakadu sees Kakadu from the first screen
    const K = await makeDom({ seed: { 'parlance.v2': { v: 6, settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0', mascot: 'kakadu' } } } });
    for (let i = 0; i < 100 && !K.w.document.querySelector('.hero .pip'); i++) await sleep(25);
    ok(K.w.document.querySelector('.hero .pip[data-bird="kakadu"] [data-s="crest2"]') && K.E('Object.keys(Bird.birds).sort().join()') === 'kakadu,pip', 'a picked bird loads before the first screen');
    console.log('page errors (K):', K.errors.length ? K.errors.slice(0, 5) : 'none'); ok(!K.errors.length, 'no page errors K');
    K.dom.window.close();
    // a bird from a newer version is kept, and drawn as Pip
    const U = await makeDom({ seed: { 'parlance.v2': { v: 6, settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0', mascot: 'phoenix' } } } });
    ok(U.P.S.settings.mascot === 'phoenix' && U.E('mascotId()') === 'pip' && U.w.document.querySelector('.hero .pip[data-bird="pip"]'), 'an unknown bird is kept and drawn as Pip');
    ok(U.E('mergeCore({ settings: { mascot: "phoenix", ts: 2 } }, { settings: { mascot: "pip", ts: 1 } }).settings.mascot') === 'phoenix', 'merges keep a bird this version doesn’t know');
    console.log('page errors (U):', U.errors.length ? U.errors.slice(0, 5) : 'none'); ok(!U.errors.length, 'no page errors U');
    U.dom.window.close();
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
    { /* a spoken word starts inside the tap, with the song turned down (not off); a voice that won't start gets one retry
         with the language's standard voice, then a one-time hint */
      let mode = 'ok'; const said = [];
      const synth = { speaking: false, pending: false, paused: false, resumed: 0, getVoices: () => [], resume(){ this.resumed++; this.paused = false; }, cancel(){},
        speak(u){ said.push({ text: u.text, voice: u.voice ? u.voice.name : '', lang: u.lang, playing: !E('Song.el.paused'), duck: E('Song.duck') });
          const plain = !u.voice && u.lang.length === 2;   // asking for just the language, like "de"
          if (mode === 'ok' || (mode === 'standard' && !u.voice) || (mode === 'nolang' && plain)) setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 20); }, 10);
          else if (mode === 'nolang' || mode === 'refused') setTimeout(() => u.onerror && u.onerror({ error: 'language-unavailable' }), 5); } };
      M.w.speechSynthesis = synth; M.w.SpeechSynthesisUtterance = function(t){ this.text = t; };
      E('Voice.list = [{ name: "Anna (Premium)", lang: "de-DE", voiceURI: "anna" }]; Voice.wait = 120; Voice.hinted = false');
      const p1 = E('speak("Hallo", "de")');
      ok(said.length === 1 && said[0].text === 'Hallo' && said[0].voice === 'Anna (Premium)' && said[0].playing && said[0].duck === E('MEDIA.song.duck'), 'a spoken word starts at once, inside the tap, with the song turned down but still playing ' + JSON.stringify(said));
      ok(await p1 === true, 'and it reports that it spoke'); await sleep(50);
      ok(E('Song.duck') === 1 && E('Song.mode') === 'home' && !E('Song.el.paused'), 'then the song comes back up');
      mode = 'standard'; said.length = 0;
      ok(await E('speak("Danke", "de")') === true && said.length === 2 && said[0].voice === 'Anna (Premium)' && said[1].voice === '', 'a voice that won’t start gets one more try with the standard voice ' + JSON.stringify(said));
      ok(!E('Voice.hinted'), 'no hint when the retry works');
      mode = 'none'; said.length = 0;
      ok(await E('speak("Bitte", "de")') === false && said.length === 2 && E('Voice.hinted') && D.querySelector('#toast').textContent.includes('silent mode'), 'when nothing plays, a hint says what to check');
      E('Voice.hinted = false'); said.length = 0;
      const first = E('speak("Eins", "de")'); mode = 'ok'; const second = E('speak("Zwei", "de")');
      ok(await first === null && await second === true && !E('Voice.hinted'), 'a word cut off by the next tap isn’t a failure');
      // a phone without the exact voice: the engine refuses it, and the plain language plays straight away
      mode = 'nolang'; said.length = 0; E('Voice.list = []; Voice.hinted = false');
      const t0 = Date.now();
      ok(await E('speak("Morgen", "de")') === true && said.length === 2 && said[0].lang === 'de-DE' && said[1].lang === 'de' && Date.now() - t0 < 100 && !E('Voice.hinted'),
        'when the phone refuses the exact voice, the plain language plays right away ' + JSON.stringify(said));
      mode = 'refused'; said.length = 0;
      ok(await E('speak("Abend", "de")') === false && E('Voice.lastError') === 'language-unavailable' && D.querySelector('#toast').textContent.includes('no German voice'), 'and if it has no voice at all, the hint says so: ' + D.querySelector('#toast').textContent);
      ok(await E('speakTest("de")') === 'language-unavailable' && E('audioResultText("language-unavailable", "de")').includes('no German voice'), 'Me → Sound’s voice test gives the same reason');
      mode = 'ok'; ok(await E('speakTest("de")') === 'ok', 'and says when sound works');
      E('Voice.list = [{ name: "Anna (Premium)", lang: "de-DE", voiceURI: "anna" }]');
      synth.speaking = true; said.length = 0; const late = E('speak("Gut", "de")');
      ok(!said.length, 'while a word is still playing, the next one waits a moment after cancelling it (Chrome can drop it otherwise)'); synth.speaking = false;
      ok(await late === true && said.length === 1 && said[0].text === 'Gut', 'and then plays');
      synth.paused = true; await E('speak("Tschüss", "de")');
      ok(synth.resumed === 1 && !synth.paused, 'a voice engine left paused is woken first');
      E('Film.open = true; Song.mode = "film"; songDuck(true)'); ok(E('Song.duck') === E('MEDIA.song.duck') && E('Song.mode') === 'film', 'under the intro film a voice turns the song down too');
      E('songDuck(false); Film.open = false; Song.mode = "home"; Voice.list = []'); ok(E('Song.duck') === 1, 'and it comes back up'); await sleep(300);
    }
    const tab = name => [...D.querySelectorAll('.tab')].find(b => b.textContent.includes(name)).click();
    E('Song.el.currentTime = 42'); const plays0 = E('window.__plays');
    for (const name of ['Stories', 'Review', 'Talk', 'Me']){
      tab(name); await sleep(400);
      ok(E('Song.mode') === 'home' && !E('Song.el.paused') && E('Song.el.currentTime') === 42 && E('window.__plays') === plays0, 'the song keeps playing on ' + name + ', from the same spot');
      ok(D.querySelector('.top .music-btn.on'), 'music button on ' + name);
    }
    ok(D.querySelector('#set-homeMusic') && D.querySelector('#music-vol'), 'Me → Sound has the music switch and volume');
    const mv = D.querySelector('#music-vol'); mv.value = '0.3'; mv.dispatchEvent(new M.w.Event('input')); await sleep(50);
    ok(E('Song.mode') === 'home' && Math.abs(E('Song.vol') - E('homeVol()')) < 1e-9 && Math.abs(M.P.S.settings.musicVol - 0.3) < 1e-9, 'while it plays, the slider sets its volume');
    D.querySelector('.top .music-btn').click(); await sleep(800);
    ok(!M.P.S.settings.homeMusic && E('Song.mode') === 'off' && E('Song.el.paused') && D.querySelector('.top .music-btn:not(.on)'), 'music button turns it off');
    const mv2 = D.querySelector('#music-vol'); mv2.value = '0.35'; mv2.dispatchEvent(new M.w.Event('input')); await sleep(50);
    ok(E('Song.mode') === 'preview' && !E('Song.el.paused') && Math.abs(M.P.S.settings.musicVol - 0.35) < 1e-9, 'with music off, moving the slider previews the song');
    await sleep(2600); ok(E('Song.mode') === 'off' && E('Song.el.paused'), 'preview stops on its own');
    D.querySelector('.top .music-btn').click(); await sleep(400);
    ok(M.P.S.settings.homeMusic && E('Song.mode') === 'home' && !E('Song.el.paused'), 'and back on');
    E('Song.el.currentTime = 50'); tab('Learn'); await sleep(500);
    ok(E('Song.mode') === 'home' && !E('Song.el.paused') && E('Song.el.currentTime') === 50, 'back on Learn, it carries on from the same spot');
    D.querySelector('.hero .btn-primary').click(); await sleep(800);
    ok(E('Run.active') && E('Song.mode') === 'off' && E('Song.el.paused'), 'song stops when a lesson starts');
    E('Run.active = false; closeOverlay(true); render()'); await sleep(500);
    ok(E('Song.mode') === 'home' && E('Song.el.currentTime') === 50, 'resumes after the lesson, where it paused');
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
    /* with music on, a film closed while it plays hands its song on: it carries on softly behind the app, from the same spot */
    E('openFilm({ autoplay: false }); filmSeek(30); filmPlay()'); await sleep(30);
    const plays1 = E('window.__plays');
    E('endFilm("cta")');
    ok(E('Song.mode') === 'home' && !E('Song.el.paused') && E('Song.el.loop') && Math.abs(E('Song.el.currentTime') - 30) < 0.5 && E('Song.gliding'), 'closing the film hands its song on to the app');
    await sleep(1900);
    ok(!E('Song.gliding') && Math.abs(E('Song.vol') - E('homeVol()')) < 0.01 && E('window.__plays') === plays1 && !E('Song.el.paused'), 'it settles at the home volume without starting over');
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
    E('Song.volFixed = true');   // like an iPhone, where an audio element's volume can't be set
    E('Song.el.dispatchEvent(new Event("canplay"))');
    ok(E('Song.routed') && N.w.__routed === E('Song.el'), 'on iPhone the volume runs through Web Audio');
    E('Song.vol = 0.4; songApply(0.1)'); ok(Math.abs(E('Song.gain.gain.value') - 0.4) < 1e-9, 'gain follows the volume');
    const N2 = await makeDom({ node: true, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
    N2.w.fetch = async () => new N2.w.Response(new Uint8Array([0])); N2.w.URL.createObjectURL = () => 'blob:refused';
    N2.E('Song.fetching = null; songPrefetch()'); await sleep(50); N2.E('songEl(); Song.el.dispatchEvent(new Event("error"))');
    ok(!N2.E('Song.failed') && !N2.E('Song.local') && /media\/abc-adventure\.mp4$/.test(N2.E('Song.el.getAttribute("src")')), 'if the local copy is refused, it plays the file directly');
    // Android and desktop: the element's own volume works, so the song stays out of Web Audio (where it could drown the voice)
    const N3 = await makeDom({ node: true, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0' } } } });
    N3.w.fetch = async () => new N3.w.Response(new Uint8Array([0, 1])); N3.w.URL.createObjectURL = () => 'blob:parlance-song';
    N3.E('Song.fetching = null; songPrefetch()'); await sleep(50); N3.E('songEl(); Song.el.dispatchEvent(new Event("canplay"))');
    ok(!N3.E('songVolumeFixed()') && !N3.E('Song.routed') && !N3.w.__routed, 'where the element sets its own volume, the song stays out of Web Audio');
    N3.E('Song.vol = 0.4; Song.duck = 0.25; songApply(0.1)'); ok(Math.abs(N3.E('Song.el.volume') - 0.1) < 1e-9, 'and its volume (turned down under a voice) is set on the element');
    N3.dom.window.close();
    ok(!N.errors.length && !N2.errors.length, 'no page errors N ' + JSON.stringify(N.errors.concat(N2.errors).slice(0, 3)));
    N.dom.window.close(); N2.dom.window.close();
  }
  /* ---------- 10b. recorded voices: what gets recorded, playing a clip, and the device voice for everything else ---------- */
  {
    const R = await makeDom({ node: true, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    const E = R.E, P = R.P, W = R.w;
    const lines = P.voiceLines(), keyOf = (lang, who, t) => lang + '|' + who + '|' + P.recKey(t), have = new Set(lines.map(l => keyOf(l[0], l[1], l[2])));
    ok(have.size === lines.length && lines.every(l => l[2] && !l[2].includes('___')), 'each recorded line is there once, with no blanks in it');
    const miss = [], need = (lang, who, t) => { if (!have.has(keyOf(lang, who, t))) miss.push(lang + ' ' + who + ': ' + t); };
    for (const lang of LANG_IDS){
      for (const u of P.COURSE[lang].units) for (const l of u.lessons){
        for (const x of [...l.vocab, ...l.sentences]) for (const t of [x.t, ...x.alt]){ need(lang, 'narrator', t); W.tileTokens(t).forEach(w => need(lang, 'narrator', w)); }
        l.blanks.forEach(b => need(lang, 'narrator', W.blankSaid(b))); l.tip.examples.forEach(x => need(lang, 'narrator', x.t));
      }
      for (const st of P.STORIES) if (st.lang === lang) for (const it of st.items) if (it.who){ need(lang, it.who, it.t); W.tileTokens(it.t).forEach(w => need(lang, 'narrator', w)); }
      for (const id of Object.keys(E('MASCOTS'))) [...E('Object.values(PIP_SAYS.' + lang + ').flat()'), E('birdHello("' + id + '", "' + lang + '")')].forEach(t => need(lang, id, t));   // every bird says the same lines, and its hello
      need(lang, 'narrator', E('LANGS.' + lang + '.test'));
      const packs = new Set(lines.filter(l => l[0] === lang).map(l => l[3])), unitPacks = P.COURSE[lang].units.map(u => u.lessons[0].id);
      ok([...packs].every(p => p === lang + '-common' || p === lang + '-stories' || unitPacks.includes(p)) && lines.find(l => l[0] === lang)[3] === lang + '-common', lang + ' lines sit in common, unit and story packs');
      const voice = E('MEDIA.voice.' + lang), speakers = new Set(lines.filter(l => l[0] === lang).map(l => l[1]));
      ok([...speakers].every(w => voice[w] && voice[w].startsWith(lang + '-')) && Object.values(voice).every(v => /^[a-z]{2}-[A-Z]{2}-/.test(v)), lang + ' every speaker has a ' + lang + ' voice: ' + [...speakers].join(', '));
    }
    ok(!miss.length, 'every line the course can say is recorded ' + JSON.stringify(miss.slice(0, 4)));
    ok(E('recKey("  Wie geht’s?  ")') === 'wie geht\'s?' && E('recKey("Guten  Morgen")') === E('recKey("guten morgen")'), 'lines match whatever their case, spacing and apostrophes');
    ok(E('cleanSettings({}).natural') === true && E('cleanSettings({ natural: false }).natural') === false, 'natural voices are on by default');
    // a fake index and packs
    const pack = Uint8Array.from({ length: 40 }, (_, i) => i);
    const idx = { v: 1, lang: 'de', packs: ['de-common.mp3', 'de-1-1.mp3', 'de-stories.mp3'], voices: {
      narrator: { name: 'n', rate: 1, lines: { [P.recKey('Guten Morgen')]: [1, 5, 10], [P.recKey(E('LANGS.de.test'))]: [0, 0, 4], [P.recKey('Kaputt')]: [1, 30, 99], [P.recKey('Super!')]: [0, 4, 6] } },
      pip: { name: 'p', rate: 1, lines: { [P.recKey('Super!')]: [0, 20, 6] } },
      lena: { name: 'l', rate: 1, lines: { [P.recKey('Guten Morgen')]: [1, 15, 10], [P.recKey('Einen Kaffee, bitte.')]: [2, 0, 8] } } } };
    const fetched = []; W.fetch = async url => { fetched.push(url); if (url === 'media/voice/de.json') return new W.Response(JSON.stringify(idx)); if (/^media\/voice\/de-[\w-]+\.mp3$/.test(url)) return new W.Response(pack); return new W.Response('', { status: 404 }); };
    const blobs = []; W.URL.createObjectURL = b => { blobs.push(b); return 'blob:clip' + blobs.length; }; W.URL.revokeObjectURL = () => {};
    E('delete Rec.idx.de; delete Rec.loading.de'); await E('recIndex("de")');   // the index main.js loads at start, now with the fake fetch
    E('window.__dev = 0; const _sd = speakDevice; speakDevice = function(){ window.__dev++; return _sd.apply(this, arguments); }');
    const bytesOf = async b => [...new Uint8Array(await b.arrayBuffer())];
    const played = async (call, expect) => {   // runs a speak() call, checks the clip's bytes, then ends it
      const before = blobs.length; const pr = E(call); await sleep(40);
      const got = blobs.length > before ? await bytesOf(blobs[blobs.length - 1]) : null;
      ok(got && JSON.stringify(got) === JSON.stringify([...pack.slice(expect[0], expect[0] + expect[1])]) && E('Rec.el.getAttribute("src")') === 'blob:clip' + blobs.length && !E('Rec.el.paused'), call + ' plays its clip ' + JSON.stringify(got));
      E('Rec.el.dispatchEvent(new Event("ended"))'); return pr;
    };
    ok(await played('speak("Guten Morgen", "de")', [5, 10]) === true, 'a recorded line resolves once it has played');
    ok(fetched.includes('media/voice/de.json') && fetched.filter(u => u === 'media/voice/de-1-1.mp3').length === 1, 'the index and the pack are fetched once');
    await played('speak("guten  morgen", "de", false, CAST.lena)', [15, 10]);
    await played('speak("Guten Morgen", "de", false, CAST.weber)', [5, 10]);   // no recording of hers: the narrator's
    E('S.settings.speed = "relaxed"'); await played('speak("Guten Morgen", "de")', [5, 10]); ok(E('Rec.el.playbackRate') === 0.85, 'relaxed speed plays it slower');
    E('S.settings.speed = "normal"'); await played('speak("Guten Morgen", "de", true)', [5, 10]); ok(E('Rec.el.playbackRate') === 0.7 && E('Rec.el.preservesPitch') === true, 'the slow button slows it without lowering it');
    ok(E('__dev') === 0, 'none of that used the device voice');
    let n = blobs.length;
    ok(await E('speak("Etwas ganz Neues", "de")') === false && E('__dev') === 1 && blobs.length === n, 'a line with no recording uses the device voice');
    ok(await E('speak("Kaputt", "de")') === false && E('__dev') === 2, 'a clip past the end of its pack uses the device voice');
    E('S.settings.natural = false'); ok(await E('speak("Guten Morgen", "de")') === false && E('__dev') === 3 && blobs.length === n, 'with natural voices off, the device voice speaks'); E('S.settings.natural = true');
    // one voice at a time: a new line or closing the screen stops the one playing
    const first = E('speak("Guten Morgen", "de")'); await sleep(40); const second = E('speak("Guten Morgen", "de", false, CAST.lena)'); await sleep(40);
    ok(await first === null && E('Rec.el.getAttribute("src")') === 'blob:clip' + blobs.length, 'a new line takes over from the one playing');
    E('closeOverlay(true)'); ok(await second === null && E('Rec.el.paused'), 'closing the screen stops the voice');
    const raced = [E('speak("Guten Morgen", "de")'), E('speak("Guten Morgen", "de", false, CAST.lena)')]; await sleep(40);
    ok(await raced[0] === null && E('__dev') === 3, 'a line still loading gives way to the next'); E('Rec.el.dispatchEvent(new Event("ended"))'); await raced[1];
    // the packs a story needs are fetched when it opens; Me → Test voice plays the recording
    E('recWarm("de", ["Einen Kaffee, bitte."])'); await sleep(30); ok(fetched.includes('media/voice/de-stories.mp3'), 'opening a story fetches its pack');
    const t = E('speakTest("de")'); await sleep(40); E('Rec.el.dispatchEvent(new Event("ended"))'); ok(await t === 'recorded', 'Test voice plays the recorded voice');
    // when the element can't play: the device voice, or Web Audio for a local copy it refuses
    const MP = W.HTMLMediaElement.prototype, play = MP.play;
    MP.play = function(){ return Promise.reject(Object.assign(new Error('needs a tap'), { name: 'NotAllowedError' })); };
    ok(await E('speak("Guten Morgen", "de")') === false && E('__dev') === 4 && !E('Rec.done'), 'if the browser won’t play it, the device voice speaks'); MP.play = play;
    const refused = E('speak("Guten Morgen", "de")'); await sleep(40); E('Rec.el.dispatchEvent(new Event("error"))');
    ok(await refused === false && E('Rec.noBlob') && E('__dev') === 5, 'a refused local copy goes to Web Audio, and without it to the device voice'); E('Rec.noBlob = false');
    // the first tap unlocks the voice element silently; an index that isn't there means the device voice
    R.w.document.body.dispatchEvent(new W.Event('pointerdown', { bubbles: true })); await sleep(30);
    ok(E('Rec.unlocked') && E('Rec.el.paused') && !E('Rec.el.muted'), 'the first tap unlocks the voice element and leaves it ready');
    E('delete Rec.idx.es; delete Rec.loading.es'); ok(await E('speak("Hola", "es")') === false && E('__dev') === 6, 'before its index loads, a language speaks with the device voice at once');
    await sleep(30); ok(E('Rec.idx.es') === null && await E('speak("Hola", "es")') === false && E('__dev') === 7, 'and without a Spanish index, it stays with the device voice');
    // the birds: the learner's bird speaks in its own recorded voice; one not recorded yet uses the device voice at its pitch
    ok(E('recWho(cast("pip"))') === 'pip' && E('recWho(CAST.pip)') === 'pip' && E('recWho(MASCOTS.kiwi)') === 'kiwi' && E('recWho(Object.assign({ id: "rojo" }, MASCOTS.rojo))') === 'rojo' && E('recWho(CAST.lena)') === 'lena' && E('recWho()') === 'narrator', 'each bird’s voice is its own');
    await played('speak("Super!", "de", false, cast("pip"))', [20, 6]);
    ok(await E('speak("Super!", "de", false, MASCOTS.kiwi)') === false && E('__dev') === 8, 'a bird with no recordings yet uses the device voice, not the narrator’s recording');
    E('Rec.idx.de.voices.kiwi = { name: "k", rate: 1, lines: { "super!": [0, 30, 5] } }'); await played('speak("Super!", "de", false, MASCOTS.kiwi)', [30, 5]);
    // Me → Sound
    [...R.w.document.querySelectorAll('.tab')].find(b => b.textContent.includes('Me')).click(); await sleep(400);
    ok(R.w.document.querySelector('#set-natural') && R.w.document.querySelector('label[for="voice-sel"]').textContent === 'German device voice', 'Me → Sound has the natural voices switch and the device voice');
    ok(!R.errors.length, 'no page errors R ' + JSON.stringify(R.errors.slice(0, 3)));
    R.dom.window.close();
    // the recordings in the repo, if any: every pack is there and every clip is inside its pack and starts on an mp3 frame
    for (const lang of LANG_IDS){
      const f = path.join(ROOT, 'media', 'voice', lang + '.json'); if (!fs.existsSync(f)) continue;
      const ix = JSON.parse(fs.readFileSync(f, 'utf8')), packs = ix.packs.map(p => fs.existsSync(path.join(ROOT, 'media', 'voice', p)) ? fs.readFileSync(path.join(ROOT, 'media', 'voice', p)) : null);
      ok(packs.every(Boolean), lang + ' every pack in the index is in media/voice');
      let bad = 0, clips = 0; for (const v of Object.values(ix.voices)) for (const [p, s, len] of Object.values(v.lines)){ clips++; const b = packs[p]; if (!b || s + len > b.length || b[s] !== 0xFF || (b[s + 1] & 0xE0) !== 0xE0) bad++; }
      ok(!bad, lang + ' every clip sits inside its pack on an mp3 frame (' + bad + ' bad of ' + clips + ')');
      const covered = lines.filter(l => l[0] === lang && ((ix.voices[l[1]] || {}).lines || {})[P.recKey(l[2])]).length, all = lines.filter(l => l[0] === lang).length;
      console.log('recorded voices ' + lang + ': ' + covered + ' of ' + all + ' lines');
    }
    // recording must never cost anything: the script's monthly cap stays under Google's free million, and no month went past it
    const cap = +((fs.readFileSync(path.join(ROOT, 'dev', 'voices.js'), 'utf8').match(/MONTH_CAP = (\d+)/) || [])[1]);
    ok(cap > 0 && cap <= 900000, 'dev/voices.js stops each month at ' + cap + ' characters, under the free 1,000,000');
    const usageFile = path.join(ROOT, 'dev', 'voice-usage.json');
    if (fs.existsSync(usageFile)){ const u = JSON.parse(fs.readFileSync(usageFile, 'utf8')); ok(u.months && Object.entries(u.months).every(([m, n]) => /^\d{4}-\d{2}$/.test(m) && n >= 0 && n <= cap), 'every month of recording stayed under the cap ' + JSON.stringify(u.months)); }
  }
  /* ---------- 11. the web version: accounts and the database through Supabase (fake server) ---------- */
  {
    const store = new Map([['content/config', { kind: 'config', latest: '99.0.0' }]]);
    const sb = fakeSupabase(store, { google: true });
    // signed out: live content still arrives, progress stays in this browser, the tutor stays Claude-only
    const W1 = await makeDom({ web: sb, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (let i = 0; i < 60 && !W1.w.document.getElementById('update-banner'); i++) await sleep(25);
    ok(W1.E('Web.on') && W1.E('Remote.ready') && W1.E('Remote.status') === 'local', 'web version runs signed out: ' + W1.E('Remote.status'));
    ok(W1.w.document.getElementById('update-banner'), 'live content reaches signed-out visitors');
    ok(!W1.E('aiOn()'), 'the tutor stays Claude-only on the web');
    // the web version points at Claude, and can hand a scene or a lesson to Claude, ChatGPT or Gemini
    for (const tab of ['talk', 'learn', 'me']){
      W1.E('UI.tab=' + JSON.stringify(tab) + '; render()');
      const app = W1.w.document.querySelector('#app');
      ok([...app.querySelectorAll('a')].some(a => a.href === 'https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72' && a.target === '_blank'), 'the ' + tab + ' tab links to Parlance in Claude on the web');
    }
    W1.E('UI.tab="talk"; render()');
    W1.w.document.querySelector('.scen').click();
    { const links = [...W1.w.document.querySelectorAll('.sheet .ai-picker a')].map(a => a.href);
      ok(links.length === 3 && links[0].startsWith('https://claude.ai/new?q=') && links[1].startsWith('https://chatgpt.com/?q=') && links[2] === 'https://gemini.google.com/app', 'a Talk scene opens in Claude, ChatGPT or Gemini: ' + links.join(' ')); 
      ok(decodeURIComponent(links[0].split('?q=')[1]).includes('German') && decodeURIComponent(links[0].split('?q=')[1]).includes('barista'), 'the scene prompt carries the language and the role'); }
    [...W1.w.document.querySelectorAll('.sheet button')].find(b => b.textContent === 'Close').click(); await sleep(200);
    W1.E('UI.tab="learn"; render()');
    ok(W1.w.document.querySelectorAll('.gen .ai-picker a').length === 3, 'lessons on demand can be handed to a chat app on the web');
    W1.E('UI.tab="me"; render()');
    ok([...W1.w.document.querySelectorAll('#app p')].some(p => p.textContent.includes('practice any Talk scene in Claude, ChatGPT or Gemini')) && [...W1.w.document.querySelectorAll('#app button')].some(b => b.textContent.trim() === 'Go to Talk'), 'Me on the web points to Talk scenes in chat apps');
    ok([...W1.w.document.querySelectorAll('#app .setrow')].some(r => r.textContent.includes('Tutor grading') && r.textContent.includes('Needs Parlance in Claude. On the web version, Parlance checks your typed answers on its own.')), 'on the web, tutor grading says it needs Parlance in Claude');
    [...W1.w.document.querySelectorAll('#app button')].find(b => b.textContent.trim() === 'Go to Talk').click();
    ok(W1.E('UI.tab') === 'talk', 'Go to Talk opens Talk');
    W1.E('UI.tab="me"; render()');
    W1.P.S.langs.de.done['de-1-1'] = { at: '2026-10-11', acc: 1, times: 1 }; W1.E('touch("de")');
    W1.E('UI.tab="me"; render()');
    ok(W1.w.document.querySelector('#sync-status').textContent.includes('Sign in to sync'), 'web sync copy when signed out');
    { const av = W1.w.document.querySelector('.profile .avatar'), link = [...W1.w.document.querySelectorAll('.profile button')].find(b => b.textContent === 'Sign in');
      ok(av && av.querySelector('svg') && !av.textContent.trim() && link, 'signed out with no name: a person in the avatar, not a letter, and a way to sign in'); }
    // email sign-in is off for now (WEB.email): the sheet offers Google only
    W1.w.document.querySelector('.web-acct button').click(); await sleep(40);
    { const s0 = W1.w.document.querySelector('.sheet'), shown = el => !el.closest('[hidden]'), bs = [...s0.querySelectorAll('button')], g = bs.find(b => b.textContent === 'Continue with Google');
      ok(g && shown(g) && g.classList.contains('btn-primary') && [...s0.querySelectorAll('input')].every(i => !shown(i)) && !bs.some(b => shown(b) && /^(Sign in|Create account|New here\? Create an account|Forgot your password\?)$/.test(b.textContent)) && !shown(s0.querySelector('.web-or')), 'with email off, sign-in is Google only');
      bs.find(b => b.textContent === 'Not now').click(); await sleep(200); }
    ok(!W1.w.document.querySelector('.sheet'), 'sheet closed');
    // the email code stays, behind the switch
    W1.E('WEB.email = true');
    W1.w.document.querySelector('.web-acct button').click(); await sleep(40);
    const sh = W1.w.document.querySelector('.sheet'), btn = t => [...sh.querySelectorAll('button')].find(b => b.textContent === t), [nameIn, emailIn, passIn] = sh.querySelectorAll('input');
    ok(btn('Continue with Google') && !btn('Continue with Google').hidden, 'Google button shows when the project has it on');
    ok(btn('Continue with Google').classList.contains('btn-primary') && btn('Sign in').classList.contains('btn-quiet') && sh.querySelector('.web-or').textContent === 'or use email', 'Google leads when it is on; email comes second');
    emailIn.value = 'ana@example.com'; passIn.value = 'wrong password'; btn('Sign in').click(); await sleep(40);
    ok(sh.querySelector('.web-msg').textContent.includes('don’t match'), 'wrong password explained: ' + sh.querySelector('.web-msg').textContent);
    sb.opts.mail = false; btn('Forgot your password?').click(); await sleep(40);
    ok(!sb.recovers.length && sh.querySelector('.web-msg').textContent.includes('Continue with Google'), 'with no email service, forgot password points to Google: ' + sh.querySelector('.web-msg').textContent);
    sb.opts.mail = true; btn('Forgot your password?').click(); await sleep(40);
    ok(sb.recovers.length === 1 && sb.recovers[0].email === 'ana@example.com' && /^https:\/\/parlance\.test\//.test(sb.recovers[0].redirect) && sh.querySelector('.web-msg').textContent.includes('on its way'), 'forgot password sends a reset link back to Parlance ' + JSON.stringify(sb.recovers));
    btn('New here? Create an account').click();
    ok(!nameIn.hidden && btn('Create account'), 'create-account mode asks for a name');
    nameIn.value = 'Ana'; passIn.value = 'short'; btn('Create account').click(); await sleep(20);
    ok(sh.querySelector('.web-msg').textContent.includes('8 or more'), 'password length checked');
    let reloads = 0; W1.w.webReload = () => { reloads++; };
    passIn.value = 'correct horse battery'; btn('Create account').click(); await sleep(450);
    ok(reloads === 1 && sb.users.size === 1, 'account created, page reloads');
    const keep1 = storageOf(W1.w);
    ok(keep1['parlance.web.session'] && JSON.parse(keep1['parlance.v2']).langs.de.done['de-1-1'], 'session and progress kept in this browser');
    ok(!W1.errors.length, 'no page errors W1 ' + JSON.stringify(W1.errors.slice(0, 3)));
    W1.dom.window.close();
    // after the reload: signed in, synced, named; what was done before signing in moves into the account
    const uid = [...sb.users.keys()][0];
    const W2 = await makeDom({ web: sb, storage: keep1 });
    for (let i = 0; i < 60 && W2.E('Remote.status') !== 'synced'; i++) await sleep(25);
    ok(W2.E('Remote.status') === 'synced' && W2.E('Remote.uid') === uid, 'signed in and synced: ' + W2.E('Remote.status'));
    ok(store.has('data/users/' + uid + '/de') && JSON.parse(store.get('data/users/' + uid + '/de').blob).done['de-1-1'], 'progress from before signing in went to the account');
    ok(W2.E('Me.name') === 'Ana' && sb.profiles.get(uid) === 'Ana', 'name comes from the account');
    W2.E('UI.tab="me"; render()');
    ok(W2.w.document.querySelector('.web-acct').textContent.includes('ana@example.com') && W2.w.document.querySelector('#sync-status').textContent.includes('Parlance account'), 'Me shows the account');
    ok(W2.w.document.querySelector('.profile .avatar').textContent === 'A' && W2.w.document.querySelector('.profile h1').textContent === 'Ana' && ![...W2.w.document.querySelectorAll('.profile button')].length, 'signed in: your initial and name, no sign-in link');
    await W2.E('queueFeedback({ id: "fw1", at: 1, type: "idea", text: "More food words", ctx: {} })');
    ok(store.get('feedback/' + uid) && store.get('feedback/' + uid).items[0].text === 'More food words', 'feedback reaches the database');
    let denied = null; try { await W2.E('Live.db.doc("content/x").set({ kind: "pack" })'); } catch (e) { denied = e; }
    ok(denied && denied.code === 'invalid_argument' && !store.has('content/x'), 'learners can’t write live content: ' + JSON.stringify(denied));
    ok(!W2.E('Live.owner') && !W2.E('studioAvailable()'), 'no Studio for learners');
    const oldToken = W2.E('Web.session.access_token'); W2.E('Web.session.expires_at = 0');
    W2.P.S.langs.de.xp = (W2.P.S.langs.de.xp || 0) + 5; W2.E('touch("de")'); await W2.E('syncNow()');
    ok(W2.E('Web.session.access_token') !== oldToken && W2.E('Remote.status') === 'synced' && JSON.parse(store.get('data/users/' + uid + '/de').blob).xp >= 5, 'an expired session renews itself');
    const keep2 = storageOf(W2.w);
    ok(!W2.errors.length, 'no page errors W2 ' + JSON.stringify(W2.errors.slice(0, 3)));
    W2.dom.window.close();
    // the owner gets Studio and live content, then signs out
    sb.owners.add(uid);
    const W3 = await makeDom({ web: sb, storage: keep2 });
    for (let i = 0; i < 60 && !W3.E('Live.owner'); i++) await sleep(25);
    ok(W3.E('studioAvailable()'), 'the owner gets Studio on the web');
    await W3.E('openStudio()');
    ok(W3.E('Studio.fb.length') === 1 && W3.E('Studio.names')[uid] === 'Ana', 'Studio reads feedback and learner names');
    W3.E('closeStudio()');
    await W3.E('setConfig({ latest: "4.9.9" })');
    ok(store.get('content/config').latest === '4.9.9', 'the owner writes live content');
    W3.E('UI.tab="me"; render()');
    let outs = 0; W3.w.webReload = () => { outs++; };
    [...W3.w.document.querySelectorAll('.web-acct button')].find(b => b.textContent === 'Sign out').click(); await sleep(60);
    ok(outs === 1 && !W3.E('Web.session') && !W3.w.localStorage.getItem('parlance.web.session'), 'signing out forgets the session');
    ok(!W3.errors.length, 'no page errors W3 ' + JSON.stringify(W3.errors.slice(0, 3)));
    W3.dom.window.close();
    // coming back from Google: the session arrives in the URL fragment, and Google's photo becomes the avatar
    const t = sb.issue(uid); sb.users.get(uid).meta.avatar_url = 'https://lh3.googleusercontent.com/a/ana';
    const W4 = await makeDom({ web: sb, hash: '#access_token=' + t.access_token + '&expires_in=3600&refresh_token=' + t.refresh_token + '&token_type=bearer' });
    for (let i = 0; i < 60 && W4.E('Remote.status') !== 'synced'; i++) await sleep(25);
    ok(W4.E('Remote.status') === 'synced' && W4.E('Web.session.user.id') === uid && W4.w.location.hash === '', 'Google sign-in lands signed in, URL cleaned');
    ok(W4.P.S.langs.de.done['de-1-1'], 'account progress loads on a new device');
    W4.E('UI.tab="me"; render()');
    { const img = W4.w.document.querySelector('.profile img.avatar'); ok(img && img.getAttribute('src') === 'https://lh3.googleusercontent.com/a/ana' && img.getAttribute('referrerpolicy') === 'no-referrer', 'Google photo as the avatar');
      if (img) img.dispatchEvent(new W4.w.Event('error'));
      ok(W4.w.document.querySelector('.profile .avatar').textContent === 'A', 'a photo that won’t load falls back to your initial'); }
    // changing your name, and saving a backup file
    W4.E('openWebName()'); await sleep(20);
    const nameSheet = [...W4.w.document.querySelectorAll(".sheet")].pop(), newNameIn = nameSheet.querySelector("input");
    ok(newNameIn && newNameIn.value === "Ana", "name sheet starts with your name");
    newNameIn.value = "Anita"; [...nameSheet.querySelectorAll('button')].find(b => b.textContent === 'Save').click(); await sleep(60);
    ok(sb.users.get(uid).meta.name === 'Anita' && sb.profiles.get(uid) === 'Anita' && W4.E('Me.name') === 'Anita', 'name changed in the account, profile and greeting');
    let saved = null; W4.w.URL.createObjectURL = () => 'blob:parlance'; W4.w.URL.revokeObjectURL = () => {};
    W4.w.HTMLAnchorElement.prototype.click = function(){ saved = this.download; };
    W4.E('UI.tab="me"; render()');
    const dlBtn = [...W4.w.document.querySelectorAll('button')].find(b => b.textContent === 'Download a backup file');
    ok(!!dlBtn, 'the web version offers a backup file');
    if (dlBtn){ dlBtn.click(); await sleep(120); }
    ok(/^parlance-backup-\d{4}-\d\d-\d\d\.txt$/.test(saved || ''), 'backup file saved: ' + saved);
    ok(!W4.errors.length, 'no page errors W4 ' + JSON.stringify(W4.errors.slice(0, 3)));
    W4.dom.window.close();
    // back from a password-reset email: signed in, then asked for a new password
    const rt = sb.issue(uid);
    const W5 = await makeDom({ web: sb, hash: '#access_token=' + rt.access_token + '&expires_in=3600&refresh_token=' + rt.refresh_token + '&token_type=bearer&type=recovery' });
    for (let i = 0; i < 80 && ![...W5.w.document.querySelectorAll('.sheet h3')].some(x => x.textContent === 'Set a new password'); i++) await sleep(25);
    const pwSheet = [...W5.w.document.querySelectorAll('.sheet')].find(s => s.querySelector('h3').textContent === 'Set a new password');
    ok(!!pwSheet && W5.E('Web.session.user.id') === uid, 'reset link signs in and asks for a new password');
    if (pwSheet){ pwSheet.querySelector('input').value = 'a brand new password'; [...pwSheet.querySelectorAll('button')].find(b => b.textContent === 'Save password').click(); await sleep(60); }
    ok(sb.users.get(uid).password === 'a brand new password', 'new password saved');
    ok(!W5.errors.length, 'no page errors W5 ' + JSON.stringify(W5.errors.slice(0, 3)));
    W5.dom.window.close();
    // Home Screen: iPhone Safari gets the Share tip, the installed app doesn't, Chrome's install prompt becomes a button
    const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const homeCard = async opts => { const X = await makeDom({ web: sb, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } }, ...opts }); await sleep(60); X.E('UI.tab="me"; render()'); return X; };
    const H1 = await homeCard({ ua: IPHONE });
    const iosBtn = H1.w.document.querySelector('.web-home button');
    ok(iosBtn && iosBtn.textContent === 'Add to Home Screen', 'iPhone Safari gets an Add to Home Screen button too');
    if (iosBtn){ iosBtn.click(); await sleep(30); }
    const help = H1.w.document.querySelector('.sheet .hs-steps');
    ok(help && help.querySelectorAll('.hs-step').length === 3 && /Tap Share/.test(help.textContent) && /Add to Home Screen/.test(help.textContent) && H1.w.document.querySelector('.web-home'), 'and it shows Safari’s steps');
    H1.dom.window.close();
    const H2 = await homeCard({ ua: IPHONE, standalone: true });
    ok(!H2.w.document.querySelector('.web-home'), 'no tip once Parlance opens from the Home Screen');
    H2.dom.window.close();
    const H3 = await homeCard({});
    ok(!H3.w.document.querySelector('.web-home'), 'no tip on a browser that can’t install');
    let prompted = 0; const ev = new H3.w.Event('beforeinstallprompt'); ev.prompt = async () => { prompted++; };
    H3.w.dispatchEvent(ev); H3.E('render()');
    const addBtn = [...H3.w.document.querySelectorAll('.web-home button')].find(b => b.textContent === 'Add to Home Screen');
    ok(!!addBtn, 'Chrome’s install prompt is offered in Me');
    if (addBtn){ addBtn.click(); await sleep(30); }
    ok(prompted === 1 && !H3.w.document.querySelector('.web-home'), 'the button installs once, then the card goes away');
    ok(!H3.errors.length && !H1.errors.length, 'no page errors H ' + JSON.stringify(H3.errors.concat(H1.errors).slice(0, 3)));
    H3.dom.window.close();
    // the web build: a full page that turns the web host on, with a manifest and icons
    require('child_process').execFileSync(process.execPath, [path.join(ROOT, 'dev', 'web.js')], { cwd: ROOT });
    const built = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8'), manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'manifest.webmanifest'), 'utf8'));
    ok(built.startsWith('<!doctype html>') && built.includes('window.PARLANCE_WEB = true') && built.includes('rel="manifest"') && built.includes('rel="apple-touch-icon" href="media/icons/icon-180.png"'), 'web build page');
    // vercel.json's Content-Security-Policy allows the build's one inline script by hash: if that script changes, the page would load with no scripts
    {
      const inline = [...built.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
      const csp = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
      const hash = s => "'sha256-" + require('crypto').createHash('sha256').update(s).digest('base64') + "'";
      ok(inline.length === 1 && csp.includes(hash(inline[0])), 'the CSP hash matches the web build’s inline script (' + inline.length + ' inline: ' + inline.map(hash).join(' ') + ')');
      ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(built.replace(/<script>[\s\S]*?<\/script>/, '')), 'no other inline scripts in the web build');
      ok(!/unsafe-eval|script-src[^;]*unsafe-inline/.test(csp), 'the CSP never allows eval or inline scripts');
    }
    ok(manifest.display === 'standalone' && /^#[0-9A-F]{6}$/i.test(manifest.theme_color) && manifest.icons.every(i => fs.existsSync(path.join(ROOT, 'dist', i.src))) && fs.existsSync(path.join(ROOT, 'dist', 'media', 'icons', 'icon-180.png')), 'web manifest and icons ' + JSON.stringify(manifest.icons.map(i => i.src)));
  }
  /* ---------- 12. friends: invites, the league, duels, cheers, removing (learners sharing one database) ---------- */
  {
    const store = new Map();
    const seed = () => ({ 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0', filmSeen: true } } });
    const btnIn = (root, t) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === t);
    const lastSheet = X => [...X.w.document.querySelectorAll('.sheet-back:not(.out) .sheet')].pop();
    const started = async X => { for (let i = 0; i < 80 && !X.E('Social.started'); i++) await sleep(25); };
    const M = await makeDom({ claude: fakeClaude(store, { uid: 'u_matt', name: 'Matt Colfax' }), seed: seed() });
    const A = await makeDom({ claude: fakeClaude(store, { uid: 'u_ana', name: 'Ana López' }), seed: seed() });
    await started(M); await started(A);
    ok(M.E('Social.started') && A.E('Social.started') && M.E('socialState()') === 'ok', 'friends start once signed in');
    // the tab: an intro, then your card and an invite
    M.E('UI.tab="friends"; render()');
    const md = M.w.document;
    const tabBtn = [...md.querySelectorAll('.tab')].find(b => b.textContent.includes('Friends'));
    ok(md.querySelectorAll('.tab').length === 6 && tabBtn && tabBtn.getAttribute('aria-current') === 'page', 'Friends has its own tab');
    ok(md.querySelector('.fr-hero') && md.querySelector('.fr-hero').textContent.includes('Learn with friends') && md.querySelector('.fr-privacy'), 'friends intro explains who sees your card');
    btnIn(md.querySelector('.fr-hero'), 'Invite a friend').click(); await sleep(40);
    let sh = lastSheet(M);
    ok(sh && sh.querySelector('#fr-name') && sh.querySelector('#fr-name').value === 'Matt' && sh.querySelectorAll('.fr-bird').length === M.E('BIRDS.length') && M.E('BIRDS.length') >= 17 && sh.querySelector('.fr-bird[aria-label="Kiwi"]'), 'card setup starts with your first name and a choice of pictures');
    [...sh.querySelectorAll('.fr-bird')].find(b => b.getAttribute('aria-label') === 'Jonas').click();
    btnIn(lastSheet(M), 'Continue').click(); await sleep(450);
    const mattCard = [...store.keys()].find(k => k.startsWith('cards/u_matt/'));
    ok(mattCard && /^cards\/u_matt\/[A-Za-z0-9]{24}\/card$/.test(mattCard) && store.get(mattCard).name === 'Matt' && store.get(mattCard).bird === 'jonas', 'card published at a secret path: ' + mattCard);
    sh = lastSheet(M);
    const invite = sh && sh.querySelector('textarea') ? sh.querySelector('textarea').value : '';
    const mattCode = M.E('myCode()');
    ok(/^Pc1\.[A-Za-z0-9]{24}\.u_matt$/.test(mattCode) && invite.includes(mattCode) && invite.includes('claude.ai/artifact/'), 'invite carries the code and the link: ' + invite);
    btnIn(sh, 'Copy invite') && M.w.document.querySelectorAll('.sheet-back').forEach(b => b.remove());
    // Ana pastes the whole message
    A.E('UI.tab="friends"; render()');
    const ad = A.w.document;
    btnIn(ad.querySelector('.fr-hero'), 'I have an invite').click(); await sleep(40);
    lastSheet(A).querySelector('#fr-name').value = 'Ana';
    btnIn(lastSheet(A), 'Continue').click(); await sleep(450);
    sh = lastSheet(A);
    ok(sh && sh.querySelector('h3').textContent === 'Add a friend', 'after the card, the invite box opens');
    sh.querySelector('textarea').value = 'P' + 'c1.nope';
    btnIn(sh, 'Add friend').click(); await sleep(60);
    ok(sh.querySelector('.web-msg').textContent.includes('doesn’t look like a Parlance invite'), 'a broken invite is explained');
    sh.querySelector('textarea').value = invite;
    btnIn(sh, 'Add friend').click(); await sleep(300);
    ok(A.E('friendIds()').includes('u_matt') && A.E('friendName("u_matt")') === 'Matt', 'Ana added Matt from his invite');
    for (let i = 0; i < 60 && !M.E('friendIds().includes("u_ana")'); i++) await sleep(25);
    ok(M.E('friendIds().includes("u_ana")'), 'Matt got Ana back through his inbox');
    for (let i = 0; i < 40 && [...store.keys()].some(k => k.startsWith('inbox/')); i++) await sleep(25);
    ok(![...store.keys()].some(k => k.startsWith('inbox/')), 'inbox notes are cleared once read');
    ok(M.P.S.badges.friend && A.P.S.badges.friend, 'both get the first-friend badge');
    // the league
    A.E('addXP(40, "de")'); await A.E('socialPublish(true)');
    await M.E('socialRefresh(true)'); M.E('UI.tab="friends"; render()');
    let rows = [...md.querySelectorAll('.fr-league li')];
    ok(rows.length === 2 && rows[0].textContent.includes('Ana') && rows[0].textContent.includes('40') && rows[1].textContent.includes('You'), 'league ranks Ana first by XP: ' + rows.map(r => r.textContent).join(' | '));
    M.E('addXP(55, "de")');
    btnIn(md, 'Goal days').click();
    rows = [...md.querySelectorAll('.fr-league li')];
    ok(rows[0].textContent.includes('Matt') && /1\s*goal day/.test(rows[0].textContent), 'goal days rank you first once your goal is met: ' + rows.map(r => r.textContent).join(' | '));
    btnIn(md, 'Streak').click();
    ok(md.querySelector('.fr-league .flame'), 'streak league');
    // a duel: Matt challenges, Ana accepts
    btnIn(md, 'Challenge a friend').click(); await sleep(30);
    sh = lastSheet(M);
    btnIn(sh, 'Most lessons').click();
    btnIn(lastSheet(M), 'Send challenge').click(); await sleep(200);
    const did = Object.keys(M.P.S.social.duels)[0];
    ok(did && M.P.S.social.duels[did].state === 'pending' && store.get(M.E('cardPath(Remote.uid, S.social.secret)')).duels.length === 1, 'challenge sent');
    await A.E('socialRefresh(true)'); A.E('render()');
    ok(A.E('socialAlerts()') === 1 && ad.querySelector('.tab .badge.dot[aria-label="New from friends"]'), 'Ana sees the challenge, with a dot on the tab');
    const al = ad.querySelector('.fr-alert');
    ok(al && al.textContent.includes('Matt challenged you') && al.textContent.includes('Most lessons'), 'challenge card: ' + (al && al.textContent));
    btnIn(al, 'Accept').click(); await sleep(200);
    const ad1 = A.P.S.social.duels[did];
    ok(ad1 && ad1.state === 'on' && ad1.start === A.E('today()') && ad1.end === A.E('addDays(today(), 6)'), 'Ana accepted: the week starts today');
    await M.E('socialRefresh(true)');
    ok(M.P.S.social.duels[did].state === 'on' && M.P.S.social.duels[did].end === ad1.end, 'Matt picks up the dates from Ana’s card');
    A.E('bumpQuest("lessons", 2); addXP(1, "de")'); await A.E('socialPublish(true)');
    await M.E('socialRefresh(true)'); M.E('render()');
    const duelBox = md.querySelector('.fr-duel');
    ok(duelBox && duelBox.textContent.includes('You vs Ana') && duelBox.textContent.includes('Ana is ahead') && duelBox.textContent.includes('7 days left'), 'duel shows the score: ' + (duelBox && duelBox.textContent));
    ok(M.E('socialChallenge') && btnIn(md, 'Challenge a friend'), 'challenge button stays');
    // the week ends: Matt did more lessons, so Matt wins
    const past = M.E('addDays(today(), -8)'), pastEnd = M.E('addDays(today(), -2)');
    for (const X of [M, A]){ X.E('Object.assign(S.social.duels[' + JSON.stringify(did) + '], { start: ' + JSON.stringify(past) + ', end: ' + JSON.stringify(pastEnd) + ' })'); }
    M.E('S.days[' + JSON.stringify(M.E('addDays(today(), -3)')) + '] = { xp: 30, met: true, q: { lessons: 4 } }'); await M.E('socialPublish(true)');
    A.E('S.days[' + JSON.stringify(A.E('addDays(today(), -3)')) + '] = { xp: 12, met: false, q: { lessons: 1 } }'); await A.E('socialPublish(true)');
    const xpBefore = M.P.S.langs.de.xp;
    await M.E('socialRefresh(true)');
    const res = M.P.S.social.past[did];
    ok(res && res.me === 4 && res.them === 1 && M.P.S.social.duels[did].state === 'done', 'duel settled: ' + JSON.stringify(res));
    ok(M.P.S.langs.de.xp === xpBefore + M.E('XP.duelWin') && M.P.S.badges.rival, 'the winner gets bonus XP and a badge');
    M.E('render()');
    ok(md.querySelector('.fr-duel.done.won') && md.querySelector('.fr-duel.done').textContent.includes('You beat Ana'), 'finished duel shows the result');
    await M.E('socialRefresh(true)');
    ok(M.P.S.langs.de.xp === xpBefore + M.E('XP.duelWin'), 'the bonus is paid once');
    await A.E('socialRefresh(true)');
    ok(A.P.S.social.past[did] && A.P.S.social.past[did].me === 1 && A.P.S.social.past[did].them === 4, 'Ana sees the same result from her side');
    // cheers
    await M.E('socialCheer("u_ana")');
    await A.E('socialRefresh(true)'); A.E('UI.tab="friends"; render()');
    const ch = ad.querySelector('.fr-alert.cheer');
    ok(ch && ch.textContent.includes('Matt cheered you on'), 'Ana sees Matt’s cheer');
    btnIn(ch, 'Cheer back').click(); await sleep(150);
    ok(!ad.querySelector('.fr-alert.cheer') && A.P.S.social.cheers.u_matt === A.E('today()') && A.E('socialAlerts()') === 0, 'cheering back clears the card');
    await M.E('socialRefresh(true)');
    ok(M.E('cheerFrom("u_ana")'), 'Matt gets the cheer back');
    // a friend's sheet
    M.E('UI.tab="friends"; render()');
    [...md.querySelectorAll('.fr-league li')].find(li => li.textContent.includes('Ana')).querySelector('button').click(); await sleep(30);
    sh = lastSheet(M);
    ok(sh && sh.querySelector('h3').textContent === 'Ana' && sh.querySelector('.fr-week') && sh.textContent.includes('1 won, 0 lost'), 'friend sheet with the week and your duel record: ' + (sh && sh.textContent));
    M.w.document.querySelectorAll('.sheet-back').forEach(b => b.remove());
    // a duel settled more than a week after it ended: the account still holds it as "on", and it must not pay again
    M.E('S.social.duels.dLate = { id: "dLate", a: Remote.uid, b: "u_ana", metric: "xp", at: Date.now() - 20 * DAY_MS, u: Date.now() - 18 * DAY_MS, state: "on", start: addDays(today(), -18), end: addDays(today(), -12) }');
    M.E('S.days[addDays(today(), -14)] = { xp: 50, met: true, q: { lessons: 2 } }');
    await M.E('syncNow(true)');
    ok(JSON.parse(store.get('data/users/u_matt/social').blob).duels.dLate.state === 'on', 'the account holds the late duel as on');
    const lateXP = M.P.S.langs.de.xp, lateDay = M.E('todayXP()'), lateTotal = M.E('S.days[today()].xp'), lateBonus = M.E('S.days[today()].bonus || 0');
    for (let i = 0; i < 3; i++){ await M.E('socialRefresh(true)'); await sleep(30); await M.E('syncNow(true)'); await sleep(30); }
    ok(M.P.S.social.past.dLate && M.P.S.social.past.dLate.me === 50, 'the late duel is settled: ' + JSON.stringify(M.P.S.social.past.dLate));
    ok(M.P.S.langs.de.xp === lateXP + M.E('XP.duelWin') && M.E('S.days[today()].xp') === lateTotal + M.E('XP.duelWin') && M.E('S.days[today()].bonus') === lateBonus + M.E('XP.duelWin') && M.E('todayXP()') === lateDay, 'a late duel pays once, not on every refresh: ' + (M.P.S.langs.de.xp - lateXP) + ' XP');
    const lateSrv = JSON.parse(store.get('data/users/u_matt/social').blob).duels.dLate;
    ok(!M.P.S.social.duels.dLate && !(lateSrv && lateSrv.state === 'on'), 'the finished duel leaves the account too: ' + JSON.stringify(lateSrv));
    ok(M.E('mergeSocial({ past: { dX: { me: 1 } }, duels: {} }, { duels: { dX: { id: "dX", a: "u_matt", b: "u_ana", metric: "xp", state: "on", end: addDays(today(), -1) } } }).duels.dX.state') === 'done', 'a merge never brings a settled duel back as on');
    // a duel win counts toward your totals and the week (league, duels), not the daily goal
    const dw = M.E('XP.duelWin');
    const bonusDay = JSON.parse(M.E(`(() => { const k = today(), keep = S.days[k], xp = S.langs.de.xp; S.days[k] = { xp: 0, met: false }; addXP(XP.duelWin, 'de', true); const d = S.days[k];
      const r = { xp: d.xp, bonus: d.bonus, met: d.met, goal: todayXP(), quest: questProgress('xp30'), card: cardDays(S.days)[k], cal: streakCalendar(streakInfo()).querySelector('.cal-d.today').className, lang: S.langs.de.xp - xp };
      S.days[k] = keep; S.langs.de.xp = xp; return JSON.stringify(r); })()`));
    ok(bonusDay.xp === dw && bonusDay.bonus === dw && !bonusDay.met && bonusDay.goal === 0 && bonusDay.quest === 0 && bonusDay.lang === dw && bonusDay.card && bonusDay.card[0] === dw && !bonusDay.card[2] && !/\b(met|some)\b/.test(bonusDay.cal), 'a duel win alone doesn’t meet the daily goal, and still counts toward totals and the week: ' + JSON.stringify(bonusDay));
    const mergedDay = JSON.parse(M.E('JSON.stringify(mergeDays({ "2026-10-01": { xp: 30, met: true, bonus: 20 } }, { "2026-10-01": { xp: 25, met: false, extra: 1 } })["2026-10-01"])'));
    ok(mergedDay.xp === 30 && mergedDay.met && mergedDay.bonus === 20 && mergedDay.extra === 1, 'merging days keeps the bonus and fields it doesn’t know: ' + JSON.stringify(mergedDay));
    // a third friend, then removing one: the old card goes, the others get the new code
    const B = await makeDom({ claude: fakeClaude(store, { uid: 'u_bo', name: 'Bo' }), seed: seed() });
    await started(B);
    await B.E('socialSaveCard("Bo", "pip")');
    const rb = await B.E('socialAccept(' + JSON.stringify(mattCode) + ')');
    ok(rb && rb.ok, 'Bo adds Matt');
    for (let i = 0; i < 60 && !M.E('friendIds().includes("u_bo")'); i++) await sleep(25);
    ok(M.E('friendIds().length') === 2, 'Matt has two friends');
    await M.E('socialRemove("u_bo")');
    const newCard = M.E('cardPath(Remote.uid, S.social.secret)');
    ok(!store.has(mattCard) && store.has(newCard) && newCard !== mattCard, 'removing a friend moves your card to a new secret');
    for (let i = 0; i < 60 && A.E('S.social.friends.u_matt.code') !== M.E('myCode()'); i++) await sleep(25);
    ok(A.E('S.social.friends.u_matt.code') === M.E('myCode()'), 'Ana got Matt’s new code in her inbox');
    await A.E('socialRefresh(true)');
    ok(A.E('friendCard("u_matt")') && A.E('friendCard("u_matt").name') === 'Matt', 'Ana still sees Matt');
    await B.E('socialRefresh(true)'); B.E('UI.tab="friends"; render()');
    ok(!B.E('friendCard("u_matt")') && B.w.document.querySelector('.fr-league li.gone') && B.w.document.querySelector('.fr-league li.gone').textContent.includes('Not sharing right now'), 'Bo no longer sees Matt');
    const r0 = await B.E('socialAccept(' + JSON.stringify(mattCode) + ')');
    ok(r0.error && r0.error.includes('isn’t active anymore'), 'the old invite stops working');
    // codes from the other home, and your own
    const rw = await A.E('socialAccept("Pw1.abcdefghijklmnopqrstuvwx.0000-1111")');
    ok(rw.error && rw.error.includes('web version'), 'an invite from the web version is explained: ' + rw.error);
    const ro = await A.E('socialAccept(myCode())');
    ok(ro.error && ro.error.includes('your own invite'), 'your own invite is caught');
    // friends sync privately with the rest of your progress, and a second device carries on
    await M.E('syncNow(true)');
    const ms = JSON.parse(store.get('data/users/u_matt/social').blob);
    ok(ms.friends.u_ana && ms.friends.u_bo.gone && ms.secret === M.E('S.social.secret') && ms.on, 'friends saved to your account');
    const M2 = await makeDom({ claude: fakeClaude(store, { uid: 'u_matt', name: 'Matt Colfax' }), seed: seed() });
    await started(M2);
    ok(M2.E('friendIds().join()') === 'u_ana' && M2.E('S.social.secret') === M.E('S.social.secret'), 'a second device has the same friends and card');
    await M2.E('socialRefresh(true)');
    ok(M2.E('friendCard("u_ana").name') === 'Ana', 'and reads their cards');
    // backups don't carry friends across homes
    const merged = M.E('mergeWhole(S, mergeState(defaultState(), { social: { on: true, home: "w", secret: "abcdefghijklmnopqrstuvwx", since: 9e12, friends: { x: { code: "Pw1.abcdefghijklmnopqrstuvwx.x", at: 1 } } } }))');
    ok(merged.social.home === 'c' && !merged.social.friends.x, 'a backup from the web version leaves your friends alone');
    // leaving
    await A.E('socialLeave()');
    ok(!A.E('S.social.on') && !A.E('friendIds().length') && ![...store.keys()].some(k => k.startsWith('cards/u_ana/')), 'leaving Friends deletes your card');
    A.E('render()');
    ok(ad.querySelector('.fr-hero'), 'and brings back the intro');
    // view-only visitors can't make a card
    const V = await makeDom({ claude: fakeClaude(new Map(), { readOnly: true, uid: 'u_view' }), seed: seed() });
    for (let i = 0; i < 40 && V.E('Remote.status') !== 'device'; i++) await sleep(25);
    V.E('UI.tab="friends"; render()');
    ok(V.E('socialState()') === 'readonly' && V.w.document.querySelector('.fr-hero .notice').textContent.includes('can only be viewed'), 'view-only copy explains why Friends is off');
    const N = await makeDom({ seed: seed() });
    N.E('UI.tab="friends"; render()');
    ok(N.w.document.querySelector('.fr-hero .notice') && N.w.document.querySelector('.fr-hero .notice').textContent.includes('Claude account'), 'without Claude, Friends says what it needs');
    for (const X of [M, A, B, M2, V, N]){ ok(!X.errors.length, 'no page errors (friends) ' + JSON.stringify(X.errors.slice(0, 3))); X.dom.window.close(); }
  }
  /* ---------- 12b. friends on the web: an invite link waits through sign-in ---------- */
  {
    const store = new Map(), sb = fakeSupabase(store);
    const mk = (id, email, name) => { sb.users.set(id, { id, email, password: 'x', meta: { name } }); const t = sb.issue(id); return JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, user: { id, email, name } }); };
    const ana = '00000001-0000-4000-8000-0000000000aa', bo = '00000002-0000-4000-8000-0000000000bb';
    const st = { 'parlance.v2': JSON.stringify({ settings: { onboarded: true, lang: 'es', seenVersion: '9.0.0', filmSeen: true } }) };
    const WA = await makeDom({ web: sb, storage: { ...st, 'parlance.web.session': mk(ana, 'ana@example.com', 'Ana') } });
    for (let i = 0; i < 80 && !WA.E('Social.started'); i++) await sleep(25);
    ok(WA.E('Social.started') && WA.E('socialHome()') === 'w', 'friends run on the web version');
    await WA.E('socialSaveCard("Ana", "sofia")');
    const code = WA.E('myCode()'), text = WA.E('inviteText()');
    ok(/^Pw1\./.test(code) && text.includes('parlance-iota.vercel.app/?friend=' + encodeURIComponent(code)), 'web invites are links: ' + text);
    let denied = null; try { await WA.E('Remote.db.doc("cards/' + bo + '/abcdefghijklmnopqrstuvwx/card").set({ name: "fake" })'); } catch (e) { denied = e; }
    ok(denied && denied.code === 'invalid_argument', 'nobody writes someone else’s card');
    // Bo opens the link signed out: the invite waits; after signing in, Parlance offers to add Ana
    const WB0 = await makeDom({ web: sb, storage: st, hash: '?friend=' + encodeURIComponent(code) });
    await sleep(100);
    ok(WB0.w.location.search === '' && JSON.parse(WB0.w.localStorage.getItem('parlance.invite')).code === code, 'the invite waits in the browser and the link is tidied');
    WB0.E('UI.tab="friends"; render()');
    ok(WB0.w.document.querySelector('.fr-hero').textContent.includes('Sign in to accept'), 'signed out, the invite asks you to sign in');
    const keep = storageOf(WB0.w); WB0.dom.window.close();
    const WB = await makeDom({ web: sb, storage: { ...keep, 'parlance.web.session': mk(bo, 'bo@example.com', 'Bo') } });
    let offer = null;
    for (let i = 0; i < 120 && !offer; i++){ await sleep(25); offer = [...WB.w.document.querySelectorAll('.sheet')].find(s => s.querySelector('h3').textContent === 'Ana invited you'); }
    ok(!!offer, 'after signing in, Parlance offers to add Ana');
    if (offer){ [...offer.querySelectorAll('button')].find(b => b.textContent === 'Add Ana').click(); await sleep(300); }
    const setup = [...WB.w.document.querySelectorAll('.sheet-back:not(.out) .sheet')].pop();
    ok(setup && setup.querySelector('#fr-name').value === 'Bo', 'Bo makes a card first');
    if (setup){ [...setup.querySelectorAll('button')].find(b => b.textContent === 'Continue').click(); await sleep(700); }
    ok(WB.E('friendIds().join()') === ana && !WB.w.localStorage.getItem('parlance.invite'), 'Bo and Ana are friends; the invite is used up');
    ok(WB.E('UI.tab') === 'friends', 'Bo lands on Friends');
    await WA.E('Remote.db.collection(inboxPath(Remote.uid, S.social.secret)).get().then(s => readInbox(s.docs, Social.inboxKey))');
    ok(WA.E('friendIds().join()') === bo && ![...store.keys()].some(k => k.startsWith('inbox/')), 'Ana adds Bo back and clears her inbox');
    WA.E('Social.blocked = true; UI.tab = "friends"; render()');
    ok(WA.E('socialState()') === 'notready' && WA.w.document.querySelector('.fr-hero .notice').textContent.includes('isn’t ready on the web version'), 'if the web database can’t take cards yet, Friends says so');
    WA.E('Social.blocked = false');
    for (const X of [WA, WB]){ ok(!X.errors.length, 'no page errors (web friends) ' + JSON.stringify(X.errors.slice(0, 3))); X.dom.window.close(); }
  }
  console.log('PASS', passes, 'FAIL', fails);
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
