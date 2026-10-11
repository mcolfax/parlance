"""Flatten Pip's SVG drawings (drawings.json, exported from pip.js) into colored polygons in rig units.
Fills keep their holes (even-odd); strokes become filled ribbons with round caps and joins, at the widths the
rig uses for a large Pip (outline 2.6 units, beak 1.3). Writes shapes.json:
  { "<slot>/<attachment>": [ {"color": "#rrggbb", "alpha": 1, "polys": [[exterior, hole, ...], ...]}, ... ] }
in draw order within each drawing."""
import io, json, re, sys, math
import numpy as np
from svgelements import SVG, Shape, Path, Move, Line, Close, CubicBezier, QuadraticBezier, Arc, Matrix
from shapely.geometry import Polygon, LineString, MultiPolygon
from shapely.ops import unary_union
from shapely import make_valid

HERE = sys.argv[1] if len(sys.argv) > 1 else '.'
D = json.load(open(HERE + '/drawings.json'))
PAL = D['palette']
LW = D['lines'].get('min', 2.6)
THIN = D['lines'].get('thin', 0.5)
FEATURE = D['lines'].get('feature', 1)
SPACING = 0.45                      # rig units between samples along curves

def color(v):
    v = v.strip()
    m = re.match(r'rgb\((\d+) (\d+) (\d+) / ([\d.]+)\)', v)
    if m: return '#%02X%02X%02X' % tuple(int(m.group(i)) for i in (1, 2, 3)), float(m.group(4))
    return v.upper(), 1.0

def stroke_width(classes, style):
    if style:
        m = re.search(r'stroke-width:calc\(var\(--rig-lw,[\d.]+\) \* ([\d.]+)px\)', style)
        if m: return LW * float(m.group(1))
        m = re.search(r'stroke-width:calc\(([\d.]+)px \+ var\(--rig-lw,[\d.]+\) \* ([\d.]+)px\)', style)
        if m: return float(m.group(1)) + LW * float(m.group(2))
        m = re.search(r'stroke-width:([\d.]+)px', style)
        if m: return float(m.group(1))
    if 'ol2' in classes: return LW * THIN
    if 'ol' in classes or 'o' in classes: return LW
    if 'ln' in classes: return LW * FEATURE
    if 'ln2' in classes: return LW * D['lines'].get('detail', 0.6)
    return None

def paint(classes, style):
    """(fill, stroke, width) for an element from its rig classes"""
    fill = stroke = None
    for c in classes:
        if c.startswith('k-'): fill = color(PAL[c[2:]])
    if {'ol', 'ol2', 'o', 'ln', 'ln2'} & set(classes): stroke = color(PAL['ink'])
    for c in classes:
        if c.startswith('s-'): stroke = color(PAL[c[2:]])
        if c.startswith('t-'): stroke = color(PAL[c[2:]])
    if {'ol', 'ol2', 'ln', 'ln2'} & set(classes) or any(c.startswith('s-') for c in classes): fill = None
    return fill, stroke, stroke_width(classes, style) if stroke else None

def subpaths(shape):
    """list of (points Nx2, closed) in user units, transforms applied"""
    path = Path(shape) if not isinstance(shape, Path) else shape
    path = abs(path)                      # apply the element's transform
    out, cur, closed = [], [], False
    for seg in path:
        if isinstance(seg, Move):
            if len(cur) > 1: out.append((np.array(cur), closed))
            cur = [(seg.end.x, seg.end.y)]; closed = False
        elif isinstance(seg, Close):
            closed = True
            if len(cur) > 1: out.append((np.array(cur), True))
            cur = [(seg.end.x, seg.end.y)] if seg.end is not None else []
        else:
            L = seg.length(error=1e-3) if not isinstance(seg, Line) else math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y)
            n = max(2, int(math.ceil(L / SPACING)) + 1)
            if isinstance(seg, Line): pts = [(seg.end.x, seg.end.y)]
            else:
                ts = np.linspace(0, 1, n)[1:]
                pts = [(p.x, p.y) for p in (seg.point(t) for t in ts)]
            if not cur: cur = [(seg.start.x, seg.start.y)]
            cur.extend(pts)
    if len(cur) > 1: out.append((np.array(cur), closed))
    return out

def clean(g):
    g = make_valid(g)
    if g.is_empty: return []
    geoms = [g] if isinstance(g, Polygon) else [x for x in getattr(g, 'geoms', []) if isinstance(x, Polygon)]
    return [p for p in geoms if p.area > 0.02]

def to_lists(polys):
    out = []
    for p in polys:
        p = p.simplify(0.06)
        ext = [[round(x, 3), round(y, 3)] for x, y in list(p.exterior.coords)[:-1]]
        holes = [[[round(x, 3), round(y, 3)] for x, y in list(h.coords)[:-1]] for h in p.interiors]
        if len(ext) >= 3: out.append([ext] + holes)
    return out

STYLE_RE = re.compile(r'style="([^"]*)"')
def flatten(markup):
    # keep each element's class and style; svgelements reads transforms and geometry
    tagged = re.sub(r'<(path|ellipse|circle)\b', lambda m: '<' + m.group(1) + ' data-i="%d"' % next(counter), markup)
    meta = {}
    for m in re.finditer(r'<(path|ellipse|circle) data-i="(\d+)"([^>]*)/>', tagged):
        attrs = m.group(3)
        cl = re.search(r'class="([^"]*)"', attrs); st = STYLE_RE.search(attrs)
        meta[m.group(2)] = (cl.group(1).split() if cl else [], st.group(1) if st else '')
    # strip style/class so svgelements doesn't try to interpret them
    plain = re.sub(r'\s(class|style)="[^"]*"', '', tagged)
    svg = SVG.parse(io.StringIO('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260">' + plain + '</svg>'), reify=False)
    shapes = []
    for el in svg.elements():
        if not isinstance(el, Shape): continue
        i = el.values.get('data-i')
        if i is None: continue
        classes, style = meta[i]
        fill, stroke, width = paint(classes, style)
        scale = math.sqrt(abs(el.transform.determinant)) if el.transform is not None else 1.0
        subs = subpaths(el)
        if fill:
            g = Polygon()
            for pts, closed in subs:
                if len(pts) >= 3:
                    ring = Polygon(pts)
                    if not ring.is_valid: ring = make_valid(ring)
                    g = g.symmetric_difference(ring)
            polys = clean(g)
            if polys: shapes.append({'color': fill[0], 'alpha': fill[1], 'polys': to_lists(polys)})
        if stroke and width:
            w = width * scale
            parts = []
            for pts, closed in subs:
                line = LineString(np.vstack([pts, pts[:1]]) if closed else pts)
                parts.append(line.buffer(w / 2, quad_segs=6, cap_style='round', join_style='round'))
            polys = clean(unary_union(parts))
            if polys: shapes.append({'color': stroke[0], 'alpha': stroke[1], 'polys': to_lists(polys)})
    return shapes

import itertools
counter = itertools.count()
out, nverts = {}, 0
for p in D['parts']:
    key = p['slot'] + '/' + p['name']
    out[key] = flatten(p['markup'])
    nverts += sum(len(r) for s in out[key] for poly in s['polys'] for r in poly)
json.dump(out, open(HERE + '/shapes.json', 'w'))
print(len(out), 'drawings,', sum(len(v) for v in out.values()), 'shapes,', nverts, 'outline points')
for k in ('head/on', 'wingL/folded', 'mouth/o', 'pupilL/open', 'fxHead/zzz'):
    print(' ', k, [(s['color'], len(s['polys'])) for s in out.get(k, [])])
