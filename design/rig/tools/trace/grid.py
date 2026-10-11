"""A window of a prepared sheet (prep.py) with a rig-unit grid, for reading off seeds, cut lines and landmarks.
usage: python3 -I grid.py sheet.png cx ux0 uy0 ux1 uy1 out.png [px per unit] [step]
cx is the sheet x (px) of the head's centre, where x 120 falls; y follows prep.py (ground y 250 at 520 px)."""
import sys, math
from PIL import Image, ImageDraw
src, cx = sys.argv[1], float(sys.argv[2])
ux0, uy0, ux1, uy1 = map(float, sys.argv[3:7]); out = sys.argv[7]
k = float(sys.argv[8]) if len(sys.argv) > 8 else 6; step = int(sys.argv[9]) if len(sys.argv) > 9 else 10
im = Image.open(src).convert('RGB')
px = lambda ux, uy: ((ux - 120) / 0.5 + cx, (uy - 250) / 0.5 + 520)
a, b = px(ux0, uy0), px(ux1, uy1)
w = im.crop((round(a[0]), round(a[1]), round(b[0]), round(b[1]))).resize((round((ux1 - ux0) * k), round((uy1 - uy0) * k)), Image.LANCZOS)
d = ImageDraw.Draw(w)
for gx in range(math.ceil(ux0), int(ux1) + 1):
    if gx % (step // 2 or 1): continue
    x = (gx - ux0) * k; major = gx % step == 0
    d.line([(x, 0), (x, w.height)], fill=(230, 0, 0) if major else (255, 175, 175), width=1)
    if major: d.text((x + 2, 2), str(gx), fill=(230, 0, 0))
for gy in range(math.ceil(uy0), int(uy1) + 1):
    if gy % (step // 2 or 1): continue
    y = (gy - uy0) * k; major = gy % step == 0
    d.line([(0, y), (w.width, y)], fill=(0, 0, 230) if major else (175, 175, 255), width=1)
    if major: d.text((2, y + 2), str(gy), fill=(0, 0, 230))
w.save(out); print(out, w.size)
