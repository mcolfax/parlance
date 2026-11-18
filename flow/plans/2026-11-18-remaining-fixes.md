# Remaining fixes: wording corrections with their cards carried over, test tools, two unused colours

- **Cycle:** 2026-11-18-3
- **Status:** shipped (4.54.0)
- **Release:** 4.54.0
- **Base:** `main` at b1f03a4 (4.53.2)
- **Proposals built:** Matt approved the whole list in chat on 2026-11-18 ("Proceed with remaining fixes"), including retiring `--streak-bg`/`--streak-text` (Red: removing tokens), recorded as a web proposal at ship.
- **Roadmap items:** R-65, R-66, R-67 (text parts; the to-waste redraw shipped in 4.51.0), R-68, R-69, R-70, R-71, R-64 (the tokens)

## Gate

| Package | Zone | Why | Extra checks |
|---|---|---|---|
| WP1 content | Amber | Fixes to existing content; a few key texts change, each carried by an alias pack (POLICY "Changing existing content") | Every changed key is in `flow/shots/2026-11-18-3/aliases.json` and guard `--allow-orphans` passes; alias packs written to both homes before publishing |
| WP2 tools | Green / Red (approved) | Test tools and a device-local cleanup are Green; removing two tokens is Red, approved by Matt | Guard STOP only for the two removed tokens |

## WP1 — Content (parlance-content, sonnet, worktree)

- **R-66** es-43-2, es-43-3 (`content/es-2-advanced.js` or wherever they live): *rueda de prensa* → *conferencia de prensa*, *portavoz* → *vocero/vocera* (Latin American), in vocab, sentences, blanks and tips. Units 43–44 blanks: replace weak distractors with plausibly-wrong ones (es `subirá|subiendo|subido`, it `Dove|Chi`, `dimesso`). it-43-4: blanks 1 and 2 use the same sentence; give blank 2 a different sentence on the same idea.
- **R-67** it-16-1 tip: *arancione* and *marrone* do change in the plural (*arancioni*, *marroni*); keep "blu, rosa, viola don't change". es-30-2 tip: *decir* is irregular (yo digo, and e→i: dices, dice…), not "regular except yo". de-16-3: *das Grad* → *der Grad* (gender m) in vocab and tip.
- **R-68** it-45-2: "Prova a restare pacato" → "Prova a restare calmo" (if *calmo* isn't taught, gloss it).
- **R-69** es-1-2: make sentence 3 `¿Y tú, cómo te llamas?` (with its English), so it no longer repeats sentence 1's set; vocab `usted|tú` → `usted` meaning `you (formal)`. es-24-1 tip: the example after "use the masculine" becomes a masculine one (`**Mi gato**` or `**el gato**`), keeping `TIP_PLACES` checks passing.
- Every key text that changes (text before the first `|` of a vocab item or sentence): record `{ "<old key>": "<new key>" }` per language in `flow/shots/2026-11-18-3/aliases.json` (`{ de: {…}, es: {…}, it: {…} }`), keys computed with `itemKey()` before and after. Also write the flat list of old keys to `flow/shots/2026-11-18-3/orphans.json` for the guard.

## WP2 — Tools, cleanup, tokens (parlance-builder, sonnet, worktree)

- **R-65** Clear `parlance.genmiss` on sign-out together with the other device-local keys (find where sign-out clears them); test.
- **R-70** The intro-film check "scrubbing back brings the caption back" waits for `.film-cap` (up to ~1 s) instead of reading it at once.
- **R-71** `dev/offline.js` checks the language files in `LANG_FILES` against the worker's list as well as index.html's scripts; `dev/tips.js` and `dev/flow.js` wait up to 500 tries for `__parlance`. Screenshots of the boot-fail card and the "Couldn’t load Spanish" sheet at 412px light and dark into `flow/shots/2026-11-18-3/`; if `.boot-fail` looks unstyled, give it the card's padding and centre its button using tokens only.
- **R-64** Remove `--streak-bg` and `--streak-text` from `styles/tokens.css` (all three places), their `dev/contrast.js` pair, and the test that counts them (keep the rest of that test: the streak tile is a plain card).

## Release notes

- **Title:** Little fixes
- **Notes:**
  - Clearer wording in a few lessons: Latin American terms for press conferences and spokespeople, *der Grad* in German, and better explanations of Italian color plurals and Spanish *decir*.
  - Some fill-in-the-blank questions have more convincing wrong answers.

## Outcome

- **Shipped:** 4.54.0, `5779976` | **Dropped:** none | **Escalated:** none (token removal approved by Matt, web proposals/pstreak540)
