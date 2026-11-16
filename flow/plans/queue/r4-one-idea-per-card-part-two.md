# One idea per card in A1 units 16, 24 and 30, and the first verb pictures

- **Cycle:** queued 2026-11-16 (program 2, release R4; `flow/PROGRAM-2.md`)
- **Status:** draft (the orchestrator promotes it: move to `flow/plans/<cycle>-r4-one-idea-per-card-part-two.md`, set Base, check it still matches `main`)
- **Release:** 4.50.0 (minor)
- **Base:** `main` at the commit that ships 4.49.0 (`r3-news-and-money.md`); R2 must have shipped (this plan extends its `TIP_PLACES`)
- **Proposals built:** pmvxw6o4w0 (web, approved; this finishes its A1 part)
- **Roadmap items:** R-16 (units 16, 24, 30: the last A1 units), R-12 (first batch)

## Why this, why now

After R2, these are the last three A1 units whose tips aren't cut by hand: in 12 of their 36 lessons a card shows a table its text never names, and in 10 every table sits on the last card (`tipBites()`, 2026-11-16). This finishes R-16, so every A1 tip teaches one idea per card, and it clears the way for R-18 (R6), which only touches tips without blank lines. The second package starts R-12: twelve verbs from A2–B2 lessons that were marked "abstract or grammar" in the first picture pass although they can be drawn (download, board, protect, share …).

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Fixes to existing content that keep every review-card key: tip bodies only | — |
| WP2 | Green | Word pictures drawn in code (POLICY "word pictures drawn in code") | — |

## Work packages

WP1 and WP2 run in parallel (worktrees); their files are disjoint.

### WP1 — The twelve tips of units 16, 24 and 30, in German, Spanish and Italian

- **Agent:** parlance-content (one agent for the three languages: the text is given below word for word)
- **Model:** sonnet
- **Runs:** first, in parallel with WP2
- **Owns (may edit):** the four lessons of unit 16 in `content/{de,es,it}-3-more.js`, of unit 24 in `content/{de,es,it}-5-more.js`, of unit 30 in `content/{de,es,it}-4-a1.js`; in `dev/test.js` the tip block only (from `/* tips: a hand-cut tip (blank lines) …` to the line ending `cut into three paragraphs'); }`)
- **Reads first:** `CLAUDE.md`; `tipBites()` in `js/core/content.js`; R2's WP1 (`flow/plans/*r2-one-idea-per-card.md`), which this package repeats; the tip block of `dev/test.js`
- **Must not touch:** any vocab, sentence, blank, tip title, example or table; any other lesson; code

**Spec.** In each of the 36 lessons, replace the **body** string (the second argument of `T(...)`) with the one below, exactly, and change nothing else. Three paragraphs separated by `\n\n` inside the single-quoted string; typographic apostrophes; keep each file's layout. Where each example and table lands is pinned by the `TIP_PLACES` entries below (checked against `tipBites()` on 2026-11-16). Unit 16: colors and patterns, materials, the forecast, holidays; unit 24: pets and plurals, farm verbs, "can", "let's"; unit 30: question words, everyday verbs, saying no, getting by.

**German**

```js
// de-16-1 (content/de-3-more.js)
'hell (light) and dunkel (dark) join the color into one word: **hellblau**, **dunkelgrün**.\n\nAfter **ist** a color takes no ending, so the joined word stays the same: **Der Himmel ist hellblau**. **lila** and **rosa** never change either. Ask **Welche Farbe hat …?**\n\nPatterns are adjectives too: **gestreift** (striped) and **kariert** (checked): **Der Schal ist gestreift**.'
// de-16-2 (content/de-3-more.js)
'Say what something is made of with **aus + material**. There is no article: **Der Pullover ist aus Wolle**.\n\nMaterials are nouns, so they start with a capital letter: **die Wolle**, **die Baumwolle**, **das Leder**, **die Seide**. So: **Der Gürtel ist aus Leder**.\n\nA tie is die Krawatte and a hat is der Hut: **Die Krawatte ist aus Seide**.'
// de-16-3 (content/de-3-more.js)
'German forecasts use the **present tense** with a time word: **Morgen regnet es**. The verb stays in second place.\n\nFor a change, use **werden** (to get): Übermorgen **wird** es warm. It is **wird** with **es**.\n\nUseful words: **die Wettervorhersage** (forecast), **die Temperatur**, **das Grad** (degree), **der Nebel** (fog), **das Gewitter** (thunderstorm). After a number, **Grad** stays the same: zehn Grad.'
// de-16-4 (content/de-3-more.js)
'Say when a holiday is with **an** or **zu**: **an Weihnachten**, **an Ostern**, **zu Weihnachten**. For seasons use **im**: im Winter.\n\nIf a time phrase starts the sentence, the verb comes second: **Im Winter fahren** wir Ski. **An Weihnachten haben** wir Urlaub.\n\nA holiday is **der Feiertag**: **Ostern ist ein Feiertag**. A season is **die Jahreszeit**, and time off work is **der Urlaub**. In fall the leaves (**die Blätter**) turn yellow.'
// de-24-1 (content/de-5-more.js)
'Every animal word has its own article: **der Hund**, **die Katze**, **das Pferd**. To ask about pets, say **Hast du ein Haustier?** After haben, a der word takes **einen**: Ich habe **einen** Hund.\n\nIn the plural the article is always die, but the ending changes from word to word. Many add **-e**: ein Hund, zwei **Hunde**; ein Pferd, zwei **Pferde**. Words ending in -e add **-n**: eine Katze, drei **Katzen**.\n\nSome only change the vowel: ein Vogel, zwei **Vögel**. A few do both: eine Maus, viele **Mäuse**. So learn each animal with its plural.'
// de-24-2 (content/de-5-more.js)
'German has two verbs for eating. People **essen**, animals **fressen**. Saying fressen about a person is rude: it means “to stuff your face”.\n\nBoth verbs change their vowel with du and er/sie/es: du **isst**, er **isst**, but das Schwein **frisst**. So: **Die Kuh frisst** Gras.\n\nOther verbs change too: **laufen** becomes das Pferd **läuft**, and **schlafen** becomes die Katze **schläft**. Only du and er/sie/es change. The other forms stay regular: wir laufen, die Hühner schlafen.'
// de-24-3 (content/de-5-more.js)
'**können** means “can”. It is irregular: ich **kann**, du **kannst**, er/sie/es kann. Notice that ich and er have no ending at all. A question starts with the form of können: **Kannst du schwimmen?**\n\nThe second verb goes to the very end of the sentence, in its basic form: **Der Papagei kann sprechen**. The verb **sprechen** is last. Vögel **können fliegen**.\n\nFor “can’t”, add **nicht** before the verb at the end: **Ein Pinguin kann nicht fliegen**.'
// de-24-4 (content/de-5-more.js)
'To suggest something to do together, put the **wir** form first: **Gehen wir** in den Park! **Machen wir** eine Pause! It looks like a question, but it ends with an exclamation mark.\n\nYou can also start with **Lass uns** and put the verb at the end: **Lass uns spazieren gehen**. Both mean “let’s”.\n\n**spazieren gehen** means “to go for a walk”. Only gehen changes: Wir **gehen heute spazieren**.'
// de-30-1 (content/de-4-a1.js)
'Start a question with a question word and put the verb right after it: **Wer ist das?** A yes/no question starts with the verb instead. German has three “wheres”: **wo** (where something is), **woher** (where from) and **wohin** (where to).\n\n**Wie viele** + a plural noun asks “how many”: **Wie viele Kinder hast du?** The verb comes straight after the question words, so **hast** is second.\n\nThe verb matches the subject: **du** takes **-st** (machst, gehst, kommst), and **sein** and **haben** are irregular (bist, ist, hast). With **er/sie/es** most verbs end in **-t**.'
// de-30-2 (content/de-4-a1.js)
'Most of these verbs are regular: **machen**, **bleiben** and **gehen** just add endings: **Wir gehen** jetzt nach Hause. Handy phrases: **nach Hause** (going home) and **zu Hause** (at home).\n\nBut **haben** and **wollen** change. **haben**: ich habe, du **hast**, er **hat**. **wollen** has no ending for ich and er: **ich will**, **er will**. A verb after wollen goes to the end.\n\n**sehen**, **geben** and **nehmen** change their vowel for du and er/sie/es: du siehst, du gibst, du nimmst. **geben** often comes with **mir** (to me): **Er gibt mir das Buch**.'
// de-30-3 (content/de-4-a1.js)
'Use **kein** (no, not a, not any) with a noun that has ein or no article: **Ich habe keine Zeit**. It ends like ein and mein; only a masculine object changes: **keinen**.\n\nUse **nicht** for everything else. With a verb it goes at the end: **Ich arbeite heute nicht**. Before an adjective or a word like mein it goes in front: **Das ist nicht mein Handy**.\n\nMore negatives: **nie** (never), **nichts** (nothing), **niemand** (nobody), **noch nicht** (not yet), **gar nicht** (not at all): Er trinkt **nie** Kaffee. To say yes to a negative question, use **doch**, not ja: Bist du nicht müde? **Doch**!'
// de-30-4 (content/de-4-a1.js)
'**Sie** is the polite “you”, used with strangers, in shops and on the phone. Start with **Entschuldigung** to get someone’s attention. For a polite request, use **Können Sie …?** and put the second verb at the end: **Können Sie das wiederholen?**\n\nSay **Ich verstehe nicht** when you are lost, and **Langsamer, bitte** (-er means “more”: langsam → langsamer). **sprechen** changes e to i for du and er/sie/es (du **sprichst**, er **spricht**), but not with Sie: **Sprechen Sie Englisch?** **nur ein bisschen** keeps you modest about your German.\n\n**man** means “one” or “you” in general and takes the er form: **Wie sagt man das auf Deutsch?** **sagen** and **wiederholen** are regular: man **sagt**.'
```

**Spanish**

```js
// es-16-1 (content/es-3-more.js)
'Put **claro** (light) or **oscuro** (dark) after the color: **azul claro**, **verde oscuro**. The pair never changes: una camisa azul claro, unos zapatos verde oscuro.\n\n**celeste** is the light blue of the sky. **marrón** is brown; in Mexico people also say **café**.\n\nDescribe patterns with **de**: **de rayas** (striped), **de cuadros** (checked), **de lunares** (polka dot).'
// es-16-2 (content/es-3-more.js)
'Say what something is made of with **de** and the material: **El suéter es de lana**. There is no article after de.\n\nAsk **¿De qué es …?** (What is it made of?): **¿De qué es tu corbata?** The main materials are **la lana**, **el algodón**, **el cuero** and **la seda**.\n\nA tie is la corbata, a belt is el cinturón and a hat is el sombrero: **El cinturón es de cuero**.'
// es-16-3 (content/es-3-more.js)
'Forecasts use **ir a** + infinitive for the future: **Mañana va a llover**. **Va a hacer calor**.\n\nThe verb **va** is for él, ella and usted; with ustedes it is **van**. With yo it is **voy**.\n\nUseful words: **el pronóstico** (forecast), **la temperatura**, **el grado** (degree), **la neblina** (mist), **la tormenta** (storm), **despejado** (clear) and **húmedo** (humid): Va a estar **despejado**.'
// es-16-4 (content/es-3-more.js)
'Use **en** with holidays and seasons, with no article: **en Navidad**, **en Semana Santa**, **en invierno**. **La estación del año** means “season”.\n\n**Las vacaciones** is always plural: **En Navidad tenemos vacaciones**. Say **vacaciones**, never vacación, for time off. In fall, **las hojas** (leaves) turn yellow.\n\nIn Mexico, **el Día de Muertos** is on November 2. Families remember loved ones with flowers and food.'
// es-24-1 (content/es-5-more.js)
'Many animal words change their ending for male and female, just like words for people: **el gato** and **la gata**, **el conejo** and **la coneja**. If you don’t know, or it doesn’t matter, use the masculine: **Mi gata** se llama Luna.\n\nThe plural adds **-s** after a vowel: gatos, caballos. After a consonant it adds **-es**: ratón becomes **ratones** (the accent drops). A z turns into c: pez becomes **peces**.\n\nCareful: **el pez** is a live fish, **el pescado** is fish you eat. To ask about pets, say **¿Tienes mascota?**'
// es-24-2 (content/es-5-more.js)
'Verbs ending in **-er** and **-ir** share most of their endings. For one animal or person the ending is **-e**: **la vaca come**, el gallo vive en la granja. Spanish uses **comer** for animals and people alike.\n\nFor several it is **-en**: los cerdos **comen**, **las gallinas viven** en la granja. Only nosotros tells them apart: **comemos**, but **vivimos**.\n\nSome verbs also change their stem: **dormir** becomes **duerme** (o to ue), but nosotros keeps the o: **dormimos**. **El gato duerme** todo el día.'
// es-24-3 (content/es-5-more.js)
'Spanish has two verbs for “can”. **saber** + infinitive is a skill someone has learned: **El loro sabe hablar**. **¿Sabes nadar?** saber has **sé** for yo.\n\n**poder** + infinitive is being able to, by nature or right now: Los pájaros **pueden** volar. Hoy no **puedo** nadar, hace frío. poder changes o to ue: **puedo**, **puedes**, puede.\n\nFor “can’t”, put **no** in front: **El pingüino no puede volar**.'
// es-24-4 (content/es-5-more.js)
'To suggest doing something together, say **¡Vamos a** + a verb!: **¡Vamos a caminar!** (Let’s walk!). **¡Vamos a descansar** un rato!\n\nTo suggest a place, use ¡Vamos a + the place! Remember that a + el becomes **al**: **¡Vamos al parque!** **¡Vamos al** cine! A feminine place keeps **a la**: **¡Vamos a la** plaza!\n\n**¡Vamos!** on its own means “Let’s go!”.'
// es-30-1 (content/es-4-a1.js)
'Spanish questions start with **¿** and end with **?**. Every question word carries a written accent: **quién**, **qué**, **dónde**, **cuándo**, **cómo**, **cuánto**. Without the accent a word is not a question: **¿Por qué…?** (“why”, two words) is answered with **porque** (“because”, one word).\n\n**dónde** is “where”, **de dónde** “where from” and **adónde** “where to” (with ir): **¿De dónde eres?** **¿Adónde vas?**\n\n**cuánto** agrees with the noun: **cuánto**, **cuánta**, **cuántos**, **cuántas**: ¿Cuántos años **tienes**?'
// es-30-2 (content/es-4-a1.js)
'Many of the most useful verbs are regular except in **yo**: hacer → **hago**, ver → **veo**, dar → **doy**, salir → **salgo**, poner → **pongo**, decir → **digo**, saber → **sé** (with an accent, to tell it from se). **Salgo** a las ocho.\n\n**venir** and **decir** also change their stem in the middle (e→ie, e→i): **vienes**, **dices**, **dice**. These changes do not touch nosotros, so it is venimos, decimos. **ustedes** uses the ellos form (**vienen**).\n\n**saber** + infinitive means “know how to”: Sé cocinar. **hacer** is regular after yo: **¿Qué haces** hoy?'
// es-30-3 (content/es-4-a1.js)
'To say no, put **no** before the verb: **No tengo tiempo** (**tengo** is from tener). Use **a** before a person: a nadie, a alguien.\n\nSpanish loves double negatives. When a negative word like **nada** (nothing), **nadie** (nobody) or **nunca** (never) comes after the verb, keep no in front too: **No veo a nadie**. If the negative word comes first, drop no: **Nunca** como carne. The positive partners are **algo**, **alguien** and **siempre**.\n\n**tampoco** means “neither” or “not either”: **Yo tampoco**. **ya no** means “not anymore”.'
// es-30-4 (content/es-4-a1.js)
'Say **Perdón** to get attention or to apologize: **Perdón, no entiendo**. **entender** changes e→ie: **entiendo**. **hablo** is regular: **Hablo** un poco de español.\n\nTo ask a stranger for something, use usted: **¿Puede repetir**, por favor? (a friend would hear ¿Puedes repetir?). **puede** comes from **poder** (o→ue) and is followed by an infinitive: repetir, hablar, ayudar. **me** goes before the verb: ¿Me **puede** ayudar?\n\n**¿Cómo se dice…?** means “How do you say…?”, and **esto** means “this” (a thing you point at). Add **por favor** to be polite.'
```

**Italian**

```js
// it-16-1 (content/it-3-more.js)
'Add **chiaro** (light) or **scuro** (dark) after a color to name a shade: **verde chiaro**, **blu scuro**. The shade word does not change, and neither do **arancione**, **marrone**, **viola**, **rosa** and **blu**. **Mi piace** means “I like”.\n\n**azzurro** is a bright light blue (the color of the sky and of the Italian national team). Colors that end in -o still agree: **una camicia azzurra**, **occhi azzurri**.\n\nDescribe patterns with **a righe** (striped), **a quadri** (checked), **a pois** (polka dot) and **tinta unita** (plain): **Questa sciarpa è a righe**.'
// it-16-2 (content/it-3-more.js)
'Say what something is made of with **di**: **Questo maglione è di lana**, una camicia di cotone, **una giacca di pelle**. The main fabrics are **il cotone** (cotton), **la lana** (wool), **la seta** (silk), **la pelle** (leather) and **il lino** (linen).\n\nUse **indossare** (to wear) or **portare**: **Indosso una camicia di cotone**. indossare is a regular -are verb: indosso, indossi, indossa.\n\nClothing words for the office and for cold days: **la cravatta** (tie), **il maglione** (sweater), **la felpa** (hoodie), **la cintura** (belt), **il cappello** (hat). **Per** gives the purpose: **Per l’ufficio porto la cravatta**.'
// it-16-3 (content/it-3-more.js)
'Weather reports use the **future**: **Domani pioverà** (it will rain), **nevicherà** (it will snow), **ci sarà il sole** (it will be sunny), **ci saranno venti gradi** (it will be twenty degrees).\n\nThey also use **sereno** (clear), **coperto** (overcast) and **variabile** (changeable): **Il cielo sarà sereno**. **il temporale** is a thunderstorm and **la nebbia** is fog.\n\n**la temperatura** is the temperature and **i gradi** are the degrees. Ask **Che previsioni ci sono?** or say **Le previsioni dicono che**… (“the forecast says that…”).'
// it-16-4 (content/it-3-more.js)
'Italians plan their year around the seasons. **In primavera** the flowers come out (**i fiori sbocciano**). **In autunno** the leaves fall (**le foglie cadono**), and **in inverno** you can **sciare** (ski) if there is **la neve** (snow). **la stagione** means “season”.\n\n**In estate** many people **vanno** in vacanza, to **il mare** or **la montagna**. **quest’anno** means “this year”: Quest’anno **vado** in vacanza a luglio.\n\nIn August the whole country pauses for **Ferragosto** on the fifteenth: **Ferragosto è il quindici agosto**. Use **in** + season and **a** + month: in estate, **ad agosto**.'
// it-24-1 (content/it-5-more.js)
'Many animal words change their ending for male and female: **il gatto** and **la gatta**, **il coniglio** and **la coniglia**. If you don’t know, use the masculine. To ask about pets, say **Hai un animale?**\n\nIn the plural, **-o** becomes **-i**: **gatti**, conigli. **-a** becomes **-e**: **gatte**. **-e** becomes **-i**: il cane, i **cani**. So: Ho **un cane e due gatti**.\n\nThe article changes too: il becomes **i**, la becomes **le**, and lo or l’ become **gli**: **gli uccelli**, **gli animali**.'
// it-24-2 (content/it-5-more.js)
'Italian verbs come in three groups. You know **-are** verbs already: **la mucca mangia**. Their plural ends in **-ano**: le mucche **mangiano**.\n\nVerbs in **-ere** and **-ire** both end in **-e** for one animal or person: **il cavallo corre**, il gatto **dorme**. For several, they both end in **-ono**: i cavalli **corrono**, i gatti **dormono**.\n\nOnly voi tells -ere and -ire apart: **correte**, but **dormite**. Learn **dormire** as a model: **dormo**, **dormi**, **dorme**.'
// it-24-3 (content/it-5-more.js)
'Italian has two verbs for “can”. **sapere** + infinitive is a skill someone has learned: **Il pappagallo sa parlare**. **Sai nuotare?** Its forms are **so**, **sai**, **sa**.\n\n**potere** + infinitive is being able to, by nature or right now: Gli uccelli **possono** volare. Oggi non **posso** nuotare, fa freddo. Its forms are **posso**, **puoi**, **può**.\n\nFor “can’t”, put **non** in front: **Il pinguino non può volare**.'
// it-24-4 (content/it-5-more.js)
'To suggest doing something together, use the **noi** form of the verb with no pronoun: **Andiamo** al parco! **Facciamo** una passeggiata!\n\nIt is the same as the ordinary noi form, so andiamo can mean “we go” or “let’s go”. The exclamation mark and your voice make it a suggestion: **Guardiamo le anatre!**\n\n**Dai** (come on) often comes first to sound keen: **Dai, andiamo**! To agree, say **Va bene**!'
// it-30-1 (content/it-4-a1.js)
'An Italian question has the same word order as a statement: only your voice rises, and you write **?**. **Tu abiti a Roma?**\n\nQuestion words open the sentence: **chi** (who), **che cosa** or **cosa** (what), **dove** (where), **quando** (when), **come** (how), **perché** (why) and **quanto** (how much). **perché** also means “because”: **Perché sei stanco?** Perché lavoro tanto. Ask for origin with **Di dove sei?** or **Da dove vieni?**\n\n**quale** (which) and **quanto** agree with the noun: **quale libro**, **quali libri**, **quanti anni**, **quante persone**: **Quale libro preferisci?**'
// it-30-2 (content/it-4-a1.js)
'Many of the most useful verbs are irregular in the present, so learn them as they come. **dire** → **dico**, **dici**, **dice**. **venire** → **vengo**, **vieni**, **viene**: **Vengo a casa tua** stasera. **sapere** → **so**, **sai**, **sa**: **Non so** la risposta.\n\n**uscire** → **esco**, **esci**, **esce**, but usciamo: **Esco alle otto**. **dare** → **do**, **dai**, **dà** (the accent on dà tells it from **da**).\n\n**vedere** and **mettere** are regular -ere verbs. **sapere** means “to know a fact”, and **conoscere** “to know a person”.'
// it-30-3 (content/it-4-a1.js)
'To say no, put **non** before the verb: **Non ho tempo**. **più** after non means “no longer”: **Non abito più qui**.\n\nItalian uses double negatives. When a negative word comes after the verb, keep **non** in front too: **Non vedo nessuno**, **Non mangio mai carne**, **Non voglio niente**.\n\nIf the negative word comes first, drop non: **Nessuno** viene, **Niente** è facile. **neanche**, **nemmeno** and **neppure** mean “not even” or “neither”: **Neanch’io** (“me neither”). The positive partners are **qualcosa**, **qualcuno** and **sempre**.'
// it-30-4 (content/it-4-a1.js)
'Say **Scusi** to get attention or to apologize. Say **Non capisco** (“I don’t understand”): **Scusi, non capisco**. Or ask **Che cosa significa?** (“What does it mean?”).\n\nTo ask a stranger for something use **Lei**: **Può ripetere**, per favore? (a friend hears **Puoi ripetere?**). **può** comes from **potere** (**posso**, **puoi**, **può**) and takes an infinitive: ripetere, parlare, aiutare, scrivere.\n\n**Parli più lentamente?** asks someone to slow down; **più** means “more”. Describe your level with **Parlo un po’ di italiano**: **un po’** means “a little”. **Come si dice**… in italiano? asks how to say something.'
```

**`TIP_PLACES` entries** (add after the existing entries, before the closing `};`):

```js
      'es-16-1': [['Mi libro es azul claro.', 'La silla es verde oscuro.', 'Shades never change'], [], ['La bufanda es de rayas.', 'Patterns with **de**']],
      'es-16-2': [['El suéter es de lana.', 'de + material (no article)'], ['¿De qué es tu corbata?'], ['El cinturón es de cuero.']],
      'es-16-3': [['Mañana va a llover.', 'Va a hacer calor.'], ['ir a + infinitive'], ['Va a estar despejado.', 'Forecast words']],
      'es-16-4': [['En invierno vamos a esquiar.', 'en + holiday or season'], ['En Navidad tenemos vacaciones.'], ['El Día de Muertos es el dos de noviembre.']],
      'de-16-1': [['Mein Auto ist dunkelgrün.', 'hell / dunkel + color'], ['Der Himmel ist hellblau.'], ['Der Schal ist gestreift.', 'Patterns']],
      'de-16-2': [['Der Pullover ist aus Wolle.', 'aus + material (no article)'], ['Der Gürtel ist aus Leder.'], ['Die Krawatte ist aus Seide.']],
      'de-16-3': [['Morgen regnet es.'], ['Übermorgen wird es warm.', 'werden (to get)'], ['Morgen sind es zehn Grad.', 'Forecast words']],
      'de-16-4': [['An Weihnachten haben wir Urlaub.'], ['Im Winter fahren wir Ski.', 'Time phrase first, verb second'], ['Ostern ist ein Feiertag.', 'Holiday words']],
      'it-16-1': [['Mi piace il verde chiaro.', 'Il mare è blu scuro.', 'Shades do not change'], [], ['Questa sciarpa è a righe.', 'Patterns']],
      'it-16-2': [['Questo maglione è di lana.', 'Made of…'], ['Indosso una camicia di cotone.', 'indossare (regular -are): to wear'], ['Per l’ufficio porto la cravatta.']],
      'it-16-3': [['Le previsioni dicono che domani pioverà.', 'Ci saranno venti gradi.', 'Future forms'], ['Il cielo sarà sereno.', 'Sky and weather words'], []],
      'it-16-4': [['In inverno vado a sciare in montagna.', 'A season, an activity'], ['Quest’anno vado in vacanza a luglio.', 'andare (irregular): to go'], ['Ferragosto è il quindici agosto.']],
      'es-24-1': [['Mi gata se llama Luna.', 'Male and female: **el gato**, **la gata**'], ['En el río hay muchos peces.', 'Plurals: **ratones**, **peces**'], ['¿Tienes mascota?']],
      'es-24-2': [['La vaca come pasto.'], ['Las gallinas viven en la granja.', '**comer** and **vivir**'], ['El gato duerme todo el día.', '**dormir** (o to ue)']],
      'es-24-3': [['El loro sabe hablar.', '¿Sabes nadar?', '**saber**'], ['**poder** (o to ue)'], ['El pingüino no puede volar.']],
      'es-24-4': [['¡Vamos a caminar!', '¡Vamos a descansar un rato!'], ['¡Vamos al parque!', '**¡Vamos a** …! or **¡Vamos al** …!'], []],
      'de-24-1': [['Hast du ein Haustier?', 'Plurals: Hunde, Katzen, Vögel, Mäuse'], ['Ich habe zwei Katzen.'], ['Im Garten sind drei Vögel.']],
      'de-24-2': [[], ['Die Kuh frisst Gras.', 'Present of **fressen** (animals eat)'], ['Das Pferd läuft schnell.', 'Die Katze schläft auf dem Sofa.', 'Vowel changes: **läuft**, **schläft**']],
      'de-24-3': [['Kannst du schwimmen?', 'Present of **können** (can)'], ['Der Papagei kann sprechen.', 'Word order: **können** + verb at the end'], ['Ein Pinguin kann nicht fliegen.']],
      'de-24-4': [['Gehen wir in den Park!', 'Machen wir eine Pause!', 'Two ways to say “let’s”: **Gehen wir** and **Lass uns**'], ['Lass uns spazieren gehen.'], []],
      'it-24-1': [['Hai un animale?', 'Articles: **i**, **le**, **gli**'], ['Ho un cane e due gatti.', 'Plurals: **gatti**, **gatte**, **cani**'], ['Gli uccelli cantano.']],
      'it-24-2': [['La mucca mangia l’erba.'], ['Il cavallo corre veloce.', 'Il gatto dorme sul divano.'], ['Three groups: **mangia**, **corre**, **dorme**', 'Present of **dormire**']],
      'it-24-3': [['Il pappagallo sa parlare.', 'Sai nuotare?', 'Present of **sapere**'], ['Present of **potere**'], ['Il pinguino non può volare.']],
      'it-24-4': [['Andiamo al parco!', 'Facciamo una passeggiata!', 'Let’s: **Andiamo**, **Facciamo**'], ['Guardiamo le anatre!'], []],
      'es-30-1': [['The question words'], ['¿De dónde eres?', '¿Adónde vas?'], ['¿Cuántos años tienes?', 'cuánto agrees with the noun', 'Verbs in these questions']],
      'es-30-2': [['Salgo a las ocho.', 'salir, poner'], ['Mi mamá dice que sí.', 'hacer, venir, ver', 'dar, decir, saber'], ['¿Qué haces hoy?']],
      'es-30-3': [['No tengo tiempo.', 'Verbs in this lesson'], ['No veo a nadie.', 'Positive and negative words'], ['Yo tampoco.']],
      'es-30-4': [['Perdón, no entiendo.', 'Hablo un poco de español.', 'poder, entender, hablar'], ['¿Puede repetir, por favor?', 'tú or usted?'], []],
      'de-30-1': [['Wer ist das?', 'Wohin gehst du jetzt?', 'Question words'], ['Wie viele Kinder hast du?', 'Word order'], ['Present: du and er/sie/es']],
      'de-30-2': [['Wir gehen jetzt nach Hause.', 'machen, bleiben (regular)'], ['Hast du heute Zeit?', 'haben, wollen, gehen'], ['Er gibt mir das Buch.', 'sehen, geben, nehmen']],
      'de-30-3': [['Ich habe keine Zeit.', 'kein: no / not a'], ['Das ist nicht mein Handy.', 'Where does nicht go?'], ['Er trinkt nie Kaffee.', 'Yes, no or doch?']],
      'de-30-4': [['Entschuldigung, können Sie das wiederholen?'], ['Ich verstehe nicht.', 'können, sprechen, verstehen'], ['Wie sagt man das auf Deutsch?', 'wiederholen, sagen (regular)']],
      'it-30-1': [[], ['Da dove vieni?', 'Perché sei stanco?', 'The question words'], ['Quale libro preferisci?', 'quale and quanto agree']],
      'it-30-2': [['Vengo a casa tua stasera.', 'Non so la risposta.', 'dire, venire, sapere'], ['Esco alle otto.', 'dare, uscire'], []],
      'it-30-3': [['Non ho tempo.', 'Non abito più qui.'], ['Non vedo nessuno.', 'Two negatives'], ['Positive and negative words']],
      'it-30-4': [['Scusi, non capisco.'], ['Può ripetere, per favore?', 'potere, capire, parlare', 'tu or Lei?'], ['Parlo un po’ di italiano.']],
```

**Other change to the tip block of `dev/test.js`:** in its last check, `Object.keys(TIP_PLACES).length === 60` → `=== 96` and the message → `'all ninety-six hand-cut A1 tips are cut into three paragraphs'`.

**Steps.**
1. Replace the 36 bodies. Then `for f in de es it; do for p in 3-more 5-more 4-a1; do grep -o '\\n\\n' content/$f-$p.js | wc -l; done; done` prints `8` nine times.
2. Add the 36 `TIP_PLACES` entries and change the count line.
3. Run `npm test` (agent file, "Checking your work"): the 36 new placement checks and the `sits with the paragraph that names it` checks must pass.
4. `node dev/flow.js guard`: no orphaned review-card keys, no FIX or STOP.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0` with the 36 new placement checks and `all ninety-six hand-cut A1 tips are cut into three paragraphs`
- [ ] `git diff -- content/` changes only the 36 body strings
- [ ] Screenshots of the three concept cards of de-30-3, es-24-4 and it-16-2, light and dark, at 412px, match `TIP_PLACES` with no sideways scroll

**Stop and report if:** a placement check fails after the text is pasted exactly (report what landed where; don't reword), or anything would require changing a vocab, sentence, blank, example, table or title.

### WP2 — Verb pictures, batch 1 (R-12)

- **Agent:** parlance-illustrator
- **Model:** sonnet
- **Runs:** in parallel with WP1 (worktree)
- **Owns (may edit):** `js/core/pics.js`, `design/pictures/briefs-src.txt` (only the twelve lines named below, each changed in place), the files the tools generate
- **Reads first:** the agent file; `design/pictures/PLAN.md` ("Drawing rules"); the existing verb drawings in `js/core/pics.js` (`to-celebrate`, `to-vote` and the `a-verbs` batch) so the neutral figure matches

**Spec.** Each concept below is a `- <id> | abstract or grammar` line in `briefs-src.txt` today. First, for each one, list the other words of each lesson it appears in (`design/pictures/words.json` gives the lessons; `PIC_WORDS` in `content/pictures.js` gives their pictures). **If one of those words already has a picture of the prop named first in the brief** (for example a suitcase in the lesson of *to check in*), leave the line as `-` and change its reason to `would look like <that word>, which shares its lesson`. Otherwise replace the line with the picture line given, draw it into `PICS` (batch `r12-verbs-1`) and run the tools.

| Concept | Line to write |
|---|---|
| to-download | `v 1 r12-verbs-1 to-download \| a cloud with a thick arrow pointing down into an open tray` |
| to-add | `v 0 r12-verbs-1 to-add \| a measuring cup tipping into a mixing bowl, a small plus sign beside it` |
| to-drain | `v 0 r12-verbs-1 to-drain \| a colander full of spaghetti, water drops falling below it` |
| to-season | `v 0 r12-verbs-1 to-season \| a pepper grinder over a frying pan, small grains falling` |
| to-taste | `v 0 r12-verbs-1 to-taste \| the neutral figure, eyes closed, a wooden spoon at its mouth` |
| to-board | `v 0 r12-verbs-1 to-board \| the neutral figure climbing steps up to an airplane’s open door` |
| to-check-in | `v 0 r12-verbs-1 to-check-in \| a suitcase on a counter scale with a luggage tag hanging from it` |
| to-get-lost | `v 0 r12-verbs-1 to-get-lost \| the neutral figure holding an open map, a question mark above, two signposts pointing opposite ways` |
| to-protect | `v 0 r12-verbs-1 to-protect \| two cupped hands around a small green sprout` |
| to-share | `v 0 r12-verbs-1 to-share \| two hands, each holding one half of a round cookie` |
| to-waste | `v 0 r12-verbs-1 to-waste \| a full plate of food tipping into a bin` |
| to-go-to-bed | `v 0 r12-verbs-1 to-go-to-bed \| the neutral figure pulling a blanket up in bed, a crescent moon in the window` |

`to-check-luggage` stays `-`, with its reason changed to `same picture as to-check-in in its lesson`. Then check wrong senses (agent file step 5): `to-share` must not land on a word that means to share a post on a phone, and `to-board` not on a board or a plank; list any such case for the integration step to fix with a fourth vocab field.

**Acceptance criteria:**
- [ ] `node design/pictures/tools.js check` ends with `ok`; the coverage table shows more pictured A2, B1 and B2 words than at base, and 0 undecided
- [ ] The `r12-verbs-1` contact sheets (light and dark) show each new drawing readable at 56px, inside the grid
- [ ] `npm test` ends with `FAIL 0`

**Stop and report if:** more than half of the twelve fail the shared-lesson rule (then the batch is too small to be worth a release: report the list instead).

## Integration

- [ ] Any wrong-sense fix WP2 lists: the fourth vocab field (`'-'` or the right picture id) in that lesson's file
- [ ] Roadmap: R-16 `done (4.50.0)`; R-12 note "batch 1 (A2–B2 verbs) done in 4.50.0"
- [ ] Voices: `node dev/voices.js --dry` must show 0 new lines (tip bodies aren't recorded)

## Release notes

- **Title:** One idea per card
- **Notes:**
  - Every A1 lesson now teaches one idea per card: this time colors and clothes, animals, and questions.
  - New pictures for verbs such as download, protect and share.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node design/pictures/tools.js check` (ok), `NODE_PATH="$(npm root -g)" node design/pictures/tools.js shots r12-verbs-1`.
- Screens (412px, light and dark): the three concept cards of de-30-3, es-24-4, it-16-2 (as in R2's verification steps); `js:startLesson('de-26-3');wait:900;click:Start lesson;wait:800;shot:de-26-3-words` (the download picture on a words card).
- Spot checks for the reviewer: de-30-4 and it-30-4 read card by card; the contact sheet.

## Risks and rollback

Tip text and pictures only; no key changes. Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
