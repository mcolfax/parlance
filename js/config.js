"use strict";
/* ===================== APP CONFIG =====================
   One place for version, release notes, languages, levels, the XP economy, quests, badges and
   Talk scenarios. Change a value here and it applies everywhere.
   ====================================================== */
const APP_VERSION = '4.1.0';
const SCHEMA_VERSION = 5;          // bump when the saved-state shape changes; add a step to MIGRATIONS in state.js
const RELEASES = [
  { v: '4.1.0', date: '2026-10-10', title: 'Parlance has a theme song', notes: [
    'The intro film now plays our own theme song, “ABC Adventure”.',
    'The song plays softly on the home screen. Tap the music button on Learn, or go to Me → Sound, to turn it off or change the volume.'] },
  { v: '4.0.0', date: '2026-10-10', title: 'Pip is a parrot, and Parlance has a voice', notes: [
    'Meet Pip, now a parrot: a chatty travel buddy who repeats after you.',
    'A 35-second intro film with its own music. Watch it any time from Me.',
    'All-new sound design: every tap, tile, chest and badge has its own sound, with a volume control.',
    'Tell us what to improve from anywhere in the app. Your ideas shape the next update.',
    'New lessons and stories can now arrive without you doing anything, and your progress always stays put.'] },
  { v: '3.0.0', date: '2026-10-10', title: 'Stories, quests and badges', notes: [
    '16 illustrated stories with a recurring cast in Berlin and Mexico City.',
    'Daily quests with a treasure chest, 20 badges and a streak calendar.',
    '32 new lessons, tap-to-translate words and a word of the day.'] },
  { v: '2.0.0', date: '2026-10-10', title: 'The full route, A1 to C2', notes: ['Levels B1 to C2, account sync across devices and a polished new design.'] }
];
/* Media. The theme song plays under the intro film and loops softly on the home screen.
   home/film are volume multipliers on the learner's music volume; duck is how low it goes while a voice speaks. */
const MEDIA = { song: { title: 'ABC Adventure', filmStart: 0, fadeOut: 2.5, home: 0.6, film: 1, duck: 0.3,
  sources: [ // first one the browser can play wins: AAC for Safari/iPhone and Chrome, Opus for Chromium and Firefox builds without AAC
    { src: 'media/abc-adventure.mp4', type: 'audio/mp4; codecs="mp4a.40.2"' },
    { src: 'media/abc-adventure.webm', type: 'audio/webm; codecs="opus"' }] } };
/* XP economy */
const XP = { perAnswer: 1, lesson: 5, perfectBonus: 5, review: 3, story: 8, storyPerfect: 4, chest: 15, talkPerMsg: 2, talkMax: 20 };
/* ===================== LANGUAGES & LEVELS ===================== */
const LANGS = {
  de: { code: 'de', name: 'German', native: 'Deutsch', tts: 'de-DE', prefs: ['de-DE', 'de-AT', 'de-CH', 'de'],
    chars: ['ä', 'ö', 'ü', 'ß'], articles: ['der', 'die', 'das'], keyboard: 'Deutsch', variety: 'Standard High German',
    hello: 'Hallo!', test: 'Hallo! Schön, dich kennenzulernen.',
    dialect: 'Use standard High German. Use du unless the setting is formal (hotel, doctor, office, interview, police), then use Sie.' },
  es: { code: 'es', name: 'Spanish', native: 'Español', tts: 'es-MX', prefs: ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-CL', 'es-ES', 'es'],
    chars: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'], articles: ['el', 'la', 'los', 'las'], keyboard: 'Español (México)', variety: 'Latin American Spanish',
    hello: '¡Hola!', test: '¡Hola! Mucho gusto.',
    dialect: 'Use Latin American Spanish: ustedes, never vosotros, and Latin American vocabulary (boleto, departamento, carro, celular).' }
};
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_NAME = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate', C1: 'Advanced', C2: 'Mastery' };
const LEVEL_BLURB = { A1: 'Starting from zero', A2: 'I know the basics', B1: 'I can get by in conversation', B2: 'I’m comfortable in most situations', C1: 'I’m advanced and want polish', C2: 'I want native-level nuance' };
const LEVEL_GUIDE = {
  A1: 'very short, simple present-tense sentences with the most common words',
  A2: 'simple sentences, present tense plus the simple past, everyday vocabulary',
  B1: 'connected everyday speech, common tenses, some subordinate clauses',
  B2: 'natural, fluent speech with varied structures and some idioms',
  C1: 'rich, idiomatic language with complex structures',
  C2: 'native-level nuance, idiom and register'
};


/* ===================== DAILY QUESTS ===================== */
const QUESTS = {
  lesson1: { label: 'Finish a lesson', target: 1, key: 'lessons', icon: 'flag' },
  lesson2: { label: 'Finish 2 lessons', target: 2, key: 'lessons', icon: 'flag' },
  combo5: { label: 'Get 5 right in a row', target: 5, key: 'combo', icon: 'bolt' },
  combo8: { label: 'Get 8 right in a row', target: 8, key: 'combo', icon: 'bolt' },
  acc90: { label: 'Score 90% or more in a lesson', target: 1, key: 'acc', icon: 'target' },
  review10: { label: 'Review or practice 10 items', target: 10, key: 'reviews', icon: 'stack' },
  story: { label: 'Read a story', target: 1, key: 'stories', icon: 'book' },
  xp30: { label: 'Earn 30 XP today', target: 30, key: 'xp', icon: 'star' }
};

/* ===================== BADGES ===================== */
const BADGES = [
  { id: 'first', icon: 'flag', name: 'First stop', desc: 'Finish your first lesson.' },
  { id: 'streak3', icon: 'flame', name: 'Warming up', desc: 'Keep a 3-day streak.' },
  { id: 'streak7', icon: 'flame', name: 'One week strong', desc: 'Keep a 7-day streak.' },
  { id: 'streak30', icon: 'flame', name: 'Monthly pass', desc: 'Keep a 30-day streak.' },
  { id: 'words50', icon: 'abc', name: 'Collector', desc: 'Learn 50 words.' },
  { id: 'words250', icon: 'abc', name: 'Word hoard', desc: 'Learn 250 words.' },
  { id: 'words1000', icon: 'abc', name: 'Walking dictionary', desc: 'Learn 1,000 words.' },
  { id: 'flawless', icon: 'target', name: 'Flawless', desc: 'Finish a lesson without a single miss.' },
  { id: 'combo10', icon: 'bolt', name: 'Hot streak', desc: 'Get 10 answers right in a row.' },
  { id: 'review100', icon: 'stack', name: 'Steady memory', desc: 'Get 100 review answers right.' },
  { id: 'story1', icon: 'book', name: 'Bookworm', desc: 'Finish your first story.' },
  { id: 'stories8', icon: 'book', name: 'Storyteller', desc: 'Finish all 8 stories in one language.' },
  { id: 'talk', icon: 'chat', name: 'Chatterbox', desc: 'Send your tutor 5 messages in one conversation.' },
  { id: 'chest7', icon: 'chest', name: 'Treasure hunter', desc: 'Open 7 daily chests.' },
  { id: 'levelA1', icon: 'trophy', name: 'A1 complete', desc: 'Finish every A1 lesson in one language.' },
  { id: 'levelB1', icon: 'trophy', name: 'Halfway there', desc: 'Finish every B1 lesson in one language.' },
  { id: 'levelC2', icon: 'mountain', name: 'Summit', desc: 'Finish every C2 lesson in one language.' },
  { id: 'both', icon: 'globe', name: 'Bilingual', desc: 'Finish a lesson in both German and Spanish.' },
  { id: 'early', icon: 'sun', name: 'Early bird', desc: 'Practice before 8 a.m.' },
  { id: 'night', icon: 'moon', name: 'Night owl', desc: 'Practice after 10 p.m.' }
];

/* ===================== YOUR BIRD: presets, parts and palettes =====================
   Every mascot is a bird drawn by the rig in js/core/rig.js from species art traced from the design
   sheets (js/core/birds.js). A look is { body, face, crest, beak, wing, tail, size, c }: body is the
   species, and the face (eyes and brows), crest, beak, wings and tail can each come from any species.
   c holds the learner's colors by region; anything left out keeps its species' own color.
   Never rename a preset id: learners' choices point at them. */
const PIP_PRESETS = {
  pip: { name: 'Pip', kind: 'parrot', blurb: 'Your travel buddy.',
    look: { body: 'pip', face: 'pip', crest: 'pip', beak: 'pip', wing: 'pip', tail: 'pip', size: 'm', c: {} } },
  rojo: { name: 'Rojo', kind: 'scarlet macaw', blurb: 'Big, bright and never quiet.',
    look: { body: 'rojo', face: 'rojo', crest: 'rojo', beak: 'rojo', wing: 'rojo', tail: 'rojo', size: 'l', c: {} } },
  kiwi: { name: 'Kiwi', kind: 'budgie', blurb: 'Small, quick and always chattering.',
    look: { body: 'kiwi', face: 'kiwi', crest: 'none', beak: 'kiwi', wing: 'kiwi', tail: 'kiwi', size: 's', c: {} } },
  kakadu: { name: 'Kakadu', kind: 'cockatoo', blurb: 'The crest shows every mood.',
    look: { body: 'kakadu', face: 'kakadu', crest: 'kakadu', beak: 'kakadu', wing: 'kakadu', tail: 'kakadu', size: 'm', c: {} } },
  mango: { name: 'Mango', kind: 'yellow-headed amazon', blurb: 'A parrot from Mexico with a sunny head.',
    look: { body: 'mango', face: 'mango', crest: 'mango', beak: 'mango', wing: 'mango', tail: 'mango', size: 'm', c: {} } }
};
const PIP_DEFAULT = 'pip';
/* parts a learner can mix, with their labels */
const PIP_PART_LABELS = { body: 'Body', face: 'Eyes', crest: 'Crest', beak: 'Beak', wing: 'Wings', tail: 'Tail' };
const PIP_SIZES = [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']];
/* color regions a learner can change; a species only shows the ones its art uses */
const PIP_PARTS = [
  ['body', 'Body'], ['head', 'Head'], ['belly', 'Belly'], ['face', 'Face'], ['ring', 'Eye rings'], ['wing', 'Wings'],
  ['patch', 'Shoulders'], ['band', 'Wing band'], ['tip', 'Wing tips'], ['crest', 'Crest'], ['crest2', 'Crest accent'],
  ['tail', 'Tail'], ['tail2', 'Tail accent'], ['beak', 'Beak'], ['cere', 'Nose'], ['mark', 'Markings'], ['feet', 'Feet']
];
/* one-tap color sets; `from` borrows a species' own colors. A palette changes colors only, never shape. */
const PIP_PALETTES = [
  { id: 'own', name: 'Its own colors', c: {} },
  { id: 'lagoon', name: 'Lagoon', from: 'pip' },
  { id: 'scarlet', name: 'Scarlet', from: 'rojo' },
  { id: 'meadow', name: 'Meadow', from: 'kiwi' },
  { id: 'snow', name: 'Snow', from: 'kakadu' },
  { id: 'jungle', name: 'Jungle', from: 'mango' },
  { id: 'sunset', name: 'Sunset', c: { body: '#F28A2E', head: '#F6A93B', belly: '#FFE3BF', wing: '#C45A1C', crest: '#E8364F', crest2: '#FFD25A', tail: '#E8364F', tail2: '#C45A1C', face: '#FFF3D6', ring: '#FFF3D6', beak: '#3A3A42', mark: '#E8364F', band: '#FFD25A', tip: '#7A2E12', patch: '#E8364F', cere: '#E8364F', feet: '#8C8C94' } },
  { id: 'berry', name: 'Berry', c: { body: '#8B3FB5', head: '#8B3FB5', belly: '#E9D5F7', wing: '#5E2785', crest: '#FF5FA2', crest2: '#FFC6E0', tail: '#FF5FA2', tail2: '#5E2785', face: '#FFFFFF', ring: '#FFC6E0', beak: '#F6E9D2', mark: '#FF5FA2', band: '#FFC6E0', tip: '#3A1659', patch: '#FF5FA2', cere: '#FF5FA2', feet: '#8C8C94' } },
  { id: 'midnight', name: 'Midnight', c: { body: '#2F4AA8', head: '#2F4AA8', belly: '#C9D6FF', wing: '#1E2F73', crest: '#FFC93C', crest2: '#FFE48A', tail: '#1E2F73', tail2: '#4C68C9', face: '#FFFFFF', ring: '#FFD447', beak: '#3A3A42', mark: '#FFD447', band: '#FFD447', tip: '#121C47', patch: '#FFC93C', cere: '#FFD447', feet: '#6E7480' } },
  { id: 'rose', name: 'Rose', c: { body: '#F27A98', head: '#F27A98', belly: '#F7A6BA', wing: '#A3A9B2', crest: '#FFD6E0', crest2: '#FFFFFF', tail: '#A3A9B2', tail2: '#C5CAD1', face: '#FFFFFF', ring: '#FFE3EA', beak: '#F3E4D3', mark: '#C2416A', band: '#FFD6E0', tip: '#6F7782', patch: '#FFD6E0', cere: '#C2416A', feet: '#9AA0A8' } }
];
/* swatches offered for each region, plus a free color picker */
const PIP_SWATCHES = ['#00787D', '#0C5F68', '#2E9E57', '#7DCB45', '#FFD447', '#F5B443', '#EA6138', '#E2352D', '#F27A98', '#8B3FB5', '#2F4AA8', '#2C6BE0', '#4F6BDF', '#CFE8F7', '#FBFAF6', '#F7F1D7', '#808B86', '#3A3A42'];

/* ===================== TALK SCENARIOS (cast plays each role) ===================== */
const SCENARIOS = [
  { id: 'cafe', cast: { de: 'lena', es: 'mateo' }, title: 'At a café', desc: 'Order, ask a question, pay.', prompt: 'You are a barista at a busy neighborhood café. The learner is a customer. Greet them, take their order, suggest something, and handle paying.' },
  { id: 'directions', cast: { de: 'weber', es: 'carmen' }, title: 'Asking directions', desc: 'Find the station or a pharmacy.', prompt: 'You are a helpful local on a street corner in a city center. The learner is a visitor asking for directions. Give clear, simple directions using left, right, straight ahead and landmarks.' },
  { id: 'market', cast: { de: 'emre', es: 'carmen' }, title: 'Market shopping', desc: 'Prices, quantities, paying.', prompt: 'You run a fruit and vegetable stand at an outdoor market. The learner is a customer. Offer produce, give prices per kilo, and handle quantities and paying.' },
  { id: 'smalltalk', cast: { de: 'jonas', es: 'mateo' }, title: 'Small talk', desc: 'Names, work, hobbies, weekend plans.', prompt: 'You are a friendly person the learner just met at a party. Make small talk about names, where you are from, work, hobbies and weekend plans, and share a little about yourself.' },
  { id: 'hotel', cast: { de: 'jonas', es: 'diego' }, title: 'Hotel check-in', desc: 'Your booking, breakfast, wifi.', prompt: 'You are the front-desk clerk at a mid-size city hotel. The learner is a guest checking in with a reservation. Ask for their name, confirm the dates, explain breakfast and wifi, and answer questions.' },
  { id: 'doctor', cast: { de: 'weber', es: 'sofia' }, title: 'At the doctor', desc: 'Describe how you feel.', prompt: 'You are a calm, kind doctor at a walk-in clinic. The learner is a patient who feels unwell. Ask about symptoms and how long they have had them, then give simple advice. Nothing serious is wrong.', min: 'A2' },
  { id: 'story', cast: { de: 'lena', es: 'diego' }, title: 'Tell a story', desc: 'Your last trip or weekend, in the past tense.', prompt: 'You are a curious friend. Ask the learner to tell you about a recent trip, weekend or memorable day, and keep asking follow-up questions that need past-tense answers.', min: 'B1' },
  { id: 'interview', cast: { de: 'emre', es: 'sofia' }, title: 'Job interview', desc: 'Experience, strengths, motivation.', prompt: 'You are a hiring manager interviewing the learner for a job in their field. Start by asking what role they are applying for, then ask about experience, strengths, a challenge they solved, and why they want the job.', min: 'B1' },
  { id: 'debate', cast: { de: 'jonas', es: 'mateo' }, title: 'Friendly debate', desc: 'Defend an opinion; the tutor disagrees.', prompt: 'You are a sharp but friendly debate partner. Offer the learner a choice of everyday debate topics (for example remote work, city versus country life, social media), then politely take the opposite side and push them to justify their view.', min: 'B2' },
  { id: 'news', cast: { de: 'weber', es: 'sofia' }, title: 'Talk about the news', desc: 'Society, tech and culture topics.', prompt: 'You are a well-read conversation partner. Discuss a general current-affairs theme the learner picks (technology, climate, travel, work culture), without claiming specific recent facts, and ask for their opinions and reasons.', min: 'B2' },
  { id: 'negotiate', cast: { de: 'emre', es: 'diego' }, title: 'Negotiation', desc: 'Rent, salary or a contract.', prompt: 'You are a landlord, employer or supplier (let the learner choose). Negotiate realistically, push back politely, and make the learner use formal, persuasive language to reach an agreement.', min: 'C1' },
  { id: 'ideas', cast: { de: 'weber', es: 'sofia' }, title: 'Ideas & culture', desc: 'Books, film, philosophy, nuance.', prompt: 'You are an erudite, witty conversation partner. Discuss books, films, art or big ideas the learner raises, using idiomatic, nuanced language, and challenge them to express subtle opinions.', min: 'C1' },
  { id: 'free', cast: { de: 'pip', es: 'pip' }, title: 'Free conversation', desc: 'Anything you like. The tutor follows.', prompt: 'You are a curious, friendly conversation partner. Let the learner choose the topics and keep the conversation going with follow-up questions.' }
];
