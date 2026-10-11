"use strict";
/* ===================== FEEDBACK =====================
   Learners can send feedback from anywhere. Each person's notes go to feedback/<their id>, which only
   the owner can read (database rules). Nothing is ever built from feedback directly: the owner's
   Studio (studio.js) turns it into proposals, and only approved proposals get implemented.
   If this viewer can't write to the database (a view-only share), notes wait in this browser's
   outbox and can go out as a page comment or be copied instead.
   ==================================================== */
const OUTBOX_KEY = 'parlance.outbox';
const FB_TYPES = [['idea', 'Idea'], ['bug', 'Something broke'], ['content', 'Wrong answer or typo'], ['level', 'Too easy or hard'], ['love', 'Something I love']];
const Feedback = { canWrite: null, flushing: false, comments: undefined };

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
    h('div', { class: 'row', style: 'align-items:flex-start' }, pip('think', 54, { tap: false }), h('p', { class: 'small muted grow' }, pipName() + ' reads every note. Ideas are grouped, reviewed and turned into updates, so the more specific, the better.')),
    chips, ta, ctxLine),
    [{ label: 'Cancel' }, { label: 'Send', primary: true, run: async close => {
      const text = ta.value.trim();
      if (!text && type !== 'love'){ ta.focus(); toast('Add a few words first.'); return true; }
      const item = { id: fbId(), at: Date.now(), type, text: text.slice(0, 1000), ctx: withCtx ? ctx : { app: APP_VERSION, lang: ctx.lang } };
      const r = await queueFeedback(item);
      close();
      if (r === 'sent'){ sfx('quest'); toast('Thanks! ' + pipName() + ' passed it along.'); }
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
  const ctx = { lessonId: ex.lesson && ex.lesson.id, itemKey: ex.srs || (ex.item && ex.lesson ? itemKey(ex.lesson, ex.kind, ex.lesson[ex.kind === 'v' ? 'vocab' : 'sentences'].indexOf(ex.item)) : null), exType: ex.type,
    prompt: ex.item ? ex.item.t : ex.blank ? ex.blank.t : '', expected: ex.item ? (ex.ansLang === 'en' ? ex.item.e[0] : ex.item.t) : ex.correct || '', answer: typeof Run.value === 'string' ? Run.value.slice(0, 200) : '' };
  return h('button', { class: 'linkish small fb-report', type: 'button', onclick: e => { e.stopPropagation(); openFeedback({ type: 'content', ctx, title: 'Report this exercise', placeholder: 'What’s wrong? For example: my answer should count, or the translation has a typo.' }); } }, ic('flag'), 'Report');
}
