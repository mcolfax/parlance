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
  ok(lessonCount === 264, 'lesson count ' + lessonCount);
  // units sorted by level, ids unique
  for (const lang of ['de', 'es']){ const lv = P.COURSE[lang].units.map(u => ['A1','A2','B1','B2','C1','C2'].indexOf(u.level)); ok(lv.every((x, i) => i === 0 || x >= lv[i - 1]), lang + ' units sorted'); }
  { const ids = new Set(); for (const lang of ['de','es']) for (const u of P.COURSE[lang].units) for (const l of u.lessons){ ok(!ids.has(l.id), 'unique id ' + l.id); ids.add(l.id); ok(l.vocab.length >= 6 && l.sentences.length >= 4 && l.blanks.length === 3, 'shape ' + l.id); for (const b of l.blanks){ ok(b.t.split('___').length === 2, 'blank ' + b.t); ok(new Set(b.o).size === b.o.length, 'blank opts unique ' + b.t); } } }
  /* stories content */
  for (const st of P.STORIES){
    ok(['de','es'].includes(st.lang) && st.items.length >= 8, 'story shape ' + st.id);
    ok(st.items.filter(x => x.q).length >= 2, 'story questions ' + st.id);
    for (const it of st.items){ if (it.q){ ok(it.o.length === 3 && new Set(it.o).size === 3, 'story q opts ' + st.id + ' ' + it.q); } else { ok(P.CAST[it.who] && P.CAST[it.who].lang === st.lang, 'speaker ' + st.id + ' ' + it.who); ok(it.t && it.e, 'line text ' + st.id); } }
  }
  ok(P.STORIES.length === 18, 'stories ' + P.STORIES.length);
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
    ok(['de', 'es'].includes(c.lang) && c.look && A.E('!!HAIR[' + JSON.stringify(c.look.style) + ']') && svg.startsWith('<svg') && !/NaN|undefined/.test(svg), 'portrait ' + id);
    ok(P.STORIES.some(s => s.cast.includes(id)) || A.E('SCENARIOS').some(sc => sc.cast[c.lang] === id), 'has a story or a Talk scene ' + id);
  }
  for (const sc of A.E('SCENARIOS')) for (const lang of ['de', 'es']){ const who = sc.cast[lang]; ok(who === 'pip' || (P.CAST[who] && P.CAST[who].lang === lang), 'Talk ' + sc.id + ' ' + lang + ' is played by ' + who); }
  ok(A.E('avatarSVG("leyla")').includes('evenodd') && A.E('avatarSVG("brandt")').includes(P.CAST.brandt.look.tie) && A.E('avatarSVG("valentina")').includes(P.CAST.valentina.look.ribbon), 'new looks: headscarf, tie, braid ribbons');
  ok(A.E('FILM_CAST').map(r => r.length).join() === '6,6' && A.E('FILM_CAST.flat().length') === Object.keys(P.CAST).length - 1, 'the film meets everyone ' + JSON.stringify(A.E('FILM_CAST')));
  ok(A.E('FILM_CUES').filter(c => c[1] === 'pop' && c[0] >= 10 && c[0] < 14).length === 12, 'a pop for every face in the film');
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
    const open = id => { H.E('endRun(); startLesson(' + JSON.stringify(id) + ')'); [...ov().querySelectorAll('.ov-foot button')].find(b => b.textContent === 'Start exercises').click(); };
    const show = type => { const i = H.E('Run.queue.findIndex(e => e.type === ' + JSON.stringify(type) + ')'); ok(i >= 0, 'hint test finds a ' + type); H.E('Run.pos = ' + i + '; nextEx()'); };
    const firstLesson = lv => H.P.COURSE.es.units.flatMap(u => u.lessons).find(l => l.level === lv).id;
    H.E('S.settings.lang = "es"');
    // A1: full hints
    open('es-1-1');
    ok(ov().querySelector('.words-btn'), 'A1 lesson has a Words button');
    ov().querySelector('.words-btn').click();
    ok(hd.querySelectorAll('.sheet .wl-row').length === H.E('Run.lesson.vocab.length'), 'Words sheet lists the lesson words');
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
    for (const lang of ['de', 'es']){
      let total = 0, unknown = 0;
      for (const l of H.P.COURSE[lang].units.flatMap(u => u.lessons)) for (const t of [...l.sentences.map(x => x.t), ...l.blanks.map(b => b.t.replace('___', b.a))]) for (const part of t.split(/\s+/)){
        const c = H.E('coreWord')(part); if (!/\p{L}/u.test(c)) continue; total++; if (!H.E('glossLookup')(c, lang)) unknown++;
      }
      ok(unknown / total < 0.02, lang + ' lesson words without a meaning: ' + unknown + ' of ' + total);
    }
    H.dom.window.close(); bad.dom.window.close();
  }
  /* ---------- 3c. lesson openings: forms tables and the extra-words list ---------- */
  {
    const T3 = await makeDom(); T3.P.S.settings.onboarded = true;
    let withTables = 0, total = 0;
    for (const lang of ['de', 'es']) for (const l of T3.P.COURSE[lang].units.flatMap(u => u.lessons)){
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
    ok(ov().querySelector('.tip .forms table tbody tr'), 'the lesson opening shows a forms table');
    ok(/Also in the sentences/.test(ov().textContent) || T3.E('lessonForms(getLesson("de-1-2")).length') === 0, 'the opening lists extra words');
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
    [...F.w.document.querySelectorAll('.overlay:not(.out) .ov-foot button')].find(b => b.textContent === 'Start exercises').click();
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
    for (const lang of ['de', 'es']) for (const l of Q.P.COURSE[lang].units.flatMap(u => u.lessons)){
      const d = Q.E('formDrills')(l); drills += d.length; if (d.length) lessonsWithDrills++;
      for (const x of d){ const ex = Q.E('formEx')(l, x); ok(ex.mode === 'type' || (ex.options.length === 4 && ex.options.includes(ex.correct) && new Set(ex.options).size === 4), l.id + ' form drill options'); ok(Q.P.evaluate(ex, ex.correct).ok, l.id + ' form drill right answer counts'); }
    }
    ok(lessonsWithDrills >= 40, 'many lessons have form drills: ' + lessonsWithDrills);
    const sein = Q.E('getLesson')('es-1-3'), dr = Q.E('formDrills')(sein);
    if (dr.length){ const ex = Q.E('formEx')(sein, dr[0]); const wrong = ex.options.find(o => o !== ex.correct); const r = Q.P.evaluate(ex, wrong); ok(!r.ok, 'wrong form option never counts'); }
    // a lesson ends with the form drills
    ok(Q.E('buildLesson')(Q.E('getLesson')('es-1-3')).some(e => e.type === 'form'), 'lessons include form drills');
    // mistakes are noted, listed and cleared
    Q.E('S.settings.lang = "es"');
    Q.E('startLesson("es-1-1")'); qfoot('Start exercises').click();
    const ex0 = Q.E('Run.queue.find(e => e.key && e.type !== "match")'); const idx = Q.E('Run.queue.findIndex(e => e.id === ' + ex0.id + ')');
    Q.E('Run.pos = ' + idx + '; nextEx()');
    Q.E('Run.value = "zzz nope"; Run.canCheck = true; doCheck()');
    ok(L().miss[ex0.key] && L().miss[ex0.key].ts > (L().miss[ex0.key].ok || 0), 'a wrong answer is noted');
    ok(Q.E('mistakeEntries("es").some(e => e.key === ' + JSON.stringify(ex0.key) + ')'), 'it is on the mistakes list');
    Q.E('endRun()');
    Q.E('UI.tab = "review"; render()');
    ok([...qd.querySelectorAll('#app button')].some(b => /Fix my mistakes/.test(b.textContent)), 'the Review tab offers Fix my mistakes');
    Q.E('startMistakes()');
    let guard = 0;
    while (Q.E('Run.active && !Run.finished') && guard++ < 60){
      const ex = Q.E('Run.cur'); let ans;
      switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = Q.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = Q.P.tileTokens(ex.item.e[0]).join(' '); break;
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
      switch (ex.type){ case 'type-t2e': case 'type-e2t': case 'speak': ans = ex.accepted[0]; break; case 'bank-e2t': case 'listen': ans = Q.P.tileTokens(ex.item.t).join(' '); break; case 'bank-t2e': ans = Q.P.tileTokens(ex.item.e[0]).join(' '); break;
        case 'match': Q.E('Run.pos++; nextEx()'); continue; default: ans = ex.correct; }
      Q.E('Run.value = ' + JSON.stringify(ans) + '; Run.canCheck = true; doCheck()'); qfoot('Continue').click();
    }
    ok(Q.E('Run.finished') && L().cp[unit.title] && L().cp[unit.title].pass, 'a perfect checkpoint passes and is saved');
    qfoot('Continue').click();
    ok(Q.P.S.badges.checkpoint1 && Q.P.S.badges.checkpoint100 && !Q.P.S.badges.checkpoint5, 'a perfect checkpoint earns its badges');
    Q.E('S.stats.fixed = 25; S.stats.formsRight = 50; checkBadges({})');
    ok(Q.P.S.badges.fixer && Q.P.S.badges.forms50, 'fixing mistakes and form questions earn badges');
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
    for (const tab of ['learn', 'stories', 'review', 'talk', 'friends', 'me']){ E('UI.tab=' + JSON.stringify(tab) + '; render()'); ok(w.document.querySelector('#app').children.length > 0, 'tab ' + tab); }
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
  E('startLesson("de-7-1")');
  const word = w.document.querySelector('.overlay:not(.out) .tip .say.gl .w');
  ok(!!word, 'lesson intro has tappable words');
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
  /* ---------- 6b. answers that count explain why, and what differs (fake tutor) ---------- */
  {
    const prompts = [];
    const sample = async () => ({ text: '' });
    sample.json = async (input) => { prompts.push(input); return { correct: true, note: 'Nice.', why: 'Both greet someone and ask how they are.', differences: [{ yours: 'Hey', expected: 'Hallo', note: 'more casual' }, 'junk', { note: 'no words' }] }; };
    const X = await makeDom({ claude: { use: async n => n === 'sample' ? sample : null }, seed: { 'parlance.v2': { settings: { onboarded: true, lang: 'de', seenVersion: '9.0.0' } } } });
    for (let i = 0; i < 40 && !X.E('AI.ready'); i++) await sleep(20);
    const D = X.w.document, foot = () => D.querySelector('.overlay:not(.out) .ov-foot'), q = s => foot().querySelector(s), qa = s => [...foot().querySelectorAll(s)];
    const cont = () => qa('button').find(b => b.textContent === 'Continue').click();
    X.E('startLesson("de-1-1")'); qa('button').find(b => b.textContent === 'Start exercises').click();
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
    ok(q('.fb-report'), 'report link stays for tutor-accepted answers');
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
    ok(M.P.S.v === 8 && M.P.S.social && M.P.S.social.friends && M.P.S.settings.mascot === 'pip', 'schema version ' + M.P.S.v);
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
    ok(G.w.document.querySelector('.hero .pip [data-s="beak"]') && G.w.document.querySelector('.hero .pip [data-s="crest2"]'), 'Pip is a parrot');
    ok(G.E('Rig.validate(PIP).length') === 0, 'Pip rig validates: ' + G.E('Rig.validate(PIP).join("; ")'));
    for (const m of G.E('PIP_MOODS')){
      ok(G.E('!!PIP.moods[' + JSON.stringify(m) + ']'), 'the rig has the mood ' + m);
      const s = G.E('pipSVG(' + JSON.stringify(m) + ')'); ok(s.includes('data-s="wingL"') && !/NaN|undefined/.test(s), 'pip mood ' + m);
    }
    { const el = G.E('(() => { const e = pip("oops", 60); document.body.append(e); setPipMood(e, "cheer"); return e.rig.mood; })()'); ok(el === 'cheer', 'a live Pip changes mood ' + el); }
    { const r = G.E('(() => { pipTaps = 0; const e = pip("happy", 60, { lang: "de" }); document.body.append(e); e.click(); const hop = e.rig.playing("hop"); e.click(); return [hop, e.rig.mood, e.rig.home]; })()');
      ok(r[0] && r[1] === 'wave' && r[2] === 'happy', 'tapping Pip takes turns: a hop, then a wave ' + JSON.stringify(r)); }
    { const r = G.E('(() => { const e = pip("sleep", 60, { lang: "de" }); document.body.append(e); e.click(); return e.rig.mood; })()'); ok(r === 'wow', 'a sleeping Pip wakes with a start when tapped: ' + r); }
    { const r = G.E('(() => { const e = pip("dance", 60, { tap: false, moveFor: 1 }); document.body.append(e); return e.rig.playing("dance"); })()'); await sleep(40);
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
    B.E('openFilm({ autoplay: false }); filmSeek(6)');
    ok(B.w.document.querySelector('.film-cap').textContent === 'Meet Kiwi, a budgie who loves to repeat after you.' && B.w.document.querySelector('#f-pip-in .rig-kiwi'), 'the film stars your bird: ' + B.w.document.querySelector('.film-cap').textContent);
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
    for (const lang of ['de', 'es']){
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
    for (const lang of ['de', 'es']){
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
