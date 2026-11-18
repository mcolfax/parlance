#!/usr/bin/env python3
"""Checks an exported rig2 file (design/rig/v2/FORMAT.md) against its bird's definition, its golden samples and, optionally, Blender.

Usage:  python3 design/rig/v2/test/check_export.py <bird.json> [--golden <bird-golden.json>] [--blend <bird.blend>]
                                                    [--known-gaps name,name]    (e.g. mood:dizzy,fxHead/stars)
Plain Python plus Node (the bird's definition). --blend needs the bpy module and compares every bone's skinning matrix
with Blender's own at several frames of several actions, which proves the space conversion in FORMAT.md.
Prints one line per check and ends with ok, or FAIL and exit code 1."""
import os, sys, json, math, gzip, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
MOVES = ['hop', 'nod', 'shake', 'bow', 'lookAround', 'wave', 'flap', 'dance', 'laugh', 'wobble', 'surprise']
fails = []


def check(cond, msg, detail=''):
    print(('  ok   ' if cond else '  FAIL ') + msg + (('  ' + detail) if detail and not cond else ''))
    if not cond:
        fails.append(msg)


def eval_keys(keys, t):
    """the runtime's curve evaluation: cubic bezier in time and value between keys; a trailing 1 holds the value"""
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
                lo, hi = (s, hi) if x < t else (lo, s)
            s = (lo + hi) / 2
            return (1 - s) ** 3 * a[1] + 3 * (1 - s) ** 2 * s * a[5] + 3 * (1 - s) * s ** 2 * b[3] + s ** 3 * b[1]
    return keys[-1][1]


# 2D affine matrices in SVG order [a b c d e f]
def mul(m, n):
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
            m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]


def rot(deg):   # clockwise positive on screen (y down), as js/core/rig.js
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [c, s, -s, c, 0, 0]


def trans(x, y):
    return [1, 0, 0, 1, x, y]


def scl(x, y):
    return [x, 0, 0, y, 0, 0]


def rest_world(b):
    return mul(trans(b['x'], b['y']), rot(b.get('rot', 0)))


def definition(bird):
    js = ("const Rig=require(%r+'/js/core/rig.js');const B=require(%r+'/js/core/'+%r+'.js');"
          "process.stdout.write(JSON.stringify({slots:B.slots.map(s=>({id:s.id,att:s.att===undefined?null:s.att,parts:Object.keys(B.parts[s.id]||{})})),"
          "empty:Object.fromEntries(Object.keys(B.parts).flatMap(k=>Object.keys(B.parts[k]).map(n=>[k+'/'+n,String(B.parts[k][n]).replace(/<g\\s*\\/>|\\s/g,'')==='']))),moods:Object.keys(B.moods),bones:B.bones.map(b=>b.id),problems:Rig.validate(B),mirror:B.mirror||{},palette:Object.keys(B.palette)}))") % (REPO, REPO, bird)
    r = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return json.loads(r.stdout)


def pose_matrices(doc, action, t, driver):
    """skinning matrix M_i * B_i^-1 of every bone from the exported curves, as FORMAT.md says to compute it"""
    A = doc['actions'][action]
    def ch(bone, name, dflt):
        k = A['curves'].get(bone + '.' + name)
        return eval_keys(k, t) if k else dflt
    M, out = {}, {}
    for b in doc['bones']:
        pose = mul(mul(trans(ch(b['id'], 'x', 0), ch(b['id'], 'y', 0)), rot(ch(b['id'], 'r', 0))), scl(ch(b['id'], 'sx', 1), ch(b['id'], 'sy', 1)))
        if b['id'] in driver:     # a mirror bone: its X scale follows the control (FORMAT.md "Mirror bones")
            v = ch('ctl_' + driver[b['id']], 'x', 0)
            pose = mul(mul(trans(ch(b['id'], 'x', 0), ch(b['id'], 'y', 0)), rot(ch(b['id'], 'r', 0))),
                       scl((1 if v > -1 else -1) * max(abs(1 + v), 0.72), ch(b['id'], 'sy', 1)))
        if b['parent'] is None:
            M[b['id']] = mul(rest_world(b), pose)
        else:
            p = next(q for q in doc['bones'] if q['id'] == b['parent'])
            pinv = mul(rot(-p.get('rot', 0)), trans(-p['x'], -p['y']))
            M[b['id']] = mul(mul(M[p['id']], mul(pinv, rest_world(b))), pose)
        out[b['id']] = mul(M[b['id']], b['inv'])
    return out


def pose_check(doc, blend, driver):
    import bpy
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(blend))
    scene = bpy.context.scene
    fps = scene.render.fps / scene.render.fps_base
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    worst, where = 0.0, ''
    names = [a for a in ('mood:cheer', 'mood:oops', 'mood:think', 'move:hop', 'move:lookAround', 'mood:happy') if a in doc['actions']]
    for name in names:
        act = bpy.data.actions[name[5:] if name.startswith('mood:') else 'move_' + name[5:]]
        for pb in arm.pose.bones:      # channels an action doesn't key keep the last pose: start every action from rest
            pb.location, pb.rotation_euler, pb.scale = (0, 0, 0), (0, 0, 0), (1, 1, 1)
        arm.animation_data.action = act
        f0, f1 = act.frame_range
        for frac in (0.0, 0.33, 0.71, 1.0):
            t = frac * (f1 - f0) / fps
            scene.frame_set(int(round(f0 + t * fps)))
            t = (int(round(f0 + t * fps)) - f0) / fps
            mine = pose_matrices(doc, name, t, driver)
            for b in doc['bones']:
                pb = arm.pose.bones[b['id']]
                hidden, anc = False, pb.parent       # a chain bone under a hidden drawing's show_ bone is squashed to nothing in Blender; the file switches the drawing off instead
                while anc:
                    hidden = hidden or (anc.name.startswith('show_') and anc.scale[0] < 0.5)
                    anc = anc.parent
                if hidden:
                    continue
                S = pb.matrix @ arm.data.bones[b['id']].matrix_local.inverted()
                # probe points around the bone
                for (px, py) in ((0, 0), (30, 0), (0, 25), (-20, -40), (60, 60)):
                    X, Z = (b['x'] + px - 120) / 100.0, (250 - (b['y'] + py)) / 100.0
                    q = S @ __import__('mathutils').Vector((X, 0.0, Z))
                    bx, by = 120 + 100 * q.x, 250 - 100 * q.z
                    m = mine[b['id']]
                    mx, my = m[0] * (b['x'] + px) + m[2] * (b['y'] + py) + m[4], m[1] * (b['x'] + px) + m[3] * (b['y'] + py) + m[5]
                    d = math.hypot(bx - mx, by - my)
                    if d > worst:
                        worst, where = d, '%s t=%.2f bone %s' % (name, t, b['id'])
    return worst, where, len(names)


def main(argv):
    if not argv or argv[0].startswith('--'):
        sys.exit(__doc__)
    path = argv[0]
    opt = {argv[i]: argv[i + 1] for i in range(1, len(argv) - 1, 2) if argv[i].startswith('--')}
    allowed = set((opt.get('--known-gaps') or '').split(',')) - {''}
    raw = open(path, 'rb').read()
    doc = json.loads(raw)
    bird = doc['id']
    D = definition(bird)
    print('checking %s (%s)' % (path, bird))

    gz = len(gzip.compress(raw, 9))
    check(gz <= 120 * 1024, 'gzipped size %.1f KB is within 120 KB' % (gz / 1024.0))
    check(doc.get('format') == 'parlance-rig2' and doc.get('v') == 1, 'format parlance-rig2 v1')
    check(D['problems'] == [], 'Rig.validate(%s) has no problems' % bird, str(D['problems']))

    bone_ids = [b['id'] for b in doc['bones']]
    ix = {b: i for i, b in enumerate(bone_ids)}
    check(len(ix) == len(bone_ids), 'bone ids are unique')
    check(all(b['parent'] is None or ix.get(b['parent'], 1e9) < ix[b['id']] for b in doc['bones']), 'parents come before children')
    check(all(b in ix for b in D['bones']), 'every bone of the bird definition is a bone')
    ident = True
    for b in doc['bones']:
        m = mul(b['inv'], rest_world(b))
        if max(abs(m[0] - 1), abs(m[1]), abs(m[2]), abs(m[3] - 1), abs(m[4]), abs(m[5])) > 0.02:
            ident = False
            print('    inv x rest world is not identity for', b['id'], m)
    check(ident, 'every bone\'s inv undoes its rest world matrix (x, y, rot)')

    slots = {s['id']: s for s in doc['slots']}
    check([s['id'] for s in doc['slots']] == [s['id'] for s in D['slots']], 'slots are in the bird\'s draw order')
    miss = []
    for s in D['slots']:
        e = slots.get(s['id'])
        if not e or e['rest'] != s['att'] or e['bone'] not in ix:
            miss.append(s['id'])
            continue
        for d in s['parts']:
            k = s['id'] + '/' + d
            have = k in doc['drawings'] and d in e['drawings']
            drawn = have and bool(doc['drawings'][k]['layers'])
            if (not have or (not drawn and not D['empty'][k])) and k not in allowed:
                miss.append(k)
    check(not miss, 'every slot and drawing Rig.validate knows is there' + (' (known gaps allowed: %s)' % ', '.join(sorted(allowed)) if allowed else ''), str(miss))
    mm = [m for m in D['moods'] if 'mood:' + m not in doc['actions'] and 'mood:' + m not in allowed]
    check(not mm, 'every mood in BIRD.moods is an action' + (' (known gaps allowed)' if allowed else ''), str(mm))
    mv = [m for m in MOVES if 'move:' + m not in doc['actions']]
    check(not mv, 'every layered move is an action', str(mv))

    bad_w, bad_loop, bad_ref, bad_idx, nloops, npts = 0, 0, 0, 0, 0, 0
    for key, d in doc['drawings'].items():
        n = len(d['pts']) // 2
        npts += n
        if len(d['skin']) != n:
            bad_idx += 1
        for sk in d['skin']:
            pairs = list(zip(sk[0::2], sk[1::2]))
            if not 1 <= len(pairs) <= 3 or abs(sum(w for _, w in pairs) - 1) > 0.001 or any(b not in range(len(bone_ids)) or w < 0 for b, w in pairs):
                bad_w += 1
        used = []
        for st, c in d['loops']:
            nloops += 1
            if c < 4 or st + c > n:
                bad_loop += 1
        for L in d['layers']:
            if L['fill'] not in doc['roles'] or not L['loops'] or any(i >= len(d['loops']) for i in L['loops']):
                bad_ref += 1
            used += L['loops']
        if sorted(used) != list(range(len(d['loops']))):
            bad_ref += 1
    check(bad_w == 0, 'every point\'s weights sum to 1 +- 0.001 (%d points, up to 3 bones each)' % npts, '%d bad' % bad_w)
    check(bad_idx == 0, 'every point has a skin entry')
    check(bad_loop == 0, 'no loop has fewer than 4 points (%d loops)' % nloops, '%d bad' % bad_loop)
    check(bad_ref == 0, 'every layer uses a known role and every loop belongs to one layer')
    check(all(r in D['palette'] for r in doc['roles']), 'roles are palette entries of the bird (%d roles)' % len(doc['roles']))

    probs = []
    for name, a in doc['actions'].items():
        for cn, keys in a['curves'].items():
            bone, chan = cn.rsplit('.', 1)
            if chan not in ('x', 'y', 'r', 'sx', 'sy') or (bone not in ix and not bone.startswith('ctl_')):
                probs.append(name + ' ' + cn)
            for p, q in zip(keys[:-1], keys[1:]):
                if not (p[0] <= p[4] <= q[0] and p[0] <= q[2] <= q[0]):
                    probs.append(name + ' ' + cn + ' handles leave their segment')
                    break
            if any(k2[0] < k1[0] for k1, k2 in zip(keys[:-1], keys[1:])):
                probs.append(name + ' ' + cn + ' keys out of order')
        for t, s, d in a['swaps']:
            if s not in slots or (d is not None and d not in slots[s]['drawings']):
                probs.append(name + ' swap ' + s)
        for t, s, o in a['order']:
            if s not in slots:
                probs.append(name + ' order ' + s)
    check(not probs, 'curves, swaps and order name real bones, slots and drawings', str(probs[:5]))

    if '--golden' in opt:
        g = json.load(open(opt['--golden']))
        worst, where, ncurves = 0.0, '', 0
        for name, ga in g['actions'].items():
            for cn, vals in ga['curves'].items():
                ncurves += 1
                keys = doc['actions'][name]['curves'].get(cn)
                if not keys:
                    worst, where = 9e9, name + ' ' + cn + ' missing'
                    continue
                for i, v in enumerate(vals):
                    d = abs(eval_keys(keys, ga['dur'] * i / (g['samples'] - 1)) - v)
                    if d > worst:
                        worst, where = d, '%s %s sample %d' % (name, cn, i)
        check(worst <= g['tolerance'], 'exported curves match the golden samples to %.2f (worst %.4f over %d curves x %d samples)' % (g['tolerance'], worst, ncurves, g['samples']), where)

    if '--blend' in opt:
        Mi = D['mirror']
        driver = {Mi[k]: Mi[k] for k in ('facing', 'head') if Mi.get(k)}
        worst, where, na = pose_check(doc, opt['--blend'], driver)
        check(worst <= 0.05, 'bone skinning matrices match Blender\'s pose (worst %.4f units, %d actions x 4 times x %d bones)' % (worst, na, len(doc['bones'])), where)

    print('ok' if not fails else 'FAIL %d' % len(fails))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
