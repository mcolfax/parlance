# Parlance: notes for Claude Code

Parlance is Matt's own German and Latin American Spanish course, a replacement for Babbel and Duolingo. He uses it mostly on his iPhone. It is a static web app with no build step: the files in this repo are the files that run. It is published as a multi-file Claude artifact:

**https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72**

There is also a **web version** for people without Claude at **https://parlance-iota.vercel.app**. Vercel (project `parlance`) builds it from `main` with `node dev/web.js` (see `vercel.json`). Its accounts and database are the Supabase project **Parlance** (`ibrweunxigetiazzuwiz`). The tutor features (Talk, lessons on demand, tutor grading, Studio synthesis) stay Claude-only. See "Two homes" in `docs/ARCHITECTURE.md`.

Design options Matt is reviewing (styles, Pip, cast) are in Claude Design: https://claude.ai/artifact/Qzi2d6c6LteToAfVtkPqJd, with notes and concept-art sources in `design/`.

Read `docs/ARCHITECTURE.md` before changing anything. It maps every file and explains live content, the feedback loop and the theme song.

## Ground rules

- **Progress must never be lost.**
  - Never rename or reuse a lesson or story id.
  - Keep the storage key `parlance.v2` and the database paths.
  - When the saved shape changes, bump `SCHEMA_VERSION` and add an idempotent step to `MIGRATIONS` in `js/core/state.js`.
  - Merges must keep fields they don't recognize.
- **Change things once, in their home.**
  - Colors, type, spacing, radii, motion and layers live in `styles/tokens.css`. Don't write literal colors elsewhere.
  - Version, release notes, XP, quests, badges, Talk scenarios and media live in `js/config.js`.
  - Sounds are entries in `SOUNDS` in `js/core/audio.js`; play them with `sfx('name')`.
  - Music goes through `Song` and `MEDIA.song`.
  - Icons live in `IC` in `js/core/util.js`.
  - Pip, the cast and the illustrations are pure SVG functions in `js/core/art.js`.
- **Content is data** in `content/*.js`.
  - A lesson needs 4+ vocab, 3+ sentences, and blanks with exactly one `___` and 2+ distinct options.
  - Spanish is Latin American: *ustedes*, never *vosotros*.
- **Copy** is plain, warm English in sentence case.
- **Scripts** are classic (not modules) and load in the order `index.html` lists them. A later file can use anything an earlier one defined. An event handler that can fire before the UI scripts have loaded must guard with `typeof`.
- **Check the design** in `styleguide.html`, a living style guide rendered from the tokens and art functions.
- **Accounts and the database go through `window.claude.use()`** and nothing else. In the artifact, Claude provides it; on the web, `js/core/host.js` provides the same surface from Supabase. Keep the two in step: a new database path or rule goes in both the artifact's rules and `dev/supabase.sql`.

## Commands

```sh
npm ci && npm test   # jsdom end-to-end suite (~2 min). Must end with "FAIL 0".
npm run preview      # http://127.0.0.1:8765/_preview.html
npm run files        # JSON map of the files to publish next to index.html
npm run web          # builds the web version into dist/ (what Vercel serves)
NODE_PATH="$(npm root -g)" node dev/icons.js   # redraws media/icons/ from Pip (needs Playwright)
```

A GitHub Action (`keep-awake.yml`) reads the web database three times a day so the free Supabase project doesn't pause. If it fails, the web version's database is down.

The preview runs without the artifact runtime, so there is no account sync, database or tutor; the app handles their absence.

## Shipping a release

1. Bump `APP_VERSION` and add a `RELEASES` entry in `js/config.js`. People who were already learning see What's new once.
2. Run `npm test`. It must end with `FAIL 0`.
3. Commit to `main` and push. Vercel deploys the web version from `main` on its own.
4. Publish with the Artifact tool:
   - `file_path`: the absolute path to `index.html`
   - `url`: the artifact URL above
   - `files`: the map from `node dev/files.js "$PWD"`, which gives absolute sources. Sending only the changed files is fine.
   - Leave `capabilities` out so the declared ones carry forward.
   - If the publish is refused because the published files differ from what this session has seen, read them first (Artifact `read` with `paths`), check the differences, then publish.
   - Only served file types publish. For media that means `.mp4`, `.webm`, `.mp3`, `.ogg` or `.wav`, not `.m4a`.
5. Set `content/config` → `latest` to the new version in **both** homes. Anyone with Parlance open then gets a Refresh banner. Matt can also do this from Me → Studio → Content in each version.
   - Artifact: ArtifactData. Read the doc first and pin `if_version`.
   - Web: Supabase `execute_sql` on project `ibrweunxigetiazzuwiz`:
     `insert into public.docs (path, coll, data) values ('content/config', 'content', '{"kind":"config","latest":"X.Y.Z"}') on conflict (path) do update set data = public.docs.data || excluded.data, updated_at = now();`
   - Live content packs are per home too: write a pack to both if both should have it.

## Feedback → proposals → approval → build

- Learner notes are in the database at `feedback/<uid>` as `{ items: [{ id, at, type, text, ctx }] }`. Only the owner can read them. Web learners' notes are in the Supabase `docs` table at the same paths (`select path, data from public.docs where coll = 'feedback'`); Studio synthesis needs Claude, so turn those into proposals from the artifact or a Claude session.
- Proposals are at `proposals/<id>`:
  - Fields: `title`, `kind` (content|code|design|copy), `summary`, `problem`, `change`, `evidence` (feedback ids), `impact`, `effort`, `status`, `createdAt`, and optionally `note` (Matt's note for the builder).
  - `status` is `pending`, `approved`, `rejected` or `shipped`.
  - `proposals/_meta.lastSynthAt` marks the newest feedback already turned into proposals.
  - See `synthesize()` in `js/ui/studio.js`.
- **Only build proposals with `status: "approved"`.** Matt approves them in the app (Me → Studio). Follow his `note`.
- After shipping, set each built proposal's `status` to `shipped`, with `version` and `shippedAt`.

## Database rules (declared at publish; keep them)

```
content          read: view    write: owner
proposals        read: owner   write: owner
feedback         read: owner   write: owner
feedback/{self}  read: interact  write: interact
data/users/{self}  private to each person (platform default)
```

Capabilities: `db`, `user` (profile scope), `sample`, `downloads`, `comments` (composer only).

The web version enforces the same rules in SQL (`dev/supabase.sql`). Owners there are listed in `public.owners`.
