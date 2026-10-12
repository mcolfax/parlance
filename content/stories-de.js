"use strict";
/* German stories. Items: [speaker, line, English] or ['?', question, 'correct|wrong|wrong']. */
STORIES.push(
/* ------------------------------ GERMAN ------------------------------ */
ST('de-s1', 'A1', 'Ein Kaffee, bitte', 'A coffee, please', 'cafe', [
  ['lena', 'Guten Morgen, Jonas! Was möchtest du?', 'Good morning, Jonas! What would you like?'],
  ['jonas', 'Morgen, Lena. Einen Kaffee, bitte.', 'Morning, Lena. A coffee, please.'],
  ['lena', 'Mit Milch und Zucker?', 'With milk and sugar?'],
  ['jonas', 'Nur mit Milch, bitte. Und ein Croissant.', 'Just with milk, please. And a croissant.'],
  ['?', 'What does Jonas order?', 'A coffee with milk and a croissant|A tea with sugar|A coffee with sugar and a cake'],
  ['lena', 'Das macht vier Euro fünfzig.', 'That’s four euros fifty.'],
  ['jonas', 'Oh nein! Ich habe kein Geld dabei.', 'Oh no! I don’t have any money on me.'],
  ['lena', 'Kein Problem. Du bezahlst morgen.', 'No problem. You can pay tomorrow.'],
  ['jonas', 'Danke, Lena! Du bist die Beste.', 'Thanks, Lena! You’re the best.'],
  ['?', 'Why can’t Jonas pay?', 'He has no money on him|The café is closed|Lena has no change']
]),
ST('de-s2', 'A1', 'Die neue Nachbarin', 'The new neighbor', 'home', [
  ['weber', 'Guten Tag! Ich bin Frau Weber. Ich wohne jetzt hier, gleich neben Ihnen.', 'Hello! I’m Mrs. Weber. I live here now, right next to you.'],
  ['lena', 'Guten Tag, Frau Weber! Ich heiße Lena. Herzlich willkommen!', 'Hello, Mrs. Weber! My name is Lena. Welcome!'],
  ['weber', 'Danke! Wohnen Sie allein?', 'Thank you! Do you live alone?'],
  ['lena', 'Nein, ich wohne mit Jonas zusammen. Er ist Student.', 'No, I live with Jonas. He’s a student.'],
  ['?', 'Who does Lena live with?', 'Jonas, a student|Her sister|Nobody, she lives alone'],
  ['weber', 'Und was machen Sie beruflich?', 'And what do you do for a living?'],
  ['lena', 'Ich bin Barista. Mein Café ist gleich um die Ecke.', 'I’m a barista. My café is just around the corner.'],
  ['weber', 'Wunderbar! Ich trinke sehr gern Kaffee.', 'Wonderful! I really like coffee.'],
  ['lena', 'Dann kommen Sie doch morgen vorbei!', 'Then come by tomorrow!'],
  ['?', 'What does Lena invite Frau Weber to do?', 'Come by the café tomorrow|Have dinner tonight|Meet Jonas at the station']
]),
ST('de-s3', 'A2', 'Regen am Samstag', 'Rain on Saturday', 'rain', [
  ['jonas', 'Lena, was machen wir am Samstag?', 'Lena, what are we doing on Saturday?'],
  ['lena', 'Ich möchte in den Park gehen. Das Wetter soll schön sein.', 'I’d like to go to the park. The weather is supposed to be nice.'],
  ['jonas', 'Wirklich? Laut App regnet es den ganzen Tag.', 'Really? According to the app it’s going to rain all day.'],
  ['lena', 'Oh nein. Dann gehen wir lieber ins Museum.', 'Oh no. Then let’s go to the museum instead.'],
  ['?', 'Why do they change their plan?', 'Rain is forecast|The park is closed|Jonas is sick'],
  ['jonas', 'Gute Idee. Die neue Ausstellung über Berlin soll toll sein.', 'Good idea. The new exhibition about Berlin is supposed to be great.'],
  ['lena', 'Und danach essen wir bei Emre?', 'And afterwards we’ll eat at Emre’s?'],
  ['jonas', 'Perfekt. Ich nehme meinen Regenschirm mit.', 'Perfect. I’ll bring my umbrella.'],
  ['lena', 'Und ich meine gelbe Jacke!', 'And I’ll bring my yellow jacket!'],
  ['?', 'What will they do after the museum?', 'Eat at Emre’s|Go to the park|Go home to sleep']
]),
ST('de-s4', 'A2', 'Spätabends bei Emre', 'Late at Emre’s shop', 'shop', [
  ['weber', 'Guten Abend, Emre! Haben Sie noch frisches Brot?', 'Good evening, Emre! Do you still have fresh bread?'],
  ['emre', 'Guten Abend, Frau Weber! Leider nicht, aber ich habe Brötchen von heute Morgen.', 'Good evening, Mrs. Weber! Unfortunately not, but I have rolls from this morning.'],
  ['weber', 'Gut, dann nehme ich vier Brötchen. Und einen Liter Milch, bitte.', 'Good, then I’ll take four rolls. And a liter of milk, please.'],
  ['emre', 'Die Milch steht hinten links im Kühlschrank.', 'The milk is at the back on the left, in the fridge.'],
  ['?', 'What does Frau Weber buy instead of bread?', 'Four rolls|A cake|Nothing at all'],
  ['weber', 'Kann ich mit Karte bezahlen?', 'Can I pay by card?'],
  ['emre', 'Natürlich. Das macht sechs Euro zwanzig.', 'Of course. That’s six euros twenty.'],
  ['weber', 'Sie haben ja immer bis Mitternacht geöffnet. Sind Sie nie müde?', 'You’re always open until midnight. Aren’t you ever tired?'],
  ['emre', 'Doch, aber ich trinke viel Kaffee – von Lena!', 'Sure I am, but I drink a lot of coffee – from Lena!'],
  ['?', 'How long is Emre’s shop open?', 'Until midnight|Until six in the evening|All night long']
]),
ST('de-s5', 'B1', 'Der verlorene Schlüssel', 'The lost key', 'night', [
  ['lena', 'Jonas, du siehst müde aus. Was ist passiert?', 'Jonas, you look tired. What happened?'],
  ['jonas', 'Gestern Abend bin ich spät nach Hause gekommen und hatte keinen Schlüssel.', 'Last night I came home late and didn’t have a key.'],
  ['lena', 'Oh nein! Warum hast du mich nicht angerufen?', 'Oh no! Why didn’t you call me?'],
  ['jonas', 'Mein Handy war leer. Ich habe eine halbe Stunde vor der Tür gewartet.', 'My phone was dead. I waited outside the door for half an hour.'],
  ['?', 'Why couldn’t Jonas call Lena?', 'His phone battery was dead|He forgot her number|She was asleep'],
  ['lena', 'Und wie bist du dann reingekommen?', 'And how did you get in then?'],
  ['jonas', 'Frau Weber hat mich gesehen und mir einen Tee gemacht. Sie hat sogar den Schlüsseldienst angerufen.', 'Mrs. Weber saw me and made me tea. She even called the locksmith.'],
  ['lena', 'Wie nett von ihr! Wo war denn dein Schlüssel?', 'How nice of her! So where was your key?'],
  ['jonas', 'Das ist das Beste: Er lag die ganze Zeit in meiner Jackentasche.', 'That’s the best part: it was in my jacket pocket the whole time.'],
  ['?', 'Where was the key?', 'In his jacket pocket|At the university|At Emre’s shop'],
  ['lena', 'Typisch Jonas! Wir sollten Frau Weber einen Kuchen backen.', 'Typical Jonas! We should bake Mrs. Weber a cake.']
]),
ST('de-s6', 'B1', 'Nach dem Kino', 'After the movie', 'cinema', [
  ['emre', 'Und? Wie hat dir der Film gefallen?', 'So? How did you like the movie?'],
  ['lena', 'Ehrlich gesagt fand ich ihn ein bisschen langweilig.', 'To be honest, I found it a bit boring.'],
  ['emre', 'Wirklich? Ich fand ihn total spannend, vor allem das Ende.', 'Really? I found it really exciting, especially the ending.'],
  ['lena', 'Das Ende war gut, aber die erste Stunde war viel zu lang.', 'The ending was good, but the first hour was way too long.'],
  ['?', 'What did Lena think of the movie?', 'It was a bit boring|It was very exciting|It was too short'],
  ['emre', 'Na ja, das Buch ist sowieso besser als der Film.', 'Well, the book is better than the movie anyway.'],
  ['lena', 'Du hast das Buch gelesen? Seit wann liest du Romane?', 'You read the book? Since when do you read novels?'],
  ['emre', 'Seit ich abends im Laden sitze und keine Kunden kommen.', 'Since I sit in the shop in the evenings and no customers come.'],
  ['?', 'Why does Emre read novels now?', 'His evenings in the shop are quiet|He’s studying literature|Lena gave him a book'],
  ['lena', 'Dann empfiehl mir doch mal ein gutes Buch!', 'Then recommend me a good book!']
]),
ST('de-s7', 'B2', 'Die Wohnung über dem Laden', 'The flat above the shop', 'flat', [
  ['emre', 'Hier ist sie also, die Wohnung über dem Laden. Zwei Zimmer, Küche, Bad.', 'So here it is, the apartment above the shop. Two rooms, kitchen, bathroom.'],
  ['jonas', 'Sie ist heller, als ich gedacht hatte. Wie hoch ist die Miete?', 'It’s brighter than I had thought. How much is the rent?'],
  ['emre', '750 Euro kalt, die Nebenkosten kommen noch dazu.', '750 euros before utilities; the utilities come on top.'],
  ['jonas', 'Und wie hoch ist die Kaution?', 'And how much is the deposit?'],
  ['emre', 'Drei Monatsmieten. Die muss allerdings vor dem Einzug überwiesen werden.', 'Three months’ rent. It has to be transferred before you move in, though.'],
  ['?', 'When does the deposit have to be paid?', 'Before moving in|After the first month|At the end of the year'],
  ['jonas', 'Das ist eine Menge Geld. Darf man hier eigentlich Haustiere halten?', 'That’s a lot of money. Are pets actually allowed here?'],
  ['emre', 'Eine Katze wäre okay, ein Hund eher nicht – wegen der Nachbarn.', 'A cat would be okay, a dog not really – because of the neighbors.'],
  ['?', 'Which pet would be allowed?', 'A cat|A dog|No pets at all'],
  ['jonas', 'Ich muss noch mit Lena sprechen, bevor ich mich entscheide.', 'I still need to talk to Lena before I decide.'],
  ['emre', 'Lass dir Zeit. Aber warte nicht zu lange – es gibt schon drei andere Interessenten.', 'Take your time. But don’t wait too long – there are already three other people interested.'],
  ['?', 'Why shouldn’t Jonas wait too long?', 'Other people are interested|The rent is going up|Emre is moving away']
]),
ST('de-s8', 'C1', 'Höflich, aber bestimmt', 'Polite but firm', 'desk', [
  ['lena', 'Frau Weber, die Heizung ist schon wieder ausgefallen. Könnten Sie mir helfen, eine Beschwerde zu formulieren?', 'Mrs. Weber, the heating has broken down again. Could you help me word a complaint?'],
  ['weber', 'Aber gern. Der Ton sollte höflich, aber bestimmt sein. Wir fangen ganz klassisch an: „Sehr geehrte Damen und Herren“.', 'Gladly. The tone should be polite but firm. We’ll start the classic way: “Dear Sir or Madam.”'],
  ['lena', 'Und dann schreibe ich einfach, dass es seit Tagen eiskalt ist?', 'And then I just write that it’s been freezing for days?'],
  ['weber', 'Lieber sachlich: „Hiermit möchte ich Sie darauf hinweisen, dass die Heizung seit dem dritten November nicht funktioniert.“', 'Better to stay factual: “I hereby wish to inform you that the heating has not been working since November 3rd.”'],
  ['?', 'What does Frau Weber advise?', 'Stay factual and precise|Write as angrily as possible|Phone instead of writing'],
  ['lena', 'Klingt gut. Sollte ich auch mit einer Mietminderung drohen?', 'Sounds good. Should I also threaten to reduce the rent?'],
  ['weber', 'Drohen würde ich nicht. Schreiben Sie lieber: „Ich behalte mir vor, die Miete angemessen zu mindern.“', 'I wouldn’t threaten. Better to write: “I reserve the right to reduce the rent accordingly.”'],
  ['lena', 'Das klingt viel professioneller – und trotzdem deutlich.', 'That sounds much more professional – and still clear.'],
  ['weber', 'Genau darauf kommt es an. Und setzen Sie eine Frist: Zwei Wochen sind angemessen.', 'That’s exactly what matters. And set a deadline: two weeks is reasonable.'],
  ['?', 'How long a deadline does Frau Weber suggest?', 'Two weeks|Two days|Two months'],
  ['lena', 'Danke! Ohne Sie hätte ich einen ziemlich wütenden Brief geschrieben.', 'Thank you! Without you I would have written a pretty angry letter.'],
  ['?', 'What would Lena have done without help?', 'Written an angry letter|Moved out|Stopped paying rent']
]),
ST('de-s9', 'B1', 'Notdienst in der Apotheke', 'The late-night pharmacy', 'shop', [
  ['brandt', 'Guten Abend. Haben Sie noch geöffnet? Ich brauche dringend etwas gegen Kopfschmerzen.', 'Good evening. Are you still open? I urgently need something for a headache.'],
  ['leyla', 'Ja, heute Nacht habe ich Notdienst. Seit wann haben Sie die Kopfschmerzen?', 'Yes, I’m on duty tonight. How long have you had the headache?'],
  ['brandt', 'Seit heute Mittag. Eine Mieterin hat mir einen sehr höflichen, aber sehr bestimmten Brief geschrieben.', 'Since lunchtime. A tenant wrote me a very polite but very firm letter.'],
  ['?', 'Why does Herr Brandt come to the pharmacy?', 'He has a headache|He lost his key|He wants to buy coffee'],
  ['leyla', 'Das tut mir leid. Haben Sie heute genug getrunken? Wasser, meine ich, nicht Kaffee.', 'I’m sorry. Have you had enough to drink today? Water, I mean, not coffee.'],
  ['brandt', 'Ehrlich gesagt nur Kaffee. Drei Tassen, bei Lena im Café.', 'To be honest, only coffee. Three cups, at Lena’s café.'],
  ['leyla', 'Dann nehmen Sie diese Tabletten, höchstens drei am Tag, und trinken Sie viel Wasser.', 'Then take these tablets, no more than three a day, and drink plenty of water.'],
  ['?', 'What does Leyla tell him to do?', 'Take at most three tablets a day and drink water|Drink more coffee|Go straight to the hospital'],
  ['brandt', 'Danke. Sagen Sie mal, sind Sie nicht Emres Cousine?', 'Thanks. Tell me, aren’t you Emre’s cousin?'],
  ['leyla', 'Genau. Und Sie sind bestimmt Herr Brandt, der Vermieter. Emre hat mir schon viel von Ihnen erzählt.', 'That’s right. And you must be Herr Brandt, the landlord. Emre has told me a lot about you.'],
  ['brandt', 'Oh je. Hoffentlich nur Gutes!', 'Oh dear. Only good things, I hope!'],
  ['leyla', 'Fast nur Gutes. Aber reparieren Sie bald die Heizung, dann sind auch die Kopfschmerzen weg.', 'Almost only good things. But fix the heating soon, and the headaches will be gone too.'],
  ['?', 'What does Leyla suggest at the end?', 'Fixing the heating soon|Writing a letter|Moving to a new flat']
])
);
