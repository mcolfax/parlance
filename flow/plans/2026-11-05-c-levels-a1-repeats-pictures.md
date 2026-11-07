# Two new C-level units, no more A1 repeats, and the missing older pictures

- **Cycle:** 2026-11-05 (run by hand at Matt's request in session_01VFBRs4TmdrRsdPrBRpk4Ck)
- **Status:** approved
- **Release:** 4.29.0 (minor: new content)
- **Base:** `main` at d80ac3c
- **Proposals built:** none (Matt asked in chat: "Proceed with all of the optional recommendations")
- **Roadmap items:** new

## Why this, why now

Matt asked for three follow-ups to 4.26: C1 and C2 got nothing in the 4.26 expansion (the snapshot shows C1 16 and C2 12 lessons per language, against 28–36 at the other levels); German and Spanish A1 teach Colors and Seasons & months twice, because unit 16 ("Colors, clothes & weather") repeats units 20 and 21, while Italian's unit 16 already teaches new things (shades and patterns, fabrics, the forecast, seasons and holidays); and about 100 older words have a picture brief but no drawing (the coverage table's "briefed" column, e.g. de A1 12, it B1 12). His third alternate, C1 "Law & justice", ships next as 4.30.0 so this release stays inside `maxNewLessonsPerLanguagePerCycle` (8).

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New content in the existing shape, all three languages, new ids (units 40–41) | – |
| WP2 | Amber | Changing existing content's text (de-16-1…4, es-16-1…4); Matt asked for it | Every orphaned review-card key whose text exists in another lesson is carried over by an alias pack in both homes; ids, titles' unit and level unchanged; the guard runs with `--allow-orphans` listing exactly those keys |
| WP3 | Green | Word pictures drawn in code | – |

## Work packages

### WP1 — C1 "Arts & criticism" (unit 40) and C2 "Ideas & ethics" (unit 41), in German, Spanish and Italian

- **Agent:** parlance-content, one per language (WP1-de, WP1-es, WP1-it)
- **Model:** sonnet
- **Runs:** first, the three in parallel with each other and with WP2 and WP3 (worktrees)
- **Owns (may edit):** `content/<lang>-6-more.js` (new), and the `LESSON_GLOSS.<lang>` part of `content/glossary.js` (add one `Object.assign(LESSON_GLOSS.<lang>, { … });` block at the very end of the file, with a comment `/* units 40–41 (4.29.0) */`)
- **Reads first:** `CLAUDE.md`; `.claude/agents/parlance-content.md`; as the model, the 4.26 file `content/<lang>-5-more.js` (same author style, same helpers) and one existing C1 lesson: de-36-1 (`content/de-4-c1.js`), es-36-1 (`content/es-4-c1.js`), it-36-1 (`content/it-4-c1.js`)
- **Must not touch:** `index.html`, `dev/test.js`, `js/`, `CLAUDE.md`, `docs/`, pictures files, other languages' glossary blocks

**Spec.** File header: `"use strict";\n/* <Language> C1–C2: units 40–41 (arts & criticism, ideas & ethics) */` then `COURSE_SRC.<lang>.push(U('Arts & criticism', 'C1', [...4 lessons...]), U('Ideas & ethics', 'C2', [...4 lessons...]));`. Each lesson: 8 vocab, 5–6 sentences, 3 blanks, a tip of 3–5 short sentences (≤ 900 characters) with 2–3 examples and 1–2 tables. Lesson titles are the same in every language. The grammar idea below is the tip; every sentence and blank should use it where natural; at least two blanks test it directly.

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-40-1 | Reviewing a film | **so … auch** (however …): *So spannend die Handlung auch ist, das Ende enttäuscht* — the so-clause has its verb at the end and the main clause keeps normal order. Words: die Handlung, die Besetzung, der Regisseur, die Kritik, überzeugend, vorhersehbar, enttäuschen, die Spannung | **lo + adjective/adverb + que** (how …): *No te imaginas lo bien que actúa*; the adjective agrees: *lo buena que es la película*. Words: la trama, el reparto, el director, la reseña, convincente, predecible, decepcionar, el suspenso | **pur + gerundio** (even though): *Pur essendo lungo, il film non annoia mai.* Words: la trama, il cast, il regista, la recensione, convincente, prevedibile, deludere, la suspense |
| xx-40-2 | A book that stays with you | **Konjunktiv II for criticism:** *Ich hätte mir ein anderes Ende gewünscht. Der Autor hätte kürzen sollen.* Words: der Roman, die Figur, der Erzähler, der Schluss, fesseln, langatmig, empfehlen, das Kapitel | **quien + subjunctive** for "whoever": *Quien lo haya leído sabrá de qué hablo. Quien busque acción, se va a decepcionar.* Words: la novela, el personaje, el narrador, el final, atrapar, lento, recomendar, el capítulo | **gerundio composto** (having …): *Avendo letto il libro, ho trovato il film deludente.* Words: il romanzo, il personaggio, il narratore, il finale, coinvolgente, consigliare, il capitolo, la lettura |
| xx-40-3 | At the exhibition | **indem** (by …ing), and *dadurch, dass*: *Die Künstlerin erzeugt Spannung, indem sie Licht und Schatten kontrastiert.* Words: die Ausstellung, das Gemälde, die Skulptur, der Pinselstrich, der Schatten, darstellen, abstrakt, der Kontrast | **se diría que** (you’d think that): *Se diría que el cuadro se mueve.* Words: la exposición, la escultura, la pincelada, el lienzo, representar, abstracto, el contraste, la obra | **si direbbe che + congiuntivo:** *Si direbbe che la statua respiri.* Words: la mostra, il dipinto, la scultura, la pennellata, la tela, rappresentare, astratto, l’opera |
| xx-40-4 | Architecture & the city | **es sei denn** (unless): *Das Viertel bleibt grau, es sei denn, die Stadt pflanzt Bäume.* Words: das Gebäude, die Fassade, das Hochhaus, die Grünfläche, die Brücke, gestalten, das Viertel, denkmalgeschützt | **resultar + adjective** (to come across as, to turn out): *El edificio resulta frío por fuera, pero acogedor por dentro.* Words: el edificio, la fachada, el rascacielos, el área verde, la colonia, diseñar, acogedor, el puente | **far sì che + congiuntivo** (to make sure that): *Il nuovo parco fa sì che il quartiere sia più vivibile.* Words: l’edificio, la facciata, il grattacielo, il quartiere, progettare, vivibile, il ponte, lo spazio verde |
| xx-41-1 | Thought experiments | **angenommen, … / gesetzt den Fall, …** (supposing): *Angenommen, du könntest Gedanken lesen: Würdest du es tun?* Words: das Gedankenexperiment, angenommen, gesetzt den Fall, das Dilemma, abwägen, moralisch, die Folge, die Wahl | **suponiendo que / en el supuesto de que + subjunctive:** *Suponiendo que pudieras leer la mente, ¿lo harías?* Words: el experimento mental, suponiendo que, en el supuesto de que, el dilema, sopesar, moral, la consecuencia, la elección | **supponiamo che / ammettiamo che + congiuntivo:** *Supponiamo che tu possa leggere nel pensiero: lo faresti?* Words: l’esperimento mentale, supponiamo che, ammettiamo che, il dilemma, soppesare, morale, la conseguenza, la scelta |
| xx-41-2 | Rights & duties | **ob … oder / sei es … sei es** (whether … or): *Jeder hat ein Recht auf Bildung, ob arm oder reich. Sei es aus Angst, sei es aus Bequemlichkeit: viele schweigen.* Words: das Recht, die Pflicht, die Würde, die Freiheit, die Verantwortung, verletzen, gerecht, die Gesellschaft | **deber vs deber de** (must: duty vs. probability): *Debemos respetar la dignidad de todos. Debe de ser difícil vivir sin libertad.* Words: el derecho, el deber, la dignidad, la libertad, la responsabilidad, violar, justo, la sociedad | **comunque / checché + congiuntivo** (however, whatever): *Comunque la si pensi, la dignità è di tutti. Checché se ne dica, la libertà ha dei limiti.* Words: il diritto, il dovere, la dignità, la libertà, la responsabilità, violare, giusto, la società |
| xx-41-3 | Science and belief | **nicht einmal … geschweige denn** (not even … let alone): *Man kann es nicht beweisen, geschweige denn widerlegen.* Words: der Glaube, die Vernunft, der Beweis, widerlegen, die Hypothese, der Zweifel, skeptisch, die Wissenschaft | **ni siquiera … y mucho menos** (not even … let alone): *Ni siquiera podemos medirlo, y mucho menos explicarlo.* Words: la fe, la razón, la prueba, refutar, la hipótesis, la duda, escéptico, la ciencia | **neanche … figuriamoci / tanto meno** (not even … let alone): *Non riusciamo neanche a misurarlo, figuriamoci a spiegarlo.* Words: la fede, la ragione, la prova, confutare, l’ipotesi, il dubbio, scettico, la scienza |
| xx-41-4 | The good life | **je nachdem, ob / wie / wen** (depending on): *Glück bedeutet, je nachdem, wen man fragt, etwas ganz anderes.* Words: das Glück, der Sinn, die Zufriedenheit, die Gelassenheit, das Wohlbefinden, gelingen, erfüllt, je nachdem | **aun + gerundio** (even …ing): *Aun teniendo todo, no era feliz.* Words: la felicidad, el sentido, la serenidad, el bienestar, pleno, aun, valer la pena, la gratitud | **pur di + infinito** (just to, as long as): *Farebbe di tutto pur di essere felice.* Words: la felicità, il senso, la serenità, il benessere, appagato, pur di, valere la pena, la gratitudine |

Sentence themes per lesson (all languages): 40-1 a film's plot, cast, director, the review, suspense and ending; 40-2 a novel's characters, narrator, ending, a long-winded chapter, recommending it; 40-3 an exhibition's paintings, sculpture, brushstrokes, light and shadow, abstract work; 40-4 buildings, façades, a high-rise, green space, a bridge, a neighborhood; 41-1 thought experiments and dilemmas, weighing consequences, choosing; 41-2 rights and duties, dignity, freedom, responsibility, fairness; 41-3 faith and reason, proof, refuting a hypothesis, doubt, scepticism; 41-4 happiness, meaning, contentment, serenity, well-being, what makes life worth it.

Spanish is Latin American (ustedes; *suspenso*, *colonia*, *área verde*, *reseña*). Italian uses *tu* with friends, *Lei* when formal, typographic ’ in elisions, and sentence-ending periods outside bold in the tip body. A word's first English meaning is the one shown; give natural alternatives.

**Steps.**
1. Write `content/<lang>-6-more.js` as specified.
2. Link `node_modules` from the main checkout if missing, add the file to your worktree's `index.html` *only to test* (right after `content/<lang>-5-more.js`), and run `node /tmp/claude-0/-home-user-parlance/8f0d00dd-3a4b-5940-9f2b-0144b87dffc1/scratchpad/lcheck.js "$PWD" '^<lang>-4[01]-'` until it prints `no failures` and lists no words without a meaning (add those to your glossary block).
3. Run the full suite (`NODE_OPTIONS=--max-old-space-size=6144 npm test`, 30-minute timeout). Expected failures: only `lesson count` (the integration step updates it). Fix everything else.
4. **Revert your `index.html` change** before committing (integration owns it). Commit `content/<lang>-6-more.js` and `content/glossary.js` only.

**Acceptance criteria:**
- [ ] 8 lessons with exactly the ids above, unit titles `Arts & criticism` (C1) and `Ideas & ethics` (C2)
- [ ] The checker prints `no failures` and no unglossed words for `^<lang>-4[01]-`
- [ ] `npm test` fails only on the lesson count
- [ ] Spanish: no vosotros forms; Italian: no straight apostrophes in elisions

**Stop and report if:** a listed word has no natural equivalent at that level in your language, or a grammar idea is already the focus of an existing tip in your language (`grep` the tips first).

### WP2 — German and Spanish A1 unit 16 stops repeating units 20 and 21

- **Agent:** parlance-content (one agent, both languages)
- **Model:** sonnet
- **Runs:** in parallel with WP1 and WP3 (worktree)
- **Owns (may edit):** the `U('Colors, clothes & weather', 'A1', …)` unit in `content/de-3-more.js` and `content/es-3-more.js` (lessons de-16-1…4 and es-16-1…4 only); the `LESSON_GLOSS.de` and `LESSON_GLOSS.es` additions at the end of `content/glossary.js` (one block per language, comment `/* unit 16 (4.29.0) */`)
- **Reads first:** `CLAUDE.md`, `.claude/agents/parlance-content.md`, Italian it-16-1…4 in `content/it-3-more.js` (the model: same four topics), and units 20–21 in German and Spanish (what A1 learners already know there, so nothing repeats)
- **Must not touch:** anything else, including the unit title, the lesson ids, and every other unit

**Spec.** Keep the four ids and the unit; replace each lesson's title, tip, vocab, sentences and blanks:

| id | New title | German | Spanish |
|---|---|---|---|
| xx-16-1 | More colors | Tip "Shades and patterns": **hell-** and **dunkel-** make one word with the color (*hellblau*, *dunkelgrün*); after *ist* colors take no ending; patterns *gestreift*, *kariert*, *gepunktet*. Words: hell, dunkel, hellblau, dunkelgrün, lila, rosa, gestreift, kariert | Tip "Shades and patterns": **claro** and **oscuro** after the color, and the pair never changes (*una camisa azul claro*); patterns **de rayas**, **de cuadros**, **de lunares**. Words: claro, oscuro, celeste, morado, rosa, de rayas, de cuadros, de lunares |
| xx-16-2 | Clothes & fabrics | Tip "Made of: **aus** + material" (no article: *Der Pullover ist aus Wolle*). Words: die Wolle, die Baumwolle, das Leder, die Seide, der Pullover, der Gürtel, die Krawatte, der Hut | Tip "Made of: **de** + material" (*un suéter de lana*). Words: la lana, el algodón, el cuero, la seda, el suéter, el cinturón, la corbata, el sombrero |
| xx-16-3 | The forecast | Tip "Tomorrow's weather in the present": *Morgen regnet es. Am Wochenende wird es warm* (werden = to get). Words: die Wettervorhersage, die Temperatur, das Grad, der Nebel, bewölkt, sonnig, übermorgen, das Gewitter | Tip "Forecasts with **va a**": *Mañana va a llover. Va a hacer calor.* Words: el pronóstico, la temperatura, el grado, la neblina, nublado, despejado, pasado mañana, la tormenta |
| xx-16-4 | Seasons & holidays | Tip "Holidays: **zu** / **an** Weihnachten, **an** Ostern, and verb second after a time phrase" (*Im Winter fahren wir Ski*). Words: die Jahreszeit, der Feiertag, Weihnachten, Ostern, Ski fahren, der Schnee, das Blatt, der Urlaub | Tip "Holidays and seasons with **en**" (*en Navidad, en Semana Santa, en invierno*), and the **Día de Muertos** on November 2. Words: la estación del año, las vacaciones, la Navidad, la Semana Santa, el Día de Muertos, esquiar, la nieve, la hoja |

Keep each lesson at 8 vocab, 5 sentences and 3 blanks (A1 level: short sentences, present tense, words already taught in A1 or this lesson). Write *la estación del año*, never plain *la estación* (that text means "station" elsewhere).

**Steps.** 1. Rewrite the eight lessons. 2. Run the checker for `'^(de|es)-16-'` until `no failures` with no unglossed words. 3. `NODE_OPTIONS=--max-old-space-size=6144 npm test` (30 minutes) must end with `FAIL 0`. 4. `node dev/flow.js guard` will list the orphaned review-card keys of the old items: copy that list into your report (integration writes the alias packs). 5. Commit the two content files and `content/glossary.js`.

**Acceptance criteria:**
- [ ] de-16-1…4 and es-16-1…4 have the titles above, none of their vocab repeats a vocab text of units 20 or 21 in the same language
- [ ] The checker prints `no failures`; `npm test` ends with `FAIL 0`
- [ ] The report lists the guard's orphaned keys

**Stop and report if:** keeping a lesson at the A1 level needs a word that units 1–30 don't teach and that can't be a vocab item.

### WP3 — Draw the older briefed pictures, then decide the new words

- **Agent:** parlance-illustrator
- **Model:** sonnet
- **Runs:** part 1 in parallel with WP1 and WP2 (worktree); part 2 after the integration merges WP1 and WP2 (on the cycle branch)
- **Owns (may edit):** `js/core/pics.js`, `design/pictures/briefs-src.txt`, the generated `design/pictures/briefs.json`, `design/pictures/words.json`, `content/pictures.js`; in part 2 also a fourth vocab field (`'<picture id>'` or `'-'`) in the new lessons' files, if a word picks up a wrong-sense picture
- **Reads first:** `.claude/agents/parlance-illustrator.md` and everything it lists
- **Must not touch:** lesson text, meanings, other code

**Spec.** Part 1: every concept the coverage table counts as **briefed, not drawn** (about 100 across all levels: `node design/pictures/tools.js check`; the briefs already say what to draw). Draw each one into `PICS` from its brief, at the quality of 4.26.1's 96 drawings. If a brief can't be drawn recognizably, change its line to `- <id> | <reason>` instead. Part 2: the new concepts of units 40–41 and the new unit 16 lessons: decide each (draw concrete things such as a film reel, a novel, a painting, a sculpture, a skyscraper, a bridge, wool, a belt, a tie, fog, Christmas, Easter, the Day of the Dead; mark abstractions `-`), then check every new lesson's words for wrong-sense pictures.

**Steps.** Follow the agent file's steps 1–7 for each part. Part 1 commits on its worktree branch; part 2 commits on the cycle branch.

**Acceptance criteria:**
- [ ] `tools.js check` ends with `ok`; the "briefed" column is 0 or every remaining one is explained in the report
- [ ] After part 2, no undecided concepts in units 40–41 and 16
- [ ] Contact sheets looked at, light and dark; `npm test` ends with `FAIL 0`

**Stop and report if:** `js/core/pics.js` would pass 900 KB.

## Integration

- [ ] `index.html`: `content/de-6-more.js` after `content/de-5-more.js`, `content/es-6-more.js` after `content/es-5-more.js`, `content/it-6-more.js` after `content/it-5-more.js`
- [ ] `dev/test.js`: lesson count 468 → 492
- [ ] `CLAUDE.md` "39 units and 156 lessons" → "41 units and 164 lessons"; `docs/ARCHITECTURE.md` unit numbers "(1–6, 20–29, 7–15, 16–19, 30–39)" → "(1–6, 20–29, 7–15, 16–19, 30–41)"
- [ ] `js/core/art.js`: unit signs for `Arts & criticism` (a picture frame on an easel) and `Ideas & ethics` (a balance with a light bulb), same 24 × 24 stroke style as the others
- [ ] Alias packs for WP2: for every orphaned key from the guard whose text exists as a vocab or sentence text in another lesson of the same language, map it to that lesson's key; write `content/aliases-de` and `content/aliases-es` (merged into any existing doc) in both homes at ship time, and pass the mapped keys to `node dev/flow.js guard --allow-orphans`
- [ ] WP3 part 2, then voices: `node dev/voices.js --dry`; this environment's key is refused, so hand the recording to session_019h1pmE24bzyzBVQn92zXRP (its key works), as in 4.26

## Release notes

- **Title:** Art, ideas and fresh A1
- **Notes:**
  - Two new advanced units in every language: Arts & criticism at C1, and Ideas & ethics at C2.
  - In German and Spanish, the A1 unit “Colors, clothes & weather” no longer repeats earlier lessons: it now teaches shades and patterns, fabrics, the forecast, and seasons and holidays, like Italian.
  - Many more words have a picture.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard --base d80ac3c --allow-orphans flow/shots/2026-11-05/orphans.json` (no STOP, no FIX), `node design/pictures/tools.js check` (ok), `node dev/voices.js --dry`.
- Screens: `node dev/flow.js shots --out flow/shots/2026-11-05/verify --lang de --steps "js:startLesson('de-40-1');wait:900;click:Start lesson;wait:800;shot:de-40-1"`, the same for es-40-1, it-41-4, de-16-1 and es-16-4; and `tab:Learn;full:learn` per language.
- Spot checks for the reviewer: read xx-40-2 and xx-41-3 side by side in the three languages; read de-16-1 and es-16-1 against de-20-1 and es-20-1 (no repeats).

## Risks and rollback

A learner who finished an old unit 16 lesson keeps it as done, though its content changed (the lesson ids stay); their review cards for its old words carry over by alias where the same word is taught in units 20–21, and the rest stay saved but unused. Undo: `git revert` the release on `main`, bump the patch, republish, set `latest`.

## Outcome

- **Shipped:** 4.29.0 (WP1 units 40–41 in de, es and it; WP2 A1 unit 16 reworked in de and es; WP3 79 new drawings, 8 aliases and wrong-sense picture fields) | **Dropped:** – | **Escalated:** –
- **Notes for the next cycle:**
  - C1 "Law & justice" (unit 42) follows as 4.30.0.
  - The unit 16 rework orphaned 102 review-card keys. 57 are carried by the live alias packs `content/aliases-de` and `content/aliases-es` (both homes); the other 45 have no matching word and stay saved but unused.
  - 719 voice lines (de 252, es 271, it 196) were handed to the session whose key works; until they're recorded those lines use the device's voice. Recorded on 2026-11-07 (b65bcb5), together with 4.30.0's.
  - 4.28.2 shipped from another session while this one was building; it was merged before release.
