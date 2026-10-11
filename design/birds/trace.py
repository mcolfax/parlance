"""Trace the bird design sheets into rig parts for js/core/birds.js.

    python3 design/birds/trace.py pip            # one bird
    python3 design/birds/trace.py                # every bird in design/birds/birds.json

Each sheet (design/birds/<bird>.png) shows three poses: happy, cheer and oops. birds.json says, per bird:
  palette   the sheet's real colors by name (k-means found them; anti-aliased pixels snap to the nearest)
  regions   which palette color is the default for each color region (body, head, wing, crest…)
  poses     each pose's box on the sheet and its parts, front to back. A part is
              area      where its pixels are: {"poly": [[x, y], …]}, {"ellipse": [cx, cy, rx, ry]},
                        {"union": [...]}, {"minus": [a, b]}
              map       palette color -> region ("head", "head:d" for a shade of head, "#fff" literal)
              base      the region its silhouette is filled with
              complete  extra area that is hidden in the drawing but needed when parts move (filled with base)
              shift     [dx, dy] to line this pose's part up with the happy pose
Colors split regions, ink lines split parts, and each ink pixel belongs to the front-most part next to
it, so a wing keeps its own outline when it lifts away from the body.
Output: design/birds/out/<bird>.json (parts as SVG path data in happy-pose sheet coordinates) and
design/birds/out/<bird>-check.png (the trace next to the sheet).
"""
import json, os, sys
import numpy as np, cv2, potrace
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')


def hex2rgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def rgb2lab(a):
    a = np.asarray(a, np.uint8).reshape(-1, 1, 3)
    return cv2.cvtColor(a, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(float)


def shape_mask(H, W, spec, x0=0, y0=0):
    m = np.zeros((H, W), np.uint8)
    if spec is None: return m.astype(bool)
    if 'poly' in spec:
        pts = np.array([[x - x0, y - y0] for x, y in spec['poly']], np.int32)
        cv2.fillPoly(m, [pts], 1)
    elif 'ellipse' in spec:
        cx, cy, rx, ry = spec['ellipse'][:4]; ang = spec['ellipse'][4] if len(spec['ellipse']) > 4 else 0
        cv2.ellipse(m, (int(round(cx - x0)), int(round(cy - y0))), (int(round(rx)), int(round(ry))), ang, 0, 360, 1, -1)
    elif 'union' in spec:
        for s in spec['union']: m |= shape_mask(H, W, s, x0, y0).astype(np.uint8)
    elif 'minus' in spec:
        a, b = spec['minus']; m = (shape_mask(H, W, a, x0, y0) & ~shape_mask(H, W, b, x0, y0)).astype(np.uint8)
    elif 'inter' in spec:
        a, b = spec['inter']; m = (shape_mask(H, W, a, x0, y0) & shape_mask(H, W, b, x0, y0)).astype(np.uint8)
    return m.astype(bool)


def trace_path(mask, x0, y0, sh=(0, 0), turd=6, alpha=1.0, tol=0.6):
    """potrace a boolean mask into SVG path data in sheet coordinates (shifted by sh)"""
    if not mask.any(): return ''
    bm = potrace.Bitmap(~mask)
    pl = bm.trace(turdsize=turd, alphamax=alpha, opticurve=True, opttolerance=tol)
    ox, oy = x0 + sh[0], y0 + sh[1]
    f = lambda p: '%s %s' % (fmt(p.x + ox), fmt(p.y + oy))
    out = []
    for c in pl:
        d = 'M' + f(c.start_point)
        for s in c.segments:
            if s.is_corner: d += 'L' + f(s.c) + 'L' + f(s.end_point)
            else: d += 'C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point)
        out.append(d + 'Z')
    return ''.join(out)


def fmt(v):
    s = '%d' % round(v)   # whole sheet pixels: a bird is drawn at ~100 px, so this is far below what shows
    return s if s != '-0' else '0'


def shade_style(color, base):
    """express a shade of a region color as a CSS color-mix of that region, so recoloring keeps the shading"""
    best = None
    for k, kname in ((np.zeros(3), '#000'), (np.full(3, 255.0), '#fff')):
        d = base - k
        p = float(np.clip(np.dot(color - k, d) / max(np.dot(d, d), 1e-6), 0, 1))
        err = np.linalg.norm(p * base + (1 - p) * k - color)
        if best is None or err < best[0]: best = (err, p, kname)
    return best


def run_pose(cfg, pose_name, sheet):
    pose = cfg['poses'][pose_name]
    x0, y0, x1, y1 = pose['box']
    img = sheet[y0:y1, x0:x1].astype(float)
    H, W = img.shape[:2]
    names = list(cfg['palette'].keys())
    pal = np.array([hex2rgb(cfg['palette'][n]) for n in names])
    lab = rgb2lab(img).reshape(H, W, 3); plab = rgb2lab(pal)
    d = ((lab[:, :, None, :] - plab[None, None, :, :]) ** 2).sum(-1)
    L = d.argmin(-1)
    # background: bg-colored pixels connected to the edge of the box. Enclosed bg-colored pixels (a cream
    # patch can be almost the background color) take their nearest other color instead.
    VOID = [names.index(n) for n in ['bg'] + cfg.get('void', ['shadow', 'shadow2']) if n in names]
    vm = np.isin(L, VOID)
    n_bg, lab_bg = cv2.connectedComponents(vm.astype(np.uint8), connectivity=4)
    edge = set(np.unique(np.concatenate([lab_bg[0], lab_bg[-1], lab_bg[:, 0], lab_bg[:, -1]]))) - {0}
    outside = np.isin(lab_bg, list(edge))
    inside_bg = vm & ~outside
    # small enclosed pockets are real background (a gap between two crest feathers), not a pale fill
    n_in, lab_in, st_in, _ = cv2.connectedComponentsWithStats(inside_bg.astype(np.uint8), connectivity=4)
    ink0 = np.isin(L, [names.index(n_) for n_ in names if n_.startswith('ink')])
    ring_k = np.ones((5, 5), np.uint8)
    for r in range(1, n_in):
        if st_in[r, cv2.CC_STAT_AREA] >= cfg.get('pocket', 500): continue
        rm = lab_in == r
        ring = cv2.dilate(rm.astype(np.uint8), ring_k).astype(bool) & ~rm
        if ring.any() and (ink0 & ring).sum() > 0.5 * ring.sum(): inside_bg[rm] = False; outside[rm] = True
    if inside_bg.any():
        d2 = d.copy(); d2[:, :, VOID] = np.inf
        L[inside_bg] = d2.argmin(-1)[inside_bg]
    void = outside.copy()
    INK = names.index('ink')
    for n_ in names:   # every palette color named ink* is line art
        if n_.startswith('ink') and n_ != 'ink': L[L == names.index(n_)] = INK
    ink = (L == INK)
    # anti-aliased fringe outside the outline: small non-ink bits touching the background become background
    vd = cv2.dilate(void.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    for ci in range(len(names)):
        if ci == INK: continue
        m = (L == ci) & ~void
        n, lab_c, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=4)
        for r in range(1, n):
            if st[r, cv2.CC_STAT_AREA] < cfg.get('fringe', 120):
                rm = lab_c == r
                if (rm & vd).sum() > 0.3 * st[r, cv2.CC_STAT_AREA]: void[rm] = True
    parts = pose['parts']
    areas = [shape_mask(H, W, p['area'], x0, y0) for p in parts]
    owner = np.full((H, W), -1, int)
    # regions: connected pixels of one color, assigned whole to the front-most part that holds most of them
    for ci in range(len(names)):
        if ci == INK: continue
        m = (L == ci) & ~void
        if not m.any(): continue
        n, lab_c = cv2.connectedComponents(m.astype(np.uint8), connectivity=4)
        for r in range(1, n):
            rm = lab_c == r; tot = rm.sum()
            best = -1
            for pi, a in enumerate(areas):
                if parts[pi].get('inkOnly'): continue
                if (rm & a).sum() >= cfg.get('whole', 0.9) * tot: best = pi; break
            if best >= 0: owner[rm] = best; continue
            # big regions with no clear owner are split pixel by pixel between the parts that cover them
            for pi, a in enumerate(areas):
                if parts[pi].get('inkOnly'): continue
                sel = rm & a & (owner < 0); owner[sel] = pi
    # ink: parts that are mostly line art (eyes, brows) claim the ink inside their area first;
    # every other ink pixel goes to the front-most part it touches
    for pi, p in enumerate(parts):
        if p.get('inkIn') or p.get('inkOnly'): owner[ink & areas[pi] & (owner < 0)] = pi
    rad = cfg.get('inkReach', 7)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rad + 1, 2 * rad + 1))
    for pi in range(len(parts)):
        fillm = (owner == pi).astype(np.uint8)
        near = cv2.dilate(fillm, k).astype(bool) & ink & (owner < 0) & cv2.dilate(areas[pi].astype(np.uint8), k).astype(bool)
        owner[near] = pi
    out = {}
    regions = cfg['regions']
    for pi, p in enumerate(parts):
        pm = owner == pi
        if p.get('inkOnly'): pm = pm & ink
        sh = p.get('shift', [0, 0])
        comp = shape_mask(H, W, p['complete'], x0, y0) if p.get('complete') else np.zeros((H, W), bool)
        # fill in only what the drawing hides: pixels that belong to parts in front of this one
        hidden = (owner >= 0) & (owner < pi)
        if p.get('behind'):   # only these parts count as cover (a wing can move away; the body can't)
            idx = [i for i, q in enumerate(parts) if q['name'] in p['behind']]
            hidden = np.isin(owner, idx)
            for q in parts:   # a cover part's own filled-in area counts too
                if q['name'] in p['behind'] and q.get('complete'): hidden |= shape_mask(H, W, q['complete'], x0, y0)
        comp &= hidden | pm
        # colors this part skips (the head showing around a beak) don't belong in its silhouette
        skips = [names.index(c) for c, t in p.get('map', {}).items() if t == 'skip' and c in names]
        pm_fill = pm & ~np.isin(L, skips) if skips else pm
        sil = pm_fill | comp
        if p.get('close'):
            kk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (p['close'], p['close']))
            sil = cv2.morphologyEx(sil.astype(np.uint8), cv2.MORPH_CLOSE, kk).astype(bool)
        layers = []
        base = p.get('base')
        if p.get('fillHoles'):
            from scipy import ndimage
            sil = ndimage.binary_fill_holes(sil)
        if base and not p.get('inkOnly'):
            if comp.any() and p.get('stroke', True):
                # a part with hidden areas is drawn with an ink stroke, so edges the drawing hides are outlined
                # when the part moves; shrink it by half the stroke to keep the outer edge where the drawing has it
                r = max(1, int(round(cfg.get('ow', 7) / 2)))
                ke = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
                sil_in = cv2.erode(sil.astype(np.uint8), ke).astype(bool)
                layers.append({'cls': 'r-' + base, 'd': trace_path(sil_in, x0, y0, sh), 'sil': True})
            else:   # fully drawn: the traced ink outlines it, so the fill just sits under it
                layers.append({'cls': 'r-' + base, 'd': trace_path(sil, x0, y0, sh)})
        # colors in this part, biggest first; a hair of overlap hides seams
        counts = [(int(((L == ci) & pm).sum()), ci) for ci in range(len(names)) if ci != INK]
        k1 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        for cnt, ci in sorted(counts, reverse=True):
            if cnt < p.get('minArea', 12): continue
            cname = names[ci]
            target = p.get('map', {}).get(cname)
            if target is None:   # anti-aliased fringe; the silhouette fill underneath covers it
                if cnt > 150: print('  ! %s/%s: color %s (%d px) has no mapping' % (pose_name, p['name'], cname, cnt))
                continue
            if target == 'skip': continue
            if base and target == base: continue   # already the silhouette fill
            raw = ((L == ci) & pm).astype(np.uint8)
            nn, lc, stt, _ = cv2.connectedComponentsWithStats(raw, connectivity=8)
            small = [r for r in range(1, nn) if stt[r, cv2.CC_STAT_AREA] < p.get('minBit', cfg.get('minBit', 30))]
            if small: raw[np.isin(lc, small)] = 0
            m = cv2.dilate(raw, k1).astype(bool) & sil
            d = trace_path(m, x0, y0, sh, turd=p.get('turd', 6))
            if not d: continue
            layers.append(style_layer(target, cname, cfg, d))
        im = pm & ink
        if im.any() and not p.get('noInk'):
            layers.append({'cls': 'b-ink', 'd': trace_path(im, x0, y0, sh, turd=p.get('inkTurd', 4))})
        out[p['name']] = layers
    return out, L, owner, (x0, y0, x1, y1)


def style_layer(target, cname, cfg, d):
    if target.startswith('#'): return {'fill': target, 'd': d}
    if target.startswith('=') : return {'cls': target[1:], 'd': d}   # a fixed class (b-mouth, b-tongue, b-white)
    reg, _, mod = target.partition(':')
    if not mod: return {'cls': 'r-' + reg, 'd': d}
    basec = hex2rgb(cfg['palette'][cfg['regions'][reg]]); col = hex2rgb(cfg['palette'][cname])
    err, p, kname = shade_style(col, basec)
    return {'mix': [reg, round(p * 100), kname], 'd': d}


import re
def xform_path(d, a, tx, ty):
    """scale by a and move by (tx, ty): every coordinate pair in M/L/C path data"""
    nums = re.findall(r'-?\d+(?:\.\d+)?', d)
    it = iter(nums); out = []
    def pair(m):
        x = float(m.group(1)); y = float(m.group(2))
        return '%s %s' % (fmt(a * x + tx), fmt(a * y + ty))
    return re.sub(r'(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)', pair, d)


def bbox_of(layers):
    xs, ys = [], []
    for l in layers:
        if not l.get('sil'): continue
        for x, y in re.findall(r'(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)', l['d']): xs.append(float(x)); ys.append(float(y))
    return min(xs), min(ys), max(xs), max(ys)


def register(parts, ref, key, cfg_reg):
    """line a pose up with the happy pose: scale and move so the `key` part's box matches"""
    if isinstance(cfg_reg, dict) and 'a' in cfg_reg: a, tx, ty = cfg_reg['a'], cfg_reg['tx'], cfg_reg['ty']
    else:
        bx0, by0, bx1, by1 = bbox_of(parts[key]); rx0, ry0, rx1, ry1 = bbox_of(ref[key])
        a = ((rx1 - rx0) / (bx1 - bx0) + (ry1 - ry0) / (by1 - by0)) / 2
        tx = (rx0 + rx1) / 2 - a * (bx0 + bx1) / 2; ty = (ry0 + ry1) / 2 - a * (by0 + by1) / 2
    print('  registered by %s: scale %.3f move %.1f %.1f' % (key, a, tx, ty))
    for name, layers in parts.items():
        for l in layers: l['d'] = xform_path(l['d'], a, tx, ty)
    return dict(a=round(a, 4), tx=round(tx, 2), ty=round(ty, 2))


def main(which):
    cfgs = json.load(open(os.path.join(HERE, 'birds.json')))
    os.makedirs(OUT, exist_ok=True)
    for bird in which or list(cfgs):
        cfg = cfgs[bird]
        sheet = np.asarray(Image.open(os.path.join(HERE, cfg.get('sheet', bird) + '.png')).convert('RGB'))
        res = {'id': bird, 'ink': cfg['palette']['ink'], 'colors': {r: cfg['palette'][c] for r, c in cfg['regions'].items()}, 'poses': {}}
        for pose in cfg['poses']:
            print(bird, pose)
            parts, L, owner, box = run_pose(cfg, pose, sheet)
            reg = cfg['poses'][pose].get('register')
            if reg: res.setdefault('reg', {})[pose] = register(parts, res['poses']['happy'], reg if isinstance(reg, str) else 'head', reg)
            res['poses'][pose] = parts
            # debug: which part owns each pixel
            rng = np.random.default_rng(7); cols = rng.integers(40, 255, (64, 3))
            vis = np.full(owner.shape + (3,), 255, np.uint8)
            for pi in range(owner.max() + 1): vis[owner == pi] = cols[pi]
            Image.fromarray(vis).save(os.path.join(OUT, '%s-%s-owners.png' % (bird, pose)))
        json.dump(res, open(os.path.join(OUT, bird + '.json'), 'w'))
        print('wrote', bird, os.path.getsize(os.path.join(OUT, bird + '.json')), 'bytes')


if __name__ == '__main__':
    main(sys.argv[1:])
