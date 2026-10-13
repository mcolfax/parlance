# Parlance architecture

Parlance is a static web app published as one multi-file Claude artifact. There is no build step: the files you see are the files that run. `index.html` loads the stylesheets and classic (non-module) scripts in a fixed order, and each later script can use anything an earlier one defined.

## Where things live

| Path | What it is | Change it when you want to… |
|---|---|---|
| `styles/tokens.css` | Design tokens: every color, type role, radius, spacing step, shadow, motion curve and layer | restyle anything globally |
| `styles/base.css` | Reset, typography, buttons, chips, cards, fields, toggles, tab bar, overlays, sheets, toasts | change a shared building block |
| `styles/art.css` | Pip's box and speech bubble, cast portraits, unit signs, story scenes, medals, the word popover | change illustrations |
| `styles/components.css` | Screen-level styles grouped by feature | change one screen |
| `styles/film.css`, `styles/features.css` | Intro film; feedback, Studio, update banner, What's new | change those features |
| `styleguide.html` | Living style guide rendered from the tokens and art functions | review the design system |
| `js/config.js` | Version, release notes, XP economy, daily quests, badges, Talk scenarios, the birds learners can pick (`MASCOTS`) | tune the game or ship a version |
| `js/core/util.js` | DOM helper `h()`, dates, hashing, icons, particles, haptics | add an icon or helper |
| `js/core/text.js` | Answer normalization, typo/accent tolerance, word-by-word comparison of an answer that counts with the expected one, glossary index | change how answers are checked |
| `js/core/content.js` | Content helpers, course assembly, live pack validation, stable review keys | change how content is organized |
| `js/core/state.js` | Saved state, migrations, merging, account sync, backup codes | change what is saved |
| `js/core/audio.js` | Speech (recorded voices first, then the device's voice), the synthesized sound library (`SOUNDS`), the music sequencer, the theme-song player (`Song`) | add or tune a sound, change how music behaves |
| `media/` | The theme song in two formats: `abc-adventure.mp4` (AAC, for Safari/iPhone and Chrome) and `abc-adventure.webm` (Opus, for browsers without AAC) | swap the song |
| `media/voice/`, `dev/voices.js` | The recorded voices: an index per language and mp3 packs, made by `dev/voices.js` with Google Cloud Text-to-Speech | after content changes, or to change a voice |
| `js/core/engine.js` | XP, streaks, spaced repetition, quests, badges, lesson status, exercises, grading | change learning logic |
| `js/core/remote.js` | Live content packs, update banner, announcements, What's new, sharing a lesson | change live updates |
| `js/core/host.js` | The web version's accounts and database: the same `window.claude.use()` surface, backed by Supabase | change how the web version signs in or stores data |
| `js/core/social.js` | Friends: cards, invite codes, the inbox handshake, duels and cheers (see "Friends" below) | change how friends connect or what they share |
| `js/core/rig.js`, `js/core/bird.js`, `js/core/pip.js` | The birds' rig: the SVG runtime (blending, moves, blinks, springs, the head turn), the shared bird (skeleton, poses, faces, moods, moves) and Pip's part sheet traced from the model sheet. `design/rig/` holds the Blender files, the tracing tools and the review pages | change how a bird looks or moves (read `design/rig/README.md` first) |
| `js/core/kiwi.js`, `mango.js`, `kakadu.js`, `rojo.js` | The other birds' part sheets, traced the same way. Not in `index.html`: one loads when a learner picks that bird (see "Your bird" below) | change how that bird looks |
| `js/core/art.js` | `pip()` (the learner's bird, alive: it moves and talks when tapped and looks where you touch) and `pipSVG()` (a still), loading a picked bird (`loadMascot`), cast portraits, unit signs, scenes, chest, medals (pure SVG) | change illustrations |
| `content/*.js` | Lessons, stories, cast, glossary (data only) | add or fix built-in content |
| `js/ui/*.js` | One file per screen: learn, review, stories, talk, friends, me, runner (lessons), onboarding, film, feedback, studio | change a screen |
| `js/main.js` | Boot order | rarely |
| `dev/test.js` | End-to-end tests (jsdom) | run before every publish |
| `dev/preview.py`, `dev/files.js` | Local preview server; the list of files to publish | rarely |
| `dev/web.js`, `vercel.json` | Builds the web version into `dist/` (page, Home Screen manifest and icon tags); Vercel runs it on every push to `main` | change how the web version is served |
| `dev/icons.js`, `media/icons/` | Draws the web version's Home Screen icons from Pip's art and the tokens (the icon is always Pip) | Pip changes |
| `dev/keep-awake.js`, `.github/workflows/keep-awake.yml` | Reads the web database three times a day so the free Supabase project isn't paused; a failed run means it's down | rarely |
| `dev/supabase.sql` | The web version's database: the document table and the SQL functions that enforce the access rules | add a database path or rule |

## Two homes: Claude and the web

The same files run in two places.

- **The Claude artifact.** The Claude runtime gives the page `window.claude`: the signed-in person, the shared database and the tutor. Tutor use counts toward each person's own Claude plan.
- **The web version**, for people without Claude. Vercel builds it from `main` with `dev/web.js`, which wraps `index.html` in a full page that sets `window.PARLANCE_WEB`. `js/core/host.js` sees that flag and provides the same `window.claude.use('db' | 'user')` surface from our Supabase project (`WEB` in `config.js`), so sync, live content, feedback, names, sharing and Studio work without Claude. People sign in with Google through Supabase Auth. Email and password sign-in is built but switched off (`WEB.email`) until there is an email service for password-reset links; Supabase's built-in email only reaches project members.
- The tutor features (Talk, lessons on demand, tutor grading, Studio synthesis) need Claude. On the web they show the same "needs Claude" notices as a signed-out Claude page.
- The two homes keep separate data: accounts, progress, feedback, proposals, friends and live content. A backup code moves progress between them, but not friends. `content/config.latest` and any live pack must be written to each home that should get it.
- Friends must use the same home. An invite code says which home it's from (`Pc1…` for Claude, `Pw1…` for the web), and Parlance explains when someone pastes one from the other home.
- On the web, every database call goes through SQL functions (`doc_get`, `doc_list`, `doc_set`, `doc_update`) that apply the same rules as the artifact (`dev/supabase.sql`). The tables themselves are closed to clients, so the public key in `config.js` can't reach anything else. Owners are listed in `public.owners`.
- Live content on the web is checked every minute while the page is open, instead of being pushed.

## Progress is never lost

- Each person's progress lives in their own private database documents (`data/users/<id>/core|de|es|gen-de|gen-es|social`), mirrored in their browser. Republishing the app never touches them. `social` holds their friend list, duels and the secret part of their invite code.
- Lessons and stories are keyed by **id**. Never rename or reuse an id. Moving a lesson to another unit or changing its text is safe.
- Review cards use **stable item keys**: `lessonId|v|~<normalized target text>`. Reordering or adding items is safe. If you change an item's target text, its card is orphaned (kept, but unused); to carry it over, add an alias in a pack (`aliases: { "old key": "new key" }`).
- Saved state is versioned (`SCHEMA_VERSION` in `config.js`). When the saved shape changes, add an idempotent step to `MIGRATIONS` in `state.js`.
- Loads and merges keep fields they don't recognize, so an older open tab never drops data a newer version wrote.
- Keep the storage key `parlance.v2` and the database document paths as they are.

## Shipping an update

1. Make the change in the relevant file(s).
2. Bump `APP_VERSION` and add a `RELEASES` entry in `js/config.js`. People who were already learning see What's new once.
3. If lesson or story text changed, run `node dev/voices.js` to record the new lines (see Recorded voices).
4. Run `npm ci && npm test`. It must report `FAIL 0`.
5. Commit to `main` in GitHub (`mcolfax/parlance`); Vercel deploys the web version from it. Then republish the same artifact URL with `index.html` as the page and the files `node dev/files.js` lists. Unchanged files are kept.
6. In Studio → Content, tap **Mark <version> as latest**, in each version. Anyone with Parlance open gets a Refresh banner. Their progress stays.

## The theme song

`MEDIA.song` in `js/config.js` describes it: title, the two source files, where the film starts in the song, the fade at the end of the film, and volume multipliers for home, film and ducking under speech.

- **Behind the tabs.** The song loops softly on every tab (Learn, Stories, Review, Talk, Friends, Me) while nothing else is open and the page is visible. Switching tabs leaves it playing where it is; it never starts over. It starts on the learner's first tap, because browsers don't allow sound before one. It pauses in lessons, review sessions, stories, Talk chats and the film, and picks up from the same spot when they close. The note button on every tab's top bar and **Me → Sound** turn it off and set the music volume. A speaking voice turns it down (`MEDIA.song.duck`). Speech starts inside the tap that asked for it (Safari on iPhone needs that) and, if a word is still playing, 70ms after cancelling it (Chrome can drop a word spoken straight after a cancel). Phones don't all have the same voices, so if the best voice is refused or stays silent it tries the plain language (`es`, `de`), then any other installed voice, and if nothing plays it says why in plain words (`voiceTrouble()`). See `speak()` in `js/core/audio.js`.
- **Intro film.** The film plays the song from its own playhead, so pausing, scrubbing and replaying stay in sync. While the song is running, the playhead follows the song's clock. If the song can't play, the film falls back to its synthesized score (`filmScore()` in `js/ui/film.js`).
- **How it plays.** The file is fetched once and played from a local copy. On iPhone and iPad its volume runs through Web Audio, the only way to set volume there; everywhere else the audio element's own volume is used, because on Android a song running through Web Audio could keep the speaking voice from being heard. If the local copy is refused, it plays the file directly.
- **To swap the song**, encode the new track into both formats with the same names, or change `MEDIA.song.sources`:
  `ffmpeg -i song.wav -c:a aac -b:a 128k -movflags +faststart media/abc-adventure.mp4` and `ffmpeg -i song.wav -c:a libopus -b:a 96k media/abc-adventure.webm`. Bump the version so people get the Refresh banner.

## Your bird

Pip is the bird every learner starts with. In Me → Your bird, anyone can pick Kiwi the budgie, Mango the amazon parrot, Kakadu the cockatoo or Rojo the macaw instead (`MASCOTS` in `config.js`; Parlance 4.10.0).

- **One skeleton, five part sheets.** Every bird has the same moods and moves (`js/core/bird.js`), so screens ask `pip(mood)` for a mood and get the learner's bird. Each bird's colors are tokens (`--kiwi-body` …); their effects follow Pip's.
- **Loaded when picked.** Only Pip's part sheet is in `index.html`. `loadMascot(id)` adds `js/core/<id>.js` with a script tag; `Bird.make` registers each bird in `Bird.birds`. The picker loads all four as it opens. A learner who picked another bird gets its part sheet before the first screen (`js/main.js` waits up to 2.5 s, then Pip stands in until it arrives). A bird picked on another device loads on the next redraw (`ensureMascot`).
- **Saved and synced.** The choice is `settings.mascot` (schema 6), so it syncs with the other settings. A bird this version doesn't know is kept in the settings and drawn as Pip.
- **Where it shows.** Every `pip()` and `pipSVG()` (screens, the intro film, the feedback sheet), `avatar('pip')`, and `cast('pip')`, which gives the bird's name and voice wherever Pip speaks (Talk, the lesson finish). Its recorded voice is `MEDIA.voice[lang][id]` (see "Recorded voices"); `recWho()` knows the bird by its id. Copy that names Pip uses `mascot().name`. Two places stay Pip: the Home Screen icon, and a friend's picture when they chose Pip (`avatar(id, size, cls, true)`).

## Recorded voices

The course is read by recorded neural voices instead of the phone's built-in ones. They are made ahead of time, so both homes play the same files, nothing is called while someone learns, and no key sits in the page.

- **What gets recorded.** `voiceLines()` in `js/core/audio.js` lists every line the built-in course can say: each lesson word and sentence in every accepted form, filled-in blanks, tip examples, story lines in their speaker's voice, the birds' lines (each bird records them, with its hello from the picker), and every single word (for tap-a-word and word tiles).
- **Who reads it.** `MEDIA.voice` in `js/config.js` gives each speaker a Google voice per language: a narrator for lessons and single words, each cast member, and each bird. A cast member's `rate` in `content/cast.js` (a bird's in `MASCOTS`) is recorded into their lines. A bird with no recordings in the index yet speaks with the device's voice at its own pitch, never in another speaker's recording. Spanish uses Google's US Spanish voices (`es-US`), its Latin American Spanish, because Google has no Mexican Spanish ones.
- **Files.** `media/voice/<lang>.json` maps each line (lowercased, spacing and apostrophes evened out) to a clip: `[pack, byte offset, byte length]`. The packs are mp3 files: `<lang>-common` (greetings, the voice test, the birds), one per unit named for its first lesson (`de-1-1.mp3`) and `<lang>-stories`. Each clip is a complete mp3, so it plays on its own.
- **Playing.** `speak()` looks the line up and plays the clip through one audio element, which an iPhone plays in silent mode like other media and can slow down without lowering the voice (the slow button and the Relaxed speed). The first tap unlocks that element. A lesson, review or story fetches its packs when it opens. If the page can't play a local copy, the clip goes through Web Audio.
- **Everything else uses the device's voice**: Talk, lessons made on demand, live packs, saved sentences, and any line not recorded yet. So does everything when **Me → Sound → Natural voices** is off. A speaker with no recording of a line uses the narrator's.
- **Recording.** `node dev/voices.js` loads the app, keeps every clip already recorded with the same voice and speed, records only new lines, rewrites the packs and indexes, and deletes packs that no longer have lines. `--dry` counts what it would record; `--list` lists Google's voices; `--only de-common,de-1-1` records new lines only in those packs. The key is a Google Cloud API key restricted to the Text-to-Speech API. It lives in the Claude Code environment as a network secret for `texttospeech.googleapis.com` that adds the header `X-Goog-Api-Key` (no prefix), so sessions never see it; a `GOOGLE_TTS_KEY` environment variable works too. It never goes in the repo.
- **Cost: never.** Learners never call Google; the app only plays the files. Recording is billed per character after the first million a month (Pacific time), at US$30 per million, and the whole course is about 74,000. `dev/voices.js` keeps a running total per month in `dev/voice-usage.json` and refuses any run that would take the month past 900,000, with no flag to override it. It counts UTF-8 bytes (more than Google counts), counts each line before asking for it, and saves the total as it goes. Commit `dev/voice-usage.json` with the recordings so the next session sees it. `--max-chars` (300,000 by default) also limits a single run.
- **Changing a voice.** Edit `MEDIA.voice` and run `dev/voices.js`; only that speaker's lines are recorded again. To choose by ear first, `node dev/voices.js --audition de "Super! Toll gemacht!" Leda,Autonoe --out <folder>` records one line in each named Chirp 3 HD voice (it counts toward the monthly cap). The birds' voices are meant to be light, friendly and different from each other, from the narrator and from the cast.

## Live content without a release

The shared database collection `content/` is readable by everyone and writable only by the owner.

- `content/<packId>` with `kind: "pack"` adds content for every learner as soon as it's written:

```json
{
  "kind": "pack", "lang": "de", "title": "Bike shop bonus", "enabled": true, "minApp": "4.0.0",
  "units": [{ "title": "Bonus lessons", "level": "A2", "art": "Around town", "lessons": [
    { "id": "de-p1-1", "title": "At the bike shop",
      "tip": { "title": "Separable verbs", "body": "The prefix goes to the end: **Ich pumpe den Reifen auf.**", "examples": [["Ich repariere das Fahrrad.", "I’m fixing the bike."]] },
      "vocab": [["das Fahrrad", "bike|bicycle", "n"]],
      "sentences": [["Mein Fahrrad ist kaputt.", "My bike is broken."]],
      "blanks": [["Ich ___ das Fahrrad.", "repariere|reparierst|repariert", "I’m fixing the bike."]] } ] }],
  "lessons": [ { "id": "de-1-1", "title": "…same shape, replaces the built-in lesson with this id…" } ],
  "stories": [ { "id": "de-s9", "level": "B1", "title": "…", "en": "…", "scene": "cafe",
    "items": [["lena", "Guten Morgen!", "Good morning!"], ["?", "Who speaks first?", "Lena|Jonas|Emre"]] } ],
  "aliases": { "de-1-1|v|~old_text": "de-1-1|v|~new_text" }
}
```

  Packs are validated on every device: a lesson needs 4+ vocab, 3+ sentences, and blanks with exactly one `___` and distinct options; story speakers must be cast members. Anything invalid is skipped, and the problem is listed in Studio → Content. `enabled: false` hides a pack for everyone.
- `content/config` with `kind: "config"` holds `latest` (drives the Refresh banner) and `announce: { id, title, body }` (shown once to everyone).
- In the app, the owner can share any tutor-written lesson with all learners from its intro screen. It becomes part of `content/bonus-<lang>`, and its id stays the same, so progress carries over.

## Friends

The Friends tab (`js/ui/friends.js`, data side in `js/core/social.js`) has a weekly league (XP, goal days or streak, Monday to Sunday), week-long duels between two friends (most XP, goal days or lessons; the winner gets `XP.duelWin`), and cheers. The numbers live in `FRIENDS` and `XP` in `config.js`.

- **Your card** is a small public summary at `cards/<your id>/<secret>/card`: the name and picture you chose, streak, levels, badge count and your last `FRIENDS.history` days of XP, lessons and goal days, plus your duels and cheers. It updates a few seconds after you make progress.
- **The secret** is the hidden part of your path and of your invite code (`Pc1.<secret>.<your id>`). Nobody can list cards or inboxes, so only people you invite can find yours.
- **Inviting.** When a friend adds your code, Parlance adds you to their list and leaves their own code at `inbox/<your id>/<secret>/<their id>`. Your app reads the inbox, adds them back and deletes the note. On the web, the invite is also a link (`?friend=<code>`) that waits in the browser through sign-in.
- **Removing** a friend gives you a new secret: your card moves, the old path is deleted and every remaining friend gets the new code in their inbox. **Leave Friends** removes everyone and deletes your card.
- **Duels** sit on both cards. The challenger lists it, the friend who accepts sets the dates, and both sides score the week from the days on both cards. A duel settles a day or two after it ends, once both cards cover the last day.
- Friends' cards are other people's input: `cleanCard()` keeps only the expected fields and sizes, and everything is drawn as text.

## Feedback → proposals → approval → build

1. Learners send notes from Me, from Report on any exercise, and with the one-tap "Too easy / Just right / Too hard" on every finish screen. Notes go to `feedback/<their id>` (only the owner can read them). Viewers who can't write keep notes in a browser outbox, and can leave a page comment or copy the note instead.
2. In **Studio** (Me → Studio, owner only), **Turn new feedback into proposals** asks Claude to group the notes into proposals at `proposals/<id>` with `status: "pending"`.
3. The owner approves or rejects each proposal and can add notes for the builder. Nothing is built without approval.
4. The weekly build task (or any Claude session given the build brief) implements only `approved` proposals, runs the tests, bumps the version, republishes, marks the version latest, and sets each proposal to `status: "shipped"` with `version`.

Database rules declared at publish:

```
content          read: view   write: owner
proposals        read: owner  write: owner
feedback         read: owner  write: owner
feedback/{self}  read: interact  write: interact
cards            read: interact  write: owner
cards/{self}     write: interact
inbox            read: interact  write: interact
data/users/{self}  (platform default: private to each person)
```

## Conventions

- Style through tokens: `font: var(--type-label)`, `border-radius: var(--r-md)`, `z-index: var(--z-sheet)`. Don't write new literal colors.
- Every sound is a named entry in `SOUNDS`; call `sfx('name')`. Music goes through `Song` and `MEDIA.song`, never a new `<audio>`.
- XP amounts, quests, badges and scenarios are data in `config.js`, not literals in screens.
- Everything a learner reads is plain, warm English in sentence case.
- Every word in a built-in story has a meaning when tapped: from the lessons, `COMMON_GLOSS`, `STORY_GLOSS` (both in `content/glossary.js`) or a cast member's name. `glossLookup()` also finds dictionary forms from common endings (bezahlst → bezahlen, vende → vender). When you add or change a story, `npm test` lists any word that still needs a `STORY_GLOSS` entry. Words outside the built-in content (Talk, live packs) are looked up by the tutor when Claude is there; otherwise the popover shows the whole line's translation.

## Practice beyond lessons

- **Word hints** (`HINTS` in `config.js`, `hintMode()` in `engine.js`): sentence prompts, blanks and answers can be tapped for a word's meaning; the help fades by level (A: full, B: tap only, C: off) and `settings.hints` overrides it. `lessonForms()` lists the forms and extra words a lesson's sentences use that earlier lessons haven't shown.
- **Forms tables in tips**: `T(title, body, examples, tables)` with `tables = [[caption, head | null, rows]]`. They are also the source for form drills and for naming a wrong form.
- **Wrong forms** (`formMiss()`, `sameWordForm()` in `engine.js`, `FORM_PASS` in `config.js`): an answer that is right except for the form of a word gets a note saying what was off. At A1–A2 it counts; from B1 it doesn't. Multiple-choice blanks never count, but explain.
- **Fix my mistakes**: `langs[lang].miss` is `{ itemKey: { ts, ok } }` (wrong at `ts`, right again at `ok`); `noteMiss()` writes it in `showFeedback`, `mistakeEntries()` reads it, `startMistakes()` runs the session. Merging keeps the newest of each.
- **Form drills** (`formDrills()`, `formEx()`): rows of a tip table with pronoun labels become "which form goes with …" questions (multiple choice up to A2, typed from B1). Two end every lesson; `startForms()` drills them from the Review tab.
- **Unit checkpoints** (`buildCheckpoint()`, `CHECKPOINT`, `langs[lang].cp`): twelve questions once a unit's lessons are done, pass at 80%, first pass pays `XP.checkpoint`. Wrong answers are not asked again during a checkpoint or placement.
- **Placement** (`startPlacement()`, `PLACEMENT`): level by level from A1, a few questions each; it stops at the first level with fewer than three right and sets `langs[lang].start` (Me → Practice → Find my level).
