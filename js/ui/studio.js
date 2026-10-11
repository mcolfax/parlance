"use strict";
/* ===================== STUDIO (owner only) =====================
   The loop for improving Parlance:
     1. Feedback  : everything learners sent (feedback/<uid>), plus difficulty ratings per lesson.
     2. Synthesize: Claude groups new feedback into proposals (proposals/<id>, status 'pending').
     3. Approve   : you approve or reject each one. Only approved proposals are ever built.
     4. Build     : the weekly build task (or any Claude session) implements approved proposals,
                    republishes, and marks them 'shipped' with the version.
   Content: switch remote content packs on/off, broadcast an announcement, or tell open apps to refresh.
   Database rules keep feedback/ and proposals/ readable by the owner only.
   ================================================================ */
const Studio = { tab: 'feedback', fb: [], props: [], meta: {}, names: {}, filter: 'pending', busy: false, status: '', loaded: false };
const PROPOSAL_STATES = [['pending', 'To review'], ['approved', 'Approved'], ['shipped', 'Shipped'], ['rejected', 'Rejected']];

function withoutId(o){ const c = { ...o }; delete c.id; for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k]; return c; }
function studioAvailable(){ return Live.owner && !!Live.db; }
async function openStudio(){
  if (!studioAvailable()) return;
  Studio.open = true; openOverlay('studio'); sfx('open');
  OV.head.replaceChildren(h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close Studio', html: IC.back, onclick: closeStudio }), h('div', { class: 'ov-title grow' }, h('span', { class: 'ov-name' }, 'Studio'), h('span', { class: 'ov-sub muted' }, 'Only you can see this')), pip('think', 40, { tap: false }));
  OV.foot.className = 'ov-foot'; OV.footIn.replaceChildren();
  drawStudio(); await loadStudio(); drawStudio();
}
function closeStudio(){ Studio.open = false; closeOverlay(); UI.animate = true; render(); }
async function loadStudio(){
  Studio.status = 'Loading…'; drawStudio();
  try {
    const fbSnap = await Live.db.collection('feedback').get();
    Studio.fb = fbSnap.docs.flatMap(d => (d.data().items || []).map(x => ({ ...x, uid: d.id }))).sort((a, b) => b.at - a.at);
    const pSnap = await Live.db.collection('proposals').get();
    Studio.props = pSnap.docs.filter(d => d.id !== '_meta').map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    const meta = pSnap.docs.find(d => d.id === '_meta'); Studio.meta = meta ? { ...meta.data() } : {};
    const uids = [...new Set(Studio.fb.map(f => f.uid))];
    if (Remote.user && Remote.user.profiles && uids.length){ try { const ps = await Remote.user.profiles(uids); for (const id of uids) Studio.names[id] = (ps[id] && ps[id].name) || ''; } catch (e) {} }
    Studio.status = ''; Studio.loaded = true;
  } catch (e){ Studio.status = 'Couldn’t load: ' + ((e && e.message) || 'try again'); }
}
function drawStudio(){
  if (!Studio.open || !OV.bodyIn) return;
  const tabs = h('div', { class: 'seg studio-tabs', role: 'tablist' }, [['feedback', 'Feedback'], ['proposals', 'Proposals'], ['content', 'Content'], ['releases', 'Releases']].map(([k, l]) =>
    h('button', { type: 'button', role: 'tab', 'aria-pressed': String(Studio.tab === k), onclick: () => { Studio.tab = k; sfx('tap'); drawStudio(); } }, l,
      k === 'proposals' && Studio.props.some(p => p.status === 'pending') ? h('span', { class: 'mini-badge' }, Studio.props.filter(p => p.status === 'pending').length) : null)));
  const body = Studio.tab === 'feedback' ? studioFeedback() : Studio.tab === 'proposals' ? studioProposals() : Studio.tab === 'content' ? studioContent() : studioReleases();
  OV.bodyIn.replaceChildren(...[tabs, Studio.status ? h('p', { class: 'status' }, Studio.status) : null, body].filter(Boolean));
}
function fbNew(){ const since = Studio.meta.lastSynthAt || 0; return Studio.fb.filter(f => f.at > since && f.type !== 'rating'); }
function studioFeedback(){
  const fresh = fbNew(); const ratings = Studio.fb.filter(f => f.type === 'rating');
  const wrap = h('div', { class: 'studio-sec' });
  wrap.append(h('section', { class: 'card studio-hero' },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h3', null, fresh.length + ' new ' + plural(fresh.length, 'note')), h('p', { class: 'small muted' }, Studio.fb.length + ' total from ' + new Set(Studio.fb.map(f => f.uid)).size + ' ' + plural(new Set(Studio.fb.map(f => f.uid)).size, 'person', 'people') + (Studio.meta.lastSynthAt ? ' · last synthesized ' + new Date(Studio.meta.lastSynthAt).toLocaleDateString() : '')))),
    h('button', { class: 'btn btn-primary btn-wide' + (Studio.busy ? ' busy' : ''), type: 'button', disabled: Studio.busy || !fresh.length || !aiOn(), onclick: () => synthesize(false) }, ic('spark'), Studio.busy ? 'Claude is reading the feedback…' : 'Turn new feedback into proposals'),
    !aiOn() ? h('p', { class: 'small muted' }, 'Synthesis needs Claude access on this page.') : null,
    Studio.fb.length ? h('button', { class: 'linkish small', type: 'button', disabled: Studio.busy || !aiOn(), onclick: () => synthesize(true) }, 'Re-synthesize everything') : null));
  // difficulty signal from one-tap ratings
  if (ratings.length){
    const by = new Map(); for (const r of ratings){ const k = (r.ctx && (r.ctx.lessonId || r.ctx.storyId)) || '?'; const x = by.get(k) || { easy: 0, right: 0, hard: 0 }; if (r.rating < 0) x.easy++; else if (r.rating > 0) x.hard++; else x.right++; by.set(k, x); }
    const rows = [...by.entries()].sort((a, b) => (b[1].hard + b[1].easy) - (a[1].hard + a[1].easy)).slice(0, 8);
    wrap.append(h('section', { class: 'card' }, h('h3', null, 'Difficulty ratings'), h('div', { class: 'rating-table' }, h('span', { class: 'rt-h' }, 'Lesson'), h('span', { class: 'rt-h' }, 'Easy'), h('span', { class: 'rt-h' }, 'Right'), h('span', { class: 'rt-h' }, 'Hard'),
      rows.flatMap(([k, x]) => { const l = getLesson(k) || storyById(k); return [h('span', null, l ? l.title : k), h('span', null, x.easy), h('span', null, x.right), h('span', { class: x.hard > x.right ? 'bad-t' : '' }, x.hard)]; }))));
  }
  const notes = Studio.fb.filter(f => f.type !== 'rating');
  if (!notes.length) wrap.append(h('div', { class: 'empty' }, pip('sleep', 64, { tap: false })), h('p', { class: 'muted center' }, Studio.loaded ? 'No feedback yet. Learners can send it from Me, from any finished lesson, or with Report on an exercise.' : ''));
  for (const f of notes.slice(0, 120)){
    const isNew = f.at > (Studio.meta.lastSynthAt || 0);
    wrap.append(h('div', { class: 'fb-item' + (isNew ? ' new' : '') },
      h('div', { class: 'row' }, h('span', { class: 'chip static fb-type t-' + f.type }, (FB_TYPES.find(t => t[0] === f.type) || [0, f.type])[1]), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, (Studio.names[f.uid] || 'A learner') + ' · ' + new Date(f.at).toLocaleDateString())),
      f.text ? h('p', null, f.text) : null,
      f.ctx ? h('p', { class: 'small muted' }, [f.ctx.lang && LANGS[f.ctx.lang] ? LANGS[f.ctx.lang].name : '', f.ctx.level, f.ctx.lessonId || f.ctx.storyId || f.ctx.screen, f.ctx.exType, f.ctx.expected ? 'expected “' + f.ctx.expected + '”' : '', f.ctx.answer ? 'answered “' + f.ctx.answer + '”' : '', f.ctx.app ? 'v' + f.ctx.app : ''].filter(Boolean).join(' · ')) : null));
  }
  return wrap;
}
async function synthesize(all){
  if (Studio.busy || !aiOn()) return;
  const items = (all ? Studio.fb.filter(f => f.type !== 'rating') : fbNew()).slice(0, 150);
  if (!items.length) return;
  Studio.busy = true; Studio.status = ''; drawStudio();
  const ratings = Studio.fb.filter(f => f.type === 'rating').slice(0, 300).map(r => ({ lesson: r.ctx && (r.ctx.lessonId || r.ctx.storyId), rating: r.rating }));
  const existing = Studio.props.filter(p => p.status !== 'rejected').map(p => ({ id: p.id, title: p.title, status: p.status }));
  const prompt = 'You are the product lead for Parlance, a German and Spanish learning web app (lessons A1–C2, stories with a recurring cast, spaced review, a Claude conversation tutor, a bird mascot that each learner picks and customizes (Pip by default), daily quests and badges). ' +
    'Content can be changed two ways: "content" changes (lessons, translations, stories) can ship as data packs; "code" or "design" changes need an app release.\n' +
    'Turn this learner feedback into a short list of concrete, buildable improvement proposals for the owner to approve. Group related notes. Ignore pure praise unless it says what to protect. Never invent problems the feedback does not support. ' +
    'If a note reports a wrong answer or typo, propose the exact content fix (lesson id, the current text, the corrected text or extra accepted answer).\n' +
    'Existing proposals (merge into one of these instead of duplicating by setting "merge_into" to its id): ' + JSON.stringify(existing) + '\n' +
    'Difficulty ratings (rating -1 too easy, 0 right, 1 too hard): ' + JSON.stringify(ratings) + '\n' +
    'Feedback notes: ' + JSON.stringify(items.map(f => ({ id: f.id, type: f.type, text: f.text, ctx: f.ctx }))) + '\n' +
    'Reply with only JSON: {"proposals":[{"title":"at most 8 words","kind":"content|code|design|copy","summary":"1-2 sentences","problem":"what learners hit, citing the notes","change":"precise description of what to build or edit, detailed enough for an engineer","evidence":["feedback ids"],"impact":1-3,"effort":1-3,"areas":["lessons|stories|review|talk|onboarding|audio|design|other"],"merge_into":"existing id or empty"}]}';
  try {
    const r = await AI.sample.json(prompt, { modelTier: 'default', cache: false });
    const list = Array.isArray(r && r.proposals) ? r.proposals : [];
    const now = Date.now(); let made = 0, merged = 0;
    for (const [i, p] of list.slice(0, 12).entries()){
      const clean = { title: String(p.title || '').slice(0, 80), kind: ['content', 'code', 'design', 'copy'].includes(p.kind) ? p.kind : 'code', summary: String(p.summary || '').slice(0, 400), problem: String(p.problem || '').slice(0, 800), change: String(p.change || '').slice(0, 2000),
        evidence: (Array.isArray(p.evidence) ? p.evidence : []).map(String).slice(0, 40), impact: Math.max(1, Math.min(3, +p.impact || 2)), effort: Math.max(1, Math.min(3, +p.effort || 2)), areas: (Array.isArray(p.areas) ? p.areas : []).map(String).slice(0, 5) };
      if (!clean.title || !clean.change) continue;
      const target = p.merge_into && Studio.props.find(x => x.id === p.merge_into && x.status === 'pending');
      if (target){ await Live.db.doc('proposals/' + target.id).set(withoutId({ ...target, ...clean, evidence: [...new Set([...(target.evidence || []), ...clean.evidence])], updatedAt: now })); merged++; }
      else { const id = 'p' + now.toString(36) + i; await Live.db.doc('proposals/' + id).set({ ...clean, status: 'pending', createdAt: now, updatedAt: now, source: 'synthesis' }); made++; }
    }
    await Live.db.doc('proposals/_meta').set({ ...Studio.meta, lastSynthAt: now });
    Studio.status = made || merged ? made + ' new and ' + merged + ' updated ' + plural(made + merged, 'proposal') + ' are waiting for you.' : 'Claude found nothing new worth proposing.';
    Studio.tab = 'proposals'; Studio.filter = 'pending'; sfx('badge');
  } catch (e){ Studio.status = aiErrorText(e) || 'Synthesis failed. Try again.'; }
  Studio.busy = false; await loadStudio(); drawStudio();
}
function studioProposals(){
  const wrap = h('div', { class: 'studio-sec' });
  const approved = Studio.props.filter(p => p.status === 'approved');
  wrap.append(h('div', { class: 'chips' }, PROPOSAL_STATES.map(([k, l]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(Studio.filter === k), onclick: () => { Studio.filter = k; drawStudio(); } }, l + ' · ' + Studio.props.filter(p => p.status === k).length))));
  if (approved.length) wrap.append(h('section', { class: 'card flat' }, h('div', { class: 'row' }, h('div', { class: 'grow' }, h('b', null, approved.length + ' approved and waiting to be built'), h('p', { class: 'small muted' }, 'The weekly build picks these up automatically. To build sooner, copy the brief into a Claude chat.'))),
    h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => copyBrief(approved) }, 'Copy build brief')));
  const list = Studio.props.filter(p => p.status === Studio.filter);
  if (!list.length) wrap.append(h('p', { class: 'muted center', style: 'padding:18px 0' }, Studio.filter === 'pending' ? 'Nothing to review. New feedback shows up under Feedback.' : 'None yet.'));
  for (const p of list) wrap.append(proposalCard(p));
  const idea = h('textarea', { class: 'input', rows: '3', placeholder: 'Your own idea: what should change?' });
  wrap.append(h('section', { class: 'card' }, h('h3', null, 'Add your own'), idea, h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: async () => {
    const text = idea.value.trim(); if (!text) return;
    const now = Date.now(); await Live.db.doc('proposals/p' + now.toString(36) + 'o').set({ title: text.slice(0, 60), kind: 'code', summary: text.slice(0, 400), problem: '', change: text, evidence: [], impact: 2, effort: 2, areas: [], status: 'approved', createdAt: now, updatedAt: now, decidedAt: now, source: 'owner' });
    idea.value = ''; toast('Added to the build queue'); await loadStudio(); Studio.filter = 'approved'; drawStudio();
  } }, 'Add to the build queue')));
  return wrap;
}
function proposalCard(p){
  const dots = n => h('span', { class: 'dots3' }, [1, 2, 3].map(i => h('i', { class: i <= n ? 'on' : '' })));
  const note = h('textarea', { class: 'input', rows: '2', placeholder: 'Notes for the builder (optional)' }, p.note || '');
  const ev = (p.evidence || []).map(id => Studio.fb.find(f => f.id === id)).filter(Boolean);
  const set = async (status) => {
    const now = Date.now();
    await Live.db.doc('proposals/' + p.id).set(withoutId({ ...p, status, note: note.value.trim(), decidedAt: now, updatedAt: now }));
    sfx(status === 'approved' ? 'quest' : 'tap'); toast(status === 'approved' ? 'Approved. It’s in the build queue.' : status === 'rejected' ? 'Rejected' : 'Moved back to review');
    await loadStudio(); drawStudio();
  };
  return h('article', { class: 'card proposal k-' + p.kind },
    h('div', { class: 'row' }, h('span', { class: 'chip static' }, p.kind), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'Impact '), dots(p.impact || 2), h('span', { class: 'small muted' }, ' Effort '), dots(p.effort || 2)),
    h('h3', null, p.title), p.summary ? h('p', null, p.summary) : null,
    p.problem ? h('details', null, h('summary', null, 'The problem'), h('p', { class: 'small' }, p.problem)) : null,
    h('details', { open: p.status === 'pending' }, h('summary', null, 'What would change'), h('p', { class: 'small' }, p.change)),
    ev.length ? h('details', null, h('summary', null, ev.length + ' ' + plural(ev.length, 'note') + ' behind this'), h('ul', { class: 'ev-list' }, ev.slice(0, 8).map(f => h('li', null, '“' + (f.text || f.type) + '”')))) : null,
    p.status === 'shipped' ? h('p', { class: 'small good' }, ic('check'), ' Shipped' + (p.version ? ' in ' + p.version : '')) : null,
    p.status !== 'shipped' ? note : null,
    p.status === 'pending' ? h('div', { class: 'sheet-actions' }, h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => set('rejected') }, 'Reject'), h('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => set('approved') }, 'Approve'))
      : p.status !== 'shipped' ? h('button', { class: 'linkish small', type: 'button', onclick: () => set('pending') }, 'Move back to review') : null);
}
function copyBrief(list){
  const brief = 'Parlance build brief (' + today() + ')\nCode: github.com/mcolfax/parlance (read CLAUDE.md, then docs/ARCHITECTURE.md). Artifact: this Parlance app.\nImplement only these approved proposals, run npm test (FAIL 0), bump APP_VERSION and RELEASES in js/config.js, commit to main, republish to the same artifact, set content/config.latest, then set each proposal to status "shipped" with "version".\n\n' +
    list.map((p, i) => (i + 1) + '. [' + p.kind + '] ' + p.title + ' (id ' + p.id + ')\n   Change: ' + p.change + (p.note ? '\n   Owner note: ' + p.note : '')).join('\n\n');
  try { navigator.clipboard.writeText(brief).then(() => toast('Build brief copied'), () => sheet('Build brief', h('textarea', { class: 'input code', rows: '10', readonly: true }, brief), [{ label: 'Close' }])); }
  catch (e){ sheet('Build brief', h('textarea', { class: 'input code', rows: '10', readonly: true }, brief), [{ label: 'Close' }]); }
}
function studioContent(){
  const wrap = h('div', { class: 'studio-sec' });
  wrap.append(h('section', { class: 'card' }, h('h3', null, 'Live content packs'),
    h('p', { class: 'small muted' }, 'Packs in the shared database add or fix lessons and stories for every learner instantly, without a new release. Progress is kept by lesson id, so it carries over.'),
    Packs.list.length ? h('div', { class: 'pack-list' }, Packs.list.map(p => h('div', { class: 'setrow' },
      h('div', null, h('div', { class: 'set-l' }, p.title), h('div', { class: 'small muted' }, LANGS[p.lang].name + ' · ' + p.units.reduce((n, u) => n + u.lessons.length, 0) + ' new lessons · ' + p.lessons.length + ' fixes · ' + p.stories.length + ' stories')),
      h('span', { class: 'toggle' }, h('input', { type: 'checkbox', checked: p.enabled !== false, 'aria-label': 'Enable ' + p.title, onchange: async e => { try { await Live.db.doc('content/' + p.id).update({ enabled: e.target.checked, updatedAt: Date.now() }); toast(e.target.checked ? 'Pack on for everyone' : 'Pack off for everyone'); } catch (er) { toast('Couldn’t change it. Try again.'); } } }), h('span'))))) : h('p', { class: 'small muted' }, 'No packs yet. Share a tutor-written lesson from its intro screen, or ask Claude to write a pack.'),
    Packs.errors.length ? h('details', null, h('summary', null, Packs.errors.length + ' content ' + plural(Packs.errors.length, 'problem') + ' skipped'), h('ul', { class: 'ev-list' }, Packs.errors.slice(0, 20).map(e => h('li', { class: 'small' }, e)))) : null));
  const t = h('input', { class: 'input', placeholder: 'Title, e.g. New stories are here', maxlength: '80' });
  const b = h('textarea', { class: 'input', rows: '3', placeholder: 'Message', maxlength: '700' });
  wrap.append(h('section', { class: 'card' }, h('h3', null, 'Announce something'), h('p', { class: 'small muted' }, 'Everyone sees it once, the next time they open Parlance.'), t, b,
    h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: async () => {
      if (!t.value.trim()) return toast('Add a title');
      await setConfig({ announce: { id: 'a' + Date.now().toString(36), title: t.value.trim(), body: b.value.trim(), at: Date.now() } }); t.value = ''; b.value = ''; toast('Announcement sent');
    } }, 'Send to everyone')));
  const latest = Live.config && Live.config.latest;
  wrap.append(h('section', { class: 'card' }, h('h3', null, 'Versions'),
    h('p', { class: 'small' }, 'You’re running ' + APP_VERSION + '. Open apps are told the latest is ' + (latest || 'not set') + '.'),
    h('p', { class: 'small muted' }, 'After publishing a new version, tap below so anyone with Parlance open gets a Refresh banner. Progress is never touched.'),
    h('button', { class: 'btn btn-quiet btn-sm', type: 'button', disabled: latest === APP_VERSION, onclick: async () => { await setConfig({ latest: APP_VERSION }); toast('Open apps will offer a refresh'); drawStudio(); } }, 'Mark ' + APP_VERSION + ' as latest')));
  return wrap;
}
async function setConfig(patch){
  const ref = Live.db.doc('content/config'); let cur = {};
  try { const s = await ref.get(); if (s.exists) cur = JSON.parse(JSON.stringify(s.data())); } catch (e) {}
  await ref.set({ ...cur, ...patch, kind: 'config', updatedAt: Date.now() });
}
function studioReleases(){
  return h('div', { class: 'studio-sec' }, RELEASES.map(r => h('section', { class: 'card' }, h('span', { class: 'eyebrow' }, 'Version ' + r.v + ' · ' + r.date), h('h3', null, r.title), h('ul', { class: 'wn-list' }, r.notes.map(n => h('li', null, n))))));
}
