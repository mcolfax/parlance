"use strict";
/* ===================== KIWI: the budgie =====================
   Kiwi's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the runtime is rig.js.
   Written by design/rig/tools/trace/build_bird.py from the trace (tools/trace/birds/kiwi.py) and this template
   (birds/kiwi.tpl.js): edit those, not this file.
   The drawings are traced from the model sheet (reference/kiwi-sheet.webp). Kiwi faces front, so turn.setup is 0 and
   at rest she is the concept drawing. Her head and body are one egg with no line between the yellow and the green:
   the head is the yellow cap and turns about the middle of the circle its outline follows, so it slides round the egg
   without a seam. Her eyes are all dark, with no whites, so they move only a little when she looks round. The raised
   wings, the happy eyes and the open beak come from the cheer drawing; the states the sheet doesn't draw (blinks,
   hearts, the smile and frown on her little beak…) are drawn here and in bird.js in the same brush style.
   Palette roles become CSS custom properties (--kiwi-body …) with these values as fallbacks.
   ========================================================================== */
const KIWI = (() => {
  const B = typeof Bird !== 'undefined' ? Bird : require('./bird.js');
  const { path: p, ellipse: e, taper } = B.draw;
  const r2 = v => Math.round(v * 100) / 100;
  const at = (x, y, t, s) => '<g transform="translate(' + x + ' ' + y + ') ' + t + ' translate(' + -x + ' ' + -y + ')">' + s + '</g>';

  /* ----- traced drawings, in setup space ----- */
  const T = {
__TRACED__
  };

  /* ----- measures from the trace: eye centres and radii, how far the cheer drawing raises each wing, the shoulders,
     the circle the head's outline follows, the beak's box, the cere's middle and the ankles ----- */
  const C = __CONSTS__;

  /* ----- eyes: the traced eye and happy arc; the other states come from bird.js, drawn in black like hers ----- */
  const pupil = s => B.eyes(s, C.eye[s], T['pupil' + s], T['happy' + s], { ink: 'k-mark', line: 's-mark', front: true });

  /* ----- beak. Closed mouths are the whole little beak, with a line or an opening on it; the open ones are the cheer
     drawing's open beak (squashed for grin and open), hung under the cere, which stays put (the beak slot) ----- */
  const [bx0, by0, bx1, by1] = C.beak, bx = r2((bx0 + bx1) / 2), my = r2(by0 + (by1 - by0) * 0.6), hw = r2((bx1 - bx0) * 0.2);
  const O = [bx, r2(my + 0.6), 3.1, 3.8];   // the surprised opening
  const top = C.cere[1] + 4;                // the top of the open mouth, under the cere
  const mouth = {
    closed: T.egg,
    smile: T.egg + taper(bx - hw, my - 1.2, bx, my + 2.6, bx + hw, my - 1.2, 1.3, 'k-ink'),
    frown: T.egg + taper(bx - hw, my + 1.4, bx, my - 2.4, bx + hw, my + 1.4, 1.3, 'k-ink'),
    o: T.egg + e('k-mouth', O[0], O[1], O[2], O[3]) +
      p('k-tongue', 'M' + r2(O[0] - O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + ' Q' + O[0] + ' ' + r2(O[1] + O[3] * 0.06) + ' ' + r2(O[0] + O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + ' A' + O[2] + ' ' + O[3] + ' 0 0 1 ' + r2(O[0] - O[2] * 0.93) + ' ' + r2(O[1] + O[3] * 0.36) + 'Z') +
      e('ol2', O[0], O[1], O[2], O[3]),
    grin: at(bx, top, 'scale(1 0.8)', T.wide),
    open: at(bx, top, 'scale(0.92 0.6)', T.wide),
    wide: T.wide
  };
  const beak = { closed: T.cere, open: T.cere, up: T.cereUp };

  /* ----- wings: hanging from the shoulder. The raised wing is turned back down to the same rest angle, so a wing
     can change shape mid-swing; the cheer pose below raises it by the angle the cheer drawing shows. ----- */
  const wingUp = s => '<g transform="rotate(' + -C.raise[s] + ' ' + C.shoulder[s].join(' ') + ')">' + T['wing' + s + 'Up'] + '</g>';
  const leg = s => ({ stand: T['leg' + s], tuck: at(C.ankle[s][0], C.ankle[s][1] - 5, 'scale(0.86 0.6)', T['leg' + s]) });

  const parts = {
    shadow: { on: e('k-shadow', 120, 252, 64, 7) },
    tail: { fan: T.tail },
    legL: leg('L'), legR: leg('R'),
    body: { on: T.body },
    wingL: { folded: T.wingL, spread: wingUp('L') }, wingR: { folded: T.wingR, spread: wingUp('R') },
    head: { on: T.head }, headLine: { on: T.headLine },
    pupilL: pupil('L'), pupilR: pupil('R'),
    browL: { arc: T.browL }, browR: { arc: T.browR },
    mouth, beak,
    cheekL: { blush: e('k-blush', 99, 134, 5.6, 3.2) }, cheekR: { blush: e('k-blush', 141, 134, 5.6, 3.2) },
    tear: { drop: p('k-sweat t-sweat2', 'M84 128 C86 132 88 134.8 88 137.3 C88 139.7 86.2 141.3 84 141.3 C81.8 141.3 80 139.7 80 137.3 C80 134.8 82 132 84 128 Z', 'stroke-width:1.1px') }
  };
  const [hx, hy] = C.head;

  return B.make({
    id: 'kiwi', name: 'Kiwi',
    /* she faces front: turn 0 is the drawing, and her body turns either way */
    turn: { setup: 0, bodyMin: -0.24, cx: hx },
    rest: { turn: 0 },
    /* her sheet's outline is heavier than Pip's; the beak's line (ol2) is a little over half of it */
    lines: { min: 3.5, max: 5.6, thin: 0.62 },
    pivots: {
      facing: [120, 250], root: [120, 250], shadow: [120, 252], legL: [C.ankle.L[0], 232], legR: [C.ankle.R[0], 232],
      body: [120, 238], torso: [120, 180], tail: [152, 224], wingL: C.shoulder.L, wingR: C.shoulder.R,
      head: [hx, hy], eyeL: C.eye.L.slice(0, 2), pupilL: C.eye.L.slice(0, 2), eyeR: C.eye.R.slice(0, 2), pupilR: C.eye.R.slice(0, 2),
      browL: [C.eye.L[0], 90], browR: [C.eye.R[0], 90], beak: [bx, C.cere[1]], jaw: [bx, top],
      cheekL: [99, 134], cheekR: [141, 134], fx: [120, 120]
    },
    bones: [
      /* her tail pokes out behind her, low on the right: it slides across as her body turns */
      { id: 'tail', turn: { body: true, dx: -24 } },
      /* both wings are whole at rest; the far one narrows as she turns */
      { id: 'wingL', turn: { body: true, near: 0.05, wx: 0.6 } },
      { id: 'wingR', turn: { body: true, near: -0.05, wx: -0.6 } }
    ],
    /* no eye whites: the whole eye moves a little */
    look: { room: { pupilL: [1.6, 1.6, 1.2, 1.4], pupilR: [1.6, 1.6, 1.2, 1.4] } },
    springs: { tail: { len: 34, dir: [1, 0.45], k: 120, d: 9, limit: 12 } },
    swaps: [], clip: [],
    poses: {
      stand: { params: { turn: 0 } },
      cheer: { slots: B.both('wing', 'spread'), bones: { wingL: { r: C.raise.L }, wingR: { r: C.raise.R }, body: { sy: 1.02 } }, z: { wingL: 3.5, wingR: 3.6 }, params: { turn: 0 } }
    },
    /* her sheet's neutral face has a closed beak */
    faces: { happy: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'closed', beak: 'closed' } } },
    palette: {
      ink: '#1A3722', mark: '#151514', body: '#8CC44D', body2: '#4D8B49', head: '#F9DF5A', head2: '#E9C643',
      cheek: '#2975BB', cere: '#489DD0', cere2: '#78C5EE', beak: '#F1AF67', beak2: '#E39A55', mouth: '#5D3A2C', tongue: '#E1847B',
      tail: '#4A884C', tail2: '#3E7341', feet: '#EBAB9D', glint: '#FFFFFF', gloss: '#BCDC73', shine: '#4A725F', shine2: '#22432F'
    },
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = KIWI;
