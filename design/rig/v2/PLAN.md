# Birds v2: premium 2D animation for Pip and the flock

- **Status:** draft, waiting for Matt (Stage 0 below)
- **Written:** 2026-11-18, against `main` as of this date
- **Zone:** Red (flow/POLICY.md, "Identity: Pip or the other birds' art or rig"). Nothing here is built by the flow until
  Matt approves the Stage 0 proposals himself. After that, each stage ships as an ordinary release.
- **Executors:** written so Sonnet (`parlance-builder`, `parlance-illustrator`, `parlance-verifier`) and Haiku
  (`parlance-chores`) agents can build every package without making design decisions. Opus (`parlance-reviewer`)
  reviews at the end of each stage. Matt looks at the pilot (Stage 4) and the final flock (Stage 6).

Read first, in this order: `CLAUDE.md`, `design/rig/README.md`, `design/rig/blender/README.md`, this file.

---

## 1. The short version

The birds today are a **cut-out SVG rig**: each part is a rigid drawing that rotates around a pivot. That is why they
feel "app-like" rather than "animated": shapes never bend, squash only scales a whole part, and the moves are short
tracks of a few keys each (see `clips` in `js/core/bird.js`).

Premium 2D (the kind in good mobile games and title sequences) comes from four things, none of which need a 3D engine:

1. **Shapes that deform.** The body squashes and keeps its volume, the neck bends, wing feathers curl, the cheeks
   push up when the bird smiles. That is bones and blend shapes driving the *outline points* of each drawing.
2. **Timing and spacing.** Anticipation before every action, overshoot and settle after, arcs instead of straight
   lines, eyes leading the head, children dragging behind parents, moving holds instead of dead stops.
3. **Richer rendering.** Two-tone cel shading, a rim of light, tapered ink lines (thick away from the light, thin
   toward it), eye specular highlights, a few feather strokes.
4. **2D effects.** Dust puffs on landing, smear frames on fast wing beats, speed lines, impact stars, drawn frame by
   frame as short vector swap sequences.

The plan: **keep Blender as the animation tool** (it already holds all five rigs, is free, and runs headless in cloud
sessions so agents can drive it), make the drawings deform instead of swinging, re-animate every mood and move to a
written motion spec, and play the result with a **new small vector runtime** (`js/core/rig2.js`) that keeps everything
the current rig does well: sharp at any size, recolored by tokens and dark mode, alive (look-at, blinks, talking,
springs), tiny, offline.

## 2. Why not Unreal Engine

Matt asked about Unreal. My recommendation is not to use it here, for four reasons:

| | Unreal Engine | Blender + rig2 (this plan) |
|---|---|---|
| Can agents run it? | No. The editor needs a desktop with a GPU and about 100 GB; cloud sessions have neither (no GPU, a fixed disk allowance). Lesser models couldn't execute any step. | Yes. `pip install bpy` gives headless Blender 5.2 on the container's Python 3.13. The current rigs were built this way. |
| What reaches the phone | Pre-rendered frames or video. Each mood × bird × size is a sprite sheet: tens of MB, against an offline cache of about 6 MB today. | One JSON file per bird (target ≤ 120 KB gzipped) and one script (≤ 35 KB minified). |
| Live behavior | Lost. A video can't look where you touch, lip-sync a line, blend between moods, or switch to dark-mode colors. | Kept. Everything `Rig.create` does today, plus deformation. |
| 2D strength | Paper2D is a sprite tool; Unreal's strength is 3D lighting. A "2D" look from Unreal is 3D rendered flat. | Bones, weight painting, shape keys, Grease Pencil and the Graph Editor are first-class 2D animation tools. |
| Cost | Free under the revenue threshold, but needs Matt's own machine for every change. | Free. |

If Matt later hires an animator, **Spine** is the tool they will know. The rig2 format (section 6) maps one to one
onto Spine's skeleton, slots, attachments, weighted meshes and deform timelines, so an exporter can be added then
without redrawing anything. Spine costs money (a Professional license is needed for weighted meshes and for using its
runtimes), so it is a Matt decision, not part of this plan. Rive was considered and set aside: its files can only be
authored in its editor, so agents can't build or change them.

## 3. Stage 0: Matt's decisions

Each is a "Your call: …" proposal (flow/POLICY.md, "Asking Matt"). Nothing below Stage 0 starts until (a) is approved.

| # | Question | Recommendation | Costs money? |
|---|---|---|---|
| a | Rebuild the birds' animation with Blender + a new deforming vector runtime (this plan), instead of Unreal. | Yes. | No |
| b | Track A look: keep the traced birds' shapes and proportions, add cel shading, tapered ink, eye highlights and feather strokes (Stage 4). | Yes; judge the Pip pilot before going further. | No |
| c | Track B (optional, after the pilot): new model sheets with refined proportions, made in Recraft from the current sheets, then retraced. | Only if the pilot shows the shapes themselves hold the birds back. Needs `budgets.recraftUnitsPerMonth` raised in `flow/policy.json` (Matt only). About 120 images; check Recraft's current price per image before raising it. | Yes |
| d | Rollout: Pip first behind a config switch, then the other four, the old rig kept as a fallback for two releases. | Yes. | No |

The flow records each answer by the proposal's `status`. Builders check that (a) is `approved` with no
`decidedBy: "flow"` before Stage 1.

## 4. Tools

Everything runs in a cloud session. Nothing here needs Matt's computer, a GPU or a paid service.

| Tool | Version | Used for | Install (Stage 1 writes `design/rig/v2/tools/setup.sh`) |
|---|---|---|---|
| Blender (as `bpy`) | 5.2 LTS | Rigs, weights, shape keys, actions, previews | `pip install bpy==5.2.* svgelements shapely mapbox_earcut numpy` (Python 3.13) |
| Node | ≥ 22 | Runtime tests, exporters' JS side, bake, lint, contact sheets | present |
| Playwright + Chromium | preinstalled | Contact sheets, perf runs, review-page shots, film render | present (never `playwright install`) |
| ffmpeg | present | Review videos, intro film | present |
| Blender desktop | 5.2 | Optional, for Matt to scrub or hand-polish an action | blender.org, free |
| Recraft | via proxy | Track B only, with budget | proxy-injected; budget gated |
| Spine, Rive, Unreal, After Effects | — | Not used | — |

## 5. Architecture

```
design/rig/reference/<bird>-sheet.webp          (concept art; Track B adds <bird>-sheet-v2.webp)
        │  existing trace kit (tools/trace/)
        ▼
js/core/<bird>.js  part sheet (SVG drawings, palette)          ← unchanged source of the shapes
        │  design/rig/v2/tools/refine.py   (Stage 4: shade, rim, taper widths, highlights, feather strokes)
        ▼
design/rig/v2/build/<bird>.parts.json  refined drawings as outline loops
        │  design/rig/v2/tools/build_blend.py  (meshes, bones + bending chains, auto weights, shape keys)
        ▼
design/rig/v2/<bird>.blend  ◄──── design/rig/v2/motion/*.json   (motion specs: the animation source of truth)
        │                         applied by tools/key.py; tools/pull_motion.py reads hand edits back
        │  design/rig/v2/tools/export.py
        ▼
media/birds/<bird>.json   rig2 data (section 6)
        │
        ▼
js/core/rig2.js   Canvas 2D live renderer + SVG still renderer, same API as Rig
        │
        ▼
js/core/art.js   pip(), pipSVG(), avatar(), setPipMood() pick Rig2 when RIG2.birds includes the bird
```

Rules that keep this cheap for agents:

- **Motion is text.** Every action's keys live in `design/rig/v2/motion/<action>.json` (shared by all birds; a bird
  may add `motion/<bird>/<action>.json` overrides). The `.blend` is rebuilt from the part sheet plus motion specs by one
  command, so no agent ever has to edit a binary file. If Matt polishes an action by hand in Blender,
  `tools/pull_motion.py <bird> <action>` writes his keys back to JSON and that becomes the source.
- **One bird first.** Everything is built and approved on Pip before the others start.
- **Same API.** `rig2.js` exposes exactly what `Rig` does (`create`, `svg`, `validate`, `hold`, and on an instance
  `set`, `play`, `stop`, `say`, `talking`, `look`, `lookAtPoint`, `override`, `speed`, `setDebug`, `el`), so screens
  don't change. `art.js` is the only app file that chooses between them.
- **Tokens still color everything.** rig2 data holds palette *roles*, never colors. The runtime reads the bird's
  `--<bird>-<role>` custom properties from the element and re-reads them when the theme changes.

## 6. The rig2 data format (`media/birds/<bird>.json`)

Units are setup space (240 wide, centre x 120, ground y 250), as today. All numbers rounded to 2 decimals.

```jsonc
{
  "format": "parlance-rig2", "v": 1, "id": "pip", "name": "Pip",
  "roles": ["body", "body-shade", "body-light", "belly", "ink", "..."],    // every role used; CSS var --pip-<role>
  "bones": [                       // parents before children; same ids as js/core/bird.js, plus chain bones
    { "id": "root", "parent": "facing", "x": 114, "y": 250 },
    { "id": "wingL.1", "parent": "wingL", "x": 92, "y": 178, "len": 14 }
  ],
  "slots": [                       // draw order at rest, back to front
    { "id": "wingR", "bone": "wingR", "rest": "folded", "drawings": ["folded", "spread", "smear1", "smear2"] }
  ],
  "drawings": {
    "wingR/folded": {
      "pts":  [x0, y0, x1, y1, ...],                 // every outline loop's points, flattened
      "skin": [[b, w, b, w], ...],                   // per point: up to 3 (bone index, weight) pairs, weights sum to 1
      "loops": [[0, 64], [64, 80]],                  // [start, count] into pts; a loop after the first in a layer is a hole
      "layers": [                                    // painted in order
        { "fill": "body", "loops": [0] },
        { "fill": "body-shade", "loops": [1] },
        { "ink": "ink", "loop": 0, "w": [2.2, 2.4, "..."] }   // tapered outline: a width per point of that loop
      ],
      "shapes": { "squash": [[pointIndex, dx, dy], ...] }       // blend shapes: sparse deltas
    }
  },
  "actions": {
    "mood:cheer": {
      "dur": 1.3, "loop": false, "add": false, "blink": true, "glance": false,
      "curves": { "wingL.r": [[t, v, tIn, vIn, tOut, vOut], ...] },  // Blender bezier keys: time, value, both handles
      "swaps":  [[t, "wingL", "spread"]],
      "order":  [[t, "wingR", 2]],                    // move a slot to this draw-order index
      "shapes": { "body/on:squash": [[t, v, ...handles]] },
      "fx":     [[t, "dust", 0, 0]]                   // start an effect sequence at (x, y) in root space
    },
    "move:hop": { "dur": 0.67, "add": true, "...": "..." }
  },
  "fx": { "dust": { "fps": 24, "frames": ["fx/dust1", "fx/dust2", "..."] } },
  "procedural": { "springs": {}, "look": {}, "turn": {}, "idle": {}, "mouth": {} }   // copied from the bird def in js/core
}
```

Channels on a bone: `r` (degrees), `x`, `y`, `sx`, `sy`. Curves are Blender's own bezier keyframes with their handles,
so the runtime evaluates exactly what Blender shows (golden test in WP2). A drawing's points are skinned with linear
blend skinning: `p' = Σ wᵢ · Mᵢ · B⁻¹ᵢ · p`, where `Mᵢ` is the bone's world matrix this frame and `B⁻¹ᵢ` its inverse
bind matrix (exported per bone as `"inv": [a, b, c, d, e, f]`). Blend shapes are added to `p` before skinning.

---

## 7. Stages and work packages

Each package follows `flow/plans/TEMPLATE.md`: agent, model, what it owns, what it reads, steps, and checkable
acceptance criteria. Packages in the same stage marked *parallel* own disjoint files and can run in separate worktrees.

### Stage 1 — Toolchain and baseline

#### WP1 · Setup script and baseline captures

- **Agent / model:** parlance-chores / haiku. **Runs:** first.
- **Owns:** `design/rig/v2/tools/setup.sh`, `design/rig/v2/tools/baseline.js`, `design/rig/v2/baseline/`
- **Reads first:** `design/rig/blender/README.md` ("Rebuilding from the part sheet"), `design/rig/tools/trace/moods.js`

**Steps.**
1. Write `setup.sh`: the `pip install` line from section 4, then `python3 -c "import bpy; print(bpy.app.version_string)"`.
   It must be idempotent and exit non-zero if `bpy` doesn't import.
2. Write `baseline.js <bird|all>`: with Playwright, open `design/rig/svg.html#<bird>` from `npm run preview`, and for
   each mood in `BIRD.moods` record 2 seconds at 412 × 412 CSS px, deviceScaleFactor 1, 60 fps screenshots piped to
   ffmpeg → `design/rig/v2/baseline/<bird>/<mood>.mp4` (H.264, CRF 28). Also write a contact sheet PNG per bird
   (every mood at its 0.5 s frame, 6 columns).
3. Add `design/rig/v2/baseline/*.mp4` to `.gitignore` (only the contact sheets are committed).
4. Measure the current rig's cost: in the same page, with `page.emulateCPUThrottling` via CDP at rate 4, run three
   live Pips for 5 s and record mean and p95 ms per animation frame spent in the rig's tick. Write
   `design/rig/v2/baseline/perf.json`.

**Acceptance.**
- [ ] `sh design/rig/v2/tools/setup.sh` prints `5.2` and exits 0 in a fresh session.
- [ ] `node design/rig/v2/tools/baseline.js all` writes 5 contact sheets and `perf.json` with `mean` and `p95` per bird.

### Stage 2 — Format and exporter

#### WP2 · Exporter from Blender to rig2 JSON

- **Agent / model:** parlance-builder / sonnet. **Runs:** after WP1.
- **Owns:** `design/rig/v2/FORMAT.md`, `design/rig/v2/tools/export.py`, `design/rig/v2/tools/golden.py`,
  `design/rig/v2/test/`
- **Reads first:** section 6, `design/rig/blender/build/build_blend.py` and `export.py` (how meshes, `show_` bones,
  depth order and `ctl_` mirrors are built today), `design/rig/blender/pip3d.js` (what the glTF player derives).

**Spec.**
- Input: a `.blend` built by the existing `design/rig/blender/build/build.sh` (Stage 2 works on the current Pip, so
  format and runtime are proven before any art changes).
- For each mesh: walk its boundary edges into ordered loops (outer first, counter-clockwise; holes clockwise). Resample
  each loop to a point every 2.5 units (keep every vertex whose turning angle exceeds 35°, so corners stay sharp).
  Weights: for each kept point, the vertex group weights of the nearest original vertex, top 3, renormalized.
- Material name → role (the existing build names materials after roles).
- `show_<slot>_<drawing>` bone scale keys → `swaps` (scale ≥ 0.5 means shown). Depth (bone location Y) keys → `order`.
- Every action → `actions` (`mood:<name>` or `move:<name>` from the action name; `loop`, `blink`, `glance` from its
  custom properties). F-curve keyframes with handles, times in seconds (frame / scene fps).
- `procedural`: copy `springs`, `look`, `turn`, `idle` and `mouth` from the bird's definition, read by running
  `node -e` on `js/core/bird.js` + the part sheet (as `build/bake_moods.js` does).
- Write `FORMAT.md`: section 6 expanded into a full field reference, with one complete small example.

**Steps.**
1. Write `export.py <bird.blend> <out.json>`.
2. Write `golden.py <bird.blend>`: for 5 actions and every curve, sample `fcurve.evaluate(frame)` at 60 points and
   write `design/rig/v2/test/<bird>-golden.json`.
3. Run both for Pip. Commit the exported `media/birds/pip.json` only once WP3 plays it.

**Acceptance.**
- [ ] `python3 design/rig/v2/tools/export.py design/rig/blender/pip.blend /tmp/pip.json` writes valid JSON with every
  slot and drawing that `Rig.validate(PIP)` knows, and every mood in `BIRD.moods`.
- [ ] Gzipped size printed by the script is ≤ 120 KB.
- [ ] Every point's weights sum to 1 ± 0.001; no drawing has fewer than 4 points per loop.

### Stage 3 — The runtime

#### WP3 · `js/core/rig2.js`

- **Agent / model:** parlance-builder / sonnet. **Runs:** after WP2. Reviewed by parlance-reviewer (opus) before Stage 4.
- **Owns:** `js/core/rig2.js`, `design/rig/v2/index.html` (review page), `design/rig/v2/test/rig2.test.js`
- **Reads first:** `js/core/rig.js` end to end (it is the behavior spec: blending, idle, blink, glance, look-at with
  `look.room`, springs, talk visemes, 2.5D turn, mirrors, the shared frame loop, off-screen and background pause,
  reduced motion, `Rig.hold()`), `design/rig/v2/FORMAT.md`.
- **Must not touch:** `js/core/rig.js`, `js/core/art.js`, `index.html` (integration is WP9).

**Spec.**
- Classic script defining `const Rig2 = (() => { ... })()`. No dependencies, no modules.
- `Rig2.load(id)` → `Promise<def>`: fetches `media/birds/<id>.json` once, caches it, builds Float32Arrays for points,
  bone indices and weights, and precomputes each curve's segments.
- `Rig2.create(def, opts)` returns an object with the same members as `Rig.create` (list in section 5). `el` is a
  `<span>` holding one `<canvas>` sized by CSS to `opts.size` and backed at `devicePixelRatio` (cap 3).
- Per frame:
  1. Evaluate the current mood action (blending from the previous one over 0.25 s with ease-in-out, as `rig.js`
     does), then additive moves on top, then `override`.
  2. Procedural layers in the order `rig.js` applies them: idle breathe and head drift, blink, glance, look-at,
     talk (jaw and mouth swaps from the viseme script, reusing `rig.js`'s text → viseme function by copying it), turn.
  3. Springs on chain bones (`procedural.springs`), integrated with a fixed 1/120 s step.
  4. World matrices, parents first. Mirror bones (`facing`, `head` past the front) as in `rig.js`.
  5. For each visible drawing: add active blend shapes, skin every point (section 6), then for each layer build one
     `Path2D` with a closed Catmull–Rom spline through the loop's points (tension 0.5, converted to cubic beziers),
     and fill it. An `ink` layer is drawn as a filled ribbon: offset each point by ±w/2 along its averaged normal,
     both sides joined into one closed path. Ink width in screen pixels is clamped to the range `rig.js` uses
     (about 1.35 px at the outline), by scaling all `w` by one factor per size.
  6. Effects: an `fx` sequence shows its frames at its own fps, then ends.
- Bezier evaluation: for a segment between keys k0 and k1, solve the cubic in time for `t` with Newton's method
  (6 iterations, bisection fallback), then evaluate the value cubic. Must match `golden.json` to 0.01.
- Colors: on create and whenever `prefers-color-scheme` changes or `<html data-theme>` changes (one shared
  `MutationObserver`), read `getComputedStyle(el).getPropertyValue('--' + id + '-' + role)` for each role.
- `Rig2.svg(def, mood, opts)` returns the same kind of string `Rig.svg` does, from the same deformation at the mood's
  rest frame (or `opts.t`), with paths instead of a canvas and `class="k-<role>"` fills so the existing `pipCSS()`
  colors it. Avatars, icons and the film use this.
- One shared `requestAnimationFrame` loop for all instances; `IntersectionObserver` pauses off-screen birds;
  `document.hidden` pauses all; `prefers-reduced-motion: reduce` draws the mood's rest frame once and holds.
- Review page `design/rig/v2/index.html`: bird picker, the live Rig2 next to the live old Rig at the same size, a
  button per mood and per move, a speed slider (0.1–1), size buttons (40, 72, 120, 240 px), a light/dark switch,
  an onion-skin toggle (draws the last 6 frames at 15% opacity), and the bones overlay (`setDebug`).

**Steps.**
1. Write the pure math first (matrices, skinning, curve evaluation, spline to path) as functions on `Rig2._m` so they
   can be tested in Node without a canvas.
2. Write `rig2.test.js` (plain Node, no jsdom): curve evaluation against `pip-golden.json`; skinning a point weighted
   1.0 to a bone rotated 90° about its pivot; weights summing to 1; `Rig2.svg` output for every mood parses with
   `DOMParser` in jsdom and contains every role class.
3. Write the renderer, then the review page.
4. Add `node design/rig/v2/test/rig2.test.js` to `dev/test.js`'s list of sub-checks (one line, guarded so a missing
   `media/birds/pip.json` is a FAIL with a clear message).

**Acceptance.**
- [ ] `node design/rig/v2/test/rig2.test.js` ends with `ok`.
- [ ] On the review page at 412 px wide, light and dark, every mood of the current Pip plays and matches the old rig
  side by side (same pose within a few units: this stage changes the player, not the look).
- [ ] With CPU throttling 4×, three live Pips at 120 px cost mean ≤ 1.5 ms and p95 ≤ 3 ms per frame (measured the
  way WP1 measured the old rig; compare against `baseline/perf.json`).
- [ ] `rig2.js` is ≤ 35 KB after `npx terser -c -m` (measure only; the app ships it unminified like every script).
- [ ] Reduced motion: one draw, then no further canvas draws for 2 s (count calls with a wrapped `fill`).

### Stage 4 — Pip pilot (deformation, the new look, hero moves)

#### WP4 · The refined Pip (Track A look)

- **Agent / model:** parlance-illustrator / sonnet. **Runs:** after WP3. *Parallel with WP5.*
- **Owns:** `design/rig/v2/tools/refine.py`, `design/rig/v2/build/`, `styles/tokens.css` (new `--pip-*-shade` and
  `--pip-*-light` tokens only, light and dark), `design/rig/v2/look.md`
- **Reads first:** `js/core/pip.js` (palette and part sheet), `styles/tokens.css` (`--pip-*`), `design/rig/reference/pip-sheet.webp`, `dev/contrast.js`

**Spec (every number is fixed; don't tune by taste).**
- **Light** comes from the upper left: direction (−0.6, −0.8).
- **Shade:** for each filled part whose role is a feather or body color (not ink, eye whites, pupils, effects):
  `shade = part − translate(part, −4·dx, −4·dy)` intersected with `part`, then `buffer(+1.2).buffer(−1.2)` to round
  it, dropped if its area is under 3% of the part's. Role `<role>-shade`.
- **Light (rim):** `part − translate(part, +2.5·dx, +2.5·dy)` intersected with `part`, buffered the same way, kept
  only where it is within 3.5 units of the outline. Role `<role>-light`.
- **Shade and light colors:** in OKLCH, shade = base with L − 0.10, C × 1.05, hue shifted 8° toward blue; light =
  L + 0.08, C × 0.9. In dark mode use the same rule on the dark-mode base. Write them as new tokens
  (`--pip-body-shade`, `--pip-body-light` …). `node dev/contrast.js` must still end with `ok`.
- **Tapered ink:** the outline width at each point is `2.6 × (1 + 0.35 × n·(−light))`, clamped to [1.9, 3.4], where
  `n` is the outward normal; interior feature lines (`ln`) are 1.6, fine detail (`ln2`) 1.1.
- **Eyes:** two specular dots on each open pupil: radius 0.28 × pupil radius at (−0.35, −0.35) of the pupil radius,
  and 0.12 × at (+0.3, +0.25); role `eye-spec` (white in both modes). Only on open, wide, wet and lidded.
- **Feather strokes:** three tapered `ln2` strokes on each wing drawing and two on the tail, each from 30% to 75% of
  the way along the drawing's long axis, spaced evenly across it, curving with the outline (offset the outline
  inward by 25%, 50% and 75% of the local half-width).
- `refine.py pip` reads the part sheet through `node` (as the build does), writes
  `design/rig/v2/build/pip.parts.json`, and draws a before/after contact sheet `design/rig/v2/build/pip-look.png`
  (happy, cheer, oops, at 240 px and 72 px, light and dark).

**Acceptance.**
- [ ] `python3 design/rig/v2/tools/refine.py pip` is deterministic (two runs give byte-identical JSON).
- [ ] `node dev/contrast.js` ends with `ok`; `node design/rig/check.js` ends with `ok`.
- [ ] The contact sheet shows shade on the lower right of every feathered part and no shade or light shape crosses
  an outline (the verifier looks at it at 240 px).

#### WP5 · Deforming rig and motion tooling

- **Agent / model:** parlance-builder / sonnet. **Runs:** after WP3. *Parallel with WP4* (uses the current parts until
  WP4 lands, then rebuilds).
- **Owns:** `design/rig/v2/tools/build_blend.py`, `design/rig/v2/tools/key.py`, `design/rig/v2/tools/pull_motion.py`,
  `design/rig/v2/tools/lint.js`, `design/rig/v2/tools/strip.js`, `design/rig/v2/build.sh`, `design/rig/v2/pip.blend`
- **Reads first:** `design/rig/blender/build/build_blend.py` and `animate_blend.py`, section 8 of this plan.

**Spec.**
- `build_blend.py <bird>` builds on the existing build (copy it; don't import from `design/rig/blender/build/`) with
  these changes:
  - Meshes are built from `build/<bird>.parts.json` (WP4) when it exists, else from the part sheet.
  - **More deforming bones:** body gets a 3-bone spine chain (`body.1–3`, from the body pivot to the neck) so the body
    bends; head gets `head.top` and `head.chin` so it squashes; each cheek gets `cheekPushL/R` under the eye. Legs get
    `legL.knee`/`legR.knee`.
  - **Weights:** `ARMATURE_AUTO` (heat) weights, then limited to 3 groups per vertex and normalized. The beak,
    pupils and eye whites stay rigid (weight 1 to their own bone).
  - **Blend shapes** (shape keys) on `body/on`: `squash` (height × 0.82, width × 1.18 about the feet, area kept within
    2%), `stretch` (height × 1.15, width × 0.88); on `head/on`: `squash` (× 0.9 / × 1.08 about the neck pivot), and
    `cheeksUp` (the 12 points nearest each cheek move up 2.5 units).
- `key.py <bird> [action …]` reads `motion/*.json` (section 8 format), writes every key into the bird's actions with
  the given interpolation and handle types, and saves the `.blend`. Re-running with no changes leaves the file's
  actions identical.
- `pull_motion.py <bird> <action>` writes an action's keys back to `motion/<action>.json` (or the bird override file
  if one exists) in the same format, so a hand-polished action becomes the source.
- `build.sh <bird>` = `build_blend.py` → `key.py` → `../v2/tools/export.py` → `media/birds/<bird>.json` → `lint.js`.
- `lint.js <bird> [action]` checks every action against section 8's rules and prints `ok` or one line per breach.
- `strip.js <bird> <action> <out.png>` renders a filmstrip (every 3rd frame, 12 per row, 160 px cells) plus an
  onion-skin overlay of the whole action in one cell, with the frame numbers under each. Agents read this image to
  check their animation; Matt sees the same strips on the review page.

**Acceptance.**
- [ ] `sh design/rig/v2/build.sh pip` runs headless start to finish and writes `media/birds/pip.json`.
- [ ] Posing `body.1–3` at 15° each in a test action bends the body smoothly in the strip (no kinks, no gaps at the
  wing roots or legs).
- [ ] `squash` keeps the body's area within 2% (checked by `lint.js`).

#### WP6 · Pip's hero moves

- **Agent / model:** parlance-builder / sonnet. **Runs:** after WP4 and WP5.
- **Owns:** `design/rig/v2/motion/{idle,hop,cheer,wobble,wave,blink}.json`, the `fx/dust`, `fx/sparkle`,
  `fx/impact` and wing smear drawings (in `design/rig/v2/fx.js`, drawn as code in the style of `FX_PARTS` in
  `js/core/bird.js`)
- **Reads first:** section 8 (rules and the two worked specs), `design/rig/v2/tools/strip.js`.

**Steps.**
1. Write `hop.json` and `cheer.json` exactly from section 8.3 and 8.4.
2. Write `idle`, `wobble` (the `oops` mood's move), `wave` and `blink` from their rows in section 8.5.
3. Draw the effects: `dust` (6 frames at 24 fps: two puffs spreading 0 → 22 units either side of the feet, rising
   4 units, radius 3 → 7, fading by shrinking to nothing in frames 5–6), `sparkle` (8 frames: four 4-point stars
   from `STAR` in `bird.js`, scaling 0 → 1.2 → 1 then 0, staggered 1 frame each), `impact` (4 frames: 5 short tapered
   lines radiating from a point, length 4 → 10 → 6 → 0), wing smears (`smear1`, `smear2`: the spread wing's outline
   stretched 1.5× along its swing direction with its trailing edge cut into three tapered points).
4. `sh design/rig/v2/build.sh pip`, then `node design/rig/v2/tools/lint.js pip` until it prints `ok`.
5. Write strips for all six into `design/rig/v2/review/pip/` and look at each one. Fix any frame where a part
   detaches, an outline crosses itself or a shade shape leaves its part.

**Acceptance.**
- [ ] `lint.js pip` ends with `ok`.
- [ ] Strips exist for the six actions; the verifier confirms in each: anticipation before the main motion, overshoot
  and settle after, no detached parts.
- [ ] The review page plays old and new side by side for these moods.

#### Stage 4 gate: Matt looks at the pilot

The orchestrator publishes `design/rig/v2/index.html` as a review artifact (with `media/birds/pip.json`,
`js/core/rig2.js` and the strips), and writes a "Your call: the new Pip" proposal linking it, with three options in
`change`: go on as is (Stage 5), go on with notes, or do Track B first. Stop until Matt answers.

### Stage 5 — Pip's whole library

#### WP7 · Every mood and move for Pip

- **Agent / model:** parlance-builder / sonnet, two agents in parallel worktrees splitting the list in section 8.5
  (agent 1: rows 1–12, agent 2: rows 13–24). **Runs:** after the Stage 4 gate.
- **Owns:** `design/rig/v2/motion/<its rows>.json`, `design/rig/v2/review/pip/`
- **Steps and acceptance:** as WP6 steps 2, 4 and 5, for its rows; and every mood in `BIRD.moods` and every clip in
  `BIRD.clips` has an action in `media/birds/pip.json` (`lint.js` checks coverage).

### Stage 6 — The other four birds

#### WP8 · Kiwi, Mango, Kakadu, Rojo

- **Agent / model:** parlance-illustrator / sonnet for the look, then parlance-builder / sonnet for the build: one pair
  per bird, four birds in parallel worktrees. **Runs:** after WP7.
- **Owns (per bird):** `design/rig/v2/build/<bird>.*`, `design/rig/v2/<bird>.blend`, `media/birds/<bird>.json`,
  `design/rig/v2/motion/<bird>/`, the bird's new `--<bird>-*-shade`/`-light` tokens.
- **Spec.**
  - `refine.py <bird>` and `build.sh <bird>` with no changes to the shared rules.
  - Species extras get their own chains: Kakadu's seven crest feathers fan with a 2-frame stagger from the back
    feather to the front (override `motion/kakadu/cheer.json`, `wow.json` and `listen.json`: crest raises to +38°,
    +34°, … +14° from back to front); Rojo's long tail gets a 4-bone chain with spring `k` 90 (heavier, slower);
    Kiwi plays every action at 1.12× speed (`"speed": 1.12` in `motion/kiwi/_bird.json`, which `key.py` applies by
    scaling times); Mango at 0.92×.
  - A front-facing bird (Kiwi, Mango, Kakadu) uses the shade rule unchanged.
- **Acceptance (per bird):** `lint.js <bird>` ends with `ok`; strips for happy, cheer, oops, wave and dance; the
  review page shows it beside its old rig, light and dark.

#### Stage 6 gate: Matt looks at the flock

Same as the Stage 4 gate, for all five birds. Stop until Matt answers.

### Stage 7 — In the app

#### WP9 · Integration, stills, icons, film, release

- **Agent / model:** parlance-builder / sonnet, then parlance-chores / haiku for the renders, then parlance-verifier
  and parlance-reviewer. **Runs:** after the Stage 6 gate (or after the Stage 4 gate for a Pip-only release, if Matt
  chooses that in (d)).
- **Owns:** `js/core/art.js` (the choosing only), `index.html` (one `<script src="js/core/rig2.js">` after
  `rig.js`), `js/config.js` (`RIG2`, `APP_VERSION`, `RELEASES`), `js/main.js` (preloading the bird's rig2 data before
  the first screen, as it preloads the part sheet), `dev/test.js`, `media/film/`, `media/icons/`
- **Spec.**
  - `js/config.js`: `const RIG2 = { birds: ['pip'] };` (add the others when Stage 6 ships). `?rig=1` in the URL
    forces it on for every bird and `?rig=0` off, for review and for tests.
  - `art.js`: `pip()`, `pipSVG()`, `avatar()` and `setPipMood()` use `Rig2` when the bird is in `RIG2.birds` and its
    data has loaded, else `Rig` exactly as today. If `Rig2.load` fails, log once and use `Rig`; never show nothing.
  - Nothing saved changes: no new settings field, no schema bump. `settings.mascot` is untouched.
  - The old rig, part sheets and Blender v1 files stay, as the fallback, for two releases.
  - Film: `node dev/film.js` re-renders every bird that is in `RIG2.birds` (its fingerprint will have changed); commit
    `media/film/`. Icons: `NODE_PATH="$(npm root -g)" node dev/icons.js`; only if Matt said yes to the new Pip on the
    Home Screen icon (it's a separate Red line: ask in the Stage 4 proposal).
  - Tests in `dev/test.js`: with `RIG2` on, every screen that draws a bird renders one (count canvases or `.pip-svg`);
    a failed `media/birds/pip.json` fetch falls back to the old rig; `pipSVG()` returns SVG with every role class for
    every mood; reduced motion holds.
- **Steps:** the shipping steps in `CLAUDE.md`, "Shipping a release". `npm run files` must list `media/birds/*.json`
  and `js/core/rig2.js` so the artifact publish includes them; `npm run offline-check` must pass (the new files are
  precached).
- **Acceptance.**
  - [ ] `npm test` ends with `FAIL 0`; `node dev/contrast.js`, `node design/rig/check.js` end with `ok`;
    `npm run offline-check` passes.
  - [ ] `node dev/flow.js shots --steps "tab:Learn;shot:learn"` and a lesson finish screen at 412 px, light and dark,
    show the new bird crisp, unclipped, no sideways scroll.
  - [ ] On the web version in Chrome on Android (Matt's phone), the Learn screen's bird runs smoothly: the verifier
    checks with CPU throttling 4× in Playwright at 412 px; Matt confirms on the device.
  - [ ] Safari: the review page and the Learn screen render on WebKit (`playwright.webkit` if available in the
    container; otherwise ask a friend with an iPhone and say so in the report).

### Stage 8 — After two releases

Remove the fallback only if Matt says so (it is internal, but it touches the birds' rig, so it is his call): delete
`Rig` usage from `art.js`, keep `js/core/rig.js` for `Rig.svg` only if anything still uses it.

---

## 8. Motion: the rules and the specs

### 8.1 Motion spec format (`design/rig/v2/motion/<action>.json`)

```jsonc
{
  "action": "move:hop",           // or "mood:cheer"
  "fps": 60, "frames": 40, "loop": false, "add": true,
  "blink": true, "glance": false,
  "keys": {                       // channel → [[frame, value, interp?], ...]; interp: "bezier" (default, auto-clamped
                                  // handles), "linear", "constant", or {"out": [dx, dy], "in": [dx, dy]} handles in frames/units
    "root.y":  [[0, 0], [8, 3], [10, -6], [20, -26], [22, -27], [24, -26], [32, 0], [34, 0], [40, 0]],
    "root.sy": [[0, 1], [8, 0.86], [10, 1.14], [16, 1], [30, 1.06], [34, 0.84], [37, 1.04], [40, 1]]
  },
  "shapes": { "body/on:squash": [[0, 0], [8, 0.6], [10, 0], [32, 0], [34, 1], [37, 0]] },
  "swaps":  [[11, "legL", "tuck"], [11, "legR", "tuck"], [30, "legL", "stand"], [30, "legR", "stand"]],
  "order":  [],
  "fx":     [[32, "dust", 0, 0]]
}
```

Values are added to the pose for `add: true` (scale channels multiply). Times are frames at 60 fps; `key.py` writes
them into Blender at the scene's fps.

### 8.2 The rules `lint.js` checks

| Rule | Check (per action, sampled every frame) |
|---|---|
| Anticipation | Before any channel's largest move (peak velocity), the same channel moves the *opposite* way by 8–25% of that move's amplitude, for 4–10 frames. Applies to `root.y`, `root.x`, `head.r`, `wingL.r`, `wingR.r`. Exempt: `blink`, `idle`, `talk`. |
| Overshoot and settle | After a channel reaches a held value, it passes it by 4–15% of the move, then settles in 1–3 decaying swings within 6–20 frames. |
| Volume | Wherever `root.sx`, `root.sy` or a squash/stretch shape is keyed, `sx × sy` stays within 0.97–1.03 and body area within 2%. |
| Eyes lead | When `head.r` or `turn` changes by more than 8°, the pupils (look) reach 70% of their shift 3–6 frames before the head does. |
| Drag | `crest*`, `tail*` and wing-tip chain bones peak 2–4 frames after their parent bone (springs give this; keyed ones must be offset). |
| Arcs | `head` world position during a move of more than 8 units never travels in a straight line for more than 6 frames (its path's curvature is never zero over that span). |
| No dead holds | In a held stretch longer than 30 frames, at least one channel drifts by 0.5–2% (a moving hold). Idle layers count. |
| Smears | When a wing's angular speed exceeds 900°/s for 2 or more frames, a `smear1` or `smear2` swap covers those frames. |
| Loop seam | For `loop: true`, every channel's value and slope at the last frame match the first within 1%. |
| Coverage | Every mood in `BIRD.moods` and every clip in `BIRD.clips` has an action (Stage 5 on). |

### 8.3 Worked spec: `move:hop` (40 frames, 0.67 s)

| Frames | Beat | Keys |
|---|---|---|
| 0–8 | Anticipation (crouch) | `root.y` 0 → +3; `body/on:squash` 0 → 0.6; `head.r` 0 → −4; wings `r` 0 → +6; `tail.r` 0 → +4 |
| 8–10 | Launch | `root.y` → −6; squash → 0, `root.sy` 1.14 (stretch); wings → −8 (pushing down) |
| 10–20 | Rise, ease out | `root.y` → −26; `root.sy` → 1 by 16; wings flap up to +35 at 14, down to −10 at 20; legs `tuck` at 11 |
| 20–24 | Apex hang | `root.y` −27 at 22, −26 at 24; `head.r` +2 (looks forward); wings +10 |
| 24–32 | Fall, ease in | `root.y` → 0 at 32; `root.sy` 1.06 at 30; legs `stand` at 30; wings +20 (brake) |
| 32–35 | Land | `body/on:squash` 1 at 34; `head.r` +3 (drag down); `dust` at 32; blink 33–36 |
| 35–40 | Settle | squash 0 at 37 with `root.sy` 1.04, back to 1 at 40; wings 0 |

### 8.4 Worked spec: `mood:cheer` (78 frames, 1.3 s; pose `cheer`, face `joy`)

| Frames | Beat | Keys |
|---|---|---|
| 0–10 | Anticipation | `root.y` +4, `body/on:squash` 0.7; wings `r` −12 (pulled in and down); `head.r` −6; eyes `squeeze` at 4 |
| 10–16 | Burst | squash 0, `root.sy` 1.12; `root.y` −10; wings up to the cheer pose's angle + 12° overshoot at 15 (`spread` at 11, `smear1` 12–13); crest feathers raise with a 2-frame stagger; `sparkle` at 14; face `joy` at 12; `head/on:cheeksUp` 1 |
| 16–24 | Settle into the pose | wings settle −12° → +4° → 0 (cheer angle) by 24; `root.y` → −6, `root.sy` → 1 |
| 24–60 | Moving hold | wings flutter ±6° three times (period 12 frames, wing R half a period behind L); `root.y` bobs −6 ↔ −4; `head.r` ±2 on the bob's half-time |
| 60–78 | Land in the pose | `root.y` → 0 at 70 with squash 0.5, then 0 at 74; wings ease to the cheer pose's rest by 78 |

### 8.5 The rest of the library

Each row is one motion file. Duration in frames at 60 fps. "Beats" are the frame ranges and what happens; amplitudes
are in degrees (r) or units (x, y). Every row also obeys 8.2. Rows 1–12 are agent 1's in WP7, 13–24 agent 2's
(WP6 does idle, hop, cheer, wobble, wave, blink first).

| # | Action | Frames | Loop | Beats |
|---|---|---|---|---|
| 1 | `idle` (layer) | 240 | yes | Breathe: `body.1` sy 1 → 1.015 → 1 over 120, twice; head drift ±1.5° on 240; tail ±2° offset by 30 |
| 2 | `blink` (layer) | 9 | no | Lids close 0–3 (`blink` swap at 2), hold 3–5, open 5–9; head dips 0.5 at 3 |
| 3 | `mood:happy` | 60 | no | From any mood: 0–8 small dip (`root.y` +1.5), 8–20 rise with `head.r` +3 overshoot, settle by 30; `cheeksUp` 0.5 |
| 4 | `move:wobble` (oops) | 48 | no | 0–6 recoil back (`root.x` −3, `head.r` −10); 6–30 wobble ±8° → ±5° → ±2° (period 8); `sweat` swap at 10; 30–48 settle |
| 5 | `move:wave` | 50 | yes | Wing R up to +110 over 0–10 with 6-frame anticipation down; waves ±18° (period 16); `head.r` tilts 4° toward the wave; elbow chain bone drags 2 frames |
| 6 | `move:surprise` (wow) | 36 | no | 0–4 tiny squash 0.4; 4–8 stretch `root.sy` 1.16, `root.y` −8, crest +30, eyes `wide` at 5; `impact` at 6; 8–36 settle with one overshoot |
| 7 | `move:ponder` (think) | 156 | yes | Wing L tip to chin by 20; `head.r` −8 ↔ −4 slow (period 78); pupils up-left; one tap of the wing at 90 |
| 8 | `move:snooze` (sleep) | 204 | yes | Breathe deep: `body/on:squash` 0 ↔ 0.35 (period 102); head nods down 6° and catches back up once at 150; `zzz` frames step |
| 9 | `move:tap` (point) | 96 | yes | Wing R points forward +70; taps forward 6 units twice (frames 30, 42) with 3-frame anticipation back each |
| 10 | `move:laugh` | 22 | yes | `body.1–3` bend ±5° alternating; `root.y` bounce −3 (period 11); head back +8; eyes `squeeze`; mouth `open` on beats |
| 11 | `move:shrug` | 48 | no | 0–8 dip; 8–18 wings out +25 and up, `head.r` −6 tilt; hold 18–34 with drift; 34–48 drop with overshoot |
| 12 | `move:shine` (proud) | 96 | no | 0–10 inhale (stretch 1.06, chest forward 3); 10–20 `sparkle`; hold chin up `head.r` +6; 70–96 relax to proud pose |
| 13 | `move:flutter` (love) | 144 | yes | Wings flutter small ±10° (period 10) in bursts of 3 every 48; `hearts` swap cycle; sway `root.x` ±2 (period 72) |
| 14 | `move:listen` | 108 | yes | Head tilts 10° toward the viewer's left, holds, tilts back half-way (period 108); one slow blink at 60; nod 2° at 80 |
| 15 | `move:flap` (fly) | 20 | yes | Wings −40 → +60 → −40; smears on the down-stroke (frames 6–8); `root.y` −4 on the down-stroke (lift), +2 on the up |
| 16 | `move:dance` | 60 | yes | Two-beat bounce: `root.y` −6 at 15 and 45 with squash at 0 and 30; `root.x` ±4; `head.r` opposite to `root.x`; wings alternate ±20 |
| 17 | `move:woozy` (dizzy) | 96 | yes | Head circles (x ±3, y ±2, a quarter period apart, period 48); body counter-sways ±4°; pupils `dizzy` |
| 18 | `move:nod` | 42 | no | 0–6 head up +3 (anticipation); 6–14 down −12; 14–22 up +2; 22–30 down −5; settle |
| 19 | `move:shake` | 45 | no | Turn −0.3 ↔ +0.3 three times decaying (period 14); crest drags 3 frames; eyes `lidded` |
| 20 | `move:bow` | 84 | no | 0–10 rise +2; 10–40 bend `body.1–3` forward 12° each, head −20; hold 40–56; 56–84 rise with overshoot −3 |
| 21 | `mood:sad` | 90 | no | Sink 0–40: `root.y` +3, `body.1–3` forward 4° each, head −10, wings droop −6; tail down; slow blink at 60 |
| 22 | `mood:ready` | 60 | no | Small hop-in-place (`root.y` −3) at 10; lean forward 4°; eyes `focus`; moving hold after |
| 23 | `mood:<others>` | 30 | no | Every other mood in `BIRD.moods` not covered by a move above: a 30-frame transition with 6-frame anticipation (dip), overshoot 8%, settle |
| 24 | `talk` (layer) | — | — | Keep `rig.js`'s viseme script; add `head/on:squash` 0.15 on open vowels and `cheeksUp` 0.3 on `e`/`i`, so talking moves the face, not only the beak |

---

## 9. Budgets and guard rails

- **Size:** ≤ 120 KB gzipped per `media/birds/<bird>.json`; `js/core/rig2.js` ≤ 35 KB minified. WP2 and WP9 check.
- **Speed:** three live birds at 120 px, CPU 4× throttled: mean ≤ 1.5 ms, p95 ≤ 3 ms per frame.
- **Screens:** at most three live birds per screen; anything smaller than 48 px is a still (`Rig2.svg`).
- **Progress:** no saved-state change. No lesson, story, storage key or database path is touched.
- **Hosts:** no new outside host; the data is served next to `index.html`.
- **Money:** nothing in this plan costs money except Track B (Recraft), which waits for Matt to raise the budget.
- **Ids and names:** bone, slot, drawing, mood and move names stay as `js/core/bird.js` has them, so every screen's
  `pip('cheer')` keeps working.
- **Reviews:** parlance-reviewer (Opus) reads each stage's diff and strips before it merges; `node dev/flow.js guard`
  will show STOP for the birds (Red); it is allowed only because Matt approved the Stage 0 proposal, which the plan
  names.

## 10. Order of work at a glance

```
Stage 0  Matt: (a) tool path, (b) Track A look, (c) Track B budget, (d) rollout
Stage 1  WP1  setup + baseline                      haiku
Stage 2  WP2  exporter + format                     sonnet
Stage 3  WP3  rig2.js + review page                 sonnet   → opus review
Stage 4  WP4  refined Pip look        ┐ parallel    sonnet
         WP5  deforming rig + tools   ┘             sonnet
         WP6  hero moves                            sonnet   → Matt looks (gate)
Stage 5  WP7  the whole library, 2 agents parallel  sonnet
Stage 6  WP8  four birds, 4 pairs parallel          sonnet   → Matt looks (gate)
Stage 7  WP9  integration, film, icons, release     sonnet + haiku → verifier → opus review → ship
Stage 8  remove fallback (Matt)
```
