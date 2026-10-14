"use strict";
/* Italian stories (Rome). Same format as stories-de.js. */
STORIES.push(
/* ------------------------------ ITALIAN ------------------------------ */
ST('it-s1', 'A1', 'Un caffè, per favore', 'A coffee, please', 'cafe', [
  ['giulia', 'Buongiorno, Luca! Che cosa prendi?', 'Good morning, Luca! What are you having?'],
  ['luca', 'Ciao, Giulia. Un cappuccino e un cornetto, per favore.', 'Hi, Giulia. A cappuccino and a croissant, please.'],
  ['giulia', 'Subito! Vuoi anche un bicchiere d’acqua?', 'Right away! Do you also want a glass of water?'],
  ['luca', 'Sì, grazie. Oggi fa molto caldo.', 'Yes, thanks. It is very hot today.'],
  ['?', 'What does Luca order?', 'A cappuccino and a croissant|A tea and a sandwich|An espresso and a juice'],
  ['giulia', 'Sono tre euro e cinquanta.', 'That’s three euros fifty.'],
  ['luca', 'Oh no! Non ho contanti. Accetti la carta?', 'Oh no! I don’t have any cash. Do you take cards?'],
  ['giulia', 'Certo che sì.', 'Of course.'],
  ['luca', 'Grazie, Giulia! A domani.', 'Thanks, Giulia! See you tomorrow.'],
  ['?', 'How does Luca pay?', 'By card|In cash|He doesn’t pay']
]),
ST('it-s2', 'A1', 'La famiglia di Giulia', 'Giulia’s family', 'home', [
  ['luca', 'Giulia, chi sono le persone nella foto?', 'Giulia, who are the people in the photo?'],
  ['giulia', 'È la mia famiglia. Lui è mio fratello Matteo. È ingegnere.', 'It’s my family. That’s my brother Matteo. He’s an engineer.'],
  ['luca', 'E la signora con i capelli bianchi?', 'And the lady with the white hair?'],
  ['giulia', 'È Nonna Rosa. Ha settant’anni e insegnava letteratura. È un po’ la nonna di tutto il quartiere.', 'That’s Nonna Rosa. She’s seventy and used to teach literature. She’s a bit like the grandmother of the whole neighborhood.'],
  ['?', 'Who is Nonna Rosa?', 'A retired teacher, grandmother to the neighborhood|Giulia’s sister|The owner of the bar'],
  ['luca', 'Settant’anni e lavora ancora!', 'Seventy and still working!'],
  ['giulia', 'No, non lavora più, ma dà lezioni gratis a tutti i bambini.', 'No, she doesn’t work anymore, but she gives free lessons to all the kids.'],
  ['luca', 'E tuo fratello dove abita?', 'And where does your brother live?'],
  ['giulia', 'Abita a Milano e lavora in una banca. Viene a Roma ogni mese.', 'He lives in Milan and works in a bank. He comes to Rome every month.'],
  ['?', 'Where does Giulia’s brother live?', 'In Milan|In Rome|In Naples'],
  ['luca', 'Che bella famiglia!', 'What a lovely family!']
]),
ST('it-s3', 'A2', 'Al mercato', 'At the market', 'market', [
  ['nonna', 'Buongiorno, Marco! Come sono oggi i pomodori?', 'Good morning, Marco! How are the tomatoes today?'],
  ['marco', 'Freschissimi, signora Rosa! Costano due euro al chilo.', 'Very fresh, Mrs. Rosa! They cost two euros a kilo.'],
  ['nonna', 'Mi sembrano un po’ cari.', 'They seem a bit expensive to me.'],
  ['marco', 'Sono di Pachino, sono più dolci. Quanti ne vuole?', 'They’re from Pachino, they’re sweeter. How many do you want?'],
  ['?', 'How much do the tomatoes cost?', 'Two euros a kilo|Five euros a kilo|One euro a kilo'],
  ['nonna', 'Mezzo chilo di pomodori, un chilo di patate e due arance.', 'Half a kilo of tomatoes, a kilo of potatoes and two oranges.'],
  ['marco', 'Ecco a Lei. In tutto fanno sette euro.', 'Here you are. That makes seven euros in all.'],
  ['nonna', 'Ecco dieci euro.', 'Here are ten euros.'],
  ['marco', 'Tre euro di resto. Grazie e buona giornata!', 'Three euros change. Thank you and have a nice day!'],
  ['?', 'How much change does Marco give?', 'Three euros|Seven euros|Two euros'],
  ['nonna', 'Altrettanto, Marco!', 'The same to you, Marco!']
]),
ST('it-s4', 'A2', 'Pioggia nel pomeriggio', 'Afternoon rain', 'rain', [
  ['luca', 'Giulia, hai visto? Sta piovendo a dirotto!', 'Giulia, have you seen? It’s pouring!'],
  ['giulia', 'Lo so! Non ho l’ombrello. Devo andare in banca prima delle cinque.', 'I know! I don’t have an umbrella. I have to go to the bank before five.'],
  ['luca', 'Io ne ho uno grande. Ti accompagno?', 'I have a big one. Shall I walk with you?'],
  ['giulia', 'Volentieri! Ma tu dove vai?', 'Gladly! But where are you going?'],
  ['?', 'Where does Giulia need to go?', 'To the bank|To the doctor|To the station'],
  ['luca', 'Devo consegnare un pacco in via Garibaldi. Possiamo andare insieme fino alla fermata.', 'I have to deliver a package on Via Garibaldi. We can go together as far as the stop.'],
  ['giulia', 'Che gentile! In estate non piove mai così.', 'How kind! In summer it never rains like this.'],
  ['luca', 'Questo è un temporale. Tra poco passa.', 'This is a thunderstorm. It will pass soon.'],
  ['giulia', 'Speriamo. Intanto, prendiamo un caffè?', 'Let’s hope so. Meanwhile, shall we have a coffee?'],
  ['?', 'What does Giulia suggest?', 'To have a coffee|To take a taxi|To wait at home']
]),
ST('it-s5', 'B1', 'La notte del blackout', 'The night of the blackout', 'night', [
  ['conti', 'Signor Bianchi, com’è andata ieri sera alla pensione?', 'Mr. Bianchi, how did it go at the pension last night?'],
  ['bianchi', 'Un disastro! Alle nove è saltata la luce in tutto il quartiere.', 'A disaster! At nine the power went out in the whole neighborhood.'],
  ['conti', 'Davvero? E che cosa avete fatto?', 'Really? And what did you do?'],
  ['bianchi', 'All’inizio tutti sono rimasti in silenzio. Poi Luca è sceso con la chitarra e ha cominciato a suonare.', 'At first everyone went quiet. Then Luca came down with his guitar and started to play.'],
  ['?', 'What happened at nine?', 'The power went out|A guest arrived late|It started to snow'],
  ['conti', 'C’era anche Luca?', 'Luca was there too?'],
  ['bianchi', 'Sì, era venuto a trovare un amico. Abbiamo acceso le candele e tutti hanno cantato.', 'Yes, he had come to visit a friend. We lit the candles and everyone sang.'],
  ['conti', 'Che bello! E la colazione di stamattina?', 'How lovely! And this morning’s breakfast?'],
  ['bianchi', 'Per fortuna la cucina è a gas, quindi ho potuto preparare tutto.', 'Luckily the kitchen runs on gas, so I was able to prepare everything.'],
  ['?', 'Why could Mr. Bianchi make breakfast?', 'The kitchen runs on gas|He had a generator|The power came back at once'],
  ['conti', 'È stata la serata più bella dell’anno, no?', 'It was the best evening of the year, wasn’t it?'],
  ['bianchi', 'Eh sì. Alcuni ospiti hanno già chiesto quando sarà il prossimo blackout.', 'Well, yes. Some guests have already asked when the next blackout will be.']
]),
ST('it-s6', 'B1', 'Dopo il concerto', 'After the concert', 'concert', [
  ['luca', 'Che cosa ne pensi del concerto?', 'What did you think of the concert?'],
  ['giulia', 'Mi è piaciuta molto la band, ma penso che il volume fosse troppo alto.', 'I really liked the band, but I think the volume was too loud.'],
  ['luca', 'Troppo alto? Non credo che fosse così forte.', 'Too loud? I don’t think it was that loud.'],
  ['giulia', 'Luca, suoni la chitarra da anni: ormai non senti più niente!', 'Luca, you’ve played guitar for years: by now you can’t hear anything!'],
  ['?', 'What did Giulia think of the volume?', 'It was too loud|It was too quiet|It was perfect'],
  ['luca', 'Può darsi. La cosa più bella è stata l’ultima canzone.', 'Maybe. The best part was the last song.'],
  ['giulia', 'Su questo siamo d’accordo. Sai chi l’ha scritta?', 'We agree on that. Do you know who wrote it?'],
  ['luca', 'La cantante. Dicono che l’abbia scritta per sua nonna.', 'The singer. They say she wrote it for her grandmother.'],
  ['giulia', 'Allora dobbiamo farla ascoltare a Nonna Rosa.', 'Then we have to let Nonna Rosa hear it.'],
  ['?', 'Who did the singer write the song for?', 'Her grandmother|Her daughter|Her band']
]),
ST('it-s7', 'B2', 'Affittasi appartamento', 'Apartment for rent', 'flat', [
  ['bianchi', 'Ecco l’appartamento. Ha due camere e la cucina è stata rifatta l’anno scorso.', 'Here is the apartment. It has two bedrooms and the kitchen was redone last year.'],
  ['luca', 'È più luminoso di quanto pensassi. Quanto costa l’affitto?', 'It’s brighter than I thought. How much is the rent?'],
  ['bianchi', 'Seicento euro al mese, spese escluse.', 'Six hundred euros a month, bills not included.'],
  ['luca', 'Non è poco per uno studente. Se riuscissi a trovare un coinquilino, potrei permettermelo.', 'That’s not little for a student. If I managed to find a flatmate, I could afford it.'],
  ['?', 'What would make the rent possible for Luca?', 'Finding a flatmate|Getting a scholarship|Working at night'],
  ['bianchi', 'Capisco. Ti chiedo una caparra di due mensilità e un contratto di almeno un anno.', 'I understand. I ask you for a deposit of two months and a contract of at least a year.'],
  ['luca', 'Mi sembra giusto, purché il contratto preveda la possibilità di recedere con un mese di preavviso.', 'That seems fair, as long as the contract allows me to withdraw with a month’s notice.'],
  ['bianchi', 'Si può fare, a patto che tu paghi puntualmente.', 'That can be done, provided that you pay on time.'],
  ['?', 'What does Luca want in the contract?', 'A one-month notice to withdraw|A lower deposit|A garden'],
  ['luca', 'Benissimo. E il riscaldamento?', 'Great. And the heating?'],
  ['bianchi', 'È autonomo: lo paghi in base a quanto consumi.', 'It’s independent: you pay for it according to how much you use.'],
  ['luca', 'Allora firmo volentieri. Quando posso entrare?', 'Then I’ll gladly sign. When can I move in?'],
  ['bianchi', 'Da lunedì. Ti consegno le chiavi.', 'From Monday. I’ll hand you the keys.'],
  ['?', 'When can Luca move in?', 'From Monday|Next year|Tomorrow']
]),
ST('it-s8', 'C1', 'Il colloquio', 'The interview', 'desk', [
  ['nonna', 'Domani hai il colloquio in banca. Hai pensato a che cosa dire?', 'Tomorrow you have the interview at the bank. Have you thought about what to say?'],
  ['luca', 'Più o meno. Pensavo di dire che sono il candidato migliore.', 'More or less. I was thinking of saying that I’m the best candidate.'],
  ['nonna', 'Meglio non esagerare. Di’ piuttosto: «Mi sono sempre impegnato per raggiungere i miei obiettivi».', 'Better not to exaggerate. Say rather: “I have always worked hard to reach my goals.”'],
  ['luca', 'Suona molto formale. Non sarebbe meglio parlare come faccio di solito?', 'That sounds very formal. Wouldn’t it be better to talk the way I usually do?'],
  ['?', 'What does Nonna Rosa advise Luca?', 'Not to exaggerate|To speak only English|To cancel the interview'],
  ['nonna', 'Puoi essere naturale, ma cura il registro. Se ti chiedono dello stipendio, non dire «voglio tanti soldi»: di’ «vorrei una retribuzione adeguata».', 'You can be natural, but watch your register. If they ask about salary, don’t say “I want lots of money”: say “I would like an appropriate salary.”'],
  ['luca', 'Ah, ah. E se mi chiedono quali sono i miei difetti?', 'Ha ha. And if they ask me what my flaws are?'],
  ['nonna', 'Rispondi con sincerità. Un aneddoto autentico convince più di qualsiasi discorso.', 'Answer sincerely. A genuine anecdote persuades more than any speech.'],
  ['?', 'What persuades more than any speech, according to Nonna Rosa?', 'A genuine anecdote|A low salary|A formal speech'],
  ['luca', 'Allora sarò formale con lo stipendio e sincero con le storie.', 'Then I’ll be formal about the salary and sincere with the stories.'],
  ['nonna', 'Esatto. E non dimenticare di salutare con un sorriso.', 'Exactly. And don’t forget to greet them with a smile.'],
  ['?', 'What should Luca not forget?', 'To greet with a smile|To bring a gift|To wear a tie']
]),
ST('it-s9', 'B1', 'Il motorino sotto la pioggia', 'The scooter in the rain', 'rain', [
  ['bianchi', 'Buonasera! Ha il pacco per la pensione Bianchi?', 'Good evening! Do you have the package for Pensione Bianchi?'],
  ['luca', 'Sì, è per Lei. Mi scusi, sono bagnato fradicio: con questa pioggia le strade sono pericolose.', 'Yes, it’s for you. Sorry, I’m soaking wet: with this rain the streets are dangerous.'],
  ['bianchi', 'Entri pure al riparo. Da quanto tempo fa il fattorino?', 'Do come in out of the rain. How long have you been a courier?'],
  ['luca', 'Da due anni. Prima lavoravo in un bar, ma preferisco la strada.', 'For two years. Before, I worked in a bar, but I prefer the street.'],
  ['?', 'What did Luca do before?', 'He worked in a bar|He was a teacher|He was a chef'],
  ['bianchi', 'Cerco sempre qualcuno che conosca bene la città. I miei ospiti si perdono continuamente.', 'I’m always looking for someone who knows the city well. My guests get lost all the time.'],
  ['luca', 'Roma è un labirinto, ma io conosco ogni vicolo.', 'Rome is a maze, but I know every alley.'],
  ['?', 'Why does Mr. Bianchi look for someone who knows the city?', 'His guests get lost all the time|He wants to sell his scooter|He needs a taxi'],
  ['bianchi', 'Potrebbe accompagnare i miei ospiti alla stazione ogni tanto?', 'Could you take my guests to the station every now and then?'],
  ['luca', 'Certo! Ecco il mio numero. E guardi: la pioggia sta smettendo, mancano cinque minuti alle otto.', 'Of course! Here’s my number. And look: the rain is stopping, it’s five to eight.'],
  ['?', 'What does Mr. Bianchi ask Luca?', 'To take his guests to the station now and then|To clean the pension|To teach him to ride a scooter']
])
);
