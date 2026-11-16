# Three advanced stories in every language, and Spot the mistake

- **Cycle:** 2026-11-16-2 (program 2, release R1; `flow/PROGRAM-2.md`)
- **Status:** shipped (4.47.0)
- **Release:** 4.47.0 (minor: new content and a new exercise type)
- **Base:** `main` at 86accd5 (4.46.0)
- **Proposals built:** none (Matt asked in chat on 2026-11-16 to work through the roadmap)
- **Roadmap items:** R-3, R-13, R-62 (the `CONVO.never` review for new stories)

## Why this, why now

Each language has one B2 and one C1 story and no C2 story (`content/stories-*.js`), so advanced learners run out of reading first. Three stories per language at B2, C1 and C2 fix that, with the cast learners already know and story lines that call back to earlier stories. B2+ lessons also have no exercise that practices noticing an error: every one asks you to produce or pick the right form. Spot the mistake is built from the lesson's own blanks (a blank's wrong option that is another form of the right word, by `sameWordForm()`), so it needs no tutor, no microphone and no new content; 55 German, 58 Spanish and 41 Italian lessons of the 68 at B2–C2 have such a blank today.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New stories in all three languages, new ids (POLICY "New content in the existing shape") | — |
| WP2 | Amber | New exercise type, offline, no tutor, no microphone, tests in `dev/test.js` (POLICY "New exercise types"); it adds a `case` to `evaluate()` (Amber: answer checking) | The reviewer confirms that no existing `evaluate()` case changed, and that a lesson with a Spot question still resumes |

## Work packages

WP1 (three agents, one per language) and WP2 run in parallel: their files are disjoint. Integration comes after both.

### WP1 — Stories s10, s11 and s12 in German, Spanish and Italian

- **Agent:** parlance-content, one per language (WP1-de, WP1-es, WP1-it)
- **Model:** sonnet
- **Runs:** first, the three in parallel (worktrees), in parallel with WP2
- **Owns (may edit):** `content/stories-<lang>.js` (append three `ST(...)` after the last one, inside the same `STORIES.push(`); one block `Object.assign(STORY_GLOSS.<lang>, { … });` appended at the very end of `content/glossary.js` under the comment `/* stories s10–s12 (4.47.0) */`
- **Reads first:** `CLAUDE.md`; `.claude/agents/parlance-content.md`; your language's s7, s8 and s9 (tone and length: 12 lines and 3–4 questions); `content/cast.js` (roles)
- **Must not touch:** existing stories, lessons, `js/`, `index.html`, `dev/test.js`, other languages' glossary blocks

**Spec.** Each story: 12 lines plus the 3 questions below, at the beat positions shown (Q). Each question has exactly three options, the right one first, written exactly as given. Lines are natural spoken language at the story's level, 6–22 words each, no two lines identical, and none of 3–4 words that only agrees (yes, of course, exactly, sure). Spanish is Latin American (Mexico City: *ustedes*, *departamento*, *elevador*); Italian uses *Lei* between Signor Bianchi and others who don't know each other well and *tu* among friends, with ’ in elisions. Scenes are the drawn ones (no `STORY_ART` entry).

The three stories tell the same events in the three languages, with that language's cast:

**s10 (B2), a meeting about the building.** Grammar flavor: the passive with a modal, Konjunktiv II / conditional, *obwohl* / *aunque* / *anche se*, a condition.

| | German `de-s10` | Spanish `es-s10` | Italian `it-s10` |
|---|---|---|---|
| Title (target, English) | `Die Mieterversammlung`, `The tenants’ meeting` | `La junta de vecinos`, `The residents’ meeting` | `La riunione di condominio`, `The building meeting` |
| Scene | `home` | `home` | `home` |
| Chair / asks about cost / wants quotes / worried for business | brandt / lena / weber / emre | carmen / mateo / sofia / diego | nonna / giulia / conti / marco |
| The work | the old heating is replaced in spring | the old elevator is replaced | the building finally gets a lift |
| The rise | rent up 8 percent | the maintenance fee up 15 percent for a year | the fees up 10 percent for two years |
| The business | Emre’s shop: spring is his busiest season | Diego’s restaurant deliveries use the elevator every morning | Marco unloads goods for the deli at the entrance every morning |
| The joke at the end | Emre’s coffee is the only thing in the building that never breaks down | Diego’s tamales are the only thing in the building that never fail | Marco’s salami will convince everyone more than any vote |

Beats: (1) the chair opens: the work will finally happen; (2) the second speaker is glad but asks whether it will cost the tenants more; (3) the chair: yes, the rise above; (4) the third speaker says that, as far as she knows, only part of the cost can be passed on, and asks for (de) the figures in writing / (es, it) three quotes from different companies before deciding; **Q1**; (5) the fourth speaker is worried for his business (row above) and asks for the work to be done in summer (de) / in August (es, it); (6) the chair agrees, if the tenants accept the rise; (7) the second speaker proposes that the rise starts only once the new heating / elevator / lift works; **Q2**; (8) the third speaker backs her; (9) the chair hesitates, then agrees; (10) the fourth speaker offers food from his business at the next meeting (de: coffee and snacks from the shop; es: tamales; it: cheese and salami); (11) the chair makes the joke; (12) someone laughs and closes the meeting; **Q3**.

| | German | Spanish | Italian |
|---|---|---|---|
| Q1 | `What does Frau Weber ask for?` `The figures in writing\|A lower rent at once\|A new landlord` | `What does Sofía ask for?` `Three quotes from different companies\|A cheaper apartment\|A new administrator` | `What does Dottoressa Conti ask for?` `Three quotes before the vote\|A lower fee at once\|A new administrator` |
| Q2 | `When should the rent go up, according to Lena?` `Once the new heating works\|Next month\|After the summer holidays` | `When should the fee go up, according to Mateo?` `When the new elevator works\|Next month\|After Christmas` | `When should the fees go up, according to Giulia?` `When the lift works\|Next month\|After the summer` |
| Q3 | `What does Emre offer?` `Coffee and snacks from his shop\|His shop as a storeroom\|To pay part of the rent` | `What does Diego offer?` `Tamales at the next meeting\|To pay for the elevator\|His restaurant for the meeting` | `What does Marco offer?` `Cheese and salami at the next meeting\|To pay for the lift\|His shop for the meeting` |

**s11 (C1), an interview about small businesses.** Grammar flavor: hedging, "not that…", "to what extent", reported figures, register.

| | German `de-s11` | Spanish `es-s11` | Italian `it-s11` |
|---|---|---|---|
| Title | `Kleine Cafés, große Ketten`, `Small cafés, big chains` | `Fondas contra cadenas`, `Small eateries against the chains` | `Botteghe contro supermercati`, `Small shops against supermarkets` |
| Scene | `studio` | `studio` | `studio` |
| Host / guest | jonas (his campus radio show) / lena (her café) | mateo (his show on a community radio station) / diego (his small restaurant) | luca (his podcast) / marco (his deli and market stall) |
| The city and the figure | Berlin: rents have doubled in ten years | Mexico City: rents have doubled in ten years | Rome: rents have doubled in ten years |
| The offer at the end | a free coffee for listeners who mention the show | a free coffee de olla for listeners who mention the show | a free espresso for listeners who mention the podcast |

Beats: (1) the host introduces the show and the question: can small businesses survive against the big chains?; (2) the guest: it isn’t that she/he is against the chains, but they set prices small places can’t match; (3) the host asks to what extent it is a question of price rather than quality; (4) the guest: price matters less than people think; what customers really want is to be known by name; **Q1**; (5) the host reads a listener’s message: a place in the listener’s street closed last year; (6) the guest: rents are the real problem; according to a study, the figure above; (7) the host, playing devil’s advocate: isn’t that simply the market?; (8) the guest answers politely but firmly that a street of chains is poorer for everyone; (9) the host asks what would help; (10) the guest: longer leases for small businesses, and customers who come back every week instead of once; **Q2**; (11) the host jokes that he would interview the guest more often if it came with breakfast; (12) the guest makes the offer above; **Q3**.

| | German | Spanish | Italian |
|---|---|---|---|
| Q1 | `What do customers really want, according to Lena?` `To be known by name\|The lowest prices\|Free Wi-Fi` | `What do customers really want, according to Diego?` `To be known by name\|The lowest prices\|Free Wi-Fi` | `What do customers really want, according to Marco?` `To be known by name\|The lowest prices\|Free Wi-Fi` |
| Q2 | `What would help, according to Lena?` `Longer leases and regular customers\|Higher prices\|More chains in the area` | `What would help, according to Diego?` `Longer leases and regular customers\|Higher prices\|More chains in the area` | `What would help, according to Marco?` `Longer leases and regular customers\|Higher prices\|More supermarkets in the area` |
| Q3 | `What does Lena offer the listeners?` `A free coffee if they mention the show\|A discount on cake\|A job at the café` | `What does Diego offer the listeners?` `A free coffee if they mention the show\|A discount on tacos\|A job at the restaurant` | `What does Marco offer the listeners?` `A free espresso if they mention the podcast\|A discount on cheese\|A job at the deli` |

**s12 (C2), a speech at a celebration.** Grammar flavor: irony and understatement, rhetoric, a proverb, past narration.

| | German `de-s12` | Spanish `es-s12` | Italian `it-s12` |
|---|---|---|---|
| Title | `Zwanzig Jahre Emres Laden`, `Twenty years of Emre’s shop` | `Los ochenta de Doña Carmen`, `Doña Carmen turns eighty` | `Dieci anni del bar di Giulia`, `Ten years of Giulia’s bar` |
| Scene | `shop` | `home` | `cafe` |
| Speaker / honored / adds a story / teased | weber / emre / leyla / brandt | diego / carmen / sofia / mateo | nonna / giulia / conti / bianchi |
| "It wouldn’t last…" | twenty years ago the neighbors said the shop wouldn’t last a winter | fifty years ago everyone said her fruit stall wouldn’t last a rainy season | ten years ago the neighbors said the bar wouldn’t last a summer |
| What the place has been | a post office, a night pharmacy, a lost-and-found | a bank, a pharmacy, an advice office | a post office, a meeting place, a lost-and-found |
| The tease | a place where complaints about the heating are heard with more patience than by certain landlords | a place where drummers are put up with more patiently than by certain neighbors | a place where his guests get directions with more patience than at a certain front desk |
| The protest and the reply | Brandt: the heating has worked since spring. Weber: exactly, it only took nineteen years | Mateo: he only plays before ten. Diego: exactly, and it only took two years | Bianchi: his guests have maps now. Nonna: exactly, it only took ten years |
| The added story | Emre once opened at three in the morning for a neighbor who needed baby food | Doña Carmen once opened at dawn to bring fruit to the hospital night shift | Giulia once opened at five for the hospital night shift |
| The promise at the end | Brandt, with a sigh, promises not to raise the shop’s rent this year | Mateo, with a sigh, promises not to play the drums after nine on her birthday | Bianchi, with a sigh, promises to send all his guests to Giulia’s for breakfast |

Beats: (1) the speaker taps a glass: she or he was asked for "a few words", a flexible idea, as everyone knows; (2) the "it wouldn’t last" story; **Q1**; (3) what the place has been since; (4) the tease, with a glance at the teased person; (5) the protest; (6) the reply; (7) the added story, told by the third person; **Q2**; (8) the speaker: what makes a street (es: a family) a home is not the buildings but people like the honored person; (9) she or he raises a glass; (10) the honored person, moved, answers (es: with a proverb, `Más sabe el diablo por viejo que por diablo`); (11) she or he says she only kept going because people kept coming back; (12) the teased person’s promise; **Q3**.

| | German | Spanish | Italian |
|---|---|---|---|
| Q1 | `What did the neighbors say twenty years ago?` `That the shop wouldn’t last a winter\|That Emre would become famous\|That the street would close` | `What did people say when the stall opened?` `That it wouldn’t last a rainy season\|That Carmen would get rich\|That the market would close` | `What did the neighbors say ten years ago?` `That the bar wouldn’t last a summer\|That Giulia would become famous\|That the street would close` |
| Q2 | `Why did Emre once open at three in the morning?` `A neighbor needed baby food\|He had lost his keys\|A delivery came early` | `Why did Doña Carmen once open at dawn?` `To bring fruit to the hospital night shift\|She had lost her keys\|A truck came early` | `Why did Giulia once open at five?` `For the hospital night shift\|She had lost her keys\|A delivery came early` |
| Q3 | `What does Herr Brandt promise?` `Not to raise the shop’s rent this year\|To fix the heating again\|To give a speech next year` | `What does Mateo promise?` `Not to play the drums after nine on her birthday\|To cook dinner\|To give a speech next year` | `What does Signor Bianchi promise?` `To send his guests to Giulia’s for breakfast\|To close his pensione\|To give a speech next year` |

**Steps.**
1. Write the three `ST(...)` calls at the end of `content/stories-<lang>.js` (a comma after the current last story; the file still ends with `);`).
2. Run `npm test` (agent file, "Checking your work"); add each word it lists as unglossed to your `STORY_GLOSS` block, then run it again. Only the story count (27 → 36) may fail.
3. `node dev/flow.js guard`: no FIX or STOP from your files.
4. In your report, list every line of 3–4 words in your three stories (there should be none that only agrees).

**Acceptance criteria:**
- [ ] Three stories with exactly the ids, levels, titles, scenes and cast above; 12 lines and 3 questions each, questions as written
- [ ] `npm test` fails only on the story count, and lists no unglossed story word
- [ ] es uses *ustedes* and no Spain-only words (the guard checks); it uses ’ in elisions

**Stop and report if:** a beat can't be said naturally at the level without changing what happens, or a cast member would have to say something that contradicts their role in `content/cast.js`.

### WP2 — Spot the mistake (B2 and up)

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** in parallel with WP1 (worktree)
- **Owns (may edit):** `js/config.js` (one `SPOT` line after `CONVO`), `js/core/engine.js` (`blankSaid()`, new `spotEx()`, one call in `buildLesson()`, one `case` in `evaluate()`), `js/ui/runner.js` (`RENDER.spot`, `feedbackAnswer()`, two lines in `showFeedback()`), `styles/components.css` (nothing, unless the screenshot shows a problem; then only a `.spot-*` rule using tokens), `dev/test.js` (one new block after the conversation-practice block)
- **Reads first:** `buildLesson()`, `blankEx()`, `blankSaid()`, `sameWordForm()`, `formNote()`, `blankFormNote()`, `genderEx()` (the model for an exercise without a review key), `evaluate()` in `js/core/engine.js`; `RENDER.reply`, `options()`, `qLabel()`, `feedbackAnswer()`, `showFeedback()`, `resumeSave()`, `resumeFind()` in `js/ui/runner.js`
- **Must not touch:** content files, `index.html`, other `evaluate()` cases, `CONVO`

**Spec.**

*Config* (`js/config.js`, after `CONVO`):
```js
/* Spot the mistake: one per lesson at these levels, made from a blank whose wrong option is another form of the right word */
const SPOT = { levels: ['B2', 'C1', 'C2'] };
```

*Engine* (`js/core/engine.js`):
- `blankSaid(b, o)`: add an optional second argument, the option to put in the gap (default `b.a`). Every existing call keeps working unchanged.
- New `spotEx(lesson, met)` next to `blankEx()`. `met` is `buildLesson`'s set of shown phrases (`'s' + i`, `'b' + i`). Returns `null` or the exercise:
```js
function spotEx(lesson, met){
  const lang = lesson.lang, nB = Math.min(lesson.blanks.length, 3), key = t => fold(norm(t, lang));
  for (let i = 0; i < nB; i++){
    const b = lesson.blanks[i]; if (!met.has('b' + i)) continue;
    const wrong = b.o.slice(1).find(o => sameWordForm(o, b.a, lang, lesson)); if (!wrong) continue;
    const bad = blankSaid(b, wrong), fixed = blankSaid(b); if (key(bad) === key(fixed)) continue;
    const pool = [];
    for (let j = 0; j < nB; j++) if (j !== i && met.has('b' + j)) pool.push({ t: blankSaid(lesson.blanks[j]), e: lesson.blanks[j].e });
    lesson.sentences.forEach((s, k) => { if (met.has('s' + k)) pool.push({ t: s.t, e: s.e[0] }); });
    const seen = new Set([key(bad), key(fixed)]), others = [];
    for (const p of shuffle(pool)){ if (others.length === 2) break; if (!seen.has(key(p.t))){ seen.add(key(p.t)); others.push(p); } }
    if (others.length < 2) continue;
    const w = sameWordForm(wrong, b.a, lang, lesson);
    return { id: ++EXID, type: 'spot', lang, lesson, blank: b, wrong, correct: bad, fixed, en: b.e, note: formNote(wrong, b.a, w, lang),
      options: shuffle([bad, ...others.map(p => p.t)]) };
  }
  return null;
}
```
- `buildLesson()`: right after the `seq.forEach(...)` loop and before the form drills line, add `if (SPOT.levels.includes(lesson.level)){ const sp = spotEx(lesson, met); if (sp) out.push(sp); }`. At most one per lesson; it comes after every phrase it uses has been shown.
- `evaluate()`: add `case 'spot': return value === ex.correct ? { ok: true, level: 'exact', note: ex.note } : { ok: false, level: 'wrong', note: 'That one is right. The mistake is in “' + ex.correct + '”. ' + ex.note };` There is no near miss: only the wrong sentence counts.
- No `key`, no `srs`, no `kind`: it moves no review card, adds nothing to Fix my mistakes, and pays `XP.perAnswer` like any lesson question.

*Runner* (`js/ui/runner.js`):
- `RENDER.spot(ex, api)`: `h('div', { class: 'ex' }, qLabel('Spot the mistake'), h('p', { class: 'muted' }, 'One of these sentences has a mistake. Tap it.'), options(ex.options, o => { api.set(o); api.ready(true); }, o => h('span', { lang: LANGS[ex.lang].tts }, o)))`. Tapping never speaks (a wrong sentence has no recording and shouldn't be heard).
- `feedbackAnswer()`: `if (ex.type === 'spot') return { t: ex.fixed, en: ex.en, target: true };` before the `blank` line.
- `showFeedback()`: add `'spot'` to the list of types whose answer shows even when right (the array that holds `'blank', 'pic-pick', 'gender'`), and replace the label line with `if (!res.ok || ex.type === 'spot') fb.append(h('div', { class: 'fb-label' }, ex.type === 'spot' ? 'Put right' : 'Correct answer'));` (the same line, with the label chosen by type). Autoplay then reads the fixed sentence, which is already recorded (a filled-in blank).
- Resume needs nothing new: `resumeSave()` stores `ex.blank` as its index and keeps the strings.

*Tests* (`dev/test.js`, one block named `/* spot the mistake */`):
- `spot: B2–C2 lessons with a form blank ask one, and A1–B1 lessons none` — for every lesson, `buildLesson` has at most one `spot`; none below B2; at least 50 German, 50 Spanish and 35 Italian B2–C2 lessons have one (floors under today's 55, 58 and 41).
- `spot: the mistake is another form of the blank's answer and the other two lines are the lesson's own` — for each spot: `ex.wrong !== ex.blank.a`, `sameWordForm(ex.wrong, ex.blank.a, …)` is truthy, `ex.fixed === blankSaid(ex.blank)`, and the two other options are each a `blankSaid()` of another blank or a sentence's `t`.
- `spot: every line was shown first` — `ex.fixed` and both other options appear in an earlier `phrases` card of the same queue.
- `spot: grading` — `evaluate(ex, ex.correct)` is `{ ok: true, level: 'exact' }` with a note naming `ex.blank.a`; `evaluate(ex, <another option>)` is not ok and its note starts with `That one is right.`; `evaluate(ex, '')` is not ok.
- `spot: no review card, no mistakes entry` — the exercise has no `key` and no `srs`; finishing a C1 lesson in the runner with a wrong spot answer leaves `S.langs[lang].miss` without a new entry for it.
- `spot: a lesson with one resumes` — start a C1 lesson that has a spot, `resumeSave()`, `resumeFind(id)` returns a queue whose spot has the same `blank`, `wrong`, `fixed` and `options`.
- `spot: the card renders and the fix shows` — in the runner, jump to the spot exercise, tap the wrong sentence, Check: the feedback shows `Put right` and `ex.fixed`; tap another sentence on a fresh copy: `Not quite` and the note.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0` (with WP1 merged: story count 36), including the seven `spot:` checks
- [ ] `git diff` shows no change to any existing `case` of `evaluate()` and no change to `blankSaid()` callers
- [ ] Screens (Verification plan) show the card and both feedbacks at 412px and 360px, light and dark, with no sideways scroll

**Stop and report if:** a spot exercise would need a saved field, or the per-exercise checks in the lesson loop (`exactly one correct option`) fail for a spot and the fix would mean changing `sameWordForm()`.

## Integration

- [ ] `js/config.js`: if WP1 reports a story line of 3–4 words that only agrees, add its exact text to `CONVO.never` (R-62). If none, nothing.
- [ ] `dev/test.js`: `P.STORIES.length === 27` → `=== 36`
- [ ] `CLAUDE.md`: "and 9 stories" → "and 12 stories"; `docs/ARCHITECTURE.md` "How a lesson teaches": one sentence after "The harder practice … closes the lesson.": "From B2, a Spot the mistake question (`SPOT` in `config.js`, `spotEx()` in `engine.js`) shows three of the lesson's sentences, one with a blank's wrong form in it; it has no review key."
- [ ] Word pictures: none (stories don't get word pictures)
- [ ] Voices: parlance-chores, `node dev/voices.js --dry`, then `node dev/voices.js` (about 108 story lines and their words; hand off per CLAUDE.md if the key is refused)

## Release notes

- **Title:** Stories and sharp eyes
- **Notes:**
  - Three new stories in every language, at B2, C1 and C2: a meeting about the building, a radio interview and a speech at a party.
  - From B2, lessons ask you to spot the mistake: tap the sentence that’s wrong, then see it put right.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/voices.js --dry`.
- Screens (412px, light and dark): `tab:Stories;wait:600;shot:stories` (the new stories listed); `js:openStory('de-s12');wait:900;shot:de-s12`; `js:startLesson('de-40-1');wait:900;click:Start lesson;wait:800;js:Run.pos=Run.queue.findIndex(e=>e.type==='spot');nextEx();wait:500;shot:spot-de` and the same for `es-40-1` and `it-42-4` (if `openStory` is not the stories screen's function name, use the one `js/ui/stories.js` defines). Repeat `spot-de` at 360px.
- Spot checks for the reviewer: read `de-s12`, `es-s12` and `it-s12` side by side (the irony must land in each language); play a C1 lesson to its spot question twice (right and wrong).

## Risks and rollback

A spot question built from a blank whose "wrong" option is in fact acceptable would mark a right sentence as the mistake; the per-exercise check (exactly one option evaluates right) can't see that, so the reviewer reads five spot questions per language. Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** 4.47.0, `74e6732` | **Dropped:** none | **Escalated:** none
- **Notes for the next cycle:**
