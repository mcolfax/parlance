# Word pictures and story scenes

The plan is in [`PLAN.md`](PLAN.md). Read it first: it lists the phases, the stops where Matt signs off, and the drawing rules.

## Where this stands

- **Phase 0 (inventory):** `node design/pictures/tools.js inventory` writes `words.json` (1,826 concepts). Writing `briefs.json` waits until the style is chosen.
- **Phase 1 (style board):** published for review at https://claude.ai/artifact/JoRs3n6D8eR8gLcvUUm4hG (private until shared). It paints the same 16 sample words, a mock lesson card and question, Lena and Jonas, and the café scene for `de-s1` in three directions: Flat, Ink and spot, Sticker. **STOP A: nothing is drawn for the library until Matt picks one.**

## Files

- `board.html`, `board.js`: the style board. `board.js` holds the sample drawings and the figure and scene builders. Each drawing is written once with role classes (`pk-red`, `pk-line`, `pk-shade` …) and painted three ways by the `s-flat`, `s-ink` and `s-sticker` rules in `board.html`. `sp` marks the spot-color shapes the Ink style keeps. The `--pic-*` tokens in `board.html` move into `styles/tokens.css` once a style is chosen.
- `tools.js`: loads the app in jsdom. `inventory` writes `words.json`; `chunk [from] [n]` prints concepts for writing `briefs.json`.
- `words.json`: generated; do not edit by hand.

## Looking at the board locally

`board.html` has no doctype (the Artifact tool adds the skeleton), so wrap it for a local screenshot:

```sh
(printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'; cat design/pictures/board.html; printf '</body></html>') > design/pictures/board.test.html
```

Open that file in Chromium at 412 px wide. Don't commit `board.test.html`. Republish the board with the Artifact tool: `file_path` is the absolute path to `board.html`, `url` is the link above, and `files` maps `board.js` and the `styles/` and `js/` files it loads (see the script list at the bottom of `board.html`).

## Decisions

None recorded yet. After Matt answers the four questions on the board (direction, palette and line weight, whether the cast portraits follow, whether the story header stays 320 by 140), record them here and the cast-style decision in `design/README.md`.
