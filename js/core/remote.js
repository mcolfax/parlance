"use strict";
/* ===================== LIVE UPDATES =====================
   Owner-written documents in the shared database change the app for everyone, with no republish:
     content/<packId>   { kind: 'pack', lang, units, lessons, stories, aliases, enabled }   → new or patched content
     content/config     { kind: 'config', latest: '4.1.0', announce: { id, title, body } } → update banner, announcements
   The latest content is cached in this browser so it is there instantly on the next visit.
   Database rules (declared at publish): content is readable by everyone, writable only by the owner.
   ======================================================== */
const Live = { db: null, user: null, owner: false, config: {}, sig: '', unsub: null, started: false };
const CONTENT_CACHE = 'parlance.content';

function setPacksFromDocs(docs){
  const packs = [], errors = []; let config = {};
  for (const d of docs || []){
    if (!d || typeof d !== 'object') continue;
    if (d.id === 'config' || d.kind === 'config'){ config = d; continue; }
    if (d.kind !== 'pack') continue;
    const r = validatePack(d.id, d);
    if (r.pack) packs.push(r.pack);
    r.errs.forEach(e => errors.push(d.id + ': ' + e));
  }
  Packs.list = packs; Packs.errors = errors; Packs.version++;
  Live.config = config;
}
/* At boot (before state loads): use whatever content this browser saw last time. */
function loadCachedContent(){ const docs = readJSON(CONTENT_CACHE); if (Array.isArray(docs)){ setPacksFromDocs(docs); Live.sig = hashStr(JSON.stringify(docs)) + ''; } }
function applyContentDocs(docs){
  const sig = hashStr(JSON.stringify(docs)) + '';
  if (sig === Live.sig){ afterLiveConfig(); return; }
  Live.sig = sig;
  setPacksFromDocs(docs);
  writeJSON(CONTENT_CACHE, docs);
  assembleCourse(); reindex();
  if (!busy()) render();
  afterLiveConfig();
}
function startLive(db, user){
  if (Live.started) return; Live.started = true;
  Live.db = db; Live.user = user;
  try {
    Live.unsub = db.collection('content').onSnapshot(
      snap => applyContentDocs(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {});
  } catch (e) {}
  if (user && user.isOwner) user.isOwner().then(o => { Live.owner = !!o; if (o && !busy()) render(); }).catch(() => {});
  flushOutbox();
}
function afterLiveConfig(){ checkUpdateBanner(); maybeAnnounce(); }

/* "A new version is ready": set content/config.latest after publishing (Studio has a button for it). */
function checkUpdateBanner(){
  const latest = Live.config && Live.config.latest;
  const show = typeof latest === 'string' && cmpVersion(latest, APP_VERSION) > 0;
  let b = document.getElementById('update-banner');
  if (show && !b){
    b = h('div', { id: 'update-banner', class: 'update-banner', role: 'status' },
      pip('wow', 34, { tap: false }), h('span', { class: 'grow' }, h('b', null, 'Parlance ' + latest + ' is here. '), 'Refresh to get it; your progress stays.'),
      h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => { saveLocal(); syncNow(); setTimeout(() => { try { location.reload(); } catch (e) { toast('Close and reopen Parlance to update.'); } }, 350); } }, 'Refresh'));
    document.body.append(b);
  } else if (!show && b) b.remove();
}
function maybeAnnounce(){
  const a = Live.config && Live.config.announce;
  if (!a || typeof a !== 'object' || !a.id || !a.title || !S.settings.onboarded || busy() || document.querySelector('.sheet-back')) return;
  if (S.settings.seenAnnounce === a.id) return;
  S.settings.seenAnnounce = a.id; touchSettings();
  sfx('quest');
  sheet(String(a.title).slice(0, 80), h('div', { class: 'announce' }, pip('cheer', 64, { tap: false }), h('p', null, String(a.body || '').slice(0, 700))), [{ label: 'Got it', primary: true }]);
}

/* ----- what's new (once per app version, for people who were already learning) ----- */
function maybeWhatsNew(){
  if (!S.settings.onboarded || busy() || document.querySelector('.sheet-back')) return false;
  const seen = S.settings.seenVersion || '';
  if (seen && cmpVersion(seen, APP_VERSION) >= 0) return false;
  S.settings.seenVersion = APP_VERSION; touchSettings();
  showWhatsNew(seen);
  return true;
}
function showWhatsNew(since){
  const list = RELEASES.filter(r => !since || cmpVersion(r.v, since) > 0).slice(0, 2);
  const rel = list.length ? list : RELEASES.slice(0, 1);
  sfx('badge');
  sheet('What’s new in Parlance', h('div', { class: 'whatsnew' },
    pip('dance', 76, { tap: false, cls: 'wn-pip', moveFor: 2400 }),
    rel.map(r => h('div', { class: 'wn-rel' }, h('span', { class: 'eyebrow' }, 'Version ' + r.v), h('h4', null, r.title), h('ul', null, r.notes.map(n => h('li', null, n)))))),
    [{ label: 'Watch the intro film', run: () => { openFilm(); } }, { label: 'Let’s go', primary: true }]);
}

/* ----- owner: share a tutor-written lesson with every learner (becomes part of content/bonus-<lang>) ----- */
function lessonToPack(l){
  return { id: l.id, title: l.title,
    tip: { title: l.tip.title, body: l.tip.body, examples: (l.tip.examples || []).map(x => [x.t, x.e]), tables: (l.tip.tables || []).map(t => [t.cap, t.head, t.rows]) },
    vocab: l.vocab.map(v => [[v.t, ...(v.alt || [])].join('|'), v.e.join('|'), v.g || '']),
    sentences: l.sentences.map(s => [[s.t, ...(s.alt || [])].join('|'), s.e.join('|')]),
    blanks: l.blanks.map(b => [b.t, b.o.join('|'), b.e || '']) };
}
async function shareLessonToAll(l){
  if (!Live.owner || !Live.db) return false;
  const lang = l.lang, id = 'bonus-' + lang, ref = Live.db.doc('content/' + id);
  let d = null;
  try { const snap = await ref.get(); if (snap.exists) d = JSON.parse(JSON.stringify(snap.data())); } catch (e) {}
  d = d || { kind: 'pack', lang, title: LANGS[lang].name + ' bonus lessons', units: [], lessons: [], stories: [] };
  d.units = Array.isArray(d.units) ? d.units : [];
  let unit = d.units.find(u => u.level === l.level && u.title === 'Bonus lessons');
  if (!unit){ unit = { title: 'Bonus lessons', level: l.level, art: 'Idioms & nuance', lessons: [] }; d.units.push(unit); }
  unit.lessons = (unit.lessons || []).filter(x => x.id !== l.id).concat([lessonToPack(l)]);
  d.updatedAt = Date.now(); d.enabled = true;
  const check = validatePack(id, d);
  if (!check.pack || check.errs.some(e => e.includes(l.id))){ toast('That lesson didn’t pass the content checks, so it wasn’t shared.'); return false; }
  await ref.set(d);
  S.gen[lang] = S.gen[lang].filter(x => x.id !== l.id); touch('gen-' + lang);   // same id, so your progress carries over
  return true;
}
