"""Helpers: class masks, components, morphology, potrace -> SVG path in rig units."""
import os, numpy as np, cv2, potrace
TOL = float(os.environ.get("TRACE_TOL", 0.3)); EPS = float(os.environ.get("TRACE_EPS", 1.6))
from scipy import ndimage
NAMES = ['bg', 'ink', 'teal', 'gloss', 'cream', 'white', 'gold', 'goldhi', 'red', 'coral', 'mouth', 'gray', 'blue']
S = 4
class Crop:
    def __init__(self, prefix, x0, cx):
        self.cls = np.load(prefix + '-cls.npy'); self.x0 = x0; self.cx = cx
    def m(self, *names): return np.isin(self.cls, [NAMES.index(n) for n in names])
    def px(self, ux, uy):   # rig units -> 4x pixel
        return (int(round((((ux - 120) / 0.5) + self.cx - self.x0) * S)), int(round((((uy - 250) / 0.5) + 520) * S)))
    off = (0.0, 0.0)        # added to every traced unit coordinate (to place a part from another pose into setup space)
    sy = None               # optional vertical un-stretch about y = sy[0] by factor sy[1]
    def unit(self, x, y):   # 4x pixel -> rig units
        ux, uy = (x / S + self.x0 - self.cx) * 0.5 + 120, (y / S - 520) * 0.5 + 250
        if self.sy: uy = self.sy[0] - (self.sy[0] - uy) / self.sy[1]
        return (ux + self.off[0], uy + self.off[1])
    def raw(self, x, y):
        return ((x / S + self.x0 - self.cx) * 0.5 + 120, (y / S - 520) * 0.5 + 250)
def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
def dil(m, r): return cv2.dilate(m.astype(np.uint8), disk(r)).astype(bool) if r > 0 else m
def ero(m, r): return cv2.erode(m.astype(np.uint8), disk(r)).astype(bool) if r > 0 else m
def close(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disk(r)).astype(bool)
def opn(m, r): return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, disk(r)).astype(bool)
def fill(m): return ndimage.binary_fill_holes(m)
def comp_at(m, p):
    lab, n = ndimage.label(m)
    x, y = p
    v = lab[y, x]
    if v == 0:   # nearest labelled pixel
        ys, xs = np.nonzero(lab); i = np.argmin((xs - x) ** 2 + (ys - y) ** 2); v = lab[ys[i], xs[i]]
    return lab == v
def comps(m, min_area=50):
    lab, n = ndimage.label(m); out = []
    for i in range(1, n + 1):
        c = lab == i; a = int(c.sum())
        if a >= min_area:
            ys, xs = np.nonzero(c); out.append((a, xs.mean(), ys.mean(), c))
    return sorted(out, key=lambda t: -t[0])
def smooth(m, r=3):
    """blur + threshold to remove pixel stair-steps before tracing"""
    f = cv2.GaussianBlur(m.astype(np.float32), (0, 0), r)
    return f > 0.5
def trace(m, crop, prec=1, alphamax=1.0, turd=30, tol=None):
    tol = TOL if tol is None else tol
    bm = potrace.Bitmap(~m.astype(bool))   # potracer treats True as white paper
    plist = bm.trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=alphamax, opticurve=True, opttolerance=tol)
    f = lambda pt: ' '.join(str(round(v, prec)) for v in crop.unit(pt.x, pt.y))
    d = []
    for curve in plist:
        d.append('M' + f(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner: d.append('L' + f(seg.c) + ' L' + f(seg.end_point))
            else: d.append('C' + f(seg.c1) + ' ' + f(seg.c2) + ' ' + f(seg.end_point))
        d.append('Z')
    return ' '.join(d)
def bbox_units(m, crop):
    ys, xs = np.nonzero(m); a = crop.unit(xs.min(), ys.min()); b = crop.unit(xs.max(), ys.max())
    return [round(a[0], 1), round(a[1], 1), round(b[0], 1), round(b[1], 1)]
def centroid_units(m, crop):
    ys, xs = np.nonzero(m); return [round(v, 2) for v in crop.unit(xs.mean(), ys.mean())]

# ---- open outlines: the parts of a region's boundary where the concept actually has ink ----
def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab) or 1e-9
    q = pts - a; d = np.abs(ab[0] * q[:, 1] - ab[1] * q[:, 0]) / n
    i = int(np.argmax(d))
    if d[i] > eps: return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])
def catmull(pts, crop, closed=False, prec=1, tension=1.0):
    """smooth path through points (4x px) as cubic Béziers in rig units"""
    P = [np.array(crop.unit(x, y)) for x, y in pts]
    if closed: P = [P[-1]] + P + [P[0], P[1]]
    else: P = [P[0]] + P + [P[-1]]
    fmt = lambda p: str(round(p[0], prec)) + ' ' + str(round(p[1], prec))
    d = 'M' + fmt(P[1])
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = p1 + (p2 - p0) / 6 * tension; c2 = p2 - (p3 - p1) / 6 * tension
        d += ' C' + fmt(c1) + ' ' + fmt(c2) + ' ' + fmt(p2)
    return d + (' Z' if closed else '')
def inked_runs(region, ink, crop, near=4, min_run=40, bridge=24, eps=2.0, trim=0):
    """open stroke paths along the region's outer boundary wherever ink lies within `near` px"""
    cnts, _ = cv2.findContours(region.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cnts: return []
    pts = max(cnts, key=len)[:, 0, :]
    inkd = dil(ink, near)
    flag = inkd[pts[:, 1], pts[:, 0]]
    n = len(pts)
    if flag.all(): return ['CLOSED']
    # bridge short gaps, drop short runs (circular)
    def runs(f):
        r = []; i = 0
        start = int(np.argmin(f)) if not f.all() else 0
        idx = [(start + k) % n for k in range(n)]
        cur = None
        for k in idx:
            if f[k] and cur is None: cur = [k]
            elif f[k]: cur.append(k)
            elif cur is not None: r.append(cur); cur = None
        if cur is not None: r.append(cur)
        return r
    g = ~flag
    for run in runs(g):
        if len(run) < bridge: flag[run] = True
    out = []
    for run in runs(flag):
        if len(run) < min_run: continue
        seq = pts[run][trim:len(run) - trim] if trim else pts[run]
        simp = rdp(seq.astype(float), eps)
        if len(simp) >= 2: out.append(catmull(simp, crop))
    return out

# ---- generalized: stroke the boundary wherever `mask` is true ----
def boundary(region):
    cnts, _ = cv2.findContours(region.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return max(cnts, key=len)[:, 0, :] if cnts else None
def _circ_runs(f):
    n = len(f); r = []
    if f.all(): return [list(range(n))]
    start = int(np.argmin(f)); cur = None
    for k in [(start + i) % n for i in range(n)]:
        if f[k]:
            if cur is None: cur = [k]
            else: cur.append(k)
        elif cur is not None: r.append(cur); cur = None
    if cur is not None: r.append(cur)
    return r
def stroke_runs(region, mask, crop, min_run=40, bridge=24, eps=None, closed_tol=0):
    eps = EPS if eps is None else eps
    """open (or closed) stroke paths along the region's outer boundary where mask is true; returns list of d strings"""
    pts = boundary(region)
    if pts is None: return []
    flag = mask[pts[:, 1], pts[:, 0]].copy()
    for run in _circ_runs(~flag):
        if len(run) < bridge and not flag.all() and len(run) < len(flag): flag[run] = True
    if flag.all():
        return [catmull(rdp_closed(pts.astype(float), eps), crop, closed=True)]
    out = []
    for run in _circ_runs(flag):
        if len(run) < min_run: continue
        simp = rdp(pts[run].astype(float), eps)
        if len(simp) >= 2: out.append(catmull(simp, crop))
    return out
def rdp_closed(pts, eps):
    i = int(np.argmax(np.hypot(*(pts - pts[0]).T)))
    a = rdp(pts[:i + 1], eps); b = rdp(np.vstack([pts[i:], pts[:1]]), eps)
    return np.vstack([a[:-1], b[:-1]])
def closed_path(region, crop, eps=None):
    eps = EPS if eps is None else eps
    return catmull(rdp_closed(boundary(region).astype(float), eps), crop, closed=True)
