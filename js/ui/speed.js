"use strict";
/* ===================== SPEED ROUND (Review) =====================
   60 seconds of quick word questions from your own learned words, alternating "what does it mean" and "how do you say it".
   Your best per language is S.stats['speed-<lang>'] (stats merge by maximum). It never moves a review card; its XP is capped
   like a practice session's (SPEED.xpCap per round, plus XP.review). */
const Speed = { open: false };
function speedPool(lang){
  const seen = new Set(), out = [];
  for (const e of learnedEntries(lang, 'v')){ const t = e.item.t, en = (e.item.e || [])[0]; if (!t || !en || seen.has(t)) continue; seen.add(t); out.push({ t, en, item: e.item }); }
  return out;
}
function speedQ(pool, n, recent){
  const k = x => fold(norm(x.en, 'en')), acc = x => (x.item.e || []).map(e => fold(norm(e, 'en')));
  const fresh = pool.filter(x => !recent.includes(x.t)), from = shuffle((fresh.length ? fresh : pool).slice()), toEn = n % 2 === 0;
  let it = from[0], others = [];
  for (const cand of from){   // a word that can't get three fair distractors gives way to another
    const mine = acc(cand), got = [];
    for (const x of shuffle(pool.slice())){ if (got.length === 3) break; if (x.t !== cand.t && k(x) !== k(cand) && !mine.includes(k(x)) && !acc(x).includes(k(cand)) && !got.some(o => k(o) === k(x))) got.push(x); }
    it = cand; others = got; if (got.length === 3) break;
  }
  const opts = shuffle([it, ...others]);
  return { it, toEn, prompt: toEn ? it.t : it.en, options: opts.map(o => toEn ? o.en : o.t), correct: toEn ? it.en : it.t };
}
function startSpeed(){
  const lang = S.settings.lang, pool = speedPool(lang);
  if (pool.length < SPEED.min) return;
  clearInterval(Speed.timer); clearTimeout(Speed.nextT);
  Object.assign(Speed, { open: true, lang, pool, n: 0, score: 0, answered: 0, combo: 0, bestCombo: 0, recent: [], locked: false, paused: false, over: false, ends: Date.now() + SPEED.secs * 1000, before: questSnapshot() });
  openOverlay('speed');
  OV.head.replaceChildren(
    h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => endSpeed() }),
    h('div', { class: 'progress speed-time', role: 'progressbar', 'aria-label': 'Time left' }, Speed.bar = h('i')),
    Speed.secsEl = h('span', { class: 'speed-secs' }, String(SPEED.secs)));
  sfx('open');
  speedNext();
  Speed.timer = setInterval(speedTick, 100);
}
/* draws the question in Speed.q; no slide, so the cards don't move from one question to the next */
function speedShow(){
  const q = Speed.q, lang = Speed.lang;
  swapBody(h('div', { class: 'speed' },
    h('div', { class: 'row speed-top' }, h('span', { class: 'speed-score' }, 'Score ' + Speed.score), Speed.combo >= 3 ? h('span', { class: 'speed-combo' }, Speed.combo + ' in a row') : null),
    h('div', { class: 'prompt speed-prompt', lang: q.toEn ? LANGS[lang].tts : 'en' }, q.prompt),
    options(q.options, o => speedPick(o), null, { cls: 'speed' })), true);
}
function speedNext(){
  const lang = Speed.lang;
  Speed.q = speedQ(Speed.pool, Speed.n++, Speed.recent);
  Speed.recent.push(Speed.q.it.t); Speed.recent = Speed.recent.slice(-5);
  speedShow();
  if (Speed.q.toEn && S.settings.autoplay) speak(Speed.q.it.t, lang);
}
function speedPick(o){
  if (!Speed.open || Speed.over || Speed.paused || Speed.locked) return;
  Speed.locked = true; Speed.answered++;
  const q = Speed.q, box = OV.body && OV.body.querySelector('.opts'), sel = box && box.querySelector('.opt.sel');
  const after = ms => { Speed.nextT = setTimeout(() => { Speed.locked = false; speedNext(); }, ms); };
  if (o === q.correct){
    Speed.score++; Speed.combo++; Speed.bestCombo = Math.max(Speed.bestCombo, Speed.combo);
    if (sel){ sel.classList.remove('sel'); sel.classList.add('right'); }
    sfx('ok', 1, Math.pow(2, Math.min(Speed.combo - 1, 7) / 12)); haptic('select');
    after(SPEED.rightMs);
  } else {
    Speed.combo = 0;
    if (sel){ sel.classList.remove('sel'); sel.classList.add('wrong'); }
    const good = box && [...box.querySelectorAll('.opt')].find(b => b.textContent === q.correct); if (good) good.classList.add('right');
    sfx('bad'); haptic('bad');
    after(SPEED.wrongMs);
  }
}
function speedTick(){
  if (!Speed.open || Speed.over) return;
  const left = Speed.ends - Date.now();
  if (document.hidden){ speedHold(left); return; }
  Speed.bar.style.width = Math.max(0, Math.min(100, left / (SPEED.secs * 1000) * 100)) + '%';
  Speed.secsEl.textContent = Math.max(0, Math.ceil(left / 1000));
  if (left <= 0) speedEnd();
}
/* the page went to the background: stop the clock and wait behind a Resume button */
function speedHold(left){
  if (!Speed.open || Speed.over || Speed.paused) return;
  Speed.left = Math.max(1, left == null ? Speed.ends - Date.now() : left); Speed.paused = true;
  clearInterval(Speed.timer); clearTimeout(Speed.nextT);
  Speed.owed = Speed.locked; Speed.locked = false;   // an answer that was showing its result moves on at Resume
}
function speedPaused(){
  swapBody(h('div', { class: 'speed paused' }, h('h2', null, 'Paused'), h('p', { class: 'muted' }, 'The clock is stopped. Your score is safe.'),
    h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => {
      Speed.paused = false; Speed.ends = Date.now() + Speed.left;
      if (Speed.owed) speedNext(); else speedShow();
      Speed.owed = false; clearInterval(Speed.timer); Speed.timer = setInterval(speedTick, 100);
    } }, 'Resume')), true);
}
document.addEventListener('visibilitychange', () => {
  if (!Speed.open || Speed.over) return;
  if (document.hidden) speedHold();
  else if (Speed.paused) speedPaused();
});
function speedEnd(){
  if (!Speed.open || Speed.over) return;
  Speed.over = true; clearInterval(Speed.timer); clearTimeout(Speed.nextT);
  const key = 'speed-' + Speed.lang, best = S.stats[key] || 0, isBest = Speed.score > best;
  if (Speed.score) S.stats[key] = Math.max(best, Speed.score);
  const xp = Speed.score ? Math.min(Speed.score, SPEED.xpCap) + XP.review : 0;
  if (xp) addXP(xp, Speed.lang);
  bumpQuest('reviews', Speed.answered); bumpQuest('combo', Speed.bestCombo, true); S.stats.bestCombo = Math.max(S.stats.bestCombo || 0, Speed.bestCombo);
  const badges = checkBadges({ practiced: true }), quests = questDiff(Speed.before); touch('core');
  showComplete({
    lang: Speed.lang, top: 'Speed round', title: Speed.score + ' right', gold: isBest && Speed.score > 0, xp,
    acc: Speed.answered ? Speed.score / Speed.answered : 0, accLabel: 'right',
    h1: isBest && Speed.score ? 'New best!' : 'Time!',
    sub: isBest && Speed.score ? 'Your best speed round in ' + LANGS[Speed.lang].name + ' so far.' : 'Your best is ' + best + '.',
    third: [Speed.bestCombo, 'best run in a row'], badges, quests,
    more: [{ id: 'again', label: 'Play again', run: () => startSpeed() }], onDone: () => endSpeed()
  });
}
function endSpeed(){
  clearInterval(Speed.timer); clearTimeout(Speed.nextT); Speed.open = false; Speed.over = true;
  closeOverlay(); UI.animate = true; render();
}
