# The rig2 data format (`media/birds/<bird>.json`)

This is the full field reference for what `design/rig/v2/tools/export.py` writes and `js/core/rig2.js` plays. It
expands section 6 of `design/rig/v2/PLAN.md`; where the two differ, this file is the current truth (every difference is
listed under "Added to the plan's format" and "Known gaps" at the end).

```
python3 design/rig/v2/tools/export.py design/rig/blender/pip.blend /tmp/pip.json   # writes the file, prints counts and the gzipped size
python3 design/rig/v2/tools/golden.py design/rig/blender/pip.blend                 # writes design/rig/v2/test/pip-golden.json
python3 design/rig/v2/test/check_export.py /tmp/pip.json --golden design/rig/v2/test/pip-golden.json --blend design/rig/blender/pip.blend
```

The `.blend` is only read. `export.py` needs the `bpy` module (`sh design/rig/v2/tools/setup.sh`), `numpy`, `shapely`
and Node (the bird's definition in `js/core/<bird>.js` gives the draw order, the mood list and the procedural settings,
read with `node -e` the way `design/rig/blender/build/bake_moods.js` reads it).

## 1. Spaces and units

Everything in the file is in **setup space**, the space the part sheets are drawn in: 240 wide, x to the right, **y
pointing down**, ground at y 250, the bird centred on x 120. Distances are setup units, angles are degrees, times are
seconds.

### Blender to setup space

Blender holds the bird in its front plane: X right, **Z up**, metres, 1 cm = 1 setup unit, x 120 / ground y 250 at the
origin (see `design/rig/blender/README.md`).

| Thing | Setup space |
|---|---|
| a point (X, Z) | `x = 120 + 100·X`, `y = 250 − 100·Z` |
| bone channel `x` | `100 · location.x` of the pose bone |
| bone channel `y` | `−100 · location.y` (the bone's local Y points up, setup's y points down) |
| bone channel `r` | `−degrees(rotation_euler.z)` |
| bone channel `sx`, `sy` | `scale.x`, `scale.y` |
| depth (draw order) | `slot index + location.z / 0.01` of the slot's bone (see `order`) |
| time | `(frame − first frame of the action) / scene fps` (30 fps) |

### Rotation sign

`r` is **clockwise-positive on screen**, exactly as `js/core/rig.js` (its `local()` builds `[cos, sin, −sin, cos]`, which
turns clockwise in a y-down space). Blender turns counter-clockwise for a positive Z rotation as seen from the front,
hence the minus sign above. For example `wingL` (the wing on the left of the picture) lifts outward with a positive `r`:
98° at the start of `mood:cheer`, in Blender and in the SVG rig alike.

## 2. Top level

```jsonc
{
  "format": "parlance-rig2", "v": 1,
  "id": "pip", "name": "Pip", "fps": 30,
  "view": [18, 2, 204, 258],          // the viewBox the app frames the bird in (x, y, w, h)
  "lines": { "px": 1.35, "min": 2.6, "max": 4.6, "...": "..." },   // the old rig's line-width model (Rig.lineWidth)
  "roles": ["shadow", "glint", "..."],  // every palette role a layer uses; CSS custom property --<id>-<role>
  "bones": [], "slots": [], "drawings": {}, "actions": {}, "fx": {}, "procedural": {}
}
```

`roles` are the keys of the bird's `palette` in `js/core/<bird>.js` (listed in that file's order). The file holds **no
colors**, only roles; the runtime reads `--pip-body` and friends from the element.

## 3. Bones

```jsonc
{ "id": "wingL_folded_2", "parent": "wingL_folded_1", "x": 87.67, "y": 185.22, "rot": -155.22, "len": 19.79,
  "turn": { "...": "..." }, "inv": [-0.9079, 0.4191, -0.4191, -0.9079, 157.22, 131.42] }
```

| Field | Meaning |
|---|---|
| `id` | The bone's name. The bird-definition bones keep their ids from `js/core/bird.js` (`facing`, `root`, `torso`, `wingL`…). Bending-chain bones keep **Blender's names**: `wingL_folded_1…3`, `wingL_spread_1…3`, `wingR_folded_1…3`, `wingR_open_1…3`, `wingR_spread_1…3`, `crest1_bend_1…2` (and `crest2`, `crest3`; Kakadu has more), `tail_bend_1…3`. One chain per wing drawing, not one per wing. |
| `parent` | Parent bone id, or `null` for the root (`facing`). **Parents always come before their children** in `bones`. A chain's first bone hangs on the slot's bone (`wingL`), not on a drawing-switch bone. |
| `x`, `y` | The bone's head (its pivot) in setup space at rest. |
| `rot` | Optional, degrees clockwise from straight up: the direction a chain bone points at rest. Omitted (0) for every bone of the bird definition. |
| `len` | Optional, setup units: the length of a chain (deform) bone along its direction. |
| `turn` | Optional. The 2.5D head-turn descriptor of the bone from the bird definition, copied as is (`R`, `phi`, `squash`, `near`, `wx`, `flip`, `dx`, `rot`, `body`). The runtime applies it exactly as `rig.js` does. |
| `inv` | The inverse bind matrix `[a, b, c, d, e, f]` (SVG order: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`), see below. |

### Rest frame, pose and skinning

Every bone has a rest world matrix `B = T(x, y) · R(rot)` (translate, then rotate clockwise by `rot`), and
`inv = B⁻¹`. For the bones of the bird definition `rot` is 0, so `B = T(x, y)` and `inv = [1, 0, 0, 1, −x, −y]`.

A bone's channels are applied in its **own frame**: axes rotated by `rot`, x along the frame's right, y along its down:

```
C  = T(x, y) · R(r) · S(sx, sy)        the pose channels (missing channels: x = y = r = 0, sx = sy = 1)
M  = M_parent · B_parent⁻¹ · B · C     a bone's world matrix this frame (the root: M = B · C)
K  = M · inv                           the skinning matrix
p' = Σ wᵢ · Kᵢ · p                     linear blend skinning of a drawing's point p
```

For a bone with `rot` 0 under parents with `rot` 0, `K` equals the product of `rig.js`'s `local(bone, channels)` matrices
down the chain, to 1e−13 (tested). The `x`, `y`, `sx`, `sy` channels of a chain bone are in its rotated frame; the
exported actions only key `r` on chain bones.

`inv` entries `a…d` are rounded to 4 decimals, `e` and `f` to 2; `check_export.py` checks that `inv · B` is the identity
to 0.02.

### Mirror bones

Pip turns round (oops faces left) and turns its head past the front by **mirroring** the `facing` and `head` bones.
Blender does that with two control bones beside the bird and a driver; the file keeps the controls as **curves only**,
not as bones.

- A mood action may hold a curve `ctl_facing.x` and `ctl_head.x`. Its value is 0 (not mirrored) or −2 (mirrored), and it
  can pass between them inside a blend. A move has them only if it mirrors (`move:lookAround`'s head turns past the front).
- The mirrored bone's X scale is then `sx = (v > −1 ? 1 : −1) · max(|1 + v|, 0.72)` where `v` is the curve's value. That is the driver
  in `build_blend.py`: the bone takes its sign and never gets narrower than 0.72 mid-turn. It **replaces** the bone's own
  `sx`; `procedural.mirror` says which bones (`facing`, `head`) and which slots stay upright (`upright`).
- `check_export.py --blend` includes this in the pose comparison with Blender, so the formula is tested.

## 4. Slots

```jsonc
{ "id": "pupilL", "bone": "pupilL", "rest": "open",
  "drawings": ["open", "wide", "wet", "happy", "closed", "blink", "lidded", "squeeze", "heart"],
  "blink": { "from": ["open", "wide", "wet"], "to": "blink" } }
```

`slots` is the **draw order at rest, back to front**, copied from the bird definition. `bone` is the bone the slot
hangs on (also the bone its rigid drawings are weighted to), `rest` is the drawing shown by default (`null` = nothing
shown), `drawings` lists every drawing the slot can show (every one has an entry in `drawings`, possibly empty).
`blink` and `showWith` are copied from the bird definition when it has them: a blink swaps one of `from` for `to`; a
slot with `showWith: { "slot": "pupilL", "drawings": ["open", "wide"] }` (an eye's white, on Mango, Kakadu and Rojo) is
shown only while the named slot shows one of the listed drawings.

## 5. Drawings

`drawings["<slot>/<drawing>"]`:

```jsonc
{
  "pts":    [x0, y0, x1, y1, "..."],        // every loop's points, flattened (2 numbers per point), 2 decimals
  "skin":   [[b, w], [b, w, b, w], "..."],  // one entry per point: up to 3 (bone index, weight) pairs, flattened
  "loops":  [[0, 64], [64, 18]],            // [first point, point count] into pts / skin: counted in POINTS, not numbers
  "layers": [
    { "fill": "body", "loops": [0] },       // painted in order, back to front
    { "fill": "ink", "loops": [1, 2], "a": 0.14 }
  ],
  "shapes": { "squash": [[pointIndex, dx, dy]] }      // optional: blend shapes (reserved, see Known gaps)
}
```

- **Points.** Closed outlines in setup space, resampled by the exporter: one point about every 2.5 units along the outline,
  and every original vertex whose turning angle exceeds 35° is kept, so corners stay sharp. A loop has **at least 4
  points**. The runtime draws a closed Catmull–Rom spline through them.
- **Orientation.** The first loop of a layer is its outline, **counter-clockwise on screen** (negative shoelace area with y
  down). Every later loop of the same layer is a **hole**, clockwise. A shape made of several islands is several layers
  of the same fill, one island (with its holes) each.
- **`skin`.** `bone index` is a position in `bones`. Weights are rounded to 3 decimals and the **first (largest) weight is
  adjusted so each point's weights sum to exactly 1**. A rigid drawing is `[b, 1]` on every point (the slot's bone); a
  wing, a crest feather or the tail is weighted along its bending chain (up to 3 bones per point: the nearest original
  vertex's weights, top 3, renormalised).
- **Layers.** `fill` is a palette role from `roles`; `a` (optional, default 1) is the layer's opacity (the shadow is
  `a: 0.14`). Layer order is the painter's order within the drawing (the .blend's depth within one drawing).
- **Ink layers (reserved).** `{ "ink": "ink", "loop": 0, "w": [2.2, 2.4, "..."] }` is a tapered outline along loop 0 with a
  width per point; the runtime draws it as a ribbon. The exporter does not write them yet (see Known gaps).
- **Empty drawings** (`pts: []`, `loops: []`, `layers: []`) are legal: a closed beak draws nothing.

## 6. Actions

`actions["mood:<name>"]` is an absolute pose-and-face animation (a mood); `actions["move:<name>"]` is an **offset from
rest** layered on top of any mood (hop, nod, shake, bow, lookAround, wave, flap, dance, laugh, wobble, surprise).

```jsonc
"mood:cheer": {
  "dur": 1.3, "loop": false, "add": false, "blink": true, "glance": true,
  "params": { "turn": 0.15 },
  "curves": { "wingL.r": [[0, 98.2, 0, 98.2, 0.0167, 98.2], [0.05, 90.2, 0.0333, 95.5, 0.0667, 84.9]], "ctl_facing.x": [[0, 0, 0, 0, 0, 0]] },
  "swaps":  [[0, "wingL", "spread"], [0, "cheekL", null], [1.3, "fxBody", null]],
  "order":  [[0, "wingL", 3.5], [0, "wingR", 3.6]],
  "shapes": {}, "fx": []
}
```

| Field | Meaning |
|---|---|
| `dur` | Length in seconds. |
| `loop` | The action repeats. |
| `add` | `true` for moves (offsets from rest, layered on any mood), `false` for moods. |
| `blink`, `glance` | Whether the bird blinks and glances while the mood plays (the .blend's action properties). |
| `params` | Moods only, optional: the mood's static pose parameters from the bird definition (`turn`, `lookX`, `lookY`, `facing`). The mood's curves already contain this turn and look baked into the bones' channels, so the runtime needs it to know the baseline when it layers a live turn or look-at on top (the difference is what it applies). |
| `curves` | Map `"<bone>.<channel>"` to a list of keys. Channels: `x`, `y`, `r`, `sx`, `sy`. A bone with no curve for a channel sits at rest for it (0, 0, 0, 1, 1). Moves hold offsets (rest-value 0 for `x y r`, 1 for `sx sy`). `ctl_facing.x` and `ctl_head.x` are the mirror controls (section 3). |
| `swaps` | `[time, slot, drawing or null]`, sorted by time: from that time on, the slot shows that drawing (`null` hides it). A slot a mood never mentions keeps its `rest` drawing. Derived from the `show_<slot>_<drawing>` bone scale keys (scale ≥ 0.5 = shown). |
| `order` | `[time, slot, index]`: from that time the slot is drawn at this draw-order position. `index` is the slot's rest index plus the depth offset keyed in Blender, **fractional** (3.5 = between slots 3 and 4; the sort is by this number); a value past the slot count (28) means in front of everything. Slots without an entry keep their rest position. |
| `shapes` | Blend-shape weights, `"<slot>/<drawing>:<shape>"` to keys like `curves` (reserved, empty for now). |
| `fx` | `[time, effect, x, y]` starts an effect sequence from the top-level `fx` map (reserved, empty for now). |

### Curve keys

A key is `[t, v, tIn, vIn, tOut, vOut]` plus an optional seventh element `1`:

- `t`, `v`: the key's time (s) and value; `tIn`, `vIn`: its left bezier handle; `tOut`, `vOut`: its right handle. Times
  are rounded to 5 decimals, values to 3 (4 for `sx`, `sy`).
- Between key `k0` and key `k1` the value is a cubic bezier through `(k0.t, k0.v)`, `(k0.tOut, k0.vOut)`,
  `(k1.tIn, k1.vIn)`, `(k1.t, k1.v)`: solve `x(s) = t` for the parameter `s` (Newton's method, 6 iterations, bisection as the
  fallback), then evaluate the value cubic at `s`. Before the first key and after the last, the value holds.
- A key with a trailing `1` **holds its value until the next key** (Blender's constant interpolation: a step).
- A curve with one key is a constant.

The exporter turns every Blender interpolation into this one form: bezier keys keep their handles (clamped to the
segment length as Blender does); linear segments get handles at the thirds; constant segments get the trailing `1`;
the eased ones (quad, sine, back, elastic…) are refitted to cubic beziers, with extra keys where one cubic is not
enough (a quad ease-in-out splits once and is then exact). Linear keys that lie on the line between their neighbours
(the baked turn drivers sample every frame) are dropped. The exporter checks the result against `fcurve.evaluate()`
at 9 points per segment and prints the worst difference per channel (Pip: x 0.003, y 0.002, r 0.004, sx and sy 0.0002;
scales are held tighter because a scale error is multiplied by the distance from the pivot).

### Golden samples

`design/rig/v2/test/<bird>-golden.json` is made by `golden.py` from Blender's own `fcurve.evaluate()`:

```jsonc
{ "bird": "pip", "fps": 30, "samples": 60, "tolerance": 0.01,
  "actions": { "mood:cheer": { "dur": 1.3, "curves": { "wingL.r": [60 values] } } } }
```

`values[i]` is the curve at `t = dur · i / (samples − 1)`. It covers 5 actions (`mood:cheer`, `mood:think`, `mood:oops`,
`move:hop`, `move:lookAround`) and every bone curve in them (161 curves). A runtime that evaluates the exported keys as
above must match to `tolerance` (the exporter's own curves are within 0.0062).

## 7. Effects and the procedural block

`fx` is a map of effect sequences, `{ "<name>": { "fps": 24, "frames": ["fx/dust1", "..."] } }` (frames are drawing
keys). It is **empty** for the current Pip: its effects (zzz, hearts, sparkles) are ordinary slot drawings switched by
`swaps`.

`procedural` is copied from the bird's definition in `js/core/<bird>.js`; the runtime reads it exactly as `rig.js` does:

| Key | Content |
|---|---|
| `springs` | Follow-through springs on bones (`crest1`, `tail`…): `len`, `dir`, `k`, `d`, `limit`, `squash` |
| `look` | Look-at: the pupils, brows and head bone, `x y brow head headR turn`, and `room` (the pupil's room in its eye white) |
| `turn` | The 2.5D turn: `head body setup max bodyMin bodyMax` |
| `idle` | Breathing and head drift: `{ bone: { channel: [amplitude, period, phase] } }` |
| `mouth` | Talking: the mouth slot, the beak's open drawings, the jaw bone's drop |
| `visemes` | Letter shape to mouth drawing (`a` to `wide`…), for `say()` |
| `mirror` | `facing` and `head` bone ids and the `upright` ids (`fxHead`, `fx`) that stay unmirrored |
| `swaps` | Drawings chosen by a bone's angle (`wingR` shows `open` past 15°) |
| `clip` | Slots clipped to another slot's patch (the pupils stay inside the eye white) |
| `shadow` | The ground shadow's bone and the bone it follows |
| `rest`, `restMood`, `hopClip` | The rest `turn` and `facing`, the mood a bird opens in, the move a tap plays |

## 8. Precision and size

Points 2 decimals; bone positions 2; weights 3; curve times 5, curve values 3 (4 for scales); `inv` 4 and 2.
Pip is about 280 KB raw, **66 KB gzipped** (budget 120 KB, which `export.py` enforces).

## 9. A small complete example

A bird with a root, one wing, and a one-bone wing chain pointing right, one drawing, one wave.

```json
{
  "format": "parlance-rig2", "v": 1, "id": "demo", "name": "Demo", "fps": 30,
  "view": [0, 0, 240, 260], "lines": { "px": 1.35, "min": 2.6, "max": 4.6 },
  "roles": ["body", "ink"],
  "bones": [
    { "id": "root", "parent": null, "x": 120, "y": 250, "inv": [1, 0, 0, 1, -120, -250] },
    { "id": "wing", "parent": "root", "x": 100, "y": 150, "inv": [1, 0, 0, 1, -100, -150] },
    { "id": "wing_1", "parent": "wing", "x": 100, "y": 150, "rot": 90, "len": 40, "inv": [0, -1, 1, 0, -150, 100] }
  ],
  "slots": [
    { "id": "wing", "bone": "wing", "rest": "folded", "drawings": ["folded"] }
  ],
  "drawings": {
    "wing/folded": {
      "pts": [100, 144, 140, 144, 140, 156, 100, 156],
      "skin": [[1, 1], [2, 0.6, 1, 0.4], [2, 0.6, 1, 0.4], [1, 1]],
      "loops": [[0, 4]],
      "layers": [{ "fill": "body", "loops": [0] }]
    }
  },
  "actions": {
    "mood:wave": {
      "dur": 1, "loop": true, "add": false, "blink": true, "glance": true,
      "curves": {
        "wing.r": [[0, 0, 0, 0, 0.1667, 0], [0.5, 30, 0.3333, 30, 0.6667, 30], [1, 0, 0.8333, 0, 1, 0]],
        "wing_1.r": [[0, 0, 0, 0, 0, 0]]
      },
      "swaps": [[0, "wing", "folded"]], "order": [], "shapes": {}, "fx": []
    }
  },
  "fx": {},
  "procedural": { "springs": {}, "look": {}, "turn": {}, "idle": {}, "mouth": {} }
}
```

Here `wing_1` points to the bird's right (`rot` 90 is a quarter turn clockwise from up). Its `inv` sends the pivot
(100, 150) to (0, 0) and a point 40 units along the bone, (140, 150), to (0, −40): straight ahead along the bone's
frame. The third key of `wing.r` is the wave's end, back at rest.

## 10. Added to the plan's format

Everything the plan's section 6 lists is here. These were added because the runtime needs them or Blender already
carries them; none changes a plan field:

- `rot` and `len` on bones (chain bones are not axis-aligned), and bone ids that are Blender's names (`wingL_folded_1`, not `wingL.1`).
- `turn` on bones (the head-turn descriptors `rig.js` reads from the bird definition).
- `fps`, `view` and `lines` at the top level (the old rig's frame and line-width model).
- On slots: `blink` and `showWith`; `rest` may be `null`.
- On layers: `a`, the opacity. On curve keys: the optional trailing `1` (hold).
- On moods: `params`. On actions: nothing else; `ctl_facing.x` / `ctl_head.x` curves for the mirrors.
- In `procedural`: `visemes`, `mirror`, `swaps`, `clip`, `shadow`, `rest`, `restMood`, `hopClip` next to the five the plan names.
- `order` indexes are fractional.

## 11. Known gaps

What the plan's format or the part sheet has that the current `design/rig/blender/pip.blend` does not. The exporter
writes what exists, warns on stderr (`GAP:`), and does not invent anything.

1. **`pip.blend` is older than the part sheet.** It was built before the mood `dizzy` and the drawing `fxHead/stars`
   were added to `js/core/bird.js` and `js/core/pip.js`. The file has no `dizzy` action (17 of the 18 moods in
   `BIRD.moods`), and no mesh for `fxHead/stars`, which the export writes as an **empty drawing** so every drawing
   `Rig.validate(PIP)` knows has an entry. Its `pip3d_base` custom property also has no `id`, so the exporter takes the
   bird's id from the file name. Nothing is wrong with the exporter: a scratch rebuild with `build/build.sh` (18 moods,
   `fxHead/stars`, 29 actions) exports all of it and passes every check. Fix: rebuild `pip.blend` with `build.sh` (that
   overwrites hand edits, so only if none were made) and export again. `check_export.py --known-gaps mood:dizzy,fxHead/stars`
   lets the check pass meanwhile. The same is true of `kiwi`, `mango`, `kakadu` and `rojo` (which also export cleanly).
2. **No tapered `ink` layers.** The existing rig's outlines are stroke polygons (a 2.6-unit buffer around each path),
   so they export as ordinary filled loops in the `ink` role, drawn as part of the drawing's layers. The `ink` layer type
   is specified above for Stage 4 (the refined look) and is not written yet.
3. **No blend shapes.** The `.blend` has no shape keys, so `shapes` is `{}` in every action and absent from drawings. The
   field is specified for WP5.
4. **No effect sequences.** `fx` is `{}` and every action's `fx` is `[]`: there is nothing in the `.blend` to export.
5. **Depth on a parent bone.** If a depth key sat on a bone that other slots hang below, Blender would move those slots
   too; the exporter writes `order` for the slots on that bone only and prints a `GAP:`. It does not happen in Pip.
6. **Moods carry their turn baked in.** The turn and look of each mood are folded into its curves by the existing bake
   (`bake_moods.js`), as in the glTF player; `params` gives the baseline numbers the runtime needs. A mood's own
   `param.*` clip tracks (a turn that animates inside a mood) exist only in the baked curves, not as parameters.
