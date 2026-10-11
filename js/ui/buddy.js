"use strict";
/* ===================== YOUR BIRD (customizer) =====================
   Every learner gets their own bird. They start from a named preset (config.js PIP_PRESETS), then
   change its name, colors, shape and markings. Whatever they pick is drawn by the one bird rig in
   art.js, so every mood and animation works for every combination.
   Saved as S.settings.pip = { preset, name, look } where look is null while it still matches the
   preset, so improvements to a preset reach everyone who hasn't changed it.
   ================================================================== */
const Buddy = { open: false, draft: null, mood: 'happy', part: null, onDone: null };
const BUDDY_MOODS = [['happy', 'Happy'], ['cheer', 'Cheer'], ['think', 'Think'], ['oops', 'Oops'], ['sleep', 'Sleep'], ['wow', 'Wow']];
function copyLook(l){ return { ...l, marks: [...(l.marks || [])], c: { ...(l.c || {}) } }; }
function buddyDraft(){ const p = S.settings.pip; return { preset: p.preset, name: p.name, look: copyLook(p.look || pipPreset(p.preset).look) }; }
function buddyLook(){ return cleanLook(Buddy.draft.look, pipPreset(Buddy.draft.preset).look); }
function buddyCustom(d){ return !same(cleanLook(d.look, pipPreset(d.preset).look), cleanLook(pipPreset(d.preset).look)); }
function openBuddy(opts = {}){
  Object.assign(Buddy, { open: true, draft: buddyDraft(), mood: 'happy', part: null, onDone: opts.onDone || null });
  openOverlay('buddy'); sfx('open');
  OV.head.replaceChildren(h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close without saving', html: IC.close, onclick: () => closeBuddy(false) }),
    h('div', { class: 'ov-title grow' }, h('span', { class: 'ov-name' }, 'Your bird'), h('span', { class: 'ov-sub muted' }, 'Every look works with every mood')));
  Buddy.stage = h('div', { class: 'bd-stage' });
  Buddy.nameIn = h('input', { class: 'input', id: 'bd-name', maxlength: '16', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: Buddy.draft.name, placeholder: pipPreset(Buddy.draft.preset).pet || pipPreset(Buddy.draft.preset).name,
    oninput: e => { Buddy.draft.name = e.target.value; drawBuddyStage(); } });
  Buddy.opts = h('div', { class: 'bd-opts' });
  OV.bodyIn.replaceChildren(Buddy.stage, h('div', { class: 'field' }, h('label', { for: 'bd-name' }, 'Name'), Buddy.nameIn), Buddy.opts);
  OV.foot.className = 'ov-foot';
  OV.footIn.replaceChildren(h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => closeBuddy(true) }, 'Save'));
  drawBuddy();
}
function buddyName(){ const n = (Buddy.draft.name || '').trim(); return n || pipPreset(Buddy.draft.preset).pet || pipPreset(Buddy.draft.preset).name; }
function drawBuddyStage(){
  const look = buddyLook(), pre = pipPreset(Buddy.draft.preset);
  const bird = pip(Buddy.mood, 128, { look, cls: 'bd-bird', lang: S.settings.lang });
  Buddy.stage.replaceChildren(
    h('div', { class: 'bd-show' }, bird,
      h('div', { class: 'bd-id' }, h('b', null, buddyName()), h('span', { class: 'small muted' }, (buddyCustom(Buddy.draft) ? 'Your own ' : 'A ') + pre.kind))),
    h('div', { class: 'bd-moods', role: 'group', 'aria-label': 'Try a mood' }, BUDDY_MOODS.map(([m, l]) =>
      h('button', { class: 'chip-btn', type: 'button', 'aria-pressed': String(Buddy.mood === m), onclick: () => { Buddy.mood = m; if (m === 'cheer') sfx('chirp'); drawBuddyStage(); } }, l))));
}
function bSet(fn){ fn(Buddy.draft.look); Buddy.draft.look = buddyLook(); sfx('tap'); haptic(5); drawBuddy(); }
function drawBuddy(){
  drawBuddyStage();
  const d = Buddy.draft, look = buddyLook();
  const sec = (title, sub, ...kids) => h('section', { class: 'bd-sec' }, h('div', { class: 'bd-sec-h' }, h('h3', null, title), sub ? h('span', { class: 'small muted' }, sub) : null), ...kids);
  // presets
  const presets = h('div', { class: 'bd-presets' }, Object.entries(PIP_PRESETS).map(([id, p]) =>
    h('button', { class: 'bd-preset', type: 'button', 'aria-pressed': String(d.preset === id), onclick: () => {
      const keepName = d.name && d.name !== (pipPreset(d.preset).pet || pipPreset(d.preset).name);
      Buddy.draft = { preset: id, name: keepName ? d.name : '', look: copyLook(p.look) };
      Buddy.nameIn.value = Buddy.draft.name; Buddy.nameIn.placeholder = p.pet || p.name;
      Buddy.mood = 'cheer'; sfx('chirp'); haptic(8); drawBuddy();
    } }, pip('happy', 64, { look: p.look, tap: false }), h('b', null, p.name), h('span', null, p.kind))));
  // palettes
  const sw = c => h('span', { class: 'bd-sw', 'aria-hidden': 'true' }, ['body', 'wing', 'crest'].map(k => h('i', { style: c[k] ? 'background:' + c[k] : 'background:var(--line)' })));
  const palettes = h('div', { class: 'chips' }, PIP_PALETTES.map(pl =>
    h('button', { class: 'chip bd-pal', type: 'button', 'aria-pressed': String(same(look.c, cleanLook({ ...look, c: pl.c }).c)), onclick: () => bSet(l => { l.c = { ...pl.c }; }) }, sw(pl.c), pl.name)));
  // shape
  const seg = (key, label) => h('div', { class: 'bd-row' }, h('span', { class: 'lbl' }, label),
    h('div', { class: 'seg small-seg bd-seg', role: 'group', 'aria-label': label }, PIP_SHAPES[key].map(([v, l]) =>
      h('button', { type: 'button', 'aria-pressed': String(look[key] === v), onclick: () => bSet(x => { x[key] = v; if (key === 'crest' && v !== 'none') Buddy.mood = 'cheer'; }) }, l))));
  const outline = h('div', { class: 'setrow' }, h('label', { for: 'bd-ol' }, h('div', { class: 'set-l' }, 'Outline'), h('div', { class: 'small muted' }, 'A dark line around the bird, like a sticker.')),
    h('span', { class: 'toggle' }, h('input', { type: 'checkbox', id: 'bd-ol', checked: !!look.outline, onchange: e => bSet(x => { x.outline = e.target.checked; }) }), h('span')));
  // markings
  const marks = h('div', { class: 'chips' }, PIP_MARKS.map(([m, l]) =>
    h('button', { class: 'chip', type: 'button', 'aria-pressed': String(look.marks.includes(m)), onclick: () => bSet(x => { x.marks = x.marks.includes(m) ? x.marks.filter(y => y !== m) : [...x.marks, m]; }) }, l)));
  // fine-tune colors: only the parts this bird shows
  const parts = PIP_PARTS.filter(([, , when]) => !when || when(look));
  const tune = h('div', { class: 'bd-parts' }, parts.map(([k, label]) => {
    const open = Buddy.part === k, cur = look.c[k];
    const row = h('button', { class: 'bd-part', type: 'button', 'aria-expanded': String(open), onclick: () => { Buddy.part = open ? null : k; drawBuddy(); } },
      h('span', { class: 'bd-dot' + (cur ? '' : ' auto'), style: cur ? 'background:' + cur : null }), h('span', { class: 'grow' }, label), h('span', { class: 'small muted' }, cur ? '' : 'Auto'), h('span', { class: 'bd-chev', html: IC.back, 'aria-hidden': 'true' }));
    if (!open) return row;
    const pick = h('input', { type: 'color', class: 'bd-pick', 'aria-label': label + ': any color', value: cur || '#13828C',
      oninput: e => { Buddy.draft.look.c[k] = e.target.value.toUpperCase(); drawBuddyStage(); },
      onchange: e => bSet(x => { x.c[k] = e.target.value.toUpperCase(); }) });
    return h('div', { class: 'bd-part-open' }, row, h('div', { class: 'bd-swatches', role: 'group', 'aria-label': label + ' color' },
      h('button', { class: 'bd-swatch auto', type: 'button', 'aria-pressed': String(!cur), 'aria-label': 'Automatic', title: 'Automatic', onclick: () => bSet(x => { delete x.c[k]; }) }, 'Auto'),
      PIP_SWATCHES.map(c => h('button', { class: 'bd-swatch', type: 'button', style: 'background:' + c, 'aria-pressed': String(cur === c), 'aria-label': c, onclick: () => bSet(x => { x.c[k] = c; }) })),
      h('label', { class: 'bd-swatch more', title: 'Any color' }, h('span', { 'aria-hidden': 'true' }, '+'), pick)));
  }));
  const custom = buddyCustom(d);
  Buddy.opts.replaceChildren(
    sec('Start from', 'Each one is a different kind of parrot.', presets),
    sec('Colors', 'One tap recolors the whole bird.', palettes),
    sec('Shape', null, h('div', { class: 'bd-shape' }, seg('size', 'Size'), seg('crest', 'Crest'), seg('face', 'Face'), seg('beak', 'Beak'), seg('tail', 'Tail')), outline),
    sec('Markings', null, marks),
    sec('Fine-tune colors', 'Auto picks a color that goes with the body.', tune),
    custom ? h('button', { class: 'linkish', type: 'button', style: 'align-self:center', onclick: () => { Buddy.draft.look = copyLook(pipPreset(d.preset).look); Buddy.part = null; sfx('tap'); drawBuddy(); } }, 'Reset to ' + pipPreset(d.preset).name) : null);
}
function closeBuddy(save){
  if (!Buddy.open) return;
  Buddy.open = false;
  if (save){
    const d = Buddy.draft;
    const pre = pipPreset(d.preset);
    const look = buddyCustom(d) ? buddyLook() : null;
    const name = (d.name || '').trim() === (pre.pet || pre.name) ? '' : d.name;
    S.settings.pip = cleanPip({ ...S.settings.pip, preset: d.preset, name, look });
    touchSettings();
  }
  closeOverlay(); sfx('close');
  const cb = Buddy.onDone; Buddy.onDone = null;
  if (cb) cb(save);
  else { UI.animate = false; render(); }
  if (save) toast('Saved. Say hi to ' + pipName() + '!');
}
/* the card on Me */
function buddyCard(){
  const p = S.settings.pip, pre = pipPreset(p.preset);
  return h('section', { class: 'card bd-card' },
    h('div', { class: 'row' }, pip('happy', 72, { cls: 'bd-card-pip' }),
      h('div', { class: 'grow' }, h('h3', null, pipName()), h('p', { class: 'small muted' }, p.look ? 'Your own ' + pre.kind + ', based on ' + pre.name + '.' : pre.blurb))),
    h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => openBuddy() }, ic('wand'), 'Customize your bird'));
}
/* onboarding step: pick a bird and name it (the full customizer is in Me) */
function buddyPicker(sel, onPick){
  return h('div', { class: 'bd-presets onb' }, Object.entries(PIP_PRESETS).map(([id, p]) =>
    h('button', { class: 'bd-preset', type: 'button', 'aria-pressed': String(sel === id), onclick: () => onPick(id) },
      pip(sel === id ? 'cheer' : 'happy', 70, { look: p.look, tap: false }), h('b', null, p.name), h('span', null, p.kind))));
}
