# C1 "News & media" and C2 "Money & the economy" in every language

- **Cycle:** queued 2026-11-16 (program 2, release R3; `flow/PROGRAM-2.md`)
- **Status:** shipped (4.49.0)
- **Release:** 4.49.0
- **Base:** `main` at 59a0834 (4.48.0)
- **Proposals built:** none
- **Roadmap items:** R-2 (first of two releases)

## Why this, why now

Each language has 24 C1 and 16 C2 lessons against 36 at A2 (`node dev/flow.js snapshot`). This adds one C1 unit (43, news and media) and one C2 unit (44, money and the economy): 8 lessons per language, the policy's limit. R5 adds units 45 and 46 (both C2), which leaves 28 lessons at each of B2, C1 and C2. Every grammar idea below was checked against the existing tips on 2026-11-16 (none is the focus of a tip in that language).

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New content in the existing shape, all three languages, new ids (units 43–44) | — |
| WP2 | Green | Word pictures drawn in code | — |

## Work packages

### WP1 — Units 43 and 44, in German, Spanish and Italian

- **Agent:** parlance-content, one per language (WP1-de, WP1-es, WP1-it)
- **Model:** sonnet
- **Runs:** first, the three in parallel (worktrees)
- **Owns (may edit):** `content/<lang>-8-more.js` (new) and one `Object.assign(LESSON_GLOSS.<lang>, { … });` block appended at the very end of `content/glossary.js` under the comment `/* units 43–44 (4.49.0) */`
- **Reads first:** `CLAUDE.md`; `.claude/agents/parlance-content.md`; your language's `content/<lang>-7-more.js` (unit 42, C1, the model) and unit 41 in `content/<lang>-6-more.js` (C2)
- **Must not touch:** `index.html`, `dev/test.js`, `js/`, docs, pictures files, other languages' glossary blocks

**Spec.** The file is `"use strict";`, a header comment `/* <Language> C1 and C2: units 43 (news & media) and 44 (money & the economy) */`, then `COURSE_SRC.<lang>.push(U('News & media', 'C1', [...4 lessons...]), U('Money & the economy', 'C2', [...4 lessons...]));`. The course sorts units by level, so unit 43 lands after unit 42 (the last C1 unit) and unit 44 after unit 41 (the last C2 unit) with no further work. Same lesson shape as unit 42: 8 vocab, 5–6 sentences, 3 blanks, a tip of 3–5 short sentences with 2–3 examples and 1–2 tables; at least two blanks test the idea, with the idea's wrong forms as the other options. German tips keep the sentence period outside bold examples, like unit 42; Italian too (`**Finita la conferenza**.`).

**Unit 43, `News & media` (C1)**

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-43-1 | Reading the headlines | **Headline German:** articles and *sein*/*haben* drop out, a participle alone says it has happened, a noun replaces a clause: **Minister zurückgetreten** (= Der Minister ist zurückgetreten), **Streik bei der Bahn**, **Regierung plant neue Steuer**. A table "Headline → sentence". Words: die Schlagzeile, die Meldung, die Titelseite, der Rücktritt, zurücktreten, der Streik, die Pressemitteilung, veröffentlichen | **Headline Spanish:** the present for what just happened, the future for plans, few articles, a colon for who said it: **Renuncia el ministro de Salud** (= El ministro renunció), **El Gobierno subirá los impuestos**, **Ministra: «No habrá recortes»**. A table "Headline → sentence". Words: el titular, la portada, la renuncia, renunciar, la huelga, el comunicado, publicar, los medios | **Headline Italian:** articles and verbs drop out, a noun says what happened, a past participle alone says it happened, the present is used for the recent past: **Dimissioni del ministro**, **Arrestato il sindaco**, **Il governo approva la riforma**. A table "Headline → sentence". Words: il titolo, la prima pagina, le dimissioni (pl f), dimettersi, lo sciopero, il comunicato stampa, pubblicare, la testata |
| xx-43-2 | At the press conference | **A participle opens the sentence** in place of a clause: **Von der Presse kritisiert, trat der Minister zurück** (passive sense for verbs with an object); **Kaum angekommen, gab sie ein Interview** (perfect sense for verbs of movement). Words: die Pressekonferenz, die Sprecherin, der Journalist, befragen, die Stellungnahme, ankündigen, bestätigen, dementieren | **The absolute participle:** **Terminada la rueda de prensa, el ministro se fue**; it agrees with the noun after it: **Hechas las preguntas**, **Una vez aprobada la ley**. Words: la rueda de prensa, la portavoz, el periodista, la postura, anunciar, confirmar, desmentir, una vez | **The absolute participle:** **Finita la conferenza stampa, il ministro è uscito**; it agrees with its noun: **Concluse le domande**, **Una volta approvata la legge**. Words: la conferenza stampa, la portavoce, il giornalista, la presa di posizione, annunciare, confermare, smentire, una volta |
| xx-43-3 | Who said what | **Es war …, der/die …** (it was … who): **Es war die Sprecherin, die das bestätigt hat**; the verb agrees with the noun: **Es waren die Journalisten, die nachfragten**. Words: das Zitat, zitieren, behaupten, die Behauptung, der Augenzeuge, widersprechen, richtigstellen, das Gerücht | **Fue … quien / el que …:** **Fue la portavoz quien lo confirmó**; *ser* and *el que / los que* agree with the noun: **Fueron los periodistas los que preguntaron**. Words: la cita, citar, afirmar, la afirmación, el testigo, contradecir, aclarar, el rumor | **È stato/a … a + infinitive:** **È stata la portavoce a confermarlo**; *essere* agrees with the noun: **Sono stati i giornalisti a chiedere**; also **È lei che l’ha detto**. Words: la citazione, citare, sostenere, l’affermazione, il testimone, contraddire, chiarire, la voce (rumor; fourth field `-`) |
| xx-43-4 | Fact or fake? | **inwiefern / inwieweit** (to what extent), as a question and, with the verb at the end, inside a sentence: **Inwiefern ist das ein Problem?** **Es ist unklar, inwieweit die Meldung stimmt**. Words: die Falschmeldung, die Quelle, überprüfen, glaubwürdig, verbreiten, der Faktencheck, irreführend, inwiefern | **hasta qué punto / en qué medida**, with the accent also inside a sentence: **¿Hasta qué punto es cierta la noticia?** **No sabemos en qué medida influyó**. Words: la noticia falsa, la fuente, verificar, confiable, difundir, la verificación de datos, engañoso, hasta qué punto | **fino a che punto / in che misura**; inside a sentence it often takes the subjunctive: **Fino a che punto è vera la notizia?** **Non è chiaro in che misura abbia influito**. Words: la bufala, la fonte, verificare, attendibile, diffondere, la verifica dei fatti, fuorviante, fino a che punto |

Sentence themes: 43-1 turning four headlines (a resignation, a strike, a new tax, a front page) into full sentences; 43-2 a press conference: questions, a statement, a denial, what happened once it ended; 43-3 a quote that was wrongly attributed and put right; 43-4 checking a viral story: the source, how far it is true, who spread it. Blank targets: 43-1 the headline form (de `Minister ___`: zurückgetreten|zurücktreten|zurücktritt; es `___ el ministro de Salud`: Renuncia|Renunciar|Renunciando; it `___ il sindaco di Napoli`: Arrestato|Arrestare|Arrestando); 43-2 the participle (and its agreement in es and it); 43-3 the verb's agreement in the cleft (de waren|war|ist; es Fueron|Fue|Era; it stati|stato|stata); 43-4 the question word, with no option that would also fit (never *ob*, *si* or *se* as a wrong option).

**Unit 44, `Money & the economy` (C2)**

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-44-1 | A crisis nobody saw coming | **The future seen from the past:** *sollte* + infinitive for what was going to happen, *würde* in reported thought: **Die Krise sollte zehn Jahre dauern**. **Niemand ahnte, dass die Blase platzen würde**. Words: die Wirtschaftskrise, die Blase, platzen, die Rezession, vorhersehen, der Aktienmarkt, der Zusammenbruch, ahnen | **The future seen from the past:** the conditional, or *iba a* + infinitive: **Nadie imaginaba que la crisis duraría diez años**. **La burbuja iba a estallar**. Words: la crisis económica, la burbuja, estallar, la recesión, prever, la bolsa de valores, el desplome, la deuda | **The future seen from the past takes the past conditional** (unlike Spanish and English): **Nessuno immaginava che la crisi sarebbe durata dieci anni**, not *durerebbe*. Words: la crisi economica, la bolla, scoppiare, la recessione, prevedere, la Borsa, il crollo, il debito |
| xx-44-2 | Rich and poor | **Es bringt nichts / Es hat keinen Sinn, … zu** + infinitive: **Es bringt nichts, nur die Steuern zu erhöhen**. Words: das Vermögen, die Armut, der Reichtum, das Einkommen, umverteilen, die Vermögenssteuer, der Mindestlohn, der Sinn | **De nada sirve** + infinitive, or **que** + subjunctive: **De nada sirve subir los impuestos si nadie los paga**. **De nada sirve que el gobierno gaste más**. Words: la riqueza, la pobreza, el ingreso, la desigualdad, redistribuir, la evasión fiscal, el salario mínimo, de nada sirve | **Non serve a niente** + infinitive, or **che** + subjunctive: **Non serve a niente alzare le tasse se nessuno le paga**. **Non serve a niente che il governo spenda di più**. Words: la ricchezza, la povertà, il reddito, la disuguaglianza, ridistribuire, l’evasione fiscale, il salario minimo, servire |
| xx-44-3 | Taxes and bills | ***zu* + present participle before a noun** (to be …ed), with adjective endings: **die zu zahlende Summe**, **die zu erwartenden Kosten**. Words: die Steuererklärung, der Betrag, die Mahnung, die Gebühr, fällig, das Finanzamt, absetzen, die Summe | ***a* + infinitive after a noun** (to be …ed), common in Latin American paperwork, beside *que hay que*: **el monto a pagar**, **los puntos a tratar**. Words: la declaración de impuestos, el monto, el recibo, la comisión, vencer, deducir, el adeudo, Hacienda | ***da* + infinitive after a noun** (to be …ed): **la somma da pagare**, **i documenti da presentare**. Words: la dichiarazione dei redditi, l’importo, la bolletta, la commissione, scadere, detrarre, l’Agenzia delle Entrate, il sollecito |
| xx-44-4 | Spending and saving | **Nicht, dass** + Konjunktiv II, then the real point: **Nicht, dass ich geizig wäre, aber ich spare lieber**. Words: das Sparkonto, die Ausgabe, geizig, sich etwas leisten, die Rücklage, das Budget, verschwenderisch, sparsam | **No es que** + subjunctive, **sino que** + indicative: **No es que sea tacaño, sino que prefiero ahorrar**. Words: la cuenta de ahorro, el gasto, tacaño, darse el lujo de, el ahorro, el presupuesto, derrochador, endeudarse | **Non che** + subjunctive, then **ma**: **Non che io sia tirchio, ma preferisco risparmiare**. Words: il conto di risparmio, la spesa (fourth field `-`: it is also the grocery shopping), tirchio, permettersi, il risparmio, il bilancio, spendaccione, indebitarsi |

Sentence themes: 44-1 a crash told years later (who warned, what nobody saw, how long it lasted); 44-2 a debate on taxing wealth and the minimum wage; 44-3 a tax return, a late bill, a reminder notice, what can be deducted; 44-4 a couple who disagree about saving and spending. Blank targets: 44-1 the future-in-the-past form (de würde|wird|wurde; es duraría|durará|dure; it sarebbe durata|durerebbe|durava); 44-2 the infinitive or the subjunctive after the phrase (de erhöhen|erhöht|erhöhte; es gaste|gasta|gastará; it spenda|spende|spenderà); 44-3 the attribute (de `zu zahlende`|`zu zahlen`|`zahlende`; es `a pagar`|`pagando`|`pagada`; it `da pagare`|`a pagare`|`pagando`); 44-4 the subjunctive after the phrase (de wäre|würde|hätte; es sea|es|será; it sia|sono|sarò).

Spanish is Latin American (Mexico: *monto*, *adeudo*, *Hacienda* or the SAT, *ustedes*); Italian uses *Lei* in formal lines (an office, a bank) and ’ in elisions.

**Steps.** As in unit 42 (`flow/plans/2026-11-05-law-and-justice.md`, WP1): write the file; add a temporary `<script src="content/<lang>-8-more.js">` after `<lang>-7-more.js` in `index.html` to run the checks, and remove it before committing; `npm test` (agent file, "Checking your work"), where only the lesson count may fail; glossary entries for every word the test lists; commit the content file and `content/glossary.js`.

**Acceptance criteria:**
- [ ] 8 lessons with exactly the ids and titles above, unit titles `News & media` (C1) and `Money & the economy` (C2)
- [ ] `npm test` fails only on the lesson count and lists no unglossed word for `^<lang>-4[34]-`
- [ ] Each blank's wrong options are wrong in context (the reviewer reads all 24 blanks per language)

**Stop and report if:** a word has no clear Latin American (Spanish) or standard Italian equivalent, or a grammar idea turns out to be the focus of an existing tip in your language.

### WP2 — Pictures for units 43 and 44

- **Agent:** parlance-illustrator
- **Model:** sonnet
- **Runs:** after the integration has merged WP1
- **Owns (may edit):** `js/core/pics.js`, `design/pictures/briefs-src.txt` (a new section `# ---- units 43–44 (release 4.49.0) ----` at the end), the files the tools generate
- **Spec.** Decide every new concept, as in the agent file. Draw these (batch `c-media-money`, quiz 0 unless given): a newspaper's front page with a big headline bar (`front-page`, quiz 1); a microphone on a stand before a row of chairs (`press-conference`); a speech bubble with quote marks (`quote`); a magnifier over a page with a check mark (`fact-check`); a soap bubble about to burst over a falling line chart (`bubble`); a tax form with a pen (`tax-return`, quiz 1); a utility bill with a lightning bolt and a drop (`bill-utility`, it *la bolletta*); a piggy bank (`savings-account`; if `PICS` already has a piggy bank, make it an alias line `= savings-account <that id>` instead of drawing). `poverty` and `wealth` are `-` (abstract). Everything else in the two units is `-` with its reason (abstract, a phrase, a grammar word). Check wrong senses as in the agent file (*la voce* and *la spesa* already opt out with `-`).

## Integration

- [ ] `index.html`: `<script src="content/<lang>-8-more.js"></script>` after `content/<lang>-7-more.js` for each language
- [ ] `dev/test.js`: lesson count 504 → 528
- [ ] `CLAUDE.md`: "42 units and 168 lessons" → "44 units and 176 lessons"; `docs/ARCHITECTURE.md`: "(1–6, 20–29, 7–15, 16–19, 30–42)" → "(1–6, 20–29, 7–15, 16–19, 30–44)"
- [ ] `js/core/art.js`, `UNIT_ART`, after `'Law & justice'`:
  `'News & media': '<rect x="3.5" y="5" width="14" height="14" rx="1.5"/><path d="M17.5 9H20v8.5a1.5 1.5 0 0 1-3 0M6.5 8.5h8M6.5 12h3.5M6.5 15.5h3.5M12 12h2.5v3.5H12z"/>',`
  `'Money & the economy': '<ellipse cx="12" cy="6.5" rx="6.5" ry="2.5"/><path d="M5.5 6.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4M5.5 10.5v4c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-4M5.5 14.5v3c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-3"/>',`
- [ ] Voices: parlance-chores, `node dev/voices.js --dry`, then `node dev/voices.js` (hand off per CLAUDE.md if the key is refused)

## Release notes

- **Title:** News and money
- **Notes:**
  - A new C1 unit in every language: headlines, press conferences, who said what, and telling fact from fake.
  - A new C2 unit on money: a crisis nobody saw coming, rich and poor, taxes and bills, spending and saving.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node design/pictures/tools.js check` (ok), `node dev/voices.js --dry`.
- Screens (412px, light and dark): `tab:Learn;wait:600;js:document.querySelector('[data-level="C1"],.level-C1')?.scrollIntoView();wait:300;shot:learn-c1` (the new unit signs; if neither selector exists, scroll with `js:window.scrollTo(0, document.body.scrollHeight)` instead); `js:startLesson('de-43-1');wait:900;click:Start lesson;wait:800;shot:de-43-1`, the same for `es-44-3` and `it-44-1`.
- Spot checks for the reviewer: read xx-43-3 and xx-44-1 side by side in the three languages (the Italian past conditional must be explained as different from Spanish).

## Risks and rollback

New lessons only; no existing key changes. Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** 4.49.0, `773d919` | **Dropped:** none | **Escalated:** none
- **Notes for the next cycle:**
