"use strict";
/* ===================== CAPABILITIES ===================== */
const AI = { sample: null, ready: false, denied: false };
const DL = { save: null };
const Me = { name: '', avatar: '' };
async function initCaps(){
  if (!window.claude || typeof window.claude.use !== 'function'){ AI.ready = true; render(); return; }
  try { AI.sample = await window.claude.use('sample'); } catch (e) { AI.sample = null; }
  AI.ready = true;
  try { DL.save = await window.claude.use('downloads'); } catch (e) { DL.save = null; }
  if (!busy()) render();
}
async function loadProfile(user){
  try { const me = await user.me(); Me.name = (me.name || '').trim(); Me.avatar = me.avatarUrl || ''; if (!busy()) render(); } catch (e) {}
}
function firstName(){ return Me.name ? Me.name.split(/\s+/)[0] : ''; }
function aiOn(){ return !!AI.sample && !AI.denied; }
function aiErrorText(e){
  const c = e && e.code;
  if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)){ AI.denied = true; return 'Claude access is turned off for this page, so the tutor can’t answer. You can turn it back on in Me → Tutor access.'; }
  if (c === 'rate_limited') return 'You’ve reached a usage limit for now. Try again in a little while.';
  if (c === 'session_expired') return 'Your Claude session expired. Sign in again, then try again.';
  if (c === 'refused') return 'The tutor couldn’t answer that one. Try rephrasing.';
  if (c === 'cancelled') return '';
  return 'The tutor didn’t respond. Check your connection and try again.';
}
async function manageAccess(){
  try { const p = window.claude && await window.claude.use('permissions'); if (p){ await p.manage(); AI.denied = false; render(); return; } } catch (e) {}
  toast('Open this page’s Permissions menu to turn Claude access back on.');
}

/* ----- open in a chat app: for the web version, which has no tutor of its own ----- */
function copyThen(text, msg){ try { navigator.clipboard.writeText(text).then(() => toast(msg), () => toast('Couldn’t copy. Select the text and copy it.')); } catch (e) { toast('Couldn’t copy. Select the text and copy it.'); } }
/* Buttons that open `prompt` (a string, or a function that returns one when tapped) in Claude, ChatGPT or Gemini.
   They are plain links, so they also open from a Home Screen app. Gemini can't take a prompt in the link, so tapping it copies the prompt first. */
function aiPicker(prompt){
  const text = () => typeof prompt === 'function' ? prompt() : prompt;
  return h('div', { class: 'ai-picker' }, AI_APPS.map(a => h('a', { class: 'btn btn-quiet btn-sm', href: a.url(text()), target: '_blank', rel: 'noopener',
    onclick: e => { if (a.copy) copyThen(text(), 'Prompt copied. Paste it into ' + a.name + '.'); else e.currentTarget.href = a.url(text()); } }, a.name)));
}
/* The full tutor lives in Parlance on Claude. A plain link to it, for the web version. */
function openInClaude(label){ return h('a', { class: 'btn btn-primary btn-sm', href: FRIENDS.links.claude, target: '_blank', rel: 'noopener' }, label || 'Open Parlance in Claude'); }
/* What to show where the tutor is missing on the web version: the way into Claude, plus a prompt for any chat app. */
function tutorOptions(what, prompt){
  return h('div', { class: 'ai-options' },
    h('p', { class: 'small muted' }, what + ' Claude runs it inside Parlance. Your progress is separate there; use a backup code in Me to bring it over.'),
    openInClaude(),
    prompt ? h('p', { class: 'small muted' }, 'Or hand it to a chat app instead:') : null,
    prompt ? aiPicker(prompt) : null);
}
