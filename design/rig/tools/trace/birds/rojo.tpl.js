"use strict";
/* ===================== ROJO: the scarlet macaw =====================
   Rojo's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the runtime is rig.js.
   Written by design/rig/tools/trace/build_bird.py from the trace (tools/trace/birds/rojo.py) and this template
   (birds/rojo.tpl.js): edit those, not this file.
   The drawings are traced from the model sheet (reference/rojo-sheet.webp). Like Pip, Rojo stands turned a little to
   the viewer's right (turn.setup), so at rest it is the concept drawing: the head runs into the chest with no chin
   line, the near wing hangs over the body's side, the far wing is the strip on the far side and the long tail sweeps
   out behind to the left. Its face is bare white skin round each eye (the patch slot, so it turns with the eye). The
   eye's white and its line are their own slot, shown only while the eye is open (showWith), so a closed or happy eye
   is a line on the skin, as on the cheer drawing. Its brows are the top of each eye's line: at rest they lie on it,
   and they lift off it when it frowns or is surprised. The raised wings, the happy eyes and the open beak come from
   the cheer drawing; the closed beaks are the open jaw folded up under the upper beak.
   Palette roles become CSS custom properties (--rojo-body …) with these values as fallbacks.
   ========================================================================== */
const ROJO = (() => {
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

  const pupil = s => B.eyes(s, C.eye[s], T['pupil' + s], T['happy' + s]);

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
    shadow: { on: e('k-shadow', 116, 252, 58, 6.6) },
    tail: { fan: T.tail },
    legL: leg('L'), legR: leg('R'),
    body: { on: T.body },
    wingL: { folded: T.wingL, spread: wingUp('L') }, wingR: { folded: T.wingR, spread: wingUp('R') },
    head: { on: T.head }, headLine: { on: T.headLine },
    patchL: { on: T.patchL }, patchR: { on: T.patchR },
    eyeL: { on: T.eyeL }, eyeR: { on: T.eyeR },
    pupilL: pupil('L'), pupilR: pupil('R'),
    browL: { arc: T.browL }, browR: { arc: T.browR },
    mouth, beak,
    cheekL: { blush: e('k-blush', C.eye.L[0] - 3, C.eye.L[1] + 15, 6.4, 3.4) }, cheekR: { blush: e('k-blush', C.eye.R[0] + 3, C.eye.R[1] + 16, 5.4, 3.2) },
    tear: { drop: p('k-sweat t-sweat2', 'M96 110 C98 114 100 116.8 100 119.3 C100 121.7 98.2 123.3 96 123.3 C93.8 123.3 92 121.7 92 119.3 C92 116.8 94 114 96 110 Z', 'stroke-width:1.1px') }
  };

  return B.make({
    id: 'rojo', name: 'Rojo',
    pivots: {
      root: [118, 250], shadow: [116, 252], legL: [C.ankle.L[0], 228], legR: [C.ankle.R[0], 228], body: [118, 232], torso: [120, 175],
      tail: [100, 205], wingL: C.shoulder.L, wingR: C.shoulder.R, head: [122, 132],
      eyeL: C.eye.L.slice(0, 2), pupilL: C.pupil.L, browL: C.brow.L, eyeR: C.eye.R.slice(0, 2), pupilR: C.pupil.R, browR: C.brow.R,
      beak: [(C.upper[0] + C.upper[2]) / 2, (C.upper[1] + C.upper[3]) / 2], jaw: [hx, hy],
      cheekL: [C.eye.L[0] - 3, C.eye.L[1] + 15], cheekR: [C.eye.R[0] + 3, C.eye.R[1] + 16]
    },
    /* the eye's white and line: a slot of its own between the skin and the pupil, shown only with an open eye */
    slots: sl => {
      const i = sl.findIndex(s => s.id === 'patchR');
      sl.splice(i + 1, 0, { id: 'eyeL', bone: 'eyeL', att: 'on', showWith: { slot: 'pupilL', drawings: open } }, { id: 'eyeR', bone: 'eyeR', att: 'on', showWith: { slot: 'pupilR', drawings: open } });
      return sl;
    },
    /* its long tail stays out to the side until it faces right round to the front */
    bones: [{ id: 'tail', turn: { body: true, flip: 1.6 } }],
    look: { room: C.room },
    /* the long tail hangs down to the left */
    springs: { tail: { len: 60, dir: [-1, 0.8], k: 110, d: 9, limit: 10 } },
    /* a wing's drawing follows its angle, as Pip's far wing does: the folded wing while it hangs, the open one once it has
       swung more than 15 degrees away (either way). Without it a wing on its way up or down, or held out by a mood like
       think or laugh, shows as the folded wing rotated, a thin blade sticking out. */
    swaps: ['L', 'R'].map(s => ({ slot: 'wing' + s, bone: 'wing' + s, from: 'folded', to: 'spread', deg: 15 })),
    clip: [{ slot: 'pupilL', by: 'eyeL', drawings: ['open', 'wide', 'wet'] }, { slot: 'pupilR', by: 'eyeR', drawings: ['open', 'wide', 'wet'] }],
    poses: {
      cheer: { slots: B.both('wing', 'spread'), bones: { wingL: { r: C.raise.L }, wingR: { r: C.raise.R }, body: { sy: 1.02 }, head: { r: -3 } }, z: { wingL: 3.5, wingR: 3.6 }, params: { turn: 0.08 } }
    },
    palette: Object.assign({ glint: '#FFFFFF' }, C.palette),
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = ROJO;
