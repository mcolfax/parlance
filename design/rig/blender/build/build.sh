#!/bin/sh
# Rebuild Pip's Blender rig (pip.blend) and its web export (pip.gltf.json) from the traced part sheet (js/core/pip.js)
# and the SVG rig's moods (js/core/bird.js). This starts pip.blend over: once pip.blend has been edited by hand in Blender,
# export it with export.py instead.
# Usage: sh design/rig/blender/build/build.sh [python with bpy]     (pip install bpy; Blender 5.2's Python works too)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CORE=$(cd "$HERE/../../../../js/core" && pwd)   # rig.js, bird.js and pip.js live with the app
OUT=$(cd "$HERE/.." && pwd)
PY=${1:-python3}
W=$(mktemp -d)
node -e "
const Rig = require('$CORE/rig.js'); const PIP = require('$CORE/pip.js');
const out = { palette: PIP.palette, lines: PIP.lines, view: PIP.view, turn: PIP.turn, bones: PIP.bones, slots: PIP.slots, look: PIP.look,
  idle: PIP.idle, springs: PIP.springs, mouth: PIP.mouth, visemes: PIP.visemes, shadow: PIP.shadow, swaps: PIP.swaps, mirror: PIP.mirror, clip: PIP.clip,
  parts: Rig.parts(PIP).map(p => ({ slot: p.slot, name: p.name, bone: p.bone, markup: p.markup })) };
require('fs').writeFileSync('$W/drawings.json', JSON.stringify(out));"
"$PY" "$HERE/flatten.py" "$W" | head -1
node "$HERE/bake_moods.js" "$CORE" "$W/moods.json" > /dev/null
"$PY" "$HERE/build_blend.py" "$W" "$OUT/pip.blend" 2>&1 | grep -E "^meshes|^saved"
"$PY" "$HERE/animate_blend.py" "$W" "$OUT/pip.blend" "$OUT/pip.gltf.json" 2>&1 | grep -E "^actions|^exported|Error|Traceback"
rm -rf "$W" "$OUT/pip.blend1" "$HERE/__pycache__"
