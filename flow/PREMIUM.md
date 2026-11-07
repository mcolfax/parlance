# Premium Parlance: the program

Matt asked for a plan that makes Parlance feel premium, fun and polished, with features learners will actually use, built cheaply by the flow's Sonnet and Haiku agents. This page is the program. The seven releases below are already planned to the template's bar (`flow/plans/TEMPLATE.md`), so no Opus planning is needed to build them. Opus only gates and reviews.

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
| Turned the theme song off | 4 of 8 | Half switch the music off. Matt keeps it on by default (2026-11-06); the switch is one tap away on every tab. |
| Used Friends | 2 of 8 | Fine as it is. |
| Talk (tutor) on the web | 0 | The web has no tutor. The only idea note asked for tutor features outside Claude (fmv58xfx9pqsf), and links to other chat apps shipped in 4.27.0. Web learners still have nothing conversational inside Parlance. |
| Tips too dense | fmvbms644lr5x | Shipped (4.27.0–4.28.0). R-16 continues it. |

The app already looks finished at 412px: tokens, birds, sounds, a finish stamp, quests, chests, a streak freeze, a calendar, memory strength. Premium here doesn't mean a new coat of paint. It means **depth where learners stall, a lesson loop that feels good, and something to play for**.

## What the app itself shows (fun and polish)

From a walk through a lesson at 412px (6 Nov) and the code:

| Moment | Today | Opportunity |
|---|---|---|
| Finishing a lesson | One button, Continue, back to Learn. A first lesson can show "0 days streak". | **Next lesson** one tap away; a third tile that's never zero (P3) |
| Finishing a unit | Silent. Its checkpoint unlocks without a word. | A unit-complete line and **Take the unit checkpoint** right there (P3) |
| A run of right answers | The same chime every time; "N in a row" at 3, 5, 8, 12, 16 | A chime that **climbs a semitone** per answer, a progress bar that **glows** from five (P3) |
| New-words and idea cards | The top half of the phone; the bird only appears in feedback | The bird at the foot of the card, with a tip in its bubble (P3) |
| 581 hand-drawn word pictures | Seen once each, on a new-word card | A **sticker book** to fill, with stickers that **shine** when you know the word (P4) |
| Coming back for "just two minutes" | Review, or practice sessions of 12 items | A 60-second **speed round** with a best to beat (P4) |
| Long streaks | Badges at 3, 7 and 30 days, then nothing | **Milestone moments** at 7, 14, 30, 50, 100 and 365 days, and seven new badges (P4) |
| Opening the app | 76 scripts, 2.8 MB of JavaScript (1.9 MB is course content for all three languages). First screen in 0.5s on a fast laptop, **1.7s at 4× CPU slowdown** (a mid-range Android) and 2.5s at 6×, served locally, so a real network adds more | The offline service worker (P3) takes the network out of every later open on the web. Loading the other two languages' content after the first screen is R-36, which needs Opus planning. |

The birds already have 18 moods and 20 moves (`js/core/bird.js`: laugh, love, proud, fly, dance, bow, hop …), but screens use about six. The releases above use more of them (fly for milestones; point, listen and think on teach cards) without touching the birds' art or rig.

## What premium means for Parlance

1. **It meets you at your level.** Test out of a unit you already know. A first-week guide to the features people skip.
2. **It works wherever you are.** Offline on the web, hands-free listening of your own words, and stories you can listen to.
3. **You can practice conversation without the tutor.** Choose the reply, and put a conversation in order, from stories you've read.
4. **It shows you you're improving.** A weekly recap you can share. A shorter Learn route that leads with what's next.
5. **It's a joy to use.** Every finish leads somewhere, a run of right answers sounds and looks like one, and there's something to collect and a best to beat.
6. **It never nags, never sells.** No hearts, no paywall, no guilt notifications, no new data collected about learners.

## The releases

Build them in order. Each is one flow release (at most three packages) and stands alone, so a dropped package never blocks the next release.

| # | Version | Title (release notes) | Packages | Zone | Plan |
|---|---|---|---|---|---|
| P1 | 4.33.0 | Your level, your pace | WP1 Test out of a unit · WP2 Your first week guide · WP3 Review practice grid (R-19) | Amber (saved state, checkpoints, XP) | [`plans/2026-11-06-p1-your-level-your-pace.md`](plans/2026-11-06-p1-your-level-your-pace.md) |
| P2 | 4.34.0 | Works offline | WP1 The service worker · WP2 Self-hosted fonts · WP3 Offline in the app (save voices, notices) | Red, approved by Matt (`proposals/pfmw53mrwk`) | [`plans/queue/p2-works-offline.md`](plans/queue/p2-works-offline.md) |
| P3 | 4.35.0 | Keep going | WP1 The finish screen leads somewhere · WP2 A chime that climbs, a bar that glows · WP3 Company on teach cards | Amber (audio) | [`plans/queue/p3-keep-going.md`](plans/queue/p3-keep-going.md) |
| P4 | 4.36.0 | Time to play | WP1 Sticker book · WP2 Speed round · WP3 Streak milestones and new badges | Amber (XP, badges) | [`plans/queue/p4-play.md`](plans/queue/p4-play.md) |
| P5 | 4.37.0 | Listen hands-free | WP1 Listen mode for your words · WP2 Listen to a story (R-7) | Amber (audio) | [`plans/queue/p5-listen-hands-free.md`](plans/queue/p5-listen-hands-free.md) |
| P6 | 4.38.0 | Conversation practice | WP1 Two conversation exercises and a session · WP2 Where you find them (R-4, R-8) | Green | [`plans/queue/p6-conversation-practice.md`](plans/queue/p6-conversation-practice.md) |
| P7 | 4.39.0 | Your week | WP1 Weekly recap · WP2 A shorter Learn route (R-11) | Green | [`plans/queue/p7-your-week.md`](plans/queue/p7-your-week.md) |

After P7, the regular cycle picks up the rest of the backlog from `ROADMAP.md`: R-36 (load the other languages after the first screen), R-10 (accessibility), R-20 (article follow-ups), R-12 (more pictures). Content work (R-2, R-3, R-16) can run between premium releases as usual.

Why this order: P1 goes straight at the biggest signal, people stalling in week one, especially those who placed high. P2 is next because Matt asked for it and uses the Home Screen app himself; it touches different files from everything else, so it never blocks the rest. P3 and P4 change how every lesson feels and give people a reason to come back (one more lesson, a sticker to collect, a best to beat). Both are small and cheap. P5 and P6 add the "use it anywhere" depth that paid apps charge for, and that web learners currently lack. P7 rewards the habit once there is one to reward.

**Works offline, and free.** A service worker runs in the browser, and Vercel's free Hobby plan serves the files (100 GB a month). Offline adds about 6 MB per phone, then only the files that changed in each release, plus about 28 MB per language for anyone who saves voices. With today's learners that's well under 1 GB a month. No server, no new service, no Supabase change. `vercel.json` already allows a same-origin worker, so it doesn't change.

## How to run it cheaply

- **P1** is in `flow/plans/` with status `approved`. Once this branch is merged into `main`, the next scheduled **Parlance flow cycle** builds it without re-planning (`flow-cycle` preflight step 4, "Resume before planning"). Or run `/flow-cycle build flow/plans/2026-11-06-p1-your-level-your-pace.md` in any session.
- **P2 to P7** wait in `flow/plans/queue/`, so the resume rule doesn't pick them up out of order. Promote the next one after a premium release ships: `git mv flow/plans/queue/p2-works-offline.md flow/plans/<cycle date>-p2-works-offline.md`, set its **Release** to the next free minor version and **Base** to `main`'s short sha, set **Status** to `approved`, commit to `main`. The next cycle builds it. The roadmap rows for P2 to P7 say the same, so a planner that reaches them promotes the plan instead of writing a new one.
- **P2 is Red, approved by Matt.** The guard reports STOP for `dev/web.js`; the orchestrator checks that `proposals/pfmw53mrwk` (web) still has status `approved` and no `decidedBy`, then treats that STOP as allowed (`flow/POLICY.md`, "If Matt approved a Red proposal himself"). If he has rejected it since, drop P2 and promote P3.
- **Order matters a little.** P4 uses P1's practice grid and P3's extra finish-screen buttons and pitched chime; P5 and P6 add tiles to the grid. Each plan says what to do if an earlier package was dropped.
- **Models.** Every package is written for `parlance-builder` (Sonnet). The integration list is for `parlance-chores` (Haiku) where it's only counts and notes. The verifier is Sonnet. Opus does only the gate (a quick read, since the plan is already gated here) and the ship review.
- **Token savers for the agents.** Each package names the exact functions to read (**Reads first**), so builders don't explore. The tests are named in the plan, so the verifier checks names, not behavior from scratch. No package changes content, so there are no pictures to draw and no voice lines to record. Skip the illustrator, and the voices step finds nothing to record.
- **If a package fails twice**, drop it and ship the rest. Each package is independent unless the plan says "runs after".

## What Matt decided (2026-11-06)

- **Works offline: yes, if it's free.** It is (above). Approved as `proposals/pfmw53mrwk` in the web Studio, planned as P2.
- **No Google Calendar reminder.** Don't plan the calendar link or an `.ics` reminder again (R-27, parked).
- **The theme song stays on by default.** Don't propose turning it off for new learners (R-29, parked). The 4-of-8 signal stands as data only.
- **Bird outfits: on hold.** Not important for now (R-37, parked). Don't plan it unless Matt brings it back.
- **Still waiting:** story scenes (R-15) need `budgets.recraftUnitsPerMonth` ≥ 400 (US$0.40). Italian has 5 of 9 scenes.

## How we'll know it worked

Nothing new is collected. Four weeks after P1 ships, read the same aggregates from the web database (`select path, data from public.docs where coll like 'data/users/%'`; the progress is in `data.blob`) and compare:

- Active days per learner: more than half of new learners practice on 4+ days in their first two weeks.
- Placed above A1: at least one tested-out unit (`outs` in their language slice) among learners who placed B1+.
- Stories: more than half of learners read one (the first-week guide points there).
- Bird: more than 1 in 8 opens the picker.
- Lesson ratings: fewer "Too easy" from learners above A1.
- Lessons per practice day: up after P3 (the Next button). Count lessons whose `done[id].at` falls on each active day.
- Offline: Matt's phone check after P2 (airplane mode, a lesson and a story).
- Play: how many learners have a speed best (`stats['speed-<lang>']`) and how many shiny stickers (Me → Sticker book; from cards with `n >= 3` that have a picture).

Add the comparison to `flow/LOG.md` as a note, and adjust `ROADMAP.md`.
