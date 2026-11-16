# One idea per card in A1 units 3, 20 and 21, and an article question in early lessons

- **Cycle:** queued 2026-11-16 (program 2, release R2; `flow/PROGRAM-2.md`)
- **Status:** draft (the orchestrator promotes it: move to `flow/plans/<cycle>-r2-one-idea-per-card.md`, set Base, check it still matches `main`)
- **Release:** 4.48.0
- **Base:** `main` at 74e6732 (4.47.0)
- **Proposals built:** pmvxw6o4w0 (web, already approved and partly shipped in 4.27.0 and 4.28.0; this continues it)
- **Roadmap items:** R-16 (units 3, 20, 21), R-20 (second half)

## Why this, why now

Proposal pmvxw6o4w0 (note fmvbms644lr5x) asked for one idea per card. Units 1 and 2 are done; in units 3, 20 and 21 most tables still land on the last card and one card often carries three forms (measured with `tipBites()` on 2026-11-16: in 25 of these 36 lessons a card shows a table its text never names, and in 20 every table sits on the last card). This release cuts those twelve tips per language into three paragraphs, with the examples and tables pinned where each idea is taught; titles, examples, tables, vocab, sentences and blanks stay byte for byte. It also brings article practice into A1–A2 lessons: one "which article?" question right after the words card that shows the noun (56 German, 59 Spanish and 59 Italian A1–A2 lessons have a noun that qualifies), graded by the existing `genderGrade()`.

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green | Fixes to existing content that keep every review-card key: tip bodies only (POLICY "Fixes to existing content": a better tip) | — |
| WP2 | Green | A lesson feature that works offline, without the tutor or a microphone, reuses `genderEx()` and `genderGrade()` unchanged, adds no review card and doesn't change what finishing a lesson means (POLICY "New exercise types and lesson features") | — |

## Work packages

WP1 and WP2 run in parallel (worktrees). Both touch `dev/test.js`, in different places: WP1 only the tip block (from `/* tips: a hand-cut tip (blank lines) …` to the line ending `cut into three paragraphs'); }`), WP2 only a new block it appends after the article-practice block. Merge WP1 first.

### WP1 — The twelve tips of units 3, 20 and 21, in German, Spanish and Italian

- **Agent:** parlance-content (one agent for the three languages: the text is given below word for word)
- **Model:** sonnet
- **Runs:** first, in parallel with WP2
- **Owns (may edit):** in `content/{de,es,it}-1-basics.js` the four unit 3 lessons (x-3-1 … x-3-4); in `content/{de,es,it}-1b-more.js` the eight lessons of units 20 and 21; in `dev/test.js` the tip block only
- **Reads first:** `CLAUDE.md`; `tipBites()` in `js/core/content.js`; es-1-2 in `content/es-1-basics.js` (a hand-cut tip: `\n\n` inside the single-quoted body); the tip block of `dev/test.js`
- **Must not touch:** any vocab, sentence, blank, tip title, example or table; any other lesson; code

**Spec.** In each of the 36 lessons, replace the **body** string (the second argument of `T(...)`) with the one below, exactly, and change nothing else. Each body has three paragraphs separated by `\n\n` (backslash-n backslash-n inside the single-quoted string). Each paragraph is one card; where its examples and tables land is pinned by the `TIP_PLACES` entries below (checked against `tipBites()` on 2026-11-16). Apostrophes are typographic. Keep each file's layout (where the title, body and examples sit on lines).

What the cards teach (the text below is the spec): unit 3 food and ordering (genders and articles, the object form, ordering politely, plurals and prices); unit 20 colors and the home (color agreement, rooms, this and that, where things are); unit 21 weather and clothes (weather verbs, seasons and months, dates, what to wear). In each lesson, card 1 is the main form, card 2 the second idea, card 3 the small words and extras.

**German**

```js
// de-3-1 (content/de-1-basics.js)
'German nouns are **der** (masculine), **die** (feminine) or **das** (neuter), and they’re always capitalized. The gender is often unpredictable, so learn each noun with its article. The colors help: der is blue, die is red, das is teal.\n\nAdjectives after **sein** never change: Der Apfel ist **rot**. Foods like **Brot** or **Käse** can drop the article when you mean “some”.\n\n**essen** (to eat) changes its vowel: du **isst**, er **isst**. **trinken** (to drink) is regular: ich **trinke**, du **trinkst**.'
// de-3-2 (content/de-1-basics.js)
'What you want or order is the direct object, and it takes the accusative case (the “object” form). Only masculine nouns change: ein becomes **einen** and der becomes **den**: **einen Kaffee**. Feminine and neuter stay the same.\n\n**ich möchte** (I would like) is very polite. It is followed by the thing you want, or by a verb at the end: Ich möchte **zahlen**. To ask a friend, say **Möchtest du** Kuchen?\n\nA drink in a container is just two nouns: **eine Tasse Tee**, **ein Glas Wasser**.'
// de-3-3 (content/de-1-basics.js)
'Ordering often uses **nehmen** (to take), which changes its vowel: ich nehme, du nimmst, er nimmt. A masculine object gets **den**: **Ich nehme den Salat**. Die Suppe and das Schnitzel stay the same: **Ich nehme die Suppe**.\n\n**Haben Sie …?** is “Do you have …?”. **etwas Vegetarisches** means “something vegetarian”: after etwas the adjective is capitalized and ends in **-es**.\n\n**Wir möchten bestellen** uses the **wir** form of **möchten**, with the verb at the end. The table shows **haben** and möchten next to nehmen.'
// de-3-4 (content/de-1-basics.js)
'Whatever the singular gender, the plural article is **die**. Plural endings vary, so learn them too: die Tomate → die Tomate**n**, die Kartoffel → die Kartoffel**n**, der Apfel → die **Äpfel**.\n\nThe verb follows the number: Was **kostet** das? (one thing) but Was **kosten** die Äpfel? (several). In the same way, das **ist** billig, but die Kartoffeln **sind** billig.\n\n**kaufen** is regular: ich kaufe, du kaufst, er kauft. **auf dem Markt** means “at the market”: after a place word like auf, der and das become **dem**.'
// de-20-1 (content/de-1b-more.js)
'After **sein** a color never changes: **Der Himmel ist blau**.\n\nBefore a noun a color takes an ending, like **ein** and **eine**: **eine schwarze Katze** (f), **ein rotes Auto** (n), **ein roter Stuhl** (m). The thing you have or look for is the “object”. A masculine object takes **einen**, and then the color ends in **-en**: **einen braunen Hund**.\n\nAsk **Welche Farbe hat dein Auto?** (“which color”). **dein** means “your”, like **mein** means “my”.'
// de-20-2 (content/de-1b-more.js)
'Many room names are compounds: **Schlafzimmer** is “sleep” + “room”. The last part decides the gender, so every word ending in **-zimmer** is **das**. Learn each room with its article, as in the table: der Flur, die Küche, das Wohnzimmer.\n\nUse **haben** for what a home has: **Die Wohnung hat ein Schlafzimmer**. A masculine thing you have takes **einen**, and the adjective ends in **-en**: **Wir haben einen kleinen Balkon**. After **ist**, adjectives stay plain: Der Garten ist schön.\n\nTo say where you do something, use **in der** for a feminine room: **Ich koche in der Küche**. **kochen** is regular: ich **koche**, du kochst.'
// de-20-3 (content/de-1b-more.js)
'**Das ist** works for anything, whatever its gender: **Das ist meine Tasche**.\n\nWords like **ein**, **mein** and **kein** (a, my, not a) change with gender, and only the masculine changes again for an object, meaning the thing you have or look for: **Ich suche meinen Schlüssel** (**suchen**: ich suche). **kein** means “not a”: **Das ist ein Tisch, kein Stuhl**.\n\nTo say “this”, use **dieser** (m), **diese** (f), **dieses** (n): **Dieses Buch ist neu**. For a masculine object it becomes **diesen**.'
// de-20-4 (content/de-1b-more.js)
'To say where something is, these words take the **dative**: der and das become dem, and die becomes der. So: **in der Tasche**, auf dem Tisch, neben dem Sofa. **in dem** shrinks to **im**.\n\nThe same goes for **unter**, **über**, **vor**, **hinter** and **zwischen**: **Die Katze ist unter dem Tisch**.\n\nThe verb says how it is placed: **ist** (is), **liegt** (lies flat, like a phone or book), **steht** (stands upright, like a lamp): **Die Lampe steht neben dem Sofa**.'
// de-21-1 (content/de-1b-more.js)
'German weather talk uses **es** as the subject, and the verb ends in **-t**: **Es regnet** (it rains), **Es ist kalt**. The sun is the one that really does something: **Die Sonne scheint**.\n\nTo say “there is” or “there are”, use **es gibt**, the same for one or many: **Es gibt viele Wolken**. Use **viel** for things you can’t count (**viel Schnee**) and **viele** for plurals (viele Wolken).\n\nWhen a time word like **heute** comes first, the verb stays second: **Heute scheint die Sonne**.'
// de-21-2 (content/de-1b-more.js)
'Seasons and months are all masculine, and “in” is **im** (= in dem): **im Sommer**, **im Juli**. The seasons are **der Frühling**, **der Sommer**, **der Herbst** and **der Winter**.\n\nThe months: Januar, Februar, März, April, Mai, Juni, Juli, August, September, Oktober, November, Dezember. Start with the time and the verb stays second: **Im Herbst regnet es oft**. The spring **beginnt** in March.\n\nCount with plurals: **ein Jahr hat zwölf Monate**. Der Monat becomes **die Monate**, der Tag becomes **die Tage** and das Jahr becomes **die Jahre**.'
// de-21-3 (content/de-1b-more.js)
'For dates German uses ordinal numbers: **der erste**, **der zweite**, **der dritte**, then **-te** up to 19 (**der siebte**, **der zehnte**) and **-ste** from 20 (**der zwanzigste**). Written as **10. Oktober**: the dot means “read as an ordinal”. After **der** the ending is **-e**: **der zehnte Oktober**.\n\n**Welcher Tag ist heute?** asks for the weekday and **Welches Datum ist heute?** for the date. **welcher**, **welche** and **welches** match the noun.\n\nFor “was” use **war**: **Gestern war Sonntag**. The plural of **Tag** is **Tage**.'
// de-21-4 (content/de-1b-more.js)
'Say what you **brauchen** (need) or **tragen** (wear). **tragen** changes its vowel for du and er/sie: **du trägst**, **er trägt**.\n\nThe thing you need or wear is the object, so masculine words take **einen**: **Ich trage einen Mantel**. Feminine takes eine, neuter takes ein, and plurals take no article: **Ich trage Handschuhe**. **dein** (your) follows the same pattern: **Wo ist deine Jacke?**\n\n**Bei Regen** means “when it rains”. The verb stays second: **Bei Regen brauche ich** einen Regenschirm.'
```

**Spanish**

```js
// es-3-1 (content/es-1-basics.js)
'Every noun is masculine or feminine, and the word for “the” follows: **el** (masculine) and **la** (feminine), plural **los** and **las**. Most nouns ending in -o are masculine and most ending in -a are feminine. **agua** is feminine but takes **el** (el agua) because of the sound; the adjective stays feminine: el agua **fría**.\n\nAdjectives agree: manzana **roja**, huevos **frescos**. Use **ser** for what something is (La manzana **es** roja) and **estar** for its state (El agua **está** fría, El pan **está** rico).\n\nThe verbs **comer** (to eat) and **tomar** (to drink, to take) are regular: **como**, comes, come; **tomo**, tomas, toma. **Como pan con queso** is “I eat bread with cheese”.'
// es-3-2 (content/es-1-basics.js)
'**Quisiera** (“I would like”) is softer and more polite than **quiero** (“I want”): **Quisiera un café**, por favor.\n\n**querer** (to want) changes e to ie in every form except nosotros: **quiero**, **quieres**, **quiere**. After it, use an infinitive: Quiero **pagar**. Say **con tarjeta** (by card) without an article.\n\n“A” or “an” is **un** before a masculine noun and **una** before a feminine one; the plural is **unos** and **unas**. After **de** (of) with a drink or food, no article is needed: una taza **de** té, un vaso **de** agua.'
// es-3-3 (content/es-1-basics.js)
'**pedir** (to order, to ask for) changes e to i in every form except nosotros: **pido**, **pide**, **piden**. **Voy a pedir** uses **ir a** + infinitive: “I’m going to order”.\n\n**tener** and **querer** change e to ie in the same way (tienen, quieren), and tener has an irregular yo form, **tengo**. In Latin America **ustedes** is the only plural “you”, formal or not, and takes the same verb form as ellos: Ustedes piden, ¿Tienen…?\n\nAdjectives agree: la comida está muy **rica**, and **algo vegetariano** becomes vegetariana before a feminine noun. **está** is used for how food tastes.'
// es-3-4 (content/es-1-basics.js)
'Adjectives match their noun in gender and number: la papa **barata**, las papas **baratas**, el kilo **barato**. In Latin America a potato is **papa**: **Las papas son baratas**.\n\nUse **ser** (**es** for one, **son** for several) for prices and descriptions: **Es muy caro**. **costar** changes o to ue: **cuesta** for one thing, **cuestan** for several, and **cuánto** stays the same: ¿Cuánto cuestan las papas?\n\n**comprar** (to buy) is regular: **compro** is “I buy”. **de** links the amount and the thing: un kilo **de** tomates.'
// es-20-1 (content/es-1b-more.js)
'Colors are adjectives, so they come **after** the noun and match it: una casa **blanca**, unos zapatos **negros**. Most end in -o and have four forms: **rojo**, **roja**, **rojos**, **rojas**.\n\n**azul**, **gris**, **rosa** and **naranja** have one form for masculine and feminine. For the plural add -s, or -es after a consonant: **azules**, **grises**. **Tengo** means “I have”: Tengo un gato **gris**.\n\nSay what color something is with **ser**: **es** for one thing, **son** for several. Ask ¿De qué **color** es...? and answer with mi or tu: **Mi carro es negro**.'
// es-20-2 (content/es-1b-more.js)
'**hay** means “there is” and “there are”, and it never changes: Hay una mesa, **Hay dos baños**. Use **en** for “in”: en la casa.\n\nEvery noun is masculine (**el**, plural **los**) or feminine (**la**, plural **las**), and adjectives match: la cocina nueva, el baño nuevo. **grande** is the same for both; pequeño becomes **pequeña** with a feminine noun. Describe with **es**: **La sala es grande**.\n\nTwo present-tense verbs appear: **cocino** (I cook) and **comemos** (we eat). Their endings are in the table: **Cocino en la cocina**.'
// es-20-3 (content/es-1b-more.js)
'Use **este** and **esta** for “this” (near you) and **ese** and **esa** for “that” (farther away). They match the noun’s gender: **este libro** (masculine), **esta bolsa** (feminine). The plurals are estos and estas, esos and esas.\n\nAdjectives match too: **nuevo** and **nueva**, **bueno** and **buena**, **cómodo** and **cómoda**. **interesante** stays the same: Este libro es **interesante**.\n\n**Necesito** means “I need” (from **necesitar**): **Necesito esa llave**. Questions keep normal word order: ¿Ese celular es nuevo?'
// es-20-4 (content/es-1b-more.js)
'Use **estar** to say where something is: El libro **está** sobre la mesa. For several things use **están**: Las llaves **están** en mi bolsa. **mi** (my) becomes **mis** for several things. Ask **¿Dónde está mi celular?**\n\nPlace words tell where: **sobre** (on), **debajo de** (under), **al lado de** (next to), **cerca de** (near): El gato está **debajo de la silla**.\n\nWhen the next word is el, de + el joins into **del**: al lado **del banco**, cerca **del parque**. With la it stays **de la**: El banco está **al lado de la farmacia**.'
// es-21-1 (content/es-1b-more.js)
'Most weather uses **hacer** in its “it” form **hace**, not “to be”: **Hace frío**, **Hace calor**, **Hace sol**, **Hace viento**. After hace, “very” is **mucho**, because these are nouns: **hace mucho calor**.\n\nRain and snow are single verbs: **llueve** (llover, o→ue) and **nieva** (nevar, e→ie). Alone, mucho means “a lot”: llueve mucho. Clouds use estar + adjective: **Está nublado**. Ask ¿Qué tiempo hace? or ¿Cómo está el clima?\n\n**Vamos** is “we go” or “let’s go”, from **ir**. **al** is a + el: **vamos al parque**.'
// es-21-2 (content/es-1b-more.js)
'Seasons and months are lowercase. Use **en** for “in”: **en verano**, **en julio** (no article with a season). The same weather phrases apply: En verano hace calor, En invierno nieva. The months start with **enero** and end with **diciembre**.\n\n**tiene** means “it has” (from tener): **El año tiene doce meses**. One **mes** becomes **meses** in the plural (add -es). **Vamos a** means “we go to”: vamos a la playa.\n\n**Me gusta** means “I like”; for several things say **me gustan**: **Me gusta la primavera**.'
// es-21-3 (content/es-1b-more.js)
'Say the date as **el** + number + **de** + month: **el cinco de mayo** (written el 5 de mayo). Only the first of the month uses an ordinal: **el primero de marzo**.\n\nAsk **¿Qué fecha es hoy?** and answer with **Hoy es** (es, because it’s one day): **Hoy es el cinco de mayo**.\n\nFor “on” a weekday use el: El feriado es el **lunes**. To just name the day, use no article: Pasado mañana es **jueves**. **pasado mañana** means “the day after tomorrow”, and **ayer** means “yesterday”. Days and months are lowercase.'
// es-21-4 (content/es-1b-more.js)
'Use **ponerse** for what you put on. It needs **me**, **te** or **se**: **me pongo** la gorra, ¿qué **te pones**? The yo form **pongo** is irregular. Clothes take el, la, los or las, not “my”: **me pongo los lentes de sol**.\n\nUse **necesitar** for what you need: **necesito** un abrigo. **llevar** means to wear or carry, and **usar** to use or wear: **llevo**, **uso**. All three are regular.\n\nUse **un** or **una** for “a”: **un abrigo**, **un paraguas** (masculine, despite the -a). **Así que** means “so”: Llueve, **así que llevo** un paraguas.'
```

**Italian**

```js
// it-3-1 (content/it-1-basics.js)
'Every Italian noun is masculine or feminine, and the article shows it. “The” is **il** (most masculine nouns), **lo** (before z or s + consonant: **lo zucchero**), **la** (feminine: **la pasta**) and **l’** (before a vowel: **l’acqua**). The plurals are **i**, **gli** and **le**. “A” is **un**, **uno**, **una**.\n\n**mangiare** (to eat) is regular, but keeps one i: **mangi**, **mangiamo**. Use the article when you talk about a food in general or a particular one: **Mangio il pane**.\n\n**bere** (to drink) is irregular and uses the stem **bev-**: **bevo**, **bevi**, **beve**. So: Lui **beve** il caffè.'
// it-3-2 (content/it-1-basics.js)
'Italians order politely with **vorrei** (“I would like”): **Vorrei un caffè, per favore**. It is softer than **voglio** (“I want”), which can sound blunt. At the bar you can also just say **Un caffè, per favore**.\n\nYou can also use **prendo** (“I’ll have”), from **prendere**: **Prendo un tè**. A plain **caffè** is an espresso; a milky coffee is **un cappuccino**, which Italians usually drink only in the morning. The article for “a” is **un** before a masculine noun and **una** before a feminine one: **un tè**, **una birra**.\n\nAsk for the bill with **Il conto, per favore** and ask the price with **Quanto costa?**'
// it-3-3 (content/it-1-basics.js)
'An Italian meal comes in courses: **l’antipasto** (starter), **il primo** (pasta, rice or soup), **il secondo** (meat or fish) and **il dolce** (dessert). You do not have to order them all.\n\nTo ask for a table say **Un tavolo per due, per favore**. The waiter asks **Che cosa prende?** (formal). **la** goes before the dish you pick: **Prendo la pizza**.\n\n**C’è** means “there is” and **ci sono** “there are”: **C’è un menù in inglese?** **Ci sono due tavoli liberi**.'
// it-3-4 (content/it-1-basics.js)
'Italians buy by weight: **un chilo di** pomodori (a kilo of tomatoes), **mezzo chilo di** arance (half a kilo), **un etto di** olive (100 grams). After **di** the noun has no article. Use **vorrei** to ask for things: **Vorrei un chilo di pomodori**.\n\nAsk the price with **Quanto costa?** for one thing and **Quanto costano** le pere? for several. Use **ecco** when you hand something over: **Ecco le patate!**\n\nPlural nouns change their ending: **pomodoro** → **pomodori**, **patata** → **patate**, **arancia** → **arance**, **pera** → **pere**. Adjectives agree: **i pomodori sono freschi**.'
// it-20-1 (content/it-1b-more.js)
'Colors that end in **-o** change with the noun: **rosso**, **rossa**, **rossi**, **rosse**. **bianco** keeps its hard sound in the plural: **bianchi**, **bianche**.\n\nColors that end in **-e** have two forms: **verde**, **verdi**. A few never change at all: **rosa**, **blu**. The color comes after the noun: **la mela rossa**, **i pomodori rossi**.\n\nTo ask “What color is it?” say **Di che colore è?** The verb **essere** agrees with the noun: **La mela è rossa**, **I pomodori sono rossi**. **il colore** is masculine and **preferito** means “favorite”: **Il mio colore preferito è il verde**.'
// it-20-2 (content/it-1b-more.js)
'Italian homes have a **cucina** (kitchen), a **salotto** or **soggiorno** (living room), one or more **camere da letto** (bedrooms) and a **bagno**. The house **ha** (has) rooms: **La casa ha tre camere da letto**.\n\nWith **in** the room takes no article: **in cucina**, **in bagno**, **in camera**, **in salotto**. So: **Mangiamo in cucina**.\n\nTo say what a room has, use **c’è** for one thing and **ci sono** for several: **In cucina c’è un tavolo**. **grande** (big) and **piccolo** (small) come after the noun and agree with it: **un bagno piccolo**, **una cucina grande**.'
// it-20-3 (content/it-1b-more.js)
'**questo** means “this” and agrees with the noun: **questo libro**, **questa casa**, **questi libri**, **queste case**. Ask **Che cos’è questo?** (“What is this?”) and answer **È una lampada**.\n\n**quello** means “that”, and it changes like the article: **quel divano**, **quella sedia**, **quei libri**, **quelle case**. Before a vowel it is **quell’**: **quell’armadio**.\n\nAdjectives agree: **Questa sedia è comoda**. **nuovo** (new) and **comodo** (comfortable) follow the usual -o, -a, -i, -e pattern.'
// it-20-4 (content/it-1b-more.js)
'Place words say where something is: **sopra** (above), **sotto** (under), **davanti a** (in front of), **dietro a** (behind), **accanto a** (next to), **tra** (between) and **su** (on). Ask **Dov’è…?** So: Il gatto è **sotto la sedia**.\n\nSmall prepositions like su, in and a merge with the article: su + il = **sul**, in + la = **nella**, a + la = **alla**. So “on the table” is **sul tavolo** and “in the bag” is **nella borsa**. **accanto alla porta** means “next to the door”.\n\nThe same happens with **di** (**del**, **della**) and **da** (**dal**, **dalla**).'
// it-21-1 (content/it-1b-more.js)
'Ask **Che tempo fa**? (“What’s the weather like?”). Answer with **fare** for temperature: **Fa caldo** (hot), **Fa freddo** (cold), **Fa bel tempo** (nice weather). **molto** goes after fare: **Fa molto caldo**. **fare** is irregular: **faccio**, **fai**, **fa**.\n\nUse **c’è** for sun, wind and fog: **C’è il sole**, **C’è vento**, **C’è nebbia**. With **è** you can also use an adjective: **È nuvoloso** (cloudy). **il tempo** means both “weather” and “time”.\n\nRain and snow are verbs that only have the he, she or it form: **piove**, **nevica**. So: Domani **piove**.'
// it-21-2 (content/it-1b-more.js)
'Months and seasons are not capitalized in Italian: **gennaio**, **dicembre**, **la primavera**. A year has **dodici mesi**: **Un anno ha dodici mesi**. **il mese** is “the month”, and its plural is **mesi**.\n\nSay “in” a month with **a** or **in**: **a luglio**, **in ottobre**. Before a vowel, a becomes **ad**: **ad aprile**.\n\nFor seasons use **in**: **in estate**, **in inverno**, **in autunno**, **in primavera**; **d’estate** is also common. **l’estate** and **la primavera** are feminine; **l’autunno** and **l’inverno** are masculine.'
// it-21-3 (content/it-1b-more.js)
'Say a date with **il** + number + month: **il quattordici ottobre**. Only the first of the month is an ordinal: **il primo giugno**. Natale is on **il venticinque dicembre**, and a year is said as one number: **duemilaventisei**.\n\nAsk **Che giorno è oggi?** or **Quanti ne abbiamo oggi?** (“How many do we have today?”). **ieri** means “yesterday” and **era** is the past of “is”: **Ieri era sabato**.\n\nOrdinals agree with the noun like adjectives: **primo**, **prima**, **secondo**, **seconda**, **terzo**, **quarto**.'
// it-21-4 (content/it-1b-more.js)
'**portare** means “to wear” (and “to carry”): **In inverno porto la sciarpa e i guanti**.\n\n**mettersi** means “to put on” and is reflexive: **mi metto**, **ti metti**, **si mette**. The pronoun comes before the verb: **Che cosa ti metti oggi?**\n\n**Quando** introduces a time clause, and the verb stays in the present: Quando **fa freddo**, mi metto il **cappotto**. **prendere** also means “to take”: Prendo l’**ombrello** perché **piove**. **perché** means both “because” and “why”.'
```

**`TIP_PLACES` entries** (add after the existing entries, before the closing `};`):

```js
      'es-3-1': [['El agua está fría.', '“The”'], ['La manzana es roja.'], ['Como pan con queso.', 'Two regular verbs']],
      'es-3-2': [['Quisiera un café, por favor.'], ['¿Quieres pastel?', 'Quiero pagar con tarjeta.', 'querer (e→ie): to want'], ['“A” and “some”']],
      'es-3-3': [['Voy a pedir la sopa.', 'Queremos pedir, por favor.', 'pedir (e→i): to order, to ask for'], ['tener and querer'], ['¿Tienen algo vegetariano?']],
      'es-3-4': [['Las papas son baratas.', 'Agreement'], ['¿Cuánto cuesta?', 'es / son and cuesta / cuestan'], ['Compro pan en el mercado.', 'comprar (regular -ar): to buy']],
      'de-3-1': [['Der Apfel ist rot.'], ['Ich esse Brot mit Käse.'], ['Isst du Fisch?', 'Present of **essen** and **trinken**']],
      'de-3-2': [['Ich möchte einen Kaffee, bitte.', 'Only masculine changes'], ['Möchtest du Kuchen?', 'Present of **möchten** (would like)'], ['Eine Tasse Tee, bitte.']],
      'de-3-3': [['Ich nehme die Suppe.', 'The accusative'], ['Haben Sie etwas Vegetarisches?'], ['Wir möchten bestellen.', 'Three useful verbs']],
      'de-3-4': [['Die Kartoffeln sind billig.', 'Plurals'], ['Was kostet das?', 'The verb follows the number'], ['Ich kaufe Brot auf dem Markt.']],
      'it-3-1': [['La pasta è buona.', 'The, singular'], ['Mangio il pane.'], ['Lui beve il caffè.', 'mangiare and bere']],
      'it-3-2': [['Vorrei un caffè, per favore.', 'Ways to order'], ['Prendo un tè.', 'prendere (regular -ere): to have, to take'], ['Il conto, per favore.']],
      'it-3-3': [['The courses'], ['Un tavolo per due, per favore.'], ['C’è un menù in inglese?', 'Ci sono due tavoli liberi.', 'There is / there are']],
      'it-3-4': [['Vorrei un chilo di pomodori.', 'Amount + di + food'], ['Quanto costano le pere?', 'Ecco le patate!'], ['Plurals']],
      'es-20-1': [['Colors that change (-o): four forms'], ['Tengo un gato gris.', 'Colors with one form for masc. and fem.'], ['Mi carro es negro.', 'Las flores son amarillas y moradas.', 'ser: what color it is']],
      'es-20-2': [['Hay dos baños en la casa.'], ['La sala es grande.', 'The and a'], ['Cocino en la cocina.', 'Present of cocinar and comer']],
      'es-20-3': [['Este libro es interesante.', 'Esta bolsa es nueva.', 'this and that'], ['Adjectives agree with the noun'], ['Necesito esa llave.', 'Present of necesitar']],
      'es-20-4': [['¿Dónde está mi celular?', 'Present of estar (irregular)'], ['El gato está debajo de la silla.'], ['El banco está al lado de la farmacia.', 'Place word + de + la / el']],
      'de-20-1': [['Der Himmel ist blau.'], ['Ich habe eine schwarze Katze.', 'Color + noun after “a”'], ['Welche Farbe hat dein Auto?']],
      'de-20-2': [['Die Wohnung hat ein Schlafzimmer.', 'Rooms by article'], ['Wir haben einen kleinen Balkon.'], ['Ich koche in der Küche.', 'Present of **haben** and **kochen**']],
      'de-20-3': [['Das ist meine Tasche.'], ['Ich suche meinen Schlüssel.', 'Das ist ein Tisch, kein Stuhl.', 'a / my / not a'], ['this']],
      'de-20-4': [['Das Buch ist in der Tasche.', '“Where?” takes the dative'], ['Die Katze ist unter dem Tisch.'], ['Die Lampe steht neben dem Sofa.', 'Verbs of position']],
      'it-20-1': [['La mela è rossa.', 'I pomodori sono rossi.', 'Colors in -o'], ['Colors that do not change'], ['Il mio colore preferito è il verde.']],
      'it-20-2': [['La casa ha tre camere da letto.'], ['Mangiamo in cucina.', 'In which room?'], ['In cucina c’è un tavolo grande.', 'c’è or ci sono?']],
      'it-20-3': [['Che cos’è questo?', 'questo (this)'], ['Quel divano è molto grande.', 'quello (that)'], ['Questa sedia è comoda.']],
      'it-20-4': [['Il gatto è sotto la sedia.', 'Place words'], ['Il libro è sul tavolo.', 'La borsa è accanto alla porta.', 'Prepositions merge with the article'], []],
      'es-21-1': [['Hoy hace mucho calor.', 'Hace sol, vamos al parque.'], ['Está nublado y llueve.', 'Which verb for the weather?'], ['Present of ir (to go, irregular)']],
      'es-21-2': [['Vamos a la playa en julio.', 'Months'], ['El año tiene doce meses.', 'Present of tener (irregular)'], ['Me gusta la primavera.', 'gustar: one thing or several']],
      'es-21-3': [['Mi cumpleaños es el primero de marzo.', 'Saying a date'], ['Hoy es el cinco de mayo.'], ['Pasado mañana es jueves.', 'Days of the week (lowercase)', 'Time words']],
      'es-21-4': [['Hace sol, me pongo los lentes de sol.', 'Present of ponerse (put on)'], ['Hace frío, necesito un abrigo.', 'Regular -ar verbs'], ['Llueve, así que llevo un paraguas.']],
      'de-21-1': [['Es regnet und es ist kalt.', 'Weather verbs (es / the sun)'], ['Heute gibt es viel Schnee.', 'viel or viele?'], ['Heute scheint die Sonne.']],
      'de-21-2': [['Im Sommer ist es heiß.', 'Der Frühling beginnt im März.'], ['Present of **beginnen** and **haben**'], ['Ein Jahr hat zwölf Monate.', 'Plural: add **-e**']],
      'de-21-3': [['Heute ist der zehnte Oktober.', 'Ordinals'], ['Welches Datum ist heute?', '“which” matches the noun'], ['Gestern war Sonntag.', 'sein: now and before']],
      'de-21-4': [['Present of **brauchen** and **tragen**'], ['Es ist kalt. Ich trage einen Mantel.', 'Wo ist deine Jacke?', 'a / your as the object'], ['Bei Regen brauche ich einen Regenschirm.']],
      'it-21-1': [['Che tempo fa oggi?', 'Oggi fa molto caldo.', 'fare (irregular): to do, to make'], ['Weather phrases'], ['Domani piove.']],
      'it-21-2': [['Un anno ha dodici mesi.', 'Months by season'], ['Il mio compleanno è a luglio.', 'In a season or month'], ['In estate fa molto caldo.']],
      'it-21-3': [['Oggi è il quattordici ottobre.', 'Il mio compleanno è il primo giugno.', 'Saying dates'], ['Che giorno è oggi?'], ['Ordinals']],
      'it-21-4': [['In inverno porto la sciarpa e i guanti.'], ['mettersi (reflexive): to put on'], ['Quando fa freddo mi metto il cappotto.', 'Prendo l’ombrello perché piove.', 'Weather and clothes']],
```

**Other changes to the tip block of `dev/test.js`:** in its last check, change `Object.keys(TIP_PLACES).length === 24` to `=== 60` and the message to `'all sixty hand-cut A1 tips are cut into three paragraphs'`. (If the tidy-ups release re-pinned `it-1-2` or `de-1-3`, keep those entries as they are on `main`.)

**Steps.**
1. Replace the 36 bodies. Then `for f in de es it; do grep -o '\\n\\n' content/$f-1-basics.js | wc -l; grep -o '\\n\\n' content/$f-1b-more.js | wc -l; done` prints `24` and `16` for each language.
2. Add the 36 `TIP_PLACES` entries and change the count line.
3. Run `npm test` (agent file, "Checking your work"): the 36 new `tip cards hold what the plan says` checks and the `sits with the paragraph that names it` checks must pass.
4. `node dev/flow.js guard`: no orphaned review-card keys, no FIX or STOP.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0` with the 36 new placement checks and `all sixty hand-cut A1 tips are cut into three paragraphs`
- [ ] `git diff -- content/` changes only the 36 body strings (no line with a vocab, sentence, blank, example or table array changes)
- [ ] Screenshots of de-3-2, es-21-4 and it-20-4, all three concept cards, light and dark, show the tables named in `TIP_PLACES` on the right cards and no sideways scroll at 412px

**Stop and report if:** a placement check fails after the text is pasted exactly (report the lesson and what landed where; don't reword to make it pass), or anything would require changing a vocab, sentence, blank, example, table or title.

### WP2 — One article question in A1 and A2 lessons

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** in parallel with WP1 (worktree)
- **Owns (may edit):** `js/config.js` (the `GENDER_DRILL` object: one new field), `js/core/engine.js` (`buildLesson()` and a new helper next to `genderNoun()`), `dev/test.js` (one new block after the article-practice block)
- **Reads first:** `buildLesson()`, `genderNoun()`, `genderClashes()`, `genderEx()`, `genderGrade()`, `genMissNote()` in `js/core/engine.js`; `GENDER_DRILL` in `js/config.js`; `RENDER.gender`, `showFeedback()`, `resumeSave()`, `resumeFind()` in `js/ui/runner.js`
- **Must not touch:** `js/ui/runner.js`, `genderGrade()`, `genderEntries()`, the Review tab, content

**Spec.**
- `js/config.js`: add `inLesson: ['A1', 'A2'],` as the first field of `GENDER_DRILL` with the comment `/* levels whose lessons ask one article question after the words card that shows the noun */`.
- `js/core/engine.js`, next to `genderNoun()`:
```js
/* a lesson noun that can be asked in the lesson itself: it shows its article, it's singular, and no other lesson gives it another article */
function genderLessonOk(item, lang){ const g = genderNoun(item, lang); return !!g && !g.plural && !genderClashes(lang).has(g.noun.toLowerCase()); }
```
- `buildLesson()`: declare `let artLeft = GENDER_DRILL.inLesson.includes(lesson.level) && GENDER_DRILL[lang] ? 1 : 0;` with the other counters. In `groups.forEach`, right after `g.forEach((i, k) => { … });` and before `if (gi > 0){` (the match), add:
```js
if (artLeft){ const i = g.find(k => genderLessonOk(lesson.vocab[k], lang)); if (i !== undefined){ out.push(genderEx({ lesson, item: lesson.vocab[i] })); artLeft = 0; } }   // one article question, right after the card that showed the noun
```
- Nothing else changes: `RENDER.gender` draws it, `evaluate()` already routes `gender` to `genderGrade()` (Spanish and Italian near misses don't count, with their note), `showFeedback()` already calls `genMissNote()` for `gender`, so a noun missed in a lesson comes back first in Practice articles. It has no `key` and no `srs` (no review card, nothing in Fix my mistakes) and pays `XP.perAnswer`. `resumeSave()` already stores its `item` as an index (`kind: 'v'`).

*Tests* (`dev/test.js`, block `/* an article question in A1–A2 lessons */`):
- `lesson articles: A1 and A2 lessons with an eligible noun ask exactly one, after its words card` — for every A1–A2 lesson where some vocab passes `genderLessonOk`, `buildLesson` has exactly one `gender` exercise; its item is in the `idxs` of the nearest `words` card before it, and no other `words` card comes between them. At least 50 German, 55 Spanish and 55 Italian A1–A2 lessons have one.
- `lesson articles: none from B1` — no `gender` exercise in any B1–C2 lesson.
- `lesson articles: never a plural or a noun with two articles` — every such item passes `genderLessonOk`.
- `lesson articles: no review card, and a miss comes back first in Practice articles` — in the runner, start `de-3-1`, answer its article question wrong through `doCheck()`: `localStorage['parlance.genmiss']` lists the noun first for `de`, and `S.langs.de.cards` gains no key for it from that answer.
- `lesson articles: a lesson with one resumes` — after `resumeSave()` at the article question, `resumeFind('de-3-1')` rebuilds a queue whose `gender` exercise has the same item.

**Acceptance criteria:**
- [ ] `npm test` ends with `FAIL 0` with the five `lesson articles:` checks; the per-lesson checks (`never asks a word before teaching it`, `exactly one correct option`) pass for every lesson
- [ ] Screenshots of the article question inside `es-3-1` and `it-20-2`, light and dark, at 412px

**Stop and report if:** the question would need a saved field, or a lesson's queue order checks fail for a reason other than the new exercise.

## Integration

- [ ] `docs/ARCHITECTURE.md`, "Article practice": add "In A1 and A2 lessons, one noun is asked right after the words card that shows it (`GENDER_DRILL.inLesson`, `genderLessonOk()`); a miss there also comes back first in Practice articles."
- [ ] Roadmap: R-16 note "units 3, 20 and 21 done (4.48.0); next 16, 24, 30"; R-20 `done (4.48.0)`.
- [ ] Pictures and voices: none needed (tip bodies aren't recorded; examples are unchanged). Run `node dev/voices.js --dry` to confirm 0 new lines.

## Release notes

- **Title:** Clearer first lessons
- **Notes:**
  - The first food, home and weather lessons now teach one idea per card, with each table next to the idea it shows.
  - Early lessons ask the article of a new noun right after you meet it, and a noun you miss comes back first in Practice articles.

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node dev/voices.js --dry` (0 lines).
- Screens (412px, light and dark): `js:startLesson('de-3-2');wait:900;click:Start lesson;wait:800;js:Run.pos=Run.queue.findIndex(e=>e.mode==='concept');nextEx();wait:400;shot:de-3-2-card1;click:Continue;wait:300;shot:de-3-2-next` and the same idea for each concept card of es-21-4 and it-20-4; `js:startLesson('es-3-1');wait:900;click:Start lesson;wait:800;js:Run.pos=Run.queue.findIndex(e=>e.type==='gender');nextEx();wait:400;shot:es-3-1-article`, and `it-20-2`.
- Spot checks for the reviewer: read de-21-3, es-3-3 and it-3-4 card by card as a beginner.

## Risks and rollback

Only tip text and one extra question per early lesson. A half-done lesson on someone's phone still resumes (counts unchanged). Undo: `git revert`, patch release, republish, set `latest`.

## Outcome

- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:**
