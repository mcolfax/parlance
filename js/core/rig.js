"use strict";
/* ===================== BIRD RIG =====================
   A small 2D skeletal rig, built the way tools like Spine work:
   - BONES form a tree (root → body → head → crest, eyes, brows, beak…). Each bone turns about a pivot.
   - SLOTS are the draw order, back to front. Each slot shows one ATTACHMENT on one bone. Most slots
     have pose variants drawn by the designer (a wing folded, raised or tucked; eyes open, closed or
     worried; the beak smiling, open or worried), and the rig swaps between them like a flipbook.
   - A POSE says which variant each slot shows and how far each bone turns, stretches or moves this
     frame. World matrices are composed down the tree and every slot gets its bone's matrix.
   Species art (js/core/birds.js, traced from the design sheets) is in each species' own sheet
   coordinates. A face, crest, beak, tail or pair of wings can be lent to another species: rigModel
   maps it onto that bird's anchors and scales it by eye spacing, head size or body size.
   Poses are pure functions of time, so the intro film can scrub them exactly and every bird on screen
   shares one animation clock (rigTick).
   ================================================================== */
const RIG_VIEW = { w: 240, h: 228, gx: 120, gy: 212, tall: 150 };   // birds stand on (gx, gy), head top about `tall` above
const RIG_BONES = [   // [bone, parent, pivot key]
  ['root', null, 'ground'], ['footL', 'root', 'footL'], ['footR', 'root', 'footR'], ['body', 'root', 'body'],
  ['tail', 'body', 'tail'], ['wingL', 'body', 'wingL'], ['wingR', 'body', 'wingR'],
  ['head', 'body', 'head'], ['crest', 'head', 'crest'], ['eyeL', 'head', 'eyeL'], ['eyeR', 'head', 'eyeR'],
  ['browL', 'head', 'browL'], ['browR', 'head', 'browR'], ['beak', 'head', 'beak'], ['sweat', 'head', 'sweat'], ['fx', 'root', 'ground']
];
const RIG_REGIONS = ['body', 'head', 'belly', 'wing', 'crest', 'crest2', 'tail', 'tail2', 'face', 'ring', 'beak', 'feet', 'mark', 'band', 'tip', 'patch', 'cere', 'ink'];
/* when a variant is missing, show the nearest one the designer drew */
const RIG_FALLBACK = { spread: 'fold', tuck: 'fold', closed: 'open', worried: 'open', sleep: 'closed', open: 'smile', oops: 'smile', cheer: 'happy' };
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
  /* move a part drawn at anchor p onto anchor q, scaled by k */
  move: (p, q, k) => [k, 0, 0, k, q[0] - k * p[0], q[1] - k * p[1]],
  pt: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
  str: m => 'matrix(' + m.map(v => Math.round(v * 1000) / 1000).join(' ') + ')'
};
/* deterministic noise: a bird's blinks and glances repeat exactly for a given seed and time */
function rigRand(seed, n){ let x = Math.imul((seed | 0) ^ Math.imul(n | 0, 0x9E3779B1), 0x85EBCA77); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE3D); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
const ease = { out: u => 1 - Math.pow(1 - u, 3), inOut: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, back: u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const lerp = (a, b, u) => a + (b - a) * u;

/* ----- build: resolve a look into a skeleton and slots ----- */
function rigSkin(id){ return BIRD_SKINS[id] || BIRD_SKINS[BIRD_DEFAULT_SKIN]; }
function rigSkinVars(sk){ let s = '--sk-ow:' + (sk.ow || 7) + 'px;--sk-ink:' + sk.ink + ';'; for (const [k, v] of Object.entries(sk.colors || {})) s += '--sk-' + k + ':' + v + ';'; return s; }
function rigModel(look){
  const B = rigSkin(look.body), P = B.pivots;
  const piv = {}; for (const [bone, , key] of RIG_BONES) piv[bone] = (key === 'ground' ? B.ground : P[key]) || B.ground;
  const src = key => { const id = look[key]; if (id === 'none') return null; const s = BIRD_SKINS[id]; return s && hasPart(s, key) ? s : (hasPart(B, key) ? B : null); };
  // a lent part keeps its own colors (unless the learner recolors) and is mapped onto this bird's anchors
  const lend = (S, p, q, k) => S.id === B.id ? null : Mx.move(p, q, k);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const slots = [];
  const add = (name, bone, variants, S, m, extra) => { if (variants) slots.push(Object.assign({ name, bone, v: typeof variants === 'string' ? { base: variants } : variants, skin: S || B, m: m || null }, extra || {})); };
  const Fs = src('face') || B, Cs = src('crest'), Ks = src('beak') || B, Ts = src('tail'), Ws = src('wing') || B;
  const fM = lend(Fs, mid(Fs.pivots.eyeL, Fs.pivots.eyeR), mid(P.eyeL, P.eyeR), dist(P.eyeL, P.eyeR) / dist(Fs.pivots.eyeL, Fs.pivots.eyeR));
  const hk = S => B.headR / S.headR, bk = S => B.bodyR / S.bodyR;
  add('shadow', 'root', '<ellipse class="b-shadow" cx="' + B.ground[0] + '" cy="' + B.ground[1] + '" rx="' + (B.shadow || B.bodyR * 1.2) + '" ry="' + ((B.shadow || B.bodyR * 1.2) * 0.14) + '"/>');
  if (Ts) add('tail', 'tail', Ts.art.tail, Ts, lend(Ts, Ts.pivots.tail, P.tail, bk(Ts)));
  add('footL', 'footL', B.art.footL); add('footR', 'footR', B.art.footR);
  add('body', 'body', B.art.body);
  add('wingL', 'wingL', Ws.art.wingL, Ws, lend(Ws, Ws.pivots.wingL, P.wingL, bk(Ws)));
  add('wingR', 'wingR', Ws.art.wingR, Ws, lend(Ws, Ws.pivots.wingR, P.wingR, bk(Ws)));
  if (Cs && Cs.art.crest) add('crest', 'crest', Cs.art.crest, Cs, lend(Cs, Cs.pivots.crest, P.crest, hk(Cs)), { feathers: true });
  add('head', 'head', B.art.head);
  if (Fs.art.face) add('face', 'head', Fs.art.face, Fs, fM);
  add('browL', 'browL', Fs.art.browL, Fs, fM); add('browR', 'browR', Fs.art.browR, Fs, fM);
  add('eyeL', 'eyeL', Fs.art.eyeL, Fs, fM, { eye: Fs.pivots.eyeL }); add('eyeR', 'eyeR', Fs.art.eyeR, Fs, fM, { eye: Fs.pivots.eyeR });
  add('beak', 'beak', Ks.art.beak, Ks, lend(Ks, Ks.pivots.beak, P.beak, hk(Ks)));
  const sw = (Fs.art.sweat ? Fs : B.art.sweat ? B : null);
  if (sw) add('sweat', 'sweat', sw.art.sweat, sw, sw.id === B.id ? null : Mx.move(sw.pivots.sweat, P.sweat || P.head, hk(sw)));
  const fxs = B.headR / 60, hp = [P.head[0], P.head[1] - B.headR * 1.9];
  add('fx', 'fx', '<g class="b-spark">' + [[-1.05, 0.15, 1], [1.05, -0.05, 0.75], [1.25, 0.6, 0.55]].map(([dx, dy, s]) => '<path transform="translate(' + (hp[0] + dx * B.headR) + ' ' + (hp[1] + dy * B.headR) + ') scale(' + (s * fxs) + ')" d="M0 -18 L4.4 -4.4 18 0 4.4 4.4 0 18 -4.4 4.4 -18 0 -4.4 -4.4 Z"/>').join('') + '</g>' +
    '<g class="b-z"><text x="' + (hp[0] + B.headR * 0.95) + '" y="' + (hp[1] + B.headR * 0.55) + '" style="font-size:' + (30 * fxs) + 'px">z</text><text x="' + (hp[0] + B.headR * 1.25) + '" y="' + (hp[1] + B.headR * 0.15) + '" style="font-size:' + (22 * fxs) + 'px">z</text></g>');
  const k = (RIG_VIEW.tall / B.height) * ({ s: 0.84, m: 1, l: 1.1 }[look.size] || 1);
  const place = [k, 0, 0, k, RIG_VIEW.gx - k * B.ground[0], RIG_VIEW.gy - k * B.ground[1]];
  return { look, skin: B, piv, slots, place, k, slotBy: Object.fromEntries(slots.map(s => [s.name, s])) };
}
function hasPart(S, key){ const a = S.art; if (key === 'face') return !!(a.eyeL && a.eyeR); if (key === 'wing') return !!(a.wingL && a.wingR); return !!a[key]; }
/* the art for one variant of a slot (crest variants are lists of feathers that fan from their bases) */
function rigVariantArt(s, key, val){
  if (!s.feathers) return '<g class="b-v" data-v="' + key + '">' + val + '</g>';
  return '<g class="b-v" data-v="' + key + '">' + val.map((f, i) => '<g class="b-fe" data-i="' + i + '" data-px="' + f.pivot[0] + '" data-py="' + f.pivot[1] + '">' + f.art + '</g>').join('') + '</g>';
}

/* ----- poses: procedural, a function of mood, action and time ----- */
const RIG_STILL = { happy: 0, cheer: 0.9, think: 0.8, oops: 1.1, sleep: 1.2, wow: 0.7 };   // the frame a still bird shows
function rigPose(model, st, t){
  const R = {}; const set = (b, o) => { R[b] = Object.assign(R[b] || {}, o); };
  const get = (b, k, d) => (R[b] && R[b][k] != null ? R[b][k] : d);
  const seed = st.seed || 1, mood = st.mood || 'happy', S = model.skin;
  const F = { wingL: 'fold', wingR: 'fold', eyes: 'open', brows: 'happy', beak: 'smile', crest: 'happy', lid: 0, look: [0, 0], eyeS: 1, fan: 1, sweat: -1, z: -1, spark: -1, shadow: 1, browY: 0, browUp: 0 };
  const tm = t - (st.moodT || 0);
  // breathing, sway and follow-through (every mood)
  const per = mood === 'sleep' ? 5 : 3.3, br = Math.sin(t * 2 * Math.PI / per);
  set('body', { sy: 1 + br * (mood === 'sleep' ? 0.022 : 0.014), sx: 1 - br * 0.007 });
  set('head', { r: 2 * (S.headTilt == null ? 1 : S.headTilt) * Math.sin(t * 2 * Math.PI / 7.1 + seed), ty: -br * S.height * 0.002 });
  set('tail', { r: 2.6 * Math.sin(t * 2 * Math.PI / 2.9 + 1) });
  set('wingL', { r: 1.5 * Math.sin(t * 2 * Math.PI / 3.3 + 0.6) }); set('wingR', { r: -1.5 * Math.sin(t * 2 * Math.PI / 3.3 + 0.6) });
  set('crest', { r: 2.4 * Math.sin(t * 2 * Math.PI / 4.2 + 2) });
  if (!st.still){
    // blinks every 2.6–5.4 s, sometimes a double blink
    let tb = 0.8 + rigRand(seed, 0) * 2, n = 1;
    while (tb < t + 0.5){
      const d = t - tb;
      if (d >= 0 && d < 0.16){ F.lid = Math.sin(d / 0.16 * Math.PI); break; }
      if (rigRand(seed, n * 7) < 0.2){ const d2 = d - 0.24; if (d2 >= 0 && d2 < 0.16){ F.lid = Math.sin(d2 / 0.16 * Math.PI); break; } }
      tb += 2.6 + rigRand(seed, n++) * 2.8;
    }
    // glances: hold a look, then move the eyes somewhere else
    const off = rigRand(seed, 99) * 4, gi = Math.floor((t + off) / 3.4), gu = clamp01(((t + off) % 3.4) / 0.22);
    const gx = i => rigRand(seed, 200 + i) < 0.45 ? 0 : (rigRand(seed, 300 + i) - 0.5) * 1.6, gy = i => rigRand(seed, 200 + i) < 0.45 ? 0 : (rigRand(seed, 400 + i) - 0.6) * 0.9;
    F.look = [lerp(gx(gi - 1), gx(gi), ease.inOut(gu)), lerp(gy(gi - 1), gy(gi), ease.inOut(gu))];
  }
  const H = S.height;
  if (mood === 'cheer'){
    F.eyes = 'closed'; F.brows = 'cheer'; F.beak = 'open'; F.crest = 'cheer'; F.spark = (tm * 1.1) % 1; F.look = [0, 0];
    let up = 0, sq = 0;
    if (tm < 0.12) sq = Math.sin(tm / 0.12 * Math.PI / 2);
    else if (tm < 0.56){ const v = (tm - 0.12) / 0.44; up = Math.sin(v * Math.PI); sq = -0.6 * up; }
    else { const v = ((tm - 0.56) % 0.9) / 0.9; up = 0.3 * Math.max(0, Math.sin(v * Math.PI * 2)); }
    set('root', { ty: -up * H * 0.1 });
    set('body', { sy: get('body', 'sy', 1) * (1 - sq * 0.07), sx: get('body', 'sx', 1) * (1 + sq * 0.05) });
    if (tm < 0.1){ F.wingL = F.wingR = 'fold'; set('wingL', { r: 30 * tm / 0.1 }); set('wingR', { r: -30 * tm / 0.1 }); }
    else { F.wingL = F.wingR = 'spread'; const rise = -22 * (1 - ease.back(clamp01((tm - 0.1) / 0.35))), wave = 9 * Math.sin((tm - 0.1) * 2 * Math.PI * 2.1);
      set('wingL', { r: rise + wave }); set('wingR', { r: -(rise + wave) }); }
    set('head', { r: 3.5 * Math.sin(tm * 5) });
    set('crest', { sy: 1 + 0.06 * Math.sin(tm * 9) }); F.fan = 1.15 + 0.1 * Math.sin(tm * 9);
    F.shadow = 1 - up * 0.4;
  } else if (mood === 'oops'){
    F.eyes = 'worried'; F.brows = 'oops'; F.beak = 'oops'; F.crest = 'oops'; F.wingL = F.wingR = 'tuck'; F.look = [0, 0];
    set('root', { r: 6 * Math.exp(-3 * tm) * Math.sin(tm * 13) });
    const u = ease.out(clamp01(tm / 0.35));
    set('head', { r: 4 * u + get('head', 'r', 0) * 0.5 });
    set('body', { sy: get('body', 'sy', 1) * (1 - 0.025 * u) });
    F.fan = 1 - 0.15 * u;
    F.sweat = ((tm + 0.3) % 2.6) / 2.6;
  } else if (mood === 'think'){
    F.eyes = 'worried'; F.brows = 'happy'; F.browUp = 1; F.beak = 'oops'; F.wingR = 'tuck'; F.look = [0.25, -0.35];
    const u = ease.inOut(clamp01(tm / 0.5));
    set('head', { r: -7 * u + get('head', 'r', 0) * 0.4 });
    set('crest', { r: -6 * u });
  } else if (mood === 'sleep'){
    F.eyes = 'sleep'; F.brows = null; F.beak = 'oops'; F.z = (t % 3) / 3; F.look = [0, 0]; F.fan = 0.85;
    set('head', { r: 6 + Math.sin(t * 2 * Math.PI / 5) * 1.2, ty: H * 0.006 });
    set('crest', { r: 5, sy: 0.9 });
  } else if (mood === 'wow'){
    F.eyeS = 1.12; F.beak = 'open'; F.brows = 'cheer'; F.browY = -0.12; F.crest = 'cheer'; F.look = [0, 0]; F.spark = (tm * 0.9) % 1;
    const u = clamp01(tm / 0.35);
    set('root', { ty: -H * 0.05 * Math.sin(u * Math.PI) });
    F.wingL = F.wingR = 'spread'; const lift = -48 + 18 * ease.out(u) + 4 * Math.sin(t * 7);
    set('wingL', { r: lift }); set('wingR', { r: -lift });
    F.fan = 1 + 0.3 * ease.back(u);
  }
  // talking: the beak flips between closed and open like a mouth chart
  if (st.speaking && mood !== 'sleep'){ const ph = Math.floor(t * 9 + rigRand(seed, Math.floor(t * 9)) * 0.6); F.beak = ph % 2 ? 'open' : (mood === 'oops' ? 'oops' : 'smile'); }
  const fly = st.fly || (st.act === 'flyin' && t - st.actT < 1.7);
  if (fly){
    F.wingL = F.wingR = 'spread';
    const fl = -38 + 46 * Math.sin(t * 2 * Math.PI * 4.4);
    set('wingL', { r: fl }); set('wingR', { r: -fl });
    set('root', { ty: -H * 0.012 * Math.cos(t * 2 * Math.PI * 4.4) });
    set('footL', { sy: 0.6, r: 10 }); set('footR', { sy: 0.6, r: -10 }); F.shadow = 0.3;
  }
  if (st.act === 'hop'){
    const u = (t - st.actT) / 0.7;
    if (u >= 0 && u < 1){
      const jump = u < 0.15 ? 0 : u < 0.75 ? Math.sin((u - 0.15) / 0.6 * Math.PI) : 0;
      const sq = u < 0.15 ? Math.sin(u / 0.15 * Math.PI) : u > 0.75 ? Math.sin((u - 0.75) / 0.25 * Math.PI) : -0.5 * jump;
      set('root', { ty: get('root', 'ty', 0) - jump * H * 0.12 });
      set('body', { sy: get('body', 'sy', 1) * (1 - sq * 0.08), sx: get('body', 'sx', 1) * (1 + sq * 0.06) });
      if (!fly && mood !== 'cheer' && jump > 0.15){ F.wingL = F.wingR = 'spread'; const fl = -30 + 30 * Math.sin(u * Math.PI * 6); set('wingL', { r: fl }); set('wingR', { r: -fl }); }
      F.spark = u; F.shadow = 1 - jump * 0.4;
    }
  }
  return { R, F };
}

/* ----- render ----- */
function rigBones(model, pose){
  const W = {};
  for (const [name, parent] of RIG_BONES){
    const p = model.piv[name], d = pose.R[name] || {};
    const local = Mx.about(p[0], p[1], d.r, d.sx, d.sy, d.tx, d.ty);
    W[name] = parent ? Mx.mul(W[parent], local) : Mx.mul(model.place, local);
  }
  return W;
}
function rigSlotM(W, s){ return s.m ? Mx.mul(W[s.bone], s.m) : W[s.bone]; }
/* a bird drawn in a given pose, as markup (for places that only need a still picture) */
function rigStatic(model, pose){
  const box = document.createElement('div');
  box.innerHTML = rigSVG(model);
  rigApply({ el: box, model }, pose);
  return box.innerHTML;
}
function rigSVG(model){
  let out = '<svg class="pip-svg" viewBox="0 0 ' + RIG_VIEW.w + ' ' + RIG_VIEW.h + '" aria-hidden="true"><g class="p-root sk-' + model.skin.id + '" style="' + rigSkinVars(model.skin) + pipVars(model.look) + '">';
  for (const s of model.slots){
    const own = s.skin.id !== model.skin.id ? ' style="' + rigSkinVars(s.skin) + '"' : '';
    out += '<g class="b-slot b-' + s.name + '" data-slot="' + s.name + '"' + own + '>' + Object.entries(s.v).map(([k, v]) => rigVariantArt(s, k, v)).join('') + '</g>';
  }
  out += '</g></svg>';
  return out;
}
/* which drawn variant a slot shows for a requested one */
function rigPick(s, want){ let k = want; for (let i = 0; i < 4 && k && !s.v[k]; i++) k = RIG_FALLBACK[k]; return s.v[k] ? k : Object.keys(s.v)[0]; }
function rigApply(b, pose){
  const { model } = b, W = rigBones(model, pose), F = pose.F, S = model.skin;
  if (!b.els){
    b.els = {}; b.vs = {}; b.fe = {};
    for (const g of b.el.querySelectorAll('.b-slot')){
      const n = g.getAttribute('data-slot'); b.els[n] = g; b.vs[n] = {};
      for (const v of g.children) if (v.classList && v.classList.contains('b-v')) b.vs[n][v.getAttribute('data-v')] = v;
      b.fe[n] = [...g.querySelectorAll('.b-fe')].map(f => ({ f, i: +f.getAttribute('data-i'), px: +f.getAttribute('data-px'), py: +f.getAttribute('data-py'), n: f.parentNode.querySelectorAll('.b-fe').length, v: f.parentNode }));
    }
  }
  const setM = (el, m) => { const v = Mx.str(m); if (el._m !== v){ el.setAttribute('transform', v); el._m = v; } };
  const show = (name, key) => { const vs = b.vs[name]; if (!vs) return; for (const [k, el] of Object.entries(vs)){ const on = k === key ? '' : 'none'; if (el._d !== on){ el.style.display = on; el._d = on; } } };
  const want = { wingL: F.wingL, wingR: F.wingR, eyeL: F.eyes === 'sleep' ? 'closed' : F.eyes, eyeR: F.eyes === 'sleep' ? 'closed' : F.eyes, browL: F.brows, browR: F.brows, beak: F.beak, crest: F.crest };
  for (const s of model.slots){
    const g = b.els[s.name]; if (!g) continue;
    let m = rigSlotM(W, s);
    if (s.eye){
      // blink and widen about the eye centre; glance by sliding the eye; sleep shows the closed eye upside down
      const e = s.eye, lid = (F.eyes === 'open' || F.eyes === 'worried') ? 1 - 0.92 * F.lid : 1;
      const r = S.eyeR || 20;
      m = Mx.mul(m, Mx.about(e[0], e[1], 0, F.eyeS, F.eyeS * lid * (F.eyes === 'sleep' ? -0.9 : 1), F.look[0] * r * 0.16, F.look[1] * r * 0.12));
    }
    if ((s.name === 'browL' || s.name === 'browR') && (F.browY || F.browUp)){
      const lift = (F.browY + (s.name === 'browR' ? -0.25 * F.browUp : 0)) * (S.eyeR || 20);
      m = Mx.mul(m, Mx.about(0, 0, 0, 1, 1, 0, lift));
    }
    setM(g, m);
    if (s.name in want){
      const key = want[s.name];
      if (key == null){ if (g._o !== '0'){ g.style.opacity = '0'; g._o = '0'; } }
      else { if (g._o !== '1'){ g.style.opacity = '1'; g._o = '1'; } show(s.name, rigPick(s, key)); }
    }
    if (s.feathers){
      // crest feathers fan out from their bases
      for (const fe of b.fe[s.name]){
        if (fe.v._d === 'none') continue;
        setM(fe.f, Mx.about(fe.px, fe.py, (fe.i - (fe.n - 1) / 2) * (F.fan - 1) * 18, 1, 1));
      }
    }
  }
  const op = (el, v) => { if (!el) return; const s = String(Math.round(v * 100) / 100); if (el._o !== s){ el.style.opacity = s; el._o = s; } };
  const sw = b.els.sweat;
  if (sw){ op(sw, F.sweat < 0 ? 0 : F.sweat < 0.12 ? F.sweat / 0.12 : 1 - Math.max(0, F.sweat - 0.7) / 0.3); if (F.sweat >= 0) setM(sw, Mx.mul(rigSlotM(W, model.slotBy.sweat), Mx.about(0, 0, 0, 1, 1, 0, F.sweat * S.headR * 0.35))); }
  const fx = b.els.fx;
  if (fx){
    const sp = fx.querySelector('.b-spark'), z = fx.querySelector('.b-z');
    op(sp, F.spark < 0 ? 0 : Math.sin(F.spark * Math.PI));
    op(z, F.z < 0 ? 0 : Math.sin(F.z * Math.PI));
    if (z && F.z >= 0) z.setAttribute('transform', 'translate(' + (F.z * S.headR * 0.15).toFixed(1) + ' ' + (-F.z * S.headR * 0.3).toFixed(1) + ')');
  }
  op(b.els.shadow, F.shadow);
}

/* ----- the shared clock: one requestAnimationFrame loop drives every bird on screen ----- */
const Rig = { live: new Set(), raf: 0 };
function rigNow(){ return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
function rigStart(b){ Rig.live.add(b); if (!Rig.raf && typeof requestAnimationFrame === 'function') Rig.raf = requestAnimationFrame(rigTick); }
function rigTick(ms){
  Rig.raf = 0;
  const now = ms / 1000;
  for (const b of Rig.live){
    if (!b.el.isConnected){ Rig.live.delete(b); continue; }
    if (b.driven) continue;   // the intro film drives its own bird with the film clock
    // skip birds that are off screen or not laid out (checked twice a second)
    if (b.vis == null || now - b.visAt > 0.5){ const r = b.el.getBoundingClientRect(); b.visAt = now; b.vis = r.width > 0 && r.bottom > -40 && r.top < (window.innerHeight || 800) + 40; }
    if (!b.vis) continue;
    rigApply(b, rigPose(b.model, b.state, now - b.t0));
  }
  if (Rig.live.size && !(typeof document !== 'undefined' && document.hidden)) Rig.raf = requestAnimationFrame(rigTick);
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && Rig.live.size && !Rig.raf) Rig.raf = requestAnimationFrame(rigTick); });
