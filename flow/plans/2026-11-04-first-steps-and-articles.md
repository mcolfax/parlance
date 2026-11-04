# One idea per card in unit 1, and article practice in Review

- **Cycle:** 2026-11-04
- **Status:** building
- **Release:** 4.28.0 (minor: a new practice type, plus content and copy fixes)
- **Base:** `main` at 5a59939 (release 4.27.0)
- **Proposals built:** none open. WP1 continues web proposal `pmvxw6o4w0` (note fmvbms644lr5x), which the orchestrator marks shipped for 4.27.0 (unit 2). Nothing is closed for 4.28.0.
- **Roadmap items:** R-16 (unit 1), R-6, R-17; new R-19, R-20 (added open)

## Why this, why now

The only open learner thread is R-16 (proposal pmvxw6o4w0, note fmvbms644lr5x): beginner tips pack several forms onto one card. 4.27.0 fixed unit 2, and unit 1 is next. These are the first four lessons every learner meets in each language, and the only lesson with rating taps on both sides is es-1-2 (one "too hard", one "too easy"). Today its third card has no example (`flow/shots/2026-11-04/before/light-es-es-1-2-card3.png`), and in es-1-3, de-1-3 and it-1-3 both tables land on the wrong card (measured 2026-11-01). The twelve rewritten unit 1 tips below were run through `tipBites()` and `buildLesson()` against `main`: each has three cards, every example and table sits on the card that names it, every card is under 520 characters, and every example is an existing lesson sentence, so nothing new needs recording.

R-6 (article practice) is the lesson-types pick. It is deterministic: all 1,642 gendered nouns in the course (de 541, es 526, it 575) start with their article, and all but *el agua* take the article their gender predicts (that one is left out). It needs no tutor and no microphone and works on the web, and it practises the classic stumbling block with the learner's own words. Beginners get it early: six nouns are reached by x-2-3 in every language. R-17 is a one-line copy fix on the web version's Me screen, built in the same package. This beats R-2 and R-3 (new C1/C2 lessons and stories) this cycle because those would need one content package per language, which leaves no room for the feedback item.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 Unit 1 tips, one idea per card (de, es, it) | Green | POLICY Green: "Fixes to existing content that keep every review-card key: … a better tip". Only tip bodies and tip examples change. Vocab, sentences, blanks, tables and titles stay byte for byte. Continues learner feedback pmvxw6o4w0 (already approved). | none |
| WP2 Article practice in Review, and the tutor grading note on the web | **Amber** | POLICY Green: "New exercise types and lesson features that work offline, without the tutor, without a microphone and on the web version; that never change what a finished lesson, XP or a streak means; and that come with tests". It is Amber because it adds one `case` to `evaluate()` (POLICY Amber: "Answer checking and grading … `evaluate()` and friends"). The session earns XP exactly like the existing "Practice verb forms" session (`XP.perAnswer` per first-try right answer plus `XP.review` at the end, through the unchanged `finishRun()`), and touches no review card and no mistake. R-17 is Green copy. | The reviewer confirms: (1) `git diff 5a59939 -- js/core/engine.js` inside `evaluate()` is exactly one added line, `case 'gender': return genderGrade(ex, value);`, and no existing case changed; (2) the tests named below for right, wrong and near-miss answers exist and pass; (3) the test "article practice changes no review card or mistake" passes in all three languages; (4) `finishRun()` changed only by the `'Articles practiced'` label. |

Nothing is Red, so there is no question for Matt.

## Work packages

Order: **WP1 first, then WP2** on top of the commit with WP1 merged. Both edit `dev/test.js` (WP1 only the tip block, WP2 only the additions listed), so they don't run in parallel. If WP1 is dropped, WP2 still builds on `main` unchanged. Integration (docs, voices and pictures checks) comes after both.

### WP1 — Unit 1 tips, one idea per card (German, Spanish, Italian)

- **Agent:** parlance-content (one agent for the three languages: the text is given below word for word, so there is nothing to translate or invent)
- **Model:** sonnet
- **Runs:** first (worktree)
- **Owns (may edit):** `content/es-1-basics.js`, `content/de-1-basics.js`, `content/it-1-basics.js` (only the twelve lessons x-1-1 to x-1-4); `dev/test.js`, only the tip block between the comment `/* tips: a hand-cut tip (blank lines) …` (line 213 at base) and the line ending `'all twelve unit 2 tips are cut into three paragraphs'); }` (line 250 at base)
- **Reads first:** `CLAUDE.md`; `tipBites()` in `js/core/content.js` (lines 112–140); the twelve lessons es-1-1 … it-1-4 (unit "Greetings & introductions", the first unit of each course) and, as the model, es-2-1 in `content/es-1-basics.js` (a hand-cut tip: `\n\n` inside the single-quoted body string); the tip block of `dev/test.js` (lines 213–250).
- **Must not touch:** any lesson outside the twelve; any vocab, sentence or blank (their text is a review-card key or a resume count); any tip **table** (captions, heads and cells stay byte for byte); tip **titles**; any other part of `dev/test.js`; code.

**Spec.** For each of the twelve lessons, in its `T(title, body, examples, tables)` call, replace the **body** string and the **examples** array with the ones below, exactly. Leave the title and the tables untouched. Each body has three paragraphs separated by `\n\n` (written as backslash-n backslash-n inside the single-quoted JS string, as shown). Each paragraph is one card, and the placement each one gives is pinned by `TIP_PLACES` below. Every example is already a sentence of its lesson, so it is already recorded and glossed. Spanish stays Latin American (*ustedes*). Italian keeps sentence-ending periods outside bold (`**Ciao, Marco! A presto**.`), and every apostrophe is typographic (’), including in English.

What each card teaches, in all three languages (the text below is the spec):
- **x-1-1 Hello & goodbye:** (1) greetings by the time of day; (2) casual and polite hello and goodbye (es, de: also "How are you?"); (3) thank you, please, titles before a name (es: ¿ ¡; de: bis morgen).
- **x-1-2 What's your name?:** (1) "to be called" (llamarse · heißen · chiamarsi) with its table; (2) the informal and formal "you" (tú/usted · du/Sie · tu/Lei) with both questions; (3) "my name is …", the optional pronoun (es, it), and "nice to meet you".
- **x-1-3 Where are you from?:** (1) es, it: ser/essere for origin with its table; de: kommen + aus. (2) es, it: vivir/abitare, the regular verb, with its table; de: regular endings with wohnen and the table. (3) The small words: en / una / ustedes · in / aus den USA / eine · a and in / una / è and e.
- **x-1-4 How are you?:** (1) es, it: the two verbs for "to be" (es: with jobs and the ser-or-estar table); de: the forms of sein with its table. (2) es: estar's forms with its table; de: jobs with no article and -in, with the jobs table; it: stare's forms and Come stai? / Come sta?, with its table. (3) es, it: agreement (cansado · stanco), feliz/felice, muy/molto, también/anche, with the agreement table; de: Mir geht es gut, auch, sehr.

**The twelve tips** (titles and tables unchanged):

**es-1-1** (`content/es-1-basics.js`)

```js
'Greet by the time of day: **buenos días** in the morning, **buenas tardes** from noon until dark, and **buenas noches** in the evening and at night. The ending matches the noun: días is masculine plural (buenos), tardes and noches are feminine plural (buenas).\n\n**hola** is “hello” to anyone. Ask a friend **¿Cómo estás?** and a stranger **¿Cómo está usted?** Answer **Muy bien, gracias**: **muy** means “very”. To say goodbye, use **adiós** or **hasta luego** (see you later).\n\n**gracias** means “thank you” and **por favor** means “please”. Put **señor** (Mr., sir) or **señora** (Mrs., ma’am) before a name: **Buenos días, señora López**. Questions and exclamations open with **¿** and **¡**.'
```

```js
[['Buenas noches y gracias.', 'Good night and thank you.'], ['¡Hola! ¿Cómo estás?', 'Hello! How are you?'], ['Muy bien, gracias.', 'Very well, thank you.'], ['Buenos días, señora López.', 'Good morning, Mrs. López.']]
```

**de-1-1** (`content/de-1-basics.js`)

```js
'**Guten Morgen**, **Guten Tag** and **Guten Abend** work with anyone. You choose by the time of day: morning, daytime or evening.\n\n**Hallo** and **Tschüss** are casual, for friends and family. **Auf Wiedersehen** is the polite goodbye. **Wie geht’s?** (“how’s it going?”) comes from **gehen** (to go). To ask one friend, say **Wie geht es dir?**\n\n**Danke** means “thank you”, and **Bitte** means both “please” and “you’re welcome”. **bis** means “until”, so **Bis morgen!** is “see you tomorrow”. Titles go before a surname: **Herr** (Mr.) and **Frau** (Mrs. or Ms.), as in **Auf Wiedersehen, Herr Braun**.'
```

```js
[['Guten Morgen, Anna!', 'Good morning, Anna!'], ['Hallo, wie geht’s?', 'Hello, how are you?'], ['Danke, gut.', 'Thanks, good.'], ['Auf Wiedersehen, Herr Braun.', 'Goodbye, Mr. Braun.']]
```

**it-1-1** (`content/it-1-basics.js`)

```js
'With people you don’t know well, greet by the time of day: **buongiorno** in the morning and until lunch, **buonasera** from the afternoon on, and **buonanotte** only when someone is going to bed.\n\nItalians say **ciao** to friends and family, for both “hello” and “bye”. **Arrivederci** is the polite “goodbye”, and **a presto** means “see you soon”: **Ciao, Marco! A presto**.\n\nSay **grazie** for “thank you” and **per favore** for “please”. Titles go before a surname: **signor** Bianchi, **signora** Rossi. So: **Buongiorno, signora Rossi**.'
```

```js
[['Buonasera e grazie.', 'Good evening and thank you.'], ['Ciao, Marco! A presto.', 'Hi, Marco! See you soon.'], ['Buongiorno, signora Rossi.', 'Good morning, Mrs. Rossi.']]
```

**es-1-2** (`content/es-1-basics.js`)

```js
'In Spanish you “call yourself”: **Me llamo Matt** means “I’m called Matt”. **llamarse** (to be called) is a reflexive verb, so a small word comes before the verb and matches the person: **me llamo**, te llamas, se llama.\n\n**tú** is for friends and peers: **¿Cómo te llamas?** **usted** is for strangers, elders and formal settings. It takes the same verb form as él and ella: **¿Cómo se llama usted?**\n\nYou can also say **Mi nombre es Lucía**: **mi** means “my” and **es** means “is”. The pronoun **yo** (I) is optional, because me llamo already says “I”. When you meet someone, say **Mucho gusto** (nice to meet you).'
```

```js
[['Me llamo Matt.', 'My name is Matt.'], ['¿Cómo te llamas?', 'What’s your name?'], ['¿Cómo se llama usted?', 'What’s your name? (formal)'], ['Mi nombre es Lucía.', 'My name is Lucía.'], ['Mucho gusto, Lucía.', 'Nice to meet you, Lucía.']]
```

**de-1-2** (`content/de-1-basics.js`)

```js
'**heißen** means “to be called”: **Ich heiße Matt** is “my name is Matt”. The ending changes with the person: **ich heiße**, **du heißt**. Because heißen ends in ß, “du” needs only -t.\n\nUse **du** with friends, family and kids: **Wie heißt du?** Use **Sie** (always with a capital S) with strangers and in formal settings: **Wie heißen Sie?** Sie takes the same form as wir.\n\nYou can also say **Mein Name ist Lena** (my name is Lena). **ist** is a form of **sein** (to be), which you’ll meet in lesson 4. When you meet someone, say **Freut mich** (nice to meet you).'
```

```js
[['Ich heiße Matt.', 'My name is Matt.'], ['Wie heißt du?', 'What’s your name? (casual)'], ['Wie heißen Sie?', 'What’s your name? (formal)'], ['Mein Name ist Lena.', 'My name is Lena.'], ['Freut mich, Lena!', 'Nice to meet you, Lena!']]
```

**it-1-2** (`content/it-1-basics.js`)

```js
'In Italian you “call yourself”: **Mi chiamo Matt** means “my name is Matt”. **chiamarsi** (to be called) is a reflexive verb, so a small word comes before the verb and matches the person: **mi chiamo**, ti chiami, si chiama.\n\n**tu** is for friends and peers: **Come ti chiami?** **Lei**, written with a capital, is for strangers, elders and formal settings. It takes the same verb form as lui and lei: **Come si chiama Lei?**\n\nYou can also say **Il mio nome è Matt**. The pronoun **io** (I) is optional, because mi chiamo already says “I”. When you meet someone, say **Piacere** (nice to meet you): **Piacere, Lucia**.'
```

```js
[['Mi chiamo Matt.', 'My name is Matt.'], ['Come ti chiami?', 'What’s your name?'], ['Come si chiama Lei?', 'What’s your name? (formal)'], ['Piacere, Lucia.', 'Nice to meet you, Lucia.']]
```

**es-1-3** (`content/es-1-basics.js`)

```js
'**Soy de México** means “I’m from Mexico”. The verb is **ser** (to be), for who you are and where you’re from. It is irregular, so learn its forms: **soy**, **eres**, **es**. Ask **¿De dónde eres?** and say where someone else is from: **Ana es de Colombia**.\n\n**vivir** (to live) is regular: take off -ir and add the ending for each person. Spanish usually drops the subject pronoun, because the ending already shows who: **vivo** is “I live” and **vives** is “you live”. Ask **¿Dónde vives?**\n\n**en** means “in” or “at”: Vivo en Boston. **una** is “a” before a feminine noun: **una ciudad**. **ustedes** (you all) takes the same form as ellos and ellas: **son**, **viven**.'
```

```js
[['¿De dónde eres?', 'Where are you from?'], ['Ana es de Colombia.', 'Ana is from Colombia.'], ['Vivo en Boston.', 'I live in Boston.'], ['Guadalajara es una ciudad de México.', 'Guadalajara is a city in Mexico.']]
```

**de-1-3** (`content/de-1-basics.js`)

```js
'**kommen** means “to come”. Use it with **aus** (from) to say where you’re from: **Ich komme aus Amerika**. Ask **Woher kommst du?**, literally “where from do you come?”\n\nMost verbs drop -en and add an ending for the person: ich **wohne**, du **wohnst**, er, sie or es **wohnt**, wir **wohnen**. **wo** means “where”: **Wo wohnst du?**\n\nUse **in** with where you live: in Boston. Countries usually have no article (Deutschland), but a few plural ones do: **aus den USA**. **eine Stadt** means “a city”: the -e of **eine** is there because Stadt is a **die** word.'
```

```js
[['Anna kommt aus Österreich.', 'Anna comes from Austria.'], ['Ich wohne in Boston.', 'I live in Boston.'], ['Wo wohnst du?', 'Where do you live?'], ['Berlin ist eine Stadt in Deutschland.', 'Berlin is a city in Germany.']]
```

**it-1-3** (`content/it-1-basics.js`)

```js
'**Sono di Roma** means “I’m from Rome”. The verb is **essere** (to be), for who you are and where you’re from. It is irregular, so learn its forms: **sono**, **sei**, **è**. Ask **Di dove sei?** and say where someone else is from: **Marco è di Napoli**.\n\n**abitare** (to live) is regular: take off -are and add the ending for each person. Italian usually drops the subject pronoun, because the ending already shows who: **abito** is “I live” and **abiti** is “you live”. Ask **Dove abiti?**\n\nUse **a** with a city (**abito a Roma**) and **in** with a country (**in Italia**). **una** is “a” before a feminine noun: **una città**. Careful: **è** with an accent means “is”, and **e** without one means “and”.'
```

```js
[['Di dove sei?', 'Where are you from?'], ['Marco è di Napoli.', 'Marco is from Naples.'], ['Abito a Boston.', 'I live in Boston.'], ['Roma è una città in Italia.', 'Rome is a city in Italy.']]
```

**es-1-4** (`content/es-1-basics.js`)

```js
'Spanish has two verbs for “to be”. **ser** is for who or what someone is: identity, origin and jobs. Jobs take no “a”: **Ella es doctora** is “she is a doctor”. **estar** is for how someone is and where: **Estoy bien** (I’m fine).\n\nestar is irregular in the yo form: **estoy**, **estás**, **está**, **estamos**, **están**. Use it for feelings and states: **Estoy cansado** (I’m tired).\n\nAdjectives agree with the person. A man says **cansado** and a woman **cansada**; several people are **cansados** or **cansadas**. **feliz** (happy) is the same for men and women. **muy** (very) goes before the adjective: **Estamos muy cansados**. **también** (also) usually comes before the verb.'
```

```js
[['Ella es doctora.', 'She is a doctor.'], ['Estoy cansado.', 'I am tired.'], ['Estamos muy cansados.', 'We are very tired.']]
```

**de-1-4** (`content/de-1-basics.js`)

```js
'**sein** (to be) is irregular, so learn its forms by heart: **ich bin**, **du bist**, **wir sind**. **Ich bin müde** is “I’m tired”. A question puts the verb first: **Bist du froh?**\n\nFor jobs, German drops the article: **Er ist Lehrer** means “he is a teacher”. A woman’s job usually adds -in: **Lehrerin**, **Ärztin**. With several people the job stays the same: **Wir sind Lehrer**.\n\n**Mir geht es gut** (“it goes well for me”) is a common way to say you’re fine. **auch** means “too” and **sehr** means “very”: **Mir geht es auch gut**.'
```

```js
[['Ich bin müde.', 'I am tired.'], ['Er ist Lehrer.', 'He is a teacher.'], ['Mir geht es auch gut.', 'I am fine too.']]
```

**it-1-4** (`content/it-1-basics.js`)

```js
'Italian uses two verbs for how you are. **stare** says how someone is doing: **Sto bene** (I’m well), **Sto male** (I’m unwell). **essere** goes with an adjective for a feeling or state: **Sono stanco** (I’m tired), **Sono felice** (I’m happy).\n\n**Come stai?** (“How are you?”) uses stare. Its forms are irregular: **sto**, **stai**, **sta**, **stiamo**. With a stranger or someone older, say **Come sta?**\n\nAdjectives ending in -o change with the person: a man says **stanco**, a woman **stanca**, and several people **stanchi** or **stanche** (the h keeps the hard c sound). **felice** ends in -e, so it is the same for men and women. **molto** (very) goes before the adjective: **Siamo molto stanchi**. **anche** means “also”.'
```

```js
[['Sto bene, grazie.', 'I’m fine, thank you.'], ['Come stai?', 'How are you?'], ['Siamo molto stanchi.', 'We are very tired.'], ['Anna è molto felice.', 'Anna is very happy.']]
```

**Changes to the tip block of `dev/test.js`** (only lines 213–250 at base):

1. The regression check "tipBites: a tip without blank lines is cut as before" uses es-1-1, which is now hand-cut. Replace its two lines (218–219 at base, from `const es11 = …` to `… 'tipBites: a tip without blank lines is cut as before'); }`) with this check on es-9-1 (B1, not on R-16's list), which pins its cut on `main` today:

```js
    const es91 = A.E('tipBites(getLesson("es-9-1").tip)');
    ok(es91.length === 2 && es91[0].body.startsWith('The **present perfect** is') && es91[1].body.startsWith('Regular endings') && es91[0].tables.map(t => t.cap).join('|') === 'haber (the helper)' && es91[1].tables.map(t => t.cap).join('|') === 'Participles' && es91[0].examples.length === 2 && es91[1].examples.length === 1, 'tipBites: a tip without blank lines is cut as before'); }
```

2. Add these twelve entries at the top of the `TIP_PLACES` object (before `'es-2-1'`), copied exactly:

```js
      'es-1-1': [['Buenas noches y gracias.', 'Greeting and when to use it'], ['¡Hola! ¿Cómo estás?', 'Muy bien, gracias.', 'Asking “How are you?”'], ['Buenos días, señora López.']],
      'de-1-1': [['Guten Morgen, Anna!', 'Greetings through the day'], ['Hallo, wie geht’s?'], ['Danke, gut.', 'Auf Wiedersehen, Herr Braun.']],
      'it-1-1': [['Buonasera e grazie.', 'Greeting and when to use it'], ['Ciao, Marco! A presto.', 'Hello and goodbye'], ['Buongiorno, signora Rossi.']],
      'es-1-2': [['Me llamo Matt.', 'llamarse (reflexive): to be called'], ['¿Cómo te llamas?', '¿Cómo se llama usted?', 'tú or usted?'], ['Mi nombre es Lucía.', 'Mucho gusto, Lucía.']],
      'de-1-2': [['Ich heiße Matt.', 'Present of **heißen** (to be called)'], ['Wie heißt du?', 'Wie heißen Sie?'], ['Mein Name ist Lena.', 'Freut mich, Lena!']],
      'it-1-2': [['Mi chiamo Matt.', 'chiamarsi (reflexive): to be called'], ['Come ti chiami?', 'Come si chiama Lei?', 'tu or Lei?'], ['Piacere, Lucia.']],
      'es-1-3': [['¿De dónde eres?', 'Ana es de Colombia.', 'ser (irregular): to be'], ['Vivo en Boston.', 'vivir (regular -ir): to live'], ['Guadalajara es una ciudad de México.']],
      'de-1-3': [['Anna kommt aus Österreich.'], ['Ich wohne in Boston.', 'Wo wohnst du?', 'Present of **kommen** and **wohnen** (regular verbs)'], ['Berlin ist eine Stadt in Deutschland.']],
      'it-1-3': [['Di dove sei?', 'Marco è di Napoli.', 'essere (irregular): to be'], ['Abito a Boston.', 'abitare (regular -are): to live'], ['Roma è una città in Italia.']],
      'es-1-4': [['Ella es doctora.', 'ser or estar?'], ['Estoy cansado.', 'estar (irregular yo): to be'], ['Estamos muy cansados.', 'Agreement of cansado']],
      'de-1-4': [['Ich bin müde.', 'Present of **sein** (to be)'], ['Er ist Lehrer.', 'Jobs: he and she'], ['Mir geht es auch gut.']],
      'it-1-4': [['Sto bene, grazie.'], ['Come stai?', 'stare (irregular): to be, to feel'], ['Siamo molto stanchi.', 'Anna è molto felice.', 'Agreement of stanco']],
```

3. In the last check of the block, change `Object.keys(TIP_PLACES).length === 12` to `Object.keys(TIP_PLACES).length === 24` and the message `'all twelve unit 2 tips are cut into three paragraphs'` to `'all twenty-four unit 1 and unit 2 tips are cut into three paragraphs'`. Nothing else in that line changes.

**Steps.**
1. In each of the three content files, find the four `L('<id>', …, T(…))` calls of unit 1 and replace the body string, then the examples array. Keep the file's layout: `es` and `it` put the title, body, examples and tables on separate lines; `de` puts the title and body on the `T(` line and the examples on the next line.
2. Check the paragraph breaks: each file now holds 16 `\n\n` sequences (8 in unit 2 as before, plus two in each of the four new bodies). Run `for f in es de it; do grep -o '\\n\\n' content/$f-1-basics.js | wc -l; done`: each prints `16`.
3. Make the three `dev/test.js` edits above.
4. Run `npm test` (30-minute timeout, writing to `flow/shots/test.log`). The twelve new "tip cards hold what the plan says" checks and the "sits with the paragraph that names it" checks run for these lessons and must pass.
5. `node dev/flow.js guard --base 5a59939`: no orphaned review-card keys (only tips changed), no straight apostrophes, no FIX or STOP.
6. Take screenshots of the three cards of es-1-2, de-1-2 and it-1-2, and of es-1-4, de-1-4 and it-1-4 (steps in the Verification plan), in light and dark, into `flow/shots/2026-11-04/wp1/`. Read each card once as a learner.

**Acceptance criteria.**
- [ ] `npm test` ends with `FAIL 0`, with the twelve unit 1 `<id> tip cards hold what the plan says` checks passing, plus "tipBites: a tip without blank lines is cut as before" (es-9-1) and "all twenty-four unit 1 and unit 2 tips are cut into three paragraphs".
- [ ] `git diff 5a59939 -- content/` changes only the twelve unit 1 tip bodies and examples arrays: no line holding a vocab, sentence, blank or table array changes, and `node dev/flow.js guard --base 5a59939` reports no orphaned keys.
- [ ] Each of the three content files contains 16 `\n\n` sequences (step 2).
- [ ] `git diff 5a59939 -- dev/test.js` touches only lines inside the tip block.
- [ ] In `flow/shots/2026-11-04/wp1/`, es-1-2 card 3 shows **Mi nombre es Lucía** with the examples "Mi nombre es Lucía." and "Mucho gusto, Lucía."; es-1-4 card 3 shows the "Agreement of cansado" table; no card scrolls sideways at 412px, in light or dark.

**Stop and report if:** a placement check fails after the text is pasted exactly (report the lesson and what landed where, and don't reword to make it pass); anything would require changing a vocab, sentence, blank, table or title; `npm test` asks for a glossary entry (none is expected: every example is an existing lesson sentence).

### WP2 — Article practice in Review, and the tutor grading note on the web

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1 is merged (worktree based on that commit)
- **Owns (may edit):** `js/config.js` (only a new `GENDER_DRILL` constant right after the `PIC_EX` line); `js/core/engine.js` (new functions after `formEx()`, and one line in `evaluate()`); `js/ui/runner.js` (`startGenders()` after `startForms()`, `RENDER.gender` after `RENDER.form`, the two type lists in `feedbackAnswer()` and `showFeedback()`, the `top` label in `finishRun()`); `js/ui/review.js` (one button in the hero); `js/ui/me.js` (only the "Tutor grading" `toggleRow` line); `styles/components.css` (one new rule after `.gap-opts{gap:10px}`); `dev/test.js` (only the additions below, outside the tip block)
- **Reads first:** `formDrills()`/`formEx()` and `evaluate()` in `js/core/engine.js` (lines 338–354, 479–514), `learnedEntries()` (line 46), `articleCheck()` (line 521); `startForms()`, `beginSession()` (lines 117–131), `RENDER.blank` (line 473: the gap and tile pattern to copy), `RENDER.form`, `feedbackAnswer()` (line 199), `showFeedback()` (line 211, especially lines 217–233 and 249–251) and `finishRun()` (line 562) in `js/ui/runner.js`; `viewReview()` in `js/ui/review.js`; `toggleRow()` and the Practice card in `js/ui/me.js` (lines 3–7, 113–121); `PIC_EX` in `js/config.js` (line 265); the per-language review checks in `dev/test.js` (lines 659–723) and the web Me checks (lines 1468–1472).
- **Must not touch:** any content file; the tip block of `dev/test.js`; `srsUpdate`, `noteMiss`, `reviewQueue`, `buildLesson`; any existing `evaluate()` case; `XP`, quests, badges; `styles/tokens.css`; `index.html`; `APP_VERSION` and `RELEASES` (the ship step).

**Spec.**

*What the learner gets.* On the Review tab, under "Practice verb forms and endings", a new button: **Practice articles: der, die, das** (German), **Practice articles: el, la, los, las** (Spanish), **Practice articles: il, lo, la, i, gli, le** (Italian). It shows once the learner has at least 6 nouns from finished lessons, and is hidden otherwise (a new learner, or a language not started). It opens a session of up to 12 of those nouns, picked at random, each a different word. Each question shows the noun without its article in the blank-sentence style (a gap, then the noun), its English meaning under it, and one tile per article. Tapping a tile fills the gap, Check grades it, and the feedback shows the whole word with its article and audio (German keeps its der/die/das colors), right or wrong. Questions answered wrong come back later in the session, as everywhere. The finish stamp says **Articles practiced**. The session never touches review cards (no `srs`) or the "Fix my mistakes" list (no `key`), and earns XP exactly like "Practice verb forms": `XP.perAnswer` per first-try right answer and `XP.review` at the end, through the unchanged `finishRun()`. Not in lessons, checkpoints or placement. It works offline, signed out, on the web, without the tutor and without a microphone.

*Grading.* The right article counts (`level: 'exact'`), and so does Italian `l'` typed with a straight apostrophe. In Spanish, the right gender in the wrong number (`las` for *la ciudad*, `el` for *los guantes*) is a near miss that doesn't count: `{ ok: false, level: 'article' }` with the note `Right gender, but <noun> is <singular|plural>: <word with article>.` In Italian, the right gender in the wrong form (`il` for *l’anno*, `il` for *lo sconto*, `l’` for *la città*, `i` for *gli occhi*) is a near miss that doesn't count, with `Right gender. ` + that article's rule. A German plural noun answered wrong gets the note `In the plural, every noun takes die.` Everything else is `{ ok: false, level: 'wrong' }`. `showFeedback()` already titles `level: 'article'` "Almost" and re-asks it.

*A. `js/config.js`*, directly after the `PIC_EX` line:

```js
/* Practice articles (Review tab, startGenders()): nouns from finished lessons, shown without their article.
   sg and pl are the buttons for a singular and a plural noun; fits says which vocab genders an article can go with;
   gender is each article's own gender (mf: either), for telling a near miss; why is the Italian rule a near miss shows. */
const GENDER_DRILL = { min: 6, perSession: 12,
  de: { label: 'der, die, das', sg: ['der', 'die', 'das'], pl: ['der', 'die', 'das'], fits: { der: ['m'], die: ['f', 'pl'], das: ['n'] }, gender: { der: 'm', die: 'f', das: 'n' }, why: {} },
  es: { label: 'el, la, los, las', sg: ['el', 'la', 'los', 'las'], pl: ['el', 'la', 'los', 'las'], fits: { el: ['m'], la: ['f'], los: ['pl'], las: ['pl'] }, gender: { el: 'm', la: 'f', los: 'm', las: 'f' }, why: {} },
  it: { label: 'il, lo, la, i, gli, le', sg: ['il', 'lo', 'la', 'l’'], pl: ['i', 'gli', 'le'], fits: { il: ['m'], lo: ['m'], la: ['f'], 'l’': ['m', 'f'], i: ['pl'], gli: ['pl'], le: ['pl'] }, gender: { il: 'm', lo: 'm', la: 'f', 'l’': 'mf', i: 'm', gli: 'm', le: 'f' },
    why: { 'l’': 'Before a vowel, il and la become l’.', lo: 'Before s + consonant, z, gn, ps or y, use lo, not il.', il: 'Use il before most consonants. lo is for s + consonant, z, gn, ps and y, and l’ is for a vowel.', la: 'Use la before a consonant. It becomes l’ only before a vowel.', gli: 'Before a vowel, s + consonant, z, gn, ps or y, use gli, not i.', i: 'Use i before most consonants. gli is for a vowel, s + consonant, z, gn, ps and y.' } }
};
```

*B. `js/core/engine.js`*, directly after `formEx()` (this code was trialled against `main`: every case in the tests below gives the stated result):

```js
/* article practice: a noun from a finished lesson, asked without its article */
function genderNoun(item, lang){   // { art, noun, plural } when the word starts with an article that fits its gender, else null
  const G = GENDER_DRILL[lang]; if (!G || !item || !item.g) return null;
  const m = (lang === 'it' ? /^(l[’']|\S+)\s*(.+)$/i : /^(\S+)\s+(.+)$/).exec(String(item.t).trim()); if (!m) return null;
  const art = m[1].toLowerCase().replace(/'/g, '’'), noun = m[2].trim();
  if (!noun || !G.fits[art] || !G.fits[art].includes(item.g)) return null;   // el agua (feminine, with el) is left out
  return { art, noun, plural: item.g === 'pl' };
}
/* nouns that appear with two different articles somewhere in the course are never asked */
function genderClashes(lang){
  const seen = new Map(), out = new Set();
  for (const l of coreOrder(lang)) for (const v of l.vocab){ const g = genderNoun(v, lang); if (!g) continue; const k = g.noun.toLowerCase(); if (seen.has(k) && seen.get(k) !== g.art) out.add(k); else if (!seen.has(k)) seen.set(k, g.art); }
  return out;
}
function genderEntries(lang){
  const clash = genderClashes(lang), seen = new Set(), out = [];
  for (const e of learnedEntries(lang, 'v')){
    const g = genderNoun(e.item, lang); if (!g || seen.has(e.item.t) || clash.has(g.noun.toLowerCase())) continue;
    seen.add(e.item.t); out.push(e);
  }
  return out;
}
/* no key and no srs: an article question never moves a review card or lands on "Fix my mistakes" */
function genderEx(entry){
  const lang = entry.lesson.lang, G = GENDER_DRILL[lang], g = genderNoun(entry.item, lang);
  return { id: ++EXID, type: 'gender', lang, lesson: entry.lesson, item: entry.item, kind: 'v', noun: g.noun, plural: g.plural, correct: g.art, options: (g.plural ? G.pl : G.sg).slice() };
}
/* right; or, in Spanish and Italian, the right gender in the wrong number or form: a near miss that doesn't count */
function genderGrade(ex, value){
  const G = GENDER_DRILL[ex.lang], v = String(value == null ? '' : value).trim().toLowerCase().replace(/'/g, '’');
  if (v === ex.correct) return { ok: true, level: 'exact' };
  const gv = G.gender[v], ng = ex.item.g === 'm' || ex.item.g === 'f' ? ex.item.g : G.gender[ex.correct], same = !!gv && (gv === ng || gv === 'mf');
  if (ex.lang === 'es' && same) return { ok: false, level: 'article', note: 'Right gender, but ' + ex.noun + ' is ' + (ex.plural ? 'plural' : 'singular') + ': ' + ex.item.t + '.' };
  if (ex.lang === 'it' && same && (ex.plural ? G.pl : G.sg).includes(v) && G.why[ex.correct]) return { ok: false, level: 'article', note: 'Right gender. ' + G.why[ex.correct] };
  if (ex.lang === 'de' && ex.plural) return { ok: false, level: 'wrong', note: 'In the plural, every noun takes die.' };
  return { ok: false, level: 'wrong' };
}
```

In `evaluate()`, add exactly one line, right after `case 'match': return { ok: true, level: 'exact' };`:

```js
    case 'gender': return genderGrade(ex, value);
```

*C. `js/ui/runner.js`.*
1. After `startForms()`:
```js
function startGenders(){
  const lang = S.settings.lang, es = genderEntries(lang); if (es.length < GENDER_DRILL.min) return;
  beginSession('genders', lang, shuffle(es).slice(0, GENDER_DRILL.perSession).map(genderEx));
}
```
2. In `RENDER`, after `form(ex, api){ … },`, add (the gap and tiles follow `RENDER.blank`; an option ending in ’ joins the noun with no space, so the gap reads *l’anno*):
```js
  gender(ex, api){
    const gap = h('span', { class: 'gap' }, ' '), sep = document.createTextNode(' ');
    return h('div', { class: 'ex' }, qLabel('Choose the article'),
      h('div', { class: 'gap-sent', lang: LANGS[ex.lang].tts }, gap, sep, h('span', { class: 'gender-noun' }, ex.noun)),
      h('p', { class: 'muted' }, ex.item.e[0]),
      h('div', { class: 'chips gap-opts' }, ex.options.map((o, i) => {
        const b = h('button', { class: 'tile', type: 'button', style: '--i:' + i, 'aria-pressed': 'false' }, o);
        b.addEventListener('click', () => { gap.textContent = o; sep.textContent = o.endsWith('’') ? '' : ' '; gap.classList.remove('filled'); void gap.offsetWidth; gap.classList.add('filled'); b.parentNode.querySelectorAll('.tile').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); sfx('select'); api.set(o); api.ready(true); });
        return b;
      })));
  },
```
3. `feedbackAnswer()`: add `'gender'` to the `target:` list (`['mc-e2t', 'type-e2t', 'bank-e2t', 'listen', 'speak', 'pic-name', 'pic-type', 'gender']`), so the answer shows the word in its own language.
4. `showFeedback()`, the condition before `if (!res.ok) fb.append(h('div', { class: 'fb-label' }, 'Correct answer'));`: add `'gender'` to the list `['bank-t2e', 'type-t2e', 'listen', 'mc-t2e', 'listen-mc', 'blank', 'pic-pick']`, so the whole word with its article shows after a right answer too. Nothing else in `showFeedback()` changes: the existing `ex.item.g && ex.kind === 'v' ? itemText(…)` branch draws it, and autoplay speaks `ex.item.t`, which is recorded.
5. `finishRun()`: in the `top =` line, insert `Run.mode === 'genders' ? 'Articles practiced' : ` before `'Practice complete'`.

*D. `js/ui/review.js`, `viewReview()`.* Next to `const fix = …, forms = …;` add `const arts = genderEntries(lang).length >= GENDER_DRILL.min;`. After the `forms ? h('button', … 'Practice verb forms and endings') : null` child, add:
```js
    arts ? h('button', { class: 'btn btn-ghost btn-wide', type: 'button', onclick: () => startGenders() }, ic('words'), 'Practice articles: ' + GENDER_DRILL[lang].label) : null
```

*E. `styles/components.css`*, after `.gap-opts{gap:10px}`: `.gender-noun{overflow-wrap:anywhere;hyphens:auto}` (the longest noun, *Meinungsverschiedenheit*, has to fit at 360px). No colors, no tokens.

*F. `js/ui/me.js` (R-17).* In the Practice card, the "Tutor grading" row's description becomes
`Web.on ? 'Needs Parlance in Claude. On the web version, Parlance checks your typed answers on its own.' : 'If a typed answer doesn’t match, Claude checks whether it’s still right and explains what’s different.'`
The toggle itself stays, and the Claude version is unchanged.

*Edge cases.* A new learner, or a language with fewer than 6 learned nouns: no button. A learner with a lot of progress: 12 random nouns out of hundreds, no word twice. A noun whose card was orphaned is never asked (`learnedEntries()` only returns resolvable keys). Live-pack and tutor-made lessons count if their nouns fit (`genderNoun()` checks the article against the gender). No tutor and no mic: nothing used. Dark mode and reduced motion: only existing classes (`gap`, `gap-sent`, `tile`, `chips`, `muted`). 412px and 360px: the tiles wrap like a blank's, and long nouns wrap inside `.gender-noun`.

**Tests to add to `dev/test.js`.**

1. In section 1, right after the top bar check ("the top bar lets the wordmark wrap instead of cutting it"), a block using `A.E(...)` with these helpers:
```js
  { const gx = (lang, t) => 'genderEx((l => ({ lesson: l, item: l.vocab.find(v => v.t === ' + JSON.stringify(t) + ') }))(coreOrder(' + JSON.stringify(lang) + ').find(l => l.vocab.some(v => v.t === ' + JSON.stringify(t) + '))))';
    const ev = (lang, t, v) => A.E('evaluate(' + gx(lang, t) + ', ' + JSON.stringify(v) + ')');
```
   - **"article practice: which nouns are asked, without their article"**: `genderNoun({ t: 'die Stadt', g: 'f' }, 'de')` is `{ art: 'die', noun: 'Stadt', plural: false }`; `genderNoun({ t: 'die Schuhe', g: 'pl' }, 'de').plural === true`; `genderNoun({ t: 'l’anno', g: 'm' }, 'it')` is `{ art: 'l’', noun: 'anno', plural: false }`; `genderNoun({ t: 'lo sconto', g: 'm' }, 'it').art === 'lo'`; `genderNoun({ t: 'el agua', g: 'f' }, 'es') === null`; `genderNoun({ t: 'hola', g: null }, 'es') === null`; `genderClashes('es').has('papa') === false` (*la papa* and *el papá* are different words).
   - **"article practice: the buttons for each language, and no review card behind a question"**: the options of `gx('de', 'die Stadt')` join to `der|die|das`, `gx('es', 'la ciudad')` to `el|la|los|las`, `gx('it', 'la città')` to `il|lo|la|l’`, `gx('it', 'gli occhi')` to `i|gli|le`; each has `type === 'gender'`, no `key` and no `srs`.
   - **"article practice: the right article counts"**: `ev('de', 'die Stadt', 'die')`, `ev('es', 'la ciudad', 'la')`, `ev('it', 'l’anno', 'l’')` and `ev('it', 'l’anno', "l'")` are all `{ ok: true, level: 'exact' }`.
   - **"article practice: a wrong article doesn't count"**: `ev('de', 'die Stadt', 'der')`, `ev('es', 'la ciudad', 'el')` and `ev('it', 'l’anno', 'la')` are `ok: false, level: 'wrong'`; `ev('de', 'die Schuhe', 'das')` is `ok: false` with note `In the plural, every noun takes die.`
   - **"article practice: the right gender in the wrong number or form is a near miss that doesn't count"**: `ev('es', 'la ciudad', 'las')` is `{ ok: false, level: 'article' }` with note `Right gender, but ciudad is singular: la ciudad.`; `ev('es', 'los guantes', 'el')` has note `Right gender, but guantes is plural: los guantes.`; `ev('it', 'l’anno', 'il')` has level `article` and note `Right gender. Before a vowel, il and la become l’.`; `ev('it', 'lo sconto', 'il')` has note `Right gender. Before s + consonant, z, gn, ps or y, use lo, not il.`; `ev('it', 'la città', 'l’')` and `ev('it', 'gli occhi', 'i')` have level `article` and `ok: false`.
2. In the Claude-version run, inside `for (const lang of LANG_IDS)`, right after the picture-review block closes (after the line `else ok(true, 'mistake sessions ask no picture questions (no mistakes to practise)');` and its closing `}`), and before `for (const tab of ['learn', …`:
```js
    { /* article practice from the Review tab: nouns from finished lessons; no review card or mistake changes */
      const label = 'Practice articles: ' + E('GENDER_DRILL[S.settings.lang].label');
      const artBtn = () => [...w.document.querySelectorAll('#app button')].find(b => b.textContent.trim() === label);
      const cards = P.S.langs[lang].cards, saved = { ...cards }, six = E('genderEntries(S.settings.lang).slice(0, 6).map(e => e.key)');
      for (const k of Object.keys(cards)) delete cards[k];
      E('UI.tab="review"; render()'); ok(!artBtn(), lang + ' a learner with no nouns yet sees no article practice');
      for (const k of six.slice(0, 5)) cards[k] = saved[k]; E('render()'); ok(!artBtn(), lang + ' five nouns are not enough for article practice');
      cards[six[5]] = saved[six[5]]; E('render()'); ok(!!artBtn(), lang + ' six nouns bring article practice');
      Object.assign(cards, saved); E('render()');
      const before = JSON.stringify(P.S.langs[lang].cards) + JSON.stringify(P.S.langs[lang].miss), xp0 = P.S.langs[lang].xp || 0;
      artBtn().click();
      const q = Run().queue, ov = () => w.document.querySelector('.overlay:not(.out)');
      ok(Run().mode === 'genders' && q.length === 12 && q.every(x => x.type === 'gender') && new Set(q.map(x => x.item.t)).size === 12, lang + ' article practice asks 12 different nouns');
      ok(ov().querySelector('.gap-sent .gender-noun').textContent === Run().cur.noun && !ov().querySelector('.gap-sent').textContent.includes(Run().cur.item.t) && ov().querySelectorAll('.gap-opts .tile').length === Run().cur.options.length, lang + ' each noun is shown without its article, with one button per article');
      [...ov().querySelectorAll('.gap-opts .tile')].find(b => b.textContent === Run().cur.correct).click(); E('doCheck()');
      ok(ov().querySelector('.ov-foot').classList.contains('ok') && ov().querySelector('.fb-ans').textContent.includes(Run().cur.item.t), lang + ' the right article is accepted and the whole word is shown');
      footBtn('Continue').click();
      const R = Run(); R.value = R.cur.options.find(o => o !== R.cur.correct); R.canCheck = true; E('doCheck()');
      ok(ov().querySelector('.ov-foot').classList.contains('bad'), lang + ' a wrong article is marked wrong');
      footBtn('Continue').click();
      await finishCurrent();
      ok(Run().finished && ov().querySelector('.stamp').textContent.includes('Articles practiced'), lang + ' article practice finishes');
      ok(JSON.stringify(P.S.langs[lang].cards) + JSON.stringify(P.S.langs[lang].miss) === before && (P.S.langs[lang].xp || 0) > xp0, lang + ' article practice changes no review card or mistake, and earns practice XP');
      footBtn('Continue').click();
    }
```
3. Right after `ok(![...w.document.querySelectorAll('#app button')].some(b => b.textContent.includes('Go to Talk')), 'the Claude version\'s Me has no Go to Talk pointer');` (Me is rendered there), add **"the Claude version explains tutor grading as before"**: some `#app .setrow` has text including `Tutor grading` and `If a typed answer doesn’t match, Claude checks`.
4. In the web block, right after the check "Me on the web points to Talk scenes in chat apps" (Me is rendered there), add **"on the web, tutor grading says it needs Parlance in Claude"**: some `W1.w.document.querySelectorAll('#app .setrow')` has text including `Tutor grading` and `Needs Parlance in Claude. On the web version, Parlance checks your typed answers on its own.`

**Steps.**
1. Add `GENDER_DRILL` to `js/config.js` (A).
2. Add the functions and the `evaluate()` line to `js/core/engine.js` (B).
3. Add `startGenders()`, `RENDER.gender` and the three small edits in `js/ui/runner.js` (C).
4. Add the button in `js/ui/review.js` (D), the CSS rule (E) and the Me copy (F).
5. Add the tests.
6. `npm test` (30-minute timeout, writing to `flow/shots/test.log`) and `node dev/flow.js guard --base 5a59939` (it notes the new exercise type `gender`: expected).
7. Take the screenshots in the Verification plan ("Article practice" and "Me on the web") into `flow/shots/2026-11-04/wp2/`, 412 light and dark, then 360 light.

**Acceptance criteria.**
- [ ] `npm test` ends with `FAIL 0`, with the checks named above (grep `dev/test.js` for "which nouns are asked", "the buttons for each language", "the right article counts", "a wrong article doesn't count", "is a near miss that doesn't count", "sees no article practice", "five nouns are not enough", "six nouns bring article practice", "asks 12 different nouns", "shown without its article", "the whole word is shown", "a wrong article is marked wrong", "article practice finishes", "changes no review card or mistake", "explains tutor grading as before", "needs Parlance in Claude").
- [ ] `git diff <WP1 commit> -- js/core/engine.js` adds only the five new functions after `formEx()` and the one `case 'gender'` line in `evaluate()`. `git diff <WP1 commit> -- js/config.js` adds only `GENDER_DRILL`. `git diff <WP1 commit> -- styles/` adds only the `.gender-noun` rule, and `styles/tokens.css` is unchanged.
- [ ] The article practice screenshots show the gap, the noun, its meaning and the article tiles with no sideways scroll at 412 and 360, light and dark. The long-noun shot (*Meinungsverschiedenheit*, 360px) shows the whole noun inside the screen.
- [ ] `node dev/flow.js guard --base 5a59939` shows no FIX or STOP.

**Stop and report if:** the session would need a saved-state field, a review-card key or a new `Run` field beyond `mode: 'genders'`; any existing `evaluate()` case or `showFeedback()` behaviour has to change for other exercise types; a test shows a near-miss result different from the one stated (report the case, don't adjust the expectation).

## Integration

One parlance-chores (Haiku) run on the cycle branch after WP1 and WP2 are merged, then the ship step:

- [ ] `docs/ARCHITECTURE.md`:
  - "How a lesson teaches", the bullet "**The idea**": change "Unit 2 in every language is written this way." to "Units 1 and 2 in every language are written this way."
  - "Practice beyond lessons": after the "**Form drills**" bullet, add: "- **Article practice** (`GENDER_DRILL` in `config.js`; `genderNoun()`, `genderEntries()`, `genderEx()` and `genderGrade()` in `engine.js`; `startGenders()` in `runner.js`): Review → Practice articles asks the article of up to 12 nouns from finished lessons, shown without it, once there are 6. It moves no review card and adds nothing to Fix my mistakes, and its XP is the same as other practice. In Spanish the right gender in the wrong number, and in Italian the right gender in the wrong form (il for l’ or lo), is a near miss that doesn't count, with a note."
- [ ] `CLAUDE.md`: no change (the shape is unchanged: 39 units, 156 lessons, 9 stories per language).
- [ ] `dev/test.js` counts, `index.html`, `js/core/art.js` unit signs: no change (no new lessons, files or units).
- [ ] Word pictures (parlance-chores, no illustrator: no vocab changed): `node design/pictures/tools.js inventory && node design/pictures/tools.js briefs && node design/pictures/tools.js check` ends with `ok` and reports no undecided concepts, and `git status --short design/pictures content/pictures.js` shows no change (if it does, stop and report).
- [ ] Voices (parlance-chores): `node dev/voices.js --dry` (expected: 0 new lines, because every new tip example is an existing lesson sentence). If it lists any, run `node dev/voices.js` and commit `media/voice/` with `dev/voice-usage.json`. If it stops for the cap or the key, carry on and report it.
- [ ] Ship step (orchestrator): `APP_VERSION` 4.27.0 → 4.28.0 and the `RELEASES` entry below; `node dev/flow.js guard --base 5a59939` clean; `latest` set to 4.28.0 in both homes. No proposal or note to close.

## Release notes

- **Title:** Articles and first steps
- **Notes:**
  - The first four lessons, from hello to how are you, now explain one idea per card, each with its own example, in German, Spanish and Italian.
  - New in Review: practice the articles of the nouns you’ve learned, der, die and das, el and la, or il, lo and la.
  - On the web version, Me now says that tutor grading needs Parlance in Claude.

## Verification plan

- Commands: `npm test` (FAIL 0; 30-minute timeout, writing to `flow/shots/test.log`), `node dev/flow.js guard --base 5a59939` (no STOP, no FIX; one note for the new exercise type), `node design/pictures/tools.js check` (ok), `node dev/voices.js --dry` (0 new lines).
- Screens (`node dev/flow.js shots --out flow/shots/2026-11-04/verify`, 412px, light and dark; then the ones marked 360 again with `--width 360 --scheme light`):
  - **Tip cards**, once per language (`--lang es` with `es-1-2`, `--lang de` with `de-1-2`, `--lang it` with `it-1-2`; repeat for x-1-4): `--steps "js:startLesson('es-1-2');wait:900;click:Start lesson;wait:600;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[0],nextEx();wait:600;shot:es-1-2-card1;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[1],nextEx();wait:600;shot:es-1-2-card2;js:Run.pos=Run.queue.map((e,i)=>e.mode==='concept'?i:-1).filter(i=>i>=0)[2],nextEx();wait:600;shot:es-1-2-card3"`. Before: `flow/shots/2026-11-04/before/light-es-es-1-2-card1.png` … `card3.png` (card 3 has no example).
  - **Article practice** (412 and 360), once per language with `--lang de|es|it`: `--steps "js:(L=>coreOrder(L).slice(0,8).forEach(l=>{S.langs[L].done[l.id]={at:today(),acc:1,times:1},l.vocab.forEach((v,i)=>{S.langs[L].cards[itemKey(l,'v',i)]={ef:2.5,n:1,iv:1,due:today(),last:today(),ts:Date.now()}})}))(S.settings.lang),render();tab:Review;wait:800;shot:review;click:Practice articles;wait:800;shot:article;sel:.gap-opts .tile;wait:300;click:Check;wait:700;shot:article-feedback"`. Before: `flow/shots/2026-11-04/before/light-de-review.png` (no article button).
  - **Long noun** (360, `--lang de`): `--steps "js:(t=>(l=>beginSession('genders','de',[genderEx({lesson:l,item:l.vocab.find(v=>v.t===t)})]))(coreOrder('de').find(l=>l.vocab.some(v=>v.t===t))))('die Meinungsverschiedenheit');wait:800;shot:article-long"`. Same with `--lang it` and `('gli occhi')` (`it`, not `de`, in `beginSession`) for the three plural tiles.
  - **Me on the web**: `--steps "js:Web.on=true;tab:Me;wait:700;js:render();wait:500;full:me-web"` (the Tutor grading row reads "Needs Parlance in Claude. …").
- Spot checks for the reviewer: read es-1-1 … es-1-4, de-1-1 … de-1-4 and it-1-1 … it-1-4 side by side card by card (same ideas, same order, adapted where the grammar differs: German x-1-3 and x-1-4 have no ser/estar split); confirm `git diff 5a59939 -- content/` changes only unit 1 tip bodies and examples; run an article session in Italian and answer one *l’* noun with *il* and one with *la* (near miss, then plain wrong); confirm that the Review tab of a fresh profile has no article button.

## Risks and rollback

- **Tip text.** Only tips changed, so no review card, resume or progress is touched. A half-done unit 1 lesson resumes with the cards it already built (resume stores them). The tests pin where every example and table lands.
- **Article practice.** It writes nothing new to saved state: no review card moves (tested), no mistake is noted (tested), and XP follows the existing practice rule. The worst case is a noun with an unusual article being left out (`genderNoun()` returns null), not a wrong answer key. A future noun that appears with two articles (for example *el capital* and *la capital*) is skipped by `genderClashes()`.
- **Fonts.** The screenshot tool blocks Google Fonts, so long nouns are measured in fallback fonts. `overflow-wrap:anywhere` keeps them inside the screen either way.
- **Rollback:** `git revert` the release merge on `main`, bump to 4.28.1, republish, set `latest` in both homes (POLICY "Undoing a release"). Nothing is migrated, so nothing in saved state needs undoing.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
