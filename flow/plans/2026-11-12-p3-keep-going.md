# Keep going: a lesson loop that flows, sounds good and keeps you company

- **Cycle:** 2026-11-12 (premium program P3, `flow/PREMIUM.md`)
- **Status:** building
- **Release:** 4.35.0
- **Base:** `main` at d04d314 (4.34.0)
- **Proposals built:** none
- **Roadmap items:** new R-33, R-34, R-35
- **Needs:** P1 shipped (`startCheckpoint(u, testOut)`); works without it too, since `startCheckpoint(u)` is called with one argument here.

## Why this, why now

A lesson is where learners spend nearly all their time, and three moments in it fall flat (screenshots at 412px, 6 Nov):
- **The finish screen leads nowhere.** Its only button, Continue, drops you back on Learn. A learner who would happily do one more has to find it. Finishing a unit is silent, although its checkpoint has just opened. A learner's first lesson shows "0 days streak" before the daily goal is met.
- **Right answers all sound the same.** A run of eight right answers sounds exactly like one right answer.
- **Teach cards are half empty.** The new-words card fills the top half of the phone and leaves the bird out, except on the finish screen.

This release adds a **Next lesson** button and a unit-complete moment that offers the checkpoint, a third tile that's never zero, a chime that climbs with your run and a progress bar that glows from five in a row, and the bird on teach cards with a tip in a speech bubble.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | UX on the finish screen; nothing about finishing, XP or streaks changes (POLICY "UX and UI polish") | — |
| WP2 | Amber | Audio (`SOUNDS.ok`, `playSound`, `sfx` take a pitch) | Every other sound plays exactly as before; check Android Chrome first; reduced motion: the glow doesn't animate |
| WP3 | Green | Uses the existing `pip()` moods in a new place; no change to any bird's art or rig | — |

## Work packages

All three edit `js/ui/runner.js`, so they run **one after another**: WP1, then WP2, then WP3, on the cycle branch (no worktrees).

### WP1 — The finish screen leads somewhere

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `js/ui/runner.js` (`finishRun`, `showComplete`), `dev/test.js` (one block)
- **Reads first:** `finishRun()` and `showComplete()` in `js/ui/runner.js`; `nextLesson()`, `unitDone()` in `js/core/engine.js`; `startLesson()`, `startCheckpoint()`, `endRun()` in `js/ui/runner.js`; the `.ov-foot-in` rule in `styles/base.css` (a column with a 10px gap, so two buttons stack).
- **Must not touch:** XP, `done`, cards, quests or badges logic.

**Spec.**
- `showComplete(o)` takes an optional `o.more`: `[{ id, label, run }]`. Each becomes `h('button', { class: 'btn btn-quiet btn-wide', type: 'button', 'data-more': m.id, onclick: m.run }, m.label)`, placed **before** the Continue button: `OV.footIn.replaceChildren(...more, btn)`. Continue keeps its label, its focus and its behavior.
- In `finishRun()`'s lesson branch, before `S.langs[lang].done[l.id] = …`: `const unit = l.core ? COURSE[lang].units[l.unit] : null, unitWas = unit ? unitDone(lang, unit) : true;`. After it: `const unitNow = !!unit && !unitWas && unitDone(lang, unit), cpOpen = unitNow && !(S.langs[lang].cp[unit.title] && S.langs[lang].cp[unit.title].pass);`.
- After XP and badges (where `st` is computed), for lessons only:
  - `const nx = nextLesson(lang), next = nx && nx.id !== l.id ? nx : null;`
  - If `cpOpen` and not `levelUp`: `more = [{ id: 'checkpoint', label: 'Take the unit checkpoint', run: () => { endRun(); startCheckpoint(unit); } }]`, and `sub` = `'Unit ' + (l.unit + 1) + ' done: “' + unit.title + '”. Its checkpoint is open, ' + CHECKPOINT.questions + ' questions to lock it in.'`
  - Else if `next` and not `levelUp`: `more = [{ id: 'next', label: 'Next: ' + next.title, run: () => { endRun(); startLesson(next.id); } }]`.
  - A level-up keeps its moment and gets no `more`.
- The third tile, for every mode, becomes: `const nNew = newItems.filter(Boolean).length;` then `Run.bestCombo >= 3 ? [Run.bestCombo, 'best run in a row'] : st.count > 0 ? [st.count, plural(st.count, 'day') + ' streak'] : nNew > 0 ? [nNew, plural(nNew, 'new word')] : [uniq.length, plural(uniq.length, 'question') + ' answered']`. It is never a zero.
- Edge cases: a lesson made on demand (`!l.core`) gets **Next** only if `nextLesson` returns another lesson; a repeated lesson (already done) never shows the unit moment (`unitWas` is true); checkpoints, reviews, stories and placement get no `more` (they don't pass one).

**Steps.**
1. `showComplete`: `o.more`.
2. `finishRun`: `unitWas`, `unitNow`, `cpOpen`, `next`, `more`, the unit `sub`, the third tile.
3. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0. The existing checks that click the finish screen's `Continue` still pass. These checks are new:
  - `finish: Next starts the next lesson`: finish a lesson in the middle of a unit; the footer has `[data-more="next"]` reading `Next: <title of nextLesson>`; clicking it leaves `Run.active === true` and `Run.lesson.id === ` that lesson's id.
  - `finish: the last lesson of a unit offers its checkpoint`: with every other lesson of a unit done, finish the last one; the page contains `Its checkpoint is open` and `[data-more="checkpoint"]`; clicking it starts `Run.mode === 'checkpoint'`.
  - `finish: no zero streak tile`: on a fresh page (no streak, goal not met), finish a first lesson answering every other question wrong (so no run of 3); the third tile reads `<n> new words` with n > 0, not `0 days streak`.
  - `finish: a repeated lesson shows no unit moment`: finish a lesson of an already finished unit again; no `[data-more="checkpoint"]`.
- [ ] `node dev/flow.js shots --steps "js:startLesson(coreOrder(S.settings.lang)[0].id);wait:900;js:(Run.pos=Run.queue.length,nextEx());wait:2500;shot:finish-next"` shows Next and Continue stacked, nothing cut off, light and dark, 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** going straight from one overlay to the next leaves two overlays on screen or the theme song playing between them.

### WP2 — A chime that climbs, a bar that glows

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `js/core/audio.js` (`SOUNDS.ok`, `playSound`, `sfx`), `js/ui/runner.js` (`showFeedback`: the `sfx` call and one line for the glow), `styles/base.css` (one rule after `.progress i`), `dev/test.js` (one block)
- **Reads first:** `SOUNDS`, `playSound()`, `sfx()`, `bell()` in `js/core/audio.js`; `showFeedback()` in `js/ui/runner.js` (where `Run.combo` goes up); the `.progress` rules in `styles/base.css`.
- **Must not touch:** any other sound in `SOUNDS`, the music code.

**Spec.**
- `SOUNDS.ok` takes a pitch multiplier: `ok: (c, p) => { const k = p || 1; bell(c, 1046.5 * k, 0, 0.55, 0.05); bell(c, 1568 * k, 0.075, 0.7, 0.045); hiss(c, 0.06, 0.25, 0.008, { type: 'highpass', f: 6000 }); },`. At `p` 1 it's exactly today's sound.
- `playSound(name, vol, p)` calls `SOUNDS[name](c, p)`; `sfx(name, vol, p)` passes `p` on. No other sound reads `p`.
- In `showFeedback()`, replace `sfx(res.ok ? 'ok' : 'bad')` with `sfx(res.ok ? 'ok' : 'bad', 1, res.ok && first && res.level === 'exact' ? Math.pow(2, Math.min(Math.max(Run.combo - 1, 0), 7) / 12) : 1);` (one semitone higher for each answer in a run, up to seven).
- Glow: in `showFeedback()`, after the combo is updated, `if (OV.prog) OV.prog.classList.toggle('hot', Run.combo >= 5);`. CSS after `.progress i`: `.progress i.hot{background:linear-gradient(90deg,var(--gold),var(--flame));box-shadow:0 0 14px var(--flame)}`.

**Steps.**
1. `js/core/audio.js` as above.
2. The two lines in `showFeedback()`; the CSS rule.
3. Tests: one block directly **before** `// placement: all right goes to the top`. Record calls by replacing `playSound` on that page's window with `(n, v, p) => calls.push([n, p])` (and `S.settings.sfx = true`); restore after.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `juice: the chime climbs with a run`: three exact right answers in a row record `ok` with pitches 1, 2^(1/12) and 2^(2/12) (compare to 4 decimals); a wrong answer records `bad` and the next right answer is back to 1.
  - `juice: the climb stops at seven semitones`: the tenth right answer in a row has pitch 2^(7/12).
  - `juice: the bar glows from five in a row`: after five, `OV.prog.classList.contains('hot')`; after a miss, not.
  - `juice: other sounds are unchanged`: `SOUNDS.bad.length` and `SOUNDS.done.length` are still 1 (they take only the context).
- [ ] `node dev/flow.js guard`: no STOP, no FIX (notes "audio changed": check on Android Chrome first).

**Stop and report if:** passing `p` would mean changing `bell()` or any shared synth helper.

### WP3 — Company on teach cards

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP2
- **Owns (may edit):** `js/ui/runner.js` (`RENDER.teach`, new `teachPip`), `styles/components.css` (one `.teach-pip` rule with the lesson styles), `dev/test.js` (one block)
- **Reads first:** `RENDER.teach` in `js/ui/runner.js`; `pip()` in `js/core/art.js` (`say` draws the speech bubble; tapping the bird makes it talk); the `.pip-say` rules in `styles/art.css`.
- **Must not touch:** `js/core/art.js`, `js/core/bird.js`, `styles/art.css`.

**Spec.** Teach cards end with the learner's bird, small and to the right, saying a tip in its bubble:
```js
/* the learner's bird at the foot of a teach card, with a tip in its bubble (tap it and it talks, as everywhere) */
function teachPip(mood, say){ return h('div', { class: 'teach-pip' }, pip(mood, 64, say ? { say, lang: Run.lang } : { lang: Run.lang })); }
```
- New words: replace `h('p', { class: 'hint' }, 'Tap a word to hear it.')` with `teachPip('point', 'Tap a word to hear it.')`.
- New phrases: append `teachPip('listen', 'Say each one out loud.')`.
- Good to know (concept bites): append `teachPip('think')`.
- CSS: `.teach-pip{display:flex;justify-content:flex-end;padding:28px 8px 0}` (the bubble sits above the bird, so leave the top padding).

**Steps.**
1. `teachPip` and the three call sites.
2. The CSS rule.
3. Tests: one block directly **before** `// placement: all right goes to the top`.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `teach: the bird keeps you company`: the first card of `startLesson('es-1-1')` has `.teach-pip .pip` and its `.pip-say` reads `Tap a word to hear it.`; a concept card has `.teach-pip .pip` without `.pip-say`.
  - Any existing check that looked for the `.hint` text on a words card is updated to look in `.pip-say`.
- [ ] `node dev/flow.js shots --steps "js:startLesson(coreOrder(S.settings.lang)[0].id);wait:900;js:document.querySelector('.ov-foot .btn-primary').click();wait:1200;shot:teach-pip"` shows the bird under the words with its bubble fully on screen at 412px and 360px, light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the bubble is cut off at 360px and fixing it needs a change in `styles/art.css` (Red: the birds' look; report instead).

## Integration

After WP3 (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION` and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`, "How a lesson teaches": add "The finish screen offers the next lesson (**Next: …**), or the unit's checkpoint when the lesson finished a unit. The right-answer chime rises a semitone with each answer in a run (up to seven), and the progress bar glows from five in a row."
- [ ] No content changed: no pictures, no voices.

## Release notes

- **Title:** Keep going
- **Notes:**
  - When you finish a lesson, the next one is one tap away. Finish a unit and its checkpoint is offered right there.
  - Right answers in a row now sound brighter each time, and the progress bar lights up from five in a row.
  - Your bird keeps you company on new words and ideas, with a tip or two.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens: the two `shots` strings above, light and dark, 412px and 360px.
- Spot checks for the reviewer: play a lesson with sound on and listen to a run of five, and to a miss in between. The climb should be pleasant, never shrill (the top note is about 1,570 Hz × 1.5). Read the new strings.

## Risks and rollback

- Two overlays in a row (Next lesson) is the main risk; the WP1 check covers it. The pitch change is limited to `ok`.
- Rollback: `git revert` the merges on `main`, patch release, republish, `latest`.

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p4-play.md`.
