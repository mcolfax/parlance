"""Trace Rojo the scarlet macaw from his model sheet (reference/rojo-sheet.webp), prepared by prep.py and segmented by
segment.py (run.sh). Writes <work>/trace/t.json: {T: named drawings, meta, consts, notes}.
Rojo stands turned a little to the viewer's right, as Pip does, so his part sheet follows Pip's: the head runs into
the chest with no chin line, the near wing hangs over the body's side, the far wing is a strip on the far side, and the
long tail sweeps out behind to the left. His face is bare white skin round each eye; the eyes have whites with a line
round them, and the white skin goes with the eye (the patch slot), so it moves with the eye as he turns his head."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *

W, CFG = work('rojo')
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'
T, meta, notes = {}, {}, {}
LW = CFG['lw']

# ================= neutral: the setup pose =================
x0, x1, cx = CFG['crops']['n']
t = Tracer(W + '/trace/n', x0, cx, LW)
INK, INKN = t.INK, t.INKN
BG = t.m('bg', 'shadow')
RED = t.m('red', 'red2', 'pink')
FEET = t.m('feet', 'feet2')
FAR = t.right(185)                      # the cheer drawing's wing comes into the crop on the right

# ---- head: the red round the face, with the face inside it. No chin line: it is closed across the chest from the
# end of the left cheek's line to the start of the right one
chord = t.line([(95.2, 129.2), (100, 132.4), (112, 135.4), (122, 135.6), (132, 134.4), (140, 131.6), (146.8, 127)], 1.6)
head_in = fill(t.flood(~INK & ~BG & ~chord & ~FAR, (120, 70)))
head_in = opn(head_in, 3)
head = fill(t.to_ink(head_in) | (dil(head_in, 12) & chord))
t.dbg['head'] = head

# ---- wings. The near wing (L) hangs between the outline and the line down its inner side; the far wing (R) is the
# strip between the body's far outline and the line down its inner side. Both inner lines start a little below the
# chin, so a cut runs from each up to the head
# (the lines fade out partway, so each cut runs on along the wing's inner edge to its tip)
cut = {'L': t.line([(100.6, 131), (102.6, 133.4), (105.4, 142), (106.8, 152), (106.6, 162), (105, 172), (102.4, 182), (98.6, 190), (94, 197), (89.6, 203), (86, 209)], 1.2),
       'R': t.line([(149.6, 130.6), (150.4, 146.6), (148.8, 156), (147.6, 166), (147.4, 176), (147.8, 186), (149, 194), (151.4, 200), (154, 205)], 1.2)}
# a wing is every region inside its outline on its side of the cut (the feather lines between them close some off)
SIDE = {'L': t.poly([(60, 128), (101, 128), (107, 150), (106, 172), (96, 196), (84, 212), (60, 212)]),
        'R': t.poly([(149, 126), (185, 126), (185, 214), (152, 214), (147, 190), (147, 160)])}
SIL = fill(~BG)
free = ~INK & ~BG & ~chord & ~cut['L'] & ~cut['R'] & ~head & ~FEET & ero(SIL, t.HALF)
wings_vis = {}
for s_ in 'LR':
    w = np.zeros(t.SH, bool)
    for a_, x_, y_, m in comps(free, 30):
        if SIDE[s_][int(y_), int(x_)]: w |= m
    w = fill(close(w, 4))
    wings_vis[s_] = w
    t.dbg['wing' + s_] = w

# ---- body: the red between the wings, down to the thighs. Its sides behind the wings and its top under the head
# are carried on in one convex sweep, so the body is whole when the wings lift or the head turns
body_vis = fill(t.flood(free & ~wings_vis['L'] & ~wings_vis['R'], (125, 185)))
body_vis = opn(body_vis, 2)
chest = t.poly([(92, 128), (148, 126), (156, 145), (159, 175), (156, 198), (90, 198), (86, 175), (87, 145)])
hidden = dil(wings_vis['L'] | wings_vis['R'], t.HALF) | dil(head, t.HALF)
bc = t.to_ink(body_vis) | (dil(body_vis, 12) & (cut['L'] | cut['R'] | chord))
body = fill(bc | (t.hull(bc & t.above(200) | chest) & hidden & t.above(200)))
body = opn(close(body, 6), 3)
t.dbg['body'] = body

# ---- tail: the long blue feathers out to the left, carried on behind the near wing and the legs to the body
tail_vis = fill(t.flood(~INK & ~BG & ~FEET & t.left(100) & t.below(196), (60, 228)))
tail_vis = opn(tail_vis, 2)
tail_root = t.hull(tail_vis | t.disk(104, 204, 5)) & (dil(wings_vis['L'], t.HALF) | body | t.right(95))
tail = fill(t.to_ink(tail_vis) | (tail_root & ~t.below(238)))
tail = opn(close(tail, 4), 2)
t.dbg['tail'] = tail

# ---- legs and feet: grey, with the toes' lines; a stub runs up under the thighs
legs = {}
for s_, seed in (('L', (96, 246)), ('R', (148, 246))):
    f = fill(close(t.flood(FEET, seed), 2))
    ff = t.to_ink(f)
    bb = t.bbox(f & t.above(236))
    stub = t.poly([(bb[0] + 1, 218), (bb[2] - 1, 218), (bb[2] - 1, 232), (bb[0] + 1, 232)])
    foot = fill(close(ff | stub, 3))
    legs[s_] = foot
    t.dbg['leg' + s_] = foot

# ---- face: the white skin round each eye; the eye, its white inside a line, the pupil and its glint
WHITE = t.m('white', 'beak')
eyes = {}
# (the right eye's line touches the beak's, so each line is taken only near its eye)
for s_, skin_seed, ring_seed, (ex, ey, er) in (('L', (91, 120), (95.6, 100), (103.5, 97.5, 13)), ('R', (151, 112), (148.6, 92), (141.5, 91, 11.5))):
    ring = t.flood(INK & ero(head, 6) & t.disk(ex, ey, er), ring_seed)
    eye = t.hull(fill(ring))
    rw = 2.0                                                    # the eye's line, about 2 units
    band = eye & ~ero(eye, int(rw * 8))
    pupil = comps(INK & ero(eye, int(rw * 8) + 3), 40)[0][3]
    pupil = opn(fill(pupil), 2)
    glint = opn(WHITE & pupil, 1) | comps(fill(pupil) & ~pupil & ~INK, 10)[0][3] if (fill(pupil) & ~pupil).any() else opn(WHITE & ero(eye, 10) & dil(pupil, 2) & fill(dil(pupil, 4)), 1)
    skin = fill(close(t.flood(WHITE & head & ~eye, skin_seed) | eye, 3))
    skin = opn(skin, 3)
    eyes[s_] = dict(ring=ring, eye=eye, band=band, pupil=pupil, glint=glint, skin=skin)
    t.dbg['skin' + s_] = skin; t.dbg['eye' + s_] = eye; t.dbg['pupil' + s_] = pupil

# ---- beak: the ivory upper beak, and the open jaw under it inside the beak's outer line
upper_in = fill(t.flood(WHITE | t.m('beak2'), (124, 100)) & ~eyes['L']['skin'] & ~eyes['R']['skin'])
upper_in = opn(upper_in, 3)
upper = t.to_ink(upper_in)
# the jaw: everything inside the beak's outer line below the upper beak (the line doesn't quite close at the corner)
JAWZONE = t.poly([(106.4, 107), (114, 105.4), (126, 115), (141.6, 110), (142, 126), (128, 131.4), (113, 129), (105.6, 118)])
jaw_all = fill(close((t.m('mouth', 'grey', 'white', 'beak', 'beak2') | INK) & JAWZONE & ~eyes['L']['skin'] & ~eyes['R']['skin'], 3))
jaw_all = opn(jaw_all, 3)
lw_j = 10                                                    # half the jaw's outer line, 1.25 units
jaw = (ero(jaw_all, lw_j) | (jaw_all & dil(upper, 6))) & ~ero(upper, 4)
jaw = opn(close(jaw, 3), 2)
t.dbg['upper'] = upper; t.dbg['jaw'] = jaw

if STAGE == 'masks':
    t.save_debug(W + '/dbg-n.png', t.dbg)
    print('wrote', W + '/dbg-n.png'); sys.exit(0)

SHEET = W + '/sheet.png'
YEL, BLUE, BLUE2, GREY = t.m('yellow'), t.m('blue'), t.m('blue2'), t.m('grey')
PAL = {}

# ---- head drawing: the red, its shade, the feather lines on the crown and cheeks; the line is headLine
face = dil(eyes['L']['skin'] | eyes['R']['skin'] | upper | jaw_all, 6)
inside = ero(head, t.HALF + 4)
shade = opn(t.m('red2') & inside & ~face, 2)
head_marks = opn(INK & inside & ~face, 1)
T['head'] = t.F('k-body', head) + t.F('k-body2', shade, blur=2.2) + t.inks(head_marks, min_area=30)
T['headLine'] = t.outline(head, where=~dil(chord, 10))
PAL['body'] = t.color(t.m('red') & inside & ~face, SHEET); PAL['body2'] = t.color(shade, SHEET) if shade.any() else '#B0321C'
meta['head'] = {'bbox': t.bbox(head)}

# ---- body: its line runs on under the wings, so it is there when they lift; none under the head
wing_any = wings_vis['L'] | wings_vis['R']
bmarks = opn(INK & ero(body, t.HALF + 4) & ~dil(wing_any, 6) & ~dil(head, 6), 1)
gloss = opn(t.m('pink') & ero(body, t.HALF) & ~dil(head, 4) & ~dil(wing_any, 4), 2)
bshade = opn(t.m('red2') & ero(body, t.HALF) & ~dil(head, 4) & ~dil(wing_any, 4), 2)
T['body'] = t.F('k-body', body) + t.F('k-body2', bshade, blur=2.2) + t.F('k-gloss', gloss, blur=2.0) + t.inks(bmarks, min_area=30) + \
    t.outline(body, where=~dil(head_in, 4), also=dil(wing_any, t.HALF - 2) & t.below(140))
PAL['gloss'] = t.color(gloss, SHEET)
meta['body'] = {'bbox': t.bbox(body)}

# ---- wings: the red shoulder, the yellow coverts and the blue flight feathers, with their lines; the top is carried
# on under the head toward the shoulder, so the root is whole when the wing lifts
SHOULDER = {'L': (96, 136), 'R': (153, 136)}
for s_ in 'LR':
    w = wings_vis[s_]
    wf = t.to_ink(w) | (dil(w, 12) & cut[s_])
    root = t.hull(wf | t.disk(*SHOULDER[s_], 5)) & dil(head, t.HALF)
    wf = opn(close(fill(wf | root), 3), 2)
    inner_w = ero(wf, 3)
    yel, blue, blue2 = opn((YEL | BLUE | BLUE2) & inner_w, 2), opn((BLUE | BLUE2) & inner_w, 2), opn(BLUE2 & inner_w, 3)
    lines = opn(INK & ero(wf, t.HALF + 3), 1)
    run = t.outline(wf, where=~dil(head, 2), also=dil(cut[s_], 6))
    T['wing' + s_] = t.F('k-body', wf) + t.F('k-wing', yel, blur=2.2) + t.F('k-wing2', blue, blur=2.2) + t.inks(lines, min_area=50) + run
    meta['wing' + s_] = {'bbox': t.bbox(wf), 'c': t.centre(w)}
    if s_ == 'L': PAL['wing'] = t.color(YEL & inner_w, SHEET); PAL['wing2'] = t.color(BLUE & inner_w, SHEET)
    t.dbg['wf' + s_] = wf

# ---- tail
tlines = opn(INK & ero(tail, t.HALF + 3), 1)
tdark = opn(BLUE2 & ero(tail, 3), 1)
T['tail'] = t.F('k-tail o', tail) + t.inks(tlines, min_area=50)
PAL['tail'] = t.color(BLUE & ero(tail, 6), SHEET)
meta['tail'] = {'bbox': t.bbox(tail)}

# ---- legs
for s_, foot in legs.items():
    toes = opn(INK & ero(foot, t.HALF + 3) & t.below(236), 1)
    dark = opn(t.m('feet2') & ero(foot, 3), 2)
    T['leg' + s_] = t.F('k-feet o', foot) + t.F('k-feet2', dark, blur=1.6) + t.inks(toes, min_area=30)
    meta['leg' + s_] = {'bbox': t.bbox(foot), 'ankle': t.centre(foot & t.below(226) & t.above(236))}
PAL['feet'] = t.color(t.m('feet') & ero(legs['L'], 4), SHEET); PAL['feet2'] = t.color(t.m('feet2') & ero(legs['L'], 4), SHEET)

# ---- face: the skin (patch slot), the eye's white and line (eye slot), the pupil, and a brow that is the top of
# the eye's line (at rest it lies on the line; it lifts off it when Rojo frowns or is surprised)
for s_, e_ in eyes.items():
    skin, eye, pupil, glint = e_['skin'], e_['eye'], e_['pupil'], e_['glint']
    feathers = opn(t.m('red', 'red2') & ero(skin, 2) & ~dil(eye, 4), 1)
    ring = INK & eye & ~ero(eye, 2 * 8 + 2)
    ring = opn(ring | (INK & dil(ring, 2) & eye & ~dil(pupil, 1)), 1)
    T['patch' + s_] = t.F('k-face', skin, blur=2.5) + t.F('k-body', feathers, blur=1.4)
    T['eye' + s_] = t.F('k-white', eye, blur=1.6) + t.INKF(ring & ~dil(pupil, 1), blur=1.2)
    T['pupil' + s_] = t.F('k-ink', pupil, blur=1.4) + t.F('k-glint', glint, blur=1.1, turd=4)
    ell = t.fit_ellipse(eye); pe = t.fit_ellipse(pupil)
    brow = ring & t.above(ell[1] - ell[3] * 0.35) & ~dil(pupil, 2)
    T['brow' + s_] = t.INKF(brow, blur=1.2)
    meta['eye' + s_] = ell; meta['pupil' + s_] = {'ellipse': pe, 'glint': t.centre(glint) if glint.any() else None, 'room': pupil_room(t, eye & ~dil(INK & eye & ~ero(eye, 18), 2), pe)}
    meta['brow' + s_] = {'c': t.centre(brow) if brow.any() else ell[:2]}
    meta['skin' + s_] = {'bbox': t.bbox(skin), 'c': t.centre(skin)}
    if s_ == 'L': PAL['face'] = t.color(t.m('white') & ero(skin, 6) & ~dil(eye, 4), SHEET); PAL['white'] = t.color(t.m('white') & ero(eye, 20) & ~dil(pupil, 3), SHEET)

# ---- beak: the upper beak with its gleam; the open jaw (the dark mouth, the grey edge, the pale lower beak)
gleam = opn(t.m('white') & ero(upper, t.HALF + 2), 2)
T['upper'] = t.F('k-beak', upper) + t.F('k-beak0', gleam, blur=2.4) + t.closed(upper, 'ol')
jgrey = opn(GREY & ero(jaw, 2), 1)
jpale = opn(t.m('white', 'beak') & ero(jaw, 2) & ~dil(upper, 4), 1)
jmarks = opn(INK & ero(jaw, 6) & ~dil(upper, 4), 1)
T['grin'] = t.F('k-mouth', jaw) + t.F('k-beak3', jgrey, blur=1.4) + t.F('k-beak2', jpale, blur=1.4) + t.inks(jmarks, min_area=20) + t.closed(jaw, 'ol')
PAL['beak'] = t.color(t.m('beak') & ero(upper, 10), SHEET); PAL['beak0'] = t.color(gleam, SHEET) if gleam.any() else '#FFFAEE'
PAL['mouth'] = t.color(t.m('mouth') & jaw, SHEET); PAL['beak3'] = t.color(jgrey, SHEET) if jgrey.any() else '#A5A8A0'
PAL['beak2'] = t.color(jpale, SHEET) if jpale.any() else '#F4EEDC'
meta['upper'] = {'bbox': t.bbox(upper), 'c': t.centre(upper)}; meta['jaw'] = {'bbox': t.bbox(jaw)}
PAL['ink'] = t.color(INK & ero(dil(head, 2), 2) & ~ero(head, t.HALF), SHEET)
t.save_debug(W + '/dbg-parts.png', t.dbg)
np.save(W + '/trace/t-masks.npy', t.dbg, allow_pickle=True)

# ================= cheer: raised wings, happy eyes, the open beak (raw cheer coordinates below) =================
x0, x1, cx = CFG['crops']['c']
u = Tracer(W + '/trace/c', x0, cx, LW)
UINK, UBG = u.INK, u.m('bg', 'shadow')
uchord = u.line([(100.5, 133.6), (110, 133), (120, 134), (130, 134), (140, 133), (146.4, 131)], 1.6)
ucut = u.line([(100.4, 132.6), (101.4, 140), (102.2, 148.6), (101.6, 155)], 1.2) | u.line([(146, 130.6), (147.4, 136), (148.2, 141.4), (148.8, 148)], 1.2)
uhead_in = opn(fill(u.flood(~UINK & ~UBG & ~uchord, (118, 70))), 3)
uhead = fill(u.to_ink(uhead_in) | (dil(uhead_in, 12) & uchord))
uSIL = fill(~UBG)
ufree = ~UINK & ~UBG & ~uchord & ~ucut & ~uhead & ~u.m('feet', 'feet2') & ero(uSIL, u.HALF)
ubody_in = fill(u.flood(ufree, (124, 175)))
ubody = u.to_ink(ubody_in) | (dil(ubody_in, 12) & ucut)
USIDE = {'L': u.poly([(0, 30), (99, 30), (102, 150), (96, 188), (0, 188)]), 'R': u.poly([(149, 30), (240, 30), (240, 188), (150, 188), (149, 150)])}
UHOLD = {'L': (100, 140), 'R': (148, 138)}               # where each raised wing goes in behind the body
RAISE = {}
for s_ in 'LR':
    w = np.zeros(u.SH, bool)
    for a_, x_, y_, m in comps(ufree & ~ubody_in, 30):
        if USIDE[s_][int(y_), int(x_)]: w |= m
    w = opn(fill(close(w, 4)), 2)
    wf = u.to_ink(w) | (dil(w, 12) & ucut)
    behind = dil(wf, 64) & (ubody | dil(uhead, u.HALF)) & ~u.below(190)      # on in behind the body to the shoulder
    wf = opn(close(fill(wf | behind | (u.hull(wf | u.disk(*UHOLD[s_], 5)) & ubody)), 3), 2)
    inner_w = ero(wf, 3)
    off = (SHOULDER[s_][0] - UHOLD[s_][0], SHOULDER[s_][1] - UHOLD[s_][1])
    u.c.off = off
    run = u.outline(wf, where=~dil(ubody_in, 4), also=dil(uhead, u.HALF + 4))      # lined along the head too, for other angles
    # the colors are layered: yellow under everything feathered, blue over the outer feathers, so each layer's outer
    # edge is the wing's (hidden under its line) and only the borders between colors carry detail
    ylw = opn(u.m('yellow', 'blue', 'blue2') & inner_w, 2); blu = opn(u.m('blue', 'blue2') & inner_w, 2)
    T['wing' + s_ + 'Up'] = u.F('k-body', wf) + u.F('k-wing', ylw, blur=2.4) + u.F('k-wing2', blu, blur=2.4) + \
        u.inks(opn(UINK & ero(wf, u.HALF + 3) & ~dil(ubody_in, 3), 1), min_area=50) + run
    cw = u.centre(w)
    u.c.off = (0.0, 0.0)
    RAISE[s_] = raise_angle(cw, meta['wing' + s_]['c'], SHOULDER[s_])
    u.dbg['wing' + s_] = wf
meta['raise'] = RAISE

# happy eyes: the arcs, each centred on its neutral eye
for s_, seed in (('L', (99.6, 97.4)), ('R', (141.4, 94))):
    arc = u.flood(UINK & ero(uhead, 6) & u.disk(seed[0], seed[1] + 2, 14), seed)
    ab = u.bbox(arc); ex, ey = meta['eye' + s_][:2]
    u.c.off = (ex - (ab[0] + ab[2]) / 2, ey - 1 - (ab[1] + ab[3]) / 2)
    T['happy' + s_] = u.INKF(arc, blur=1.3)
    u.c.off = (0.0, 0.0)
    meta['happy' + s_] = ab
    u.dbg['happy' + s_] = arc

# the open beak: the raised upper beak (beak up) and the jaw with the tongue (mouth wide), set so the upper beak's
# top is where the neutral one's is
UW = u.m('white', 'beak', 'beak2')
uupper_in = opn(fill(u.flood(UW, (121, 92)) & ero(uhead, 8)), 3)
uupper = u.to_ink(uupper_in)
UJZ = u.poly([(104, 104), (112, 103), (122, 112), (136, 104), (142, 110), (140, 128), (128, 134), (112, 132), (104, 120)])
uskin = fill(close(u.flood(u.m('white') & ~UINK, (95, 113)) | u.flood(u.m('white') & ~UINK, (150, 110)), 3))
ujaw_all = opn(fill(close(~u.m('red') & ~UBG & ~uskin & ~dil(uskin, 2) & UJZ & ~uupper_in, 3)), 3)
ujaw = (ero(ujaw_all, 10) | (ujaw_all & dil(uupper, 6))) & ~ero(uupper, 4)
ujaw = opn(close(ujaw, 3), 2)
nb, cb = meta['upper']['bbox'], u.bbox(uupper)
u.c.off = ((nb[0] + nb[2]) / 2 - (cb[0] + cb[2]) / 2, nb[1] - cb[1])
ugleam = opn(u.m('white') & ero(uupper, u.HALF + 2), 2)
T['upperUp'] = u.F('k-beak', uupper) + u.F('k-beak0', ugleam, blur=2.4) + u.closed(uupper, 'ol')
utongue = opn(u.m('pink') & ero(ujaw, 3), 2)
upale = opn(u.m('white', 'beak', 'grey') & ero(ujaw, 2) & ~dil(uupper, 4), 1)
T['wide'] = u.F('k-mouth', ujaw) + u.F('k-tongue', utongue, blur=1.6) + u.F('k-beak2', upale, blur=1.4) + u.closed(ujaw, 'ol')
meta['upperUp'] = u.bbox(uupper); meta['wide'] = u.bbox(ujaw)
PAL['tongue'] = u.color(utongue, SHEET) if utongue.any() else '#EF7A86'
u.c.off = (0.0, 0.0)
u.dbg['upper'] = uupper; u.dbg['jaw'] = ujaw; u.dbg['body'] = ubody
u.save_debug(W + '/dbg-cheer.png', u.dbg)
meta['palette'] = PAL
r1 = lambda v: [round(float(x), 1) for x in v]
consts = {
    'eye': {s_: r1(meta['eye' + s_][:4]) for s_ in 'LR'}, 'pupil': {s_: r1(meta['pupil' + s_]['ellipse'][:2]) for s_ in 'LR'},
    'room': {'pupil' + s_: meta['pupil' + s_]['room'] for s_ in 'LR'}, 'brow': {s_: r1(meta['brow' + s_]['c']) for s_ in 'LR'},
    'shoulder': SHOULDER, 'raise': RAISE, 'upper': r1(meta['upper']['bbox']), 'jaw': r1(meta['jaw']['bbox']),
    'ankle': {s_: r1(meta['leg' + s_]['ankle']) for s_ in 'LR'}, 'palette': PAL
}
json.dump({'T': T, 'meta': meta, 'consts': consts, 'notes': notes}, open(W + '/trace/t.json', 'w'))
for k_, v in meta.items(): print(k_, v)
