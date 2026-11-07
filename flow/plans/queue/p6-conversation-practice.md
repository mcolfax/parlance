# Conversation practice: choose the reply, and put a conversation in order

- **Cycle:** set when promoted (premium program P6, `flow/PREMIUM.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-p6-conversation-practice.md`, set Release, Base and `approved`)
- **Release:** 4.37.0, or the next free minor when promoted
- **Base:** `main` at promotion time
- **Proposals built:** none. Answers idea note fmv58xfx9pqsf (tutor features outside Claude) in a way that needs no tutor.
- **Roadmap items:** R-4, R-8
- **Needs:** P1's `practiceTiles()` for the Review tile. If it isn't there, WP2 skips the Review tile and says so in its report.

## Why this, why now

The web version has no tutor, so web learners never practice a conversation inside Parlance: Talk sends them to other apps (0 of 8 web learners have used Talk). The stories are dialogues with recorded voices, and their lines are graded data already. Two new exercise types, built only from stories the learner has read, give them conversation practice that works offline, without Claude and without a microphone. **Choose the reply**: hear a line, pick what the other person said next from three. **Put the conversation in order**: the first line is given, and you tap the next three or four in order. They run as one short session, **Conversations**, from Stories, Review and (on the web) Talk.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New exercise types that work offline, without the tutor or a microphone, on the web; graded by `evaluate()` with tests; they change no review card, XP rule or streak (POLICY "New exercise types") | — |
| WP2 | Green | UX: entry points inside the Selva look | — |

## Work packages

WP2 runs **after** WP1 (it calls `startConvo()` and `convoReadStories()`).

### WP1 — The exercises and the session

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `js/core/engine.js` (a new "Conversation practice" section, and two `case`s in `evaluate()`), `js/ui/runner.js` (`RENDER.reply`, `RENDER.order`, new `startConvo()`, `feedbackAnswer()`, one addition each in `showFeedback()` and `finishRun()`), `js/config.js` (one new `CONVO` line after `CHECKPOINT`), `styles/components.css` (new `.co-*` rules), `dev/test.js` (one block)
- **Reads first:** `genderEx()`, `genderGrade()` and `evaluate()` in `js/core/engine.js` (the model for an exercise with no review key); `beginSession()`, `startGenders()`, `nextEx()`, `RENDER.match`, `RENDER.gender`, `options()`, `feedbackAnswer()`, `showFeedback()`, `finishRun()` in `js/ui/runner.js`; `storyLine()` in `js/ui/stories.js` (the speech-bubble markup); `ST()` in `js/core/content.js` (story items are `{ who, t, e }` or `{ q, o }`).
- **Must not touch:** `js/ui/stories.js`, `js/ui/talk.js`, `js/ui/review.js`, story content.

**Spec.**

*Config* (`js/config.js`, after `CHECKPOINT`):
```js
/* Conversation practice (Stories, Review, Talk on the web): from the built-in stories you've read. replies and orders per session;
   minWords: shortest line used as a reply or a wrong option; min: fewest questions for a session */
const CONVO = { replies: 6, orders: 2, minWords: 3, min: 4 };
```

*Engine* (`js/core/engine.js`, a new section after article practice):
```js
/* ===================== CONVERSATION PRACTICE =====================
   Built from the built-in stories a learner has read (live-pack stories aren't used). No review key and no srs:
   like article practice, it never moves a review card or lands on "Fix my mistakes". */
function convoLines(st){ return st.items.filter(it => it.who); }
function convoWords(t){ return String(t).trim().split(/\s+/).length; }
function convoReadStories(lang){ const read = S.langs[lang].stories || {}; return STORIES.filter(s => s.lang === lang && read[s.id]); }
/* a line and the next one, said by someone else */
function convoReplies(st){
  const ls = convoLines(st), out = [];
  for (let i = 0; i + 1 < ls.length; i++) if (ls[i].who !== ls[i + 1].who && convoWords(ls[i + 1].t) >= CONVO.minWords) out.push({ st, a: ls[i], b: ls[i + 1] });
  return out;
}
/* "Choose the reply": the real reply and two lines from other stories (never the same text or the same first word) */
function replyEx(p, lang){
  const key = t => fold(norm(t, lang)), right = key(p.b.t), first = right.split(' ')[0];
  const pool = shuffle(STORIES.filter(s => s.lang === lang && s.id !== p.st.id).flatMap(convoLines)
    .filter(l => convoWords(l.t) >= CONVO.minWords && key(l.t) !== right && key(l.t).split(' ')[0] !== first));
  const ds = [];
  for (const l of pool){ if (ds.length === 2) break; if (!ds.some(d => key(d.t) === key(l.t))) ds.push(l); }
  if (ds.length < 2) return null;
  const opts = shuffle([p.b, ...ds]);
  return { id: ++EXID, type: 'reply', lang, lesson: null, story: p.st.id, prompt: p.a, item: { t: p.b.t, e: [p.b.e], alt: [], who: p.b.who },
    correct: p.b.t, options: opts.map(o => o.t), en: Object.fromEntries(opts.map(o => [o.t, o.e])) };
}
/* "Put the conversation in order": n lines in a row, with at least two speakers; the first stays put, the rest are shuffled (never already in order) */
function orderEx(st, start, n, lang){
  const ls = convoLines(st).slice(start, start + n);
  if (ls.length < n || new Set(ls.map(l => l.who)).size < 2) return null;
  const want = ls.slice(1).map((_, i) => i + 1);
  let tiles = shuffle(want.slice());
  if (tiles.join() === want.join()) tiles = tiles.slice(1).concat(tiles[0]);
  return { id: ++EXID, type: 'order', lang, lesson: null, story: st.id, lines: ls, tiles, correct: want.join(',') };
}
/* a session: two replies, then an order, and so on */
function convoSession(lang){
  const sts = convoReadStories(lang); if (!sts.length) return [];
  const replies = shuffle(sts.flatMap(convoReplies)).slice(0, CONVO.replies * 3).map(p => replyEx(p, lang)).filter(Boolean).slice(0, CONVO.replies);
  const orders = [];
  for (const st of shuffle(sts.slice())){
    if (orders.length >= CONVO.orders) break;
    const n = LEVELS.indexOf(st.level) <= 1 ? 4 : 5, max = convoLines(st).length - n; if (max < 0) continue;
    const ex = orderEx(st, Math.floor(Math.random() * (max + 1)), n, lang); if (ex) orders.push(ex);
  }
  const out = []; let r = 0, o = 0;
  while (r < replies.length || o < orders.length){ for (let k = 0; k < 2 && r < replies.length; k++) out.push(replies[r++]); if (o < orders.length) out.push(orders[o++]); }
  return out;
}
```
In `evaluate()`, before `default:`:
```js
case 'reply': { const ok = value === ex.correct; return { ok, level: ok ? 'exact' : 'wrong' }; }
case 'order': { const ok = value === ex.correct; return ok ? { ok, level: 'exact' } : { ok, level: 'wrong', note: 'Here’s how the conversation goes.' }; }
```

*Runner* (`js/ui/runner.js`):
- `startConvo()` (after `startGenders()`): `const lang = S.settings.lang, q = convoSession(lang); if (q.length < CONVO.min){ toast('Read a story first, then practice its conversations here.'); return; } beginSession('convo', lang, q);`
- `feedbackAnswer(ex)`: first lines `if (ex.type === 'order') return null;` and `if (ex.type === 'reply') return { t: ex.item.t, en: ex.item.e[0], target: true };`.
- `showFeedback()`: right after `const fb = …` is built: `if (ex.type === 'order' && !res.ok) fb.append(h('ol', { class: 'co-answer' }, ex.lines.map(l => h('li', null, h('b', null, CAST[l.who].name + ': '), h('span', { lang: LANGS[lang].tts }, l.t)))));`. In the autoplay line at the end and in the `speakBtn(ans.t, lang)` call, pass the speaker's voice for a reply: `ex.type === 'reply' ? CAST[ex.item.who] : undefined` as the voice argument (`speak(…, lang, false, vo)`, `speakBtn(ans.t, lang, null, vo)`).
- `finishRun()`'s practice branch: add `Run.mode === 'convo' ? 'Conversation practiced' :` to the `top` chain, before the final `'Practice complete'`.
- `RENDER.reply` and `RENDER.order` (after `gender`):
```js
reply(ex, api){
  const lang = ex.lang, vo = CAST[ex.prompt.who];
  if (S.settings.autoplay) Run.sayTimer = setTimeout(() => { if (Run.cur === ex) speak(ex.prompt.t, lang, false, vo); }, 250);
  return h('div', { class: 'ex' }, qLabel('Choose the reply'),
    h('div', { class: 'sline l co-prompt' }, avatar(ex.prompt.who, 40, 'sl-av'),
      h('div', { class: 'bubble' }, h('span', { class: 'who' }, vo.name), h('div', { class: 't' }, sayText(ex.prompt.t, lang, { gloss: true, en: ex.prompt.e })),
        h('div', { class: 'sl-act' }, speakBtn(ex.prompt.t, lang, 'Play line', vo)))),
    h('p', { class: 'muted' }, 'What does ' + CAST[ex.item.who].name + ' say next?'),
    options(ex.options, o => { api.set(o); api.ready(true); speak(o, lang, false, CAST[ex.item.who]); }, o => h('span', { lang: LANGS[lang].tts }, o)));
},
order(ex, api){
  const lang = ex.lang, placed = [];
  const line = l => h('span', { class: 'co-line' }, avatar(l.who, 28), h('span', { class: 'co-t', lang: LANGS[lang].tts }, l.t));
  const list = h('ol', { class: 'co-list' }), pool = h('div', { class: 'co-pool' });
  const draw = () => {
    list.replaceChildren(h('li', { class: 'co-fixed' }, line(ex.lines[0])), ...placed.map(i => h('li', null,
      h('button', { class: 'co-btn placed', type: 'button', 'aria-label': 'Take back: ' + ex.lines[i].t, onclick: () => { placed.splice(placed.indexOf(i), 1); sfx('drop'); draw(); } }, line(ex.lines[i])))));
    pool.replaceChildren(...ex.tiles.filter(i => !placed.includes(i)).map(i => h('button', { class: 'co-btn', type: 'button', onclick: () => { placed.push(i); sfx('pick'); speak(ex.lines[i].t, lang, false, CAST[ex.lines[i].who]); draw(); } }, line(ex.lines[i]))));
    api.set(placed.join(',')); api.ready(placed.length === ex.lines.length - 1);
  };
  draw();
  return h('div', { class: 'ex' }, qLabel('Put the conversation in order'), h('p', { class: 'muted' }, 'Tap the lines in the order they’re said.'), list, pool);
}
```
*CSS* (`styles/components.css`, with the exercise rules):
```css
/* Conversation practice */
.co-prompt{margin:4px 0 6px}
.co-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;counter-reset:co}
.co-list li{display:flex;align-items:flex-start;gap:8px;counter-increment:co}
.co-list li::before{content:counter(co);flex:none;width:22px;padding-top:12px;font-weight:700;color:var(--muted);text-align:right}
.co-pool{display:flex;flex-direction:column;gap:8px;margin-top:14px;padding-top:14px;border-top:2px dashed var(--hair)}
.co-btn,.co-fixed .co-line{display:flex;width:100%;padding:10px 12px;border-radius:var(--r-md);background:var(--surface);border:2px solid var(--hair);color:var(--ink);font:inherit;text-align:left}
.co-btn{cursor:pointer;box-shadow:0 3px 0 var(--hair)}
.co-btn.placed{border-color:var(--line)}
.co-fixed .co-line{background:var(--bg)}
.co-line{display:flex;align-items:flex-start;gap:10px;min-width:0}
.co-t{flex:1;min-width:0;line-height:1.35;overflow-wrap:anywhere}
.co-answer{margin:6px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:4px;text-align:left}
```
*Edge cases.* No story read: `convoSession()` is `[]` and `startConvo()` shows the toast. A reply's prompt is the line before it in the story, so a learner who has read it can recall the context. Live-pack stories are excluded (unchecked text). The second try of a wrong item gets its options and tiles reshuffled by `showFeedback()` as for any exercise. `Run.mode === 'convo'` writes no `done`, no `cards`, no `miss`; it pays `XP.perAnswer` per right first answer and `XP.review` at the end, and counts toward the "Review or practice 10 items" quest, like other practice.

**Steps.**
1. `CONVO` in `js/config.js`.
2. The engine section and the two `evaluate()` cases.
3. The runner changes and the two renderers.
4. The CSS.
5. Tests: one block in `dev/test.js` directly **before** the line containing `// placement: all right goes to the top`. Mark `es-s1` and `es-s2` read in `S.langs.es.stories` at its start.
6. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `conversation: no stories read, no session`: with `S.langs.it.stories = {}`, `convoSession('it').length === 0`.
  - `conversation: replies come from read stories, with two options from other stories`: every `reply` in `convoSession('es')` has 3 distinct options including `correct`; `correct` is a line of its `story`; the other two are lines of other Spanish stories.
  - `conversation: no wrong option matches the reply` (all languages): for every built-in story and every pair from `convoReplies()`, when `replyEx()` returns an exercise, no wrong option has the same `fold(norm())` text or first word as the reply.
  - `conversation: an order question starts out of order, with two speakers`: every `order` exercise has `tiles` not in ascending order, `correct` equal to `1,2,…,n-1`, and at least two distinct `who` in `lines`.
  - `conversation: grading`: `evaluate(reply, reply.correct).ok`; a wrong option is not ok; `evaluate(order, order.correct).ok`; a wrong order is not ok and its note is `Here’s how the conversation goes.`
  - `conversation: a session runs to the end and moves no cards`: `startConvo()`, answer every exercise right (`Run.value = ex.correct; Run.canCheck = true; doCheck()` then Continue); `Run.mode === 'convo'`, the finish screen contains `Conversation practiced`, and `S.langs.es.cards` and `S.langs.es.miss` are unchanged.
  - `conversation: a wrong order shows the right one`: answer an order exercise with its tiles in shown order (wrong); the feedback contains `.co-answer` with `lines.length` items.
- [ ] `node dev/flow.js shots --steps "js:S.langs[S.settings.lang].stories[S.settings.lang+'-s1']={at:today(),score:1,times:1};startConvo();wait:900;shot:convo-1"` and the same with `js:Run.pos=2;nextEx();wait:600;shot:convo-order` after it: both screens fit at 412px and 360px with no sideways scroll, light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** a language has a story whose lines produce fewer than 4 questions for a learner who read only that story (report which; don't change the story); or grading needs anything beyond exact matching.

### WP2 — Where you find it

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 is merged
- **Owns (may edit):** `js/ui/stories.js` (`viewStories`), `js/ui/talk.js` (`webTalk`), `js/ui/review.js` (one entry in `practiceTiles()`), `styles/features.css` (one `.convo-card` rule near the stories rules), `dev/test.js` (one block)
- **Reads first:** `viewStories()` in `js/ui/stories.js`; `webTalk()` in `js/ui/talk.js`; `practiceTiles()` in `js/ui/review.js`; `startConvo()`, `convoReadStories()` from WP1.
- **Must not touch:** `js/core/*`, `js/ui/runner.js`.

**Spec.**
- **Stories tab.** In `viewStories()`, after the "N of 9 read" row and before the grid, when `convoReadStories(lang).length > 0`:
```js
h('section', { class: 'card convo-card' },
  h('h3', null, 'Practice the conversations'),
  h('p', { class: 'small muted' }, 'Choose the right reply and put lines in order, from the stories you’ve read.'),
  h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => startConvo() }, ic('talk'), 'Practice conversations'))
```
- **Talk on the web.** In `webTalk()`, right after the notice and the Open in Claude field, append a `card convo-card` with the title `Practice without the tutor`. When `convoReadStories(lang).length > 0`: text `Choose the right reply and put lines in order, from the stories you’ve read. It works right here, no tutor needed.` and the `Practice conversations` button as above. Otherwise: text `Read a story, then practice its conversations here.` and `h('button', { class: 'btn btn-quiet btn-wide', type: 'button', onclick: () => { UI.tab = 'stories'; UI.animate = true; render(); window.scrollTo(0, 0); } }, ic('stories'), 'Go to Stories')`.
- **Review.** In `practiceTiles()`, after the `listen` entry if it exists, otherwise after `weak`: `{ id: 'convo', icon: 'talk', label: 'Conversations', sub: 'From stories you’ve read', show: convoReadStories(lang).length > 0, run: () => startConvo() }`.
- CSS (`styles/features.css`): `.convo-card .btn{margin-top:4px}`.

**Steps.**
1. The three entry points.
2. The CSS rule.
3. Tests: one block directly **before** `// placement: all right goes to the top` for Stories and Review; for Talk, add checks next to the existing web Talk checks (search `dev/test.js` for `The tutor runs on Claude` or `webTalk`).
4. `npm test`, `node dev/flow.js guard`, commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with these new checks:
  - `conversation entry: Stories shows the card once a story is read`: absent with no story read; present after one; its button starts a `convo` session.
  - `conversation entry: Review has a Conversations tile once a story is read`: `[data-practice="convo"]`.
  - `conversation entry: web Talk offers practice without the tutor`: on the web page, the Talk tab contains `Practice without the tutor`; with no story read its button reads `Go to Stories`.
- [ ] `node dev/flow.js shots --steps "js:S.langs[S.settings.lang].stories[S.settings.lang+'-s1']={at:today(),score:1,times:1};tab:Stories;wait:400;shot:stories-convo"` fits at 412px and 360px, light and dark.
- [ ] `node dev/flow.js guard`: no STOP, no FIX.

**Stop and report if:** `webTalk()` isn't reachable in the tests' web page (report it; don't add a new test harness).

## Integration

After WP2 is merged (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION` and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`, "Practice beyond lessons": a new bullet: "**Conversation practice** (`CONVO` in `config.js`; `convoReplies()`, `replyEx()`, `orderEx()`, `convoSession()` in `engine.js`; `startConvo()` and `RENDER.reply`/`RENDER.order` in `runner.js`): from the built-in stories a learner has read, *Choose the reply* (the real next line and two lines from other stories) and *Put the conversation in order* (the first line fixed). No review key, no mistakes list; XP like other practice. Offered in Stories, Review and, on the web, Talk."
- [ ] `node design/pictures/tools.js check` isn't needed (no content). `node dev/voices.js --dry`: 0 lines (story lines are already recorded).

## Release notes

- **Title:** Conversation practice
- **Notes:**
  - Practice real conversations, no tutor needed: choose the right reply, and put a conversation back in order. It's built from the stories you've read.
  - Find it in Stories and Review, and in Talk on the web version.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX).
- Screens: the `shots` strings above, light and dark, 412px and 360px.
- Spot checks for the reviewer: print every reply question for one read story per language (a throwaway node script that loads the app the way `dev/test.js` does, marks `<lang>-s1` read and logs `convoSession(lang).filter(x => x.type === 'reply').map(x => [x.prompt.t, x.options])` ten times), and read the options as a learner: a wrong option should never be a plausible answer to the prompt. If one is, the FIX round adds `never: [<texts>]` to `CONVO` and `replyEx()` skips those texts as wrong options.

## Risks and rollback

- A wrong option that happens to fit the prompt would be unfair. The "same first word" filter, the three-word minimum and the reviewer's reading reduce this, and the Report link on every wrong answer catches the rest.
- Rollback: `git revert` the merges on `main`, patch release, republish, `latest`.

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p7-your-week.md`.
