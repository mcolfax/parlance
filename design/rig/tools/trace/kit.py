"""The tracing kit for the cast's other birds: the steps trace_neutral.py and trace_cheer.py take for Pip, made general.
A bird's script (birds/<bird>.py) opens a crop of its prepared sheet with Tracer and builds its parts from masks:
fills reach the middle of the ink, outlines are strokes only where the sheet has ink, and parts hidden by others are
completed. See README.md."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_lib import *



class Tracer:
    """A crop of a prepared sheet, in rig units. x0 is the crop's left edge and cx the head's centre, in sheet px;
    lw is the sheet's outline weight in units (measure_lw), and HALF half of it in 4x pixels (8 px per unit)."""
    def __init__(self, prefix, x0, cx, lw=2.6, ink=('ink',)):
        self.c = Crop(prefix, x0, cx)
        self.lw = lw; self.HALF = int(round(lw / 2 * 8))
        self.INK = self.c.m(*ink)
        self.SH = self.INK.shape
        self.yy, self.xx = np.indices(self.SH)
        self.INKN = dil(self.INK, 5)
        self.INK2 = dil(self.INK, 2)
        self.dbg = {}

    def m(self, *names): return self.c.m(*names)
    def P(self, ux, uy): return self.c.px(ux, uy)
    def Y(self, uy): return self.P(0, uy)[1]
    def X(self, ux): return self.P(ux, 0)[0]
    def above(self, uy): return self.yy < self.Y(uy)
    def below(self, uy): return self.yy > self.Y(uy)
    def left(self, ux): return self.xx < self.X(ux)
    def right(self, ux): return self.xx > self.X(ux)

    def line(self, pts, w):
        m = np.zeros(self.SH, np.uint8)
        cv2.polylines(m, [np.array([self.P(*p) for p in pts], np.int32)], False, 1, thickness=max(1, int(w * 8)))
        return m.astype(bool)

    def poly(self, pts):
        m = np.zeros(self.SH, np.uint8)
        cv2.fillPoly(m, [np.array([self.P(*p) for p in pts], np.int32)], 1)
        return m.astype(bool)

    def disk(self, ux, uy, r):
        m = np.zeros(self.SH, np.uint8); cv2.circle(m, self.P(ux, uy), int(r * 8), 1, -1); return m.astype(bool)

    def ellipse(self, e):
        """a filled ellipse from (cx, cy, rx, ry, angle) in units"""
        m = np.zeros(self.SH, np.uint8)
        cv2.ellipse(m, (self.P(e[0], e[1]), (int(e[2] * 16), int(e[3] * 16)), e[4]), 1, -1)
        return m.astype(bool)

    def flood(self, free, seed): return comp_at(free, self.P(*seed))

    def hull(self, m):
        pts = np.argwhere(m)[:, ::-1].astype(np.int32)
        h = cv2.convexHull(pts); o = np.zeros(self.SH, np.uint8); cv2.fillPoly(o, [h], 1); return o.astype(bool)

    def to_ink(self, m, r=None):
        """a fill grown into its ink, to the middle of the line"""
        return m | (dil(m, self.HALF if r is None else r) & self.INK2)

    # ---- markup ----
    def F(self, cls, m, blur=2.0, **kw):
        """a filled path"""
        if not m.any(): return ''
        return '<path class="' + cls + '" d="' + trace(smooth(m, blur), self.c, **kw) + '"/>'

    def S(self, cls, ds):
        """stroke paths (open runs)"""
        cls = {'o': 'ol', 'o2': 'ol2'}.get(cls, cls)
        return ''.join('<path class="' + cls + '" d="' + d + '"/>' for d in ds)

    def INKF(self, m, blur=1.4, turd=10, cls='k-ink'):
        """filled ink detail"""
        return self.F(cls, m, blur=blur, turd=turd)

    def inks(self, m, min_area=40, cls='k-ink', blur=1.4):
        """each ink mark in m as its own filled path, biggest first"""
        return ''.join(self.INKF(x, blur=blur, cls=cls) for a, x_, y_, x in comps(m, min_area))

    def outline(self, region, where=None, min_run=30, bridge=16, cls='o', also=None):
        """strokes along a region's edge wherever the sheet has ink (or `also` says, where a line is hidden or
        tapers off), and where `where` allows"""
        mask = self.INKN if also is None else self.INKN | also
        if where is not None: mask = mask & where
        return self.S(cls, stroke_runs(region, mask, self.c, min_run=min_run, bridge=bridge))

    def closed(self, region, cls='o2'):
        return self.S(cls, [closed_path(region, self.c)])

    # ---- measures, in units ----
    def bbox(self, m): return bbox_units(m, self.c)
    def centre(self, m): return centroid_units(m, self.c)
    def fit_ellipse(self, m):
        (ex, ey), (ew, eh), ea = cv2.fitEllipse(boundary(m).astype(np.float32))
        return [round(v, 2) for v in (*self.c.unit(ex, ey), ew / 16, eh / 16, ea)]

    def save_debug(self, path, masks, base=True):
        """a picture of masks over the class map, to check a step"""
        from PIL import Image
        vis = np.full(self.SH + (3,), 240, np.uint8)
        if base: vis[self.INK] = (60, 60, 60)
        cols = [(230, 60, 40), (40, 140, 230), (60, 190, 90), (240, 180, 30), (170, 80, 220), (30, 200, 200), (240, 110, 170), (120, 120, 40)]
        base_ = vis.copy()
        for i, (k, v) in enumerate(masks.items()):
            c = np.array(cols[i % len(cols)])
            vis[v] = (base_[v] * 0.35 + c * 0.65).astype(np.uint8)
            vis[v & ~ero(v, 2)] = c   # its edge
        Image.fromarray(vis).resize((self.SH[1] // 2, self.SH[0] // 2), Image.NEAREST).save(path)


def head_circle(t, head, below=140):
    """the circle a head's outline follows (where it has ink, above y `below`): centre x, y and radius in units"""
    hb = boundary(head)
    hb = hb[t.INKN[hb[:, 1], hb[:, 0]] & (hb[:, 1] < t.Y(below))].astype(np.float64)
    A = np.c_[2 * hb[:, 0], 2 * hb[:, 1], np.ones(len(hb))]
    (qx, qy, qc), *_ = np.linalg.lstsq(A, hb[:, 0] ** 2 + hb[:, 1] ** 2, rcond=None)
    u = t.c.unit(qx, qy)
    return [round(float(u[0]), 2), round(float(u[1]), 2), round(float(np.sqrt(qc + qx ** 2 + qy ** 2) / 8), 2)]


def measure_lw(prefix):
    """the weight of a drawing's main outline, in units: twice the median depth of the ink along its middle"""
    c = Crop(prefix, 0, 0)
    big = comps(c.m('ink'), 1000)[0][3].astype(np.uint8)
    d = cv2.distanceTransform(big, cv2.DIST_L2, 5)
    v = d[(cv2.dilate(d, np.ones((3, 3))) == d) & (d > 2)]
    return round(2 * float(np.median(v)) / 8, 2)


def raise_angle(c_cheer, c_neutral, pivot, stretch=None):
    """how far a raised wing (cheer) is turned from the hanging one (neutral) about the shoulder, from mask centroids"""
    import math
    cu = c_cheer
    if stretch: cu = (cu[0], stretch[0] - (stretch[0] - cu[1]) / stretch[1])
    a = math.degrees(math.atan2(cu[1] - pivot[1], cu[0] - pivot[0])) - math.degrees(math.atan2(c_neutral[1] - pivot[1], c_neutral[0] - pivot[0]))
    return round((a + 540) % 360 - 180, 1)


def work(bird):
    """the bird's work folder (TRACE_DIR/<bird>, or tools/trace/work/<bird>) and its config"""
    base = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
    cfg = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'birds', bird + '.json')))
    return os.path.join(base, bird), cfg
