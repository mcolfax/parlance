"""Trace Kiwi the budgie from its model sheet (reference/kiwi-sheet.webp), prepared by prep.py and segmented by
segment.py (see run.sh). Writes <work>/trace/t.json: {parts: {slot: {drawing: markup}}, meta, D: named drawings}.
Kiwi faces front (turn.setup 0). Its head and body are one egg: the yellow head runs into the green body with no line
between them, so the head is the yellow cap and the body is the whole egg under it, outline and all. The folded wings
are the strips between the egg's outline and the creases down its sides; the raised wings come from the cheer
drawing, where the creases stay on the body."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *

W, CFG = work('kiwi')
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'
parts, meta, D, T = {}, {}, {}, {}

# ================= neutral: the setup pose =================
x0, x1, cx = CFG['crops']['n']
LW = CFG['lw']
t = Tracer(W + '/trace/n', x0, cx, LW, ink=('ink', 'shine2'))
INK, INKN = t.INK, t.INKN
BG = t.m('bg', 'shadow')
YEL = t.m('yellow', 'yellow2')
GREEN = t.m('body', 'gloss', 'wing') | (t.m('shine') & t.below(140))
FEET = t.m('feet')

# ---- the egg: head, body and wings inside one outline
egg_in = opn(fill(t.flood(~INK & ~BG & ~FEET, (120, 200))), 2)
crown = ~INK & ~BG & ero(fill(~BG), 2 * t.HALF) & t.above(72)      # the strips between the bars on the crown, walled off by ink
egg = fill(t.to_ink(egg_in | crown))

# ---- head: the yellow cap. Its line runs down the sides to where the head meets the body (the notches at y 148)
head_in = opn(fill(t.flood(~INK & ~BG & ~GREEN & ~FEET, (120, 95))), 3)
head = fill(t.to_ink(head_in | crown)) & egg
t.dbg['head'] = head

# ---- wings: the strips between the egg's outline and the creases, closed off at the top where the crease starts
# (the body's side runs on straight up from the crease to the head, as the cheer drawing shows it)
cut = {'L': t.line([(63.4, 167), (62.6, 162.4), (62.2, 152), (62.6, 144)], 1.4), 'R': t.line([(175.2, 167), (175.6, 162.6), (176, 152), (175.8, 144)], 1.4)}
wings_vis = {}
for s, seed in (('L', (50, 190)), ('R', (189, 190))):
    w = fill(close(t.flood(~INK & ~BG & ~YEL & ~cut[s], seed), 3))
    wings_vis[s] = w

if STAGE == 'masks':
    t.save_debug(W + '/dbg-n.png', {'egg': egg & ~head, 'head': head, 'wingL': wings_vis['L'], 'wingR': wings_vis['R']})
    print('wrote', W + '/dbg-n.png'); sys.exit(0)

# the head's outline follows a circle; the head turns about its centre, so the cap slides round the egg
hc = head_circle(t, head)
meta['headCircle'] = hc

# ---- head drawing: the yellow cap, the shade round the bars, the bars, the cheeks and the throat spots
inside = ero(head, t.HALF + 6)
yel2 = opn(t.m('yellow2') & inside & t.above(90), 2)
bars = INK & inside & t.above(84)
spots = INK & inside & t.below(143)
cheeks = opn(t.m('cheek') & inside, 2)
CHEEKS = ''.join('<ellipse class="k-cheek" cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" transform="rotate(%.0f %.1f %.1f)"/>' % (q[0], q[1], q[2], q[3], q[4], q[0], q[1]) for q in (t.fit_ellipse(m) for a, x_, y_, m in comps(cheeks, 200)))
HEADLINE = t.outline(head, where=dil(BG, t.HALF + 10) & ~t.below(150), min_run=30, bridge=16)
parts['head'] = {'on': t.F('k-head', head) + t.F('k-head2', yel2, blur=2.5) + t.inks(bars, cls='k-mark') + CHEEKS + t.inks(spots, cls='k-mark')}
parts['headLine'] = {'on': HEADLINE}
meta['head'] = {'bbox': t.bbox(head)}
meta['cheeks'] = [t.fit_ellipse(m) for a, x_, y_, m in comps(cheeks, 200)]
meta['spots'] = [t.centre(m) for a, x_, y_, m in comps(spots, 40)]

# ---- body: the egg inside the creases, below the middle of the head. The creases are the body's sides (the cheer
# drawing shows them when the wings are up), so its line runs all the way round, up to the head; at rest the folded
# wings cover it and show the sheet's tapered creases
body_in = fill(t.flood(~INK & ~BG & ~FEET & ~cut['L'] & ~cut['R'], (120, 200))) | crown
body = fill(t.to_ink(body_in) | (dil(body_in, 16) & (cut['L'] | cut['R']))) & t.below(hc[1] - 6)
body = opn(body, 3)
body = (body & t.above(222)) | (close(body, 40) & ~t.above(222))      # no notches where the toes meet the line
gl = opn(t.m('gloss') & ero(body, t.HALF), 2)
CUTS = dil(cut['L'] | cut['R'], 10)
parts['body'] = {'on': t.F('k-body', body) + t.outline(body, where=t.below(hc[1] - 2), also=CUTS) + t.F('k-gloss', gl, blur=2.5)}
meta['body'] = {'bbox': t.bbox(body)}
t.dbg['body'] = body

# ---- folded wings: the strips between the outline and the creases, with their dark feather marks and the crease.
# Each runs 2 units on into the body (body green, no line), so it covers the body's own side line; its top is carried
# on under the head toward the shoulder, so the root is whole when the wing lifts
SHOULDER = {'L': (64, 152), 'R': (176, 152)}
creases = INK & ero(egg, t.HALF + 8) & ~dil(head, 4) & t.below(150)
for s_, w in wings_vis.items():
    sx, sy = SHOULDER[s_]
    wf = t.to_ink(w)
    root = t.hull(wf | t.disk(sx, sy, 6)) & egg & dil(head, 4)
    inner = dil(wf, 20) & body & t.below(146)
    wf = opn(close(fill(wf | root | inner), 3), 2)
    marks = opn(t.m('wing') & ero(wf, 4), 1)
    crease = creases & dil(w, t.HALF + 6)
    run = t.outline(wf, where=~dil(head, 2) & ~dil(crease, 3) & ~dil(body_in, 2))
    parts['wing' + s_] = {'folded': t.F('k-body', wf) + t.F('k-body2', marks, blur=1.5) + run + t.inks(crease)}
    meta['wing' + s_] = {'bbox': t.bbox(wf), 'c': t.centre(w)}
    t.dbg['wing' + s_] = wf

# ---- tail: the dark tip at the bottom right, carried on behind the body
TAIL = t.m('wing') & t.below(214) & t.right(150)
tail_vis = fill(t.flood(TAIL, (176, 232)))
tail_root = t.hull(tail_vis | t.disk(150, 222, 7)) & ~t.below(240)
tail = t.to_ink(fill(tail_vis | (tail_root & egg)))
parts['tail'] = {'fan': t.F('k-tail o', tail)}
meta['tail'] = {'bbox': t.bbox(tail)}
t.dbg['tail'] = tail

# ---- feet: pink toes with ink between them; a stub runs up under the body
for s, seed in (('L', (90, 246)), ('R', (148, 246))):
    f = fill(close(t.flood(FEET, seed), 2))
    ff = t.to_ink(f)
    bb = t.bbox(f)
    stub = t.poly([(bb[0] + 5, 222), (bb[2] - 5, 222), (bb[2] - 5, 236), (bb[0] + 5, 236)])
    foot = fill(close(ff | stub, 3))
    toes = opn(INK & ero(foot, t.HALF + 3) & t.below(238), 1)
    parts['leg' + s] = {'stand': t.F('k-feet o', foot) + t.inks(toes, min_area=30)}
    meta['leg' + s] = {'bbox': t.bbox(foot), 'ankle': t.centre(f & t.above(240))}
    t.dbg['leg' + s] = foot

# ---- face: eyes, brows, the cere and the beak
for s, (ex, ey), (bx, by) in (('L', (88, 111), (88, 89)), ('R', (152, 111), (152, 89))):
    eye = t.hull(opn(fill(t.flood(INK, (ex, ey + 6))), 3))
    shine = opn(close(t.m('shine', 'shine2') & ero(eye, 2), 3), 3)
    shine2 = opn(close(t.m('shine2') & shine, 2), 3)
    glint = opn(t.m('white') & eye, 1)
    D['pupil' + s] = t.F('k-mark', eye, blur=1.6) + t.F('k-shine2', shine, blur=2.4) + t.F('k-shine', shine & ~shine2, blur=2.4) + t.F('k-glint', glint, blur=1.2, turd=4)
    meta['pupil' + s] = {'ellipse': t.fit_ellipse(eye), 'glint': t.centre(glint), 'glintR': round(float(np.sqrt(glint.sum() / np.pi) / 8), 2)}
    brow = t.flood(INK & t.above(96) & ero(head, 4), (bx, by))
    parts['brow' + s] = {'arc': t.INKF(brow, blur=1.3)}
    meta['brow' + s] = {'bbox': t.bbox(brow), 'c': t.centre(brow)}
    t.dbg['eye' + s] = eye

beak_in = fill(t.flood(t.m('beak'), (120, 129)))
beak_in = opn(beak_in, 2)
egg_b = t.to_ink(beak_in, 9)
cere = fill(close(t.flood(t.m('cere', 'cere2') & t.above(121), (120, 116)), 2))
cere = opn(cere, 2) & ~beak_in
nostrils = INK & dil(cere, 2) & t.above(117)
cere2 = opn(t.m('cere2') & cere, 1)
D['egg'] = t.F('k-beak', egg_b) + t.closed(egg_b, 'ol2')
D['cere'] = t.F('k-cere', cere, blur=1.6) + t.F('k-cere2', cere2, blur=1.6) + t.inks(nostrils, min_area=10, cls='k-mark')
meta['beak'] = {'bbox': t.bbox(egg_b), 'c': t.centre(egg_b)}
meta['cere'] = {'bbox': t.bbox(cere), 'c': t.centre(cere)}
t.dbg['beak'] = egg_b; t.dbg['cere'] = cere

t.save_debug(W + '/dbg-parts.png', t.dbg)
np.save(W + '/trace/t-masks.npy', t.dbg, allow_pickle=True)

# ================= cheer: raised wings, happy eyes, the open beak =================
x0, x1, cx = CFG['crops']['c']
u = Tracer(W + '/trace/c', x0, cx, LW, ink=('ink', 'shine2'))
UINK = u.INK
UBG = u.m('bg', 'shadow')
UYEL = u.m('yellow', 'yellow2')
UGREEN = u.m('body', 'gloss', 'wing')
uhead_in = opn(fill(u.flood(~UINK & ~UBG & ~UGREEN & ~u.m('feet'), (120, 95))), 3)
ucrown = ~UINK & ~UBG & ero(fill(~UBG), 2 * u.HALF) & u.above(72)
uhead = fill(u.to_ink(uhead_in | ucrown))
# the head's line and the body's line taper off either side of where each wing goes in behind them: close the gaps
# (raw cheer coordinates)
ucut = u.line([(67.4, 154), (69.8, 141.6)], 1.2) | u.line([(178.6, 154), (176.2, 141.6)], 1.2)
uegg_in = opn(fill(u.flood(~UINK & ~UBG & ~u.m('feet') & ~ucut, (120, 200))), 2)
uegg = fill(u.to_ink(uegg_in | ucrown) | (dil(uegg_in, u.HALF) & ucut))
uegg_out = dil(uegg, u.HALF + 4)       # the egg and the whole of its outline
# the cheer bird stands where the neutral one does: line the eggs up by their middles and their bottoms
eb, nb = u.bbox(uegg), meta['body']['bbox']
OFF = ((nb[0] + nb[2]) / 2 - (eb[0] + eb[2]) / 2, nb[3] - eb[3])
meta['cheerOffset'] = [round(v, 2) for v in OFF]; meta['cheerEgg'] = eb

# raised wings: everything outside the egg's outline, carried on behind the egg to the shoulder (the cheer pose
# tucks them behind the body); RAISE is how far each is turned from the folded wing, about the shoulder
SIL = fill(~UBG)
RAISE = {}
for s_, seed in (('L', (40, 120)), ('R', (200, 120))):
    sx, sy = SHOULDER[s_][0] - OFF[0], SHOULDER[s_][1] - OFF[1]
    w = opn(u.flood(SIL & ~dil(uegg_out, 2) & u.above(215), (seed[0] - OFF[0], seed[1] - OFF[1])), 3)
    wf = ero(w, u.HALF) | (w & dil(uegg_out, 3 * u.HALF))           # to the middle of its line, except along the egg
    root = u.hull(wf | u.disk(sx, sy, 7)) & uegg
    behind = dil(wf, 80) & dil(uegg_out, 4) & u.above(u.bbox(w)[3] - 4)        # 10 units on in behind the body
    wf = opn(close(fill(wf | root | behind), 3), 2)
    dark = opn(u.m('wing') & ero(wf, 3), 1)
    notches = opn(UINK & ero(w, u.HALF + 2) & ~dil(uegg_out, 2), 1)
    u.c.off = OFF
    run = u.outline(wf, where=~dil(uegg_out, 1))
    T['wing' + s_ + 'Up'] = u.F('k-body', wf) + u.F('k-body2', dark, blur=1.6) + run + u.inks(notches, min_area=40)
    u.c.off = (0.0, 0.0)
    cw = u.centre(w); cw = (cw[0] + OFF[0], cw[1] + OFF[1])
    RAISE[s_] = raise_angle(cw, meta['wing' + s_]['c'], SHOULDER[s_])
    u.dbg['wing' + s_] = wf
meta['raise'] = RAISE

# the face: the cere sits still on the head, so it lines the open beak up with the neutral one
ucere = fill(close(u.flood(u.m('cere', 'cere2'), (120 - OFF[0], 104 - OFF[1])), 2))
ucere = opn(ucere, 2)
cc, nc = u.centre(ucere), meta['cere']['c']
FOFF = (nc[0] - cc[0], nc[1] - cc[1])
meta['faceOffset'] = [round(v, 2) for v in FOFF]

# happy eyes: each arc centred on its neutral eye, its middle a little above the eye's
for s_, seed in (('L', (88, 106)), ('R', (151, 106))):
    arc = u.flood(UINK & ero(uhead, 6), (seed[0] - FOFF[0], seed[1] - FOFF[1]))
    ab = u.bbox(arc); ex, ey = meta['pupil' + s_]['ellipse'][:2]
    u.c.off = (ex - (ab[0] + ab[2]) / 2, ey - 2 - (ab[1] + ab[3]) / 2)
    T['happy' + s_] = u.INKF(arc, blur=1.3, cls='k-mark')
    meta['happy' + s_] = u.bbox(arc)
    u.c.off = (0.0, 0.0)
    u.dbg['happy' + s_] = arc

# the open beak: the ink ring round the mouth, and inside it the upper beak's underside, the dark mouth and the tongue
u.c.off = FOFF
ring = u.flood(UINK & u.below(cc[1] + 3), (121 - FOFF[0], 141.2 - FOFF[1]))
mouth_in = fill(ring) & ~ring
mouth_in = opn(mouth_in, 2)
mouth_o = u.to_ink(mouth_in, 9)
upper = opn(u.m('beak', 'feet') & mouth_in & u.above(nc[1] + 6 - FOFF[1]), 2)
tongue = opn(u.m('tongue') & mouth_in & ~upper, 2)
fold = opn(UINK & ero(mouth_o, 5), 1)
ucere2 = opn(u.m('cere2') & ucere, 1)
unost = UINK & dil(ucere, 2) & ero(fill(dil(ucere, 6)), 4) & ~dil(ring, 3)
T['wide'] = u.F('k-mouth', mouth_o) + u.F('k-tongue', tongue, blur=1.5) + u.F('k-beak', upper, blur=1.5) + u.inks(fold, min_area=30) + u.closed(mouth_o, 'ol2')
T['cereUp'] = u.F('k-cere', ucere, blur=1.6) + u.F('k-cere2', ucere2, blur=1.6) + u.inks(unost, min_area=10, cls='k-mark')
meta['wide'] = {'bbox': u.bbox(mouth_o), 'upper': u.bbox(upper) if upper.any() else None, 'tongue': u.bbox(tongue) if tongue.any() else None}
meta['cereUp'] = u.bbox(ucere)
u.c.off = (0.0, 0.0)
u.dbg['mouth'] = mouth_o; u.dbg['cere'] = ucere
u.save_debug(W + '/dbg-cheer.png', u.dbg)

T.update({
    'head': parts['head']['on'], 'headLine': parts['headLine']['on'], 'body': parts['body']['on'], 'tail': parts['tail']['fan'],
    'wingL': parts['wingL']['folded'], 'wingR': parts['wingR']['folded'], 'legL': parts['legL']['stand'], 'legR': parts['legR']['stand'],
    'browL': parts['browL']['arc'], 'browR': parts['browR']['arc'], 'pupilL': D['pupilL'], 'pupilR': D['pupilR'],
    'egg': D['egg'], 'cere': D['cere']})
E = lambda s_: [round(v, 1) for v in meta['pupil' + s_]['ellipse'][:4]]
consts = {
    'eye': {'L': E('L'), 'R': E('R')}, 'raise': RAISE, 'shoulder': SHOULDER, 'head': [round(v, 1) for v in hc],
    'beak': [round(v, 1) for v in meta['beak']['bbox']], 'cere': [round(v, 1) for v in meta['cere']['c']],
    'ankle': {s_: [round(v, 1) for v in meta['leg' + s_]['ankle']] for s_ in 'LR'}
}
notes = {
    'head': 'the yellow cap: its shade, the bars on the crown, the blue cheeks and the throat spots. Its line is headLine',
    'headLine': 'no line where the yellow meets the green: the cap runs into the body',
    'body': 'the egg inside the creases: its line runs up the sides under the folded wings, so it is there when they lift',
    'wingL': 'the strip between the outline and the crease, with the crease; it runs on 2 units into the body, unlined, so it hides the body\'s side line',
    'wingLUp': 'raised, from the cheer drawing; turned back down to the hanging rest angle below',
    'egg': 'the closed beak: closed mouths draw on it',
    'wide': 'the cheer drawing\'s open beak, hung under the cere',
}
json.dump({'T': T, 'meta': meta, 'consts': consts, 'notes': notes}, open(W + '/trace/t.json', 'w'))
for k_, v in meta.items(): print(k_, v)
