"use strict";
/* ===================== FEEDBACK =====================
   Learners can send feedback from anywhere. Each person's notes go to feedback/<their id>, which only
   the owner can read (database rules). Nothing is ever built from feedback directly: the owner's
   Studio (studio.js) turns it into proposals, and only approved proposals get implemented.
   If this viewer can't write to the database (a view-only share), notes wait in this browser's
   outbox and can go out as a page comment or be copied instead.
   Feedback is collected on the web version only: a note left in someone's own Claude would never reach the owner,
   so there (for anyone but the owner) the feedback entry points send people to the web version instead.
   Closing the loop: when the owner ships a proposal, every note behind it gets `resolved: { at, version, proposal, note }`
   (Studio, or dev/feedback.js). The learner's app finds those on open and says thanks once (maybeThanks), then stamps
   the note with `heardAt` so it never shows again.
   ==================================================== */
const OUTBOX_KEY = 'parlance.outbox';
const FB_TYPES = [['idea', 'Idea'], ['bug', 'Something broke'], ['content', 'Wrong answer or typo'], ['level', 'Too easy or hard'], ['love', 'Something I love']];
const Feedback = { canWrite: null, flushing: false, comments: undefined };

/* In a Claude copy that isn't the owner's, notes can't reach the owner, so the web version takes them. */
function feedbackWebOnly(){
  return typeof Web !== 'undefined' && !Web.on && !!(window.claude && typeof window.claude.use === 'function') && !(typeof Live !== 'undefined' && Live.owner);
}
function sendToWebSheet(){
  sheet('Feedback lives on the web version', h('div', { class: 'field fb-sheet' },
    h('div', { class: 'row', style: 'align-items:flex-start' }, pip('listen', 54, { tap: false }), h('p', { class: 'small muted grow' }, 'Notes sent from here can’t reach us. Send yours from the web version instead, and when we build it you’ll hear about it there.')),
    h('a', { class: 'btn btn-primary btn-wide', href: FRIENDS.links.web, target: '_blank', rel: 'noopener' }, 'Open the web version')), [{ label: 'Close' }]);
}
function fbId(){ return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fbContext(extra){
  const lang = S.settings.lang;
  return { screen: Run.active ? 'lesson' : Story.open ? 'story' : Talk.open ? 'talk' : Film.open ? 'film' : UI.tab, lang, level: currentLevel(lang), app: APP_VERSION, w: window.innerWidth || 0, ...(extra || {}) };
}
function outbox(){ const b = readJSON(OUTBOX_KEY); return Array.isArray(b) ? b : []; }
function queueFeedback(item){ const b = outbox(); b.push(item); writeJSON(OUTBOX_KEY, b.slice(-100)); return flushOutbox(); }
async function flushOutbox(){
  const box = outbox(); if (!box.length) return 'empty';
  if (!Remote.db || !Remote.uid) return 'offline';
  if (Feedback.canWrite === false) return 'blocked';
  if (Feedback.flushing) return 'busy';
  Feedback.flushing = true;
  try {
    const ref = Remote.db.doc('feedback/' + Remote.uid);
    let cur = [];
    try { const snap = await ref.get(); if (snap.exists && Array.isArray(snap.data().items)) cur = snap.data().items.slice(); } catch (e) {}
    const have = new Set(cur.map(x => x.id));
    const items = cur.concat(box.filter(x => !have.has(x.id))).slice(-200);
    await ref.set({ items, updatedAt: Date.now(), app: APP_VERSION });
    const sent = new Set(items.map(x => x.id));
    writeJSON(OUTBOX_KEY, outbox().filter(x => !sent.has(x.id)));
    Feedback.canWrite = true;
    return 'sent';
  } catch (e){
    if (e && e.code === 'invalid_argument') Feedback.canWrite = false;
    return Feedback.canWrite === false ? 'blocked' : 'failed';
  } finally { Feedback.flushing = false; }
}
async function commentsApi(){
  if (Feedback.comments !== undefined) return Feedback.comments;
  try { Feedback.comments = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('comments') : null; } catch (e) { Feedback.comments = null; }
  return Feedback.comments;
}

/* the feedback sheet: openFeedback({ type, ctx, title }) */
function openFeedback(opts = {}){
  if (feedbackWebOnly()) return sendToWebSheet();
  let type = opts.type || 'idea';
  const ctx = fbContext(opts.ctx);
  const chips = h('div', { class: 'chips' });
  const drawChips = () => chips.replaceChildren(...FB_TYPES.map(([k, label]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(type === k), onclick: () => { type = k; sfx('select'); drawChips(); } }, label)));
  drawChips();
  const ta = h('textarea', { class: 'input', rows: '4', maxlength: '1000', placeholder: opts.placeholder || 'What happened, or what would make Parlance better for you?' });
  let withCtx = true;
  const ctxLine = h('label', { class: 'fb-ctx small muted' }, h('input', { type: 'checkbox', checked: true, onchange: e => { withCtx = e.target.checked; } }),
    ' Include where I was: ' + [LANGS[ctx.lang].name, ctx.lessonId || ctx.storyId || ctx.screen, ctx.exType, 'v' + APP_VERSION].filter(Boolean).join(' · '));
  sheet(opts.title || 'Help shape Parlance', h('div', { class: 'field fb-sheet' },
    h('div', { class: 'row', style: 'align-items:flex-start' }, pip('listen', 54, { tap: false }), h('p', { class: 'small muted grow' }, mascot().name + ' reads every note. Ideas are grouped, reviewed and turned into updates, so the more specific, the better.')),
    chips, ta, ctxLine),
    [{ label: 'Cancel' }, { label: 'Send', primary: true, run: async close => {
      const text = ta.value.trim();
      if (!text && type !== 'love'){ ta.focus(); toast('Add a few words first.'); return true; }
      const item = { id: fbId(), at: Date.now(), type, text: text.slice(0, 1000), ctx: withCtx ? ctx : { app: APP_VERSION, lang: ctx.lang } };
      const r = await queueFeedback(item);
      close();
      if (r === 'sent'){ sfx('quest'); toast('Thanks! ' + mascot().name + ' passed it along.'); }
      else if (r === 'blocked') feedbackFallback(item);
      else { sfx('pop'); toast('Saved. It’ll be sent the next time you open Parlance signed in.'); }
      return true;
    } }]);
}
function feedbackFallback(item){
  const note = 'Parlance feedback (' + item.type + '): ' + item.text + (item.ctx && item.ctx.lessonId ? ' [' + item.ctx.lessonId + ']' : '');
  const body = h('div', { class: 'field' }, h('p', { class: 'small muted' }, 'This shared copy of Parlance can’t send notes directly. Leave it as a comment on the page, or copy it and send it to whoever shared Parlance with you.'), h('textarea', { class: 'input', rows: '3', readonly: true }, note));
  const acts = [{ label: 'Copy note', run: () => { try { navigator.clipboard.writeText(note).then(() => toast('Copied'), () => toast('Select the text and copy it')); } catch (e) {} return true; } }];
  commentsApi().then(api => {
    if (api) acts.unshift({ label: 'Leave a comment', primary: true, run: async () => { try { const r = await api.openComposer({ element: document.getElementById('app') }); if (!r || !r.opened) toast('Tap the page first, then try again.'); } catch (e) { toast('Comments aren’t available here. Copy the note instead.'); } } });
    sheet('Send it another way', body, acts);
  });
}
/* "How was it?" chips on finish screens: one tap, no typing */
function quickRating(ctx){
  if (feedbackWebOnly()) return null;
  const box = h('div', { class: 'rate' }, h('span', { class: 'small muted' }, 'How was that?'));
  const opts = [[-1, 'Too easy'], [0, 'Just right'], [1, 'Too hard']];
  box.append(h('div', { class: 'chips center' }, opts.map(([v, label]) => h('button', { class: 'chip', type: 'button', onclick: () => {
    queueFeedback({ id: fbId(), at: Date.now(), type: 'rating', rating: v, text: label, ctx: fbContext(ctx) });
    sfx('pop'); box.replaceChildren(h('span', { class: 'small good rate-thanks' }, ic('check'), ' Thanks, noted. ', h('button', { class: 'linkish small', type: 'button', onclick: () => openFeedback({ type: 'level', ctx }) }, 'Tell us more')));
  } }, label))));
  return box;
}
/* small "report" link for an exercise you think was marked wrong */
function reportLink(ex){
  if (feedbackWebOnly()) return null;
  const ctx = { lessonId: ex.lesson && ex.lesson.id, itemKey: ex.srs || (ex.item && ex.lesson && (ex.kind === 'v' || ex.kind === 's') ? itemKey(ex.lesson, ex.kind, ex.lesson[ex.kind === 'v' ? 'vocab' : 'sentences'].indexOf(ex.item)) : null), exType: ex.type,
    prompt: ex.item ? ex.item.t : ex.blank ? ex.blank.t : '', expected: ex.item ? (ex.ansLang === 'en' ? ex.item.e[0] : ex.item.t) : ex.correct || '', answer: typeof Run.value === 'string' ? Run.value.slice(0, 200) : '' };
  return h('button', { class: 'linkish small fb-report', type: 'button', onclick: e => { e.stopPropagation(); openFeedback({ type: 'content', ctx, title: 'Report this exercise', placeholder: 'What’s wrong? For example: my answer should count, or the translation has a typo.' }); } }, ic('flag'), 'Report');
}

/* ----- "you were heard": a note when something a learner asked for has shipped ----- */
const HEARD_KEY = 'parlance.heard';
function heardLocal(){ const b = readJSON(HEARD_KEY); return new Set(Array.isArray(b) ? b : []); }
async function maybeThanks(tries = 0){
  if (!Remote.db || !Remote.uid || !S.settings.onboarded) return false;
  if (busy() || document.querySelector('.sheet-back')){ if (tries < 8) setTimeout(() => maybeThanks(tries + 1), 5000); return false; }
  let doc;
  try { const snap = await Remote.db.doc('feedback/' + Remote.uid).get(); doc = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null; } catch (e) { return false; }
  if (!doc || !Array.isArray(doc.items)) return false;
  const local = heardLocal();
  const fresh = doc.items.filter(x => x && x.resolved && !x.resolved.quiet && x.type !== 'rating' && !x.heardAt && !local.has(x.id));
  if (!fresh.length) return false;
  if (busy() || document.querySelector('.sheet-back')){ if (tries < 8) setTimeout(() => maybeThanks(tries + 1), 5000); return false; }
  // one card per thing we built, however many of their notes it answered
  const groups = new Map();
  for (const x of fresh){ const k = x.resolved.proposal || x.id; if (!groups.has(k)) groups.set(k, { r: x.resolved, notes: [] }); groups.get(k).notes.push(x); }
  const list = [...groups.values()].slice(0, 4);
  const name = firstName();
  sfx('badge');
  sheet(name ? name + ', you were heard' : 'You were heard', h('div', { class: 'heard' },
    pip('cheer', 76, { tap: false, moveFor: 2600 }),
    h('p', null, 'You took the time to tell us how to make Parlance better, and it worked.'),
    list.map(g => h('div', { class: 'heard-item' },
      g.notes[0].text ? h('blockquote', { class: 'heard-quote' }, '“' + String(g.notes[0].text).slice(0, 220) + '”') : null,
      h('p', null, h('b', null, 'Now in Parlance ' + String(g.r.version || APP_VERSION) + '. '), String(g.r.note || 'We built what you asked for. Thank you.').slice(0, 500)))),
    h('p', { class: 'small muted' }, mascot().name + ' says thank you.')),
    [{ label: 'Thank you!', primary: true }]);
  // counts as seen as soon as it's shown, even if they swipe the sheet away
  markHeard(fresh);
  return true;
}
async function markHeard(items){
  const ids = new Set(items.map(x => x.id)), now = Date.now();
  const local = heardLocal(); for (const id of ids) local.add(id); writeJSON(HEARD_KEY, [...local].slice(-300));
  try {
    const ref = Remote.db.doc('feedback/' + Remote.uid);
    const snap = await ref.get(); if (!snap.exists) return;
    const doc = JSON.parse(JSON.stringify(snap.data()));
    doc.items = (doc.items || []).map(x => ids.has(x.id) && !x.heardAt ? { ...x, heardAt: now } : x);
    await ref.set(doc);
  } catch (e) {}
}
