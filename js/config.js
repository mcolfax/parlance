"use strict";
/* ===================== APP CONFIG =====================
   One place for version, release notes, languages, levels, the XP economy, quests, badges and
   Talk scenarios. Change a value here and it applies everywhere.
   ====================================================== */
const APP_VERSION = '4.22.0';
/* The languages Parlance teaches, in the order Learn and Me list them. Every per-language loop, saved slice and database
   path is built from this list, so a new language starts here (then LANGS, MEDIA.voice, SCENARIOS and CAST below). */
const LANG_IDS = ['de', 'es', 'it'];
const SCHEMA_VERSION = 9;          // bump when the saved-state shape changes; add a step to MIGRATIONS in state.js
/* The web version, for people without Claude (js/core/host.js, built by dev/web.js). Its accounts and database are
   our Supabase project. The key is Supabase's public, low-privilege one: every read and write goes through SQL
   functions that apply the same access rules as the artifact (dev/supabase.sql).
   email: whether the sign-in sheet offers email and password. Off for now: with no email service there are no
   password-reset links, so it's Google only. The email code is all still there; set it to true to bring it back. */
const WEB = { url: 'https://ibrweunxigetiazzuwiz.supabase.co', key: 'sb_publishable_bdrqx8iqQtN2iZqi5t_K2A_RKP7Mvg7', poll: 60000, email: false };
const RELEASES = [
  { v: '4.22.0', date: '2026-10-16', title: 'You’ll hear back', notes: [
    'When something you suggested gets built, Parlance now tells you the next time you open it, with a note about what changed.',
    'Feedback is sent from the web version. If you open Parlance inside Claude, Send feedback now points you there.'] },
  { v: '4.21.1', date: '2026-10-16', title: 'Wrong forms, explained', notes: [
    'Picking the wrong form in a “Choose the form” question now shows the Not quite message and the right answer, instead of leaving you stuck on the question.'] },
  { v: '4.21.0', date: '2026-10-15', title: 'Pictures and new faces', notes: [
    'New words now come with a picture when there is a clear one to show, like food, clothes, colors and places.',
    'Some lessons ask you to match a word with its picture, and the questions get harder as you move up the levels.',
    'The characters in stories and Talk have new portraits, drawn in the same sticker style.'] },
  { v: '4.20.3', date: '2026-10-15', title: 'Wings folded', notes: [
    'Your bird no longer holds its wings out to the side when it looks surprised or in love.'] },
  { v: '4.20.2', date: '2026-10-14', title: 'A dizzy bird', notes: [
    'Tap your bird again and again, fast, and see what happens.'] },
  { v: '4.20.1', date: '2026-10-14', title: 'Italian in the intro film', notes: [
    'The intro film now includes Italian: Rome and its six friends join Berlin and Mexico City, and the film ends with Andiamo!.'] },
  { v: '4.20.0', date: '2026-10-14', title: 'Italian', notes: [
    'Parlance now teaches Italian. It has the same 132 lessons as German and Spanish, from A1 to C2, with a checkpoint for every unit.',
    'Nine illustrated stories take place in Rome, with a new cast: Giulia, Luca, Nonna Rosa, Marco, Dottoressa Conti and Signor Bianchi. They also play your scenes in Talk.',
    'A natural recorded voice reads every Italian word, sentence and story. Pick Italian on Learn, or in Me.',
    'Your progress in German and Spanish is untouched, and Italian progress follows you to your other devices like the rest.'] },
  { v: '4.19.0', date: '2026-10-14', title: 'A new intro film', notes: [
    'The intro film is rebuilt, and it’s timed to the beat of the theme song.',
    'It now shows what Parlance has become: your bird and the four others you can pick, lessons that teach as you go with natural voices, the Talk tutor, stories you can tap through, Review, the Friends league and the A1 to C2 route.',
    'Watch it any time from Me.'] },
  { v: '4.17.0', date: '2026-10-14', title: 'Open in Claude, ChatGPT or Gemini', notes: [
    'On the web version, Talk, Lessons on demand and Me now have a button that opens Parlance in Claude, where the tutor lives.',
    'Pick a Talk scene and open it in Claude, ChatGPT or Gemini. The prompt sets the language, your level and the role, and asks for a correction after each message.',
    'Lessons on demand does the same for a lesson at your level on any topic. Gemini can’t take a prompt in a link, so Parlance copies it for you to paste.'] },
  { v: '4.16.1', date: '2026-10-14', title: 'Friends pictures', notes: [
    'Friends’ bird pictures are bigger and easier to see.',
    'Kiwi, Mango, Kakadu and Rojo now show up when you pick your picture on your friends card.'] },
  { v: '4.16.0', date: '2026-10-14', title: 'Heads up', notes: [
    'Tilt your phone and the birds keep their heads level, the way a chicken does.',
    'It eases off when the phone is lying flat, and on iPhone it asks to use the motion sensor the first time you touch the screen.'] },
  { v: '4.15.2', date: '2026-10-14', title: 'Friends, tidied up', notes: [
    'The Friends tab has its layout back: the weekly league, duels and your card are spaced and lined up properly.',
    'Stories has its layout back too: the cast, the story cards and the reading view.',
    'Pick Kiwi, Mango, Kakadu or Rojo as your picture on your friends card.'] },
  { v: '4.15.1', date: '2026-10-14', title: 'Five new badges', notes: [
    'Pass a unit checkpoint, pass five, or score 100% on one to earn Checkpoint cleared, Test-taker and Top marks.',
    'Fix 25 mistakes for Fixer-upper, and get 50 form questions right for Form master.'] },
  { v: '4.18.0', date: '2026-10-14', title: 'Lessons that teach as you go', notes: [
    'Lessons no longer open with a wall of text. You now get a short overview, and then new words arrive two or three at a time, each group followed by a question or two.',
    'The idea behind the lesson comes in small bites between the exercises, with its examples and forms table right where you need them.',
    'Every phrase is shown, with what it means and how it sounds, before you are asked it, and nothing is asked that uses a word you haven’t met yet.',
    'The Words button now shows the words you’ve met so far.'] },
  { v: '4.15.0', date: '2026-10-13', title: 'Forty more lessons in each language', notes: [
    'New units at every level, in German and in Spanish. A1: questions and small talk. A2: body and health. B1: cooking and eating, and travel and trouble. B2: careers, and society. C1: business and negotiation, and academic language. C2: nuance and humor, and culture and language.',
    'Each one opens with a full explanation and forms tables, like the rest of the course.',
    'Review has a new “Fix my mistakes” session: everything you recently got wrong, until you get it right.',
    '“Practice verb forms and endings” drills the tables from your lessons, and every lesson now ends with a couple of those questions.',
    'Each unit has a checkpoint: twelve questions once its lessons are done. Score 80% to pass.',
    'Not sure where to start? In Me, tap “Find my level”.'] },
  { v: '4.14.0', date: '2026-10-13', title: 'Why a form is off', notes: [
    'When you write the right word in the wrong form, such as the wrong ending for the person, Parlance now tells you what was off and which form the sentence needs.',
    'In A1 and A2 the answer still counts, so you can keep going while you learn the forms. From B1 on it doesn’t count, and the notes say why.',
    'In fill-in-the-blank, picking another form of the right word now says so, too.'] },
  { v: '4.13.0', date: '2026-10-13', title: 'Clearer lesson openings', notes: [
    'Every lesson now opens with a fuller explanation. It covers each verb ending, article, plural, tense and construction the lesson uses, with a table of the forms, so you know what to expect before you start.',
    'The examples in each opening are now sentences from the lesson itself.',
    'A new “Also in the sentences” list shows the forms and extra words the sentences use that you haven’t met yet, with what they mean.'] },
  { v: '4.12.0', date: '2026-10-13', title: 'More beginner lessons', notes: [
    'Eight new beginner units in German and in Spanish: home and colors, weather and seasons, shopping and clothes, and plans and invitations. That is 16 more lessons in each language, all in A1 and A2.',
    'The right answer is now read out loud on the question you just answered. Before, it could play after you had already moved on to the next one.'] },
  { v: '4.11.0', date: '2026-10-13', title: 'Meanings while you practice', notes: [
    'In a lesson, tap any underlined word in a sentence to see what it means, as in Duolingo. It works on sentences you translate, on the sentence you say out loud, and on fill-in-the-blank lines.',
    'While you’re starting out (A1 and A2), a Words button sits at the top of each lesson. It opens the lesson’s words and their meanings without leaving your place.',
    'After you answer, the words in the right answer can be tapped too.',
    'The help fades as you climb. It is tap-only in B1 and B2, and from C1 the translation under a blank waits behind a tap. Change this any time in Me, under Practice → Word hints.'] },
  { v: '4.10.2', date: '2026-10-12', title: 'Calmer wings', notes: [
    'Your bird now stands still after it waves hello. Before, a wing kept flapping up and down on the Learn screen, which looked odd, most of all on Kiwi, Mango, Kakadu and Rojo.',
    'On those four, a wing now opens into a whole wing as it lifts, instead of showing as a thin blade on the way up and down.'] },
  { v: '4.10.1', date: '2026-10-12', title: 'A voice for every bird', notes: [
    'Kiwi, Mango, Kakadu and Rojo now speak in natural voices of their own, light and friendly, and each one sounds different from the others and from Pip.'] },
  { v: '4.10.0', date: '2026-10-12', title: 'Choose your bird', notes: [
    'Pip has company. Kiwi the budgie, Mango the amazon parrot, Kakadu the cockatoo and Rojo the macaw can now learn with you instead. Pick one in Me, under Your bird.',
    'Each one is drawn from its own character sheet and does everything Pip does: it cheers, worries, dances, waves, talks and sleeps on every screen, in its own voice.',
    'Kakadu’s crest shows how it feels. It fans up when you get one right and folds down when you miss.',
    'Your bird follows you to your other devices when you sign in.'] },
  { v: '4.9.0', date: '2026-10-12', title: 'Natural voices', notes: [
    'A natural recorded voice now reads every word, sentence and story in the course, and it sounds the same on every phone.',
    'Every story character has a voice of their own, and so does Pip. The slow button and Relaxed speed slow the voice down without making it deeper.',
    'Talk and lessons made for you still use your phone’s voice. To use your phone’s voice for everything, turn off Natural voices in Me → Sound.'] },
  { v: '4.8.3', date: '2026-10-12', title: 'A voice for every phone', notes: [
    'If your phone doesn’t have the exact voice Parlance asks for, like Mexican Spanish on many Android phones, Parlance now uses the Spanish or German voice your phone does have.',
    'When the voice can’t play, Parlance tells you why in plain words, for example that your phone needs a Spanish voice, and Me → Sound’s voice test says the same.'] },
  { v: '4.8.2', date: '2026-10-12', title: 'Tap to hear on the web version', notes: [
    'On the web version, the theme song now plays the same way it does in Claude, so it no longer gets in the way of the voice on Android.',
    'The theme song turns down while the voice speaks, instead of stopping, then comes back up.',
    'If the voice still can’t play, Parlance tells you what to check, like silent mode.'] },
  { v: '4.8.1', date: '2026-10-12', title: 'A tidier top bar on iPhone', notes: [
    'On iPhone the top bar now fits the screen, so pages no longer slide sideways. On the smallest phones the Parlance name steps aside and the logo stays.'] },
  { v: '4.8.0', date: '2026-10-11', title: 'Learn with friends', notes: [
    'There’s a new Friends tab. Invite friends with a code or a link and you’re added to each other’s list.',
    'Race each other up the weekly league by XP, goal days or streak. It starts fresh every Monday.',
    'Challenge a friend to a week-long duel for the most XP, goal days or lessons. Win and you get a bonus.',
    'Send a cheer when a friend needs a nudge. Only friends you invite can see your card.'] },
  { v: '4.7.0', date: '2026-10-11', title: 'Pip’s whole repertoire', notes: [
    'Pip now uses every move it has. It waves hello on Learn, dances when you get a run of answers right or finish a lesson without a slip, nods when an answer counts but isn’t word for word, and shrugs, listens, points or looks proud where that fits.',
    'Tap Pip and it does something different each time: a hop, a wave, a look around, a little dance or a bow. Wake a sleeping Pip and it jumps.',
    'Pip looks over at whatever you tap, and its beak moves as its speech bubble pops up.',
    'Your picture on Me shows your initials, or your Google photo on the web version. With no name to go on, it shows a person instead of a stray letter, and on the web version there’s a Sign in link right under it.'] },
  { v: '4.6.0', date: '2026-10-11', title: 'New friends and a new chest', notes: [
    'Meet four new friends. In Berlin, Leyla is a pharmacist and Emre’s cousin, and Herr Brandt is Lena’s landlord. In Mexico City, Valentina drives a taxi and Andrés runs a family hotel. Each pair has a new story, and they play scenes in Talk.',
    'The daily chest has been redrawn. Open it to watch the lid flip back and the coins spill out.',
    'The theme song now plays on every tab and keeps going when you switch, right where it was. It still pauses for lessons, reviews, stories and Talk.',
    'Tap any word in a story to see what it means, even before your lessons teach it. Verb forms like “bezahlst” show the word they come from.',
    'On Learn, every level can be closed again, including the last one that’s open.',
    'On iPhone, Me now has an Add to Home Screen button that walks you through Safari’s steps.'] },
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
/* Media. The theme song plays under the intro film and loops softly behind the tabs.
   home/film are volume multipliers on the learner's music volume; duck is how low it goes while a voice speaks.
   voice: the recorded voices. dev/voices.js records every line the course can say with Google Cloud Text-to-Speech
   into dir; each speaker (the narrator, the cast, each bird in MASCOTS) has a Google voice per language. Google has no
   Mexican Spanish voices, so Spanish uses its Latin American US Spanish (es-US). Changing a voice here re-records that
   speaker. */
const MEDIA = { song: { title: 'ABC Adventure', filmStart: 0, fadeOut: 2.5, home: 0.6, film: 1, duck: 0.25,
  sources: [ // first one the browser can play wins: AAC for Safari/iPhone and Chrome, Opus for Chromium and Firefox builds without AAC
    { src: 'media/abc-adventure.mp4', type: 'audio/mp4; codecs="mp4a.40.2"' },
    { src: 'media/abc-adventure.webm', type: 'audio/webm; codecs="opus"' }] },
  voice: { dir: 'media/voice',
    de: { narrator: 'de-DE-Chirp3-HD-Erinome', pip: 'de-DE-Chirp3-HD-Leda', lena: 'de-DE-Chirp3-HD-Aoede', jonas: 'de-DE-Chirp3-HD-Puck', weber: 'de-DE-Chirp3-HD-Gacrux', emre: 'de-DE-Chirp3-HD-Algenib', leyla: 'de-DE-Chirp3-HD-Despina', brandt: 'de-DE-Chirp3-HD-Alnilam',
      kiwi: 'de-DE-Chirp3-HD-Laomedeia', mango: 'de-DE-Chirp3-HD-Callirrhoe', kakadu: 'de-DE-Chirp3-HD-Autonoe', rojo: 'de-DE-Chirp3-HD-Sadachbia' },
    es: { narrator: 'es-US-Chirp3-HD-Erinome', pip: 'es-US-Chirp3-HD-Leda', sofia: 'es-US-Chirp3-HD-Sulafat', diego: 'es-US-Chirp3-HD-Achird', carmen: 'es-US-Chirp3-HD-Vindemiatrix', mateo: 'es-US-Chirp3-HD-Zubenelgenubi', valentina: 'es-US-Chirp3-HD-Zephyr', andres: 'es-US-Chirp3-HD-Umbriel',
      kiwi: 'es-US-Chirp3-HD-Laomedeia', mango: 'es-US-Chirp3-HD-Callirrhoe', kakadu: 'es-US-Chirp3-HD-Autonoe', rojo: 'es-US-Chirp3-HD-Sadachbia' },
    it: { narrator: 'it-IT-Chirp3-HD-Erinome', pip: 'it-IT-Chirp3-HD-Leda', giulia: 'it-IT-Chirp3-HD-Aoede', luca: 'it-IT-Chirp3-HD-Puck', nonna: 'it-IT-Chirp3-HD-Gacrux', marco: 'it-IT-Chirp3-HD-Algenib', conti: 'it-IT-Chirp3-HD-Despina', bianchi: 'it-IT-Chirp3-HD-Alnilam',
      kiwi: 'it-IT-Chirp3-HD-Laomedeia', mango: 'it-IT-Chirp3-HD-Callirrhoe', kakadu: 'it-IT-Chirp3-HD-Autonoe', rojo: 'it-IT-Chirp3-HD-Sadachbia' } } };
/* The birds you can learn with (Me → Your bird). Pip's part sheet (js/core/pip.js) always loads; the others load when
   someone picks one (src). kind is what the bird is, as copy says it ("a budgie"). Its recorded voice is in MEDIA.voice;
   pitch and rate are its voice on the device (rate is recorded too). The drawings, moods and moves are in js/core and
   design/rig. */
const MASCOTS = {
  pip:    { name: 'Pip',    kind: 'parrot',        blurb: 'Chatty and curious. Repeats every word.', pitch: 1.35, rate: 1.0 },
  kiwi:   { name: 'Kiwi',   kind: 'budgie',        blurb: 'Small, quick and always cheerful.', pitch: 1.55, rate: 1.04, src: 'js/core/kiwi.js' },
  mango:  { name: 'Mango',  kind: 'amazon parrot', blurb: 'Sunny and steady. Never in a hurry.', pitch: 1.2, rate: 0.96, src: 'js/core/mango.js' },
  kakadu: { name: 'Kakadu', kind: 'cockatoo',      blurb: 'Wears every feeling on its crest.', pitch: 1.1, rate: 1.0, src: 'js/core/kakadu.js' },
  rojo:   { name: 'Rojo',   kind: 'macaw',         blurb: 'Big, bold and a little dramatic.', pitch: 0.95, rate: 0.98, src: 'js/core/rojo.js' }
};
/* XP economy */
const XP = { perAnswer: 1, lesson: 5, perfectBonus: 5, review: 3, story: 8, storyPerfect: 4, chest: 15, talkPerMsg: 2, talkMax: 20, duelWin: 20, checkpoint: 25 };
/* Unit checkpoints (a short test once a unit's lessons are done) and the placement test (Me → Starting level). */
const CHECKPOINT = { questions: 12, pass: 0.8 };
const PLACEMENT = { perLevel: 5, pass: 3 };
/* Friends (js/core/social.js, js/ui/friends.js). Friends must use the same home: the Claude artifact and the web version
   keep separate databases. links: where an invite sends people. duel: days a duel runs. answer: days a challenge waits
   for an answer. keep: days a finished duel stays on screen. history: days of activity your card shows friends (it has to
   cover a whole duel plus keep). max: how many friends you can have. */
const FRIENDS = { links: { claude: 'https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72', web: 'https://parlance-iota.vercel.app/' },
  duel: 7, answer: 3, keep: 7, history: 35, max: 30,
  metrics: { xp: { label: 'Most XP' }, goal: { label: 'Most goal days' }, lessons: { label: 'Most lessons' } },
  league: { xp: 'XP', goal: 'Goal days', streak: 'Streak' } };
/* Chat apps a learner can hand a practice prompt to (js/core/caps.js, aiPicker). url(prompt) is the link that opens the
   app. Claude and ChatGPT take the prompt in the link. Gemini can't, so copy: true copies it first for the learner to paste. */
const AI_APPS = [
  { id: 'claude', name: 'Claude', url: p => 'https://claude.ai/new?q=' + encodeURIComponent(p) },
  { id: 'chatgpt', name: 'ChatGPT', url: p => 'https://chatgpt.com/?q=' + encodeURIComponent(p) },
  { id: 'gemini', name: 'Gemini', url: () => 'https://gemini.google.com/app', copy: true }
];
/* ===================== LANGUAGES & LEVELS ===================== */
const LANGS = {
  de: { code: 'de', name: 'German', native: 'Deutsch', tts: 'de-DE', prefs: ['de-DE', 'de-AT', 'de-CH', 'de'],
    chars: ['ä', 'ö', 'ü', 'ß'], articles: ['der', 'die', 'das'], keyboard: 'Deutsch', variety: 'Standard High German',
    hello: 'Hallo!', test: 'Hallo! Schön, dich kennenzulernen.',
    dialect: 'Use standard High German. Use du unless the setting is formal (hotel, doctor, office, interview, police), then use Sie.' },
  es: { code: 'es', name: 'Spanish', native: 'Español', tts: 'es-MX', prefs: ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-CL', 'es-ES', 'es'],
    chars: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'], articles: ['el', 'la', 'los', 'las'], keyboard: 'Español (México)', variety: 'Latin American Spanish',
    hello: '¡Hola!', test: '¡Hola! Mucho gusto.',
    dialect: 'Use Latin American Spanish: ustedes, never vosotros, and Latin American vocabulary (boleto, departamento, carro, celular).' },
  it: { code: 'it', name: 'Italian', native: 'Italiano', tts: 'it-IT', prefs: ['it-IT', 'it-CH', 'it'],
    chars: ['à', 'è', 'é', 'ì', 'ò', 'ó', 'ù'], articles: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'], keyboard: 'Italiano', variety: 'Standard Italian',
    hello: 'Ciao!', test: 'Ciao! Piacere di conoscerti.',
    dialect: 'Use standard Italian. Use tu unless the setting is formal (hotel, doctor, office, interview, official business), then use Lei. Write elisions with a typographic apostrophe (l’acqua, un’amica).' }
};
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
/* Word hints: how much meaning a question shows, by the level of the lesson (Me → Practice → Word hints can override this).
   full: tap any word of a sentence for its meaning, a nudge says so, and the lesson's words are one tap away
   tap:  the same tappable words, with no nudge and no word list
   off:  questions show nothing extra; answers can still be tapped afterwards */
const HINTS = { A1: 'full', A2: 'full', B1: 'tap', B2: 'tap', C1: 'off', C2: 'off' };
/* Picture questions: the kind a lesson asks by level, and how many (at most one per group of new words, in place of a plain recognition question).
   pic-pick: hear and read the word, tap its picture. pic-name: see the picture, choose the word. pic-type: see the picture, type the word.
   Only words whose picture is safe to ask about are used (design/pictures/briefs-src.txt, quiz 1); see "Word pictures" in docs/ARCHITECTURE.md. */
const PIC_EX = { A1: 'pic-pick', A2: 'pic-pick', B1: 'pic-name', B2: 'pic-name', C1: 'pic-type', C2: 'pic-type', perLesson: 2 };
/* Wrong form of the right word (a wrong ending, person or tense): in the early levels the answer still counts and says what was off;
   from B1 on it does not count, and says why. */
const FORM_PASS = { A1: true, A2: true, B1: false, B2: false, C1: false, C2: false };
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
  { id: 'stories8', icon: 'book', name: 'Storyteller', desc: 'Finish every story in one language.' },
  { id: 'talk', icon: 'chat', name: 'Chatterbox', desc: 'Send your tutor 5 messages in one conversation.' },
  { id: 'chest7', icon: 'chest', name: 'Treasure hunter', desc: 'Open 7 daily chests.' },
  { id: 'friend', icon: 'people', name: 'Better together', desc: 'Add your first friend.' },
  { id: 'rival', icon: 'duel', name: 'Friendly rival', desc: 'Win a duel with a friend.' },
  { id: 'levelA1', icon: 'trophy', name: 'A1 complete', desc: 'Finish every A1 lesson in one language.' },
  { id: 'levelB1', icon: 'trophy', name: 'Halfway there', desc: 'Finish every B1 lesson in one language.' },
  { id: 'levelC2', icon: 'mountain', name: 'Summit', desc: 'Finish every C2 lesson in one language.' },
  { id: 'checkpoint1', icon: 'flag', name: 'Checkpoint cleared', desc: 'Pass your first unit checkpoint.' },
  { id: 'checkpoint5', icon: 'trophy', name: 'Test-taker', desc: 'Pass 5 unit checkpoints.' },
  { id: 'checkpoint100', icon: 'target', name: 'Top marks', desc: 'Score 100% on a unit checkpoint.' },
  { id: 'fixer', icon: 'stack', name: 'Fixer-upper', desc: 'Fix 25 mistakes in Fix my mistakes.' },
  { id: 'forms50', icon: 'abc', name: 'Form master', desc: 'Get 50 form questions right.' },
  { id: 'both', icon: 'globe', name: 'Bilingual', desc: 'Finish a lesson in two different languages.' },
  { id: 'early', icon: 'sun', name: 'Early bird', desc: 'Practice before 8 a.m.' },
  { id: 'night', icon: 'moon', name: 'Night owl', desc: 'Practice after 10 p.m.' }
];

/* ===================== TALK SCENARIOS (cast plays each role) ===================== */
const SCENARIOS = [
  { id: 'cafe', cast: { de: 'lena', es: 'mateo', it: 'giulia' }, title: 'At a café', desc: 'Order, ask a question, pay.', prompt: 'You are a barista at a busy neighborhood café. The learner is a customer. Greet them, take their order, suggest something, and handle paying.' },
  { id: 'directions', cast: { de: 'leyla', es: 'valentina', it: 'luca' }, title: 'Asking directions', desc: 'Find the station or a pharmacy.', prompt: 'You are a helpful local on a street corner in a city center. The learner is a visitor asking for directions. Give clear, simple directions using left, right, straight ahead and landmarks.' },
  { id: 'market', cast: { de: 'emre', es: 'carmen', it: 'marco' }, title: 'Market shopping', desc: 'Prices, quantities, paying.', prompt: 'You run a fruit and vegetable stand at an outdoor market. The learner is a customer. Offer produce, give prices per kilo, and handle quantities and paying.' },
  { id: 'smalltalk', cast: { de: 'jonas', es: 'mateo', it: 'luca' }, title: 'Small talk', desc: 'Names, work, hobbies, weekend plans.', prompt: 'You are a friendly person the learner just met at a party. Make small talk about names, where you are from, work, hobbies and weekend plans, and share a little about yourself.' },
  { id: 'hotel', cast: { de: 'jonas', es: 'andres', it: 'bianchi' }, title: 'Hotel check-in', desc: 'Your booking, breakfast, wifi.', prompt: 'You are the front-desk clerk at a mid-size city hotel. The learner is a guest checking in with a reservation. Ask for their name, confirm the dates, explain breakfast and wifi, and answer questions.' },
  { id: 'doctor', cast: { de: 'weber', es: 'sofia', it: 'conti' }, title: 'At the doctor', desc: 'Describe how you feel.', prompt: 'You are a calm, kind doctor at a walk-in clinic. The learner is a patient who feels unwell. Ask about symptoms and how long they have had them, then give simple advice. Nothing serious is wrong.', min: 'A2' },
  { id: 'story', cast: { de: 'lena', es: 'diego', it: 'marco' }, title: 'Tell a story', desc: 'Your last trip or weekend, in the past tense.', prompt: 'You are a curious friend. Ask the learner to tell you about a recent trip, weekend or memorable day, and keep asking follow-up questions that need past-tense answers.', min: 'B1' },
  { id: 'interview', cast: { de: 'emre', es: 'sofia', it: 'giulia' }, title: 'Job interview', desc: 'Experience, strengths, motivation.', prompt: 'You are a hiring manager interviewing the learner for a job in their field. Start by asking what role they are applying for, then ask about experience, strengths, a challenge they solved, and why they want the job.', min: 'B1' },
  { id: 'debate', cast: { de: 'jonas', es: 'mateo', it: 'luca' }, title: 'Friendly debate', desc: 'Defend an opinion; the tutor disagrees.', prompt: 'You are a sharp but friendly debate partner. Offer the learner a choice of everyday debate topics (for example remote work, city versus country life, social media), then politely take the opposite side and push them to justify their view.', min: 'B2' },
  { id: 'news', cast: { de: 'weber', es: 'sofia', it: 'nonna' }, title: 'Talk about the news', desc: 'Society, tech and culture topics.', prompt: 'You are a well-read conversation partner. Discuss a general current-affairs theme the learner picks (technology, climate, travel, work culture), without claiming specific recent facts, and ask for their opinions and reasons.', min: 'B2' },
  { id: 'negotiate', cast: { de: 'brandt', es: 'andres', it: 'bianchi' }, title: 'Negotiation', desc: 'Rent, salary or a contract.', prompt: 'You are a landlord, employer or supplier (let the learner choose). Negotiate realistically, push back politely, and make the learner use formal, persuasive language to reach an agreement.', min: 'C1' },
  { id: 'ideas', cast: { de: 'weber', es: 'sofia', it: 'nonna' }, title: 'Ideas & culture', desc: 'Books, film, philosophy, nuance.', prompt: 'You are an erudite, witty conversation partner. Discuss books, films, art or big ideas the learner raises, using idiomatic, nuanced language, and challenge them to express subtle opinions.', min: 'C1' },
  { id: 'free', cast: { de: 'pip', es: 'pip', it: 'pip' }, title: 'Free conversation', desc: 'Anything you like. The tutor follows.', prompt: 'You are a curious, friendly conversation partner. Let the learner choose the topics and keep the conversation going with follow-up questions.' }
];
