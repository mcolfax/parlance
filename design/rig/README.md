# Character rig

Pip, and later Kiwi, Mango, Kakadu and Rojo, are traced from their model sheets and rigged in **Blender**. The
Blender file is the source for poses and moves, and a small three.js player shows it in the browser. See
[`blender/README.md`](blender/README.md) for how to open, edit and export Pip.

- **Review page:** [`index.html`](index.html), published for review at https://claude.ai/artifact/Hcm6kmpuy6GhhNZEsTZtSF (private until shared). Each section has a Comment button that opens the viewer's comment box on it. Open it locally with `npm run preview`, then go to http://127.0.0.1:8765/design/rig/index.html.
- **Blender rig:** `blender/pip.blend`, exported to `blender/pip.gltf.json` and played by `blender/pip3d.js`.
- **Part sheet and SVG rig:** `pip.js` (the traced drawings), `bird.js` (the shared skeleton, poses and moves) and `rig.js` (an SVG runtime). The Blender build starts from these, and `Rig.svg` still draws small static Pips (avatars, thumbnails) without WebGL. The SVG rig's own review page is `svg.html`.
- **Figma:** the first part sheet is on the Pip page of the [design file](https://www.figma.com/design/ZOAqSm0kQAjzkppKF0jLlS), as described in Figma below.
- **Check the data:** `node design/rig/check.js` must end with `ok`.

## Why this method

| Option | Why not (or why) |
|---|---|
| Frame-by-frame or AI-generated frames | Every pose and every in-between is new art. The frames are heavy, blur at small sizes, can't follow tokens or dark mode, and each new frame drifts off-model. |
| Lottie (After Effects) | Playback only. A screen can't blend, layer or react: no look-at, no talking, no "hop while worried". |
| Spine or Rive | The best editors for animators. Both need their own tool and a runtime, and art leaves the token system. The rig keeps a door open to them (see Room to grow). |
| **Cut-out SVG rig (this)** | New poses are a few numbers, not new art. It stays sharp at 34 px or 340 px, is recolored by CSS custom properties, is tiny, and is fully scriptable from the app. |

## How it works

1. **Part sheet.** Each bird is drawn once, as on its model sheet (turned a little to the viewer's right), in a shared *setup space*: 240 units wide, centre x 120, ground at y 250. Every body part is a separate closed shape that tucks under its neighbor (wing roots under the head, legs under the body) so joints never gap when they rotate. Paired parts are drawn on the left and mirrored.
2. **Skeleton.** 29 bones with pivots at the joints: neck, shoulders, crest roots, eyes, beak, jaw and so on. A bone's transform is a rotation, scale and offset around its pivot, and children follow their parents.
3. **Slots and swaps.** The draw order is a list of slots. Each slot hangs on a bone and shows one drawing at a time, so eyes (open, happy, closed, wide, lidded, heart…), mouths and wing shapes (folded, open, spread) are swaps, not new rigs. Every wing shape shares one rest angle, so a wing can change shape mid-swing. Some swaps follow a bone's angle (`swaps` in `bird.js`): the far wing hangs against the body as a sliver and opens into a whole wing once it swings more than 15° away.
4. **Poses, faces, moods.** A *pose* sets body bones, a *face* sets expression slots and brow bones, and a *mood* is a pose plus a face plus an optional move. Screens ask for moods (`happy`, `cheer`, `oops`…), and changing mood blends from wherever the bird is.
5. **Moves (clips).** Keyframed tracks on bone channels, params and slots, layered on top of the pose (additive by default). Hop, cheer, wobble, wave, dance, flap, nod, shake, bow and more.
6. **Alive between moves.** Procedural layers run on top: breathing, a slow head drift, blinks, quick glances, and springs on the crest feathers and tail. Those springs give follow-through and overlapping action for free.
7. **A head that turns (2.5D).** Face parts ride an invisible sphere. Turning (`turn`) slides each feature by its angle on the sphere and foreshortens it, so the near eye grows and the far one narrows. The torso twists the other way, the far wing narrows, and the tail tucks behind the body toward the front view. Turns stop at `turn.max` either side of the front (the body between `bodyMin` and `bodyMax`), where the drawing still holds up.
8. **Facing the other way is a mirror.** Past the front (turn below 0) the head mirrors, so the beak, eyes and crest always point the way Pip looks, and `facing: -1` mirrors the whole bird, as on the model sheet's oops drawing. Poses are written for a bird facing right and follow the mirror; effects that would read backwards (?, !, notes) stay the right way round (`mirror` in `bird.js`).
9. **Eyes that stay in their whites.** Pupils move within the room measured for each one from the trace (`look.room`); the sheet draws them converged, so the far pupil has no room toward the back of the head. The head's outline is its own slot (`headLine`), drawn over the eyes, so an eye turned out to the edge tucks under it.
10. **Talking.** Text becomes a viseme script (vowels open the beak, m/b/p close it). With speech synthesis the beak babbles while the voice plays.
11. **Line weight that reads at any size.** The outline is about 1.35 screen pixels, kept within a range of rig units, so a 40 px avatar and a 300 px hero both look inked.

## Files

| File | What it is |
|---|---|
| `rig.js` | The runtime: matrices, pose blending, clips, idle, blink, talk, look-at, springs, 2.5D turn, static SVG export, validation. No dependencies. |
| `bird.js` | The shared bird: skeleton, slots, poses, faces, moods, moves, springs and the effects any bird can show (sweat, tear, blush, sparkles, notes, zzz, ?, !, hearts). |
| `pip.js` | Pip's part sheet and palette, and nothing else. |
| `index.html` | The review page: the live Blender rig, moods and moves, the concept-vs-rig wipe, the mood library, and how to edit Pip in Blender. |
| `blender/` | The Blender rig (`pip.blend`), its web export, the three.js player and the build scripts. See its README. |
| `svg.html` | The SVG rig's review page: live stage, pose library, part sheet, skeleton, puppet sliders. |
| `check.js` | Validates every bird and renders every mood once. |
| `reference/` | Concept art. `pip-happy/cheer/oops.webp` are crops aligned to rig units (1 px = 0.5 unit) for the compare view; `*-sheet.webp` are the full model sheets for each bird. |
| `tools/bake.js` | Exports the drawings as plain SVG and the moods as instance matrices for Figma or another vector tool. |
| `tools/figma-state.json` | The Figma node IDs made for the rig, and what's still to do there. |

## The shared skeleton

Pivots are in setup space. Bones marked *turn* move with the head turn; *spring* bones swing on their own. A turning
feature's angle on the head's sphere comes from where it is drawn (x 120 is the middle of the head).

| Bone | Parent | Pivot | Role |
|---|---|---|---|
| facing | | 120, 250 | Mirrors the whole bird (`facing: -1`) |
| root | facing | 114, 250 | Whole bird: position, hops, squash and stretch around the feet |
| shadow | facing | 114, 252 | Ground shadow; follows root x and shrinks as the bird lifts |
| legL, legR | root | 95.8/129.4, 231 | Legs stay planted when the body leans (turn) |
| body | root | 113, 236 | Lean and breathing, pivoting at the bottom |
| torso | body | 118, 170 | Body shape, belly, wings, tail; twists a little against a head turn |
| tail | torso | 110, 206 | Spring; shortens toward front view and flips to the far side past it |
| belly | torso | 126, 195 | Turn |
| wingL, wingR | torso | 97/150, 165/164 | Shoulders. Rest angle is hanging down; positive r raises the left wing |
| head | body | 120, 158 | Neck; mirrors when the head turns past the front |
| crest | head | 123, 62 | Crest root (turn); crest1–3 are springs, drawn in front of the head |
| eyeL/R → pupilL/R, browL/R | head | 95.9/156.3, 118.6/114.6 | Eye patch (turn, foreshortens), pupil (look-at), brow (lifts and tilts) |
| beak → jaw | head | 128.7, 124 / 134 | Upper beak (turn); jaw drops while talking |
| cheekL/R, sweat, fxHead | head | | Blush, sweat drop (at the back of the head), head effects |
| fx | root | 120, 110 | Body effects (sparkles, notes) |

## Drawing a new bird (the part-sheet spec)

A bird file calls `Bird.make({ id, name, palette, parts, pivots })`. Use `pip.js` as the template.

1. **Start from the concept sheet** in `reference/`, at 1 px = 0.5 unit with the head centred on x 120 and the ground on y 250. Pip is traced straight from it with the scripts in `tools/trace/` (see its README): the neutral drawing is the setup pose, turned a little to the viewer's right (`turn.setup` 0.22, so turn 0 still faces front), and outlines are strokes (`ol`, `ol2` for the beak) only where the sheet has ink. The belly and eye patches have no outline, the head runs into the chest without a chin line, and the crest sits in front of the crown.
2. **Draw every slot below.** Missing drawings fail `check.js`, because shared poses ask for them.
   - `head.on`, `body.on`, `belly.on`, `tail.fan`, `crest1/2/3.on`, `patchL/R.on`, and `headLine.on` (the head's outline, drawn over the eyes; optional)
   - `pupilL/R`: open, wide, wet, happy, closed, blink, lidded, squeeze, heart
   - `browL/R.arc`
   - `beak`: closed, open, up (the raised upper beak for wide mouths). `mouth`: closed, smile, frown, grin, open, wide, o. Closed mouths (closed, smile, frown, o) are whole beaks; open ones are the lower beak under the upper one
   - `wingL/R`: folded, spread, both at the hanging rest angle around the shoulder pivot. Author the spread wing raised and wrap it in `rotate(-132 86 164)`, as Pip does. `wingR.open` is the far wing once it swings away from the body: Pip's is the near wing mirrored and foreshortened with `Bird.draw.xform`, which bakes a matrix into the path points so outlines keep their weight.
   - `look.room`: how far each pupil can move and stay in its eye white, `[right, left, down, up]` (`tools/trace/fit_pupil_room.py` measures it)
   - `legL/R`: stand, tuck
3. **Species extras** are extra bones and slots: Kakadu's five-feather crest, Rojo's face patch lines, Kiwi's cere and throat dots. Pass `bones` (after their parents) and `slots` (a function that edits the shared draw order).
4. **Palette roles.** Fill classes are `k-<role>`, strokes are `s-<role>`, and a rim on a filled shape is `t-<role>`. Add `o` for the ink outline, `ln` for feature lines and `ln2` for fine detail. Every bird needs `ink, body, body2, belly, face, beak, beak2, mouth, tongue, crest, crest2, tail, tail2, feet`. Effect colors default in `bird.js`.
5. **Pivots** only move when a bird's proportions need it (`pivots: { wingL: [84, 166] }`). Keep angles and names the same so every pose still works.
6. **Tune with an overlay.** Render the rig over the concept crop at half opacity and fix shapes until it sits on the drawing. The review page's onion-skin view does this.

## Runtime API

```js
const pip = Rig.create(PIP, { mood: 'happy' });   // live SVG; size by CSS or { size: 96 }
el.append(pip.el);
pip.set('cheer');            // blend to a mood (plays its move); also takes a pose object
pip.play('hop');             // layer a move; pip.stop('wave')
pip.say('Hallo! Ich bin Pip.');   // lip-sync from text; pip.talking(true|false) while a voice plays
pip.look(x, y);              // −1…1, or pip.lookAtPoint(clientX, clientY); pip.look(null) to let go
pip.override = { bones: { head: { r: 10 } }, params: { turn: .5 }, slots: { pupilL: 'heart' } };   // puppet layer
pip.speed = 0.25;            // slow motion; pip.setDebug(true) shows bones
Rig.svg(PIP, 'oops', { size: 64 })   // static SVG string: avatars, route marker, film frames
Rig.validate(PIP)            // list of problems, [] when fine
```

Live rigs share one animation frame loop, pause off screen and in background tabs, and hold still (no idle, springs or moves) for people who ask for reduced motion.

## Bringing it into the app (after approval)

1. Move `rig.js` to `js/core/rig.js` and load it before `js/core/art.js`. Move `bird.js` and the bird files next to it, or fold them into `art.js`.
2. Put the palette in `styles/tokens.css` as `--pip-*` tokens, with dark values if wanted. The rig already reads `var(--pip-body, …)`. To keep line-colored Pips, set `--pip-body: var(--line)`.
3. Keep the `pip(mood, size, opts)` and `setPipMood()` API so screens don't change. Big Pips use `Rig.create`; avatars and the route marker use `Rig.svg`. Map tap-to-hop to `pip.hop()` and the spoken line to `pip.talking()`.
4. The intro film can drive one live rig from its playhead with `set`, `play` and `override`, instead of swapping mood SVGs.
5. Add the rig checks to `dev/test.js`: validate every bird, render every mood, and check that the moods `pip()` uses exist. Then bump the version and ship.

## Figma

The Pip page of the design file has a **Pip rig** section beneath the four parrot explorations:

- A **Pip rig** variable collection with the 20 palette roles. Each variable's web code syntax is the CSS variable the code reads (`var(--pip-body)` …).
- **Part sheet:** every drawing is a component in rig units (1 px = 1 unit, ground at y 250), one component set per slot (`Pip/pupilL` with variants `drawing=open`, `drawing=happy`…), colors bound to those variables. Each component's description gives its bone, pivot and origin.
- **Still to do:** the pose frames, built from instances of those parts so editing a part updates every pose, plus clearing the loading shimmer on the two sections. The Figma Starter plan allows 20 MCP calls a month and they ran out partway. When calls are available again, run `node design/rig/tools/bake.js`. Build each pose frame (204 x 258) by placing an instance of each listed component with `relativeTransform = [[a, c, e], [b, d, f]]` from `poses.json`, using the IDs in `tools/figma-state.json`.

The code is the source of truth. If a part is redrawn in Figma, copy the path back into the bird's file.

## Room to grow

The parts are plain SVG and import into Figma or Rive as editable vectors. The bones, slots and swaps map one to one to Spine's skeleton, slots and attachments. If an animator joins later, they can take over in a tool without redrawing anything.
