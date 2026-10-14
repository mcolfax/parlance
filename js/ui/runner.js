"use strict";
/* ===================== LESSON RUNNER ===================== */
function runHead(title){
  const peek = !title && Run.started && Run.mode === 'lesson' && Run.lesson && hintMode(Run.lesson.level) === 'full'
    ? h('button', { class: 'linkish small words-btn', type: 'button', onclick: () => showWords() }, ic('bulb'), 'Words') : null;
  const close = h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => askLeave() });
  OV.prog = h('i');
  OV.combo = h('span', { class: 'combo', 'aria-live': 'polite' });
  OV.head.replaceChildren(close, title ? h('div', { class: 'ov-title' }, title) : h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Progress' }, OV.prog), peek, OV.combo);
}
/* the lesson's words and their meanings, one tap away while the exercises run */
function wordRows(l, lang){ return h('div', { class: 'wordlist' }, l.vocab.map(v => h('div', { class: 'wl-row' }, h('div', { class: 't' }, itemText(v, lang)), h('div', { class: 'e' }, v.e.slice(0, 2).join(', ')), speakBtn(v.t, lang)))); }
/* conjugation, article and ending tables from a lesson's tip */
function formsTable(t){
  const cell = (tag, x) => h(tag, { html: rich(x) });
  return h('div', { class: 'forms' }, t.cap ? h('div', { class: 'forms-cap' }, t.cap) : null,
    h('div', { class: 'forms-scroll' }, h('table', null, t.head ? h('thead', null, h('tr', null, t.head.map(x => cell('th', x)))) : null,
      h('tbody', null, t.rows.map(r => h('tr', null, r.map((x, i) => cell(i === 0 && !t.head ? 'th' : 'td', x))))))));
}
/* the forms and extra words this lesson's sentences use that earlier lessons haven't shown */
function formRows(l, lang){
  const list = lessonForms(l); if (!list.length) return null;
  return h('div', null, h('div', { class: 'row', style: 'margin-bottom:6px' }, h('h3', null, 'Also in the sentences'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'new forms and words')),
    h('div', { class: 'wordlist forms-list' }, list.map(f => h('div', { class: 'wl-row' }, h('div', { class: 't' }, sayText(f.w, lang)), h('div', { class: 'e' }, (f.base ? 'form of ' + f.base + ' · ' : '') + f.val), speakBtn(f.w, lang)))));
}
function showWords(){ if (Run.lesson) sheet('Words in this lesson', wordRows(Run.lesson, Run.lang), [{ label: 'Back to the lesson', primary: true }]); }
/* a nudge under a sentence that can be tapped; the questions stop saying it once the hints fade */
function hintLine(ex){ return ex.lesson && hintMode(ex.lesson.level) === 'full' ? h('p', { class: 'hint tap-hint' }, 'Tap an underlined word to see what it means.') : null; }
function glossOn(ex){ return !!ex.lesson && hintMode(ex.lesson.level) !== 'off'; }
function setProgress(){ if (OV.prog && Run.queue){ const p = Run.queue.length ? Run.pos / Run.queue.length : 0; OV.prog.style.width = (p * 100).toFixed(1) + '%'; } }
function askLeave(){
  if (!Run.active || !Run.started || Run.finished){ endRun(); return; }
  sheet('Leave this ' + (Run.mode === 'lesson' ? 'lesson' : 'session') + '?', h('p', null, Run.mode === 'lesson' ? 'Your answers in this lesson won’t be saved.' : 'Items you’ve already reviewed keep their new schedule.'),
    [{ label: 'Keep going', primary: true }, { label: 'Leave', run: () => { endRun(); } }]);
}
function endRun(){ clearTimeout(Run.sayTimer); speakStop(); if (Run.finished && Run.mode === 'lesson' && Run.lesson) UI.justDone = Run.lesson.id; Run.active = false; closeOverlay(); UI.animate = true; render(); }
function startLesson(id){
  const lesson = getLesson(id); if (!lesson) return;
  Object.assign(Run, { active: true, started: false, finished: false, mode: 'lesson', lang: lesson.lang, lesson, queue: [], pos: 0, first: new Map(), tries: new Map(), xp: 0, skipped: 0, combo: 0, bestCombo: 0 });
  openOverlay('run'); sfx('open'); recWarm(lesson.lang, lessonSaid(lesson)); showIntro();
}
function showIntro(){
  const l = Run.lesson, lang = Run.lang;
  runHead(l.title);
  const tip = h('div', { class: 'tip' }, h('span', { class: 'eyebrow' }, ic('bulb'), 'Before you start'), h('h3', null, l.tip.title), h('p', { html: rich(l.tip.body) }),
    (l.tip.tables || []).map(t => formsTable(t)),
    l.tip.examples.map(x => h('div', { class: 'ex-line' }, h('div', { class: 't' }, h('span', { class: 'grow' }, sayText(x.t, lang, { gloss: true, en: x.e })), speakBtn(x.t, lang)), h('div', { class: 'e' }, x.e))));
  const words = wordRows(l, lang), forms = formRows(l, lang);
  swapBody([
    h('div', { class: 'intro-head' }, l.core ? unitSign(COURSE[lang].units[l.unit].title, 52) : null, h('span', { class: 'eyebrow' }, (l.core ? 'Unit ' + (l.unit + 1) + ' · ' : '') + l.level + ' ' + LEVEL_NAME[l.level] + ' · ' + LANGS[lang].name), h('h1', null, l.title), h('p', { class: 'muted' }, l.vocab.length + ' words · ' + l.sentences.length + ' phrases · about ' + minutesFor(l) + ' min')),
    tip, h('div', null, h('div', { class: 'row', style: 'margin-bottom:6px' }, h('h3', null, 'Words in this lesson'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'tap to hear')), lang === 'de' ? h('div', { class: 'legend g small' }, h('span', { class: 'g-m' }, 'der'), h('span', { class: 'g-f' }, 'die'), h('span', { class: 'g-n' }, 'das'), h('span', { class: 'g-pl' }, 'plural')) : null, words), forms]);
  OV.foot.className = 'ov-foot';
  const share = !l.core && !l.custom && studioAvailable() ? h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Sharing…'; const ok = await shareLessonToAll(l); if (ok){ sfx('badge'); toast('Shared. Every learner now has “' + l.title + '”.'); endRun(); } else { b.disabled = false; b.textContent = 'Share with all learners'; } } }, ic('wand'), 'Share with all learners') : null;
  OV.footIn.replaceChildren(...[share].filter(Boolean));
  OV.footIn.append(h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => { Run.started = true; Run.queue = buildLesson(Run.lesson); Run.pos = 0; runHead(); nextEx(); } }, 'Start exercises'));
}
function startReview(practice){
  const lang = S.settings.lang;
  let entries = practice ? learnedEntries(lang).sort((a, b) => (a.card.ef - b.card.ef) || ((b.card.lapses || 0) - (a.card.lapses || 0))).slice(0, 12) : dueEntries(lang).slice(0, 20);
  if (!entries.length) return;
  if (practice) entries = shuffle(entries);
  Object.assign(Run, { active: true, started: true, finished: false, mode: practice ? 'practice' : 'review', lang, lesson: null, queue: entries.map(reviewEx), pos: 0, first: new Map(), tries: new Map(), xp: 0, skipped: 0, combo: 0, bestCombo: 0 });
  openOverlay('run'); runHead(); recWarm(lang, Run.queue.map(ex => ex.item && ex.item.t).filter(Boolean)); nextEx();
}
/* the other ways to practise: your mistakes, the forms in the lesson tables, a unit checkpoint and the placement test */
function beginSession(mode, lang, queue, extra){
  Object.assign(Run, { active: true, started: true, finished: false, mode, lang, lesson: null, queue, pos: 0, first: new Map(), tries: new Map(), xp: 0, skipped: 0, combo: 0, bestCombo: 0 }, extra || {});
  openOverlay('run'); sfx('open'); runHead(); recWarm(lang, queue.map(ex => ex.item && ex.item.t).filter(Boolean)); nextEx();
}
function startMistakes(){
  const lang = S.settings.lang, entries = mistakeEntries(lang).slice(0, 12); if (!entries.length) return;
  // easier question types than a full review: the aim is to fix the item, not to test it cold
  beginSession('mistakes', lang, shuffle(entries).map(e => reviewEx({ ...e, card: { ...e.card, n: Math.min(2, e.card.n || 0) } })));
}
function formLessons(lang){ return coreOrder(lang).filter(l => isDone(lang, l.id) && formDrills(l).length); }
function startForms(){
  const lang = S.settings.lang, ls = formLessons(lang); if (!ls.length) return;
  const all = shuffle(ls.flatMap(l => formDrills(l).map(d => ({ l, d })))).slice(0, 10);
  beginSession('forms', lang, all.map(x => formEx(x.l, x.d)));
}
function startCheckpoint(u){
  const lang = S.settings.lang; if (!unitDone(lang, u)) return;
  beginSession('checkpoint', lang, buildCheckpoint(u), { unit: u });
}
function startPlacement(){
  const lang = S.settings.lang, first = LEVELS.find(lv => placementSet(lang, lv).length); if (!first) return;
  beginSession('placement', lang, placementSet(lang, first), { plv: first, placed: null });
}
/* when a level's questions are used up, go up a level if enough were right; otherwise that level is where you start */
function placementNext(){
  const right = Run.queue.filter(ex => ex.plv === Run.plv && Run.first.has(ex.id) && Run.first.get(ex.id) !== 'wrong').length;
  if (right < PLACEMENT.pass){ Run.placed = Run.plv; return false; }
  const next = LEVELS.slice(LEVELS.indexOf(Run.plv) + 1).find(lv => placementSet(Run.lang, lv).length);
  if (!next){ Run.placed = Run.plv; return false; }
  Run.plv = next; Run.queue.push(...placementSet(Run.lang, next)); return true;
}
function finishPlacement(){
  const lang = Run.lang, L = S.langs[lang], lv = Run.placed || 'A1';
  L.start = lv; L.startTs = Date.now(); touch(lang); UI.openLang = null;
  runHead(LANGS[lang].name);
  const vals = [...Run.first.values()], acc = vals.length ? vals.filter(x => x !== 'wrong').length / vals.length : 1;
  showComplete({ lang, top: 'Placement', title: lv + ' ' + LEVEL_NAME[lv], gold: false, xp: 0, acc, accLabel: 'answered right',
    h1: 'Your route starts at ' + lv + '.', sub: lv === 'A1' ? 'You’ll begin with the basics. You can change this any time in Me.' : 'Everything before ' + lv + ' stays open if you want it. You can change this any time in Me.',
    third: [lv, 'your starting level'], badges: [], quests: [], onDone: () => endRun() });
}
function nextEx(){
  if (Run.pos >= Run.queue.length){ if (Run.mode === 'placement' && placementNext()) return nextEx(); return finishRun(); }
  const ex = Run.queue[Run.pos];
  Run.cur = ex; Run.value = null; Run.checking = false;
  setProgress();
  const api = {
    ready: ok => { Run.canCheck = !!ok; if (OV.checkBtn) OV.checkBtn.disabled = !ok; },
    set: v => { Run.value = v; },
    submit: () => doCheck(),
    complete: res => showFeedback(ex, res)
  };
  Run.canCheck = false;
  const node = RENDER[ex.type](ex, api);
  swapBody(node);
  OV.foot.className = 'ov-foot';
  OV.checkBtn = h('button', { class: 'btn btn-primary btn-wide', type: 'button', disabled: true, onclick: () => doCheck() }, 'Check');
  const extra = ex.type === 'speak' ? h('button', { class: 'linkish', type: 'button', style: 'align-self:center', onclick: () => skipEx() }, 'Can’t speak right now') : null;
  OV.footIn.replaceChildren(...[ex.type === 'match' ? h('p', { class: 'hint center' }, 'Tap a word, then its meaning.') : OV.checkBtn, extra].filter(Boolean));
  const inp = OV.bodyIn.querySelector('textarea.ans');
  if (inp && window.matchMedia && window.matchMedia('(pointer:fine)').matches) setTimeout(() => inp.focus(), 60);
}
function skipEx(){ Run.skipped++; Run.pos++; nextEx(); }
async function doCheck(){
  if (Run.checking || !Run.canCheck) return;
  const ex = Run.cur; Run.checking = true;
  let res = evaluate(ex, Run.value);
  if (!res.ok && ['type-t2e', 'type-e2t'].includes(ex.type) && res.level === 'wrong' && S.settings.aiGrade && aiOn() && norm(Run.value, ex.ansLang)){
    OV.checkBtn.disabled = true; OV.checkBtn.classList.add('busy'); OV.checkBtn.textContent = 'Asking your tutor…';
    const g = await aiGrade(ex, Run.value);
    if (Run.cur !== ex) return;
    if (g && g.correct) res = { ok: true, level: 'ai', note: g.why || g.note || 'Your tutor says this means the same thing.', diffs: g.diffs };
    else if (g && g.note) res.note = g.note;
  }
  if (res.ok && ex.peeked && res.level === 'exact') res = { ...res, level: 'near', note: res.note || 'Hint used, so this counts as a near miss for review.' };
  showFeedback(ex, res);
}
function feedbackAnswer(ex){
  if (ex.type === 'form') return { t: ex.correct, en: ex.cap + ' · ' + ex.label, target: true };
  if (ex.type === 'blank') return { t: blankSaid(ex.blank), en: ex.blank.e, target: true };
  if (ex.type === 'match') return null;
  return { t: ex.item.t, en: ex.item.e[0], target: ['mc-e2t', 'type-e2t', 'bank-e2t', 'listen', 'speak'].includes(ex.type) };
}
function showCombo(n){
  if (!OV.combo) return;
  OV.combo.textContent = n + ' in a row';
  OV.combo.classList.remove('show'); void OV.combo.offsetWidth; OV.combo.classList.add('show');
  sfx('combo');
}
function showFeedback(ex, res){
  Run.checking = false;
  const first = !Run.first.has(ex.id);
  if (first){
    Run.first.set(ex.id, res.ok ? (res.level === 'exact' ? 'exact' : 'near') : 'wrong');
    if (res.ok) Run.xp += XP.perAnswer;
    if (ex.srs){
      const card = cardsFor(Run.lang)[ex.srs];
      if (card && Run.mode === 'review'){
        const typed = ['type-t2e', 'type-e2t', 'listen', 'speak'].includes(ex.type);
        srsUpdate(card, res.ok ? (res.level === 'exact' ? (typed ? 5 : 4) : 3) : 1); touch(Run.lang);
      }
    }
  }
  if (first && ex.key && Run.mode !== 'placement'){ noteMiss(Run.lang, ex.key, !res.ok || res.level === 'form'); touch(Run.lang); }
  if (res.ok && first && res.level === 'exact'){ Run.combo++; Run.bestCombo = Math.max(Run.bestCombo, Run.combo); }
  if (first && res.ok && res.level === 'exact' && ex.type === 'form') S.stats.formsRight = (S.stats.formsRight || 0) + 1;
  if (first && res.ok && Run.mode === 'review') Run.reviewsRight = (Run.reviewsRight || 0) + 1;
  else if (!res.ok) Run.combo = 0;
  if (!res.ok){
    const tries = (Run.tries.get(ex.id) || 0) + 1; Run.tries.set(ex.id, tries);
    if (tries <= 3 && Run.mode !== 'checkpoint' && Run.mode !== 'placement'){ const again = { ...ex, peeked: false }; if (again.options) again.options = shuffle(again.options); if (again.tiles) again.tiles = shuffle(again.tiles); Run.queue.push(again); }
  }
  setProgress();
  const ans = feedbackAnswer(ex);
  const lang = ex.lang;
  const glossOpts = a => S.settings.hints === 'off' ? {} : { gloss: true, en: a.en };
  const titles = res.ok ? (res.level === 'exact' ? ['Correct!', 'Nice!', 'Exactly.', 'Well done.', 'Spot on.'][Math.floor(Math.random() * 5)] : res.level === 'ai' ? 'Accepted' : res.level === 'form' ? 'Close enough' : 'Correct') : res.level === 'article' || res.level === 'form' ? 'Almost' : 'Not quite';
  const cmp = acceptedCompare(ex, res);
  const fb = h('div', { class: 'fb', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'fb-title' }, res.ok ? h('span', { class: 'fb-ic', html: IC.check }) : null, titles),
    res.note ? h('div', { class: 'fb-note' }, res.note) : null,
    res.heard && !cmp ? h('div', { class: 'heard' }, 'Heard: “' + res.heard + '”') : null,
    cmp ? compareView(ex, cmp) : null,
    res.diffs && res.diffs.length && (cmp || !res.ok || res.level === 'form') ? diffList(res.diffs) : null);
  if (!res.ok || res.level === 'ai') fb.append(reportLink(ex));
  const userWords = !res.ok && typeof Run.value === 'string' ? new Set(fold(norm(Run.value, ans && ans.target ? lang : 'en')).split(' ')) : null;
  if (ans && !cmp && (!res.ok || res.level !== 'exact' || ['bank-t2e', 'type-t2e', 'listen', 'mc-t2e', 'listen-mc', 'blank'].includes(ex.type))){
    if (!res.ok) fb.append(h('div', { class: 'fb-label' }, 'Correct answer'));
    if (ans.target) fb.append(h('div', { class: 'fb-ans row' }, h('span', { class: 'grow' }, ex.type === 'blank' ? sayText(ans.t, lang, glossOpts(ans)) : (ex.item.g && ex.kind === 'v' ? itemText(ex.item, lang) : sayText(ans.t, lang, { ...(userWords ? { miss: userWords } : {}), ...glossOpts(ans) }))), speakBtn(ans.t, lang)), h('div', { class: 'fb-sub' }, ans.en));
    else fb.append(h('div', { class: 'fb-ans' }, userWords ? markMissing(ans.en, userWords) : ans.en), h('div', { class: 'fb-sub row' }, h('span', { class: 'grow' }, itemText(ex.item, lang)), speakBtn(ans.t, lang)));
  }
  OV.foot.className = 'ov-foot ' + (res.ok ? 'ok' : 'bad');
  const cont = h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => { clearTimeout(Run.sayTimer); speakStop(); Run.pos++; nextEx(); } }, 'Continue');
  // Pip cheers a right answer, dances on a run of them, nods at one that counts but isn't word for word, and worries at a miss
  const run = res.ok && first && res.level === 'exact' && Run.combo >= 3;
  const fbPip = pip(!res.ok ? 'oops' : run ? 'dance' : res.level === 'exact' ? 'cheer' : 'happy', 58, { cls: 'fb-pip', tap: false, moveFor: run ? 2000 : 0 });
  if (res.ok && res.level !== 'exact') fbPip.rig.play('nod');
  OV.footIn.replaceChildren(fbPip, fb, cont);
  if (res.ok){ haptic(12); requestAnimationFrame(() => burstAt(fb.querySelector('.fb-ic'), { n: res.level === 'exact' ? 12 : 7, dist: 44 })); if (OV.prog){ OV.prog.classList.remove('glint'); void OV.prog.offsetWidth; OV.prog.classList.add('glint'); } }
  else haptic([18, 40, 18]);
  OV.bodyIn.querySelectorAll('button, input, textarea').forEach(el => { if (!el.classList.contains('icon-btn')) el.disabled = true; });
  if (!res.ok){ OV.bodyIn.classList.remove('shake'); void OV.bodyIn.offsetWidth; OV.bodyIn.classList.add('shake'); }
  setTimeout(() => cont.focus(), 30);
  sfx(res.ok ? 'ok' : 'bad');
  if (res.ok && first && res.level === 'exact' && [3, 5, 8, 12, 16].includes(Run.combo)) setTimeout(() => showCombo(Run.combo), 280);
  clearTimeout(Run.sayTimer);
  // the answer is read on its own question: never after Continue, and never over the next question
  if (S.settings.autoplay && ans && ex.type !== 'speak' && ex.type !== 'match') Run.sayTimer = setTimeout(() => { if (Run.cur === ex && Run.active) speak(cmp && ex.ansLang !== 'en' ? cmp.shown : ans.t, lang); }, S.settings.sfx ? 380 : 0);
}
/* an answer that counts without matching word for word: set it beside the answer it was matched to */
function acceptedCompare(ex, res){
  if (!res.ok || (res.level === 'exact' && !res.alt) || !ex.item || !ex.accepted || typeof Run.value !== 'string' || !Run.value.trim()) return null;
  const yours = Run.value.trim();
  const shown = res.alt ? closestAnswer(yours, mainForms(ex), ex.ansLang).match : res.match || closestAnswer(yours, ex.accepted, ex.ansLang).match;
  const d = answerDiff(yours, shown, ex.ansLang);
  return d.changes.length ? { yours, shown, d } : null;
}
function compareView(ex, c){
  const lang = ex.lang, target = ex.ansLang !== 'en';
  const rows = [h('span', { class: 'fb-k' }, ex.type === 'speak' ? 'Heard' : 'You wrote'),
    h('div', { class: 'fb-yours', lang: target ? LANGS[lang].tts : 'en' }, markParts(c.yours, c.d.yours)),
    h('span', { class: 'fb-k' }, 'Expected')];
  if (target) rows.push(h('div', { class: 'fb-ans row' }, h('span', { class: 'grow' }, sayText(c.shown, lang, { marks: c.d.answer })), speakBtn(c.shown, lang)), h('span'), h('div', { class: 'fb-sub' }, ex.item.e[0]));
  else rows.push(h('div', { class: 'fb-ans' }, markParts(c.shown, c.d.answer)), h('span'), h('div', { class: 'fb-sub row' }, h('span', { class: 'grow' }, itemText(ex.item, lang)), speakBtn(ex.item.t, lang)));
  return h('div', { class: 'fb-cmp' }, rows);
}
function diffList(diffs){
  return h('ul', { class: 'fb-diffs' }, diffs.map(d => h('li', null,
    d.yours ? h('mark', { class: 'dif' }, d.yours) : null, d.yours && d.expected ? ' → ' : null, d.expected ? h('b', null, d.expected) : null,
    d.note ? h('span', { class: 'muted' }, ' · ' + d.note) : null)));
}
function markParts(text, marks){
  const wrap = h('span'); let k = 0;
  for (const part of String(text).split(/(\s+)/)){
    if (!part) continue;
    if (/^\s+$/.test(part)){ wrap.append(part); continue; }
    wrap.append(marks[k++] ? h('mark', { class: 'dif' }, part) : part);
  }
  return wrap;
}
function markMissing(text, userWords){
  const wrap = h('span');
  for (const part of String(text).split(/(\s+)/)){
    if (!part) continue;
    if (/^\s+$/.test(part)){ wrap.append(part); continue; }
    const words = fold(norm(part, 'en')).split(' ').filter(Boolean);
    wrap.append(words.length && words.some(w => !userWords.has(w)) ? h('mark', { class: 'miss' }, part) : part);
  }
  return wrap;
}

/* ----- shared bits ----- */
function qLabel(t){ return h('div', { class: 'q-label' }, t); }
function targetPrompt(item, lang, autoplay, ex){
  if (autoplay && S.settings.autoplay) speak(item.t, lang);
  // a sentence can be tapped word by word for its meaning (a single word being tested can't: that would give the answer away)
  const tap = ex && ex.kind === 's' && glossOn(ex);
  const row = h('div', { class: 'prompt-row' }, speakBtn(item.t, lang), h('div', { class: 'prompt' }, tap ? sayText(item.t, lang, { gloss: true, en: item.e[0] }) : itemText(item, lang)));
  const nudge = tap ? hintLine(ex) : null;
  return nudge ? h('div', { class: 'prompt-wrap' }, row, nudge) : row;
}
function charBar(input, lang){
  return h('div', { class: 'chars', 'aria-label': 'Special characters' }, LANGS[lang].chars.map(c => {
    const b = h('button', { class: 'char', type: 'button', tabindex: '-1' }, c);
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.addEventListener('click', () => {
      const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, s) + c + input.value.slice(en);
      input.focus(); try { input.setSelectionRange(s + c.length, s + c.length); } catch (e) {}
      input.dispatchEvent(new Event('input'));
    });
    return b;
  }));
}
function answerBox(api, ansLang, placeholder){
  const ta = h('textarea', { class: 'ans', rows: '2', placeholder: placeholder || 'Type your answer', lang: ansLang === 'en' ? 'en' : LANGS[ansLang].tts, autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': 'Your answer' });
  ta.addEventListener('input', () => { api.set(ta.value); api.ready(!!ta.value.trim()); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); api.submit(); } });
  return ta;
}
function hintLink(ex, answer){
  const out = h('div', { class: 'hint-reveal', 'aria-live': 'polite' });
  const b = h('button', { class: 'linkish small', type: 'button', onclick: () => { ex.peeked = true; out.textContent = hintFor(answer); b.remove(); } }, ic('bulb'), 'Show a hint');
  return h('div', { class: 'hint-row' }, b, out);
}
function options(list, onPick, renderOpt){
  const box = h('div', { class: 'opts' });
  list.forEach((o, i) => {
    const b = h('button', { class: 'opt', type: 'button', style: '--i:' + i }, renderOpt ? renderOpt(o) : o);
    b.addEventListener('click', () => { box.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sfx('select'); onPick(o); });
    box.append(b);
  });
  return box;
}
function flyFrom(el, from){
  if (!el || !from || !el.animate || reduced()) return;
  const to = el.getBoundingClientRect(); const dx = from.left - to.left, dy = from.top - to.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.04)' }, { transform: 'translate(0,0) scale(1)' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.12)' });
}
function tileBoard(tokens, lang, onChange){
  const answer = h('div', { class: 'answer-lines', 'aria-label': 'Your sentence' });
  const pool = h('div', { class: 'pool' });
  const picked = [];
  const label = t => lang === 'en' ? t : plainTarget(t, lang);
  const tiles = tokens.map((t, i) => {
    const b = h('button', { class: 'tile', type: 'button', style: '--i:' + i }, label(t));
    b.addEventListener('click', () => { if (picked.includes(i)) return; const from = b.getBoundingClientRect(); picked.push(i); b.classList.add('used'); b.setAttribute('aria-hidden', 'true'); draw(true); flyFrom(answer.lastChild, from); sfx('pick'); haptic(5); if (lang !== 'en' && S.settings.autoplay) speak(t, lang); });
    return b;
  });
  function draw(added){
    answer.replaceChildren(...picked.map((j, k) => {
      const tb = h('button', { class: 'tile' + (added && k === picked.length - 1 && !Element.prototype.animate ? ' drop' : ''), type: 'button' }, label(tokens[j]));
      tb.addEventListener('click', () => { const from = tb.getBoundingClientRect(); const before = [...answer.children].map(x => x.getBoundingClientRect()); picked.splice(k, 1); tiles[j].classList.remove('used'); tiles[j].removeAttribute('aria-hidden'); draw(false); flyFrom(tiles[j], from); [...answer.children].forEach((x, n) => flyFrom(x, before[n >= k ? n + 1 : n])); sfx('drop'); haptic(5); });
      return tb;
    }));
    onChange(picked.map(j => tokens[j]));
  }
  pool.append(...tiles);
  return h('div', { class: 'board' }, answer, pool);
}

/* ----- renderers ----- */
const RENDER = {
  'mc-t2e'(ex, api){
    return h('div', { class: 'ex' }, qLabel('What does this mean?'), targetPrompt(ex.item, ex.lang, true, ex),
      options(ex.options, o => { api.set(o); api.ready(true); }));
  },
  'listen-mc'(ex, api){
    if (S.settings.autoplay) speak(ex.item.t, ex.lang);
    const big = speakBtn(ex.item.t, ex.lang, 'Play the word'); big.classList.add('big');
    return h('div', { class: 'ex' }, qLabel('Listen, then choose the meaning'),
      h('div', { class: 'listen-wrap' }, big, slowBtn(ex.item.t, ex.lang)),
      options(ex.options, o => { api.set(o); api.ready(true); }));
  },
  'mc-e2t'(ex, api){
    const byT = new Map(allLessons(ex.lang).flatMap(l => l.vocab).map(v => [v.t, v]));
    return h('div', { class: 'ex' }, qLabel('Choose the ' + LANGS[ex.lang].name), h('div', { class: 'prompt en' }, ex.item.e[0]),
      options(ex.options, o => { api.set(o); api.ready(true); speak(o, ex.lang); }, o => { const v = byT.get(o); return v ? itemText(v, ex.lang, { noTap: true }) : o; }));
  },
  'type-t2e'(ex, api){
    const box = answerBox(api, 'en', 'Type it in English');
    return h('div', { class: 'ex' }, qLabel('Translate into English'), targetPrompt(ex.item, ex.lang, true, ex), box, hintLink(ex, ex.item.e[0]));
  },
  'type-e2t'(ex, api){
    const box = answerBox(api, ex.lang, 'Type it in ' + LANGS[ex.lang].name);
    const hint = ex.item.g ? (ex.lang === 'de' ? 'Include der, die or das.' : 'Include el, la, los or las.') : null;
    return h('div', { class: 'ex' }, qLabel('Write this in ' + LANGS[ex.lang].name), h('div', { class: 'prompt en' }, ex.item.e[0]), hint ? h('p', { class: 'hint' }, hint) : null, box, charBar(box, ex.lang), hintLink(ex, ex.item.t));
  },
  'bank-e2t'(ex, api){
    return h('div', { class: 'ex' }, qLabel('Build it in ' + LANGS[ex.lang].name), h('div', { class: 'prompt en' }, ex.item.e[0]),
      tileBoard(ex.tiles, ex.lang, toks => { api.set(toks.join(' ')); api.ready(toks.length > 0); }));
  },
  'bank-t2e'(ex, api){
    return h('div', { class: 'ex' }, qLabel('Build the English'), targetPrompt(ex.item, ex.lang, true, ex),
      tileBoard(ex.tiles, 'en', toks => { api.set(toks.join(' ')); api.ready(toks.length > 0); }));
  },
  listen(ex, api){
    if (S.settings.autoplay) speak(ex.item.t, ex.lang);
    const wrap = h('div', { class: 'ex' });
    const holder = h('div');
    const switchBtn = h('button', { class: 'linkish', type: 'button', style: 'align-self:center', onclick: () => { ex.mode = ex.mode === 'tiles' ? 'type' : 'tiles'; draw(); } });
    const draw = () => {
      api.set(''); api.ready(false);
      if (ex.mode === 'tiles') holder.replaceChildren(tileBoard(ex.tiles, ex.lang, toks => { api.set(toks.join(' ')); api.ready(toks.length > 0); }));
      else { const box = answerBox(api, ex.lang, 'Type what you hear'); holder.replaceChildren(box, h('div', { style: 'height:8px' }), charBar(box, ex.lang)); }
      switchBtn.textContent = ex.mode === 'tiles' ? 'Type it instead' : 'Use word tiles instead';
    };
    const big = speakBtn(ex.item.t, ex.lang, 'Play the sentence'); big.classList.add('big');
    wrap.append(qLabel('Listen and write what you hear'), h('div', { class: 'listen-wrap' }, big, slowBtn(ex.item.t, ex.lang)), holder, switchBtn);
    draw();
    return wrap;
  },
  blank(ex, api){
    const gap = h('span', { class: 'gap' }, ' ');
    const [pre, post] = ex.blank.t.split('___');
    const tap = glossOn(ex), en = ex.blank.e;
    const part = s => tap && s.trim() ? sayText(s, ex.lang, { gloss: true, en }) : s;
    // once the hints have faded the translation waits behind a tap instead of sitting under the sentence
    const fade = en && hintMode(ex.lesson.level) === 'off';
    const trans = !en ? null : fade ? h('div', { class: 'hint-row' }, h('button', { class: 'linkish small', type: 'button', onclick: e => { const b = e.currentTarget; b.replaceWith(h('p', { class: 'muted' }, en)); } }, ic('bulb'), 'Show the translation')) : h('p', { class: 'muted' }, en);
    return h('div', { class: 'ex' }, qLabel('Fill in the blank'), h('div', { class: 'gap-sent' }, part(pre), gap, part(post)), trans, tap ? hintLine(ex) : null,
      h('div', { class: 'chips gap-opts' }, ex.options.map((o, i) => {
        const b = h('button', { class: 'tile', type: 'button', style: '--i:' + i }, o);
        b.addEventListener('click', () => { gap.textContent = o; gap.classList.remove('filled'); void gap.offsetWidth; gap.classList.add('filled'); b.parentNode.querySelectorAll('.tile').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sfx('select'); api.set(o); api.ready(true); });
        return b;
      })));
  },
  match(ex, api){
    const left = shuffle(ex.items), right = shuffle(ex.items);
    let selL = null, selR = null, done = 0, misses = 0;
    const grid = h('div', { class: 'match' });
    const lb = left.map(it => h('button', { class: 'opt', type: 'button' }, itemText(it, ex.lang, { noTap: true })));
    const rb = right.map(it => h('button', { class: 'opt', type: 'button' }, it.e[0]));
    const tryPair = () => {
      if (selL == null || selR == null) return;
      const a = left[selL], b = right[selR], lbtn = lb[selL], rbtn = rb[selR];
      if (a === b){
        [lbtn, rbtn].forEach(x => { x.classList.remove('sel'); x.classList.add('m-hit'); burstAt(x, { n: 6, dist: 30, vars: ['--ok', '--line'] }); setTimeout(() => { x.classList.remove('m-hit'); x.classList.add('m-ok'); }, 420); });
        done++; sfx('pop'); haptic(10);
        if (done === ex.items.length) setTimeout(() => api.complete({ ok: true, level: misses ? 'near' : 'exact', note: misses ? misses + ' ' + plural(misses, 'mismatch', 'mismatches') + ' along the way.' : 'Every pair on the first try.' }), 260);
      } else { misses++; haptic([15, 30, 15]); [lbtn, rbtn].forEach(x => { x.classList.add('m-bad'); x.classList.remove('sel'); setTimeout(() => x.classList.remove('m-bad'), 380); }); }
      selL = selR = null;
    };
    const gone = b => b.classList.contains('m-hit') || b.classList.contains('m-ok');
    lb.forEach((b, i) => b.addEventListener('click', () => { if (gone(b)) return; lb.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selL = i; speak(left[i].t, ex.lang); tryPair(); }));
    rb.forEach((b, i) => b.addEventListener('click', () => { if (gone(b)) return; rb.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selR = i; tryPair(); }));
    for (let i = 0; i < left.length; i++) grid.append(lb[i], rb[i]);
    return h('div', { class: 'ex' }, qLabel('Match the pairs'), grid);
  },
  form(ex, api){
    const typed = ex.mode === 'type';
    const head = [qLabel(typed ? 'Write the form' : 'Choose the form'), h('p', { class: 'muted form-cap' }, ex.cap), h('div', { class: 'prompt form-prompt', lang: LANGS[ex.lang].tts }, ex.label + ' …')];
    if (typed){ const box = answerBox(api, ex.lang, 'Type the form'); return h('div', { class: 'ex' }, ...head, box, charBar(box, ex.lang)); }
    return h('div', { class: 'ex' }, ...head, options(ex.options, o => { api.set(o); api.ready(true); speak(o, ex.lang); }));
  },
  speak(ex, api){
    const wrap = h('div', { class: 'ex' }, qLabel('Say this out loud'), targetPrompt(ex.item, ex.lang, false, ex), h('p', { class: 'muted' }, ex.item.e[0]));
    const heard = h('p', { class: 'heard', 'aria-live': 'polite' });
    if (SR && micUsable()){
      const mic = h('button', { class: 'mic-btn', type: 'button', 'aria-label': 'Tap and speak', html: IC.mic });
      mic.addEventListener('click', async () => {
        heard.textContent = 'Listening…'; mic.classList.add('live'); mic.disabled = true;
        try {
          const text = await listen(ex.lang, t => { heard.textContent = t ? '“' + t + '”' : 'Listening…'; });
          heard.textContent = '“' + text + '”'; api.set(text); api.ready(true); api.submit();
        } catch (er){
          mic.disabled = false; mic.classList.remove('live');
          if (Mic.state === 'blocked'){ heard.textContent = ''; mic.parentNode.replaceWith(dictationBox(ex, api, true)); }
          else heard.textContent = 'Didn’t catch that. Tap the mic and try again.';
        }
      });
      wrap.append(h('div', { class: 'listen-wrap' }, mic), heard);
    } else wrap.append(dictationBox(ex, api, false));
    return wrap;
  }
};
function dictationBox(ex, api, blocked){
  const box = answerBox(api, ex.lang, 'Tap here, then tap the mic on your keyboard');
  box.setAttribute('autocorrect', 'on');
  return h('div', { class: 'dictate' },
    h('div', { class: 'dictate-coach' }, h('span', { class: 'coach-mic', html: IC.mic, 'aria-hidden': 'true' }),
      h('div', null, h('strong', null, blocked ? 'Use your keyboard’s microphone' : 'Speak with dictation'),
        h('p', { class: 'small muted' }, 'Tap the box, switch your keyboard to ' + LANGS[ex.lang].keyboard + ' with the globe key, then tap the keyboard’s mic and say the sentence.'))),
    box);
}

function badgeStrip(ids){
  if (!ids || !ids.length) return null;
  return h('div', { class: 'badge-strip' }, h('span', { class: 'eyebrow' }, ids.length > 1 ? ids.length + ' badges unlocked' : 'Badge unlocked'),
    h('div', { class: 'badge-row' }, ids.map((id, i) => { const b = BADGE_MAP.get(id); return h('div', { class: 'badge-new', style: '--i:' + i }, medal(b.icon, true, 64), h('b', null, b.name), h('span', { class: 'small muted' }, b.desc)); })));
}
function questStrip(ids){
  if (!ids || !ids.length) return null;
  const all = questIds().every(questDone) && !dayRec().chest;
  return h('div', { class: 'quest-strip' }, h('span', { class: 'eyebrow' }, 'Quest complete'),
    h('div', { class: 'chips center' }, ids.map(id => h('span', { class: 'chip static ok' }, ic('check'), QUESTS[id].label))),
    all ? h('p', { class: 'small muted' }, 'All three done. Your chest is waiting on the Learn tab.') : null);
}


/* ----- finish ----- */
function finishRun(){
  Run.finished = true;
  if (Run.mode === 'placement') return finishPlacement();
  const lang = Run.lang;
  const uniq = [...Run.first.values()];
  const firstOk = uniq.filter(x => x !== 'wrong').length;
  const acc = uniq.length ? firstOk / uniq.length : 1;
  const flawless = uniq.length > 0 && uniq.every(x => x === 'exact');
  let newItems = [], xp = Run.xp, title, top, levelUp = null, h1o = null, subo = null, cpPass = false;
  const before = questSnapshot();
  if (Run.mode === 'lesson'){
    const l = Run.lesson; const cards = cardsFor(lang);
    const wasComplete = l.core ? levelComplete(lang, l.level) : true;
    const add = (kind, n) => { for (let i = 0; i < n; i++){ const key = itemKey(l, kind, i); if (!cards[key]){ cards[key] = { ef: 2.5, n: 0, iv: 0, due: addDays(today(), 1), last: today(), ts: Date.now() }; newItems.push(kind === 'v' ? l.vocab[i] : null); } } };
    add('v', l.vocab.length); add('s', l.sentences.length);
    xp += XP.lesson + (acc === 1 ? XP.perfectBonus : 0);
    const prev = S.langs[lang].done[l.id];
    S.langs[lang].done[l.id] = { at: today(), acc: Math.max(acc, prev && prev.acc || 0), times: (prev && prev.times || 0) + 1 };
    if (l.core && !wasComplete && levelComplete(lang, l.level)) levelUp = l.level;
    title = l.title; top = levelUp ? levelUp + ' complete' : 'Lesson complete';
    bumpQuest('lessons', 1); if (acc >= 0.9) bumpQuest('acc', 1);
  } else if (Run.mode === 'checkpoint'){
    const u = Run.unit, L = S.langs[lang], prev = L.cp[u.title], pass = acc >= CHECKPOINT.pass;
    xp += pass && !(prev && prev.pass) ? XP.checkpoint : XP.review;
    L.cp[u.title] = { at: today(), acc: Math.max(acc, prev && prev.acc || 0), pass: !!(pass || (prev && prev.pass)) };
    title = u.title; top = pass ? 'Checkpoint passed' : 'Checkpoint'; cpPass = pass;
    h1o = pass ? 'Checkpoint passed.' : 'Not quite yet.';
    subo = pass ? 'You know this unit. The mistakes you made are on your “Fix my mistakes” list.' : 'You need ' + Math.round(CHECKPOINT.pass * 100) + '% to pass. Look back at the unit’s lessons and try again whenever you like.';
    bumpQuest('reviews', uniq.length);
  } else {
    xp += XP.review; title = uniq.length + ' ' + plural(uniq.length, 'item') + ' ' + (Run.mode === 'review' ? 'reviewed' : Run.mode === 'mistakes' ? 'fixed up' : 'practiced');
    top = Run.mode === 'review' ? 'Review complete' : Run.mode === 'mistakes' ? 'Mistakes practiced' : Run.mode === 'forms' ? 'Forms practiced' : 'Practice complete';
    bumpQuest('reviews', uniq.length);
  }
  bumpQuest('combo', Run.bestCombo, true);
  S.stats.bestCombo = Math.max(S.stats.bestCombo || 0, Run.bestCombo);
  if (Run.reviewsRight) S.stats.reviewsRight = (S.stats.reviewsRight || 0) + Run.reviewsRight;
  addXP(xp, lang);
  const badges = checkBadges({ flawless: Run.mode === 'lesson' && flawless, practiced: true });
  const quests = questDiff(before); touch('core');
  const nextLv = levelUp ? LEVELS[LEVELS.indexOf(levelUp) + 1] : null;
  const vocabChips = newItems.filter(Boolean).slice(0, 10);
  const st = streakInfo();
  runHead(LANGS[lang].name);
  showComplete({
    lang, top, title, gold: !!levelUp || cpPass, xp, acc,
    h1: h1o || (levelUp ? 'Level ' + levelUp + ' complete.' : acc === 1 ? 'Flawless.' : acc >= 0.8 ? 'Great work.' : 'Good practice.'),
    sub: subo || (levelUp ? (nextLv ? 'Next on your route: ' + nextLv + ' · ' + LEVEL_NAME[nextLv] + '.' : 'You’ve reached the end of the route. Your tutor can keep writing lessons for you.') : null),
    third: Run.bestCombo >= 3 ? [Run.bestCombo, 'best run in a row'] : [st.count, plural(st.count, 'day') + ' streak'],
    extra: vocabChips.length ? h('div', { class: 'learned' }, h('span', { class: 'eyebrow' }, 'Added to your review deck'), h('div', { class: 'chips' }, vocabChips.map((v, i) => h('span', { class: 'chip static', style: '--i:' + i }, itemText(v, lang))))) : null,
    badges, quests, onDone: () => endRun(),
    rate: Run.mode === 'lesson' ? { lessonId: Run.lesson.id } : null
  });
}
/* shared "you did it" screen for lessons, reviews and stories */
function showComplete(o){
  const lang = o.lang; const st = streakInfo();
  const dateStr = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const xpEl = h('span', { class: 'num' }, '+0');
  const cheer = pickSay(lang, 'cheer');
  swapBody(h('div', { class: 'complete' },
    h('div', { class: 'stamp-wrap' },
      h('div', { class: 'stamp' + (o.gold ? ' gold' : ''), 'aria-hidden': 'true' }, h('span', { class: 's-top' }, o.top), h('span', { class: 's-mid' }, o.title), h('span', { class: 's-bot' }, dateStr)),
      pip(o.gold || o.acc === 1 ? 'dance' : 'cheer', 78, { cls: 'complete-pip', say: cheer, mouth: true, moveFor: 3200, lang })),
    h('h1', null, o.h1),
    o.sub ? h('p', { class: 'muted' }, o.sub) : null,
    h('div', { class: 'tiles3' },
      h('div', { class: 'stat' }, xpEl, h('span', { class: 'lbl' }, 'XP')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, Math.round(o.acc * 100) + '%'), h('span', { class: 'lbl' }, o.accLabel || 'first-try accuracy')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, o.third[0]), h('span', { class: 'lbl' }, o.third[1]))),
    questStrip(o.quests),
    badgeStrip(o.badges),
    o.extra || null,
    o.rate ? quickRating(o.rate) : null,
    h('p', { class: 'muted small' }, (todayXP() >= S.settings.goal ? 'Daily goal reached · streak ' + st.count + ' ' + plural(st.count, 'day') : (S.settings.goal - todayXP()) + ' XP to go for today’s goal') + ' · ' + (Remote.db && !Remote.readOnly ? 'saved to your account' : 'saved on this device'))));
  OV.foot.className = 'ov-foot';
  const btn = h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => o.onDone() }, 'Continue');
  OV.footIn.replaceChildren(btn); setTimeout(() => btn.focus(), 30);
  sfx(o.gold || (o.badges && o.badges.length) ? 'level' : 'done'); haptic([10, 50, 10]);
  countUp(xpEl, o.xp);
  if (o.quests && o.quests.length) setTimeout(() => sfx('quest'), 700);
  if (o.badges && o.badges.length) setTimeout(() => sfx('badge'), 1100);
  confetti(OV.root, o.gold ? 180 : 110);
  if (S.settings.autoplay) setTimeout(() => { if (OV.root) speak(cheer, lang, false, mascot()); }, 900);
}

function countUp(el, to, ms){
  if (reduced()){ el.textContent = '+' + to; return; }
  const t0 = performance.now(); ms = ms || 900;
  const step = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = '+' + Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function confetti(host, count){
  if (!host || reduced()) return;
  const cv = h('canvas', { class: 'confetti', 'aria-hidden': 'true' }); host.append(cv);
  const W = host.clientWidth || 360, H = host.clientHeight || 640, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext && cv.getContext('2d'); if (!ctx){ cv.remove(); return; }
  ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--line', '--der', '--die', '--das', '--es', '--de'].map(v => cs.getPropertyValue(v).trim() || '#999');
  const P = [...Array(count)].map(() => ({ x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.26, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 4, r: Math.random() * 7 + 4, c: colors[Math.random() * colors.length | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, rect: Math.random() < 0.6 }));
  const t0 = performance.now(); let last = t0;
  const frame = t => {
    const dt = Math.min(32, t - last) / 16; last = t;
    ctx.clearRect(0, 0, W, H);
    for (const p of P){ p.vy += 0.3 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - (t - t0) / 2600); ctx.fillStyle = p.c;
      if (p.rect) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); }
    if (t - t0 < 2600) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

