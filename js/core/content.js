"use strict";
/* ===================== CONTENT =====================
   All learning content flows through this file.

   1. Built-in content lives in /content/*.js and is registered with the helpers below:
        COURSE_SRC.de.push(U(title, level, [L(id, title, T(...), vocab, sentences, blanks), ...]))
        STORIES.push(ST(id, level, title, english, scene, items))
   2. Remote content packs (written to the shared database under content/<packId>) are validated
      and merged in at runtime by assembleCourse(), so new lessons and stories reach every learner
      without republishing the app. See docs/ARCHITECTURE.md for the pack format.

   Progress never depends on array positions: lessons are keyed by id, and review cards by
   lessonId|kind|~<normalized text> (itemKey), so content can be reordered, extended or patched safely.
   ===================================================== */

/* ----- compact authoring helpers (used by /content files and by packs) ----- */
function U(title, level, lessons, art){ return { title, level, lessons, art: art || null }; }
/* a tip can carry forms tables: tables = [[caption, ['column', …] or null, [['cell', …], …]], …] (conjugations, articles, endings) */
function T(title, body, ex, tables){ return { title, body, examples: (ex || []).map(([t, e]) => ({ t, e })), tables: (tables || []).map(([cap, head, rows]) => ({ cap, head: head || null, rows })) }; }
function L(id, title, tip, vocab, sents, blanks){
  return {
    id, title, tip,
    vocab: vocab.map(([t, e, g]) => { const ts = String(t).split('|'); return { t: ts[0], alt: ts.slice(1), e: String(e).split('|'), g: g || null }; }),
    sentences: sents.map(([t, e]) => { const ts = String(t).split('|'); return { t: ts[0], alt: ts.slice(1), e: String(e).split('|') }; }),
    blanks: blanks.map(([t, o, e]) => { const os = String(o).split('|'); return { t, a: os[0], o: os, e }; })
  };
}
function ST(id, level, title, en, scene, items){
  const lang = id.slice(0, 2);
  const its = items.map(x => x[0] === '?' ? { q: x[1], o: String(x[2]).split('|') } : { who: x[0], t: x[1], e: x[2] });
  return { id, lang, level, title, en, scene, items: its, cast: [...new Set(its.filter(x => x.who).map(x => x.who))] };
}
const COURSE_SRC = Object.fromEntries(LANG_IDS.map(l => [l, []]));
const STORIES = [];

/* ----- assembled course (built-in + remote packs) ----- */
const COURSE = Object.fromEntries(LANG_IDS.map(l => [l, { units: [] }]));
const CORE = new Map();
const CORE_IDX = Object.fromEntries(LANG_IDS.map(l => [l, new Map()]));
let STORY_MAP = new Map();
let PACK_STORIES = [];
const Packs = { list: [], errors: [], aliases: new Map(), version: 0 };

function assembleCourse(){
  CORE.clear();
  const usedIds = new Set();
  for (const lang of LANG_IDS){
    CORE_IDX[lang].clear();
    let units = COURSE_SRC[lang].map(u => ({ title: u.title, level: u.level, art: u.art, lessons: u.lessons.slice(), pack: null }));
    const builtinIds = new Set(units.flatMap(u => u.lessons.map(l => l.id)));
    for (const p of Packs.list){
      if (p.lang !== lang || p.enabled === false) continue;
      for (const patch of p.lessons){ // same id replaces the built-in lesson; progress is keyed by id, so it carries over
        for (const u of units){ const i = u.lessons.findIndex(l => l.id === patch.id); if (i >= 0) u.lessons[i] = patch; }
      }
      for (const u of p.units){
        const lessons = u.lessons.filter(l => !builtinIds.has(l.id) && !usedIds.has(l.id));
        lessons.forEach(l => usedIds.add(l.id));
        if (lessons.length) units.push({ title: u.title, level: u.level, art: u.art || null, lessons, pack: p.id });
      }
    }
    units = units.map((u, i) => ({ u, i })).sort((a, b) => (LEVELS.indexOf(a.u.level) - LEVELS.indexOf(b.u.level)) || (a.i - b.i)).map(x => x.u);
    COURSE[lang].units = units;
    units.forEach((u, ui) => u.lessons.forEach((l, li) => { Object.assign(l, { lang, level: u.level, unit: ui, idx: li, core: true }); CORE.set(l.id, l); }));
    coreOrder(lang).forEach((l, i) => CORE_IDX[lang].set(l.id, i));
  }
  PACK_STORIES = Packs.list.filter(p => p.enabled !== false).flatMap(p => p.stories).filter(s => !STORIES.some(b => b.id === s.id));
  STORY_MAP = new Map(allStories().map(s => [s.id, s]));
  Packs.aliases = new Map(Packs.list.flatMap(p => Object.entries(p.aliases || {})));
  KEYCACHE = new WeakMap();
}
function allStories(){ return STORIES.concat(PACK_STORIES); }
function storyById(id){ return STORY_MAP.get(id) || null; }
function unitArt(u){ return u.art && UNIT_ART[u.art] ? u.art : u.title; }

function coreOrder(lang){ return COURSE[lang].units.flatMap(u => u.lessons); }
function genLessons(lang){ return (S.gen[lang] || []).map(l => { l.lang = lang; l.core = false; return l; }); }
/* the words a lesson's sentences and blanks use that nothing earlier in the route has shown yet (forms of verbs, endings, extra words),
   each with its meaning, so the lesson opening can say what to expect */
const FORMS = { ver: -1, by: {} };
function lessonForms(l){
  if (!l.core) return [];
  if (FORMS.ver !== Packs.version){ FORMS.ver = Packs.version; FORMS.by = {}; }
  const lang = l.lang;
  if (!FORMS.by[lang]){
    const seen = new Set(), out = {};
    // a capital mid-sentence is a name (or, in German, a noun we know) – names get no meaning of their own
    const keys = (text) => String(text).split(/\s+/).map(p => ({ p, c: coreWord(p) })).filter(x => /\p{L}/u.test(x.c))
      .map((x, i) => ({ w: lang !== 'de' && i === 0 ? x.c[0].toLowerCase() + x.c.slice(1) : x.c, k: fold(norm(x.c, lang)), name: i > 0 && x.c[0] !== x.c[0].toLowerCase() && !(lang === 'de' && NOUNS.has(x.c)) }));
    for (const les of coreOrder(lang)){
      for (const v of les.vocab) for (const t of [v.t, ...v.alt]) keys(t).forEach(x => seen.add(x.k));
      const here = [];
      for (const t of [...les.sentences.map(s => s.t), ...les.blanks.map(b => blankSaid(b))]) for (const x of keys(t)){
        if (seen.has(x.k)) continue;
        seen.add(x.k);
        if (x.name) continue;
        const g = glossLookup(x.w, lang);
        if (g && fold(norm(g.val, lang)) !== x.k) here.push({ w: x.w, val: g.val, base: g.base || '' });
      }
      out[les.id] = here;
    }
    FORMS.by[lang] = out;
  }
  return FORMS.by[lang][l.id] || [];
}
/* a lesson's tip cut into small bites that arrive between the exercises instead of one wall of text up front.
   The body is split at sentence ends into 1–3 bites; each example and table goes with the bite that talks about it (otherwise the last one) */
function tipBites(tip){
  if (!tip || !tip.body) return [];
  const plain = s => String(s).replace(/\*\*/g, '').toLowerCase();
  const sents = String(tip.body).split(/(?<=[.!?)])\s+(?=[A-ZÄÖÜÁÉÍÓÚÑ¿¡*])/).map(x => x.trim()).filter(Boolean);
  const n = Math.max(1, Math.min(3, sents.length, Math.round(String(tip.body).length / 200)));
  const total = sents.reduce((a, x) => a + x.length, 0), bites = [];
  let cur = [], len = 0;
  for (const x of sents){
    cur.push(x); len += x.length;
    if (bites.length < n - 1 && len >= total / n * (bites.length + 1)){ bites.push({ body: cur.join(' '), examples: [], tables: [] }); cur = []; }
  }
  if (cur.length) bites.push({ body: cur.join(' '), examples: [], tables: [] });
  const bolds = b => [...b.body.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].toLowerCase());
  const home = key => {
    let best = -1, at = bites.length - 1;
    bites.forEach((b, i) => { const hit = bolds(b).filter(w => w.length > 2 && key.includes(w)).length; if (hit > best && hit > 0){ best = hit; at = i; } });
    return bites[at];
  };
  for (const e of tip.examples || []) home(plain(e.t)).examples.push(e);
  for (const t of tip.tables || []) home(plain(t.cap)).tables.push(t);
  return bites.map((b, i) => ({ ...b, title: tip.title, i, of: bites.length }));
}
function allLessons(lang){ return coreOrder(lang).concat(genLessons(lang)); }
const CUSTOM_CACHE = new Map();
function customLesson(id){
  const m = new RegExp('^c-(' + LANG_IDS.join('|') + ')-').exec(id); if (!m) return null;
  const lang = m[1]; const c = (S.langs[lang].custom || {})[id]; if (!c) return null;
  const sig = JSON.stringify(c);
  const hit = CUSTOM_CACHE.get(id); if (hit && hit.sig === sig) return hit.lesson;
  const lesson = { id, lang, core: false, custom: true, title: 'Saved by you', level: c.level || 'B1', tip: { title: '', body: '', examples: [] }, vocab: [], sentences: [{ t: c.t, alt: c.alt || [], e: c.e }], blanks: [] };
  CUSTOM_CACHE.set(id, { sig, lesson });
  return lesson;
}
function getLesson(id){
  if (CORE.has(id)) return CORE.get(id);
  if (id.startsWith('c-')) return customLesson(id);
  for (const lang of LANG_IDS){ const g = (S.gen[lang] || []).find(x => x.id === id); if (g){ g.lang = lang; g.core = false; return g; } }
  return null;
}

/* ----- stable review-card keys ----- */
let KEYCACHE = new WeakMap();
function itemSlug(item, lang){ return (norm(item.t, lang).replace(/ /g, '_') || 'x').slice(0, 90); }
function lessonKeys(lesson){
  let k = KEYCACHE.get(lesson);
  if (!k){ k = { v: new Map(), s: new Map() }; lesson.vocab.forEach((it, i) => k.v.set(itemSlug(it, lesson.lang), i)); lesson.sentences.forEach((it, i) => k.s.set(itemSlug(it, lesson.lang), i)); KEYCACHE.set(lesson, k); }
  return k;
}
function itemKey(lesson, kind, i){
  if (lesson.custom) return lesson.id + '|' + kind + '|' + i;
  const it = kind === 'v' ? lesson.vocab[i] : lesson.sentences[i];
  return lesson.id + '|' + kind + '|~' + itemSlug(it, lesson.lang);
}
function resolveKey(key, depth){
  const parts = key.split('|'); if (parts.length < 3) return null;
  const lid = parts[0], kind = parts[1], ref = parts.slice(2).join('|');
  const lesson = getLesson(lid);
  let i = null;
  if (lesson){
    if (ref[0] === '~') { const m = lessonKeys(lesson)[kind === 'v' ? 'v' : 's'].get(ref.slice(1)); if (m != null) i = m; }
    else if (/^\d+$/.test(ref)) i = +ref;
  }
  if (i == null){ const a = Packs.aliases.get(key); return a && !depth ? resolveKey(a, 1) : null; }
  const item = kind === 'v' ? lesson.vocab[i] : lesson.sentences[i];
  return item ? { lesson, kind, i, item, key } : null;
}
/* Old saves used lessonId|kind|<index>. Rewrite them to stable keys (idempotent). */
function migrateCardKeys(cards){
  let out = null;
  for (const [k, c] of Object.entries(cards)){
    const p = k.split('|');
    if (p.length !== 3 || !/^\d+$/.test(p[2]) || k.startsWith('c-')) continue;
    const lesson = CORE.get(p[0]); if (!lesson) continue;
    const item = p[1] === 'v' ? lesson.vocab[+p[2]] : lesson.sentences[+p[2]]; if (!item) continue;
    const nk = itemKey(lesson, p[1], +p[2]);
    out = out || { ...cards };
    delete out[k];
    if (!out[nk] || cardNewer(c, out[nk])) out[nk] = c;
  }
  return out || cards;
}

/* ----- remote pack validation (packs come from the database, so nothing is trusted) ----- */
function packStr(x, max){ return typeof x === 'string' ? x.trim().slice(0, max || 400) : ''; }
function packTables(a){
  const cells = (r, n) => r.slice(0, 6).map(x => packStr(x, n));
  return (Array.isArray(a) ? a : []).slice(0, 4).map(t => Array.isArray(t) && Array.isArray(t[2]) ? [packStr(t[0], 80), Array.isArray(t[1]) ? cells(t[1], 40) : null, t[2].slice(0, 14).filter(Array.isArray).map(r => cells(r, 60))] : null).filter(t => t && t[2].length);
}
function validPackLesson(o, lang, errs){
  const where = 'lesson ' + (o && o.id);
  try {
    if (!o || typeof o.id !== 'string' || !new RegExp('^' + lang + '-[A-Za-z0-9_-]{1,40}$').test(o.id)) throw where + ': id must look like ' + lang + '-something';
    const tip = o.tip || {};
    const l = L(o.id, packStr(o.title, 60), T(packStr(tip.title, 80), packStr(tip.body, 900), (tip.examples || []).filter(e => Array.isArray(e) && e[0]).slice(0, 4), packTables(tip.tables)),
      (o.vocab || []).filter(v => Array.isArray(v) && v[0] && v[1]), (o.sentences || []).filter(v => Array.isArray(v) && v[0] && v[1]), (o.blanks || []).filter(v => Array.isArray(v) && v[0] && v[1]));
    if (!l.title) throw where + ': missing title';
    if (l.vocab.length < 4) throw where + ': needs at least 4 vocab items';
    if (l.sentences.length < 3) throw where + ': needs at least 3 sentences';
    if (l.blanks.some(b => b.t.split('___').length !== 2 || b.o.length < 2 || new Set(b.o).size !== b.o.length)) throw where + ': each blank needs one ___ and 2+ distinct options';
    if (new Set(l.vocab.map(v => itemSlug(v, lang))).size !== l.vocab.length) throw where + ': duplicate vocab';
    l.vocab.forEach(v => { if (v.g && !['m', 'f', 'n', 'pl'].includes(v.g)) v.g = null; });
    return l;
  } catch (e){ errs.push(String(e)); return null; }
}
function validPackStory(o, lang, errs){
  try {
    if (!o || typeof o.id !== 'string' || !o.id.startsWith(lang + '-')) throw 'story ' + (o && o.id) + ': bad id';
    if (!LEVELS.includes(o.level)) throw 'story ' + o.id + ': bad level';
    const st = ST(o.id, o.level, packStr(o.title, 80), packStr(o.en, 80), SCENES[o.scene] ? o.scene : 'cafe', (o.items || []).filter(x => Array.isArray(x) && x.length >= 3));
    if (st.items.length < 4) throw 'story ' + o.id + ': too short';
    for (const it of st.items){
      if (it.q){ if (it.o.length < 2) throw 'story ' + o.id + ': question needs options'; }
      else if (!CAST[it.who] || (CAST[it.who].lang !== lang && it.who !== 'pip')) throw 'story ' + o.id + ': unknown speaker ' + it.who;
    }
    return st;
  } catch (e){ errs.push(String(e)); return null; }
}
function validatePack(id, d){
  const errs = [];
  if (!d || d.kind !== 'pack' || !LANG_IDS.includes(d.lang)) return { pack: null, errs: ['not a pack'] };
  if (d.minApp && cmpVersion(d.minApp, APP_VERSION) > 0) return { pack: null, errs: ['needs app ' + d.minApp] };
  const lang = d.lang;
  const units = (Array.isArray(d.units) ? d.units : []).map(u => ({
    title: packStr(u && u.title, 60) || 'Bonus lessons', level: LEVELS.includes(u && u.level) ? u.level : 'B1', art: packStr(u && u.art, 40) || null,
    lessons: (Array.isArray(u && u.lessons) ? u.lessons : []).map(l => validPackLesson(l, lang, errs)).filter(Boolean)
  })).filter(u => u.lessons.length);
  const lessons = (Array.isArray(d.lessons) ? d.lessons : []).map(l => validPackLesson(l, lang, errs)).filter(Boolean);
  const stories = (Array.isArray(d.stories) ? d.stories : []).map(s => validPackStory(s, lang, errs)).filter(Boolean);
  const aliases = {}; for (const [k, v] of Object.entries(d.aliases && typeof d.aliases === 'object' ? d.aliases : {})) if (typeof v === 'string') aliases[k] = v;
  return { pack: { id, lang, title: packStr(d.title, 80) || id, enabled: d.enabled !== false, units, lessons, stories, aliases, updatedAt: +d.updatedAt || 0 }, errs };
}
function cmpVersion(a, b){ const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++){ const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; }
