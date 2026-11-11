# Feels like an app: touch that behaves, a route that scrolls lightly, every control named

- **Cycle:** set when promoted (polish program Q3, `flow/POLISH.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-q3-feels-like-an-app.md`, set Release, Base and `approved`)
- **Release:** the next free minor when promoted
- **Base:** `main` at promotion time (nothing below depends on line numbers)
- **Proposals built:** none
- **Roadmap items:** R-10, new R-47
- **Needs:** nothing. Works with or without Q1 and Q2.

## Why this, why now

Parlance is installed to the Home Screen and used like an app, but in three ways it still behaves like a web page (audit of 11 Nov, `flow/POLISH.md`):
- In the Home Screen app, a pull at the top of a tab reloads the whole thing. A long press on a button selects its label and brings up the copy menu.
- The Learn route is about 11,000px tall at phone width and the browser lays out and paints all of it, every unit of every open level, on every render.
- Nobody has checked that every control has a name a screen reader can say, and a sheet neither keeps the keyboard focus inside it nor gives it back when it closes (R-10).

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Touch and scrolling polish in CSS; no token changes (POLICY "UX and UI polish … performance") | — |
| WP2 | Green | Accessibility (POLICY "UX and UI polish … accessibility") | — |

## Work packages

Both edit `dev/test.js`, so they run **one after another**: WP1, then WP2.

### WP1 — Touch and scrolling

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `styles/base.css` (new rules directly after the `button{cursor:pointer;…}` rule), `styles/components.css` (one rule next to the `.unit` rules), `dev/test.js` (one block)
- **Reads first:** the reset at the top of `styles/base.css`; `levelSection()` in `js/ui/learn.js` (each unit is `h('div', { class: 'unit' }, …)` inside a `.lvl-sec`); the `.lvl-sec`, `.unit`, `.unit-head`, `.station` rules in `styles/components.css`; `sayText()` in `js/ui/shell.js` (tappable words are `span.w`, which must stay selectable text)
- **Must not touch:** `styles/film.css`; `dev/web.js`; the overlay rules (`.ov-body` already has `overscroll-behavior:contain`).

**Spec.**
- In `styles/base.css`, directly after the `button{cursor:pointer;-webkit-appearance:none;appearance:none}` rule, add:
  ```css
  /* controls behave like an app's: no double-tap zoom wait, no label selected or copy menu on a long press. Text you read stays selectable. */
  button,.btn,.chip,.tab,[role="button"],summary{touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  /* in the Home Screen app, a pull at the top doesn't reload Parlance */
  @media (display-mode:standalone){html{overscroll-behavior-y:none}}
  ```
- In `styles/components.css`, directly after the existing `.unit{display:flex;…}` rule, add:
  ```css
  /* the route is long: a unit that is off screen isn't laid out or painted until it comes near */
  .unit{content-visibility:auto;contain-intrinsic-size:auto 440px}
  ```
- Nothing in JavaScript changes.

**Steps.**
1. The three rules.
2. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`.
3. `npm test`, `node dev/flow.js guard`, screenshots, the measurement below, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `touch: controls don't select or wait`: `styles/base.css` contains a rule whose selector starts `button,.btn,.chip,.tab` and whose body has `touch-action:manipulation` and `user-select:none`; no rule in any stylesheet sets `user-select:none` on `body`, `.say`, `.w`, `p` or `.view`.
  - `touch: no pull-to-reload in the Home Screen app`: `styles/base.css` contains `@media (display-mode:standalone){html{overscroll-behavior-y:none}}`.
  - `learn: off-screen units are skipped`: `styles/components.css` contains `.unit{content-visibility:auto;contain-intrinsic-size:auto 440px}`.
- [ ] `node dev/flow.js shots --steps "full:learn"` (light and dark, 412px and 360px): the whole route is drawn, every unit head, station and checkpoint row in place, nothing clipped at a unit's edge (compare with the same shot taken before the change; the page height may differ by a few pixels at most).
- [ ] `node dev/flow.js shots --steps "js:startLesson(coreOrder(S.settings.lang)[0].id);wait:900;click:Start lesson;wait:900;js:(Run.first.set('a','exact'),finishRun());wait:2600;click:Continue;wait:1400;shot:after-lesson"`: back on Learn, the lesson just finished is on screen with its "done" mark.
- [ ] Measured once with Playwright at 412 × 915 with 4× CPU slowdown (CDP `Emulation.setCPUThrottlingRate`), on Learn: the time of `render()` followed by two animation frames, median of five, before and after. Report both numbers. After must not be slower than before.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a unit's content is visibly clipped with `content-visibility` (a pressed station's shadow, the just-done highlight) and it can't be fixed inside the `.unit` rule. Then ship the two `base.css` rules without it and say so.

### WP2 — Names and focus for every control

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `js/ui/shell.js` (`sheet` only), any `js/ui/*.js` line that creates a control the new test finds without a name (add an `aria-label` or visible text; change nothing else on that line), `dev/test.js` (one block)
- **Reads first:** `sheet()` in `js/ui/shell.js`; `speakBtn()` and `slowBtn()` there (the model for an icon button with an `aria-label`); `h()` in `js/core/util.js`; how `dev/test.js` opens each tab, a lesson and a story
- **Must not touch:** what any control does; visible copy (a new `aria-label` is plain, warm English in sentence case, a few words: "Play audio", "Close", "Open the daily chest").

**Spec.**
- **A test that walks the app and names every control.** A helper in the test block:
  ```js
  const named = el => !!((el.getAttribute('aria-label') || '').trim() || (el.getAttribute('title') || '').trim() || el.textContent.trim() || (el.id && D.querySelector('label[for="' + el.id + '"]')) || el.closest('label'));
  const unnamed = root => [...root.querySelectorAll('button,a[href],input,select,textarea,[role="button"]')].filter(el => el.type !== 'hidden' && !named(el)).map(el => el.outerHTML.slice(0, 120));
  ```
  It runs on: each of the six tabs; a lesson's intro; the first teach card; the first three exercises of `de-1-1`, `es-3-1` and `it-1-1` (answer each to see the feedback footer too); the finish screen; a story's first screen and first line; the bird picker sheet; onboarding's first step. Each place is one check named `a11y: every control has a name (<place>)`, failing with the list of offenders.
- **Fix what it finds** by giving the control an `aria-label` where it is created. Decorative children stay `aria-hidden`.
- **A sheet holds the focus and gives it back.** In `sheet()`:
  - at the top: `const opener = document.activeElement;`
  - `onKey` becomes:
    ```js
    const onKey = e => {
      if (e.key === 'Escape'){ close(); return; }
      if (e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.hidden);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    };
    ```
  - `close` gains, after it removes the key listener: `if (opener && opener.isConnected && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) {}`.
- `box` (the `.sheet`) gets `tabindex: '-1'` so it can take focus when it has no control of its own.

**Steps.**
1. Write the test block first, directly after WP1's block, and run `npm test` to get the list of unnamed controls.
2. Name each one where it is created.
3. `sheet()`: opener, the Tab trap, focus back.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with the `a11y: every control has a name (<place>)` checks for every place listed above (at least 20 checks), and:
  - `sheet: Tab stays inside`: open a sheet with two actions; focus the last button and dispatch `keydown` Tab: the event is default-prevented and the first focusable control in the sheet has focus. Shift+Tab on the first goes to the last.
  - `sheet: closing gives the focus back`: focus a button on the page, open a sheet from it, close the sheet; after 250 ms `document.activeElement` is that button.
- [ ] The builder's report lists every control that was unnamed and the label it got.
- [ ] `node dev/flow.js shots` (every tab, light and dark): no visible change.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** more than 40 controls are unnamed (then the helper is probably wrong about something; show five examples), or a fix would need a change in `js/core/` beyond `speakBtn`-style labels.

## Integration

- [ ] `dev/test.js`: the two blocks sit together before `// placement: all right goes to the top`.
- [ ] `docs/ARCHITECTURE.md`, "Conventions": add "Every control has a name a screen reader can say (text, or an `aria-label` on an icon button); `npm test` walks the tabs, a lesson, a story and the sheets and fails on one without. Sheets keep Tab inside and return focus to the control that opened them."
- [ ] `flow/ROADMAP.md`: R-10 to `done (<version>)`, with a note that contrast is Q4 and tap targets were R-39.
- [ ] No pictures, no voices.

## Release notes

- **Title:** Feels like an app
- **Notes:**
  - On your Home Screen, pulling down at the top no longer reloads Parlance, and holding a button no longer selects its text.
  - The Learn route scrolls more lightly on long courses.
  - Better with a screen reader or a keyboard: every button says what it does, and sheets keep your place.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens (412px and 360px, light and dark): `node dev/flow.js shots --steps "full:learn"`; the after-lesson step string in WP1; `node dev/flow.js shots` (every tab).
- Spot checks for the reviewer: compare the full Learn shots before and after, unit by unit; read the list of new `aria-label`s for tone.
- **Phone check for Matt (Android, two minutes):** in the Home Screen app, pull down at the top of Learn (nothing reloads); hold a finger on Start lesson (no selection, no menu); fling the Learn route top to bottom and back (no blank units, no stutter); tap a word in a story (its meaning still shows).

## Risks and rollback

- `content-visibility` is the one risky line: a browser that mis-sizes a skipped unit makes the scrollbar jump. `contain-intrinsic-size:auto` remembers each unit's real height once seen, and Safari before 18 ignores the property and behaves as today. WP1 says to drop that one rule if it clips.
- Without pull-to-reload in the Home Screen app, the Refresh banner is the way to get a new version; it already is.
- Undo: `git revert` and a patch release. Nothing saved changes.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
