"use strict";
/* ===================== FRIENDS: cards, invites, duels =====================
   Friends see each other's card: name, picture, streak, levels and the last few weeks of XP, goal days and lessons.
   Two database paths (rules in docs/ARCHITECTURE.md; the web version enforces the same ones in dev/supabase.sql):
     cards/<uid>/<secret>/card      your card. Only you write it; anyone signed in who knows the path can read it.
     inbox/<uid>/<secret>/<from>    notes to you from friends ("here's my code"). Anyone signed in who knows the path can write.
   The secret is part of your invite code (Pc1.<secret>.<uid>, or Pw1… on the web), so only people you invite can find
   your card. When someone adds your code, they add you and leave their own code in your inbox; your app adds them back
   and clears the note. Removing a friend changes your secret and sends the new code to everyone else.
   Your friend list, duels and the secret sync privately with the rest of your progress (the "social" slice in state.js).
   Duels live on both cards: the challenger lists it, the friend who accepts sets the dates, and each side scores the week
   from the days on both cards.
   ========================================================================== */
const Social = { cards: {}, fetched: 0, refreshing: null, unsubInbox: null, inboxKey: '', inboxBusy: false, inboxAgain: null, blocked: false, lastCard: '', lastPut: 0, timer: null, started: false, sig: '', secretSeen: '' };
const INVITE_KEY = 'parlance.invite';
const DAY_MS = 86400000;

function socialHome(){ return typeof Web !== 'undefined' && Web.on ? 'w' : 'c'; }
function socialOn(){ return !!(Remote.db && Remote.uid && !Remote.readOnly && !Social.blocked); }
function socialState(){
  if (!Remote.ready) return 'checking'; if (!Remote.db || !Remote.uid) return 'signedout';
  if (Social.blocked && !Remote.readOnly && socialHome() === 'w') return 'notready';   // the web database doesn't have the Friends rules yet
  if (Remote.readOnly || Social.blocked) return 'readonly';
  return 'ok';
}
function socialRandom(n){
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let s = '';
  try { const a = new Uint8Array(n); crypto.getRandomValues(a); for (const x of a) s += abc[x % 62]; return s; } catch (e) {}
  for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * 62)];
  return s;
}

/* ----- codes and paths ----- */
function mySecret(){
  const so = S.social;
  if (!so.secret || so.home !== socialHome()){ so.secret = socialRandom(24); so.since = Date.now(); so.home = socialHome(); Social.secretSeen = so.secret; touch('social'); }
  return so.secret;
}
function myCode(){ return 'P' + socialHome() + '1.' + mySecret() + '.' + Remote.uid; }
function parseCode(text){
  const m = /P([cw])1\.([A-Za-z0-9]{16,40})\.([A-Za-z0-9_.~:@+-]{1,200})/.exec(String(text || ''));
  if (!m) return null;
  const uid = m[3].replace(/\.+$/, '');
  return uid ? { home: m[1], secret: m[2], uid, code: 'P' + m[1] + '1.' + m[2] + '.' + uid } : null;
}
const cardPath = (uid, secret) => 'cards/' + uid + '/' + secret + '/card';
const inboxPath = (uid, secret) => 'inbox/' + uid + '/' + secret;
function inviteLink(){ return socialHome() === 'w' ? FRIENDS.links.web + '?friend=' + encodeURIComponent(myCode()) : FRIENDS.links.claude; }
function inviteText(){
  return socialHome() === 'w'
    ? 'Learn German and Spanish with me on Parlance! Open this link and we’ll be friends:\n' + inviteLink() + '\n\nOr paste this in Friends → I have an invite:\n' + myCode()
    : 'Learn German and Spanish with me on Parlance! Open ' + inviteLink() + ', go to Friends, tap “I have an invite” and paste this:\n' + myCode();
}

/* ----- friends ----- */
function friendOn(f){ return !!f && typeof f.code === 'string' && (!f.gone || (+f.at || 0) > f.gone) && (parseCode(f.code) || {}).home === socialHome(); }
function friendIds(){ return Object.keys(S.social.friends).filter(id => friendOn(S.social.friends[id])); }
function friendCard(id){ const c = Social.cards[id]; return c ? c.d : null; }
function friendName(id){ const c = friendCard(id); return (c && c.name) || 'Your friend'; }
function friendBird(id){ const c = friendCard(id); return (c && c.bird) || 'pip'; }
function friendCacheKey(){ return 'parlance.friends:' + Remote.uid; }
function loadFriendCache(){ const c = readJSON(friendCacheKey()); if (c && typeof c === 'object') for (const [id, v] of Object.entries(c)) if (!Social.cards[id] && v && typeof v === 'object') Social.cards[id] = { d: cleanCard(v.d), at: +v.at || 0 }; }
function saveFriendCache(){ const o = {}; for (const id of friendIds()) if (Social.cards[id]) o[id] = Social.cards[id]; writeJSON(friendCacheKey(), o); }

/* ----- your card ----- */
function cardDays(days){
  const out = {}; const t = today(); const from = addDays(t, -(FRIENDS.history - 1));
  for (const [k, d] of Object.entries(days || {})){
    if (!/^\d{4}-\d\d-\d\d$/.test(k) || k < from || k > t || !d || !(+d.xp > 0)) continue;
    out[k] = [Math.round(+d.xp) || 0, (d.q && +d.q.lessons) || 0, d.met ? 1 : 0];
  }
  return out;
}
function duelLive(d){
  if (!d) return false;
  if (d.state === 'on' || d.state === 'done') return !d.end || addDays(d.end, FRIENDS.keep) >= today();
  return (+d.u || +d.at || 0) > Date.now() - (FRIENDS.answer + FRIENDS.keep) * DAY_MS;
}
function buildCard(){
  const so = S.social; const langs = {};
  for (const l of ['de', 'es']){ const L = S.langs[l]; const lessons = Object.keys(L.done).length; if (lessons || L.xp) langs[l] = { level: currentLevel(l), xp: L.xp || 0, lessons, words: wordCount(l) }; }
  const duels = Object.values(so.duels).filter(d => d && (d.a === Remote.uid || d.b === Remote.uid) && duelLive(d))
    .map(d => ({ id: d.id, a: d.a, b: d.b, metric: d.metric, at: d.at, state: d.state, start: d.start || '', end: d.end || '' }));
  const cheers = {}; const since = addDays(today(), -FRIENDS.keep);
  for (const [id, day] of Object.entries(so.cheers)) if (day >= since) cheers[id] = day;
  return { v: 1, app: APP_VERSION, name: so.name, bird: so.bird, lang: S.settings.lang, goal: S.settings.goal, streak: streakInfo().count, today: today(),
    langs, days: cardDays(S.days), badges: Object.keys(S.badges).length, duels, cheers };
}
/* A friend's card is someone else's input: keep only the fields and sizes we expect. */
function cleanCard(d){
  if (!d || typeof d !== 'object' || d.gone) return null;
  const num = (x, max) => Math.max(0, Math.min(max, Math.round(+x) || 0));
  const str = (x, n) => typeof x === 'string' ? x.slice(0, n) : '';
  const day = x => typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x) ? x : '';
  const days = {}; for (const [k, v] of Object.entries(obj(d.days)).slice(0, 400)) if (day(k) && Array.isArray(v)) days[k] = [num(v[0], 100000), num(v[1], 1000), v[2] ? 1 : 0];
  const langs = {}; for (const l of ['de', 'es']){ const x = obj(d.langs)[l]; if (x && typeof x === 'object') langs[l] = { level: LEVELS.includes(x.level) ? x.level : 'A1', xp: num(x.xp, 1e8), lessons: num(x.lessons, 1e5), words: num(x.words, 1e6) }; }
  const duels = (Array.isArray(d.duels) ? d.duels : []).slice(0, 100).filter(x => x && typeof x === 'object' && typeof x.id === 'string' && FRIENDS.metrics[x.metric])
    .map(x => ({ id: str(x.id, 40), a: str(x.a, 200), b: str(x.b, 200), metric: x.metric, at: num(x.at, 1e14), state: ['pending', 'on', 'declined', 'cancelled', 'done', 'closed'].includes(x.state) ? x.state : 'pending', start: day(x.start), end: day(x.end) }));
  const cheers = {}; for (const [k, v] of Object.entries(obj(d.cheers)).slice(0, 200)) if (day(v)) cheers[k] = v;
  return { name: str(d.name, 24).trim(), bird: CAST[d.bird] ? d.bird : 'pip', lang: LANGS[d.lang] ? d.lang : 'de', goal: num(d.goal, 100) || 20, streak: num(d.streak, 1e5),
    today: day(d.today), langs, days, badges: num(d.badges, 999), duels, cheers, updatedAt: num(d.updatedAt, 1e14) };
}
async function socialPublish(force){
  clearTimeout(Social.timer);
  if (!socialOn() || !S.social.on) return false;
  const secret = mySecret(), card = buildCard(), sig = JSON.stringify(card) + secret;
  if (!force && sig === Social.lastCard && Date.now() - Social.lastPut < 6 * 3600000) return true;
  try {
    await Remote.db.doc(cardPath(Remote.uid, secret)).set({ ...card, updatedAt: Date.now() });
    Social.lastCard = sig; Social.lastPut = Date.now();
    return true;
  } catch (e){ if (e && e.code === 'invalid_argument'){ Social.blocked = true; if (!busy()) render(); } return false; }
}
function socialTouch(){ if (!S.social.on || !socialOn()) return; clearTimeout(Social.timer); Social.timer = setTimeout(() => socialPublish(), 5000); }
async function dropCard(secret){
  if (!secret || !socialOn()) return;
  const ref = Remote.db.doc(cardPath(Remote.uid, secret));
  try { await ref.delete(); } catch (e){ try { await ref.set({ v: 1, gone: true, updatedAt: Date.now() }); } catch (e2) {} }
}

/* ----- reading friends' cards ----- */
async function fetchCard(code){
  const c = parseCode(code); if (!c) return null;
  const snap = await Remote.db.doc(cardPath(c.uid, c.secret)).get();
  return snap.exists ? cleanCard(snap.data()) : null;
}
function socialRefresh(force){
  if (!socialOn()) return Promise.resolve();
  if (Social.refreshing) return Social.refreshing;
  if (!force && Date.now() - Social.fetched < 30000) return Promise.resolve();
  Social.refreshing = (async () => {
    await Promise.all(friendIds().slice(0, FRIENDS.max).map(async id => {
      try { Social.cards[id] = { d: await fetchCard(S.social.friends[id].code), at: Date.now() }; } catch (e) {}   // offline: keep what we had
    }));
    Social.fetched = Date.now();
    saveFriendCache();
    socialEnsureInbox();   // in case a dropped subscription needs to start again
    socialReconcile();
  })().finally(() => { Social.refreshing = null; });
  return Social.refreshing;
}
/* After reading cards: pick up answers to your challenges, settle finished duels, tidy old ones, then redraw. */
function socialReconcile(){
  const me = Remote.uid, now = Date.now(), t = today(); let changed = false;
  const news = [];
  for (const d of Object.values(S.social.duels)){
    if (!d || typeof d !== 'object') continue;
    const other = d.a === me ? d.b : d.a; const c = friendCard(other); const x = c && c.duels.find(y => y.id === d.id);
    if (d.state === 'pending' && d.a === me && x && x.state === 'on' && x.start && x.end){ Object.assign(d, { state: 'on', start: x.start, end: x.end, u: now }); changed = true; news.push(friendName(other) + ' accepted your challenge. The duel is on!'); }
    else if (d.state === 'pending' && d.a === me && x && x.state === 'declined'){ d.state = 'declined'; d.u = now; changed = true; }
    else if (d.state === 'on' && d.b === me && x && x.state === 'cancelled'){ d.state = 'cancelled'; d.u = now; changed = true; }
    if (d.state === 'on' && d.end && t > d.end){
      const ready = c ? (c.today > d.end || t > addDays(d.end, 2)) : t > addDays(d.end, FRIENDS.keep);
      if (ready){
        const sc = duelScores(d);
        S.social.past[d.id] = { with: other, metric: d.metric, end: d.end, me: sc.me, them: c ? sc.them : 0, none: !c };
        d.state = 'done'; d.u = now; changed = true;
        if (c && sc.me > sc.them){ addXP(XP.duelWin, S.settings.lang); checkBadges({}); news.push('You won your duel with ' + friendName(other) + '! +' + XP.duelWin + ' XP'); }
        else if (c) news.push(sc.me === sc.them ? 'Your duel with ' + friendName(other) + ' ended in a tie.' : friendName(other) + ' won your duel this time.');
      }
    }
  }
  // tidy: the same rule on every device, so merges don't bring old duels back
  for (const [id, d] of Object.entries(S.social.duels)) if (!d || typeof d !== 'object' || (!duelLive(d) && d.state !== 'on')){ delete S.social.duels[id]; changed = true; }
  const past = Object.entries(S.social.past).sort((a, b) => String(b[1] && b[1].end).localeCompare(String(a[1] && a[1].end)));
  for (const [id] of past.slice(100)){ delete S.social.past[id]; changed = true; }
  if (changed){ touch('social'); socialTouch(); }
  if (news.length){ sfx(news[0].startsWith('You won') ? 'badge' : 'quest'); toast(news[0]); }
  const sig = JSON.stringify(Social.cards) + JSON.stringify(S.social.duels);
  if (sig !== Social.sig || changed){ Social.sig = sig; if (!busy()){ if (UI.tab === 'friends') render(); else renderTabs(); } }
}

/* ----- duels ----- */
function duelOther(d){ return d.a === Remote.uid ? d.b : d.a; }
function dayScore(days, d){ let n = 0; const i = { xp: 0, lessons: 1, goal: 2 }[d.metric]; if (!d.start || !d.end) return 0; for (const [k, v] of Object.entries(days || {})) if (k >= d.start && k <= d.end) n += v[i] || 0; return n; }
function duelScores(d){ const c = friendCard(duelOther(d)); return { me: dayScore(cardDays(S.days), d), them: c ? dayScore(c.days, d) : 0 }; }
function myDuels(){ return Object.values(S.social.duels).filter(d => d && typeof d === 'object' && FRIENDS.metrics[d.metric] && (d.a === Remote.uid || d.b === Remote.uid)); }
function incomingDuels(){
  const out = [];
  for (const id of friendIds()){
    const c = friendCard(id); if (!c) continue;
    for (const d of c.duels) if (d.a === id && d.b === Remote.uid && d.state === 'pending' && !S.social.duels[d.id] && Date.now() - d.at < FRIENDS.answer * DAY_MS) out.push(d);
  }
  return out;
}
async function socialChallenge(id, metric){
  const now = Date.now();
  const d = { id: 'd' + now.toString(36) + socialRandom(4), a: Remote.uid, b: id, metric, at: now, state: 'pending', start: '', end: '', u: now };
  S.social.duels[d.id] = d; touch('social');
  await socialPublish(true);
  return d;
}
async function socialAnswer(d, yes){
  const t = today();
  S.social.duels[d.id] = { id: d.id, a: d.a, b: d.b, metric: d.metric, at: d.at, state: yes ? 'on' : 'declined', start: yes ? t : '', end: yes ? addDays(t, FRIENDS.duel - 1) : '', u: Date.now() };
  touch('social');
  await socialPublish(true);
}
function socialCloseDuel(d){ const x = S.social.duels[d.id]; if (!x) return; x.state = x.state === 'pending' ? 'cancelled' : 'closed'; x.u = Date.now(); touch('social'); socialPublish(true); }

/* ----- cheers ----- */
function cheerFrom(id){ const c = friendCard(id); const day = c && c.cheers[Remote.uid]; return day && day > String(S.social.seen[id] || '') ? day : ''; }
function cheeredToday(id){ return S.social.cheers[id] === today(); }
async function socialCheer(id){ S.social.cheers[id] = today(); touch('social'); return socialPublish(true); }
function cheerSeen(id){ const day = cheerFrom(id); if (day){ S.social.seen[id] = day; touch('social'); } }
function socialAlerts(){ if (!socialOn()) return 0; return (pendingInvite() ? 1 : 0) + (S.social.on ? incomingDuels().length + friendIds().filter(cheerFrom).length : 0); }

/* ----- adding and removing friends ----- */
async function socialAccept(text){
  const c = parseCode(text);
  if (!c) return { error: 'That doesn’t look like a Parlance invite. Check it and try again.' };
  if (c.home !== socialHome()) return { error: c.home === 'w'
    ? 'That invite is for the web version of Parlance, and friends need to use the same one. Open ' + FRIENDS.links.web + ' to add them there.'
    : 'That invite is for Parlance in Claude, and friends need to use the same one. Open ' + FRIENDS.links.claude + ' to add them there.' };
  if (c.uid === Remote.uid) return { error: 'That’s your own invite. Send it to a friend.' };
  if (friendIds().length >= FRIENDS.max && !friendOn(S.social.friends[c.uid])) return { error: 'You have ' + FRIENDS.max + ' friends, which is the most Parlance allows.' };
  let card;
  try { card = await fetchCard(c.code); } catch (e){ return { error: 'Couldn’t reach your account just now. Try again in a moment.' }; }
  if (!card) return { error: 'That invite isn’t active anymore. Ask your friend for a new one.' };
  const now = Date.now(); const old = S.social.friends[c.uid];
  S.social.friends[c.uid] = { ...(old && typeof old === 'object' ? old : {}), code: c.code, cAt: now, at: now, gone: (old && old.gone) || 0 };
  Social.cards[c.uid] = { d: card, at: now };
  touch('social');
  await socialPublish(true);
  try { await Remote.db.doc(inboxPath(c.uid, c.secret) + '/' + Remote.uid).set({ code: myCode(), kind: 'hello', at: now, app: APP_VERSION }); } catch (e) {}
  saveFriendCache(); checkBadges({});
  return { ok: true, uid: c.uid, name: card.name || 'Your friend' };
}
async function socialRemove(id){
  const f = S.social.friends[id]; if (!f) return;
  f.gone = Date.now();
  for (const d of Object.values(S.social.duels)) if (d && (d.a === id || d.b === id) && (d.state === 'pending' || d.state === 'on')){ d.state = 'cancelled'; d.u = Date.now(); }
  delete Social.cards[id]; saveFriendCache();
  touch('social');
  await socialRekey();
}
/* A new secret: old copies of your code stop working, and every friend you still have gets the new code. */
async function socialRekey(){
  const old = S.social.secret;
  S.social.secret = socialRandom(24); S.social.since = Date.now(); S.social.home = socialHome();
  touch('social');
  await announceCode(old);
}
async function announceCode(old){
  Social.secretSeen = S.social.secret;
  if (!socialOn()) return;
  if (S.social.on) await socialPublish(true);
  if (old && old !== S.social.secret) await dropCard(old);
  const code = myCode(), now = Date.now();
  await Promise.all(friendIds().map(async fid => {
    const c = parseCode(S.social.friends[fid].code); if (!c) return;
    try { await Remote.db.doc(inboxPath(c.uid, c.secret) + '/' + Remote.uid).set({ code, kind: 'rekey', at: now, app: APP_VERSION }); } catch (e) {}
  }));
  socialEnsureInbox();
}
/* Leave Friends: everyone is removed, your card is deleted and your old invites stop working. */
async function socialLeave(){
  const now = Date.now(), old = S.social.secret;
  for (const f of Object.values(S.social.friends)) if (f && typeof f === 'object' && friendOn(f)) f.gone = now;
  for (const d of Object.values(S.social.duels)) if (d && (d.state === 'pending' || d.state === 'on')){ d.state = 'cancelled'; d.u = now; }
  S.social.on = false; S.social.ts = now;
  S.social.secret = socialRandom(24); S.social.since = now; S.social.home = socialHome(); Social.secretSeen = S.social.secret;
  Social.cards = {}; saveFriendCache();
  touch('social');
  await dropCard(old);
  if (Social.unsubInbox){ try { Social.unsubInbox(); } catch (e) {} Social.unsubInbox = null; }
  Social.inboxKey = '';
}
async function socialSaveCard(name, bird){
  const so = S.social; const first = !so.on;
  so.name = String(name || '').trim().slice(0, 24); so.bird = CAST[bird] ? bird : 'pip'; so.on = true; so.ts = Date.now();
  mySecret(); touch('social');
  const ok = await socialPublish(true);
  if (first) socialEnsureInbox();
  return ok;
}

/* ----- your inbox: friends' codes ----- */
function socialEnsureInbox(){
  if (!socialOn() || !S.social.on || !S.social.secret) return;
  const key = Remote.uid + '/' + S.social.secret;
  if (Social.inboxKey === key) return;
  if (Social.unsubInbox){ try { Social.unsubInbox(); } catch (e) {} Social.unsubInbox = null; }
  Social.inboxKey = key;
  try { Social.unsubInbox = Remote.db.collection(inboxPath(Remote.uid, S.social.secret)).onSnapshot(snap => readInbox(snap.docs, key), () => { if (Social.inboxKey === key) Social.inboxKey = ''; }); }
  catch (e){ Social.inboxKey = ''; }
}
async function readInbox(docs, key){
  if (Social.inboxKey !== key || !docs || !docs.length) return;
  if (Social.inboxBusy){ Social.inboxAgain = docs; return; }
  Social.inboxBusy = true;
  const joined = []; let changed = false;
  try {
    for (const doc of docs){
      const from = doc.id, n = doc.data() || {}, c = parseCode(n.code), now = Date.now();
      if (c && c.uid === from && c.home === socialHome() && from !== Remote.uid){
        const f = S.social.friends[from];
        if (friendOn(f)){ if (f.code !== c.code){ f.code = c.code; f.cAt = now; changed = true; } }
        else if (n.kind === 'hello' && friendIds().length < FRIENDS.max){ S.social.friends[from] = { ...(f && typeof f === 'object' ? f : {}), code: c.code, cAt: now, at: now, gone: (f && f.gone) || 0 }; joined.push(from); changed = true; }
      }
      try { await Remote.db.doc(inboxPath(Remote.uid, key.slice(key.lastIndexOf('/') + 1)) + '/' + from).delete(); } catch (e) {}
    }
  } finally { Social.inboxBusy = false; }
  if (changed){
    touch('social'); checkBadges({});
    await socialRefresh(true);
    if (joined.length){ sfx('quest'); toast(joined.length === 1 ? friendName(joined[0]) + ' added you. You’re friends now!' : joined.length + ' friends added you.'); }
  }
  if (Social.inboxAgain){ const again = Social.inboxAgain; Social.inboxAgain = null; readInbox(again, key); }
}

/* ----- starting up ----- */
function socialStart(){
  if (Social.started || !socialOn()) return;
  Social.started = true; Social.secretSeen = S.social.secret;
  loadFriendCache();
  if (S.social.on){ socialEnsureInbox(); socialPublish(); }
  socialRefresh(true).then(() => { if (typeof offerInvite === 'function') setTimeout(offerInvite, 900); });
}
function socialAfterSync(){
  if (!Social.started) return;
  const prev = Social.secretSeen;
  if (prev && prev !== S.social.secret && S.social.on) announceCode(prev);   // another device changed your secret: friends get the new code
  else if (S.social.on){ Social.secretSeen = S.social.secret; socialEnsureInbox(); socialTouch(); }
}
/* invites by link (web): ?friend=<code> waits in this browser until you're signed in */
function pendingInvite(){ const p = readJSON(INVITE_KEY); return p && parseCode(p.code) && Date.now() - (+p.at || 0) < 14 * DAY_MS ? p.code : ''; }
function clearInvite(){ try { localStorage.removeItem(INVITE_KEY); } catch (e) {} }
(function catchInviteLink(){
  try {
    const q = new URLSearchParams(location.search); const c = parseCode(q.get('friend'));
    if (!q.has('friend')) return;
    if (c) writeJSON(INVITE_KEY, { code: c.code, at: Date.now() });
    q.delete('friend'); const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  } catch (e) {}
})();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Social.started) socialRefresh(); });
setInterval(() => { if (Social.started && typeof UI !== 'undefined' && UI.tab === 'friends' && document.visibilityState !== 'hidden' && !busy()) socialRefresh(); }, 60000);
