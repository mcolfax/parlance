"""Put a model sheet into setup space for tracing: resample it so 1 px is 0.5 rig unit, with the feet of the neutral
drawing on the line the part sheets stand on (y 534 px, 257 units: ground y 250 runs through the feet), 608 px tall.
Pip's sheet is already this way; the other birds' sheets are larger, and each bird is scaled so the top of its
head stands as high above its feet as Pip's (about 198 units), whatever its crest does.
The sheet gets PAD px of background either side, so a crop can run past its edges.
Usage: python3 -I prep.py sheet.webp out.png scale feet_y      (scale: output px per sheet px; feet_y in sheet px)"""
import sys
from PIL import Image
PAD = 60
src, out, scale, feet = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
im = Image.open(src).convert('RGB')
big = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
bg = im.getpixel((8, 8))
canvas = Image.new('RGB', (big.width + 2 * PAD, 608), bg)
canvas.paste(big, (PAD, round(534 - feet * scale)))
canvas.save(out)
print(out, canvas.size, 'sheet px -> units: x', round(0.5 * scale, 4), 'per px')
