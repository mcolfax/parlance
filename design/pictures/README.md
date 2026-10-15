# Word pictures and story scenes

The plan is in [`PLAN.md`](PLAN.md). Read it first: it lists the phases, the stops where Matt signs off, and the drawing rules.

## Where this stands (Oct 15)

- **Style: Sticker** (see Decisions). Word pictures, cast and scenes all use it.
- **Words (Phase 0):** all 1,826 concepts are classified in `briefs-src.txt`: 440 get a picture, 150 share another's, 1,240 get none by decision. `node design/pictures/tools.js check` shows the coverage table.
- **Word pictures:** 58 drawn in code (`js/core/pics.js`) and 218 made in Recraft as sticker sheets and placed in `media/pics/` (see "Word pictures" in `docs/ARCHITECTURE.md`). Objects, food, clothes, buildings and body parts came out well. People doing things (most verbs) did not: the model ignores per-cell instructions for figures. Matt's call (Oct 15): **Recraft only for the cast and the scenes from here on**; keys are fine for free services only. The rest of the words (about 220 concrete concepts, mostly verbs) wait on another source, for example free stock photos (Pexels, Pixabay) once the environment allows the host and has a key. Spent on Recraft so far: about 1.9 USD, see `recraft/recraft-usage.json`.
- **In the app (Phase 4, built, not released):** the new-word card shows pictures, and lessons swap up to two recognition questions for `pic-pick`, `pic-name` or `pic-type` by level (`PIC_EX` in `js/config.js`). Tests cover it. No version bump yet.
- **Cast:** 14 figures from Recraft are in `media/cast/` (originals in `recraft/incoming/`). Decision: all three languages reuse these models and the characters are renamed per language (nonna uses Weber, Marco uses Diego, Conti uses Sofía, Bianchi uses Andrés). Not wired into the app yet (Phase 6).
- **Scenes:** 4 of 27 trial scenes are generated (`recraft/candidates/`, git-ignored: de-s1, de-s3, es-s3, de-s5). They look right, people-free with open floor. The other 23 need about 1.84 USD of Recraft credit (one image each).

## Files

- `board.html`, `board.js`: the style board. `board.js` holds the sample drawings and the figure and scene builders. Each drawing is written once with role classes (`pk-red`, `pk-line`, `pk-shade` …) and painted three ways by the `s-flat`, `s-ink` and `s-sticker` rules in `board.html`. `sp` marks the spot-color shapes the Ink style keeps. The `--pic-*` tokens in `board.html` move into `styles/tokens.css` once a style is chosen.
- `tools.js`: loads the app in jsdom. `inventory` writes `words.json`; `chunk [from] [n]` prints concepts for writing `briefs.json`.
- `recraft/`: `prompts.js` writes `PROMPTS.md` and `prompts-data.js` (read by `prompts.html`, the copy-button page); `incoming/` is where Matt's SVGs go.
- `words.json`: generated; do not edit by hand.

## Looking at the board locally

`board.html` has no doctype (the Artifact tool adds the skeleton), so wrap it for a local screenshot:

```sh
(printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'; cat design/pictures/board.html; printf '</body></html>') > design/pictures/board.test.html
```

Open that file in Chromium at 412 px wide. Don't commit `board.test.html`. Republish the board with the Artifact tool: `file_path` is the absolute path to `board.html`, `url` is the link above, and `files` maps `board.js` and the `styles/` and `js/` files it loads (see the script list at the bottom of `board.html`).

## Decisions (Oct 15)

- **Style: Sticker.** Full Selva fills, an ink outline (2.3 units on the 64 grid, round caps and joins, `#0B2A1E` in both themes), a white sticker border and a soft shadow added by CSS. The `--pic-*` tokens in `board.html` are the palette; they move into `styles/tokens.css` in Phase 2.
- **Palette and line weight:** unchanged from the board.
- **Cast portraits and full-length figures:** made in Recraft, not in code. The portraits are cropped from the full figures.
- **Story scenes:** made in Recraft, one per story, people-free; the app puts the cast in front. The header stays 320 by 140.
