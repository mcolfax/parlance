"""Trace Mango the yellow-headed amazon from his model sheet (reference/mango-sheet.webp), prepared by prep.py and
segmented by segment.py (run.sh). Writes <work>/trace/t.json: {T: named drawings, meta, consts, notes}.
Mango faces front (turn.setup 0). His yellow head ends in a fringe that hangs over the green chest with no line; the
tuft on his crown is cut off as one crest feather, so it springs. The wings hang between the outline and the lines
down the body's sides; his tail fans out behind his legs, showing either side of them. His eyes have whites inside a
line, which go with the open eye (the eye slot, as Rojo's), and there is no patch round them."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *

W, CFG = work('mango')
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'
T, meta, notes, PAL = {}, {}, {}, {}
LW = CFG['lw']
SHEET = W + '/sheet.png'
INKS = ('ink', 'pupil', 'blue2')        # the feet's lines and the wings' darkest edges come out as these

# ================= neutral: the setup pose =================
x0, x1, cx = CFG['crops']['n']
t = Tracer(W + '/trace/n', x0, cx, LW, ink=INKS)
INK, INKN = t.INK, t.INKN
BG = t.m('bg', 'shadow')
YEL = t.m('yellow', 'yellow2')
GREEN = t.m('green', 'green2')
FAR = t.right(186)                      # the cheer drawing's wing comes into the crop on the right
SIL = fill(~BG & ~FAR)

# ---- head: the yellow, down to the fringe over the chest; the tuft on the crown is the crest
head_in = opn(fill(t.flood(~INK & ~BG & ~GREEN & ~t.m('red', 'blue', 'grey') & ~FAR, (120, 85))), 3)
TUFT = t.poly([(100, 40), (140, 40), (140, 63.5), (100, 63.5)])
crest_in = head_in & TUFT
head_in = head_in & ~TUFT | (head_in & t.below(63.5))
head = fill(t.to_ink(head_in)) & ~TUFT
head = head | (t.hull(head & t.above(80)) & t.above(68) & ~TUFT)          # the crown runs on under the tuft
t.dbg['head'] = head

# ---- wings: every region between the outline and the lines down the body's sides (the feather lines split them)
# the lines between the thighs and the tail feathers beside them start a little below the wings
tcut = t.line([(85, 205), (84, 212), (86.4, 221), (90.6, 232)], 1.2) | t.line([(155.4, 205), (157, 212), (154.4, 221), (150.6, 232)], 1.2)
free = ~INK & ~BG & ~FAR & ~dil(head_in, 2) & ~t.m('grey') & ~tcut & ero(SIL, t.HALF)
SIDE = {'L': t.poly([(40, 138), (84, 138), (85.6, 216), (40, 216)]), 'R': t.poly([(156.4, 138), (200, 138), (200, 216), (155.8, 216)])}
wings_vis = {}
for s_ in 'LR':
    w = np.zeros(t.SH, bool)
    for a_, x_, y_, m in comps(free, 30):
        if SIDE[s_][int(y_), int(x_)]: w |= m
    wings_vis[s_] = opn(fill(close(w, 4)), 2)
    t.dbg['wing' + s_] = wings_vis[s_]

# ---- body: the green between the wings down to the thighs; the tail: the feathers either side of the legs
body_vis = opn(fill(t.flood(free & ~wings_vis['L'] & ~wings_vis['R'], (120, 190))), 2)
tail_vis = np.zeros(t.SH, bool)
for a_, x_, y_, m in comps(free & ~body_vis & ~wings_vis['L'] & ~wings_vis['R'] & t.below(205), 40):
    tail_vis |= m
tail_vis = opn(fill(close(tail_vis, 3)), 2)
t.dbg['body'] = body_vis; t.dbg['tail'] = tail_vis

# ---- face: brows; the eyes (white and line, pupil, glint); the beak (upper) and the jaw under it
WHITE = t.m('white')
eyes = {}
for s_, (ex, ey, er), wseed in (('L', (94, 98.5, 13.5), (86, 100)), ('R', (145.5, 99, 13.5), (154, 102))):
    white = fill(t.flood(WHITE & t.disk(ex, ey, er), wseed))
    eye = t.hull(fill(white | ((INK | WHITE) & t.disk(ex, ey, er) & ~t.m('yellow', 'yellow2'))))
    eye = opn(eye, 3)
    pupil = comps(opn(t.m('pupil') & ero(eye, 14), 3), 40)[0][3]
    pupil = t.hull(fill(pupil))
    glint = opn(WHITE & pupil, 1)
    lid = opn(INK & eye & ~dil(white, 1) & ~dil(pupil, 1), 1)
    eyes[s_] = dict(white=white, eye=eye, pupil=pupil, glint=glint, lid=lid)
    t.dbg['eye' + s_] = eye; t.dbg['pupil' + s_] = pupil

UPZ = t.poly([(104, 98), (136, 98), (138, 122), (120, 134), (102, 122)])
upper_in = opn(fill(t.flood(t.m('beak') & UPZ, (120, 110))), 2)
upper = fill(upper_in | (dil(upper_in, 14) & t.m('beakline')))                 # to the outside of its brown line
JZ = t.poly([(101, 112), (108, 112), (120, 128), (132, 112), (140, 112), (139, 128), (128, 138), (112, 138), (101, 128)])
jaw_all = opn(fill(close((t.m('grey', 'mouth', 'beakline', 'tongue') | INK) & JZ & ~upper_in, 3)), 3)
jaw = (ero(jaw_all, 10) | (jaw_all & dil(upper, 6))) & ~ero(upper, 4)
jaw = opn(close(jaw, 3), 2)
t.dbg['upper'] = upper; t.dbg['jaw'] = jaw

if STAGE == 'masks':
    t.save_debug(W + '/dbg-n.png', t.dbg)
    print('wrote', W + '/dbg-n.png'); sys.exit(0)

# ---- head drawing: the yellow, its shade, and the feather lines; the line is headLine; the tuft is the crest
face = dil(eyes['L']['eye'] | eyes['R']['eye'] | upper | jaw_all, 6)
inside = ero(head, t.HALF + 4)
BROW = {}
for s_, seed in (('L', (95, 74.5)), ('R', (145, 75.5))):
    BROW[s_] = t.flood(INK & inside & t.above(84), seed)
shade = opn(t.m('yellow2') & inside & ~face, 3)
marks = opn(INK & inside & ~face & ~BROW['L'] & ~BROW['R'], 1)
T['head'] = t.F('k-head', head) + t.F('k-head2', shade, blur=2.4) + t.inks(marks, min_area=40)
T['headLine'] = t.outline(head, where=dil(BG, t.HALF + 10) | dil(TUFT, 4), also=dil(TUFT, 2) & ~t.below(64))
crest = fill(t.to_ink(crest_in | (dil(crest_in, 30) & head & t.above(70) & TUFT)))
crest = opn(crest, 2) | (head & t.above(68) & dil(crest_in, 20))          # its root runs down into the crown
T['crest'] = t.F('k-head', crest) + t.outline(crest, where=t.above(63))
for s_ in 'LR':
    T['brow' + s_] = t.INKF(BROW[s_], blur=1.3)
    meta['brow' + s_] = {'c': t.centre(BROW[s_])}
PAL['head'] = t.color(t.m('yellow') & inside & ~face, SHEET); PAL['head2'] = t.color(shade, SHEET) if shade.any() else '#E6B820'
meta['head'] = {'bbox': t.bbox(head)}; meta['crest'] = {'bbox': t.bbox(crest), 'base': t.centre(crest & t.below(58))}

# ---- body: hidden sides and top carried on in one convex sweep under the wings and the fringe
wing_any = wings_vis['L'] | wings_vis['R']
chest = t.poly([(88, 120), (152, 120), (156, 150), (157, 205), (84, 205), (84, 150)])
hidden = dil(wing_any, t.HALF) | dil(head, t.HALF)
bc = t.to_ink(body_vis) | (dil(body_vis, 12) & tcut)
body = fill(bc | (t.hull(bc & t.above(205) | chest) & hidden & t.above(205)))
body = opn(close(body, 6), 3)
bshade = opn(t.m('green2') & ero(body, t.HALF) & ~dil(wing_any, 4) & ~dil(head, 4), 3)
bmarks = opn(INK & ero(body, t.HALF + 4) & ~dil(wing_any, t.HALF + 10) & ~dil(tcut, 12) & ~dil(head, 6), 1)
T['body'] = t.F('k-body', body) + t.F('k-body2', bshade, blur=2.4) + t.inks(bmarks, min_area=40) + \
    t.outline(body, where=~dil(head_in, 4), also=(dil(wing_any, t.HALF - 2) | dil(tcut, 8)) & t.below(140))
PAL['body'] = t.color(t.m('green') & ero(body_vis, 8), SHEET); PAL['body2'] = t.color(bshade, SHEET) if bshade.any() else '#21733F'
meta['body'] = {'bbox': t.bbox(body)}

# ---- wings: the red shoulder, the green coverts, the blue flight feathers; layered so only the borders carry detail
SHOULDER = {'L': (84, 146), 'R': (156, 146)}
for s_ in 'LR':
    w = wings_vis[s_]
    wf = t.to_ink(w)
    root = t.hull(wf | t.disk(*SHOULDER[s_], 5)) & dil(head, t.HALF)
    wf = opn(close(fill(wf | root), 3), 2)
    inner_w = ero(wf, 3)
    green_ = opn(t.m('green', 'green2', 'blue') & inner_w, 2); blue_ = opn(t.m('blue') & inner_w, 2); dark_ = opn(t.m('green2') & inner_w & ~blue_, 3)
    lines = opn(INK & ero(wf, t.HALF + 3), 1)
    T['wing' + s_] = t.F('k-wing', wf) + t.F('k-body', green_, blur=2.2) + t.F('k-body2', dark_, blur=2.4) + t.F('k-wing2', blue_, blur=2.2) + t.inks(lines, min_area=50) + t.outline(wf, where=~dil(head, 2))
    meta['wing' + s_] = {'bbox': t.bbox(wf), 'c': t.centre(w)}
    if s_ == 'L': PAL['wing'] = t.color(t.m('red') & inner_w, SHEET); PAL['wing2'] = t.color(blue_, SHEET)

# ---- tail: the feathers either side of the legs, joined behind them
troot = t.poly([(86, 205), (154, 205), (150, 232), (90, 232)])
tail = fill(t.to_ink(tail_vis) | troot)
tail = opn(close(tail, 4), 2)
tlines = opn(INK & ero(tail, t.HALF + 3) & ~troot, 1)
T['tail'] = t.F('k-tail o', tail) + t.inks(tlines, min_area=40)
PAL['tail'] = t.color(t.m('green', 'green2') & ero(tail_vis, 6), SHEET)
meta['tail'] = {'bbox': t.bbox(tail)}

# ---- legs and feet: grey, with the toes' lines and the dark claws; a stub runs up under the thighs
for s_, seed in (('L', (98, 247)), ('R', (142, 247))):
    f = fill(close(t.flood(t.m('grey'), seed), 2))
    ff = t.to_ink(f)
    bb = t.bbox(f & t.above(242))
    stub = t.poly([(bb[0] + 1, 226), (bb[2] - 1, 226), (bb[2] - 1, 240), (bb[0] + 1, 240)])
    foot = opn(fill(close(ff | stub, 3)), 2)
    toes = opn(INK & ero(foot, t.HALF + 3) & t.below(243), 1)
    T['leg' + s_] = t.F('k-feet o', foot) + t.inks(toes, min_area=30)
    meta['leg' + s_] = {'bbox': t.bbox(foot), 'ankle': t.centre(foot & t.below(236) & t.above(244))}
PAL['feet'] = t.color(t.m('grey') & t.below(240) & ero(SIL, 20), SHEET)

# ---- eyes: the white and its lid line (eye slot), the pupil with its glint
for s_, e_ in eyes.items():
    T['eye' + s_] = t.F('k-white', e_['eye'], blur=1.6) + t.INKF(e_['lid'], blur=1.3)
    T['pupil' + s_] = t.F('k-pupil', e_['pupil'], blur=1.4) + t.F('k-glint', e_['glint'], blur=1.1, turd=4)
    ell, pe = t.fit_ellipse(e_['eye']), t.fit_ellipse(e_['pupil'])
    meta['eye' + s_] = ell; meta['pupil' + s_] = {'ellipse': pe, 'room': pupil_room(t, e_['white'] | e_['pupil'], pe)}
PAL['white'] = t.color(eyes['L']['white'], SHEET); PAL['pupil'] = t.color(eyes['L']['pupil'] & ~dil(eyes['L']['glint'], 4), SHEET)

# ---- beak: the cream upper beak inside its brown line, with the nostrils; the jaw: grey edge, dark mouth, ink line
bline = opn(t.m('beakline') & upper & ~ero(upper, 16), 1)
nost = opn(t.m('beakline', 'pupil', 'ink') & ero(upper, 16), 1)
T['upper'] = t.F('k-beak', upper) + t.INKF(bline, blur=1.2, cls='k-beak3') + t.inks(nost, min_area=10, cls='k-beak3')
jgrey = opn(t.m('grey') & ero(jaw, 2), 1)
T['grin'] = t.F('k-mouth', jaw) + t.F('k-beak2', jgrey, blur=1.4) + t.closed(jaw, 'ol')
PAL['beak'] = t.color(t.m('beak') & ero(upper, 16), SHEET); PAL['beak3'] = t.color(bline, SHEET)
PAL['beak2'] = t.color(jgrey, SHEET) if jgrey.any() else '#B4B4A0'; PAL['mouth'] = t.color(t.m('mouth') & jaw, SHEET) if (t.m('mouth') & jaw).any() else '#4A2A20'
meta['upper'] = {'bbox': t.bbox(upper)}; meta['jaw'] = {'bbox': t.bbox(jaw)}
PAL['ink'] = t.color(t.m('ink') & ero(dil(head, 2), 2) & ~ero(head, t.HALF), SHEET)
t.save_debug(W + '/dbg-parts.png', t.dbg)

# ================= cheer: raised wings, happy eyes, the open beak (raw cheer coordinates below) =================
x0, x1, cx = CFG['crops']['c']
u = Tracer(W + '/trace/c', x0, cx, LW, ink=INKS)
UINK, UBG = u.INK, u.m('bg', 'shadow')
uSIL = fill(comp_at(~UBG, u.P(120, 160)))          # this drawing only, not the edge of the next one
uhead_in = opn(fill(u.flood(~UINK & ~UBG & ~u.m('green', 'green2', 'red', 'blue', 'grey'), (118, 85))), 3)
uhead = fill(u.to_ink(uhead_in))
# the lines down the body's sides start just under the fringe and break here and there: cut along them, up into it
ucut = u.line([(79.4, 200), (79.2, 190), (80, 178), (82.4, 165), (86, 152), (87.6, 142), (89.4, 136)], 1.2) | \
    u.line([(160.6, 200), (160.8, 190), (160, 178), (157.6, 165), (154.4, 152), (152.6, 142), (150.8, 136)], 1.2)
ufree = ~UINK & ~UBG & ~dil(uhead_in, 2) & ~u.m('grey') & ~ucut & ero(uSIL, u.HALF)
ubody_in = opn(fill(u.flood(ufree, (118, 195))), 2)
ubody = u.to_ink(ubody_in) | (dil(ubody_in, 12) & ucut)
UHOLD = {'L': (86, 150), 'R': (150, 150)}               # where each raised wing goes in behind the body
RAISE = {}
for s_ in 'LR':
    w = np.zeros(u.SH, bool)
    for a_, x_, y_, m in comps(ufree & ~ubody_in, 30):
        if y_ < u.Y(204) and ((x_ < u.X(100)) if s_ == 'L' else (x_ > u.X(138))): w |= m
    w = opn(fill(close(w, 4)), 2)
    wf = u.to_ink(w) | (dil(w, 12) & ucut)
    behind = dil(wf, 64) & (ubody | dil(uhead, u.HALF)) & ~u.below(200)
    wf = opn(close(fill(wf | behind | (u.hull(wf | u.disk(*UHOLD[s_], 5)) & ubody)), 3), 2)
    inner_w = ero(wf, 3)
    green_ = opn(u.m('green', 'green2', 'blue') & inner_w, 2); blue_ = opn(u.m('blue') & inner_w, 2)
    u.c.off = (SHOULDER[s_][0] - UHOLD[s_][0], SHOULDER[s_][1] - UHOLD[s_][1])
    T['wing' + s_ + 'Up'] = u.F('k-wing', wf) + u.F('k-body', green_, blur=2.4) + u.F('k-wing2', blue_, blur=2.4) + \
        u.inks(opn(UINK & ero(wf, u.HALF + 3) & ~dil(ubody_in, 3), 1), min_area=50) + u.outline(wf, where=~dil(ubody_in, 4), also=dil(uhead, u.HALF + 4))
    cw = u.centre(w)
    u.c.off = (0.0, 0.0)
    RAISE[s_] = raise_angle(cw, meta['wing' + s_]['c'], SHOULDER[s_])
    u.dbg['wing' + s_] = wf
meta['raise'] = RAISE

for s_, seed in (('L', (95, 98)), ('R', (139, 100))):
    arc = u.flood(UINK & ero(uhead, 6) & u.disk(seed[0], seed[1] + 2, 14), seed)
    ab = u.bbox(arc); ex, ey = meta['eye' + s_][:2]
    u.c.off = (ex - (ab[0] + ab[2]) / 2, ey - 1 - (ab[1] + ab[3]) / 2)
    T['happy' + s_] = u.INKF(arc, blur=1.3)
    u.c.off = (0.0, 0.0)
    u.dbg['happy' + s_] = arc

UUPZ = u.poly([(104, 93), (134, 93), (134, 118), (119, 130), (104, 118)])
uupper_in = opn(fill(u.flood(u.m('beak') & UUPZ, (119, 105))), 2)
uupper = fill(uupper_in | (dil(uupper_in, 14) & u.m('beakline')))
UJZ = u.poly([(100, 108), (138, 108), (138, 132), (128, 143), (110, 143), (100, 132)])
ujaw_all = opn(fill(close((u.m('grey', 'mouth', 'beakline', 'tongue') | UINK) & UJZ & ~uupper_in, 3)), 3)
ujaw = (ero(ujaw_all, 10) | (ujaw_all & dil(uupper, 6))) & ~ero(uupper, 4)
ujaw = opn(close(ujaw, 3), 2)
nb, cb = meta['upper']['bbox'], u.bbox(uupper)
u.c.off = ((nb[0] + nb[2]) / 2 - (cb[0] + cb[2]) / 2, nb[1] - cb[1])
T['upperUp'] = u.F('k-beak', uupper) + u.INKF(opn(u.m('beakline') & uupper & ~ero(uupper, 16), 1), blur=1.2, cls='k-beak3') + u.inks(opn(u.m('beakline', 'pupil', 'ink') & ero(uupper, 16), 1), min_area=10, cls='k-beak3')
utongue = opn(u.m('tongue') & ero(ujaw, 3), 2)
T['wide'] = u.F('k-mouth', ujaw) + u.F('k-tongue', utongue, blur=1.6) + u.F('k-beak2', opn(u.m('grey') & ero(ujaw, 2), 1), blur=1.4) + u.closed(ujaw, 'ol')
PAL['tongue'] = u.color(utongue, SHEET) if utongue.any() else '#EF8080'
u.c.off = (0.0, 0.0)
u.dbg['upper'] = uupper; u.dbg['jaw'] = ujaw; u.dbg['body'] = ubody
u.save_debug(W + '/dbg-cheer.png', u.dbg)

r1 = lambda v: [round(float(x), 1) for x in v]
consts = {
    'eye': {s_: r1(meta['eye' + s_][:4]) for s_ in 'LR'}, 'pupil': {s_: r1(meta['pupil' + s_]['ellipse'][:4]) for s_ in 'LR'},
    'room': {'pupil' + s_: meta['pupil' + s_]['room'] for s_ in 'LR'}, 'brow': {s_: r1(meta['brow' + s_]['c']) for s_ in 'LR'},
    'shoulder': SHOULDER, 'raise': RAISE, 'upper': r1(meta['upper']['bbox']), 'jaw': r1(meta['jaw']['bbox']), 'crest': r1(meta['crest']['base']),
    'ankle': {s_: r1(meta['leg' + s_]['ankle']) for s_ in 'LR'}, 'palette': PAL
}
notes.update({
    'head': 'the yellow head and its shade; its line is headLine. The fringe over the chest has no line',
    'crest': 'the tuft on the crown, cut off so it springs; its root runs down into the crown',
    'body': 'the line runs on under the wings, so it is there when they lift',
    'wingLUp': 'raised, from the cheer drawing; turned back down to the hanging rest angle below',
    'tail': 'the feathers either side of the legs, joined behind them',
    'eyeL': 'the eye\'s white and its lid line, shown only while the eye is open',
    'grin': 'the jaw under the upper beak: the grey edge, the dark mouth and the line round it',
    'wide': 'the cheer drawing\'s open beak, set so its upper beak is where the neutral one is',
})
json.dump({'T': T, 'meta': meta, 'consts': consts, 'notes': notes}, open(W + '/trace/t.json', 'w'))
for k_, v in meta.items(): print(k_, v)
