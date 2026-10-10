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

