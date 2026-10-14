"use strict";
/* ===================== THE PARLANCE BIRD =====================
   The skeleton every Parlance parrot shares, with the poses, faces, moods and moves written for it, and the
   effects (sweat, sparkles, zzz…) any bird can show. A bird is this plus its own part sheet and palette:
   Bird.make({ id, name, palette, parts, pivots? }) returns a character definition for Rig (rig.js).
   Write a pose here once and every bird can do it. README.md has the drawing spec for a new bird.
   Setup space: 240 wide, centre x 120 (the middle of the head), ground at y 250. A bird is drawn turned a little
   to the viewer's right, as on its model sheet; turn.setup says how far, and turn 0 faces front.
   Facing the other way is a mirror, as on the model sheet's oops drawing: the param facing -1 mirrors the whole bird
   across x 120, and a head turned past the front (turn below 0) mirrors the head, so the beak, eyes and crest
   always face the way the head turns. Poses are written for a bird facing right; lookX follows the bird.
   ============================================================ */
const Bird = (() => {
  /* ----- drawing helpers for part sheets ----- */
  const M = s => '<g transform="matrix(-1 0 0 1 240 0)">' + s + '</g>';   // mirror across x = 120
  const p = (k, d, st) => '<path class="' + k + '" d="' + d + '"' + (st ? ' style="' + st + '"' : '') + '/>';
  const e = (k, cx, cy, rx, ry) => '<ellipse class="' + k + '" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/>';
  const ci = (k, cx, cy, r) => '<circle class="' + k + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
  const gloss = (d, w) => p('gl', d, 'stroke-width:' + w + 'px');
  /* a brush stroke that swells to w in the middle and tapers to points: a quadratic curve from (x0,y0) to (x1,y1) */
  const r2 = v => Math.round(v * 100) / 100;
  const taper = (x0, y0, cx, cy, x1, y1, w, k) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L * w, ny = (x1 - x0) / L * w;
    return p(k || 'k-ink', 'M' + r2(x0) + ' ' + r2(y0) + ' Q' + r2(cx + nx) + ' ' + r2(cy + ny) + ' ' + r2(x1) + ' ' + r2(y1) + ' Q' + r2(cx - nx) + ' ' + r2(cy - ny) + ' ' + r2(x0) + ' ' + r2(y0) + 'Z');
  };
  /* strokes with an ink rim, for legs and toes: a wide ink stroke under a narrower colored one */
  const rim = (k, d, w) => p('s-ink', d, 'stroke-width:calc(' + w + 'px + var(--rig-lw,2) * 2px)') + p('s-' + k, d, 'stroke-width:' + w + 'px');
  /* a drawing moved by the matrix [a b c d e f] (SVG order), baked into its path points so its outlines keep their
     weight (a transform attribute would thin them where it squashes). Paths only, in absolute M L C Q Z commands. */
  const xform = (s, m) => {
    if (/<(ellipse|circle|rect|line|poly)/.test(s)) throw new Error('xform: paths only');
    return s.replace(/ d="([^"]+)"/g, (_, d) => {
      if (/[^MLCQZ\d\s.,-]/.test(d)) throw new Error('xform: absolute M L C Q Z commands only');
      return ' d="' + d.replace(/([MLCQ])([^MLCQZ]*)/g, (__, k, nums) => {
        const v = nums.trim().split(/[\s,]+/).map(Number), o = [];
        for (let i = 0; i + 1 < v.length; i += 2) o.push(r2(m[0] * v[i] + m[2] * v[i + 1] + m[4]) + ' ' + r2(m[1] * v[i] + m[3] * v[i + 1] + m[5]));
        return k + o.join(' ') + ' ';
      }).replace(/ (?=Z|$)/g, '') + '"';
    });
  };
  /* symmetric pose helper: {wing: {r: 30}} -> {wingL: {r: 30}, wingR: {r: -30}} */
  const sym = o => { const out = {}; for (const k in o){ const v = o[k]; out[k + 'L'] = Object.assign({}, v); const m = Object.assign({}, v); if (m.r) m.r = -m.r; if (m.x) m.x = -m.x; out[k + 'R'] = m; } return out; };
  const both = (k, v) => ({ [k + 'L']: v, [k + 'R']: v });

  /* ----- effects every bird shares; a bird's part sheet can replace any of them ----- */
  const STAR = (x, y, r) => p('k-spark', 'M' + x + ' ' + (y - r) + ' Q' + (x + r * 0.18) + ' ' + (y - r * 0.18) + ' ' + (x + r) + ' ' + y + ' Q' + (x + r * 0.18) + ' ' + (y + r * 0.18) + ' ' + x + ' ' + (y + r) + ' Q' + (x - r * 0.18) + ' ' + (y + r * 0.18) + ' ' + (x - r) + ' ' + y + ' Q' + (x - r * 0.18) + ' ' + (y - r * 0.18) + ' ' + x + ' ' + (y - r) + 'Z');
  const HEART = (x, y, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + p('k-heart', 'M0 8 C-3 5.5 -9 1.5 -9 -3.5 C-9 -7.5 -5.5 -9.5 -3 -9.5 C-1 -9.5 0 -8 0 -6.5 C0 -8 1 -9.5 3 -9.5 C5.5 -9.5 9 -7.5 9 -3.5 C9 1.5 3 5.5 0 8Z') + '</g>';
  const NOTE = (x, y, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + e('k-ink', -3.5, 6, 4.2, 3.3) + p('s-ink', 'M0 6 V-10 Q5 -8 7 -4', 'stroke-width:2.2px') + '</g>';
  const Z = (x, y, s) => p('s-ink', 'M' + x + ' ' + y + ' h' + (7 * s) + ' l' + (-7 * s) + ' ' + (8 * s) + ' h' + (7 * s), 'stroke-width:' + (2.4 * s) + 'px');
  const FX_PARTS = {
    shadow: { on: e('k-shadow', 120, 251, 50, 8) },
    cheekL: { blush: e('k-blush', 79, 141, 8, 4.4) },
    cheekR: { blush: e('k-blush', 161, 141, 8, 4.4) },
    sweat: { drop: p('k-sweat t-sweat2', 'M86 80 C88.6 85 91.2 88.6 91.2 91.8 C91.2 94.9 88.9 97 86 97 C83.1 97 80.8 94.9 80.8 91.8 C80.8 88.6 83.4 85 86 80 Z', 'stroke-width:1.2px') + gloss('M83.7 91 Q83.8 88.8 85 87.2', 1.8) },
    tear: { drop: p('k-sweat t-sweat2', 'M80 132 C82 136 84 138.8 84 141.3 C84 143.7 82.2 145.3 80 145.3 C77.8 145.3 76 143.7 76 141.3 C76 138.8 78 136 80 132 Z', 'stroke-width:1.1px') },
    fxHead: {
      zzz: Z(162, 52, 1) + Z(174, 36, 1.3) + Z(190, 16, 1.6),
      question: p('s-ink', 'M168 40 Q168 30 177 30 Q186 30 186 38.5 Q186 44 179.5 47 Q177 48.4 177 53', 'stroke-width:4.4px') + ci('k-ink', 177, 61, 2.9),
      exclaim: p('s-ink', 'M178 24 L176 50', 'stroke-width:5.4px') + ci('k-ink', 175.6, 60, 3.2) + p('s-ink', 'M160 30 L163.6 46 M194 34 L188 48', 'stroke-width:3px'),
      hearts: HEART(166, 46, 1) + HEART(184, 28, 0.75) + HEART(72, 40, 0.65),
      sound: p('s-ink', 'M182 96 Q190 106 182 116 M190 88 Q202 106 190 124', 'stroke-width:3.2px')
    },
    fxBody: {
      sparkle: STAR(54, 70, 9) + STAR(188, 58, 11) + STAR(196, 108, 6.5) + STAR(44, 116, 5.5),
      notes: NOTE(190, 70, 1.2) + NOTE(50, 92, 1) + NOTE(204, 112, 0.85)
    }
  };
  const FX_PALETTE = {
      shadow: 'rgb(20 48 31 / .14)', glint: '#FFFFFF', gloss: 'rgb(255 255 255 / .45)',
      blush: '#FF8C8C', sweat: '#A4DBF6', sweat2: '#4CA3D6', spark: '#F6B33F', heart: '#F0565A'
  };

  const BIRD = {
    view: [18, 2, 204, 258],
    /* outlines are about 1.35 screen px, and never thinner than the model sheet's 2.6 units; ol2 (the beak) is half */
    lines: { px: 1.35, min: 2.6, max: 4.6, feature: 1, detail: 0.6, thin: 0.5, grow: 0.6 },
    /* the drawing holds up to turn max either side of the front, and the body between bodyMin and bodyMax */
    turn: { head: 35, body: 0.6, setup: 0.22, max: 0.36, bodyMin: 0, bodyMax: 0.24 },
    rest: { turn: 0.22, facing: 1 },
    /* what mirrors: the whole bird (facing), the head (turned past the front), and parts that never read backwards */
    mirror: { facing: 'facing', head: 'head', upright: ['fxHead', 'fx'] },
    restMood: 'happy',
    bones: [
      { id: 'facing', x: 120, y: 250 },
      { id: 'root', parent: 'facing', x: 114, y: 250 },
      { id: 'shadow', parent: 'facing', x: 114, y: 252 },
      { id: 'legL', parent: 'root', x: 95.8, y: 231, turn: { body: true, dx: -40 } },
      { id: 'legR', parent: 'root', x: 129.4, y: 231, turn: { body: true, dx: -40 } },
      { id: 'body', parent: 'root', x: 113, y: 236 },
      /* the torso twists against a head turn, the way the model sheet's three-quarter view swings the lower body */
      { id: 'torso', parent: 'body', x: 118, y: 170, turn: { body: true, rot: 10 } },
      /* the tail shortens as the body comes round to face front, and shows on the far side past it */
      { id: 'tail', parent: 'torso', x: 110, y: 206, turn: { body: true, flip: 4.6 } },
      { id: 'belly', parent: 'torso', x: 126, y: 195, turn: { body: true, R: 70 } },
      { id: 'wingL', parent: 'torso', x: 97, y: 165, turn: { body: true, near: 0.06, wx: 0.5 } },
      { id: 'wingR', parent: 'torso', x: 150, y: 164, turn: { body: true, near: -0.06, wx: -1.2 } },
      { id: 'head', parent: 'body', x: 120, y: 158 },
      { id: 'crest', parent: 'head', x: 123, y: 62, turn: { R: 16 } },
      { id: 'crest1', parent: 'crest', x: 110, y: 60 },
      { id: 'crest2', parent: 'crest', x: 125, y: 60 },
      { id: 'crest3', parent: 'crest', x: 135, y: 63 },
      { id: 'eyeL', parent: 'head', x: 95.9, y: 118.6, turn: { R: 56, squash: true } },
      { id: 'pupilL', parent: 'eyeL', x: 100.8, y: 120.6 },
      { id: 'browL', parent: 'eyeL', x: 94.7, y: 85.2 },
      { id: 'eyeR', parent: 'head', x: 156.3, y: 114.6, turn: { R: 56, squash: true } },
      { id: 'pupilR', parent: 'eyeR', x: 151.9, y: 117.3 },
      { id: 'browR', parent: 'eyeR', x: 153.8, y: 82.9 },
      { id: 'beak', parent: 'head', x: 128.7, y: 124, turn: { R: 62 } },
      { id: 'jaw', parent: 'beak', x: 128.7, y: 134 },
      { id: 'cheekL', parent: 'head', x: 81, y: 142, turn: { R: 56, squash: true } },
      { id: 'cheekR', parent: 'head', x: 165, y: 136, turn: { R: 56, squash: true } },
      /* the worried sweat drop sits at the back of the head, as on the model sheet */
      { id: 'sweat', parent: 'head', x: 82, y: 88, turn: { R: 56 } },
      { id: 'fxHead', parent: 'head', x: 176, y: 44, turn: { R: 10, phi: 0 } },
      { id: 'fx', parent: 'root', x: 120, y: 110 }
    ],
    slots: [
      { id: 'shadow', bone: 'shadow', att: 'on' },
      { id: 'tail', bone: 'tail', att: 'fan' },
      { id: 'legL', bone: 'legL', att: 'stand' },
      { id: 'legR', bone: 'legR', att: 'stand' },
      { id: 'body', bone: 'torso', att: 'on' },
      { id: 'belly', bone: 'belly', att: 'on' },
      { id: 'wingL', bone: 'wingL', att: 'folded' },
      { id: 'wingR', bone: 'wingR', att: 'folded' },
      { id: 'head', bone: 'head', att: 'on' },
      { id: 'patchL', bone: 'eyeL', att: 'on' },
      { id: 'patchR', bone: 'eyeR', att: 'on' },
      { id: 'cheekL', bone: 'cheekL', att: null },
      { id: 'cheekR', bone: 'cheekR', att: null },
      { id: 'pupilL', bone: 'pupilL', att: 'open', blink: { from: ['open', 'wide', 'wet'], to: 'blink' } },
      { id: 'pupilR', bone: 'pupilR', att: 'open', blink: { from: ['open', 'wide', 'wet'], to: 'blink' } },
      /* the head's line goes over the eyes, so an eye turned out to the edge of the head tucks under it */
      { id: 'headLine', bone: 'head', att: 'on' },
      /* the crest sits on the crown, in front of the head's line */
      { id: 'crest1', bone: 'crest1', att: 'on' },
      { id: 'crest3', bone: 'crest3', att: 'on' },
      { id: 'crest2', bone: 'crest2', att: 'on' },
      { id: 'tear', bone: 'eyeL', att: null },
      { id: 'browL', bone: 'browL', att: 'arc' },
      { id: 'browR', bone: 'browR', att: 'arc' },
      { id: 'mouth', bone: 'jaw', att: 'grin' },
      { id: 'beak', bone: 'beak', att: 'open' },
      { id: 'sweat', bone: 'sweat', att: null },
      { id: 'fxHead', bone: 'fxHead', att: null },
      { id: 'fxBody', bone: 'fx', att: null }
    ],
    shadow: { bone: 'shadow', follow: 'root', lift: 80 },
    springs: {
      crest1: { len: 29, dir: [-0.85, -0.52], k: 170, d: 9, limit: 24 },
      crest2: { len: 40, dir: [-0.32, -0.95], k: 150, d: 8, limit: 20, squash: 0.35 },
      crest3: { len: 30, dir: [0.54, -0.84], k: 170, d: 9, limit: 24 },
      tail: { len: 58, dir: [-1, -0.2], k: 120, d: 9, limit: 12 }
    },
    look: { pupils: ['pupilL', 'pupilR'], brows: ['browL', 'browR'], x: 5.4, y: 6, brow: 1.6, head: 'head', headR: 4, turn: 0.2 },
    /* a drawing that changes with a bone's angle: the far wing is a sliver while it hangs against the body, and opens
       into a whole wing once it swings more than deg away (either way) */
    swaps: [{ slot: 'wingR', bone: 'wingR', from: 'folded', to: 'open', deg: 15 }],
    /* pupils tuck under the edge of their eye white (the 3D player clips them), so an eye can look right to its edge */
    clip: [{ slot: 'pupilL', by: 'patchL', drawings: ['open', 'wide', 'wet'] }, { slot: 'pupilR', by: 'patchR', drawings: ['open', 'wide', 'wet'] }],
    idle: {
      body: { sy: [0.014, 3.2, 0], sx: [-0.006, 3.2, 0] },
      head: { y: [0.9, 3.2, -0.7], r: [1.3, 6.4, 0] },
      wingL: { r: [1.4, 3.2, 0.6] },
      wingR: { r: [-1.4, 3.2, 0.6] }
    },
    /* closed mouths (closed, smile, frown, o) are whole beaks; open ones are the lower beak under the upper one */
    mouth: { slot: 'mouth', beak: { slot: 'beak', open: ['open', 'wide', 'grin'], openAtt: 'open', closedAtt: 'closed' }, jaw: { bone: 'jaw', drop: { wide: 1.2, open: 0.5 } } },
    visemes: { rest: 'closed', a: 'wide', e: 'open', o: 'o', m: 'closed', f: 'smile', c: 'open' },
    hopClip: 'hop',

    /* ----- body poses ----- */
    poses: {
      stand: { params: { turn: 0.22 } },
      /* raised wings tuck in behind the body, as on the cheer drawing */
      cheer: { slots: both('wing', 'spread'), bones: { wingL: { r: 98.2 }, wingR: { r: -107.1 }, body: { sy: 1.03 }, head: { r: -2 }, tail: { y: 4, r: -4 } }, z: { wingL: 3.5, wingR: 3.6 }, params: { turn: 0.15 } },
      /* turned away to the viewer's left, as on the model sheet's oops drawing */
      cover: { bones: Object.assign(sym({ wing: { r: -28, x: 9, y: 3, sy: 1.04 } }), { head: { y: 4, r: -5 }, body: { sy: 0.975 }, torso: { sx: 0.96 } }), params: { facing: -1, turn: 0.3 } },
      think: { bones: { wingR: { r: 112, sx: 0.9, sy: 0.9, x: -2 }, wingL: { r: -6 }, head: { r: -7, y: -1 } }, z: { wingR: 'front' }, params: { turn: 0.38 } },
      wave: { slots: { wingR: 'spread' }, bones: { wingR: { r: -102 }, wingL: { r: 4 }, head: { r: -5 } }, z: { wingR: 3.6 }, params: { turn: 0.32 } },
      point: { slots: { wingR: 'spread' }, bones: { wingR: { r: -58 }, head: { r: -3 } }, z: { wingR: 3.6 }, params: { turn: 0.55, lookX: 0.7 } },
      wow: { bones: Object.assign(sym({ wing: { r: 24 } }), { crest1: { r: -10, sx: 1.06, sy: 1.12 }, crest3: { r: 10, sx: 1.06, sy: 1.12 }, crest2: { sy: 1.14 }, body: { sy: 1.04 }, head: { y: -2 } }), params: { turn: 0 } },
      sleep: { bones: Object.assign(sym({ wing: { r: -8 } }), { head: { r: 9, y: 4 }, body: { sy: 0.97 }, crest1: { r: -12 }, crest3: { r: 10 }, crest2: { r: 8 } }), params: { turn: 0.12 } },
      sad: { bones: Object.assign(sym({ wing: { r: 5 } }), { crest1: { r: -24, sy: 0.9 }, crest3: { r: 22, sy: 0.9 }, crest2: { r: -12, sy: 0.88 }, head: { y: 5, r: -3 }, body: { sy: 0.965 } }), params: { turn: 0.1 } },
      laugh: { bones: { wingL: { r: -34 }, wingR: { r: -10 }, head: { r: -8, y: -2 }, body: { r: -2 } }, params: { turn: 0.2 } },
      shrug: { bones: Object.assign(sym({ wing: { r: 12 } }), { head: { r: 8, y: 1 }, body: { y: -1 } }), params: { turn: 0.18 } },
      proud: { bones: Object.assign(sym({ wing: { r: 14 } }), { crest1: { r: -8 }, crest3: { r: 8 }, body: { sx: 1.04, sy: 1.02 }, head: { r: -6, y: -3 } }), params: { turn: 0.05 } },
      love: { bones: Object.assign(sym({ wing: { r: -22 } }), { head: { r: 9, y: 1 } }), params: { turn: 0.22 } },
      listen: { bones: { head: { r: 12, y: 1 }, wingL: { r: -4 }, wingR: { r: 6 } }, params: { turn: 0.5, lookX: -0.5 } },
      fly: { slots: Object.assign(both('wing', 'spread'), both('leg', 'tuck')), bones: { wingL: { r: 78 }, wingR: { r: -92 }, root: { y: -26 }, body: { r: 0 } }, z: { wingL: 3.5, wingR: 3.6 }, params: { turn: 0.15 } }
    },

    /* ----- faces ----- */
    faces: {
      happy: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'grin', beak: 'open' } },
      smile: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'smile', beak: 'closed' } },
      joy: { slots: { pupilL: 'happy', pupilR: 'happy', mouth: 'wide', beak: 'up' }, bones: sym({ brow: { y: -3 } }) },
      worried: { slots: { pupilL: 'wet', pupilR: 'wet', mouth: 'frown', beak: 'closed', sweat: 'drop' }, bones: { browL: { r: -20, y: 4, sx: 1.2, sy: 1.35 }, browR: { r: 20, y: 4, sx: 1.2, sy: 1.35 } }, params: { lookX: 0.35, lookY: -0.5 }, glance: false },
      think: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'closed', beak: 'closed', fxHead: 'question' }, bones: { browL: { y: 1.5 }, browR: { y: -5, r: 6 } }, params: { lookX: 0.45, lookY: -0.75 }, glance: false },
      surprised: { slots: { pupilL: 'wide', pupilR: 'wide', mouth: 'o', beak: 'closed', fxHead: 'exclaim' }, bones: sym({ brow: { y: -6 } }) },
      sleepy: { slots: { pupilL: 'closed', pupilR: 'closed', mouth: 'closed', beak: 'closed', fxHead: 'zzz' }, bones: sym({ brow: { y: 2 } }), blink: false, glance: false },
      sad: { slots: { pupilL: 'wet', pupilR: 'wet', mouth: 'frown', beak: 'closed', tear: 'drop' }, bones: { browL: { r: -14, y: 2 }, browR: { r: 14, y: 2 } }, params: { lookY: 0.45 }, glance: false },
      laugh: { slots: { pupilL: 'squeeze', pupilR: 'squeeze', mouth: 'wide', beak: 'up' }, bones: sym({ brow: { y: -4 } }), blink: false },
      unsure: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'smile', beak: 'closed' }, bones: { browL: { y: -5, r: -6 }, browR: { y: -3, r: 4 } }, params: { lookX: -0.2 } },
      proud: { slots: { pupilL: 'happy', pupilR: 'happy', mouth: 'smile', beak: 'closed' }, bones: sym({ brow: { y: -2 } }), blink: false },
      love: { slots: { pupilL: 'heart', pupilR: 'heart', mouth: 'smile', beak: 'closed', cheekL: 'blush', cheekR: 'blush', fxHead: 'hearts' }, blink: false },
      listen: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'closed', beak: 'closed', fxHead: 'sound' }, bones: { browL: { y: -4 }, browR: { y: 0 } }, glance: false },
      focus: { slots: { pupilL: 'open', pupilR: 'open', mouth: 'smile', beak: 'closed' }, bones: { browL: { r: 14, y: 2 }, browR: { r: -14, y: 2 } } }
    },

    /* ----- moods: what screens ask for. The first six are the app's moods today. ----- */
    moods: {
      happy: { pose: 'stand', face: 'happy' },
      cheer: { pose: 'cheer', face: 'joy', clip: 'cheer' },
      oops: { pose: 'cover', face: 'worried', clip: 'wobble' },
      think: { pose: 'think', face: 'think', clip: 'ponder' },
      wow: { pose: 'wow', face: 'surprised', clip: 'surprise' },
      sleep: { pose: 'sleep', face: 'sleepy', clip: 'snooze', idle: { energy: 0.6, amp: 1.5 } },
      wave: { pose: 'wave', face: 'happy', clip: 'wave' },
      point: { pose: 'point', face: 'smile', clip: 'tap' },
      sad: { pose: 'sad', face: 'sad', idle: { energy: 0.7, amp: 0.8 } },
      laugh: { pose: 'laugh', face: 'laugh', clip: 'laugh' },
      shrug: { pose: 'shrug', face: 'unsure', clip: 'shrug' },
      proud: { pose: 'proud', face: 'proud', clip: 'shine' },
      love: { pose: 'love', face: 'love', clip: 'flutter' },
      listen: { pose: 'listen', face: 'listen', clip: 'listen' },
      fly: { pose: 'fly', face: 'happy', clip: 'flap', glance: false },
      dance: { pose: 'stand', face: 'joy', clip: 'dance', params: { turn: 0.1 } },
      ready: { pose: 'stand', face: 'focus', params: { turn: 0.12 } }
    },

    /* ----- clips: keyframes [time, value, ease]. Additive on the pose unless abs is set. ----- */
    clips: {
      hop: { dur: 0.62, tracks: {
        'root.y': [[0, 0], [0.1, 1.5, 'out'], [0.3, -22, 'out'], [0.48, 0, 'in'], [0.62, 0, 'out']],
        'root.sy': [[0, 1], [0.1, 0.9, 'out'], [0.22, 1.07, 'out'], [0.44, 1.02], [0.5, 0.88, 'out'], [0.62, 1, 'out']],
        'root.sx': [[0, 1], [0.1, 1.08, 'out'], [0.22, 0.95, 'out'], [0.44, 0.99], [0.5, 1.1, 'out'], [0.62, 1, 'out']],
        'wingL.r': [[0, 0], [0.16, 14], [0.3, 30], [0.46, 4], [0.62, 0]],
        'wingR.r': [[0, 0], [0.16, -14], [0.3, -30], [0.46, -4], [0.62, 0]] } },
      cheer: { dur: 1.3, tracks: {
        'root.y': [[0, 0], [0.08, 1.5], [0.26, -20, 'out'], [0.42, 0, 'in'], [0.5, 1], [0.68, -14, 'out'], [0.84, 0, 'in'], [1.0, 0]],
        'root.sy': [[0, 1], [0.08, 0.9], [0.2, 1.06], [0.42, 0.9, 'out'], [0.52, 1], [0.84, 0.92], [1, 1]],
        'root.sx': [[0, 1], [0.08, 1.08], [0.2, 0.96], [0.42, 1.08, 'out'], [0.52, 1], [0.84, 1.06], [1, 1]],
        'wingL.r': [[0, 0], [0.1, -16], [0.2, 10], [0.3, -16], [0.4, 10], [0.5, -16], [0.6, 10], [0.72, -10], [0.86, 5], [1.0, 0]],
        'wingR.r': [[0, 0], [0.1, 16], [0.2, -10], [0.3, 16], [0.4, -10], [0.5, 16], [0.6, -10], [0.72, 10], [0.86, -5], [1.0, 0]],
        'slot.fxBody': [[0, 'sparkle'], [1.3, null]],
        'fx.a': [[0, 0], [0.15, 1], [1.0, 1], [1.3, 0]],
        'fx.sx': [[0, 0.6], [0.35, 1.08, 'back'], [1.3, 1]], 'fx.sy': [[0, 0.6], [0.35, 1.08, 'back'], [1.3, 1]] } },
      wobble: { dur: 0.7, tracks: {
        'body.r': [[0, 0], [0.12, -7], [0.27, 6], [0.42, -3], [0.58, 1.5], [0.7, 0]],
        'head.r': [[0, 0], [0.16, 4], [0.32, -4], [0.48, 2], [0.7, 0]] } },
      surprise: { dur: 0.6, tracks: {
        'root.y': [[0, 0], [0.12, -12, 'out'], [0.3, 0, 'in'], [0.6, 0]],
        'root.sy': [[0, 1], [0.08, 0.92], [0.18, 1.08, 'out'], [0.3, 0.92, 'out'], [0.45, 1]],
        'root.sx': [[0, 1], [0.08, 1.06], [0.18, 0.95, 'out'], [0.3, 1.06, 'out'], [0.45, 1]],
        'root.x': [[0, 0], [0.12, -4, 'out'], [0.3, -2], [0.6, 0]] } },
      wave: { dur: 0.84, loop: true, tracks: {
        'wingR.r': [[0, 0], [0.21, -24, 'sine'], [0.42, 0, 'sine'], [0.63, -24, 'sine'], [0.84, 0, 'sine']],
        'head.r': [[0, 0], [0.42, 2, 'sine'], [0.84, 0, 'sine']] } },
      tap: { dur: 1.6, loop: true, tracks: {
        'wingR.r': [[0, 0], [0.12, -8, 'out'], [0.3, 0, 'inOut'], [0.42, -8, 'out'], [0.6, 0, 'inOut'], [1.6, 0]] } },
      ponder: { dur: 2.6, loop: true, tracks: {
        'param.lookX': [[0, 0], [0.5, -0.6], [1.3, -0.6], [1.6, 0], [2.6, 0]],
        'wingR.r': [[0, 0], [0.2, 4], [0.4, 0], [0.6, 4], [0.8, 0], [2.6, 0]],
        'fxHead.y': [[0, 0], [1.3, -3, 'sine'], [2.6, 0, 'sine']] } },
      snooze: { dur: 3.4, loop: true, tracks: {
        'fxHead.y': [[0, 6], [3.4, -10, 'linear']], 'fxHead.x': [[0, -4], [3.4, 6, 'linear']],
        'fxHead.a': [[0, 0], [0.6, 1], [2.6, 1], [3.4, 0]],
        'body.sy': [[0, 1], [1.7, 1.02, 'sine'], [3.4, 1, 'sine']] } },
      laugh: { dur: 0.36, loop: true, tracks: {
        'body.y': [[0, 0], [0.09, -1.8], [0.18, 0], [0.27, -1.8], [0.36, 0]],
        'head.r': [[0, 0], [0.18, -3], [0.36, 0]], 'body.sy': [[0, 1], [0.09, 1.015], [0.18, 1], [0.27, 1.015], [0.36, 1]] } },
      shrug: { dur: 0.8, tracks: {
        'body.y': [[0, 0], [0.2, -3, 'out'], [0.5, 0, 'inOut'], [0.8, 0]],
        'wingL.r': [[0, 0], [0.2, 12, 'out'], [0.5, 0, 'inOut']], 'wingR.r': [[0, 0], [0.2, -12, 'out'], [0.5, 0, 'inOut']] } },
      shine: { dur: 1.6, tracks: {
        'slot.fxBody': [[0, 'sparkle'], [1.6, null]],
        'fx.a': [[0, 0], [0.2, 1], [1.2, 1], [1.6, 0]], 'fx.sx': [[0, 0.7], [0.4, 1.06, 'back'], [1.6, 1]], 'fx.sy': [[0, 0.7], [0.4, 1.06, 'back'], [1.6, 1]],
        'body.sy': [[0, 1], [0.3, 1.03, 'out'], [0.8, 1]] } },
      flutter: { dur: 2.4, loop: true, tracks: {
        'fxHead.y': [[0, 4], [2.4, -12, 'linear']], 'fxHead.a': [[0, 0], [0.4, 1], [1.8, 1], [2.4, 0]],
        'head.r': [[0, 0], [1.2, -5, 'sine'], [2.4, 0, 'sine']] } },
      listen: { dur: 1.8, loop: true, tracks: {
        'fxHead.a': [[0, 0.3], [0.6, 1], [1.2, 0.3], [1.8, 0.3]], 'fxHead.x': [[0, -2], [0.6, 2], [1.2, -2], [1.8, -2]],
        'head.r': [[0, 0], [0.9, 2, 'sine'], [1.8, 0, 'sine']] } },
      flap: { dur: 0.32, loop: true, tracks: {
        'wingL.r': [[0, 26], [0.16, -30, 'sine'], [0.32, 26, 'sine']], 'wingR.r': [[0, -26], [0.16, 30, 'sine'], [0.32, -26, 'sine']],
        'root.y': [[0, -3], [0.16, 2.5, 'sine'], [0.32, -3, 'sine']] } },
      dance: { dur: 1.0, loop: true, tracks: {
        'body.r': [[0, 0], [0.25, 8, 'sine'], [0.5, 0, 'sine'], [0.75, -8, 'sine'], [1, 0, 'sine']],
        'root.x': [[0, 0], [0.25, 4, 'sine'], [0.5, 0, 'sine'], [0.75, -4, 'sine'], [1, 0, 'sine']],
        'root.y': [[0, 0], [0.125, -6, 'out'], [0.25, 0, 'in'], [0.375, -6, 'out'], [0.5, 0, 'in'], [0.625, -6, 'out'], [0.75, 0, 'in'], [0.875, -6, 'out'], [1, 0, 'in']],
        'head.r': [[0, 0], [0.25, -7, 'sine'], [0.5, 0, 'sine'], [0.75, 7, 'sine'], [1, 0, 'sine']],
        'wingL.r': [[0, 0], [0.25, 34, 'sine'], [0.5, 0, 'sine'], [0.75, 6, 'sine'], [1, 0, 'sine']],
        'wingR.r': [[0, 0], [0.25, -6, 'sine'], [0.5, 0, 'sine'], [0.75, -34, 'sine'], [1, 0, 'sine']],
        'slot.fxBody': [[0, 'notes']], 'fx.y': [[0, 0], [0.5, -4, 'sine'], [1, 0, 'sine']] } },
      nod: { dur: 0.7, tracks: {
        'head.r': [[0, 0], [0.15, 5], [0.3, -1], [0.45, 4], [0.7, 0]], 'head.y': [[0, 0], [0.15, 2.5], [0.3, 0], [0.45, 2], [0.7, 0]] } },
      /* turns are offsets from the mood's turn: a shake swings either side of the rest turn, front to three-quarter */
      shake: { dur: 0.75, tracks: {
        'param.turn': [[0, 0], [0.12, -0.22], [0.28, 0.2], [0.44, -0.18], [0.6, 0.1], [0.75, 0]],
        'head.r': [[0, 0], [0.12, -3], [0.28, 3], [0.44, -2], [0.6, 1], [0.75, 0]] } },
      lookAround: { dur: 2.2, tracks: {
        /* past the front to the left, where the head mirrors, then round to the right */
        'param.turn': [[0, 0], [0.45, -0.52, 'inOut'], [1.0, -0.52], [1.5, 0.2, 'inOut'], [1.85, 0.2], [2.2, 0, 'inOut']],
        'param.lookX': [[0, 0], [0.35, -0.7, 'out'], [1.0, -0.7], [1.35, 0.7, 'out'], [1.85, 0.7], [2.2, 0]] } },
      bow: { dur: 1.4, tracks: {
        'head.y': [[0, 0], [0.4, 10, 'inOut'], [0.95, 10], [1.4, 0, 'inOut']],
        'head.r': [[0, 0], [0.4, 3, 'inOut'], [0.95, 3], [1.4, 0, 'inOut']],
        'body.sy': [[0, 1], [0.4, 0.93, 'inOut'], [0.95, 0.93], [1.4, 1, 'inOut']],
        'wingL.r': [[0, 0], [0.4, 26, 'inOut'], [0.95, 26], [1.4, 0, 'inOut']], 'wingR.r': [[0, 0], [0.4, -26, 'inOut'], [0.95, -26], [1.4, 0, 'inOut']],
        'slot.pupilL': [[0, 'open'], [0.3, 'happy'], [1.1, 'open']], 'slot.pupilR': [[0, 'open'], [0.3, 'happy'], [1.1, 'open']] } }
    }
  };

  /* A bird: the shared skeleton plus its own part sheet, palette and pivot tweaks. Extra bones (a longer crest,
     say) go after their parents; a bone with a shared bone's id changes that bone instead (its turn, say). `slots`
     may be a function that edits the shared draw order. A bird without some of the shared drawings (no crest, no
     eye whites) simply leaves those slots out; `swaps` and `clip` then say what it has instead. */
  const birds = {};   // every bird made so far, by id: the app's mascots load their part sheets when picked
  function make(skin) {
    const pv = skin.pivots || {};
    const merge = (a, b) => Object.assign({}, a, b);
    const own = {}; for (const b of skin.bones || []) own[b.id] = b;
    const bones = BIRD.bones.map(b => {
      let o = pv[b.id] ? merge(b, { x: pv[b.id][0], y: pv[b.id][1] }) : b;
      if (own[b.id]) o = merge(o, own[b.id]);
      return o;
    }).concat((skin.bones || []).filter(b => !BIRD.bones.some(s => s.id === b.id)));
    const parts = {};
    for (const id of Object.keys(FX_PARTS).concat(Object.keys(skin.parts))) parts[id] = merge(FX_PARTS[id], skin.parts[id]);
    const pick = k => (skin[k] !== undefined ? skin[k] : BIRD[k]);
    return (birds[skin.id] = merge(BIRD, {
      id: skin.id, name: skin.name,
      palette: merge(FX_PALETTE, skin.palette),
      rest: merge(BIRD.rest, skin.rest), turn: merge(BIRD.turn, skin.turn), lines: merge(BIRD.lines, skin.lines), look: merge(BIRD.look, skin.look),
      bones, parts,
      slots: (typeof skin.slots === 'function' ? skin.slots(BIRD.slots.slice()) : skin.slots || BIRD.slots).filter(sl => sl.att === null || Object.keys(parts[sl.id] || {}).length),
      springs: merge(BIRD.springs, skin.springs),
      swaps: pick('swaps'), clip: pick('clip'), idle: pick('idle'), mouth: pick('mouth'), visemes: pick('visemes'), view: pick('view'),
      poses: merge(BIRD.poses, skin.poses), faces: merge(BIRD.faces, skin.faces), moods: merge(BIRD.moods, skin.moods), clips: merge(BIRD.clips, skin.clips)
    }));
  }

  /* The eye drawings every bird has, from its traced open eye and happy arc: wide, wet, closed, blink, lidded,
     squeeze and heart, drawn in the sheets' brush style. s is 'L' or 'R', E the eye's centre and radii [x, y, rx, ry].
     o.ink is the class of the drawn marks (k-ink), o.line of the squeezed eye's stroke (ln); o.front draws the hearts
     the same size for a bird that faces front (a turned bird's far heart is narrower). */
  function eyes(s, E, open, happy, o = {}) {
    const [x, y, rx, ry] = E, k = o.ink || 'k-ink';
    const at = (t, m) => '<g transform="translate(' + x + ' ' + y + ') ' + t + ' translate(' + -x + ' ' + -y + ')">' + m + '</g>';
    const yc = r2(y - ry * 0.12), hw = r2(rx * Math.sqrt(1 - 0.0144)), sq = s === 'L' ? 1 : -1;
    return {
      open,
      wide: at('scale(1.1)', open) + ci('k-glint', r2(x - rx * 0.4), r2(y + ry * 0.5), 1.6),
      wet: open + ci('k-glint', r2(x - rx * 0.4), r2(y + ry * 0.48), 2.5) + ci('k-glint', r2(x + rx * 0.52), r2(y + ry * 0.1), 1.2),
      happy,
      closed: taper(x - rx * 1.02, y - 1.5, x, y + 9, x + rx * 1.02, y - 1.5, 2.8, k),
      blink: taper(x - rx * 1.08, y + 1, x, y + 4.4, x + rx * 1.08, y + 1, 2.6, k),
      lidded: p(k, 'M' + r2(x - hw) + ' ' + yc + ' A' + rx + ' ' + ry + ' 0 1 0 ' + r2(x + hw) + ' ' + yc + 'Z') + ci('k-glint', r2(x + rx * 0.25), r2(y + ry * 0.22), 2.6) +
        taper(x - rx - 3.5, yc + 0.8, x, yc - 1.4, x + rx + 3.5, yc + 0.8, 2.6, k),
      squeeze: p(o.line || 'ln', 'M' + (x - 7 * sq) + ' ' + (y - 8.5) + ' L' + (x + 6 * sq) + ' ' + y + ' L' + (x - 7 * sq) + ' ' + (y + 8.5), 'stroke-width:calc(var(--rig-lw,2) * 1.15px)'),
      heart: at('scale(' + (s === 'L' || o.front ? 1.05 : 0.92) + ' 1.05)', HEART(x, y + 1.5, 1.45)) + ci('k-glint', r2(x + 5.5), r2(y - 6), 2.2)
    };
  }

  return { make, birds, BIRD, sym, both, eyes, draw: { mirror: M, path: p, ellipse: e, circle: ci, gloss, rim, taper, xform, star: STAR, heart: HEART, note: NOTE, z: Z } };
})();
if (typeof module !== 'undefined') module.exports = Bird;
