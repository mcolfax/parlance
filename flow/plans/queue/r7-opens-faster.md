# Opens faster: your language first, the others a moment later

- **Cycle:** queued 2026-11-16 (program 2, release R7; `flow/PROGRAM-2.md`)
- **Status:** draft (the orchestrator promotes it: move to `flow/plans/<cycle>-r7-opens-faster.md`, set Base, check it still matches `main`)
- **Release:** 4.53.0 (minor)
- **Base:** `main` at the commit that ships 4.52.0 (`r6-tables-in-the-right-place.md`). It goes last so that `LANG_FILES` lists every content file the earlier releases add (`<lang>-8-more.js`, `<lang>-9-more.js`); if a release after this one adds a content file, it goes in `LANG_FILES`, not `index.html`.
- **Proposals built:** none
- **Roadmap items:** R-36 (from R-14's measurement)

## Why this, why now

Measured on 2026-11-06 (R-14): 76 scripts and 2.8 MB of JavaScript, 1.9 MB of it content; the first screen takes 0.5 s, 1.7 s at 4× CPU slowdown and 2.5 s at 6×. After R3 and R5 each language's lesson and story files are about 0.6 MB, and a learner only needs one language on the first screen. Loading the current language's files first and the other two right after the first screen leaves about 1.2 MB of parsing out of the start. The risk is everything that quietly assumes all three languages are there (badges, the Friends card, the glossary, the dev tools), so this plan lists each of them with its guard.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Amber | Performance (Green), but it touches badges (`checkBadges()`) and when the Friends card is published (`social.js`): POLICY Amber "XP, streaks, quests, badges" and "Friends" | The reviewer confirms: no badge can be awarded from a language that isn't loaded; the card is never published until every language is loaded, and what it shares is unchanged; review cards of a language that isn't loaded yet are never dropped or rewritten except by the existing key migration |
| WP2 | Green | Dev tools, tests, docs and a measurement | — |

## Work packages

WP2 runs after WP1 (same branch, one builder; it needs WP1's `langsAll()`).

### WP1 — Load the learner's language first

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `index.html`, `js/config.js` (a new `LANG_FILES` after `LANGS`), `js/core/content.js` (a new loader section after `assembleCourse()`), `js/main.js`, `js/ui/shell.js` (`render()`, `setLang()`), `js/core/engine.js` (`checkBadges()` only), `js/core/social.js` (`socialPublish()` only), `js/ui/friends.js` (`langLine()` only), `js/ui/onboarding.js` (the lesson count line only), `dev/test.js` (`makeDom()` and one new block)
- **Reads first:** `js/main.js`; `assembleCourse()`, `migrateCardKeys()` in `js/core/content.js`; `cleanLang()`, `loadLocal()`, `touch()` in `js/core/state.js`; `reindex()` in `js/core/text.js`; `loadMascot()` in `js/core/art.js` (the model for loading a script); `checkBadges()`; `socialPublish()`, `buildCard()`; `render()`, `setLang()`, `toast()`, `sheet()` in `js/ui/shell.js`; `makeDom()` in `dev/test.js`
- **Must not touch:** content files, `js/core/state.js`, `MIGRATIONS`, `dev/sw.js`, `dev/web.js`, `vercel.json` (Red)

**Spec.**

*1. The file list* (`js/config.js`, after `LANGS`):
```js
/* each language's lesson and story files, in the order they must run (unit order within a level follows it);
   only the learner's language loads before the first screen (langLoad(), js/core/content.js) */
const LANG_FILES = Object.fromEntries(LANG_IDS.map(l => [l, ['1-basics', '1b-more', '2-advanced', '3-more', '4-a1', '4-a2', '4-b1', '4-b2', '4-c1', '4-c2', '5-more', '6-more', '7-more', '8-more', '9-more'].map(f => 'content/' + l + '-' + f + '.js').concat('content/stories-' + l + '.js')]));
```
The order is exactly today's order in `index.html` (check it against `index.html` before removing the tags; if R3 or R5 didn't ship, leave out the files that don't exist).

*2. `index.html`*: remove the `<script>` tags of every file in `LANG_FILES` (the 48 per-language files). Keep `cast.js`, `cast-art.js`, `story-art.js`, `glossary.js` and `pictures.js` where they are. In their place, add one `<link rel="preload" as="script" href="…">` per removed file, in the same order, so the browser still downloads them early; only running them waits.

*3. The loader* (`js/core/content.js`, a new section after `assembleCourse()`):
```js
/* ----- languages load on demand: the learner's first, the others after the first screen ----- */
const Langs = { ready: new Set(), loads: {}, all: null };
function langReady(lang){ return Langs.ready.has(lang); }
function langsAllReady(){ return LANG_IDS.every(langReady); }
/* a language's files run one after another, in LANG_FILES order (the preload links have already downloaded them, so this adds no
   waiting); a file that fails stops that language until the page reloads, because the files before it have already added their units */
function langLoad(lang){
  if (langReady(lang)) return Promise.resolve();
  if (Langs.loads[lang]) return Langs.loads[lang];
  if (typeof document === 'undefined' || !LANG_FILES[lang]) return Promise.reject(new Error('No language ' + lang));
  const one = src => new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => rej(new Error('Couldn’t load ' + src)); document.head.append(el); });
  return Langs.loads[lang] = LANG_FILES[lang].reduce((p, src) => p.then(() => one(src)), Promise.resolve()).then(() => { Langs.ready.add(lang); langArrived(lang); });
}
function langsAll(){ return Langs.all || (Langs.all = Promise.all(LANG_IDS.map(langLoad))); }
/* a language arrived after the state loaded: rebuild the course and the glossary, and let old card keys of that language migrate */
function langArrived(lang){
  assembleCourse(); Packs.version++; reindex();
  if (typeof S !== 'undefined' && S.langs && S.langs[lang]){
    const before = Object.keys(S.langs[lang].cards).join('\n');
    S.langs[lang] = cleanLang(S.langs[lang]);
    if (Object.keys(S.langs[lang].cards).join('\n') !== before) touch(lang);
  }
}
```
(`cleanLang` and `touch` are defined in later scripts; `langArrived` only runs after they have loaded.)

*4. Boot* (`js/main.js`): the language to load first is the saved one, read without the course:
```js
function bootLang(){ try { const s = JSON.parse(localStorage.getItem(LS_KEY)); const l = s && s.settings && s.settings.lang; return LANG_IDS.includes(l) ? l : LANG_IDS[0]; } catch (e){ return LANG_IDS[0]; } }
```
Then the current top lines (`loadCachedContent(); assembleCourse(); S = loadLocal(); reindex(); applyLang(); …recIndex…; setTimeout(recWarm…)`) move into a function `start()`, which ends by starting the bird wait and `boot()` exactly as today. The script runs `loadCachedContent();` and then `langLoad(bootLang()).then(start, bootFail);`. In `boot()`, after `render();`, add `if (typeof performance !== 'undefined' && performance.mark) performance.mark('parlance-first-render');` and `if (!window.PARLANCE_HOLD_LANGS) requestAnimationFrame(() => setTimeout(() => langsAll().then(afterAllLangs, () => {}), 0));`. `afterAllLangs()`: if the tab is `me` or `friends` and `!busy()`, `render()`; then assign `window.__parlance = { … }` (the object that today is assigned at the end of the file, unchanged; move the assignment here, so dev tools and tests that wait for it see the whole course). `bootFail()` replaces `#app`'s skeleton with `h('div', { class: 'card boot-fail' }, h('p', null, 'Parlance couldn’t load. Check your connection, then try again.'), h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Try again'))`. `PARLANCE_HOLD_LANGS` is a test hook only (nothing sets it in the app).

*5. Screens that need a language* (`js/ui/shell.js`):
- `render()`: first line `if (!langReady(S.settings.lang)){ langLoad(S.settings.lang).then(() => render(), () => langFailed(S.settings.lang)); return; }` (the screen stays as it is meanwhile). This covers a language changed by account sync or a backup restore.
- `setLang(lang)`: first line `if (!langReady(lang)){ toast('Getting ' + LANGS[lang].name + ' ready…'); langLoad(lang).then(() => setLang(lang), () => langFailed(lang)); return; }`.
- New `langFailed(lang)`: `sheet('Couldn’t load ' + LANGS[lang].name, h('p', null, 'Check your connection, then try again.'), [{ label: 'Try again', primary: true, run: () => location.reload() }, { label: 'Not now' }])`.

*6. Everything that reads every language*:
- `checkBadges()`: add `const ready = LANG_IDS.filter(langReady);` and use `ready` instead of `both` in the three lines that read the course: the sticker badges (`stickerBook`), `stories8` (`STORIES.filter(…)`) and the level badges (`levelComplete`). The other badges read only saved progress and stay on `both`. Without this, a language with no stories loaded would count as "every story read".
- `socialPublish()`: after the `socialOn()` check, `if (!langsAllReady()){ langsAll().then(() => socialTouch(), () => {}); return false; }` (`buildCard()` calls `currentLevel()` for each language, which is C2 for an empty course).
- `langLine()` in `js/ui/friends.js`: for your own line, skip a language that isn't loaded yet (`if (mine && !langReady(l)) continue;` before the level is read).
- `js/ui/onboarding.js`: the lesson count becomes `LANG_IDS.length * coreOrder(S.settings.lang).length` (every language has the same shape; a test holds that).
- Nothing else needs a guard: Learn, Stories, Review, Talk, Listen, the speed round, Your week, Me and the glossary popover read only the current language, which is always loaded before they draw. Live packs for a language not loaded yet are applied when it arrives (`assembleCourse()` in `langArrived()`).

*7. Tests* (`dev/test.js`):
- `makeDom()`: wait up to 500 × 20 ms for `__parlance` (it now appears once every language has loaded); add `opts.hold` → `w.PARLANCE_HOLD_LANGS = true` in `beforeParse`, and when `opts.hold` is set, wait until `dom.window.eval('typeof Langs !== "undefined" && Langs.ready.size > 0')` instead of `__parlance` (`Langs`, `LANG_FILES` and `S` are top-level `const`/`let`, so tests reach them through `E(…)`, not as `window` properties).
- New block `/* languages load on demand */`:
  - `languages: index.html runs no lesson or story file, and LANG_FILES lists each exactly once` (read `content/`: every `^(de|es|it)-.*\.js$` and `^stories-(de|es|it)\.js$` file is in `LANG_FILES`, none has a `<script` tag in `index.html`, each has a preload link)
  - `languages: the first screen needs only the learner's language` — `makeDom({ hold: true, seed: { 'parlance.v2': <a state with settings.lang 'it' and onboarded> } })`: `Langs.ready` is only `it`, `COURSE.de.units.length === 0`, Learn shows an Italian unit title; after `await E('langsAll()')`, all three are ready, `COURSE.de.units.length` equals the German unit count and `window.__parlance` is set.
  - `languages: switching to a language that isn't loaded loads it first` — held page, `setLang('de')`: a toast `Getting German ready…`, then `S.settings.lang === 'de'` and Learn shows a German unit.
  - `languages: badges wait for the course` — held page with saved progress whose `es.stories` is empty: `checkBadges()` doesn't award `stories8`, `levelA1` or the sticker badges for `de` or `es`.
  - `languages: the Friends card waits for every language` — held page with Friends on: `socialPublish()` resolves `false` and writes nothing; after `langsAll()`, the card is written and its `langs` levels match `currentLevel()` for each language.
  - `languages: cards of a language that isn't loaded are kept` — seed `de.cards` with one stable key and one old numeric key (`de-1-1|v|0`) while learning `it`: before `langsAll()`, both keys are still in `S.langs.de.cards`; after it, the numeric key has become `itemKey(getLesson('de-1-1'), 'v', 0)` and the card count is the same.
  - `languages: a language that fails to load says so` — held page; `E("langLoad = () => Promise.reject(new Error('test'))")`, then `setLang('es')`: the sheet `Couldn’t load Spanish` opens and `S.settings.lang` is unchanged.
- If an existing test reads `index.html`'s script list (for example a check that every content file is loaded), point it at `LANG_FILES` instead.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0` with the seven `languages:` checks
- [ ] `npm run offline-check` passes (the worker precaches the content files, so a language loads offline)
- [ ] `git diff` of `checkBadges()` changes only the three course-reading lines; `buildCard()` is unchanged

**Stop and report if:** anything would need a change to saved state, `MIGRATIONS`, `dev/web.js`, `vercel.json` or `dev/sw.js`; or a screen not listed in step 6 turns out to read another language.

### WP2 — Dev tools, the measurement and the docs

- **Agent:** parlance-builder (the same one, after WP1)
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** `dev/voices.js` and `design/pictures/tools.js` (the wait loop for `__parlance`: 100 → 500 iterations), `dev/flow.js` (only its wait loop, 150 → 500, and only if step 1 shows it's needed), `docs/ARCHITECTURE.md`, `CLAUDE.md` (one sentence)
- **Spec and steps.**
  1. Run `node dev/flow.js snapshot`, `node dev/voices.js --dry` and `node design/pictures/tools.js check`. Each must report the full course (the same shape and counts as on the base commit). Raise a tool's wait loop only if it fails to see the whole course.
  2. Measure the first screen before and after: serve the base commit (`git worktree add /tmp/base <base sha>`) and this branch with `npm run preview`-style static serving, and in Playwright (`NODE_PATH="$(npm root -g)"`) at 412 × 915 with CPU throttling 4× (`Emulation.setCPUThrottlingRate`), open `_preview.html` five times each and read `performance.now()` when `#app` first holds something other than `.boot` (on the branch, also `performance.getEntriesByName('parlance-first-render')[0].startTime`). Report the five numbers and the median for each. The branch's median must be at most 85% of the base's.
  3. `docs/ARCHITECTURE.md`: in "Where things live", the `content/*.js` row says "listed in `LANG_FILES` (`js/config.js`), not `index.html`"; "Adding a language" step 5 says to list the files in `LANG_FILES`; a new short section "Loading a language" after "Two homes": the learner's language loads before the first screen, the other two right after it (`langLoad()`, `langsAll()` in `content.js`); `__parlance` appears once all are loaded; badges, the Friends card and the onboarding count wait or use the current language; a file that fails stops that language until a reload.
  4. `CLAUDE.md`, "Content is data": add "Lesson and story files are listed in `LANG_FILES` in `js/config.js` (not in `index.html`)."
- **Acceptance criteria:** the three tools report the full course; the measurement meets the 85% bar; the docs say where content files are listed.
- **Stop and report if:** the median isn't at most 85% of the base's (then the release isn't worth its risk; report the numbers and don't ship it).

## Integration

- [ ] Roadmap: R-36 `done (4.53.0)` with the measured medians
- [ ] No pictures or voices (no content change); `node dev/voices.js --dry` shows 0 lines

## Release notes

- **Title:** Opens faster
- **Notes:**
  - Parlance now loads the language you’re learning first, so it opens faster on phones. The other languages follow a moment later.

## Verification plan

- Commands: `npm test` (FAIL 0), `npm run offline-check`, `node dev/flow.js guard` (no STOP, no FIX), `node dev/flow.js snapshot` (same shape as base).
- Screens (412px and 360px, light and dark): `tab:Learn;wait:600;shot:learn` in each language (`js:setLang('es');wait:900;shot:learn-es`, `js:setLang('it');wait:900;shot:learn-it`); `tab:Friends;wait:800;shot:friends`; `tab:Me;wait:800;shot:me`.
- On Android Chrome (Matt's phone size, 412px): the verifier opens the web preview cold with CPU throttling 4× and confirms the first screen is Learn in the saved language, then switches language twice.
- Spot checks for the reviewer: the `checkBadges()` and `socialPublish()` diffs; the seven `languages:` tests; the measured numbers.

## Risks and rollback

If a guard is missing somewhere, a learner could briefly see another language's empty state, or a badge could be awarded late (never wrongly: the guard only delays). Progress can't be lost: no saved field, key or migration changes, and cards of a language not yet loaded are kept as they are. Undo: `git revert` (it puts the script tags back), patch release, republish, set `latest`.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
