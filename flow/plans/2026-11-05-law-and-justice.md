# C1 "Law & justice" in every language

- **Cycle:** 2026-11-05 (second release of the hand-run cycle in session_01VFBRs4TmdrRsdPrBRpk4Ck)
- **Status:** approved
- **Release:** 4.30.0 (minor: new content)
- **Base:** the commit that ships 4.29.0 (`flow/plans/2026-11-05-c-levels-a1-repeats-pictures.md`)
- **Proposals built:** none (Matt asked in chat for all three C-level alternates; this is the third)
- **Roadmap items:** new

## Why this, why now

The third of Matt's C-level follow-ups. After 4.29.0, C1 has 20 lessons per language; this adds 4 more on the law (courts, crime and trial, tenants' rights, laws and their loopholes), a register C1 learners meet in news, contracts and paperwork. It ships separately from 4.29.0 to stay inside `maxNewLessonsPerLanguagePerCycle`.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | New content in the existing shape, all three languages, new ids (unit 42) | – |
| WP2 | Green | Word pictures drawn in code | – |

## Work packages

### WP1 — C1 "Law & justice" (unit 42), in German, Spanish and Italian

- **Agent:** parlance-content, one per language (WP1-de, WP1-es, WP1-it)
- **Model:** sonnet
- **Runs:** first, the three in parallel (worktrees)
- **Owns (may edit):** `content/<lang>-7-more.js` (new) and one `Object.assign(LESSON_GLOSS.<lang>, { … });` block at the very end of `content/glossary.js` (comment `/* unit 42 (4.30.0) */`)
- **Reads first:** `CLAUDE.md`, `.claude/agents/parlance-content.md`, your language's `content/<lang>-6-more.js` (4.29.0, the model)
- **Must not touch:** `index.html`, `dev/test.js`, `js/`, docs, pictures files, other languages' glossary blocks

**Spec.** `COURSE_SRC.<lang>.push(U('Law & justice', 'C1', [...4 lessons...]));` with the header comment `/* <Language> C1: unit 42 (law & justice) */`. Same lesson shape as 4.29.0: 8 vocab, 5–6 sentences, 3 blanks, a tip of 3–5 short sentences with 2–3 examples and 1–2 tables; at least two blanks test the idea.

| id | Title | German idea and words | Spanish idea and words | Italian idea and words |
|---|---|---|---|---|
| xx-42-1 | In court | **zufolge** (after its noun, with the dative) and **gemäß**: *Dem Zeugen zufolge war die Ampel rot. Gemäß Paragraf 3 …* Words: das Gericht, die Richterin, der Angeklagte, die Anwältin, die Aussage, das Urteil, schuldig, zufolge | **se le / se les + verb** (impersonal, with the person): *Se le acusa de fraude. Se les informó de sus derechos.* Words: el tribunal, la jueza, el acusado, la abogada, la declaración, la sentencia, culpable, acusar | **ai sensi di / in base a** (under, according to): *Ai sensi dell’articolo 3, l’imputato ha diritto a un avvocato.* Words: il tribunale, la giudice, l’imputato, l’avvocata, la testimonianza, la sentenza, colpevole, ai sensi di |
| xx-42-2 | A crime and a trial | **Passive with a modal in the past:** *Er hätte freigesprochen werden müssen.* (He should have been acquitted.) Words: das Verbrechen, der Täter, das Opfer, der Betrug, die Ermittlung, verurteilen, freisprechen, die Strafe | **conforme + verb** (as, step by step): *Conforme avanzaba el juicio, la defensa perdía fuerza.* Words: el delito, el delincuente, la víctima, el fraude, el juicio, condenar, absolver, la pena | **man mano che** (as, step by step): *Man mano che il processo andava avanti, la difesa perdeva forza.* Words: il reato, la vittima, la truffa, il processo, l’indagine, condannare, assolvere, la pena |
| xx-42-3 | Your rights as a tenant | **vorausgesetzt, (dass) / unter der Bedingung, dass** (provided that): *Sie bekommen die Kaution zurück, vorausgesetzt, die Wohnung ist in Ordnung.* Words: der Mietvertrag, der Vermieter, die Kaution, kündigen, die Frist, der Mangel, die Nebenkosten, vorausgesetzt | **salvo que + subjunctive** (unless): *El contrato se renueva, salvo que usted avise con un mes de anticipación.* Words: el contrato de arrendamiento, el casero, el depósito, rescindir, el plazo, el desperfecto, el aviso, salvo que | **essere tenuto a + infinito** and **salvo che + congiuntivo:** *L’inquilino è tenuto a pagare entro il cinque, salvo che il contratto preveda altro.* Words: il contratto d’affitto, il proprietario, la caparra, disdire, il preavviso, il guasto, essere tenuto a, salvo che |
| xx-42-4 | Laws and loopholes | **insofern … als** (insofar as): *Das Gesetz ist insofern problematisch, als es keine Ausnahmen kennt.* Words: das Gesetz, die Lücke, die Ausnahme, gelten, verbieten, die Regelung, umgehen, insofern | **en la medida en que + subjunctive or indicative:** *La ley será útil en la medida en que se aplique.* Words: la ley, el vacío legal, la excepción, vigente, prohibir, la norma, eludir, en la medida en que | **nella misura in cui** (insofar as): *La legge è utile nella misura in cui viene applicata.* Words: la legge, la scappatoia, l’eccezione, in vigore, vietare, la norma, aggirare, nella misura in cui |

Sentence themes: 42-1 a hearing, testimony, the verdict, a lawyer's and a judge's lines; 42-2 a fraud case from investigation to sentence, a victim, an acquittal that should (not) have happened; 42-3 a lease, the deposit, notice periods, a defect the landlord must fix, extra costs; 42-4 a law with a loophole, exceptions, what is banned, getting around a rule. Spanish is Latin American (Mexico for housing words: *casero*, *depósito*); Italian uses *Lei* in the formal lines and ’ in elisions.

**Steps.** As in 4.29.0 WP1: write the file; test with the checker (`'^<lang>-42-'`) via a temporary `index.html` tag (reverted before committing); full suite with the 6 GB heap, waiting until no other suite runs; only the lesson count may fail; commit the content file and `content/glossary.js`.

**Acceptance criteria:**
- [ ] 4 lessons with exactly the ids above, unit title `Law & justice` (C1)
- [ ] The checker prints `no failures` and no unglossed words for `^<lang>-42-`
- [ ] `npm test` fails only on the lesson count

**Stop and report if:** a legal word has no clear Latin American (Spanish) or standard Italian equivalent, or a grammar idea is already the focus of an existing tip in your language.

### WP2 — Pictures for unit 42

- **Agent:** parlance-illustrator, **Model:** sonnet, **Runs:** after the integration merges WP1
- Decide every new concept (draw a courthouse, a judge's gavel, a lawyer, handcuffs, a victim is `-`, a lease, a deposit, keys, a broken pipe for a defect, a law book; abstractions `-`) and check wrong-sense pictures, as in its agent file.

## Integration

- [ ] `index.html`: `content/<lang>-7-more.js` after `content/<lang>-6-more.js` for each language
- [ ] `dev/test.js`: lesson count 492 → 504
- [ ] `CLAUDE.md` "41 units and 164 lessons" → "42 units and 168 lessons"; `docs/ARCHITECTURE.md` unit numbers "(1–6, 20–29, 7–15, 16–19, 30–41)" → "(1–6, 20–29, 7–15, 16–19, 30–42)"
- [ ] `js/core/art.js`: unit sign for `Law & justice` (a gavel and a block)
- [ ] Voices: `node dev/voices.js --dry`, then hand off as in 4.29.0 if this environment's key is still refused

## Release notes

- **Title:** Law & justice
- **Notes:**
  - A new C1 unit in every language: courts and trials, crime, your rights as a tenant, and laws with their loopholes.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard --base <4.29.0 commit>` (no STOP, no FIX), `node design/pictures/tools.js check` (ok), `node dev/voices.js --dry`.
- Screens: `js:startLesson('de-42-1');wait:900;click:Start lesson;wait:800;shot:de-42-1`, the same for es-42-3 and it-42-4.
- Spot checks: read xx-42-3 side by side in the three languages.

## Risks and rollback

New lessons only. Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** 4.30.0 (WP1 unit 42 in de, es and it; WP2 8 drawings: court, judge, lawyer, crime, lease, deposit, defect, rule) | **Dropped:** – | **Escalated:** –
- **Notes:** review fixes before merge (Italian: a clearer *in base a* example, *man mano che* with a real change, a subjunctive blank after *salvo che*; Spanish: the 42-3 tip now says *haya* is the subjunctive of *hay*); German tips in units 40–42 keep the sentence period outside bold examples. *Das Gericht* needed no picture field: de-4-b1 only uses it in a sentence. Voices for 4.29.0 and 4.30.0 (1,010 lines, 20,041 characters) were handed over together.
