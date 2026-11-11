# Easier to read: a contrast check for every color pair, gold text and field edges fixed

- **Cycle:** set when promoted (polish program Q4, `flow/POLISH.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-q4-easier-to-read.md`, set Release, Base and `approved`)
- **Release:** the next free minor when promoted (a patch if only WP1 ships)
- **Base:** `main` at promotion time (nothing below depends on line numbers)
- **Proposals built:** none
- **Roadmap items:** new R-48, R-49
- **Needs:** nothing. If Q2 has shipped, `--streak-bg` and `--streak-text` exist and are checked too; if not, WP1 leaves that pair out.

## Why this, why now

The Selva palette is good, and almost all of it passes the usual contrast bars comfortably in both themes (measured from the tokens on 11 Nov, `flow/POLISH.md`). But nothing checks it, so a new token or a new pairing can slip under without anyone noticing, and three spots are under today, all in the light theme:
- **Gold used as text** is 3.25:1 on white and 2.99:1 on the page background (small text needs 4.5): the gold finish stamp's lettering and the first-place rank in the league.
- **The edge of a text field** is 1.33:1 against the card it sits on (a control's edge needs 3).
- **White on the German green button** is 4.38:1, a hair under 4.5. Fixing it means changing `--de`, an existing Selva token, so it is Matt's call (`flow/POLISH.md`, "Matt's calls", 1). This plan records it as a known exception and does not change it.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | A dev tool and tests; no app file changes | — |
| WP2 | Green | Accessibility polish with **new** tokens only; no existing token's value changes (POLICY "adding a new token is fine; changing an existing one is not") | — |

If Matt has approved call 1 (a proposal with status `approved` and no `decidedBy`, named in the promoted plan), the orchestrator adds one step to WP2: set `--de:#1D8548` in the light `:root` block only (the guard's STOP for that line is then the one the approved proposal covers), and delete the `--de-ink` on `--de` entry from `KNOWN` in `dev/contrast.js`. Without that approval, leave `--de` alone.

## Work packages

They share `dev/test.js` and `dev/contrast.js`, so they run **one after another**: WP1, then WP2.

### WP1 — A contrast check

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** new `dev/contrast.js`; `dev/test.js` (one block); `package.json` (one script line: `"contrast": "node dev/contrast.js"`)
- **Reads first:** `styles/tokens.css` (three blocks: `:root{…}`, the `@media (prefers-color-scheme: dark)` block and `:root[data-theme="dark"]{…}`); `dev/files.js` (the model for a small dev script; `dev/contrast.js` must not be in the published file list)
- **Must not touch:** `styles/tokens.css`; any app file.

**Spec.** `dev/contrast.js`, about 90 lines, no dependencies:
- `themes()` reads `styles/tokens.css` and returns `{ light, dark, darkMedia }`, each a map of token name to value: `light` from the first `:root{…}` block; `dark` is `light` overlaid with the declarations in `:root[data-theme="dark"]{…}`; `darkMedia` is `light` overlaid with the declarations inside `:root:not([data-theme="light"]){…}`. Parse declarations with `/(--[a-z0-9-]+)\s*:\s*([^;]+);/g`. Resolve `var(--x)` one level deep.
- `ratio(fg, bg)` is the WCAG 2 contrast ratio of two `#RRGGBB` colors (relative luminance with the 0.03928 knee), rounded to two decimals. A value that isn't `#RRGGBB` returns `null` and the pair is reported as skipped.
- `PAIRS` is this list of `[foreground, background, minimum, what it is]`:
  ```js
  const PAIRS = [
    ['--ink', '--bg', 4.5, 'body text on the page'], ['--ink', '--surface', 4.5, 'body text on a card'],
    ['--muted', '--bg', 4.5, 'secondary text on the page'], ['--muted', '--surface', 4.5, 'secondary text on a card'], ['--muted', '--surface-2', 4.5, 'secondary text on a flat card'],
    ['--de-ink', '--de', 4.5, 'German button text'], ['--es-ink', '--es', 4.5, 'Spanish button text'], ['--it-ink', '--it', 4.5, 'Italian button text'],
    ['--de-text', '--de-soft', 4.5, 'German text on its tint'], ['--es-text', '--es-soft', 4.5, 'Spanish text on its tint'], ['--it-text', '--it-soft', 4.5, 'Italian text on its tint'],
    ['--de-text', '--bg', 4.5, 'German link on the page'], ['--es-text', '--bg', 4.5, 'Spanish link on the page'], ['--it-text', '--bg', 4.5, 'Italian link on the page'],
    ['--de-text', '--surface', 4.5, 'German link on a card'], ['--es-text', '--surface', 4.5, 'Spanish link on a card'], ['--it-text', '--surface', 4.5, 'Italian link on a card'],
    ['--ok', '--ok-bg', 4.5, 'right-answer text'], ['--bad', '--bad-bg', 4.5, 'wrong-answer text'], ['--warn', '--warn-bg', 4.5, 'note text'],
    ['--surface', '--ok', 4.5, 'text on the right-answer button'], ['--surface', '--bad', 4.5, 'text on the wrong-answer button'],
    ['--der', '--surface', 4.5, 'der nouns on a card'], ['--die', '--surface', 4.5, 'die nouns on a card'], ['--das', '--surface', 4.5, 'das nouns on a card'], ['--pl', '--surface', 4.5, 'plural nouns on a card'],
    ['--der', '--bg', 4.5, 'der nouns on the page'], ['--die', '--bg', 4.5, 'die nouns on the page'], ['--das', '--bg', 4.5, 'das nouns on the page'], ['--pl', '--bg', 4.5, 'plural nouns on the page'],
    ['--de', '--bg', 3, 'German accent shapes'], ['--it', '--bg', 3, 'Italian accent shapes'],
    ['--streak-text', '--streak-bg', 4.5, 'the streak tile']
  ];
  ```
  A pair whose token doesn't exist in a theme is skipped, not failed (so `--streak-*` is skipped until Q2 has shipped).
- `KNOWN` lists the accepted exceptions as `'<theme> <fg> <bg>': '<why>'`. It starts with one entry: `'light --de-ink --de': 'White on the German green is 4.38. Changing --de is Matt’s call (flow/POLISH.md, call 1).'`. (`--es` on `--bg` is deliberately not in `PAIRS`: mango is used as a fill with dark ink on it, never as a thin shape on the page.)
- `report()` returns `{ rows, failures, drift }`: a row per pair per theme (`light` and `dark`) with its ratio and `pass`, `known` or `fail`; `failures` are the rows under their minimum that aren't in `KNOWN`; `drift` lists every token whose value differs between `dark` and `darkMedia` (the two dark blocks must say the same thing).
- Run directly (`node dev/contrast.js`), it prints the table, then `ok` or the failures, and exits 1 if there are failures or drift. `module.exports = { themes, ratio, report, PAIRS, KNOWN }`.

**Steps.**
1. Write `dev/contrast.js`; run it; it must print `ok` (33 pairs × 2 themes, one known, the streak pair skipped or passing).
2. `package.json`: the script line.
3. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`.
4. `npm test`, `node dev/flow.js guard`, `npm run files` (confirm `dev/contrast.js` is not listed), commit.

**Acceptance criteria:**
- [ ] `node dev/contrast.js` ends with `ok` and exit code 0.
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `contrast: the math is right`: `ratio('#000000', '#FFFFFF') === 21`, `ratio('#FFFFFF', '#FFFFFF') === 1`, `ratio('#15301F', '#F3F7EC')` is between 13 and 13.3.
  - `contrast: every pair passes or is a known exception`: `report().failures` is empty; on failure the message lists each failing pair with its theme, ratio and minimum.
  - `contrast: the two dark blocks agree`: `report().drift` is empty; on failure the message lists the tokens.
  - `contrast: the German button is the only known exception`: `Object.keys(KNOWN).length === 1` (update this number, with a reason in the commit message, only when Matt accepts or settles an exception).
- [ ] Temporarily changing `--muted` in the light block to `#9BB5A0` makes `node dev/contrast.js` exit 1 naming `--muted` (then undo it; `git diff styles/tokens.css` is empty).
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a pair in `PAIRS` fails today other than the one in `KNOWN` (the numbers of 11 Nov say none does; if the tokens have changed since, list the failures and don't add them to `KNOWN` yourself).

### WP2 — Gold text and field edges

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `styles/tokens.css` (one new line in each of the three theme blocks; no existing line edited), `styles/components.css` (`.stamp.gold`), `styles/features.css` (`.fr-league li.first .fr-rank`), `styles/base.css` (`.input`, the toggle's off state), `dev/contrast.js` (four new `PAIRS` rows), `dev/test.js` (one block)
- **Reads first:** the three theme blocks in `styles/tokens.css`; `.stamp`, `.stamp.gold` and `.chest-xp` in `styles/components.css`; `.fr-league li.first .fr-rank` in `styles/features.css`; `.input`, `.input:focus`, `.toggle span` in `styles/base.css`
- **Must not touch:** the value of `--gold`, `--hair` or any other existing token; `.chest-xp` (32px bold gold is large text and passes at 3:1); the gold stamp's border, medals and other gold shapes; option tiles and cards (their edges are decoration, not a control's only boundary).

**Spec.**
- New tokens, each pair as **a new line of its own** directly after the line that holds `--gold:` in that block (never edit an existing token line: the guard reads any changed `--token:` line as a change to the Selva look and stops the release):
  - light (`:root`): `--gold-text:#7A5A00; --hair-strong:#7F9685;` (gold text 6.38:1 on white and 5.87 on the page; the edge 3.18:1 on white)
  - both dark blocks: `--gold-text:#E8B84A; --hair-strong:#668A71;` (gold text is the dark theme's gold, 8.68:1; the edge 4.14:1 on a card)
  
  In the light block `--gold` has its own line (`--gold:#B8860B;`); in the dark blocks it sits at the end of the `--der…` line. In all three, the new line goes directly below.
- `.stamp.gold{color:var(--gold);border-color:var(--gold)}` becomes `.stamp.gold{color:var(--gold-text);border-color:var(--gold)}`.
- `.fr-league li.first .fr-rank{color:var(--gold)}` becomes `…{color:var(--gold-text)}`.
- `.input`: `border:2px solid var(--hair)` becomes `border:2px solid var(--hair-strong)`. The focus rule stays.
- The toggle's off state: in `.toggle span{…}`, `background:var(--hair)` becomes `background:var(--hair-strong)`. The on state stays `--line`.
- In `dev/contrast.js`, add to `PAIRS`: `['--gold-text', '--surface', 4.5, 'gold lettering on a card']`, `['--gold-text', '--bg', 4.5, 'gold lettering on the page']`, `['--hair-strong', '--surface', 3, 'the edge of a field on a card']`, `['--surface', '--hair-strong', 3, 'the switch knob on its track when off']`.

**Steps.**
1. Tokens, the four rules, the four pairs.
2. Tests: one block after WP1's.
3. `node dev/contrast.js`, `npm test`, `node dev/flow.js guard`, `node dev/film.js --check`, screenshots, commit.

**Acceptance criteria:**
- [ ] `node dev/contrast.js` ends with `ok`, and its table shows the four new pairs passing in both themes.
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `colors: gold lettering and field edges have their own tokens`: `styles/tokens.css` defines `--gold-text` and `--hair-strong` three times each, and `--gold:#B8860B` (light) and `--hair:#D6E3CF` (light) are unchanged.
  - `colors: the gold stamp's lettering is readable`: the `.stamp.gold` rule contains `color:var(--gold-text)` and `border-color:var(--gold)`.
  - `colors: fields have a visible edge`: the `.input{` rule contains `border:2px solid var(--hair-strong)`.
- [ ] Screens, light and dark, 412px: `node dev/flow.js shots --steps "tab:Review;wait:500;shot:search"` (the search field has a clearly visible edge and still looks soft, not black); `--steps "tab:Me;wait:400;scroll:2600;shot:sound"` (off switches are visible against the card; on switches unchanged); a level-complete finish screen with the gold stamp: `--steps "js:startLesson(coreOrder(S.settings.lang)[0].id);wait:900;click:Start lesson;wait:900;js:showComplete({lang:S.settings.lang,top:'A1 complete',title:'Beginner',gold:true,xp:10,acc:1,h1:'Level A1 complete.',third:[5,'best run in a row'],onDone:()=>endRun()});wait:2600;shot:gold"` (the stamp's lettering is a deeper gold in light, unchanged in dark).
- [ ] `node dev/film.js --check` reports no video out of date.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the film check reports a video out of date, or the stronger field edge looks harsh next to the cards in the screenshots (then report with the screenshot instead of picking another color).

## Integration

- [ ] `dev/test.js`: the two blocks sit together before `// placement: all right goes to the top`.
- [ ] `CLAUDE.md`, "Commands": add `node dev/contrast.js   # contrast of every text and control color pair, light and dark (must end with ok)`.
- [ ] `docs/ARCHITECTURE.md`: a row in "Where things live" for `dev/contrast.js` ("Checks the contrast of the token pairs in `PAIRS`, both themes, and that the two dark blocks agree; run by `npm test` | add a color used as text or as a control's edge"), and in "Conventions": "A color used for text or for a control's edge gets a row in `PAIRS` in `dev/contrast.js`. Gold lettering uses `--gold-text`; a field's edge uses `--hair-strong`."
- [ ] `.claude/agents/parlance-builder.md` is **not** edited (the automation is Matt's); the test failure message tells a builder what to do.
- [ ] `styleguide.html`: if it lists color tokens from a hand-written list, add the new ones in the same form; if it reads them from `tokens.css`, leave it.
- [ ] No pictures, no voices.

## Release notes

- **Title:** Easier to read
- **Notes:**
  - Gold lettering, search boxes and switches are easier to see in the light theme.
  - Behind the scenes, every color pairing in Parlance is now checked for readability, in light and dark.

## Verification plan

- Commands: `node dev/contrast.js` (ok), `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/film.js --check`.
- Screens: the three step strings in WP2, light and dark, 412px and 360px; `node dev/flow.js shots` (every tab) to confirm nothing else moved.
- Spot checks for the reviewer: read `git diff styles/tokens.css` and confirm every changed line only gained tokens; look at the search field and an off switch at full size in both themes.
- **Phone check for Matt (Android, one minute):** in the light theme outdoors or at low brightness, read the search box on Review and the switches in Me → Sound.

## Risks and rollback

- A stronger field edge is a visible change. It is one new token, so softening it is a one-value edit that the contrast check will accept down to 3:1.
- The check could block a future release over a pair it shouldn't cover. `KNOWN` exists for that, and only with a reason.
- Undo: `git revert` and a patch release. Nothing saved changes.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
