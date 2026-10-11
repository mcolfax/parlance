"""python3 cmp.py render.png concept.png out.png [x0 y0 x1 y1 in units] — concept | render | onion (50%)"""
import sys; from PIL import Image, ImageChops
r = Image.open(sys.argv[1]).convert('RGB'); k = Image.open(sys.argv[2]).convert('RGB').resize(r.size, Image.LANCZOS)
if len(sys.argv) > 4:
    ux0, uy0, ux1, uy1 = map(float, sys.argv[4:8]); f = lambda ux, uy: (int((ux - 23.5) * 4), int((uy + 10) * 4))
    box = (*f(ux0, uy0), *f(ux1, uy1)); r = r.crop(box); k = k.crop(box)
on = Image.blend(k, r, 0.5)
w, h = r.size; sheet = Image.new('RGB', (w * 3, h), 'white')
for i, im in enumerate((k, r, on)): sheet.paste(im, (i * w, 0))
sc = 1500 / sheet.width; sheet = sheet.resize((int(sheet.width * sc), int(sheet.height * sc)), Image.LANCZOS)
sheet.save(sys.argv[3]); print(sys.argv[3], sheet.size)
