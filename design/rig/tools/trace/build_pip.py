"""Assemble design/rig/pip.js from the traced drawings (trace/t2.json, trace/t2c.json) and the hand-drawn variants."""
import os, json, re, math
SP = os.environ.get('TRACE_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'pip.js')
A = json.load(open(SP + '/trace/t2.json')); C = json.load(open(SP + '/trace/t2c.json'))
FARWING = json.load(open(SP + '/trace/farwing.json'))['matrix']   # from fit_far_wing.py
ROOM = json.load(open(SP + '/trace/room.json'))                    # from fit_pupil_room.py
P, D, M = A['parts'], A['D'], A['meta']
PC = C['parts']

def centroid(markup):
    d = re.search(r'd="([^"]+)"', markup).group(1); n = [float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
    return sum(n[0::2]) / len(n[0::2]), sum(n[1::2]) / len(n[1::2])
PIV = {'L': (97.0, 165.0), 'R': (150.0, 164.0)}
def ang(c, piv): return math.degrees(math.atan2(c[1] - piv[1], c[0] - piv[0]))
RAISE = {}
for s_ in 'LR':
    # mask centroids: the raised wing's is in cheer units, so un-stretch it into setup space first
    cu = C['meta']['wing' + s_]['c']; cu = (cu[0], 236 - (236 - cu[1]) / 1.03)
    a = ang(cu, PIV[s_]) - ang(M['wing' + s_]['c'], PIV[s_])
    a = (a + 540) % 360 - 180
    RAISE[s_] = round(a, 1)
print('cheer raise angles', RAISE)

# the head's fill and its line go in two slots, so the line can sit over the eyes
_hp = re.findall(r'<path [^>]*/>', P['head']['on'])
HEAD = (''.join(p for p in _hp if 'class="k-body"' in p or 'class="k-gloss"' in p), ''.join(p for p in _hp if 'class="ol"' in p or 'class="k-ink"' in p))
assert sum(map(len, HEAD)) == len(P['head']['on']), 'head: unexpected drawing parts'
T = {
    'head': HEAD[0], 'headLine': HEAD[1], 'body': P['body']['on'], 'belly': P['belly']['on'], 'tail': P['tail']['fan'],
    'crest1': P['crest1']['on'], 'crest2': P['crest2']['on'], 'crest3': P['crest3']['on'],
    'wingL': P['wingL']['folded'], 'wingR': P['wingR']['folded'], 'wingLUp': PC['wingL']['spread'], 'wingRUp': PC['wingR']['spread'],
    'legL': P['legL']['stand'], 'legR': P['legR']['stand'],
    'patchL': P['patchL']['on'], 'patchR': P['patchR']['on'], 'pupilL': D['pupilL'], 'pupilR': D['pupilR'],
    'happyL': PC['pupilL']['happy'], 'happyR': PC['pupilR']['happy'],
    'browL': P['browL']['arc'], 'browR': P['browR']['arc'],
    'egg': D['egg'] + D['eggLine'], 'beakHl': D['beakHl'],
    'upper': D['upper'] + D['upperLine'] + D['smile'], 'grinIn': D['grinIn'] + D['grinTongue'] + D['grinInLine'],
    'wide': PC['mouth']['wide'], 'upperUp': PC['beak']['up'],
}
NOTES = {
    'head': 'the head and its gloss; its line is headLine, drawn over the eyes',
    'headLine': 'no chin line: the head runs into the chest; the line ends in two tapered strokes where it meets the wings',
    'body': 'the line runs on under the folded wings, so it is there when they lift',
    'belly': 'no outline, as on the model sheet',
    'wingLUp': 'raised, from the cheer drawing; turned back down to the hanging rest angle below',
    'egg': 'the whole beak: closed mouths draw on it, open ones hang the lower beak from it',
    'upper': 'the upper beak, ending in the thick smile line',
    'wide': 'the cheer drawing\'s open beak, its top matched to the upper beak',
}
def js_str(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
lines = []
for k, v in T.items():
    if k in NOTES: lines.append('    /* ' + NOTES[k] + ' */')
    lines.append('    ' + k + ': ' + js_str(v) + ',')
traced = '\n'.join(lines).rstrip(',')

pl, pr = M['pupilL']['ellipse'], M['pupilR']['ellipse']
def tilt(a):  # opencv angle of the first axis -> a small signed tilt in degrees
    a = a % 180
    return round(a - 180 if a > 90 else a, 1)
EYE = "{ L: [%.1f, %.1f, %.1f, %.1f], R: [%.1f, %.1f, %.1f, %.1f] }" % (pl[0], pl[1], pl[2], pl[3], pr[0], pr[1], pr[2], pr[3])

js = r'''"use strict";
/* ===================== PIP: the default Parlance parrot =====================
   Pip's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the runtime is rig.js.
   The drawings are traced from the model sheet (reference/pip-sheet.webp): the neutral pose is the setup pose, so at
   rest Pip is the concept drawing, turned a little to the viewer's right (turn.setup in bird.js). The raised wings,
   the happy eyes and the wide beak come from the cheer drawing. Outlines are strokes (ol) only where the sheet has
   ink: the belly and eye patches have none, and the head runs into the chest without a chin line. Expressions the
   sheet doesn't show (blinks, the sad and surprised beaks, hearts…) are drawn here in the same brush style.
   Palette roles become CSS custom properties (--pip-body …) with these values as fallbacks, so the app can
   retheme Pip from styles/tokens.css.
   ========================================================================== */
const PIP = (() => {
  const B = typeof Bird !== 'undefined' ? Bird : require('./bird.js');
  const { path: p, ellipse: e, circle: ci, taper } = B.draw;
  const r2 = v => Math.round(v * 100) / 100;
  const at = (x, y, t, s) => '<g transform="translate(' + x + ' ' + y + ') ' + t + ' translate(' + -x + ' ' + -y + ')">' + s + '</g>';

  /* ----- traced drawings, in setup space ----- */
  const T = {
__TRACED__
  };

  /* ----- eyes: the traced pupil, and the states the sheet doesn't draw. Pupil centre and radii: ----- */
  const EYE = __EYE__;
  const eyes = {
    open: s => T['pupil' + s],
    wide: s => { const [x, y, rx, ry] = EYE[s]; return at(x, y, 'scale(1.1)', T['pupil' + s]) + ci('k-glint', r2(x - rx * 0.4), r2(y + ry * 0.5), 1.6); },
    wet: s => { const [x, y, rx, ry] = EYE[s]; return T['pupil' + s] + ci('k-glint', r2(x - rx * 0.4), r2(y + ry * 0.48), 2.5) + ci('k-glint', r2(x + rx * 0.52), r2(y + ry * 0.1), 1.2); },
    happy: s => T['happy' + s],
    closed: s => { const [x, y, rx] = EYE[s], w = rx * 1.02; return taper(x - w, y - 1.5, x, y + 9, x + w, y - 1.5, 2.8); },
    blink: s => { const [x, y, rx] = EYE[s], w = rx * 1.08; return taper(x - w, y + 1, x, y + 4.4, x + w, y + 1, 2.6); },
    lidded: s => {
      const [x, y, rx, ry] = EYE[s], yc = r2(y - ry * 0.12), hw = r2(rx * Math.sqrt(1 - 0.0144));
      return p('k-ink', 'M' + r2(x - hw) + ' ' + yc + ' A' + rx + ' ' + ry + ' 0 1 0 ' + r2(x + hw) + ' ' + yc + 'Z') + ci('k-glint', r2(x + rx * 0.25), r2(y + ry * 0.22), 2.6) +
        taper(x - rx - 3.5, yc + 0.8, x, yc - 1.4, x + rx + 3.5, yc + 0.8, 2.6);
    },
    squeeze: s => { const [x, y] = EYE[s], k = s === 'L' ? 1 : -1; return p('ln', 'M' + (x - 7 * k) + ' ' + (y - 8.5) + ' L' + (x + 6 * k) + ' ' + y + ' L' + (x - 7 * k) + ' ' + (y + 8.5), 'stroke-width:calc(var(--rig-lw,2) * 1.15px)'); },
    heart: s => { const [x, y] = EYE[s]; return at(x, y, 'scale(' + (s === 'L' ? 1.05 : 0.92) + ' 1.05)', B.draw.heart(x, y + 1.5, 1.45)) + ci('k-glint', r2(x + 5.5), r2(y - 6), 2.2); }
  };
  const pupil = s => { const o = {}; for (const k in eyes) o[k] = eyes[k](s); return o; };

  /* ----- beak. Closed mouths are the whole beak with a line or an opening on it; the open ones are the lower
     beak, with the upper beak (the beak slot) over it. Sad is a soft downturned line, surprised a small round
     opening; the brush strokes taper like the sheet's lines. ----- */
  const EGG = T.egg + T.beakHl;
  const O = [129.8, 141, 4.7, 5.8];   // the surprised opening
  const mouth = {
    closed: EGG + taper(120.4, 140.8, 129.6, 144.2, 139, 140.2, 2.1),
    smile: EGG + taper(119.2, 138.6, 129.6, 147.2, 139.8, 137.8, 2.4),
    frown: EGG + taper(121.8, 145, 129.8, 137.6, 137.8, 144.2, 2.3),
    o: EGG + e('k-mouth', O[0], O[1], O[2], O[3]) +
      p('k-tongue', 'M' + r2(O[0] - O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + ' Q' + O[0] + ' ' + r2(O[1] + O[3] * 0.06) + ' ' + r2(O[0] + O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + ' A' + O[2] + ' ' + O[3] + ' 0 0 1 ' + r2(O[0] - O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + 'Z') +
      e('ol2', O[0], O[1], O[2], O[3]),
    grin: T.egg + T.grinIn,
    open: T.egg + at(128.7, 134, 'scale(1 0.62)', T.grinIn),
    wide: T.wide
  };
  const beak = { open: T.upper + T.beakHl, up: T.upperUp, closed: '<g/>' };

  /* ----- wings: hanging from the shoulder. The raised wing is turned back down to the same rest angle, so a wing
     can change shape mid-swing. The cheer pose in bird.js raises the wings by these angles. ----- */
  const RAISE = __RAISE__;
  const wingUp = s => '<g transform="rotate(' + -RAISE[s] + ' ' + (s === 'L' ? '97 165' : '150 164') + ')">' + T['wing' + s + 'Up'] + '</g>';
  /* The far wing hangs against the body as a sliver. Once it swings away (bird.js swaps), it opens into a whole
     wing: the near wing, mirrored, at 70% of its width on the far shoulder, set where the sliver was
     (tools/trace/fit_far_wing.py). Its gloss stays off: the light comes from the near side. */
  const FAR = __FAR__;
  const wingOpen = B.draw.xform(T.wingL.replace(/<path class="k-gloss"[^>]*\/>/, ''), FAR);
  const leg = s => ({ stand: T['leg' + s], tuck: at(s === 'L' ? 95.8 : 129.4, 231, 'scale(0.86 0.6)', T['leg' + s]) });

  const parts = {
    shadow: { on: e('k-shadow', 114, 252, 56, 6.6) },
    tail: { fan: T.tail },
    legL: leg('L'), legR: leg('R'),
    body: { on: T.body }, belly: { on: T.belly },
    wingL: { folded: T.wingL, spread: wingUp('L') }, wingR: { folded: T.wingR, open: wingOpen, spread: wingUp('R') },
    head: { on: T.head }, headLine: { on: T.headLine },
    crest1: { on: T.crest1 }, crest2: { on: T.crest2 }, crest3: { on: T.crest3 },
    patchL: { on: T.patchL }, patchR: { on: T.patchR },
    pupilL: pupil('L'), pupilR: pupil('R'),
    browL: { arc: T.browL }, browR: { arc: T.browR },
    mouth, beak,
    cheekL: { blush: e('k-blush', 81, 142, 7.6, 4) }, cheekR: { blush: e('k-blush', 165, 136, 6.4, 3.8) },
    sweat: { drop: p('k-sweat t-sweat2', 'M80 79.5 C82.5 84 84.9 87.4 84.9 90.4 C84.9 93.2 82.7 95.2 80 95.2 C77.3 95.2 75.1 93.2 75.1 90.4 C75.1 87.4 77.5 84 80 79.5 Z', 'stroke-width:1.1px') + e('k-glint', 78.2, 90.6, 1.1, 2) },
    tear: { drop: p('k-sweat t-sweat2', 'M80 133 C82 137 84 139.8 84 142.3 C84 144.7 82.2 146.3 80 146.3 C77.8 146.3 76 144.7 76 142.3 C76 139.8 78 137 80 133 Z', 'stroke-width:1.1px') }
  };

  return B.make({
    id: 'pip', name: 'Pip',
    /* how far each pupil can move from where it's drawn and stay in its eye white: [right, left, down, up]
       (tools/trace/fit_pupil_room.py). The sheet draws them converged, so the far pupil has no room to the left. */
    look: { room: __ROOM__ },
    palette: {
      ink: '#0B2A1E', body: '#06777C', body2: '#056C70', belly: '#F9EFD6', face: '#FCF7E9',
      beak: '#F6B340', beak2: '#E39A2E', mouth: '#3E2519', tongue: '#F3674E',
      crest: '#EE5F35', crest2: '#F7B440', tail: '#F06137', tail2: '#CD5229', feet: '#808783',
      glint: '#FDFDF9', gloss: '#6CC3C2', gloss2: '#FDE59A'
    },
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = PIP;
'''
js = js.replace('__TRACED__', traced).replace('__EYE__', EYE).replace('__RAISE__', '{ L: %s, R: %s }' % (RAISE['L'], RAISE['R']))
js = js.replace('__FAR__', '[' + ', '.join('%g' % v for v in FARWING) + ']')
js = js.replace('__ROOM__', '{ ' + ', '.join('%s: [%s]' % (k, ', '.join('%g' % v for v in ROOM[k])) for k in sorted(ROOM)) + ' }')
open(OUT, 'w').write(js)
print('wrote', OUT, len(js), 'bytes')
