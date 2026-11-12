# A better first look: small things fixed, a loading screen with shape, Me easier to get around

- **Cycle:** 2026-11-12-3 (polish program Q2, `flow/POLISH.md`)
- **Status:** building
- **Release:** 4.37.0
- **Base:** `main` at 71f5e1e (4.36.0)
- **Proposals built:** none
- **Roadmap items:** R-38, R-39, new R-44, R-45, R-46
- **Needs:** nothing. If Q1 has shipped, new transitions use its duration tokens (`npm test` says so); if it hasn't, write `var(--dur-fast)` and `var(--dur)`, which exist either way.

## Why this, why now

The first minute decides whether an app feels cared for, and four things in Parlance's first minute don't (audit of 11 Nov, `flow/POLISH.md`):
- The first thing anyone sees is the text "Loading Parlance…" while the scripts load (1.7 s on a mid-range Android, R-14).
- A new learner's first screen shows a red "0": the streak tile is drawn in the error colors.
- Review prints the word "null" under the word list whenever it has fewer than 150 words, which is every new learner.
- Me is 8,500px long at phone width; Sound, Practice and Backup sit below a calendar and 27 badges.

Two small leftovers from the 4.33.0 review (R-38, R-39) ride along.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Bugs and UI polish; adds two tokens, changes none (POLICY "Bugs", "UX and UI polish") | — |
| WP2 | Green | Loading state in `index.html` and `styles/base.css`; no script, no outside host | — |
| WP3 | Green | Navigation inside Me; nothing removed or reordered | — |

## Work packages

They share `dev/test.js` and two of them `styles/base.css`, so they run **one after another**: WP1, WP2, WP3.

### WP1 — Small things that look wrong

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `js/ui/review.js` (`fillWords`, `practiceTiles`), `js/ui/runner.js` (`finishRun`: the checkpoint `subo` text only), `styles/tokens.css` (one new line in each of the three theme blocks; no existing line edited), `styles/components.css` (`.stat.streak` and the `.flame` rules), `styles/base.css` (`.linkish`), `dev/test.js` (one block)
- **Reads first:** `fillWords()` and `practiceTiles()` in `js/ui/review.js`; the checkpoint branch of `finishRun()` in `js/ui/runner.js`; `greetBlock()` in `js/ui/learn.js`; the `.stat…` and `.flame` rules in `styles/components.css`; `.linkish` in `styles/base.css`; the three theme blocks in `styles/tokens.css`
- **Must not touch:** any existing token's value; what a streak, a checkpoint or a test-out means.

**Spec.**
- **"null" under the word list.** In `fillWords()`, the last `list.replaceChildren(…, more)` passes `more` even when it is `null`, and the DOM prints it. Change the final argument from `more` to `...(more ? [more] : [])`.
- **The streak tile gets its own colors.** Add to `styles/tokens.css`, as **a new line of its own** directly after the line that holds `--flame:… --sun:…` in each block (never edit an existing token line: the guard reads any changed `--token:` line as a change to the Selva look and stops the release):
  - light (`:root`): `--streak-bg:#FFE8D6; --streak-text:#8A3A0C;` (6.6:1)
  - both dark blocks (the `@media` one and `:root[data-theme="dark"]`): `--streak-bg:#3A1E12; --streak-text:#FFB38A;` (8.8:1)
  
  In `styles/components.css`, `.stat.streak{background:var(--bad-bg);box-shadow:none;color:var(--bad)}` becomes `.stat.streak{background:var(--streak-bg);box-shadow:none;color:var(--streak-text)}`. And `.stat.cold .flame{color:var(--hair)}` becomes `.stat.cold .flame{color:var(--streak-text);opacity:.35}` (a pale flame that still belongs to the tile). Nothing else about the tile changes.
- **R-38.** In `finishRun()`'s checkpoint branch, a learner who already holds a pass and fails a retake is told "You need 80% to test out". When `out` is false the right text is already used; the fault is that `out` is true for a retake of a tested-out unit. Change the failing half of the `out` text to use the normal failed-checkpoint sentence when the earlier result was a pass: in the `subo` expression, replace `'You need ' + Math.round(CHECKPOINT.pass * 100) + '% to test out. Its lessons will get you there, and you can try again any time.'` with `(prev && prev.pass ? 'You need ' + Math.round(CHECKPOINT.pass * 100) + '% to pass. Look back at the unit’s lessons and try again whenever you like.' : 'You need ' + Math.round(CHECKPOINT.pass * 100) + '% to test out. Its lessons will get you there, and you can try again any time.')`.
- **R-39, the tile.** In `practiceTiles()`, the `weak` entry's `sub: 'Your 12 shakiest'` becomes `sub: 'Your ' + Math.min(12, all) + ' shakiest'`.
- **R-39, tap targets.** `.linkish` in `styles/base.css` gains `min-height:44px`. Its padding and font stay.

**Steps.**
1. The five changes above.
2. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`.
3. `npm test`, `node dev/flow.js guard`, `node dev/film.js --check`, screenshots, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `review: no "null" under a short word list`: finish one lesson, open Review; the element the words are listed in contains no text node equal to `null`, and its `textContent` doesn't include `null`.
  - `review: Show more still appears on a long list`: with `UI.wordFilter = 'all'`, the list ends with a button whose text starts `Show more (`.
  - `learn: the streak tile has its own colors`: `styles/tokens.css` defines `--streak-bg` and `--streak-text` three times each; the `.stat.streak` rule in `styles/components.css` contains `var(--streak-bg)` and doesn't contain `--bad`.
  - `checkpoint: a failed retake of a passed unit says "to pass"`: with `S.langs.de.cp[<unit title>] = { pass: true, … }` and `outs` holding that unit, start its checkpoint with test-out, answer everything wrong; the finish screen contains `to pass` and not `to test out`.
  - `review: the weakest tile counts what there is`: with 8 review cards, the Weakest items tile reads `Your 8 shakiest`.
  - `links: .linkish is a full tap target`: the `.linkish{` rule in `styles/base.css` contains `min-height:44px`.
- [ ] `node dev/flow.js shots` (every tab, light and dark, 412px and 360px): on Learn the streak tile is warm orange-brown, not red, and its text is readable in both themes; on Review nothing reads "null".
- [ ] `node dev/film.js --check` reports no video out of date.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the film check says a video is out of date after adding the two tokens.

### WP2 — A loading screen with shape

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `index.html` (the one `<main id="app" …>` line), `styles/base.css` (the `.boot-msg` rule, replaced), `dev/test.js` (one block)
- **Reads first:** `index.html`; `.app`, `.view` and `.boot-msg` in `styles/base.css`; `render()` in `js/ui/shell.js` (it replaces everything inside `#app`, so the skeleton needs no removal code); `dev/web.js` (read only: it wraps `index.html` and must keep working)
- **Must not touch:** the order of scripts and stylesheets in `index.html`; `dev/web.js`; `vercel.json`. No inline `<script>` or `<style>` may be added to `index.html` (the web version's Content-Security-Policy would block it).

**Spec.**
- In `index.html`, `<main id="app" class="app"><p class="boot-msg">Loading Parlance…</p></main>` becomes (one line, no line breaks needed):
  ```html
  <main id="app" class="app"><div class="boot" role="status" aria-label="Loading Parlance"><i class="sk sk-top"></i><i class="sk sk-h1"></i><i class="sk sk-p"></i><div class="sk-row"><i class="sk"></i><i class="sk"></i><i class="sk"></i></div><i class="sk sk-card"></i><i class="sk sk-card short"></i><span class="sr">Loading Parlance…</span></div></main>
  ```
- In `styles/base.css`, replace the `.boot-msg{…}` rule with:
  ```css
  /* the first paint, before the scripts have run: the shape of Learn in soft blocks */
  .boot{display:flex;flex-direction:column;gap:18px;padding-top:4px}
  .sk{display:block;border-radius:var(--r-md);background:var(--hair-2);position:relative;overflow:hidden}
  .sk::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,var(--surface) 50%,transparent 80%);opacity:.55;animation:sheen 1.4s linear infinite}
  .sk-top{height:44px;border-radius:var(--r-pill)}
  .sk-h1{height:38px;width:58%}
  .sk-p{height:18px;width:82%;margin-top:-8px}
  .sk-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .sk-row .sk{height:106px;border-radius:var(--r)}
  .sk-card{height:262px;border-radius:var(--r)}
  .sk-card.short{height:150px}
  ```
  `sheen` is the existing keyframes next to `.btn.busy`. The global reduced-motion rule already stops it. The colors are tokens, so it is right in light and in system dark from the first paint.
- Nothing in JavaScript changes: `render()` replaces the skeleton with the first screen.

**Steps.**
1. `index.html`, `styles/base.css`.
2. `grep -rn "boot-msg\|Loading Parlance" dev js` and update any test that looked for the old text to look for `.boot` (keep what it checked).
3. Tests: one block after WP1's.
4. `npm run web` (the web build still succeeds), `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0 (including the existing check of the web page's inline-script hash), with these new checks:
  - `boot: the page starts with a skeleton, not a sentence`: the raw `index.html` contains `<div class="boot" role="status" aria-label="Loading Parlance">`, six elements with class `sk` or `sk-row`, and no `boot-msg`; it contains no `<script>` without `src` and no `<style`.
  - `boot: the first render replaces the skeleton`: in the loaded app, `#app .boot` is `null` and `#app .view` exists.
  - `boot: the skeleton is styled from tokens`: the `.sk{` rule in `styles/base.css` contains `var(--hair-2)`.
- [ ] A screenshot of the skeleton alone, light and dark, at 412px: write a throwaway page in the scratch folder that loads the four stylesheets and the `<main>` line (no scripts), screenshot it with Playwright with `colorScheme` light and dark, and look: soft blocks in the shape of Learn's top (bar, heading, three tiles, a card), no text, nothing wider than the screen.
- [ ] `npm run web` exits 0 and `dist/index.html` contains `class="boot"`.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the skeleton would need an inline script or style, or `dev/web.js` would have to change.

### WP3 — Me, easier to get around

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP2
- **Owns (may edit):** `js/ui/me.js` (new `meJump`, one call at the end of `viewMe`), `styles/components.css` (new `.me-jump` rules after the last Me rule), `dev/test.js` (one block)
- **Reads first:** `viewMe()` in `js/ui/me.js` (it builds the view `v` by appending `section.card` elements, each with an `h3`); `.chips` and `.chip` in `styles/base.css`; `reduced()` in `js/core/util.js`
- **Must not touch:** the order or content of Me's cards; any setting.

**Spec.**
- New function in `js/ui/me.js`, directly above `viewMe`:
  ```js
  /* a row of chips under the profile that jump to Me's cards; it lists only the cards this learner has */
  const ME_JUMP = [['Badges', 'Badges'], ['Last 7 days', 'This week'], ['Your bird', 'Your bird'], ['Sound', 'Sound'], ['Practice', 'Practice'], ['Your progress is saved', 'Backup']];
  function meJump(v){
    const heads = [...v.querySelectorAll('section h3')];
    const chips = ME_JUMP.map(([title, label]) => { const h3 = heads.find(x => x.textContent.trim() === title); const sec = h3 && h3.closest('section'); return sec ? h('button', { class: 'chip', type: 'button', onclick: () => sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }) }, label) : null; }).filter(Boolean);
    if (chips.length < 3) return;
    const row = h('nav', { class: 'me-jump', 'aria-label': 'Jump to' }, chips);
    const anchor = v.querySelector('.profile'); if (anchor) anchor.after(row); else if (v.firstElementChild) v.firstElementChild.after(row);
  }
  ```
- In `viewMe()`, call `meJump(v);` as the last statement before `return v;` (every `return v` of the function, if it has more than one after the cards are appended).
- CSS, after the last Me rule in `styles/components.css`:
  ```css
  .me-jump{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:-6px -16px;padding:2px 16px}
  .me-jump::-webkit-scrollbar{display:none}
  .me-jump .chip{flex:none}
  .view>section{scroll-margin-top:12px}
  ```
- The row scrolls sideways inside itself; the page must not scroll sideways.

**Steps.**
1. `meJump`, the call, the CSS.
2. Tests: one block after WP2's.
3. `npm test`, `node dev/flow.js guard`, screenshots, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `me: jump chips list the cards that exist`: on Me, `.me-jump` sits directly after `.profile` and has a chip for each of Badges, This week, Your bird, Sound, Practice (and Backup when that card is there), in that order, and none for a card that isn't on the page.
  - `me: a chip scrolls to its card`: with `Element.prototype.scrollIntoView` stubbed to record `this`, tapping the Sound chip records the `section` whose `h3` reads `Sound`.
  - `me: the cards are unchanged`: the list of `h3` texts on Me is the same with and without calling `meJump` (compare against `viewMe()`'s cards before the row is added).
- [ ] `node dev/flow.js shots --steps "tab:Me;wait:500;shot:me-top"` at 412px and `--width 360`, light and dark: the chip row sits under "Your progress", runs off the right edge (it scrolls), and the page itself has no sideways scroll (`document.documentElement.scrollWidth === clientWidth`).
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** Me's cards don't each sit in their own `section` with an `h3` (then the lookup above doesn't fit and the row needs a different anchor).

## Integration

- [ ] `dev/test.js`: the three blocks sit together before `// placement: all right goes to the top`.
- [ ] `docs/ARCHITECTURE.md`: in the `index.html`/boot description or "Conventions", add: "Before the scripts run, `#app` holds a skeleton (`.boot`, `styles/base.css`); the first `render()` replaces it. Keep it free of inline scripts and styles." In "Where things live", the `styles/tokens.css` row needs no change.
- [ ] `flow/ROADMAP.md`: R-38 and R-39 to `done (<version>)`.
- [ ] No pictures, no voices.

## Release notes

- **Title:** A better first look
- **Notes:**
  - Parlance opens with the shape of your Learn screen instead of a loading message.
  - Me has a row of shortcuts at the top: jump straight to Sound, Practice, your badges or your backup.
  - Tidied up: your streak no longer looks like an error on day one, and a stray word under your word list is gone.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/film.js --check`, `npm run web`.
- Screens (412px and 360px, light and dark): `node dev/flow.js shots` (every tab); `--steps "tab:Me;wait:500;shot:me-top"`; the skeleton page from WP2.
- Spot checks for the reviewer: load `http://127.0.0.1:8765/_preview.html` with the network throttled and watch the skeleton hand over to Learn without a jump in the top bar's position; read the streak tile in both themes.
- **Phone check for Matt (Android, two minutes):** close and reopen the Home Screen app and watch the first second; look at the streak tile on Learn in light and dark; tap the Sound and Backup chips on Me.

## Risks and rollback

- The skeleton's block heights are close to Learn's, not exact, so the hand-over can shift by a few pixels; it is one frame and on a fresh load only.
- The streak tile's new colors are new tokens inside the Selva palette (warm, between mango and flame). If Matt prefers the old look, point `.stat.streak` back at `--bad-bg` and `--bad`; the tokens can stay.
- Undo: `git revert` and a patch release. Nothing saved changes.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
