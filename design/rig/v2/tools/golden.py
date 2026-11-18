#!/usr/bin/env python3
"""Golden curve samples from a bird's Blender file, for testing that a runtime evaluates the exported curves the way Blender does.

Usage:   python3 design/rig/v2/tools/golden.py <bird.blend> [out.json]      (default: design/rig/v2/test/<bird>-golden.json)
For 5 actions (mood:cheer, mood:think, mood:oops, move:hop, move:lookAround: eased, dense, mirrored and layered curves)
and every bone curve in them, it samples fcurve.evaluate() at 60 evenly spaced times from 0 to the action's length
(both ends included) and writes the values in the units the rig2 file uses (setup space, degrees clockwise, seconds).
This reads Blender's own evaluation, not the exported keys, so it checks the exporter's curve conversion too."""
import os, sys, json

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export

ACTIONS = ['mood:cheer', 'mood:think', 'mood:oops', 'move:hop', 'move:lookAround']
SAMPLES = 60
HERE = os.path.dirname(os.path.abspath(__file__))


def run(blend, out_json=None):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(blend))
    scene = bpy.context.scene
    fps = scene.render.fps / scene.render.fps_base
    bird = os.path.splitext(os.path.basename(blend))[0]
    out_json = out_json or os.path.join(HERE, '..', 'test', bird + '-golden.json')
    actions = {}
    for act in bpy.data.actions:
        key = ('move:' + act.name[5:]) if act.name.startswith('move_') else ('mood:' + act.name)
        if key not in ACTIONS:
            continue
        f0, f1 = act.frame_range
        dur = (f1 - f0) / fps
        curves = {}
        for fc in export.fcurves_of(act):
            m = export.PATH.match(fc.data_path)
            if not m or m.group(1).startswith('show_'):
                continue
            ch = export.CHANNELS.get((m.group(2), fc.array_index))
            if not ch:
                continue
            if m.group(1).startswith('ctl_') and ch[0] != 'x':
                continue        # as export.py: only the mirror controls' x means anything
            vals = [round(ch[1](fc.evaluate(f0 + dur * i / (SAMPLES - 1) * fps)), 4) for i in range(SAMPLES)]
            if m.group(1).startswith('ctl_') and act.name.startswith('move_') and not any(vals):
                continue        # and a move that never mirrors has no control curve
            curves[m.group(1) + '.' + ch[0]] = vals
        actions[key] = {'dur': round(dur, 4), 'curves': dict(sorted(curves.items()))}
    missing = [a for a in ACTIONS if a not in actions]
    if missing:
        sys.exit('golden.py: %s has no action %s' % (blend, ', '.join(missing)))
    doc = {'bird': bird, 'fps': fps, 'samples': SAMPLES, 'tolerance': 0.01,
           'about': 'values[i] is the curve at t = dur * i / (samples - 1) seconds; made by design/rig/v2/tools/golden.py from fcurve.evaluate()',
           'actions': {a: actions[a] for a in ACTIONS}}
    with open(out_json, 'w') as f:
        json.dump(doc, f, separators=(',', ':'))
    n = sum(len(a['curves']) for a in actions.values())
    print('wrote %s: %d actions, %d curves, %d samples each, %d bytes' % (os.path.normpath(out_json), len(actions), n, SAMPLES, os.path.getsize(out_json)))


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if not args or not args[0].endswith('.blend'):
        sys.exit(__doc__)
    run(args[0], args[1] if len(args) > 1 else None)
