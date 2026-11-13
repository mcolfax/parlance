# Polished Parlance: the program

Matt asked (2026-11-11) for a review of what people recommend for free animation and design work, a plan to lift Parlance's animations, illustrations, colors and UI/UX to what people expect from a paid app, and build plans that Sonnet and Haiku agents can carry out, with a final review by the strongest model. This page is the research, the audit and the program. The five releases below are planned to the template's bar (`flow/plans/TEMPLATE.md`) and wait in `flow/plans/queue/` as `q1` to `q5`, next to the premium program's `p3` to `p7` ([PREMIUM.md](PREMIUM.md)).

Written against `main` at `fd1e133` (4.33.0).

## What the research says

**A caveat first.** Reddit blocks the search and fetch tools this session has, and the one Reddit mirror that turned up is outside the session's network. So nothing below was read on Reddit itself. It comes from roundups, comparison pages and aggregators that quote Reddit threads (r/webdev, r/UXDesign, r/UI_Design), and most of those are vendor blogs. Treat it as the consensus those pages report, not a first-hand reading. To have the threads read directly, allow `reddit.com` (or paste thread links) in a later session.

| Area | What people recommend when it must be free | What it means for Parlance |
|---|---|---|
| UI motion | Native first: CSS transitions and keyframes, the Web Animations API, the View Transitions API for page changes, CSS scroll-driven animations. A library only for long timelines (GSAP, free since Webflow bought it; Motion for React apps). | Parlance already does this, with no library. Keep it that way: there is no build step, and a library is 30 to 250 KB that every phone downloads. |
| Characters | Rive for characters that react to input (Duolingo's lip-sync runs on it); Lottie for canned After Effects clips. Rive's free plan now puts a splash screen on exports, and LottieFiles limits free exports. | The five birds are already rigged in Blender and played by `rig.js`, with 18 moods and 20 moves. Screens use ten of the moods. Use what exists; don't add a runtime. |
| Illustration | Inkscape (free, open source) and Affinity (now free) for vector art; Figma's free plan for layout; Krita for painting; unDraw and Phosphor for stock art and icons. | Parlance's pictures are drawn in code in one style (581 of them), so stock art would clash. The free stack that fits is the one in use: SVG in code, Blender for the birds. |
| Color | Realtime Colors and the OKLCH picker to try palettes and read contrast; Radix Colors for ready-made scales. | The Selva palette is Matt's (a Red line in `POLICY.md`). The useful part is the method: check every text and control pair for contrast, in both themes, mechanically. See Q4. |
| What "premium" feels like | One timing system used everywhere; motion that answers a tap within 100 to 300 ms; exits as well as entrances; haptics used sparingly, to confirm a decision, and able to be switched off; no flash of a blank page; behaves like an app, not a page (no pull-to-refresh by accident, no text selected on a long press). | This is where Parlance has gaps. See the audit. |

So the best free combination for Parlance is the one it already has, used more consistently: **CSS and the Web Animations API for motion, the Blender rig for the birds, SVG in code for pictures, a contrast script for color, and Playwright screenshots at 412px for review.** No new tool, host or cost.

Sources: [LottieFiles: motion design tools by use case](https://lottiefiles.com/blog/design-guides-and-tips/best-motion-design-tools-ranked-by-use-case) · [Lottie vs Rive](https://www.motiontheagency.com/blog/lottie-vs-rive) · [Rive alternatives (free plan splash screen)](https://www.exodeui.com/best-rive-alternatives/) · [Web animation in 2026: GSAP, Motion, CSS](https://blog.codercops.com/blog/web-animation-gsap-framer-motion-css-2026) · [Duolingo: lip-sync for its characters](https://blog.duolingo.com/world-character-visemes) · [Rive on Duolingo's handoff](https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff) · [Best free graphic design software](https://dupple.com/learn/best-free-graphic-design-software) · [What Reddit says about design tools](https://discury.io/reddit-research/design-tools) · [Best color tools 2026](https://hextints.com/blog/best-color-tools) · [What makes an app feel polished](https://www.producthunt.com/p/xterix-vapordeck-for-x-twitter/what-makes-an-app-feel-polished) · [Making a PWA feel native](https://tips.ojapp.app/en/make-pwa-feel-like-native-app/)

## What the app itself shows

From screenshots of every tab, a lesson, the finish screen, a story and setup at 412px in both themes (11 Nov), and a read of the styles and screens. Parlance already has most of what the research lists: tokens, pressed states on every control, a spring curve, particle bursts, a finish stamp with confetti and a count-up, reduced motion honored. The gaps are in consistency and in the edges.

| # | Finding | Evidence | Fixed in |
|---|---|---|---|
| 1 | **No timing system.** The tokens define three durations, but the stylesheets write about 45 transitions with 14 different literal times (.1s, .12s, .14s, .15s, .2s, .22s, .25s, .3s, .35s, .4s, .5s, .6s, .8s). | `grep -o "transition:[^;}]*" styles/*.css` | Q1 WP1 |
| 2 | **Things arrive but don't leave.** A toast vanishes in one frame; a sheet's backdrop fades while the sheet itself just disappears; a sheet can't be dragged down by its grip. | `toast()` and `sheet()` in `js/ui/shell.js`; `.sheet-back.out` in `styles/base.css` | Q1 WP2 |
| 3 | **Tab switches are slow and forgetful.** Every switch replays a staggered rise that takes up to 0.86 s, and every tab opens at the top even if you were halfway down it a moment ago. | `.view.enter>*` in `styles/base.css`; the tab `onclick` in `renderTabs()` | Q1 WP2 |
| 4 | **Haptics have no vocabulary and no switch.** 20 calls with 12 different literal patterns; no setting to turn vibration off. | `grep -rn "haptic(" js` | Q1 WP3 |
| 5 | **The word "null" is printed under the word list** in Review whenever the list is shorter than 150. | `fillWords()` in `js/ui/review.js` passes a null `more` to `replaceChildren` | Q2 WP1 |
| 6 | **The streak tile wears the error colors.** `.stat.streak` uses `--bad-bg` and `--bad`, so a new learner's first screen shows a red "0". | `styles/components.css`, `.stat.streak` | Q2 WP1 |
| 7 | **The first thing anyone sees is the text "Loading Parlance…"** while 2.8 MB of scripts load (1.7 s on a mid-range Android, measured for R-14). | `index.html`, `.boot-msg` | Q2 WP2 |
| 8 | **Me is 8,500px long** at phone width, with Sound, Practice and Backup far below the calendar and 27 badges. | Full-page screenshot of Me | Q2 WP3 |
| 9 | **It can still behave like a web page.** In the Home Screen app a pull at the top reloads it; a long press on a button selects its label; the 11,000px Learn route is laid out and painted in full. | `styles/base.css` has no `touch-action`, `user-select` or `content-visibility` | Q3 WP1 |
| 10 | **No accessibility audit has been done** (R-10): no check that every control has a name, sheets don't hold or return focus. | `sheet()` in `js/ui/shell.js` | Q3 WP2 |
| 11 | **Nothing checks contrast.** Measured from the tokens: light-theme gold text is 3.0 to 3.3:1 (needs 4.5); field borders are 1.3:1 (a control's edge needs 3); white on the German green button is 4.38:1, just under 4.5. Everything else passes, most of it comfortably, and dark mode passes everywhere. | Computed 11 Nov from `styles/tokens.css` | Q4 |
| 12 | **Two of the birds' animations are never shown, and three are shown once.** The `laugh` mood and the head-`shake` clip appear on no screen; `sad`, `proud` and `ready` appear in one place each. After a failed checkpoint the bird cheers under confetti. | Counted 11 Nov across `js/ui/*.js` and `js/core/art.js` (the film aside) | Q5 |

Looked at and left alone, on purpose:

- **View Transitions for tab switches.** It's the fashionable answer, but Parlance has a history of Android Chrome drawing glitches with full-screen effects (see "In and out of the film" in `docs/ARCHITECTURE.md`), and Q1 makes the switch quick without it. Not planned.
- **Rive, Lottie, GSAP or any animation library.** Nothing in the audit needs one.
- **More word pictures.** Every concept already has a decision (`node design/pictures/tools.js check`: 0 undecided, 581 drawn). Raising coverage means revisiting earlier "no picture" decisions, which is illustrator judgment, not polish. It stays R-12.
- **`styles/film.css`.** Its rules are part of each film video's fingerprint, so any edit there means re-rendering five videos. None of the plans touch it.

## The releases

Each is one flow release of two or three packages and stands alone.

| # | Title (release notes) | Packages | Zone | Plan |
|---|---|---|---|---|
| Q1 | Smooth moves | WP1 One timing system · WP2 Exits, sheets and quick tabs · WP3 Haptics with names and a switch | Amber (saved settings) | [`plans/queue/q1-smooth-moves.md`](plans/queue/q1-smooth-moves.md) |
| Q2 | A better first look | WP1 Small things that look wrong · WP2 A loading screen with shape · WP3 Me, easier to get around | Green | [`plans/queue/q2-first-look.md`](plans/queue/q2-first-look.md) |
| Q3 | Feels like an app | WP1 Touch and scrolling · WP2 Names and focus for every control | Green | [`plans/queue/q3-feels-like-an-app.md`](plans/queue/q3-feels-like-an-app.md) |
| Q4 | Easier to read | WP1 A contrast check · WP2 Gold text and field edges | Green (new tokens only) | [`plans/queue/q4-easier-to-read.md`](plans/queue/q4-easier-to-read.md) |
| Q5 | Every move counts | WP1 A moment for every mood and move of the birds | Green | [`plans/queue/q5-every-move.md`](plans/queue/q5-every-move.md) |

**Order with the premium program.** P2 is already promoted. After it, promote in this order: **P3, Q1, Q2, P4, Q5, Q3, P5, Q4, P6, P7**. P3 goes first because it changes how a lesson feels (the finish screen, the climbing chime, the bird on teach cards), which is the biggest part of "polished"; Q1 follows so that everything after it is written against the timing tokens. From Q1 on, `npm test` fails any new transition with a literal duration, so the builders of later plans use the tokens (the failure message says which).

## Matt's calls

Decided in chat on 2026-11-11.

1. **The German green in the light theme: yes.** `--de` is now #1D8548 (white on it is 4.67:1, up from 4.38) and its glow matches. Done on this branch with Matt's approval; the film videos are unaffected (`node dev/film.js --check`). R-50.
2. **The last five story scenes: yes, and Matt makes them himself in Recraft**, so no budget changes. The prompts are in `design/pictures/recraft/PROMPTS.md` (es-s9, it-s6, it-s7, it-s8, it-s9). When the SVGs arrive in `design/pictures/recraft/incoming/`, place them with `node design/pictures/tools.js svg`, add who stands where to `design/pictures/story-figs.json`, run `node design/pictures/tools.js scenes` and `npm test`. R-15.
3. **No animation wasted.** Matt asked that every bird animation be used. Q5 does that and adds a test that keeps it so.

Still open: reading Reddit first-hand needs `reddit.com` allowed for a session, or pasted links.

## How to run it cheaply

- Promote a plan the same way as the premium ones: `git mv flow/plans/queue/q1-smooth-moves.md flow/plans/<cycle date>-q1-smooth-moves.md`, set **Release** to the next free minor version, **Base** to `main`'s short sha, **Status** to `approved`, commit to `main`. The next cycle builds it, or run `/flow-cycle build flow/plans/<file>.md`.
- **Models.** Every package is written for `parlance-builder` (Sonnet). The integration lists are for `parlance-chores` (Haiku). `parlance-verifier` is Sonnet. The strongest model only gates and does the final review.
- No package changes course content, so there are no pictures to draw and no voice lines to record.
- Packages in one plan run one after another on the cycle branch, because they share `styles/base.css` or `dev/test.js`.
- If a package fails twice, drop it and ship the rest; each plan says which packages depend on which.

## The final review

Screenshots can't show motion, so the review of a polish release has two halves.

**The reviewer (strongest model), for each release:**
- The diff stays inside each package's **Owns** list, and `styles/film.css`, `styles/tokens.css` (existing lines), `dev/web.js`, `vercel.json` and the birds' files are untouched.
- `npm test` ends with FAIL 0 and the new checks named in the plan exist. `node dev/flow.js guard` shows no STOP and no FIX.
- Every screenshot the plan lists, light and dark, at 412px and 360px: nothing clipped, nothing scrolling sideways, no literal color.
- Reduced motion: each new animation has no effect under `prefers-reduced-motion` (read the CSS and the `reduced()` guards).
- Nothing saved changed except what the plan says (Q1 WP3 only), and an older save still loads.

**Matt, on his Android phone, two minutes per release** (the plan's "Phone check" list): the things only a hand can judge, such as whether the tab switch feels quick, whether the sheet follows the finger, whether the vibration is pleasant. If one feels wrong, say which, and the next cycle tunes the token or reverts the package.
