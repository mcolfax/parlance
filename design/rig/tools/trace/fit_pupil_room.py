"""How far each pupil can move from where it's drawn and stay inside its eye white, for the rig's look clamp.
The concept draws the pupils converged (the near one at the right of its white, the far one at the left), so each
gets its own room: [right, left, down, up] in units, the axes of a quarter-ellipse per quadrant, shrunk so every
direction fits. Reads trace/t2.json and trace/t2-masks.npy (trace_neutral.py), writes trace/room.json."""
import os, json, math
import numpy as np, cv2
SP = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
d = np.load(SP + '/trace/t2-masks.npy', allow_pickle=True).item()
M = json.load(open(SP + '/trace/t2.json'))['meta']
WHITE = 0.8          # units of white kept round a pupil; less where the sheet draws the pupil right at the edge
out = {}
for s in 'LR':
    P = d['patch' + s].astype(np.uint8)
    x, y, rx, ry = M['pupil' + s]['ellipse'][:4]
    def centres(m):
        ax, ay = max(1, int(round((rx + m) * 8))), max(1, int(round((ry + m) * 8)))
        return cv2.erode(P, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ax + 1, 2 * ay + 1))) > 0
    at = lambda E, px, py: E[int(round((py + 10) * 8)), int(round((px - 23.5) * 8))]
    lo, hi = -6.0, 6.0                                   # the white the drawn pupil has round it (negative: overhang)
    for _ in range(30):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if at(centres(mid), x, y) else (lo, mid)
    E = centres(min(WHITE, lo - 0.05))
    def reach(a):
        r = 0.0
        while r < 20 and at(E, x + (r + 0.05) * math.cos(a), y + (r + 0.05) * math.sin(a)): r += 0.05
        return r
    R = {deg: reach(math.radians(deg)) for deg in range(0, 360, 5)}
    axes = [R[0], R[180], R[90], R[270]]
    k = 1.0
    for deg, r in R.items():
        a = math.radians(deg); c, sn = math.cos(a), math.sin(a)
        ax, ay = (axes[0] if c >= 0 else axes[1]), (axes[2] if sn >= 0 else axes[3])
        if ax > 0 and ay > 0:
            rr = 1 / math.sqrt((c / ax) ** 2 + (sn / ay) ** 2)
            if rr > r: k = min(k, r / rr)
    out['pupil' + s] = [round(v * k, 2) for v in axes]
json.dump(out, open(SP + '/trace/room.json', 'w'))
print('pupil room [right, left, down, up]', out)
