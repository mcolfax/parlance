"use strict";
/* ===================== ME TAB ===================== */
function toggleRow(label, key, sub, onChange){
  const id = 'set-' + key;
  return h('div', { class: 'setrow' }, h('label', { for: id }, h('div', { class: 'set-l' }, label), sub ? h('div', { class: 'small muted' }, sub) : null),
    h('span', { class: 'toggle' }, h('input', { type: 'checkbox', id, checked: !!S.settings[key], onchange: e => { S.settings[key] = e.target.checked; touchSettings(); if (onChange) onChange(e.target.checked); } }), h('span')));
}
/* while the music slider moves, play a little of the song at the new level */
function previewSong(){
  if (Film.open || !MEDIA.song) return;
  if (Song.mode === 'off' || Song.mode === 'preview'){ Song.mode = 'preview'; if (Song.el) Song.el.loop = true; songStart(null, homeVol(), 0.2); }
  else if (Song.mode === 'home'){ Song.vol = homeVol(); songApply(0.1); }
  clearTimeout(previewSong.t);
  previewSong.t = setTimeout(() => { if (Song.mode === 'preview'){ Song.mode = 'off'; songStop(0.6); } }, 1600);
}
function viewMe(){
  const lang = S.settings.lang; const st = streakInfo(); const L = S.langs[lang];
  const v = h('div', { class: 'view' }, topBar());
  const lessonsDone = Object.keys(L.done).length; const words = learnedEntries(lang, 'v').length;
  const signedOut = Web.on && !(Web.session && Web.session.user);
  v.append(h('section', { class: 'profile' }, profileAvatar(),
    h('div', { class: 'grow' }, h('h1', null, Me.name || 'Your progress'), h('p', { class: 'muted small' }, 'Learning ' + LANGS[lang].name + ' · now on ' + currentLevel(lang) + ' ' + LEVEL_NAME[currentLevel(lang)]),
      signedOut ? h('button', { class: 'linkish small', type: 'button', onclick: () => openWebSignIn('in') }, 'Sign in') : null),
    pip(st.todayMet ? 'proud' : 'happy', 56, { cls: 'me-pip' })));
  const storiesRead = Object.keys(L.stories).length;
  v.append(h('div', { class: 'stats four' },
    h('div', { class: 'stat' }, h('span', { class: 'num' }, ic('flame', 'flame'), st.count), h('span', { class: 'lbl' }, 'day streak')),
    h('div', { class: 'stat' }, h('span', { class: 'num' }, lessonsDone), h('span', { class: 'lbl' }, plural(lessonsDone, 'lesson') + ' done')),
    h('div', { class: 'stat' }, h('span', { class: 'num' }, words), h('span', { class: 'lbl' }, plural(words, 'word') + ' learned')),
    h('div', { class: 'stat' }, h('span', { class: 'num' }, storiesRead), h('span', { class: 'lbl' }, plural(storiesRead, 'story', 'stories') + ' read'))));
  v.append(streakCalendar(st));
  v.append(badgesCard());
  const t = today(); const days = [...Array(7)].map((_, i) => addDays(t, i - 6));
  const vals = days.map(k => (S.days[k] || {}).xp || 0); const goal = S.settings.goal; const max = Math.max(goal * 1.25, ...vals, 1);
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  v.append(h('section', { class: 'card' }, h('div', { class: 'row' }, h('h3', null, 'Last 7 days'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'XP, both languages')),
    h('div', { class: 'bars', role: 'img', 'aria-label': 'XP per day for the last 7 days: ' + vals.join(', ') },
      h('span', { class: 'goal-line', style: 'bottom:' + (24 + Math.round(goal / max * 100)) + 'px' }, h('span', null, goal)),
      days.map((k, i) => h('div', { class: 'bar' + (vals[i] >= goal ? '' : ' miss') + (k === t ? ' today' : '') }, h('i', { style: 'height:' + Math.max(3, Math.round(vals[i] / max * 100)) + 'px;--d:' + i }), h('span', null, names[parseDay(k).getDay()])))),
    h('p', { class: 'small muted' }, 'The dashed line is your daily goal. Miss one day a week and your streak freeze covers it.')));
  // settings
  const vs = voicesFor(lang);
  const voiceSel = h('select', { class: 'input', id: 'voice-sel', onchange: e => { S.settings.voices[lang] = e.target.value; touchSettings(); speak(LANGS[lang].test, lang); } },
    h('option', { value: '' }, 'Best available (automatic)'), vs.map(vc => h('option', { value: vc.voiceURI, selected: S.settings.voices[lang] === vc.voiceURI }, vc.name + ' · ' + vc.lang)));
  const testOut = h('p', { class: 'small muted', 'aria-live': 'polite' });
  const testBtn = h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: async () => { testOut.textContent = 'Playing…'; const r = await speakTest(lang); testOut.textContent = audioResultText(r, lang); } }, ic('speaker'), 'Test voice');
  v.append(h('section', { class: 'card' }, h('h3', null, 'Sound'),
    h('div', { class: 'field' }, h('label', { for: 'voice-sel' }, LANGS[lang].name + ' voice'), voiceSel),
    h('div', { class: 'row wrap' }, testBtn, h('div', { class: 'seg small-seg', role: 'group', 'aria-label': 'Speaking speed' }, [['normal', 'Normal speed'], ['relaxed', 'Relaxed']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(S.settings.speed === k), onclick: () => { S.settings.speed = k; touchSettings(); render(); speak(LANGS[lang].test, lang); } }, l)))),
    testOut,
    toggleRow('Play audio automatically', 'autoplay', 'Speak new words and answers out loud.'),
    toggleRow('Sound effects', 'sfx', 'Chimes, pops and fanfares as you learn.', on => { if (on) sfx('ok'); render(); }),
    S.settings.sfx ? h('div', { class: 'field vol' }, h('label', { for: 'sfx-vol' }, 'Effects volume'),
      h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Soft'), h('input', { type: 'range', id: 'sfx-vol', class: 'f-range grow', min: '0.1', max: '1', step: '0.05', value: String(S.settings.sfxVol),
        oninput: e => { S.settings.sfxVol = +e.target.value; clearTimeout(viewMe.t); viewMe.t = setTimeout(() => { touchSettings(); sfx('ok'); }, 180); } }), h('span', { class: 'small muted' }, 'Loud'))) : null,
    MEDIA.song ? toggleRow('Music on the home screen', 'homeMusic', 'Our theme song, “' + MEDIA.song.title + '”, plays softly while you’re on Learn.', on => { if (on){ songPrefetch(); songUnlock(); } render(); }) : null,
    MEDIA.song ? h('div', { class: 'field vol' }, h('label', { for: 'music-vol' }, 'Music volume'),
      h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Soft'), h('input', { type: 'range', id: 'music-vol', class: 'f-range grow', min: '0', max: '1', step: '0.05', value: String(musicVol()),
        onpointerdown: () => songUnlock(),
        oninput: e => { S.settings.musicVol = +e.target.value; previewSong(); clearTimeout(viewMe.mt); viewMe.mt = setTimeout(() => touchSettings(), 250); } }), h('span', { class: 'small muted' }, 'Loud')),
      h('p', { class: 'small muted' }, 'Also sets the music in the intro film.')) : null));
  v.append(h('section', { class: 'card about' },
    h('div', { class: 'row', style: 'align-items:flex-start' }, pip('love', 58, { cls: 'about-pip' }), h('div', { class: 'grow' }, h('h3', null, 'Parlance ' + APP_VERSION), h('p', { class: 'small muted' }, 'Tell Pip what to improve. Every note is read, grouped and turned into updates.'))),
    h('div', { class: 'about-actions' },
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => openFeedback() }, ic('heart'), 'Send feedback'),
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => openFilm() }, ic('play'), 'Watch the intro film'),
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => showWhatsNew('') }, ic('spark'), 'What’s new'))));
  if (studioAvailable()) v.append(h('section', { class: 'card studio-entry' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h3', null, 'Studio'), h('p', { class: 'small muted' }, 'Only you see this. Review learner feedback, approve improvements, and manage live content.')), ic('wand')),
    h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => openStudio() }, 'Open Studio')));
  v.append(h('section', { class: 'card' }, h('h3', null, 'Practice'),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Daily goal'), h('div', { class: 'chips' }, [[10, 'Casual'], [20, 'Regular'], [30, 'Serious']].map(([g, n]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(S.settings.goal === g), onclick: () => { S.settings.goal = g; const d = S.days[today()]; if (d && d.xp >= g) d.met = true; touchSettings(); render(); } }, n + ' · ' + g + ' XP')))),
    h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Starting level for ' + LANGS[lang].name), h('div', { class: 'chips' }, LEVELS.map(lv => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(L.start === lv), onclick: () => { L.start = lv; L.startTs = Date.now(); touch(lang); UI.open = new Set(); render(); toast('Route starts at ' + lv + ' now'); } }, lv)))),
    toggleRow('Speaking exercises', 'speaking', 'Say sentences out loud during lessons.'),
    toggleRow('Tutor grading', 'aiGrade', 'If a typed answer doesn’t match, Claude checks whether it’s still right and explains what’s different.')));
  v.append(h('section', { class: 'card' }, h('h3', null, 'Tutor access'),
    h('p', { class: 'small muted' }, !AI.ready ? 'Checking…' : aiOn() ? 'Claude is available for conversations, new lessons and grading. Each use counts toward your own Claude usage.' : AI.denied ? 'Claude access is turned off for this page.' : 'Claude isn’t available here. Open Parlance in the Claude app or on claude.ai while signed in.'),
    AI.denied ? h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: manageAccess }, 'Manage permissions') : null));
  v.append(h('section', { class: 'card' }, h('h3', null, 'Your progress is saved'),
    Web.on ? webAccountRow() : null,
    h('p', { class: 'sync-line small', id: 'sync-status' }, ...syncLine()),
    h('div', { class: 'sheet-actions' },
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: showBackup }, 'Copy backup code'),
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: restoreBackup }, 'Restore')),
    DL.save ? h('button', { class: 'linkish', type: 'button', style: 'align-self:flex-start', onclick: downloadBackup }, 'Download a backup file') : null));
  const home = Web.on && webHomeScreenCard(); if (home) v.append(home);
  v.append(h('div', { class: 'row wrap center' },
    h('button', { class: 'linkish', type: 'button', onclick: () => openOnboarding(true) }, 'Change language or level'),
    h('button', { class: 'linkish danger', type: 'button', onclick: resetLang }, 'Reset ' + LANGS[lang].name + ' progress')));
  v.append(h('p', { class: 'small muted center' }, 'German is ' + LANGS.de.variety + '. Spanish is ' + LANGS.es.variety + ' (ustedes, no vosotros).'));
  return v;
}
/* your account's photo, else your initials, else a person: never a letter that isn't yours */
function profileAvatar(){
  const initials = Me.name.split(/\s+/).filter(Boolean).map(x => [...x][0]).slice(0, 2).join('').toUpperCase();
  const own = () => h('span', { class: 'avatar', 'aria-hidden': 'true', html: initials ? null : IC.me }, initials || null);
  if (!Me.avatar) return own();
  return h('img', { class: 'avatar', alt: '', referrerpolicy: 'no-referrer', onerror: e => e.target.replaceWith(own()), src: Me.avatar });
}
function streakCalendar(st){
  const t = today(); const base = parseDay(t);
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1); const lead = (first.getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'cal-d pad' }));
  let metN = 0;
  for (let d = 1; d <= days; d++){
    const k = dayKey(new Date(y, m, d)); const rec = S.days[k] || {};
    const cls = rec.met ? 'met' : st.frozen.has(k) ? 'ice' : rec.xp > 0 ? 'some' : k > t ? 'future' : '';
    if (rec.met) metN++;
    cells.push(h('span', { class: 'cal-d ' + cls + (k === t ? ' today' : ''), style: '--d:' + d, title: k + (rec.xp ? ' · ' + rec.xp + ' XP' : '') }, rec.met && rec.chest ? h('i', { class: 'cal-chest', 'aria-hidden': 'true' }) : null, h('span', null, d)));
  }
  const month = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return h('section', { class: 'card' },
    h('div', { class: 'row' }, h('h3', null, month), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, metN + ' goal ' + plural(metN, 'day'))),
    h('div', { class: 'cal' }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => h('span', { class: 'cal-h' }, x)), cells),
    h('div', { class: 'legend' }, h('span', null, h('i', { class: 'lg-met' }), 'Goal met'), h('span', null, h('i', { class: 'lg-some' }), 'Practiced'), h('span', null, h('i', { class: 'lg-ice' }), 'Streak freeze')));
}
function badgesCard(){
  const n = BADGES.filter(b => S.badges[b.id]).length;
  return h('section', { class: 'card' },
    h('div', { class: 'row' }, h('h3', null, 'Badges'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, n + ' of ' + BADGES.length)),
    h('div', { class: 'badge-grid' }, BADGES.map((b, i) => {
      const got = S.badges[b.id];
      return h('button', { class: 'badge-cell' + (got ? ' on' : ''), type: 'button', style: '--i:' + i, onclick: () => sheet(b.name, h('div', { class: 'badge-detail' }, medal(b.icon, !!got, 96), h('p', null, b.desc), h('p', { class: 'small muted' }, got ? 'Earned ' + parseDay(got).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : 'Not earned yet.')), [{ label: 'Close', primary: true }]) },
        medal(b.icon, !!got, 58), h('span', { class: 'bc-name' }, b.name));
    })));
}
function audioResultText(r, lang){
  if (r === 'ok') return 'Sound is working. If it’s quiet, turn up the volume or switch off silent mode.';
  if (r === 'novoice') return 'No ' + LANGS[lang].name + ' voice is installed. On iPhone, add one in Settings → Accessibility → Spoken Content → Voices, then reopen this page.';
  if (r === 'none') return 'This browser can’t speak text aloud. Try Safari or Chrome.';
  return 'No sound started. Check that silent mode is off and the volume is up, then try again.';
}
async function showBackup(){
  const code = await makeBackupCode();
  const ta = h('textarea', { class: 'input code', readonly: true, rows: '5' }, code);
  sheet('Your backup code', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'This code holds all your progress in both languages. Keep it somewhere safe, then paste it into Restore on any device.'), ta),
    [{ label: 'Close' }, { label: 'Copy code', primary: true, run: () => { try { navigator.clipboard.writeText(code).then(() => toast('Backup code copied'), () => { ta.select(); toast('Select the code and copy it'); }); } catch (e) { ta.select(); } return true; } }]);
}
async function downloadBackup(){
  const code = await makeBackupCode();
  if (!DL.save) return showBackup();
  DL.save.save({ filename: 'parlance-backup-' + today() + '.txt', data: code }).then(() => toast('Backup saved'), e => { if (!e || e.code !== 'declined') showBackup(); });
}
function restoreBackup(){
  const ta = h('textarea', { class: 'input code', rows: '5', placeholder: 'Paste your backup code' });
  const file = h('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', class: 'input', onchange: e => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { ta.value = String(rd.result || ''); }; rd.readAsText(f); } });
  sheet('Restore progress', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'Paste a backup code or choose a backup file. It’s merged with what’s here, so nothing you’ve done on this device is lost.'), ta, file),
    [{ label: 'Cancel' }, { label: 'Restore', primary: true, run: async () => {
      let d; try { d = await readBackup(ta.value); } catch (e) { toast('That code doesn’t look right. Check it and try again.'); return true; }
      const st = d && d.state ? d.state : d;
      if (!st || !st.langs){ toast('That code doesn’t look right. Check it and try again.'); return true; }
      const incoming = mergeState(defaultState(), st);
      S = mergeWhole(S, incoming); reindex(); touch(...SLICES); UI.animate = true; render(); sfx('done'); toast('Progress restored');
    } }]);
}
/* ----- the web version's own accounts (js/core/host.js). In Claude, the Claude account does this. ----- */
function webAccountRow(){
  const u = Web.session && Web.session.user;
  if (u) return h('div', { class: 'web-acct' }, h('span', { class: 'small grow' }, 'Signed in as ', h('b', null, u.email || u.name || 'you')),
    h('button', { class: 'linkish small', type: 'button', onclick: openWebName }, 'Change your name'),
    h('button', { class: 'linkish small', type: 'button', onclick: async () => { await webSignOut(); saveLocal(); webReload(); } }, 'Sign out'));
  return h('div', { class: 'web-acct' }, h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => openWebSignIn('in') }, 'Sign in or create an account'));
}
function openWebName(){
  const input = h('input', { class: 'input', type: 'text', maxlength: '40', autocomplete: 'given-name', 'aria-label': 'Your name', value: (Web.session && Web.session.user && Web.session.user.name) || '' });
  sheet('Your name', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'Pip greets you by your first name.'), input),
    [{ label: 'Cancel' }, { label: 'Save', primary: true, run: async () => {
      const n = input.value.trim(); if (!n){ toast('Add your name'); return true; }
      try { const u = await webUpdateUser({ data: { name: n } }); Me.name = u.name; render(); toast('Name saved'); }
      catch (e){ toast(webSignInError(e)); return true; }
    } }]);
}
function openWebNewPassword(){
  const input = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'New password (8 or more characters)', 'aria-label': 'New password' });
  sheet('Set a new password', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'You’re signed in. Choose a new password for next time.'), input),
    [{ label: 'Not now' }, { label: 'Save password', primary: true, run: async () => {
      if (input.value.length < 8){ toast('Choose a password with 8 or more characters'); return true; }
      try { await webUpdateUser({ password: input.value }); toast('Password changed'); }
      catch (e){ toast(webSignInError(e)); return true; }
    } }]);
}
function webHomeScreenCard(){
  if (webStandalone() || !(webIOS() || Web.install)) return null;
  const add = Web.install ? h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: async () => {
    const ev = Web.install; Web.install = null;
    try { await ev.prompt(); } catch (e) {}
    render();
  } }, 'Add to Home Screen') : null;
  return h('section', { class: 'card web-home' },
    h('div', { class: 'row', style: 'align-items:flex-start' }, h('img', { class: 'web-home-ic', src: 'media/icons/icon-180.png', alt: '', width: '48', height: '48' }),
      h('div', { class: 'grow' }, h('h3', null, 'Put Parlance on your Home Screen'),
        h('p', { class: 'small muted' }, add ? 'It opens full screen, like an app.' : 'Tap the Share button, then Add to Home Screen. Parlance then opens full screen, like an app.'))),
    add);
}
function webSignInError(e){
  const why = {
    invalid_credentials: 'That email and password don’t match. Try again, or create an account.',
    user_already_exists: 'There’s already an account with that email. Sign in instead.', email_exists: 'There’s already an account with that email. Sign in instead.',
    weak_password: 'Choose a stronger password, 8 characters or more.', email_address_invalid: 'That email address doesn’t look right.',
    email_not_confirmed: 'This account’s email hasn’t been confirmed yet, so it can’t sign in.', confirm: 'Your account was made, but its email needs confirming before you can sign in.',
    over_request_rate_limit: 'Too many tries. Wait a minute, then try again.', over_email_send_rate_limit: 'Too many tries. Wait a minute, then try again.',
    signup_disabled: 'New accounts are turned off right now.', email_address_not_authorized: 'New accounts aren’t open yet. Try again later.',
    same_password: 'That’s your current password. Choose a new one.', unavailable: 'Couldn’t reach Parlance’s server. Check your connection and try again.'
  };
  return why[e && e.reason] || why[e && e.code] || (e && e.message) || 'Something went wrong. Try again.';
}
function openWebSignIn(mode){
  let up = mode === 'up', busy = false, hasGoogle = false;
  const field = (type, label, auto) => h('input', { class: 'input', type, placeholder: label, 'aria-label': label, autocomplete: auto, autocapitalize: 'off', spellcheck: 'false' });
  const name = field('text', 'First name', 'given-name'), email = field('email', 'Email', 'email'), pass = field('password', 'Password', 'current-password');
  name.maxLength = 40;
  const msg = h('p', { class: 'small web-msg', role: 'status', 'aria-live': 'polite' });
  const go = h('button', { class: 'btn btn-primary btn-wide', type: 'button' });
  const swap = h('button', { class: 'linkish small', type: 'button', style: 'align-self:center' });
  const forgot = h('button', { class: 'linkish small', type: 'button', style: 'align-self:flex-start', onclick: async () => {
    const e = email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return void (msg.textContent = 'Enter your email address, then tap Forgot your password again.');
    try { await webRecover(e); msg.textContent = 'If there’s an account for that email, a link to set a new password is on its way.'; }
    catch (er){ msg.textContent = er && er.reason === 'email_address_not_authorized'
      ? (hasGoogle ? 'Password reset emails aren’t set up yet. If that’s a Gmail address, tap Continue with Google: it opens the same account.' : 'Password reset emails aren’t set up yet. Ask whoever shared Parlance with you to reset it.')
      : webSignInError(er); }
  } }, 'Forgot your password?');
  // With Google on, it leads: there's no password to forget (we have no email service for reset links).
  // WEB.email (config.js) turns the email form off entirely; Google is then the way in.
  const emailOn = WEB.email !== false;
  const google = h('button', { class: 'btn ' + (emailOn ? 'btn-quiet' : 'btn-primary') + ' btn-wide', type: 'button', hidden: emailOn, onclick: () => { msg.textContent = 'Opening Google…'; saveLocal(); webGoogle(); } }, 'Continue with Google');
  const or = h('div', { class: 'web-or', hidden: true }, 'or use email');
  const form = h('div', { class: 'field', hidden: !emailOn }, name, email, pass, go, forgot);
  swap.hidden = !emailOn;
  const draw = () => {
    name.hidden = !up; forgot.hidden = up; pass.autocomplete = up ? 'new-password' : 'current-password'; pass.placeholder = up ? 'Password (8 or more characters)' : 'Password';
    go.textContent = up ? 'Create account' : 'Sign in'; swap.textContent = up ? 'I already have an account' : 'New here? Create an account'; msg.textContent = '';
  };
  const submit = async () => {
    if (busy) return;
    const e = email.value.trim(), p = pass.value, n = name.value.trim();
    if (up && !n) return void (msg.textContent = 'Add your first name.');
    if (!/^\S+@\S+\.\S+$/.test(e)) return void (msg.textContent = 'Enter your email address.');
    if (p.length < (up ? 8 : 1)) return void (msg.textContent = up ? 'Choose a password with 8 or more characters.' : 'Enter your password.');
    busy = true; go.disabled = true; go.classList.add('busy'); msg.textContent = '';
    try {
      if (up) await webSignUp(n, e, p); else await webSignIn(e, p);
      msg.textContent = 'Signed in. Loading your progress…'; saveLocal(); setTimeout(webReload, 300);
    } catch (er){ msg.textContent = webSignInError(er); busy = false; go.disabled = false; go.classList.remove('busy'); }
  };
  swap.addEventListener('click', () => { up = !up; draw(); });
  go.addEventListener('click', submit);
  [name, email, pass].forEach(i => i.addEventListener('keydown', ev => { if (ev.key === 'Enter'){ ev.preventDefault(); submit(); } }));
  draw();
  sheet('Your Parlance account', h('div', { class: 'field web-signin' },
    h('p', { class: 'small muted' }, 'Sign in to keep your progress safe and pick it up on any device. What you’ve done in this browser comes with you.'),
    google, or, form, msg, swap), [{ label: 'Not now' }]);
  webSettings().then(st => {
    const ext = (st && st.external) || {};
    const useEmail = emailOn && ext.email !== false;
    hasGoogle = !!ext.google; google.hidden = !hasGoogle; or.hidden = !hasGoogle || !useEmail;
    if (hasGoogle){ google.classList.replace('btn-quiet', 'btn-primary'); go.classList.replace('btn-primary', 'btn-quiet'); }
    if (!useEmail){ form.hidden = true; swap.hidden = true; }
    if (!hasGoogle && !useEmail) msg.textContent = 'Signing in isn’t available right now. Try again later.';
  }, () => {});
}
function resetLang(){
  const lang = S.settings.lang;
  sheet('Reset ' + LANGS[lang].name + '?', h('div', { class: 'row', style: 'align-items:flex-start' }, pip('sad', 56, { tap: false }), h('p', { class: 'grow' }, 'This clears finished lessons, review items and XP for ' + LANGS[lang].name + '. Lessons your tutor wrote stay. This can’t be undone, so copy a backup code first if you might want it back.')),
    [{ label: 'Cancel' }, { label: 'Reset', primary: true, run: () => { const keep = S.langs[lang].start; S.langs[lang] = newLang(); S.langs[lang].start = keep; S.langs[lang].startTs = Date.now(); touch(lang); render(); toast(LANGS[lang].name + ' progress reset'); } }]);
}

