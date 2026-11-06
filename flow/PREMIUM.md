# Premium Parlance: the program

Matt asked for a plan that makes Parlance feel premium, with features learners will actually use, built cheaply by the flow's Sonnet and Haiku agents. This page is the program. The four releases below are already planned to the template's bar (`flow/plans/TEMPLATE.md`), so no Opus planning is needed to build them. Opus only gates and reviews.

Written 2026-11-06 against `main` at `96137e4` (4.31.0).

## What the learners are telling us

The web database (Supabase, 6 Nov) holds 8 learner accounts since 11 Oct. Counted across all of them, with no names or ids:

| Signal | Count | What it suggests |
|---|---|---|
| Days with any practice, per learner | 17, 5, 4, 3, 2, 2, 1, 1 | People drop off in the first week. Retention matters more than more content. |
| Lessons finished, most-used language | 5, 5, 4, 3, 3, 2, 1, 0 | Nobody has finished more than 5 lessons in a language. The first units get the most attention for a while. |
| Started above A1 (B1, B2, C1, C1) | 4 of 8 | 3 of those 4 did 5 lessons or fewer, and one lesson rating says "Too easy" (fmvl62jxd97vy). There's no way to skip a unit you already know. |
| Read a story | 4 of 8 | Stories are good, but half never find them. |
| Picked a bird other than Pip | 1 of 8 | The bird picker is hard to find. |
| Turned the theme song off | 4 of 8 | Half switch the music off. That's an identity question for Matt (below). |
| Used Friends | 2 of 8 | Fine as it is. |
| Talk (tutor) on the web | 0 | The web has no tutor. The only idea note asked for tutor features outside Claude (fmv58xfx9pqsf), and links to other chat apps shipped in 4.27.0. Web learners still have nothing conversational inside Parlance. |
| Tips too dense | fmvbms644lr5x | Shipped (4.27.0–4.28.0). R-16 continues it. |

The app already looks finished at 412px: tokens, birds, sounds, a finish stamp, quests, chests, a streak freeze, a calendar, memory strength. Premium here doesn't mean a new coat of paint. It means **depth where learners stall, and a calm, quick feel**.

## What premium means for Parlance

1. **It meets you at your level.** Test out of a unit you already know. A first-week guide to the features people skip.
2. **It works when your eyes and hands are busy.** Hands-free listening of your own words, and stories you can listen to.
3. **You can practice conversation without the tutor.** Choose the reply, and put a conversation in order, from stories you've read.
4. **It shows you you're improving.** A weekly recap you can share. A shorter Learn route that leads with what's next.
5. **It never nags, never sells.** No hearts, no paywall, no guilt notifications, no new data collected about learners.

## The releases

Build them in order. Each is one flow release (at most three packages) and stands alone, so a dropped package never blocks the next release.

| # | Version | Title (release notes) | Packages | Zone | Plan |
|---|---|---|---|---|---|
| P1 | 4.32.0 | Your level, your pace | WP1 Test out of a unit · WP2 Your first week guide · WP3 Review practice grid (R-19) | Amber (saved state, checkpoints, XP) | [`plans/2026-11-06-p1-your-level-your-pace.md`](plans/2026-11-06-p1-your-level-your-pace.md) |
| P2 | 4.33.0 | Listen hands-free | WP1 Listen mode for your words · WP2 Listen to a story (R-7) | Amber (audio) | [`plans/queue/p2-listen-hands-free.md`](plans/queue/p2-listen-hands-free.md) |
| P3 | 4.34.0 | Conversation practice | WP1 Two conversation exercises and a session · WP2 Where you find them (R-4, R-8) | Green | [`plans/queue/p3-conversation-practice.md`](plans/queue/p3-conversation-practice.md) |
| P4 | 4.35.0 | Your week | WP1 Weekly recap · WP2 A shorter Learn route (R-11) | Green | [`plans/queue/p4-your-week.md`](plans/queue/p4-your-week.md) |

After P4, the regular cycle picks up the rest of the "premium feel" backlog from `ROADMAP.md`: R-10 (accessibility), R-14 (cold start on a slow phone), R-20 (article follow-ups), R-12 (more pictures). Content work (R-2, R-3, R-16) can run between premium releases as usual.

Why this order: P1 goes straight at the biggest signal, people stalling in week one, especially those who placed high. P2 and P3 add the "use it anywhere" depth that paid apps charge for, and that web learners currently lack. P4 rewards the habit once there is one to reward.

## How to run it cheaply

- **P1** is in `flow/plans/` with status `approved`. Once this branch is merged into `main`, the next scheduled **Parlance flow cycle** builds it without re-planning (`flow-cycle` preflight step 4, "Resume before planning"). Or run `/flow-cycle build flow/plans/2026-11-06-p1-your-level-your-pace.md` in any session.
- **P2 to P4** wait in `flow/plans/queue/`, so the resume rule doesn't pick them up out of order. Promote the next one after a premium release ships: `git mv flow/plans/queue/p2-listen-hands-free.md flow/plans/<cycle date>-p2-listen-hands-free.md`, set its **Release** to the next free minor version and **Base** to `main`'s short sha, set **Status** to `approved`, commit to `main`. The next cycle builds it. The roadmap rows for P2 to P4 say the same, so a planner that reaches them promotes the plan instead of writing a new one.
- **Models.** Every package is written for `parlance-builder` (Sonnet). The integration list is for `parlance-chores` (Haiku) where it's only counts and notes. The verifier is Sonnet. Opus does only the gate (a quick read, since the plan is already gated here) and the ship review.
- **Token savers for the agents.** Each package names the exact functions to read (**Reads first**), so builders don't explore. The tests are named in the plan, so the verifier checks names, not behavior from scratch. No package changes content, so there are no pictures to draw and no voice lines to record. Skip the illustrator, and the voices step finds nothing to record.
- **If a package fails twice**, drop it and ship the rest. Each package is independent unless the plan says "runs after".

## Questions only Matt can answer (Red)

None of these is in the plans. Each is ready to file as a "Your call" proposal (`flow/POLICY.md`, "Asking Matt": save the JSON, run `node dev/feedback.js escalate <file>`, run the SQL it prints).

1. **Daily reminders.** Parlance can't remind anyone today, and most learners stop within five days. Without a server, the cheapest way that works on Android is an "Add a daily reminder to Google Calendar" button: a `calendar.google.com` link with a daily repeating event that links back to Parlance, plus an `.ics` file for iPhone and other calendars. It's a link, not a script or a fetch, but it's a new outside host, so the guard stops it. Real push notifications would need a service worker, a push server (a Supabase Edge Function on a schedule) and storing each learner's push subscription: Red for privacy, accounts and automation.
   ```json
   { "title": "Your call: daily reminder via calendar", "kind": "code",
     "summary": "Add a 'Remind me every day' button in Me that adds a daily repeating event to Google Calendar (a link) or any calendar (an .ics file), linking back to Parlance.",
     "problem": "7 of 8 web learners stopped practicing within 5 active days, and Parlance can't remind anyone.",
     "change": "Me → Practice gets a time picker and 'Add to Google Calendar' (opens calendar.google.com/calendar/render?action=TEMPLATE with RRULE:FREQ=DAILY) and 'Download for other calendars' (.ics). The time is remembered on the device only. Nothing is sent anywhere by Parlance.",
     "why": "New outside host (calendar.google.com) in a link: the guard's 'new outside host' rule. No data leaves Parlance except what the learner sees in the link.",
     "impact": 3, "effort": 1, "plan": "flow/PREMIUM.md" }
   ```
2. **Works offline (web version).** The Home Screen app shows nothing without a connection. A service worker could cache the app, the course and the voice packs. That means changes to `dev/web.js` and `vercel.json` (Red: security). The artifact can't have one.
   ```json
   { "title": "Your call: make the web app work offline", "kind": "code",
     "summary": "Cache the app, the course and the voice packs with a service worker, so the Home Screen app opens and teaches without a connection.",
     "problem": "On the subway or a plane the web version shows nothing. Matt uses the Home Screen app on Android.",
     "change": "A sw.js at the site root, registered from the inline flag script in dev/web.js (new CSP hash in vercel.json). It caches index.html, styles, scripts, content and voice packs on first visit, with a version stamp from APP_VERSION. Sync waits until online.",
     "why": "Touches dev/web.js and vercel.json (security headers), and a bad cache can serve a stale app.",
     "impact": 3, "effort": 3, "plan": "flow/PREMIUM.md" }
   ```
3. **The theme song's default.** 4 of 8 web learners turned the song off. Should it start off for new learners, and be one tap away in setup? The song is part of Parlance's identity, so only Matt decides.
   ```json
   { "title": "Your call: theme song off by default", "kind": "design",
     "summary": "New learners start with the theme song off and can turn it on during setup or with the note button.",
     "problem": "4 of 8 web learners turned the theme song off.",
     "change": "defaultSettings().homeMusic becomes false for new saves only (existing learners keep theirs); setup's last step gets a 'Play the theme song' toggle.",
     "why": "The theme song is identity (Red).", "impact": 2, "effort": 1, "plan": "flow/PREMIUM.md" }
   ```
4. **Story scenes (R-15)** still wait on `budgets.recraftUnitsPerMonth` ≥ 400 (US$0.40). Italian has 5 of 9 scenes, which looks unfinished next to German.

## How we'll know it worked

Nothing new is collected. Four weeks after P1 ships, read the same aggregates from the web database (`select path, data from public.docs where coll like 'data/users/%'`; the progress is in `data.blob`) and compare:

- Active days per learner: more than half of new learners practice on 4+ days in their first two weeks.
- Placed above A1: at least one tested-out unit (`outs` in their language slice) among learners who placed B1+.
- Stories: more than half of learners read one (the first-week guide points there).
- Bird: more than 1 in 8 opens the picker.
- Lesson ratings: fewer "Too easy" from learners above A1.

Add the comparison to `flow/LOG.md` as a note, and adjust `ROADMAP.md`.
