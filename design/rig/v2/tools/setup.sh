#!/bin/sh
# Installs the Blender Python module (bpy 5.2 LTS) and its helpers for the birds v2 tools, then checks that bpy imports.
# Idempotent: when bpy 5.2 already imports, nothing is installed. Exits non-zero if bpy doesn't import.
# Usage: sh design/rig/v2/tools/setup.sh [python]
set -u
PY="${1:-python3}"

if "$PY" -c "import bpy, sys; sys.exit(0 if bpy.app.version_string.startswith('5.2') else 1)" >/dev/null 2>&1; then
  :
else
  "$PY" -m pip install --quiet "bpy==5.2.*" svgelements shapely mapbox_earcut numpy || {
    echo "setup.sh: pip install failed" >&2
    exit 1
  }
fi

if ! "$PY" -c "import bpy; print(bpy.app.version_string)"; then
  echo "setup.sh: bpy does not import under $PY" >&2
  exit 1
fi
