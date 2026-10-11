# Parlance architecture

Parlance is a static web app published as one multi-file Claude artifact. There is no build step: the files you see are the files that run. `index.html` loads the stylesheets and classic (non-module) scripts in a fixed order, and each later script can use anything an earlier one defined.

## Where things live

| Path | What it is | Change it when you want to… |
|---|---|---|
| `styles/tokens.css` | Design tokens: every color, type role, radius, spacing step, shadow, motion curve and layer | restyle anything globally |
| `styles/base.css` | Reset, typography, buttons, chips, cards, fields, toggles, tab bar, overlays, sheets, toasts | change a shared building block |
| `styles/art.css` | Pip the parrot, cast portraits, unit signs, story scenes, medals, the word popover | change illustrations or Pip's motion |
| `styles/components.css` | Screen-level styles grouped by feature | change one screen |
| `styles/film.css`, `styles/features.css` | Intro film; feedback, Studio, update banner, What's new | change those features |
| `styleguide.html` | Living style guide rendered from the tokens and art functions | review the design system |
| `js/config.js` | Version, release notes, XP economy, daily quests, badges, Talk scenarios | tune the game or ship a version |
| `js/core/util.js` | DOM helper `h()`, dates, hashing, icons, particles, haptics | add an icon or helper |
| `js/core/text.js` | Answer normalization, typo/accent tolerance, word-by-word comparison of an answer that counts with the expected one, glossary index | change how answers are checked |
| `js/core/content.js` | Content helpers, course assembly, live pack validation, stable review keys | change how content is organized |
| `js/core/state.js` | Saved state, migrations, merging, account sync, backup codes | change what is saved |
| `js/core/audio.js` | Speech, the synthesized sound library (`SOUNDS`), the music sequencer, the theme-song player (`Song`) | add or tune a sound, change how music behaves |
| `media/` | The theme song in two formats: `abc-adventure.mp4` (AAC, for Safari/iPhone and Chrome) and `abc-adventure.webm` (Opus, for browsers without AAC) | swap the song |
| `js/core/engine.js` | XP, streaks, spaced repetition, quests, badges, lesson status, exercises, grading | change learning logic |
| `js/core/remote.js` | Live content packs, update banner, announcements, What's new, sharing a lesson | change live updates |
| `js/core/host.js` | The web version's accounts and database: the same `window.claude.use()` surface, backed by Supabase | change how the web version signs in or stores data |
| `js/core/art.js` | Pip, cast portraits, unit signs, scenes, chest, medals (pure SVG) | change illustrations |
| `content/*.js` | Lessons, stories, cast, glossary (data only) | add or fix built-in content |
| `js/ui/*.js` | One file per screen: learn, review, stories, talk, me, runner (lessons), onboarding, film, feedback, studio | change a screen |
| `js/main.js` | Boot order | rarely |
| `dev/test.js` | End-to-end tests (jsdom) | run before every publish |
| `dev/preview.py`, `dev/files.js` | Local preview server; the list of files to publish | rarely |
| `dev/web.js`, `vercel.json` | Builds the web version into `dist/` (page, Home Screen manifest and icon tags); Vercel runs it on every push to `main` | change how the web version is served |
| `dev/icons.js`, `media/icons/` | Draws the web version's Home Screen icons from Pip's art and the tokens | Pip changes |
| `dev/keep-awake.js`, `.github/workflows/keep-awake.yml` | Reads the web database three times a day so the free Supabase project isn't paused; a failed run means it's down | rarely |
| `dev/supabase.sql` | The web version's database: the document table and the SQL functions that enforce the access rules | add a database path or rule |

## Two homes: Claude and the web

The same files run in two places.

- **The Claude artifact.** The Claude runtime gives the page `window.claude`: the signed-in person, the shared database and the tutor. Tutor use counts toward each person's own Claude plan.
- **The web version**, for people without Claude. Vercel builds it from `main` with `dev/web.js`, which wraps `index.html` in a full page that sets `window.PARLANCE_WEB`. `js/core/host.js` sees that flag and provides the same `window.claude.use('db' | 'user')` surface from our Supabase project (`WEB` in `config.js`), so sync, live content, feedback, names, sharing and Studio work without Claude. People sign in with email and password, or Google, through Supabase Auth.
- The tutor features (Talk, lessons on demand, tutor grading, Studio synthesis) need Claude. On the web they show the same "needs Claude" notices as a signed-out Claude page.
- The two homes keep separate data: accounts, progress, feedback, proposals and live content. A backup code moves progress between them. `content/config.latest` and any live pack must be written to each home that should get it.
- On the web, every database call goes through SQL functions (`doc_get`, `doc_list`, `doc_set`, `doc_update`) that apply the same rules as the artifact (`dev/supabase.sql`). The tables themselves are closed to clients, so the public key in `config.js` can't reach anything else. Owners are listed in `public.owners`.
- Live content on the web is checked every minute while the page is open, instead of being pushed.

## Progress is never lost

- Each person's progress lives in their own private database documents (`data/users/<id>/core|de|es|gen-de|gen-es`), mirrored in their browser. Republishing the app never touches them.
- Lessons and stories are keyed by **id**. Never rename or reuse an id. Moving a lesson to another unit or changing its text is safe.
- Review cards use **stable item keys**: `lessonId|v|~<normalized target text>`. Reordering or adding items is safe. If you change an item's target text, its card is orphaned (kept, but unused); to carry it over, add an alias in a pack (`aliases: { "old key": "new key" }`).
- Saved state is versioned (`SCHEMA_VERSION` in `config.js`). When the saved shape changes, add an idempotent step to `MIGRATIONS` in `state.js`.
- Loads and merges keep fields they don't recognize, so an older open tab never drops data a newer version wrote.
- Keep the storage key `parlance.v2` and the database document paths as they are.

## Shipping an update

1. Make the change in the relevant file(s).
2. Bump `APP_VERSION` and add a `RELEASES` entry in `js/config.js`. People who were already learning see What's new once.
3. Run `npm ci && npm test`. It must report `FAIL 0`.
4. Commit to `main` in GitHub (`mcolfax/parlance`); Vercel deploys the web version from it. Then republish the same artifact URL with `index.html` as the page and the files `node dev/files.js` lists. Unchanged files are kept.
5. In Studio → Content, tap **Mark <version> as latest**, in each version. Anyone with Parlance open gets a Refresh banner. Their progress stays.

## The theme song

`MEDIA.song` in `js/config.js` describes it: title, the two source files, where the film starts in the song, the fade at the end of the film, and volume multipliers for home, film and ducking under speech.

- **Home screen.** The song loops softly on Learn while nothing else is open and the page is visible. It starts on the learner's first tap, because browsers don't allow sound before one. It stops on other tabs, in lessons, stories, Talk and the film, and comes back when they return to Learn. The note button on Learn and **Me → Sound** turn it off and set the music volume. A speaking voice lowers it.
- **Intro film.** The film plays the song from its own playhead, so pausing, scrubbing and replaying stay in sync. While the song is running, the playhead follows the song's clock. If the song can't play, the film falls back to its synthesized score (`filmScore()` in `js/ui/film.js`).
- **How it plays.** The file is fetched once and played from a local copy, so its volume can run through Web Audio. That is the only way to set volume on an iPhone. If the local copy is refused, it plays the file directly.
- **To swap the song**, encode the new track into both formats with the same names, or change `MEDIA.song.sources`:
  `ffmpeg -i song.wav -c:a aac -b:a 128k -movflags +faststart media/abc-adventure.mp4` and `ffmpeg -i song.wav -c:a libopus -b:a 96k media/abc-adventure.webm`. Bump the version so people get the Refresh banner.

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
data/users/{self}  (platform default: private to each person)
```

## Conventions

- Style through tokens: `font: var(--type-label)`, `border-radius: var(--r-md)`, `z-index: var(--z-sheet)`. Don't write new literal colors.
- Every sound is a named entry in `SOUNDS`; call `sfx('name')`. Music goes through `Song` and `MEDIA.song`, never a new `<audio>`.
- XP amounts, quests, badges and scenarios are data in `config.js`, not literals in screens.
- Everything a learner reads is plain, warm English in sentence case.
