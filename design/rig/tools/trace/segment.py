"""Segment a concept crop into color classes at 4x. Usage: python3 -I segment.py ref.png x0 x1 out_prefix [palette.json]
Pip's colors are below; another bird passes its own as {"classes": {name: [[r, g, b], ...]}, "show": {name: [r, g, b]}}
(birds/<bird>.json). The class names go to out_prefix-names.json for trace_lib.Crop."""
import sys, json, numpy as np, cv2
from PIL import Image
src, x0, x1, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
S = 4
im = Image.open(src).convert('RGB').crop((x0, 0, x1, 608))
big = np.asarray(im.resize((im.width * S, im.height * S), Image.LANCZOS)).astype(np.float32)
# reference colors sampled from the concept (sRGB)
REF = {
  'bg': [(240, 244, 228), (216, 224, 200), (232, 238, 220)],
  'ink': [(8, 40, 24), (20, 52, 38)],
  'teal': [(4, 120, 124), (4, 108, 112), (6, 98, 102), (20, 128, 130)],
  'gloss': [(80, 146, 143), (110, 170, 168), (150, 196, 192)],
  'cream': [(252, 244, 232), (248, 240, 212), (244, 236, 214)],
  'white': [(255, 255, 255)],
  'gold': [(244, 180, 64), (248, 190, 80), (236, 168, 56)],
  'goldhi': [(250, 218, 140), (252, 226, 160)],
  'red': [(236, 96, 52), (240, 100, 56), (214, 80, 44), (200, 70, 40)],
  'coral': [(240, 112, 92), (232, 104, 96)],
  'mouth': [(64, 40, 24), (90, 50, 34)],
  'gray': [(128, 136, 132), (110, 118, 116), (150, 156, 152)],
  'blue': [(150, 210, 240), (110, 190, 232)]
}
if len(sys.argv) > 5:
    cfg = json.load(open(sys.argv[5]))
    REF = {k: [tuple(c) for c in v] for k, v in cfg['classes'].items()}
names = list(REF)
json.dump(names, open(out + '-names.json', 'w'))
def lab(a): return cv2.cvtColor(np.asarray(a, np.float32).reshape(-1, 1, 3) / 255.0, cv2.COLOR_RGB2LAB).reshape(-1, 3)
L = cv2.cvtColor(big / 255.0, cv2.COLOR_RGB2LAB)
best = np.full(L.shape[:2], 1e9, np.float32); cls = np.zeros(L.shape[:2], np.int32)
for i, n in enumerate(names):
    for c in lab(REF[n]):
        d = np.sum((L - c) ** 2, axis=2)
        m = d < best; best[m] = d[m]; cls[m] = i
np.save(out + '-cls.npy', cls)
pal = {'bg': (240, 244, 228), 'ink': (0, 0, 0), 'teal': (0, 130, 130), 'gloss': (120, 200, 200), 'cream': (250, 240, 210), 'white': (255, 0, 255),
       'gold': (240, 180, 60), 'goldhi': (255, 230, 150), 'red': (230, 80, 40), 'coral': (255, 140, 140), 'mouth': (110, 50, 20), 'gray': (128, 128, 128), 'blue': (80, 160, 255)}
if len(sys.argv) > 5: pal = {k: tuple(cfg.get('show', {}).get(k, REF[k][0])) for k in names}
vis = np.zeros(cls.shape + (3,), np.uint8)
for i, n in enumerate(names): vis[cls == i] = pal[n]
Image.fromarray(vis).resize((im.width * 2, im.height * 2), Image.NEAREST).save(out + '-cls.png')
print(out, cls.shape, {n: int((cls == i).sum()) for i, n in enumerate(names)})
