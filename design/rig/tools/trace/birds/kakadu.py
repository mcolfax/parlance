"""Trace Kakadu the sulphur-crested cockatoo from its model sheet (reference/kakadu-sheet.webp), prepared by prep.py
and segmented by segment.py (run.sh). Writes <work>/trace/t.json: {T: named drawings, meta, consts, notes}.
Kakadu faces front (turn.setup 0). Its crest is seven feathers, each its own bone so it springs and fans: they stand in
front of the head's line and their roots go in behind the white tuft on its crown, which is drawn over them. The head
runs into the chest with no chin line. Its eyes are whites inside a blue ring (the eye slot, shown while the eye is
open); a closed or happy eye is a line on a pale blue patch, as on the cheer drawing. The beak is the grey upper beak
over the open jaw, as Rojo's and Mango's are."""
import os, sys, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *

W, CFG = work('kakadu')
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'
T, meta, notes, PAL = {}, {}, {}, {}
LW = CFG['lw']
SHEET = W + '/sheet.png'
YEL = ('yellow', 'yellow2', 'orange', 'orange2')

# ================= neutral: the setup pose =================
x0, x1, cx = CFG['crops']['n']
t = Tracer(W + '/trace/n', x0, cx, LW)
INK, INKN = t.INK, t.INKN
BG = t.m('bg', 'shadow')
FAR = t.right(186)
SIL = fill(comp_at(~BG & ~FAR, t.P(120, 160)))
WHITE = t.m('white', 'white2')

# ---- head: the white inside the head's line, up into the tuft; no chin line, so it is closed across the chest
chord = t.line([(86, 151.4), (95, 154), (110, 155.4), (120, 155.6), (130, 155.4), (145, 154), (154.6, 151.4)], 1.6)
head_all = opn(fill(t.flood(~INK & ~BG & ~chord & ~t.m(*YEL) & ~FAR, (120, 100))), 3)
hc = head_circle(t, fill(t.to_ink(head_all)), below=140)
meta['headCircle'] = hc
crown = t.disk(hc[0], hc[1], hc[2] - LW / 2)
tuft_in = head_all & ~crown & t.above(hc[1])
head_in = head_all & ~tuft_in
head = fill(t.to_ink(head_in) | (dil(head_in, 12) & chord)) | (crown & t.above(hc[1]))
head = opn(close(head, 4), 2)
t.dbg['head'] = head; t.dbg['tuft'] = tuft_in

# ---- crest: seven feathers. Their bases run together behind the tuft, so cuts carry the lines between them down
CUTS = t.line([(114, 55), (119, 64), (124, 82)], 1.2) | t.line([(132.4, 52), (133.6, 58.4), (134.2, 66), (134.6, 82)], 1.4) | t.line([(106, 70), (110, 76), (114, 84)], 1.2) | \
    t.line([(156, 83.4), (152.8, 85.7), (146, 89)], 1.2) | t.line([(162, 91), (158.7, 92.3), (150, 97)], 1.2)
Y = t.m(*YEL) & ~INK & ~CUTS & t.above(104)
FEATHERS = {   # id: (a point inside it, its root: where it goes in behind the tuft)
    'crest4': ((94, 74), (110, 82)), 'crest1': ((98, 56), (117, 79)), 'crest5': ((112, 42), (126, 77)), 'crest2': ((136, 28), (137, 77)),
    'crest3': ((158, 56), (148, 80)), 'crest6': ((164, 76), (151, 86)), 'crest7': ((164, 95), (153, 93))
}
crest = {}
for k, (seed, root) in FEATHERS.items():
    vis = opn(fill(t.flood(Y, seed)), 2)
    f = fill(t.to_ink(vis))
    # carry the feather on toward its root along its own axis, so its base is whole under the tuft as it swings
    ys, xs = np.nonzero(vis); cxm, cym = xs.mean(), ys.mean()
    rx_, ry_ = t.P(*root); v = np.array([rx_ - cxm, ry_ - cym]); L_ = np.hypot(*v); v /= L_
    proj = (xs - cxm) * v[0] + (ys - cym) * v[1]
    sel = proj > np.percentile(proj, 80)
    base = np.zeros(t.SH, bool); base[ys[sel], xs[sel]] = True
    ext = f.copy()
    reach = max(0.0, ((rx_ - cxm) * v[0] + (ry_ - cym) * v[1]) - proj.max())
    for d in range(4, int(reach) + 40, 4):
        ext |= np.roll(np.roll(base, int(round(v[1] * d)), 0), int(round(v[0] * d)), 1)
    f = opn(fill(close(ext, 4)), 2)
    crest[k] = dict(vis=vis, f=f, root=root)
    t.dbg[k] = f

# ---- wings: every region between the outline and the lines down the body's sides; body: the white between them
# the lines down the body's sides start a little below the head's: close the gaps
wcut = t.line([(90, 153.6), (90.6, 166), (90.2, 177)], 1.2) | t.line([(146.4, 154.4), (150, 165), (152.4, 176)], 1.2)
free = ~INK & ~BG & ~FAR & ~dil(head_all, 2) & ~chord & ~wcut & ero(SIL, t.HALF) & ~t.m('grey')
SIDE = {'L': t.poly([(40, 148), (89, 148), (89, 178), (96, 228), (40, 228)]), 'R': t.poly([(147, 148), (200, 148), (200, 228), (146, 228), (152, 178)])}
wings_vis = {}
body_vis = opn(fill(t.flood(free & ~t.m(*YEL), (120, 190))), 2)
for s_ in 'LR':
    w = np.zeros(t.SH, bool)
    for a_, x_, y_, m in comps(free & ~body_vis & ~t.m(*YEL), 30):
        if SIDE[s_][int(y_), int(x_)]: w |= m
    wings_vis[s_] = opn(fill(close(w, 4)), 2)
    t.dbg['wing' + s_] = wings_vis[s_]
t.dbg['body'] = body_vis
tail_vis = np.zeros(t.SH, bool)
for a_, x_, y_, m in comps(t.m(*YEL) & ~INK & t.below(212), 60): tail_vis |= m
tail_vis = opn(fill(close(tail_vis, 3)), 2)
t.dbg['tail'] = tail_vis

if STAGE == 'masks':
    t.save_debug(W + '/dbg-n.png', t.dbg)
    print('wrote', W + '/dbg-n.png'); sys.exit(0)

# ---- face masks: the eyes (blue ring, white, pupil, glint), the brows, the beak (upper) and the jaw
eyes = {}
for s_, (ex, ey, er) in (('L', (101, 117, 15)), ('R', (139, 117, 15))):
    disk_ = t.disk(ex, ey, er)
    ring = t.m('blue', 'blue2') & disk_
    pupil = t.hull(opn(fill(comps(opn(t.m('dark') & disk_, 2), 40)[0][3]), 2))
    eye = t.hull(fill(close(ring | pupil | (t.m('white') & disk_ & ~dil(BG, 2) & dil(ring, 24) & fill(dil(ring, 4))), 4)))
    eye = opn(eye, 3)
    glint = opn(t.m('white') & pupil, 1)
    white = ero(eye, 10) & ~t.m('blue', 'blue2')
    eyes[s_] = dict(eye=eye, ring=ring, pupil=pupil, glint=glint, white=white)
    t.dbg['eye' + s_] = eye; t.dbg['pupil' + s_] = pupil
UPZ = t.poly([(104, 104), (136, 104), (138, 132), (120, 142), (102, 132)])
upper_in = opn(fill(t.flood(t.m('grey', 'grey2') & UPZ, (120, 118))), 2)
upper = t.to_ink(upper_in)
JZ = t.poly([(102, 124), (110, 124), (120, 138), (130, 124), (138, 124), (137, 145), (128, 155), (112, 155), (103, 145)])
jaw_all = opn(fill(close((~t.m('white', 'bg') | INK) & JZ & ~upper_in, 3)), 3)
jaw = (ero(jaw_all, 10) | (jaw_all & dil(upper, 6))) & ~ero(upper, 4)
jaw = opn(close(jaw, 3), 2)
t.dbg['upper'] = upper; t.dbg['jaw'] = jaw
t.save_debug(W + '/dbg-face.png', {k: v for k, v in t.dbg.items() if k in ('eyeL', 'eyeR', 'pupilL', 'pupilR', 'upper', 'jaw')})

# ---- head drawing: the white, its soft shade, and the feather lines; the line is headLine (none across the chest)
face = dil(eyes['L']['eye'] | eyes['R']['eye'] | upper | jaw_all, 6)
inside = ero(head, t.HALF + 4)
BROW = {s_: opn(t.flood(t.m('brow', 'ink', 'grey', 'dark') & inside & t.above(102) & t.below(84), seed), 1) for s_, seed in (('L', (94, 94)), ('R', (146, 94)))}
shade = opn(t.m('white2') & inside & ~face, 3)
marks = opn(INK & inside & ~face & ~BROW['L'] & ~BROW['R'], 1)
T['head'] = t.F('k-body', head) + t.F('k-body2', shade, blur=2.4) + t.inks(marks, min_area=40)
T['headLine'] = t.outline(head, where=~dil(chord, 10) & ~dil(tuft_in | t.m(*YEL), 6))
PAL['body'] = t.color(t.m('white') & inside & ~face, SHEET); PAL['body2'] = t.color(shade, SHEET) if shade.any() else '#EFE8D6'
for s_ in 'LR':
    T['brow' + s_] = t.INKF(BROW[s_], blur=1.3, cls='k-brow')
    meta['brow' + s_] = {'c': t.centre(BROW[s_])}
PAL['brow'] = t.color(t.m('brow') & (BROW['L'] | BROW['R']), SHEET)
meta['head'] = {'bbox': t.bbox(head)}

# ---- the tuft: the white over the crest's roots, without a line; it runs on down into the crown
tuft = opn(tuft_in | (dil(tuft_in, 24) & crown & ~dil(face, 4)), 2)
tshade = opn(t.m('white2') & tuft_in, 2)
T['tuft'] = t.F('k-body', tuft, blur=2.4) + t.F('k-body2', tshade, blur=2.4)
meta['tuft'] = {'bbox': t.bbox(tuft)}

# ---- crest feathers: yellow, with a lighter streak; each pivots at its root
CREST = {}
for k, c_ in crest.items():
    f, vis = c_['f'], c_['vis']
    hi = opn(t.m('yellow2') & ero(f, 4), 2)
    T[k] = t.F('k-crest', f) + t.F('k-crest2', hi, blur=2.4) + t.outline(f, where=~dil(tuft_in, 2) & ~dil(head_in, 2))
    rx_, ry_ = c_['root']
    ys, xs = np.nonzero(vis)
    d2 = [(t.c.unit(x, y), (t.c.unit(x, y)[0] - rx_) ** 2 + (t.c.unit(x, y)[1] - ry_) ** 2) for x, y in zip(xs[::25], ys[::25])]
    tip = max(d2, key=lambda q: q[1])[0]
    CREST[k] = {'root': [rx_, ry_], 'tip': [round(tip[0], 1), round(tip[1], 1)], 'orange': bool((t.m('orange', 'orange2') & vis).sum() > 0.5 * vis.sum())}
    if CREST[k]['orange']: T[k] = T[k].replace('k-crest"', 'k-crest3"', 1)
PAL['crest'] = t.color(t.m('yellow') & t.above(70), SHEET); PAL['crest2'] = t.color(t.m('yellow2') & t.above(70), SHEET); PAL['crest3'] = t.color(t.m('orange') & t.above(100), SHEET)
meta['crest'] = CREST

# ---- body: its sides behind the wings and its top under the head carried on in one convex sweep
wing_any = wings_vis['L'] | wings_vis['R']
chest = t.poly([(92, 150), (148, 150), (154, 175), (154, 215), (86, 215), (86, 175)])
hidden = dil(wing_any, t.HALF) | dil(head, t.HALF)
bc = t.to_ink(body_vis) | (dil(body_vis, 12) & (wcut | chord))
body = fill(bc | (t.hull(bc & t.above(215) | chest) & hidden & t.above(215)))
body = opn(close(body, 6), 3)
bshade = opn(t.m('white2', 'grey2') & ero(body, t.HALF) & ~dil(wing_any, 4) & ~dil(head, 4), 2)
bmarks = opn(INK & ero(body, t.HALF + 4) & ~dil(wing_any, t.HALF + 10) & ~dil(head, 6), 1)
T['body'] = t.F('k-body', body) + t.F('k-body2', bshade, blur=2.2) + t.inks(bmarks, min_area=40) + \
    t.outline(body, where=~dil(head_in, 4), also=(dil(wing_any, t.HALF - 2) | dil(wcut, 8)) & t.below(150))
meta['body'] = {'bbox': t.bbox(body)}

# ---- wings: white with their feather lines; the top runs on under the head toward the shoulder
SHOULDER = {'L': (90, 156), 'R': (150, 156)}
for s_ in 'LR':
    w = wings_vis[s_]
    wf = t.to_ink(w) | (dil(w, 12) & wcut)
    root = t.hull(wf | t.disk(*SHOULDER[s_], 5)) & dil(head, t.HALF)
    wf = opn(close(fill(wf | root), 3), 2)
    wshade = opn(t.m('white2', 'grey2') & ero(wf, 3), 2)
    lines = opn(INK & ero(wf, t.HALF + 3), 1)
    T['wing' + s_] = t.F('k-body', wf) + t.F('k-body2', wshade, blur=2.2) + t.inks(lines, min_area=50) + t.outline(wf, where=~dil(head, 2), also=dil(wcut, 6))
    meta['wing' + s_] = {'bbox': t.bbox(wf), 'c': t.centre(w)}

# ---- tail: the yellow feathers either side of the legs, joined behind them
troot = t.poly([(100, 212), (150, 212), (148, 236), (104, 236)]) & ero(body, t.HALF + 4)   # behind the body only
tail = opn(close(fill(t.to_ink(tail_vis) | troot), 4), 2)
tlines = opn(INK & ero(tail, t.HALF + 3) & ~troot, 1)
T['tail'] = t.F('k-tail o', tail) + t.F('k-crest2', opn(t.m('yellow2') & ero(tail_vis, 3), 2), blur=2.2) + t.inks(tlines, min_area=40)
PAL['tail'] = t.color(t.m('yellow', 'orange') & ero(tail_vis, 6), SHEET)
meta['tail'] = {'bbox': t.bbox(tail)}

# ---- legs and feet: dark grey, with the toes' lines; a stub runs up under the thighs
for s_, seed in (('L', (100, 248)), ('R', (140, 248))):
    f = fill(close(t.flood(t.m('grey', 'grey2'), seed), 2))
    ff = t.to_ink(f)
    bb = t.bbox(f & t.above(240))                           # the leg's own width, above the toes
    stub = t.poly([(bb[0] + 0.5, 222), (bb[2] - 0.5, 222), (bb[2] - 0.5, 238), (bb[0] + 0.5, 238)])
    foot = opn(fill(close(ff | stub, 3)), 2)
    toes = opn(INK & ero(foot, t.HALF + 3) & t.below(243), 1)
    T['leg' + s_] = t.F('k-feet o', foot) + t.inks(toes, min_area=30)
    meta['leg' + s_] = {'bbox': t.bbox(foot), 'ankle': t.centre(foot & t.below(236) & t.above(244))}
PAL['feet'] = t.color(t.m('grey') & t.below(240) & ero(SIL, 20), SHEET)

# ---- eyes: the blue ring and the white (eye slot), the pupil with its glint, and the pale blue patch a closed eye
# sits on (patch slot)
for s_, e_ in eyes.items():
    ring2 = opn(t.m('blue2') & e_['eye'], 1)
    T['eye' + s_] = t.F('k-ring', e_['eye'], blur=1.8) + t.F('k-white', e_['white'], blur=2.2) + t.F('k-ring2', ring2, blur=1.4)
    T['pupil' + s_] = t.F('k-pupil', e_['pupil'], blur=1.4) + t.F('k-glint', e_['glint'], blur=1.1, turd=4)
    ell, pe = t.fit_ellipse(e_['eye']), t.fit_ellipse(e_['pupil'])
    T['patch' + s_] = '<ellipse class="k-ring" cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f"/>' % (ell[0], ell[1], ell[2] * 1.06, ell[3] * 0.92)
    meta['eye' + s_] = ell; meta['pupil' + s_] = {'ellipse': pe, 'room': pupil_room(t, e_['white'] | e_['pupil'], pe)}
PAL['ring'] = t.color(t.m('blue') & (eyes['L']['eye'] | eyes['R']['eye']), SHEET); PAL['ring2'] = t.color(t.m('blue2') & (eyes['L']['eye'] | eyes['R']['eye']), SHEET)
PAL['white'] = t.color(eyes['L']['white'] & t.m('white'), SHEET); PAL['pupil'] = t.color(eyes['L']['pupil'] & ~dil(eyes['L']['glint'], 4), SHEET)

# ---- beak: the grey upper beak with its lighter top; the jaw: the grey rim, the dark mouth, the tongue, the line
uhi = opn(t.m('grey2') & ero(upper, t.HALF + 2), 2)
T['upper'] = t.F('k-beak', upper) + t.F('k-beak0', uhi, blur=2.4) + t.closed(upper, 'ol')
jgrey = opn(t.m('grey', 'grey2') & ero(jaw, 2), 1)
jtongue = opn(t.m('tongue') & ero(jaw, 2), 2)
T['grin'] = t.F('k-mouth', jaw) + t.F('k-beak', jgrey, blur=1.4) + t.F('k-tongue', jtongue, blur=1.6) + t.closed(jaw, 'ol')
PAL['beak'] = t.color(t.m('grey') & ero(upper, 10), SHEET); PAL['beak0'] = t.color(uhi, SHEET) if uhi.any() else '#8A9AA2'
PAL['mouth'] = t.color(jaw & t.m('dark', 'ink') & ero(jaw, 6), SHEET) if (jaw & t.m('dark', 'ink') & ero(jaw, 6)).any() else '#2A2E33'
PAL['tongue'] = t.color(jtongue, SHEET) if jtongue.any() else '#F2876F'
meta['upper'] = {'bbox': t.bbox(upper)}; meta['jaw'] = {'bbox': t.bbox(jaw)}
PAL['ink'] = t.color(INK & ero(dil(head, 2), 2) & ~ero(head, t.HALF), SHEET)
t.save_debug(W + '/dbg-parts.png', t.dbg)

# ================= cheer: raised wings, happy eyes, the open beak (raw cheer coordinates below) =================
x0, x1, cx = CFG['crops']['c']
u = Tracer(W + '/trace/c', x0, cx, LW)
UINK, UBG = u.INK, u.m('bg', 'shadow')
uSIL = fill(comp_at(~UBG, u.P(120, 160)))
uchord = u.line([(97, 155), (110, 157), (120, 157.6), (130, 157), (141, 155)], 1.6)
ucut = u.line([(97, 154.4), (90, 163), (86.6, 172)], 1.2) | u.line([(141, 154.4), (148, 163), (152.4, 172)], 1.2)
uhead_in = opn(fill(u.flood(~UINK & ~UBG & ~uchord & ~u.m(*YEL), (118, 100))), 3)
uhead = fill(u.to_ink(uhead_in))
ufree = ~UINK & ~UBG & ~dil(uhead_in, 2) & ~uchord & ~ucut & ~u.m('grey', *YEL) & ero(uSIL, u.HALF)
ubody_in = opn(fill(u.flood(ufree, (118, 200))), 2)
ubody = u.to_ink(ubody_in) | (dil(ubody_in, 12) & ucut)
UHOLD = {'L': (90, 160), 'R': (148, 160)}               # where each raised wing goes in behind the body
RAISE = {}
for s_ in 'LR':
    w = np.zeros(u.SH, bool)
    for a_, x_, y_, m in comps(ufree & ~ubody_in, 30):
        if y_ < u.Y(204) and ((x_ < u.X(100)) if s_ == 'L' else (x_ > u.X(138))): w |= m
    w = opn(fill(close(w, 4)), 2)
    wf = u.to_ink(w) | (dil(w, 12) & ucut)
    behind = dil(wf, 64) & (ubody | dil(uhead, u.HALF)) & ~u.below(205)
    wf = opn(close(fill(wf | behind | (u.hull(wf | u.disk(*UHOLD[s_], 5)) & ubody)), 3), 2)
    wshade = opn(u.m('white2', 'grey2') & ero(wf, 3), 2)
    u.c.off = (SHOULDER[s_][0] - UHOLD[s_][0], SHOULDER[s_][1] - UHOLD[s_][1])
    T['wing' + s_ + 'Up'] = u.F('k-body', wf) + u.F('k-body2', wshade, blur=2.4) + \
        u.inks(opn(UINK & ero(wf, u.HALF + 3) & ~dil(ubody_in, 3), 1), min_area=50) + u.outline(wf, where=~dil(ubody_in, 4), also=dil(uhead, u.HALF + 4))
    cw = u.centre(w)
    u.c.off = (0.0, 0.0)
    RAISE[s_] = raise_angle(cw, meta['wing' + s_]['c'], SHOULDER[s_])
    u.dbg['wing' + s_] = wf
meta['raise'] = RAISE

for s_, seed in (('L', (96, 112)), ('R', (139, 112))):
    arc = u.flood((UINK | u.m('dark')) & ero(uhead, 6) & u.disk(seed[0], seed[1] + 2, 14), seed)
    ab = u.bbox(arc); ex, ey = meta['eye' + s_][:2]
    u.c.off = (ex - (ab[0] + ab[2]) / 2, ey - 1 - (ab[1] + ab[3]) / 2)
    T['happy' + s_] = u.INKF(arc, blur=1.3)
    u.c.off = (0.0, 0.0)
    u.dbg['happy' + s_] = arc

UUPZ = u.poly([(100, 100), (134, 100), (136, 128), (117, 138), (100, 128)])
uupper_in = opn(fill(u.flood(u.m('grey', 'grey2') & UUPZ, (117, 112))), 2)
uupper = u.to_ink(uupper_in)
UJZ = u.poly([(99, 118), (136, 118), (136, 140), (127, 152), (108, 152), (99, 140)])
ujaw_all = opn(fill(close((~u.m('white', 'bg') | UINK) & UJZ & ~uupper_in, 3)), 3)
ujaw = (ero(ujaw_all, 10) | (ujaw_all & dil(uupper, 6))) & ~ero(uupper, 4)
ujaw = opn(close(ujaw, 3), 2)
nb, cb = meta['upper']['bbox'], u.bbox(uupper)
u.c.off = ((nb[0] + nb[2]) / 2 - (cb[0] + cb[2]) / 2, nb[1] - cb[1])
T['upperUp'] = u.F('k-beak', uupper) + u.F('k-beak0', opn(u.m('grey2') & ero(uupper, u.HALF + 2), 2), blur=2.4) + u.closed(uupper, 'ol')
utongue = opn(u.m('tongue') & ero(ujaw, 3), 2)
T['wide'] = u.F('k-mouth', ujaw) + u.F('k-beak', opn(u.m('grey', 'grey2') & ero(ujaw, 2), 1), blur=1.4) + u.F('k-tongue', utongue, blur=1.6) + u.closed(ujaw, 'ol')
u.c.off = (0.0, 0.0)
u.dbg['upper'] = uupper; u.dbg['jaw'] = ujaw; u.dbg['body'] = ubody
u.save_debug(W + '/dbg-cheer.png', u.dbg)

r1 = lambda v: [round(float(x), 1) for x in v]
consts = {
    'eye': {s_: r1(meta['eye' + s_][:4]) for s_ in 'LR'}, 'pupil': {s_: r1(meta['pupil' + s_]['ellipse'][:4]) for s_ in 'LR'},
    'room': {'pupil' + s_: meta['pupil' + s_]['room'] for s_ in 'LR'}, 'brow': {s_: r1(meta['brow' + s_]['c']) for s_ in 'LR'},
    'shoulder': SHOULDER, 'raise': RAISE, 'upper': r1(meta['upper']['bbox']), 'jaw': r1(meta['jaw']['bbox']), 'head': r1(hc),
    'crest': {k: {'root': r1(v['root']), 'tip': r1(v['tip'])} for k, v in CREST.items()},
    'ankle': {s_: r1(meta['leg' + s_]['ankle']) for s_ in 'LR'}, 'palette': PAL
}
notes.update({
    'head': 'the white head and its soft shade; its line is headLine. No chin line: the head runs into the chest',
    'tuft': 'the white tuft on the crown, drawn over the crest\'s roots; no line, and it runs on down into the crown',
    'crest2': 'the tallest crest feather. Each feather runs on toward its root, under the tuft, so its base stays whole as it swings',
    'body': 'the line runs on under the wings, so it is there when they lift',
    'wingLUp': 'raised, from the cheer drawing; turned back down to the hanging rest angle below',
    'eyeL': 'the blue ring and the white, shown only while the eye is open',
    'patchL': 'the pale blue patch a closed or happy eye sits on, as on the cheer drawing',
    'grin': 'the jaw under the upper beak: the grey rim, the dark mouth, the tongue and the line round it',
})
json.dump({'T': T, 'meta': meta, 'consts': consts, 'notes': notes}, open(W + '/trace/t.json', 'w'))
for k_, v in meta.items(): print(k_, v)
