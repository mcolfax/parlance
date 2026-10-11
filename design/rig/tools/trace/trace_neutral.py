"""Trace Pip from the neutral concept (setup pose). Writes trace/t2.json: {slot: {attachment: markup}} plus meta.
Outlines are strokes (class o) where the concept has ink; fills reach the ink's centre line."""
import os, sys, json
SP = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_lib import *
from PIL import Image

c = Crop(SP + '/trace/n', 0, 193)
INK = c.m('ink')
TEAL = c.m('teal', 'gloss')
SH = INK.shape
yy, xx = np.indices(SH)
LW = 2.6
HALF = int(round(LW / 2 * 8))      # 10 px at 4x
NEAR = 5
INKN = dil(INK, NEAR)
def P(ux, uy): return c.px(ux, uy)
def Y(uy): return P(0, uy)[1]
def X(ux): return P(ux, 0)[0]
def line_mask(pts, w):
    m = np.zeros(SH, np.uint8)
    cv2.polylines(m, [np.array([P(*p) for p in pts], np.int32)], False, 1, thickness=max(1, int(w * 8)))
    return m.astype(bool)
def poly_mask(pts):
    m = np.zeros(SH, np.uint8); cv2.fillPoly(m, [np.array([P(*p) for p in pts], np.int32)], 1); return m.astype(bool)
def flood(free, seed): return comp_at(free, P(*seed))
def hull(m):
    pts = np.argwhere(m)[:, ::-1].astype(np.int32)
    h = cv2.convexHull(pts); o = np.zeros(SH, np.uint8); cv2.fillPoly(o, [h], 1); return o.astype(bool)
def F(cls, m, blur=2.0, **kw):          # filled path
    return '<path class="' + cls + '" d="' + trace(smooth(m, blur), c, **kw) + '"/>'
def S(cls, ds):
    cls = {'o': 'ol', 'o2': 'ol2'}.get(cls, cls)                           # stroke paths (open runs)
    return ''.join('<path class="' + cls + '" d="' + d + '"/>' for d in ds)
def INKF(m, blur=1.4, turd=10):         # filled ink detail
    return F('k-ink', m, blur=blur, turd=turd)

parts, meta, dbg = {}, {}, {}
D = {}   # named drawings for the part-sheet builder

# ================= head =================
# the head has no chin line: it is closed across the chest between the two places where its outline meets the wings
chord = line_mask([(91, 157.4), (98, 157.9), (104, 157.6), (112, 156.8), (120, 156.4), (128, 156.4), (134, 156.6), (141, 157.0), (148, 157.2)], 1.6)
red = c.m('red', 'coral', 'mouth')
gold = c.m('gold', 'goldhi')
crestc = (red | gold) & (yy < Y(68))
head_in = fill(flood(~INK & ~chord & ~crestc, (120, 95)))
head_in = head_in | (hull(head_in) & (yy < Y(80)))          # the crown runs on under the crest
head_in = opn(head_in, 2)
head = dil(head_in, HALF)
dbg['head'] = head
top = yy < Y(72)
cr2_vis = fill(comp_at((red | c.m('goldhi')) & top, P(120, 43)))
cr1_vis = fill(comp_at(gold & top & ~cr2_vis, P(100.5, 52.9)))
cr3_vis = fill(comp_at(gold & top & ~cr2_vis, P(142.3, 52.2)))
crest_cover = dil(cr1_vis | cr2_vis | cr3_vis, 10)
# cheek tapers: the head line curls inward and thins out where the head meets the chest; drawn as ink shapes
TZL = poly_mask([(95.2, 150), (110, 150), (110, 162), (95.2, 162)])
TZR = poly_mask([(130, 150), (144.6, 150), (144.6, 162), (130, 162)])
head_line = stroke_runs(head, (INKN | crest_cover) & ~TZL & ~TZR, c, min_run=30, bridge=12)
tapL = INK & poly_mask([(93.4, 153.5), (107, 155.5), (107, 160), (93.4, 160.5)])
tapR = INK & poly_mask([(131.5, 153), (146.4, 153), (146.4, 160), (131.5, 159.5)])
gloss_head = comp_at(c.m('gloss'), P(88.6, 77))
parts['head'] = {'on': F('k-body', head) + S('o', head_line) + INKF(tapL) + INKF(tapR) + F('k-gloss', gloss_head, blur=1.5)}
meta['head'] = {'bbox': bbox_units(head, c), 'runs': len(head_line)}

# ================= crest: drawn over the crown; no line where a feather meets the head =================
INK2 = dil(INK, 2)
for name, vis, cls in (('crest1', cr1_vis, 'k-crest2'), ('crest2', cr2_vis, 'k-crest'), ('crest3', cr3_vis, 'k-crest2')):
    f = fill(vis | (dil(vis, HALF) & INK2))
    f = opn(f, 2)
    dbg[name] = f
    run = stroke_runs(f, INKN & ~(head_in & ~dil(INK, 3)), c, min_run=30, bridge=16)
    extra = ''
    if name == 'crest2': extra = F('k-gloss2', comp_at(c.m('goldhi'), P(119.7, 29.6)), blur=1.2)
    parts[name] = {'on': F(cls, f) + S('o', run) + extra}
    ys_, xs_ = np.nonzero(vis & (yy > np.percentile(np.nonzero(vis)[0], 88)))
    meta[name] = {'bbox': bbox_units(f, c), 'base': [round(v, 1) for v in c.unit(xs_.mean(), ys_.mean())], 'runs': len(run)}

# ================= wings =================
cutL = line_mask([(92.6, 156.4), (99, 163), (105.9, 172.6)], 1.0)
cutR = line_mask([(146.6, 156.6), (147.6, 160), (148.6, 164.8)], 1.0)
free = TEAL & ~head_in & ~cutL & ~cutR
wings = {}
for side, seed in (('L', (80, 185)), ('R', (160, 185))):
    w = fill(close(flood(free, seed), 3))
    wings[side] = w
    wf = dil(w, HALF)
    dbg['wing' + side] = wf
    # feather lines: ink inside the wing, away from its outline
    lines = INK & ero(wf, HALF + 4)
    lines = opn(lines, 1)
    line_m = ''.join(INKF(m) for a, x_, y_, m in comps(lines, 60))
    run = stroke_runs(wf, INKN & ~dil(head_in, 2), c, min_run=30, bridge=20)
    g = ''
    if side == 'L': g = F('k-gloss', comp_at(c.m('gloss'), P(85.1, 172.2)), blur=1.5)
    parts['wing' + side] = {'folded': F('k-body', wf) + S('o', run) + line_m + g}
    meta['wing' + side] = {'bbox': bbox_units(wf, c), 'runs': len(run), 'c': centroid_units(w, c)}

# ================= belly =================
cream = c.m('cream', 'white', 'gloss')
belly_vis = opn(fill(comp_at(cream & (yy > Y(158)), P(126, 194.7))), 3)
pts = boundary(belly_vis)
hidden_by = dil(wings['L'] | wings['R'], HALF + 4) | dil(head_in, HALF + 4)
keep = ~hidden_by[pts[:, 1], pts[:, 0]]
ell = cv2.fitEllipse(pts[keep].astype(np.float32))
em = np.zeros(SH, np.uint8); cv2.ellipse(em, ell, 1, -1)
belly = belly_vis | (em.astype(bool) & hidden_by)
belly = hull(opn(fill(close(belly, 4)), 12))            # the belly is convex: no dents where the wing lines bit into it
dbg['belly'] = belly
parts['belly'] = {'on': F('k-belly', belly, blur=2.5)}
(ex, ey), (ew, eh), ea = ell
meta['belly'] = {'ellipse': [round(v, 2) for v in (*c.unit(ex, ey), ew / 16, eh / 16, ea)], 'bbox': bbox_units(belly, c)}

# ================= body =================
wing_any = wings['L'] | wings['R']
body_vis = TEAL & ~head_in & ~wing_any & ~cutL & ~cutR & (yy > Y(150))
body_vis = opn(body_vis, 2)
body_vis = comp_at(body_vis, P(120, 226)) | comp_at(body_vis, P(108, 190)) | comp_at(body_vis, P(145, 190))
body_core = fill(close(body_vis | belly, 6))
# under the folded wings the body takes the torso shape from the cheer drawing, where the wings are up
cb = np.load(SP + '/trace/cheer-body.npy')
ux = (xx / 4 + c.x0 - c.cx) * 0.5 + 120; uy = (yy / 4 - 520) * 0.5 + 250
cy_ = 236 - (236 - uy) * 1.03
qx = np.round(((ux - 120) / 0.5 + 537.5 - 362) * 4).astype(int); qy = np.round(((cy_ - 250) / 0.5 + 520) * 4).astype(int)
ok = (qx >= 0) & (qx < cb.shape[1]) & (qy >= 0) & (qy < cb.shape[0])
cheer_torso = np.zeros(SH, bool); cheer_torso[ok] = cb[qy[ok], qx[ok]]
chest = poly_mask([(104, 149), (136, 149), (142, 166), (98, 166)])
hidden = dil(wing_any, HALF) | dil(head_in, HALF) | belly
# the hidden sides join the cheer torso to the visible thighs in one smooth convex sweep
bc = dil(body_core, HALF)
body = fill(bc | (hull(bc | cheer_torso | chest) & hidden))
body = opn(close(body, 8), 4)
dbg['body'] = body
body_mask = INKN | (dil(wing_any, HALF - 2) & (yy > Y(168)))
BZ = poly_mask([(99, 223), (141, 221), (141, 237), (99, 237)])
body_line = stroke_runs(body, body_mask & ~dil(head_in, 3) & ~BZ & (yy > Y(164)), c, min_run=30, bridge=20)
gray = c.m('gray')
bottom_ink = INK & BZ & ~dil(gray, 6) & (yy < Y(234)) & dil(body, 6)
parts['body'] = {'on': F('k-body', body) + S('o', body_line) + ''.join(INKF(m, blur=1.2) for a, x_, y_, m in comps(bottom_ink, 60))}
meta['body'] = {'bbox': bbox_units(body, c), 'runs': len(body_line)}

# ================= tail =================
tail_vis = fill(comp_at(red & (yy > Y(180)), P(60.7, 203.5)))
tail_all = fill(close(tail_vis | (INK & dil(tail_vis, 6) & ero(fill(close(dil(tail_vis, 14), 10)), 2)), 3))
# lower feather: below the separating line
sep = INK & dil(tail_vis, 4) & (yy > Y(204)) & (yy < Y(214)) & (xx > X(52)) & (xx < X(76))
lab, n = ndimage.label(tail_vis & ~dil(sep, 2))
cc = comps(tail_vis & ~dil(sep, 2), 200)
upper = max(cc, key=lambda t: -t[2])[3] if cc else tail_vis   # smaller y = upper
lower = min(cc, key=lambda t: -t[2])[3] if len(cc) > 1 else None
def extend(feather, toward, reach=34):
    """carry a feather on toward the body along its own axis, so its root is whole when the wing lifts"""
    ys, xs = np.nonzero(feather); cx_, cy_ = xs.mean(), ys.mean()
    tx, ty = P(*toward); v = np.array([tx - cx_, ty - cy_]); v /= np.hypot(*v)
    proj = (xs - cx_) * v[0] + (ys - cy_) * v[1]
    sel = proj > np.percentile(proj, 70)
    base = np.zeros(SH, bool); base[ys[sel], xs[sel]] = True
    ext = feather.copy()
    for k in range(4, reach * 8, 4):
        ext |= np.roll(np.roll(base, int(round(v[1] * k)), 0), int(round(v[0] * k)), 1)
    return fill(close(ext, 4))
tail_up = dil(extend(fill(upper), (104, 203)), HALF)
tail_lo = dil(extend(fill(lower), (104, 212)), HALF) if lower is not None else None
dbg['tail'] = tail_up | (tail_lo if tail_lo is not None else 0)
parts['tail'] = {'fan': (F('k-tail2 o', tail_lo) if tail_lo is not None else '') + F('k-tail o', tail_up)}
meta['tail'] = {'bbox': bbox_units(dbg['tail'], c)}

# ================= feet =================
gray = c.m('gray')
for side, pt, lx in (('L', (92.4, 246.0), 93.6), ('R', (134.7, 245.4), 135.6)):
    f = fill(close(comp_at(gray, P(*pt)), 2))
    ff = dil(f, HALF)
    rows = ff[Y(233.5):Y(235)]; cols = np.nonzero(rows.any(0))[0]
    stub = np.zeros(SH, bool); stub[Y(221):Y(236), cols.min() + 10:cols.max() - 10] = True
    foot = fill(close(ff | stub, 3))
    toes = INK & ero(foot, HALF + 3) & (yy > Y(238))
    toes = opn(toes, 1)
    parts['leg' + side] = {'stand': F('k-feet o', foot) + ''.join(INKF(m) for a, x_, y_, m in comps(toes, 40))}
    dbg['leg' + side] = foot
    meta['leg' + side] = {'bbox': bbox_units(foot, c), 'ankle': centroid_units(f & (yy < Y(240)), c)}


# ================= face =================
BHALF = 5                               # the beak's line is about 1.25 units
face_bg = flood(~INK & head_in, (120, 100))                 # teal and patches; not what ink encloses
enclosed = head_in & ~face_bg
beak_full = fill(comp_at(fill(enclosed), P(124, 128)))      # beak with its outline
beak = ero(beak_full, BHALF)                                # to the outline's centre line
beak = opn(beak, 3)
# the open mouth: a dark D with its own ink rim, under a thick smile line. The smile line's left end stops short of
# the beak's edge, so the upper beak is closed off there with a short cut.
interior = fill(flood(~INK & ero(beak_full, BHALF), (124, 138)))
gold_ = c.m('gold', 'goldhi')
cutM = line_mask([(114.0, 130.4), (117.6, 131.4)], 0.8) | line_mask([(141.0, 137.6), (143.6, 137.2)], 0.8)
upper_gold = fill(flood(gold_ & ~INK & ~cutM & beak, (128, 122)))
smile = INK & dil(upper_gold, 22) & (dil(interior, 22) | dil(cutM, 14)) & ero(beak_full, 2 * BHALF - 2)
smile = comp_at(opn(smile, 1), P(124, 134))
smile |= INK & dil(smile, 6) & line_mask([(138, 136.4), (142.4, 137.2)], 1.6)    # the right end runs into the beak's edge
upper = fill(close(dil(upper_gold, BHALF) | smile, 2)) & beak
mouth_in = dil(interior, 4) & ero(beak_full, BHALF)
upper_line = stroke_runs(upper, ~ero(beak, 4) & ~dil(smile, 3), c, min_run=36, bridge=8)
hl = comp_at(c.m('goldhi'), P(133.4, 119.5))
tongue = fill(comp_at(c.m('coral', 'red') & mouth_in, P(128, 141.5)))
D['egg'] = F('k-beak', beak); D['eggLine'] = S('ol2', [closed_path(beak, c)])
D['grinIn'] = F('k-mouth', mouth_in, blur=1.5); D['grinTongue'] = F('k-tongue', tongue, blur=1.5); D['grinInLine'] = S('ol2', [closed_path(mouth_in, c)])
D['upper'] = F('k-beak', upper); D['upperLine'] = S('ol2', upper_line); D['smile'] = INKF(smile, blur=1.2); D['beakHl'] = F('k-gloss2', hl, blur=1.2)
parts['mouth'] = {'grin': D['egg'] + D['eggLine'] + D['grinIn'] + D['grinTongue'] + D['grinInLine']}
parts['beak'] = {'open': D['upper'] + D['upperLine'] + D['smile'] + D['beakHl']}
meta['beak'] = {'bbox': bbox_units(beak, c), 'upper': bbox_units(upper, c), 'mouth': bbox_units(mouth_in, c), 'smile': bbox_units(smile, c), 'c': centroid_units(beak, c)}
dbg['beak'] = beak
ys_, xs_ = np.nonzero(smile); meta['beak']['smileY'] = round(float(c.unit(0, ys_.mean())[1]), 2)
iy, ix = np.nonzero(interior); meta['beak']['interior'] = bbox_units(interior, c)
CREAM = c.m('cream', 'white')
for side, seed, bseed in (('L', (80, 118), (94.7, 85.2)), ('R', (168, 112), (153.8, 82.9))):
    cream_c = comp_at(CREAM & face_bg, P(*seed))
    pupil_zone = dil(INK, 3) & ero(head_in, 12) & dil(cream_c, 8) & ~dil(beak_full, 2)
    pv = fill(close(cream_c | pupil_zone, 3))
    pts = boundary(pv)
    far = ~dil(beak_full, 10)[pts[:, 1], pts[:, 0]]
    ell = cv2.fitEllipseDirect(pts[far].astype(np.float32))
    em = np.zeros(SH, np.uint8); cv2.ellipse(em, ell, 1, -1); E = em.astype(bool)
    patch = fill(pv | (E & dil(beak_full, 14)))
    (ex, ey), (ew, eh), ea = ell
    ecx, ecy = c.unit(ex, ey)
    dev = (pv & ~dil(E, 3) & ~dil(beak_full, 10)).sum() / 64, (E & ~dil(pv, 3) & ~dil(beak_full, 10)).sum() / 64
    print(side, 'patch ellipse misfit (units^2 outside, inside)', dev)
    parts['patch' + side] = {'on': F('k-face', patch, blur=5, alphamax=1.2)}
    meta['patch' + side] = {'ellipse': [round(v, 2) for v in (*c.unit(ex, ey), ew / 16, eh / 16, ea)], 'bbox': bbox_units(patch, c)}
    dbg['patch' + side] = patch
    cc = comps(INK & ero(E, 4), 40)
    pupil_ink = cc[0][3]
    pupil = dil(fill(pupil_ink), 2)
    hole = fill(pupil_ink) & ~pupil_ink
    glint = comps(hole, 30)[0][3] if hole.any() else None
    if glint is not None: glint = dil(glint, 1)
    arcs = [dil(m, 1) for a_, x_, y_, m in cc[1:] if a_ > 150]
    core = opn(fill(pupil_ink), 9)
    core = comps(core, 100)[0][3]
    pe = cv2.fitEllipse(boundary(core).astype(np.float32))
    (qx, qy), (qw, qh), qa = pe
    meta.setdefault('pupil' + side, {})
    pupil_ell = [round(v, 2) for v in (*c.unit(qx, qy), qw / 16, qh / 16, qa)]
    py_, px_ = np.nonzero(pupil)
    pup = F('k-ink', pupil, blur=1.5) + ''.join(INKF(m, blur=1.1, turd=6) for m in arcs)
    if glint is not None: pup += F('k-glint', glint, blur=1.2, turd=4)
    parts['pupil' + side] = {'open': pup}
    pc = c.unit(px_.mean(), py_.mean())
    meta['pupil' + side] = {'c': [round(v, 2) for v in pc], 'rx': round((px_.max() - px_.min()) / 16, 2), 'ry': round((py_.max() - py_.min()) / 16, 2),
                             'glint': centroid_units(glint, c) if glint is not None else None, 'glintR': round(float(np.sqrt(glint.sum() / np.pi) / 8), 2) if glint is not None else None,
                             'arcs': [bbox_units(m, c) for m in arcs], 'ellipse': pupil_ell}
    D['pupil' + side] = pup
    brow = comp_at(INK & (yy < Y(95)) & head_in, P(*bseed))
    parts['brow' + side] = {'arc': INKF(brow, blur=1.3)}
    meta['brow' + side] = {'bbox': bbox_units(brow, c), 'c': centroid_units(brow, c)}

json.dump({'parts': parts, 'meta': meta, 'D': D}, open(SP + '/trace/t2.json', 'w'))
np.save(SP + '/trace/t2-masks.npy', {k: v for k, v in dbg.items()}, allow_pickle=True)
for k, v in meta.items(): print(k, v)
