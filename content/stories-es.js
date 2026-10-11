"use strict";
/* Spanish stories (Mexico City). Same format as stories-de.js. */
STORIES.push(
/* ------------------------------ SPANISH ------------------------------ */
ST('es-s1', 'A1', 'Un café, por favor', 'A coffee, please', 'cafe', [
  ['mateo', '¡Buenos días, Sofía! ¿Qué te sirvo?', 'Good morning, Sofía! What can I get you?'],
  ['sofia', 'Hola, Mateo. Un café con leche, por favor.', 'Hi, Mateo. A coffee with milk, please.'],
  ['mateo', '¿Grande o chico?', 'Large or small?'],
  ['sofia', 'Grande, por favor. Y un pan dulce.', 'Large, please. And a sweet roll.'],
  ['?', 'What does Sofía order?', 'A large coffee with milk and a sweet roll|A small tea|A juice and toast'],
  ['mateo', 'Son ochenta pesos.', 'That’s eighty pesos.'],
  ['sofia', '¡Ay, no! No traigo efectivo. ¿Aceptas tarjeta?', 'Oh no! I don’t have any cash on me. Do you take cards?'],
  ['mateo', 'Claro que sí.', 'Of course.'],
  ['sofia', '¡Gracias, Mateo! Hasta mañana.', 'Thanks, Mateo! See you tomorrow.'],
  ['?', 'How does Sofía pay?', 'By card|In cash|She doesn’t pay']
]),
ST('es-s2', 'A1', 'La familia de Diego', 'Diego’s family', 'home', [
  ['mateo', 'Diego, ¿quiénes son las personas de la foto?', 'Diego, who are the people in the photo?'],
  ['diego', 'Es mi familia. Ella es mi hermana Sofía. Es doctora.', 'It’s my family. That’s my sister Sofía. She’s a doctor.'],
  ['mateo', '¿Y la señora del pelo blanco?', 'And the lady with the white hair?'],
  ['diego', 'Es mi abuela, doña Carmen. Tiene setenta años y trabaja en el mercado.', 'That’s my grandmother, Doña Carmen. She’s seventy and works at the market.'],
  ['?', 'Who is Doña Carmen?', 'Diego’s grandmother|Diego’s mother|Diego’s neighbor'],
  ['mateo', '¡Setenta años y todavía trabaja!', 'Seventy and she still works!'],
  ['diego', 'Sí, vende fruta. Es muy simpática.', 'Yes, she sells fruit. She’s very nice.'],
  ['mateo', '¿Y tú? ¿Tienes hijos?', 'And you? Do you have children?'],
  ['diego', 'No, pero tengo un gato. Se llama Chile.', 'No, but I have a cat. His name is Chile.'],
  ['?', 'What does Diego have?', 'A cat|Two children|A dog']
]),
ST('es-s3', 'A2', 'En el mercado', 'At the market', 'market', [
  ['carmen', '¡Pásele, pásele! ¿Qué le damos, joven?', 'Come on in! What can I get you, young man?'],
  ['diego', 'Abuela, soy yo, Diego.', 'Grandma, it’s me, Diego.'],
  ['carmen', '¡Ay, mijo! No te vi. ¿Qué necesitas?', 'Oh, sweetie! I didn’t see you. What do you need?'],
  ['diego', 'Necesito un kilo de jitomate, dos aguacates y un poco de cilantro para la cena.', 'I need a kilo of tomatoes, two avocados and a little cilantro for dinner.'],
  ['?', 'What does Diego need?', 'Tomatoes, avocados and cilantro|Onions and rice|Fruit for a cake'],
  ['carmen', 'Los aguacates están muy buenos hoy. ¿Vas a hacer guacamole?', 'The avocados are very good today. Are you going to make guacamole?'],
  ['diego', 'Sí, Sofía viene a cenar. ¿Cuánto es?', 'Yes, Sofía is coming for dinner. How much is it?'],
  ['carmen', 'Para ti, nada. Pero me guardas un poco de guacamole.', 'For you, nothing. But save me some guacamole.'],
  ['diego', '¡Trato hecho, abuela!', 'Deal, Grandma!'],
  ['?', 'How much does Diego pay?', 'Nothing|Fifty pesos|A hundred pesos']
]),
ST('es-s4', 'A2', 'Lluvia en la tarde', 'Afternoon rain', 'rain', [
  ['sofia', 'Mateo, ¿qué hacemos el sábado?', 'Mateo, what are we doing on Saturday?'],
  ['mateo', 'Podemos ir a Chapultepec en bici.', 'We can go to Chapultepec by bike.'],
  ['sofia', 'Buena idea, pero en esta época siempre llueve en la tarde.', 'Good idea, but this time of year it always rains in the afternoon.'],
  ['mateo', 'Entonces vamos temprano, a las nueve.', 'Then let’s go early, at nine.'],
  ['?', 'Why do they want to go early?', 'It usually rains in the afternoon|The park closes at noon|Mateo works in the afternoon'],
  ['sofia', '¿A las nueve? ¡Es sábado!', 'At nine? It’s Saturday!'],
  ['mateo', 'Bueno, a las diez. Y después comemos en el restaurante de Diego.', 'Okay, at ten. And afterwards we’ll eat at Diego’s restaurant.'],
  ['sofia', 'Perfecto. Llevo un paraguas, por si acaso.', 'Perfect. I’ll bring an umbrella, just in case.'],
  ['?', 'Where will they eat afterwards?', 'At Diego’s restaurant|At home|At the market']
]),
ST('es-s5', 'B1', 'La noche del apagón', 'The night of the blackout', 'night', [
  ['sofia', 'Diego, ¿cómo te fue anoche en el restaurante?', 'Diego, how did it go at the restaurant last night?'],
  ['diego', '¡Uf! A las nueve se fue la luz en todo el barrio.', 'Phew! At nine the power went out in the whole neighborhood.'],
  ['sofia', '¿En serio? ¿Y qué hicieron?', 'Seriously? And what did you do?'],
  ['diego', 'Al principio todos se quedaron callados. Luego Mateo sacó su guitarra y empezó a tocar.', 'At first everyone went quiet. Then Mateo took out his guitar and started to play.'],
  ['?', 'What happened at nine?', 'The power went out|A famous chef arrived|It started to rain'],
  ['sofia', '¿Mateo estaba ahí?', 'Mateo was there?'],
  ['diego', 'Sí, había venido a cenar. Pusimos velas en todas las mesas y la gente empezó a cantar.', 'Yes, he had come for dinner. We put candles on all the tables and people started to sing.'],
  ['sofia', '¡Qué bonito! ¿Y la comida?', 'How lovely! And the food?'],
  ['diego', 'Por suerte, la estufa es de gas, así que pudimos seguir cocinando.', 'Luckily the stove is gas, so we could keep cooking.'],
  ['?', 'Why could Diego keep cooking?', 'The stove runs on gas|They had a generator|The power came back quickly'],
  ['sofia', 'Fue la mejor noche del año, ¿no?', 'It was the best night of the year, wasn’t it?'],
  ['diego', 'Pues sí. Algunos clientes ya preguntaron cuándo es el próximo apagón.', 'Well, yes. Some customers have already asked when the next blackout is.']
]),
ST('es-s6', 'B1', 'Después del concierto', 'After the concert', 'concert', [
  ['mateo', '¿Qué te pareció el concierto?', 'What did you think of the concert?'],
  ['sofia', 'Me encantó la banda, pero creo que el sonido estaba demasiado fuerte.', 'I loved the band, but I think the sound was too loud.'],
  ['mateo', '¿Demasiado fuerte? No creo que estuviera tan fuerte.', 'Too loud? I don’t think it was that loud.'],
  ['sofia', 'Mateo, tú eres músico. ¡Ya no oyes nada!', 'Mateo, you’re a musician. You can’t hear anything anymore!'],
  ['?', 'What did Sofía think of the sound?', 'It was too loud|It was too quiet|It was perfect'],
  ['mateo', 'Puede ser. Lo mejor fue la última canción.', 'Maybe. The best part was the last song.'],
  ['sofia', 'En eso estamos de acuerdo. ¿Sabes quién la escribió?', 'We agree on that. Do you know who wrote it?'],
  ['mateo', 'La cantante. Dicen que la escribió para su abuela.', 'The singer. They say she wrote it for her grandmother.'],
  ['sofia', 'Entonces tenemos que ponérsela a doña Carmen.', 'Then we have to play it for Doña Carmen.'],
  ['?', 'Who did the singer write the song for?', 'Her grandmother|Her daughter|Her band']
]),
ST('es-s7', 'B2', 'Se renta departamento', 'Apartment for rent', 'flat', [
  ['carmen', 'Este es el departamento. Tiene dos recámaras, y la cocina se remodeló el año pasado.', 'This is the apartment. It has two bedrooms, and the kitchen was remodeled last year.'],
  ['mateo', 'Es más luminoso de lo que pensaba. ¿Cuánto es la renta?', 'It’s brighter than I thought. How much is the rent?'],
  ['carmen', 'Doce mil pesos al mes, sin servicios.', 'Twelve thousand pesos a month, utilities not included.'],
  ['mateo', '¿Y cuánto se pide de depósito?', 'And how much is the deposit?'],
  ['carmen', 'Un mes de renta, y el contrato se firma por un año.', 'One month’s rent, and the lease is signed for a year.'],
  ['?', 'How long is the lease?', 'One year|One month|Two years'],
  ['mateo', 'Doña Carmen, le tengo que confesar algo: toco la batería.', 'Doña Carmen, I have to confess something: I play the drums.'],
  ['carmen', '¿La batería? Mientras no ensayes después de las diez de la noche, no hay problema.', 'The drums? As long as you don’t practice after ten at night, it’s no problem.'],
  ['?', 'What is Mateo allowed to do?', 'Play the drums before 10 p.m.|Play the drums all night|Keep a dog'],
  ['mateo', '¡Trato hecho! ¿Cuándo me podría mudar?', 'Deal! When could I move in?'],
  ['carmen', 'En cuanto firmes. Y te advierto: las vecinas de abajo son mis amigas del dominó.', 'As soon as you sign. And I’m warning you: the neighbors downstairs are my dominoes friends.'],
  ['?', 'Who lives downstairs?', 'Doña Carmen’s dominoes friends|Diego and Sofía|Another drummer']
]),
ST('es-s8', 'C1', 'La entrevista', 'The interview', 'studio', [
  ['sofia', 'Mañana es tu entrevista en la tele. ¿Ya pensaste qué vas a decir?', 'Your TV interview is tomorrow. Have you thought about what you’re going to say?'],
  ['diego', 'Más o menos. Pensaba decir que mi comida es la mejor de la ciudad.', 'More or less. I was thinking of saying my food is the best in the city.'],
  ['sofia', 'Mejor no exageres. Di algo como: «Nos esforzamos por rescatar recetas tradicionales».', 'Better not to exaggerate. Say something like: “We strive to revive traditional recipes.”'],
  ['diego', 'Suena muy formal. ¿No sería mejor hablar como siempre?', 'That sounds very formal. Wouldn’t it be better to talk the way I always do?'],
  ['?', 'What does Sofía advise Diego?', 'Not to exaggerate|To speak only English|To cancel the interview'],
  ['sofia', 'Puedes ser natural, pero cuida el registro. Si te preguntan por los precios, no digas «está carísimo»; di «es cocina de autor».', 'You can be natural, but watch your register. If they ask about prices, don’t say “it’s super expensive”; say “it’s signature cuisine.”'],
  ['diego', 'Ja, ja. ¿Y si me preguntan por el apagón?', 'Ha ha. And if they ask me about the blackout?'],
  ['sofia', 'Cuéntalo tal cual. Las anécdotas auténticas conectan con el público mejor que cualquier discurso.', 'Tell it just as it happened. Genuine anecdotes connect with an audience better than any speech.'],
  ['?', 'What connects best with an audience, according to Sofía?', 'Genuine anecdotes|Low prices|Formal speeches'],
  ['diego', 'Entonces seré formal con los precios y sincero con las historias.', 'Then I’ll be formal about the prices and honest about the stories.'],
  ['sofia', 'Exacto. Y por favor, no menciones que la abuela cocina mejor que tú.', 'Exactly. And please, don’t mention that Grandma cooks better than you.'],
  ['?', 'What shouldn’t Diego mention?', 'That Grandma cooks better than him|The blackout|His prices']
]),
ST('es-s9', 'B1', 'Taxi bajo la lluvia', 'A taxi in the rain', 'rain', [
  ['valentina', '¡Buenas tardes! ¿A dónde lo llevo?', 'Good afternoon! Where can I take you?'],
  ['andres', 'Al centro, por favor, a la calle Madero. Tengo prisa: a las seis llegan unos huéspedes a mi hotel.', 'To the center, please, Madero Street. I’m in a hurry: some guests are arriving at my hotel at six.'],
  ['valentina', 'Con esta lluvia va a haber mucho tráfico, pero conozco un atajo.', 'With this rain there’ll be a lot of traffic, but I know a shortcut.'],
  ['?', 'Why is Andrés in a hurry?', 'Guests are arriving at his hotel at six|He’s late for a concert|His flight leaves at six'],
  ['andres', '¿Hace mucho que maneja un taxi?', 'Have you been driving a taxi for a long time?'],
  ['valentina', 'Doce años. Antes era maestra, pero me gusta más la calle.', 'Twelve years. I used to be a teacher, but I like the street better.'],
  ['andres', 'Siempre busco a alguien que conozca bien la ciudad. Mis huéspedes se pierden todo el tiempo.', 'I’m always looking for someone who knows the city well. My guests get lost all the time.'],
  ['?', 'What did Valentina do before she drove a taxi?', 'She was a teacher|She was a chef|She worked at a hotel'],
  ['valentina', '¿Me está ofreciendo trabajo?', 'Are you offering me a job?'],
  ['andres', 'Algo así. ¿Podría llevar a mis huéspedes al aeropuerto de vez en cuando?', 'Something like that. Could you take my guests to the airport now and then?'],
  ['valentina', 'Claro que sí. Aquí tiene mi tarjeta. Y mire: ya llegamos, y faltan cinco para las seis.', 'Of course. Here’s my card. And look: we’re here, and it’s five to six.'],
  ['?', 'What does Andrés ask Valentina?', 'To drive his guests to the airport now and then|To work at his hotel’s front desk|To teach him to drive']
])
);
