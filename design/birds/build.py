"""Build js/core/birds.js from the traced parts in design/birds/out/<bird>.json.

    python3 design/birds/build.py

Every species gets the same set of attachments, all in its happy-pose sheet coordinates:
  body, head, face, tail, footL, footR                   (happy pose)
  wingL / wingR:  fold (happy), spread (cheer), tuck (oops)
  eyeL / eyeR:    open (happy), closed (cheer), worried (oops)
  browL / browR:  happy, cheer, oops
  beak:           smile (happy), open (cheer), oops (oops)
  crest:          happy, cheer, oops   (each a list of feathers with a base pivot)
  sweat           (oops)
Features from the cheer and oops poses are moved onto the happy pose's features: eyes by their centres,
beaks by the top of the beak, brows with their eye, wings by the feet (the torso can sit a little
differently from pose to pose).
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
NUM = r'(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)'


def fmt(v):
    s = '%d' % round(v)
    return s if s != '-0' else '0'


def move(layers, dx, dy):
    if not dx and not dy: return layers
    f = lambda m: '%s %s' % (fmt(float(m.group(1)) + dx), fmt(float(m.group(2)) + dy))
    return [dict(l, d=re.sub(NUM, f, l['d'])) for l in layers]


def bbox(layers, sil_only=False):
    xs, ys = [], []
    for l in layers:
        if sil_only and not l.get('sil'): continue
        for a, b in re.findall(NUM, l['d']): xs.append(float(a)); ys.append(float(b))
    if not xs: return None
    return min(xs), min(ys), max(xs), max(ys)


def centre(b): return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)


def svg(layers):
    out = []
    for l in layers:
        cls = l.get('cls', '')
        attrs = ''
        if l.get('sil'): cls += ' sil'
        if 'mix' in l:
            reg, pct, k = l['mix']; attrs = ' style="fill:color-mix(in srgb,var(--pc-%s) %d%%,%s)"' % (reg, pct, k)
        elif 'fill' in l: attrs = ' style="fill:%s"' % l['fill']
        out.append('<path%s%s d="%s"/>' % (' class="%s"' % cls.strip() if cls.strip() else '', attrs, l['d']))
    return ''.join(out)


def build_bird(bird, cfg, data):
    P = data['poses']; H, C, O = P['happy'], P.get('cheer', {}), P.get('oops', {})
    rig = cfg['rig']
    feet = lambda pose: centre(bbox(pose['footL'] + pose['footR']))
    fh = feet(H)
    def by_feet(pose, layers):
        f = feet(pose); return move(layers, fh[0] - f[0], fh[1] - f[1])
    def by_centre(src, dst):
        a, b = centre(bbox(src)), centre(bbox(dst)); return b[0] - a[0], b[1] - a[1]
    def beak_top(layers):
        b = bbox(layers); return ((b[0] + b[2]) / 2, b[1])
    art = {}
    for k in ('body', 'head', 'face', 'tail', 'footL', 'footR'):
        if k in H: art[k] = svg(H[k])
    # tucked wings cover the same span as folded ones: line up their combined centre and top
    tuck_d = (0, 0)
    if 'wingL' in O and 'wingR' in O:
        fb = bbox(H['wingL'] + H['wingR'], True) or bbox(H['wingL'] + H['wingR']); tb = bbox(O['wingL'] + O['wingR'], True) or bbox(O['wingL'] + O['wingR'])
        tuck_d = ((fb[0] + fb[2]) / 2 - (tb[0] + tb[2]) / 2, fb[1] - tb[1])
    nudge = rig.get('nudge', {})
    for side in 'LR':
        w = {'fold': svg(H['wing' + side])}
        if 'wing' + side in C: w['spread'] = svg(move(by_feet(C, C['wing' + side]), *nudge.get('spread', [0, 0])))
        if 'wing' + side in O: w['tuck'] = svg(move(O['wing' + side], tuck_d[0] + nudge.get('tuck', [0, 0])[0], tuck_d[1] + nudge.get('tuck', [0, 0])[1]))
        art['wing' + side] = w
        e = {'open': svg(H['eye' + side])}; b = {'happy': svg(H.get('brow' + side, []))}
        for pose, name in ((C, 'closed'), (O, 'worried')):
            if 'eye' + side in pose:
                dx, dy = by_centre(pose['eye' + side], H['eye' + side])
                dy += rig.get('eyeNudge', {}).get(name, 0)
                e[name] = svg(move(pose['eye' + side], dx, dy))
                if pose.get('brow' + side): b['cheer' if name == 'closed' else 'oops'] = svg(move(pose['brow' + side], dx, dy))
        art['eye' + side] = e; art['brow' + side] = b
    bt = beak_top(H['beak'])
    beak = {'smile': svg(H['beak'])}
    for pose, name in ((C, 'open'), (O, 'oops')):
        if 'beak' in pose:
            t = beak_top(pose['beak']); beak[name] = svg(move(pose['beak'], bt[0] - t[0], bt[1] - t[1]))
    art['beak'] = beak
    # crest: the feathers named crest* in each pose, back to front, each with a pivot at its base
    crest = {}
    for pname, pose in (('happy', H), ('cheer', C), ('oops', O)):
        names = [n for n in cfg['poses'].get(pname, {}).get('parts', []) if n['name'] == 'crest' or n['name'].startswith('crest')]
        feathers = []
        for n in names[::-1]:
            layers = pose.get(n['name'])
            if not layers: continue
            b = bbox(layers, True) or bbox(layers)
            feathers.append({'pivot': [round((b[0] + b[2]) / 2, 1), round(b[3], 1)], 'art': svg(layers)})
        if feathers: crest[pname] = feathers
    if crest: art['crest'] = crest
    if 'sweat' in O:
        sw = O['sweat']
        if rig.get('sweat'):   # a set spot on the head (the worried pose often turns the head)
            sb = bbox(sw); sw = move(sw, rig['sweat'][0] - (sb[0] + sb[2]) / 2, rig['sweat'][1] - sb[1])
        art['sweat'] = svg(sw); O = dict(O, sweat=sw)
    piv = dict(rig['pivots'])
    piv.setdefault('eyeL', [round(v, 1) for v in centre(bbox(H['eyeL']))]); piv.setdefault('eyeR', [round(v, 1) for v in centre(bbox(H['eyeR']))])
    piv.setdefault('beak', [round(v, 1) for v in bt])
    for side in 'LR':
        if H.get('brow' + side): piv.setdefault('brow' + side, [round(v, 1) for v in centre(bbox(H['brow' + side]))])
        else: piv.setdefault('brow' + side, piv['eye' + side])
    if 'sweat' in O: sb = bbox(O['sweat']); piv.setdefault('sweat', [round((sb[0] + sb[2]) / 2, 1), round(sb[1], 1)])
    eb = bbox(H['eyeL']); eyeR = rig.get('eyeR', round((eb[2] - eb[0]) / 2, 1))
    skin = {
        'id': bird, 'name': cfg.get('name', bird.title()), 'ink': data['ink'], 'colors': data['colors'],
        'ground': rig['ground'], 'height': rig['height'], 'cx': rig['cx'], 'headR': rig['headR'], 'bodyR': rig['bodyR'],
        'ow': rig.get('ow', 7), 'eyeR': eyeR, 'pivots': piv, 'art': art
    }
    for k in ('headTilt', 'shadow', 'blush'):
        if k in rig: skin[k] = rig[k]
    return skin


def main():
    cfgs = json.load(open(os.path.join(HERE, 'birds.json')))
    skins = []
    for bird, cfg in cfgs.items():
        f = os.path.join(HERE, 'out', bird + '.json')
        if not os.path.exists(f) or 'rig' not in cfg: print('skip', bird); continue
        skins.append(build_bird(bird, cfg, json.load(open(f))))
    head = ('"use strict";\n/* ===================== BIRDS: species art for the rig (js/core/rig.js) =====================\n'
            '   GENERATED by design/birds/build.py from the design sheets in design/birds/. Do not edit by hand:\n'
            '   change design/birds/birds.json (part areas, colors, pivots), then run\n'
            '     python3 design/birds/trace.py && python3 design/birds/build.py\n'
            '   Each skin is drawn in its own sheet coordinates. Region classes (r-body, r-wing…) take their color\n'
            '   from --pc-* custom properties, so palettes and color choices recolor every species the same way.\n'
            '   ========================================================================================== */\n')
    body = 'const BIRD_SKINS = {\n' + ',\n'.join('  %s: %s' % (s['id'], json.dumps(s, separators=(',', ':'))) for s in skins) + '\n};\nconst BIRD_DEFAULT_SKIN = %s;\n' % json.dumps(skins[0]['id'] if skins else 'pip')
    out = os.path.join(ROOT, 'js', 'core', 'birds.js')
    open(out, 'w').write(head + body)
    print('wrote', out, os.path.getsize(out), 'bytes;', ', '.join(s['id'] for s in skins))


if __name__ == '__main__':
    main()
