#!/usr/bin/env python3
"""Export a bird's Blender rig to rig2 JSON (design/rig/v2/FORMAT.md): bones, slots, skinned outline drawings and every action.

Usage:   python3 design/rig/v2/tools/export.py <bird.blend> <out.json>
Needs:   the bpy module (sh design/rig/v2/tools/setup.sh), numpy, shapely, and Node (the bird's definition in js/core/ gives
         the draw order, the procedural settings and the mood list, as build/bake_moods.js reads them).
The .blend is only read, never saved. Input is a rig built by design/rig/blender/build/build.sh (or edited from one).

Space conversion (FORMAT.md "Blender to setup space"): setup x = 120 + 100 X, setup y = 250 - 100 Z (X right, Z up, metres;
1 cm = 1 setup unit); bone channels: x = 100 locX, y = -100 locY, r = -degrees(rotZ) (clockwise positive, as js/core/rig.js),
sx = scaleX, sy = scaleY. Times are seconds from the action's first frame at the scene's frame rate."""
import os, sys, json, math, re, gzip, subprocess

import bpy
import numpy as np
from shapely.geometry import Polygon

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))

# ---- tuning: the plan's resampling rules and the curve fit's tolerances ----
STEP = 2.5            # one point every 2.5 setup units along an outline
CORNER = 35.0         # a vertex that turns the outline by more than this many degrees stays
MIN_POINTS = 4        # fewest points in a loop
# Curve tolerances per channel, in the channel's units: a scale error is multiplied by the distance from the pivot (up
# to ~150 units), so scales are held ten times tighter than offsets. Non-bezier segments are refitted to bezier within
# TOL (and linear keys on the line between their neighbours are dropped within it); values are rounded to DEC places.
TOL = {'x': 0.003, 'y': 0.003, 'r': 0.004, 'sx': 0.0002, 'sy': 0.0002}
DEC = {'x': 3, 'y': 3, 'r': 3, 'sx': 4, 'sy': 4}
DZ = 0.01             # metres between slots in Blender's depth (build_blend.py)
SPAN = (120.0, 250.0) # sheet x at Blender's origin, sheet y of the ground

EXCLUDED = ('show_', 'ctl_')   # Blender-only helper bones: drawing switches and mirror controls
gaps = []                       # things the .blend doesn't have that the part sheet does; printed and returned


def gap(msg):
    gaps.append(msg)
    print('GAP:', msg, file=sys.stderr)


# ---------------------------------------------------------------- numbers
def rnd(v, nd=2):
    v = round(float(v), nd)
    if v == 0:
        return 0
    return int(v) if v == int(v) else v


def tidy(o):
    """integral floats become ints (smaller JSON), recursively"""
    if isinstance(o, float):
        return int(o) if o == int(o) else o
    if isinstance(o, list):
        return [tidy(x) for x in o]
    if isinstance(o, dict):
        return {k: tidy(v) for k, v in o.items()}
    return o


def sx_of(X):
    return SPAN[0] + 100.0 * X


def sy_of(Z):
    return SPAN[1] - 100.0 * Z


# ---------------------------------------------------------------- the part sheet, through Node
NODE_DUMP = r"""
const repo = process.argv[1], id = process.argv[2];
const Rig = require(repo + '/js/core/rig.js'); const B = require(repo + '/js/core/' + id + '.js');
const empty = m => String(m == null ? '' : m).replace(/<g\s*\/>|\s/g, '') === '';
const out = {
  id: B.id, name: B.name, view: B.view, lines: B.lines, palette: B.palette,
  bones: B.bones.map(b => ({ id: b.id, parent: b.parent || null, x: b.x, y: b.y, turn: b.turn || null })),
  slots: B.slots.map(s => ({ id: s.id, bone: s.bone, att: s.att === undefined ? null : s.att, blink: s.blink || null, showWith: s.showWith || null })),
  parts: Object.fromEntries(Object.keys(B.parts).map(k => [k, Object.keys(B.parts[k]).map(n => ({ name: n, empty: empty(B.parts[k][n]) }))])),
  moods: Object.keys(B.moods),
  moodParams: Object.fromEntries(Object.keys(B.moods).map(m => [m, Rig.resolve(B, m).params])),
  problems: Rig.validate(B),
  procedural: { springs: B.springs || {}, look: B.look || {}, turn: B.turn || {}, idle: B.idle || {}, mouth: B.mouth || {}, visemes: B.visemes || {},
    mirror: B.mirror || {}, swaps: B.swaps || [], clip: B.clip || [], shadow: B.shadow || null, rest: B.rest || {}, restMood: B.restMood || 'happy', hopClip: B.hopClip || 'hop' }
};
process.stdout.write(JSON.stringify(out));
"""


def part_sheet(bird_id):
    r = subprocess.run(['node', '-e', NODE_DUMP, REPO, bird_id], capture_output=True, text=True)
    if r.returncode:
        sys.exit('export.py: node could not read js/core/%s.js:\n%s' % (bird_id, r.stderr))
    return json.loads(r.stdout)


# ---------------------------------------------------------------- f-curves
def fcurves_of(act):
    out = []
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    if not out and hasattr(act, 'fcurves'):
        out = list(act.fcurves)
    return out


CHANNELS = {   # (blender property, index) -> (channel name, value from Blender)
    ('location', 0): ('x', lambda v: v * 100.0),
    ('location', 1): ('y', lambda v: -v * 100.0),
    ('rotation_euler', 2): ('r', lambda v: -math.degrees(v)),
    ('scale', 0): ('sx', lambda v: v),
    ('scale', 1): ('sy', lambda v: v),
}
PATH = re.compile(r'^pose\.bones\["(.*)"\]\.(\w+)$')


def fit_segment(ev, fa, fb, tol, depth=0):
    """Leaf pieces (fa, va, p1, fb, vb, p2) that reproduce ev(frame) between fa and fb. Each piece is a cubic bezier whose
    time handles sit at the thirds (so it is a cubic polynomial in time) with value handles p1 and p2; a piece is split in
    two until its error against ev is under tol (a quad ease-in-out splits once and is then exact)."""
    e = min(0.05, (fb - fa) / 20.0)
    va, vb = ev(fa), ev(fb)
    da = (-3 * va + 4 * ev(fa + e) - ev(fa + 2 * e)) / (2 * e)
    db = (3 * vb - 4 * ev(fb - e) + ev(fb - 2 * e)) / (2 * e)
    h = fb - fa
    p1, p2 = va + da * h / 3.0, vb - db * h / 3.0
    worst = 0.0
    for i in range(1, 12):
        u = i / 12.0
        b = (1 - u) ** 3 * va + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u ** 2 * p2 + u ** 3 * vb
        worst = max(worst, abs(b - ev(fa + u * h)))
    if worst <= tol or depth >= 8:
        return [(fa, va, p1, fb, vb, p2)]
    fm = (fa + fb) / 2.0
    return fit_segment(ev, fa, fm, tol, depth + 1) + fit_segment(ev, fm, fb, tol, depth + 1)


def curve_keys(fc, f0, fps, fn, tol):
    """The curve as rig2 keys [t, v, tIn, vIn, tOut, vOut] (+ a trailing 1 when the value holds until the next key)."""
    pts = sorted(fc.keyframe_points, key=lambda k: k.co.x)
    T = lambda f: (f - f0) / fps
    if len(pts) == 1:
        t, v = T(pts[0].co.x), fn(pts[0].co.y)
        return [[t, v, t, v, t, v]]
    # drop linear keys that sit on the line between their neighbours (the baked turn drivers sample every frame)
    keep = [True] * len(pts)
    i = 0
    while i < len(pts) - 1:
        if pts[i].interpolation != 'LINEAR':
            i += 1
            continue
        j = i
        while j < len(pts) - 1 and pts[j].interpolation == 'LINEAR':
            j += 1
        # keys i..j form a linear run (key j is where it ends); simplify the interior
        def rdp(a, b):
            ta, va, tb, vb = pts[a].co.x, fn(pts[a].co.y), pts[b].co.x, fn(pts[b].co.y)
            worst, at = 0.0, None
            for m in range(a + 1, b):
                lin = va + (vb - va) * (pts[m].co.x - ta) / (tb - ta)
                d = abs(fn(pts[m].co.y) - lin)
                if d > worst:
                    worst, at = d, m
            if at is not None and worst > tol:
                rdp(a, at)
                rdp(at, b)
            else:
                for m in range(a + 1, b):
                    keep[m] = False
        if j - i >= 2:
            rdp(i, j)
        i = j
    ks = [p for p, k in zip(pts, keep) if k]
    ev = lambda f: fn(fc.evaluate(f))
    nodes = []   # [frame, value, hin(f,v) or None, hout(f,v) or None, hold]
    for k in ks:
        nodes.append([k.co.x, fn(k.co.y), None, None, False])
    out = [nodes[0]]
    for i, (a, b) in enumerate(zip(nodes[:-1], nodes[1:])):
        ka, kb = ks[i], ks[i + 1]
        fa, fb, va, vb = a[0], b[0], a[1], b[1]
        h = fb - fa
        interp = ka.interpolation
        if interp == 'CONSTANT':
            a[4] = True
        elif interp == 'LINEAR':
            a[3] = (fa + h / 3.0, va + (vb - va) / 3.0)
            b[2] = (fb - h / 3.0, vb - (vb - va) / 3.0)
        elif interp == 'BEZIER':
            x1, y1 = ka.handle_right.x, fn(ka.handle_right.y)
            x2, y2 = kb.handle_left.x, fn(kb.handle_left.y)
            # Blender keeps each handle within the length of its segment (BKE_fcurve_correct_bezpart): longer ones shrink
            if abs(x1 - fa) > h > 0:
                x1, y1 = fa + (x1 - fa) * h / abs(x1 - fa), va + (y1 - va) * h / abs(x1 - fa)
            if abs(fb - x2) > h > 0:
                x2, y2 = fb - (fb - x2) * h / abs(fb - x2), vb - (vb - y2) * h / abs(fb - x2)
            a[3], b[2] = (x1, y1), (x2, y2)
        else:   # QUAD, SINE, BACK, ELASTIC...: refit as cubic beziers, with extra keys where one cubic isn't enough
            prev = a
            for fa_, va_, p1, fb_, vb_, p2 in fit_segment(ev, fa, fb, tol):
                hh = fb_ - fa_
                prev[3] = (fa_ + hh / 3.0, p1)
                node = b if abs(fb_ - fb) < 1e-9 else [fb_, vb_, None, None, False]
                node[2] = (fb_ - hh / 3.0, p2)
                if node is not b:
                    out.append(node)
                prev = node
        out.append(b)
    res = []
    for n in out:
        hin = n[2] or (n[0], n[1])
        hout = n[3] or (n[0], n[1])
        row = [T(n[0]), n[1], T(hin[0]), hin[1], T(hout[0]), hout[1]]
        if n[4]:
            row.append(1)
        res.append(row)
    return res


def round_keys(keys, nd):
    return [[rnd(k[0], 5), rnd(k[1], nd), rnd(k[2], 5), rnd(k[3], nd), rnd(k[4], 5), rnd(k[5], nd)] + k[6:] for k in keys]


def eval_keys(keys, t):
    """Evaluate exported keys the way the runtime does (cubic bezier in time and value; a trailing 1 holds the value)."""
    if t <= keys[0][0]:
        return keys[0][1]
    for a, b in zip(keys[:-1], keys[1:]):
        if t < b[0]:
            if len(a) > 6:
                return a[1]
            lo, hi = 0.0, 1.0
            for _ in range(40):
                s = (lo + hi) / 2
                x = (1 - s) ** 3 * a[0] + 3 * (1 - s) ** 2 * s * a[4] + 3 * (1 - s) * s ** 2 * b[2] + s ** 3 * b[0]
                if x < t:
                    lo = s
                else:
                    hi = s
            s = (lo + hi) / 2
            return (1 - s) ** 3 * a[1] + 3 * (1 - s) ** 2 * s * a[5] + 3 * (1 - s) * s ** 2 * b[3] + s ** 3 * b[1]
    return keys[-1][1]


# ---------------------------------------------------------------- meshes -> outline loops
def vertex_skin(ob, names, bone_ix, rigid):
    """per vertex: up to 3 (bone index, weight) pairs, weights to 3 decimals summing to 1"""
    out = {}
    for v in ob.data.vertices:
        if rigid is not None:
            out[v.index] = [(rigid, 1.0)]
            continue
        ws = [(bone_ix[ob.vertex_groups[g.group].name], g.weight) for g in v.groups
              if ob.vertex_groups[g.group].name in bone_ix and g.weight > 1e-4]
        ws.sort(key=lambda p: -p[1])
        ws = ws[:3]
        tot = sum(w for _, w in ws)
        if not ws or tot <= 0:
            raise SystemExit('export.py: %s has a vertex with no weights' % ob.name)
        ws = [(b, round(w / tot, 3)) for b, w in ws]
        ws[0] = (ws[0][0], round(1.0 - sum(w for _, w in ws[1:]), 3))
        out[v.index] = ws
    return out


def boundary_loops(me, face_ids):
    """ordered vertex-index loops of the boundary of a set of faces"""
    count = {}
    for fi in face_ids:
        vs = me.polygons[fi].vertices
        for a, b in zip(vs, list(vs[1:]) + [vs[0]]):
            e = (min(a, b), max(a, b))
            count[e] = count.get(e, 0) + 1
    edges = [e for e, c in count.items() if c == 1]
    nbr = {}
    for a, b in edges:
        nbr.setdefault(a, []).append(b)
        nbr.setdefault(b, []).append(a)
    used, loops = set(), []
    for a, b in edges:
        if (a, b) in used:
            continue
        loop = [a]
        cur, prev = b, a
        used.add((a, b))
        while cur != a:
            loop.append(cur)
            nxt = [n for n in nbr[cur] if (min(cur, n), max(cur, n)) not in used and n != prev] or \
                  [n for n in nbr[cur] if (min(cur, n), max(cur, n)) not in used]
            if not nxt:
                break
            n = nxt[0]
            used.add((min(cur, n), max(cur, n)))
            prev, cur = cur, n
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def shoelace(P):
    return 0.5 * sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))


def resample(P, ids):
    """P: closed loop of setup points, ids: the original vertex of each. Returns (points, source vertex ids)."""
    # drop repeated points
    Q, I = [], []
    for p, i in zip(P, ids):
        if not Q or math.hypot(p[0] - Q[-1][0], p[1] - Q[-1][1]) > 0.02:
            Q.append(p); I.append(i)
    if len(Q) > 1 and math.hypot(Q[0][0] - Q[-1][0], Q[0][1] - Q[-1][1]) <= 0.02:
        Q.pop(); I.pop()
    n = len(Q)
    if n < 3:
        return Q, I
    def turn(i):
        a, b, c = Q[i - 1], Q[i], Q[(i + 1) % n]
        v1, v2 = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
        d = math.degrees(abs(math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1])))
        return d
    corners = [i for i in range(n) if turn(i) > CORNER] or [0]
    pts, src = [], []
    for ci, c in enumerate(corners):
        d = corners[(ci + 1) % len(corners)]
        chain = [c]
        k = c
        while True:
            k = (k + 1) % n
            chain.append(k)
            if k == d:
                break
        if len(corners) == 1:
            pass   # one anchor: the chain runs round the whole loop and back to it
        seg = [Q[i] for i in chain]
        cum = [0.0]
        for a, b in zip(seg[:-1], seg[1:]):
            cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        L = cum[-1]
        m = max(1, int(round(L / STEP)))
        for j in range(m):
            s = L * j / m
            k = max(i for i in range(len(cum)) if cum[i] <= s + 1e-9)
            k = min(k, len(seg) - 2)
            u = 0 if cum[k + 1] == cum[k] else (s - cum[k]) / (cum[k + 1] - cum[k])
            p = (seg[k][0] + (seg[k + 1][0] - seg[k][0]) * u, seg[k][1] + (seg[k + 1][1] - seg[k][1]) * u)
            # the nearest original vertex of this stretch
            best = min(range(len(seg)), key=lambda q: (seg[q][0] - p[0]) ** 2 + (seg[q][1] - p[1]) ** 2)
            pts.append(p); src.append(I[chain[best]])
    while len(pts) < MIN_POINTS:
        k = max(range(len(pts)), key=lambda q: math.hypot(pts[(q + 1) % len(pts)][0] - pts[q][0], pts[(q + 1) % len(pts)][1] - pts[q][1]))
        a, b = pts[k], pts[(k + 1) % len(pts)]
        pts.insert(k + 1, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
        src.insert(k + 1, src[k])
    return pts, src


def role_of(name, palette):
    """a material name is a palette role, or hex-alpha for a translucent colour that has no name of its own"""
    alpha = 1.0
    m = re.fullmatch(r'(.+)-(\d+)', name)
    if m and (m.group(1) in palette or re.fullmatch(r'[0-9A-Fa-f]{6}', m.group(1))):
        base, alpha = m.group(1), int(m.group(2)) / 100.0
    else:
        base = name
    if base in palette and not re.fullmatch(r'[0-9A-Fa-f]{6}', base):
        return base, alpha
    # match by colour: "rgb(20 48 31 / .14)" is the 'shadow' entry's colour and alpha
    for role, val in palette.items():
        mm = re.fullmatch(r'rgb\((\d+)\s+(\d+)\s+(\d+)\s*/\s*([\d.]+)\)', val.strip())
        if mm:
            hexv = '%02X%02X%02X' % tuple(int(mm.group(i)) for i in (1, 2, 3))
            if hexv == base.upper() and abs(float(mm.group(4)) - alpha) < 0.011:
                return role, alpha
        elif val.startswith('#') and val[1:].upper() == base.upper():
            return role, alpha
    raise SystemExit('export.py: material %s matches no palette role' % name)


def drawing_of(ob, palette, bone_ix, slot_bone_ix, sheet):
    me = ob.data
    chain = len(ob.vertex_groups) > 0
    parent_bone = ob.parent_bone
    if chain:
        rigid = None
    else:
        pb = parent_bone
        while pb.startswith(EXCLUDED):
            pb = bpy.data.objects[ob.parent.name].data.bones[pb].parent.name
        rigid = bone_ix[pb]
    skin = vertex_skin(ob, None, bone_ix, rigid)
    co = {v.index: (sx_of(v.co.x), sy_of(v.co.z)) for v in me.vertices}
    layers_y = {}
    for p in me.polygons:
        layers_y.setdefault(round(me.vertices[p.vertices[0]].co.y, 7), []).append(p.index)
    pts, sk, loops, layers = [], [], [], []
    for y in sorted(layers_y, reverse=True):          # farthest from the camera first = painted first
        faces = layers_y[y]
        role, alpha = role_of(me.materials[me.polygons[faces[0]].material_index].name, palette)
        raw = boundary_loops(me, faces)
        polys = []
        for vl in raw:
            P = [co[v] for v in vl]
            if abs(shoelace(P)) < 1e-6:
                continue
            polys.append((vl, P, Polygon(P).buffer(0)))
        # nesting: a loop inside an odd number of others is a hole of its smallest container
        info = []
        for i, (vl, P, g) in enumerate(polys):
            inside = [j for j, (_, _, g2) in enumerate(polys) if j != i and g2.area > g.area and g2.contains(g.representative_point())]
            info.append(inside)
        islands = []
        for i, inside in enumerate(info):
            if len(inside) % 2 == 0:
                islands.append((i, [j for j, ins in enumerate(info) if len(ins) % 2 == 1 and ins and min(ins, key=lambda q: polys[q][2].area) == i]))
        for outer, holes in islands:
            ids = []
            for i, want_outer in [(outer, True)] + [(h, False) for h in holes]:
                vl, P, _ = polys[i]
                if (shoelace(P) < 0) != want_outer:      # outer: counter-clockwise on screen (negative area with y down)
                    vl, P = vl[::-1], P[::-1]
                q, src = resample(P, vl)
                for (x, yy), s in zip(q, src):
                    pts += [rnd(x), rnd(yy)]
                    sk.append([c for b, w in skin[s] for c in (b, rnd(w, 3))])
                loops.append([len(sk) - len(q), len(q)])
                ids.append(len(loops) - 1)
            lay = {'fill': role, 'loops': ids}
            if alpha < 0.999:
                lay['a'] = rnd(alpha, 2)
            layers.append(lay)
    return {'pts': pts, 'skin': sk, 'loops': loops, 'layers': layers}


# ---------------------------------------------------------------- main
def run(blend, out_json):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(blend))
    scene = bpy.context.scene
    base = json.loads(scene['pip3d_base'])
    bird = base.get('id') or os.path.splitext(os.path.basename(blend))[0]     # older files don't carry the id: pip.blend is pip
    sheet = part_sheet(bird)
    if sheet['problems']:
        sys.exit('export.py: Rig.validate(%s) reports %s' % (bird, sheet['problems']))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    assert tuple(arm.location) == (0, 0, 0) and tuple(arm.scale) == (1, 1, 1) and not any(arm.rotation_euler), 'armature must sit at the origin'
    ad = arm.data
    fps = scene.render.fps / scene.render.fps_base

    # ---- bones
    sheet_bone = {b['id']: b for b in sheet['bones']}
    bones, bone_ix = [], {}
    for b in ad.bones:
        if b.name.startswith(EXCLUDED):
            continue
        p = b.parent
        while p is not None and p.name.startswith(EXCLUDED):
            p = p.parent
        head = b.head_local
        x, y = sx_of(head.x), sy_of(head.z)
        Y = b.matrix_local.col[1]
        rot = math.degrees(math.atan2(Y.x, Y.z))      # clockwise from straight up = the rest rotation of the bone's frame in setup space
        rot = 0.0 if abs(rot) < 0.005 else rot
        # inverse of rest world T(x, y) R(rot) in SVG order [a b c d e f]
        ra, rb = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        inv = [rnd(ra, 4), rnd(-rb, 4), rnd(rb, 4), rnd(ra, 4)]
        inv += [rnd(-(inv[0] * x + inv[2] * y), 2), rnd(-(inv[1] * x + inv[3] * y), 2)]
        o = {'id': b.name, 'parent': p.name if p else None, 'x': rnd(x), 'y': rnd(y)}
        if rot:
            o['rot'] = rnd(rot, 3)
        if b.use_deform:
            o['len'] = rnd(b.length * 100.0)
        sb = sheet_bone.get(b.name)
        if sb and sb['turn']:
            o['turn'] = sb['turn']
        o['inv'] = inv
        bone_ix[b.name] = len(bones)
        bones.append(o)
    for o in bones:     # parents before children
        assert o['parent'] is None or bone_ix[o['parent']] < bone_ix[o['id']], 'bone order: ' + o['id']
    missing = [b['id'] for b in sheet['bones'] if b['id'] not in bone_ix]
    if missing:
        gap('bones in the part sheet but not in the .blend: ' + ', '.join(missing))

    # ---- slots (draw order from the part sheet; the .blend's mesh depth follows it)
    slot_bone_ix = {s['id']: bone_ix[s['bone']] for s in sheet['slots']}
    slots = []
    for s in sheet['slots']:
        names = [d['name'] for d in sheet['parts'].get(s['id'], [])]
        o = {'id': s['id'], 'bone': s['bone'], 'rest': s['att'], 'drawings': names}
        if s['blink']:
            o['blink'] = s['blink']
        if s['showWith']:
            o['showWith'] = s['showWith']
        slots.append(o)
    slot_index = {s['id']: i for i, s in enumerate(slots)}

    # ---- drawings
    drawings = {}
    palette = sheet['palette']
    for ob in sorted((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: o.name):
        sid, did = ob.get('slot'), ob.get('drawing')
        if sid not in slot_index or did not in slots[slot_index[sid]]['drawings']:
            gap('mesh %s is not a drawing the part sheet knows' % ob.name)
            continue
        assert tuple(ob.location) == (0, 0, 0) and tuple(ob.scale) == (1, 1, 1) and not any(ob.rotation_euler), ob.name
        drawings[sid + '/' + did] = drawing_of(ob, palette, bone_ix, slot_bone_ix, sheet)
    for s in sheet['slots']:
        for d in sheet['parts'].get(s['id'], []):
            key = s['id'] + '/' + d['name']
            if key not in drawings:
                drawings[key] = {'pts': [], 'skin': [], 'loops': [], 'layers': []}
                if not d['empty']:
                    gap('drawing %s is in the part sheet but the .blend has no mesh for it (rebuild the .blend with build.sh)' % key)
    drawings = {k: drawings[k] for k in sorted(drawings, key=lambda k: (slot_index[k.split('/')[0]], slots[slot_index[k.split('/')[0]]]['drawings'].index(k.split('/')[1])))}

    # ---- actions
    shows = {}
    for b in ad.bones:
        if b.name.startswith('show_'):
            _, sid, att = b.name.split('_', 2)
            shows.setdefault(sid, []).append(att)
    slots_on_bone = {}
    for s in sheet['slots']:
        slots_on_bone.setdefault(s['bone'], []).append(s['id'])
    kids = {}
    for b in sheet['bones']:
        kids.setdefault(b['parent'], []).append(b['id'])
    def descendants(bid):
        out = []
        for k in kids.get(bid, []):
            out += [k] + descendants(k)
        return out
    actions, worst_fit = {}, {}
    for act in bpy.data.actions:
        f0, f1 = act.frame_range
        is_move = act.name.startswith('move_')
        key = ('move:' + act.name[5:]) if is_move else ('mood:' + act.name)
        curves, swaps, order = {}, [], []
        show_fc = {}
        for fc in fcurves_of(act):
            m = PATH.match(fc.data_path)
            if not m:
                gap('action %s: curve %s is not a pose bone channel; skipped' % (act.name, fc.data_path))
                continue
            bone, prop = m.group(1), m.group(2)
            if bone.startswith('show_'):
                if prop == 'scale' and fc.array_index == 0:
                    show_fc[bone[5:]] = fc
                continue
            if prop == 'location' and fc.array_index == 2:      # depth: where the slot sits in the draw order
                if bone not in slots_on_bone:
                    gap('action %s: depth key on bone %s, which no slot hangs on; skipped' % (act.name, bone))
                    continue
                below = [s for d in descendants(bone) for s in slots_on_bone.get(d, [])]
                if below:
                    gap('action %s: depth key on %s also moves slots %s in Blender; exported only for %s' % (act.name, bone, below, slots_on_bone[bone]))
                for sid in slots_on_bone[bone]:
                    for k in sorted(fc.keyframe_points, key=lambda k: k.co.x):
                        order.append([rnd((k.co.x - f0) / fps, 5), sid, rnd(slot_index[sid] + k.co.y / DZ, 2)])
                continue
            ch = CHANNELS.get((prop, fc.array_index))
            if bone.startswith('ctl_') and (not ch or ch[0] != 'x'):
                continue        # only ctl_<bone>.x means anything: it is the mirror (FORMAT.md "Mirror bones")
            if not ch or (bone not in bone_ix and not bone.startswith('ctl_')):
                gap('action %s: curve %s[%d] has no rig2 channel; skipped' % (act.name, fc.data_path, fc.array_index))
                continue
            keys = round_keys(curve_keys(fc, f0, fps, ch[1], TOL[ch[0]]), DEC[ch[0]])
            if bone.startswith('ctl_') and is_move and len(keys) == 1 and keys[0][1] == 0:
                continue        # a move that never mirrors leaves the control out
            # check the rounded keys against Blender's own evaluation at 8 points in every segment
            for a, b2 in zip(keys[:-1], keys[1:]):
                for i in range(9):
                    t = a[0] + (b2[0] - a[0]) * i / 8.0
                    err = abs(eval_keys(keys, t) - ch[1](fc.evaluate(f0 + t * fps)))
                    worst_fit[ch[0]] = max(worst_fit.get(ch[0], 0.0), err)
            curves[bone + '.' + ch[0]] = keys
        for sid, atts in shows.items():
            fcs = {a: show_fc.get('%s_%s' % (sid, a)) for a in atts}
            if not any(fcs.values()):
                continue
            frames = sorted({round(k.co.x, 3) for fc in fcs.values() if fc for k in fc.keyframe_points} | {f0})
            seq = []
            for f in frames:
                shown = [a for a, fc in fcs.items() if fc and fc.evaluate(f) > 0.5]
                att = shown[0] if shown else None
                if not seq or seq[-1][1] != att:
                    seq.append([rnd((f - f0) / fps, 5), att])
            swaps += [[t, sid, att] for t, att in seq]
        swaps.sort(key=lambda s: (s[0], slot_index.get(s[1], 0)))
        order.sort(key=lambda s: (s[0], slot_index.get(s[1], 0)))
        actions[key] = {'dur': rnd((f1 - f0) / fps, 4), 'loop': bool(act.get('loop', 0)), 'add': is_move,
                        'blink': bool(act.get('blink', 1)), 'glance': bool(act.get('glance', 1)),
                        'curves': dict(sorted(curves.items())), 'swaps': swaps, 'order': order, 'shapes': {}, 'fx': []}
        if not is_move and sheet['moodParams'].get(act.name):
            actions[key]['params'] = sheet['moodParams'][act.name]
    names = ['mood:' + m for m in sheet['moods']]
    actions = {k: actions[k] for k in names + sorted(set(actions) - set(names)) if k in actions}
    for m in names:
        if m not in actions:
            gap('mood %s is in the part sheet but the .blend has no action for it (rebuild the .blend with build.sh)' % m[5:])

    roles = []
    for d in drawings.values():
        for l in d['layers']:
            if l['fill'] not in roles:
                roles.append(l['fill'])
    order_pal = list(palette)
    roles.sort(key=lambda r: order_pal.index(r))

    doc = {'format': 'parlance-rig2', 'v': 1, 'id': sheet['id'], 'name': sheet['name'], 'fps': rnd(fps, 3),
           'view': sheet['view'], 'lines': sheet['lines'], 'roles': roles, 'bones': bones, 'slots': slots,
           'drawings': drawings, 'actions': actions, 'fx': {}, 'procedural': sheet['procedural']}
    doc = tidy(doc)
    text = json.dumps(doc, separators=(',', ':'))
    with open(out_json, 'w') as f:
        f.write(text)
    gz = len(gzip.compress(text.encode(), 9))
    npts = sum(len(d['pts']) // 2 for d in drawings.values())
    print('bones %d, slots %d, drawings %d (%d empty), loops %d, points %d, actions %d (%d moods, %d moves), curves %d, keys %d'
          % (len(bones), len(slots), len(drawings), sum(1 for d in drawings.values() if not d['pts']), sum(len(d['loops']) for d in drawings.values()),
             npts, len(actions), sum(1 for k in actions if k.startswith('mood:')), sum(1 for k in actions if k.startswith('move:')),
             sum(len(a['curves']) for a in actions.values()), sum(len(c) for a in actions.values() for c in a['curves'].values())))
    print('curve fit, worst difference from Blender per channel: ' + ', '.join('%s %.4f' % (c, worst_fit.get(c, 0)) for c in ('x', 'y', 'r', 'sx', 'sy')))
    print('wrote %s: %d bytes, %.1f KB gzipped (budget 120 KB)' % (out_json, len(text), gz / 1024.0))
    if gz > 120 * 1024:
        sys.exit('export.py: over the 120 KB gzipped budget')
    return doc, gaps


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if len(args) != 2 or not args[0].endswith('.blend'):
        sys.exit(__doc__)
    run(args[0], args[1])
