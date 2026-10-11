"""zoom a rig-unit window of the neutral class map with a 2-unit grid. usage: zoomgrid.py SP prefix x0 cx ux0 uy0 ux1 uy1 out [scale]"""
import sys; sys.path.insert(0, sys.argv[1] + '/tools')
from trace_lib import *
from PIL import Image, ImageDraw
SP, pre, x0, cx = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
ux0, uy0, ux1, uy1 = map(float, sys.argv[5:9]); out = sys.argv[9]; sc = float(sys.argv[10]) if len(sys.argv) > 10 else 1
c = Crop(SP + '/trace/' + pre, x0, cx)
pal = {'bg': (240, 244, 228), 'ink': (0, 0, 0), 'teal': (0, 130, 130), 'gloss': (120, 200, 200), 'cream': (250, 240, 210), 'white': (255, 220, 255),
       'gold': (240, 180, 60), 'goldhi': (255, 230, 150), 'red': (230, 80, 40), 'coral': (255, 140, 140), 'mouth': (110, 50, 20), 'gray': (128, 128, 128), 'blue': (80, 160, 255)}
a = c.px(ux0, uy0); b = c.px(ux1, uy1)
sub = c.cls[a[1]:b[1], a[0]:b[0]]
vis = np.zeros(sub.shape + (3,), np.uint8)
for i, n in enumerate(NAMES): vis[sub == i] = pal[n]
im = Image.fromarray(vis); W, H = im.size
im = im.resize((int(W * sc), int(H * sc)), Image.NEAREST)
d = ImageDraw.Draw(im)
import math
for gx in range(math.ceil(ux0), int(ux1) + 1):
    if gx % 2: continue
    x = (c.px(gx, 0)[0] - a[0]) * sc; d.line([(x, 0), (x, im.height)], fill=(255, 0, 0) if gx % 10 == 0 else (255, 170, 170), width=1)
    if gx % 10 == 0: d.text((x + 2, 2), str(gx), fill=(255, 0, 0))
for gy in range(math.ceil(uy0), int(uy1) + 1):
    if gy % 2: continue
    y = (c.px(0, gy)[1] - a[1]) * sc; d.line([(0, y), (im.width, y)], fill=(0, 0, 255) if gy % 10 == 0 else (170, 170, 255), width=1)
    if gy % 10 == 0: d.text((2, y + 2), str(gy), fill=(0, 0, 255))
im.save(out); print(out, im.size)
