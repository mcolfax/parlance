"use strict";
/* ===================== UI SHELL ===================== */
const UI = { tab: 'learn', justDone: null, wordFilter: 'v', wordQuery: '', talkLevel: null, genLevel: null, genTopic: '', genBusy: false, genStatus: '', genCtl: null, open: new Set(), openLang: null, animate: true, helloAt: 0 };
function applyLang(){ document.documentElement.setAttribute('data-lang', S.settings.lang); }
function setLang(lang){ if (S.settings.lang === lang) return; S.settings.lang = lang; UI.talkLevel = null; UI.genLevel = null; UI.openLang = null; touchSettings(); applyLang(); if (recOn()) recIndex(lang); UI.animate = true; render(); window.scrollTo(0, 0); }
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2800); }
function sheet(title, body, actions){
  const back = h('div', { class: 'sheet-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 160); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  const acts = h('div', { class: 'sheet-actions' }, (actions || []).map(a => h('button', { class: 'btn ' + (a.primary ? 'btn-primary' : 'btn-quiet'), type: 'button', onclick: async () => { const keep = a.run && await a.run(close); if (!keep) close(); } }, a.label)));
  const box = h('div', { class: 'sheet' }, h('div', { class: 'grip', 'aria-hidden': 'true' }), h('h3', null, title), body, acts);
  back.append(box);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.body.append(back);
  const f = box.querySelector('textarea,input,button:not(.danger)'); if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } box.scrollTop = 0; }, 40);
  return close;
}
function renderTabs(){
  const lang = S.settings.lang; const due = dueCount(lang);
  const tabs = [['learn', 'Learn'], ['stories', 'Stories'], ['review', 'Review'], ['talk', 'Talk'], ['friends', 'Friends'], ['me', 'Me']];
  const cl = LEVELS.indexOf(currentLevel(lang));
  const freshStories = allStories().some(s => s.lang === lang && LEVELS.indexOf(s.level) <= cl && !S.langs[lang].stories[s.id]);
  $('#tabs').replaceChildren(h('div', { class: 'tabs-in' }, tabs.map(([id, label]) =>
    h('button', { class: 'tab', type: 'button', 'aria-current': UI.tab === id ? 'page' : null, onclick: () => { if (UI.tab === id){ window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); return; } UI.tab = id; UI.animate = true; haptic(6); render(); window.scrollTo(0, 0); } },
      h('span', { class: 'tab-ic', html: IC[id], 'aria-hidden': 'true' }), h('span', null, label),
      id === 'review' && due ? h('span', { class: 'badge' }, due > 99 ? '99+' : due) : null,
      id === 'stories' && freshStories ? h('span', { class: 'badge dot', 'aria-label': 'New stories' }) : null,
      id === 'friends' && socialAlerts() ? h('span', { class: 'badge dot', 'aria-label': 'New from friends' }) : null))));
}
function render(){
  applyLang();
  closeGloss();
  const views = { learn: viewLearn, stories: viewStories, review: viewReview, talk: viewTalk, friends: viewFriends, me: viewMe };
  const v = (views[UI.tab] || viewLearn)();
  if (UI.animate && !reduced()){ v.classList.add('enter'); [...v.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8))); }
  UI.animate = false;
  $('#app').replaceChildren(v);
  renderTabs();
  songSync();
}


/* ===================== RENDERING TARGET TEXT ===================== */
function flash(el){ el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 350); }
function coreWord(part){ return part.replace(/^[¿¡"“„«(]+|[.,!?;:"“”»)…]+$/g, ''); }
function sayText(text, lang, opts = {}){
  const wrap = h('span', { class: 'say', lang: LANGS[lang] ? LANGS[lang].tts : 'en' });
  let k = 0;
  for (const part of String(text).split(/(\s+)/)){
    if (!part) continue;
    if (/^\s+$/.test(part)){ wrap.append(part); continue; }
    if (!/[\p{L}\p{N}]/u.test(part)){ wrap.append(part); continue; }   // a dash on its own is punctuation, not a word to tap
    const core = coreWord(part);
    const span = h('span', { class: 'w' }, part);
    if (lang === 'de' && NOUNS.has(core)) span.classList.add('g-' + NOUNS.get(core));
    if (opts.miss && core && fold(norm(core, lang)).split(' ').some(w => w && !opts.miss.has(w))) span.classList.add('miss');
    if (opts.marks && opts.marks[k]) span.classList.add('dif');
    k++;
    span.addEventListener('click', e => { e.stopPropagation(); if (opts.gloss) showGloss(span, core || part, lang, { line: String(text), en: opts.en }); else { speak(core || part, lang, false, opts.voice); flash(span); } });
    wrap.append(span);
  }
  if (opts.gloss) wrap.classList.add('gl');
  return wrap;
}
/* tap-to-translate popover. Every word in the built-in content has a meaning (lessons, common words, the story glossary
   and the cast's names). For anything else (Talk, live packs) the tutor looks the word up in its sentence when Claude
   is there, and the popover shows the whole line's translation when it isn't. */
const Gloss = { el: null, anchor: null, asked: new Map() };
function closeGloss(){
  if (Gloss.el){ const el = Gloss.el; Gloss.el = null; el.classList.add('out'); setTimeout(() => el.remove(), 140); }
  if (Gloss.anchor){ Gloss.anchor.classList.remove('on'); Gloss.anchor = null; }
}
function showGloss(span, word, lang, ctx = {}){
  const again = Gloss.anchor === span; closeGloss(); speak(word, lang); flash(span); haptic(6); if (!again) sfx('tap');
  if (again) return;
  const key = lang + '|' + fold(norm(word, lang));
  const g = glossLookup(word, lang) || Gloss.asked.get(key);
  const ask = !g && aiOn() && ctx.line;
  const meaning = h('div', { class: 'gl-e' + (g ? '' : ' muted') }, g ? g.val : ask ? 'Looking it up…' : 'Not in the word list yet');
  const base = h('div', { class: 'gl-base' }, g && g.base ? 'from ' + g.base : ''); base.hidden = !(g && g.base);
  const line = !g && ctx.en ? h('div', { class: 'gl-line' }, h('span', { class: 'gl-lbl' }, 'The whole line'), ctx.en) : null;
  const box = h('div', { class: 'gloss', role: 'tooltip' }, h('div', { class: 'gl-t', lang: LANGS[lang].tts }, word), meaning, base, line);
  document.body.append(box);
  span.classList.add('on'); Gloss.el = box; Gloss.anchor = span;
  placeGloss(box, span);
  if (ask) glossAsk(word, lang, ctx.line, key).then(r => {
    if (Gloss.el !== box) return;
    if (r){ meaning.textContent = r.val; meaning.classList.remove('muted'); if (r.base){ base.textContent = 'from ' + r.base; base.hidden = false; } if (line) line.remove(); }
    else meaning.textContent = 'Not in the word list yet';
    placeGloss(box, span);
  });
}
function placeGloss(box, span){
  box.classList.remove('below');
  const r = span.getBoundingClientRect(); const bw = box.offsetWidth || 180, bh = box.offsetHeight || 64;
  const left = Math.max(10, Math.min((window.innerWidth || 400) - bw - 10, r.left + r.width / 2 - bw / 2));
  let top = r.top - bh - 12; if (top < 8){ top = r.bottom + 12; box.classList.add('below'); }
  box.style.left = left + 'px'; box.style.top = top + 'px'; box.style.setProperty('--ax', Math.round(r.left + r.width / 2 - left) + 'px');
}
/* ask the tutor what a word means in its sentence; answers are kept for the session */
async function glossAsk(word, lang, line, key){
  if (Gloss.asked.has(key)) return Gloss.asked.get(key);
  const L = LANGS[lang].name;
  const text = 'A learner of ' + L + ' tapped one word in a sentence and wants to know what it means there.\n' +
    'Sentence: "' + String(line).slice(0, 300) + '"\nWord: "' + String(word).slice(0, 40) + '"\n' +
    'Reply with only JSON: {"meaning": "what the word means in this sentence, in a few plain English words", "base": "its dictionary form in ' + L + ' if that is different, or empty"}';
  try {
    const r = await AI.sample.json(text, { modelTier: 'quick' });
    const val = r && String(r.meaning ?? '').trim().slice(0, 90);
    if (val){
      const b = String(r.base ?? '').trim().slice(0, 40);
      const v = { val, base: b && fold(norm(b, lang)) !== fold(norm(word, lang)) ? b : '' };
      Gloss.asked.set(key, v); return v;
    }
  } catch (e) { aiErrorText(e); }
  return null;
}
document.addEventListener('pointerdown', e => { if (Gloss.el && !Gloss.el.contains(e.target) && !(Gloss.anchor && Gloss.anchor.contains(e.target))) closeGloss(); }, true);
document.addEventListener('scroll', () => { if (Gloss.el) closeGloss(); }, true);
function itemText(item, lang, opts = {}){
  const parts = item.t.split(' ');
  const art = parts[0].toLowerCase();
  if (lang === 'de' && item.g && LANGS.de.articles.includes(art) && parts.length > 1){
    const span = h('span', { class: 'noun g-' + item.g, lang: 'de-DE' }, h('span', { class: 'art' }, parts[0]), ' ' + parts.slice(1).join(' '));
    if (!opts.noTap) span.addEventListener('click', e => { e.stopPropagation(); speak(item.t, lang); });
    return span;
  }
  if (opts.noTap) return h('span', { lang: LANGS[lang].tts }, item.t);
  return sayText(item.t, lang, opts);
}
function plainTarget(text, lang){
  const core = coreWord(text);
  if (lang === 'de' && NOUNS.has(core)) return h('span', { class: 'g-' + NOUNS.get(core) }, text);
  return h('span', null, text);
}
function speakBtn(text, lang, label, vo){ const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': label || 'Play audio', html: IC.speaker }); b.addEventListener('click', e => { e.stopPropagation(); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); speak(text, lang, false, vo); }); return b; }
function slowBtn(text, lang, vo){ const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Play slowly', html: IC.slow }); b.addEventListener('click', e => { e.stopPropagation(); speak(text, lang, true, vo); }); return b; }


/* ===================== OVERLAY ===================== */
const Run = { active: false };
const OV = {};
function openOverlay(kind){
  closeOverlay(true);
  const ov = h('div', { class: 'overlay' + (kind ? ' ' + kind : ''), role: 'dialog', 'aria-modal': 'true' });
  OV.root = ov;
  OV.head = h('div', { class: 'ov-head' });
  OV.body = h('div', { class: 'ov-body' }); OV.bodyIn = h('div', { class: 'ov-body-in' }); OV.body.append(OV.bodyIn);
  OV.foot = h('div', { class: 'ov-foot' }); OV.footIn = h('div', { class: 'ov-foot-in' }); OV.foot.append(OV.footIn);
  ov.append(OV.head, OV.body, OV.foot);
  document.body.append(ov);
  document.body.classList.add('locked');
  fitOverlay();
  songSync(0);
}
function closeOverlay(instant){
  const root = OV.root; OV.root = null;
  document.body.classList.remove('locked');
  speakStop();
  songSync(300);
  if (!root) return;
  if (instant || reduced()) root.remove();
  else { root.classList.add('out'); setTimeout(() => root.remove(), 220); }
}
function fitOverlay(){
  if (!OV.root || !window.visualViewport) return;
  const vv = window.visualViewport;
  OV.root.style.height = vv.height + 'px';
  OV.root.style.top = vv.offsetTop + 'px';
}
if (window.visualViewport){ window.visualViewport.addEventListener('resize', fitOverlay); window.visualViewport.addEventListener('scroll', fitOverlay); }
function swapBody(nodes){
  OV.bodyIn.replaceChildren(...[].concat(nodes).filter(Boolean));
  if (!reduced()){ OV.bodyIn.classList.remove('slide'); void OV.bodyIn.offsetWidth; OV.bodyIn.classList.add('slide'); }
  OV.body.scrollTop = 0;
}

