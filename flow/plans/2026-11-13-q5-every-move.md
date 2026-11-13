# Every move has a moment: the birds use everything they were given

- **Cycle:** 2026-11-13 (polish program Q5, `flow/POLISH.md`)
- **Status:** shipped (4.39.0)
- **Release:** 4.39.0
- **Base:** `main` at 65c1b15 (4.38.0)
- **Proposals built:** none
- **Roadmap items:** new R-51
- **Needs:** nothing. Promote after P4, which also edits `showComplete()` (its streak-milestone moment); this plan says how the two fit.

## Why this, why now

Matt asked (2026-11-11) that none of the birds' animations go to waste. Each bird has 18 moods and 19 clips, drawn and rigged five times over. Counted on the app's screens (the intro film aside):

| Animation | Where it shows today |
|---|---|
| mood `laugh` (and its clip) | **nowhere** |
| clip `shake` (a head shake) | **nowhere** |
| mood `sad` | only the "Reset German?" sheet |
| mood `proud` | only the Me header, once today's goal is met |
| mood `ready` | only Review's hero, when items are due |
| mood `dizzy` | the six-quick-taps Easter egg |
| mood `fly` | the fly-in on the welcome screen (P4 adds streak milestones) |
| everything else (`happy`, `cheer`, `oops`, `think`, `wow`, `sleep`, `wave`, `point`, `shrug`, `love`, `listen`, `dance`; clips `hop`, `nod`, `bow`) | several places or the tap rotation |

There is also a wrong note: after a **failed** checkpoint the finish screen says "Not quite yet." while the bird cheers "Super!" under falling confetti.

This release gives `laugh` and `shake` their first moments, gives `sad`, `proud` and `ready` a fitting second one, fixes the failed-checkpoint tone, and adds a test so that an animation nobody uses can't ship again.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Uses existing moods and clips in new places; no change to any bird's art, rig, poses or clips (the P3 WP3 precedent; POLICY "UX and UI polish") | — |

## Work packages

### WP1 — A moment for every mood and move

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** alone
- **Owns (may edit):** `js/core/art.js` (`PIP_TAPS`, its comment, `pipTap`), `js/ui/runner.js` (`showFeedback`: the `fbPip` line and its comment; `finishRun`: the `showComplete({…})` call; `showComplete`: the bird, the cheer line, the confetti and sound lines), `js/ui/learn.js` (`confirmTestOut`), `dev/test.js` (one block)
- **Reads first:** `PIP_TAPS`, `pipTap()`, `pipBriefly()`, `pickSay()`, `PIP_SAYS` and `pip()` in `js/core/art.js`; the `moods` and `clips` tables in `js/core/bird.js` (read only); `showFeedback()`, `finishRun()` and `showComplete()` in `js/ui/runner.js`; `confirmTestOut()` in `js/ui/learn.js`
- **Must not touch:** `js/core/bird.js`, `js/core/rig.js`, any bird's part sheet, `js/ui/film.js`, `styles/film.css` (the film videos are fingerprinted from them); XP, streaks, badges or what passing a checkpoint means; `PIP_SAYS` (every line in it is recorded; a new line would need new recordings).

**Spec.**
- **`laugh`, when tapped.** `PIP_TAPS` becomes `[{ move: 'hop' }, { mood: 'wave', ms: 1800 }, { move: 'lookAround' }, { mood: 'dance', ms: 2000 }, { move: 'bow' }, { mood: 'laugh', ms: 1600 }, { move: 'nod' }]`, and its comment lists "a laugh" between the bow and the nod.
- **`laugh`, on a long run.** In `showFeedback()`, the mood of `fbPip` becomes `!res.ok ? 'oops' : run && Run.combo >= 8 ? 'laugh' : run ? 'dance' : res.level === 'exact' ? 'cheer' : 'happy'`. `moveFor` stays `run ? 2000 : 0`. Update the comment above it: "…dances on a run of them, laughs with delight from eight in a row…".
- **`shake`, when there is nothing here.** In `pipTap(rig)`, after the sleep line, add: `if (rig.home === 'shrug') return rig.play('shake');`. A shrugging bird (Talk without the tutor, a search with no matches) shakes its head when tapped instead of taking a turn from the rotation. It still says its hello line, as today.
- **`ready`, before a test.** In `confirmTestOut()`, `pip('point', 56, { tap: false })` becomes `pip('ready', 56, { tap: false })`.
- **`proud` and `sad`, on the finish screen.** `showComplete(o)` takes two new optional fields:
  - `o.mood`: when set, it is the bird's mood (instead of `o.gold || o.acc === 1 ? 'dance' : 'cheer'`). If P4 has shipped and its milestone sets the mood to `fly`, the order is: P4's milestone mood first, then `o.mood`, then the existing rule.
  - `o.calm`: when true, the bird's line is `pickSay(lang, 'oops')` instead of `pickSay(lang, 'cheer')` (both the bubble and the autoplay line use the same `cheer` variable, so assign it once), `confetti(…)` is not called, and the opening sound is `sfx('done')`.
  
  In `finishRun()`, the `showComplete({…})` call gains `mood: Run.mode === 'checkpoint' ? (cpPass ? 'proud' : 'sad') : null, calm: Run.mode === 'checkpoint' && !cpPass`. Lessons, reviews, practice sessions and stories pass neither and look exactly as they do today.
- Nothing is saved, no copy changes, no new voice line.

**Steps.**
1. `PIP_TAPS`, `pipTap`.
2. `showFeedback`, `confirmTestOut`.
3. `showComplete` (`o.mood`, `o.calm`), `finishRun`.
4. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`.
5. `npm test`, `node dev/flow.js guard`, `node dev/film.js --check`, screenshots, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `birds: every mood has a moment`: for every key of the shared `moods` table (read them from the loaded app, e.g. `Object.keys(Bird.birds.pip.moods)`; 18 today), the quoted name (`'laugh'`) occurs in at least one of `js/ui/*.js` (not counting `js/ui/film.js`) or `js/core/art.js`. On failure the message names the mood and says "give it a screen or remove it from the plan that added it".
  - `birds: every clip has a moment`: every key of the `clips` table is either named by a mood's `clip:` in `js/core/bird.js` whose mood passes the check above, or occurs quoted in `js/core/art.js` or `js/ui/*.js` (not `film.js`) in a `play('…')` call or a `move: '…'` entry. `shake` passes through `rig.play('shake')`.
  - `birds: a tap can make the bird laugh`: `PIP_TAPS` has an entry with `mood === 'laugh'`.
  - `birds: a shrugging bird shakes its head`: with a `pip('shrug')` element in the page and `rig.play` wrapped to record, a click on it records `'shake'`.
  - `feedback: eight in a row laughs`: in a lesson with `Run.combo` at 8 and a first-try exact answer, `.fb-pip` has class `laugh`; at 4 it has `dance`.
  - `finish: a failed checkpoint is gentle`: fail a checkpoint: `.complete-pip` has class `sad`, its bubble's text is one of `PIP_SAYS[lang].oops`, and no `canvas.confetti` is in the overlay. Pass one: `.complete-pip` has class `proud` and the confetti canvas is there.
  - `finish: lessons are unchanged`: a flawless lesson's `.complete-pip` has class `dance`; one with a mistake has `cheer`.
  - `test out: the bird is ready`: the "Test out of this unit?" sheet holds a `.pip.ready`.
- [ ] Screens, light and dark, 412px and 360px:
  - `node dev/flow.js shots --steps "js:startCheckpoint(COURSE[S.settings.lang].units[0]);wait:900;js:(Run.first.set('a','wrong'),Run.first.set('b','wrong'),finishRun());wait:2600;shot:cp-fail"`: "Not quite yet.", a sad bird with a kind line, no confetti.
  - `node dev/flow.js shots --steps "tab:Talk;wait:500;sel:.empty .pip;wait:500;shot:shrug-tap"`: the bird mid head-shake or back at its shrug, nothing clipped.
- [ ] `node dev/film.js --check` reports no video out of date, and `git diff --stat` shows no change under `js/core/bird.js`, `js/core/rig.js` or the part sheets.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a mood or clip can't be shown without editing `bird.js` or `rig.js` (for example `rig.play('shake')` does nothing on one of the five birds), or the checkpoint step string above doesn't reach the finish screen (then say how you reached it).

## Integration

- [ ] `docs/ARCHITECTURE.md`, "Your bird": add "Every mood and clip in `js/core/bird.js` is used on at least one screen; `npm test` fails one that isn't. A new mood or move ships with the screen that uses it."
- [ ] `flow/POLISH.md`: in the audit table, finding 12's "Fixed in" becomes "Q5".
- [ ] No pictures, no voices (the bird's lines are all in `PIP_SAYS` already and recorded).

## Release notes

- **Title:** Every move counts
- **Notes:**
  - Your bird has more to say with its feathers: tap it for a laugh, and watch what it does when you get eight right in a row.
  - A checkpoint that didn't go your way now gets a kind word instead of confetti. Pass one and your bird is proud of you.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/film.js --check`.
- Screens: the two step strings above, light and dark, 412px and 360px; a normal lesson finish for comparison.
- Spot checks for the reviewer: in the preview, with each of the five birds picked in turn (Me → Your bird), tap the bird on Learn seven times slowly and watch the laugh; open Talk without the tutor and tap the shrugging bird.
- **Phone check for Matt (Android, two minutes):** tap your bird on Learn until it laughs; get eight right in a row in a lesson; start "Test out" on a unit and fail it on purpose.

## Risks and rollback

- `laugh` might read as laughing *at* a learner. It only appears on a tap and on a long run of right answers, never near a mistake.
- A failed checkpoint loses its confetti. That is the point; passing keeps it.
- Undo: `git revert` and a patch release. Nothing saved changes.

## Outcome

- **Shipped:** 4.39.0, `5553dc6` | **Dropped:** none | **Escalated:** none
- **Notes for the next cycle:**
