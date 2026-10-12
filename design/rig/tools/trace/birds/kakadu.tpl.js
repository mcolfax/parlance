"use strict";
/* ===================== KAKADU: the sulphur-crested cockatoo =====================
   Kakadu's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the runtime is rig.js.
   Written by design/rig/tools/trace/build_bird.py from the trace (tools/trace/birds/kakadu.py) and this template
   (birds/kakadu.tpl.js): edit those, not this file.
   The drawings are traced from the model sheet (reference/kakadu-sheet.webp). Kakadu faces front, so turn.setup is 0
   and at rest he is the concept drawing. His crest is seven feathers on bones of their own (crest1–crest7, from the
   shared crest root), so each springs on its own; they stand in front of the head's line and their roots go in behind
   the white tuft, drawn over them. His moods move the crest the way a cockatoo does: it fans up when he cheers or is
   surprised, and folds down when he is sad, worried or asleep. His eyes are whites in a blue ring (the eye slot,
   shown while the eye is open); a closed or happy eye is a line on a pale blue patch (the patch slot), as on the cheer
   drawing. The raised wings, the happy eyes and the open beak come from the cheer drawing; the closed beaks are the
   jaw folded up under the upper beak.
   Palette roles become CSS custom properties (--kakadu-body …) with these values as fallbacks.
   ========================================================================== */
const KAKADU = (() => {
  const B = typeof Bird !== 'undefined' ? Bird : require('./bird.js');
  const { path: p, ellipse: e } = B.draw;
  const at = (x, y, t, s) => '<g transform="translate(' + x + ' ' + y + ') ' + t + ' translate(' + -x + ' ' + -y + ')">' + s + '</g>';

  /* ----- traced drawings, in setup space ----- */
  const T = {
__TRACED__
  };

  /* ----- measures from the trace: the eyes' rings and the pupils, the brows, the shoulders and how far the cheer
     drawing raises each wing, the beak's boxes, the circle the head's outline follows, each crest feather's root and
     tip, the ankles and the sheet's colors ----- */
  const C = __CONSTS__;

  const pupil = s => B.eyes(s, C.pupil[s], T['pupil' + s], T['happy' + s], { front: true });

  /* ----- beak: the upper beak always shows; the jaw hangs under it, folded up for the closed mouths ----- */
  const [jx0, jy0, jx1] = C.jaw, hx = (jx0 + jx1) / 2, hy = jy0 + 2;
  const mouth = {
    closed: at(hx, hy, 'scale(0.98 0.4)', T.grin),
    smile: at(hx, hy, 'scale(1 0.52)', T.grin),
    frown: at(hx, hy, 'scale(0.9 0.36)', T.grin),
    o: at(hx, hy, 'scale(0.8 0.8)', T.grin),
    grin: T.grin,
    open: at(hx, hy, 'scale(1 0.74)', T.grin),
    wide: T.wide
  };
  const beak = { closed: T.upper, open: T.upper, up: T.upperUp };

  const wingUp = s => '<g transform="rotate(' + -C.raise[s] + ' ' + C.shoulder[s].join(' ') + ')">' + T['wing' + s + 'Up'] + '</g>';
  const leg = s => ({ stand: T['leg' + s], tuck: at(C.ankle[s][0], C.ankle[s][1], 'scale(0.86 0.6)', T['leg' + s]) });
  const OPEN = ['open', 'wide', 'wet', 'lidded'], SHUT = ['happy', 'closed', 'blink', 'squeeze', 'heart'];

  /* the crest feathers, back to front: the low ones at the sides behind, the tallest in front */
  const CREST = ['crest4', 'crest7', 'crest1', 'crest6', 'crest5', 'crest3', 'crest2'];
  const crestParts = {}; for (const k of CREST) crestParts[k] = { on: T[k] };

  const parts = Object.assign({
    shadow: { on: e('k-shadow', 120, 252, 62, 6.8) },
    tail: { fan: T.tail },
    legL: leg('L'), legR: leg('R'),
    body: { on: T.body },
    wingL: { folded: T.wingL, spread: wingUp('L') }, wingR: { folded: T.wingR, spread: wingUp('R') },
    head: { on: T.head }, headLine: { on: T.headLine }, tuft: { on: T.tuft },
    patchL: { on: T.patchL }, patchR: { on: T.patchR },
    eyeL: { on: T.eyeL }, eyeR: { on: T.eyeR },
    pupilL: pupil('L'), pupilR: pupil('R'),
    browL: { arc: T.browL }, browR: { arc: T.browR },
    mouth, beak,
    cheekL: { blush: e('k-blush', C.eye.L[0] - 6, C.eye.L[1] + 18, 6.4, 3.4) }, cheekR: { blush: e('k-blush', C.eye.R[0] + 6, C.eye.R[1] + 18, 6.4, 3.4) },
    tear: { drop: p('k-sweat t-sweat2', 'M93 126 C95 130 97 132.8 97 135.3 C97 137.7 95.2 139.3 93 139.3 C90.8 139.3 89 137.7 89 135.3 C89 132.8 91 130 93 126 Z', 'stroke-width:1.1px') }
  }, crestParts);

  /* each feather pivots at its root and springs toward its tip */
  const crestBones = [], springs = {};
  for (const k of CREST){
    const { root, tip } = C.crest[k];
    if (!['crest1', 'crest2', 'crest3'].includes(k)) crestBones.push({ id: k, parent: 'crest', x: root[0], y: root[1] });
    const dx = tip[0] - root[0], dy = tip[1] - root[1], len = Math.round(Math.hypot(dx, dy));
    springs[k] = { len, dir: [Math.round(dx / len * 100) / 100, Math.round(dy / len * 100) / 100], k: 150, d: 8, limit: 16 };
  }
  const piv = {}; for (const k of ['crest1', 'crest2', 'crest3']) piv[k] = C.crest[k].root;

  /* the crest in a pose: fan opens it (degrees for the outermost feathers, less toward the middle), lift stretches it */
  const SPREAD = { crest4: -1, crest1: -0.7, crest5: -0.35, crest2: 0, crest3: 0.45, crest6: 0.75, crest7: 1 };
  const fan = (deg, lift) => { const o = {}; for (const k of CREST) o[k] = { r: Math.round(SPREAD[k] * deg * 10) / 10, sy: lift || 1 }; return o; };
  const P = B.BIRD.poses;
  const withCrest = (name, deg, lift) => Object.assign({}, P[name], { bones: Object.assign({}, P[name].bones, fan(deg, lift)) });

  return B.make({
    id: 'kakadu', name: 'Kakadu',
    /* he faces front: turn 0 is the drawing, and his body turns either way */
    turn: { setup: 0, bodyMin: -0.24, cx: C.head[0] },
    rest: { turn: 0 },
    pivots: Object.assign({
      facing: [120, 250], root: [120, 250], shadow: [120, 252], legL: [C.ankle.L[0], 234], legR: [C.ankle.R[0], 234], body: [120, 236], torso: [120, 185],
      tail: [126, 222], wingL: C.shoulder.L, wingR: C.shoulder.R, head: [120, 152], crest: [126, 82],
      eyeL: C.eye.L.slice(0, 2), pupilL: C.pupil.L.slice(0, 2), browL: C.brow.L, eyeR: C.eye.R.slice(0, 2), pupilR: C.pupil.R.slice(0, 2), browR: C.brow.R,
      beak: [(C.upper[0] + C.upper[2]) / 2, (C.upper[1] + C.upper[3]) / 2], jaw: [hx, hy],
      cheekL: [C.eye.L[0] - 6, C.eye.L[1] + 18], cheekR: [C.eye.R[0] + 6, C.eye.R[1] + 18], fx: [120, 120]
    }, piv),
    bones: crestBones.concat([
      /* his tail shows either side of his legs: it slides across as his body turns */
      { id: 'tail', turn: { body: true, dx: -16 } },
      /* both wings are whole at rest; the far one narrows as he turns */
      { id: 'wingL', turn: { body: true, near: 0.05, wx: 0.6 } },
      { id: 'wingR', turn: { body: true, near: -0.05, wx: -0.6 } }
    ]),
    /* the eye's ring and white go with an open eye, the pale blue patch with a closed one; the crest's seven feathers
       stand in front of the head's line, and the tuft goes over their roots */
    slots: sl => {
      sl = sl.filter(s => !/^crest\d$/.test(s.id));
      for (const s of ['L', 'R']) Object.assign(sl.find(x => x.id === 'patch' + s), { showWith: { slot: 'pupil' + s, drawings: SHUT } });
      const i = sl.findIndex(s => s.id === 'patchR');
      sl.splice(i + 1, 0, { id: 'eyeL', bone: 'eyeL', att: 'on', showWith: { slot: 'pupilL', drawings: OPEN } }, { id: 'eyeR', bone: 'eyeR', att: 'on', showWith: { slot: 'pupilR', drawings: OPEN } });
      const j = sl.findIndex(s => s.id === 'headLine');
      sl.splice(j + 1, 0, ...CREST.map(k => ({ id: k, bone: k, att: 'on' })), { id: 'tuft', bone: 'crest', att: 'on' });
      return sl;
    },
    /* his pupils nearly fill their whites: they move a little, and tuck under the ring's edge in 3D */
    look: { room: { pupilL: [1.4, 1.4, 1.1, 1.1], pupilR: [1.4, 1.4, 1.1, 1.1] }, x: 3, y: 3 },
    springs: Object.assign(springs, { crest1: springs.crest1, crest2: Object.assign({}, springs.crest2, { squash: 0.3 }), crest3: springs.crest3, tail: { len: 26, dir: [0.6, 0.8], k: 140, d: 10, limit: 8 } }),
    swaps: [],
    clip: [{ slot: 'pupilL', by: 'eyeL', drawings: ['open', 'wide', 'wet'] }, { slot: 'pupilR', by: 'eyeR', drawings: ['open', 'wide', 'wet'] }],
    poses: {
      stand: { params: { turn: 0 } },
      cheer: Object.assign({}, P.cheer, { slots: B.both('wing', 'spread'), bones: Object.assign({ wingL: { r: C.raise.L }, wingR: { r: C.raise.R }, body: { sy: 1.02 } }, fan(22, 1.08)), params: { turn: 0 } }),
      wow: withCrest('wow', 26, 1.12),
      proud: withCrest('proud', 12, 1.04),
      love: withCrest('love', 8),
      laugh: withCrest('laugh', 14),
      fly: withCrest('fly', 10),
      cover: withCrest('cover', -18, 0.72),
      sad: withCrest('sad', -16, 0.7),
      sleep: withCrest('sleep', -14, 0.74),
      think: withCrest('think', 6)
    },
    palette: Object.assign({ glint: '#FFFFFF' }, C.palette),
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = KAKADU;
