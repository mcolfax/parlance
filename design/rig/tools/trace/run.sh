#!/bin/sh
# Trace one of the cast's other birds from its model sheet and write js/core/<bird>.js:
# prep.py (the sheet into setup space) -> segment.py (color classes, neutral and cheer crops) -> birds/<bird>.py (the
# trace) -> build_bird.py (the part sheet, from birds/<bird>.tpl.js). Work files go to $TRACE_DIR/<bird> (tools/trace/work).
# Usage: sh design/rig/tools/trace/run.sh <bird> [python]      (python with numpy scipy opencv-python-headless pillow potracer)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
BIRD=$1; PY=${2:-python3}
export TRACE_DIR=${TRACE_DIR:-$HERE/work} TRACE_TOL=${TRACE_TOL:-0.8} TRACE_EPS=${TRACE_EPS:-3.0}
W=$TRACE_DIR/$BIRD
mkdir -p "$W/trace"
CFG=$HERE/birds/$BIRD.json
get() { "$PY" -c "import json,sys; c=json.load(open('$CFG')); print($1)"; }
"$PY" -I "$HERE/prep.py" "$HERE/../../reference/$(get "c['sheet']")" "$W/sheet.png" "$(get "c['scale']")" "$(get "c['feet']")"
for k in n c; do
  "$PY" -I "$HERE/segment.py" "$W/sheet.png" "$(get "c['crops']['$k'][0]")" "$(get "c['crops']['$k'][1]")" "$W/trace/$k" "$CFG" | cut -c1-120
done
"$PY" "$HERE/birds/$BIRD.py" > "$W/trace.log"
"$PY" -I "$HERE/build_bird.py" "$BIRD"
