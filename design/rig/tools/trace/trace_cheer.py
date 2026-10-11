"""Trace the cheer concept: raised wings, happy (closed) eyes and the wide-open beak. Parts are placed in setup space
using the neutral trace's landmarks (trace/t2.json meta). Writes trace/t2c.json."""
import os, sys, json
SP = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_lib import *
c = Crop(SP + '/trace/c', 362, 537.5)
INK = c.m('ink'); TEAL = c.m('teal', 'gloss')
SH = INK.shape; yy, xx = np.indices(SH)
HALF = 10; NEAR = 5; INKN = dil(INK, NEAR)
def P(ux, uy): return c.px(ux, uy)
def Y(uy): return P(0, uy)[1]
def line_mask(pts, w):
    m = np.zeros(SH, np.uint8); cv2.polylines(m, [np.array([P(*p) for p in pts], np.int32)], False, 1, thickness=max(1, int(w * 8))); return m.astype(bool)
def poly_mask(pts):
    m = np.zeros(SH, np.uint8); cv2.fillPoly(m, [np.array([P(*p) for p in pts], np.int32)], 1); return m.astype(bool)
def flood(free, seed): return comp_at(free, P(*seed))
def F(cls, m, blur=2.0, **kw): return '<path class="' + cls + '" d="' + trace(smooth(m, blur), c, **kw) + '"/>'
def S(cls, ds):
    cls = {'o': 'ol', 'o2': 'ol2'}.get(cls, cls)
    return ''.join('<path class="' + cls + '" d="' + d + '"/>' for d in ds)
def INKF(m, blur=1.4, turd=10): return F('k-ink', m, blur=blur, turd=turd)
def raw_c(m):
    ys, xs = np.nonzero(m); return np.array(c.raw(xs.mean(), ys.mean()))
def raw_bbox(m):
    ys, xs = np.nonzero(m); a = c.raw(xs.min(), ys.min()); b = c.raw(xs.max(), ys.max()); return [round(a[0], 1), round(a[1], 1), round(b[0], 1), round(b[1], 1)]
parts, meta = {}, {}

# ---- head (for separating the wings, and the face landmarks)
red = c.m('red', 'coral', 'mouth'); gold = c.m('gold', 'goldhi')
chord = line_mask([(95, 158.6), (104, 159.2), (112, 158.2), (120, 157.8), (128, 157.6), (136, 156.8), (142, 156.6), (148, 157.4)], 1.6)
head_in = fill(flood(~INK & ~chord & ~((red | gold) & (yy < Y(66))), (120, 95)))
print('cheer head', raw_bbox(head_in))

# ---- wings: cut from the torso at the armpits; the hidden root is carried on toward the shoulder
cutL = line_mask([(98.6, 157.6), (95, 168), (91.6, 178.4)], 1.0)
cutR = line_mask([(146.4, 156.8), (148, 158.6), (149.8, 161.2)], 1.0)
free = TEAL & ~head_in & ~cutL & ~cutR
STRETCH = (236.0, 1.03)                    # the cheer pose stretches the body 3 % from the feet; undo it for setup space
PIV = {'L': (97.0, 165.0), 'R': (150.0, 164.0)}
for side, seed, root in (('L', (55, 130), [(99, 157), (92, 179), (104, 172), (104, 160)]), ('R', (190, 140), [(146, 156.5), (150, 161), (160, 178), (152, 176), (146, 166)])):
    w = fill(close(flood(free, seed), 3))
    print('cheer wing', side, raw_bbox(w))
    wf = dil(w, HALF)
    rootm = poly_mask(root)
    pv = PIV[side]
    disk = np.zeros(SH, np.uint8); cv2.circle(disk, P(pv[0], 236 - (236 - pv[1]) * 1.03), 7 * 8, 1, -1)
    hidden = fill(close(rootm | (disk.astype(bool) & dil(rootm, 40)), 6))
    full = fill(close(wf | (hidden & ~dil(w, 2) & (head_in | ~TEAL | True)), 4))
    lines = opn(INK & ero(wf, HALF + 4), 1)
    c.sy = STRETCH
    run = stroke_runs(full, INKN & ~dil(head_in, 3) & ~rootm, c, min_run=30, bridge=20)
    mk = F('k-body', full) + S('o', run) + ''.join(INKF(m) for a, x_, y_, m in comps(lines, 60))
    c.sy = None
    parts['wing' + side] = {'spread': mk}
    meta['wing' + side] = {'bbox': raw_bbox(full), 'c': list(np.round(raw_c(w), 2)), 'runs': len(run)}

# ---- the torso with the wings up: trace_neutral.py uses it for the body's hidden sides
BG = c.m('bg')
tail_c = fill(comp_at(c.m('red', 'mouth', 'coral') & (yy > Y(190)), P(80, 210)))
feet_c = c.m('gray') & (yy > Y(228))
WV = fill(close(flood(free, (55, 130)), 3)) | fill(close(flood(free, (190, 140)), 3))
reg = ~BG & ~head_in & ~dil(WV, 2 * HALF + 3) & ~dil(tail_c, 2 * HALF + 3) & ~dil(feet_c, 2 * HALF + 3) & (yy > Y(150)) & (yy < Y(240))
tor = opn(fill(close(fill(comp_at(close(reg, 5), P(124, 200))), 8)), 6)
np.save(SP + '/trace/cheer-body.npy', ero(tor, HALF))
if not os.path.exists(SP + '/trace/t2.json'):
    print('saved the cheer torso; now run trace_neutral.py, then this script again'); sys.exit(0)
N = json.load(open(SP + '/trace/t2.json'))['meta']

# ---- face landmarks in the cheer drawing, and the matching ones from the neutral trace
face_bg = flood(~INK & head_in, (120, 100))
enclosed = head_in & ~face_bg
beak_full = fill(comp_at(fill(enclosed), P(127, 128)))
CREAM = c.m('cream', 'white')
pat = {s_: fill(comp_at(CREAM & face_bg, P(*pt))) for s_, pt in (('L', (80, 112)), ('R', (160, 104)))}
for s_ in 'LR': print('cheer patch', s_, raw_bbox(pat[s_]), raw_c(pat[s_]))

# happy eyes: the crescents inside each patch, moved onto the neutral patch centres
for s_ in 'LR':
    arc = comps(INK & fill(pat[s_]), 60)[0][3]
    nb = N['patch' + s_]['bbox']; ncen = np.array([(nb[0] + nb[2]) / 2, (nb[1] + nb[3]) / 2])
    cb = raw_bbox(pat[s_]); ccen = np.array([(cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2])
    c.off = tuple(ncen - ccen)
    parts['pupil' + s_] = {'happy': INKF(arc, blur=1.3)}
    meta['pupil' + s_] = {'happyOff': [round(v, 2) for v in c.off], 'arc': raw_bbox(arc)}
    c.off = (0.0, 0.0)

# wide mouth: the whole cheer beak in the mouth slot (its tops matched to the neutral beak); the raised upper beak as beak.up
BHALF = 5
beak = opn(ero(beak_full, BHALF), 3)
interior = fill(flood(~INK & ero(beak_full, BHALF), (127, 136)))
gold_ = c.m('gold', 'goldhi')
cutM = line_mask([(112.4, 126.2), (115.4, 126.3)], 0.8) | line_mask([(137.2, 125.0), (141.6, 125.4)], 0.8)
upper_gold = fill(flood(gold_ & ~INK & ~cutM & beak, (127, 116)))
smile = INK & dil(upper_gold, 22) & (dil(interior, 22) | dil(cutM, 14)) & ero(beak_full, 2 * BHALF - 2)
smile = comp_at(opn(smile, 1), P(127, 126))
upper = fill(close(dil(upper_gold, BHALF) | smile, 2)) & beak
mouth_in = dil(interior, 4) & ero(beak_full, BHALF)
tongue = fill(comp_at(c.m('coral', 'red') & mouth_in, P(127, 140)))
hl = comps(c.m('goldhi') & upper, 20)
nb = N['beak']['bbox']; cb = raw_bbox(beak)
c.off = ((nb[0] + nb[2]) / 2 - (cb[0] + cb[2]) / 2, nb[1] - cb[1])
print('cheer beak', cb, 'neutral', nb, 'offset', c.off)
parts['mouth'] = {'wide': F('k-beak', beak) + S('o2', [closed_path(beak, c)]) + F('k-mouth', mouth_in, blur=1.5) + F('k-tongue', tongue, blur=1.5) + S('o2', [closed_path(mouth_in, c)])}
upper_line = stroke_runs(upper, ~ero(beak, 4) & ~dil(smile, 3), c, min_run=36, bridge=8)
parts['beak'] = {'up': F('k-beak', upper) + S('o2', upper_line) + INKF(smile, blur=1.2) + (F('k-gloss2', hl[0][3], blur=1.2) if hl else '')}
meta['beak'] = {'off': [round(v, 2) for v in c.off], 'bbox': cb, 'mouth': raw_bbox(mouth_in), 'upper': raw_bbox(upper)}
c.off = (0.0, 0.0)
json.dump({'parts': parts, 'meta': meta}, open(SP + '/trace/t2c.json', 'w'))
for k, v in meta.items(): print(k, v)
