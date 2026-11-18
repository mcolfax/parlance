# The refined Pip (Track A look)

`python3 design/rig/v2/tools/refine.py pip` reads the part sheet (`js/core/pip.js`, through `node`, as
`design/rig/blender/build/build.sh` does) and writes

- `design/rig/v2/build/pip.parts.json`: every drawing with the new look, as outline loops (below). WP5's `build_blend.py` reads it.
- `design/rig/v2/build/pip-look.png`: before/after contact sheet (happy, cheer, oops; 240 px and 72 px; light left, dark right).
  The "after" is drawn from `pip.parts.json` at the same slot matrices the old rig uses for that mood, painted the way
  `rig2.js` paints (fills, and each ink line as a ribbon scaled by `lineWidth / lines.min`), with `styles/tokens.css` loaded for the colors.
- It also checks `styles/tokens.css` against the OKLCH rule and that no shade or rim leaves its part. Exit code 1 on a mismatch.

`--no-sheet` skips the picture, `--tokens` prints the CSS lines, `--zoom=520` writes a larger `pip-look-zoom.png` (checking only).
The JSON is deterministic: two runs give the same bytes. Needs `sh design/rig/v2/tools/setup.sh`, and Playwright (the global one, `NODE_PATH`) for the sheet.

## `pip.parts.json` (for `build_blend.py`)

```jsonc
{
  "format": "parlance-parts", "v": 1, "id": "pip", "name": "Pip",
  "light": [-0.6, -0.8],                 // the direction toward the light, setup space (y down)
  "lines": { "px": 1.35, "min": 2.6, "max": 4.6, "feature": 1, "detail": 0.6, "thin": 0.5, "grow": 0.6 },   // Pip's, unchanged
  "view": [18, 2, 204, 258],
  "palette": { "ink": "#0B2A1E", "body": "#06777C", "body-shade": "#005761", "...": "..." },   // light-mode hex of every role
  "roles": ["shadow", "glint", "...", "body-shade", "body-light", "...", "eye-spec"],          // palette keys, old order then the new roles
  "drawings": {
    "wingL/folded": {                    // "<slot>/<drawing>": the same 62 keys, in the same order, as Rig.parts(PIP)
      "slot": "wingL", "bone": "wingL", "pivot": [97, 165],     // the slot, the bone it hangs on, that bone's pivot
      "pts": [x0, y0, x1, y1, "..."],    // every loop's points, flattened, setup space, 2 decimals
      "loops": [[0, 79], [79, 31], "..."],   // [first point, point count] into pts (counted in points)
      "base": 0,                         // the layer whose skin weights the drawing's other layers share (see below)
      "layers": [ "..." ]                // painted in order, back to front
    }
  }
}
```

It is the `drawings` block of `FORMAT.md` section 5 (`pts`, `loops`, `layers`) without `skin`, plus the fields above and the layer
fields below. Slot, drawing and role names are `js/core/pip.js`'s, unchanged; only layers and roles are added. A drawing with nothing to
draw (`beak/closed`) has `pts: []`, `loops: []`, `layers: []`.

### Layers

Fill layer: `{ "fill": role, "loops": [i, ...], "kind": ..., "of": n?, "a": 0.14? }`. The first loop is the outline,
**counter-clockwise on screen** (negative shoelace area with y down), later loops are holes (clockwise). A shape with several islands is
several layers. `a` is only on the shadow (as the exporter writes it). Ink layer: `{ "ink": role, "loop": i, "w": [...], "kind": ..., "of": n?, "open": 1? }`:
the loop is the **centre line** of a tapered line and `w` has one width per point (setup units, at the large size where `--rig-lw` is
`lines.min`; the runtime scales it by `lineWidth / lines.min`). It is drawn as a ribbon: each point offset by ±`w/2` along its averaged
normal (`ribbon()` in `refine.py` is the same code as `ribbon()` in `rig2.js`). A closed centre line (no `open`) is exactly
FORMAT's ink layer. **`open: 1` is the one thing FORMAT does not have**: a line that is not a loop (an outline that runs under another
part, a feather stroke). The ribbon is then one closed polygon (one side, then the other back), and the loop's points are in drawing order,
not a closed ring. `rig2.js` passes `closed = true` at its one ribbon call today and would need `!L.open` there.

| `kind` | what | role | `of` |
|---|---|---|---|
| `fill` | a fill of the part sheet, as drawn (a body, a glint, a brush-shaped `k-ink` tick) | the sheet's | none |
| `shade` | cel shade, the crescent on the side away from the light, inside its part | `<role>-shade` | the `fill` layer it is cut from |
| `light` | rim light, the crescent on the lit side | `<role>-light` | the `fill` layer it is cut from |
| `outline` | tapered ink outline (ink layer; closed for `o` shapes and the mouth's `ol2`, open for the rest) | `ink` | the drawing's base |
| `feature` | a drawn line with its own width (the squeezed eyes), ink layer | `ink` | the drawing's base |
| `feather` | a tapered `ln2` stroke on a wing or the tail, ink layer, open | `ink` | the wing's or tail's fill |
| `spec` | an eye specular dot | `eye-spec` | none (the pupil's bone) |
| `stroke` | a stroke whose width is in absolute units in the part sheet (sweat-drop line, the `zzz`/`?`/`!` marks, music notes), already a baked polygon, so it does not grow with the line width, as before | the sheet's | none |

**Skin weights.** Every layer of a drawing moves with the same bones. A drawing on a bending chain (the wings, the crests, the tail)
is weighted per point; `shade`, `light`, `feather` and `outline` layers take their weights from the layer `of` names (nearest point of
that layer's loops, or, for an ink layer, of the base), and a drawing's `base` is the layer to use when a layer has no `of`. A drawing
that is not on a chain is rigid on `bone`, whatever its layers. `spec` layers and `stroke` layers have no `of`: they ride the slot's bone.

### What each drawing got

62 drawings, 282 layers, about 11,500 points (about 190 KB, 53 KB gzipped). Shade and rim light on every part whose fill role is a body or
feather color: `body` (head, torso, wings), `belly`, `beak`, `crest`, `crest2`, `tail`, `feet` (32 shades, 42 rims). Eye whites (`face`),
pupils, brows, glints, glosses, blush, sweat, hearts, sparks, the shadow and the mouth's inside have none. Tapered ink on every
outline. Three feather strokes on each of the five wing drawings, two on the tail (17). Speculars on the pupils `open`, `wide`, `wet`
and `lidded`, left and right (16).

## The rules (the plan's numbers, `refine.py` constants)

- **Light** from the upper left: `d = (-0.6, -0.8)`.
- **Shade:** the part minus the part moved by `4 * d` (the part's crescent on the lower right), then `buffer(+1.2).buffer(-1.2)`, cut
  back to the part, dropped if under 3% of the part's area (per piece). **Rim light:** the part minus the part moved by `-2.5 * d`
  (the upper left crescent), the same rounding, cut back to the part, kept only within 3.5 units of the outline (the outer outline and
  any hole's), fragments under 1 square unit dropped.
- **Ink:** a point's width is `2.6 * (1 + 0.35 * n . (-d))`, clamped to [1.9, 3.4] and smoothed over three neighbors twice, `n` being the
  outward normal (the side of the line that is outside the part's fill; `headLine/on` takes the head's fill). Thick on the lower right, thin
  toward the light. `ol2` (the beak's thin outline, half an outline in the old rig) is the same times 0.5. A line written with its own
  width keeps it: the squeezed eyes' `ln` is 1.15 x the line width (as before); sheet strokes with `stroke-width: Npx` stay N, baked.
  Corners (turns over 35 degrees) are two points a hair apart so the ribbon keeps its width there, and an open line ends in a round cap
  (three points).
- **Feather strokes:** inside the wing or tail's fill, from 30% to 75% of the way along its long axis (the principal axis of its outline,
  measured from the bone's pivot toward the tip), 14 stations; at each, the cross-section of the fill perpendicular to the axis is cut and
  the stroke runs at an inward offset of `i / (n + 1)` of the local half-width from the side away from the light (25%, 50%, 75% for three
  strokes, 33% and 67% for two), so it curves with the outline. Width `1.1 * sin(pi s) ^ 0.6`, at least 0.2: thick in the middle, a point at each end.
- **Eye speculars:** pupil radius `R` is the mean of the pupil's half-width and half-height (its bounding box), centre its box's centre; a dot
  of radius `0.28 R` at `(-0.35 R, -0.35 R)` and one of `0.12 R` at `(+0.3 R, +0.25 R)`, drawn above the pupil and its old glint.

### Two signs differ from the plan's text

The plan says shade `= part - translate(part, -4 d)` and rim `= part - translate(part, +2.5 d)`. Moving the part by a vector `v` leaves the
crescent on the `-v` side of it, so with `d = (-0.6, -0.8)` those formulas give the shade on the **upper left** and the rim on the
**lower right**, the reverse of the plan's own acceptance ("shade on the lower right of every feathered part") and of its taper rule
("thick away from the light"). `refine.py` uses the signs that meet the acceptance and the taper rule (`+4 d` and `-2.5 d`); the
distances are the plan's. If `d` was meant as the direction the light travels, the two readings agree and only the taper would flip; the
sheet shows the intended look (shade low right, rim high left, ink thick low right).

## Colors (`styles/tokens.css`)

OKLCH of the base: shade is `L - 0.10`, `C * 1.05`, hue 8 degrees toward blue (sRGB blue is hue 264.1; the shorter way round);
light is `L + 0.08`, `C * 0.9`; a color outside sRGB loses chroma (never lightness or hue) until it fits; lightness is capped at 1
(the belly's rim is white). Pip's colors have no dark-mode variants (only `--pip-shadow` changes), so the rule on the dark base gives the same
values and they are defined once in `:root`, where both modes inherit them. If a dark base is ever added, run `refine.py` (it prints the
rule's values) and add the dark pair under the dark blocks.

| role | base | `-shade` | `-light` |
|---|---|---|---|
| body | `#06777C` | `#005761` | `#3D8E92` |
| belly | `#F9EFD6` | `#D5CFB5` | `#FFFFFF` |
| beak | `#F6B340` | `#DF8D01` | `#FFD392` |
| crest | `#EE5F35` | `#CF3228` | `#FF8360` |
| crest2 | `#F7B440` | `#E08E00` | `#FFD495` |
| tail | `#F06137` | `#D1352A` | `#FF8764` |
| feet | `#808783` | `#626A67` | `#999F9B` |

`--pip-eye-spec: #FFFFFF` in both modes. `body2`, `beak2` and `tail2` are in the palette but no Pip drawing uses them, so they have no
shade or light tokens yet. The palette fallbacks inside `js/core/pip.js` are not changed (not in this package); the data's `palette` has
the light-mode value of every new role for whatever builds the fallbacks.

## Not done here

- The format change for open ink lines (`rig2.js`, `export.py`, `FORMAT.md`): see "Layers".
- The other four birds: `refine.py` takes a bird id, but only Pip's palette roles and rules are checked.
