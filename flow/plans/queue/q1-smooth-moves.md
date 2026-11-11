# Smooth moves: one timing system, things that leave as well as arrive, quicker tabs

- **Cycle:** set when promoted (polish program Q1, `flow/POLISH.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-q1-smooth-moves.md`, set Release, Base and `approved`)
- **Release:** the next free minor when promoted
- **Base:** `main` at promotion time (nothing below depends on line numbers)
- **Proposals built:** none
- **Roadmap items:** new R-41, R-42, R-43
- **Needs:** nothing. Promote after P3 (`flow/POLISH.md`, "Order").

## Why this, why now

Parlance moves a lot, but not by one set of rules (audit of 11 Nov, `flow/POLISH.md`):
- The tokens define three durations, yet the stylesheets hold about 45 transitions with 14 different literal times. Controls that should feel the same respond at slightly different speeds.
- A toast vanishes in one frame. A sheet's backdrop fades while the sheet itself just disappears, and its grip can't be dragged.
- Every tab switch replays a staggered rise that takes up to 0.86 s, and every tab opens at the top even when you were halfway down it a moment ago.
- Vibration is 20 calls with 12 literal patterns and no way to turn it off.

A consistent timing system, exits, and restrained haptics that can be switched off are the three things every write-up of "what makes an app feel paid for" agrees on.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Motion polish; adds tokens, changes no existing token (POLICY "UX and UI polish") | — |
| WP2 | Green | Motion and layout polish in the shell | — |
| WP3 | Amber | Saved state: one new setting, `settings.haptics`, with a schema step | The step is idempotent; a save without the field loads with vibration on; an older open tab can't drop it (settings merges keep unknown fields); the three existing schema checks in `dev/test.js` are updated, not removed |

## Work packages

They share `styles/base.css` and `dev/test.js`, so they run **one after another**: WP1, WP2, WP3, on the cycle branch (no worktrees).

### WP1 — One timing system

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `styles/tokens.css` (one new line; no existing line edited), `styles/base.css`, `styles/components.css`, `styles/features.css`, `styles/art.css` (only `transition` declarations, and the duplicate block named below), `dev/test.js` (one block)
- **Reads first:** the `/* motion */` line in `styles/tokens.css`; every `transition:` in the four stylesheets (`grep -n "transition:" styles/base.css styles/components.css styles/features.css styles/art.css`)
- **Must not touch:** `styles/film.css` (its rules are part of the film videos' fingerprint); any `animation:` or `@keyframes`; any existing token's value.

**Spec.**
- In `styles/tokens.css`, add **a new line of its own** directly after the line `--dur-fast:.15s; --dur:.3s; --dur-slow:.6s;` (never edit an existing token line: the guard reads any changed `--token:` line as a change to the Selva look and stops the release):
  `--dur-press:.12s; --dur-quick:.2s; --dur-settle:.5s; --dur-enter:.32s; --dur-exit:.18s; --ease-in:cubic-bezier(.4,0,1,1);`
  These are theme-independent, so they go in `:root` only.
- In the four stylesheets, rewrite the **duration** (the first time value of each comma-separated part) of every `transition` declaration by this table. Leave the property name, the easing and any delay (a second time value) as they are.

  | Literal | Becomes |
  |---|---|
  | `.1s`, `.12s`, `.14s` | `var(--dur-press)` |
  | `.15s` | `var(--dur-fast)` |
  | `.2s`, `.22s`, `.25s` | `var(--dur-quick)` |
  | `.3s`, `.35s` | `var(--dur)` |
  | `.4s`, `.5s` | `var(--dur-settle)` |
  | `.6s`, `.8s` | `var(--dur-slow)` |

  Example: `transition:transform .6s var(--spring) .22s,opacity .15s .22s` becomes `transition:transform var(--dur-slow) var(--spring) .22s,opacity var(--dur-fast) .22s`.
- Where a part's easing is the keyword `ease-in`, write `var(--ease-in)` instead. Other easings stay.
- `transition:none` and `transition:none!important` stay as they are.
- `styles/base.css` has the same `@media (prefers-reduced-motion: reduce){…}` block twice. Delete the **first** one (the one without `.spark-p{display:none}`) and keep the second.

**Steps.**
1. Add the token line.
2. Rewrite the transitions file by file. After each file, `grep -n "transition:" <file> | grep -v "var(--dur" | grep -v "transition:none"` prints nothing.
3. Remove the duplicate reduced-motion block.
4. Add the test block to `dev/test.js`, directly **before** the line containing `// placement: all right goes to the top`.
5. `npm test`, `node dev/flow.js guard`, `node dev/film.js --check`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `motion: the timing tokens exist`: `styles/tokens.css` contains `--dur-press:.12s`, `--dur-quick:.2s`, `--dur-settle:.5s`, `--dur-enter:.32s`, `--dur-exit:.18s` and `--ease-in:cubic-bezier(.4,0,1,1)`, and still contains `--dur-fast:.15s; --dur:.3s; --dur-slow:.6s;`.
  - `motion: every transition uses a duration token (<file>)`, one per stylesheet: for each `transition:` declaration in the file (match `/transition:([^;}]*)/g`), every comma-separated part is `none`, `none!important`, or contains `var(--dur`. On failure the message names the file and the declaration and ends with `use a --dur-* token from styles/tokens.css`.
  - `motion: one reduced-motion block in base.css`: `prefers-reduced-motion` occurs exactly once in `styles/base.css`, and that block contains `.spark-p{display:none}`.
- [ ] `git diff --stat` shows no change to `styles/film.css`, and `node dev/film.js --check` reports no video out of date.
- [ ] `node dev/flow.js shots` (every tab, light and dark) looks the same as before the change: transitions don't show in a still.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** `node dev/film.js --check` says a video is out of date after adding the tokens (then the new tokens are being counted in the film's fingerprint, and this needs a decision).

### WP2 — Exits, sheets and quick tabs

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `js/ui/shell.js` (`UI`, `setLang`, `toast`, `sheet`, `renderTabs`, `render`), `styles/base.css` (the `.view.enter>*` rule and the "Sheet + toast" rules), `dev/test.js` (one block)
- **Reads first:** `toast()`, `sheet()`, `renderTabs()`, `render()`, `setLang()` in `js/ui/shell.js`; `goTab()` in `js/ui/learn.js`; the `.view.enter>*`, `.sheet-back`, `.sheet`, `.grip`, `.toast` rules and their keyframes in `styles/base.css`; `reduced()` in `js/core/util.js`
- **Must not touch:** `openOverlay`, `closeOverlay`, `swapBody` (lessons, stories and the film depend on their timing); `goTab()` and the other places that call `window.scrollTo(0, 0)` on purpose.

**Spec.**
- **Toast leaves.** In `styles/base.css`, after the `toastin` keyframes: `.toast.out{animation:toastout var(--dur-exit) var(--ease-in) both}` and `@keyframes toastout{to{opacity:0;transform:translate(-50%,8px) scale(.97)}}`. `toast(msg)` becomes:
  ```js
  function toast(msg){
    const t = $('#toast'); clearTimeout(toast.t); clearTimeout(toast.h);
    t.textContent = msg; t.hidden = false; t.classList.remove('in', 'out'); void t.offsetWidth; t.classList.add('in');
    toast.t = setTimeout(() => {
      if (reduced()){ t.hidden = true; return; }
      t.classList.remove('in'); t.classList.add('out');
      toast.h = setTimeout(() => { t.hidden = true; t.classList.remove('out'); }, 180);
    }, 2800);
  }
  ```
- **A sheet leaves.** After the `sheetin` keyframes: `.sheet-back.out .sheet{animation:sheetout .16s var(--ease-in) both}` and `@keyframes sheetout{to{transform:translateY(40px);opacity:0}}`. The 160 ms removal timer in `sheet()` stays.
- **A sheet can be dragged down by its grip.** The grip gets a bigger touch area and the drag:
  - CSS: `.grip` keeps its look and gains `position:relative;touch-action:none;cursor:grab`, plus `.grip::before{content:"";position:absolute;inset:-14px -60px -14px -60px}`; `.sheet.drag{transition:none}`; `.sheet.back{transition:transform var(--dur-quick) var(--ease)}`.
  - In `sheet()`, after `box` is made (the grip is `box.firstChild`):
    ```js
    const grip = box.firstChild; let y0 = null, dy = 0;
    grip.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; box.classList.remove('back'); box.classList.add('drag'); try { grip.setPointerCapture(e.pointerId); } catch (err) {} });
    grip.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); box.style.transform = 'translateY(' + dy + 'px)'; });
    const drop = () => { if (y0 == null) return; y0 = null; box.classList.remove('drag'); if (dy > 90){ close(); return; } box.classList.add('back'); box.style.transform = ''; };
    grip.addEventListener('pointerup', drop); grip.addEventListener('pointercancel', drop);
    ```
  - It works with reduced motion too (it follows the finger; the global reduced-motion rule already removes the snap-back transition).
- **Tabs switch quickly.** The rule `.view.enter>*{animation:rise .5s var(--ease) both;animation-delay:calc(var(--i,0) * 45ms)}` becomes `.view.enter>*{animation:rise var(--dur-enter) var(--ease) both;animation-delay:calc(var(--i,0) * 30ms)}`. In `render()`, `Math.min(i, 8)` becomes `Math.min(i, 5)`. The longest entrance is now 0.47 s instead of 0.86 s.
- **Tabs remember where you were.** Add `scroll: {}` to the `UI` object. In `renderTabs()`, the tab `onclick` for a tab that isn't current becomes: `UI.scroll[UI.tab] = window.scrollY || 0; UI.tab = id; UI.animate = true; haptic(6); render(); window.scrollTo(0, UI.scroll[id] || 0);` (if WP3 has already run, keep its `haptic('tap')`). Tapping the current tab still scrolls to the top, and also sets `UI.scroll[id] = 0`. `setLang()` sets `UI.scroll = {}` before it renders. Nothing else changes: `goTab()` and the buttons that send you to another tab still open it at the top.

**Steps.**
1. CSS: toast exit, sheet exit, grip, the enter rule.
2. `toast()`, `sheet()`, `UI.scroll`, `renderTabs()`, `render()`, `setLang()`.
3. Tests: one block directly after WP1's block.
4. `npm test`, `node dev/flow.js guard`, screenshots, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0. The existing checks that read `#toast` still pass. New checks:
  - `toast: leaves with an exit`: after `toast('x')`, `#toast` is not hidden and has class `in`; `styles/base.css` contains `.toast.out{` and `@keyframes toastout`.
  - `sheet: the sheet itself leaves`: `styles/base.css` contains `.sheet-back.out .sheet{` and `@keyframes sheetout`.
  - `sheet: dragging the grip down closes it`: open `sheet('T', h('p', null, 'x'), [])`; dispatch `pointerdown` at clientY 100, `pointermove` at 230 and `pointerup` on `.sheet .grip`; after 250 ms no `.sheet-back` is in the page. A drag of 40 px leaves it open with an empty inline `transform`. (jsdom may have no `PointerEvent`: dispatch `new w.MouseEvent('pointerdown', { clientY: 100, bubbles: true })` and so on.)
  - `tabs: a tab remembers its scroll`: with `window.scrollTo` and `scrollY` stubbed to record, set `scrollY` to 640 on Learn, tap Stories, tap Learn: the last `scrollTo` call is `(0, 640)`. Tapping Learn again calls `scrollTo` with top 0, and `UI.scroll.learn === 0`. After `setLang('es')`, `UI.scroll` has no keys.
  - `tabs: the entrance is short`: `styles/base.css` contains `.view.enter>*{animation:rise var(--dur-enter)` and `* 30ms`.
- [ ] `node dev/flow.js shots --steps "tab:Me;wait:400;click:Choose your bird;wait:500;shot:sheet"` shows the sheet with its grip, light and dark, 412px and 360px, nothing clipped.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** an existing test depends on the toast being hidden at an exact moment and can't be kept without weakening it.

### WP3 — Haptics with names and a switch

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP2
- **Owns (may edit):** `js/core/util.js` (`haptic`, new `HAPTICS`), every `haptic(` call in `js/ui/*.js` and `js/core/art.js`, `js/core/state.js` (`defaultSettings`, `cleanSettings`, `MIGRATIONS`), `js/config.js` (`SCHEMA_VERSION`), `js/ui/me.js` (one row in the Sound card), `dev/test.js` (one block and the three schema checks)
- **Reads first:** `haptic()` in `js/core/util.js`; `grep -rn "haptic(" js`; `defaultSettings()`, `cleanSettings()` and `MIGRATIONS` in `js/core/state.js`; `toggleRow()` and the Sound card in `viewMe()` (`js/ui/me.js`); the checks in `dev/test.js` that contain `S.v === 11` or `SCHEMA_VERSION') === 11`
- **Must not touch:** when anything vibrates (no call added, none removed); the storage key; any other setting.

**Spec.**
- In `js/core/util.js`, directly above `haptic`:
  ```js
  /* every vibration has a name; screens call haptic('ok'), never a pattern */
  const HAPTICS = { tap: 6, select: 8, pair: 10, ok: 12, heavy: 30, miss: [15, 30, 15], bad: [18, 40, 18], done: [10, 50, 10] };
  function haptic(p){ try { if (S && S.settings && S.settings.haptics === false) return; const v = typeof p === 'string' ? HAPTICS[p] : p; if (v != null && navigator.vibrate) navigator.vibrate(v); } catch (e) {} }
  ```
  (`S` is read inside the `try`, so a call before the state has loaded does nothing instead of throwing.)
- Replace every call's literal by its name: `5` and `6` → `'tap'`; `8` → `'select'`; `10` → `'pair'`; `12` → `'ok'`; `30` → `'heavy'`; `[15, 30, 15]` → `'miss'`; `[18, 40, 18]` → `'bad'`; `[10, 50, 10]`, `[10, 30, 10]` and `[12, 40, 12]` → `'done'`. After this, `grep -rn "haptic([0-9\[]" js` prints nothing.
- **The setting.** `defaultSettings()` gains `haptics: true` (after `sfxVol`). `cleanSettings()` gains `s.haptics = s.haptics !== false;` next to the `homeMusic` line. `SCHEMA_VERSION` goes up by one (12, or the next free number if another release took it), and `MIGRATIONS` gets a last step: `{ to: <that number>, run: st => { st.settings = cleanSettings(st.settings); } }   // vibration can be switched off (settings.haptics)`.
- **The switch.** In the Sound card in `viewMe()`, directly after the `Sound effects` row and only on a phone that can vibrate: `typeof navigator.vibrate === 'function' ? toggleRow('Vibration', 'haptics', 'A light tap for right answers, pairs and finishes.', on => { if (on) haptic('ok'); }) : null`.
- Update the three existing schema checks in `dev/test.js` from 11 to the new number, keeping everything else in them.

**Steps.**
1. `HAPTICS` and `haptic()`; replace the calls.
2. The setting, the schema step, the switch.
3. Tests: one block after WP2's; update the three schema checks.
4. `npm test`, `node dev/flow.js guard`, screenshots, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `haptics: every pattern has a name`: `HAPTICS` has the eight keys above, and no file under `js/` matches `/haptic\(\s*[\d\[]/`.
  - `haptics: named calls vibrate`: with `navigator.vibrate` stubbed to record, `haptic('ok')` records `12` and `haptic('bad')` records `[18, 40, 18]`; `haptic('nope')` records nothing.
  - `haptics: the switch turns them off`: with `S.settings.haptics = false`, `haptic('ok')` records nothing; set back to `true`, it records again.
  - `haptics: an older save loads with vibration on`: a save at schema 11 without `settings.haptics` loads with `S.settings.haptics === true` and `S.v` equal to the new schema number, and a field the app doesn't know (`extra.keep`) is still there. Running the migration twice gives the same settings.
  - `haptics: the switch shows only where the phone can vibrate`: with `navigator.vibrate` defined, Me has a `#set-haptics` checkbox; without it, Me has none.
- [ ] `node dev/flow.js shots --steps "tab:Me;wait:400;scroll:2600;shot:sound"` (Chromium has `navigator.vibrate`) shows the Vibration row under Sound effects, light and dark, 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX (it notes the schema step; that is expected and covered by the Amber checks).

**Stop and report if:** another setting or a database path would have to change, or the migration can't be made idempotent.

## Integration

- [ ] `dev/test.js`: the three blocks sit together before `// placement: all right goes to the top`; the schema number is the same in `js/config.js`, the migration and the three updated checks.
- [ ] `docs/ARCHITECTURE.md`: in "Conventions", add: "Durations are tokens too (`--dur-press`, `--dur-fast`, `--dur-quick`, `--dur`, `--dur-settle`, `--dur-slow`, `--dur-enter`, `--dur-exit`): `npm test` fails a transition with a literal time. Vibration goes through `haptic('<name>')` with a name from `HAPTICS` in `js/core/util.js`; `settings.haptics` (Me → Sound → Vibration) turns it off."
- [ ] `CLAUDE.md`, "Change things once, in their home": add "Vibration patterns are `HAPTICS` in `js/core/util.js`; call `haptic('name')`."
- [ ] `styleguide.html`: if it lists the motion tokens, add the six new ones in the same form; otherwise leave it.
- [ ] No pictures, no voices.

## Release notes

- **Title:** Smooth moves
- **Notes:**
  - Switching tabs is quicker, and each tab remembers where you were.
  - Messages and sheets now slide away instead of vanishing, and you can drag a sheet down by its grip.
  - Don't like the vibration? Turn it off in Me → Sound.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/film.js --check` (nothing out of date).
- Screens (412px and 360px, light and dark): `node dev/flow.js shots` (every tab); `--steps "tab:Me;wait:400;click:Choose your bird;wait:500;shot:sheet"`; `--steps "tab:Me;wait:400;scroll:2600;shot:sound"`.
- Spot checks for the reviewer: read the diff of the four stylesheets and confirm only durations and `ease-in` changed in `transition` declarations; confirm no `haptic(` call was added or removed (`git diff | grep -c "haptic("` is even and each removed line has its added twin).
- **Phone check for Matt (Android, two minutes):** switch between tabs and back, and check each returns to where you were; open Choose your bird and drag the sheet down by its grip; finish one question right and one wrong and feel the two vibrations; turn Vibration off in Me → Sound and check they stop.

## Risks and rollback

- A transition that was tuned by hand changes by up to 0.2 s (0.8 s → 0.6 s on one progress bar). The stills are unchanged; Matt's phone check is the judge. Tune by changing one token.
- The drag could fight a sheet's own scrolling: it is bound to the grip only, which never scrolls.
- The setting is additive; an older tab keeps `haptics` when it merges settings because merges keep unknown fields.
- Undo: `git revert` the release and ship a patch. `settings.haptics` left in a save is ignored by older code.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
