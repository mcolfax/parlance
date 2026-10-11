"""Render traced parts (design/birds/out/<bird>.json) as an SVG next to the sheet, for checking a trace.
    python3 design/birds/preview.py pip happy   ->  design/birds/out/pip-happy.svg (open in a browser)"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
bird, pose = sys.argv[1], sys.argv[2]
data = json.load(open(os.path.join(HERE, 'out', bird + '.json')))
cfg = json.load(open(os.path.join(HERE, 'birds.json')))[bird]
x0, y0, x1, y1 = cfg['poses'][pose]['box']
order = [p['name'] for p in cfg['poses'][pose]['parts']][::-1]   # back to front
colors = data['colors']
def fill(l):
    if 'fill' in l: return l['fill']
    if 'mix' in l:
        reg, pct, k = l['mix']; return 'color-mix(in srgb, %s %d%%, %s)' % (colors[reg], pct, k)
    c = l.get('cls', '')
    if c == 'b-ink': return data['ink']
    if c == 'b-mouth': return '#41281A'
    if c == 'b-tongue': return '#EA6138'
    if c.startswith('r-'): return colors[c[2:]]
    return '#f0f'
import re
pts = [(float(a), float(b)) for n in order for l in data['poses'][pose].get(n, []) for a, b in re.findall(r'(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)', l['d'])]
if cfg['poses'][pose].get('register'):   # registered poses are in happy-pose coordinates
    x0 = int(min(p[0] for p in pts)) - 10; x1 = int(max(p[0] for p in pts)) + 10; y0 = int(min(p[1] for p in pts)) - 10; y1 = int(max(p[1] for p in pts)) + 10
    sx0, sy0, sx1, sy1 = cfg['poses'][pose]['box']
else: sx0, sy0, sx1, sy1 = x0, y0, x1, y1
w, h = x1 - x0, y1 - y0
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="%d" height="%d">' % (x0, y0, w, h, w * 2, h * 2)]
for name in order:
    for l in data['poses'][pose].get(name, []):
        svg.append('<path fill-rule="evenodd" style="fill:%s" d="%s"/>' % (fill(l), l['d']))
svg.append('</svg>')
open(os.path.join(HERE, 'out', '%s-%s.svg' % (bird, pose)), 'w').write(''.join(svg))
html = '<html><body style="margin:0;display:flex;gap:8px;background:#fff;align-items:flex-start"><img src="../%s.png" style="object-fit:none;object-position:-%dpx -%dpx;width:%dpx;height:%dpx;transform:scale(2);transform-origin:0 0;margin-right:%dpx;margin-bottom:%dpx">%s</body></html>' % (cfg.get('sheet', bird), sx0, sy0, sx1 - sx0, sy1 - sy0, sx1 - sx0, sy1 - sy0, ''.join(svg))
open(os.path.join(HERE, 'out', '%s-%s.html' % (bird, pose)), 'w').write(html)
