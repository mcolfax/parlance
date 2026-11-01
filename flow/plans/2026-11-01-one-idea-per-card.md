# One idea per card, pictures in review, a top bar that fits

- **Cycle:** 2026-11-01
- **Status:** building
- **Release:** 4.27.0 (minor: a lesson feature and a review feature, plus content and UX fixes)
- **Base:** `main` at bf7f0e0
- **Proposals built:** web `pmvxw6o4w0` (pending, Green: the gate approves it, scoped to unit 2, see below); web `pmvxw6o4w1` (pending, option (a) only, Green copy: the gate approves it for (a); option (b) is not built and not escalated, see Gate)
- **Roadmap items:** R-1, R-5; new R-16, R-17, R-18 (added open)

## Why this, why now

A learner (note fmvbms644lr5x, proposal pmvxw6o4w0) found the es-2-1 tip confusing: each sentence brings a new form without room to absorb it. Measuring every A1 tip with `tipBites()` shows why, and that it isn't only Spanish: the bites are cut by length, not by idea, and tables are matched by caption only, so most tables land on the last card. In es-2-1 the plurals table sits on the card about sums (`flow/shots/2026-11-01/before/light-es-es-2-1-bite3.png`); in es-2-4, de-2-1 and it-2-4 both tables sit on the last, shortest card. This release lets an author cut a tip into cards with blank lines and rewrites the four unit 2 tips (Numbers & time) in all three languages, one idea per card with its own example; the rest of A1 follows a unit per cycle (R-16). R-1 is a real bug on Matt's 412px phone: the wordmark is cut to "Parlanc" (`flow/shots/2026-11-01/look/light-de-learn.png`); measured, the row is 12px short, and the fix was trialled in a scratch copy (fits at 412, wordmark steps aside cleanly at 393 and 360). The second proposal (pmvxw6o4w1, note fmv58xfx9pqsf) was written on 4.8.0; since 4.17.0 the web version already hands Talk scenes to Claude, ChatGPT or Gemini, but Me doesn't say so, so a one-line pointer closes it. R-5 (picture questions in review) is the smallest lesson-types item, uses the existing picture questions and grading unchanged, and gives review the variety lessons already have.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 Paragraph bites, top bar, web Talk pointer | Green | POLICY Green: "New exercise types and lesson features … that work offline, without the tutor … and that come with tests"; "UX and UI polish inside the Selva look … using existing tokens"; copy. No token values change; no grading code is touched (`tipBites()` is in content.js and only decides which teaching card a sentence sits on). | none |
| WP2 Unit 2 tips, one idea per card (de, es, it) | Green | POLICY Green: "Fixes to existing content that keep every review-card key: … a better tip". No vocab or sentence text changes, no blank changes; only tip bodies and tip examples. Learner feedback pmvxw6o4w0 is Green. | none |
| WP3 Picture questions in review | Green | POLICY Green: "New exercise types and lesson features that work offline, without the tutor, without a microphone and on the web version; that never change what a finished lesson, XP or a streak means; and that come with tests". It reuses `pic-pick`/`pic-name`/`pic-type` and their existing `evaluate()` grading unchanged; review XP and scheduling are untouched. | none |

**Proposals the gate approves:**
- `node dev/feedback.js approve pmvxw6o4w0 "Green: a better tip that keeps every review-card key (POLICY Green, fixes to existing content); built for unit 2 in all three languages this cycle, the rest of A1 follows a unit per cycle (roadmap R-16)"`
- `node dev/feedback.js approve pmvxw6o4w1 "Green copy, option (a) only: Me on the web points to Talk, where scenes already open in Claude, ChatGPT or Gemini. Option (b) is not built."`

**Option (b) of pmvxw6o4w1 (a server AI endpoint for the web) is Red and is not escalated.** Reasons: one note asked for it, written on 4.8.0, before 4.17.0 shipped the Claude/ChatGPT/Gemini hand-off for Talk scenes and lessons on demand, which answers most of it at no cost; a paid endpoint, a new host and per-learner accounts would cross three Red lines for one request. If the orchestrator disagrees, the question is: title "Your call: a tutor on the web version", change "a server endpoint that runs Talk and tutor grading for web learners", why "costs money per message, adds an outside host and stores learner messages". Nothing else needs Matt.

## Work packages

Order: **WP1 first.** Then **WP2 and WP3 in parallel** (separate worktrees, both based on the commit with WP1 merged). WP2 needs WP1's paragraph cutting and its placement tests; WP3 edits `dev/test.js` after WP1 did. WP2 and WP3 share no file.

### WP1 — Paragraph bites, a top bar that fits, and a Talk pointer on the web

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** `js/core/content.js` (only `tipBites()`), `styles/base.css` (only the "Top bar" block, lines 62–90 at base), `js/ui/me.js` (only the "Tutor access" card), `dev/test.js` (only the additions below)
- **Reads first:** `tipBites()` in `js/core/content.js` (lines 110–131) and where it is used, `buildLesson()` in `js/core/engine.js` (line 260, `pending = tipBites(...)`), `RENDER.teach` concept branch in `js/ui/runner.js` (line 404); `topBar()` and `musicBtn()` in `js/ui/learn.js`; the "Top bar" block in `styles/base.css`; the "Tutor access" card in `js/ui/me.js` (lines 122–125) and `tutorOptions()`/`openInClaude()` in `js/core/caps.js`; the web tests in `dev/test.js` around line 1382 ("the web version points at Claude") and the section 1 checks around line 212 (`ok(lessonCount === 468`).
- **Must not touch:** any `content/*.js` file (WP2), `js/core/engine.js`, `js/ui/runner.js`, `js/config.js` (WP3 and the ship step), `styles/tokens.css`.

**Spec.**

*A. Tips cut by the author (`tipBites()` in `js/core/content.js`).* A tip body may contain blank lines (`\n\n` inside the JS string). When it does, each paragraph is one teaching card ("bite"), in order, at most three: a fourth and later paragraphs join the third. Inside a paragraph, runs of whitespace (including single newlines) become one space. Examples go to bites exactly as today (`home()` on the example text). Tables, in paragraph mode only, are matched on their caption **and** their head and cells (all joined with spaces, `**` removed, lowercased), so a table goes to the card whose bold words its forms show. A body with no blank line is cut exactly as today, byte for byte (same sentence split, same length rule, tables matched by caption only). The returned shape is unchanged: `[{ body, examples, tables, title, i, of }]`. Replace the function with:

```js
/* A tip is taught in one to three bites (the concept cards between word groups).
   An author can cut it by hand with blank lines: one bite per paragraph, at most three (later paragraphs join the third),
   and each table goes to the paragraph whose bold words its caption or cells show. Without blank lines it is cut at
   sentence ends by length, and a table follows its caption. Examples always go to the bite whose bold words they use. */
function tipBites(tip){
  if (!tip || !tip.body) return [];
  const plain = s => String(s).replace(/\*\*/g, '').toLowerCase();
  const paras = String(tip.body).split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const byPara = paras.length > 1;
  let bites = [];
  if (byPara) bites = [paras[0], paras[1], paras.slice(2).join(' ')].filter(Boolean).map(body => ({ body, examples: [], tables: [] }));
  else {
    // the existing code, unchanged: sents, n, total, the cur/len loop that fills `bites`
  }
  const bolds = b => [...b.body.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].toLowerCase());
  const home = key => { /* unchanged */ };
  const tableKey = t => plain(byPara ? [t.cap, ...(t.head || []), ...t.rows.flat()].join(' ') : t.cap);
  for (const e of tip.examples || []) home(plain(e.t)).examples.push(e);
  for (const t of tip.tables || []) home(tableKey(t)).tables.push(t);
  return bites.map((b, i) => ({ ...b, title: tip.title, i, of: bites.length }));
}
```

Keep the existing `bites` variable name, `home()` and its tie rule (the first bite with the most hits wins; no hit goes to the last bite) exactly as they are. Nothing else reads `tip.body` whole (checked: `remote.js` lesson sharing and pack validation only copy it), so blank lines never show up on screen.

*B. The top bar at phone width (`styles/base.css`, "Top bar").* Today at 412px the row needs 392px of 380 and the wordmark is clipped mid-word. Make the wordmark wrap away instead of being cut (independent of font metrics), and tighten the language switch a little under 420px so it fits on Matt's phone:

1. Replace the `.brand` rule with
   `.brand{display:flex;flex-wrap:wrap;align-items:center;gap:40px 8px;height:26px;font:700 24px/1 var(--display);min-width:0;overflow:hidden}`
   (row gap 40px sends a wrapped "Parlance" far below the 26px box, so it is either whole on the first line or out of sight; screen readers still read it because it stays in the layout). Do not set `align-content`.
2. In `@media (max-width:420px)`: `.top{gap:6px}` (was 8px), `.brand{font-size:17px;gap:40px 6px}` (was `gap:6px`), `.top .seg button{padding:7px 7px;font-size:14px}` (was `7px 8px` and `15px`). Leave `.top .music-btn{width:40px;height:40px}` and `.top .seg{padding:3px}` as they are.
3. Delete the whole `@media (max-width:400px){ .brand-name{…} }` block: the wrap does its job at every width.
4. Replace the comment above the media queries with: `/* Phones: the logo, the music button and the language switch share one row. Under 420px they tighten up. If the wordmark still doesn't fit, it wraps out of the 26px brand box (screen readers still hear it) and the two-leaf mark stays. */`

No colors, no tokens, no other selectors change. Expected result (trialled): 412px shows the whole "Parlance" with the mark; 393px and 360px show the mark only; no sideways scroll; light and dark identical apart from colors.

*C. Where to practice Talk on the web (`js/ui/me.js`, "Tutor access" card).* After `Web.on ? tutorOptions('Conversations, new lessons and grading need the tutor.', null) : null`, add two children, both only when `Web.on`:

```js
Web.on ? h('p', { class: 'small muted' }, 'You can also practice any Talk scene in Claude, ChatGPT or Gemini: open Talk, pick a scene and choose your app.') : null,
Web.on ? h('button', { class: 'btn btn-quiet btn-sm', type: 'button', onclick: () => { UI.tab = 'talk'; UI.animate = true; render(); window.scrollTo(0, 0); } }, ic('talk'), 'Go to Talk') : null
```

Exact strings: `You can also practice any Talk scene in Claude, ChatGPT or Gemini: open Talk, pick a scene and choose your app.` and `Go to Talk`. Nothing changes in the Claude version (no `Web.on`): signed in or out, with or without the tutor.

**Tests to add to `dev/test.js`.**

1. Right after `ok(lessonCount === 468, 'lesson count ' + lessonCount);` (section 1), add a block using `A.E(...)`:
   - **"tipBites: blank lines make one bite per paragraph"**: `A.E('tipBites(T("t", "One **alpha** idea.\\n\\nTwo **bravo** idea.\\n\\nThree **charlie** idea.\\n\\nFour.", [["alpha one", "a"], ["charlie two", "c"]], [["Plain caption", null, [["x", "**bravo**"]]]]))')` returns 3 bites with bodies exactly `One **alpha** idea.`, `Two **bravo** idea.`, `Three **charlie** idea. Four.`; `alpha one` is in bite 0, `charlie two` in bite 2, and the table (caption "Plain caption", matched by its cell) in bite 1.
   - **"tipBites: a tip without blank lines is cut as before"**: for es-1-1, `tipBites(getLesson("es-1-1").tip)` has 3 bites whose bodies start with `Greet by the time of day`, `**¿Cómo estás?**` and `Put **señor**`, and its two tables are both in bite 2 (as on `main` today).
   - **"<id> each example and table sits with the paragraph that names it"**: for every built-in lesson (all languages) whose `tip.body` matches `/\n\s*\n/`: the number of bites is `Math.min(3, paragraphs)`, and every example and every table in each bite shares at least one bold word (longer than 2 characters, lowercased, `**` removed) with that bite's body: the example's text, or the table's caption, head and cells joined, must include it.
   - **"<id> tip cards hold what the plan says"**: a constant `TIP_PLACES` (below, copied exactly) maps lesson id → per bite, the example texts (in order) followed by the table captions (in order, with any `**` kept). For each id whose `tip.body` has a blank line, `tipBites(...)` gives exactly those lists. (Before WP2 lands no unit 2 tip has a blank line, so these checks are skipped; the integration step adds the check that all twelve have them.)

```js
const TIP_PLACES = {
  'es-2-1': [['Dos más tres son cinco.'], ['Tengo dos hermanos.', 'Mi hijo tiene siete años.', 'tener (irregular): to have', 'Plurals'], ['Cuesta cinco dólares.', 'costar (o→ue): to cost']],
  'de-2-1': [['Zwei plus drei ist fünf.', 'Numbers 0–10 (and 10 is **zehn**)'], ['Ich habe zwei Brüder.', 'Present of **haben** (to have)', 'Plurals you meet here'], ['Das kostet fünf Euro.', 'Mein Sohn ist sieben Jahre alt.']],
  'it-2-1': [['Due più tre fa cinque.'], ['Ho due fratelli.', 'Mio figlio ha sette anni.', 'avere (irregular): to have'], ['Costa cinque euro.', 'costare: to cost', 'Plurals']],
  'es-2-2': [['Cuesta doce dólares.', 'Numbers'], ['Cuesta cuarenta y cinco dólares.'], ['Tengo treinta años.', '¿Cuántos años tienes?', 'La casa tiene cincuenta años.', 'tener (irregular): to have']],
  'de-2-2': [['Das kostet zwölf Euro.', 'The tens'], ['Das kostet einundzwanzig Euro.', 'Ones first, then **und**, then the tens'], ['Ich bin dreißig Jahre alt.', 'Wie alt bist du?', 'Das Haus ist fünfzig Jahre alt.']],
  'it-2-2': [['Costa dodici euro.'], ['Mia sorella ha ventuno anni.', 'Numbers'], ['Ho trentacinque anni.', 'Quanti anni hai?', 'avere (irregular): to have']],
  'es-2-3': [['Es la una.'], ['Son las tres y media.', 'Saying the time'], ['Voy a llegar tarde.', 'ir (irregular): to go']],
  'de-2-3': [['Es ist drei Uhr.'], ['Es ist halb acht.', 'Es ist Viertel nach zwei.', 'Telling the time'], ['Ich komme zu spät.']],
  'it-2-3': [['È l’una.'], ['Sono le tre e mezza.', 'Saying the time'], ['Arrivo tardi.', 'arrivare (regular -are): to arrive']],
  'es-2-4': [['Los sábados juego tenis.', 'Days with “on”'], ['Hoy es lunes.'], ['El viernes no trabajo.', 'Jugamos tenis el sábado.', 'Two present-tense verbs']],
  'de-2-4': [['Die Woche hat sieben Tage.', 'Which word?'], ['Am Freitag arbeite ich nicht.'], ['Wir spielen am Samstag Tennis.', 'Present of **arbeiten** and **spielen**']],
  'it-2-4': [['Io lavoro il lunedì.', 'Days with “on”'], ['Oggi è lunedì.'], ['Venerdì non lavoro.', 'Sabato giochiamo a tennis.', 'Two present-tense verbs']]
};
```

2. **"the top bar lets the wordmark wrap instead of cutting it"**: read `styles/base.css` with `fs.readFileSync(path.join(ROOT, 'styles', 'base.css'), 'utf8')`; assert the `.brand{…}` rule contains `flex-wrap:wrap` and `height:26px`, and the file no longer contains `@media (max-width:400px){\n  .brand-name`. (Layout itself is checked with the browser script in the verification plan; jsdom has no layout.)
3. In the web block, right after `ok(W1.w.document.querySelectorAll('.gen .ai-picker a').length === 3, 'lessons on demand can be handed to a chat app on the web');`: render Me (`W1.E('UI.tab="me"; render()')`), assert **"Me on the web points to Talk scenes in chat apps"**: a `#app p` contains `practice any Talk scene in Claude, ChatGPT or Gemini` and a `#app button` has text `Go to Talk`; click it and assert **"Go to Talk opens Talk"**: `W1.E('UI.tab') === 'talk'`.
4. In the Claude-version run, right after the line `for (const tab of ['learn', 'stories', 'review', 'talk', 'friends', 'me']){ E('UI.tab=' …` (around line 651): `E('UI.tab="me"; render()')` and assert **"the Claude version's Me has no Go to Talk pointer"**: no `#app button` text includes `Go to Talk`.

**Steps.**
1. Replace `tipBites()` in `js/core/content.js` as in A.
2. Edit the "Top bar" block in `styles/base.css` as in B.
3. Add the two children to the Tutor access card in `js/ui/me.js` as in C.
4. Add the tests in `dev/test.js` as listed.
5. Run `npm test` (30-minute timeout, to `flow/shots/test.log`) and `node dev/flow.js guard`.
6. Run the top bar check script from the Verification plan against your worktree and take the screenshots it lists (412 light and dark, 360 light).

**Acceptance criteria.**
- [ ] `npm test` ends with `FAIL 0`; the new checks named above exist (grep `dev/test.js` for "blank lines make one bite per paragraph", "is cut as before", "sits with the paragraph that names it", "tip cards hold what the plan says", "wordmark wrap", "points to Talk scenes", "Go to Talk opens Talk", "has no Go to Talk pointer").
- [ ] For every built-in lesson, `tipBites(l.tip)` returns the same bites as on base `bf7f0e0` (no tip has a blank line yet). Check: the existing "idea in 1-3 small bites" and "every example and table is shown" checks still pass, and es-1-1 matches the regression check.
- [ ] The top bar check script prints `ALL PASS` (412: wordmark whole; 393 and 360: mark only; no overlap; no sideways scroll; light and dark).
- [ ] `node dev/flow.js shots --out flow/shots/2026-11-01/wp1 --steps "shot:learn;tab:Me;wait:700;shot:me"` and the same with `--width 360` show no clipped text in the top bar, light and dark.
- [ ] `git diff bf7f0e0 -- styles/base.css` touches only the Top bar block; `git diff bf7f0e0 -- styles/tokens.css` is empty.
- [ ] `node dev/flow.js guard` shows no FIX or STOP.

**Stop and report if:** the regression check shows any change for a tip without blank lines; the wrap leaves part of the wordmark visible under the mark at any width (it must be whole or gone); the "Tutor access" card is not where the plan says.

### WP2 — Unit 2 tips, one idea per card (German, Spanish, Italian)

- **Agent:** parlance-content (one agent for the three languages: the text is given below word for word, so there is nothing to translate or invent)
- **Model:** sonnet
- **Runs:** after WP1 is merged; in parallel with WP3 (worktree)
- **Owns (may edit):** `content/es-1-basics.js`, `content/de-1-basics.js`, `content/it-1-basics.js`; and, only if `npm test` asks for a meaning, `content/glossary.js` inside the `LESSON_GLOSS` block of the language concerned
- **Reads first:** `CLAUDE.md`; `tipBites()` in `js/core/content.js` as WP1 left it (blank lines cut the tip into cards); the twelve lessons es-2-1 … it-2-4 in their files (unit "Numbers & time", the second unit of each course); the `TIP_PLACES` constant WP1 added to `dev/test.js`.
- **Must not touch:** any lesson outside the twelve; any vocab, sentence or blank (their text is a review-card key or a resume count); any tip **table** (captions, heads and cells stay byte for byte); tip **titles** (unchanged); `dev/test.js`; code.

**Spec.** For each of the twelve lessons, in its `T(title, body, examples, tables)` call: replace the **body** string with the one below, exactly (the `\n\n` are written as backslash-n backslash-n inside the single-quoted JS string, as shown); replace the **examples** array with the one below where one is given ("unchanged" means leave it as it is); leave the title and the tables untouched. Each body has three paragraphs; each paragraph is one card with its own example or table, and every bold form is explained next to the word it comes from. Spanish stays Latin American; Italian keeps sentence-ending periods outside bold (`**Costa cinque euro**.`) and typographic apostrophes (`l’una`); every apostrophe in English is ’.

What each card teaches (for review; the text below is the spec):
- x-2-1 Counting to ten: (1) "one" before a noun, and sums (más/menos/son · plus/minus/ist · più/meno/fa); (2) "to have" (tengo/tiene · habe/hast/hat · ho/ha), age, plural -s / umlaut and -e / -o→-i; (3) "to cost" (cuesta/cuestan · kostet · costa/costano), plural -es / Euro unchanged and age with Jahre alt / -a→-e and euro unchanged.
- x-2-2 Bigger numbers & age: (1) 11–29 (es), 11–19 (de, it); (2) 31+ with y (es), ones-und-tens (de), tens and elision (it); (3) age with tener/sein/avere and "how many".
- x-2-3 What time is it?: (1) the hour (es la una / son las · drei Uhr and Wie spät ist es? · è l’una / sono le); (2) quarters and half (y cuarto, y media, menos cuarto · halb, Viertel nach/vor · mezzogiorno, e un quarto, e mezza, meno un quarto); (3) ir a + verb · zu spät · present for the near future.
- x-2-4 Days of the week: (1) "on" a day and every week (el/los · am/um/im · bare day/il); (2) Hoy es lunes / verb second / Oggi è lunedì and clock times; (3) the two verbs and "not".

New example lines (two need recording, the rest are already recorded as sentences or filled-in blanks): **new:** `Cuesta cuarenta y cinco dólares.` (es-2-2) and `Das kostet einundzwanzig Euro.` (de-2-2); **already recorded:** `Dos más tres son cinco.`, `Zwei plus drei ist fünf.`, `Due più tre fa cinque.`, `Cuesta doce dólares.`, `Das kostet zwölf Euro.`, `Costa dodici euro.`, `Es ist drei Uhr.`, `Los sábados juego tenis.`, `Io lavoro il lunedì.`.

**The twelve tips** (titles and tables unchanged):

**es-2-1** (`content/es-1-basics.js`)

Body:

```js
'**uno** is one. Before a masculine noun it becomes **un**: un hermano, one brother. To add, say **más** (plus). To take away, say **menos** (minus). The answer comes after **son**: **Dos más tres son cinco**.\n\n**tener** means “to have”. Its forms change: **tengo** is “I have” and **tiene** is “he has” or “she has”. Spanish also uses tener for age: **Mi hijo tiene siete años**, literally “my son has seven years”. A noun that ends in a vowel adds -s for more than one: hermano → **hermanos**, año → **años**.\n\n**costar** means “to cost”. You mostly need two forms: **cuesta** for one thing and **cuestan** for several. A noun that ends in a consonant adds -es: dólar → **dólares**. So: **Cuesta cinco dólares**.'
```

Examples: 

```js
[['Dos más tres son cinco.', 'Two plus three is five.'], ['Tengo dos hermanos.', 'I have two brothers.'], ['Mi hijo tiene siete años.', 'My son is seven years old.'], ['Cuesta cinco dólares.', 'It costs five dollars.']]
```

**de-2-1** (`content/de-1-basics.js`)

Body:

```js
'Count from **null** to **zehn**: eins, zwei, drei … Before a noun, eins loses its s: **ein Euro**. Sums are easy: **plus**, **minus**, and the answer comes after **ist**: **Zwei plus drei ist fünf**. On the phone people often say **zwo** for zwei, so it isn’t mixed up with drei.\n\n**haben** means “to have”. Its forms change with the person: **ich habe**, **du hast**, **er hat**. After two or more, a noun takes its plural. Some plurals add an umlaut: der Bruder → zwei **Brüder**. Some add -e: das Jahr → sieben **Jahre**.\n\n**kosten** means “to cost”: **das kostet** is “that costs”. **Euro** stays the same after a number: **fünf Euro**. For age, use **ist** and **Jahre alt**: **Mein Sohn ist sieben Jahre alt**.'
```

Examples: 

```js
[['Zwei plus drei ist fünf.', 'Two plus three is five.'], ['Ich habe zwei Brüder.', 'I have two brothers.'], ['Das kostet fünf Euro.', 'That costs five euros.'], ['Mein Sohn ist sieben Jahre alt.', 'My son is seven years old.']]
```

**it-2-1** (`content/it-1-basics.js`)

Body:

```js
'**uno** is one. Before a noun it changes like “a”: **un** libro, **una** casa. To add, say **più** (plus). To take away, say **meno** (minus). The answer comes after **fa** (“makes”): **Due più tre fa cinque**.\n\n**avere** means “to have”. Its forms change: **ho** is “I have” and **ha** is “he has” or “she has”. The **h** is silent. Italian also uses avere for age: **Mio figlio ha sette anni**, literally “my son has seven years”. In the plural, -o becomes -i: fratello → **fratelli**.\n\n**costare** means “to cost”. You mostly need two forms: **costa** for one thing and **costano** for several. In the plural, -a becomes -e (sorella → **sorelle**), and a few words, like **euro**, stay the same: **Costa cinque euro**.'
```

Examples: 

```js
[['Due più tre fa cinque.', 'Two plus three is five.'], ['Ho due fratelli.', 'I have two brothers.'], ['Mio figlio ha sette anni.', 'My son is seven years old.'], ['Costa cinque euro.', 'It costs five euros.']]
```

**es-2-2** (`content/es-1-basics.js`)

Body:

```js
'From 11 to 29 a number is one word: **once**, **doce**, **dieciséis**, **veinte**, **veintiuno**. Before a masculine noun, veintiuno drops its o: **veintiún años**.\n\nFrom 31 on, the tens and the units are two words joined by **y** (and): **treinta y uno**, **cuarenta y cinco**. 100 is **cien**.\n\nAge uses **tener** (to have): **Tengo treinta años**, literally “I have thirty years”. The forms are **tengo** (I have), **tienes** (you have) and **tiene** (he or she has). To ask, say **¿Cuántos años tienes?** **cuántos** (how many) matches the plural noun años.'
```

Examples: 

```js
[['Cuesta doce dólares.', 'It costs twelve dollars.'], ['Cuesta cuarenta y cinco dólares.', 'It costs forty-five dollars.'], ['Tengo treinta años.', 'I am thirty years old.'], ['¿Cuántos años tienes?', 'How old are you?'], ['La casa tiene cincuenta años.', 'The house is fifty years old.']]
```

**de-2-2** (`content/de-1-basics.js`)

Body:

```js
'**elf** and **zwölf** are words of their own. 13 to 19 add -zehn: **dreizehn**, **neunzehn**. The tens end in **-zig**, except **dreißig** (30), which is spelled with ß.\n\nFrom 21 to 99, German says the ones first, then **und**, then the tens: **einundzwanzig** is “one-and-twenty”. Eins loses its s here. 100 is **hundert**.\n\nAsk someone’s age with **Wie alt bist du?** Answer with **Jahre alt** (years old): **Ich bin dreißig Jahre alt**. The verb is **sein** (to be): **ich bin**, **du bist**, **es ist**.'
```

Examples: 

```js
[['Das kostet zwölf Euro.', 'That costs twelve euros.'], ['Das kostet einundzwanzig Euro.', 'That costs twenty-one euros.'], ['Ich bin dreißig Jahre alt.', 'I am thirty years old.'], ['Wie alt bist du?', 'How old are you?'], ['Das Haus ist fünfzig Jahre alt.', 'The house is fifty years old.']]
```

**it-2-2** (`content/it-1-basics.js`)

Body:

```js
'From 11 to 16 each number has its own word: **undici**, **dodici**, **sedici**. From 17 to 19 the ten comes first: **diciassette**, **diciotto**, **diciannove**.\n\nThe tens are **venti**, **trenta**, **quaranta**, **cinquanta**. Add the units straight on, with no “and”: **ventidue**. Before **uno** and **otto** the ten drops its last vowel: **ventuno**, **ventotto**. 100 is **cento**.\n\nAge uses **avere** (to have): **Ho trentacinque anni**, literally “I have thirty-five years”. The forms are **ho** (I have), **hai** (you have) and **ha** (he or she has). To ask, say **Quanti anni hai?** **quanti** (how many) matches the plural noun **anni**.'
```

Examples: 

```js
[['Costa dodici euro.', 'It costs twelve euros.'], ['Mia sorella ha ventuno anni.', 'My sister is twenty-one years old.'], ['Ho trentacinque anni.', 'I am thirty-five years old.'], ['Quanti anni hai?', 'How old are you?']]
```

**es-2-3** (`content/es-1-basics.js`)

Body:

```js
'Use **ser** for the time. One o’clock is singular: **Es la una**. Every other hour is plural: **Son las dos**, **Son las tres**. The hour is feminine, so the article is la or las. Ask **¿Qué hora es?**\n\nAdd the minutes after the hour: **y cuarto** for :15 and **y media** for :30. For :45, take a quarter from the next hour: **menos cuarto**. So 3:30 is **Son las tres y media**.\n\n**Voy a llegar tarde** means “I’m going to be late”. **ir a** + a verb says what is about to happen, and **voy** is “I go”, from **ir** (to go). **tarde** is “late”, **temprano** is “early”, and **todavía** means “still”.'
```

Examples: unchanged.

**de-2-3** (`content/de-1-basics.js`)

Body:

```js
'On the hour, say **Uhr** after the number: **Es ist drei Uhr**. Ask **Wie spät ist es?**, literally “how late is it?”\n\n**halb acht** is 7:30: halfway to eight, not 8:30. Quarters use **Viertel nach** (past) and **Viertel vor** (to): **Es ist Viertel nach zwei**. Minutes use **nach** and **vor** too: zehn vor vier.\n\nCareful with **zu**: in **zu spät** it means “too”, so **Ich komme zu spät** is “I’m late”. **noch** means “still”: Es ist noch früh.'
```

Examples: 

```js
[['Es ist drei Uhr.', 'It is three o’clock.'], ['Es ist halb acht.', 'It is half past seven.'], ['Es ist Viertel nach zwei.', 'It is quarter past two.'], ['Ich komme zu spät.', 'I am late.']]
```

**it-2-3** (`content/it-1-basics.js`)

Body:

```js
'Use **essere** for the time. One o’clock is singular: **È l’una**. Every other hour is plural: **Sono le due**, **Sono le tre**. The hour is feminine, so the article is l’ or le. Ask **Che ore sono?**\n\nMidday and midnight have their own words: **mezzogiorno** and **mezzanotte**. Add the minutes after the hour: **e un quarto** for :15 and **e mezza** for :30. For :45, take a quarter from the next hour: **meno un quarto**. So 3:30 is **Sono le tre e mezza**.\n\nItalian often uses the present for what is about to happen: **Arrivo tardi** means “I’m arriving late”. **arrivare** is a regular -are verb: **arrivo**, **arrivi**, **arriva**. **tardi** is “late”, **presto** is “early”, and **adesso** is “now”.'
```

Examples: unchanged.

**es-2-4** (`content/es-1-basics.js`)

Body:

```js
'Days are lowercase. To say “on” a day, use **el**: **el lunes** is “on Monday”. For every week, use **los**: **los lunes** is “on Mondays”. Lunes to viernes stay the same in the plural; sábado and domingo add -s: **los sábados**, **los domingos**.\n\nAfter **ser**, no article: **Hoy es lunes**. For a clock time, use **a las**: **a las tres**.\n\n**trabajar** (to work) is regular: **trabajo** is “I work”. Put **no** before the verb: **El viernes no trabajo**. **jugar** (to play) changes u to ue: **juego**, **juegas**, but **jugamos** (we play).'
```

Examples: 

```js
[['Los sábados juego tenis.', 'I play tennis on Saturdays.'], ['Hoy es lunes.', 'Today is Monday.'], ['El viernes no trabajo.', 'I don’t work on Friday.'], ['Jugamos tenis el sábado.', 'We play tennis on Saturday.']]
```

**de-2-4** (`content/de-1-basics.js`)

Body:

```js
'Use **am** with days (**am Montag**), **um** with clock times (**um drei Uhr**) and **im** with months (**im Mai**). **am** is short for “an dem”, and **im** for “in dem”. The week has **sieben Tage** (seven days), and every one is a **der** word: der Montag.\n\nA time word can come first, but the verb stays second: **Am Freitag arbeite ich nicht**. **nicht** (not) goes near the end.\n\n**spielen** (to play) is regular: ich **spiele**, wir **spielen**. **arbeiten** (to work) adds an e before -st and -t, because its stem already ends in t: **du arbeitest**, **er arbeitet**.'
```

Examples: unchanged.

**it-2-4** (`content/it-1-basics.js`)

Body:

```js
'Days are lowercase. For one particular day, Italian uses the day alone: **venerdì** is “on Friday”. For every week, add the article: **il lunedì** is “on Mondays”. **la domenica** (“on Sundays”) is the only feminine day.\n\nTo say what day it is, use **è**: **Oggi è lunedì**. For a clock time, use **alle**: **alle tre**.\n\n**lavorare** (to work) is regular: **lavoro** is “I work”. Put **non** before the verb: **Venerdì non lavoro**. **giocare** (to play) adds an h before i to keep the hard sound: **giochi**, **giochiamo**. With a sport, say **giocare a**: Sabato giochiamo a tennis.'
```

Examples: 

```js
[['Io lavoro il lunedì.', 'I work on Mondays.'], ['Oggi è lunedì.', 'Today is Monday.'], ['Venerdì non lavoro.', 'I don’t work on Friday.'], ['Sabato giochiamo a tennis.', 'We play tennis on Saturday.']]
```

**Steps.**
1. In each of the three files, find the twelve `L('<id>', …, T(…))` calls and replace the body string, then the examples array where one is given. Keep the indentation style of the file (`es` and `it` put the title, body, examples and tables on separate lines; `de` puts the title and body on the `T(` line).
2. Check the paragraph breaks: each file now holds eight `\n\n` sequences (two in each of its four bodies). Run `grep -o '\\n\\n' content/es-1-basics.js | wc -l` (and for de, it): each prints `8`.
3. Run `npm test` (30-minute timeout, to `flow/shots/test.log`). The WP1 checks "tip cards hold what the plan says" and "sits with the paragraph that names it" now run for these twelve lessons and must pass. If `npm test` lists a word in a new example without a meaning, add it to `LESSON_GLOSS.<lang>` in `content/glossary.js` (expected: none).
4. `node dev/flow.js guard`: no orphaned review-card keys (nothing but tips changed), no straight apostrophes, no FIX or STOP.
5. Screenshots of the three cards of es-2-1, de-2-1 and it-2-1 (steps in the Verification plan) in light and dark. Read each card once as a learner.

**Acceptance criteria.**
- [ ] `npm test` ends with `FAIL 0`, with the twelve `<id> tip cards hold what the plan says` checks passing.
- [ ] `git diff <WP1 commit> -- content/` changes only the twelve tip bodies and the examples arrays listed (no line with a vocab, sentence or blank array changes; `node dev/flow.js guard` reports no orphaned keys).
- [ ] Each of the three content files contains 8 `\n\n` sequences (step 2).
- [ ] The es-2-1 cards: card 1 shows the sums and **Dos más tres son cinco**, card 2 shows tener with its table and the plurals table, card 3 shows costar with its table, in `flow/shots/2026-11-01/wp2/` light and dark; no card scrolls sideways at 412px.

**Stop and report if:** a placement check fails after the text is pasted exactly (report the lesson and what landed where; do not reword to make it pass); a body is longer than 520 characters per paragraph (none is); anything would require changing a vocab, sentence, blank or table.

### WP3 — Picture questions in review

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 is merged; in parallel with WP2 (worktree)
- **Owns (may edit):** `js/core/engine.js` (add `reviewQueue()` next to `reviewEx()`), `js/ui/runner.js` (only the `queue:` value in `startReview()`), `js/config.js` (only the `PIC_EX` line), `dev/test.js` (only the additions below)
- **Reads first:** `reviewEx()` (engine.js line 302), `makeEx()` picture branch (line 202: falls back to the plain question when there is no safe picture or too few distractors), `picDistractors()` (line 160), `buildLesson()`'s picture logic (lines 246 and 265–266), `picQuiz()` in `js/core/art.js` (line 283), `dueEntries()`/`learnedEntries()` (engine.js lines 40–50) and `resolveKey()` (content.js line 163: entries are `{ lesson, kind, i, item, key, card }`); `startReview()` and `startMistakes()` in `js/ui/runner.js` (lines 108–125); `PIC_EX` in `js/config.js` (line 261); the review rounds in `dev/test.js` around line 646 and the picture checks just above them (line 629).
- **Must not touch:** `evaluate()`, `noteMiss()`, SRS scheduling, XP, `startMistakes()` (mistake sessions stay as they are), any content file, `styles/*`, `js/ui/me.js`.

**Spec.**
- `js/config.js`: `PIC_EX` gains `perReview: 3` → `const PIC_EX = { A1: 'pic-pick', A2: 'pic-pick', B1: 'pic-name', B2: 'pic-name', C1: 'pic-type', C2: 'pic-type', perLesson: 2, perReview: 3 };`
- `js/core/engine.js`, directly after `reviewEx()`:

```js
/* A review or practice session asks up to PIC_EX.perReview picture questions: words with a safe picture, chosen at random,
   get their level's picture question (the same kinds lessons ask); everything else is asked as reviewEx() would.
   A word whose picture question can't be built (too few other pictures) gets its plain question. Order is kept. */
function reviewQueue(entries){
  const can = entries.map((e, n) => n).filter(n => { const e = entries[n]; return e.kind === 'v' && e.lesson && PIC_EX[e.lesson.level] && picQuiz(e.item, e.lesson.lang); });
  const pick = new Set(shuffle(can).slice(0, PIC_EX.perReview || 0));
  return entries.map((e, n) => {
    if (pick.has(n)){ const t = PIC_EX[e.lesson.level], ex = makeEx(t, e.lesson, 'v', e.i); if (ex.type === t){ ex.srs = e.key; return ex; } }
    return reviewEx(e);
  });
}
```

- `js/ui/runner.js`, `startReview()`: change `queue: entries.map(reviewEx)` to `queue: reviewQueue(entries)`. That covers Review and Practice (both go through `startReview`). `startMistakes()` keeps `reviewEx`.
- Nothing else changes: the runner already draws, grades and schedules `pic-pick`, `pic-name` and `pic-type` (lessons use them), and `ex.srs` is how review answers update their card. Works offline, signed out, on the web, without the tutor, without a microphone. Tutor grading for `pic-type` in review behaves exactly as in lessons.

**Tests to add to `dev/test.js`**, in the Claude-version run right after `ok(Object.values(P.S.langs[lang].cards).filter(c => c.n >= 1).length >= 60, lang + ' reviewed');`, using the same `E`, `P`, `Run()`, `finishCurrent()` and `footBtn()` as the review rounds above:
1. **"<lang> review: at most three picture questions, in order, each on its own card"**: `const n = E('(() => { const es = learnedEntries(S.settings.lang, "v").slice(0, 60), q = reviewQueue(es); window.__rq = { es, q }; return q.length; })()')`; assert `n === 60`, every `__rq.q[k].srs === __rq.es[k].key`, and the number of `q` items whose type starts with `pic-` is between 1 and `PIC_EX.perReview`.
2. **"<lang> review picture questions are the level's kind, with a safe picture, graded like lessons"**: for each picture item `ex` in `__rq.q`: `ex.type === PIC_EX[ex.lesson.level]`, `picQuiz(ex.item, ex.lang)` is truthy; with options: every option has its own picture, `ex.pics[ex.correct] === picQuiz(ex.item, ex.lang)`, `evaluate(ex, ex.correct).ok` is true and `evaluate(ex, <any other option>).ok` is false; for `pic-type`: `evaluate(ex, ex.accepted[0]).ok` is true and `evaluate(ex, 'zzzz').ok` is false.
3. **"<lang> review: no picture questions for words without one, or when perReview is 0"**: `reviewQueue` of the entries from (1) filtered to those without `picQuiz` has no `pic-` items; set `PIC_EX.perReview = 0`, `reviewQueue` of all 60 has none; restore `PIC_EX.perReview = 3`.
4. **"<lang> a review session with pictures runs to the end"**: save every card's `due` (`const dues = E('JSON.stringify(Object.fromEntries(Object.entries(S.langs[S.settings.lang].cards).map(([k, c]) => [k, c.due])))')`), set every card's `due` to `'2999-01-01'`, then set `due = '2000-01-01'` on the cards of six A1 or A2 vocab entries whose word has a `picQuiz` picture (from `learnedEntries(lang, "v")`); `E('startReview(false)')`; assert `Run().queue.length === 6` and at least one queue item has type `pic-pick`; `await finishCurrent()`; assert `Run().finished`; `footBtn('Continue').click()`; then restore every card's `due` from `dues`.
5. **"mistake sessions ask no picture questions"**: after (4), `E('startMistakes()')` if `mistakeEntries(lang).length`, assert no queue item type starts with `pic-`, then `E('endRun()')`. (Skip the assertion when there are no mistakes, but keep the line so it runs when there are.)

**Steps.**
1. Add `perReview: 3` to `PIC_EX` in `js/config.js`.
2. Add `reviewQueue()` after `reviewEx()` in `js/core/engine.js`.
3. Use it in `startReview()` in `js/ui/runner.js`.
4. Add the tests.
5. `npm test` (30-minute timeout, to `flow/shots/test.log`) and `node dev/flow.js guard`.
6. Screenshot a review with a picture question (steps in the Verification plan), light and dark, 412 and 360.

**Acceptance criteria.**
- [ ] `npm test` ends with `FAIL 0` with the five checks named above.
- [ ] `git diff <WP1 commit> -- js/config.js` changes only the `PIC_EX` line; `git diff <WP1 commit> -- js/ui/runner.js` changes only the `queue:` value in `startReview()`; `evaluate(` and `noteMiss(` are untouched (`git diff <WP1 commit> -- js/core/engine.js` shows only the new function).
- [ ] The review screenshot shows four picture options at 412 and 360, light and dark, no sideways scroll.
- [ ] `node dev/flow.js guard` shows no FIX or STOP.

**Stop and report if:** a picture question in review needs anything from `Run.lesson` (it is `null` in review) and fails; the change would alter scheduling, XP or what counts as a review.

## Integration

Run by one parlance-builder on the cycle branch after WP1, WP2 and WP3 are merged (no worktree):

- [ ] `dev/test.js`: right after the `TIP_PLACES` checks, add **"all twelve unit 2 tips are cut into three paragraphs"**: for every id in `TIP_PLACES`, `getLesson(id).tip.body` matches `/\n\s*\n/` and splits into exactly 3 paragraphs.
- [ ] `docs/ARCHITECTURE.md`:
  - "How a lesson teaches", the bullet "**The idea**": after "`tipBites()` in `content.js` cuts the tip body at sentence ends into one to three bites." add: "An author can cut it by hand with blank lines (`\n\n` in the body): each paragraph is one bite, at most three, and a table goes to the paragraph whose bold words its caption or cells show. Unit 2 in every language is written this way."
  - Last paragraph of the section: change "Write a tip as short sentences, with each bold phrase near the example or table it belongs to." to "Write a tip as short sentences, with each bold phrase near the example or table it belongs to; for a beginner tip, give each idea its own paragraph."
  - "Word pictures", the "Picture questions" bullet: replace "Review sessions don't ask picture questions yet." with "Review and practice sessions ask up to `perReview` of them (`reviewQueue()` in `engine.js`), for words with a safe picture; mistake sessions don't."
- [ ] `CLAUDE.md`: no change (the shape is unchanged: 39 units, 156 lessons, 9 stories per language).
- [ ] `index.html`, `js/core/art.js` unit signs: no change (no new files, no new units).
- [ ] Word pictures (parlance-chores, no illustrator: no vocab changed): `node design/pictures/tools.js inventory && node design/pictures/tools.js briefs && node design/pictures/tools.js check` ends with `ok` and reports no undecided concepts; `git status --short design/pictures content/pictures.js` shows no change (if it does, stop and report).
- [ ] Voices (parlance-chores): `node dev/voices.js --dry` (expected: about 2 new lines, `Cuesta cuarenta y cinco dólares.` and `Das kostet einundzwanzig Euro.`, under 100 characters), then `node dev/voices.js`; commit `media/voice/` and `dev/voice-usage.json`. If it stops for the cap or the key, carry on and report it (those two lines use the device's voice until recorded).
- [ ] Ship step (orchestrator): `APP_VERSION` 4.26.2 → 4.27.0 and the `RELEASES` entry below; `node dev/flow.js guard --base bf7f0e0` clean; close the loop for pmvxw6o4w0 and pmvxw6o4w1 with the sentences below.

**Closing sentences** (`node dev/feedback.js close 4.27.0 "<sentence>" --proposal <id>`):
- pmvxw6o4w0: "Counting to ten and the rest of unit 2 now explain one idea per card, each with its own example, so every new form has room to settle before the next one arrives."
- pmvxw6o4w1: "On the web version, Me now points you to Talk, where any scene opens as a conversation in Claude, ChatGPT or Gemini."

## Release notes

- **Title:** Smaller steps
- **Notes:**
  - The lessons on numbers, time and days in unit 2 now explain one idea per card, each with its own example, in German, Spanish and Italian.
  - Reviews now ask up to three picture questions, the same kind your lessons ask at that level.
  - The top bar fits on phones again, and on the web version Me shows where to practice Talk scenes in Claude, ChatGPT or Gemini.

## Verification plan

- Commands: `npm test` (FAIL 0; 30-minute timeout, to `flow/shots/test.log`), `node dev/flow.js guard --base bf7f0e0` (no STOP, no FIX), `node design/pictures/tools.js check` (ok).
- **Top bar check** (save as `<scratchpad>/topbar-check.js`, run `NODE_PATH=<repo>/node_modules node <scratchpad>/topbar-check.js <repo>`; it must print `ALL PASS`; on base `bf7f0e0` it prints `FAIL 2` for 412 light and dark):

```js
const fs=require('fs'),path=require('path'),http=require('http'),{execFileSync}=require('child_process');
const ROOT=path.resolve(process.argv[2]||'.');
let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'playwright'))}
const sk='<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>'+fs.readFileSync(path.join(ROOT,'index.html'),'utf8')+'</body></html>';
const T={'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u==='/'){r.writeHead(200,{'content-type':'text/html'});return r.end(sk)}const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
srv.listen(0,'127.0.0.1',async()=>{const port=srv.address().port,b=await pw.chromium.launch();let fails=0;
for(const scheme of ['light','dark'])for(const w of [412,393,360]){const ctx=await b.newContext({viewport:{width:w,height:915},deviceScaleFactor:2,isMobile:true,colorScheme:scheme});
 await ctx.route(u=>!u.toString().startsWith('http://127.0.0.1:'+port),r=>r.abort());
 await ctx.addInitScript(()=>localStorage.setItem('parlance.v2',JSON.stringify({v:9,settings:{onboarded:true,lang:'de',seenVersion:'9.9.9',homeMusic:false,sfx:false}})));
 const p=await ctx.newPage();await p.goto('http://127.0.0.1:'+port+'/');await p.waitForSelector('#tabs .tab');await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{const R=s=>document.querySelector(s).getBoundingClientRect();const top=document.querySelector('.top'),br=R('.brand'),nm=R('.brand-name'),mk=R('.brand .mark'),mu=R('.top .music-btn'),sg=R('.top .seg');
  const shown=nm.top<br.bottom-1,whole=nm.right<=br.right+0.5;return {shown,whole,markIn:mk.left>=br.left&&mk.right<=br.right,noOverlap:br.right<=mu.left&&mu.right<=sg.left+0.5,fits:top.scrollWidth<=top.clientWidth+0.5&&sg.right<=window.innerWidth-15,pageWide:document.documentElement.scrollWidth>window.innerWidth+1}});
 const ok=(!r.shown||r.whole)&&r.markIn&&r.noOverlap&&r.fits&&!r.pageWide&&(w<412||r.shown);
 if(!ok)fails++;console.log((ok?'PASS':'FAIL'),scheme,w,JSON.stringify(r));await ctx.close();}
await b.close();srv.close();console.log(fails?'FAIL '+fails:'ALL PASS');process.exit(fails?1:0)});
```

- Screens (`node dev/flow.js shots --out flow/shots/2026-11-01/verify`, 412px, light and dark; then again with `--width 360`):
  - Top bar and Me: `--steps "shot:learn;tab:Me;wait:700;shot:me"`
  - Me on the web: `--steps "js:Web.on=true;tab:Me;wait:700;js:render();wait:500;full:me-web"` (the new line and **Go to Talk** sit under "Open Parlance in Claude" in Tutor access)
  - Tip cards, once per language (`--lang es` with `es-2-1`, `--lang de` with `de-2-1`, `--lang it` with `it-2-1`; repeat for x-2-3): `--steps "js:startLesson('es-2-1');wait:900;click:Start lesson;wait:600;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[0],nextEx();wait:600;shot:es-2-1-card1;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[1],nextEx();wait:600;shot:es-2-1-card2;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[2],nextEx();wait:600;shot:es-2-1-card3"` (use a comma, not a semicolon, between the two statements of one `js:` step). Before: `flow/shots/2026-11-01/before/light-es-es-2-1-bite3.png` (the plurals table on the sums card).
  - Review with a picture question (the screenshot learner has no cards, so this starts a review of de-1-4's words directly): `--steps "js:(l=>(beginSession('review','de',reviewQueue(l.vocab.map((v,i)=>({lesson:l,kind:'v',i,item:v,key:itemKey(l,'v',i),card:{n:0}})))),Run.pos=Math.max(0,Run.queue.findIndex(e=>e.type.startsWith('pic-'))),nextEx()))(getLesson('de-1-4'));wait:700;shot:review-pic"` (no semicolons inside a `js:` step). It must show "Tap the picture" with four pictures.
- Spot checks for the reviewer: read es-2-1, de-2-1 and it-2-1 side by side card by card (same ideas, same order, adapted where the grammar differs); confirm `git diff bf7f0e0 -- content/` changes only tip bodies and tip examples of the twelve lessons (no vocab, sentence, blank or table line); open a Review twice and see at most three pictures; check the top bar on the Learn, Stories and Me tabs at 412 and 360.

## Risks and rollback

- **Tip text.** Only tips changed, so no review card, resume or progress is touched. A half-done unit 2 lesson resumes with its old cards (resume stores the cards it already built). The tests pin where every example and table lands.
- **Fonts.** The screenshot tools block Google Fonts, so they measure fallback fonts. With Fredoka and Nunito on Matt's phone the widths differ slightly; the wrap makes that safe either way (the wordmark is whole or gone, never cut). Worth a glance on the phone after release.
- **Review pictures.** At most three per session, using the exact exercise types, grading and scheduling lessons already use; a word without enough pictures gets its plain question. Mistake sessions are unchanged.
- **Rollback:** `git revert` the release merge on `main`, bump to 4.27.1, republish, set `latest` in both homes (POLICY "Undoing a release"). Nothing is migrated, so nothing needs undoing in saved state.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
