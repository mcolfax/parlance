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
function streakInfo(){
  const t = today(); const met = k => !!(S.days[k] && S.days[k].met);
  const keys = Object.keys(S.days).filter(k => S.days[k] && S.days[k].xp > 0).sort();
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
  if (ctx.flawless) award('flawless');
  if ((S.stats.bestCombo || 0) >= 10) award('combo10');
  if ((S.stats.reviewsRight || 0) >= 100) award('review100');
  if (both.some(l => Object.keys(S.langs[l].stories).length)) award('story1');
  if (both.some(l => STORIES.filter(s => s.lang === l).every(s => S.langs[l].stories[s.id]))) award('stories8');
  if ((S.stats.talkBest || 0) >= 5) award('talk');
  if ((S.stats.chests || 0) >= 7) award('chest7');
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
function buildLesson(lesson){
  const nV = lesson.vocab.length, nS = lesson.sentences.length, nB = Math.min(lesson.blanks.length, 3);
  const out = []; const used = new Set();
  const V = (t, i) => { if (i < nV){ out.push(makeEx(t, lesson, 'v', i)); used.add(i); } };
  const Sx = (t, i) => { if (nS) out.push(makeEx(t, lesson, 's', i % nS)); };
  const Bx = i => { if (i < nB) out.push(blankEx(lesson, i)); };
  const typedSentence = ['A1', 'A2', 'B1'].includes(lesson.level);
  V('mc-t2e', 0); V('mc-e2t', 1); V('listen-mc', 2); Sx('bank-e2t', 0); Bx(0); V('type-t2e', 3);
  const mi = [...Array(nV).keys()].filter(i => !used.has(i)).slice(0, 5);
  for (const i of used) if (mi.length < 5 && !mi.includes(i)) mi.push(i);
  if (mi.length >= 3){ out.push(matchEx(lesson, mi)); mi.forEach(i => used.add(i)); }
  Sx('bank-t2e', 1); V('type-e2t', 4); Sx('listen', 2); Bx(1); Sx(typedSentence ? 'type-e2t' : 'bank-e2t', 3);
  if (S.settings.speaking) Sx('speak', nS > 4 ? 4 : 0);
  Bx(2);
  let flip = false;
  for (let i = 0; i < nV; i++) if (!used.has(i)){ V(flip ? 'mc-e2t' : 'mc-t2e', i); flip = !flip; }
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

/* ===================== EVALUATION ===================== */
function evaluate(ex, value){
  switch (ex.type){
    case 'mc-t2e': case 'listen-mc': {
      const ok = value === ex.correct || englishVariants(ex.item).some(v => norm(v, 'en') === norm(value, 'en'));
      return { ok, level: ok ? 'exact' : 'wrong' };
    }
    case 'mc-e2t': {
      const ok = value === ex.correct || [ex.item.t, ...ex.item.alt].some(v => norm(v, ex.lang) === norm(value, ex.lang));
      return { ok, level: ok ? 'exact' : 'wrong' };
    }
    case 'blank': return { ok: value === ex.correct, level: value === ex.correct ? 'exact' : 'wrong' };
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

