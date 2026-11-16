# Each table on the card that explains it, and a check of every Spanish A1 lesson

- **Cycle:** queued 2026-11-16 (program 2, release R6; `flow/PROGRAM-2.md`)
- **Status:** draft (the orchestrator promotes it: move to `flow/plans/<cycle>-r6-tables-in-the-right-place.md`, set Base, check it still matches `main`)
- **Release:** 4.52.0 (minor)
- **Base:** `main` at the commit that ships 4.51.0 (`r5-the-mind-and-the-planet.md`); R2 and R4 must have shipped (every A1 tip is hand-cut, so this release doesn't touch them)
- **Proposals built:** pmvxw6o4w0 (web, approved; the "tables on the wrong card" half of its note)
- **Roadmap items:** R-18, R-9 (second audit: Spanish A1)

## Why this, why now

A tip without blank lines places each table by its caption alone, and most captions don't repeat the tip's bold words, so the table falls to the last card. Measured on 2026-11-16 over the 408 lessons that R2 and R4 leave without blank lines: 876 tables, of which 327 sit on a card whose text never names them. Matching a table by its caption **and** its cells, with the caption counting more, cuts that to 80 (tables that no card names at all) and moves tables in 251 lessons. The roadmap asked for every lesson's placement to be checked first, so WP1 starts with a tool that prints the old and the new placement of every table, and the reviewer reads its output before the rule changes. WP2 is the second content audit.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | How a tip is cut into cards: content presentation, no text, key or saved-state change (POLICY "Fixes to existing content": a better tip; "UX polish") | — |
| WP2 | Green | Fixes to existing content that keep every review-card key | — |

## Work packages

WP1 and WP2 run in parallel (worktrees; disjoint files).

### WP1 — Tables by caption and cells (R-18)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first, in parallel with WP2
- **Owns (may edit):** `dev/tips.js` (new), `js/core/content.js` (`tipBites()` only), `dev/test.js` (the tip block, from `/* tips: a hand-cut tip (blank lines) …` to its closing `}`), `docs/ARCHITECTURE.md` ("How a lesson teaches", the sentence on tables)
- **Reads first:** `tipBites()` in `js/core/content.js`; `buildLesson()` in `js/core/engine.js` (how bites become concept cards); `loadApp()` in `dev/flow.js` (how a dev tool loads the app in jsdom); the tip block of `dev/test.js`
- **Must not touch:** content files, the hand-cut path of `tipBites()` (tips with blank lines keep their placement exactly), `buildLesson()`

**Spec.**

*The rule* (tips without blank lines only). For each table and each card (bite), count the card's bold words longer than two letters (as `tipBites()` already lists them) that appear in the table's caption (3 points each) and in its head and cells (1 point each). The table goes to the card with the most points. On a tie, it stays on the card the caption alone picks today (the current `home(caption)` result) if that card is among the tied ones, otherwise it goes to the **last** of the tied cards. With no points anywhere it stays where it is today (the last card). Examples are placed exactly as today.

In `tipBites()`, replace the table loop for tips without blank lines (leave the `byPara` path as it is):
```js
const hits = (b, key) => bolds(b).filter(w => w.length > 2 && key.includes(w)).length;
for (const t of tip.tables || []){
  if (byPara){ home(tableKey(t)).tables.push(t); continue; }
  // a table goes to the card that names it most: a bold word in its caption counts three times, one in its cells once;
  // a tie keeps the card its caption alone would pick, or else the later card
  const cap = plain(t.cap), cells = plain([...(t.head || []), ...t.rows.flat()].join(' '));
  const sc = bites.map(b => 3 * hits(b, cap) + hits(b, cells)), mx = Math.max(...sc);
  let at = bites.indexOf(home(cap));
  if (mx > 0 && sc[at] !== mx) at = sc.lastIndexOf(mx);
  bites[at].tables.push(t);
}
```
and update the comment above `tipBites()`: "Without blank lines it is cut at sentence ends by length, and a table goes to the card whose bold words its caption (counted three times) and cells show most."

*The audit tool* `dev/tips.js` (dev only; `dev/files.js` doesn't publish it). It loads the app the way `loadApp()` in `dev/flow.js` does (copy that function; don't import `dev/flow.js`) and, for every built-in lesson whose tip has no blank lines, computes the placement under the **old** rule (caption only, as on `main` before this release) and the **new** rule above, independently of the app's `tipBites()`. Usage and output:
- `node dev/tips.js` prints one summary line per language and a total: `<lang>: <lessons> lessons, <tables> tables, <moved> lessons change, unnamed before <a>, after <b>` (unnamed: a table on a card none of whose bold words appear in it).
- `node dev/tips.js --list` adds one line per table that moves: `<lesson id>  <caption>: card <i> → card <j>` (cards counted from 1).
- `node dev/tips.js --check` exits 1, printing the lesson ids, if the app's `tipBites()` placement differs from the tool's new rule for any lesson.

*Tests* (the tip block of `dev/test.js`):
- `tipBites: without blank lines, a table goes to the card its caption and cells name most` — a synthetic tip of three bites whose table caption names nothing and whose cells name bite 1's bold word lands on bite 1; one whose caption names bite 2's bold word once and whose cells name bite 0's bold word twice lands on bite 2 (3 > 2).
- `tipBites: a tie keeps the caption's card, or else the later card` — two synthetic cases.
- Pinned lessons (`tables per card`): `de-4-1` → `[["Possessives as the subject"], ["Plurals"]]`; `de-4-2` → `[[], ["Adjective ending after **ein** / **eine**"]]`; `it-12-1` → `[["Order your points"], ["Two sides"]]`; `es-36-1` → `[["quisiera: querer, imperfect subjunctive", "Signposts"], ["Other forms in this lesson"], []]` (computed on 2026-11-16; if the tool's `--list` shows one of these lessons changed text since, take its new placement from `--list` and say so in the report). The existing `es-9-1` check ("a tip without blank lines is cut as before") stays unchanged and must still pass.
- `tipBites: every table sits with a card that names it, unless no card does` — for every built-in lesson whose tip has no blank lines, each table either sits on a card with a bold word in its caption, head or cells, or no card of that tip has one.

**Steps.**
1. Write `dev/tips.js`. Run `node dev/tips.js --list > flow/shots/<cycle>/tips-before.txt` **before** touching `content.js`, and put the summary lines in your report. The total must be close to the planner's measurement (408 lessons, 876 tables, 251 change, unnamed 327 → 80); if units 43–46 have shipped the totals are larger, by those 16 lessons a language.
2. Change `tipBites()`.
3. `node dev/tips.js --check` exits 0.
4. Add the tests; run `npm test` (30-minute timeout): `FAIL 0`. Every lesson's "every example and table is shown" and phrase-order checks must still pass.
5. Screenshots (Verification plan).

**Acceptance criteria:**
- [ ] `node dev/tips.js` prints the summary; `node dev/tips.js --check` exits 0
- [ ] `npm test` ends with `FAIL 0` with the four new checks; the hand-cut `TIP_PLACES` checks are unchanged and pass
- [ ] `git diff -- content/` is empty
- [ ] Screenshots of the cards of de-4-1 and es-36-1 show each table on the card named above, light and dark, 412px

**Stop and report if:** `--check` can't reach 0 without changing the hand-cut path, or more than 300 lessons change (the tool and the rule disagree with the planner's measurement).

### WP2 — Content check: every Spanish A1 lesson (R-9)

- **Agent:** parlance-content (Spanish)
- **Model:** sonnet
- **Runs:** first, in parallel with WP1 (worktree)
- **Owns (may edit):** in `content/es-1-basics.js`, `content/es-1b-more.js`, `content/es-3-more.js`, `content/es-5-more.js` and `content/es-4-a1.js` only the 32 A1 lessons (`es-1-*`, `es-2-*`, `es-3-*`, `es-20-*`, `es-21-*`, `es-16-*`, `es-24-*`, `es-30-*`), only the fields R5's WP3 lists; `content/glossary.js` only to add to an existing Spanish entry's meaning
- **Spec, steps, acceptance and stop rule:** exactly R5's WP3 (`flow/plans/*r5-the-mind-and-the-planet.md`), with Spanish for German. Spanish specifics: accepted Spanish alternatives stay Latin American (*ustedes*, never *vosotros*; *carro* or *auto*, *celular*, *computadora*); for *usted* sentences, English variants use plain *you*; never add a Spain-only variant as accepted Spanish.

## Integration

- [ ] `docs/ARCHITECTURE.md` "How a lesson teaches": "a table goes to the paragraph whose bold words its caption or cells show" stays for hand-cut tips; add "Without blank lines, a table goes to the card whose bold words its caption (counted three times) and cells show most; `node dev/tips.js` prints where every table lands."
- [ ] WP2's follow-up list goes into the roadmap as one row (`R-9 follow-up: Spanish A1 text fixes that need an alias pack`, `open`)
- [ ] Roadmap: R-18 `done (4.52.0)`
- [ ] Voices: `node dev/voices.js --dry` (only WP2's new accepted Spanish forms, if any)

## Release notes

- **Title:** Tables where they belong
- **Notes:**
  - In lessons from A2 up, each table now shows up on the card that explains it, not at the end.
  - The Spanish A1 lessons accept more good English answers.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/tips.js --check` (exit 0).
- Screens (412px, light and dark): each concept card of `de-4-1` and `es-36-1` (`js:startLesson('de-4-1');wait:900;click:Start lesson;wait:800;js:Run.pos=Run.queue.findIndex(e=>e.mode==='concept');nextEx();wait:400;shot:de-4-1-c1`, then the next concept card the same way).
- Spot checks for the reviewer: read `flow/shots/<cycle>/tips-before.txt`; open ten moved lessons at random, two per level from A2 to C2, and confirm each moved table is on the card that teaches it.

## Risks and rollback

A table moving to an earlier card shows its forms before a later card explains them; the reviewer's ten-lesson sample is the check. Nothing saved changes, and a half-done lesson resumes (counts unchanged). Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
