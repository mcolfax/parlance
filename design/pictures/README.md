# Word pictures and story scenes

The plan is in [`PLAN.md`](PLAN.md). Read it first: it lists the phases, the stops where Matt signs off, and the drawing rules.

## Where this stands

- **Phase 0 (inventory):** `node design/pictures/tools.js inventory` writes `words.json` (1,826 concepts). Writing `briefs.json` waits until the style is chosen.
- **Phase 1 (style board):** done. The board is at https://claude.ai/artifact/JoRs3n6D8eR8gLcvUUm4hG (private until shared). **Matt chose Sticker** (see Decisions).
- **Cast and scenes:** Matt makes them in Recraft. Prompts for the 18 people and 27 scenes: https://claude.ai/artifact/BB73fC3hcNf4z1xF73Hpjm (copy buttons, a done checklist) and `recraft/PROMPTS.md`. His SVGs go in `recraft/incoming/`. Plan: Phase 6 in `PLAN.md`.
- **Decided:** Recraft for word pictures, the cast and the story scenes (not the unit signs, badges or chest). Ask Matt before every paid batch.
- **Direction change:** pictures drawn in code are paused; everything will be regenerated in Recraft for consistency. See "Direction change" in `PLAN.md`. Blocked on the environment's network policy for `external.api.recraft.ai`; `recraft/generate.js` is ready and tested against a mock.
- **Was next in code:** the picture kit (Phase 2), `briefs.json` (Phase 0), then the first batch of word pictures, and **STOP B**.

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
