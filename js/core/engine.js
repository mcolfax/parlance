"use strict";
/* ===================== PROGRESS ===================== */
function addXP(n, lang){
  if (!n) return;
  const k = today(); const d = S.days[k] || (S.days[k] = { xp: 0, met: false });
  const was = d.met;
  d.xp += n; if (d.xp >= S.settings.goal) d.met = true;
  if (!was && d.met) setTimeout(() => sfx('streak'), 1100);
  S.langs[lang].xp = (S.langs[lang].xp || 0) + n;
  touch('core', lang);
}
function todayXP(){ return (S.days[today()] || {}).xp || 0; }
function streakInfo(){ return streakFrom(S.days, today()); }
/* days: { 'YYYY-MM-DD': { xp, met } }. Also counts a friend's streak from the days on their card (social.js). */
function streakFrom(days, t){
  const met = k => !!(days[k] && days[k].met);
  const keys = Object.keys(days).filter(k => days[k] && days[k].xp > 0).sort();
  const first = keys[0];
  let count = 0; const frozenWeeks = new Set(); const frozen = new Set();
  if (first){
    let k = met(t) ? t : addDays(t, -1);
    while (k >= first){
      if (met(k)) count++;
      else { const w = weekOf(k); if (frozenWeeks.has(w)) break; frozenWeeks.add(w); frozen.add(k); }
      k = addDays(k, -1);
    }
  }
  // a freeze only counts if a met day sits before it inside the streak
  for (const f of [...frozen]) if (!keys.some(x => x < f && met(x))) frozen.delete(f);
  return { count, todayMet: met(t), freezeUsed: frozenWeeks.has(weekOf(t)), frozen };
}
function srsUpdate(card, q){
  card.ef = card.ef || 2.5; card.n = card.n || 0; card.iv = card.iv || 0;
  if (q < 3){ card.n = 0; card.iv = 1; card.lapses = (card.lapses || 0) + 1; }
  else { card.n += 1; card.iv = card.n === 1 ? 1 : card.n === 2 ? 3 : Math.max(1, Math.round(card.iv * card.ef)); }
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  card.due = addDays(today(), card.iv); card.last = today(); card.ts = Date.now();
}
function cardsFor(lang){ return S.langs[lang].cards; }
function dueEntries(lang){
  const t = today(); const out = [];
  for (const [key, card] of Object.entries(cardsFor(lang))){ if (card.due <= t){ const r = resolveKey(key); if (r) out.push({ ...r, card }); } }
  return out.sort((a, b) => a.card.due < b.card.due ? -1 : a.card.due > b.card.due ? 1 : a.card.ef - b.card.ef);
}
function dueCount(lang){ const t = today(); let n = 0; for (const [k, c] of Object.entries(cardsFor(lang))) if (c.due <= t && resolveKey(k)) n++; return n; }
function learnedEntries(lang, kind){
  const out = [];
  for (const [key, card] of Object.entries(cardsFor(lang))){ const r = resolveKey(key); if (r && (!kind || r.kind === kind)) out.push({ ...r, card }); }
  return out;
}
function wordCount(lang){ let n = 0; for (const k of Object.keys(cardsFor(lang))) if (k.split('|')[1] === 'v') n++; return n; }

/* ===================== DAILY QUESTS & CHEST ===================== */
function dayRec(){ const k = today(); return S.days[k] || (S.days[k] = { xp: 0, met: false }); }
function questIds(){
  const d = dayRec();
  if (Array.isArray(d.qs) && d.qs.length === 3 && d.qs.every(id => QUESTS[id])) return d.qs;
  const r = hashStr(today() + '|quests');
  const a = r % 4 === 0 ? 'lesson2' : 'lesson1';
  const b = ['combo5', 'acc90', 'combo8'][(r >>> 3) % 3];
  const pool = Object.keys(cardsFor(S.settings.lang)).length >= 10 ? ['story', 'review10', 'xp30'] : ['story', 'xp30'];
  d.qs = [a, b, pool[(r >>> 7) % pool.length]];
  return d.qs;
}
function questProgress(id){ const q = QUESTS[id]; const d = S.days[today()] || {}; const v = q.key === 'xp' ? (d.xp || 0) : ((d.q || {})[q.key] || 0); return Math.min(q.target, v); }
function questDone(id){ return questProgress(id) >= QUESTS[id].target; }
function questSnapshot(){ return new Set(questIds().filter(questDone)); }
function questDiff(before){ return questIds().filter(id => questDone(id) && !before.has(id)); }
function bumpQuest(key, n, max){ const d = dayRec(); d.q = d.q || {}; d.q[key] = max ? Math.max(d.q[key] || 0, n) : (d.q[key] || 0) + n; }

/* ===================== BADGES ===================== */
const BADGE_MAP = new Map(BADGES.map(b => [b.id, b]));
function checkBadges(ctx = {}){
  const got = []; const both = ['de', 'es'];
  const award = id => { if (!S.badges[id]){ S.badges[id] = today(); got.push(id); } };
  const lessons = both.map(l => Object.keys(S.langs[l].done).length);
  if (lessons.some(n => n > 0)) award('first');
  if (lessons.every(n => n > 0)) award('both');
  const st = streakInfo().count;
  if (st >= 3) award('streak3'); if (st >= 7) award('streak7'); if (st >= 30) award('streak30');
  const words = both.reduce((n, l) => n + wordCount(l), 0);
  if (words >= 50) award('words50'); if (words >= 250) award('words250'); if (words >= 1000) award('words1000');
  const passed = both.flatMap(l => Object.values(S.langs[l].cp || {})).filter(c => c && c.pass);
  if (passed.length >= 1) award('checkpoint1'); if (passed.length >= 5) award('checkpoint5'); if (passed.some(c => c.acc >= 1)) award('checkpoint100');
  if ((S.stats.fixed || 0) >= 25) award('fixer'); if ((S.stats.formsRight || 0) >= 50) award('forms50');
  if (ctx.flawless) award('flawless');
  if ((S.stats.bestCombo || 0) >= 10) award('combo10');
  if ((S.stats.reviewsRight || 0) >= 100) award('review100');
  if (both.some(l => Object.keys(S.langs[l].stories).length)) award('story1');
  if (both.some(l => STORIES.filter(s => s.lang === l).every(s => S.langs[l].stories[s.id]))) award('stories8');
  if ((S.stats.talkBest || 0) >= 5) award('talk');
  if ((S.stats.chests || 0) >= 7) award('chest7');
  if (Object.values(S.social.friends).some(f => f && f.code && (!f.gone || (+f.at || 0) > f.gone))) award('friend');
  if (Object.values(S.social.past).some(p => p && p.me > p.them)) award('rival');
  for (const [lv, id] of [['A1', 'levelA1'], ['B1', 'levelB1'], ['C2', 'levelC2']]) if (both.some(l => levelComplete(l, lv))) award(id);
  if (ctx.practiced){ const hr = new Date().getHours(); if (hr >= 4 && hr < 8) award('early'); if (hr >= 22 || hr < 4) award('night'); }
  if (got.length) touch('core');
  return got;
}
/* ===================== LESSON STATUS ===================== */
function isDone(lang, id){ return !!S.langs[lang].done[id]; }
function startIndex(lang){ return LEVELS.indexOf(S.langs[lang].start || 'A1'); }
/* The next stop is the first unfinished lesson after the furthest one you've done on your route,
   so lessons added to earlier levels later don't pull you backwards (they show as open). */
function nextLesson(lang){
  const si = startIndex(lang); const core = coreOrder(lang);
  const inRoute = l => LEVELS.indexOf(l.level) >= si;
  let last = -1; core.forEach((l, i) => { if (inRoute(l) && isDone(lang, l.id)) last = i; });
  return core.find((l, i) => i > last && inRoute(l) && !isDone(lang, l.id)) || core.find(l => inRoute(l) && !isDone(lang, l.id)) || core.find(l => !isDone(lang, l.id)) || genLessons(lang).find(l => !isDone(lang, l.id)) || null;
}
function lessonState(lang, l, nx){
  if (isDone(lang, l.id)) return 'done';
  if (nx && nx.id === l.id) return 'next';
  if (!l.core) return 'open';
  if (LEVELS.indexOf(l.level) < startIndex(lang)) return 'open';
  if (nx && nx.core && CORE_IDX[lang].get(l.id) < CORE_IDX[lang].get(nx.id)) return 'open';
  return 'locked';
}
function levelStats(lang){
  const res = {};
  for (const lv of LEVELS){ const ls = coreOrder(lang).filter(l => l.level === lv); res[lv] = { total: ls.length, done: ls.filter(l => isDone(lang, l.id)).length, gen: genLessons(lang).filter(l => l.level === lv).length }; }
  return res;
}
function levelComplete(lang, lv){ const ls = coreOrder(lang).filter(l => l.level === lv); return ls.length > 0 && ls.every(l => isDone(lang, l.id)); }
function currentLevel(lang){ const nx = nextLesson(lang); if (nx) return nx.level; return 'C2'; }

/* how much meaning a question shows: 'full', 'tap' or 'off' (see HINTS in config.js) */
function hintMode(level){
  const s = S.settings.hints;
  if (s === 'off') return 'off';
  if (s === 'always') return 'full';
  return HINTS[level] || 'tap';
}
/* ===================== EXERCISE BUILDING ===================== */
let EXID = 0;
function vocabPools(lesson){
  const lang = lesson.lang;
  const unitV = lesson.core ? COURSE[lang].units[lesson.unit].lessons.flatMap(l => l.vocab) : [];
  const lvV = coreOrder(lang).filter(l => l.level === lesson.level).flatMap(l => l.vocab);
  return [lesson.vocab, unitV, lvV, allLessons(lang).flatMap(l => l.vocab)];
}
function pickDistractors(item, lesson, n, field){
  const lang = lesson.lang; const out = []; const seen = new Set();
  const itemEn = new Set(englishVariants(item).map(x => norm(x, 'en')));
  const itemT = new Set([item.t, ...item.alt].map(x => norm(x, lang)));
  for (const pool of vocabPools(lesson)){
    for (const v of shuffle(pool)){
      if (out.length >= n) break;
      if (v === item) continue;
      const k = field === 'en' ? norm(v.e[0], 'en') : norm(v.t, lang);
      if (seen.has(k) || itemT.has(norm(v.t, lang))) continue;
      if (englishVariants(v).some(x => itemEn.has(norm(x, 'en')))) continue;
      seen.add(k); out.push(field === 'en' ? v.e[0] : v.t);
    }
    if (out.length >= n) break;
  }
  return out;
}
function sentencePools(lesson){
  const lang = lesson.lang;
  const unitS = lesson.core ? COURSE[lang].units[lesson.unit].lessons.flatMap(l => l.sentences) : [];
  const lvS = coreOrder(lang).filter(l => l.level === lesson.level).flatMap(l => l.sentences);
  return [lesson.sentences, unitS, lvS, coreOrder(lang).flatMap(l => l.sentences)];
}
function sentenceDistractors(sent, lesson, field, n){
  const pick = s => field === 'en' ? s.e[0] : s.t;
  const own = new Set(tileTokens(pick(sent)).map(w => fold(w.toLowerCase())));
  const out = []; const seen = new Set();
  for (const pool of sentencePools(lesson)){
    for (const s of shuffle(pool)){
      if (s === sent) continue;
      for (const w of shuffle(tileTokens(pick(s)))){
        const k = fold(w.toLowerCase());
        if (own.has(k) || seen.has(k)) continue;
        seen.add(k); out.push(w);
        if (out.length >= n) return out;
      }
    }
  }
  return out;
}
function makeEx(type, lesson, kind, i){
  const item = kind === 'v' ? lesson.vocab[i] : lesson.sentences[i];
  const lang = lesson.lang;
  const ex = { id: ++EXID, type, lang, lesson, item, kind, key: itemKey(lesson, kind, i) };
  switch (type){
    case 'mc-t2e': case 'listen-mc':
      ex.correct = item.e[0]; ex.options = shuffle([item.e[0], ...pickDistractors(item, lesson, 3, 'en')]); break;
    case 'mc-e2t':
      ex.correct = item.t; ex.options = shuffle([item.t, ...pickDistractors(item, lesson, 3, 't')]); break;
    case 'type-t2e': ex.accepted = englishVariants(item); ex.ansLang = 'en'; break;
    case 'type-e2t': ex.accepted = [item.t, ...item.alt]; ex.ansLang = lang; break;
    case 'bank-e2t': ex.accepted = [item.t, ...item.alt]; ex.ansLang = lang; ex.tiles = shuffle([...tileTokens(item.t), ...sentenceDistractors(item, lesson, 't', 3)]); break;
    case 'bank-t2e': ex.accepted = englishVariants(item); ex.ansLang = 'en'; ex.tiles = shuffle([...tileTokens(item.e[0]), ...sentenceDistractors(item, lesson, 'en', 3)]); break;
    case 'listen': ex.accepted = [item.t, ...item.alt]; ex.ansLang = lang; ex.tiles = shuffle([...tileTokens(item.t), ...sentenceDistractors(item, lesson, 't', 2)]); ex.mode = 'tiles'; break;
    case 'speak': ex.accepted = [item.t, ...item.alt]; ex.ansLang = lang; break;
  }
  return ex;
}
/* the whole sentence a blank makes once it is filled in, as it is shown and spoken */
function blankSaid(b){ return b.t.replace('___', b.a).replace(/\s*\([^)]*\)\s*$/, '').replace(/^.*→\s*/, ''); }
function blankEx(lesson, i){ const b = lesson.blanks[i]; return { id: ++EXID, type: 'blank', lang: lesson.lang, lesson, blank: b, correct: b.a, options: shuffle(b.o) }; }
function matchEx(lesson, idxs){ return { id: ++EXID, type: 'match', lang: lesson.lang, lesson, items: idxs.map(i => lesson.vocab[i]) }; }
/* teaching cards sit in the lesson's queue between the exercises: a few new words, or one bite of the lesson's idea */
function teachEx(lesson, mode, extra){ return Object.assign({ id: ++EXID, type: 'teach', mode, lang: lesson.lang, lesson }, extra); }
/* a lesson meets its words two or three at a time, and its idea in small bites placed between those groups */
function buildLesson(lesson){
  const nV = lesson.vocab.length, nS = lesson.sentences.length, nB = Math.min(lesson.blanks.length, 3);
  const out = [], usedS = new Set(), usedB = new Set(), taught = [];
  const V = (t, i) => { if (i < nV){ out.push(makeEx(t, lesson, 'v', i)); } };
  const Sx = (t, i) => { if (nS){ usedS.add(i % nS); out.push(makeEx(t, lesson, 's', i % nS)); } };
  const Bx = i => { if (i < nB){ usedB.add(i); out.push(blankEx(lesson, i)); } };
  const typedSentence = ['A1', 'A2', 'B1'].includes(lesson.level);
  const groups = [], per = Math.ceil(nV / Math.ceil(nV / 3));
  for (let i = 0; i < nV; i += per) groups.push([...Array(Math.min(per, nV - i)).keys()].map(k => i + k));
  const bites = tipBites(lesson.tip);
  const bitesAfter = gi => bites.filter((_, j) => Math.floor((j + 1) * groups.length / (bites.length + 1)) === gi);
  const recognise = ['mc-t2e', 'mc-e2t', 'listen-mc'];
  groups.forEach((g, gi) => {
    out.push(teachEx(lesson, 'words', { idxs: g }));
    g.forEach((i, k) => { V(recognise[k % 3], i); taught.push(i); });
    if (gi > 0){   // the newest words that can be told apart (du and Sie both mean “you”)
      const pick = [], ts = new Set(), es = new Set();
      for (const i of taught.slice().reverse()){ const v = lesson.vocab[i]; if (pick.length < 5 && !ts.has(v.t) && !es.has(v.e[0])){ pick.push(i); ts.add(v.t); es.add(v.e[0]); } }
      if (pick.length >= 3) out.push(matchEx(lesson, pick));
    }
    for (const bite of bitesAfter(gi)){
      out.push(teachEx(lesson, 'concept', { bite }));
      if (bite.i === 0){ Sx('bank-e2t', 0); Bx(0); } else if (bite.i === 1){ Bx(1); Sx('bank-t2e', 1); } else { Bx(2); Sx('listen', 2); }
    }
  });
  // everything has been met: now put it together
  const more = lessonForms(lesson);
  if (more.length) out.push(teachEx(lesson, 'forms', { list: more.slice(0, 8) }));
  if (!usedS.has(0)) Sx('bank-e2t', 0);
  V('type-t2e', Math.floor(nV / 3));
  if (!usedS.has(1 % nS)) Sx('bank-t2e', 1);
  V('type-e2t', Math.floor(2 * nV / 3));
  if (!usedS.has(2 % nS)) Sx('listen', 2);
  for (let i = 0; i < nB; i++) if (!usedB.has(i)) Bx(i);
  Sx(typedSentence ? 'type-e2t' : 'bank-e2t', 3);
  if (S.settings.speaking) Sx('speak', nS > 4 ? 4 : 0);
  shuffle(formDrills(lesson)).slice(0, 2).forEach(d => out.push(formEx(lesson, d)));   // the forms in the lesson's tables
  return out;
}
function reviewEx(entry){
  const n = entry.card.n || 0;
  let types;
  if (entry.kind === 'v') types = n === 0 ? ['mc-t2e', 'listen-mc', 'mc-e2t'] : n < 3 ? ['mc-e2t', 'type-t2e', 'listen-mc'] : ['type-e2t', 'type-t2e'];
  else types = n === 0 ? ['bank-t2e', 'bank-e2t'] : n < 3 ? ['bank-e2t', 'listen', 'type-t2e'] : ['type-e2t', 'listen', 'type-t2e'];
  if (S.settings.speaking && n >= 2 && entry.kind === 's' && Math.random() < 0.15) types = ['speak'];
  const ex = makeEx(types[Math.floor(Math.random() * types.length)], entry.lesson, entry.kind, entry.i);
  ex.srs = entry.key;
  return ex;
}

/* ===================== MISTAKES, FORM DRILLS, CHECKPOINTS, PLACEMENT ===================== */
/* a wrong answer (or a form that only counted at an early level) puts the item on the "Fix my mistakes" list until you get it right */
function noteMiss(lang, key, bad){
  if (!key) return;
  const m = S.langs[lang].miss, now = Date.now(), x = m[key];
  if (bad) m[key] = { ts: now, ok: x ? +x.ok || 0 : 0 };
  else if (x && x.ts > (+x.ok || 0)){ m[key] = { ts: x.ts, ok: now }; S.stats.fixed = (S.stats.fixed || 0) + 1; }
}
function mistakeEntries(lang){
  const out = [];
  for (const [k, x] of Object.entries(S.langs[lang].miss)) if (x && x.ts > (+x.ok || 0)){ const r = resolveKey(k); if (r) out.push({ ...r, card: cardsFor(lang)[k] || { n: 0 }, at: x.ts }); }
  return out.sort((a, b) => b.at - a.at);
}
/* the rows of a lesson's forms tables (pronoun → form) that can be asked as "which form goes with …" */
function formDrills(lesson){
  const out = [], clean = s => String(s).replace(/\*\*/g, '').trim();
  for (const t of (lesson.tip && lesson.tip.tables) || []){
    if (t.head || t.rows.length < 4) continue;
    const rows = t.rows.filter(r => r.length >= 2 && clean(r[0]) && clean(r[0]).length <= 16 && clean(r[1]) && clean(r[1]).length <= 24 && !/^[–—-]$/.test(clean(r[1])) && !/[\/,]/.test(clean(r[1])));
    const forms = [...new Set(rows.map(r => clean(r[1])))];
    if (rows.length < 4 || forms.length < 4) continue;
    for (const r of rows) out.push({ cap: clean(t.cap), label: clean(r[0]), form: clean(r[1]), pool: forms });
  }
  return out;
}
function formEx(lesson, d){
  const typed = LEVELS.indexOf(lesson.level) >= 2;
  return { id: ++EXID, type: 'form', lang: lesson.lang, lesson, kind: 'f', mode: typed ? 'type' : 'mc', cap: d.cap, label: d.label, correct: d.form,
    options: typed ? null : shuffle([d.form, ...shuffle(d.pool.filter(f => f !== d.form)).slice(0, 3)]), accepted: [d.form], ansLang: lesson.lang,
    item: { t: d.form, alt: [], e: [d.cap + ' · ' + d.label], g: null } };
}
/* a short test over one unit: a mix of its words, phrases, blanks and forms, favouring what you got wrong */
function buildCheckpoint(unit){
  const typed = LEVELS.indexOf(unit.level) >= 2, lang = unit.lessons[0].lang, miss = S.langs[lang].miss;
  const hot = (l, kind, i) => { const x = miss[itemKey(l, kind, i)]; return x && x.ts > (+x.ok || 0) ? 1 : 0; };
  const pool = { v: [], s: [], b: [], f: [] };
  for (const l of unit.lessons){
    l.vocab.forEach((_, i) => pool.v.push({ l, i, h: hot(l, 'v', i) }));
    l.sentences.forEach((_, i) => pool.s.push({ l, i, h: hot(l, 's', i) }));
    l.blanks.forEach((_, i) => pool.b.push({ l, i, h: 0 }));
    formDrills(l).forEach(d => pool.f.push({ l, d, h: 0 }));
  }
  const take = (arr, n) => shuffle(arr).sort((a, b) => b.h - a.h).slice(0, n);
  const want = { v: 4, s: 3, b: 3, f: 2 };
  if (!pool.f.length){ want.s += 1; want.v += 1; }
  const chosen = {}; let total = 0;
  for (const k of Object.keys(want)){ chosen[k] = take(pool[k], want[k]); total += chosen[k].length; }
  for (const k of ['v', 's', 'b']) if (total < CHECKPOINT.questions){ const more = take(pool[k].filter(x => !chosen[k].includes(x)), CHECKPOINT.questions - total); chosen[k] = chosen[k].concat(more); total += more.length; }
  const out = [];
  chosen.v.forEach((x, n) => out.push(makeEx(typed && n % 2 ? 'type-e2t' : n % 2 ? 'mc-e2t' : 'mc-t2e', x.l, 'v', x.i)));
  chosen.s.forEach((x, n) => out.push(makeEx(typed ? 'type-e2t' : n % 2 ? 'listen' : 'bank-e2t', x.l, 's', x.i)));
  chosen.b.forEach(x => out.push(blankEx(x.l, x.i)));
  chosen.f.forEach(x => out.push(formEx(x.l, x.d)));
  return shuffle(out).slice(0, CHECKPOINT.questions);
}
function unitDone(lang, u){ return u.lessons.length > 0 && u.lessons.every(l => isDone(lang, l.id)); }
/* one level's worth of placement questions: a few words, a blank and a phrase from lessons at that level */
function placementSet(lang, lv){
  const ls = coreOrder(lang).filter(l => l.level === lv); if (!ls.length) return [];
  const pick = () => ls[Math.floor(Math.random() * ls.length)], idx = n => Math.floor(Math.random() * n);
  const out = [];
  const vs = shuffle(ls.flatMap(l => l.vocab.map((_, i) => ({ l, i })))).slice(0, 3);
  vs.forEach((x, n) => out.push(makeEx(n === 2 ? 'mc-e2t' : 'mc-t2e', x.l, 'v', x.i)));
  const lb = pick(); if (lb.blanks.length) out.push(blankEx(lb, idx(lb.blanks.length)));
  const ls2 = shuffle(ls.filter(l => l.sentences.length))[0]; if (ls2) out.push(makeEx('bank-e2t', ls2, 's', idx(ls2.sentences.length)));
  out.forEach(ex => { ex.plv = lv; });
  return out;
}

/* ===================== WRONG FORMS ===================== */
/* Is `a` another form of the same word as `b` (another person, tense, number or gender)? Returns a plain-English why, or null.
   The lesson's own forms tables decide first; then shared dictionary forms; then words that share a stem and differ only at the end. */
const FORMWORDS = { lang: '', ver: -1, vocab: new Map() };
function formVocab(lang){
  if (FORMWORDS.lang !== lang || FORMWORDS.ver !== Packs.version){
    FORMWORDS.lang = lang; FORMWORDS.ver = Packs.version; FORMWORDS.vocab = new Map();
    for (const l of allLessons(lang)) for (const v of l.vocab) for (const t of [v.t, ...v.alt]) for (const w of t.split(/\s+/)){
      const k = fold(norm(coreWord(w), lang)); if (!k || LANGS[lang].articles.includes(k)) continue;
      if (!FORMWORDS.vocab.has(k)) FORMWORDS.vocab.set(k, new Set()); FORMWORDS.vocab.get(k).add(v);
    }
  }
  return FORMWORDS.vocab;
}
/* the cells of a lesson's forms tables, by word: { word → [{ label, cap }] } */
function tableForms(lesson, lang){
  const out = new Map(); if (!lesson || !lesson.tip) return out;
  for (const t of lesson.tip.tables || []) t.rows.forEach(r => r.forEach((cell, c) => {
    if (!t.head && c === 0) return;
    const label = t.head ? t.head[c] : r[0];
    for (const part of String(cell).replace(/\*\*/g, '').split(/[\/,]/)) for (const w of part.split(/\s+/)){
      const k = fold(norm(coreWord(w), lang)); if (!k) continue;
      if (!out.has(k)) out.set(k, []); out.get(k).push({ label: String(label).replace(/\*\*/g, ''), cap: String(t.cap).replace(/\*\*/g, ''), table: t });
    }
  }));
  return out;
}
function sameWordForm(a, b, lang, lesson){
  const ka = fold(norm(a, lang)), kb = fold(norm(b, lang));
  if (!ka || !kb || ka === kb || ka.includes(' ') || kb.includes(' ')) return null;
  const tf = tableForms(lesson, lang), ta = tf.get(ka), tb = tf.get(kb);
  if (ta && tb){
    const pair = ta.map(x => [x, tb.find(y => y.table === x.table && y.label !== x.label)]).find(p => p[1]);
    if (pair) return { yourLabel: pair[0].label, label: pair[1].label, cap: pair[0].cap };
  }
  // two different dictionary words (tía and tío) are not forms of one word
  const vocab = formVocab(lang), va = vocab.get(ka), vb = vocab.get(kb);
  if (va && vb && ![...va].some(x => vb.has(x))) return null;
  const cand = k => new Set([k, ...baseForms(k, lang).filter(x => x.length >= 3)]);
  const ca = cand(ka), cb = cand(kb);
  for (const x of ca) if (cb.has(x)) return { lemma: x };
  // same stem, different ending
  let p = 0; while (p < ka.length && p < kb.length && ka[p] === kb[p]) p++;
  if (p >= 4 && ka.length >= 5 && kb.length >= 5 && ka.length - p <= 3 && kb.length - p <= 3) return { lemma: '' };
  return null;
}
/* explain a swap of forms: [{ yours, expected, note }] */
function formNote(y, e, w, lang, drill){
  if (w.label && w.yourLabel) return '“' + y + '” is the “' + w.yourLabel + '” form. ' + (drill ? 'Here you need the “' : 'This sentence needs the “') + w.label + '” form: “' + e + '”.';
  if (w.lemma && fold(norm(w.lemma, lang)) !== fold(norm(y, lang))) return '“' + y + '” and “' + e + '” are forms of ' + (w.lemma.endsWith('r') || lang === 'de' ? '“' + w.lemma + '”' : 'the same word') + '. Here you need “' + e + '”.';
  return 'It’s the right word in the wrong form. Here you need “' + e + '”.';
}
/* an answer in the language being learned that is right except for the form of one or more words.
   Early levels let it count (FORM_PASS) and say what to fix; later levels don't. */
function formMiss(ex, value){
  if (!ex.accepted || !ex.ansLang || ex.ansLang === 'en' || typeof value !== 'string') return null;
  const lang = ex.lang; let best = null;
  for (const a of ex.accepted){
    const d = answerDiff(value, a, lang);
    const words = d.changes.filter(c => c.kind === 'word' || c.kind === 'spelling');
    if (!words.length || words.length > 3) continue;
    const diffs = []; let all = true;
    for (const c of words){
      const ys = c.yours.split(/\s+/).filter(Boolean), es = c.answer.split(/\s+/).filter(Boolean);
      if (!ys.length || ys.length !== es.length){ all = false; break; }
      for (let i = 0; i < ys.length; i++){
        const w = sameWordForm(ys[i], es[i], lang, ex.lesson);
        if (w) diffs.push({ yours: ys[i], expected: es[i], note: formNote(ys[i], es[i], w, lang) });
        else if (c.kind !== 'spelling'){ all = false; break; }   // a slip of one letter in another word is forgiven
      }
      if (!all) break;
    }
    if (all && diffs.length && (!best || diffs.length < best.diffs.length)) best = { diffs, match: a };
  }
  if (!best) return null;
  const pass = !!FORM_PASS[ex.lesson && ex.lesson.level];
  return { ok: pass, level: 'form', match: best.match, diffs: best.diffs,
    note: pass ? 'The word is right but the form is off. It counts at this level, so use the notes below to fix it.' : 'You have the right word, but the form is wrong. From this level on, the exact form counts.' };
}
/* a blank answered with another form of the right word: say why it is wrong */
function blankFormNote(ex, value){
  const w = sameWordForm(value, ex.correct, ex.lang, ex.lesson);
  return w ? [{ yours: value, expected: ex.correct, note: formNote(value, ex.correct, w, ex.lang, ex.type === 'form') }] : null;
}

/* ===================== EVALUATION ===================== */
function evaluate(ex, value){
  if (ex.type === 'form' && ex.mode === 'mc'){
    if (value === ex.correct) return { ok: true, level: 'exact' };
    const d = blankFormNote(ex, value);
    return d ? { ok: false, level: 'wrong', diffs: d, note: 'That’s another form of the same word.' } : { ok: false, level: 'wrong' };
  }
  switch (ex.type){
    case 'mc-t2e': case 'listen-mc': {
      const ok = value === ex.correct || englishVariants(ex.item).some(v => norm(v, 'en') === norm(value, 'en'));
      return { ok, level: ok ? 'exact' : 'wrong' };
    }
    case 'mc-e2t': {
      const ok = value === ex.correct || [ex.item.t, ...ex.item.alt].some(v => norm(v, ex.lang) === norm(value, ex.lang));
      return { ok, level: ok ? 'exact' : 'wrong' };
    }
    case 'blank': {
      if (value === ex.correct) return { ok: true, level: 'exact' };
      const diffs = blankFormNote(ex, value);
      return diffs ? { ok: false, level: 'wrong', diffs, note: 'That’s the right word in the wrong form.' } : { ok: false, level: 'wrong' };
    }
    case 'speak': {
      const { score: sc, match } = closestAnswer(value, ex.accepted, ex.lang);
      const close = sc >= 0.75 && sc < 0.999;
      return { ok: sc >= 0.75, level: sc >= 0.999 ? 'exact' : sc >= 0.75 ? 'typo' : 'wrong', note: close ? heardNote(value, match, ex.lang) : '', heard: value, match };
    }
    case 'match': return { ok: true, level: 'exact' };
    default: {
      const tiles = ex.type.startsWith('bank') || (ex.type === 'listen' && ex.mode === 'tiles');
      let r = check(value, ex.accepted, ex.ansLang, { typo: !tiles });
      if (!r.ok && ex.type === 'type-e2t' && ex.item.g){ const a = articleCheck(ex, value); if (a) r = a; }
      if (!r.ok && r.level === 'wrong'){ const f = formMiss(ex, value); if (f) r = f; }
      if (r.ok && r.level === 'exact' && !mainForms(ex).includes(r.match)) r = { ...r, alt: true, note: 'That’s another right way to say it.' };
      return r;
    }
  }
}
/* the lesson's main answer in the language being typed, in the forms that count as the same answer */
function mainForms(ex){ return ex.ansLang === 'en' ? englishVariants({ e: ex.item.e.slice(0, 1), g: ex.item.g }) : [ex.item.t]; }
function heardNote(heard, answer, lang){
  const d = answerDiff(heard, answer, lang);
  return (d.caught >= d.total ? 'Every word came through' : 'We caught ' + d.caught + ' of ' + d.total + ' words') + ', so it counts. Play it once more and compare.';
}
function articleCheck(ex, value){
  const arts = LANGS[ex.lang].articles;
  const u = norm(value, ex.lang).split(' '), t = norm(ex.item.t, ex.lang).split(' ');
  if (!arts.includes(t[0]) || t.length < 2) return null;
  const has = arts.includes(u[0]); const un = (has ? u.slice(1) : u).join(' '), tn = t.slice(1).join(' ');
  if (fold(un) === fold(tn) || fold(un) === fold2(tn)) return { ok: false, level: 'article', note: has ? 'Check the article: it’s ' + ex.item.t + '.' : 'Include the article: ' + ex.item.t + '.' };
  return null;
}
async function aiGrade(ex, answer){
  if (!S.settings.aiGrade || !aiOn()) return null;
  const lname = LANGS[ex.lang].name;
  const toTarget = ex.ansLang !== 'en';
  const from = toTarget ? 'English' : lname, to = toTarget ? lname : 'English';
  const prompt = toTarget ? ex.item.e[0] : ex.item.t;
  const rules = to === 'German' ? ' Wrong articles, cases, verb endings or word order make it incorrect.' : to === 'Spanish' ? ' Wrong gender agreement, mood or verb endings make it incorrect. Latin American Spanish is the standard; vosotros forms are not expected.' : ' Accept natural English paraphrases with the same meaning.';
  const text = 'You grade one answer from a language learner. Be fair, and strict about grammar.\n' +
    'Task: translate this ' + from + ' text into ' + to + ': "' + prompt + '"\n' +
    'Reference answers: ' + ex.accepted.slice(0, 6).map(a => '"' + a + '"').join(', ') + '\n' +
    'Learner answer: "' + String(answer).slice(0, 300) + '"\n' +
    'Is the learner answer a correct, natural translation with the same meaning? Ignore capitalization and punctuation.' + rules + '\n' +
    'Reply with only JSON: {"correct": true or false, "note": "one short sentence for the learner", "why": "if correct, one short sentence on why it still counts", ' +
    '"differences": [{"yours": "words from the learner answer", "expected": "the matching words from the closest reference answer", "note": "a few words on what changes, such as a synonym, a more formal word or a slight shift in meaning"}]}\n' +
    'In differences, list up to 3 real differences in wording, meaning, tone or grammar between the learner answer and the closest reference answer. Leave out capitalization, punctuation and contractions. Use an empty list if there are none. Write the notes in plain English.';
  try {
    const r = await AI.sample.json(text, { modelTier: 'quick' });
    if (r && typeof r.correct === 'boolean'){
      const str = (x, n) => String(x ?? '').trim().slice(0, n);
      const diffs = (Array.isArray(r.differences) ? r.differences : []).filter(d => d && typeof d === 'object')
        .map(d => ({ yours: str(d.yours, 80), expected: str(d.expected, 80), note: str(d.note, 160) })).filter(d => d.yours || d.expected).slice(0, 3);
      return { correct: r.correct, note: str(r.note, 240), why: str(r.why, 240), diffs };
    }
  } catch (e) { aiErrorText(e); }
  return null;
}

