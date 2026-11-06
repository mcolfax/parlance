# Play: a sticker book, a speed round, and streak milestones

- **Cycle:** set when promoted (premium program P3, `flow/PREMIUM.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-p3-play.md`, set Release, Base and `approved`)
- **Release:** 4.34.0, or the next free minor when promoted
- **Base:** `main` at promotion time
- **Proposals built:** none
- **Roadmap items:** new R-30, R-31, R-32
- **Needs:** P1 (`practiceTiles()` in `js/ui/review.js`) and P2 (`o.more` in `showComplete()`, the pitch argument of `sfx()`). If either was dropped, the package that needs it adds that small piece itself, exactly as P1 WP3 or P2 WP1/WP2 specify, and says so in its report.

## Why this, why now

Parlance has 581 hand-drawn word pictures in its Sticker style, and learners see each one once, on a new-word card. That's a collection waiting to happen. **The sticker book** (in Me) holds a sticker for every course word with a picture: learning the word collects it, and getting it right three times in a row in Review makes it **shine**. That gives a reason to come back to Review that isn't a chore. The finish screen shows the stickers you just earned. **Speed round** (in Review) is the replayable bit: 60 seconds of quick word questions from your own words, with a personal best per language. **Streak milestones** turn days 7, 14, 30, 50, 100 and 365 into a moment, with new badges for streaks, stickers and speed. Everything is built from saved state that exists already. The only new values are per-language bests in `stats`, which merges by maximum, so nothing new is saved in a way that could clash.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | UX built from course data and cards; uses the `PICS` drawings unchanged (a CSS filter for uncollected ones, a gold ring for shiny ones) | — |
| WP2 | Amber | A new practice game pays XP (capped like a practice session) and keeps a best in `S.stats` (POLICY "XP, streaks, quests, badges") | XP per round ≤ `SPEED.xpCap + XP.review` (15), the same as a practice session; no review card or mistake changes; `stats` keys merge by max (`mergeStats`) |
| WP3 | Amber | New badges and a finish-screen moment (POLICY "new quests and badges are fine") | No badge or streak is taken away; badge count tests updated; the moment only shows when a streak badge is newly earned |

## Work packages

They run **one after another**: WP1, WP2, then WP3 (WP3 counts stickers and speed bests). No worktrees.

### WP1 — The sticker book

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `js/ui/me.js` (new `stickerBook`, `stickerTile`, `stickerCard`, `openStickers`; one call in `viewMe`), `js/ui/runner.js` (the `extra` of the lesson finish in `finishRun`), `js/config.js` (one `STICKERS` line after `PIC_EX`), `styles/art.css` (new `.sticker` rules after the `.pic` rules), `dev/test.js` (one block)
- **Reads first:** `picFor()`, `wordPic()`, the `.pic` rules (`styles/art.css`); `learnedEntries()` in `js/core/engine.js`; `badgesCard()` and `viewMe()` in `js/ui/me.js`; the lesson branch of `finishRun()` (`vocabChips`, `extra`); `openStory()` in `js/ui/stories.js` for the overlay head pattern.
- **Must not touch:** `js/core/pics.js`, `content/pictures.js` (the drawings and the mapping), `js/core/engine.js`.

**Spec.**
- Config: `const STICKERS = { shinyAt: 3, recent: 6 };   // sticker book (Me): a word right this many times running in Review shines; how many recent stickers Me shows`
- In `js/ui/me.js`:
```js
/* ===================== STICKER BOOK =====================
   Every course word with a picture is a sticker. Learning the word collects it; a word that's strong in Review (right
   STICKERS.shinyAt times running, card.n) shines. Built from the course and your cards: nothing new is saved. */
function stickerBook(lang){
  const best = new Map();
  for (const e of learnedEntries(lang, 'v')) best.set(e.item.t, Math.max(best.get(e.item.t) || 0, e.card.n || 0));
  const seen = new Set(), units = [];
  COURSE[lang].units.forEach((u, ui) => {
    const items = [];
    for (const l of u.lessons) for (const v of l.vocab){
      const id = picFor(v, lang); if (!id || seen.has(v.t)) continue; seen.add(v.t);
      const got = best.has(v.t); items.push({ id, v, got, shiny: got && best.get(v.t) >= STICKERS.shinyAt });
    }
    if (items.length) units.push({ u, ui, items });
  });
  const all = units.flatMap(x => x.items);
  return { units, total: all.length, got: all.filter(s => s.got).length, shiny: all.filter(s => s.shiny).length };
}
function stickerTile(s, size, i){
  return h('button', { class: 'sticker' + (s.got ? '' : ' empty') + (s.shiny ? ' shiny' : ''), type: 'button', style: '--i:' + (i || 0), disabled: !s.got,
    'aria-label': s.got ? s.v.t + ', ' + s.v.e[0] + (s.shiny ? ', shiny' : '') : 'Not collected yet',
    onclick: () => { speak(s.v.t, S.settings.lang); toast(s.v.t + ' · ' + s.v.e[0]); } }, wordPic(s.id, size));
}
function stickerCard(){
  const lang = S.settings.lang, b = stickerBook(lang); if (!b.total) return null;
  const recent = b.units.flatMap(x => x.items).filter(s => s.got).slice(-STICKERS.recent);
  return h('section', { class: 'card stickers' },
    h('div', { class: 'row' }, h('h3', null, 'Sticker book'), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, b.got + ' of ' + b.total)),
    recent.length ? h('div', { class: 'sticker-strip' }, recent.map((s, i) => stickerTile(s, 48, i))) : h('p', { class: 'small muted' }, 'Learn a word that has a picture, and its sticker lands here.'),
    h('p', { class: 'small muted' }, b.shiny + ' shiny. A sticker shines once you get its word right ' + STICKERS.shinyAt + ' times in a row in Review.'),
    h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => openStickers() }, 'Open the sticker book'));
}
function openStickers(){
  const lang = S.settings.lang, b = stickerBook(lang);
  openOverlay('stickers');
  OV.head.replaceChildren(h('button', { class: 'icon-btn plain', type: 'button', 'aria-label': 'Close', html: IC.close, onclick: () => { closeOverlay(); UI.animate = true; render(); } }),
    h('div', { class: 'ov-title grow' }, 'Sticker book · ' + b.got + ' of ' + b.total), h('span', { class: 'icon-spacer' }));
  swapBody(h('div', { class: 'sticker-book' }, b.units.map(x => h('section', { class: 'sb-unit' },
    h('div', { class: 'row' }, h('span', { class: 'eyebrow' }, 'Unit ' + (x.ui + 1) + ' · ' + x.u.level), h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, x.items.filter(s => s.got).length + '/' + x.items.length)),
    h('h3', null, x.u.title),
    h('div', { class: 'sticker-grid' }, x.items.map((s, i) => stickerTile(s, 52, i)))))));
  OV.foot.className = 'ov-foot'; OV.footIn.replaceChildren();
}
```
- `viewMe()`: `v.append(stickerCard())` right after `v.append(badgesCard())` (skip if it returns null).
- Finish screen (`finishRun`, lesson branch): split the new words. `const fresh = newItems.filter(Boolean), stick = fresh.map(v => ({ v, id: picFor(v, lang) })).filter(x => x.id).slice(0, STICKERS.recent);`. `extra` becomes a fragment of two blocks: when `stick.length`, `h('div', { class: 'learned' }, h('span', { class: 'eyebrow' }, 'New ' + plural(stick.length, 'sticker')), h('div', { class: 'sticker-strip center' }, stick.map((x, i) => stickerTile({ id: x.id, v: x.v, got: true, shiny: false }, 48, i))))`; then the existing "Added to your review deck" chips block, unchanged. Pass both in an array; if `showComplete` takes a single node, wrap them in `h('div', null, …)`.
- CSS in `styles/art.css`, after the `.pic` rules:
```css
/* Sticker book (Me) and new stickers (finish screen) */
.sticker{position:relative;display:inline-grid;place-items:center;padding:0;background:none;border:0;cursor:pointer;animation:pop .45s var(--spring) both;animation-delay:calc(var(--i, 0) * 50ms)}
.sticker[disabled]{cursor:default}
.sticker.empty .pic{filter:grayscale(1);opacity:.22}
.sticker.shiny .pic{box-shadow:0 0 0 3px var(--gold),0 0 14px var(--gold)}
.sticker.shiny::after{content:"";position:absolute;inset:0;border-radius:var(--r-md);background:linear-gradient(115deg,transparent 40%,var(--surface) 50%,transparent 60%);background-size:250% 100%;opacity:.7;pointer-events:none;animation:stickerShine 3.2s linear infinite}
@keyframes stickerShine{from{background-position:150% 0}to{background-position:-100% 0}}
.sticker-strip{display:flex;flex-wrap:wrap;gap:10px}
.sticker-strip.center{justify-content:center}
.sticker-book{display:flex;flex-direction:column;gap:22px}
.sticker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:10px;justify-items:center}
@media (prefers-reduced-motion:reduce){.sticker{animation:none}.sticker.shiny::after{animation:none}}
```
If `pop` isn't a keyframe the stylesheets define, drop the `.sticker` animation lines.

**Steps.**
1. `STICKERS` in `js/config.js`.
2. The me.js functions and the `viewMe` call.
3. The finish-screen stickers.
4. The CSS.
5. Tests: one block directly **before** `// placement: all right goes to the top`.
6. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `stickers: one sticker per pictured course word`: `stickerBook('es').total` equals the number of distinct vocab texts in `COURSE.es` with `picFor(v, 'es')`; same for de and it.
  - `stickers: learning a word collects it`: `stickerBook('es').got` equals the number of distinct learned vocab texts that have a picture.
  - `stickers: a strong word shines`: set one pictured word's card to `n: 3`; its sticker has `shiny: true`, and with `n: 2`, not.
  - `stickers: Me shows the book and it opens`: Me has `.stickers`; clicking `Open the sticker book` opens `.overlay.stickers` with `total` `.sticker` elements, `got` of them enabled.
  - `stickers: the finish screen shows new stickers`: finishing `es-3-1` (food, every word pictured) shows at least one `.sticker` under `New stickers`.
  - `stickers: nothing is saved`: `JSON.stringify(S.langs.es)` is the same before and after opening and closing the book.
- [ ] `node dev/flow.js shots --steps "js:for(const l of coreOrder(S.settings.lang).slice(0,12))l.vocab.forEach((_,i)=>{S.langs[S.settings.lang].cards[itemKey(l,'v',i)]={ef:2.5,n:i%2?3:1,iv:1,due:today(),last:today(),ts:1}});tab:Me;wait:500;scroll:1600;shot:me-stickers;js:openStickers();wait:800;shot:sticker-book"` shows the card and the book (collected, shiny and faint stickers), light and dark, 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a sticker needs a change to a drawing or to `wordPic()` to look right (the drawings are Matt's call).

### WP2 — Speed round

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** new `js/ui/speed.js`; `index.html` (one script tag, directly after `js/ui/review.js`); `js/ui/review.js` (one `practiceTiles()` entry); `js/core/util.js` (`busy()` and one `IC` entry); `js/config.js` (one `SPEED` line after `STICKERS`); `styles/components.css` (new `.speed` rules); `dev/test.js` (one block)
- **Reads first:** `learnedEntries()`, `addXP()`, `bumpQuest()`, `questSnapshot()`, `questDiff()`, `checkBadges()` in `js/core/engine.js`; `showComplete()` (with `o.more`), `options()` and `endRun()` in `js/ui/runner.js`; `openOverlay()`, `closeOverlay()`, `swapBody()` in `js/ui/shell.js`; `busy()` in `js/core/util.js`; `practiceTiles()` in `js/ui/review.js`.
- **Must not touch:** `js/core/engine.js`, `js/ui/runner.js` (call its functions; don't change them).

**Spec.**
- Config: `const SPEED = { secs: 60, min: 8, xpCap: 12, rightMs: 220, wrongMs: 650 };   // speed round (Review): seconds, fewest learned words, most XP from answers, pause after a right and a wrong answer`
- Icon (`IC`): `bolt: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/></svg>',`
- `busy()`: add `|| (typeof Speed !== 'undefined' && Speed.open)`.
- Review tile, inserted after `weak`: `{ id: 'speed', icon: 'bolt', label: 'Speed round', sub: S.stats['speed-' + lang] ? 'Best: ' + S.stats['speed-' + lang] : '60 seconds. Go!', show: speedPool(lang).length >= SPEED.min, run: () => startSpeed() },`
- `js/ui/speed.js`:
```js
"use strict";
/* ===================== SPEED ROUND (Review) =====================
   60 seconds of quick word questions from your own learned words, alternating "what does it mean" and "how do you say it".
   Your best per language is S.stats['speed-<lang>'] (stats merge by maximum). It never moves a review card; its XP is capped
   like a practice session's (SPEED.xpCap per round, plus XP.review). */
const Speed = { open: false };
function speedPool(lang){
  const seen = new Set(), out = [];
  for (const e of learnedEntries(lang, 'v')){ const t = e.item.t, en = (e.item.e || [])[0]; if (!t || !en || seen.has(t)) continue; seen.add(t); out.push({ t, en, item: e.item }); }
  return out;
}
function speedQ(pool, n, recent){
  const fresh = pool.filter(x => !recent.includes(x.t)), it = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  const toEn = n % 2 === 0, k = x => fold(norm(x.en, 'en'));
  const others = []; for (const x of shuffle(pool.slice())){ if (others.length === 3) break; if (x.t !== it.t && k(x) !== k(it) && !others.some(o => k(o) === k(x))) others.push(x); }
  const opts = shuffle([it, ...others]);
  return { it, toEn, prompt: toEn ? it.t : it.en, options: opts.map(o => toEn ? o.en : o.t), correct: toEn ? it.en : it.t };
}
```
  plus `startSpeed()`, `speedNext()`, `speedPick(o, btn)`, `speedTick()`, `speedEnd()`, `endSpeed()`, with this behavior:
  - `startSpeed()`: `pool = speedPool(lang)`; if under `SPEED.min`, return. `Object.assign(Speed, { open: true, lang, pool, n: 0, score: 0, answered: 0, combo: 0, bestCombo: 0, recent: [], locked: false, ends: Date.now() + SPEED.secs * 1000, before: questSnapshot() })`; `openOverlay('speed')`; head: close button (`IC.close`, `Close`, runs `endSpeed`), a timer bar `h('div', { class: 'progress speed-time' }, Speed.bar = h('i'))` and `Speed.secsEl = h('span', { class: 'speed-secs' })`; `sfx('open')`; `speedNext()`; `Speed.timer = setInterval(speedTick, 100)`.
  - `speedTick()`: `left = Speed.ends - Date.now()`; set `Speed.bar.style.width` to `left / (SPEED.secs * 1000)` as a percent, `Speed.secsEl.textContent = Math.ceil(left / 1000)`; at `left <= 0`, `speedEnd()`. When `document.hidden`, keep `Speed.left = left`, `clearInterval`, and on `visibilitychange` back to visible show the body `h('div', { class: 'speed paused' }, h('h2', null, 'Paused'), …)` with a primary `Resume` button that sets `Speed.ends = Date.now() + Speed.left` and restarts the interval.
  - `speedNext()`: `Speed.q = speedQ(Speed.pool, Speed.n++, Speed.recent)`; push its word into `recent` (keep the last 5); `swapBody(h('div', { class: 'speed' }, h('div', { class: 'row speed-top' }, h('span', { class: 'speed-score' }, 'Score ' + Speed.score), Speed.combo >= 3 ? h('span', { class: 'speed-combo' }, Speed.combo + ' in a row') : null), h('div', { class: 'prompt speed-prompt', lang: q.toEn ? LANGS[lang].tts : 'en' }, q.prompt), options(q.options, o => speedPick(o), null, { cls: 'speed' })), true)` (`still: true`, so the cards don't slide). If `q.toEn` and `S.settings.autoplay`, `speak(q.it.t, lang)`.
  - `speedPick(o)`: if `Speed.locked`, return; `locked = true`; `answered++`; the tapped `.opt` is the one with class `sel`. Right (`o === q.correct`): `score++`, `combo++`, `bestCombo = max`, `sel` → `right`, `sfx('ok', 1, Math.pow(2, Math.min(Speed.combo - 1, 7) / 12))`, `haptic(8)`, then after `SPEED.rightMs` `locked = false; speedNext()`. Wrong: `combo = 0`, `sel` → `wrong`, the right option gets `right`, `sfx('bad')`, `haptic([18, 40, 18])`, then after `SPEED.wrongMs` the same.
  - `speedEnd()`: `clearInterval(Speed.timer)`; `const key = 'speed-' + Speed.lang, best = S.stats[key] || 0, isBest = Speed.score > best;` if `Speed.score`, `S.stats[key] = Math.max(best, Speed.score)`; `xp = Speed.score ? Math.min(Speed.score, SPEED.xpCap) + XP.review : 0`; `if (xp) addXP(xp, Speed.lang)`; `bumpQuest('reviews', Speed.answered); bumpQuest('combo', Speed.bestCombo, true); S.stats.bestCombo = Math.max(S.stats.bestCombo || 0, Speed.bestCombo);` `const badges = checkBadges({ practiced: true }), quests = questDiff(Speed.before); touch('core');` then `showComplete({ lang: Speed.lang, top: 'Speed round', title: Speed.score + ' right', gold: isBest && Speed.score > 0, xp, acc: Speed.answered ? Speed.score / Speed.answered : 0, accLabel: 'right', h1: isBest && Speed.score ? 'New best!' : 'Time!', sub: isBest && Speed.score ? 'Your best speed round in ' + LANGS[Speed.lang].name + ' so far.' : 'Your best is ' + best + '.', third: [Speed.bestCombo, 'best run in a row'], badges, quests, more: [{ id: 'again', label: 'Play again', run: () => startSpeed() }], onDone: () => endSpeed() })`.
  - `endSpeed()`: `clearInterval(Speed.timer); Speed.open = false; closeOverlay(); UI.animate = true; render();`.
- CSS (`styles/components.css`):
```css
/* Speed round */
.speed{display:flex;flex-direction:column;gap:16px}
.speed-top{justify-content:space-between}
.speed-score{font:800 20px var(--display);color:var(--ink)}
.speed-combo{font-weight:700;color:var(--flame)}
.speed-prompt{font:800 clamp(26px,8vw,36px)/1.15 var(--display);text-align:center;padding:18px 0;overflow-wrap:anywhere}
.opts.speed{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.opts.speed .opt{min-height:72px}
.speed-time{margin:0 10px}
.speed-secs{min-width:28px;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
```

**Steps.**
1. `SPEED` (config), `bolt` and `busy()` (util).
2. `js/ui/speed.js`, the `index.html` tag, the Review tile.
3. The CSS.
4. Tests: one block directly **before** `// placement: all right goes to the top`. Drive it with `speedPick(Speed.q.correct)` / a wrong option and `speedEnd()`; don't wait 60 seconds.
5. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `speed: needs 8 learned words`: the tile shows exactly when `speedPool(lang).length >= 8`; `startSpeed()` with fewer leaves `Speed.open` false.
  - `speed: every question is fair`: 50 calls of `speedQ` give 4 distinct options containing `correct`, with no two English options the same after `fold(norm())`.
  - `speed: right answers score, wrong ones break the run`: two right then one wrong → `score === 2`, `combo === 0`, `bestCombo === 2`.
  - `speed: the best is kept and XP is capped`: with `Speed.score = 20` before `speedEnd()`, `S.stats['speed-es'] === 20` and the language's XP rose by exactly `SPEED.xpCap + XP.review`; a later round of 5 leaves the best at 20.
  - `speed: no review card or mistake changes`: `S.langs.es.cards` and `.miss` are unchanged by a round.
  - `speed: Play again and Close`: `[data-more="again"]` starts a new round; Close ends it, `Speed.open === false`, `busy() === false`.
- [ ] `node dev/flow.js shots --steps "js:for(const l of coreOrder(S.settings.lang).slice(0,4))l.vocab.forEach((_,i)=>{S.langs[S.settings.lang].cards[itemKey(l,'v',i)]={ef:2.5,n:1,iv:1,due:today(),last:today(),ts:1}});tab:Review;wait:400;sel:[data-practice=speed];wait:700;shot:speed"` shows the timer, score, prompt and a 2 × 2 grid with no sideways scroll, light and dark, 412px and 360px.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** the round can't end without changing `showComplete()` beyond using `o.more`.

### WP3 — Streak milestones and new badges

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP2
- **Owns (may edit):** `js/config.js` (`BADGES`), `js/core/engine.js` (`checkBadges`), `js/ui/runner.js` (`showComplete`: the milestone moment), `dev/test.js` (badge counts and one block)
- **Reads first:** `BADGES` in `js/config.js`; `checkBadges()` in `js/core/engine.js`; `BADGE_ART` names in `js/core/art.js` (`flag flame book chat star bolt abc stack sun moon globe chest mountain target people duel heart`); `showComplete()`; `stickerBook()` (WP1) and `S.stats['speed-<lang>']` (WP2); every check in `dev/test.js` that counts badges (search `BADGES.length` and `of 27`).
- **Must not touch:** existing badges' ids, names or rules.

**Spec.**
- New `BADGES` entries. `streak14` goes between `streak7` and `streak30`; `streak50`, `streak100` and `streak365` go right after `streak30`, in that order; the other three go right after `forms50`:
```js
{ id: 'streak14', icon: 'flame', name: 'Two weeks strong', desc: 'Keep a 14-day streak.' },
{ id: 'streak50', icon: 'flame', name: 'Fifty days', desc: 'Keep a 50-day streak.' },
{ id: 'streak100', icon: 'mountain', name: 'Hundred club', desc: 'Keep a 100-day streak.' },
{ id: 'streak365', icon: 'sun', name: 'A whole year', desc: 'Keep a 365-day streak.' },
{ id: 'stickers50', icon: 'star', name: 'Sticker collector', desc: 'Collect 50 stickers in one language.' },
{ id: 'shiny25', icon: 'star', name: 'All that glitters', desc: 'Make 25 stickers shine in one language.' },
{ id: 'speed20', icon: 'bolt', name: 'Quick thinker', desc: 'Score 20 in a speed round.' },
```
- `checkBadges()`: `if (st >= 14) award('streak14'); if (st >= 50) award('streak50'); if (st >= 100) award('streak100'); if (st >= 365) award('streak365');` beside the existing streak lines. `if (typeof stickerBook === 'function'){ const sb = both.map(l => stickerBook(l)); if (sb.some(b => b.got >= 50)) award('stickers50'); if (sb.some(b => b.shiny >= 25)) award('shiny25'); }`. `if (both.some(l => (S.stats['speed-' + l] || 0) >= 20)) award('speed20');`.
- The milestone moment, in `showComplete(o)`: `const ms = (o.badges || []).filter(id => /^streak\d+$/.test(id)).pop();`. When `ms` is set: the stamp is gold (`o.gold || !!ms`), the bird's mood is `'fly'` (instead of dance or cheer), the confetti count is 180, and `h1` becomes `st.count + ' days in a row!'` (keep `o.h1` as the `sub` when there was no `o.sub`, otherwise keep `o.sub`). Everything else is unchanged. The badge strip already shows the new badge.

**Steps.**
1. `BADGES`.
2. `checkBadges()`.
3. The milestone moment in `showComplete()`.
4. `dev/test.js`: update every badge count (27 → 34) and add one block directly **before** `// placement: all right goes to the top`.
5. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `badges: 34 badges, the old ones unchanged`: `BADGES.length === 34`, and the first 27 ids in their old relative order (filtering out the new ids) equal the old list.
  - `badges: streak milestones`: with `S.days` holding 14 met days in a row ending today, `checkBadges({})` awards `streak14` and not `streak50`.
  - `badges: stickers and speed`: with 50 pictured Spanish words learned, `stickers50`; with `S.stats['speed-es'] = 20`, `speed20`.
  - `milestone: a new streak badge is a moment`: `showComplete` with `badges: ['streak7']` renders a gold stamp, the `fly` bird and `days in a row!` in the `h1`.
- [ ] `node dev/flow.js shots --steps "tab:Me;wait:400;scroll:1400;shot:badges"` shows 34 badges laid out without overflow, light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a badge count is checked somewhere the tests can't reach (report the file).

## Integration

After WP3 (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION` and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`: in "Where things live", `speed` joins the `js/ui/*.js` list; in "Word pictures", a bullet: "**The sticker book** (Me, `stickerBook()` in `js/ui/me.js`): every course word with a picture is a sticker, collected by learning the word and shiny when its card has `n >= STICKERS.shinyAt`. Nothing is saved for it." In "Practice beyond lessons", a bullet: "**Speed round** (`js/ui/speed.js`, `SPEED`): 60 seconds of word questions from learned words; best per language in `S.stats['speed-<lang>']`; XP capped like a practice session; no review cards."
- [ ] No content changed: no pictures to draw, no voices to record.

## Release notes

- **Title:** Time to play
- **Notes:**
  - Collect stickers: every word with a picture you learn goes into your sticker book in Me, and words you know well shine.
  - New in Review: Speed round. Sixty seconds, your own words, and a best score to beat.
  - Streaks of 7, 14, 30, 50, 100 and 365 days now get a moment of their own, with seven new badges to earn.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens: the `shots` strings above, light and dark, 412px and 360px.
- Spot checks for the reviewer: play two speed rounds with sound on; open the sticker book for each language and check that a faint (uncollected) sticker still reads as a picture, not a grey smudge, in dark mode. If it doesn't, change `.sticker.empty .pic` opacity only. Confirm XP per speed round never exceeds 15.

## Risks and rollback

- XP farming with repeated speed rounds: capped per round like any practice session, and the daily goal still needs real answers.
- The badge list grows: `badgesCard()` wraps; the screenshot check covers it.
- Rollback: `git revert` the merges on `main`, patch release, republish, `latest`. Earned new badges stay in saves (unknown ids are kept and simply not shown by older code).

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p4-listen-hands-free.md`.
