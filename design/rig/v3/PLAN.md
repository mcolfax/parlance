# Birds v3: designed for animation, rigged in Rive

- **Status:** approved direction (Matt, 2026-11-18: "rig in Rive"; Recraft "Pip first, ~40 images"). Waiting on a
  Recraft top-up (the account had 35 units, about 4 cents).
- **Replaces** the art and rig half of `design/rig/v2/PLAN.md`. Matt found the v2 look (cel shading on the traced
  birds) not refreshed enough, and the traced, script-rigged skeletons hacky. What carries over from v2: the motion
  rules and specs (v2 section 8), the size and speed budgets (v2 section 9), the baseline captures, and the rule that
  screens keep calling `pip()`, `pipSVG()` and `setPipMood()` unchanged.
- **Why Rive:** it is what Duolingo uses for its characters (moods, lip-sync and reactions in one interactive file,
  driven by a state machine). Its web player is free and open source. And since 2026 the **Rive CLI** builds `.riv`
  files from **RML**, a text format made for coding agents, so agents can build and change the rigs without the editor.
  Matt or an animator can still open the result in the Rive editor (`rive pull` brings editor changes back).
- **Why not Unreal:** see v2 section 2. In short, it needs a GPU desktop that agents don't have, and the phone would get
  pre-rendered video instead of a live bird.
- **Zone:** Red (the birds), approved by Matt for this direction. Each stage below ends at a gate, and Matt looks at
  the designs (Stage A) and the first rigged Pip (Stage D) before anything goes further.

## Where the work runs

| Work | Session | Why |
|---|---|---|
| Recraft (Stage A) | Any session on the **Default** environment | The Recraft key is a network secret saved there |
| Rive (Stages B–E) | A session on the **parlance** environment | It allows `rive.app`, where the CLI installs from; Default doesn't |
| Integration (Stage F) | Either | Only npm (the Rive web player) and the repo |

## Stage A — New designs (Recraft)

Script: `design/rig/v3/recraft.js` (`balance`, `round1`, `sheet <direction>`; `--dry` prints the prompts and cost).
Model `recraftv4_1_vector` (SVG, 0.08 USD an image). Spend is logged to `design/rig/v3/recraft-usage.json`; the
script stops at `--max-usd` (default 5).

1. **Round 1 (12 images, about 1 USD):** `node design/rig/v3/recraft.js round1`. Pip in four directions, three each:
   `soft` (premium mobile-game mascot), `shape` (no outlines, color blocks), `sticker` (matches the Recraft cast),
   `plush` (very round). Build a contact page `design/rig/v3/review/round1.html` (the 12 SVGs in a 4 × 3 grid, light
   and dark backgrounds, at 300 px and at 72 px) and publish it for Matt as a private artifact.
   **Gate A1:** Matt picks a direction (and a favorite image), or asks for changes to the prompt.
2. **Pip's model sheet (16 images, about 1.30 USD):** `node design/rig/v3/recraft.js sheet <direction>`. Turnaround,
   expressions, action poses, and a parts layout. Contact page `review/pip-sheet.html`.
   **Gate A2:** Matt approves Pip's design. The approved images are copied to `design/rig/v3/reference/pip/`.
3. **The other four birds** in the approved direction, with their identities from `MASCOTS` in `js/config.js` and
   their colors from their tokens (`--kiwi-*` …). Add their `PIP`-style descriptions to `recraft.js`. Do this after
   Gate D, so the design is proven in a rig before four more birds are made.

## Stage B — Rive CLI spike (the go/no-go for agent-built rigs)

Session on the **parlance** environment. One agent (Opus, because this sets the method everyone else follows).

1. Install the CLI with the Linux curl script from the Rive CLI's Getting Started page, then `rive doctor`. Write the
   exact commands into `design/rig/v3/tools/setup-rive.sh` (idempotent).
2. `rive create design/rig/v3/spike` and read the `AGENTS.md`/`CLAUDE.md` it writes, and the RML reference.
3. Prove each capability the birds need, in a tiny test file, and record yes/no with the RML that does it in
   `design/rig/v3/RML-NOTES.md`:
   - importing SVG vector paths as shapes, with fills and strokes;
   - bones and a bone hierarchy; binding vector vertices to bones with weights (skinned meshes or vertex binding);
   - animated paths or vertices (shape changes) for squash, cheeks and smears;
   - timelines with eased keys, loops, additive layering or blend states;
   - a state machine with number, boolean and trigger inputs, layers, and blend states;
   - nested artboards (an effect such as dust as its own artboard);
   - colors that the app can set at runtime (so dark mode and tokens still work): data binding or view-model inputs;
   - `rive build`/`--verify` without a login, and whether a published file shows a Rive splash on Matt's plan.
4. **Gate B:** if bones, weights, timelines and a state machine all work from RML, carry on. If something essential
   doesn't, write what's missing and the options (build that part once in the Rive editor by hand, then let agents
   edit around it with `rive pull`; or a human Rive animator for the rig only) and ask Matt.

## Stage C — Parts (vector pieces for the rig)

Agent: parlance-illustrator (Sonnet). From the approved Recraft parts layout and turnaround:

1. Split the parts sheet into one SVG per part in `design/rig/v3/parts/pip/` (`head.svg`, `crest1.svg` …, `wingL-folded.svg`,
   `wingL-spread.svg`, `eyeL-open.svg`, `eyeL-closed.svg`, `beak-upper.svg`, `beak-lower.svg`, `mouth-*.svg` …), each in one
   shared coordinate space so the pieces assemble into the standing pose. The slot and drawing names follow
   `js/core/bird.js`, so every mood still has its pieces.
2. Clean each part: closed paths only, no stray points, every fill one of the bird's palette colors, the outline as a
   stroke where the design has one. Anything the parts sheet lacks (a mouth shape, a closed eye) is drawn to match,
   in SVG, by the same agent.
3. `design/rig/v3/tools/assemble.js pip` composes the parts at rest and overlays the approved front image (onion skin)
   so the fit can be checked; it fails if a part is missing for a slot `bird.js` needs.

## Stage D — Pip in Rive

Agent: parlance-builder (Sonnet), following `RML-NOTES.md` exactly. Files in `design/rig/v3/rive/pip/` (RML) and
the built `media/birds/pip.riv`.

1. **Skeleton:** the bone names from `js/core/bird.js` (root, body, torso, head, wingL/R, tail, crest, legL/R …), plus
   bending chains: 3 bones per wing, 2 per crest feather, 3 for the tail, a 3-bone spine.
2. **Skinning:** bind each part's vertices to its bones (weights as Stage B proved); beak, pupils and eye whites rigid.
3. **Timelines:** one per mood and per move, keyed from v2 section 8 (the format there is the spec; the worked hop
   and cheer and the table rows give every number). The v2 rules (anticipation, overshoot, volume, eyes lead, drag,
   arcs, moving holds, smears, loop seams) still apply; `tools/lint.js` from v2 is adapted to read RML keys.
4. **State machine `Bird`** (the contract with the app; names are fixed):
   - Number `mood`: 0 happy, 1 cheer, 2 oops, 3 think, 4 wow, 5 sleep, 6 wave, 7 point, 8 sad, 9 laugh, 10 shrug,
     11 proud, 12 love, 13 listen, 14 dizzy, 15 fly, 16 dance, 17 ready (the order of `BIRD.moods`).
   - Triggers: `hop`, `nod`, `shake`, `bow`, `lookAround`, `tap` (a different move each time, as `pip()` does today).
   - Booleans `talking`; number `viseme` (0 rest, 1 open, 2 wide, 3 round, 4 closed: m/b/p), driven from
     `rig.js`'s text → viseme script.
   - Numbers `lookX`, `lookY` (−1…1) moving the pupils and head; `blink` automatic on a layer with random timing.
   - Colors from the view model (one property per palette role) so `--pip-*` tokens and dark mode still apply.
5. `rive build` → `media/birds/pip.riv`. Review page `design/rig/v3/index.html`: the Rive web player beside the
   current bird, a button per mood and trigger, talk, look-at the pointer, speed, sizes 40/72/120/240, light/dark.
   **Gate D:** publish the review page for Matt. He approves Pip, or gives notes.

## Stage E — The other four birds

Stage A step 3, then C and D per bird, four in parallel. The state machine contract is identical; only parts, bone
pivots and species extras (Kakadu's seven crest feathers, Rojo's long tail) differ. **Gate E:** Matt looks at the flock.

## Stage F — In the app

Agent: parlance-builder (Sonnet), then verifier and the Opus reviewer.

- The Rive web player (`@rive-app/canvas` from npm, pinned) is **vendored** into `js/vendor/rive/` with its WASM,
  served next to `index.html` (no CDN: no new outside host, and it works offline). Measure its size; it joins the
  offline precache.
- `js/core/rivebird.js`: an adapter with `Rig`'s interface (`create`, `set`, `play`, `say`, `talking`, `look`,
  `lookAtPoint`, `hold`, `el`, `failed`) that drives the state machine. `art.js` uses it for birds listed in
  `RIVE = { birds: [...] }` in `js/config.js`, falls back to the current rig if the player or file fails, and keeps
  the old rig for two releases.
- Stills (avatars, route marker, icons): rendered at build time from the `.riv` with Playwright into
  `media/birds/<bird>/<mood>.webp` at 1× and 2×; `pipSVG()` returns an `<img>` for Rive birds.
- Film: re-render with `node dev/film.js` (the film's birds use the adapter on the film clock).
- Everything in v2's WP9 checklist (reviewer notes on `film.js`, sideways scroll, sizing, tests) applies.
- Budgets: one bird's `.riv` ≤ 300 KB; three live birds at 120 px within the old rig's baseline time per frame
  (`design/rig/v2/baseline/perf.json`); Chrome on Android first, Safari checked.

## What happens to the v2 work

- `js/core/rig2.js` and `media/birds/pip.json` stay on the branch unused, as a free fallback if Rive fails Gate B.
  They aren't loaded by the app.
- The v2 baseline captures and the motion specs in v2 section 8 are reused by Stage D.
- The v2 cel-shading tokens (`--pip-*-shade`, `-light`) are removed before anything ships, unless the new design
  uses them.
