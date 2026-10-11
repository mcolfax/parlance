"use strict";
/* ===================== BIRD RIG =====================
   A small 2D skeletal rig, built the way tools like Spine work:
   - BONES form a tree (root → body → head → crest feathers, eyes, beak…). Each bone has a pivot.
   - SLOTS are the draw order, back to front. Each slot shows one ATTACHMENT (SVG art) on one bone.
   - A POSE says how far each bone turns, stretches or moves this frame. World matrices are composed
     down the tree, and every slot gets its bone's world matrix.
   Art is authored in each species' own coordinates (traced from its design sheet), so a part keeps
   exactly its drawn shape. Parts can move between species: a crest, beak, tail, wing set or face from
   one bird is mapped onto another bird's anchor and scaled to its head or body size.
   Species art lives in js/core/birds.js (BIRD_SKINS). Poses are procedural functions of time, so the
   intro film can scrub them exactly and every bird on screen shares one animation clock.
   ================================================================== */
const RIG_VIEW = { w: 240, h: 228, gx: 120, gy: 214, tall: 168 };   // birds stand on (gx, gy), about `tall` units high
const RIG_OW = 2.6;   // outline width in view units
/* bone tree: [name, parent, pivot key in the skin (mirrored for R), mirror of] */
const RIG_BONES = [
  ['root', null], ['footL', 'root', 'foot'], ['footR', 'root', 'foot', 'footL'], ['body', 'root', 'body'],
  ['tail', 'body', 'tail'], ['wingL', 'body', 'wing'], ['wingR', 'body', 'wing', 'wingL'],
  ['head', 'body', 'head'], ['crest', 'head', 'crest'],
  ['eyeL', 'head', 'eye'], ['eyeR', 'head', 'eye', 'eyeL'], ['browL', 'head', 'brow'], ['browR', 'head', 'brow', 'browL'],
  ['beak', 'head', 'beak'], ['jaw', 'head', 'jaw'], ['sweat', 'head', 'sweat'], ['fx', 'root', 'fx']
];
/* ----- affine matrices [a b c d e f] ----- */
const Mx = {
  id: () => [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
  /* rotate r degrees and scale (sx, sy) about pivot (px, py), then move by (tx, ty) */
  about(px, py, r, sx, sy, tx, ty){
    const a = (r || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    sx = sx == null ? 1 : sx; sy = sy == null ? 1 : sy;
    const A = c * sx, B = s * sx, C = -s * sy, D = c * sy;
    return [A, B, C, D, px - A * px - C * py + (tx || 0), py - B * px - D * py + (ty || 0)];
  },
  /* map a part drawn at anchor p (in its own species) onto anchor q, scaled by k, optionally mirrored about x = q[0] */
  move: (p, q, k, flip) => [flip ? -k : k, 0, 0, k, q[0] - (flip ? -k : k) * p[0], q[1] - k * p[1]],
  str: m => 'matrix(' + m.map(v => Math.round(v * 1000) / 1000).join(' ') + ')',
  pt: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
};
/* deterministic noise so a bird's blinks and glances repeat exactly for a given seed and time */
function rigRand(seed, n){ let x = Math.imul((seed | 0) ^ Math.imul(n | 0, 0x9E3779B1), 0x85EBCA77); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE3D); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
const ease = { out: u => 1 - Math.pow(1 - u, 3), inOut: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, back: u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const lerp = (a, b, u) => a + (b - a) * u;

/* ----- build: resolve a look into a skeleton plus slots ----- */
function rigSkin(id){ return BIRD_SKINS[id] || BIRD_SKINS[BIRD_DEFAULT_SKIN]; }
function rigModel(look){
  const S0 = rigSkin(look.body);
  const part = (key, fallback) => { const id = look[key]; if (id === 'none') return null; return BIRD_SKINS[id] && BIRD_SKINS[id].parts[key] ? id : fallback; };
  const P = S0.pivots, cx = S0.cx;
  const mirror = p => [2 * cx - p[0], p[1]];
  const piv = {};
  for (const [name, , key, mirrorOf] of RIG_BONES){
    if (name === 'root'){ piv.root = S0.ground; continue; }
    const p = P[key] || S0.ground;
    piv[name] = mirrorOf ? mirror(p) : p;
  }
  // a part from another species is scaled by the ratio of head (or body) sizes and placed on this bird's anchor
  const fix = (srcId, anchor, sizeKey, flip) => {
    const A = rigSkin(srcId); const k = S0[sizeKey] / A[sizeKey];
    const p = A.pivots[anchor] || A.ground, q = S0.pivots[anchor] || S0.ground;
    if (!flip) return srcId === S0.id ? null : Mx.move(p, q, k);
    // the right-hand copy of a left-hand part: map, then mirror about this bird's centre line
    return Mx.mul([-1, 0, 0, 1, 2 * cx, 0], srcId === S0.id ? Mx.id() : Mx.move(p, q, k));
  };
  const slots = [];
  const add = (name, bone, art, m, cls) => { if (art) slots.push({ name, bone, art, m: m || null, cls: cls || '' }); };
  const tailId = part('tail', S0.id), crestId = part('crest', null), beakId = part('beak', S0.id), wingId = part('wing', S0.id), faceId = part('face', S0.id);
  const marks = new Set(look.marks || []);
  const mk = (src, set) => set ? Object.entries(set).filter(([k]) => marks.has(k)).map(([, v]) => v).join('') : '';
  const T = tailId && rigSkin(tailId).parts.tail, C = crestId && rigSkin(crestId).parts.crest;
  const W = rigSkin(wingId).parts.wing, B = rigSkin(beakId).parts.beak, Fc = rigSkin(faceId).parts.face;
  const body = S0.parts.body, head = S0.parts.head, feet = S0.parts.feet;
  add('shadow', 'root', '<ellipse class="b-shadow" cx="' + S0.ground[0] + '" cy="' + S0.ground[1] + '" rx="' + S0.shadow + '" ry="' + (S0.shadow * 0.16) + '"/>');
  if (T) add('tail', 'tail', T.art + mk(tailId, T.marks), fix(tailId, 'tail', 'bodyR'));
  add('footL', 'footL', feet.art); add('footR', 'footR', feet.art, [-1, 0, 0, 1, 2 * cx, 0]);
  if (C) C.feathers.forEach((f, i) => add('crest' + i, 'crest', '<g class="b-feather" data-i="' + i + '">' + f.art + '</g>', fix(crestId, 'crest', 'headR'), 'b-cf'));
  add('bodyOL', 'body', '<g class="b-ol">' + body.sil + '</g>');
  add('headOL', 'head', '<g class="b-ol">' + head.sil + '</g>');
  add('body', 'body', body.art + mk(S0.id, body.marks));
  add('wingL', 'wingL', '<g class="b-fold">' + W.fold + mk(wingId, W.marks) + '</g><g class="b-spread">' + (W.spread || W.fold) + mk(wingId, W.spreadMarks || W.marks) + '</g>', fix(wingId, 'wing', 'bodyR'));
  add('wingR', 'wingR', '<g class="b-fold">' + W.fold + mk(wingId, W.marks) + '</g><g class="b-spread">' + (W.spread || W.fold) + mk(wingId, W.spreadMarks || W.marks) + '</g>', fix(wingId, 'wing', 'bodyR', true));
  add('head', 'head', head.art + mk(S0.id, head.marks));
  add('face', 'head', Fc.art + mk(faceId, Fc.marks), fix(faceId, 'eye', 'headR'));
  if (S0.cheek) for (const side of ['L', 'R']) add('blush' + side, 'head', '<ellipse class="b-blush" cx="' + S0.cheek[0] + '" cy="' + S0.cheek[1] + '" rx="' + S0.cheek[2] + '" ry="' + (S0.cheek[2] * 0.62) + '"/>', side === 'R' ? [-1, 0, 0, 1, 2 * cx, 0] : null);
  for (const side of ['L', 'R']){
    const flip = side === 'R' ? [-1, 0, 0, 1, 2 * cx, 0] : null;
    add('eye' + side, 'eye' + side, rigEyeArt(S0), flip);
    add('brow' + side, 'brow' + side, '<path class="b-brow" stroke-width="' + (S0.eyeR * 0.5) + '" d="' + S0.brow + '"/>', flip);
  }
  add('mouth', 'jaw', B.mouth, fix(beakId, 'beak', 'headR'));
  add('jaw', 'jaw', B.lower, fix(beakId, 'beak', 'headR'));
  add('beak', 'beak', B.upper + (marks.has('cere') && B.cere ? B.cere : ''), fix(beakId, 'beak', 'headR'));
  add('sweat', 'sweat', '<path class="b-sweat" d="M0 -7 C2.6 -2.6 4.4 0.4 4.4 2.6 A4.4 4.4 0 0 1 -4.4 2.6 C-4.4 0.4 -2.6 -2.6 0 -7 Z" transform="translate(' + piv.sweat[0] + ' ' + piv.sweat[1] + ') scale(' + (S0.headR / 26) + ')"/>');
  const fxs = S0.headR / 26, hp = S0.pivots.head;
  add('fx', 'fx', '<g class="b-spark">' + [[-34, -40, 1], [34, -46, 0.75], [44, -12, 0.55]].map(([dx, dy, s]) => '<path transform="translate(' + (hp[0] + dx * fxs) + ' ' + (hp[1] - S0.headR + dy * fxs) + ') scale(' + (s * fxs) + ')" d="M0 -9 L2.2 -2.2 9 0 2.2 2.2 0 9 -2.2 2.2 -9 0 -2.2 -2.2 Z"/>').join('') + '</g>' +
    '<g class="b-z"><text x="' + (hp[0] + 30 * fxs) + '" y="' + (hp[1] - S0.headR - 2) + '" style="font-size:' + (15 * fxs) + 'px">z</text><text x="' + (hp[0] + 42 * fxs) + '" y="' + (hp[1] - S0.headR - 16 * fxs) + '" style="font-size:' + (11 * fxs) + 'px">z</text></g>');
  // placement: stand on the ground point, scaled so every species is about the same height; size option on top
  const k = (RIG_VIEW.tall / S0.height) * ({ s: 0.84, m: 1, l: 1.1 }[look.size] || 1);
  const place = [k, 0, 0, k, RIG_VIEW.gx - k * S0.ground[0], RIG_VIEW.gy - k * S0.ground[1]];
  return { look, skin: S0, piv, slots, place, k, crestN: C ? C.feathers.length : 0, crestPiv: C ? C.feathers.map(f => f.pivot) : [], crestFix: C ? fix(crestId, 'crest', 'headR') : null, ow: RIG_OW / k };
}
/* eyes are drawn by the rig (not traced) so every species blinks, looks around and emotes the same way */
function rigEyeArt(S0){
  const [x, y] = S0.pivots.eye, r = S0.eyeR, gl = r * 0.36;
  return '<g class="b-eye-open"><ellipse class="b-eyeball" cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.12) + '"/>' +
    '<g class="b-pupil"><circle class="b-glint" cx="' + (x + r * 0.32) + '" cy="' + (y - r * 0.4) + '" r="' + gl + '"/><circle class="b-glint" cx="' + (x - r * 0.34) + '" cy="' + (y + r * 0.42) + '" r="' + (gl * 0.5) + '"/></g></g>' +
    '<path class="b-eye-happy" stroke-width="' + (r * 0.62) + '" d="M' + (x - r * 1.1) + ' ' + (y + r * 0.35) + ' Q' + x + ' ' + (y - r * 1.25) + ' ' + (x + r * 1.1) + ' ' + (y + r * 0.35) + '"/>' +
    '<path class="b-eye-shut" stroke-width="' + (r * 0.55) + '" d="M' + (x - r * 1.05) + ' ' + (y - r * 0.05) + ' Q' + x + ' ' + (y + r * 0.95) + ' ' + (x + r * 1.05) + ' ' + (y - r * 0.05) + '"/>';
}

/* ----- poses: procedural, a function of mood, action and time ----- */
const RIG_STILL = { happy: 0, cheer: 0.95, think: 0.8, oops: 1.1, sleep: 1.2, wow: 0.7 };   // the frame a still (non-animated) bird shows
function rigPose(model, st, t){
  const R = {}; const set = (b, o) => { R[b] = Object.assign(R[b] || {}, o); };
  const seed = st.seed || 1, mood = st.mood || 'happy';
  const F = { eyes: 'open', lid: 0, look: [0, 0], brow: 0, browTilt: 0, beak: 0, sweat: -1, z: -1, spark: -1, spread: 0, eyeS: 1, blush: 0.5, shadow: 1 };
  const tm = t - (st.moodT || 0);
  // breathing, sway and secondary motion (every mood)
  const br = Math.sin(t * 2 * Math.PI / (mood === 'sleep' ? 5 : 3.3));
  set('body', { sy: 1 + br * (mood === 'sleep' ? 0.026 : 0.016), sx: 1 - br * 0.008 });
  set('head', { r: 2.2 * Math.sin(t * 2 * Math.PI / 7.1 + seed), ty: -br * 0.6 });
  set('tail', { r: 3 * Math.sin(t * 2 * Math.PI / 2.9 + 1) });
  set('wingL', { r: 1.6 * Math.sin(t * 2 * Math.PI / 3.3 + 0.6) }); set('wingR', { r: -1.6 * Math.sin(t * 2 * Math.PI / 3.3 + 0.6) });
  set('crest', { r: 2.4 * Math.sin(t * 2 * Math.PI / 4.2 + 2) });
  // blinks: every 2.6–5.4 s, sometimes twice
  if (!st.still){
    let tb = 0.8 + rigRand(seed, 0) * 2, n = 1;
    while (tb < t + 0.5){
      const d = t - tb; if (d >= 0 && d < 0.17){ F.lid = Math.sin(d / 0.17 * Math.PI); break; }
      if (rigRand(seed, n * 7) < 0.18 && d >= 0.17 && d < 0.42){ const d2 = d - 0.25; if (d2 >= 0 && d2 < 0.17){ F.lid = Math.sin(d2 / 0.17 * Math.PI); break; } }
      tb += 2.6 + rigRand(seed, n++) * 2.8;
    }
    // glances: hold a look for a while, then move the eyes somewhere else
    const gi = Math.floor((t + rigRand(seed, 99) * 4) / 3.4), gu = clamp01(((t + rigRand(seed, 99) * 4) % 3.4) / 0.25);
    const gx = i => rigRand(seed, 200 + i) < 0.45 ? 0 : (rigRand(seed, 300 + i) - 0.5) * 1.4, gy = i => rigRand(seed, 200 + i) < 0.45 ? 0 : (rigRand(seed, 400 + i) - 0.6) * 0.8;
    F.look = [lerp(gx(gi - 1), gx(gi), ease.inOut(gu)), lerp(gy(gi - 1), gy(gi), ease.inOut(gu))];
  }
  if (mood === 'cheer'){
    const u = tm;
    F.eyes = 'happy'; F.beak = 0.65 + 0.25 * Math.sin(tm * 9); F.spark = (tm * 1.1) % 1; F.blush = 0.85;
    let up = 0, sq = 0;
    if (u < 0.12) sq = Math.sin(u / 0.12 * Math.PI / 2);
    else if (u < 0.56){ const v = (u - 0.12) / 0.44; up = Math.sin(v * Math.PI); sq = -0.6 * Math.sin(v * Math.PI); }
    else { const v = ((u - 0.56) % 0.9) / 0.9; up = 0.28 * Math.max(0, Math.sin(v * Math.PI * 2)); }
    set('root', { ty: -up * model.skin.height * 0.13 });
    set('body', { sy: (R.body.sy || 1) * (1 - sq * 0.08), sx: (R.body.sx || 1) * (1 + sq * 0.06) });
    const raise = ease.back(clamp01(u / 0.4)), wave = u > 0.4 ? 12 * Math.sin((u - 0.4) * 2 * Math.PI * 2.2) : 0;
    set('wingL', { r: raise * 138 + wave }); set('wingR', { r: -(raise * 138 + wave) }); F.spread = raise;
    set('crest', { r: -3, sy: 1 + 0.14 * raise }); F.fan = 1 + 0.35 * raise;
    set('head', { r: 4 * Math.sin(tm * 5) });
    set('footL', { sy: 1 - up * 0.25 }); set('footR', { sy: 1 - up * 0.25 });
    F.shadow = 1 - up * 0.35;
  } else if (mood === 'oops'){
    F.brow = 1; F.browTilt = 1; F.beak = 0.28; F.eyeS = 0.92; F.look = [0.15, 0.35];
    set('root', { r: 7 * Math.exp(-3 * tm) * Math.sin(tm * 13) });
    const tuck = ease.out(clamp01(tm / 0.35));
    set('wingL', { r: -16 * tuck + R.wingL.r, tx: 3 * tuck }); set('wingR', { r: 16 * tuck + R.wingR.r, tx: -3 * tuck });
    set('crest', { r: 10 * tuck, sy: 1 - 0.32 * tuck }); F.fan = 1 - 0.3 * tuck;
    set('head', { r: 6 * tuck + R.head.r * 0.5, ty: 1.5 * tuck });
    set('body', { sy: (R.body.sy || 1) * (1 - 0.03 * tuck) });
    F.sweat = ((tm + 0.3) % 2.4) / 2.4;
  } else if (mood === 'think'){
    F.look = [0.75, -0.8]; F.brow = 1; F.browTilt = -1;
    const u = ease.inOut(clamp01(tm / 0.5));
    set('head', { r: -9 * u + R.head.r * 0.4 });
    set('wingR', { r: -96 * u + 3 * Math.sin(t * 3) }); F.spreadR = 0;
    set('crest', { r: -8 * u });
  } else if (mood === 'sleep'){
    F.eyes = 'shut'; F.z = (t % 3) / 3; F.blush = 0.6; F.look = [0, 0];
    set('head', { r: 7 + Math.sin(t * 2 * Math.PI / 5) * 1.5, ty: 2 });
    set('crest', { r: 6, sy: 0.82 }); F.fan = 0.85;
    set('tail', { r: 1.2 * Math.sin(t) });
  } else if (mood === 'wow'){
    F.eyeS = 1.16; F.beak = 0.8; F.brow = 1; F.browTilt = -0.4; F.look = [0, 0]; F.spark = (tm * 0.9) % 1;
    const u = clamp01(tm / 0.35);
    set('root', { ty: -model.skin.height * 0.07 * Math.sin(u * Math.PI) });
    set('crest', { sy: 1 + 0.2 * ease.back(u) }); F.fan = 1 + 0.4 * ease.back(u);
    set('wingL', { r: 26 * ease.out(u) + 4 * Math.sin(t * 7) }); set('wingR', { r: -26 * ease.out(u) - 4 * Math.sin(t * 7) });
  }
  // actions layered on top of the mood
  if (st.speaking && mood !== 'sleep') F.beak = Math.max(F.beak, 0.55 + 0.45 * Math.sin(t * 15) * Math.sin(t * 4.3));
  const fly = st.fly || (st.act === 'flyin' && t - st.actT < 1.7);
  if (fly){
    const fl = 62 + 58 * Math.sin(t * 2 * Math.PI * 4.6);
    set('wingL', { r: fl }); set('wingR', { r: -fl }); F.spread = 1;
    set('root', { ty: -3 * Math.cos(t * 2 * Math.PI * 4.6) });
    set('footL', { sy: 0.55, r: 12 }); set('footR', { sy: 0.55, r: -12 }); F.shadow = 0.25;
  }
  if (st.act === 'hop'){
    const u = (t - st.actT) / 0.7;
    if (u >= 0 && u < 1){
      const jump = u < 0.15 ? 0 : u < 0.75 ? Math.sin((u - 0.15) / 0.6 * Math.PI) : 0;
      const sq = u < 0.15 ? Math.sin(u / 0.15 * Math.PI) : u > 0.75 ? Math.sin((u - 0.75) / 0.25 * Math.PI) : -0.5 * jump;
      set('root', { ty: (R.root && R.root.ty || 0) - jump * model.skin.height * 0.14 });
      set('body', { sy: (R.body.sy || 1) * (1 - sq * 0.1), sx: (R.body.sx || 1) * (1 + sq * 0.07) });
      if (!fly && mood !== 'cheer'){ const fl = 40 * Math.sin(u * Math.PI * 4) * (1 - u); set('wingL', { r: Math.abs(fl) + 6 }); set('wingR', { r: -Math.abs(fl) - 6 }); }
      F.spark = u;
    }
  }
  return { R, F };
}

/* ----- render ----- */
function rigBoneMatrices(model, pose){
  const W = {};
  for (const [name, parent] of RIG_BONES){
    const p = model.piv[name], d = pose.R[name] || {};
    const local = Mx.about(p[0], p[1], d.r, d.sx, d.sy, d.tx, d.ty);
    W[name] = parent ? Mx.mul(W[parent], local) : Mx.mul(model.place, local);
  }
  return W;
}
function rigSlotMatrix(model, W, s){ return s.m ? Mx.mul(W[s.bone], s.m) : W[s.bone]; }
function rigSVG(model, pose){
  const W = rigBoneMatrices(model, pose);
  let out = '<svg class="pip-svg" viewBox="0 0 ' + RIG_VIEW.w + ' ' + RIG_VIEW.h + '" aria-hidden="true"><g class="p-root sk-' + model.skin.id + '" style="' + pipVars(model.look) + '--sk-ow:' + model.ow.toFixed(3) + 'px">';
  for (const s of model.slots) out += '<g class="b-slot b-' + s.name + (s.cls ? ' ' + s.cls : '') + '" data-slot="' + s.name + '" transform="' + Mx.str(rigSlotMatrix(model, W, s)) + '">' + s.art + '</g>';
  return out + '</g></svg>';
}
/* apply a pose to a rendered bird: matrices, then the face (eyes, brows, beak) and effects */
function rigApply(b, pose){
  const { model } = b, W = rigBoneMatrices(model, pose), F = pose.F;
  if (!b.els){ b.els = {}; for (const g of b.el.querySelectorAll('.b-slot')) b.els[g.getAttribute('data-slot')] = g; b.parts = {}; }
  const fan = F.fan || 1;
  for (const s of model.slots){
    const g = b.els[s.name]; if (!g) continue;
    let m = rigSlotMatrix(model, W, s);
    if (s.cls === 'b-cf'){
      // each crest feather fans out from its own base (art and pivots are in the crest's own coordinates)
      const i = +s.name.slice(5), n = model.crestN, piv = model.crestPiv[i];
      const spread = (i - (n - 1) / 2) * (fan - 1) * 16;
      if (spread) m = Mx.mul(m, Mx.about(piv[0], piv[1], spread, 1, 1));
    }
    if (s.name === 'eyeL' || s.name === 'eyeR'){
      // blink and widen about the eye centre (the right eye is the left eye's art, mirrored)
      const e = model.skin.pivots.eye, lid = 1 - 0.9 * F.lid;
      m = Mx.mul(m, Mx.about(e[0], e[1], 0, F.eyeS, F.eyeS * lid));
    }
    const str = Mx.str(m);
    if (g._m !== str){ g.setAttribute('transform', str); g._m = str; }
  }
  const P = b.parts, q = (k, sel) => (P[k] !== undefined ? P[k] : (P[k] = b.el.querySelectorAll(sel)));
  const vis = (list, on) => { for (const el of list){ const v = on ? '' : 'none'; if (el._d !== v){ el.style.display = v; el._d = v; } } };
  vis(q('open', '.b-eye-open'), F.eyes === 'open'); vis(q('happy', '.b-eye-happy'), F.eyes === 'happy'); vis(q('shut', '.b-eye-shut'), F.eyes === 'shut');
  const r = model.skin.eyeR;
  for (const p of q('pupil', '.b-pupil')){ const v = 'translate(' + (F.look[0] * r * 0.35).toFixed(2) + ' ' + (F.look[1] * r * 0.35).toFixed(2) + ')'; if (p._t !== v){ p.setAttribute('transform', v); p._t = v; } }
  // brows: only when a mood needs them
  const SL = model.slotBy || (model.slotBy = Object.fromEntries(model.slots.map(s => [s.name, s])));
  const setM = (el, m) => { const v = Mx.str(m); if (el._m !== v){ el.setAttribute('transform', v); el._m = v; } };
  const bl = b.els.browL, brr = b.els.browR;
  if (bl && brr){ const o = String(F.brow); if (bl._o !== o){ bl.style.opacity = o; brr.style.opacity = o; bl._o = o; }
    // worried brows tilt up in the middle; a raised brow lifts on one side (the right brow is the left one mirrored)
    const e = model.skin.pivots.brow, tl = F.browTilt * 14;
    if (F.brow){ setM(bl, Mx.mul(rigSlotMatrix(model, W, SL.browL), Mx.about(e[0], e[1], tl, 1, 1, 0, F.browTilt < 0 ? -model.skin.eyeR * 0.5 : 0))); setM(brr, Mx.mul(rigSlotMatrix(model, W, SL.browR), Mx.about(e[0], e[1], F.browTilt < 0 ? 0 : tl, 1, 1))); }
  }
  // beak: the lower mandible drops and the mouth opens behind it
  const jaw = b.els.jaw, mouth = b.els.mouth, bk = model.piv.jaw;
  if (jaw) setM(jaw, Mx.mul(Mx.mul(W.jaw, Mx.about(bk[0], bk[1], 0, 1, 1, 0, F.beak * model.skin.headR * 0.22)), SL.jaw.m || Mx.id()));
  if (mouth){ setM(mouth, Mx.mul(Mx.mul(W.jaw, Mx.about(bk[0], bk[1], 0, 1, Math.max(0.02, F.beak), 0, 0)), SL.mouth.m || Mx.id())); const o = F.beak > 0.04 ? '1' : '0'; if (mouth._o !== o){ mouth.style.opacity = o; mouth._o = o; } }
  // wings: folded or spread art
  for (const side of ['L', 'R']){
    const sp = side === 'R' && F.spreadR !== undefined ? F.spreadR : F.spread;
    const on = sp > 0.5; const g = b.els['wing' + side];
    if (g && g._sp !== on){ g._sp = on; g.classList.toggle('spread', on); }
  }
  // effects
  const op = (el, v) => { if (el){ const s = String(Math.round(v * 100) / 100); if (el._o !== s){ el.style.opacity = s; el._o = s; } } };
  op(b.els.sweat, F.sweat < 0 ? 0 : F.sweat < 0.15 ? F.sweat / 0.15 : 1 - Math.max(0, F.sweat - 0.7) / 0.3);
  if (b.els.sweat && F.sweat >= 0) setM(b.els.sweat, Mx.mul(W.sweat, Mx.about(0, 0, 0, 1, 1, 0, F.sweat * model.skin.headR * 0.5)));
  const fx = b.els.fx;
  if (fx){ const sp = q('spark', '.b-spark')[0], z = q('z', '.b-z')[0];
    if (sp) sp.style.opacity = F.spark < 0 ? '0' : String(Math.round(Math.sin(F.spark * Math.PI) * 100) / 100);
    if (z){ z.style.opacity = F.z < 0 ? '0' : String(Math.round(Math.sin(F.z * Math.PI) * 100) / 100); z.setAttribute('transform', 'translate(' + (F.z * 6).toFixed(1) + ' ' + (-F.z * 10).toFixed(1) + ')'); } }
  for (const side of ['L', 'R']) op(b.els['blush' + side], F.blush);
  op(b.els.shadow, F.shadow);
}

/* ----- the shared clock: one requestAnimationFrame loop drives every bird on screen ----- */
const Rig = { live: new Set(), raf: 0, last: 0 };
function rigNow(){ return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
function rigStart(b){ Rig.live.add(b); if (!Rig.raf && typeof requestAnimationFrame === 'function') Rig.raf = requestAnimationFrame(rigTick); }
function rigTick(ms){
  Rig.raf = 0;
  const now = ms / 1000;
  for (const b of Rig.live){
    if (!b.el.isConnected){ Rig.live.delete(b); continue; }
    if (b.driven) continue;   // the film drives its own bird
    // skip birds that are off screen or hidden (cheap check every half second)
    if (!b.vis || now - b.visAt > 0.5){ const r = b.el.getBoundingClientRect(); b.visAt = now; b.vis = r.width > 0 && r.bottom > -40 && r.top < (window.innerHeight || 800) + 40; }
    if (!b.vis) continue;
    rigApply(b, rigPose(b.model, b.state, now - b.t0));
  }
  if (Rig.live.size && !(typeof document !== 'undefined' && document.hidden)) Rig.raf = requestAnimationFrame(rigTick);
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && Rig.live.size && !Rig.raf) Rig.raf = requestAnimationFrame(rigTick); });
