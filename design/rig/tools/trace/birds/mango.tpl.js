"use strict";
/* ===================== MANGO: the yellow-headed amazon =====================
   Mango's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the runtime is rig.js.
   Written by design/rig/tools/trace/build_bird.py from the trace (tools/trace/birds/mango.py) and this template
   (birds/mango.tpl.js): edit those, not this file.
   The drawings are traced from the model sheet (reference/mango-sheet.webp). Mango faces front, so turn.setup is 0
   and at rest it is the concept drawing. Its yellow head ends in a fringe over the green chest with no line; the tuft
   on its crown is the crest, so it springs. Its tail fans out behind its legs and shows either side of them. The
   eye's white and its lid line are their own slot, shown only while the eye is open (showWith, as Rojo's), so a
   happy or closed eye is a line on the yellow, as on the cheer drawing. The raised wings, the happy eyes and the open
   beak come from the cheer drawing; the closed beaks are the jaw folded up under the upper beak.
   Palette roles become CSS custom properties (--mango-body …) with these values as fallbacks.
   ========================================================================== */
const MANGO = (() => {
  const B = typeof Bird !== 'undefined' ? Bird : require('./bird.js');
  const { path: p, ellipse: e } = B.draw;
  const at = (x, y, t, s) => '<g transform="translate(' + x + ' ' + y + ') ' + t + ' translate(' + -x + ' ' + -y + ')">' + s + '</g>';

  /* ----- traced drawings, in setup space ----- */
  const T = {
__TRACED__
  };

  /* ----- measures from the trace: the eyes' whites and the pupils, how far each pupil can move in its white
     [right, left, down, up], the brows, the shoulders and how far the cheer drawing raises each wing, the beak's
     boxes, the ankles and the sheet's colors ----- */
  const C = __CONSTS__;

  const pupil = s => B.eyes(s, C.pupil[s], T['pupil' + s], T['happy' + s], { front: true });

  /* ----- beak. The upper beak (the beak slot) always shows; the jaw hangs under it. Open mouths are the jaw as
     traced (grin), opened a little less (open), or the cheer drawing's open beak with its tongue (wide); closed ones
     fold the jaw up under the upper beak. ----- */
  const [jx0, jy0, jx1] = C.jaw, hx = (jx0 + jx1) / 2, hy = jy0 + 2;     // the jaw folds up toward its top
  const mouth = {
    closed: at(hx, hy, 'scale(0.98 0.36)', T.grin),
    smile: at(hx, hy, 'scale(1 0.5)', T.grin),
    frown: at(hx, hy, 'scale(0.9 0.34) rotate(-4)', T.grin),
    o: at(hx, hy, 'scale(0.78 0.8)', T.grin),
    grin: T.grin,
    open: at(hx, hy, 'scale(1 0.74)', T.grin),
    wide: T.wide
  };
  const beak = { closed: T.upper, open: T.upper, up: T.upperUp };

  const wingUp = s => '<g transform="rotate(' + -C.raise[s] + ' ' + C.shoulder[s].join(' ') + ')">' + T['wing' + s + 'Up'] + '</g>';
  const leg = s => ({ stand: T['leg' + s], tuck: at(C.ankle[s][0], C.ankle[s][1], 'scale(0.86 0.6)', T['leg' + s]) });
  const open = ['open', 'wide', 'wet', 'lidded'];

  const parts = {
    shadow: { on: e('k-shadow', 120, 252, 60, 6.6) },
    tail: { fan: T.tail },
    legL: leg('L'), legR: leg('R'),
    body: { on: T.body },
    wingL: { folded: T.wingL, spread: wingUp('L') }, wingR: { folded: T.wingR, spread: wingUp('R') },
    head: { on: T.head }, headLine: { on: T.headLine },
    crest2: { on: T.crest },
    eyeL: { on: T.eyeL }, eyeR: { on: T.eyeR },
    pupilL: pupil('L'), pupilR: pupil('R'),
    browL: { arc: T.browL }, browR: { arc: T.browR },
    mouth, beak,
    cheekL: { blush: e('k-blush', C.eye.L[0] - 3, C.eye.L[1] + 15, 6.4, 3.4) }, cheekR: { blush: e('k-blush', C.eye.R[0] + 3, C.eye.R[1] + 16, 5.4, 3.2) },
    tear: { drop: p('k-sweat t-sweat2', 'M90 112 C92 116 94 118.8 94 121.3 C94 123.7 92.2 125.3 90 125.3 C87.8 125.3 86 123.7 86 121.3 C86 118.8 88 116 90 112 Z', 'stroke-width:1.1px') }
  };

  return B.make({
    id: 'mango', name: 'Mango',
    /* it faces front: turn 0 is the drawing, and its body turns either way */
    turn: { setup: 0, bodyMin: -0.24 },
    rest: { turn: 0 },
    pivots: {
      facing: [120, 250], root: [120, 250], shadow: [120, 252], legL: [C.ankle.L[0], 234], legR: [C.ankle.R[0], 234], body: [120, 236], torso: [120, 180],
      tail: [120, 212], wingL: C.shoulder.L, wingR: C.shoulder.R, head: [120, 150], crest: [C.crest[0], C.crest[1] + 4], crest2: C.crest,
      eyeL: C.eye.L.slice(0, 2), pupilL: C.pupil.L.slice(0, 2), browL: C.brow.L, eyeR: C.eye.R.slice(0, 2), pupilR: C.pupil.R.slice(0, 2), browR: C.brow.R,
      beak: [(C.upper[0] + C.upper[2]) / 2, (C.upper[1] + C.upper[3]) / 2], jaw: [hx, hy],
      cheekL: [C.eye.L[0] - 3, C.eye.L[1] + 15], cheekR: [C.eye.R[0] + 3, C.eye.R[1] + 16]
    },
    /* the eye's white and line: a slot of its own between the skin and the pupil, shown only with an open eye */
    slots: sl => {
      const i = sl.findIndex(s => s.id === 'patchR');
      sl.splice(i + 1, 0, { id: 'eyeL', bone: 'eyeL', att: 'on', showWith: { slot: 'pupilL', drawings: open } }, { id: 'eyeR', bone: 'eyeR', att: 'on', showWith: { slot: 'pupilR', drawings: open } });
      return sl;
    },
    bones: [
      /* its tail fans out behind its legs: it slides across as its body turns */
      { id: 'tail', turn: { body: true, dx: -16 } },
      /* both wings are whole at rest; the far one narrows as it turns */
      { id: 'wingL', turn: { body: true, near: 0.05, wx: 0.6 } },
      { id: 'wingR', turn: { body: true, near: -0.05, wx: -0.6 } }
    ],
    look: { room: C.room },
    springs: { crest2: { len: 18, dir: [0.1, -1], k: 150, d: 8, limit: 18, squash: 0.3 }, tail: { len: 24, dir: [0, 1], k: 140, d: 10, limit: 8 } },
    /* a wing's drawing follows its angle, as Pip's far wing does: the folded wing while it hangs, the open one once it has
       swung more than 15 degrees away (either way). Without it a wing on its way up or down, or held out by a mood like
       think or laugh, shows as the folded wing rotated, a thin blade sticking out. */
    swaps: ['L', 'R'].map(s => ({ slot: 'wing' + s, bone: 'wing' + s, from: 'folded', to: 'spread', deg: 15 })),
    clip: [{ slot: 'pupilL', by: 'eyeL', drawings: ['open', 'wide', 'wet'] }, { slot: 'pupilR', by: 'eyeR', drawings: ['open', 'wide', 'wet'] }],
    poses: {
      stand: { params: { turn: 0 } },
      cheer: { slots: B.both('wing', 'spread'), bones: { wingL: { r: C.raise.L }, wingR: { r: C.raise.R }, body: { sy: 1.02 } }, z: { wingL: 3.5, wingR: 3.6 }, params: { turn: 0 } }
    },
    palette: Object.assign({ glint: '#FFFFFF' }, C.palette),
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = MANGO;
