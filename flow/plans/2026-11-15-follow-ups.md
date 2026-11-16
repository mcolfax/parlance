# Follow-ups: every fix the reviewers left behind, in one release

- **Cycle:** 2026-11-15-3
- **Status:** approved
- **Release:** 4.45.0
- **Base:** `main` at ee3341b (4.44.0)
- **Proposals built:** web `proposals/pfmwfh63ei` ("Your call: stop a bird's dance reliably"), approved by Matt in chat on 2026-11-15 ("Proceed with all fixes and recommendations"). R-53 (the fonts hosts in the Content-Security-Policy) approved by Matt in the same message, recorded as web `proposals/pfmwih89zn` (approved, no decidedBy).
- **Roadmap items:** R-52 to R-63 (R-60's screen-off fix waits for Matt's phone check; R-61's warmer gold waits for his eye)

## Why this, why now

The eleven releases 4.34.0 to 4.44.0 left a dozen small follow-ups from their reviews (R-52 to R-63). Matt asked to proceed with all of them, including the two that need him (the bird rig's stop check and the unused font hosts in the web version's security policy). None changes what a lesson, XP or a streak means. Written by the orchestrator from the reviewers' own exact suggestions, so no planner run.

## Gate

| Package | Zone | Why | Extra checks |
|---|---|---|---|
| WP1 | Red, approved by Matt (2026-11-15) | `js/core/rig.js` (the birds' rig) and `vercel.json` (the CSP). The guard reports STOP for both; Matt's approval covers them | Only the stop check changes in the rig: no art, pose, clip or timing; the five film videos are re-rendered because the film's fingerprint includes `Rig.create`'s source (the pictures are the same). The CSP loses only the two Google Fonts hosts; the inline-script hash and every other directive stay; `npm test`'s CSP-hash check and `npm run offline-check` pass |
| WP2 | Amber | Audio (the `ok` chime's gain) and a new bird line recorded for five birds (voices, within the free cap) | Every other sound unchanged; voices `--dry` count small; Android check |
| WP3 | Green | UI polish and copy | — |

## Work packages

Run in order WP1 → WP2 → WP3 on branch `flow/2026-11-15-3` (they share `dev/test.js`).

### WP1 — The rig's stop, and the security policy (parlance-chores, haiku)

- **Owns:** `js/core/rig.js` (only the lines below), `vercel.json` (only the CSP host list), `dev/test.js` (one check).
- **Rig.** In `Rig.create`, a clip pushed with `stopAt: 0` is "not stopped", and `R.stop()` sets `k.stopAt = R.time`, which is 0 before the first frame, so the stop is lost.
  - line ~454: `stopAt: 0` → `stopAt: null`
  - line ~462: `!k.stopAt` → `k.stopAt == null`
  - line ~519: `if (k.stopAt){` → `if (k.stopAt != null){`
  - line ~524: `(!k.stopAt)` → `(k.stopAt == null)`
  - line ~530: `!k.stopAt` → `k.stopAt == null`
  - Nothing else in `rig.js` changes. `node design/rig/check.js` must print ok.
  - Test (next to `moveFor ends a looping move`): `rig: a move stopped before the first frame stops` — create a bird, `play('dance', { loop: true })`, call its stop for `dance` before any frame, then render one frame: `playing('dance') === false`.
- **CSP.** In `vercel.json`, remove `https://fonts.googleapis.com` from `style-src` and `https://fonts.gstatic.com` from `font-src` (whatever directives hold them; leave the directive itself with `'self'`). Nothing else in the file changes.

### WP2 — Sound, the birds' new line, stronger checks (parlance-builder, sonnet)

- **Owns:** `js/core/audio.js` (`SOUNDS.ok` gain only), `js/core/art.js` (`PIP_SAYS`, `pipTap`), `js/core/engine.js` (the order-window choice in the conversation section), `dev/contrast.js` (one exported helper if needed), `dev/test.js`.
- **R-54 chime.** As the `ok` chime climbs (`k` semitones, 0–7), divide its gain by `Math.sqrt(1 + k / 2)` so a long run gets brighter, not louder. No other sound changes; keep the test that other sounds are unchanged.
- **R-58 a line for the shrugging bird.** Add `shrug` lines to `PIP_SAYS`: de `['Hmm, leider nichts.', 'Nichts zu sehen.']`, es `['¡Uy, nada por aquí!', 'Mmm, nada todavía.']`, it `['Mmm, niente qui.', 'Ancora niente.']`. In `pip()`'s tap handler (`art.js`), a bird whose home mood is `shrug` says a `shrug` line (`pickSay(lang, 'shrug')`) instead of `hello`. Then the voices step (WP2's last step, below) records them for every bird.
- **R-58 stronger mood check.** In the test harness, wrap `Rig.create` and each rig's `set` to record every mood actually shown during the bird-moment tests' page; the existing `birds: every mood has a moment` check also requires each mood to appear in that record (keep the code-search check as well).
- **R-61** In `dev/test.js`: `contrast: every PAIRS token exists in both themes` — every token named in `PAIRS` resolves to `#RRGGBB` in `light` and `dark`.
- **R-62** In the order-question generator, prefer windows where speakers alternate: among candidate windows, take one with no two consecutive lines by the same speaker if any exists; fall back to the current choice. Test: `conversation: order questions alternate speakers when the story allows it`.
- **Voices.** `node dev/voices.js --dry`, then `node dev/voices.js` (the key is the environment's network secret; the monthly cap stands). Commit `media/voice/` and `dev/voice-usage.json`. If recording fails, stop and report; don't work around it.

### WP3 — Polish and copy (parlance-builder, sonnet)

- **Owns:** `js/ui/learn.js`, `js/ui/me.js`, `js/ui/review.js`, `js/ui/runner.js`, `js/ui/speed.js`, `js/ui/recap.js`, `js/ui/listen.js`, `js/ui/stories.js`, `js/ui/shell.js`, `styles/base.css`, `styles/components.css`, `styles/features.css`, `styles/art.css`, `styles/tokens.css` (new lines only), `dev/test.js`.
- **R-52** Me (web): the Privacy · Terms links use `.linkish` colour (no browser blue). `.btn-sm` gets `min-height:44px`.
- **R-54** `startCheckpoint` from the finish screen passes the run's language (fit to its signature; if it only reads `S.settings.lang`, add an optional `lang` argument used before the setting). Resuming a lesson on a run of five or more brings the progress-bar glow back (`resumeApply`). On the finish screen the bird's speech bubble must not cover the stamp's date: move the bubble above the bird (or nudge the bird) so the date is clear at 412 and 360px.
- **R-55** Bring the literal durations of `animation:` declarations in base, components, features and art.css onto the `--dur-*` tokens (nearest by the 4.36.0 table), and extend the motion test to `animation` the same way (`none` allowed; `infinite` loops may keep their own duration if they are ambient: list those in the test as exceptions by selector).
- **R-56** Learn's three tiles must differ in every language: the streak tile becomes a plain card like Me's streak tile (`background:var(--surface); box-shadow:var(--edge); color:var(--ink)`), flame in `--flame` (pale when cold, as now). In-app tab jumps (`goTab`, the reviews tile, Me's Go to Talk) also save the scroll of the tab they leave (`UI.scroll[UI.tab] = window.scrollY || 0` first). "Your 1 shakiest": `all === 1 ? 'Your shakiest one' : 'Your ' + Math.min(12, all) + ' shakiest'`.
- **R-57** The finish screen shows at most 5 new stickers (`STICKERS.recent` → 5, or slice in the finish only if the constant is used elsewhere). A speed round with no right answers ends with "Have another go. Your words will come faster." instead of "Your best is 0.".
- **R-60** Story chips (Show text, Translate, Save: `.chip-btn`) get `min-height:44px`.
- **R-63** The folded unit row: put the button inside the heading (`h2 > button`) or give the row `role="button"` with `tabindex="0"` and Enter/Space handling; no `div`/`h2` inside a `button`. The recap's line says "due now or this week".
- **Tests** for each item, named `follow-ups: …`. Screenshots (412 light and dark, one 360 pass): Learn top (three tiles in de, es and it), the finish screen (bubble and date), Me (links, small buttons), a story line (chips), the Friends league, the folded route.

## Integration

- `APP_VERSION` `4.45.0`; `RELEASES`: title "Little things", notes below. `docs/ARCHITECTURE.md` where a convention changed (animation durations are tokens too). Roadmap rows R-52 to R-63 to `done (4.45.0)` except R-60 (screen-off part) and R-61 (warmer gold), which stay open.
- Film: `node dev/film.js` re-renders the five videos (the rig's code is in the fingerprint); commit `media/film/`.

## Release notes

- **Title:** Little things
- **Notes:**
  - Lots of small fixes from our reviews: clearer tiles on Learn, bigger buttons to tap, and a calmer chime on long runs.
  - Your bird has something to say when there's nothing to show, and it never gets stuck dancing.

## Verification plan

`npm test` FAIL 0; `node dev/flow.js guard --base ee3341b`: STOP only for `js/core/rig.js` and `vercel.json` (covered above), no FIX; `node dev/contrast.js` ok; `node design/rig/check.js` ok; `node dev/film.js --check` up to date after the re-render; `npm run offline-check` 8/8; voices `--dry` 0 after recording.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
