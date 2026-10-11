# Pip in Blender

Pip's rig is a Blender file, played in the browser with three.js. The drawing is traced from the model sheet
(`../reference/pip-sheet.webp`), and it hangs on real bones, so wings, crest feathers and the tail bend instead of
swinging as stiff pieces.

- **Review page:** [`../index.html`](../index.html), published at https://claude.ai/artifact/Hcm6kmpuy6GhhNZEsTZtSF
- **Source:** `pip.blend` (Blender 5.2 LTS, free from blender.org)
- **Web export:** `pip.gltf.json`, a glTF file with its data embedded, so it publishes like any JSON file
- **Player:** `pip3d.js`, a classic script that loads three.js 0.185 from jsdelivr on first use

## Files

| File | What it is |
|---|---|
| `pip.blend` | The rig: Pip's drawings as flat meshes, 96 bones, and every mood and move as an action. Edit this. |
| `pip.gltf.json` | What the player loads. Made from `pip.blend` by `build/export.py`; don't edit it by hand. |
| `pip3d.js` | The player: mood blends, moves layered on top, drawing swaps, and the live parts (below). |
| `build/export.py` | Exports `pip.blend` to `pip.gltf.json`. Run it after every edit. |
| `build/build.sh` | Rebuilds `pip.blend` from scratch from the traced part sheet (`../pip.js`) and the SVG rig's moods (`../bird.js`). It overwrites hand edits, so use it only to start over. |
| `build/*.py`, `build/bake_moods.js` | The steps `build.sh` runs: flatten the drawings to polygons, build the meshes and bones, bake the moods into actions. |

## How the rig is built

1. **Drawings are flat meshes.** Every drawing in the part sheet (fills, outlines at the sheet's 2.6-unit weight,
   ink shapes) becomes a flat mesh with a palette material. Pip stands in Blender's front plane (X right, Z up); 1
   part-sheet unit is 1 cm, and x 120 / ground y 250 of the sheet sit at the origin. Draw order is depth: later
   slots sit nearer the camera.
2. **Bones.** The 28 bones of the shared bird skeleton (`../bird.js`), with pivots from the trace, plus bending
   chains: three bones down each wing drawing, two along each crest feather, three along the tail. Chain meshes are
   skinned with smooth weights; other drawings ride their bone. Every bone's local Z axis points at the viewer, so a
   bone's turn in the picture is its Z rotation.
3. **Swappable drawings.** A slot with several drawings (eyes, beaks, mouths, wing shapes, legs, effects) has a
   `show_<slot>_<drawing>` bone per drawing. Scale 1 shows the drawing; a hair above 0 hides it.
4. **Moods are actions.** Each mood (happy, cheer, oops…) is one action: the pose, the face and the move, with the
   same easing as the SVG rig, plus wing bends the cut-out rig couldn't do. Actions named `move_<name>` (hop, nod,
   shake…) are offsets from rest that the player layers on top of any mood. An action's custom properties say
   whether it loops (`loop`) and whether Pip blinks and glances in it (`blink`, `glance`).
5. **Order changes** (wings behind the body in cheer, a wing in front of the face in think) are the wing bone moving
   in depth, keyed in the action.

## Editing Pip

1. Open `pip.blend` in Blender 5.2 or later. Press `1` on the number pad (View › Viewpoint › Front).
2. Select the `Pip rig` armature, switch to Pose Mode, and open the Dope Sheet's **Action Editor**. Pick a mood,
   scrub the timeline, rotate bones with `R` and key them with `I`. Graph Editor curves set the timing and easing.
3. To change a face, key the `show_…` bones' scale (1 to show, 0 to hide) at the frame it should switch.
4. To add a mood, duplicate an action, rename it, and set its frame range and `loop` property.
5. Save, then export: in Blender, Scripting tab › Open `build/export.py` › Run Script. From a shell:
   `blender -b design/rig/blender/pip.blend -P design/rig/blender/build/export.py`, or with the `bpy` module
   (`pip install bpy`): `python design/rig/blender/build/export.py design/rig/blender/pip.blend`.

The export rebuilds the player's settings from the file, so moods, loops and face swaps come from the actions
themselves. The rest (look, idle, springs, mouth shapes, the view) is kept on the scene as `pip3d_base`.

## The player

```js
const pip = await Pip3D.create(el, { src: 'design/rig/blender/pip.gltf.json', mood: 'happy' });
pip.set('cheer');            // blend to a mood
pip.play('hop');             // layer a move on top
pip.look(0.5, -0.2);         // −1…1, or pip.lookAtPoint(clientX, clientY); pip.look(null) to let go
pip.say('Hallo! Ich bin Pip.');   // mouths the line; pip.talking(true|false) while a voice plays
pip.speed = 0.3;             // slow motion
Pip3D.stills([{ mood: 'oops' }], { src })   // PNG data URLs from one hidden renderer, for thumbnails
```

The player adds what Blender doesn't hold: breathing, blinks, quick glances, looking at a point, talking (the
viseme script from the SVG rig), and spring follow-through on the crest, tail and wing-tip bones. Drawing swaps
happen 30% into a blend (wing shapes at 62%, once the wing is most of the way round). Live rigs share one animation
frame loop, sleep off screen and in background tabs, and hold still for people who ask for reduced motion.

A page can keep only a few WebGL canvases alive, so use one live Pip per screen and `Pip3D.stills` (or the SVG
rig's `Rig.svg`) for small or repeated Pips. three.js's loader imports `three` by name: the page needs an import map
for it (`../index.html` has one), or the player adds one before the first module loads.

## Rebuilding from the part sheet

`build/build.sh [python]` regenerates `pip.blend` and `pip.gltf.json` from the traced drawings and the SVG rig's
moods. It needs Node and a Python with `bpy`, `svgelements`, `shapely` and `mapbox_earcut`
(`pip install bpy svgelements shapely mapbox_earcut`; `bpy` 5.2 runs on Python 3.13). It starts `pip.blend` over,
so once the file has been edited in Blender, change it there and use `export.py`.
