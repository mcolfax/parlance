"use strict";
/* ===================== FRIENDS TAB =====================
   The weekly league, duels and cheers, and inviting friends. The data side (cards, invites, duels) is js/core/social.js.
   ======================================================= */
const FR = { metric: 'xp', offered: false };
const BIRDS = ['pip', 'lena', 'jonas', 'weber', 'emre', 'leyla', 'brandt', 'sofia', 'diego', 'carmen', 'mateo', 'valentina', 'andres'].filter(id => CAST[id]);

/* ----- numbers for the league and duels ----- */
function weekFrom(){ return weekOf(today()); }
function sumDays(days, from, to, i){ let n = 0; for (const [k, v] of Object.entries(days || {})) if (k >= from && k <= to) n += v[i] || 0; return n; }
function friendStreak(c){
  if (c.today && c.today >= addDays(today(), -1)) return c.streak;
  const days = {}; for (const [k, v] of Object.entries(c.days)) days[k] = { xp: v[0], met: !!v[2] };
  return streakFrom(days, today()).count;   // their card is older than yesterday: count from the days on it
}
function leagueRows(){
  const from = weekFrom(), t = today();
  const mine = cardDays(S.days);
  const rows = [{ id: Remote.uid, me: true, name: S.social.name || firstName() || 'You', bird: S.social.bird, xp: sumDays(mine, from, t, 0), goal: sumDays(mine, from, t, 2), streak: streakInfo().count, sub: langLine(S.langs, true), active: t }];
  for (const id of friendIds()){
    const c = friendCard(id);
    if (!c){ rows.push({ id, gone: true, name: 'Your friend', bird: 'pip', xp: -1, goal: -1, streak: -1 }); continue; }
    rows.push({ id, name: c.name || 'Your friend', bird: c.bird, xp: sumDays(c.days, from, t, 0), goal: sumDays(c.days, from, t, 2), streak: friendStreak(c), sub: langLine(c.langs), active: lastActive(c) });
  }
  const m = FR.metric;
  return rows.sort((a, b) => (b[m] - a[m]) || (a.me ? -1 : b.me ? 1 : a.name.localeCompare(b.name)));
}
function langLine(langs, mine){
  const parts = [];
  for (const l of ['de', 'es']){
    const x = langs[l]; if (!x) continue;
    const level = mine ? currentLevel(l) : x.level;
    if (mine ? (Object.keys(x.done).length || x.xp) : true) parts.push(LANGS[l].name + ' ' + level);
  }
  return parts.join(' · ');
}
function lastActive(c){ const ks = Object.keys(c.days).sort(); return ks.length ? ks[ks.length - 1] : ''; }
function activeText(day){
  if (!day) return 'No practice in a while';
  const n = daysBetween(day, today());
  return n <= 0 ? 'Practiced today' : n === 1 ? 'Practiced yesterday' : 'Last practiced ' + n + ' days ago';
}
function awayText(day){ const n = day ? daysBetween(day, today()) : 99; return n < 2 ? '' : n > 30 ? 'away a while' : 'away ' + n + ' days'; }
function weekLeft(){ const n = 6 - ((parseDay(today()).getDay() + 6) % 7); return n === 0 ? 'Last day of the week' : n + ' ' + plural(n, 'day') + ' left · new week on Monday'; }
function metricValue(r, m){ return m === 'streak' ? r.streak : r[m]; }
function metricUnit(m, n){ return m === 'xp' ? 'XP' : m === 'goal' ? plural(n, 'goal day') : plural(n, 'day'); }
function duelLeft(d){ const n = daysBetween(today(), d.end); return n <= 0 ? 'Last day' : (n + 1) + ' days left'; }

/* ----- the tab ----- */
function viewFriends(){
  const v = h('div', { class: 'view friends' }, topBar());
  const st = socialState();
  if (st !== 'ok' || !S.social.on){ v.append(friendsIntro(st)); return v; }
  if (pendingInvite() && !FR.offered){ FR.offered = true; setTimeout(() => offerInvite(), 400); }
  const alerts = friendAlerts(); if (alerts) v.append(alerts);
  v.append(leagueCard(), duelsCard(),
    h('div', { class: 'fr-actions' },
      h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => openInvite() }, ic('addFriend'), 'Invite a friend'),
      h('button', { class: 'linkish', type: 'button', onclick: () => openEnterCode() }, 'I have an invite')),
    myCardRow());
  return v;
}
function friendsIntro(st){
  const invite = pendingInvite();
  const sec = h('section', { class: 'hero fr-hero' },
    h('div', { class: 'hero-art', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'hero-top' },
      h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, invite ? 'You’ve been invited' : 'Friends'), h('h2', null, 'Learn with friends'),
        h('p', { class: 'muted' }, 'Race your friends up the weekly league, challenge them to week-long duels and cheer each other on.')),
      pip('cheer', 80, { cls: 'hero-pip' })));
  if (st === 'checking') sec.append(h('p', { class: 'status' }, 'Checking your account…'));
  else if (st === 'signedout'){
    if (Web.on) sec.append(h('p', { class: 'small muted' }, invite ? 'A friend sent you an invite. Sign in to accept it.' : 'Sign in to invite friends and see how they’re doing.'),
      h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => openWebSignIn('in') }, 'Sign in'));
    else sec.append(h('p', { class: 'notice' }, 'Friends needs your Claude account. Open Parlance in the Claude app or on claude.ai while signed in.'));
  }
  else if (st === 'readonly') sec.append(h('p', { class: 'notice' }, 'This copy of Parlance can only be viewed, so it can’t save a friends card. Ask whoever shared it with you for access to use it.'));
  else {
    sec.append(h('div', { class: 'fr-actions' },
      h('button', { class: 'btn btn-primary btn-wide shine', type: 'button', onclick: () => invite ? offerInvite(true) : openInvite() }, ic('addFriend'), invite ? 'Accept your invite' : 'Invite a friend'),
      h('button', { class: 'linkish', type: 'button', onclick: () => openEnterCode() }, 'I have an invite')));
  }
  sec.append(h('p', { class: 'fr-privacy small muted' }, ic('lock'), 'Only friends you invite can see your card: your name, picture, streak, levels and XP.'));
  const how = [['trophy', 'The weekly league', 'Rank by XP, goal days or streak. It starts fresh every Monday.'],
    ['duel', 'Duels', 'Challenge one friend for a week. The winner gets ' + XP.duelWin + ' XP.'],
    ['heart', 'Cheers', 'Send a nudge when a friend needs one.']];
  return h('div', { class: 'fr-intro' }, sec, h('section', { class: 'card' }, h('h3', null, 'How it works'),
    h('ul', { class: 'fr-how' }, how.map(([icon, title, text]) => h('li', null,
      h('span', { class: 'fr-how-ic', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + BADGE_ART[icon] + '</svg>' }),
      h('span', null, h('b', null, title), h('span', { class: 'small muted' }, text)))))));
}
function friendAlerts(){
  const items = [];
  for (const d of incomingDuels()){
    const who = friendName(d.a);
    items.push(h('div', { class: 'fr-alert' }, avatar(friendBird(d.a), 44),
      h('div', { class: 'grow' }, h('b', null, who + ' challenged you'), h('span', { class: 'small muted' }, FRIENDS.metrics[d.metric].label + ' in ' + FRIENDS.duel + ' days. Win and you get ' + XP.duelWin + ' XP.')),
      h('div', { class: 'fr-alert-acts' },
        h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: async e => { e.currentTarget.disabled = true; await socialAnswer(d, true); sfx('combo'); toast('The duel is on. Good luck!'); render(); } }, 'Accept'),
        h('button', { class: 'linkish small', type: 'button', onclick: async () => { await socialAnswer(d, false); render(); } }, 'Not now'))));
  }
  for (const id of friendIds()){
    if (!cheerFrom(id)) continue;
    items.push(h('div', { class: 'fr-alert cheer' }, avatar(friendBird(id), 44),
      h('div', { class: 'grow' }, h('b', null, friendName(id) + ' cheered you on'), h('span', { class: 'small muted' }, 'Keep going. Send one back?')),
      h('div', { class: 'fr-alert-acts' },
        cheeredToday(id) ? null : h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: async () => { cheerSeen(id); await socialCheer(id); sfx('pop'); toast('Cheer sent to ' + friendName(id)); render(); } }, 'Cheer back'),
        h('button', { class: 'linkish small', type: 'button', onclick: () => { cheerSeen(id); render(); } }, cheeredToday(id) ? 'Thanks!' : 'Dismiss'))));
  }
  return items.length ? h('section', { class: 'fr-alerts' }, items) : null;
}
function leagueCard(){
  const m = FR.metric, rows = leagueRows(), ranked = rows.filter(r => !r.gone);
  const list = h('ol', { class: 'fr-league' }, rows.map((r, i) => {
    const val = metricValue(r, m), rank = ranked.indexOf(r) + 1;
    return h('li', { class: (r.me ? 'me' : '') + (r.gone ? ' gone' : '') + (rank === 1 && val > 0 ? ' top' : ''), style: '--i:' + i },
      h('button', { class: 'fr-row', type: 'button', onclick: () => r.me ? openCardSetup() : openFriend(r.id) },
        h('span', { class: 'fr-rank', 'aria-label': r.gone ? null : 'Rank ' + rank }, r.gone ? '·' : rank),
        avatar(r.bird, 42),
        h('span', { class: 'fr-who' }, h('span', { class: 'fr-name' }, r.name, r.me ? h('span', { class: 'fr-you' }, 'You') : null),
          h('span', { class: 'fr-sub' }, r.gone ? 'Not sharing right now' : [r.sub, r.me ? '' : awayText(r.active)].filter(Boolean).join(' · ') || 'Just getting started')),
        r.gone ? null : h('span', { class: 'fr-val' }, m === 'streak' ? ic('flame', 'flame') : null, h('b', null, val), h('small', null, metricUnit(m, val)))));
  }));
  const card = h('section', { class: 'card fr-league-card' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h3', null, 'This week'), h('p', { class: 'small muted' }, weekLeft()))),
    h('div', { class: 'seg small-seg fr-seg', role: 'group', 'aria-label': 'Rank by' }, Object.entries(FRIENDS.league).map(([k, label]) =>
      h('button', { type: 'button', 'aria-pressed': String(m === k), onclick: () => { FR.metric = k; sfx('select'); render(); } }, label))),
    list);
  if (!friendIds().length) card.append(h('p', { class: 'small muted' }, 'Your league is just you for now. Invite a friend to start racing.'));
  return card;
}
function duelsCard(){
  const me = Remote.uid, t = today();
  const ds = myDuels().filter(d => d.state === 'on' || d.state === 'done' || (d.state === 'pending' && d.a === me) || (d.state === 'declined' && d.a === me))
    .sort((a, b) => ({ on: 0, pending: 1, declined: 2, done: 3 }[a.state] - { on: 0, pending: 1, declined: 2, done: 3 }[b.state]) || (b.u || 0) - (a.u || 0));
  const card = h('section', { class: 'card fr-duels' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h3', null, 'Duels'), h('p', { class: 'small muted' }, 'One friend, one week, one winner. Winners get ' + XP.duelWin + ' XP.')), ic('duel', 'fr-duel-ic')));
  for (const d of ds){
    const other = duelOther(d), who = friendName(other), mt = FRIENDS.metrics[d.metric];
    if (d.state === 'on'){
      const sc = duelScores(d), max = Math.max(sc.me, sc.them, 1);
      const bar = (label, n, mine) => h('div', { class: 'fr-bar' + (mine ? ' mine' : '') }, h('span', { class: 'fr-bar-l' }, label), h('span', { class: 'fr-bar-t' }, h('i', { style: 'width:' + Math.round(n / max * 100) + '%' })), h('b', null, n));
      const ahead = sc.me > sc.them ? 'You’re ahead' : sc.me < sc.them ? who + ' is ahead' : 'Neck and neck';
      card.append(h('div', { class: 'fr-duel' },
        h('div', { class: 'row' }, h('span', { class: 'av-stack' }, avatar(S.social.bird, 30), avatar(friendBird(other), 30)),
          h('div', { class: 'grow' }, h('b', null, 'You vs ' + who), h('span', { class: 'small muted' }, mt.label + ' · ' + (d.start > t ? 'starts soon' : duelLeft(d)))),
          h('span', { class: 'fr-tag' }, ahead)),
        bar('You', sc.me, true), bar(who, sc.them, false)));
    } else if (d.state === 'done'){
      const p = S.social.past[d.id] || { me: 0, them: 0 };
      const res = p.none ? 'Your duel with ' + who + ' ended' : p.me > p.them ? 'You beat ' + who + '!' : p.me < p.them ? who + ' won this one' : 'A tie with ' + who;
      card.append(h('div', { class: 'fr-duel done' + (!p.none && p.me > p.them ? ' won' : '') },
        h('div', { class: 'row' }, p.me > p.them && !p.none ? medal('duel', true, 34) : avatar(friendBird(other), 30),
          h('div', { class: 'grow' }, h('b', null, res), h('span', { class: 'small muted' }, mt.label + (p.none ? '' : ' · ' + p.me + ' to ' + p.them) + (!p.none && p.me > p.them ? ' · +' + XP.duelWin + ' XP' : ''))),
          h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Dismiss', html: IC.close, onclick: () => { socialCloseDuel(d); render(); } }))));
    } else {
      const expired = d.state === 'pending' && Date.now() - d.at > FRIENDS.answer * DAY_MS;
      const line = d.state === 'declined' ? who + ' said not now' : expired ? who + ' didn’t answer' : 'Waiting for ' + who + ' to accept';
      card.append(h('div', { class: 'fr-duel waiting' },
        h('div', { class: 'row' }, avatar(friendBird(other), 30),
          h('div', { class: 'grow' }, h('b', null, line), h('span', { class: 'small muted' }, mt.label + ' · ' + FRIENDS.duel + ' days')),
          h('button', { class: 'linkish small', type: 'button', onclick: () => { socialCloseDuel(d); render(); } }, d.state === 'pending' && !expired ? 'Cancel' : 'Dismiss'))));
    }
  }
  if (!ds.length) card.append(h('p', { class: 'small muted' }, friendIds().length ? 'No duels yet. Pick a friend and a goal to get one going.' : 'Once you have a friend, challenge them here.'));
  const can = friendIds().some(id => friendCard(id));
  card.append(h('button', { class: 'btn btn-quiet btn-wide', type: 'button', disabled: !can, onclick: () => openChallenge() }, ic('duel'), 'Challenge a friend'));
  return card;
}
function myCardRow(){
  return h('section', { class: 'card flat fr-mine' },
    h('div', { class: 'row' }, avatar(S.social.bird, 44),
      h('div', { class: 'grow' }, h('b', null, S.social.name || 'Your card'), h('span', { class: 'small muted' }, 'This is how friends see you. ' + friendIds().length + ' ' + plural(friendIds().length, 'friend') + '.')),
      h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => openCardSetup() }, 'Edit')));
}

/* ----- sheets ----- */
function needCard(next){ if (S.social.on) return next(); openCardSetup(next); }
function openCardSetup(next){
  if (socialState() !== 'ok') return;
  const editing = S.social.on;
  let bird = CAST[S.social.bird] ? S.social.bird : 'pip';
  const name = h('input', { class: 'input', id: 'fr-name', type: 'text', maxlength: '24', autocomplete: 'given-name', value: S.social.name || firstName() });
  const grid = h('div', { class: 'fr-birds', role: 'radiogroup', 'aria-label': 'Your picture' });
  const draw = () => grid.replaceChildren(...BIRDS.map(id => h('button', { class: 'fr-bird', type: 'button', role: 'radio', 'aria-checked': String(id === bird), 'aria-label': CAST[id].name, onclick: () => { bird = id; sfx('select'); draw(); } }, avatar(id, 48))));
  draw();
  const body = h('div', { class: 'field' },
    h('p', { class: 'small muted' }, 'This is what your friends see. Only people you invite can see it.'),
    h('label', { for: 'fr-name' }, 'Your name'), name,
    h('span', { class: 'lbl' }, 'Your picture'), grid);
  if (editing) body.append(h('button', { class: 'linkish danger small', type: 'button', style: 'align-self:flex-start', onclick: () => confirmLeave() }, 'Leave Friends'));
  sheet(editing ? 'Your card' : 'Make your friends card', body, [{ label: 'Cancel' }, { label: editing ? 'Save' : 'Continue', primary: true, run: async () => {
    const n = name.value.trim();
    if (!n){ name.focus(); toast('Add the name your friends know you by'); return true; }
    const ok = await socialSaveCard(n, bird);
    if (!ok){ toast('Couldn’t save your card just now. Try again in a moment.'); return true; }
    if (!editing) checkBadges({});
    if (!busy()) render();
    if (next) setTimeout(next, 200); else toast('Card saved');
  } }]);
}
function confirmLeave(){
  document.querySelectorAll('.sheet-back').forEach(b => b.remove());
  sheet('Leave Friends?', h('p', null, 'This removes all your friends, deletes your card and stops your invites from working. Your own progress stays. You can come back any time with new invites.'),
    [{ label: 'Cancel' }, { label: 'Leave', primary: true, run: async () => { await socialLeave(); render(); toast('You’ve left Friends'); } }]);
}
function openInvite(){
  if (socialState() !== 'ok') return;
  needCard(() => {
    const text = inviteText();
    const ta = h('textarea', { class: 'input fr-invite-text', readonly: true, rows: '5', 'aria-label': 'Your invite' }, text);
    const copy = () => { try { navigator.clipboard.writeText(text).then(() => { sfx('pop'); toast('Invite copied. Paste it to a friend.'); }, () => { ta.select(); toast('Select the invite and copy it'); }); } catch (e) { ta.select(); toast('Select the invite and copy it'); } };
    const acts = [{ label: 'Copy invite', run: () => { copy(); return true; } }];
    if (navigator.share) acts.push({ label: 'Share', primary: true, run: async () => {
      try { await navigator.share({ title: 'Learn with me on Parlance', text }); } catch (e){ if (!e || e.name !== 'AbortError') copy(); }
      return true;
    } });
    else acts[0].primary = true;
    sheet('Invite a friend', h('div', { class: 'field fr-invite' },
      h('div', { class: 'row', style: 'align-items:flex-start' }, pip('wow', 54, { tap: false }),
        h('p', { class: 'small muted grow' }, Web.on ? 'Send this to a friend. When they open the link and sign in, you’ll both see each other here.' : 'Send this to a friend. When they add it in Parlance, you’ll both see each other here.')),
      ta,
      h('p', { class: 'small muted' }, Web.on ? 'It works on the web version of Parlance.' : 'It works in Parlance on Claude. Friends on the web version need an invite from there.')), acts);
  });
}
function openEnterCode(prefill){
  if (socialState() !== 'ok') return;
  needCard(() => {
    const ta = h('textarea', { class: 'input code', rows: '3', placeholder: 'Paste the invite or code', 'aria-label': 'Invite' }, prefill || '');
    const msg = h('p', { class: 'small web-msg', role: 'status', 'aria-live': 'polite' });
    sheet('Add a friend', h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'Paste the invite your friend sent you. The whole message is fine.'), ta, msg),
      [{ label: 'Cancel' }, { label: 'Add friend', primary: true, run: async () => {
        msg.textContent = 'Adding…';
        const r = await socialAccept(ta.value);
        if (r.error){ msg.textContent = r.error; return true; }
        clearInvite(); sfx('quest'); haptic([10, 30, 10]);
        toast('You and ' + r.name + ' are friends now!');
        if (!busy()) render();
      } }]);
  });
}
/* An invite link (web) waits in this browser; once you're signed in, Parlance asks whether to add them. */
async function offerInvite(fromTap){
  const code = pendingInvite();
  if (!code || socialState() !== 'ok') return;
  if (!fromTap && (busy() || document.querySelector('.sheet-back') || !S.settings.onboarded)) return;
  const c = parseCode(code);
  if (c.uid === Remote.uid || friendOn(S.social.friends[c.uid])){ clearInvite(); return; }
  let card = null; try { card = await fetchCard(code); } catch (e) {}
  if (!card){ clearInvite(); if (fromTap) toast('That invite isn’t active anymore. Ask your friend for a new one.'); return; }
  const who = card.name || 'A friend';
  sheet(who + ' invited you', h('div', { class: 'fr-offer' }, avatar(card.bird, 72), h('p', null, who + ' wants to learn with you on Parlance. Add each other to race in the weekly league and challenge each other to duels.')),
    [{ label: 'Not now', run: () => { clearInvite(); } }, { label: 'Add ' + who, primary: true, run: () => {
      needCard(async () => {
        const r = await socialAccept(code); clearInvite();
        if (r.error) return toast(r.error);
        sfx('quest'); toast('You and ' + r.name + ' are friends now!');
        UI.tab = 'friends'; UI.animate = true; if (!busy()) render();
      });
    } }]);
}
function openFriend(id){
  const c = friendCard(id); const who = friendName(id);
  if (!c){
    sheet(who, h('p', null, 'This friend isn’t sharing their card right now. They may have left Friends or removed you. You can remove them from your list.'),
      [{ label: 'Close' }, { label: 'Remove', primary: true, run: async () => { await socialRemove(id); render(); toast('Removed'); } }]);
    return;
  }
  const from = weekFrom(), t = today();
  const week = [...Array(7)].map((_, i) => addDays(t, i - 6)), vals = week.map(k => (c.days[k] || [0])[0]), max = Math.max(c.goal * 1.25, ...vals, 1);
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const past = Object.values(S.social.past).filter(p => p && p.with === id && !p.none);
  const won = past.filter(p => p.me > p.them).length, lost = past.filter(p => p.me < p.them).length;
  const body = h('div', { class: 'fr-friend' },
    h('div', { class: 'row' }, avatar(c.bird, 64), h('div', { class: 'grow' }, h('p', { class: 'small muted' }, langLine(c.langs) || 'Just getting started'), h('p', { class: 'small muted' }, activeText(lastActive(c))))),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('span', { class: 'num' }, ic('flame', 'flame'), friendStreak(c)), h('span', { class: 'lbl' }, 'day streak')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, sumDays(c.days, from, t, 0)), h('span', { class: 'lbl' }, 'XP this week')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, sumDays(c.days, from, t, 2)), h('span', { class: 'lbl' }, plural(sumDays(c.days, from, t, 2), 'goal day') + ' this week'))),
    h('div', { class: 'fr-week', role: 'img', 'aria-label': who + '’s XP for the last 7 days: ' + vals.join(', ') },
      week.map((k, i) => h('div', { class: 'fr-wbar' + ((c.days[k] || [])[2] ? ' met' : '') }, h('i', { style: 'height:' + Math.max(3, Math.round(vals[i] / max * 64)) + 'px' }), h('span', null, names[parseDay(k).getDay()])))),
    past.length ? h('p', { class: 'small muted' }, 'Your duels: ' + won + ' won, ' + lost + ' lost' + (past.length - won - lost ? ', ' + (past.length - won - lost) + ' tied' : '') + '.') : null,
    h('button', { class: 'linkish danger small', type: 'button', style: 'align-self:flex-start', onclick: () => confirmRemove(id) }, 'Remove ' + who));
  const acts = [{ label: cheeredToday(id) ? 'Cheered today' : 'Cheer', run: async () => { if (cheeredToday(id)) return true; await socialCheer(id); sfx('pop'); haptic(8); toast('Cheer sent to ' + who); render(); } },
    { label: 'Challenge', primary: true, run: () => { setTimeout(() => openChallenge(id), 200); } }];
  sheet(who, body, acts);
}
function confirmRemove(id){
  const who = friendName(id);
  document.querySelectorAll('.sheet-back').forEach(b => b.remove());
  sheet('Remove ' + who + '?', h('p', null, 'You’ll stop seeing each other’s cards and any duel between you ends. Your other friends won’t notice a thing.'),
    [{ label: 'Cancel' }, { label: 'Remove', primary: true, run: async () => { await socialRemove(id); render(); toast(who + ' removed'); } }]);
}
function openChallenge(pick){
  const ids = friendIds().filter(id => friendCard(id));
  if (!ids.length) return;
  let who = ids.includes(pick) ? pick : ids.length === 1 ? ids[0] : '', metric = 'xp';
  const busyWith = new Set(myDuels().filter(d => d.state === 'on' || (d.state === 'pending' && Date.now() - d.at < FRIENDS.answer * DAY_MS)).map(duelOther));
  const people = h('div', { class: 'chips' }), goals = h('div', { class: 'chips' });
  const draw = () => {
    people.replaceChildren(...ids.map(id => h('button', { class: 'chip fr-chip', type: 'button', 'aria-pressed': String(who === id), onclick: () => { who = id; sfx('select'); draw(); } }, avatar(friendBird(id), 24), friendName(id))));
    goals.replaceChildren(...Object.entries(FRIENDS.metrics).map(([k, mt]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(metric === k), onclick: () => { metric = k; sfx('select'); draw(); } }, mt.label)));
  };
  draw();
  sheet('Challenge a friend', h('div', { class: 'field' },
    ids.length > 1 || !who ? [h('span', { class: 'lbl' }, 'Who'), people] : null,
    h('span', { class: 'lbl' }, 'Goal'), goals,
    h('p', { class: 'small muted' }, 'The duel starts when they accept and runs for ' + FRIENDS.duel + ' days. Whoever has more at the end wins ' + XP.duelWin + ' XP.')),
    [{ label: 'Cancel' }, { label: 'Send challenge', primary: true, run: async () => {
      if (!who){ toast('Pick a friend to challenge'); return true; }
      if (busyWith.has(who)){ toast('You already have a duel going with ' + friendName(who) + '.'); return true; }
      await socialChallenge(who, metric); sfx('combo'); toast('Challenge sent to ' + friendName(who)); render();
    } }]);
}
