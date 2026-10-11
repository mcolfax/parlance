"""Export Pip's Blender rig for the web: pip.blend -> pip.gltf.json next to it.

Run it from Blender (Scripting tab: open this file, Run Script), or from a shell:
  blender -b design/rig/blender/pip.blend -P design/rig/blender/build/export.py
  python design/rig/blender/build/export.py design/rig/blender/pip.blend      (with the bpy module: pip install bpy)

The player's settings are rebuilt from the file every time, so the .blend is the source of truth:
- every action is a mood, and an action named move_<name> is a move layered on top (hop, nod…);
- an action's frame range is its length, and its custom property 'loop' (1 or 0) says whether it repeats;
- its keys on the show_<slot>_<drawing> bones say which drawing each slot shows, and when (scale 1 shows);
- 'blink' and 'glance' properties (0 to turn off) say whether Pip blinks and glances in that mood.
The rest (look, idle, springs, mouth shapes, the view) lives on the scene as the custom property pip3d_base."""
import os, sys, json, struct, base64, tempfile
import bpy


def fcurves_of(act):
    out = []
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    if not out and hasattr(act, 'fcurves'):
        out = list(act.fcurves)
    return out


def build_cfg(scene, arm):
    base = json.loads(scene['pip3d_base'])
    fps = scene.render.fps / scene.render.fps_base
    shows = {}
    for b in arm.data.bones:
        if b.name.startswith('show_'):
            _, sid, att = b.name.split('_', 2)
            shows.setdefault(sid, []).append(att)
    moods, moves = {}, {}
    for act in bpy.data.actions:
        f0, f1 = act.frame_range
        dur = round(max(f1 - f0, 1) / fps, 4)
        loop = bool(act.get('loop', 0))
        if act.name.startswith('move_'):
            moves[act.name[5:]] = {'loop': loop, 'dur': dur}
            continue
        curves = {}
        for fc in fcurves_of(act):
            dp = fc.data_path
            if dp.startswith('pose.bones["show_') and dp.endswith('"].scale') and fc.array_index == 0:
                curves[dp[len('pose.bones["'):-len('"].scale')]] = fc
        slots = {}
        for sid, atts in shows.items():
            fcs = {a: curves.get('show_%s_%s' % (sid, a)) for a in atts}
            frames = sorted({round(k.co.x, 3) for fc in fcs.values() if fc for k in fc.keyframe_points} | {f0})
            seq = []
            for f in frames:
                shown = [a for a, fc in fcs.items() if fc and fc.evaluate(f) > 0.5]
                att = shown[0] if shown else None
                if not seq or seq[-1][1] != att:
                    seq.append([round((f - f0) / fps, 4), att])
            if not any(fcs.values()):
                seq = [[0, base['slots'][sid]['att']]]
            slots[sid] = seq
        moods[act.name] = {'loop': loop, 'dur': dur, 'slots': slots,
                           'blink': bool(act.get('blink', 1)), 'glance': bool(act.get('glance', 1))}
    cfg = dict(base)
    cfg['moods'], cfg['moves'] = moods, moves
    return cfg


def compact(glb):
    """drop the drawing-switch tracks (the player switches drawings from the settings) and repack the buffer"""
    n = struct.unpack('<I', glb[12:16])[0]
    J = json.loads(glb[20:20 + n])
    off = 20 + n
    m = struct.unpack('<I', glb[off:off + 4])[0]
    BIN = glb[off + 8: off + 8 + m]
    names = [x.get('name', '') for x in J['nodes']]
    for an in J.get('animations', []):
        keep = [c for c in an['channels'] if not names[c['target']['node']].startswith('show_')]
        used = sorted({c['sampler'] for c in keep})
        remap = {o: i for i, o in enumerate(used)}
        an['samplers'] = [an['samplers'][i] for i in used]
        for c in keep:
            c['sampler'] = remap[c['sampler']]
        an['channels'] = keep
    refs = set()
    for me in J['meshes']:
        for p in me['primitives']:
            refs.update(p['attributes'].values())
            if 'indices' in p:
                refs.add(p['indices'])
    for sk in J.get('skins', []):
        if 'inverseBindMatrices' in sk:
            refs.add(sk['inverseBindMatrices'])
    for an in J.get('animations', []):
        for s in an['samplers']:
            refs.update([s['input'], s['output']])
    order = sorted(refs)
    amap = {o: i for i, o in enumerate(order)}
    newbin, views, accs = bytearray(), [], []
    SIZE = {5126: 4, 5123: 2, 5125: 4, 5121: 1, 5122: 2, 5120: 1}
    COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    for o in order:
        a = dict(J['accessors'][o])
        v = J['bufferViews'][a['bufferView']]
        start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        size = SIZE[a['componentType']] * COMP[a['type']]
        stride = v.get('byteStride', size)
        chunk = b''.join(BIN[start + i * stride: start + i * stride + size] for i in range(a['count']))
        while len(newbin) % 4:
            newbin.append(0)
        nv = {'buffer': 0, 'byteOffset': len(newbin), 'byteLength': len(chunk)}
        if 'target' in v:
            nv['target'] = v['target']
        newbin += chunk
        views.append(nv)
        a['bufferView'] = len(views) - 1
        a.pop('byteOffset', None)
        accs.append(a)
    J['accessors'], J['bufferViews'] = accs, views
    for me in J['meshes']:
        for p in me['primitives']:
            p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = amap[p['indices']]
    for sk in J.get('skins', []):
        if 'inverseBindMatrices' in sk:
            sk['inverseBindMatrices'] = amap[sk['inverseBindMatrices']]
    for an in J.get('animations', []):
        for s in an['samplers']:
            s['input'], s['output'] = amap[s['input']], amap[s['output']]
    J['buffers'] = [{'byteLength': len(newbin),
                     'uri': 'data:application/octet-stream;base64,' + base64.b64encode(bytes(newbin)).decode()}]
    return json.dumps(J, separators=(',', ':'))


def run(out_json=None):
    scene = bpy.context.scene
    arm = bpy.data.objects['Pip rig']
    out_json = out_json or os.path.join(os.path.dirname(bpy.data.filepath), 'pip.gltf.json')
    scene['pip3d'] = json.dumps(build_cfg(scene, arm))
    ad = arm.animation_data
    keep_action = ad.action if ad else None
    tmp = os.path.join(tempfile.mkdtemp(), 'pip.glb')
    bpy.ops.export_scene.gltf(
        filepath=tmp, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
        export_skins=True, export_yup=True, export_extras=True, export_force_sampling=True, export_frame_step=1,
        export_anim_slide_to_zero=False, export_optimize_animation_size=True, export_def_bones=False,
        export_rest_position_armature=True, export_morph=False, export_normals=False, export_texcoords=False,
        export_optimize_animation_keep_anim_armature=False, export_optimize_animation_keep_anim_object=False)
    if ad:
        ad.action = keep_action
    text = compact(open(tmp, 'rb').read())
    open(out_json, 'w').write(text)
    print('exported', out_json, len(text), 'bytes')
    return out_json


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    blend = [a for a in args if a.endswith('.blend')]
    if blend and not bpy.data.filepath:
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(blend[0]))
    outs = [a for a in args if a.endswith('.json')]
    run(outs[0] if outs else None)
