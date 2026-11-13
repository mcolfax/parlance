# Listen hands-free: your words read aloud, and stories you can listen to

- **Cycle:** 2026-11-13-3 (premium program P5, `flow/PREMIUM.md`)
- **Status:** building
- **Release:** 4.41.0
- **Base:** `main` at a69d0b6 (4.40.0)
- **Proposals built:** none
- **Roadmap items:** R-7, new R-25
- **Needs:** P1 shipped (`practiceTiles()` in `js/ui/review.js`). If P1's WP3 was dropped, WP1 adds its Review button the old way: a `btn btn-ghost btn-wide` in the Review hero, labelled `Listen hands-free`.

## Why this, why now

Every word, phrase and story line in the course is already recorded with natural voices (`media/voice/`), but you can only hear them one tap at a time. Paid apps sell audio-only practice for commutes, walks and chores. Parlance can offer it at no cost, since the recordings exist, and Matt uses it on his phone. **Listen hands-free** reads the learner's own words and phrases (due ones first, then the shakiest), each twice, with a pause to say it back and the meaning shown in between. **Listen first** (R-7) plays a story line by line in the cast's voices, with the text hidden until tapped. Neither changes review cards, XP or streaks.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Amber | Audio and speech (POLICY "Audio and speech"): new player built on `speak()`; Media Session and Wake Lock (browser APIs, no new host) | Uses only `speak()`/`speakStop()`; the theme song is held while listening (`busy()`); nothing plays after closing; no review card, XP or quest changes; check Android Chrome first |
| WP2 | Amber | Audio (story lines played in sequence) | Reading mode unchanged; finishing a listened story pays exactly what reading does; nothing plays after closing |

## Work packages

WP2 runs **after** WP1 (it uses WP1's icons, `LISTEN` config and `wakeHold()`).

### WP1 — Listen hands-free (Review)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** new `js/ui/listen.js`; `index.html` (one script tag); `js/core/util.js` (`busy()` and four `IC` entries); `js/config.js` (one new `LISTEN` line after `CHECKPOINT`); `js/ui/review.js` (one entry in `practiceTiles()`); `styles/components.css` (new `.listen` rules); `dev/test.js` (one block)
- **Reads first:** `speak()`, `speakStop()`, `recWarm()` in `js/core/audio.js` (`speak()` resolves when the line has finished); `openOverlay()`, `closeOverlay()`, `speakBtn()` in `js/ui/shell.js`; `busy()` and `IC` in `js/core/util.js`; `startReview()` in `js/ui/runner.js` (how items are chosen); `dueEntries()`, `learnedEntries()` in `js/core/engine.js`; `openStory()` in `js/ui/stories.js` (the overlay head pattern); `practiceTiles()` in `js/ui/review.js`.
- **Must not touch:** `js/core/audio.js`, `js/ui/runner.js`, `js/ui/stories.js`, `RELEASES`/`APP_VERSION`.

**Spec.**

*Config* (`js/config.js`, after `CHECKPOINT`):
```js
/* Listen hands-free (Review) and Listen first (Stories): items per session, the fewest learned items to offer it, and the pauses in ms */
const LISTEN = { max: 20, min: 6, gapSay: 1800, gapReveal: 1200, gapNext: 1500, storyGap: 700 };
```

*Icons* (`IC` in `js/core/util.js`, same 24-pixel style as `play`):
```js
headphones: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15h3v5H5a1 1 0 0 1-1-1zM20 15h-3v5h2a1 1 0 0 0 1-1z" fill="currentColor"/></svg>',
pause: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
next: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 5.5v13l9-6.5zM16 5h2.5v14H16z" fill="currentColor"/></svg>',
prev: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M18 5.5v13l-9-6.5zM8 5H5.5v14H8z" fill="currentColor"/></svg>',
```

*`busy()`* (`js/core/util.js`): add `|| (typeof Listen !== 'undefined' && Listen.open)` inside the `!!( … )`.

*`index.html`*: `<script src="js/ui/listen.js"></script>` directly after the `js/ui/review.js` tag.

*`js/ui/listen.js`* (new; classic script, `"use strict";` first, like the other UI files):
```js
"use strict";
/* ===================== LISTEN HANDS-FREE (Review) =====================
   Your words and phrases read aloud: each one twice, with a pause to say it back, and its meaning shown in between.
   It never moves a review card, pays no XP and counts toward no quest. Wake Lock keeps the screen on while it plays;
   Media Session puts the line and play, pause, next and previous on headphones and the lock screen where the phone
   supports it. Stories use wakeHold() too (Listen first, stories.js). */
const Listen = { open: false, playing: false, items: [], pos: 0, reveal: false, gen: 0, lang: 'de' };
const Wake = { lock: null, want: false };
async function wakeHold(on){
  Wake.want = on;
  try {
    if (on && !Wake.lock && navigator.wakeLock && document.visibilityState === 'visible'){ Wake.lock = await navigator.wakeLock.request('screen'); Wake.lock.addEventListener('release', () => { Wake.lock = null; }); }
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
  Object.assign(Listen, { open: true, playing: true, items, pos: 0, reveal: false, lang });
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
function listenPause(){ if (!Listen.open) return; Listen.playing = false; Listen.gen++; speakStop(); wakeHold(false); listenDraw(); }
function listenStep(d){
  if (!Listen.open) return;
  Listen.gen++; speakStop(); Listen.pos = Math.max(0, Math.min(Listen.items.length, Listen.pos + d)); Listen.reveal = false;
  if (Listen.pos >= Listen.items.length) return listenEnd();
  if (Listen.playing) listenLoop(); else listenDraw();
}
```
Also in `listen.js`:
- `listenHead()`: like `openStory()`'s head: a close button (`IC.close`, `aria-label` `Close`, `onclick: endListen`), the progress bar (`OV.prog = h('i')` inside `h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Listening progress' }, OV.prog)`) and `h('span', { class: 'icon-spacer' })`.
- `listenDraw()`: sets `OV.prog.style.width` to `pos / items.length`, then `swapBody(h('div', { class: 'listen' }, h('span', { class: 'eyebrow' }, 'Listen hands-free · ' + LANGS[lang].name), h('div', { class: 'ls-card' }, h('div', { class: 'ls-t', lang: LANGS[lang].tts }, it.item.g ? itemText(it.item, lang, { noTap: true }) : it.t), h('div', { class: 'ls-e' + (Listen.reveal ? ' on' : '') }, it.e)), h('p', { class: 'ls-count small muted' }, (pos + 1) + ' of ' + n), h('p', { class: 'small muted' }, 'Say it after the voice. The meaning shows in the pause.')))`, and the footer `OV.foot.className = 'ov-foot'; OV.footIn.replaceChildren(h('div', { class: 'ls-controls' }, prev, play, next))` with `prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous', html: IC.prev, onclick: () => listenStep(-1) })`, `play = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => Listen.playing ? listenPause() : listenPlay() }, ic(Listen.playing ? 'pause' : 'play'), Listen.playing ? 'Pause' : 'Play')`, `next` like `prev` with `IC.next`, `Next` and `listenStep(1)`. Don't redraw while `!Listen.open`.
- `listenMeta(it)` and `listenSession(on)`: Media Session, each wrapped in `if (!('mediaSession' in navigator)) return; try { … } catch (e) {}`. Meta: `navigator.mediaSession.metadata = new MediaMetadata({ title: it.t, artist: it.e, album: 'Parlance · ' + LANGS[Listen.lang].name })` and `navigator.mediaSession.playbackState = Listen.playing ? 'playing' : 'paused'`. Session: set the handlers `play → listenPlay`, `pause → listenPause`, `nexttrack → () => listenStep(1)`, `previoustrack → () => listenStep(-1)` when `on`, each with its own try/catch, and set all four to `null` and `metadata = null` when off.
- `listenEnd()`: `Listen.playing = false; Listen.gen++; wakeHold(false); listenSession(false); sfx('done');` then `swapBody(h('div', { class: 'listen done' }, pip('cheer', 78, { tap: false }), h('h1', null, 'All ' + n + ' heard.'), h('p', { class: 'muted' }, dueCount(Listen.lang) ? 'Listening doesn’t move your review schedule, so your reviews are still waiting in Review.' : 'Come back any time for another round.')))` and a footer with `h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => { Listen.pos = 0; Listen.playing = true; listenSession(true); wakeHold(true); listenLoop(); } }, 'Again')` and `h('button', { class: 'btn btn-primary', type: 'button', onclick: endListen }, 'Done')` inside `h('div', { class: 'ls-controls' }, …)`.

*Review tile* (`practiceTiles()` in `js/ui/review.js`), inserted right after the `weak` entry (before `speed`, if Time to play shipped):
```js
{ id: 'listen', icon: 'headphones', label: 'Listen hands-free', sub: 'Hear your words, say them back', show: learnedEntries(lang).length >= LISTEN.min, run: () => startListen() },
```

*CSS* (`styles/components.css`, a new section at the end of the Review rules):
```css
/* Listen hands-free (overlay) */
.listen{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding-top:8px}
.ls-card{width:100%;min-height:180px;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:28px 18px;background:var(--surface);border-radius:var(--r-xl);box-shadow:var(--shadow)}
.ls-t{font:800 clamp(22px,7vw,32px)/1.2 var(--display);color:var(--ink);overflow-wrap:anywhere}
.ls-e{font-size:18px;color:var(--muted);opacity:0;transition:opacity var(--dur) var(--ease)}
.ls-e.on{opacity:1}
.ls-controls{display:flex;align-items:center;justify-content:center;gap:16px;width:100%}
.ls-controls .btn{flex:1;max-width:220px}
@media (prefers-reduced-motion:reduce){.ls-e{transition:none}}
```

*Edge cases.* Natural voices off: `speak()` uses the device's voice and the loop still runs. A line that can't play: `speak()` resolves `false` and the loop moves on. Fewer than `LISTEN.min` learned items: no tile, and `startListen()` does nothing. Closing mid-line: `endListen()` bumps `gen` (the loop stops at its next check) and `closeOverlay()` calls `speakStop()`. The theme song: `busy()` holds it while `Listen.open`. Signed out and the web: nothing is saved. With the screen off, Android keeps a playing page's timers running, so it usually keeps going (Matt checks this on his phone; the tests can't).

**Steps.**
1. `LISTEN` in `js/config.js`; the four icons and `busy()` in `js/core/util.js`.
2. `js/ui/listen.js` as specified; the script tag in `index.html`.
3. The `listen` tile in `practiceTiles()`.
4. The CSS.
5. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top` (the `Q` page, which has learned items by then). For the block, replace speech with an instant stub, `Q.w.speak = () => Promise.resolve(true)` (use the window handle that the surrounding code uses), set `LISTEN.gapSay = LISTEN.gapReveal = LISTEN.gapNext = 1`, and restore both at the end.
6. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `listen: offered from 6 learned items`: `practiceTiles('es').some(t => t.id === 'listen')` equals `learnedEntries('es').length >= 6`.
  - `listen: due items first, no repeats, at most 20`: `listenItems('es')` has unique texts, length ≤ 20, and when `dueEntries('es').length` > 0 its first text is `dueEntries('es')[0].item.t`.
  - `listen: the song is held while it's open`: after `startListen()`, `busy() === true` and `document.querySelector('.overlay.listen')` exists.
  - `listen: pause, next and previous`: `listenPause()` → `Listen.playing === false`; `listenStep(1)` → `Listen.pos === 1`; `listenStep(-1)` → `Listen.pos === 0`.
  - `listen: plays to the end on its own`: `listenPlay()`, then wait (poll every 50ms, up to 10s) until the overlay text contains `heard.`; `Listen.pos === Listen.items.length`.
  - `listen: changes no card, XP or quest`: `JSON.stringify` of `S.langs.es.cards`, `S.langs.es.xp`, `S.langs.es.miss` and `S.days[today()]` are the same before `startListen()` and after the session ends.
  - `listen: Done closes it and nothing is open`: clicking `Done` → `Listen.open === false`, no `.overlay.listen`, `busy() === false`.
- [ ] `node dev/flow.js shots --steps "js:for(const l of coreOrder(S.settings.lang).slice(0,3))S.langs[S.settings.lang].done[l.id]={at:today(),acc:1,times:1};js:for(const l of coreOrder(S.settings.lang).slice(0,3))l.vocab.forEach((_,i)=>{S.langs[S.settings.lang].cards[itemKey(l,'v',i)]={ef:2.5,n:1,iv:1,due:today(),last:today(),ts:1}});tab:Review;wait:400;shot:review-listen;sel:[data-practice=listen];wait:600;shot:listen"` shows the tile and the player with no sideways scroll, light and dark, at 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the loop needs a change in `js/core/audio.js` to know when a line has finished (it must not: `speak()` resolves at the end); or the theme song keeps playing under the player in the tests.

### WP2 — Listen first (Stories, R-7)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 is merged
- **Owns (may edit):** `js/ui/stories.js` (`openStory`, `endStory`, `storyNext`, `storyLine`, new `storyListenStart`, `storyChain`, `storyListenFoot`), `styles/features.css` (new story-listening rules next to `.sline`), `dev/test.js` (one block)
- **Reads first:** all of `js/ui/stories.js` (139 lines); `wakeHold()` and `LISTEN` from WP1; the `.sline`/`.bubble` rules in `styles/features.css`.
- **Must not touch:** `js/ui/listen.js`, `js/core/*`, `finishStory()`'s XP and saving.

**Spec.** Before: a story opens on its scene with **Start reading**; each Continue shows the next line and, with autoplay on, speaks it. After: under the cast tags there's also **Listen first** (`btn btn-quiet btn-wide story-listen`, `ic('headphones')`). Tapping it hides that button and starts listen mode: each line appears with its text hidden behind a **Show text** chip, is spoken in its speaker's voice, and `LISTEN.storyGap` ms after it ends the next line follows on its own. The footer is one button, **Pause** or **Play**. A question stops the chain as reading does. Its Check and Continue work as now, and Continue goes on listening. Translate and Save work in listen mode too. Finishing is `finishStory()`, unchanged, so it pays what reading pays.

- `openStory()`: add `listen: false, paused: false, lgen: 0` to the `Object.assign(Story, …)`. After the tags, add the Listen first button (`onclick: e => { e.currentTarget.remove(); storyListenStart(); }`).
- New:
```js
function storyListenStart(){ Story.listen = true; Story.paused = false; wakeHold(true); storyNext(); }
function storyChain(it, st){
  const my = ++Story.lgen;
  speak(it.t, st.lang, false, CAST[it.who]).then(() => {
    if (my !== Story.lgen || !Story.open || !Story.listen || Story.paused) return;
    setTimeout(() => { if (my === Story.lgen && Story.open && Story.listen && !Story.paused) storyNext(); }, LISTEN.storyGap);
  });
}
function storyListenFoot(){
  storyFoot(Story.paused ? 'Play' : 'Pause', () => {
    if (Story.paused){ Story.paused = false; wakeHold(true); const it = Story.st.items[Story.pos - 1]; storyListenFoot(); if (it && it.who) storyChain(it, Story.st); else storyNext(); }
    else { Story.paused = true; Story.lgen++; speakStop(); wakeHold(false); storyListenFoot(); }
  });
}
```
- `storyNext()`: for a line, replace `if (S.settings.autoplay) speak(…)` and the `storyFoot('Continue' …)` call with: `if (Story.listen){ storyChain(it, st); storyListenFoot(); } else { if (S.settings.autoplay) speak(it.t, st.lang, false, CAST[it.who]); storyFoot(Story.pos >= st.items.length ? 'Finish' : 'Continue', () => storyNext()); }`. Questions stay as they are.
- `storyLine(it, st)`: when `Story.listen`, the `.t` div starts as `h('button', { class: 'chip-btn sl-reveal', type: 'button', onclick: e => e.currentTarget.replaceWith(text) }, ic('words'), 'Show text')`, where `text` is the existing `h('div', { class: 't' }, sayText(…))`. Otherwise unchanged.
- `endStory()`: first line `Story.lgen = (Story.lgen || 0) + 1; Story.listen = false; Story.paused = false; wakeHold(false);`.
- In `finishStory()`, add only `Story.lgen++; wakeHold(false);` at the top. No other change.
- CSS (`styles/features.css`, after `.sline` rules): `.story-listen{margin-top:4px}` and `.sl-reveal{align-self:flex-start}`.

**Steps.**
1. `js/ui/stories.js` as above.
2. The two CSS rules.
3. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`. Stub speech (`speak = () => Promise.resolve(true)` on that page's window) and set `LISTEN.storyGap = 1`; restore both at the end.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `story listening: Listen first plays lines on its own up to the first question`: `openStory('es-s1')`, click `.story-listen`; poll (up to 5s) until `Story.st.items[Story.pos - 1].q` is set; the number of `.sline` nodes equals the number of lines before the first question.
  - `story listening: lines start hidden behind Show text`: each `.sline` has a `.sl-reveal` and no `.t`; clicking one shows its `.t`.
  - `story listening: Pause stops it`: after answering the question and pressing Continue, press the footer `Pause`; `Story.pos` is unchanged after 200ms; `Play` moves it on again.
  - `story listening: finishing pays what reading pays`: finish the story answering every question right first time; the language's XP rose by exactly `XP.story + XP.storyPerfect` and `S.langs.es.stories['es-s1']` is set.
  - `story listening: reading mode is unchanged`: a story opened with **Start reading** has no `.sl-reveal` and shows a `Continue` footer after its first line.
- [ ] `node dev/flow.js shots --steps "tab:Stories;sel:.story-card;wait:900;shot:story-head;sel:.story-listen;wait:2500;shot:story-listening"` shows Listen first and the hidden lines with a Pause footer, light and dark, 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** finishing in listen mode needs a change to `finishStory()`'s XP or saving.

## Integration

After WP2 is merged (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION`, and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`: in "Where things live", the `js/ui/*.js` row's list gets `listen` after `review`. In "Recorded voices" → "Playing", add: "**Listen hands-free** (`js/ui/listen.js`, Review) and **Listen first** (Stories) play lines in sequence through `speak()`, holding the screen on with Wake Lock and showing the line on the lock screen with Media Session. Neither moves a review card or pays XP; a listened story finishes like a read one."
- [ ] No content changed: no pictures or voices to make. `node dev/voices.js --dry` should report 0 lines.

## Release notes

- **Title:** Listen hands-free
- **Notes:**
  - New in Review: Listen hands-free. Parlance reads your words and phrases aloud, twice each, with a pause to say them yourself and the meaning on screen.
  - Stories can now be heard first. Tap Listen first and the cast reads the story to you line by line, with the text hidden until you want it.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens: the two `shots` strings above, light and dark, `--width 412` and `--width 360`.
- Spot checks for the reviewer: read `js/ui/listen.js` in full (it's new); confirm no path plays audio after `endListen()`/`endStory()` (every timer checks `gen`/`lgen`); confirm `busy()` covers `Listen.open`.
- **Matt's phone check** (after ship; note the result in the plan's Outcome): on Android Chrome, start Listen hands-free, then lock the phone. Does it keep going, and do the headphone buttons pause and skip? If it stops when locked, add a roadmap row: "Listen hands-free: keep playing with the screen off (silent gap clips through the voice element)".

## Risks and rollback

- Background playback differs by phone. The screen stays on with Wake Lock, and nothing is lost if playback pauses.
- A runaway loop is the main risk: the generation counters and the "nothing plays after closing" tests cover it. Rollback: `git revert` the merges on `main`, patch release, republish, set `latest`.

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p6-conversation-practice.md`.
