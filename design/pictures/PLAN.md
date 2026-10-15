# Word pictures and story scenes: plan

## Context

Parlance teaches about 3,200 words (1,064 per language, 132 lessons each, A1–C2), and none has a picture. The "New words" card is plain text (`RENDER.teach` in `js/ui/runner.js:335`). Stories use 11 shared, people-free backdrops (`SCENES` in `js/core/art.js:256`, 320×140) for 27 stories, so several stories share one picture and the cast never appears in them. Matt wants:

- a picture for each new word, at every level
- a pick-the-picture question
- a scene for every story, with its cast in it

He wants to sign off on the style before anything is drawn at scale.

**Decisions already made (Oct 15):**
- **Medium:** hand-drawn SVG in code, colored only through tokens. No raster files, no image model, no outside icon sets.
- **Where pictures show:** the new-word cards, and a new picture question at every level. The question gets harder with the level, the same way hints fade (`HINTS` in `js/config.js:223`).
- **Stories:** one scene per story (27), with the story's cast drawn full-body in the setting. The cast style ("Flat", "Ink and spot color" or "Sticker", see `design/README.md`) is still undecided, so the style board settles it at the same time.

**Style decided (STOP A passed, Oct 15):** Sticker (full Selva fills, an ink outline, a white border and a soft shadow added by CSS). Palette and line weight stay as on the board (`design/pictures/board.html`, `--pic-*` tokens, 2.3-unit outline). The story header stays 320 by 140.
**Cast and story scenes are made in Recraft by Matt, not drawn in code.** The prompts are in `design/pictures/recraft/` (`PROMPTS.md`, and a copy-button page). Phase 6 below is the plan for putting the SVGs he sends into the app. Word pictures (Phases 0 to 5) are still drawn in code.

**Facts the plan relies on:**
- 1,826 distinct English meanings across the three courses. Most German, Spanish and Italian words share a meaning, so one picture serves all three languages.
- My estimate: 700–900 pictures in total. Many B and C words are abstract and get no picture.
- The vocab shape is `{ t, alt, e[], g }`, built by `L()` in `js/core/content.js:21`. Review card keys don't change, and saved state doesn't change either, so there's no `SCHEMA_VERSION` bump.

## Direction change (Oct 15, later): everything from Recraft

Matt paused the pictures drawn in code and wants **all** illustrations regenerated in Recraft so they match. Read this section first; where it conflicts with the phases below, it wins.

**State when the change was made**
- Done and kept: the inventory (`words.json`), `briefs-src.txt`/`briefs.json` for the first 170 concepts, `tools.js` (briefs, words, check, shots, svg), the `--pic-*` tokens and Sticker CSS, `js/core/pics.js` with 58 hand-drawn pictures (a-food, a-home and the board samples), `PIC_WORDS`, the helpers in `art.js`, the optional picture field on vocab, the style board, the prompts page, and Lena and Jonas from Recraft (`media/cast/`). The hand-drawn pictures stay as placeholders and as a quality reference; **no more are drawn in code.**
- Not started: the picture questions in lessons (Phase 4), the new-word card pictures, and putting the cast and scenes in the app (Phase 6).
- The full test suite was not yet green-checked after the kit went in (it ran for 8 minutes without finishing on this machine; the untouched HEAD was being timed for comparison). Run `npm test` before any release.

**Getting connected (the blocker)**
- Matt gave an API token (rotate it after the work; it is in the chat). The environment's network policy denies `external.api.recraft.ai` (CONNECT answers 403), and WebFetch can't reach `recraft.ai`. Matt has to add `external.api.recraft.ai` (and `img.recraft.ai`, where files are usually hosted) under Network access, Allowed domains, in the cloud environment's settings; a new session may be needed for it to apply. Better: put the token in the environment as a secret so a session never has to be handed it.
- The Recraft MCP server (`https://mcp.recraft.ai/mcp`) is a second way in: connected as a claude.ai connector, calls go through Anthropic's connector path instead of the egress policy. It bills Matt's Recraft plan credits, not API units, and may not hand back SVG text, so try the API first.
- `design/pictures/recraft/generate.js` is written and was tested against a local mock of the API (style, candidates, pick, spending cap, bad or missing token). Facts from Recraft's agent docs: base `https://external.api.recraft.ai/v1`; `Authorization: Bearer $RECRAFT_API_TOKEN`; model `recraftv4_1_vector` (SVG, 0.08 USD an image, prompt limit 10,000); `size` for vector models is a ratio (`1:2` for figures, `2:1` for scenes, `1:1` for objects); `POST /v1/styles` (0.005 USD, 1 to 10 reference PNGs as data URLs, `model` must match) then `style_id` on each generation; image URLs expire in about 24 hours; rate limit 100 images a minute; `GET /v1/users/me` returns `credits` (1 USD = 1,000 units).

**What to do once the API answers (in order)**
1. `export RECRAFT_API_TOKEN=…` (or `RECRAFT_API_TOKEN_FILE`), then `node design/pictures/recraft/generate.js balance`.
2. `NODE_PATH="$(npm root -g)" node design/pictures/recraft/generate.js style` (Lena and Jonas as the reference), then `gen sofia --n 2` and look at the two candidates before spending more. If the likeness or style is off, change the prompt block (`prompts.js`) or the references and try again.
3. `gen cast --n 2` (16 left, about 2.6 USD), pick the best of each (`pick <id> <k>`), `node design/pictures/tools.js svg`, show Matt a contact sheet, fix the misses.
4. Scenes: `gen scenes --n 2` (27, about 4.3 USD). A second style made from the first scenes Matt likes keeps the rest consistent.
5. **Word pictures through Recraft: pilot first.** Generate the a-food batch (about 30 concepts, 1:1) with a style made from the approved cast plus a few of the best hand-drawn pictures; compare with the hand-drawn set at 44 px in a contact sheet; Matt decides. Prompt shape: the `STYLE_CAST` look block, then "a single {brief}, centered, no text, no people unless the brief says so, transparent background".
6. **Delivery changes for Recraft pictures.** A Recraft SVG is 15 to 40 KB with literal colors, so about 900 pictures (20 MB or more) can't live inline in `pics.js` (900 KB cap). They become files, `media/pics/<concept-id>.svg`, loaded as `<img loading="lazy">` only when a lesson needs them; `wordPic()` returns that (the sticker border is the same CSS filter on the `img`); `PIC_WORDS` and `briefs.json` stay as they are; `tools.js check` swaps its drawing rules for the same safety and budget checks `tools.js svg` already does (no scripts or external references, at most 40 KB each, file exists). Inline `PICS` stays as a fallback while any are missing.
7. Other illustrations in scope if Matt wants them all: the 19 unit signs, the 18 badge icons, the daily chest (about 40 images). Pip and the other birds stay on the rig.

**Cost** (0.08 USD an image; plan for one re-roll in three): cast 16 x 2 candidates = 2.6 USD; scenes 27 x 2 = 4.3 USD; word pictures about 700 to 900 concepts = 56 to 72 USD, about 75 to 100 USD with re-rolls; unit signs, badges and chest about 4 USD. Everything: roughly 85 to 115 USD. `generate.js` stops before a run would take the total past `--max-usd` (default 8), so a big run needs Matt's go-ahead and a higher cap on purpose. Every call is logged in `recraft-usage.json`.

## How to run this plan (read first)

1. **Save the plan first.** Copy this file to `design/pictures/PLAN.md` and commit it, so every later session can find it.
2. **Gates.** Stop and wait for Matt at these points. Don't go past one without his answer.
   - **STOP A**, after the style board (Phase 1). Nothing gets drawn for the library until Matt has picked a style.
   - **STOP B**, after the first batch of about 40 pictures (Phase 3).
   - **Before each release.** Ask "ready to ship?" and include the review page link.
3. **Branches and shipping.** Work on the branch your session names. Shipping follows "Shipping a release" in `CLAUDE.md`. No voice recording is needed, because no lesson or story text changes.
4. **The order of work:**
   - Phase 0 doesn't depend on the style, so it can run before STOP A.
   - Phase 6 waits for Matt's SVGs and is independent of Phases 2 to 5.

## Phase 0: Inventory (no drawing)

1. Create `design/pictures/tools.js`.
   - It's a Node CLI, and it exports its helpers so `dev/test.js` can `require` them.
   - It loads the app the way `dev/voices.js:22-51` does: jsdom, `LocalOnly` resources, `window.__parlance`.
   - It ends with `ok`, or prints `FAIL` lines and exits with code 1. That's the same contract as `design/rig/check.js`.
2. `node design/pictures/tools.js inventory` writes `design/pictures/words.json`.
   - Every built-in vocab item, grouped by its normalized first English meaning (lowercase; keep "to " so "drink" and "to drink" stay apart).
   - Each group lists `{ lang, t, e, g, lesson, level }` and its lowest level.
   - Groups are sorted by lowest level, then lesson order.
3. Classify the concepts into `design/pictures/briefs.json`, in chunks of about 150. This is the single source of truth for the library. Follow "Drawing rules" below.
   ```json
   { "bread":  { "kind": "n", "quiz": 1, "level": "A1", "batch": "a-food", "brief": "round loaf, three diagonal scores, two crumbs",
                 "words": { "de": ["das Brot"], "es": ["el pan"], "it": ["il pane"] } },
     "monday": { "none": "days can't be told apart in a picture" } }
   ```
   - **`kind`:** `n` (noun), `v` (verb), `a` (adjective) or `x` (other).
   - **`words`:** each word's exact main text `t` from the lesson.
   - **Same English, different meanings** ("right" as a direction, "right" as correct): split into separate ids. Check each word's lesson to see which meaning it has.
   - **`batch`:** a level band plus a theme, e.g. `a-food`, `a-home`, `a-travel`, `a-verbs`, `b-work`, `c-abstract`. Aim for 20–30 pictures per batch.
4. Commit `words.json`, `briefs.json` and `tools.js`.

## Phase 1: Style board → STOP A

1. Create `design/pictures/board.html` and `design/pictures/board.js` (the drawings).
   - The page links `../../styles/tokens.css`, `../../styles/base.css` and `../../styles/components.css`, so the mock cards use real app CSS.
   - Copy the light/dark toggle and the Comment buttons (`data-comment-target`, `data-comment`) from `design/rig/index.html`.
   - It must work at 412px wide.
2. Show three directions side by side, named after the cast options already in Figma and Claude Design. Each column opens with its rule card: line weight, fills, shading and border.
   - **Flat:** no outlines and 2–4 flat fills, with one shade shape. This is how today's scenes are drawn.
   - **Ink and spot:** an ink outline (3 units on the 64 grid, round caps and joins), paper fill plus one or two spot colors. This extends the unit signs and medals.
   - **Sticker:** an ink outline on every shape and full Selva fills, with a white sticker border and a soft shadow. This matches the birds and the chest ("inked like Pip"). Draw the border in CSS (stacked `drop-shadow()` filters using `var(--pic-paper)`), not in each drawing.
   - **Starting points:** the sticker and flat cast concepts in `design/concepts/art/cast-*.svg`, and the existing colors (`--sc-*`, `--pip-*`, `--der/--die/--das`).
3. Each direction draws the same samples:
   - **16 words:**
     - nouns: bread, apple, coffee, dog, train, key, glasses
     - verbs: to read, to sleep, to swim, to cook
     - adjectives: tired, tall/big (a comparison)
     - a color: blue
     - one B2 word and one C1 word from `words.json` that have a clear visual metaphor
     - Each is shown at 44, 112 and 128 px.
   - **A mock "New words" card** (3 rows) and **a mock pick-the-picture question** (2×2), both at 412px.
   - **Lena and Jonas** full-body (standing, plus one holding a cup), beside their portrait in that style and today's portrait (`avatarSVG`).
   - **The scene for `de-s1`** (Lena behind the café counter, Jonas ordering), at story-card size and story-header (`.scene.big`) size.
   - Everything in light and dark.
4. Publish the board as a new private artifact.
   - Load the `artifact-design` and `artifact-capabilities` skills first, as the Artifact tool requires. Declare `comments` like the rig page.
   - `file_path` is `board.html`. `files`: `{"styles/tokens.css", "styles/base.css", "styles/components.css", "board.js"}` mapped to their absolute sources. `../../styles/x.css` resolves to `styles/x.css` at the artifact root.
5. Write `design/pictures/README.md` with the board link, then **STOP A** and ask Matt:
   1. Which direction?
   2. Any palette or line-weight changes?
   3. Should the cast portraits change to match? (Recommend yes, so the scenes and the story bubbles agree.)
   4. Should the story header stay 320×140?
6. Once he answers:
   - Record his decisions and the chosen direction's rule card in `design/pictures/README.md`, and the cast-style decision in `design/README.md`.
   - Carry over the chosen samples as the first library entries.

## Phase 2: Picture kit (code)

1. **Tokens** (`styles/tokens.css`), in `:root` and both dark blocks:
   - `--pic-tile`, `--pic-ink`, `--pic-paper`, `--pic-shade`, `--pic-figure`
   - about 12 hues: `--pic-red`, `--pic-orange`, `--pic-yellow`, `--pic-green`, `--pic-teal`, `--pic-blue`, `--pic-sky`, `--pic-purple`, `--pic-pink`, `--pic-brown`, `--pic-tan`, `--pic-grey`
   - Values come from the board.
2. **CSS** (`styles/art.css`, new block `/* word pictures */`):
   - `.pic` is a rounded tile sized by `--pic`, with `background: var(--pic-tile)`.
   - `.pic svg` fills it.
   - One rule per palette class, `.pk-<hue>{fill:var(--pic-<hue>)}`, plus line classes `.pk-line` (ink stroke, no fill) and `.pk-line-w` (paper stroke).
   - The chosen direction's stroke and border rules live here once.
3. **`js/core/pics.js` (new):**
   - Shape: `const PICS = { bread: { k: 'n', quiz: 1, svg: '<path class="pk-tan" d="…"/>…' }, … }`. The inner markup is on a 64×64 grid. Add a comment header per batch.
   - End with `if (typeof module !== 'undefined') module.exports = PICS;` (the same pattern as the end of `js/core/pip.js`).
   - Add it to `index.html` and `styleguide.html` just before `js/core/art.js`.
4. **`content/pictures.js` (generated; never edit by hand):**
   - `node design/pictures/tools.js words` writes `const PIC_WORDS = { de: { 'das Brot': 'bread', … }, es: {…}, it: {…} };` from `briefs.json`, listing only ids that exist in `PICS`.
   - Add it to `index.html` and `styleguide.html` after `content/stories-it.js`.
5. **Helpers in `js/core/art.js`**, near the unit signs:
   - `picFor(item, lang)`: returns `item.p` if `PICS[item.p]` exists, otherwise `PIC_WORDS[lang][item.t]` if `PICS` has it, otherwise `null`.
   - `picQuiz(item, lang)`: returns the id only when `PICS[id].quiz`.
   - `picSVG(id)`: returns `'<svg viewBox="0 0 64 64" aria-hidden="true">' + PICS[id].svg + '</svg>'`.
   - `wordPic(id, size, cls)`: returns `h('span', { class: 'pic' + (cls ? ' ' + cls : ''), style: '--pic:' + size + 'px', 'aria-hidden': 'true', html: picSVG(id) })`.
6. **Live packs can name a picture.**
   - In `L()` (`js/core/content.js:21`), read an optional 4th vocab field: `([t, e, g, p]) => ({ …, p: p || null })`.
   - In pack validation (around `content.js:200-216`), keep `p` only if it's a string of 40 characters or fewer. Unknown ids just draw nothing.
   - Document this in the pack format in `docs/ARCHITECTURE.md`.
7. **`tools.js check`:**
   - Every `PICS` entry:
     - parses as SVG in jsdom
     - uses only `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`, `g`
     - uses only the attributes `d`, `cx`, `cy`, `r`, `rx`, `ry`, `x`, `y`, `width`, `height`, `x1`, `y1`, `x2`, `y2`, `points`, `class`, `transform`, `opacity`, `fill-rule`
     - uses only `pk-*` classes from the palette
     - has no hex color, `style`, `id`, `text`, `use` or `image`
     - has every number between -2 and 66
     - is at most 1,600 characters long
   - `pics.js` is at most 900 KB.
   - Every drawn id has a brief.
   - Every `PIC_WORDS` key is a real main text in that language.
   - No two words in one lesson share a picture.
   - It prints a coverage table (language × level: pictured / quizzable / no picture by decision / undecided).
8. **`tools.js shots <batch|id,id…> --out <dir>`** (Playwright: `NODE_PATH="$(npm root -g)"`, set up like `dev/icons.js`):
   - Loads `styleguide.html` over `file://` and blocks web requests.
   - Renders contact sheets of 20 pictures per PNG. Each picture appears at 44 px and 112 px, in light and dark, labeled with its id, words and brief.
   - Write the PNGs to the scratchpad and inspect them with Read.
9. **`design/pictures/index.html`** is the library review page (it grows out of the board).
   - Filters by language, level, batch and kind. Each picture is shown with its words and brief, with a light/dark toggle and Comment buttons.
   - It loads the app scripts it needs through `../../` paths. Publish it as its own private artifact, and put every file it loads in `files` at its `js/…`, `content/…` or `styles/…` path.
   - Record the link in `design/pictures/README.md`.

## Phase 3: First batch → STOP B

Draw `a-food` and `a-home` (about 40 pictures) using the **batch procedure**, republish the review page, and **STOP B**: "Does the style hold up at scale?" Fold Matt's notes into the rule card before continuing.

**Batch procedure** (every batch from here on):
1. Draw each picture in the batch into `PICS`, following its brief, the rule card and the Drawing rules.
2. Run `node design/pictures/tools.js words && node design/pictures/tools.js check` until it ends with `ok`.
3. Run `NODE_PATH="$(npm root -g)" node design/pictures/tools.js shots <batch> --out <scratchpad>`, then Read every PNG.
4. Redraw any picture that:
   - is unclear at 44 px
   - spills off the grid
   - doesn't match its brief or the samples
   - could be mistaken for another picture at the same level (if so, also set `quiz: 0`)
5. Run `npm test` until it ends with `FAIL 0`.
6. Commit `Pictures: <batch> (<n>)`.

## Phase 4: Lessons (cards and picture questions) → Release 1

Release 1 ships with all the A1–A2 batches done.

1. **New-word cards** (`js/ui/runner.js:339`).
   - In each `.wl-row`, put `wordPic(id, 44, 'wl-pic')` before the text when `picFor(v, lang)` returns an id. A one-word card uses 88 px.
   - If any row on the card has a picture, rows without one keep an empty 44 px slot so the rows stay aligned.
   - Style it in `styles/components.css` (`.teach-words .wl-row`).
2. **Config** (`js/config.js`, next to `HINTS`):
   ```js
   /* picture questions: the kind by level, and how many a lesson asks (word pictures: js/core/pics.js) */
   const PIC_EX = { A1: 'pic-pick', A2: 'pic-pick', B1: 'pic-name', B2: 'pic-name', C1: 'pic-type', C2: 'pic-type', perLesson: 2 };
   ```
3. **Engine** (`js/core/engine.js`):
   - **`makeEx` (line 182)** gets three new types.
     - **`pic-pick`** (hear and read the word, tap its picture):
       - `ex.correct = item.t`
       - `ex.options = shuffle([item.t, ...picDistractors(item, lesson, 3)])`
       - `ex.pics = { [option]: pictureId }`
     - **`pic-name`** (see the picture, choose the word): the same options and `pics`.
     - **`pic-type`** (see the picture, type the word): `ex.accepted = [item.t, ...item.alt]`, `ex.ansLang = lang`, `ex.pic = id`.
     - **Fallbacks:** if `picQuiz` is null or there are fewer than 3 distractors, return `makeEx('mc-t2e' | 'mc-e2t' | 'type-e2t', …)` respectively.
   - **New `picDistractors(item, lesson, n)`:** modeled on `pickDistractors` (line 142), walking `vocabPools(lesson)`.
     - Only words with a quizzable picture.
     - Picture ids distinct from the item's and from each other.
     - The same English-overlap and same-text exclusions that `pickDistractors` uses.
   - **`buildLesson` (line 236):** in `g.forEach((i, k) => V(recognise[k % 3], i) …)`, use `PIC_EX[lesson.level]` instead for a word with `picQuiz`, while fewer than `PIC_EX.perLesson` are used, at most one per group. The question stays right after its word's card, so "never asks a word before teaching it" still holds.
   - **`evaluate` (line 437):** `case 'mc-e2t': case 'pic-pick': case 'pic-name':` share the `mc-e2t` branch. `pic-type` falls through to `default`. Extend the article check (`ex.type === 'type-e2t'`) to `pic-type`.
4. **Runner** (`js/ui/runner.js`):
   - **`RENDER['pic-pick']`:**
     - Label: `qLabel('Tap the picture')`.
     - Prompt: `targetPrompt(ex.item, ex.lang, true, ex)`.
     - Options: `options(ex.options, …, o => wordPic(ex.pics[o], 112))` in a 2×2 grid (`.opts.pics`). Each button gets `aria-label` set to that word's English meaning.
   - **`RENDER['pic-name']`:**
     - Label: `qLabel('What is this in ' + LANGS[lang].name + '?')`.
     - Picture: `wordPic(id, 128)`.
     - Options: word options as in `mc-e2t` (line 365).
   - **`RENDER['pic-type']`:**
     - Label: `qLabel('Write what you see in ' + name)`.
     - Picture: `wordPic(id, 128)`.
     - The rest is as in `type-e2t` (line 374): `answerBox`, `charBar`, the article hint and `hintLink`.
   - **`feedbackAnswer` (line 150):** add `pic-name` and `pic-type` to the `target` list.
   - **Line 195:** add `pic-pick` to the list so the word and its meaning show after a right answer.
5. **Tests** (`dev/test.js`):
   - The answer switch (line ~187): add `case 'pic-type'` beside `type-e2t`, and to the variants loop. `pic-pick` and `pic-name` are already covered by the generic option checks.
   - New checks:
     - `tools.js` mapping integrity (require it).
     - Each lesson has at most `perLesson` picture questions, and each comes after its word's card.
     - Option picture ids are distinct, and the right option's picture is the item's.
     - A1, B1 and C1 lessons get `pic-pick`, `pic-name` and `pic-type` respectively, when they have enough quizzable pictures.
   - UI checks:
     - The first words card shows `.wl-row .pic svg` for a pictured word.
     - A `pic-pick` question renders 4 picture tiles, and grades right and wrong.
     - Coverage floors for A1–A2 (set to the shipped numbers, rounded down).
6. **Release 1:** bump `APP_VERSION` to the next minor version and add a `RELEASES` entry, e.g. "Pictures for new words: new words now come with a picture, and lessons ask you to match a few." Then ask "ready to ship?" and ship per `CLAUDE.md`.

## Phase 5: B and C pictures → Releases 2 and 3

Draw the `b-*` batches, then the `c-*` batches, using the batch procedure. After each band:
- Raise the coverage floors in `dev/test.js`.
- Bump the version and add `RELEASES` copy.
- Republish the review page, ask "ready to ship?", then ship.

Abstract B and C words get a picture only when a clear visual metaphor exists, and those are mostly `quiz: 0`: shown on the card, never asked.

## Phase 6: Cast and story scenes from Recraft -> its own release

Matt generates the SVGs in Recraft from the prompts in `design/pictures/recraft/PROMPTS.md` (`node design/pictures/recraft/prompts.js` rebuilds them from `content/cast.js` and the stories; prompts stay under 950 bytes, plain ASCII). He uploads them to `design/pictures/recraft/incoming/` (cast as `<id>.svg`, scenes as `<story-id>.svg`) or attaches them in chat. The code below waits for the files; none of it needs the style to be re-decided.

**What the files are:** one full-length figure per cast member (18, tall canvas, transparent background, no white border or shadow) and one people-free scene per story (27, widest canvas, with the lower middle left open). The round portraits are cropped from the full figure, so there is one source of truth per person. The app puts the cast in front of the scene, so a character looks the same in every story.

1. **`tools.js svg <dir>` (ingest).** For each SVG in `incoming/`:
   - Refuse it if it has `<script>`, `<foreignObject>`, `<image>`, an `on*` attribute, a `javascript:` URL, or any `href`/`url(...)` that is not `#id` or `data:` (it is untrusted input).
   - Strip a full-canvas background rect from cast files (a rect covering the whole viewBox with a white or near-white fill).
   - Optimize with svgo (`npx svgo@3`, `removeViewBox` off, 1-decimal precision) and write the result to `media/cast/<id>.svg` or `media/scenes/<story-id>.svg`.
   - Print a table: file, bytes before and after, element count, viewBox and shape (cast about 1:2, scenes about 2:1) and warn above the budget (cast 150 KB, scenes 300 KB, 8 MB in all).
   - Run it from `node design/pictures/tools.js svg design/pictures/recraft/incoming`; keep the originals in `incoming/`.
2. **Cast in the app.**
   - `content/cast.js`: each person gets `img: 'media/cast/<id>.svg'` and `face: [x, y, w, h]`, the square of the figure's viewBox that holds the head and shoulders. Find `face` per person by rendering the figure and looking (a `tools.js shots` contact sheet with the crop drawn on it). Keep `look` (it still gives the portrait background color and a fallback).
   - `avatar()` and `avatarSVG()` (`js/core/art.js`): when the person has `img`, draw `<svg viewBox="face"><image href="img" width="W" height="H"/></svg>` in the same `.cast-av` circle; on error or while loading, draw the old portrait from `look`. Friends, Talk and story bubbles all go through `avatar()`, so they change together.
   - New `castFig(id, height)` for the full figure, with the sticker border as one CSS rule (stacked `drop-shadow()` from `--pic-*` tokens in `styles/art.css`).
3. **Scenes in the app.**
   - `content/story-art.js` (after the stories in `index.html`): `STORY_ART = { 'de-s1': { floor: .72, who: [['lena', .62, 'l'], ['jonas', .28, 'r']] }, ... }`. Each entry in `who` is `[castId, x as a share of the width, which way it faces]`; a figure that faces the other way is mirrored. Read each story first: put every speaker in (up to three, most lines first), facing each other, none covering the story's key props.
   - `storyArt(st, cls)` (replaces `sceneArt` at `js/ui/stories.js:19` and `:43`): a `.scene` box with a fixed 320:140 shape; the scene `<img>` fills it (`object-fit: cover`), figures stand with their feet on `floor` at about 46% of the box height. If a story has no `STORY_ART` entry or its file fails to load, fall back to today's `sceneArt()` drawing. Keep every `SCENES` key: live packs name them (`content.js:216` checks against them).
   - Stories keep working offline-first: the images load on demand and the old drawings stand in until then.
4. **Web version and publishing.** Check that `dev/web.js` copies `media/cast` and `media/scenes` into `dist/` and that `vercel.json`'s Content-Security-Policy allows `img-src 'self'` (an `<image href>` inside an inline `<svg>` is an image load too). `node dev/files.js` already lists `media/`. SVG is a served file type, so the artifact publish takes it.
5. **Tests (`dev/test.js`).** Every `STORY_ART` id is a real story; every named person is in that story and has a file in `media/cast/`; every scene file exists and is under budget; no cast or scene SVG has a forbidden element or an external reference; a pack story with an unknown scene still renders; `avatar()` falls back when the image is missing.
6. **Review and release.** Add "Cast" (every figure and its crop) and "Story scenes" (all 27 composed) sections to `design/pictures/index.html`, republish, ask "ready to ship?", then release with `RELEASES` copy such as "Every story now has its own scene, with the people who are in it."

## Phase 7: Docs (with Release 1; extended in Phase 6)

- **`docs/ARCHITECTURE.md`:**
  - Table rows for `js/core/pics.js`, `content/pictures.js`, `js/core/scenes.js`, `content/story-art.js` and `design/pictures/`.
  - A "Word pictures" section: how a word gets a picture, `quiz`, the picture questions by level, the batch procedure and the commands.
  - A "Story scenes" section: settings, slots, figures, `STORY_ART`, and the pack fallback.
  - One line in "How a lesson teaches" about picture questions.
  - The optional 4th vocab field in the pack format.
- **`CLAUDE.md`, "Change things once":**
  - Word pictures are `PICS` in `js/core/pics.js`, briefed in `design/pictures/briefs.json`.
  - `content/pictures.js` is generated by `tools.js words`.
  - Scenes and cast figures live in `js/core/scenes.js` and `content/story-art.js`.
  - Colors are `--pic-*` tokens.
  - Update the sentence "The cast and the illustrations are pure SVG functions in js/core/art.js".
  - Add `node design/pictures/tools.js check` to Commands.
- **`styleguide.html`:** a "Word pictures" section (palette and samples) and a "Cast figures" section.

## Drawing rules (whatever the style)

- **Grid:** `viewBox 0 0 64 64`. Keep the subject inside 6–58 and centered, seen from its most recognizable side. Keep scale consistent within a theme (a fruit is about 40 units across).
- **Color:** only `pk-*` classes. Never a hex value or `fill=`. No gradients, filters, text, `use` or ids.
- **No letters or digits:** a picture must never spell its word. Numbers 1–10 are dots or fingers; 11 and up get no picture.
- **Nouns:** the object alone. People nouns (jobs) get the neutral figure with one telling prop, in the word's gender (*die Ärztin* is a woman). Family roles are `quiz: 0`.
- **Verbs:** the neutral figure (`pk-figure`: round head, two dot eyes, no skin tone or hair) doing the action, with one prop. Motion lines are fine.
- **Adjectives:** comparisons show two of the same thing, the target in color and the other in `pk-shade` (big, old, full). Feelings are shown on the figure's face. Colors are a paint blob.
- **Places and countries:** places get their telling feature (a station is platform, train front and clock). Countries get their flag, in a waving shape.
- **Cultural items** get their own picture (Brezel, taco, cornetto).
- **One picture per meaning:** shared across languages, and synonyms share it.
- **`quiz: 1`** only if someone who knows the word would pick this picture over every other picture at that level without hesitating. Otherwise `quiz: 0`: shown on the card, never asked.
- **No picture:** function words, pronouns, question words, days, months, times of day, discourse markers, and anything that would need text to be understood.
- **File size:** 1,600 characters or fewer per picture. Round to 1 decimal and prefer one path per color.

## Verification

- `node design/pictures/tools.js check` ends with `ok`.
- `npm test` ends with `FAIL 0`.
- `node design/rig/check.js` ends with `ok`.
- **In the app** (`npm run preview`, then `http://127.0.0.1:8765/_preview.html`), using Playwright screenshots at 412×915 (Chrome on Android first). Read the screenshots and check:
  - An A1 lesson: the new-word card shows pictures and a pick-the-picture question appears.
  - A B1 lesson shows `pic-name`, and a C1 lesson shows `pic-type`.
  - The dark theme works.
  - The Stories tab shows the scenes with their cast, both on the cards and in the story header.
- Ask Matt to check one lesson and one story on an iPhone, since Safari can't be tested here.
- Each review page is republished, and Matt says go before each release.

## Not in this plan

Pictures in the tap-a-word popover, in review sessions and in the Words sheet (each is a small later change using `wordPic()`), and animating the cast in scenes.
