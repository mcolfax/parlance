#!/usr/bin/env python3
"""Refine a bird's part sheet into the Track A look (design/rig/v2/PLAN.md, WP4): two-tone cel shade, a rim of light,
tapered ink, eye speculars and feather strokes. Writes design/rig/v2/build/<bird>.parts.json (the shape is documented at
the top of design/rig/v2/look.md) and a before/after contact sheet design/rig/v2/build/<bird>-look.png.

Usage:   python3 design/rig/v2/tools/refine.py pip [--no-sheet] [--tokens]
Needs:   shapely, svgelements, numpy, Pillow (sh design/rig/v2/tools/setup.sh), Node (the part sheet is read with node, as
         design/rig/blender/build/build.sh reads it) and, for the sheet, Playwright (never installed here: NODE_PATH points at
         the global one).
Output is deterministic: the same part sheet gives byte-identical JSON.

Every number below is the plan's. Two signs differ from the plan's text and are explained at "LIGHT" and in look.md."""
import os, sys, json, math, re, io, itertools, subprocess, colorsys

import numpy as np
from shapely import make_valid
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from svgelements import SVG, Shape, Path, Move, Line, Close

HERE = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.abspath(os.path.join(HERE, '..'))
REPO = os.path.abspath(os.path.join(V2, '..', '..', '..'))
BUILD = os.path.join(V2, 'build')

# ------------------------------------------------------------------------------------------------ the plan's numbers
# Light comes from the upper left: direction (-0.6, -0.8) in setup space (y down), the direction TOWARD the light. The
# plan writes the shade as `part - translate(part, -4*d)` and the rim as `part - translate(part, +2.5*d)`; taken literally
# (a translate of the part by a vector v leaves the crescent on the -v side) that puts the shade on the upper left and the
# rim on the lower right, the opposite of the plan's own acceptance ("shade on the lower right") and of "thick away from
# the light". The offsets are therefore applied with the signs that satisfy the acceptance: shade = part - translate(part,
# +4*d) (a crescent on the side away from the light), rim = part - translate(part, -2.5*d) (on the side toward it).
# The sizes (4 and 2.5 units) are the plan's.
LIGHT = (-0.6, -0.8)
SHADE_SHIFT = 4.0
RIM_SHIFT = 2.5
ROUND = 1.2             # buffer(+ROUND).buffer(-ROUND) rounds a crescent
SHADE_MIN = 0.03        # a shade shape under 3% of its part is dropped
RIM_REACH = 3.5         # the rim is kept only within this distance of the outline
RIM_MIN = 1.0           # (not in the plan) a rim fragment under 1 square unit is a speck, dropped
SHADE_L, SHADE_C, SHADE_H = -0.10, 1.05, 8.0   # OKLCH: lightness added, chroma multiplied, hue turned toward blue (degrees)
LIGHT_L, LIGHT_C = 0.08, 0.9
OUTLINE_W, TAPER, W_MIN, W_MAX = 2.6, 0.35, 1.9, 3.4   # outline width 2.6 * (1 + 0.35 * n.(-light)), clamped
THIN = 0.5              # (not in the plan) ol2, the beak's thin outline, is half an outline in the old rig; same rule times 0.5
FEATURE_W, DETAIL_W = 1.6, 1.1                         # ln and ln2
SPEC_R, SPEC_AT = (0.28, (-0.35, -0.35)), (0.12, (0.3, 0.25))   # eye speculars: radius and place, as fractions of the pupil radius
FEATHER_FROM, FEATHER_TO = 0.30, 0.75
SHADED = ('body', 'body2', 'belly', 'beak', 'beak2', 'crest', 'crest2', 'tail', 'tail2', 'feet')   # feather and body colors
SPEC_ON = ('open', 'wide', 'wet', 'lidded')
FEATHERS = {'wingL/folded': 3, 'wingL/spread': 3, 'wingR/folded': 3, 'wingR/open': 3, 'wingR/spread': 3, 'tail/fan': 2}
OUTLINE_OF = {'headLine/on': 'head/on'}    # a drawing whose outline hugs another drawing's fill
STEP = 1.5              # points along an ink line: one about every 1.5 units, every corner kept
CORNER = 35.0
SPACING = 0.45          # sampling of the part sheet's curves, as design/rig/blender/build/flatten.py
SIMPLIFY = 0.06
BLUE = None             # the OKLCH hue of sRGB blue, set below


# ------------------------------------------------------------------------------------------------ OKLCH
def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def gam(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (abs(c) ** (1 / 2.4)) - 0.055


def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def to_oklab(rgb):
    r, g, b = [lin(c) for c in rgb]
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = [math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s)]
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def from_oklab(L, a, b):
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)   # linear sRGB


def to_oklch(rgb):
    L, a, b = to_oklab(rgb)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def from_oklch(L, C, h):
    """sRGB hex; a color outside the gamut loses chroma (not lightness or hue) until it fits"""
    L = min(1.0, max(0.0, L))
    def lin_rgb(c):
        return from_oklab(L, c * math.cos(math.radians(h)), c * math.sin(math.radians(h)))
    def inside(v):
        return all(-1e-4 <= x <= 1 + 1e-4 for x in v)
    if not inside(lin_rgb(C)):
        lo, hi = 0.0, C
        for _ in range(40):
            mid = (lo + hi) / 2
            if inside(lin_rgb(mid)):
                lo = mid
            else:
                hi = mid
        C = lo
    return '#%02X%02X%02X' % tuple(int(round(255 * min(1, max(0, gam(x))))) for x in lin_rgb(C))


BLUE = to_oklch([0.0, 0.0, 1.0])[2]


def toward_blue(h, deg):
    d = (BLUE - h + 540) % 360 - 180          # signed shortest turn from h to blue
    return (h + math.copysign(min(deg, abs(d)), d)) % 360


def shade_light_hex(base):
    L, C, h = to_oklch(hex_rgb(base))
    sh = from_oklch(L + SHADE_L, C * SHADE_C, toward_blue(h, SHADE_H))
    li = from_oklch(L + LIGHT_L, C * LIGHT_C, h)
    return sh, li


# ------------------------------------------------------------------------------------------------ the part sheet
def load_sheet(bird):
    code = """
const R = process.argv[1], bird = process.argv[2];
const Rig = require(R + '/js/core/rig.js'); const B = require(R + '/js/core/' + bird + '.js');
process.stdout.write(JSON.stringify({ id: B.id, name: B.name, palette: B.palette, lines: B.lines, view: B.view,
  parts: Rig.parts(B).map(p => ({ slot: p.slot, name: p.name, bone: p.bone, pivot: p.pivot, markup: p.markup })) }));
"""
    out = subprocess.run(['node', '-e', code, REPO, bird], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def color_of(v):
    m = re.match(r'rgb\((\d+) (\d+) (\d+) / ([\d.]+)\)', v.strip())
    if m:
        return '#%02X%02X%02X' % tuple(int(m.group(i)) for i in (1, 2, 3)), float(m.group(4))
    return v.strip().upper(), 1.0


STYLE_RE = re.compile(r'style="([^"]*)"')


def subpaths(shape):
    """[(points Nx2, closed)] in user units, transforms applied (as flatten.py)"""
    path = Path(shape) if not isinstance(shape, Path) else shape
    path = abs(path)
    out, cur = [], []
    for seg in path:
        if isinstance(seg, Move):
            if len(cur) > 1:
                out.append((np.array(cur), False))
            cur = [(seg.end.x, seg.end.y)]
        elif isinstance(seg, Close):
            if len(cur) > 1:
                out.append((np.array(cur), True))
            cur = [(seg.end.x, seg.end.y)] if seg.end is not None else []
        else:
            L = seg.length(error=1e-3) if not isinstance(seg, Line) else math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y)
            n = max(2, int(math.ceil(L / SPACING)) + 1)
            if isinstance(seg, Line):
                pts = [(seg.end.x, seg.end.y)]
            else:
                pts = [(p.x, p.y) for p in (seg.point(t) for t in np.linspace(0, 1, n)[1:])]
            if not cur:
                cur = [(seg.start.x, seg.start.y)]
            cur.extend(pts)
    if len(cur) > 1:
        out.append((np.array(cur), False))
    return out


def style_width(style, lw):
    """a stroke width written in the element's style: ('rel', multiple of the line width) or ('abs', units) or None"""
    if style:
        m = re.search(r'stroke-width:calc\(var\(--rig-lw,[\d.]+\) \* ([\d.]+)px\)', style)
        if m:
            return ('rel', float(m.group(1)))
        m = re.search(r'stroke-width:calc\(([\d.]+)px \+ var\(--rig-lw,[\d.]+\) \* ([\d.]+)px\)', style)
        if m:
            return ('rel', (float(m.group(1)) + lw * float(m.group(2))) / lw)
        m = re.search(r'stroke-width:([\d.]+)px', style)
        if m:
            return ('abs', float(m.group(1)))
    return None


def parse_markup(markup, lw):
    """The elements of one drawing, in paint order: dicts with 'fill' (role or None), 'stroke' (None, or role, kind, width)"""
    counter = itertools.count()
    tagged = re.sub(r'<(path|ellipse|circle)\b', lambda m: '<%s data-i="%d"' % (m.group(1), next(counter)), markup)
    meta = {}
    for m in re.finditer(r'<(path|ellipse|circle) data-i="(\d+)"([^>]*)/>', tagged):
        attrs = m.group(3)
        cl = re.search(r'class="([^"]*)"', attrs)
        st = STYLE_RE.search(attrs)
        meta[m.group(2)] = (cl.group(1).split() if cl else [], st.group(1) if st else '')
    plain = re.sub(r'\s(class|style)="[^"]*"', '', tagged)
    svg = SVG.parse(io.StringIO('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260">' + plain + '</svg>'), reify=False)
    out = []
    for el in svg.elements():
        if not isinstance(el, Shape):
            continue
        i = el.values.get('data-i')
        if i is None:
            continue
        classes, style = meta[i]
        scale = math.sqrt(abs(el.transform.determinant)) if el.transform is not None else 1.0
        fill = None
        for c in classes:
            if c.startswith('k-'):
                fill = c[2:]
        stroke = None
        sw = style_width(style, lw)
        line = {'ol': ('outline', 1.0), 'o': ('outline', 1.0), 'ol2': ('outline', THIN), 'ln': ('feature', None), 'ln2': ('detail', None)}
        for c in classes:
            if c in line:
                stroke = {'role': 'ink', 'kind': line[c][0], 'mult': line[c][1]}
                if c in ('ol', 'ol2', 'ln', 'ln2'):
                    fill = None
            elif c.startswith('s-') or c.startswith('t-'):
                stroke = {'role': c[2:], 'kind': 'fx', 'mult': None}
                if c.startswith('s-'):
                    fill = None
        if stroke is not None:
            if sw and sw[0] == 'abs':
                stroke.update(kind='fixed', w=sw[1] * scale)           # px in the style: does not grow with the line width
            elif sw:
                stroke.update(kind='feature', w=sw[1] * lw)            # a multiple of --rig-lw: grows with it, so an ink line
                stroke['rel'] = True
            elif stroke['kind'] == 'feature':
                stroke['w'] = FEATURE_W
            elif stroke['kind'] == 'detail':
                stroke['w'] = DETAIL_W
        out.append({'fill': fill, 'stroke': stroke, 'subs': subpaths(el), 'scale': scale})
    return out


def fill_polys(subs, min_area=0.02):
    """the filled shape of an element (even-odd over its subpaths) as shapely polygons"""
    g = Polygon()
    for pts, closed in subs:
        if len(pts) >= 3:
            ring = Polygon(pts)
            if not ring.is_valid:
                ring = make_valid(ring)
            g = g.symmetric_difference(ring)
    return polys_of(make_valid(g) if not g.is_valid else g, min_area)


def polys_of(g, min_area=0.0):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        geoms = [g]
    else:
        geoms = [x for x in getattr(g, 'geoms', []) if isinstance(x, Polygon)]
    return [p for p in geoms if p.area > min_area]


# ------------------------------------------------------------------------------------------------ ink lines
def resample(P, closed, step=STEP):
    """A dense polyline resampled to one point about every `step` units; every vertex that turns by more than CORNER stays."""
    Q = []
    for p in P:
        if not Q or math.hypot(p[0] - Q[-1][0], p[1] - Q[-1][1]) > 1e-6:
            Q.append((float(p[0]), float(p[1])))
    if closed and len(Q) > 1 and math.hypot(Q[0][0] - Q[-1][0], Q[0][1] - Q[-1][1]) <= 1e-6:
        Q.pop()
    n = len(Q)
    if n < 3:
        return Q

    def turn(i):
        a, b, c = Q[i - 1], Q[i], Q[(i + 1) % n]
        v1, v2 = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
        return math.degrees(abs(math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1])))
    rng = range(n) if closed else range(1, n - 1)
    corners = [i for i in rng if turn(i) > CORNER]
    anchors = ([0] if not closed else []) + corners + ([n - 1] if not closed else [])
    if closed and not anchors:
        anchors = [0]
    pts, corner_at = [], []
    spans = list(zip(anchors, anchors[1:] + ([anchors[0]] if closed else [])))
    for a, b in spans:
        idx = [a]
        k = a
        while True:
            k = (k + 1) % n
            idx.append(k)
            if k == b:
                break
            if len(idx) > n + 1:
                break
        seg = [Q[i] for i in idx]
        cum = [0.0]
        for u, v in zip(seg[:-1], seg[1:]):
            cum.append(cum[-1] + math.hypot(v[0] - u[0], v[1] - u[1]))
        L = cum[-1]
        m = max(1, int(round(L / step)))
        for j in range(m):
            s = L * j / m
            k = max(i for i in range(len(cum)) if cum[i] <= s + 1e-9)
            k = min(k, len(seg) - 2)
            u = 0 if cum[k + 1] == cum[k] else (s - cum[k]) / (cum[k + 1] - cum[k])
            if j == 0 and a in corners:
                corner_at.append(len(pts))
            pts.append((seg[k][0] + (seg[k + 1][0] - seg[k][0]) * u, seg[k][1] + (seg[k + 1][1] - seg[k][1]) * u))
    if not closed:
        pts.append(Q[-1])
    # A corner is two points a hair either side of it, so the ribbon there has the width of its two sides (one point with
    # an averaged normal would pinch the line and open a notch on the outside of the turn).
    if corner_at:
        out, n = [], len(pts)
        for i, p in enumerate(pts):
            if i not in corner_at:
                out.append(p)
                continue
            a, b = pts[(i - 1) % n], pts[(i + 1) % n]
            da, db = math.hypot(a[0] - p[0], a[1] - p[1]) or 1.0, math.hypot(b[0] - p[0], b[1] - p[1]) or 1.0
            e = min(0.2, da / 3, db / 3)
            out.append((p[0] + (a[0] - p[0]) / da * e, p[1] + (a[1] - p[1]) / da * e))
            out.append((p[0] + (b[0] - p[0]) / db * e, p[1] + (b[1] - p[1]) / db * e))
        pts = out
    return pts


def cap(P, w):
    """Round caps for an open line: three more points past each end that close its end like a half circle."""
    P, w = list(P), list(w)
    for end in (0, 1):
        a, b = (P[0], P[1]) if end == 0 else (P[-1], P[-2])
        L = math.hypot(a[0] - b[0], a[1] - b[1]) or 1.0
        tx, ty = (a[0] - b[0]) / L, (a[1] - b[1]) / L
        r = (w[0] if end == 0 else w[-1]) / 2
        ext = [((a[0] + tx * r * d, a[1] + ty * r * d), (w[0] if end == 0 else w[-1]) * k) for d, k in ((0.5, 0.87), (0.87, 0.5), (1.0, 0.05))]
        if end == 0:
            P = [e[0] for e in ext][::-1] + P
            w = [e[1] for e in ext][::-1] + w
        else:
            P = P + [e[0] for e in ext]
            w = w + [e[1] for e in ext]
    return P, w


def tangents(P, closed):
    n = len(P)
    T = []
    for i in range(n):
        a = P[(i - 1) % n] if closed else P[max(i - 1, 0)]
        b = P[(i + 1) % n] if closed else P[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1.0
        T.append((tx / L, ty / L))
    return T


def smooth(v, closed, passes=2):
    n = len(v)
    for _ in range(passes):
        w = []
        for i in range(n):
            a = v[(i - 1) % n] if closed else v[max(i - 1, 0)]
            b = v[(i + 1) % n] if closed else v[min(i + 1, n - 1)]
            w.append((a + 2 * v[i] + b) / 4)
        v = w
    return v


def outline_widths(P, closed, ref, mult):
    """The plan's tapered outline: 2.6 * (1 + 0.35 * n.(-light)), clamped to [1.9, 3.4] (times mult for the thin outline),
    n being the normal that points out of the part `ref` (a shapely geometry; None: away from the line's own centre)."""
    T = tangents(P, closed)
    n = len(P)
    side = 0
    if ref is not None and not ref.is_empty:
        for (x, y), (tx, ty) in zip(P, T):
            nx, ny = ty, -tx
            a = ref.contains(Point(x + 1.2 * nx, y + 1.2 * ny))
            b = ref.contains(Point(x - 1.2 * nx, y - 1.2 * ny))
            if a and not b:
                side -= 1
            elif b and not a:
                side += 1
    else:
        cx = sum(p[0] for p in P) / n
        cy = sum(p[1] for p in P) / n
        for (x, y), (tx, ty) in zip(P, T):
            side += 1 if ((x - cx) * ty - (y - cy) * tx) < 0 else -1
    side = 1 if side >= 0 else -1
    w = []
    for (tx, ty) in T:
        nx, ny = side * ty, side * -tx
        away = nx * -LIGHT[0] + ny * -LIGHT[1]          # n . (-light): +1 facing away from the light
        w.append(min(W_MAX, max(W_MIN, OUTLINE_W * (1 + TAPER * away))))
    w = smooth(w, closed)
    return [round(min(W_MAX, max(W_MIN, x)) * mult + 0.0, 2) for x in w]


def ribbon(P, w, closed, scale=1.0):
    """A tapered ink line as polygons, exactly as js/core/rig2.js does: each point is offset by +-w/2 along its averaged
    normal. A closed line gives two loops (outer and inner, even-odd); an open line gives one polygon."""
    n = len(P)
    A, B = [], []
    for i in range(n):
        p = P[(i - 1) % n] if closed else P[max(i - 1, 0)]
        q = P[(i + 1) % n] if closed else P[min(i + 1, n - 1)]
        tx, ty = q[0] - p[0], q[1] - p[1]
        L = math.hypot(tx, ty) or 1.0
        tx, ty = tx / L, ty / L
        h = w[i] * scale / 2
        A.append((P[i][0] - ty * h, P[i][1] + tx * h))
        B.append((P[i][0] + ty * h, P[i][1] - tx * h))
    if closed:
        return [A, B]
    return [A + B[::-1]]


# ------------------------------------------------------------------------------------------------ a drawing being built
def rnd(v):
    return round(v, 2) + 0.0


def ring_pts(coords):
    out = []
    for x, y in coords:
        p = (rnd(x), rnd(y))
        if not out or p != out[-1]:
            out.append(p)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    return out


class Drawing:
    def __init__(self, key, part):
        self.key, self.slot, self.name, self.bone, self.pivot = key, part['slot'], part['name'], part['bone'], part['pivot']
        self.pts, self.loops, self.layers = [], [], []
        self.base = None            # the layer whose skin weights the drawing's other layers share

    def loop(self, pts):
        self.loops.append([len(self.pts) // 2, len(pts)])
        for x, y in pts:
            self.pts += [x, y]
        return len(self.loops) - 1

    def polygon(self, poly, role, kind, of=None, a=None):
        """a fill layer from a shapely polygon: its exterior counter-clockwise on screen, holes clockwise"""
        poly = orient(poly, -1.0)
        ext = ring_pts(poly.exterior.coords)
        if len(ext) < 4:
            return None
        ids = [self.loop(ext)]
        for h in poly.interiors:
            hp = ring_pts(h.coords)
            if len(hp) >= 4:
                ids.append(self.loop(hp))
        L = {'fill': role, 'loops': ids, 'kind': kind}
        if a is not None:
            L['a'] = a
        if of is not None:
            L['of'] = of
        self.layers.append(L)
        return len(self.layers) - 1

    def ink(self, P, w, closed, role, kind, of=None):
        """an ink layer: the centre line as a loop plus a width per point (open: 1 for a line that is not a loop)"""
        pts = [(rnd(x), rnd(y)) for x, y in P]
        if closed:
            sh = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2
            if sh > 0:                                       # counter-clockwise on screen is a negative area
                pts, w = pts[::-1], w[::-1]
        if len(pts) < 2:
            return None
        L = {'ink': role, 'loop': self.loop(pts), 'w': [rnd(x) for x in w], 'kind': kind}
        if not closed:
            L['open'] = 1
        if of is not None:
            L['of'] = of
        self.layers.append(L)
        return len(self.layers) - 1


# ------------------------------------------------------------------------------------------------ shade, rim, feathers, eyes
def crescents(P, base_area):
    """(shade pieces, rim pieces) of a part, as shapely polygons"""
    sv = (SHADE_SHIFT * LIGHT[0], SHADE_SHIFT * LIGHT[1])
    rv = (-RIM_SHIFT * LIGHT[0], -RIM_SHIFT * LIGHT[1])
    s = P.difference(affinity.translate(P, sv[0], sv[1]))
    s = s.buffer(ROUND).buffer(-ROUND).intersection(P)
    shade = [q.simplify(0.05) for q in polys_of(s) if q.area >= SHADE_MIN * base_area]
    r = P.difference(affinity.translate(P, rv[0], rv[1]))
    r = r.buffer(ROUND).buffer(-ROUND).intersection(P).intersection(P.boundary.buffer(RIM_REACH))
    rim = [q.simplify(0.05) for q in polys_of(r) if q.area >= RIM_MIN]
    return shade, rim


def feather_strokes(P, pivot, count):
    """`count` tapered ln2 strokes inside the part, from 30% to 75% of the way along its long axis (from the pivot end),
    each following the outline of the side away from the light at an inward offset of i/(count+1) of the local half-width."""
    ext = P.exterior
    N = 400
    B = np.array([[ext.interpolate(k * ext.length / N).x, ext.interpolate(k * ext.length / N).y] for k in range(N)])
    c = B.mean(axis=0)
    ev, vec = np.linalg.eigh(np.cov((B - c).T))
    u = vec[:, int(np.argmax(ev))]
    if np.dot(np.array(pivot) - c, u) > 0:
        u = -u                                   # u runs from the pivot toward the tip
    v = np.array([-u[1], u[0]])
    s = (B - c) @ u
    smin, smax = float(s.min()), float(s.max())
    away = np.array([-LIGHT[0], -LIGHT[1]])
    out = []
    for f in [(i + 1) / (count + 1) for i in range(count)]:
        line = []
        M = 14
        for k in range(M):
            t = FEATHER_FROM + (FEATHER_TO - FEATHER_FROM) * k / (M - 1)
            o = c + (smin + t * (smax - smin)) * u
            cut = P.intersection(LineString([tuple(o - 400 * v), tuple(o + 400 * v)]))
            segs = [g for g in getattr(cut, 'geoms', [cut]) if isinstance(g, LineString) and not g.is_empty]
            if not segs:
                continue
            g = max(segs, key=lambda q: q.length)
            e0, e1 = np.array(g.coords[0]), np.array(g.coords[-1])
            if g.length < 3:
                continue
            es, ec = (e0, e1) if np.dot(e0, away) >= np.dot(e1, away) else (e1, e0)
            hw = np.linalg.norm(ec - es) / 2
            q = es + (ec - es) / (2 * hw) * (f * hw)
            line.append((float(q[0]), float(q[1])))
        if len(line) < 4:
            continue
        xs = smooth([p[0] for p in line], False)
        ys = smooth([p[1] for p in line], False)
        line = list(zip(xs, ys))
        n = len(line)
        w = [DETAIL_W * max(0.2, max(0.0, math.sin(math.pi * k / (n - 1))) ** 0.6) for k in range(n)]
        out.append((line, w))
    return out


def eye_specs(pupil_polys):
    """the two specular dots of a pupil (shapely polygons, bounding box centre and half-sizes as the pupil's centre and radius)"""
    g = unary_union(pupil_polys)
    x0, y0, x1, y1 = g.bounds
    cx, cy, R = (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) + (y1 - y0)) / 4
    return [Point(cx + at[0] * R, cy + at[1] * R).buffer(r * R, quad_segs=8) for r, at in (SPEC_R, SPEC_AT)]


# ------------------------------------------------------------------------------------------------ the whole bird
def refine(sheet, palette_out):
    lw = sheet['lines'].get('min', OUTLINE_W)
    parsed = {}
    for p in sheet['parts']:
        parsed[p['slot'] + '/' + p['name']] = (p, parse_markup(p['markup'], lw))
    fills = {}                                   # key -> union of the drawing's fills (what its outline encloses)
    for key, (p, els) in parsed.items():
        gs = [q for e in els if e['fill'] for q in fill_polys(e['subs'])]
        fills[key] = unary_union(gs) if gs else None
    alpha = {}
    for role, v in sheet['palette'].items():
        h, a = color_of(v)
        alpha[role] = a
    drawings, stats = {}, {'shade': 0, 'light': 0, 'feather': 0, 'spec': 0}
    for key, (part, els) in parsed.items():
        D = Drawing(key, part)
        ref = fills.get(OUTLINE_OF.get(key, key))
        pupil_done = False
        main = None
        for e in els:
            base_idx = None
            first_polys = []
            if e['fill']:
                role = e['fill']
                a = alpha.get(role)
                a = round(a, 2) if a is not None and a < 0.999 else None
                polys = [q.simplify(SIMPLIFY) for q in fill_polys(e['subs'])]
                first_polys = polys
                part_area = sum(q.area for q in polys)
                bases = [D.polygon(q, role, 'fill', a=a) for q in polys]
                bases = [b for b in bases if b is not None]
                if bases and main is None and role in SHADED:
                    main = bases[0]
                base_idx = bases[0] if bases else None
                if role in SHADED and polys:
                    P = unary_union(polys)
                    shade, rim = crescents(P, part_area)
                    for q in shade:
                        D.polygon(q, role + '-shade', 'shade', of=pick_base(D, bases, q))
                        stats['shade'] += 1
                    for q in rim:
                        D.polygon(q, role + '-light', 'light', of=pick_base(D, bases, q))
                        stats['light'] += 1
                    if key in FEATHERS and main is not None and base_idx == main:
                        big = max(polys, key=lambda q: q.area)
                        for line, w in feather_strokes(big, part['pivot'], FEATHERS[key]):
                            D.ink(line, [rnd(x) for x in w], False, 'ink', 'feather', of=main)
                            stats['feather'] += 1
                if key.split('/')[0] in ('pupilL', 'pupilR') and key.split('/')[1] in SPEC_ON and role == 'ink' and not pupil_done:
                    pupil_done = True
                    for dot in eye_specs(polys):
                        D.polygon(dot, 'eye-spec', 'spec')
                        stats['spec'] += 1
            st = e['stroke']
            if st is not None:
                of = main if main is not None else base_idx
                for pts, closed_path in e['subs']:
                    closed = closed_path or (len(pts) > 2 and math.hypot(*(pts[0] - pts[-1])) < 0.05)
                    if st['kind'] == 'fixed' or (st['kind'] == 'fx'):
                        w = st.get('w') or 1.0
                        line = LineString(np.vstack([pts, pts[:1]]) if closed else pts)
                        for q in polys_of(line.buffer(w / 2, quad_segs=6).simplify(0.05), 0.02):
                            D.polygon(q, st['role'], 'stroke', of=of)
                        continue
                    P = resample(pts, closed)
                    if len(P) < 2:
                        continue
                    if st['kind'] == 'outline':
                        w = outline_widths(P, closed, ref if ref is not None else None, st['mult'])
                    else:
                        w = [rnd(st['w'])] * len(P)
                    if not closed:
                        P, w = cap(P, w)
                    D.ink(P, w, closed, st['role'], st['kind'], of=of)
        D.base = main if main is not None else (next((i for i, L in enumerate(D.layers) if 'fill' in L), None))
        drawings[key] = D
    return drawings, stats


def pick_base(D, bases, q):
    """the base layer (of an element's islands) a shade or rim piece belongs to"""
    if len(bases) == 1:
        return bases[0]
    pt = q.representative_point()
    best, bd = bases[0], None
    for b in bases:
        ring = D.layers[b]['loops'][0]
        s, n = D.loops[ring]
        poly = Polygon([(D.pts[2 * (s + i)], D.pts[2 * (s + i) + 1]) for i in range(n)])
        d = poly.distance(pt)
        if bd is None or d < bd:
            best, bd = b, d
    return best


def layer_poly(D, L):
    rings = []
    for li in L['loops']:
        st, n = D.loops[li]
        rings.append([(D.pts[2 * (st + i)], D.pts[2 * (st + i) + 1]) for i in range(n)])
    return Polygon(rings[0], rings[1:])


def verify(drawings):
    """No shade, rim or speck of the refined look may leave the part it is drawn on (so none crosses an outline), and a
    feather stroke stays inside its wing or tail. Returns the problems."""
    bad, worst = [], 0.0
    for key, D in drawings.items():
        for i, L in enumerate(D.layers):
            if L.get('kind') in ('shade', 'light') and 'of' in L:
                base = layer_poly(D, D.layers[L['of']])
                out = layer_poly(D, L).difference(base.buffer(0.1)).area
                worst = max(worst, out)
                if out > 0.05:
                    bad.append('%s layer %d (%s) leaves its part by %.2f square units' % (key, i, L['kind'], out))
            if L.get('kind') == 'feather':
                base = layer_poly(D, D.layers[L['of']])
                st, n = D.loops[L['loop']]
                for j in range(n):
                    if not base.buffer(0.3).contains(Point(D.pts[2 * (st + j)], D.pts[2 * (st + j) + 1])):
                        bad.append('%s layer %d: a feather stroke point is outside its part' % (key, i))
                        break
    return bad, worst


# ------------------------------------------------------------------------------------------------ tokens
def token_rows(sheet, drawings):
    used = []
    for D in drawings.values():
        for L in D.layers:
            if 'fill' in L and L['fill'].endswith('-shade'):
                r = L['fill'][:-6]
                if r not in used:
                    used.append(r)
    used = [r for r in SHADED if r in used]
    rows = []
    for r in used:
        base = color_of(sheet['palette'][r])[0]
        sh, li = shade_light_hex(base)
        rows.append((r, base, sh, li))
    return rows


def tokens_css(rows):
    lines = ['  /* shade, rim light and eye speculars of the refined look (design/rig/v2/tools/refine.py computes them from the base in',
             '     OKLCH: shade L-0.10 C*1.05 hue 8deg toward blue; light L+0.08 C*0.9). Pip\'s colors have no dark-mode variants, so',
             '     these hold in both modes. */']
    parts = []
    for r, base, sh, li in rows:
        parts.append('--pip-%s-shade:%s; --pip-%s-light:%s;' % (r, sh, r, li))
    line = '  '
    for p in parts:
        if len(line) + len(p) > 118:
            lines.append(line.rstrip())
            line = '  '
        line += p + ' '
    lines.append(line.rstrip())
    lines.append('  --pip-eye-spec:#FFFFFF;')
    return '\n'.join(lines)


def check_tokens(rows):
    """tokens.css must hold exactly the values the rule gives: in :root, and no dark-mode override that differs"""
    css = open(os.path.join(REPO, 'styles', 'tokens.css')).read()
    bad = []
    for r, base, sh, li in rows:
        for name, want in (('--pip-%s-shade' % r, sh), ('--pip-%s-light' % r, li)):
            got = re.findall(re.escape(name) + r':\s*(#[0-9A-Fa-f]{6})', css)
            if not got:
                bad.append('%s is missing' % name)
            elif any(g.upper() != want.upper() for g in got):
                bad.append('%s is %s, the rule gives %s' % (name, ','.join(got), want))
    if not re.search(r'--pip-eye-spec:\s*#FFFFFF', css, re.I):
        bad.append('--pip-eye-spec is missing')
    return bad


# ------------------------------------------------------------------------------------------------ contact sheet
def drawing_svg(D, lw, minw):
    """one drawing as SVG markup, painted as rig2.js would: fills, and each ink line as a ribbon scaled by lw / min"""
    k = lw / minw
    extra = max(0.0, lw - minw) * 0.6
    s = ''
    for L in D['layers']:
        d = ''
        if 'ink' in L:
            lp = D['loops'][L['loop']]
            P = [(D['pts'][2 * (lp[0] + i)], D['pts'][2 * (lp[0] + i) + 1]) for i in range(lp[1])]
            for ring in ribbon(P, L['w'], not L.get('open'), k):
                d += 'M' + 'L'.join('%.2f %.2f' % p for p in ring) + 'Z'
            role = L['ink']
        else:
            for li in L['loops']:
                lp = D['loops'][li]
                d += 'M' + 'L'.join('%.2f %.2f' % (D['pts'][2 * (lp[0] + i)], D['pts'][2 * (lp[0] + i) + 1]) for i in range(lp[1])) + 'Z'
            role = L['fill']
        style = ''
        if role == 'ink' and extra > 0.02:
            style = ' style="stroke:var(--pip-ink);stroke-width:%.3fpx;stroke-linejoin:round"' % extra
        op = ' opacity="%.2f"' % L['a'] if L.get('a') is not None and role != 'shadow' else ''
        s += '<path class="k-%s" fill-rule="evenodd" d="%s"%s%s/>' % (role, d, op, style)
    return s


FRAMES_JS = r"""
const R = process.argv[1], bird = process.argv[2], moods = process.argv[3].split(','), sizes = process.argv[4].split(',').map(Number);
const Rig = require(R + '/js/core/rig.js'); const B = require(R + '/js/core/' + bird + '.js');
const out = { css: Rig.css(B), view: B.view, min: (B.lines || {}).min || 1.7, moods: {} };
for (const m of moods) {
  const { c, d, W, A } = Rig.staticFrame(B, m);
  const order = c.slots.slice().sort((a, b) => d.z[a.i] - d.z[b.i] || a.i - b.i);
  const frame = [];
  for (const sl of order) { const att = d.s[sl.i]; if (att == null || !sl.parts[att]) continue; const a = A[sl.bone]; if (a <= 0.001) continue; frame.push({ slot: sl.id, att, m: W[sl.bone], a }); }
  out.moods[m] = { frame, old: {}, lw: {} };
  for (const px of sizes) { out.moods[m].old[px] = Rig.svg(B, m, { size: px }); out.moods[m].lw[px] = Rig.lineWidth(B, px, B.view); }
}
process.stdout.write(JSON.stringify(out));
"""


def make_sheet(sheet, drawings_json, rows, out_png, sizes=(240, 72), moods=('happy', 'cheer', 'oops')):
    moods, sizes = list(moods), list(sizes)
    fr = json.loads(subprocess.run(['node', '-e', FRAMES_JS, REPO, sheet['id'], ','.join(moods), ','.join(map(str, sizes))],
                                   check=True, capture_output=True, text=True).stdout)
    view = fr['view']
    roles = list(sheet['palette'].keys())
    css = fr['css'] + ''.join('.rig-%s .k-%s-%s{fill:var(--%s-%s-%s)}' % (sheet['id'], r, k, sheet['id'], r, k) for r, _, _, _ in rows for k in ('shade', 'light'))
    css += '.rig-%s .k-eye-spec{fill:var(--%s-eye-spec)}' % (sheet['id'], sheet['id'])
    cells = ''
    for m in moods:
        cells += '<div class="row">'
        for px in sizes:
            lw = fr['moods'][m]['lw'][str(px)]
            old = fr['moods'][m]['old'][str(px)]
            old = re.sub(r'<style>.*?</style>', '', old, flags=re.S)
            new = ('<svg xmlns="http://www.w3.org/2000/svg" class="rig rig-%s" viewBox="%s" style="--rig-lw:%.3f" width="%d" height="%d">'
                   % (sheet['id'], ' '.join(map(str, view)), lw, px, round(px * view[3] / view[2])))
            for it in fr['moods'][m]['frame']:
                key = it['slot'] + '/' + it['att']
                if key not in drawings_json['drawings']:
                    continue
                mat = ' '.join('%.3f' % v for v in it['m'])
                new += '<g transform="matrix(%s)"%s>%s</g>' % (mat, ' opacity="%.3f"' % it['a'] if it['a'] < 0.999 else '', drawing_svg(drawings_json['drawings'][key], lw, fr['min']))
            new += '</svg>'
            cells += '<div class="c"><b>%s %d px before</b>%s</div><div class="c"><b>after</b>%s</div>' % (m, px, old, new)
        cells += '</div>'
    html = ('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="file://%s"><style>%s'
            'body{margin:0;background:var(--bg);color:var(--ink);font:12px ui-monospace,monospace}'
            '.row{display:flex;gap:8px;padding:6px 8px;align-items:flex-end}.c{background:var(--surface);border-radius:12px;padding:20px 6px 4px;position:relative;line-height:0}'
            '.c b{position:absolute;left:8px;top:4px;font-weight:400;line-height:1.2;color:var(--muted)}</style><body>%s'
            % (os.path.join(REPO, 'styles', 'tokens.css'), css, cells))
    os.makedirs(BUILD, exist_ok=True)
    page = os.path.join(BUILD, sheet['id'] + '-look.html')
    open(page, 'w').write(html)
    env = dict(os.environ)
    try:
        env['NODE_PATH'] = subprocess.run(['npm', 'root', '-g'], check=True, capture_output=True, text=True).stdout.strip()
    except Exception:
        pass
    shots = [os.path.join(BUILD, '.%s-%s.png' % (sheet['id'], t)) for t in ('light', 'dark')]
    subprocess.run(['node', os.path.join(HERE, 'look_shot.js'), page] + shots, check=True, env=env)
    from PIL import Image
    A, B = Image.open(shots[0]), Image.open(shots[1])
    img = Image.new('RGB', (A.width + B.width, max(A.height, B.height)))
    img.paste(A, (0, 0))
    img.paste(B, (A.width, 0))
    img.save(out_png, optimize=True)
    for s in shots:
        os.remove(s)
    os.remove(page)


# ------------------------------------------------------------------------------------------------ main
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]
    bird = args[0] if args else 'pip'
    sheet = load_sheet(bird)
    drawings, stats = refine(sheet, None)
    rows = token_rows(sheet, drawings)
    palette = {}
    for r, v in sheet['palette'].items():
        palette[r] = v
    for r, base, sh, li in rows:
        palette[r + '-shade'] = sh
        palette[r + '-light'] = li
    palette['eye-spec'] = '#FFFFFF'
    roles = list(palette.keys())
    out = {'format': 'parlance-parts', 'v': 1, 'id': sheet['id'], 'name': sheet['name'], 'light': list(LIGHT), 'lines': sheet['lines'],
           'view': sheet['view'], 'palette': palette, 'roles': roles, 'drawings': {}}
    for key, D in drawings.items():
        d = {'slot': D.slot, 'bone': D.bone, 'pivot': D.pivot, 'pts': D.pts, 'loops': D.loops, 'layers': D.layers}
        if D.base is not None:
            d['base'] = D.base
        out['drawings'][key] = d
    os.makedirs(BUILD, exist_ok=True)
    dest = os.path.join(BUILD, bird + '.parts.json')
    open(dest, 'w').write(json.dumps(out, separators=(',', ':')))
    npts = sum(len(D.pts) // 2 for D in drawings.values())
    nlayers = sum(len(D.layers) for D in drawings.values())
    print('%s: %d drawings, %d layers, %d points, %d bytes -> %s' % (bird, len(drawings), nlayers, npts, os.path.getsize(dest), os.path.relpath(dest, REPO)))
    print('added: %(shade)d shade, %(light)d light, %(feather)d feather strokes, %(spec)d eye speculars' % stats)
    print('OKLCH (shade: L-0.10 C*1.05 hue 8 deg toward blue (%.1f); light: L+0.08 C*0.9). Pip has no dark-mode color variants, so the dark values equal these:' % BLUE)
    for r, base, sh, li in rows:
        L, C, h = to_oklch(hex_rgb(base))
        print('  %-7s base %s (L %.3f C %.3f h %5.1f)  shade %s  light %s' % (r, base, L, C, h, sh, li))
    print('  eye-spec #FFFFFF (white in both modes)')
    if '--tokens' in flags:
        print(tokens_css(rows))
    bad = check_tokens(rows)
    problems, worst = verify(drawings)
    print('check: no shade or rim leaves its part (worst %.3f square units outside a 0.1 margin)' % worst if not problems else 'check: FAILED')
    bad += problems
    for b in bad:
        print('TOKENS: ' + b)
    if '--no-sheet' not in flags:
        make_sheet(sheet, out, rows, os.path.join(BUILD, bird + '-look.png'))
        print('sheet -> design/rig/v2/build/%s-look.png' % bird)
    for f in flags:
        if f.startswith('--zoom='):          # a larger look at some moods, for checking: --zoom=480 (not committed)
            z = os.path.join(BUILD, bird + '-look-zoom.png')
            make_sheet(sheet, out, rows, z, sizes=(int(f[7:]),), moods=sys.argv[sys.argv.index(f) + 1].split(',') if False else ('happy', 'cheer', 'oops'))
            print('zoom sheet -> ' + os.path.relpath(z, REPO))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
