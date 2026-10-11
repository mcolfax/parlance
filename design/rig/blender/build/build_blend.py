"""Build Pip's Blender rig from shapes.json (flattened drawings) and drawings.json (skeleton, slots, palette).

Layout: the bird stands in Blender's front plane (X right, Z up), seen from the front (-Y). 1 rig unit = 1 cm,
x 120 / ground y 250 of the part sheet sit at the origin. Draw order is depth: later slots sit nearer the camera.
Bones all lie in the front plane with their local Z axis toward the viewer, so a bone's in-plane turn is its Z
rotation. Wings, crest feathers and the tail are chains of bones with smooth weights, so they bend. A slot with
several drawings (eyes, mouths, wing shapes…) gets a small show_<slot>_<drawing> bone per drawing; an action shows a drawing by
keeping its show bone at scale 1 and hides the others at scale 0.
Usage: python build_blend.py <work dir> <out.blend>"""
import sys, json, math
import bpy, bmesh
from mathutils import Vector, Matrix
import numpy as np
import mapbox_earcut as earcut

W = sys.argv[1]; OUT = sys.argv[2]
D = json.load(open(W + '/drawings.json'))
SH = json.load(open(W + '/shapes.json'))
S = 0.01                     # metres per rig unit
DZ = 0.01                    # depth between slots
DZS = 0.0008                 # depth between shapes inside one drawing
def P(x, y): return Vector(((x - 120) * S, 0.0, (250 - y) * S))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
scene.unit_settings.system = 'METRIC'

# ---------------- materials: one per palette color ----------------
pal = {v.upper(): k for k, v in D['palette'].items() if v.startswith('#')}
mats = {}
def material(hexc, alpha):
    key = (hexc, round(alpha, 3))
    if key in mats: return mats[key]
    name = pal.get(hexc, hexc.lstrip('#')) + ('' if alpha >= 0.999 else '-%d' % round(alpha * 100))
    m = bpy.data.materials.new(name)
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    col = (lin(r), lin(g), lin(b), alpha)
    m.diffuse_color = col                      # solid-mode viewport color
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = col
    bsdf.inputs['Alpha'].default_value = alpha
    bsdf.inputs['Emission Color'].default_value = col
    bsdf.inputs['Emission Strength'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = 1.0
    if alpha < 0.999:
        m.surface_render_method = 'BLENDED'
    mats[key] = m
    return m

# ---------------- skeleton ----------------
bones = {b['id']: b for b in D['bones']}
slots = D['slots']
slot_index = {s['id']: i for i, s in enumerate(slots)}
atts = {}
for key in SH:
    s, a = key.split('/'); atts.setdefault(s, []).append(a)
CHAIN_ATTS = {('wingL', 'folded'), ('wingL', 'spread'), ('wingR', 'folded'), ('wingR', 'open'), ('wingR', 'spread')}

def extent_tip(key, pivot):
    """farthest drawn point from the pivot"""
    best, bd = None, -1
    for sh in SH[key]:
        for poly in sh['polys']:
            for x, y in poly[0]:
                d = (x - pivot[0]) ** 2 + (y - pivot[1]) ** 2
                if d > bd: bd, best = d, (x, y)
    return best

arm_data = bpy.data.armatures.new('Pip rig')
arm = bpy.data.objects.new('Pip rig', arm_data)
scene.collection.objects.link(arm)
arm_data.display_type = 'STICK'
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones
UP = 4.0                     # rig units: length of a bone that only marks a pivot
def add_bone(name, head, tail, parent=None):
    b = eb.new(name); b.head = P(*head); b.tail = P(*tail)
    b.align_roll(Vector((0, -1, 0)))
    if parent: b.parent = eb[parent]
    b.use_connect = False; b.use_deform = False
    return b
for b in D['bones']:
    add_bone(b['id'], (b['x'], b['y']), (b['x'], b['y'] - UP), b.get('parent'))
# mirror controls, beside the bird: ctl_facing turns the whole bird round (oops faces left), ctl_head the head once it
# turns past the front. Location X is 0, or -2 cm to mirror; a driver mirrors the bone from it. (A negative scale
# keyed on the bone itself doesn't survive the glTF export, so export.py mutes the drivers and the player reads
# the controls.)
MIRROR = D.get('mirror') or {}
CTLS = [(MIRROR[k], 'ctl_' + MIRROR[k]) for k in ('facing', 'head') if MIRROR.get(k)]
for i, (_, name) in enumerate(CTLS):
    add_bone(name, (226, 246 - i * 10), (226, 246 - i * 10 - UP))
chains = {}                  # (slot, att) or bone id -> [bone names along the chain]
def chain(name, parent, pts, deform=True):
    names = []
    for k in range(len(pts) - 1):
        n = name + '_%d' % (k + 1)
        b = add_bone(n, pts[k], pts[k + 1], parent if k == 0 else names[-1])
        b.use_deform = deform
        names.append(n)
    return names
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
# show bones for slots with choices (or that start hidden)
show = {}
for s in slots:
    sid = s['id']; choices = atts.get(sid, [])
    if len(choices) > 1 or s.get('att') is None:
        bone = bones[s['bone']]
        for a in choices:
            n = 'show_%s_%s' % (sid, a)
            add_bone(n, (bone['x'], bone['y']), (bone['x'] + UP * 0.5, bone['y'] - UP * 0.5), s['bone'])
            show[(sid, a)] = n
# bending chains: wing drawings (under their show bones), crest feathers, tail
for (sid, a) in CHAIN_ATTS:
    bone = bones[sid]; piv = (bone['x'], bone['y'])
    tip = extent_tip(sid + '/' + a, piv)
    pts = [lerp(piv, tip, t) for t in (0, 0.36, 0.68, 1.0)]
    chains[(sid, a)] = chain('%s_%s' % (sid, a), show[(sid, a)], pts)
for cid in ('crest1', 'crest2', 'crest3'):
    bone = bones[cid]; piv = (bone['x'], bone['y'])
    tip = extent_tip(cid + '/on', piv)
    chains[(cid, 'on')] = chain(cid + '_bend', cid, [piv, lerp(piv, tip, 0.5), tip])
tb = bones['tail']; tpiv = (tb['x'], tb['y']); ttip = extent_tip('tail/fan', tpiv)
chains[('tail', 'fan')] = chain('tail_bend', 'tail', [tpiv, lerp(tpiv, ttip, 0.45), lerp(tpiv, ttip, 0.75), ttip])
bpy.ops.object.mode_set(mode='OBJECT')
bone_len = {b.name: b.length for b in arm_data.bones}
for target, name in CTLS:
    drv = arm.pose.bones[target].driver_add('scale', 0).driver
    drv.type = 'SCRIPTED'
    var = drv.variables.new(); var.name = 'm'; var.type = 'TRANSFORMS'
    t = var.targets[0]; t.id = arm; t.bone_target = name; t.transform_type = 'LOC_X'; t.transform_space = 'LOCAL_SPACE'
    drv.expression = '(1 if m > -0.01 else -1) * max(abs(1 + m * 100), 0.72)'   # never narrower than 0.72 mid-turn
    print('driver', target, 'simple' if drv.is_simple_expression else 'python')

# ---------------- meshes ----------------
coll = bpy.data.collections.new('Pip parts'); scene.collection.children.link(coll)
def build_mesh(name, shapes, depth):
    verts, faces, mat_idx, ms = [], [], [], []
    for k, sh in enumerate(shapes):
        m = material(sh['color'], sh.get('alpha', 1))
        if m.name not in [x.name for x in ms]: ms.append(m)
        mi = [x.name for x in ms].index(m.name)
        y = depth - k * DZS
        for poly in sh['polys']:
            rings = [np.array(r, dtype=np.float64) for r in poly]
            flat = np.vstack(rings)
            ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
            tris = earcut.triangulate_float64(flat, ends).reshape(-1, 3)
            base = len(verts)
            for x, yy in flat: verts.append(((x - 120) * S, y, (250 - yy) * S))
            for t in tris: faces.append((base + int(t[0]), base + int(t[2]), base + int(t[1]))); mat_idx.append(mi)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    for m in ms: me.materials.append(m)
    for f, mi in zip(me.polygons, mat_idx): f.material_index = mi
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    return ob
def parent_to_bone(ob, bname):
    ob.parent = arm; ob.parent_type = 'BONE'; ob.parent_bone = bname
    bone = arm_data.bones[bname]
    ob.matrix_parent_inverse = (arm.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))).inverted()
def skin(ob, names):
    """weights by arc length along the chain, blended across each joint"""
    ob.parent = arm; ob.parent_type = 'OBJECT'
    mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    groups = [ob.vertex_groups.new(name=n) for n in names]
    segs = [(arm_data.bones[n].head_local.copy(), arm_data.bones[n].tail_local.copy()) for n in names]
    lens = [(b - a).length for a, b in segs]; cum = np.concatenate([[0], np.cumsum(lens)])
    for v in ob.data.vertices:
        p = Vector((v.co.x, 0, v.co.z))
        best = (1e9, 0.0)
        for i, (a, b) in enumerate(segs):
            ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
            d = (a + ab * t - p).length
            if d < best[0]: best = (d, cum[i] + t * lens[i])
        s = best[1]
        n = len(names); w = np.zeros(n)
        hj = [0] + [0.35 * min(lens[j - 1], lens[j]) for j in range(1, n)]     # blend half-width at each joint
        for i in range(n):
            up = 1.0 if i == 0 else np.clip((s - (cum[i] - hj[i])) / (2 * hj[i]), 0, 1)
            down = 1.0 if i == n - 1 else np.clip(((cum[i + 1] + hj[i + 1]) - s) / (2 * hj[i + 1]), 0, 1)
            w[i] = min(up, down)
        w = w / w.sum() if w.sum() > 0 else np.eye(len(names))[0]
        for i, g in enumerate(groups):
            if w[i] > 1e-4: g.add([v.index], float(w[i]), 'REPLACE')
made = 0
for s in slots:
    sid = s['id']
    for a in atts.get(sid, []):
        shapes = SH[sid + '/' + a]
        if not shapes: continue
        ob = build_mesh('%s_%s' % (sid, a), shapes, -slot_index[sid] * DZ)
        ob['slot'] = sid; ob['drawing'] = a
        if (sid, a) in chains: skin(ob, chains[(sid, a)])
        elif (sid, a) in show: parent_to_bone(ob, show[(sid, a)])
        else: parent_to_bone(ob, s['bone'])
        made += 1
print('meshes', made, 'bones', len(arm_data.bones), 'materials', len(mats))

# ---------------- camera that frames the app's view ----------------
vx, vy, vw, vh = D['view']
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); scene.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(vw, vh) * S
cam.location = Vector(((vx + vw / 2 - 120) * S, -2.0, (250 - (vy + vh / 2)) * S)); cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
scene.render.resolution_x = 816; scene.render.resolution_y = int(816 * vh / vw)
scene.render.film_transparent = True
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('saved', OUT)
