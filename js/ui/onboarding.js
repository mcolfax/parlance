"use strict";
/* ===================== ONBOARDING ===================== */
const Onb = { open: false, step: 0, lang: 'de', level: 'A1', goal: 20 };
function openOnboarding(replay, step){
  Object.assign(Onb, { open: true, step: step || 0, replay: !!replay, lang: S.settings.lang, level: S.langs[S.settings.lang].start || 'A1', goal: S.settings.goal });
  openOverlay('onb'); drawOnb();
}
function onbHead(){
  const back = Onb.step > 0 ? h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Back', html: IC.back, onclick: () => { Onb.step--; drawOnb(); } }) : h('span', { class: 'icon-spacer' });
  const dots = h('div', { class: 'dots', 'aria-label': 'Step ' + (Onb.step + 1) + ' of 5' }, [0, 1, 2, 3, 4].map(i => h('i', { class: i === Onb.step ? 'on' : i < Onb.step ? 'past' : '' })));
  const skip = Onb.replay ? h('button', { class: 'linkish small', type: 'button', onclick: () => { Onb.open = false; closeOverlay(); render(); } }, 'Close') : h('span', { class: 'icon-spacer' });
  OV.head.replaceChildren(back, dots, skip);
}
function onbFoot(label, run, disabled){
  OV.foot.className = 'ov-foot';
  OV.footIn.replaceChildren(h('button', { class: 'btn btn-primary btn-wide', type: 'button', disabled: !!disabled, onclick: run }, label));
}
function drawOnb(){
  onbHead();
  document.documentElement.setAttribute('data-lang', Onb.lang);
  const next = () => { Onb.step++; drawOnb(); };
  if (Onb.step === 0){
    swapBody(h('div', { class: 'onb-step welcome' },
      h('div', { class: 'hero-lines', html: '<svg viewBox="0 0 340 170" width="100%" height="170"><path class="ln de" d="M30 140 C 110 140 120 60 200 60 L 310 60"/><path class="ln es" d="M30 140 C 110 140 130 120 200 120 L 310 120"/><circle class="st" cx="30" cy="140" r="9"/><circle class="st de" cx="310" cy="60" r="9"/><circle class="st es" cx="310" cy="120" r="9"/><text x="296" y="40" class="lb de" text-anchor="end">Hallo!</text><text x="296" y="148" class="lb es" text-anchor="end">¡Hola!</text></svg>' }, pip('happy', 70, { cls: 'fly-in', say: 'Hi! I’m Pip.', sayPos: 'up-right', mouth: true, wave: true })),
      h('h1', null, 'Your own language course.'),
      h('p', { class: 'lead' }, 'German and Spanish, from first words to fluent: short lessons, smart review, stories, and a tutor who talks back.'),
      h('button', { class: 'film-card', type: 'button', onclick: () => { Onb.open = false; openFilm({ doneLabel: 'Continue', onDone: () => openOnboarding(Onb.replay, 1) }); } },
        h('span', { class: 'fc-thumb', 'aria-hidden': 'true' }, pip('cheer', 54, { tap: false }), h('span', { class: 'fc-play', html: IC.play })),
        h('span', { class: 'fc-text' }, h('b', null, 'Watch the intro film'), h('span', { class: 'small muted' }, '35 seconds, with sound. Meet Pip and the cast.'))),
      h('ul', { class: 'perks' },
        h('li', null, h('b', null, (coreOrder('de').length + coreOrder('es').length) + ' lessons'), ' from A1 to C2, written for native-level accuracy'),
        h('li', null, h('b', null, STORIES.length + ' illustrated stories'), ' with a recurring cast in Berlin and Mexico City'),
        h('li', null, h('b', null, 'Spaced review'), ' that brings words back right before you’d forget them'),
        h('li', null, h('b', null, 'Conversations'), ' with a Claude tutor who corrects every message'))));
    onbFoot('Get started', next);
  } else if (Onb.step === 1){
    swapBody(h('div', { class: 'onb-step' }, h('h1', null, 'What do you want to learn?'), h('p', { class: 'lead' }, 'You can learn both and switch any time.'),
      h('div', { class: 'big-choices' }, ['de', 'es'].map(l => h('button', { class: 'big-choice lang-' + l, type: 'button', 'aria-pressed': String(Onb.lang === l), onclick: () => { Onb.lang = l; Onb.level = S.langs[l].start || 'A1'; speak(LANGS[l].hello, l); sfx('tap'); drawOnb(); } },
        h('span', { class: 'bc-line', 'aria-hidden': 'true' }), h('span', { class: 'bc-title' }, LANGS[l].native), h('span', { class: 'bc-sub' }, LANGS[l].name + ' · ' + LANGS[l].variety), h('span', { class: 'bc-cast' }, castOf(l).map(id => avatar(id, 30))), h('span', { class: 'bc-hello' }, LANGS[l].hello))))));
    onbFoot('Continue', next);
  } else if (Onb.step === 2){
    swapBody(h('div', { class: 'onb-step' }, h('h1', null, 'Where should your route start?'), h('p', { class: 'lead' }, 'Earlier lessons stay open, so you can always go back.'),
      h('div', { class: 'opts' }, LEVELS.map((lv, i) => h('button', { class: 'opt level-opt', type: 'button', style: '--i:' + i, 'aria-pressed': String(Onb.level === lv), onclick: () => { Onb.level = lv; sfx('tap'); drawOnb(); } },
        h('span', { class: 'cefr' }, lv), h('span', null, h('span', { class: 'lo-title' }, LEVEL_BLURB[lv]), h('span', { class: 'lo-sub' }, LEVEL_NAME[lv])))))));
    onbFoot('Continue', next);
  } else if (Onb.step === 3){
    swapBody(h('div', { class: 'onb-step' }, h('h1', null, 'Pick a daily goal'), h('p', { class: 'lead' }, 'A lesson is worth about 15 XP. Small and steady wins.'),
      h('div', { class: 'opts' }, [[10, 'Casual', 'About 5 minutes a day'], [20, 'Regular', 'About 10 minutes a day'], [30, 'Serious', 'About 15 minutes a day']].map(([g, n, d], i) => h('button', { class: 'opt level-opt', type: 'button', style: '--i:' + i, 'aria-pressed': String(Onb.goal === g), onclick: () => { Onb.goal = g; sfx('tap'); drawOnb(); } },
        h('span', { class: 'cefr' }, g), h('span', null, h('span', { class: 'lo-title' }, n), h('span', { class: 'lo-sub' }, d + ' · ' + g + ' XP')))))));
    onbFoot('Continue', next);
  } else {
    const out = h('p', { class: 'small', 'aria-live': 'polite' });
    const play = h('button', { class: 'sound-check', type: 'button', onclick: async () => { play.classList.add('live'); out.textContent = 'Playing…'; const r = await speakTest(Onb.lang); play.classList.remove('live'); out.textContent = audioResultText(r, Onb.lang); out.className = 'small ' + (r === 'ok' ? 'good' : 'warn'); } }, h('span', { html: IC.speaker, 'aria-hidden': 'true' }), h('span', null, 'Tap to hear ', h('em', null, LANGS[Onb.lang].test)));
    swapBody(h('div', { class: 'onb-step' }, h('h1', null, 'Check your sound'), h('p', { class: 'lead' }, 'Every word and sentence can be read aloud by your device.'),
      play, out,
      h('div', { class: 'dictate-coach' }, h('span', { class: 'coach-mic', html: IC.mic, 'aria-hidden': 'true' }),
        h('div', null, h('strong', null, 'Speaking practice uses dictation'), h('p', { class: 'small muted' }, 'When it’s your turn to speak, tap the box, switch your iPhone keyboard to ' + LANGS[Onb.lang].keyboard + ' with the globe key, and tap the keyboard’s mic.'))),
      h('div', { class: 'card flat' }, toggleRow('Sound effects', 'sfx', 'Chimes for right answers and finished lessons.', on => { if (on) sfx('ok'); }))));
    onbFoot(Onb.replay ? 'Save and close' : 'Start learning', () => finishOnb());
  }
}
function finishOnb(){
  const lang = Onb.lang;
  S.settings.lang = lang; S.settings.goal = Onb.goal; S.settings.onboarded = true; S.settings.seenVersion = APP_VERSION;
  if (S.langs[lang].start !== Onb.level){ S.langs[lang].start = Onb.level; S.langs[lang].startTs = Date.now(); touch(lang); }
  const d = S.days[today()]; if (d && d.xp >= Onb.goal) d.met = true;
  touchSettings();
  Onb.open = false; UI.open = new Set(); closeOverlay(); UI.animate = true; render(); window.scrollTo(0, 0);
  sfx('done');
  if (!Onb.replay) toast('Your route starts at ' + Onb.level + '. Have fun!');
}

