# Your level, your pace: test out of a unit, a first-week guide, a tidy practice grid

- **Cycle:** 2026-11-06 (premium program P1, `flow/PREMIUM.md`)
- **Status:** building
- **Release:** 4.33.0 (minor: new features)
- **Base:** `main` at e3b0c02 (4.32.0), merged into the work branch as dcfdcb4
- **Proposals built:** none. Answers rating fmvl62jxd97vy ("Too easy") and the first-week drop-off in `flow/PREMIUM.md`.
- **Roadmap items:** R-19, new R-23 and R-24

## Why this, why now

7 of 8 web learners stop within 5 active days, and nobody has finished more than 5 lessons in a language (`flow/PREMIUM.md`). Half of them placed themselves above A1, but the route has no way past a unit they already know, so they sit through easy lessons (rating fmvl62jxd97vy, "Too easy"). Half never find Stories, and only 1 of 8 has opened the bird picker. **Test out** lets anyone pass a unit's checkpoint early and move on. **Your first week** is a small checklist on Learn that leads new learners to the features they skip. **The practice grid** fixes R-19: the Review hero has up to five stacked full-width buttons at 412px. This release also gives later releases a place to add their own practice tiles (speed round, listening, conversations).

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Amber | Saved state (`outs` in each language slice, `SCHEMA_VERSION` 10 → 11, a migration, `mergeLang`); checkpoints pay `XP.checkpoint` (POLICY "Saved state", "XP, streaks, quests, badges") | Additive only: old saves load; an older open tab's merge keeps `outs` (it keeps unknown top-level fields); `done` is never written by a test-out; `levelComplete()` and the level badges are unchanged; the tests below |
| WP2 | Green | UX inside the Selva look, built from existing state; dismissal is device-local (POLICY "UX and UI polish") | — |
| WP3 | Green | UX polish (R-19), existing tokens only | — |

Nothing is Red.

## Work packages

WP1 and WP3 touch different files and run **in parallel** (worktrees). WP2 runs **after both are merged**, because it edits `js/ui/learn.js` (WP1's) and `styles/components.css` (WP3's).

### WP1 — Test out of a unit

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first, in parallel with WP3 (worktree)
- **Owns (may edit):** `js/core/engine.js` (`nextLesson`, `lessonState`, new `testedOut`), `js/core/state.js` (`newLang`, `cleanLang`, `mergeLang`, `MIGRATIONS`), `js/config.js` (the `SCHEMA_VERSION` line only), `js/ui/learn.js` (`heroCard`, `checkpointRow`, new `confirmTestOut`), `js/ui/runner.js` (`startCheckpoint`, the checkpoint branch of `finishRun`), `js/ui/feedback.js` (`quickRating`), `dev/test.js` (one new block, placed as below)
- **Reads first:** `nextLesson()`, `lessonState()`, `levelComplete()`, `unitDone()`, `buildCheckpoint()` in `js/core/engine.js`; `newLang()`, `cleanLang()`, `mergeLang()`, `MIGRATIONS` in `js/core/state.js`; `heroCard()`, `checkpointRow()`, `confirmLocked()` in `js/ui/learn.js`; `startCheckpoint()` and `finishRun()` in `js/ui/runner.js`; `quickRating()` in `js/ui/feedback.js`; the checkpoint checks in `dev/test.js` (search `'a perfect checkpoint passes and is saved'`).
- **Must not touch:** `js/ui/review.js`, `styles/*`, `RELEASES`/`APP_VERSION` in `js/config.js`, `index.html`.

**Spec.**

*Saved state.* Each language slice gets `outs: { [unit title]: 'YYYY-MM-DD' }`, the units a learner tested out of and the day. Keyed by unit title, like `cp`.
- `newLang()` adds `outs: {}`.
- `cleanLang()` adds `'outs'` to the list of keys that must be objects (`for (const k of ['done', 'cards', 'custom', 'stories', 'miss', 'cp', 'outs'])`).
- `mergeLang()` adds, after the `cp` merge: `out.outs = { ...b.outs, ...a.outs };` (union; a unit stays tested out on every device).
- `SCHEMA_VERSION` becomes `11`. Append to `MIGRATIONS`: `{ to: 11, run: st => { for (const l of LANG_IDS) if (st.langs[l]) st.langs[l] = cleanLang(st.langs[l]); } }   // outs: units tested out of (testedOut, engine.js)`.
- Why this is safe for older open tabs: an older version's `mergeLang` starts from `{ ...b, ...cleanLang(a) }`, so it keeps a top-level `outs` it doesn't know. Don't put the flag inside `cp` entries: older merges rebuild those with only `at`, `acc` and `pass`.

*Engine* (`js/core/engine.js`):
```js
/* a unit you tested out of (Learn → Test out): its lessons aren't done, but your route moves past them */
function testedOut(lang, l){ if (!l || !l.core) return false; const u = COURSE[lang].units[l.unit]; return !!(u && (S.langs[lang].outs || {})[u.title]); }
function nextLesson(lang){
  const si = startIndex(lang); const core = coreOrder(lang);
  const inRoute = l => LEVELS.indexOf(l.level) >= si;
  const passed = l => isDone(lang, l.id) || testedOut(lang, l);
  let last = -1; core.forEach((l, i) => { if (inRoute(l) && passed(l)) last = i; });
  return core.find((l, i) => i > last && inRoute(l) && !passed(l)) || core.find(l => inRoute(l) && !passed(l)) || core.find(l => !passed(l))
    || genLessons(lang).find(l => !isDone(lang, l.id)) || core.find(l => !isDone(lang, l.id)) || null;
}
```
Keep `nextLesson`'s existing comment. In `lessonState()`, add `if (testedOut(lang, l)) return 'open';` right after the `nx && nx.id === l.id` line. `levelComplete()`, `levelStats()`, `unitDone()` and `checkBadges()` don't change: a tested-out lesson is not a finished lesson.

*Runner* (`js/ui/runner.js`):
- `startCheckpoint(u, testOut)`: `const lang = S.settings.lang; if (!unitDone(lang, u) && !testOut) return; beginSession('checkpoint', lang, buildCheckpoint(u), { unit: u, testOut: !!testOut });`
- In `finishRun()`'s checkpoint branch, after `pass` is known: `const out = !!Run.testOut && !unitDone(lang, u);`. Write the record keeping unknown fields: `L.cp[u.title] = { ...(prev || {}), at: today(), acc: Math.max(acc, prev && prev.acc || 0), pass: !!(pass || (prev && prev.pass)) };`. Then `if (out && pass){ L.outs = L.outs || {}; if (!L.outs[u.title]) L.outs[u.title] = today(); }`. XP stays as now (`XP.checkpoint` on the first pass, else `XP.review`).
- Copy, when `out`: `top = pass ? 'Tested out' : 'Checkpoint'`; `h1o = pass ? 'Unit tested out.' : 'Not quite yet.'`; `subo = pass ? 'Your route moves past “' + u.title + '”. Its lessons stay open whenever you want them.' : 'You need ' + Math.round(CHECKPOINT.pass * 100) + '% to test out. Its lessons will get you there, and you can try again any time.'`; `cpPass = pass` (gold stamp). When not `out`, the copy is unchanged.
- Set `UI.openLang = null` after a passed test-out, so Learn opens the level the next stop is on.

*Learn* (`js/ui/learn.js`):
- `checkpointRow(u, lang)` becomes:
```js
function checkpointRow(u, lang){
  const ready = unitDone(lang, u), rec = S.langs[lang].cp[u.title], passed = !!(rec && rec.pass), out = !!(S.langs[lang].outs || {})[u.title];
  const state = passed ? 'done' : ready ? 'next' : 'open';
  const best = rec ? ' · best ' + Math.round((rec.acc || 0) * 100) + '%' : '';
  const meta = passed ? (out && !ready ? 'Tested out' : 'Passed') + best : rec ? 'Not passed yet' + best : ready ? CHECKPOINT.questions + ' questions · ' + Math.round(CHECKPOINT.pass * 100) + '% to pass' : 'Know this unit already? Test out';
  return h('ol', { class: 'stations checkpoint' }, h('li', { class: state },
    h('button', { class: 'station', type: 'button', onclick: () => ready || passed ? startCheckpoint(u, !ready) : confirmTestOut(u) },
      h('span', { class: 'dot' }, passed ? ic('check') : ic('flag')),
      h('span', { class: 'st-body' }, h('span', { class: 'st-title' }, 'Unit checkpoint'), h('span', { class: 'st-meta' }, meta)),
      h('span', { class: 'st-state' }, passed ? 'Again' : ready ? 'Start' : 'Test out'))));
}
```
- New, after `checkpointRow`:
```js
function confirmTestOut(u){
  sheet('Test out of this unit?', h('div', { class: 'row', style: 'align-items:flex-start' }, pip('point', 56, { tap: false }),
    h('p', { class: 'grow' }, CHECKPOINT.questions + ' questions from “' + u.title + '”. Score ' + Math.round(CHECKPOINT.pass * 100) + '% and your route moves past this unit. Its lessons stay open, and their words join Review when you take them.')),
    [{ label: 'Not now' }, { label: 'Start the test', primary: true, run: () => { startCheckpoint(u, true); } }]);
}
```
- `heroCard()`: after the primary button, add a quiet link when the next stop opens a fresh unit and the learner is not a brand-new A1 beginner:
```js
const nu = nx.core ? COURSE[lang].units[nx.unit] : null;
const fresh = nu && nu.lessons[0].id === nx.id && !nu.lessons.some(l => isDone(lang, l.id)) && !(S.langs[lang].cp[nu.title] && S.langs[lang].cp[nu.title].pass) && (started || startIndex(lang) > 0);
… fresh ? h('button', { class: 'linkish small', type: 'button', onclick: () => confirmTestOut(nu) }, 'Know this unit already? Test out') : null
```

*Feedback* (`js/ui/feedback.js`, `quickRating`): when the chosen option is `-1` (Too easy) and `ctx.lessonId` is set, the thanks line gets a second line after it: `h('p', { class: 'small muted' }, 'Feeling easy? On Learn, tap Test out on a unit you already know.')`. Nothing else changes.

*Edge cases.* Signed out and web: all of this is local state, synced like `cp`. A failed test-out writes `cp` with `pass: false` (as a failed checkpoint does today) and no `outs`. Wrong answers in a test-out land on Fix my mistakes, as in any checkpoint. A learner who later finishes a tested-out unit's lessons sees the normal checkpoint row ("Passed"). Reset (`resetLang`) clears `outs` with the rest of the slice (it uses `newLang()`).

**Steps.**
1. State: `newLang`, `cleanLang`, `mergeLang`, `MIGRATIONS` step 11; `SCHEMA_VERSION = 11` in `js/config.js`.
2. Engine: `testedOut`, `nextLesson`, `lessonState`.
3. Runner: `startCheckpoint(u, testOut)`, the checkpoint branch of `finishRun`.
4. Learn: `checkpointRow`, `confirmTestOut`, the hero link.
5. Feedback: the Too easy line.
6. Tests: add one block in `dev/test.js` directly **after** the line containing `'fixing mistakes and form questions earn badges'` (same `Q` page, Spanish; unit 1 is done by then). Each check below is one `ok(...)` with exactly that message.
7. `npm test` (FAIL 0), `node dev/flow.js guard` (no FIX; the schema bump shows as a NOTE), commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `test out: SCHEMA_VERSION is 11 and an old slice gets outs {}`: `SCHEMA_VERSION === 11` and `cleanLang({ done: {} }).outs` deep-equals `{}`.
  - `test out: merges keep outs from both sides`: `mergeLang({ outs: { A: '2026-11-01' } }, { outs: { B: '2026-11-02' } }).outs` has both keys; `mergeLang({}, { outs: { B: 'x' } }).outs.B === 'x'`.
  - `test out: a normal checkpoint doesn't write outs`: after the existing perfect checkpoint on `COURSE.es.units[0]`, `!(L().outs || {})[COURSE.es.units[0].title]`.
  - `test out: Learn offers Test out on a unit that isn't done`: with A1 open on Learn, some `.stations.checkpoint li.open` contains the text `Test out`.
  - For the next three checks, let `U1` and `U2` be the first two A1 units in `COURSE.es.units` (by index, after unit 0) with no lesson done and no `cp` record at this point of the test, and make sure every lesson before `U1` is done (set `L().done` for any that aren't), so the next stop is `U1`'s first lesson.
  - `test out: passing moves the next stop past the unit`: run `startCheckpoint(U1, true)` answering every question right (copy the answer loop from the checkpoint test above it); then `L().outs[U1.title]` is set, `L().cp[U1.title].pass` is true, `nextLesson('es').unit` is greater than `U1`'s index, and no lesson of `U1` is in `L().done`.
  - `test out: its lessons are open, not done, and A1 is not complete`: `lessonState('es', U1.lessons[0], nextLesson('es')) === 'open'`, `!isDone('es', U1.lessons[0].id)`, `!levelComplete('es', 'A1')`, `!S.badges.levelA1`.
  - `test out: failing writes no outs`: `startCheckpoint(U2, true)` answering every question wrong (`'zzz'` for typed answers, a wrong option otherwise); then `!(L().outs || {})[U2.title]` and `L().cp[U2.title].pass === false`.
  - `test out: the finish screen says Tested out`: after the passing run, before Continue, the overlay contains `Unit tested out.`.
- [ ] `node dev/flow.js shots --steps "tab:Learn;scroll:1400;shot:testout-row;js:confirmTestOut(COURSE[S.settings.lang].units[1]);wait:500;shot:testout-sheet"` shows the "Test out" row and the sheet with no sideways scroll, light and dark, at 412px and `--width 360`.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** `mergeLang` or the backup code drops `outs` in a test you can't fix without changing `parlance.v2` or a database path; or `nextLesson` changes break any existing route check in `dev/test.js` that you can't fix without changing what "done" means.

### WP2 — Your first week

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 and WP3 are merged into the cycle branch
- **Owns (may edit):** `js/ui/learn.js` (`viewLearn`, new `firstWeekCard`, `fwGet`, `fwSet`), `js/ui/me.js` (`openBirdPicker` one line, new `webAddHome`, `webHomeScreenCard`'s button), `styles/components.css` (new `.first-week` rules in the Learn section), `dev/test.js` (one new block)
- **Reads first:** `viewLearn()`, `heroCard()`, `questCard()` in `js/ui/learn.js`; `openBirdPicker()`, `webHomeScreenCard()`, `openHomeScreenHelp()` in `js/ui/me.js`; `bumpQuest()` in `js/core/engine.js` (quest counters live in `S.days[k].q`); the `.quests` rules in `styles/components.css` for the look.
- **Must not touch:** `js/core/state.js`, `js/config.js`, anything WP1 or WP3 changed except where listed.

**Spec.** A card on Learn, after the hero and before Daily quests, for learners who have finished at least one lesson, until they've done every step, used Parlance on 8 different days, or hidden it. Nothing is saved to the account: "hidden" and "opened the bird picker" are device-local.

```js
const FW_KEY = 'parlance.firstweek';
function fwGet(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function fwSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
function goTab(t){ UI.tab = t; UI.animate = true; render(); window.scrollTo(0, 0); }
function firstWeekSteps(){
  const lang = S.settings.lang, days = Object.values(S.days).filter(d => d && d.xp > 0);
  const toNext = () => { const nx = nextLesson(lang); if (nx) startLesson(nx.id); };
  const steps = [
    { id: 'lesson', label: 'Finish your first lesson', done: LANG_IDS.some(l => Object.keys(S.langs[l].done).length > 0), run: toNext },
    { id: 'review', label: 'Practice the words you learned', done: Object.values(S.days).some(d => d && d.q && d.q.reviews > 0), run: () => goTab('review') },
    { id: 'story', label: 'Read a story', done: LANG_IDS.some(l => Object.keys(S.langs[l].stories).length > 0), run: () => goTab('stories') },
    { id: 'bird', label: 'Meet the other birds', done: S.settings.mascot !== 'pip' || fwGet('parlance.birds') === '1', run: () => openBirdPicker() },
    { id: 'goal', label: 'Reach your daily goal', done: days.some(d => d.met), run: toNext }
  ];
  if (Web.on && (webIOS() || Web.install || webStandalone())) steps.push({ id: 'home', label: 'Put Parlance on your Home Screen', done: webStandalone(), run: () => webAddHome() });
  return steps;
}
function firstWeekCard(){
  if (fwGet(FW_KEY) === 'hidden') return null;
  if (!LANG_IDS.some(l => Object.keys(S.langs[l].done).length > 0)) return null;
  if (Object.values(S.days).filter(d => d && d.xp > 0).length >= 8) return null;
  const steps = firstWeekSteps(), n = steps.filter(s => s.done).length;
  if (n === steps.length) return null;
  return h('section', { class: 'card first-week' },
    h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'Your first week'), h('span', { class: 'small muted' }, n + ' of ' + steps.length)),
    h('span', { class: 'q-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(n / steps.length * 100) + '%' })),
    h('ul', { class: 'fw-list' }, steps.map(s => h('li', { class: s.done ? 'done' : '' },
      h('button', { class: 'fw-step', type: 'button', disabled: s.done, 'data-step': s.id, onclick: s.run },
        h('span', { class: 'fw-dot', 'aria-hidden': 'true' }, s.done ? ic('check') : null),
        h('span', { class: 'grow' }, s.label, s.done ? h('span', { class: 'sr' }, ' (done)') : null),
        s.done ? null : ic('chev', 'fw-go'))))),
    h('button', { class: 'linkish small', type: 'button', onclick: () => { fwSet(FW_KEY, 'hidden'); UI.animate = false; render(); } }, 'Hide this'));
}
```
- `viewLearn()`: insert `firstWeekCard()` between `heroCard()` and `questCard()`.
- `js/ui/me.js`: first line of `openBirdPicker()`'s body: `try { localStorage.setItem('parlance.birds', '1'); } catch (e) {}`. Move the Home Screen button's `onclick` body into `async function webAddHome(){ if (!Web.install){ openHomeScreenHelp(); return; } const ev = Web.install; Web.install = null; try { await ev.prompt(); } catch (e) {} render(); }` and call it from `webHomeScreenCard()`'s button.
- `styles/components.css`, after the `.quests` rules:
```css
/* Your first week (Learn) */
.first-week .q-bar{display:block;margin:8px 0 4px}
.first-week .fw-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column}
.first-week .fw-step{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:6px 0;background:none;border:0;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.first-week .fw-dot{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:50%;border:2px solid var(--hair)}
.first-week li.done .fw-dot{background:var(--line);border-color:var(--line);color:var(--surface)}
.first-week li.done .fw-step{color:var(--muted);cursor:default}
.first-week .fw-go{color:var(--muted)}
.first-week .linkish{align-self:flex-start}
```
If `.q-bar` is scoped to `.quests` in the CSS, add `.first-week .q-bar` and `.first-week .q-bar i` copies of those rules here instead of changing the `.quests` ones.

**Steps.**
1. `js/ui/learn.js`: the functions above; the call in `viewLearn()`.
2. `js/ui/me.js`: the `parlance.birds` line; `webAddHome()`.
3. `styles/components.css`: the rules above.
4. Tests in `dev/test.js`: one block directly **after** the line containing `'the Review tab offers Fix my mistakes'`, on the same page.
5. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `first week: no card before the first lesson`: on a fresh page (no lessons done), `#app .first-week` is absent on Learn.
  - `first week: the card shows after a lesson, with the lesson step ticked`: after one lesson is done, `.first-week` exists and `[data-step="lesson"]` is disabled and its `li` has class `done`.
  - `first week: each step's button goes where it says`: clicking `[data-step="story"]` sets `UI.tab === 'stories'`; `[data-step="review"]` sets `UI.tab === 'review'`.
  - `first week: Hide this hides it on this device`: clicking `Hide this` removes the card and `localStorage['parlance.firstweek'] === 'hidden'`; remove the key afterwards.
  - `first week: gone after 8 practice days`: with 8 entries in `S.days` with `xp > 0`, the card is absent.
  - `first week: opening the bird picker ticks Meet the other birds`.
- [ ] `node dev/flow.js shots --steps "js:S.langs[S.settings.lang].done[coreOrder(S.settings.lang)[0].id]={at:today(),acc:1,times:1};render();wait:400;shot:first-week"` shows the card under the hero, light and dark, at 412px and 360px, nothing wraps out of its row.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** showing the card needs a new saved field (it must not); or `Web.install` / `webStandalone()` aren't defined in the artifact build (guard them with `typeof` rather than adding code to `host.js`).

### WP3 — Review practice grid (R-19)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first, in parallel with WP1 (worktree)
- **Owns (may edit):** `js/ui/review.js` (`viewReview`, new `practiceTiles`), `styles/components.css` (new `.practice` rules in the Review section), `dev/test.js` (the article practice block's button finder, and one new block)
- **Reads first:** `viewReview()` in `js/ui/review.js`; `startReview()`, `startMistakes()`, `startForms()`, `startGenders()`, `formLessons()` in `js/ui/runner.js`; the `.hero` rules in `styles/components.css`; the article practice block in `dev/test.js` (search `'Practice articles: '`).
- **Must not touch:** `js/ui/runner.js`, `js/ui/learn.js`, `js/core/*`.

**Spec.** Before: the Review hero stacks up to five full-width buttons (Review, Fix my mistakes, Practice my weakest items, Practice verb forms and endings, Practice articles), and the verb forms label wraps at 412px. After: the hero keeps its title, text, bird and the primary **Review N items** button. Under it, when any practice applies, an eyebrow **More practice** and a two-column grid of tiles. Each tile has an icon, a short label and a sub-line. Later releases add tiles (P4: Speed round; P5: Listen hands-free; P6: Conversations) by adding an entry to `practiceTiles()`.

```js
/* the practice options under the Review button; later releases add their own entries here */
function practiceTiles(lang){
  const fix = mistakeEntries(lang).length, all = learnedEntries(lang).length, forms = formLessons(lang).length, arts = genderEntries(lang).length >= GENDER_DRILL.min;
  return [
    { id: 'mistakes', icon: 'flag', label: 'Fix my mistakes', sub: fix + ' to fix', show: fix > 0, run: () => startMistakes() },
    { id: 'weak', icon: 'review', label: 'Weakest items', sub: 'Your 12 shakiest', show: all > 0, run: () => startReview(true) },
    { id: 'forms', icon: 'bulb', label: 'Verb forms', sub: 'Endings from your tables', show: forms > 0, run: () => startForms() },
    { id: 'articles', icon: 'words', label: 'Articles', sub: GENDER_DRILL[lang].label, show: arts, run: () => startGenders() }
  ].filter(t => t.show);
}
function practiceGrid(lang){
  const tiles = practiceTiles(lang); if (!tiles.length) return null;
  return h('div', { class: 'practice' }, h('span', { class: 'eyebrow' }, 'More practice'),
    h('div', { class: 'practice-grid' }, tiles.map((t, i) => h('button', { class: 'practice-tile', type: 'button', style: '--i:' + i, 'data-practice': t.id, onclick: t.run },
      ic(t.icon, 'pt-ic'), h('span', { class: 'pt-label' }, t.label), h('span', { class: 'pt-sub' }, t.sub)))));
}
```
In `viewReview()`, replace the four non-primary buttons (`fix ?`, `all.length ?`, `forms ?`, `arts ?`) with `practiceGrid(lang)`, and drop the now-unused `fix`, `forms`, `arts` locals if nothing else uses them.

CSS, after the Review hero rules in `styles/components.css`:
```css
/* More practice (Review hero) */
.practice{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.practice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.practice-tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:84px;padding:12px;border-radius:var(--r-md);background:var(--bg);border:2px solid var(--hair);box-shadow:0 3px 0 var(--hair);color:var(--ink);font:inherit;text-align:left;cursor:pointer;animation:rise var(--dur) var(--ease) both;animation-delay:calc(var(--i, 0) * 40ms)}
.practice-tile:active{box-shadow:0 1px 0 var(--hair);transform:translateY(2px)}
.practice-tile .pt-ic{color:var(--line-text)}
.practice-tile .pt-label{font-weight:700;line-height:1.2}
.practice-tile .pt-sub{font-size:13px;line-height:1.25;color:var(--muted)}
.practice-grid .practice-tile:last-child:nth-child(odd){grid-column:1 / -1}
@media (max-width:340px){.practice-grid{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.practice-tile{animation:none}}
```
If `rise` isn't a keyframe defined in the stylesheets, drop the `animation` and `animation-delay` declarations.

**Steps.**
1. `js/ui/review.js`: `practiceTiles`, `practiceGrid`, the hero change.
2. `styles/components.css`: the rules above.
3. `dev/test.js`: in the article practice block, change `artBtn` to `() => w.document.querySelector('#app [data-practice="articles"]')` (the label is now "Articles" with the article list as the sub-line); keep every assertion. Then add one block directly **after** the line containing `'the Review tab offers Fix my mistakes'`.
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, including the unchanged article practice checks, and these new ones:
  - `review practice: a new learner sees no practice tiles`: on a page with no cards, `practiceTiles('es').length === 0` and `#app .practice-grid` is absent on Review.
  - `review practice: tiles for what applies`: with progress, Review shows `[data-practice="weak"]`, and `[data-practice="mistakes"]` exactly when `mistakeEntries('es').length > 0`.
  - `review practice: Weakest items starts a practice session`: clicking `[data-practice="weak"]` sets `Run.mode === 'practice'`; end it with `endRun()`.
- [ ] `node dev/flow.js shots --steps "tab:Review;shot:review-grid"` on a learner with progress (use `--steps "js:for(const l of coreOrder(S.settings.lang).slice(0,6))S.langs[S.settings.lang].done[l.id]={at:today(),acc:1,times:1};startReview(true);endRun();tab:Review;wait:400;shot:review-grid"` if the default page has none): the grid is two columns at 412px and one column at `--width 340`, no label wraps past two lines, light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX (no literal colors).

**Stop and report if:** a tile's session starter needs a change in `js/ui/runner.js` (it must not).

## Integration

On the cycle branch, after the three packages are merged (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION = '4.33.0'`; the `RELEASES` entry from "Release notes" below, dated the ship day.
- [ ] `docs/ARCHITECTURE.md`, "Practice beyond lessons", the **Unit checkpoints** bullet: add "A unit's checkpoint can also be taken before its lessons, from Learn (**Test out**): a pass records the unit in `langs[lang].outs` (schema 11), `nextLesson()` moves past it and its lessons show as open, but they aren't done: no review cards, no level badge." And in "Where things live" nothing changes.
- [ ] `CLAUDE.md`: nothing (no new command or rule).
- [ ] No content changed: no pictures, no voices. Run `node dev/voices.js --dry` once to confirm 0 lines, then skip the illustrator.

## Release notes

- **Title:** Your level, your pace
- **Notes:**
  - Know a unit already? Test out of it from Learn. Pass its checkpoint and your route moves on, and its lessons stay open whenever you want them.
  - New to Parlance? A short guide on Learn walks you through your first week: reviews, stories, picking your bird and more.
  - Review's extra practice now sits in a tidy grid: your mistakes, your weakest items, verb forms and articles.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX; NOTE for the schema bump is expected).
- Screens (412px, light and dark; also `--width 360` for Learn and Review): the three `shots` strings in the acceptance criteria above, plus `tab:Learn;shot:learn` to see the hero link for a learner whose start level is B1 (`js:S.langs[S.settings.lang].start='B1';UI.openLang=null;render()` first).
- Spot checks for the reviewer: pass a test-out in Spanish unit 2, then open Learn: the next stop is unit 3, unit 2's lessons read "Open", its checkpoint row reads "Tested out · best …%". Load a schema-10 backup code made before this release, and check that nothing is lost. Read every new string against "Copy" in `CLAUDE.md`.

## Risks and rollback

- A learner might test out of a unit they half know. Its lessons stay open and its words aren't in Review until they take them, so nothing is lost, and Fix my mistakes holds what they missed.
- `nextLesson` is central. The new checks and the existing route checks cover it. If a route bug ships, `git revert` the WP1 merge on `main`, bump to 4.32.1, republish and set `latest`. `outs` stays in saves harmlessly (older code ignores it).

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p2-works-offline.md` (see `flow/PREMIUM.md`).
