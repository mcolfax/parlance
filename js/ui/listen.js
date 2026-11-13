"use strict";
/* ===================== LISTEN HANDS-FREE (Review) =====================
   Your words and phrases read aloud: each one twice, with a pause to say it back, and its meaning shown in between.
   It never moves a review card, pays no XP and counts toward no quest. Wake Lock keeps the screen on while it plays;
   Media Session puts the line and play, pause, next and previous on headphones and the lock screen where the phone
   supports it. Stories use wakeHold() too (Listen first, stories.js). */
const Listen = { open: false, playing: false, items: [], pos: 0, reveal: false, gen: 0, lang: 'de', drawn: -1 };
const Wake = { lock: null, want: false, req: false };
async function wakeHold(on){
  Wake.want = on;
  try {
    if (on && !Wake.lock && !Wake.req && navigator.wakeLock && document.visibilityState === 'visible'){
      Wake.req = true;
      let lock; try { lock = await navigator.wakeLock.request('screen'); } finally { Wake.req = false; }
      if (!Wake.want){ await lock.release(); return; }   // it was let go of while the request was on its way
      Wake.lock = lock; lock.addEventListener('release', () => { if (Wake.lock === lock) Wake.lock = null; });
    }
    if (!on && Wake.lock){ const l = Wake.lock; Wake.lock = null; await l.release(); }
  } catch (e) { Wake.lock = null; }
}
document.addEventListener('visibilitychange', () => { if (Wake.want && document.visibilityState === 'visible') wakeHold(true); });
const lsWait = ms => new Promise(r => setTimeout(r, ms));
/* due items first, then your shakiest; one entry per text */
function listenItems(lang){
  const seen = new Set(), out = [];
  const add = e => { const t = e.item && e.item.t; if (!t || seen.has(t)) return; seen.add(t); out.push({ t, e: (e.item.e || [])[0] || '', item: e.item }); };
  dueEntries(lang).forEach(add);
  learnedEntries(lang).sort((a, b) => (a.card.ef - b.card.ef) || ((b.card.lapses || 0) - (a.card.lapses || 0))).forEach(add);
  return out.slice(0, LISTEN.max);
}
function startListen(){
  const lang = S.settings.lang, items = listenItems(lang); if (items.length < LISTEN.min) return;
  Object.assign(Listen, { open: true, playing: true, items, pos: 0, reveal: false, lang, drawn: -1 });
  openOverlay('listen'); sfx('open'); recWarm(lang, items.map(i => i.t));
  listenHead(); listenSession(true); listenLoop(); wakeHold(true);   // listenLoop speaks inside this tap (iPhone)
}
function endListen(){ Listen.open = false; Listen.playing = false; Listen.gen++; listenSession(false); wakeHold(false); closeOverlay(); UI.animate = true; render(); }
async function listenLoop(){
  const my = ++Listen.gen, stale = () => my !== Listen.gen;
  while (Listen.open && Listen.playing && Listen.pos < Listen.items.length){
    const it = Listen.items[Listen.pos]; Listen.reveal = false; listenDraw(); listenMeta(it);
    await speak(it.t, Listen.lang); if (stale()) return;
    await lsWait(LISTEN.gapSay); if (stale()) return;
    Listen.reveal = true; listenDraw();
    await lsWait(LISTEN.gapReveal); if (stale()) return;
    await speak(it.t, Listen.lang); if (stale()) return;
    await lsWait(LISTEN.gapNext); if (stale()) return;
    Listen.pos++;
  }
  if (!stale() && Listen.open && Listen.pos >= Listen.items.length) listenEnd();
}
function listenPlay(){ if (!Listen.open || Listen.playing) return; Listen.playing = true; wakeHold(true); listenLoop(); }
function listenPause(){ if (!Listen.open) return; Listen.playing = false; Listen.gen++; speakStop(); wakeHold(false); listenDraw(); listenState(); }
function listenStep(d){
  if (!Listen.open) return;
  Listen.gen++; speakStop(); Listen.pos = Math.max(0, Math.min(Listen.items.length, Listen.pos + d)); Listen.reveal = false;
  if (Listen.pos >= Listen.items.length) return listenEnd();
  if (Listen.playing) listenLoop(); else listenDraw();
}
function listenHead(){
  OV.prog = h('i');
  OV.head.replaceChildren(
    h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => endListen() }),
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Listening progress' }, OV.prog),
    h('span', { class: 'icon-spacer' }));
}
/* the card for the item being heard, and the controls under it; the meaning fades in during the pause */
function listenDraw(){
  if (!Listen.open || !OV.root || !OV.root.classList.contains('listen')) return;
  const lang = Listen.lang, n = Listen.items.length, pos = Math.min(Listen.pos, n - 1), it = Listen.items[pos];
  if (!it) return;
  if (OV.prog) OV.prog.style.width = (Listen.pos / n * 100).toFixed(1) + '%';
  swapBody(h('div', { class: 'listen' },
    h('span', { class: 'eyebrow' }, 'Listen hands-free · ' + LANGS[lang].name),
    h('div', { class: 'ls-card' },
      h('div', { class: 'ls-t', lang: LANGS[lang].tts }, it.item.g ? itemText(it.item, lang, { noTap: true }) : it.t),
      h('div', { class: 'ls-e' + (Listen.reveal ? ' on' : '') }, it.e)),
    h('p', { class: 'ls-count small muted' }, (pos + 1) + ' of ' + n),
    h('p', { class: 'small muted' }, 'Say it after the voice. The meaning shows in the pause.')), Listen.drawn === pos);
  Listen.drawn = pos;
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous', html: IC.prev, onclick: () => listenStep(-1) });
  const play = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => Listen.playing ? listenPause() : listenPlay() }, ic(Listen.playing ? 'pause' : 'play'), Listen.playing ? 'Pause' : 'Play');
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next', html: IC.next, onclick: () => listenStep(1) });
  OV.foot.className = 'ov-foot';
  OV.footIn.replaceChildren(h('div', { class: 'ls-controls' }, prev, play, next));
}
/* Media Session: the line on the lock screen and the headphone buttons, where the phone has it; silent where it doesn't */
function listenMeta(it){
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: it.t, artist: it.e, album: 'Parlance · ' + LANGS[Listen.lang].name });
    navigator.mediaSession.playbackState = Listen.playing ? 'playing' : 'paused';
  } catch (e) {}
}
function listenState(){
  if (!('mediaSession' in navigator)) return;
  try { navigator.mediaSession.playbackState = Listen.playing ? 'playing' : 'paused'; } catch (e) {}
}
function listenSession(on){
  if (!('mediaSession' in navigator)) return;
  const hs = { play: listenPlay, pause: listenPause, nexttrack: () => listenStep(1), previoustrack: () => listenStep(-1) };
  for (const [a, fn] of Object.entries(hs)) try { navigator.mediaSession.setActionHandler(a, on ? fn : null); } catch (e) {}
  if (!on) try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (e) {}
}
function listenEnd(){
  Listen.playing = false; Listen.gen++; wakeHold(false); listenSession(false); sfx('done');
  const n = Listen.items.length;
  if (OV.prog) OV.prog.style.width = '100%';
  swapBody(h('div', { class: 'listen done' }, pip('cheer', 78, { tap: false }), h('h1', null, 'All ' + n + ' heard.'),
    h('p', { class: 'muted' }, dueCount(Listen.lang) ? 'Listening doesn’t move your review schedule, so your reviews are still waiting in Review.' : 'Come back any time for another round.')));
  OV.foot.className = 'ov-foot';
  OV.footIn.replaceChildren(h('div', { class: 'ls-controls' },
    h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => { Listen.pos = 0; Listen.playing = true; listenSession(true); wakeHold(true); listenLoop(); } }, 'Again'),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: endListen }, 'Done')));
}
