# Tracing Pip from the model sheet

These scripts turned `reference/pip-sheet.webp` into the drawings in `pip.js`. They need Python 3 with numpy, scipy,
opencv-python-headless, pillow and potracer, and work in `work/` (set `TRACE_DIR` to change it).

1. `segment.py sheet.png x0 x1 work/n` splits a crop of the sheet into color classes at 4x (n = neutral, x 0…370;
   c = cheer, x 362…732; w = worried, x 718…1086 on the 1086 px sheet).
2. Run `trace_cheer.py` (it saves the cheer torso), `trace_neutral.py`, then `trace_cheer.py` again. `trace_neutral.py` traces the neutral drawing, the setup pose: fills reach the middle of the ink, outlines are
   strokes only where the sheet has ink, and parts hidden by others are completed (the body from the cheer drawing's
   torso, feathers carried on under the body). `trace_cheer.py` traces the raised wings, happy eyes and wide beak.
3. `build_pip.py` writes `pip.js` from both traces plus the hand-drawn states (blink, sad and surprised beaks…).
4. `compose.js`, `cmp.py` and `zoomgrid.py` check the result against the sheet: concept, render and onion skin.

`TRACE_TOL` and `TRACE_EPS` trade path size for precision (0.8 and 3.0 gave a 50 KB `pip.js`).
