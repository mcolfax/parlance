# When the flow may approve its own work

Matt asked for Parlance to improve on its own and to hear from him only when it's truly necessary. This page is how the flow decides. The orchestrator applies it to every work package at the **plan gate** (before anything is built) and again at the **ship gate** (after the reviewer reads the finished diff). `node dev/flow.js guard` enforces the mechanical half of it. Only Matt changes this page or `flow/policy.json`: the guard stops any release that touches them.

Each package gets one zone. A package is in the most restrictive zone any part of it touches.

## Green: approve and ship, no one asked

The ordinary work of making the course better. Approve it when the plan is detailed enough for a Sonnet agent to build without design decisions of its own.

- **New content in the existing shape:** new units, lessons and stories added to **all three languages in the same release**, so the languages keep the same shape, with new ids that were never used (`node dev/flow.js snapshot` prints the next free ones). Their word pictures, recorded voices, glossary entries, unit signs and test counts ship with them.
- **Fixes to existing content** that keep every review-card key: a wrong meaning, a missing accepted English answer, a better tip, a clearer blank hint, a new table, a picture override (a fourth vocab field). See "Changing existing content" for anything that changes a word's or sentence's own text.
- **New exercise types and lesson features** that work offline, without the tutor, without a microphone and on the web version; that never change what a finished lesson, XP or a streak means; and that come with tests in `dev/test.js`.
- **UX and UI polish** inside the Selva look: layout, spacing, clarity, empty states, copy, accessibility, motion, performance, using existing tokens (adding a new token is fine; changing an existing one is not).
- **Bugs** found by the planner, the tests or learners.
- **Learner feedback**: pending proposals in Studio whose change is Green. The gate approves them with `node dev/feedback.js approve <id> "<why>"` (web) or ArtifactData (artifact), recording `decidedBy: "flow"`.
- **Recorded voices** within the monthly cap that `dev/voices.js` enforces, and **word pictures drawn in code** (`PICS`).
- **The flow's own housekeeping:** `flow/ROADMAP.md`, `flow/LOG.md`, plan files and screenshots.

## Amber: approve, with an extra look

Green work that touches something learners would feel if it went wrong. It may ship without Matt, but only if the reviewer passes it explicitly on the points below, and the plan has a test for each.

- **Saved state** (`js/core/state.js`, `SCHEMA_VERSION`, `MIGRATIONS`): additive only. The migration is idempotent, merges keep unknown fields, and an older open tab can't drop what the new version writes. Tests cover old saves loading.
- **Answer checking and grading** (`js/core/text.js`, `evaluate()` and friends in `engine.js`): accept more right answers, never reject an answer that counts today. Add a test for every new accepted or rejected case.
- **XP, streaks, quests, badges** (`js/config.js`): new quests and badges are fine; never take away XP, a streak, a badge or a finished lesson someone has.
- **Friends, live content, the update banner** (`social.js`, `remote.js`): no new database path, no change to what a card shares.
- **Audio and speech** (`js/core/audio.js`): check on Android Chrome first (the guard notes it; the verifier screenshots at 412px and runs the audio tests).
- **Changing existing content's text** (below).
- **More than 3 work packages or more than ~2,500 changed lines** in one release (pictures and voices files don't count): split it unless the parts only make sense together.

## Red: Matt decides

The flow never builds these on its own. It writes the question to Studio as a pending proposal (`node dev/feedback.js escalate <file>`, see "Asking Matt"), drops the package from this cycle, and keeps going with the rest. The guard reports most of them as **STOP**.

- **Anything that costs money.** Recraft beyond `budgets.recraftUnitsPerMonth` in `flow/policy.json` (0 unless Matt raises it), any paid API, plan, domain or service. Voices never cost anything: `dev/voices.js` stops at 900,000 characters a month and nobody raises or gets around that.
- **Anything that could lose progress:** removing or renaming a lesson or story id, the storage key `parlance.v2`, a database path, a migration step, an exercise type, or a schema version going down.
- **Accounts, privacy and security:** the database rules or capabilities, `dev/supabase.sql`, `js/core/host.js`, `vercel.json` and its Content-Security-Policy, `dev/web.js`, a new outside host (fonts, APIs, analytics), collecting anything new about learners, `dev/legal/`.
- **Identity:** the Selva palette (changing an existing token), Pip or the other birds' art or rig, the theme song, the Home Screen icon, the app's name, the intro film's story.
- **Taking something away** learners use: a screen, a setting, a feature, a language, Talk, Friends.
- **A new language** (it changes the course's shape for everyone and needs voices and a cast).
- **A major version** (5.0.0).
- **Something Matt said no to:** a proposal he rejected, or a plan that contradicts one of his notes. Never bring a rejected idea back in different words.
- **Automation itself:** GitHub Actions, the scheduled tasks, this page and `flow/policy.json`.

If Matt approved a Red proposal himself (status `approved`, no `decidedBy: "flow"`), the flow may build it: the plan names the proposal, and the orchestrator checks its status before treating the guard's STOP lines that proposal covers as allowed. It still needs every other check to pass.

## When to stop and ask in the middle of a cycle

Only these, and only for the package concerned:

1. A package turns out to be Red once the work starts (the guard says STOP, or the builder finds it must touch a Red file).
2. Tests can't reach `FAIL 0` after two repair rounds. Drop the package; if nothing is left to ship, ship nothing.
3. The reviewer finds a problem that its fix would turn Red.
4. A connector Parlance needs is down for the whole cycle (for example Supabase for the web home). Ship what can be shipped in the other home only if the version stays consistent (the code ships to both homes from `main` either way); say so in the report.

Everything else is decided by the flow. Uncertain taste calls inside Green (a layout choice, a story's plot, which lesson to write next) are the planner's job, not Matt's.

## Changing existing content

Review cards are keyed by a lesson id and the normalized text of the word or sentence (`lessonId|v|~text`). Changing that text orphans every learner's card for it. So:

- Prefer changes that keep the text: meanings, accepted answers, tips, tables, hints, pictures.
- If the text itself is wrong (a misspelling, a wrong form), fix it, and carry the cards over with an **alias pack** written to both homes at ship time: `content/aliases-<lang>` = `{ "kind": "pack", "lang": "<lang>", "title": "Corrections", "enabled": true, "aliases": { "<old key>": "<new key>" } }`, merged into the existing doc if there is one. List the keys in the plan and in a JSON file passed to `node dev/flow.js guard --allow-orphans <file>`. Write the pack before publishing.
- Never shrink a lesson's vocab, sentence or blank counts mid-flight without a reason: a half-done lesson on someone's phone stops resuming when those counts change (that's safe, but annoying).

## Asking Matt

When something is Red, the orchestrator writes a JSON file and turns it into a pending proposal:

```json
{ "title": "at most 8 words", "kind": "content|code|design|copy",
  "summary": "1-2 sentences", "problem": "what is wrong or missing, with evidence",
  "change": "exactly what the flow would build if he says yes",
  "why": "which Red line it crosses and what could go wrong",
  "impact": 1, "effort": 1, "plan": "flow/plans/<file>.md" }
```

`node dev/feedback.js escalate q.json` prints the SQL for the web home (run it with Supabase `execute_sql` on `ibrweunxigetiazzuwiz`); in the artifact, write the same document to `proposals/pf<base36 time>` with ArtifactData. He sees it in Me → Studio → Proposals. When he approves it, the next cycle builds it; when he rejects it, it's done for good. Every escalation is also listed in the cycle's report. Don't ask him anything any other way, and don't ask about Green or Amber work at all.

## Undoing a release

If a shipped release turns out wrong, the next cycle (or any session) reverts it on `main` with `git revert`, bumps the patch version, republishes and sets `latest` in both homes. Progress is safe because nothing in Green or Amber removes saved fields, ids or keys.
