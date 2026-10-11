"""Fit the far wing's open drawing: the near wing, mirrored, opened to OPEN of its width and set on the far shoulder,
turned and moved so it covers the traced far wing as well as it can (so the swap lands where the wing was).
Reads trace/t2-masks.npy (from trace_neutral.py), writes trace/farwing.json: {matrix: [a b c d e f], iou}.
The matrix is SVG order and maps near-wing points to far-wing points; build_pip.py bakes it into the drawing."""
import os, json, itertools
import numpy as np, cv2
SP = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
OPEN = 0.7                                  # a lifted far wing shows more of itself than the sliver against the body
NEAR, FAR = (97.0, 165.0), (150.0, 164.0)   # shoulder pivots of wingL and wingR (bird.js)
d = np.load(SP + '/trace/t2-masks.npy', allow_pickle=True).item()
L, R = d['wingL'], d['wingR']
K = 4                                       # work at a quarter of the 4x grid: 2 px per unit
Rs = cv2.resize(R.astype(np.uint8), (R.shape[1] // K, R.shape[0] // K), interpolation=cv2.INTER_AREA) > 0
cs, _ = cv2.findContours(L.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c0 = max(cs, key=cv2.contourArea)[:, 0, :]
near = np.stack([c0[:, 0] / 8 + 23.5, c0[:, 1] / 8 - 10], 1)[::3]   # 4x pixels -> units


def matrix(sy, th, dx, dy):
    mir = np.array([[-1, 0, 240], [0, 1, 0], [0, 0, 1.0]])                  # across x 120
    sh = np.array([[1, 0, -(240 - NEAR[0])], [0, 1, -NEAR[1]], [0, 0, 1.0]])  # the mirrored shoulder to the origin
    c, s = np.cos(np.radians(th)), np.sin(np.radians(th))
    rot = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])
    t1 = np.array([[1, 0, FAR[0] + dx], [0, 1, FAR[1] + dy], [0, 0, 1.0]])
    return t1 @ rot @ np.diag([OPEN, sy, 1.0]) @ sh @ mir


def iou(M):
    p = near @ M[:2, :2].T + M[:2, 2]
    px = np.stack([(p[:, 0] - 23.5) * 8 / K, (p[:, 1] + 10) * 8 / K], 1)
    m = np.zeros(Rs.shape, np.uint8)
    cv2.fillPoly(m, [np.round(px).astype(np.int32)], 1)
    m = m.astype(bool)
    return (m & Rs).sum() / max(1, (m | Rs).sum())


best = (0, None)
for sy, th, dx, dy in itertools.product((0.94, 0.97, 1.0), range(-20, 21, 2), range(-4, 9), range(-2, 9)):
    v = iou(matrix(sy, th, dx, dy))
    if v > best[0]:
        best = (v, (sy, th, dx, dy))
M = matrix(*best[1])
out = {'matrix': [round(v, 4) for v in (M[0, 0], M[1, 0], M[0, 1], M[1, 1], M[0, 2], M[1, 2])], 'iou': round(best[0], 3),
       'fit': dict(zip(('sy', 'turn', 'dx', 'dy'), best[1]))}
json.dump(out, open(SP + '/trace/farwing.json', 'w'))
print('far wing', out)
