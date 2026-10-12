"""Add a bird's moods and moves to its .blend as actions, then export it for the web with export.py.
Moods are whole poses with their move (absolute values); moves (move_hop …) are offsets from rest, layered on top
by the player. Show bones (show_<slot>_<drawing>) switch drawings: scale 1 shows, a hair above 0 hides.
Usage: python animate_blend.py <work dir> <bird.blend> <bird.gltf.json>"""
import os, sys, json, math
import bpy

W, BLEND, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
bpy.ops.wm.open_mainfile(filepath=BLEND)
M = json.load(open(W + '/moods.json'))
D = json.load(open(W + '/drawings.json'))
S, DZ, FPS = 0.01, 0.01, 30
HIDE = 1e-4
scene = bpy.context.scene; scene.render.fps = FPS
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
pb = arm.pose.bones
slot_ids = [s['id'] for s in D['slots']]
slot_index = {s: i for i, s in enumerate(slot_ids)}
slot_bone = {s['id']: s['bone'] for s in D['slots']}
shows = {}
for b in arm.data.bones:
    if b.name.startswith('show_'):
        _, sid, att = b.name.split('_', 2); shows.setdefault(sid, []).append(att)
for b in pb:
    b.rotation_mode = 'XYZ'

EASE = {'linear': ('LINEAR', 'AUTO'), 'in': ('QUAD', 'EASE_IN'), 'out': ('QUAD', 'EASE_OUT'), 'inOut': ('QUAD', 'EASE_IN_OUT'),
        'sine': ('SINE', 'EASE_IN_OUT'), 'back': ('BACK', 'EASE_OUT'), 'pop': ('ELASTIC', 'EASE_OUT'), 'step': ('CONSTANT', 'AUTO')}
def conv(ch, v):
    """SVG rig channel -> (Blender data path, index, value) for a bone whose local X is right and local Y is up"""
    if ch == 'x': return ('location', 0, v * S)
    if ch == 'y': return ('location', 1, -v * S)
    if ch == 'r': return ('rotation_euler', 2, -math.radians(v))
    if ch == 'sx': return ('scale', 0, v)
    if ch == 'sy': return ('scale', 1, v)
def fcurve(act, bone, path, index):
    dp = 'pose.bones["%s"].%s' % (bone, path)
    fcs = act.fcurve_ensure_for_datablock(arm, dp, index=index, group_name=bone) if hasattr(act, 'fcurve_ensure_for_datablock') else None
    return fcs
def key(act, bone, path, index, frame, value, ease='inOut', constant=False):
    fc = fcurve(act, bone, path, index)
    kp = fc.keyframe_points.insert(frame, value, options={'FAST'})
    return fc, kp
def set_eases(fc, eases):
    """rig.js puts the ease on the key that ends a segment; Blender on the key that starts it"""
    pts = sorted(fc.keyframe_points, key=lambda k: k.co.x)
    for i, kp in enumerate(pts):
        nxt = eases.get(round(pts[i + 1].co.x, 3)) if i + 1 < len(pts) else 'inOut'
        ip, ea = EASE.get(nxt or 'inOut', EASE['inOut'])
        kp.interpolation = ip
        if ea != 'AUTO': kp.easing = ea
def new_action(name):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    return act
def bone_keys(act, bones):
    for bone, chans in bones.items():
        if bone not in pb: continue
        for ch, keys in chans.items():
            path, idx, _ = conv(ch, 0)
            eases = {}
            fc = None
            for t, v, e in keys:
                f = round(t * FPS, 3)
                fc, _ = key(act, bone, path, idx, f, conv(ch, v)[2])
                eases[f] = e
            set_eases(fc, eases)
def show_keys(act, slots, end):
    for sid, seq in slots.items():
        if sid not in shows: continue
        for att in shows[sid]:
            name = 'show_%s_%s' % (sid, att)
            for i in range(3):
                fc = fcurve(act, name, 'scale', i)
                for t, a in seq:
                    kp = fc.keyframe_points.insert(round(t * FPS, 3), 1.0 if a == att else HIDE, options={'FAST'})
                    kp.interpolation = 'CONSTANT'
def depth_keys(act, depth):
    for sid, z in depth.items():
        idx = slot_index[sid]
        target = len(slot_ids) + 1 if z == 'front' else z
        fc = fcurve(act, slot_bone[sid], 'location', 2)
        kp = fc.keyframe_points.insert(0, (target - idx) * DZ, options={'FAST'}); kp.interpolation = 'CONSTANT'

# Bends the cut-out rig couldn't do: wing feathers curl through their bone chains (r in degrees, clockwise on screen).
# Each entry adds rotation keys on chain bones for the whole mood.
BENDS = {
    'oops':  {'wingL_folded_2': -14, 'wingL_folded_3': -16, 'wingR_folded_2': 14, 'wingR_folded_3': 16},
    'think': {'wingR_folded_2': 26, 'wingR_folded_3': 30},
    'shrug': {'wingL_folded_2': 22, 'wingL_folded_3': 22, 'wingR_folded_2': -22, 'wingR_folded_3': -22},
    'proud': {'wingL_folded_2': -26, 'wingL_folded_3': -22, 'wingR_folded_2': 26, 'wingR_folded_3': 22},
    'love':  {'wingL_folded_2': -16, 'wingL_folded_3': -18, 'wingR_folded_2': 16, 'wingR_folded_3': 18},
    'sad':   {'wingL_folded_2': -8, 'wingL_folded_3': -10, 'wingR_folded_2': 8, 'wingR_folded_3': 10},
    'point': {'wingR_spread_2': -10, 'wingR_spread_3': -14},
    'cheer': {'wingL_spread_3': 8, 'wingR_spread_3': -8},
}
# the far wing's open drawing bends like its folded one
for bends in BENDS.values():
    for bone, r in list(bends.items()):
        if bone.startswith('wingR_folded_'): bends[bone.replace('_folded_', '_open_')] = r
def bend_keys(act, name):
    for bone, r in BENDS.get(name, {}).items():
        if bone not in pb: continue
        fc = fcurve(act, bone, 'rotation_euler', 2)
        fc.keyframe_points.insert(0, -math.radians(r), options={'FAST'})

made = []
for name, m in M['moods'].items():
    act = new_action(name)
    bone_keys(act, m['bones'])
    bend_keys(act, name)
    show_keys(act, m['slots'], m['dur'])
    depth_keys(act, m.get('depth', {}))
    end = round(m['dur'] * FPS)
    act.frame_range = (0, max(end, 1)); act.use_frame_range = True
    act['loop'] = 1 if m['loop'] else 0
    if not m.get('blink', True): act['blink'] = 0
    if not m.get('glance', True): act['glance'] = 0
    made.append(act)
for name, m in M['moves'].items():
    act = new_action('move_' + name)
    bone_keys(act, m['bones'])
    act.frame_range = (0, max(round(m['dur'] * FPS), 1)); act.use_frame_range = True
    act['loop'] = 1 if m['loop'] else 0
    made.append(act)
# every action on its own (muted) NLA track, so the exporter writes them all; the bird opens in the happy mood
ad = arm.animation_data
for act in made:
    tr = ad.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 0, act)
    tr.mute = True
ad.action = bpy.data.actions['happy']
scene.frame_start, scene.frame_end = 0, 30
atts = {}
for b in arm.data.bones:
    if b.name.startswith('show_'):
        _, sid, att = b.name.split('_', 2); atts.setdefault(sid, []).append(att)
# what the player needs besides the actions; export.py adds the moods and moves from the actions themselves
scene['pip3d_base'] = json.dumps({
    'version': 1, 'id': D.get('id', 'pip'), 'name': D.get('name', 'Pip'), 'view': D['view'], 'unit': S, 'fps': FPS,
    'slots': {s['id']: dict({'bone': s['bone'], 'att': s.get('att'), 'atts': atts.get(s['id'], []), 'blink': s.get('blink')}, **({'showWith': s['showWith']} if s.get('showWith') else {})) for s in D['slots']},
    'look': D['look'], 'idle': D['idle'], 'springs': D['springs'], 'mouth': D['mouth'], 'visemes': D['visemes'],
    'swaps': D.get('swaps', []), 'mirror': D.get('mirror', {}), 'clip': D.get('clip', []),
    'bones': {b['id']: [b['x'], b['y']] for b in D['bones']},
})
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print('actions', len(made))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import export
export.run(OUT)
