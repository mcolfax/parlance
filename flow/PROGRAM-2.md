# Program 2: the rest of the roadmap

Matt asked (2026-11-16) to tackle every outstanding item in `ROADMAP.md`. The small ones are in `plans/2026-11-16-tidy-ups.md` (4.46.0: R-20's first half, R-21, R-22, R-40, R-64). Everything else that doesn't wait on Matt is planned below as seven releases, each a plan in `plans/queue/` written to the template's bar. Written against `main` at d1fd861 (4.45.0, tidy-ups planned).

## The releases, in build order

Promote them in this order (`r1` first). Each stands alone once the ones before it have shipped.

| # | Version | Title (release notes) | Packages (agent, model) | Zone | Plan |
|---|---|---|---|---|---|
| R1 | 4.47.0 | Stories and sharp eyes | WP1 stories s10–s12 in de, es, it (3 × content, Sonnet) · WP2 Spot the mistake, B2+ (builder, Sonnet) | Green · Amber (`evaluate()`) | [`r1`](plans/queue/r1-stories-and-mistakes.md) |
| R2 | 4.48.0 | Clearer first lessons | WP1 A1 tips of units 3, 20, 21, one idea per card (content, Sonnet) · WP2 one article question in A1–A2 lessons (builder, Sonnet) | Green | [`r2`](plans/queue/r2-one-idea-per-card.md) |
| R3 | 4.49.0 | News and money | WP1 C1 unit 43 *News & media* and C2 unit 44 *Money & the economy* (3 × content, Sonnet) · WP2 their pictures (illustrator, Sonnet) | Green | [`r3`](plans/queue/r3-news-and-money.md) |
| R4 | 4.50.0 | One idea per card | WP1 A1 tips of units 16, 24, 30 (content, Sonnet) · WP2 verb pictures, batch 1 (illustrator, Sonnet) | Green | [`r4`](plans/queue/r4-one-idea-per-card-part-two.md) |
| R5 | 4.51.0 | The mind and the planet | WP1 C2 units 45 *The mind* and 46 *Climate & the planet* (3 × content, Sonnet) · WP2 their pictures (illustrator, Sonnet) · WP3 audit of German A1 (content, Sonnet) | Green | [`r5`](plans/queue/r5-the-mind-and-the-planet.md) |
| R6 | 4.52.0 | Tables where they belong | WP1 tables placed by caption and cells, with an audit tool (builder, Sonnet) · WP2 audit of Spanish A1 (content, Sonnet) | Green | [`r6`](plans/queue/r6-tables-in-the-right-place.md) |
| R7 | 4.53.0 | Opens faster | WP1 the learner's language first, the others after the first screen (builder, Sonnet) · WP2 dev tools, measurement, docs (builder, Sonnet) | Amber (badges, Friends card timing) | [`r7`](plans/queue/r7-opens-faster.md) |

Voices (parlance-chores, Haiku) ship with R1, R3 and R5, inside the monthly cap, and with R6 if its audit adds accepted Spanish forms; R2, R4 and R7 add no recorded lines.

**Why this order.** Content and lesson types first (Matt's `focus`), one big content release and one lighter release alternating so each cycle ships. R-16 (R2, R4) must finish before R-18 (R6), which only touches tips without blank lines, and before the A1 audits (R5, R6), so they check the tips as rewritten. R-36 (R7) goes last because it moves every content file into `LANG_FILES`; the units R3 and R5 add are listed there from the start. R-13 and R-20 both edit `buildLesson()`, so they ship in different releases.

**Roadmap rows each release covers.** R1: R-3, R-13, R-62 (reviewing `CONVO.never` for the new stories). R2: R-16 (units 3, 20, 21), R-20 (second half). R3: R-2 (units 43–44). R4: R-16 (units 16, 24, 30), R-12 (batch 1). R5: R-2 (units 45–46), R-9 (German A1). R6: R-18, R-9 (Spanish A1). R7: R-36. When promoting, mark them `planned (R<n>)` and, after shipping, `done (<version>)`.

## How the open-ended items continue

- **R-9, content audits.** One level and one language per release, in this order: German A1 (R5), Spanish A1 (R6), then Italian A1, German A2, Spanish A2, Italian A2, and so on up to C2. Each is a copy of R5's WP3 with the language, the lesson ids and the files swapped, and rides as an extra package on a release that has room. From A2 up, tips have no blank lines, so a tip fix keeps its sentences (adding or merging a sentence changes where `tipBites()` cuts). Text fixes that would orphan review cards are collected as follow-up rows and done later as an Amber package with an alias pack (POLICY "Changing existing content").
- **R-12, more pictures.** Batch 1 (R4) is twelve A2–B2 verbs. Batch 2 takes the concrete concepts marked `abstract or grammar` in the B2 chunk of `design/pictures/briefs-src.txt` and in the units 24–29 section; batch 3 the C1–C2 ones. Each batch is at most fifteen drawings, uses R4's shared-lesson rule (no picture whose main prop is another pictured word of the same lesson), and rides with a release that has room.
- **R-2** is done after R5: B2, C1 and C2 have 28 lessons each per language. More C-level units would be a new roadmap row.

## What waits on Matt (not in this program)

- **R-15:** the five story scenes he is making in Recraft (es-s9, it-s6 to it-s9). The nine new stories in R1 use drawn scenes until scenes exist for them too; making those would cost Recraft units, which the budget (0) doesn't allow without him.
- **R-60:** whether listening keeps going with the phone's screen off (his Android check).
- **R-61:** a warmer gold for light-theme lettering, if #7A5A00 reads dull on his phone (his eye).
- **R-64:** the Relaxed speed on the Web Audio fallback: keep, a milder 0.9, or the device voice (his choice).
- **Parked, not planned:** R-27 (calendar reminder), R-29 (song off by default), R-37 (bird outfits).

Nothing in this program is Red, so it needs no "Your call" proposal.

## Noticed while planning (for the roadmap)

- Spot the mistake could also be a Review practice tile once lessons ask it (from learned B2+ lessons, no review key), like Practice articles.
- `content/glossary.js` (103 KB, all three languages) still loads before the first screen after R7; splitting it per language would be a small follow-up to R-36.
- The story badge `stories8` ("Finish every story in one language") counts every built-in story, so R1's three new stories per language make it harder to earn; nobody loses it once earned.
