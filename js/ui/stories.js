"use strict";
/* ===================== STORIES ===================== */
const Story = { open: false };
function storyMinutes(st){ return Math.max(2, Math.round(st.items.length * 0.35)); }
function viewStories(){
  const lang = S.settings.lang; const list = allStories().filter(s => s.lang === lang);
  const read = list.filter(s => S.langs[lang].stories[s.id]).length;
  const cl = LEVELS.indexOf(currentLevel(lang));
  const v = h('div', { class: 'view' }, topBar(),
    h('section', { class: 'stories-intro' },
      h('div', { class: 'grow' }, h('h1', null, 'Stories'), h('p', { class: 'muted' }, 'Short scenes from ' + ({ de: 'a Berlin street', es: 'a Mexico City neighborhood', it: 'a Rome neighborhood' }[lang]) + '. Tap any word for its meaning, hear every line, and answer as you go.')),
      pip('listen', 70, { cls: 'stories-pip' })),
    h('div', { class: 'cast-row' }, castOf(lang).map((id, i) => h('div', { class: 'cast-chip', style: '--i:' + i }, avatar(id, 46), h('div', { class: 'cc-text' }, h('b', null, CAST[id].name), h('span', { class: 'small muted' }, CAST[id].role))))),
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, read + ' of ' + list.length + ' read'), h('span', { class: 'spacer' }), h('span', { class: 'bar-mini wide', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(read / list.length * 100) + '%' }))));
  const grid = h('div', { class: 'story-grid' });
  list.forEach((st, i) => {
    const rec = S.langs[lang].stories[st.id]; const ahead = LEVELS.indexOf(st.level) > cl + 1;
    grid.append(h('button', { class: 'story-card' + (rec ? ' done' : '') + (ahead ? ' ahead' : ''), type: 'button', style: '--i:' + i, onclick: () => ahead && !rec ? confirmStory(st) : openStory(st.id) },
      storyArt(st, ''),
      h('span', { class: 'sc-body' },
        h('span', { class: 'row' }, h('span', { class: 'lvl-badge' }, st.level), rec ? h('span', { class: 'small good sc-done' }, ic('check'), 'Read' + (rec.score === 1 ? ' · perfect' : '')) : h('span', { class: 'small muted' }, 'about ' + storyMinutes(st) + ' min'), h('span', { class: 'spacer' }), h('span', { class: 'av-stack' }, st.cast.map(id => avatar(id, 28)))),
        h('span', { class: 'st-title', lang: LANGS[lang].tts }, st.title),
        h('span', { class: 'st-meta' }, st.en))));
  });
  v.append(grid);
  return v;
}
function confirmStory(st){
  sheet('A bit ahead of you', h('div', { class: 'row', style: 'align-items:flex-start' }, pip('point', 56, { tap: false }), h('p', { class: 'grow' }, '“' + st.title + '” is a ' + st.level + ' story. Give it a try. Tap any word for help, and every line has a translation.')),
    [{ label: 'Not now' }, { label: 'Read it', primary: true, run: () => { openStory(st.id); } }]);
}
function openStory(id){
  const st = storyById(id); if (!st) return;
  Object.assign(Story, { open: true, st, lang: st.lang, pos: 0, qs: 0, firstTry: 0, finished: false, saved: new Set() });
  openOverlay('story'); recWarm(st.lang, st.items.filter(it => it.t).map(it => it.t));
  const close = h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => {
    if (Story.finished || Story.pos === 0) return endStory();
    sheet('Leave this story?', h('p', null, 'You can come back to it any time.'), [{ label: 'Keep reading', primary: true }, { label: 'Leave', run: () => { endStory(); } }]);
  } });
  OV.prog = h('i');
  OV.head.replaceChildren(close, h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Story progress' }, OV.prog), h('span', { class: 'icon-spacer' }));
  Story.list = h('div', { class: 'story-lines', 'aria-live': 'polite' });
  swapBody([h('div', { class: 'story-head' }, storyArt(st, 'big'), h('span', { class: 'eyebrow' }, st.level + ' · ' + LANGS[st.lang].name + ' story'), h('h1', { lang: LANGS[st.lang].tts }, st.title), h('p', { class: 'muted' }, st.en),
    h('div', { class: 'tags' }, st.cast.map(cid => h('span', { class: 'cast-tag' }, avatar(cid, 26), CAST[cid].name)))), Story.list]);
  storyFoot('Start reading', () => storyNext());
  setStoryProgress();
}
function endStory(){ Story.open = false; closeOverlay(); UI.animate = true; render(); }
function setStoryProgress(){ if (OV.prog && Story.st) OV.prog.style.width = (Story.pos / Story.st.items.length * 100).toFixed(1) + '%'; }
function storyFoot(label, run, disabled, cls){
  OV.foot.className = 'ov-foot' + (cls ? ' ' + cls : '');
  const b = h('button', { class: 'btn btn-primary btn-wide', type: 'button', disabled: !!disabled, onclick: run }, label);
  OV.footIn.replaceChildren(b);
  return b;
}
function scrollStory(node){ requestAnimationFrame(() => { if (!OV.body || !node) return; const top = node.offsetTop - 24; OV.body.scrollTo({ top: Math.max(0, top - OV.body.clientHeight * 0.35), behavior: reduced() ? 'auto' : 'smooth' }); }); }
function storyNext(){
  const st = Story.st; if (!st) return;
  if (Story.pos >= st.items.length) return finishStory();
  const it = st.items[Story.pos]; Story.pos++; setStoryProgress();
  if (it.q) return storyQuestion(it);
  const node = storyLine(it, st);
  Story.list.append(node); scrollStory(node); sfx('page');
  if (S.settings.autoplay) speak(it.t, st.lang, false, CAST[it.who]);
  storyFoot(Story.pos >= st.items.length ? 'Finish' : 'Continue', () => storyNext());
}
function storyLine(it, st){
  const side = st.cast.indexOf(it.who) % 2 === 0 ? 'l' : 'r';
  const vo = CAST[it.who];
  const en = h('div', { class: 'sl-en' }, it.e); en.hidden = true;
  const tr = h('button', { class: 'chip-btn', type: 'button', 'aria-pressed': 'false', onclick: () => { en.hidden = !en.hidden; tr.setAttribute('aria-pressed', String(!en.hidden)); sfx('flip'); } }, ic('translate'), 'Translate');
  const key = st.id + '|' + st.items.indexOf(it);
  const save = h('button', { class: 'chip-btn', type: 'button', disabled: Story.saved.has(key), onclick: () => { saveStoryLine(it, st, key); save.disabled = true; save.replaceChildren(ic('check'), 'Saved'); toast('Saved to your review deck'); } }, ic('bookmark'), Story.saved.has(key) ? 'Saved' : 'Save');
  return h('div', { class: 'sline ' + side },
    avatar(it.who, 40, 'sl-av'),
    h('div', { class: 'bubble' }, h('span', { class: 'who' }, vo.name),
      h('div', { class: 't' }, sayText(it.t, st.lang, { gloss: true, en: it.e })), en,
      h('div', { class: 'sl-act' }, speakBtn(it.t, st.lang, 'Play line', vo), slowBtn(it.t, st.lang, vo), tr, save)));
}
function saveStoryLine(it, st, key){
  const L = S.langs[st.lang];
  if (Object.values(L.custom).some(c => c.t === it.t)){ Story.saved.add(key); return; }
  const id = 'c-' + st.lang + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  L.custom[id] = { t: it.t, e: [it.e], alt: [], level: st.level };
  L.cards[id + '|s|0'] = { ef: 2.5, n: 0, iv: 0, due: addDays(today(), 1), last: today(), ts: Date.now() };
  Story.saved.add(key); touch(st.lang);
}
function storyQuestion(it){
  const opts = shuffle(it.o); let tries = 0, picked = null; Story.qs++;
  const box = h('div', { class: 'squiz' }, h('span', { class: 'eyebrow' }, ic('bulb'), 'Quick check'), h('h3', null, it.q));
  let checkBtn;
  const btns = opts.map((o, i) => {
    const b = h('button', { class: 'opt', type: 'button', style: '--i:' + i }, o);
    b.addEventListener('click', () => { if (b.disabled) return; btns.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); picked = o; checkBtn.disabled = false; sfx('select'); });
    return b;
  });
  box.append(h('div', { class: 'opts' }, btns));
  Story.list.append(box); scrollStory(box);
  const check = () => {
    if (!picked) return;
    const btn = btns.find(b => b.textContent === picked);
    if (picked === it.o[0]){
      if (!tries) Story.firstTry++;
      btn.classList.remove('sel'); btn.classList.add('right'); btns.forEach(b => { b.disabled = true; });
      sfx('ok'); haptic(12); burstAt(btn, { n: 10, dist: 40 });
      box.classList.add('solved');
      box.append(h('div', { class: 'squiz-ok' }, pip('cheer', 40, { tap: false }), h('b', null, pickSay(Story.lang, 'cheer')), tries ? h('span', { class: 'small muted' }, ' Got it on try ' + (tries + 1) + '.') : null));
      storyFoot(Story.pos >= Story.st.items.length ? 'Finish' : 'Continue', () => storyNext(), false, 'ok');
    } else {
      tries++; btn.classList.remove('sel'); btn.classList.add('wrong'); btn.disabled = true; picked = null; checkBtn.disabled = true;
      sfx('bad'); haptic([18, 40, 18]);
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    }
  };
  checkBtn = storyFoot('Check', check, true);
}
function finishStory(){
  const st = Story.st, lang = st.lang; Story.finished = true;
  const L = S.langs[lang]; const prev = L.stories[st.id];
  const score = Story.qs ? Story.firstTry / Story.qs : 1;
  const before = questSnapshot();
  L.stories[st.id] = { at: today(), score: Math.max(score, prev && prev.score || 0), times: (prev && prev.times || 0) + 1 };
  bumpQuest('stories', 1);
  const xp = XP.story + (score === 1 ? XP.storyPerfect : 0);
  addXP(xp, lang); touch(lang);
  const badges = checkBadges({ practiced: true });
  const quests = questDiff(before); touch('core');
  OV.head.replaceChildren(h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => endStory() }), h('div', { class: 'ov-title grow' }, LANGS[lang].name), h('span', { class: 'icon-spacer' }));
  const lines = st.items.filter(x => x.who).length;
  showComplete({
    lang, top: 'Story complete', title: st.title, xp, acc: score, accLabel: 'questions first try',
    h1: score === 1 ? 'You understood everything.' : 'Nicely read.',
    third: [lines, 'lines read'],
    extra: h('div', { class: 'learned' }, h('span', { class: 'eyebrow' }, 'Starring'), h('div', { class: 'tags center' }, st.cast.map(id => h('span', { class: 'cast-tag' }, avatar(id, 30), CAST[id].name)))),
    badges, quests, onDone: () => endStory(),
    rate: { storyId: st.id }
  });
}

