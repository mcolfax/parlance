"use strict";
/* ===================== APP CONFIG =====================
   One place for version, release notes, languages, levels, the XP economy, quests, badges and
   Talk scenarios. Change a value here and it applies everywhere.
   ====================================================== */
const APP_VERSION = '4.6.0';
const SCHEMA_VERSION = 5;          // bump when the saved-state shape changes; add a step to MIGRATIONS in state.js
/* The web version, for people without Claude (js/core/host.js, built by dev/web.js). Its accounts and database are
   our Supabase project. The key is Supabase's public, low-privilege one: every read and write goes through SQL
   functions that apply the same access rules as the artifact (dev/supabase.sql).
   email: whether the sign-in sheet offers email and password. Off for now: with no email service there are no
   password-reset links, so it's Google only. The email code is all still there; set it to true to bring it back. */
const WEB = { url: 'https://ibrweunxigetiazzuwiz.supabase.co', key: 'sb_publishable_bdrqx8iqQtN2iZqi5t_K2A_RKP7Mvg7', poll: 60000, email: false };
const RELEASES = [
  { v: '4.6.0', date: '2026-10-11', title: 'Learn with friends', notes: [
    'There’s a new Friends tab. Invite friends with a code or a link and you’re added to each other’s list.',
    'Race each other up the weekly league by XP, goal days or streak. It starts fresh every Monday.',
    'Challenge a friend to a week-long duel for the most XP, goal days or lessons. Win and you get a bonus.',
    'Send a cheer when a friend needs a nudge. Only friends you invite can see your card.'] },
  { v: '4.5.1', date: '2026-10-11', title: 'Google sign-in only, for now', notes: [
    'The web version signs in with Google only for now. If you used an email and password before, Continue with Google with the same address opens your account.'] },
  { v: '4.5.0', date: '2026-10-11', title: 'Meet the new Pip', notes: [
    'Pip is redrawn from the character sheet and is now alive: Pip breathes, blinks, glances around and moves with every mood, cheering when you get one right and looking worried when you miss.',
    'Tap Pip to make Pip hop and say something in your language. Pip’s beak moves while it talks.',
    'The web version’s Home Screen icon shows the new Pip.'] },
  { v: '4.4.2', date: '2026-10-11', title: 'Sign in with Google', notes: [
    'On the web version, Continue with Google now comes first. It’s the easiest way in, with no password to remember.'] },
  { v: '4.4.1', date: '2026-10-11', title: 'Easier to spot das', notes: [
    'German “das” words are now teal, so they stand out from the green buttons and from blue “der” words.'] },
  { v: '4.4.0', date: '2026-10-11', title: 'A fresh new look', notes: [
    'Parlance has a new look, Selva: leafy greens, palm green for German, mango for Spanish, rounder type and chunky buttons that are good to tap.',
    'On the web version you can now change your name, download a backup file, and reset a forgotten password.'] },
  { v: '4.3.1', date: '2026-10-11', title: 'Parlance on your Home Screen', notes: [
    'You can now add the web version of Parlance to your iPhone’s Home Screen. It opens full screen, with Pip as its icon. Me shows you how.'] },
  { v: '4.3.0', date: '2026-10-11', title: 'Parlance works without Claude', notes: [
    'There’s now a web version of Parlance for friends who don’t use Claude. They sign in with email and a password, or with Google, and their progress follows them to any device.',
    'On the web, lessons, review, stories, feedback and live updates all work. Talk, lessons on demand and tutor grading still need Claude.'] },
  { v: '4.2.0', date: '2026-10-11', title: 'Answers that count now tell you why', notes: [
    'When an answer counts but isn’t word for word, you’ll see why, with your answer next to the expected one and the differences highlighted.',
    'When your tutor accepts a different wording, it now lists what’s different, like a more casual word or a small change in meaning.',
    'Speaking exercises say how many words came through and mark the ones to try again.'] },
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
const XP = { perAnswer: 1, lesson: 5, perfectBonus: 5, review: 3, story: 8, storyPerfect: 4, chest: 15, talkPerMsg: 2, talkMax: 20, duelWin: 20 };
/* Friends (js/core/social.js, js/ui/friends.js). Friends must use the same home: the Claude artifact and the web version
   keep separate databases. links: where an invite sends people. duel: days a duel runs. answer: days a challenge waits
   for an answer. keep: days a finished duel stays on screen. history: days of activity your card shows friends (it has to
   cover a whole duel plus keep). max: how many friends you can have. */
const FRIENDS = { links: { claude: 'https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72', web: 'https://parlance-iota.vercel.app/' },
  duel: 7, answer: 3, keep: 7, history: 35, max: 30,
  metrics: { xp: { label: 'Most XP' }, goal: { label: 'Most goal days' }, lessons: { label: 'Most lessons' } },
  league: { xp: 'XP', goal: 'Goal days', streak: 'Streak' } };
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
  { id: 'friend', icon: 'people', name: 'Better together', desc: 'Add your first friend.' },
  { id: 'rival', icon: 'duel', name: 'Friendly rival', desc: 'Win a duel with a friend.' },
  { id: 'levelA1', icon: 'trophy', name: 'A1 complete', desc: 'Finish every A1 lesson in one language.' },
  { id: 'levelB1', icon: 'trophy', name: 'Halfway there', desc: 'Finish every B1 lesson in one language.' },
  { id: 'levelC2', icon: 'mountain', name: 'Summit', desc: 'Finish every C2 lesson in one language.' },
  { id: 'both', icon: 'globe', name: 'Bilingual', desc: 'Finish a lesson in both German and Spanish.' },
  { id: 'early', icon: 'sun', name: 'Early bird', desc: 'Practice before 8 a.m.' },
  { id: 'night', icon: 'moon', name: 'Night owl', desc: 'Practice after 10 p.m.' }
];

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
