# Your week: a weekly recap, and a shorter Learn route

- **Cycle:** set when promoted (premium program P4, `flow/PREMIUM.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-p4-your-week.md`, set Release, Base and `approved`)
- **Release:** 4.35.0, or the next free minor when promoted
- **Base:** `main` at promotion time
- **Proposals built:** none
- **Roadmap items:** R-11, new R-26
- **Needs:** nothing from P1–P3, but uses `outs` from P1 if present (`S.langs[lang].outs || {}`).

## Why this, why now

Once learners have a habit, the best reward is seeing it. Parlance shows today (the greeting stats) and the last 7 days (a chart in Me), but never steps back to say how last week went. **Your week** is a Monday recap on Learn: XP, goal days, best day, lessons and stories, a comparison with the week before, what's coming up in Review, and a Share button. Learners who share it bring friends, which is how 2 of 8 web learners found Friends. **A shorter route** fixes R-11: an open level lists every unit (about 10,000px at 412px for a learner deep into a level). Finished units fold into one line each, so the next stop is near the top.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | UX built from existing state; the "seen" marker is device-local; sharing uses the system share sheet or the clipboard, with links already in `FRIENDS.links` (no new host) | — |
| WP2 | Green | UX polish (R-11), existing tokens | — |

## Work packages

WP2 runs **after** WP1 (both edit `js/ui/learn.js`).

### WP1 — Your week

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** new `js/ui/recap.js`; `index.html` (one script tag); `js/ui/learn.js` (`viewLearn`: one call); `js/ui/me.js` (the "Last 7 days" card: one button); `styles/components.css` (new `.recap` rules); `dev/test.js` (one block)
- **Reads first:** the "Last 7 days" card in `viewMe()` (`js/ui/me.js`, the `.bars` markup to reuse); `streakInfo()`, `goalXP()`, `wordCount()` in `js/core/engine.js`; `today()`, `addDays()`, `parseDay()`, `daysBetween()` in `js/core/util.js`; `sheet()` in `js/ui/shell.js` (an action whose `run` returns true keeps the sheet open); `copyThen()` in `js/core/caps.js`; `FRIENDS.links` in `js/config.js`.
- **Must not touch:** `js/core/*`, `js/config.js`, other screens.

**Spec.** `js/ui/recap.js` (new, classic script, `"use strict";`), loaded directly after `js/ui/learn.js` in `index.html`:
```js
"use strict";
/* ===================== YOUR WEEK (a recap of last week, Monday to Sunday) =====================
   Built from what's already saved: days (XP and goal days, all languages), and this language's lessons, stories and
   cards. Shown on Learn Monday to Wednesday until opened or dismissed (remembered on this device), and from Me any time. */
const RECAP_KEY = 'parlance.recap';
function recapGet(){ try { return localStorage.getItem(RECAP_KEY) || ''; } catch (e) { return ''; } }
function recapSet(v){ try { localStorage.setItem(RECAP_KEY, v); } catch (e) {} }
function mondayOf(k){ return addDays(k, -((parseDay(k).getDay() + 6) % 7)); }
function lastMonday(t){ return addDays(mondayOf(t || today()), -7); }
function weekRecap(lang, mon){
  const days = [...Array(7)].map((_, i) => addDays(mon, i)), xps = days.map(k => goalXP(S.days[k]));
  const xp = xps.reduce((a, b) => a + b, 0), top = Math.max(...xps), inWeek = at => !!at && at >= days[0] && at <= days[6];
  const prevXp = [...Array(7)].map((_, i) => goalXP(S.days[addDays(mon, i - 7)])).reduce((a, b) => a + b, 0);
  const L = S.langs[lang], t = today(); let upcoming = 0;
  for (const c of Object.values(L.cards)) if (c && c.due && daysBetween(t, c.due) <= 7) upcoming++;
  return { lang, mon, days, xps, xp, prevXp,
    goalDays: days.filter(k => S.days[k] && S.days[k].met).length, activeDays: xps.filter(x => x > 0).length,
    bestDay: top > 0 ? days[xps.indexOf(top)] : null, bestXp: top,
    lessons: Object.values(L.done).filter(d => d && inWeek(d.at)).length, stories: Object.values(L.stories).filter(d => d && inWeek(d.at)).length,
    streak: streakInfo().count, upcoming };
}
/* the Monday a recap card should show for on day t, or null */
function recapDue(lang, t){
  const mon = lastMonday(t), dow = (parseDay(t).getDay() + 6) % 7;
  if (dow > 2 || recapGet() === mon) return null;
  return weekRecap(lang, mon).activeDays > 0 ? mon : null;
}
function recapRange(mon){ const f = k => parseDay(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); return f(mon) + ' – ' + f(addDays(mon, 6)); }
function recapCompare(r){
  if (!r.prevXp) return r.xp ? 'A fresh start after a quiet week.' : '';
  const pct = Math.round((r.xp - r.prevXp) / r.prevXp * 100);
  return pct >= 0 ? 'Up ' + pct + '% on the week before.' : 'Down ' + (-pct) + '% on the week before. A short lesson today gets you going again.';
}
function recapShareText(r){
  return 'My week learning ' + LANGS[r.lang].name + ' on Parlance: ' + r.xp + ' XP, ' + r.goalDays + ' of 7 goal days' + (r.streak ? ', and a ' + r.streak + '-day streak' : '') + '.';
}
function shareRecap(r){
  const text = recapShareText(r), url = Web.on ? FRIENDS.links.web : FRIENDS.links.claude;
  const copy = () => copyThen(text + ' ' + url, 'Copied. Paste it anywhere.');
  if (navigator.share) navigator.share({ text, url }).catch(e => { if (!e || e.name !== 'AbortError') copy(); }); else copy();
}
function recapCard(){
  const lang = S.settings.lang, mon = recapDue(lang, today()); if (!mon) return null;
  const r = weekRecap(lang, mon);
  return h('section', { class: 'card recap-card' },
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, 'Your week'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, recapRange(mon))),
    h('h3', null, r.xp + ' XP · ' + r.goalDays + ' of 7 goal days'),
    h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => openRecap(mon) }, ic('spark'), 'See your week'),
    h('button', { class: 'linkish small', type: 'button', onclick: () => { recapSet(mon); UI.animate = false; render(); } }, 'Not now'));
}
function openRecap(mon){
  const lang = S.settings.lang, r = weekRecap(lang, mon), goal = S.settings.goal, max = Math.max(goal * 1.25, ...r.xps, 1);
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  recapSet(mon);
  const li = (txt) => txt ? h('li', null, txt) : null;
  sheet('Your week', h('div', { class: 'recap' },
    h('div', { class: 'row recap-top' }, pip(r.goalDays >= 5 ? 'dance' : r.activeDays >= 3 ? 'cheer' : 'happy', 64, { tap: false }), h('div', { class: 'grow' }, h('p', { class: 'small muted' }, recapRange(mon) + ' · ' + LANGS[lang].name), h('p', null, recapCompare(r)))),
    h('div', { class: 'tiles3' },
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.xp), h('span', { class: 'lbl' }, 'XP')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.goalDays + '/7'), h('span', { class: 'lbl' }, 'goal days')),
      h('div', { class: 'stat' }, h('span', { class: 'num' }, r.streak), h('span', { class: 'lbl' }, plural(r.streak, 'day') + ' streak'))),
    h('div', { class: 'bars', role: 'img', 'aria-label': 'XP per day, Monday to Sunday: ' + r.xps.join(', ') },
      h('span', { class: 'goal-line', style: 'bottom:' + (24 + Math.round(goal / max * 100)) + 'px' }, h('span', null, goal)),
      r.days.map((k, i) => h('div', { class: 'bar' + (r.xps[i] >= goal ? '' : ' miss') }, h('i', { style: 'height:' + Math.max(3, Math.round(r.xps[i] / max * 100)) + 'px;--d:' + i }), h('span', null, names[parseDay(k).getDay()])))),
    h('ul', { class: 'recap-list' },
      li(r.lessons ? r.lessons + ' ' + plural(r.lessons, 'lesson') + ' finished' : ''),
      li(r.stories ? r.stories + ' ' + plural(r.stories, 'story', 'stories') + ' read' : ''),
      li(r.bestDay ? 'Best day: ' + parseDay(r.bestDay).toLocaleDateString(undefined, { weekday: 'long' }) + ', ' + r.bestXp + ' XP' : ''),
      li(r.upcoming + ' ' + plural(r.upcoming, 'review', 'reviews') + ' coming up this week'))),
    [{ label: 'Share my week', run: () => { shareRecap(r); return true; } }, { label: 'Done', primary: true, run: () => { UI.animate = false; render(); } }]);
}
```
- `viewLearn()` (`js/ui/learn.js`): insert `recapCard()` right after `greetBlock()` (before `resumeCard()`), guarded: `typeof recapCard === 'function' ? recapCard() : null`.
- `viewMe()` (`js/ui/me.js`), the "Last 7 days" card: after its `p.small.muted`, when `typeof weekRecap === 'function' && weekRecap(lang, lastMonday()).activeDays > 0`, add `h('button', { class: 'linkish small', type: 'button', style: 'align-self:flex-start', onclick: () => openRecap(lastMonday()) }, 'Your last full week')`.
- CSS (`styles/components.css`, near the Learn cards):
```css
/* Your week (recap) */
.recap-card h3{margin:2px 0 4px}
.recap{display:flex;flex-direction:column;gap:14px}
.recap-top{align-items:center;gap:12px}
.recap-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
```
If `.tiles3 .stat`, `.bars` or `.goal-line` are styled only inside another container (`.complete`, the Me card), add `.recap` copies of those rules here; don't change the originals.

*Edge cases.* A learner with no practice last week sees no card, and Me shows no button. XP is all languages (days are shared); lessons, stories and reviews are the current language. `done[id].at` is the last time a lesson was finished, so a lesson repeated this week counts in this week: the copy says "finished", which is true. Share in the Claude app may refuse `navigator.share`; it falls back to copying. Dark mode: tokens only.

**Steps.**
1. `js/ui/recap.js` and the `index.html` tag (after `js/ui/learn.js`).
2. The Learn and Me hooks.
3. The CSS.
4. Tests: one block directly **before** the line containing `// placement: all right goes to the top`. Use fixed dates. Set `S.days` for a known Monday-to-Sunday week and the week before, then call the pure functions with that Monday and with chosen `t` values. Remove `localStorage['parlance.recap']` at the start and the end.
5. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `your week: the recap adds up the week`: with `S.days` holding XP 10, 0, 25, 0, 0, 30, 5 (met on the 25 and 30 days with goal 20) for the week of `2026-10-26`, `weekRecap('es', '2026-10-26')` gives `xp === 70`, `goalDays === 2`, `activeDays === 4`, `bestDay === '2026-10-31'`, `bestXp === 30`.
  - `your week: compared with the week before`: with 35 XP the week before, `recapCompare(r) === 'Up 100% on the week before.'`; with 140, `'Down 50% on the week before. A short lesson today gets you going again.'`; with 0, `'A fresh start after a quiet week.'`.
  - `your week: shown Monday to Wednesday, once`: `recapDue('es', '2026-11-02')` (a Monday) is `'2026-10-26'`; `recapDue('es', '2026-11-05')` (a Thursday) is null; after `recapSet('2026-10-26')`, `recapDue('es', '2026-11-03')` is null.
  - `your week: no card after a quiet week`: with no XP that week, `recapDue('es', '2026-11-02')` is null.
  - `your week: the share text`: `recapShareText({ lang: 'es', xp: 70, goalDays: 2, streak: 3 }) === 'My week learning Spanish on Parlance: 70 XP, 2 of 7 goal days, and a 3-day streak.'`.
  - `your week: the sheet opens and marks the week seen`: `openRecap('2026-10-26')` adds a `.sheet` containing `Your week` and `70`; `localStorage['parlance.recap'] === '2026-10-26'`.
- [ ] `node dev/flow.js shots --steps "js:const m=lastMonday();[10,0,25,0,0,30,5].forEach((x,i)=>{S.days[addDays(m,i)]={xp:x,met:x>=20}});openRecap(m);wait:600;shot:recap"` shows the sheet at 412px and 360px, light and dark, with nothing cut off.
- [ ] `node dev/flow.js guard`: no STOP, no FIX (the share link hosts are already in `FRIENDS.links`).

**Stop and report if:** the guard reports a new outside host (the links must come from `FRIENDS.links`, never typed out); or showing the card needs a saved field.

### WP2 — A shorter Learn route (R-11)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 is merged
- **Owns (may edit):** `js/ui/learn.js` (`levelSection`), `styles/components.css` (new `.unit.compact` and `.unit-toggle` rules next to the unit rules), `dev/test.js` (one block)
- **Reads first:** `levelSection()`, `stationList()`, `checkpointRow()`, `viewLearn()` in `js/ui/learn.js`; `unitDone()` in `js/core/engine.js`; the "Level sections, units, stations" rules in `styles/components.css`; the checks `'Learn shows an open checkpoint'` in `dev/test.js` (they must still pass).
- **Must not touch:** `js/core/*`, `js/ui/recap.js`.

**Spec.** Before: an open level shows every unit's head, all its stations and its checkpoint row. After: a unit is **folded** when all its lessons are done, or it was tested out (`(S.langs[lang].outs || {})[u.title]`), unless the learner unfolded it or it holds the lesson just finished (`UI.justDone`). A folded unit is one row: its sign (36px), the eyebrow `Unit N · done` (or `Unit N · tested out`), the title, a check and a chevron, all one button (`aria-expanded="false"`). Its checkpoint row stays under it while that checkpoint isn't passed, so an open checkpoint is never hidden. Tapping the row unfolds the unit; an unfolded finished unit's head is the same button with `aria-expanded="true"`, and tapping it folds it again. Unfolded units are remembered for this visit only.

```js
// in levelSection(), replacing the units.forEach body:
UI.units = UI.units || new Set();
units.forEach(({ u, ui }) => {
  const done = u.lessons.filter(l => isDone(lang, l.id)).length, full = unitDone(lang, u), out = !!(S.langs[lang].outs || {})[u.title];
  const key = lang + '|' + u.title, foldable = (full || out) && !u.lessons.some(l => l.id === UI.justDone);
  const open = !foldable || UI.units.has(key), rec = S.langs[lang].cp[u.title];
  const head = foldable
    ? h('button', { class: 'unit-head unit-toggle', type: 'button', 'aria-expanded': String(open), onclick: () => { if (open) UI.units.delete(key); else UI.units.add(key); UI.animate = false; render(); } },
        unitSign(u.title, open ? 46 : 36), h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Unit ' + (ui + 1) + ' · ' + (full ? 'done' : 'tested out')), h('h2', null, u.title)),
        open ? null : h('span', { class: 'unit-done' }, ic('check')), ic('chev', 'chev'))
    : h('div', { class: 'unit-head' }, unitSign(u.title, 46), h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Unit ' + (ui + 1) + ' · ' + done + '/' + u.lessons.length), h('h2', null, u.title)));
  sec.append(h('div', { class: 'unit' + (open ? '' : ' compact') }, head,
    open ? stationList(u.lessons, lang) : null,
    open || !(rec && rec.pass) ? checkpointRow(u, lang) : null));
});
```
CSS:
```css
.unit-toggle{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:0;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
.unit-toggle[aria-expanded="true"] .chev{transform:rotate(180deg)}
.unit.compact{padding-top:6px;padding-bottom:6px}
.unit.compact h2{font-size:18px}
.unit-done{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--line);color:var(--surface)}
```
Keep the existing `.unit` and `.unit-head` rules; check that `.unit-head` as a `button` looks the same as the `div` (add `.unit-toggle.unit-head` resets if the browser's button styles show through).

**Steps.**
1. `levelSection()` as above.
2. The CSS.
3. Tests: one block directly **before** `// placement: all right goes to the top`.
4. `npm test` (the existing Learn and checkpoint checks must still pass), `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `route: a finished unit folds into one row`: with every lesson of `COURSE.es.units[0]` done and A1 open, that unit's element has class `compact` and no `.station` that is a lesson (only the checkpoint row while it isn't passed).
  - `route: an unfinished unit stays open`: the first unit with an undone lesson shows all its stations.
  - `route: tapping a folded unit opens it, and tapping again folds it`: click its `.unit-toggle`; it has its lesson stations and `aria-expanded="true"`; click again; folded.
  - `route: the lesson just finished keeps its unit open`: with `UI.justDone` set to a lesson of a finished unit, that unit isn't compact.
  - Existing `Learn shows an open checkpoint` still passes.
- [ ] `node dev/flow.js shots --steps "js:for(const l of coreOrder(S.settings.lang).filter(l=>l.level==='A1'))S.langs[S.settings.lang].done[l.id]={at:today(),acc:1,times:1};UI.open=new Set(['A1','A2']);render();wait:400;full:route"` at 412px: the A1 section is a short list of folded units, and the page is at least 3,000px shorter than before (compare with the same steps on `main`), light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** an existing Learn check fails in a way that would need a station or checkpoint to be hidden while it's still to do.

## Integration

After WP2 is merged (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION` and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`: in "Where things live", add `recap` to the `js/ui/*.js` list. Add a short section after "Resuming a lesson": "**Your week** (`js/ui/recap.js`): a recap of last week (Monday to Sunday) from saved days, lessons, stories and cards, shown on Learn Monday to Wednesday until opened or dismissed (`parlance.recap` in `localStorage`, device-only), and from Me any time. Share uses the system share sheet, or copies the text with the home's link from `FRIENDS.links`."
- [ ] No content changed: no pictures or voices.

## Release notes

- **Title:** Your week
- **Notes:**
  - Every Monday, Learn shows a recap of your last week: XP, goal days, your best day and what's coming up in Review. Share it if you like, or find it any time in Me.
  - Finished units now fold into one line on Learn, so what's next is easier to find. Tap a unit to open it again.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens: the `shots` strings above; also `tab:Learn;shot:learn` on a Monday-like state (`js:localStorage.removeItem('parlance.recap');` with last week's days set as in the recap shot), light and dark, 412px and 360px.
- Spot checks for the reviewer: read every recap string aloud; check that the comparison line never scolds (only the "Down" case adds a nudge, and it's gentle); check that a folded unit never hides an unpassed checkpoint.

## Risks and rollback

- Date math around Sundays and time zones: `mondayOf()` uses the device's local day, like `today()`. The fixed-date tests cover the week boundaries.
- Rollback: `git revert` the merges on `main`, patch release, republish, `latest`.

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** The premium program's four releases are done. Compare the measures in `flow/PREMIUM.md`, "How we'll know it worked", four weeks after P1 shipped.
