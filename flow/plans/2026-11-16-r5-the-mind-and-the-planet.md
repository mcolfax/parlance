# C2 "The mind" and "Climate & the planet", and a check of every German A1 lesson

- **Cycle:** queued 2026-11-16 (program 2, release R5; `flow/PROGRAM-2.md`)
- **Status:** draft (the orchestrator promotes it: move to `flow/plans/<cycle>-r5-the-mind-and-the-planet.md`, set Base, check it still matches `main`)
- **Release:** 4.51.0
- **Base:** `main` at 9f65e69 (4.50.0)
- **Proposals built:** none
- **Roadmap items:** R-2 (second of two releases), R-9 (first audit: German A1)

## Why this, why now

After R3 each language has 28 C1 and 20 C2 lessons; two more C2 units (45, the mind; 46, climate and the planet) bring C2 to 28, level with B2 and C1, which finishes R-2. Every grammar idea below was checked against the existing tips on 2026-11-16. The third package is the first content audit (R-9): learners are marked wrong for good answers when an English variant is missing, and A1 is where every learner starts. It runs after R2 and R4 rewrote the A1 tips, so it checks the tips as they now are.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New content in the existing shape, all three languages, new ids (units 45–46) | — |
| WP2 | Green | Word pictures drawn in code | — |
| WP3 | Green | Fixes to existing content that keep every review-card key (meanings, accepted answers, blank options and hints, tips) | — |

## Work packages

WP1 (three agents) and WP3 run in parallel (worktrees; disjoint files). WP2 runs after the integration has merged WP1.

### WP1 — Units 45 and 46, in German, Spanish and Italian

- **Agent:** parlance-content, one per language (WP1-de, WP1-es, WP1-it)
- **Model:** sonnet
- **Runs:** first, the three in parallel (worktrees), in parallel with WP3
- **Owns (may edit):** `content/<lang>-9-more.js` (new) and one `Object.assign(LESSON_GLOSS.<lang>, { … });` block appended at the very end of `content/glossary.js` under the comment `/* units 45–46 (4.51.0) */`
- **Reads first:** `CLAUDE.md`; `.claude/agents/parlance-content.md`; your language's `content/<lang>-8-more.js` (unit 44, C2, the model) and unit 41 in `content/<lang>-6-more.js`
- **Must not touch:** `index.html`, `dev/test.js`, `js/`, docs, pictures files, other languages' glossary blocks, the A1 lessons (WP3 owns their files' German lines)

**Spec.** `"use strict";`, the header comment `/* <Language> C2: units 45 (the mind) and 46 (climate & the planet) */`, then `COURSE_SRC.<lang>.push(U('The mind', 'C2', [...4 lessons...]), U('Climate & the planet', 'C2', [...4 lessons...]));`. Both units sort after unit 44, the last C2 unit. Lesson shape as in unit 44: 8 vocab, 5–6 sentences, 3 blanks, a tip of 3–5 short sentences with 2–3 examples and 1–2 tables, at least two blanks on the idea; the sentence period outside bold examples in German and Italian tips.

**Unit 45, `The mind` (C2)**

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-45-1 | Memory | **soweit / soviel** + clause with the verb at the end (as far as): **Soweit ich mich erinnere, war es im Mai**. **Soviel ich weiß, hat niemand angerufen**. Words: das Gedächtnis, die Erinnerung, das Kurzzeitgedächtnis, verdrängen, sich entsinnen, die Kindheit, lückenhaft, soweit | **que yo sepa / que yo recuerde**: a fixed phrase with the subjunctive: **Que yo recuerde, fue en mayo**. **Que yo sepa, nadie llamó**. Words: la memoria, el recuerdo, la memoria a corto plazo, reprimir, evocar, la infancia, borroso, que yo sepa | **che io sappia / che io ricordi**: a fixed phrase with the subjunctive; also **per quanto ne so**: **Che io ricordi, era maggio**. Words: la memoria, il ricordo, la memoria a breve termine, rimuovere (fourth field `-`), rievocare, l’infanzia, sfocato, che io sappia |
| xx-45-2 | Fear and worry | **Was …, ist / sind …** (what … is): the *was*-clause first with its verb at the end; *sein* agrees with what follows: **Was mich beunruhigt, ist die Unsicherheit**. **Was mich stört, sind die Kosten**. Words: die Sorge, beunruhigen, die Panikattacke, grübeln, die Unsicherheit, lähmen, gelassen, die Bewältigung | **Lo que … es / son …**; *ser* agrees with what follows: **Lo que me preocupa es la inseguridad**. **Lo que más miedo me da son las noches**. Words: la ansiedad, la preocupación, preocupar, el ataque de pánico, darle vueltas a algo, la inseguridad, paralizar, sereno | **Quello che / Ciò che … è / sono …**; *essere* agrees with what follows: **Quello che mi preoccupa è l’insicurezza**. **Ciò che mi spaventa sono le notti**. Words: l’ansia, la preoccupazione, preoccupare, l’attacco di panico, rimuginare, l’insicurezza, paralizzare, pacato |
| xx-45-3 | Dreams and sleep | **sehen / hören + infinitive** (no *zu*); in the perfect, two infinitives: **Ich sah mich fliegen**. **Ich habe ihn kommen sehen**. Words: der Albtraum, das Unterbewusstsein, der Schlafmangel, deuten, schlaflos, das Schlafwandeln, aufschrecken, die Wahrnehmung | **ver / oír + infinitive**, the pronoun before the conjugated verb: **Me vi volar**. **Lo vi salir**. **Oí a alguien gritar**. Words: la pesadilla, el subconsciente, la falta de sueño, interpretar, el insomnio, el sonambulismo, sobresaltarse, la percepción | **vedere / sentire + infinitive**: **Mi sono visto volare**. **L’ho visto uscire**. **Ho sentito qualcuno gridare**. Words: l’incubo, l’inconscio, la mancanza di sonno, interpretare, l’insonnia, il sonnambulismo, sobbalzare, la percezione |
| xx-45-4 | Habits and willpower | **Mir wäre lieber, wenn** + Konjunktiv II, and **lieber … als**: **Mir wäre lieber, wenn du früher aufstehen würdest**. **Ich würde lieber laufen als fernsehen**. Words: die Gewohnheit, die Willenskraft, die Selbstdisziplin, aufschieben, der Vorsatz, durchhalten, die Versuchung, widerstehen | **Preferiría que** + imperfect subjunctive (and **Prefiero que** + present subjunctive for a real preference): **Preferiría que te levantaras más temprano**. Words: el hábito, la fuerza de voluntad, la autodisciplina, postergar, el propósito, perseverar, la tentación, resistirse | **Preferirei che** + imperfect subjunctive (and **Preferisco che** + present subjunctive): **Preferirei che ti alzassi prima**. Words: l’abitudine, la forza di volontà, l’autodisciplina, rimandare, il proposito, perseverare, la tentazione, resistere |

**Unit 46, `Climate & the planet` (C2)**

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-46-1 | It’s high time | **Es ist höchste Zeit, dass** + verb at the end; **Es wird Zeit, … zu**: **Es ist höchste Zeit, dass wir handeln**. Words: die Erderwärmung, der Ausstoß, die Klimaneutralität, handeln, der Kipppunkt, die Energiewende, fossil, dringend | **Ya es hora de que** + present subjunctive; **Ya sería hora de que** + imperfect subjunctive: **Ya es hora de que actuemos**. Words: el calentamiento global, las emisiones (pl f), la neutralidad de carbono, actuar, el punto de no retorno, la transición energética, el combustible fósil, urgente | **È ora che** + present subjunctive; **Sarebbe ora che** + imperfect subjunctive: **Sarebbe ora che il governo agisse**. Words: il riscaldamento globale, le emissioni (pl f), la neutralità climatica, agire, il punto di non ritorno, la transizione energetica, il combustibile fossile, urgente |
| xx-46-2 | What went wrong | **muss … gewesen sein / … haben** (must have) and **dürfte** (probably): **Das muss jahrelang so gegangen sein**. **Das dürfte teuer gewesen sein**. Words: die Dürre, die Ernte, austrocknen, der Waldbrand, die Ursache, abholzen, der Grundwasserspiegel, verursachen | **deber de + haber + participle** (must have): **Debe de haber llovido muy poco**. Words: la sequía, la cosecha, secarse, el incendio forestal, la causa, deforestar, el nivel freático, provocar | **dovere + essere / avere + participle** (must have): **Deve aver piovuto pochissimo**. **Dev’essere successo di notte**. Words: la siccità, il raccolto, prosciugarsi, l’incendio boschivo, la causa, disboscare, la falda acquifera, provocare |
| xx-46-3 | Extreme weather | **Kaum hatte …, …** (hardly had … when): *kaum* first, the verb second, the main clause verb-first: **Kaum hatte der Sturm nachgelassen, begann der Regen**. Words: die Überschwemmung, die Hitzewelle, nachlassen, der Orkan, die Unwetterwarnung, evakuieren, verwüsten, die Sturmflut | **Apenas / No bien** + preterite: **Apenas amainó la tormenta, empezó a llover**. Words: la inundación, la ola de calor, amainar, el huracán, la alerta meteorológica, evacuar, arrasar, el aguacero | **Era appena … che** / **Non appena**: **Il temporale era appena finito che ricominciò a piovere**. Words: l’alluvione, l’ondata di calore, calmarsi, l’uragano, l’allerta meteo, evacuare, devastare, il nubifragio |
| xx-46-4 | Hope for the future | **möge** (Konjunktiv I) for a solemn wish, beside everyday **hoffentlich**: **Möge die nächste Generation klüger sein**. Words: die Hoffnung, die Nachwelt, nachhaltig, bewahren, der Wandel, zuversichtlich, das Erbe, das Bewusstsein | **Que** + subjunctive as a wish, and **Ojalá** + present subjunctive: **¡Que así sea!** **Que las próximas generaciones vivan mejor**. Words: la esperanza, las generaciones futuras (pl f), sostenible, preservar, el legado, optimista, la conciencia, el porvenir | **Che** + subjunctive as a wish, and **Magari** + imperfect subjunctive: **Che sia l’ultima estate così calda!** Words: la speranza, le generazioni future (pl f), sostenibile, preservare, l’eredità, fiducioso, la consapevolezza, il cambiamento |

Sentence themes: 45-1 an old memory told twice, differently; 45-2 a conversation with a friend before an exam or an operation; 45-3 a strange dream and a night without sleep; 45-4 new year's resolutions that don't last; 46-1 a climate summit and what must change now; 46-2 a dried-out lake and its causes; 46-3 a storm, a flood warning and an evacuation; 46-4 a letter to the next generation. Blank targets: 45-1 the phrase (de Soviel|Sobald|Solange; es sepa|sé|sabía; it sappia|so|sapevo); 45-2 the verb's agreement (de sind|ist|seid; es son|es|está; it sono|è|sia); 45-3 the infinitive or double infinitive (de sehen|gesehen|sah; es Lo|Su|Él; it gridare|gridato|grida); 45-4 the subjunctive (de aufstehen|aufstehst|aufgestanden; es levantaras|levantes|levantas; it alzassi|alzi|alzerai); 46-1 the verb after the phrase (de handeln|zu handeln|gehandelt; es actuemos|actuamos|actuaremos; it agisse|agisce|agirà); 46-2 the auxiliary (de sein|haben|werden; es haber|ha|había; it aver|stato|avendo); 46-3 the opening word or *che* (de hatte|hat|war; es Apenas|Aunque|Mientras; it che|se|perché); 46-4 the wish form (de Möge|Muss|Darf; es vivan|viven|vivirán; it sia|è|sarà).

Spanish is Latin American (*ustedes*, *el aguacero*, *la alerta*); Italian uses *Lei* in formal lines and ’ in elisions.

**Steps.** As in R3's WP1: write the file; a temporary `<script src="content/<lang>-9-more.js">` after `<lang>-8-more.js` in `index.html` for the checks, removed before committing; `npm test`, where only the lesson count may fail; glossary entries for every word the test lists.

**Acceptance criteria:**
- [ ] 8 lessons with exactly the ids and titles above, unit titles `The mind` and `Climate & the planet` (both C2)
- [ ] `npm test` fails only on the lesson count and lists no unglossed word for `^<lang>-4[56]-`

**Stop and report if:** a word has no clear Latin American (Spanish) or standard Italian equivalent, or a grammar idea turns out to be the focus of an existing tip in your language.

### WP2 — Pictures for units 45 and 46

- **Agent:** parlance-illustrator
- **Model:** sonnet
- **Runs:** after the integration has merged WP1
- **Owns (may edit):** `js/core/pics.js`, `design/pictures/briefs-src.txt` (a new section `# ---- units 45–46 (release 4.51.0) ----` at the end), the files the tools generate
- **Spec.** Decide every new concept, as in the agent file. Draw these (batch `c-mind-planet`, quiz 0): a crescent moon over a bed with a dark cloud (`nightmare`); the neutral figure walking with arms out and eyes closed (`sleepwalking`); a cracked, dry lake bed with a dead tree (`drought`, quiz 1); a tree on fire (`forest-fire`); houses with water up to the windows (`flood`, quiz 1); a sun over a thermometer in the red (`heat-wave`); a spiral storm seen from above (`hurricane`, quiz 1); a stump beside a felled tree (`to-deforest`). `to-preserve` is `-` (abstract). Everything else is `-` with its reason (abstract, a phrase, a feeling).

### WP3 — Content check: every German A1 lesson (R-9)

- **Agent:** parlance-content (German)
- **Model:** sonnet
- **Runs:** first, in parallel with WP1 (worktree)
- **Owns (may edit):** in `content/de-1-basics.js`, `content/de-1b-more.js`, `content/de-3-more.js`, `content/de-5-more.js` and `content/de-4-a1.js` only the 32 A1 lessons (`de-1-*`, `de-2-*`, `de-3-*`, `de-20-*`, `de-21-*`, `de-16-*`, `de-24-*`, `de-30-*`), and only the fields listed below; `content/glossary.js` only to add to an existing German entry's meaning
- **Reads first:** `CLAUDE.md`; `flow/POLICY.md` "Changing existing content"; `englishVariants()`, `norm()` and `CONTR` in `js/core/text.js` (contractions, case, punctuation and the apostrophe kind are already forgiven, so never add a variant that differs only in those)
- **Must not touch:** the text before the first `|` of any vocab or sentence (it is the review-card key), the number of vocab, sentences or blanks, examples, tables, tip titles, other languages

**Spec.** Read each of the 32 lessons as a learner who types English and taps blanks. You may change only:
1. **Vocab meanings** (second field): add English meanings a learner would reasonably type, after the existing ones (the first meaning stays first): synonyms (`hello|hi`), British and American words (`apartment|flat`), with and without the article for a noun where natural.
2. **Sentence English** (second field): add natural variants after the existing ones: other word orders, the present simple and the progressive where the German present means both, *you* for *du*, *Sie* and *ihr* where the lesson doesn't hinge on the difference, British and American wording.
3. **Accepted German** for a sentence or vocab: alternatives after a `|` in the first field (for example a word order that is also correct), never changing the text before the first `|`.
4. **Blanks**: if a wrong option is also right in the sentence and its English, replace that option with a form that is clearly wrong; if the English doesn't match the sentence, fix the English; if the person is ambiguous, add a bracketed hint at the end of the blank (`(we)`).
5. **Tips**: fix a statement that is wrong, keeping every bold phrase in its paragraph so the `TIP_PLACES` checks still pass.
6. **Pictures**: a fourth vocab field (`-` or a picture id) for a word that shows a picture in the wrong sense.

Anything else you find (an unnatural German sentence, a wrong word) needs its text changed, which orphans review cards: don't change it; list it in your report with the lesson id, the text and the fix, for a later Amber package with an alias pack.

**Steps.**
1. Work through the lessons in course order. Keep a list of every change (lesson, field, before, after).
2. `npm test` (agent file, "Checking your work"): `FAIL 0`.
3. `node dev/flow.js guard`: no orphaned review-card keys, no FIX or STOP.
4. Your report: the change list, grouped by the six kinds above, with counts; the follow-up list.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0`; `node dev/flow.js guard` reports no orphaned keys
- [ ] `git diff -- content/` touches only lines inside the 32 lessons (and, in `glossary.js`, only German meanings); the vocab, sentence and blank counts of every lesson are unchanged (the snapshot's shape line is identical)
- [ ] The report lists every change and every follow-up

**Stop and report if:** a fix you consider necessary can only be made by changing a key text (list it; don't make it).

## Integration

- [ ] `index.html`: `<script src="content/<lang>-9-more.js"></script>` after `content/<lang>-8-more.js` for each language
- [ ] `dev/test.js`: lesson count 528 → 552
- [ ] `CLAUDE.md`: "44 units and 176 lessons" → "46 units and 184 lessons"; `docs/ARCHITECTURE.md`: "30–44" → "30–46"
- [ ] `js/core/art.js`, `UNIT_ART`, after `'Money & the economy'`:
  `'The mind': '<path d="M14.5 20.5V17h2a2 2 0 0 0 2-2v-2.5l1.6-.6-1.7-3A7.3 7.3 0 1 0 7.5 15.2v5.3"/><path d="M11.5 7.5v3M10 9h3"/>',`
  `'Climate & the planet': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.4 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.4-3.5-8.5s1.1-6.1 3.5-8.5z"/>',`
- [ ] WP3's follow-up list goes into the roadmap as one new row (`R-9 follow-up: German A1 text fixes that need an alias pack`, `open`)
- [ ] Voices: parlance-chores, `node dev/voices.js --dry`, then `node dev/voices.js` (new lessons and any new accepted German forms)

## Release notes

- **Title:** The mind and the planet
- **Notes:**
  - Two new C2 units in every language: memory, worry, dreams and habits; and the climate, from what went wrong to what we hope for.
  - The German A1 lessons accept more good English answers.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node design/pictures/tools.js check` (ok), `node dev/voices.js --dry`.
- Screens (412px, light and dark): `js:startLesson('de-45-2');wait:900;click:Start lesson;wait:800;shot:de-45-2`, the same for `es-46-2` and `it-44-1`; the Learn route scrolled to C2 (four C2 unit signs in a row).
- Spot checks for the reviewer: read xx-46-3 side by side in the three languages; sample ten of WP3's added variants and confirm each is a right answer.

## Risks and rollback

New lessons, added accepted answers and replaced wrong options; no key changes. Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
