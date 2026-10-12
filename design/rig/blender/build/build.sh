#!/bin/sh
# Rebuild a bird's Blender rig (<bird>.blend) and its web export (<bird>.gltf.json) from its traced part sheet
# (js/core/<bird>.js) and the SVG rig's moods (js/core/bird.js). This starts <bird>.blend over: once it has been edited
# by hand in Blender, export it with export.py instead.
# Usage: sh design/rig/blender/build/build.sh [bird] [python with bpy]     (bird: pip, kiwi, mango, kakadu or rojo; pip
#        by default. pip install bpy; Blender 5.2's Python works too)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
CORE=$(cd "$HERE/../../../../js/core" && pwd)   # rig.js, bird.js and pip.js live with the app
OUT=$(cd "$HERE/.." && pwd)
case "$1" in *python*|*/*) BIRD=pip; PY=$1 ;; *) BIRD=${1:-pip}; PY=${2:-python3} ;; esac
W=$(mktemp -d)
node -e "
const Rig = require('$CORE/rig.js'); const B = require('$CORE/$BIRD.js');
const out = { id: B.id, name: B.name, palette: B.palette, lines: B.lines, view: B.view, turn: B.turn, bones: B.bones, slots: B.slots, look: B.look,
  idle: B.idle, springs: B.springs, mouth: B.mouth, visemes: B.visemes, shadow: B.shadow, swaps: B.swaps, mirror: B.mirror, clip: B.clip,
  parts: Rig.parts(B).map(p => ({ slot: p.slot, name: p.name, bone: p.bone, markup: p.markup })) };
require('fs').writeFileSync('$W/drawings.json', JSON.stringify(out));"
"$PY" "$HERE/flatten.py" "$W" | head -1
node "$HERE/bake_moods.js" "$CORE" "$W/moods.json" "$BIRD" > /dev/null
"$PY" "$HERE/build_blend.py" "$W" "$OUT/$BIRD.blend" 2>&1 | grep -E "^meshes|^saved"
"$PY" "$HERE/animate_blend.py" "$W" "$OUT/$BIRD.blend" "$OUT/$BIRD.gltf.json" 2>&1 | grep -E "^actions|^exported|Error|Traceback"
rm -rf "$W" "$OUT/$BIRD.blend1" "$HERE/__pycache__"
