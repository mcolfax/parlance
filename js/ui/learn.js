"use strict";
/* ===================== LEARN ===================== */
function greetingWord(lang){
  const hr = new Date().getHours();
  if (lang === 'de') return hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend';
  return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}
function topBar(opts = {}){
  const lang = S.settings.lang;
  return h('header', { class: 'top' },
    h('div', { class: 'brand' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, h('i'), h('i')), 'Parlance'),
    opts.music && MEDIA.song ? musicBtn() : null,
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Language' },
      ['de', 'es'].map(l => h('button', { type: 'button', 'aria-pressed': String(lang === l), onclick: () => setLang(l) }, LANGS[l].native))));
}
/* Home-screen music switch. Turning it on starts the song right away (the tap counts as permission to play). */
function musicBtn(){
  const on = homeMusicOn();
  return h('button', { class: 'icon-btn music-btn' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on), 'aria-label': on ? 'Music on. Tap to turn it off.' : 'Music off. Tap to turn it on.', html: on ? IC.music : IC.musicOff,
    onclick: () => {
      S.settings.homeMusic = !on;
      if (S.settings.homeMusic && musicVol() < 0.05) S.settings.musicVol = 0.6;
      touchSettings(); haptic(6);
      if (S.settings.homeMusic){ songPrefetch(); songUnlock(); songSyncNow(); }
      toast(S.settings.homeMusic ? 'Music on: “' + MEDIA.song.title + '”' : 'Music off. Tap the note to bring it back.');
      render();
    } });
}
function ring(pct, size, stroke){
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return h('span', { class: 'ring', style: 'width:' + size + 'px;height:' + size + 'px', html: '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '"><circle class="track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/><circle class="fill" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" stroke-dasharray="' + (C * Math.min(1, pct)).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg>', 'aria-hidden': 'true' });
}
function greetBlock(){
  const lang = S.settings.lang; const name = firstName();
  const xp = todayXP(), goal = S.settings.goal; const st = streakInfo();
  const sub = xp >= goal ? 'Daily goal reached. Anything more is a bonus.' : xp > 0 ? (goal - xp) + ' XP to go for today’s goal.' : 'One lesson today keeps your streak alive.';
  return h('section', { class: 'greet' },
    h('h1', null, sayText(greetingWord(lang), lang), name ? ', ' + name : '', '.'),
    h('p', { class: 'muted' }, sub),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' + (st.todayMet ? ' hot' : ' cold') }, h('span', { class: 'num' }, ic('flame', 'flame'), st.count), h('span', { class: 'lbl' }, 'day streak', h('br'), h('span', { class: 'sub' }, st.freezeUsed ? 'Freeze used this week' : 'Freeze ready'))),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, ring(xp / goal, 30, 5), xp), h('span', { class: 'lbl' }, 'of ' + goal + ' XP', h('br'), h('span', { class: 'sub' }, 'today'))),
      h('button', { class: 'stat', type: 'button', onclick: () => { UI.tab = 'review'; UI.animate = true; render(); window.scrollTo(0, 0); } }, h('span', { class: 'num' }, dueCount(lang)), h('span', { class: 'lbl' }, plural(dueCount(lang), 'review', 'reviews'), h('br'), h('span', { class: 'sub' }, 'due now')))));
}
function minutesFor(l){ return Math.max(4, Math.round((l.vocab.length + l.sentences.length + l.blanks.length) * 0.4)); }
function pipMoodNow(){
  const st = streakInfo(); const hr = new Date().getHours();
  if (st.todayMet) return 'cheer';
  if (hr >= 18 && st.count > 0) return 'wow';
  if (hr >= 23 || hr < 5) return 'sleep';
  return 'happy';
}
function pipHello(lang){ const a = PIP_SAYS[lang].hello; return a[hashStr(today() + lang) % a.length]; }
function heroCard(){
  const lang = S.settings.lang; const nx = nextLesson(lang);
  if (!nx) return h('section', { class: 'hero' }, h('div', { class: 'hero-top' }, h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'End of the line'), h('h2', null, 'You’ve finished every lesson')), pip('cheer', 80, { cls: 'hero-pip', say: pickSay(lang, 'cheer') })),
    h('p', { class: 'muted' }, 'Keep your words fresh in Review, read a story, talk with your tutor, or have it write new lessons below.'));
  const where = nx.core ? 'Unit ' + (nx.unit + 1) + ' · ' + COURSE[lang].units[nx.unit].title : 'Your lessons';
  const started = Object.keys(S.langs[lang].done).length > 0;
  const mood = pipMoodNow();
  const say = mood === 'wow' ? (lang === 'de' ? 'Deine Serie!' : '¡Tu racha!') : mood === 'cheer' ? pickSay(lang, 'cheer') : pipHello(lang);
  return h('section', { class: 'hero' },
    h('div', { class: 'hero-art', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'hero-top' },
      h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Next stop · ' + nx.level + ' ' + LEVEL_NAME[nx.level]), h('h2', null, nx.title), h('p', { class: 'muted' }, where + ' · about ' + minutesFor(nx) + ' min')),
      pip(mood, 80, { cls: 'hero-pip', say })),
    h('button', { class: 'btn btn-primary btn-wide shine', type: 'button', onclick: () => startLesson(nx.id) }, started ? 'Continue' : 'Start your first lesson'));
}
function questCard(){
  const ids = questIds(); const done = ids.filter(questDone).length; const d = dayRec();
  const ready = done === 3 && !d.chest;
  const chest = h('button', { class: 'chest' + (ready ? ' ready' : '') + (d.chest ? ' opened' : ''), type: 'button', 'aria-label': ready ? 'Open today’s chest' : d.chest ? 'Chest opened' : 'Chest: finish all three quests to open it', html: chestSVG(),
    onclick: () => { if (ready) openChest(); else { haptic(6); toast(d.chest ? 'You’ve opened today’s chest. A new one arrives tomorrow.' : 'Finish all three quests to open the chest.'); } } });
  return h('section', { class: 'card quests' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h3', null, 'Daily quests'), h('p', { class: 'small muted' }, d.chest ? 'Chest opened. New quests tomorrow.' : ready ? 'All done. Tap the chest!' : done + ' of 3 done · new quests every day')), chest),
    h('ul', { class: 'q-list' }, ids.map((id, i) => {
      const q = QUESTS[id]; const p = questProgress(id); const ok = p >= q.target;
      return h('li', { class: ok ? 'done' : '', style: '--i:' + i },
        h('span', { class: 'q-ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + BADGE_ART[q.icon] + '</svg>', 'aria-hidden': 'true' }),
        h('div', { class: 'q-main' }, h('span', { class: 'qt-label' }, q.label), h('span', { class: 'q-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(p / q.target * 100) + '%' }))),
        h('span', { class: 'q-num' }, ok ? ic('check') : p + '/' + q.target));
    })));
}
function openChest(){
  const d = dayRec(); if (d.chest || !questIds().every(questDone)) return;
  d.chest = true; S.stats.chests = (S.stats.chests || 0) + 1;
  const bonus = XP.chest; addXP(bonus, S.settings.lang);
  const got = checkBadges({});
  const big = h('div', { class: 'chest big', html: chestSVG() });
  const xp = h('p', { class: 'chest-xp' }, '+' + bonus + ' XP');
  sheet('Today’s chest', h('div', { class: 'chest-sheet' }, big, xp, h('p', { class: 'small muted center' }, 'Three quests, one chest. Pip will have new ones for you tomorrow.'), badgeStrip(got)), [{ label: 'Collect', primary: true }]);
  setTimeout(() => { big.classList.add('open'); burstAt(big, { n: 22, dist: 90, vars: ['--gold', '--line', '--gold', '--ok'] }); sfx('chest'); haptic([12, 40, 12]); }, 420);
  UI.animate = false; render();
}
function stripArticle(item, lang){ const p = item.t.split(' '); return item.g && LANGS[lang].articles.includes(p[0].toLowerCase()) && p.length > 1 ? p.slice(1).join(' ') : item.t; }
function wordOfDay(){
  const lang = S.settings.lang; const lv = currentLevel(lang);
  const all = coreOrder(lang).filter(l => l.level === lv).flatMap(l => l.vocab.map(v => ({ v, l })));
  if (!all.length) return null;
  const { v, l } = all[hashStr(today() + lang + '|word') % all.length];
  const core = fold(norm(stripArticle(v, lang), lang));
  const has = s => (' ' + fold(norm(s.t, lang)) + ' ').includes(' ' + core.split(' ')[0]);
  const ex = l.sentences.find(has) || coreOrder(lang).filter(x => LEVELS.indexOf(x.level) <= LEVELS.indexOf(lv) + 1).flatMap(x => x.sentences).find(has);
  return h('section', { class: 'card wotd' },
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, 'Word of the day'), h('span', { class: 'spacer' }), h('span', { class: 'lvl-badge' }, l.level)),
    h('div', { class: 'row wotd-main' }, speakBtn(v.t, lang, 'Play the word'), h('div', { class: 'grow' }, h('div', { class: 'wotd-t' }, itemText(v, lang)), h('div', { class: 'muted' }, v.e.slice(0, 3).join(', ')))),
    ex ? h('div', { class: 'wotd-ex' }, h('div', null, sayText(ex.t, lang, { gloss: true })), h('div', { class: 'small muted' }, ex.e[0])) : null,
    h('button', { class: 'linkish small', type: 'button', onclick: () => isDone(lang, l.id) || lessonState(lang, l, nextLesson(lang)) !== 'locked' ? startLesson(l.id) : confirmLocked(l) }, 'From “' + l.title + '” · practice it'));
}
function routeStrip(){
  const lang = S.settings.lang; const st = levelStats(lang); const cur = currentLevel(lang); const ci = LEVELS.indexOf(cur);
  const fill = ci <= 0 ? 0 : (ci / 5) * 84;
  return h('section', { class: 'route' },
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, 'Your route'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'Now on ' + cur + ' · ' + LEVEL_NAME[cur])),
    h('div', { class: 'route-track' }, h('span', { class: 'route-fill', style: 'width:' + fill + '%' }),
      LEVELS.map((lv, i) => h('button', { class: 'lvl' + (levelComplete(lang, lv) ? ' done' : i === ci ? ' cur' : ''), type: 'button', 'aria-label': lv + ' ' + LEVEL_NAME[lv] + ', ' + st[lv].done + ' of ' + st[lv].total + ' lessons' + (i === ci ? ', you are here' : ''), onclick: () => { UI.open.add(lv); render(); const el = document.getElementById('lv-' + lv); if (el) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } },
        i === ci ? h('span', { class: 'route-pip', 'aria-hidden': 'true', html: pipSVG('happy') }) : h('i'), h('span', null, lv), h('small', null, st[lv].done + '/' + st[lv].total)))));
}
function stationList(lessons, lang){
  const nx = nextLesson(lang);
  return h('ol', { class: 'stations' }, lessons.map(l => {
    const st = lessonState(lang, l, nx);
    const best = S.langs[lang].done[l.id];
    return h('li', { class: st + (UI.justDone === l.id ? ' just' : '') },
      h('button', { class: 'station', type: 'button', onclick: () => st === 'locked' ? confirmLocked(l) : startLesson(l.id) },
        h('span', { class: 'dot' }, st === 'done' ? ic('check') : null),
        h('span', { class: 'st-body' }, h('span', { class: 'st-title' }, !l.core ? h('span', { class: 'lvl-badge' }, l.level) : null, l.title),
          h('span', { class: 'st-meta' }, l.vocab.length + ' words · ' + l.sentences.length + ' phrases' + (best && best.acc != null ? ' · best ' + Math.round(best.acc * 100) + '%' : ''))),
        h('span', { class: 'st-state' }, st === 'done' ? 'Again' : st === 'next' ? 'Start' : st === 'locked' ? ic('lock') : 'Open')));
  }));
}
function confirmLocked(l){
  sheet('Jump ahead?', h('div', { class: 'row', style: 'align-items:flex-start' }, pip('think', 56, { tap: false }), h('p', { class: 'grow' }, '“' + l.title + '” is further along your route. You can take it now; nothing is skipped for good.')),
    [{ label: 'Not now' }, { label: 'Start lesson', primary: true, run: () => { startLesson(l.id); } }]);
}
function levelSection(lang, lv){
  const st = levelStats(lang)[lv]; const units = COURSE[lang].units.map((u, ui) => ({ u, ui })).filter(x => x.u.level === lv);
  if (!units.length) return null;
  const nx = nextLesson(lang);
  if (UI.openLang !== lang){ UI.openLang = lang; UI.open = new Set(); }
  if (!UI.open.size) UI.open.add(nx ? nx.level : lv);
  const open = UI.open.has(lv);
  const pct = st.total ? st.done / st.total : 0;
  const sec = h('section', { class: 'lvl-sec' + (open ? ' open' : '') + (levelComplete(lang, lv) ? ' complete' : ''), id: 'lv-' + lv });
  sec.append(h('button', { class: 'lvl-head', type: 'button', 'aria-expanded': String(open), onclick: () => { if (open) UI.open.delete(lv); else UI.open.add(lv); render(); } },
    h('span', { class: 'cefr' }, lv),
    h('span', { class: 'lvl-text' }, h('span', { class: 'lvl-name' }, LEVEL_NAME[lv]), h('span', { class: 'lvl-meta' }, st.done + ' of ' + st.total + ' lessons' + (levelComplete(lang, lv) ? ' · complete' : ''))),
    h('span', { class: 'bar-mini', 'aria-hidden': 'true' }, h('i', { style: 'width:' + (pct * 100).toFixed(0) + '%' })),
    ic('chev', 'chev')));
  if (open) units.forEach(({ u, ui }) => {
    const done = u.lessons.filter(l => isDone(lang, l.id)).length;
    sec.append(h('div', { class: 'unit' },
      h('div', { class: 'unit-head' }, unitSign(u.title, 46), h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Unit ' + (ui + 1) + ' · ' + done + '/' + u.lessons.length), h('h2', null, u.title))),
      stationList(u.lessons, lang)));
  });
  return sec;
}
function viewLearn(){
  const lang = S.settings.lang;
  const v = h('div', { class: 'view' }, topBar({ music: true }), greetBlock(), heroCard(), questCard(), wordOfDay(), routeStrip());
  for (const lv of LEVELS){ const s = levelSection(lang, lv); if (s) v.append(s); }
  v.append(genSection());
  if (UI.justDone){ const id = UI.justDone; setTimeout(() => { if (UI.justDone === id) UI.justDone = null; }, 1600); }
  return v;
}

function genSection(){
  const lang = S.settings.lang; const gl = genLessons(lang);
  const sec = h('section', { class: 'lvl-sec open gen' },
    h('div', { class: 'gen-head' }, h('span', { class: 'cefr ai' }, ic('spark')), h('div', null, h('h2', null, 'Lessons on demand'), h('p', { class: 'small muted' }, 'Your tutor writes a new lesson in the same format, at any level, on any topic, building on words you know.'))));
  if (gl.length) sec.append(stationList(gl, lang));
  const card = h('div', { class: 'card' });
  if (!AI.ready) card.append(h('p', { class: 'status' }, 'Checking tutor access…'));
  else if (!aiOn()) card.append(h('p', { class: 'notice' }, AI.denied ? 'Claude access is off for this page. Turn it on in Me → Tutor access to write new lessons.' : 'Writing lessons needs Claude. Open this page in the Claude app or on claude.ai while signed in.'));
  else {
    const lv = UI.genLevel || currentLevel(lang); UI.genLevel = lv;
    const status = h('p', { class: 'status' + (UI.genStatusErr ? ' err' : ''), 'aria-live': 'polite' }, UI.genStatus || '');
    const topic = h('input', { class: 'input', id: 'gen-topic', type: 'text', placeholder: 'Topic (optional), e.g. renting a car', value: UI.genTopic, maxlength: '80', oninput: e => { UI.genTopic = e.target.value; } });
    const go = h('button', { class: 'btn btn-primary btn-wide' + (UI.genBusy ? ' busy' : ''), type: 'button', disabled: UI.genBusy, onclick: () => runGenerate() }, ic('spark'), UI.genBusy ? 'Writing your lesson…' : 'Write a ' + lv + ' lesson');
    card.append(
      h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Level'), h('div', { class: 'chips' }, LEVELS.map(x => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(x === lv), disabled: UI.genBusy, onclick: () => { UI.genLevel = x; render(); } }, x)))),
      h('div', { class: 'field' }, h('label', { for: 'gen-topic' }, 'Topic'), topic),
      go, status);
    if (UI.genBusy) card.append(h('button', { class: 'linkish', type: 'button', onclick: () => { if (UI.genCtl) UI.genCtl.abort(); } }, 'Stop'));
  }
  sec.append(card);
  return sec;
}
function lessonToPlain(l){ return { title: l.title, tip: l.tip, vocab: l.vocab.map(v => ({ t: v.t, alt: v.alt, e: v.e, g: v.g })), sentences: l.sentences.map(s => ({ t: s.t, alt: s.alt, e: s.e })), blanks: l.blanks.map(b => ({ t: b.t, o: b.o, e: b.e })) }; }
function sanitizeLesson(r, lang){
  if (!r || typeof r !== 'object') return null;
  const str = x => typeof x === 'string' ? x.trim() : '';
  const arr = x => Array.isArray(x) ? x : [];
  const strs = x => typeof x === 'string' ? [x.trim()].filter(Boolean) : arr(x).map(str).filter(Boolean);
  const arts = { de: { der: 'm', die: 'f', das: 'n' }, es: { el: 'm', la: 'f', los: 'pl', las: 'pl' } }[lang];
  const vocab = arr(r.vocab).map(v => {
    const t = str(v && v.t); const e = [...new Set(strs(v && v.e))].slice(0, 6);
    if (!t || !e.length) return null;
    const first = t.split(' ')[0].toLowerCase();
    let g = ['m', 'f', 'n', 'pl'].includes(v.g) ? v.g : null;
    if (!g && arts[first] && t.split(' ').length > 1) g = arts[first];
    if (g && !arts[first]) g = null;
    return { t, alt: strs(v.alt).slice(0, 4), e, g };
  }).filter(Boolean).slice(0, 12);
  const sentences = arr(r.sentences).map(s => { const t = str(s && s.t); const e = strs(s && s.e).slice(0, 8); return t && e.length ? { t, alt: strs(s.alt).slice(0, 4), e } : null; }).filter(Boolean).slice(0, 8);
  const blanks = arr(r.blanks).map(b => { const t = str(b && b.t); const o = [...new Set(strs(b && b.o))]; if (t.split('___').length !== 2 || o.length < 2) return null; return { t, a: o[0], o: o.slice(0, 4), e: str(b.e) }; }).filter(Boolean).slice(0, 4);
  const tip = { title: str(r.tip && r.tip.title).slice(0, 80) || 'Grammar note', body: str(r.tip && r.tip.body).slice(0, 700), examples: arr(r.tip && r.tip.examples).map(x => ({ t: str(x && x.t), e: str(x && x.e) })).filter(x => x.t).slice(0, 3) };
  const title = str(r.title).slice(0, 60);
  if (vocab.length < 4 || sentences.length < 3 || !title) return null;
  return { title, tip, vocab, sentences, blanks };
}
async function runGenerate(){
  if (UI.genBusy || !aiOn()) return;
  const lang = S.settings.lang, L = LANGS[lang], level = UI.genLevel, topic = (UI.genTopic || '').trim();
  UI.genBusy = true; UI.genStatus = 'Your tutor is writing a ' + level + ' lesson. This can take up to a minute.'; UI.genStatusErr = false; render();
  const known = learnedEntries(lang, 'v').map(e => e.item.t);
  const knownList = (known.length ? known : coreOrder(lang).filter(l => l.level === level).slice(0, 4).flatMap(l => l.vocab.map(v => v.t))).slice(-220).join(', ');
  const titles = allLessons(lang).map(l => l.title).join('; ');
  const example = JSON.stringify(lessonToPlain(coreOrder(lang).find(l => l.level === level) || coreOrder(lang)[9]));
  const nounRule = lang === 'de'
    ? 'Nouns include their article in "t" (der/die/das, or die for plurals) and set "g" to "m", "f", "n" or "pl"; every other word sets "g": null.'
    : 'Nouns include their article in "t" (el/la/los/las) and set "g" to "m", "f" or "pl"; every other word sets "g": null.';
  const prompt = 'Write one new ' + L.name + ' lesson for an English-speaking learner at CEFR level ' + level + ' (' + LEVEL_GUIDE[level] + '). ' + L.dialect + '\n' +
    'Topic: ' + (topic || 'choose a useful topic that fits the level and is not already covered') + '.\n' +
    'Words the learner already knows (build on them; do not teach them again as new vocabulary): ' + knownList + '\n' +
    'Existing lesson titles (do not duplicate): ' + titles + '\n' +
    'Requirements:\n' +
    '- Native-speaker accuracy. Every ' + L.name + ' string must be correct, natural and fully accented' + (lang === 'de' ? ' (umlauts and ß)' : '') + '.\n' +
    '- "title": a short English title, at most 5 words.\n' +
    '- "vocab": 8 new items suited to ' + level + '. ' + nounRule + ' "e" lists 1-4 accepted English translations, most common first; verbs start with "to". "alt" lists other correct ' + L.name + ' forms, often empty.\n' +
    '- "sentences": 5 example sentences that use the new vocab, each with "e" listing 3-6 accepted English translations covering natural variants, and "alt" listing other correct ' + L.name + ' versions.\n' +
    '- "blanks": 3 fill-in-the-blank items that practise this lesson\'s grammar point. "t" is a ' + L.name + ' sentence with "___" for exactly one missing word, "o" lists the correct word first and then 2 forms that are clearly wrong in that sentence, and "e" is the English translation of the full sentence.\n' +
    '- "tip": a grammar or usage point that fits ' + level + ', with "title", a 2-3 sentence "body" in English (wrap key words in **double asterisks**) and 2-3 "examples" of {"t", "e"}.\n' +
    'Reply with only JSON in exactly the same shape as this example lesson:\n' + example;
  UI.genCtl = new AbortController();
  try {
    const r = await AI.sample.json(prompt, { modelTier: 'default', cache: false, signal: UI.genCtl.signal });
    const lesson = sanitizeLesson(r, lang);
    if (!lesson) throw { code: 'bad_lesson' };
    Object.assign(lesson, { id: lang + '-g-' + Date.now().toString(36), level, topic, createdAt: Date.now() });
    S.gen[lang].push(lesson); reindex(); touch('gen-' + lang);
    UI.genStatus = 'Added “' + lesson.title + '” to your lessons.'; UI.genStatusErr = false; UI.genTopic = '';
    sfx('combo'); toast('New lesson ready');
  } catch (e){
    UI.genStatus = e && e.code === 'bad_lesson' ? 'The lesson came back incomplete. Try again, maybe with a more specific topic.' : e && e.code === 'invalid_json' ? 'The lesson came back in the wrong format. Try again.' : aiErrorText(e) || 'Stopped.';
    UI.genStatusErr = !(e && e.code === 'cancelled');
  } finally { UI.genBusy = false; UI.genCtl = null; if (!busy()) render(); }
}

