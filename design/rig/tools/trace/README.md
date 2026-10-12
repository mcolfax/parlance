# Tracing the birds from their model sheets

## Pip

These scripts turned `reference/pip-sheet.webp` into the drawings in `js/core/pip.js`. They need Python 3 with numpy, scipy,
opencv-python-headless, pillow and potracer, and work in `work/` (set `TRACE_DIR` to change it).

1. `segment.py sheet.png x0 x1 work/n` splits a crop of the sheet into color classes at 4x (n = neutral, x 0…370;
   c = cheer, x 362…732; w = worried, x 718…1086 on the 1086 px sheet).
2. Run `trace_cheer.py` (it saves the cheer torso), `trace_neutral.py`, then `trace_cheer.py` again. `trace_neutral.py` traces the neutral drawing, the setup pose: fills reach the middle of the ink, outlines are
   strokes only where the sheet has ink, and parts hidden by others are completed (the body from the cheer drawing's
   torso, feathers carried on under the body). `trace_cheer.py` traces the raised wings, happy eyes and wide beak.
3. `fit_far_wing.py` fits the far wing's open drawing (the near wing, mirrored and opened to 70% of its width) onto
   the traced far wing, and `fit_pupil_room.py` measures how far each pupil can move inside its eye white. Both read
   `trace_neutral.py`'s masks.
4. `build_pip.py` writes `js/core/pip.js` from both traces, those two fits, and the hand-drawn states (blink, sad and
   surprised beaks…).
5. `compose.js`, `cmp.py` and `zoomgrid.py` check the result against the sheet: concept, render and onion skin.

`TRACE_TOL` and `TRACE_EPS` trade path size for precision (0.8 and 3.0 gave a 50 KB `pip.js`).

## Kiwi, Mango, Kakadu and Rojo

The other birds are traced with a general kit, one bird at a time:

```sh
sh design/rig/tools/trace/run.sh kiwi [python]     # or mango, kakadu, rojo
```

It needs the same Python packages. `run.sh` runs, for one bird:

1. `prep.py` scales the model sheet into setup space: 1 px = 0.5 unit, the feet on the ground line, so every bird
   stands the same height as Pip (`scale` and `feet` in `birds/<bird>.json`).
2. `segment.py` sorts the neutral and cheer crops into the bird's own color classes (`classes` in its config, sampled
   from the sheet).
3. `birds/<bird>.py` traces the bird with `kit.py`: a `Tracer` per crop gives masks in rig units (floods, cuts where a
   line fades out, hulls), and draws fills to the middle of the ink, outlines only where the sheet has ink
   (`outline`), and ink marks. It completes hidden parts (wing roots, the body behind the wings, crest roots under
   Kakadu's tuft), lines the cheer drawing's raised wings and face up with the neutral ones, measures the eyes, the
   pupil room (`pupil_room`) and the palette (`color`), and writes `<work>/<bird>/trace/t.json`.
4. `build_bird.py` writes `js/core/<bird>.js` from the trace and the bird's template (`birds/<bird>.tpl.js`: the
   hand-written part, with the states the sheet doesn't draw, pivots, pose changes and slot order).
5. `crops.py` cuts `reference/<bird>-happy.webp` and `-cheer.webp`, the crops the review pages compare against.

To check the result: `node compare.js <bird> out.png [mood] [n|c] [scale]` (concept | rig | onion skin, needs
Playwright), `node moods.js <bird> out.png` (every mood on one sheet), `grid.py` (a crop of the prepared sheet with a
unit grid, for reading off seeds and cut lines) and `node ../../check.js`. Each trace script's `masks` stage
(`python birds/<bird>.py masks`) saves its first masks over the ink, to check the floods before drawing.

Kiwi's outline is heavier than the others' (3.5 units, `lw` in its config; `kit.measure_lw` measures it). `TRACE_TOL`
0.8 and `TRACE_EPS` 3.0 are the defaults `run.sh` uses.
