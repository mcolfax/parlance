"use strict";
/* ===================== STATE =====================
   Saved state is versioned (SCHEMA_VERSION in config.js). Rules that keep progress safe across updates:
   - never rename or reuse lesson / story ids; review cards use stable item keys (content.js)
   - unknown fields are always preserved on load and merge, so an older open tab never drops newer data
   - shape changes get a step in MIGRATIONS below; steps must be idempotent
   ================================================== */
const LS_KEY = 'parlance.v2';            // keep this key: changing it would orphan everyone's local progress
const SLICES = ['core', 'de', 'es', 'gen-de', 'gen-es', 'social'];
function newLang(){ return { done: {}, cards: {}, xp: 0, custom: {}, stories: {}, start: 'A1', startTs: 0 }; }
/* Friends (js/core/social.js), kept private and synced like the rest of your progress:
   on/name/bird: your friends card; secret/since/home: the hidden part of your card's path and invite code;
   friends: { uid: { code, cAt, at, gone } }; duels: { id: duel }; past: { id: finished duel }; cheers: { uid: day you cheered them };
   seen: { uid: day of their latest cheer you've seen } */
function newSocial(){ return { on: false, secret: '', since: 0, home: '', name: '', bird: 'pip', friends: {}, duels: {}, past: {}, cheers: {}, seen: {}, ts: 0 }; }
function defaultSettings(){ return { lang: 'de', goal: 20, speaking: true, aiGrade: true, autoplay: true, sfx: true, sfxVol: 0.8, homeMusic: true, musicVol: 0.6, speed: 'normal', voices: {}, mascot: 'pip', onboarded: false, seenVersion: '', seenAnnounce: '', filmSeen: false, ts: 0 }; }
function defaultState(){ return { v: SCHEMA_VERSION, owner: null, settings: defaultSettings(), days: {}, badges: {}, stats: {}, langs: { de: newLang(), es: newLang() }, gen: { de: [], es: [] }, social: newSocial() }; }
function validLesson(l){ return l && typeof l.id === 'string' && typeof l.title === 'string' && Array.isArray(l.vocab) && Array.isArray(l.sentences) && Array.isArray(l.blanks); }
function cleanLang(x){
  const o = { ...newLang(), ...(x && typeof x === 'object' ? x : {}) };
  for (const k of ['done', 'cards', 'custom', 'stories']) if (!o[k] || typeof o[k] !== 'object') o[k] = {};
  if (!LEVELS.includes(o.start)) o.start = 'A1';
  o.xp = +o.xp || 0;
  o.cards = migrateCardKeys(o.cards);
  return o;
}
function cleanSettings(x){
  const s = { ...defaultSettings(), ...(x && typeof x === 'object' ? x : {}), voices: { ...((x && x.voices) || {}) } };
  if (!['de', 'es'].includes(s.lang)) s.lang = 'de';
  if (![10, 20, 30].includes(s.goal)) s.goal = 20;
  if (!['normal', 'relaxed'].includes(s.speed)) s.speed = 'normal';
  s.sfxVol = Math.max(0, Math.min(1, isFinite(+s.sfxVol) ? +s.sfxVol : 0.8));
  s.musicVol = Math.max(0, Math.min(1, isFinite(+s.musicVol) ? +s.musicVol : 0.6));
  s.homeMusic = s.homeMusic !== false;
  if (typeof s.mascot !== 'string' || !s.mascot) s.mascot = 'pip';   // a bird this version doesn't know is kept, and drawn as Pip
  return s;
}
function cleanSocial(x){
  const o = { ...newSocial(), ...obj(x) };
  for (const k of ['friends', 'duels', 'past', 'cheers', 'seen']) o[k] = { ...obj(o[k]) };
  o.on = !!o.on; o.since = +o.since || 0; o.ts = +o.ts || 0;
  if (typeof o.secret !== 'string' || !/^[A-Za-z0-9]{16,40}$/.test(o.secret)){ o.secret = ''; o.since = 0; }
  if (!['c', 'w'].includes(o.home)) o.home = '';
  o.name = typeof o.name === 'string' ? o.name.slice(0, 24) : '';
  if (typeof o.bird !== 'string') o.bird = 'pip';
  return o;
}
/* Ordered, idempotent upgrade steps for saved state. Each runs once when an older save is loaded. */
const MIGRATIONS = [
  { to: 3, run: st => { st.badges = obj(st.badges); st.stats = obj(st.stats); } },
  { to: 4, run: st => { for (const l of ['de', 'es']) if (st.langs[l]) st.langs[l].cards = migrateCardKeys(st.langs[l].cards || {}); } },
  { to: 5, run: st => { st.social = cleanSocial(st.social); } },
  { to: 6, run: st => { st.settings = cleanSettings(st.settings); } }   // the bird you learn with (settings.mascot)
];
function migrate(st){
  const from = +st.v || 1;
  for (const m of MIGRATIONS) if (from < m.to) m.run(st);
  st.v = Math.max(from, SCHEMA_VERSION);
  return st;
}
function hasProgress(st){ return ['de', 'es'].some(l => st.langs[l] && (Object.keys(st.langs[l].done || {}).length || Object.keys(st.langs[l].cards || {}).length || Object.keys(st.langs[l].stories || {}).length)); }
function obj(x){ return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
function mergeState(base, s){
  if (!s || typeof s !== 'object') return base;
  for (const [k, v] of Object.entries(s)) if (!(k in base)) base[k] = v;   // keep fields from newer versions
  base.settings = cleanSettings(s.settings);
  if (s.days && typeof s.days === 'object') base.days = s.days;
  base.badges = { ...obj(s.badges) }; base.stats = { ...obj(s.stats) };
  for (const l of ['de', 'es']){
    if (s.langs && s.langs[l]) base.langs[l] = cleanLang(s.langs[l]);
    if (s.gen && Array.isArray(s.gen[l])) base.gen[l] = s.gen[l].filter(validLesson);
  }
  base.social = cleanSocial(s.social);
  if (typeof s.owner === 'string') base.owner = s.owner;
  if (hasProgress(base)) base.settings.onboarded = true;
  base.v = +s.v || 1;
  return migrate(base);
}
function readJSON(k){ try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function writeJSON(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function loadLocal(){
  let s = readJSON(LS_KEY);
  if (!s){ const v1 = readJSON('parlance.v1'); if (v1) s = v1; }
  return mergeState(defaultState(), s);
}
function saveLocal(){ writeJSON(LS_KEY, S); }
let S = defaultState();   // replaced by loadLocal() in main.js once content is assembled

/* ----- merging (used for sync and restore) ----- */
function mergeDays(a, b){
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})){
    const x = out[k]; if (!x){ out[k] = v; continue; }
    const d = { xp: Math.max(+x.xp || 0, +v.xp || 0), met: !!(x.met || v.met) };
    const q = { ...obj(v.q) }; for (const [qk, qv] of Object.entries(obj(x.q))) q[qk] = Math.max(+qv || 0, +q[qk] || 0);
    if (Object.keys(q).length) d.q = q;
    const qs = Array.isArray(x.qs) ? x.qs : Array.isArray(v.qs) ? v.qs : null; if (qs) d.qs = qs;
    if (x.chest || v.chest) d.chest = true;
    out[k] = d;
  }
  return out;
}
function mergeBadges(a, b){ const out = { ...obj(a) }; for (const [k, v] of Object.entries(obj(b))) if (!out[k] || (v && v < out[k])) out[k] = v; return out; }
function mergeStats(a, b){ const out = { ...obj(a) }; for (const [k, v] of Object.entries(obj(b))) out[k] = Math.max(+out[k] || 0, +v || 0); return out; }
function cardNewer(a, b){ if ((a.ts || 0) !== (b.ts || 0)) return (a.ts || 0) > (b.ts || 0); if ((a.last || '') !== (b.last || '')) return (a.last || '') > (b.last || ''); return (a.n || 0) >= (b.n || 0); }
function mergeLang(a, b){
  a = cleanLang(a); b = cleanLang(b);
  const out = { ...b, ...cleanLang(a) };   // unknown fields from either side survive
  out.xp = Math.max(a.xp, b.xp);
  out.done = { ...a.done };
  for (const [id, d] of Object.entries(b.done)){ const x = out.done[id]; out.done[id] = !x ? d : { at: (x.at || '') > (d.at || '') ? x.at : d.at, acc: Math.max(x.acc || 0, d.acc || 0), times: Math.max(x.times || 0, d.times || 0) }; }
  out.cards = { ...a.cards };
  for (const [k, c] of Object.entries(b.cards)){ const x = out.cards[k]; if (!x || !cardNewer(x, c)) out.cards[k] = c; }
  out.custom = { ...b.custom, ...a.custom };
  out.stories = { ...a.stories };
  for (const [id, d] of Object.entries(b.stories)){ const x = out.stories[id]; out.stories[id] = !x ? d : { at: (x.at || '') > (d.at || '') ? x.at : d.at, score: Math.max(x.score || 0, d.score || 0), times: Math.max(x.times || 0, d.times || 0) }; }
  if ((b.startTs || 0) > (a.startTs || 0)){ out.start = b.start; out.startTs = b.startTs; }
  return out;
}
function mergeGen(a, b){ const map = new Map(); for (const l of [...(b || []), ...(a || [])]) if (validLesson(l)) map.set(l.id, l); return [...map.values()].sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0)); }
function mergeFriend(a, b){ const c = (+a.cAt || 0) >= (+b.cAt || 0) ? a : b; return { ...b, ...a, code: c.code, cAt: +c.cAt || 0, at: Math.max(+a.at || 0, +b.at || 0), gone: Math.max(+a.gone || 0, +b.gone || 0) }; }
function mergeSocial(a, b){
  a = cleanSocial(a); b = cleanSocial(b);
  const out = { ...b, ...a };   // unknown fields from either side survive
  const p = a.ts >= b.ts ? a : b; out.on = p.on; out.name = p.name; out.bird = p.bird; out.ts = Math.max(a.ts, b.ts);
  const k = a.since >= b.since ? a : b; out.secret = k.secret; out.since = k.since; out.home = k.home;   // a changed secret wins
  out.friends = { ...b.friends };
  for (const [id, f] of Object.entries(a.friends)){ if (!f || typeof f !== 'object') continue; const x = out.friends[id]; out.friends[id] = x && typeof x === 'object' ? mergeFriend(f, x) : f; }
  out.duels = { ...b.duels };
  for (const [id, d] of Object.entries(a.duels)){ const x = out.duels[id]; if (!x || (+(d && d.u) || 0) >= (+x.u || 0)) out.duels[id] = d; }
  out.past = { ...b.past, ...a.past };
  for (const f of ['cheers', 'seen']){ out[f] = { ...b[f] }; for (const [id, v] of Object.entries(a[f])) if (!out[f][id] || String(v) > String(out[f][id])) out[f][id] = v; }
  return out;
}
function mergeCore(a, b){
  const sa = cleanSettings(a && a.settings), sb = cleanSettings(b && b.settings);
  const bNewer = (sb.ts || 0) > (sa.ts || 0);
  const settings = bNewer ? { ...sa, ...sb } : { ...sb, ...sa };   // newer wins, keys only one side knows survive
  if (sa.onboarded || sb.onboarded) settings.onboarded = true;
  if (sa.filmSeen || sb.filmSeen) settings.filmSeen = true;
  settings.seenVersion = cmpVersion(sa.seenVersion || '0', sb.seenVersion || '0') >= 0 ? sa.seenVersion : sb.seenVersion;
  return { settings, days: mergeDays(a && a.days, b && b.days), badges: mergeBadges(a && a.badges, b && b.badges), stats: mergeStats(a && a.stats, b && b.stats) };
}
function sliceData(slice){
  if (slice === 'core') return { settings: S.settings, days: S.days, badges: S.badges, stats: S.stats };
  if (slice === 'de' || slice === 'es') return S.langs[slice];
  if (slice === 'social') return S.social;
  return S.gen[slice.slice(4)];
}
function mergeSlice(slice, local, remote){
  if (remote == null) return local;
  if (slice === 'core') return mergeCore(local, remote);
  if (slice === 'de' || slice === 'es') return mergeLang(local, remote);
  if (slice === 'social') return mergeSocial(local, remote);
  return mergeGen(local, remote);
}
function applySlice(slice, data){
  if (slice === 'core'){ S.settings = cleanSettings(data.settings); S.days = data.days || {}; S.badges = obj(data.badges); S.stats = obj(data.stats); }
  else if (slice === 'de' || slice === 'es') S.langs[slice] = cleanLang(data);
  else if (slice === 'social') S.social = cleanSocial(data);
  else S.gen[slice.slice(4)] = (data || []).filter(validLesson);
}
function mergeWhole(a, b){
  const out = defaultState();
  const c = mergeCore({ settings: a.settings, days: a.days, badges: a.badges, stats: a.stats }, { settings: b.settings, days: b.days, badges: b.badges, stats: b.stats });
  out.settings = c.settings; out.days = c.days; out.badges = c.badges; out.stats = c.stats;
  for (const l of ['de', 'es']){ out.langs[l] = mergeLang(a.langs[l], b.langs[l]); out.gen[l] = mergeGen(a.gen[l], b.gen[l]); }
  // friends live in one home's database: a backup from the other home doesn't bring them along
  const sa = cleanSocial(a.social), sb = cleanSocial(b.social);
  out.social = sa.home && sb.home && sa.home !== sb.home ? sa : mergeSocial(sa, sb);
  out.owner = a.owner || b.owner || null;
  return out;
}

/* ===================== SYNC ===================== */
const Remote = { db: null, uid: null, status: 'local', dirty: new Set(), timer: null, busy: false, readOnly: false, ready: false };
function setSync(st){ Remote.status = st; const el = $('#sync-status'); if (el) el.replaceChildren(...syncLine()); }
function syncLine(){
  const st = Remote.status, web = typeof Web !== 'undefined' && Web.on;
  const map = {
    checking: ['cloud', 'Checking your account…'],
    synced: ['cloud', 'Synced to your ' + (web ? 'Parlance' : 'Claude') + ' account. Progress follows you to any device.'],
    saving: ['cloud', 'Saving to your account…'],
    device: ['device', 'Saved in this browser. This shared page can’t store progress in your Claude account, so copy a backup code before switching devices.'],
    local: ['device', 'Saved in this browser. Sign in' + (web ? '' : ' to Claude') + ' to sync across devices, or keep a backup code.'],
    error: ['device', 'Couldn’t reach your account just now. Progress is safe in this browser and will sync when it can.']
  };
  const [i, t] = map[st] || map.local;
  return [ic(i), h('span', null, t)];
}
function touch(...slices){
  for (const s of slices){ if (s === 'core') S.settings.ts = S.settings.ts || 0; Remote.dirty.add(s); }
  saveLocal();
  clearTimeout(Remote.timer); Remote.timer = setTimeout(() => syncNow(), 1200);
  if (typeof socialTouch === 'function') socialTouch();   // keeps your friends card current (social.js)
}
function touchSettings(){ S.settings.ts = Date.now(); touch('core'); }
function ref(slice){ return Remote.db.doc('data/users/' + Remote.uid + '/' + slice); }
async function syncNow(full){
  if (!Remote.db || Remote.readOnly) return;
  if (Remote.busy){ Remote.again = true; return; }
  Remote.busy = true;
  const slices = full ? SLICES.slice() : [...Remote.dirty];
  Remote.dirty.clear();
  let changedLocal = false;
  try {
    if (slices.length) setSync('saving');
    for (const slice of slices){
      let remote = null, snapOk = true;
      try { const snap = await ref(slice).get(); if (snap.exists){ const d = snap.data(); try { remote = JSON.parse(d.blob); } catch (e) { remote = null; } } }
      catch (e) { snapOk = false; if (e && e.code === 'revoked'){ Remote.db = null; break; } }
      if (!snapOk){ Remote.dirty.add(slice); setSync('error'); continue; }
      const local = sliceData(slice);
      const merged = mergeSlice(slice, local, remote);
      if (!same(merged, local)){ applySlice(slice, merged); changedLocal = true; }
      if (remote == null ? hasData(slice, merged) : !same(merged, remote)){
        const blob = JSON.stringify(merged);
        if (blob.length > 240000){ continue; }
        try { await ref(slice).set({ blob, updatedAt: Date.now() }); }
        catch (e){
          if (e && e.code === 'invalid_argument'){ Remote.readOnly = true; setSync('device'); break; }
          if (e && e.code === 'unavailable'){ Remote.dirty.add(slice); }
          else if (e && (e.code === 'revoked' || e.code === 'not_granted')){ Remote.db = null; setSync('local'); break; }
          else Remote.dirty.add(slice);
          setSync('error'); continue;
        }
      }
    }
    if (!Remote.readOnly && Remote.db && !Remote.dirty.size) setSync('synced');
  } finally {
    Remote.busy = false;
    if (changedLocal){
      saveLocal(); reindex();
      if (typeof socialAfterSync === 'function') socialAfterSync();
      if (Onb.open && !Onb.replay && S.settings.onboarded){ Onb.open = false; closeOverlay(); UI.animate = true; render(); toast('Welcome back. Your progress is synced.'); }
      else if (!busy()) render();
    }
    if (Remote.again){ Remote.again = false; setTimeout(() => syncNow(), 400); }
    else if (Remote.dirty.size && Remote.status === 'error'){ clearTimeout(Remote.timer); Remote.timer = setTimeout(() => syncNow(), 8000); }
  }
}
function hasData(slice, d){
  if (slice === 'core') return true;
  if (slice === 'de' || slice === 'es') return !!(Object.keys(d.done || {}).length || Object.keys(d.cards || {}).length || Object.keys(d.stories || {}).length || d.xp);
  if (slice === 'social') return !!(d && (d.secret || d.on || Object.keys(d.friends || {}).length));
  return Array.isArray(d) && d.length > 0;
}
async function initRemote(){
  if (!window.claude || typeof window.claude.use !== 'function'){ Remote.ready = true; return; }
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    Remote.user = user;
    if (user) loadProfile(user);
    if (db) startLive(db, user);
    if (!db || !user){ Remote.ready = true; return; }
    const uid = await user.id();
    if (!uid){ Remote.ready = true; return; }
    adoptIdentity(uid);
    Remote.db = db; Remote.uid = uid; setSync('checking');
    await syncNow(true);
    flushOutbox();
    Remote.ready = true;
    if (typeof socialStart === 'function') socialStart();
  } catch (e) { setSync('error'); }
  Remote.ready = true;
}
function adoptIdentity(uid){
  if (S.owner && S.owner !== uid){
    writeJSON(LS_KEY + ':' + S.owner, S);
    const mine = readJSON(LS_KEY + ':' + uid);
    S = mergeState(defaultState(), mine);
  }
  S.owner = uid; saveLocal(); reindex();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden'){ saveLocal(); clearTimeout(Remote.timer); syncNow(); }
  else if (Remote.db && !Run.active && !Talk.open && !Story.open) syncNow(true);
});
window.addEventListener('pagehide', () => { saveLocal(); syncNow(); });
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}

/* ----- backup codes ----- */
function utf8Bytes(str){ if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str); const bin = unescape(encodeURIComponent(str)); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
function utf8Text(bytes){ if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return decodeURIComponent(escape(bin)); }
function b64u(bytes){ let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
async function makeBackupCode(){
  const json = JSON.stringify({ app: 'parlance', v: 3, state: { ...S, owner: null } });
  try {
    if (window.CompressionStream){ const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); return 'PRL1.' + b64u(new Uint8Array(buf)); }
  } catch (e) {}
  return 'PRL0.' + b64u(utf8Bytes(json));
}
async function readBackup(text){
  text = String(text || '').trim();
  if (text.startsWith('{')) return JSON.parse(text);
  const dot = text.indexOf('.'); const tag = text.slice(0, dot), data = text.slice(dot + 1).replace(/\s+/g, '');
  const bytes = unb64u(data);
  if (tag === 'PRL1'){ const out = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); return JSON.parse(out); }
  if (tag === 'PRL0') return JSON.parse(utf8Text(bytes));
  throw new Error('bad');
}

