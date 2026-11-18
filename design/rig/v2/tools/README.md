# Making `media/birds/pip.json`

`media/birds/pip.json` is what `js/core/rig2.js` plays. It is exported from a Blender file that is **built from the
current part sheet** (`js/core/pip.js`, `js/core/bird.js`), not from the committed `design/rig/blender/pip.blend`, which
is older than the part sheet (no `dizzy` mood, no `fxHead/stars` drawing; see "Known gaps" in `../FORMAT.md`).

`design/rig/blender/build/build.sh` starts the `.blend` over and writes it next to itself, and it finds `js/core/`
relative to its own folder. So build in a scratch copy that has the repo's `js` folder beside it, leaving the committed
files alone:

```sh
sh design/rig/v2/tools/setup.sh                      # bpy 5.2 and helpers; prints 5.2.x
S=$(mktemp -d)                                       # any scratch folder outside the repo
mkdir -p $S/design/rig && cp -r design/rig/blender $S/design/rig/ && ln -s "$PWD/js" $S/js
(cd $S && sh design/rig/blender/build/build.sh pip python3)       # about 10 s; writes $S/design/rig/blender/pip.blend
python3 design/rig/v2/tools/export.py $S/design/rig/blender/pip.blend media/birds/pip.json
python3 design/rig/v2/test/check_export.py media/birds/pip.json \
  --golden design/rig/v2/test/pip-golden.json --blend $S/design/rig/blender/pip.blend     # must end with ok, no --known-gaps
node design/rig/v2/test/rig2.test.js                 # must end with ok
```

`export.py` prints the counts and the gzipped size (budget 120 KB; Pip is about 68 KB). It reads the `.blend` and
never changes it.

**Golden samples.** `design/rig/v2/test/pip-golden.json` was sampled from the committed blend. The rebuilt blend gives
the same samples (checked: every one of 161 curves x 60 samples is identical), so it stays. If a later rebuild changes
an action, regenerate it from the same rebuilt file and say so in the commit:

```sh
python3 design/rig/v2/tools/golden.py $S/design/rig/blender/pip.blend
```

The other birds are the same with `kiwi`, `mango`, `kakadu` or `rojo` for `pip` (their data is not exported yet).
When WP5 lands, `sh design/rig/v2/build.sh pip` does all of this in one command.

## Checking the runtime

```sh
node design/rig/v2/test/rig2.test.js                              # pure math, curves against Blender, stills (also part of npm test)
npm run preview &                                                 # http://127.0.0.1:8765/design/rig/v2/index.html is the review page
NODE_PATH="$(npm root -g)" node design/rig/v2/test/rig2.browser.js all     # pose parity with the old rig, behavior, reduced motion, speed
NODE_PATH="$(npm root -g)" node design/rig/v2/test/rig2.shots.js           # old and new side by side, light and dark, into design/rig/v2/review/wp3/
```
