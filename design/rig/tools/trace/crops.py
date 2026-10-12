"""Cut a bird's neutral and cheer drawings from its prepared sheet (prep.py) into reference/<bird>-happy.webp and
<bird>-cheer.webp, aligned to rig units (1 px = 0.5 unit, y -10 at the top) like Pip's crops, for the review page's
concept-and-rig wipe. Prints each crop's view box in rig units.
Usage: python3 -I crops.py <bird>      (reads $TRACE_DIR/<bird>/sheet.png, from run.sh)"""
import os, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
bird = sys.argv[1]
cfg = json.load(open(os.path.join(HERE, 'birds', bird + '.json')))
base = os.environ.get('TRACE_DIR', os.path.join(HERE, 'work'))
sheet = Image.open(os.path.join(base, bird, 'sheet.png')).convert('RGB')
for key, crop in (('happy', 'n'), ('cheer', 'c')):
    x0, x1, cx = cfg['crops'][crop]
    out = os.path.join(HERE, '..', '..', 'reference', bird + '-' + key + '.webp')
    sheet.crop((x0, 0, x1, 608)).save(out, 'WEBP', quality=82, method=6)
    print(os.path.normpath(out), 'view', [round((x0 - cx) / 2 + 120, 2), -10, (x1 - x0) / 2, 304])
