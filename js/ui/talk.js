"use strict";
/* ===================== TALK ===================== */
const Talk = { open: false };
function castOf(lang){ return Object.keys(CAST).filter(id => CAST[id].lang === lang); }
function viewTalk(){
  const lang = S.settings.lang;
  const lv = UI.talkLevel || currentLevel(lang); UI.talkLevel = lv;
  const v = h('div', { class: 'view' }, topBar(),
    h('section', { class: 'talk-intro' }, h('div', { class: 'grow' }, h('h1', null, 'Talk with your tutor'), h('p', { class: 'muted' }, 'Real back-and-forth in ' + LANGS[lang].name + '. The cast plays each scene, answers out loud, corrects every message, and can save fixes to your review deck.')),
      h('div', { class: 'av-stack big' }, castOf(lang).map(id => avatar(id, 38)))));
  if (!AI.ready){ v.append(h('p', { class: 'status' }, 'Checking tutor access…')); return v; }
  if (!aiOn()){ v.append(h('div', { class: 'empty' }, pip('think', 72, { tap: false })), h('div', { class: 'notice' }, AI.denied ? 'Claude access is turned off for this page. ' : 'The tutor needs Claude. Open this page in the Claude app or on claude.ai while signed in. Lessons and reviews work without it. ', AI.denied ? h('button', { class: 'linkish', type: 'button', onclick: manageAccess }, 'Manage permissions') : null)); return v; }
  v.append(h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Level'), h('div', { class: 'chips' }, LEVELS.map(x => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(x === lv), onclick: () => { UI.talkLevel = x; render(); } }, x)))));
  const li = LEVELS.indexOf(lv);
  v.append(h('div', { class: 'scen-grid' }, SCENARIOS.map(sc => {
    const locked = sc.min && li < LEVELS.indexOf(sc.min);
    const who = sc.cast[lang];
    return h('button', { class: 'scen', type: 'button', disabled: locked, onclick: () => openTalk(sc, lv) },
      h('span', { class: 'scen-top' }, avatar(who, 40), h('span', { class: 'scen-who' }, CAST[who].name)),
      h('span', { class: 'st-title' }, sc.title), h('span', { class: 'st-meta' }, locked ? 'From ' + sc.min + ' up' : sc.desc));
  })));
  v.append(h('section', { class: 'card' }, h('div', { class: 'dictate-coach' }, h('span', { class: 'coach-mic', html: IC.mic, 'aria-hidden': 'true' }),
    h('div', null, h('strong', null, 'Speak instead of typing'), h('p', { class: 'small muted' }, 'Tap the message box, switch your keyboard to ' + LANGS[lang].keyboard + ' with the globe key, and tap its mic. Add keyboards in iPhone Settings → General → Keyboard → Keyboards.')))));
  return v;
}
function talkInstructions(){
  const L = LANGS[Talk.lang]; const c = CAST[Talk.who];
  const persona = Talk.who === 'pip' ? 'Your name is Pip. You are a cheerful, curious parrot who loves languages and travel. Like any parrot you enjoy repeating a good phrase back, and you occasionally mention flying, feathers or your favorite snacks.' : 'Your name is ' + c.name + ' (' + c.role + '). Stay in that persona while you play this role.';
  return 'You are a friendly ' + L.name + ' conversation partner for an English-speaking learner at CEFR level ' + Talk.level + '. ' + L.dialect + '\n' +
    persona + '\nRoleplay: ' + Talk.scen.prompt + '\n' +
    'Rules:\n- Stay in character and write "reply" only in ' + L.name + ', at level ' + Talk.level + ' (' + LEVEL_GUIDE[Talk.level] + ').\n' +
    '- Keep each reply short (1 to 3 sentences) and end with a question or prompt so the learner can answer.\n' +
    '- Check the learner\'s latest message for grammar, spelling, word choice and naturalness. Messages may come from speech dictation, so ignore missing punctuation and capitalization.\n' +
    '- If the learner writes in English, answer in ' + L.name + ' and show how to say it in "correction".\n' +
    'Reply with only a JSON object:\n{"reply": "your next line in ' + L.name + '", "reply_en": "English translation of your line", "correction": {"needed": true or false, "corrected": "the learner\'s message rewritten correctly and naturally in ' + L.name + ', or empty", "corrected_en": "English translation of corrected, or empty", "explanation": "one or two short English sentences on the main fix, or brief praise"}, "hint": "one short example of what the learner could say next, in ' + L.name + '"}\n' +
    'For your first line there is no learner message yet: set correction.needed to false and explanation to "".';
}
function openTalk(sc, level){
  Object.assign(Talk, { open: true, lang: S.settings.lang, level, scen: sc, who: sc.cast[S.settings.lang] || 'pip', turns: [], log: [], busy: false, err: '', ctl: null, handsFree: false, msgs: 0 });
  Talk.turns.push({ role: 'user', content: talkInstructions() + '\n\nStart the conversation now with your first line.' });
  openOverlay('talk');
  const back = h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'End conversation', html: IC.back, onclick: endTalk });
  const auto = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!S.settings.autoplay), onclick: () => { S.settings.autoplay = !S.settings.autoplay; touchSettings(); auto.setAttribute('aria-pressed', String(S.settings.autoplay)); } }, ic('speaker'), 'Voice');
  OV.head.replaceChildren(back, avatar(Talk.who, 36), h('div', { class: 'ov-title grow' }, h('span', { class: 'ov-name' }, CAST[Talk.who].name), h('span', { class: 'ov-sub muted' }, sc.title + ' · ' + level)), auto);
  Talk.chat = h('div', { class: 'chat', 'aria-live': 'polite' });
  OV.bodyIn.replaceChildren(Talk.chat);
  drawComposer(); drawTalk(); talkCall();
}
function endTalk(){
  const fixes = Talk.log.filter(m => m.role === 'me' && m.corr && m.corr.needed && m.corr.corrected && !m.saved);
  const finish = () => {
    if (Talk.ctl) Talk.ctl.abort(); if (listen.stop) listen.stop();
    if (Talk.msgs){ addXP(Math.min(XP.talkMax, Talk.msgs * XP.talkPerMsg), Talk.lang); S.stats.talkBest = Math.max(S.stats.talkBest || 0, Talk.msgs); touch('core'); }
    Talk.open = false; closeOverlay(); UI.animate = true; render();
    const got = Talk.msgs ? checkBadges({ practiced: true }) : [];
    if (got.length){ sfx('level'); sheet('Badge unlocked', badgeStrip(got), [{ label: 'Nice!', primary: true }]); }
  };
  if (!fixes.length){ finish(); return; }
  sheet('Save your corrections?', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'Add ' + fixes.length + ' corrected ' + plural(fixes.length, 'sentence') + ' to your review deck so they come back at the right time.'),
    h('ul', { class: 'fix-list' }, fixes.map(m => h('li', null, sayText(m.corr.corrected, Talk.lang))))),
    [{ label: 'Not now', run: () => { finish(); } }, { label: 'Save ' + fixes.length, primary: true, run: () => { fixes.forEach(saveFix); finish(); toast('Saved to your review deck'); } }]);
}
function saveFix(m){
  const lang = Talk.lang; const L = S.langs[lang];
  const id = 'c-' + lang + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  L.custom[id] = { t: m.corr.corrected, e: [m.corr.corrected_en || m.text].filter(Boolean), alt: [], level: Talk.level };
  L.cards[id + '|s|0'] = { ef: 2.5, n: 0, iv: 0, due: addDays(today(), 1), last: today(), ts: Date.now() };
  m.saved = true; touch(lang);
}
function drawComposer(){
  const lang = Talk.lang;
  const input = h('textarea', { class: 'ans', rows: '1', placeholder: 'Write or dictate in ' + LANGS[lang].name, lang: LANGS[lang].tts, autocapitalize: 'sentences', enterkeyhint: 'send', 'aria-label': 'Your message' });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); } });
  const send = () => { const t = input.value.trim(); if (!t || Talk.busy) return; input.value = ''; input.style.height = ''; Talk.handsFree = false; talkSend(t); };
  const sendBtn = h('button', { class: 'icon-btn send', type: 'button', 'aria-label': 'Send', html: IC.send, onclick: send });
  Talk.input = input;
  const row = h('div', { class: 'composer' });
  if (SR && micUsable()){
    const mic = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Speak', html: IC.mic });
    mic.addEventListener('click', () => talkListen(mic));
    row.append(mic); Talk.mic = mic;
  }
  row.append(input, sendBtn);
  const hintBtn = h('button', { class: 'linkish small', type: 'button', onclick: () => { const last = [...Talk.log].reverse().find(m => m.role === 'tutor'); if (last && last.hint){ last.showHint = true; drawTalk(); } } }, ic('bulb'), 'Need a hint?');
  OV.foot.className = 'ov-foot';
  OV.footIn.replaceChildren(row, h('div', { class: 'row' }, charBar(input, lang), h('span', { class: 'spacer' }), hintBtn));
}
async function talkListen(mic){
  if (Talk.busy) return;
  mic.disabled = true; mic.classList.add('live'); Talk.input.placeholder = 'Listening…';
  try {
    const text = await listen(Talk.lang, t => { Talk.input.value = t; });
    Talk.input.value = ''; Talk.handsFree = true; talkSend(text);
  } catch (e){
    if (Mic.state === 'blocked'){ toast('The mic is blocked here. Use your keyboard’s dictation instead.'); mic.remove(); Talk.mic = null; }
  } finally { mic.disabled = false; mic.classList.remove('live'); Talk.input.placeholder = 'Write or dictate in ' + LANGS[Talk.lang].name; }
}
function talkSend(text){
  Talk.log.push({ role: 'me', text, corr: 'pending' });
  Talk.turns.push({ role: 'user', content: text });
  if (Talk.turns.length > 24) Talk.turns = [Talk.turns[0], ...Talk.turns.slice(-22)];
  Talk.msgs++;
  drawTalk(); talkCall();
}
async function talkCall(){
  Talk.busy = true; Talk.err = ''; drawTalk();
  Talk.ctl = new AbortController();
  try {
    const r = await AI.sample.json(Talk.turns, { modelTier: 'quick', cache: false, signal: Talk.ctl.signal });
    if (!Talk.open) return;
    if (!r || typeof r.reply !== 'string' || !r.reply.trim()) throw { code: 'invalid_json' };
    Talk.turns.push({ role: 'assistant', content: JSON.stringify(r) });
    const mine = [...Talk.log].reverse().find(m => m.role === 'me');
    if (mine && mine.corr === 'pending') mine.corr = r.correction && typeof r.correction === 'object' ? r.correction : { needed: false, explanation: '' };
    Talk.log.push({ role: 'tutor', text: r.reply.trim(), en: String(r.reply_en || ''), hint: String(r.hint || ''), fresh: true });
    Talk.busy = false; drawTalk();
    if (S.settings.autoplay){ await speak(r.reply, Talk.lang, false, CAST[Talk.who]); if (Talk.open && Talk.handsFree && Talk.mic) talkListen(Talk.mic); }
  } catch (e){
    if (!Talk.open) return;
    Talk.busy = false;
    const mine = [...Talk.log].reverse().find(m => m.role === 'me'); if (mine && mine.corr === 'pending') mine.corr = null;
    Talk.err = e && e.code === 'invalid_json' ? 'The tutor’s reply came back garbled.' : aiErrorText(e);
    drawTalk();
  }
}
function drawTalk(){
  const lang = Talk.lang;
  const nodes = [];
  Talk.log.forEach(m => {
    if (m.role === 'tutor'){
      const en = h('div', { class: 'en', hidden: !m.showEn }, m.en);
      const vo = CAST[Talk.who];
      nodes.push(h('div', { class: 'msg-row tutor' }, avatar(Talk.who, 30), h('div', { class: 'msg tutor' + (m.fresh ? ' fresh' : '') }, h('div', { class: 't' }, sayText(m.text, lang, { gloss: true })), en,
        h('div', { class: 'msg-actions' }, speakBtn(m.text, lang, null, vo), slowBtn(m.text, lang, vo), m.en ? h('button', { class: 'linkish small', type: 'button', onclick: () => { m.showEn = !m.showEn; drawTalk(); } }, m.showEn ? 'Hide translation' : 'Translate') : null))));
      m.fresh = false;
      if (m.showHint && m.hint) nodes.push(h('div', { class: 'hintbox' }, h('span', { class: 'small muted' }, 'You could say: '), sayText(m.hint, lang, { gloss: true }), ' ', speakBtn(m.hint, lang)));
    } else {
      nodes.push(h('div', { class: 'msg me' }, h('div', { class: 't' }, m.text)));
      const c = m.corr;
      if (c === 'pending') {}
      else if (c && c.needed && c.corrected) nodes.push(h('div', { class: 'corr' }, h('div', null, h('b', null, 'Better: '), sayText(c.corrected, lang)), c.explanation ? h('div', null, c.explanation) : null,
        h('div', { class: 'msg-actions' }, speakBtn(c.corrected, lang), m.saved ? h('span', { class: 'small muted' }, 'Saved to review') : h('button', { class: 'linkish small', type: 'button', onclick: () => { saveFix(m); drawTalk(); toast('Saved to your review deck'); } }, 'Save to review'))));
      else if (c && c.explanation) nodes.push(h('div', { class: 'corr good' }, h('div', null, h('b', null, 'Natural. '), c.explanation)));
    }
  });
  if (Talk.busy) nodes.push(h('div', { class: 'msg-row tutor' }, avatar(Talk.who, 30), h('div', { class: 'typing', 'aria-label': CAST[Talk.who].name + ' is typing' }, h('i'), h('i'), h('i'))));
  if (Talk.err) nodes.push(h('div', { class: 'notice' }, Talk.err, ' ', h('button', { class: 'linkish', type: 'button', onclick: () => talkCall() }, 'Try again')));
  Talk.chat.replaceChildren(...nodes);
  requestAnimationFrame(() => { if (OV.body) OV.body.scrollTo({ top: OV.body.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' }); });
}

