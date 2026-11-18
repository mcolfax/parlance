"use strict";
/* ===================== RIG2 =====================
   The deforming bird runtime: plays media/birds/<bird>.json (format: design/rig/v2/FORMAT.md, made in Blender) and has
   the same API as Rig (rig.js), so a screen can use either.
   - bones are skinned: every drawing is a closed outline whose points follow up to three bones (linear blend skinning),
     so a wing bends and a body squashes instead of swinging rigidly. A closed Catmull-Rom spline through the points is
     filled; corner points stay sharp.
   - a mood is an action baked in Blender (its pose, face, turn and clip); a move is an additive action layered on top.
     Curves are Blender's own beziers. Moods blend over 0.32s as rig.js does.
   - procedural layers as in rig.js: idle breathing, blinks, glances, look-at (inside the eye's room), talking visemes,
     the live 2.5D turn (layered on the mood's baked turn), springs on the crest and tail, the level head.
   - live birds draw to a <canvas> (sharp at any size, recolored from the --<bird>-<role> tokens, dark mode included);
     Rig2.svg() gives a still as SVG markup for avatars and icons.
   Pure math is on Rig2._m, so it runs in Node without a canvas.
   ================================================ */
const Rig2 = (() => {
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const EASE = {
    linear: t => t,
    in: t => t * t,
    out: t => 1 - (1 - t) * (1 - t),
    inOut: t => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
    sine: t => 0.5 - Math.cos(Math.PI * t) / 2,
    back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    pop: t => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * 10)),
    step: t => (t < 1 ? 0 : 1)
  };
  const NS = 'http://www.w3.org/2000/svg';
  const f3 = v => (Math.abs(v) < 1e-4 ? '0' : String(Math.round(v * 1000) / 1000));
  const f2 = v => (Math.abs(v) < 5e-2 ? '0' : String(Math.round(v * 10) / 10));   // path data: a tenth of a unit is far below a pixel
  const RMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let RM = !!(RMQ && RMQ.matches);
  const reduced = () => RM;
  /* the head holds level against a turned screen (Rig.setHorizon feeds the same number): see rig.js */
  const HORIZON_MAX = 28;
  let horizon = 0;
  const CHN = ['x', 'y', 'r', 'sx', 'sy'];   // channels of a bone, 5 per bone in a channel array
  const MIRROR_MIN = 0.72;                   // a mirrored bone is never narrower than this mid-turn

  /* ----- 2D affine matrices, SVG order [a b c d e f], stored flat (6 numbers per matrix) ----- */
  function mulTo(o, oi, a, ai, b, bi) {
    const a0 = a[ai], a1 = a[ai + 1], a2 = a[ai + 2], a3 = a[ai + 3], a4 = a[ai + 4], a5 = a[ai + 5];
    const b0 = b[bi], b1 = b[bi + 1], b2 = b[bi + 2], b3 = b[bi + 3], b4 = b[bi + 4], b5 = b[bi + 5];
    o[oi] = a0 * b0 + a2 * b1; o[oi + 1] = a1 * b0 + a3 * b1; o[oi + 2] = a0 * b2 + a2 * b3; o[oi + 3] = a1 * b2 + a3 * b3;
    o[oi + 4] = a0 * b4 + a2 * b5 + a4; o[oi + 5] = a1 * b4 + a3 * b5 + a5;
  }
  const mul = (m, n) => { const o = new Array(6); mulTo(o, 0, m, 0, n, 0); return o; };
  function invert(m) {
    const det = m[0] * m[3] - m[1] * m[2], a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
    return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
  }
  const det = (a, i) => a[i] * a[i + 3] - a[i + 1] * a[i + 2];
  /* the pose channels as a matrix: translate(x, y) rotate(r) scale(sx, sy), r clockwise on screen (y points down) */
  function chanMat(o, oi, x, y, r, sx, sy) {
    const cs = Math.cos(r * DEG), sn = Math.sin(r * DEG);
    o[oi] = cs * sx; o[oi + 1] = sn * sx; o[oi + 2] = -sn * sy; o[oi + 3] = cs * sy; o[oi + 4] = x; o[oi + 5] = y;
  }

  /* ----- curves: Blender's bezier keys [t, v, tIn, vIn, tOut, vOut, hold?] ----- */
  function makeCurve(keys) {
    const n = keys.length, c = { n, t: new Float64Array(n), v: new Float64Array(n), ti: new Float64Array(n), vi: new Float64Array(n), to: new Float64Array(n), vo: new Float64Array(n), hold: new Uint8Array(n), h: 0 };
    keys.forEach((k, i) => { c.t[i] = k[0]; c.v[i] = k[1]; c.ti[i] = k[2] == null ? k[0] : k[2]; c.vi[i] = k[3] == null ? k[1] : k[3]; c.to[i] = k[4] == null ? k[0] : k[4]; c.vo[i] = k[5] == null ? k[1] : k[5]; c.hold[i] = k.length > 6 && k[6] ? 1 : 0; });
    return c;
  }
  /* the parameter s where the time bezier through a, b, c, d (its x values) reaches x: Newton's method, then bisection */
  function solveTime(a, b, c, d, x) {
    const X = s => { const u = 1 - s; return u * u * u * a + 3 * u * u * s * b + 3 * u * s * s * c + s * s * s * d; };
    let s = (x - a) / (d - a || 1);
    for (let i = 0; i < 6; i++) {
      const u = 1 - s, dx = 3 * (u * u * (b - a) + 2 * u * s * (c - b) + s * s * (d - c));
      if (Math.abs(dx) < 1e-9) break;
      s -= (X(s) - x) / dx;
    }
    if (s >= 0 && s <= 1 && Math.abs(X(s) - x) < 1e-6) return s;
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { s = (lo + hi) / 2; if (X(s) < x) lo = s; else hi = s; }
    return (lo + hi) / 2;
  }
  function curveAt(c, x) {
    const n = c.n, t = c.t;
    if (n === 1 || x <= t[0]) return c.v[0];
    if (x >= t[n - 1]) return c.v[n - 1];
    let i = c.h;
    if (i >= n - 1 || x < t[i]) i = 0;
    while (x >= t[i + 1]) i++;
    c.h = i;
    if (c.hold[i]) return c.v[i];
    const a = t[i], d = t[i + 1];
    if (d <= a) return c.v[i + 1];
    const s = solveTime(a, c.to[i], c.ti[i + 1], d, x), u = 1 - s;
    return u * u * u * c.v[i] + 3 * u * u * s * c.vo[i] + 3 * u * s * s * c.vi[i + 1] + s * s * s * c.v[i + 1];
  }
  /* the last index of a sorted time list at or before x (-1 if x is earlier than all) */
  function lastLE(ts, x) { let k = -1; for (let i = 0; i < ts.length && ts[i] <= x; i++) k = i; return k; }

  /* ----- drawings: spline outlines ----- */
  /* a closed Catmull-Rom spline through n points (xy flat from index st), as cubic beziers on a sink with the canvas
     Path2D methods (moveTo, bezierCurveTo, closePath). A corner point has a straight tangent either side, so a
     beak tip or a feather point stays sharp. */
  function trace(sink, xy, st, n, corner) {
    const e = st + n;
    let a = e - 1, b = st, c = st + 1, d = st + 2;   // the point before, this one, the next, the one after (wrapping round the loop)
    sink.moveTo(xy[2 * b], xy[2 * b + 1]);
    for (let k = 0; k < n; k++) {
      const x0 = xy[2 * a], y0 = xy[2 * a + 1], x1 = xy[2 * b], y1 = xy[2 * b + 1], x2 = xy[2 * c], y2 = xy[2 * c + 1], x3 = xy[2 * d], y3 = xy[2 * d + 1];
      const k1 = corner[b], k2 = corner[c];
      sink.bezierCurveTo(k1 ? x1 + (x2 - x1) / 3 : x1 + (x2 - x0) / 6, k1 ? y1 + (y2 - y1) / 3 : y1 + (y2 - y0) / 6, k2 ? x2 - (x2 - x1) / 3 : x2 - (x3 - x1) / 6, k2 ? y2 - (y2 - y1) / 3 : y2 - (y3 - y1) / 6, x2, y2);
      a = b; b = c; c = d; d = d + 1 === e ? st : d + 1;
    }
    sink.closePath();
  }
  /* an SVG path-data sink with the same three methods */
  function svgSink() {
    const s = { d: '', moveTo(x, y) { s.d += 'M' + f2(x) + ' ' + f2(y); }, bezierCurveTo(a, b, c, d, e, f) { s.d += 'C' + f2(a) + ' ' + f2(b) + ' ' + f2(c) + ' ' + f2(d) + ' ' + f2(e) + ' ' + f2(f); }, closePath() { s.d += 'Z'; } };
    return s;
  }
  /* a tapered ink line as a ribbon: each point of a loop is offset by +-w/2 along its averaged normal. A closed loop
     gives two closed loops (outer and inner, fill them even-odd); an open stroke gives one closed polygon. Returns
     [[xy...], ...] flat per loop. */
  function ribbon(xy, st, n, w, scale, closed) {
    const A = [], B = [];
    for (let i = 0; i < n; i++) {
      const p = closed ? (i + n - 1) % n : Math.max(i - 1, 0), q = closed ? (i + 1) % n : Math.min(i + 1, n - 1);
      let tx = xy[2 * (st + q)] - xy[2 * (st + p)], ty = xy[2 * (st + q) + 1] - xy[2 * (st + p) + 1];
      const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const h = (w[i] * scale) / 2, x = xy[2 * (st + i)], y = xy[2 * (st + i) + 1];
      A.push(x - ty * h, y + tx * h); B.push(x + ty * h, y - tx * h);
    }
    if (closed) return [A, B];
    const rev = []; for (let i = n - 1; i >= 0; i--) rev.push(B[2 * i], B[2 * i + 1]);
    return [A.concat(rev)];
  }
  /* A drawing with every `step`th point of each loop, and every corner: at a small size a point every 2.5 units is
     finer than a pixel, and each point is a call to the canvas. Built once per step and kept on the drawing. */
  function thinned(D, step) {
    if (step <= 1 || Object.keys(D.shapes).length) return D;
    const c = D.th || (D.th = {});
    if (c[step]) return c[step];
    const keep = [], loops = [];
    for (const lp of D.loops) {
      const st = lp[0], n = lp[1], pick = [];
      for (let j = 0; j < n; j++) if (D.corner[st + j] || j % step === 0) pick.push(st + j);
      if (pick.length < 6) { pick.length = 0; for (let j = 0; j < n; j++) pick.push(st + j); }
      loops.push([keep.length, pick.length]); for (const q of pick) keep.push(q);
    }
    const n = keep.length, T = { key: D.key, n, pts: new Float64Array(2 * n), sb: new Uint8Array(3 * n), sw: new Float32Array(3 * n), corner: new Uint8Array(n), loops, shapes: D.shapes, rigid: D.rigid, p2d: null, th: null };
    keep.forEach((q, j) => { T.pts[2 * j] = D.pts[2 * q]; T.pts[2 * j + 1] = D.pts[2 * q + 1]; T.corner[j] = D.corner[q]; for (let k = 0; k < 3; k++) { T.sb[3 * j + k] = D.sb[3 * q + k]; T.sw[3 * j + k] = D.sw[3 * q + k]; } });
    T.layers = D.layers.map(La => {
      if (!La.ribbon) return La;
      const lp = D.loops[La.loops[0]], tl = loops[La.loops[0]], w = new Float64Array(tl[1]);
      for (let j = 0; j < tl[1]; j++) w[j] = La.ribbon[keep[tl[0] + j] - lp[0]];
      return Object.assign({}, La, { ribbon: w });
    });
    return (c[step] = T);
  }
  /* linear blend skinning of a drawing's points into out (flat xy). K holds one skinning matrix per bone (6 numbers).
     shape deltas (sparse [index, dx, dy] triples, with a weight each) are added to the rest points first. */
  function skinInto(D, K, out, shapes) {
    const n = D.n, pts = D.pts, sb = D.sb, sw = D.sw;
    let sx = null;
    if (shapes && shapes.length) {
      sx = new Float64Array(pts.length); sx.set(pts);
      for (const sh of shapes) { const dl = sh.d, w = sh.w; for (let k = 0; k < dl.length; k += 3) { sx[2 * dl[k]] += dl[k + 1] * w; sx[2 * dl[k] + 1] += dl[k + 2] * w; } }
    }
    const P = sx || pts;
    for (let j = 0; j < n; j++) {
      const x = P[2 * j], y = P[2 * j + 1];
      let ox = 0, oy = 0;
      for (let k = 0; k < 3; k++) {
        const w = sw[3 * j + k]; if (w === 0) continue;
        const o = 6 * sb[3 * j + k];
        ox += w * (K[o] * x + K[o + 2] * y + K[o + 4]); oy += w * (K[o + 1] * x + K[o + 3] * y + K[o + 5]);
      }
      out[2 * j] = ox; out[2 * j + 1] = oy;
    }
    return out;
  }

  /* ----- compile the file once: typed arrays, curves, indexes ----- */
  function prep(raw) {
    if (!raw || raw.format !== 'parlance-rig2') throw new Error('Rig2: not a parlance-rig2 file');
    const proc = raw.procedural || {};
    const nb = raw.bones.length, byId = {}, ids = [];
    const parent = new Int16Array(nb), rel = new Float64Array(6 * nb), inv = new Float64Array(6 * nb), B = new Float64Array(6 * nb);
    const T = proc.turn || { head: 35, body: 0.6 };
    const bones = raw.bones.map((b, i) => {
      if (byId[b.id] != null) throw new Error('Rig2: duplicate bone ' + b.id);
      byId[b.id] = i; ids.push(b.id);
      let p = -1;
      if (b.parent) { p = byId[b.parent]; if (p == null) throw new Error('Rig2: bone ' + b.id + ' is listed before its parent ' + b.parent); }
      parent[i] = p;
      const r = (b.rot || 0) * DEG, cs = Math.cos(r), sn = Math.sin(r);
      const Bm = [cs, sn, -sn, cs, b.x, b.y], Bi = invert(Bm);
      B.set(Bm, 6 * i); inv.set(Bi, 6 * i);
      rel.set(p < 0 ? Bm : mul(inv.subarray(6 * p, 6 * p + 6), Bm), 6 * i);
      let turn = b.turn || null;
      /* a feature's angle on the head's sphere comes from where it is drawn, unless the bone names one (as in rig.js) */
      if (turn && turn.R && turn.phi == null) turn = Object.assign({}, turn, { phi: Math.asin(clamp((b.x - (T.cx || 120)) / turn.R, -1, 1)) / DEG });
      return { id: b.id, i, p, x: b.x, y: b.y, turn };
    });
    const roleIdx = {}; (raw.roles || []).forEach((r, i) => { roleIdx[r] = i; });
    const slotIdx = {};
    const slots = raw.slots.map((s, i) => {
      if (byId[s.bone] == null) throw new Error('Rig2: slot ' + s.id + ' hangs on a missing bone ' + s.bone);
      slotIdx[s.id] = i;
      return { id: s.id, i, bone: byId[s.bone], rest: s.rest == null ? null : s.rest, drawings: s.drawings || [], blink: s.blink || null, showWith: s.showWith || null, D: {} };
    });
    for (const sl of slots) if (sl.showWith) {
      const ref = slotIdx[sl.showWith.slot];
      if (ref == null) throw new Error('Rig2: slot ' + sl.id + ' shows with a missing slot ' + sl.showWith.slot);
      sl.showWith = { ref, drawings: sl.showWith.drawings };
    }
    const drawings = {};
    for (const key in raw.drawings) {
      const d = raw.drawings[key], n = d.pts.length / 2;
      const D = { key, n, pts: Float64Array.from(d.pts), sb: new Uint8Array(3 * n), sw: new Float32Array(3 * n), loops: [], layers: [], shapes: {}, corner: new Uint8Array(n), rigid: -1, p2d: null };
      for (let j = 0; j < n; j++) {
        const sk = d.skin[j] || [0, 1];
        for (let k = 0; k < 3; k++) {
          if (2 * k + 1 < sk.length) { D.sb[3 * j + k] = sk[2 * k]; D.sw[3 * j + k] = sk[2 * k + 1]; } else { D.sb[3 * j + k] = sk[0]; D.sw[3 * j + k] = 0; }
        }
      }
      let rigid = n ? D.sb[0] : -1;
      for (let j = 0; j < n && rigid >= 0; j++) if (D.sw[3 * j] < 0.9999 || D.sb[3 * j] !== rigid) rigid = -1;
      D.rigid = rigid;
      for (const lp of d.loops) {
        D.loops.push([lp[0], lp[1]]);
        const st = lp[0], m = lp[1];
        for (let k = 0; k < m; k++) {   // a corner: the outline turns by more than 35 degrees there
          const a = st + ((k + m - 1) % m), b = st + k, c = st + ((k + 1) % m);
          const ux = D.pts[2 * b] - D.pts[2 * a], uy = D.pts[2 * b + 1] - D.pts[2 * a + 1], vx = D.pts[2 * c] - D.pts[2 * b], vy = D.pts[2 * c + 1] - D.pts[2 * b + 1];
          const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
          if (lu > 1e-6 && lv > 1e-6 && Math.acos(clamp((ux * vx + uy * vy) / (lu * lv), -1, 1)) > 35 * DEG) D.corner[b] = 1;
        }
      }
      /* the shadow's token (--pip-shadow) already carries its alpha, and the exporter also wrote the palette's alpha as the
         layer's `a`: applying both would make the shadow vanish, so a shadow layer is drawn at the token's own alpha */
      const alpha = (L, role) => (role === 'shadow' || L.a == null ? 1 : L.a);
      for (const L of d.layers) {
        if (L.ink != null && L.w) D.layers.push({ role: roleIdx[L.ink], a: alpha(L, L.ink), loops: [L.loop || 0], ribbon: Float64Array.from(L.w), ink: true });
        else D.layers.push({ role: roleIdx[L.fill], a: alpha(L, L.fill), loops: L.loops.slice(), ribbon: null, ink: L.fill === 'ink' });
      }
      for (const nm in d.shapes || {}) D.shapes[nm] = Float64Array.from([].concat(...d.shapes[nm]));   // sparse [index, dx, dy] triples
      if (Object.keys(D.shapes).length) D.rigid = -1;
      drawings[key] = D;
    }
    for (const sl of slots) for (const nm of sl.drawings) sl.D[nm] = drawings[sl.id + '/' + nm] || null;

    const NCH = 5 * nb + 2, rest = new Float64Array(NCH);   // ... then the two mirror controls (facing, head)
    for (let i = 0; i < nb; i++) { rest[5 * i + 3] = 1; rest[5 * i + 4] = 1; }
    const Mi = proc.mirror || {};
    const target = (bone, ch) => {
      if (bone.startsWith('ctl_')) { const id = bone.slice(4); return id === Mi.facing ? 5 * nb : id === Mi.head ? 5 * nb + 1 : -1; }
      const b = byId[bone]; return b == null || CHN.indexOf(ch) < 0 ? -1 : 5 * b + CHN.indexOf(ch);
    };
    const actions = {};
    for (const name in raw.actions) {
      const a = raw.actions[name];
      const A = { name, dur: a.dur || 1, loop: !!a.loop, add: !!a.add, blink: a.blink !== false, glance: a.glance !== false, params: a.params || {}, idle: a.idle || null, curves: [], sw: [], ord: [], shapes: [], fx: [] };
      for (const key in a.curves) {
        const dot = key.lastIndexOf('.'), tg = target(key.slice(0, dot), key.slice(dot + 1));
        if (tg < 0) continue;
        A.curves.push(Object.assign(makeCurve(a.curves[key]), { tg, k: tg >= 5 * nb ? 0 : tg % 5, ctl: tg >= 5 * nb }));
      }
      const by = {};
      for (const s of a.swaps || []) { const i = slotIdx[s[1]]; if (i == null) continue; (by[i] = by[i] || { i, t: [], v: [] }); by[i].t.push(s[0]); by[i].v.push(s[2]); }
      A.sw = Object.values(by);
      const oz = {};
      for (const s of a.order || []) { const i = slotIdx[s[1]]; if (i == null) continue; (oz[i] = oz[i] || { i, t: [], v: [] }); oz[i].t.push(s[0]); oz[i].v.push(s[2]); }
      A.ord = Object.values(oz);
      for (const key in a.shapes || {}) { const c = key.lastIndexOf(':'); A.shapes.push({ key: key.slice(0, c), name: key.slice(c + 1), c: makeCurve(a.shapes[key]) }); }
      A.fx = (a.fx || []).map(e => ({ t: e[0], name: e[1], x: e[2] || 0, y: e[3] || 0 }));
      A.fxT = null;
      actions[name] = A;
    }
    const fx = {};
    for (const nm in raw.fx || {}) fx[nm] = { fps: raw.fx[nm].fps || 24, frames: raw.fx[nm].frames.map(k => drawings[k]).filter(Boolean) };
    const springs = Object.keys(proc.springs || {}).map(id => {
      if (byId[id] == null) throw new Error('Rig2: spring on a missing bone ' + id);
      const s = proc.springs[id], n = Math.hypot(s.dir[0], s.dir[1]) || 1;
      return { id, bone: byId[id], len: s.len, dx: s.dir[0] / n, dy: s.dir[1] / n, k: s.k || 160, d: s.d || 12, limit: s.limit || 30, squash: s.squash || 0, g: s.g || 0 };
    });
    const swaps = (proc.swaps || []).map(w => ({ slot: slotIdx[w.slot], bone: byId[w.bone], from: w.from, to: w.to, deg: w.deg || 15 })).filter(w => w.slot != null && w.bone != null);
    const upright = new Uint8Array(nb); for (const id of Mi.upright || []) if (byId[id] != null) upright[byId[id]] = 1;
    const def = {
      id: raw.id, name: raw.name, fps: raw.fps || 30, view: raw.view || [0, 0, 240, 260], lines: raw.lines || {}, roles: raw.roles || [], roleIdx,
      nb, ids, byId, bones, parent, rel, inv, B, slots, slotIdx, drawings, actions, fx, NCH, rest, proc, springs, swaps, upright,
      chain: raw.bones.map((b, i) => (b.len != null ? i : -1)).filter(i => i >= 0),
      mirrorF: Mi.facing != null ? byId[Mi.facing] : null, mirrorH: Mi.head != null ? byId[Mi.head] : null,
      look: proc.look || {}, turn: T, idle: proc.idle || {}, mouth: proc.mouth || null, visemes: proc.visemes || {}, restMood: proc.restMood || 'happy',
      restParams: proc.rest || {}, hopClip: proc.hopClip || 'hop', hasShapes: Object.values(actions).some(a => a.shapes.length)
    };
    return def;
  }

  /* ----- evaluate: actions to channels, slots, order, params ----- */
  const PNAMES = ['turn', 'lookX', 'lookY'];
  /* a pose state: channel array, drawing per slot, draw order per slot, params */
  const newPS = def => ({ ch: new Float64Array(def.NCH), S: new Array(def.slots.length).fill(null), z: new Float64Array(def.slots.length), P: new Float64Array(3) });
  /* a mood action at its time lt, absolute: everything it doesn't key is at rest */
  function evalMood(def, A, lt, ps) {
    const ch = ps.ch, S = ps.S, z = ps.z;
    ch.set(def.rest);
    for (const c of A.curves) ch[c.tg] = curveAt(c, lt);
    for (let i = 0; i < S.length; i++) { S[i] = def.slots[i].rest; z[i] = i; }
    for (const s of A.sw) { const k = lastLE(s.t, lt); if (k >= 0) S[s.i] = s.v[k]; }
    for (const s of A.ord) { const k = lastLE(s.t, lt); if (k >= 0) z[s.i] = s.v[k]; }
    const R = def.restParams;
    ps.P[0] = A.params.turn != null ? A.params.turn : R.turn != null ? R.turn : 0;
    ps.P[1] = A.params.lookX != null ? A.params.lookX : R.lookX || 0;
    ps.P[2] = A.params.lookY != null ? A.params.lookY : R.lookY || 0;
  }
  /* a move at its time lt, layered on: x, y, r add; sx, sy multiply; its drawings and draw order replace while it plays */
  function addMove(def, A, lt, w, ps, slots) {
    const ch = ps.ch;
    for (const c of A.curves) {
      if (w <= 0) break;
      const v = curveAt(c, lt);
      if (!c.ctl && (c.k === 3 || c.k === 4)) ch[c.tg] *= 1 + (v - 1) * w; else ch[c.tg] += v * w;
    }
    if (slots) {
      for (const s of A.sw) { const k = lastLE(s.t, lt); if (k >= 0) ps.S[s.i] = s.v[k]; }
      for (const s of A.ord) { const k = lastLE(s.t, lt); if (k >= 0) ps.z[s.i] = s.v[k]; }
    }
  }
  /* drawings chosen by a bone's angle (the far wing opens once it swings away); `on` keeps a live rig from flickering */
  function swapByAngle(def, ch, S, on) {
    def.swaps.forEach((w, k) => {
      if (S[w.slot] !== w.from && S[w.slot] !== w.to) return;
      const sw = Math.abs(ch[5 * w.bone + 2]) >= (on && on[k] ? w.deg - 3 : w.deg);
      if (on) on[k] = sw;
      S[w.slot] = sw ? w.to : w.from;
    });
  }
  /* slots that show only with certain drawings of another slot (an eye's white goes with the open eyes) */
  function follow(def, S) {
    for (const sl of def.slots) if (sl.showWith) S[sl.i] = sl.showWith.drawings.includes(S[sl.showWith.ref]) ? sl.rest : null;
  }
  /* the mirror controls (0 not mirrored, -2 mirrored) as the X scale of the facing and head bones, as Blender's drivers do:
     the sign of the control, never narrower than 0.72. It replaces the bone's own scale. */
  const mirrorScale = v => (v > -1 ? 1 : -1) * Math.max(Math.abs(1 + v), MIRROR_MIN);
  function mirrors(def, ch) {
    if (def.mirrorF != null) ch[5 * def.mirrorF + 3] = mirrorScale(ch[5 * def.nb]);
    if (def.mirrorH != null) ch[5 * def.mirrorH + 3] = mirrorScale(ch[5 * def.nb + 1]);
  }

  /* the 2.5D turn: how far each bone with a `turn` descriptor moves for a turn value, as rig.js's drivers() computes it.
     out holds [x, r, sx, sy] per bone. */
  function turnDrive(def, turn, out) {
    const T = def.turn, Mi = def.proc.mirror || {}, lim = (v, a, b) => clamp(v, a == null ? -9 : a, b == null ? 9 : b);
    const H = turn < 0 && Mi.head ? -1 : 1, kb = T.body == null ? 0.6 : T.body, s0 = T.setup || 0;
    const th = (lim(turn * H, T.max == null ? null : -T.max, T.max) - s0) * T.head;
    const thb = (lim(turn * kb, T.bodyMin, T.bodyMax) - s0 * kb) * T.head;
    out.fill(0); for (let i = 0; i < def.nb; i++) { out[4 * i + 2] = 1; out[4 * i + 3] = 1; }
    for (const b of def.bones) {
      const s = b.turn; if (!s) continue;
      const o = 4 * b.i, t = s.body ? thb : th, abs = t + (s.body ? s0 * kb : s0) * T.head;
      if (s.R) { const phi = s.phi || 0; out[o] += s.R * (Math.sin((phi + t) * DEG) - Math.sin(phi * DEG)); if (s.squash) out[o + 2] *= clamp(Math.cos((phi + t) * DEG) / Math.cos(phi * DEG), 0.35, 1.35); }
      if (s.near) { const k = 1 + s.near * (t / T.head); out[o + 2] *= k; out[o + 3] *= k; }
      if (s.wx) out[o + 2] *= clamp(1 + s.wx * (t / T.head), 0.4, 1.6);
      if (s.flip) { const k = clamp(abs / s.flip, -1, 1); out[o + 2] *= Math.abs(k) < 0.04 ? 0.04 * Math.sign(k || 1) : k; }
      if (s.dx) out[o] += s.dx * (t / T.head);
      if (s.rot) out[o + 1] += s.rot * (t / T.head);
    }
    return out;
  }
  /* a live turn on top of a mood's baked one: the bones move by the difference between the two turns */
  function turnDelta(def, turn0, turn1, ch, scratch) {
    const a = turnDrive(def, turn0, scratch[0]), b = turnDrive(def, turn1, scratch[1]);
    for (const bo of def.bones) {
      if (!bo.turn) continue;
      const o = 4 * bo.i, c = 5 * bo.i;
      ch[c] += b[o] - a[o]; ch[c + 2] += b[o + 1] - a[o + 1];
      ch[c + 3] *= b[o + 2] / (a[o + 2] || 1); ch[c + 4] *= b[o + 3] / (a[o + 3] || 1);
    }
  }
  /* an offset kept inside a quarter-ellipse per quadrant: room = [right, left, down, up] (as rig.js inRoom) */
  function inRoom(dx, dy, room) {
    dx = clamp(dx, -room[1], room[0]); dy = clamp(dy, -room[3], room[2]);
    const ax = Math.max(dx >= 0 ? room[0] : room[1], 1e-3), ay = Math.max(dy >= 0 ? room[2] : room[3], 1e-3);
    const q = (dx / ax) * (dx / ax) + (dy / ay) * (dy / ay);
    return q > 1 ? [dx / Math.sqrt(q), dy / Math.sqrt(q)] : [dx, dy];
  }

  /* ----- world matrices: parents first, springs on the way ----- */
  /* M (world matrix per bone) and K = M * inverse bind (the skinning matrix) from channels. springs: live spring states
     (or null). M_i = M_parent * rel_i * C_i with C the pose channels; see FORMAT.md. */
  function world(def, ch, M, K, springs, dt, live) {
    const nb = def.nb, rel = def.rel, inv = def.inv, parent = def.parent, tmp = world.tmp || (world.tmp = new Float64Array(12));
    const sp = live ? springs : null;   // springs: the live spring states by bone index (or null)
    for (let i = 0; i < nb; i++) {
      const p = parent[i], c = 5 * i;
      let sx = ch[c + 3];
      /* effects that would read backwards (a question mark, notes) stay the right way round under a mirror */
      if (def.upright[i] && p >= 0 && det(M, 6 * p) < 0) sx = -sx;
      chanMat(tmp, 0, ch[c], ch[c + 1], ch[c + 2], sx, ch[c + 4]);
      mulTo(tmp, 6, rel, 6 * i, tmp, 0);
      if (p < 0) { for (let k = 0; k < 6; k++) M[6 * i + k] = tmp[6 + k]; } else mulTo(M, 6 * i, M, 6 * p, tmp, 6);
      if (sp) {
        const s = sp[i];
        if (s) {
          const o = 6 * i, Px = M[o + 4], Py = M[o + 5], Tx = M[o] * s.dx * s.len + M[o + 2] * s.dy * s.len + Px, Ty = M[o + 1] * s.dx * s.len + M[o + 3] * s.dy * s.len + Py;
          const restLen = Math.hypot(Tx - Px, Ty - Py);
          if (restLen > 0.5) {
            if (!s.q || dt > 0.09) { s.q = [Tx, Ty]; s.v = [0, 0]; }
            let rem = dt;
            while (rem > 1e-5) {
              const h = Math.min(rem, 1 / 120); rem -= h;
              const ax = s.k * (Tx - s.q[0]) - s.d * s.v[0], ay = s.k * (Ty - s.q[1]) - s.d * s.v[1] + s.g;
              s.v[0] += ax * h; s.v[1] += ay * h; s.q[0] += s.v[0] * h; s.q[1] += s.v[1] * h;
            }
            let da = (Math.atan2(s.q[1] - Py, s.q[0] - Px) - Math.atan2(Ty - Py, Tx - Px)) / DEG;
            da = ((da + 540) % 360) - 180;
            if (p >= 0 && det(M, 6 * p) < 0) da = -da;   // a mirrored parent turns local rotation around
            s.angle = clamp(da, -s.limit, s.limit);
            s.stretch = s.squash ? clamp(1 + (Math.hypot(s.q[0] - Px, s.q[1] - Py) / restLen - 1) * s.squash, 0.8, 1.25) : 1;
            chanMat(tmp, 0, ch[c], ch[c + 1], ch[c + 2] + s.angle, sx, ch[c + 4] * s.stretch);
            mulTo(tmp, 6, rel, 6 * i, tmp, 0);
            if (p < 0) { for (let k = 0; k < 6; k++) M[6 * i + k] = tmp[6 + k]; } else mulTo(M, 6 * i, M, 6 * p, tmp, 6);
          }
        }
      }
      mulTo(K, 6 * i, M, 6 * i, inv, 6 * i);
    }
  }

  /* ----- stills ----- */
  function lineWidth(def, px, view) {
    const L = def.lines || {}, vb = view || def.view;
    if (!px) return L.base || 2;
    return clamp((L.px || 1.35) / (px / vb[2]), L.min || 1.7, L.max || 3.8);
  }
  /* The frame a still of the action shows: where a mood ends (its clip is over, only the pose is left); a loop has no
     end, so it is where it starts. The effects (the zzz, the hearts: the `upright` bones) fade in and out inside a loop,
     so they show at the frame where they sit closest to their own rest (restFx). */
  const restTime = A => (A.loop ? 0 : A.dur);
  function restFx(def, A) {
    if (A.fxT != null) return A.fxT;
    const cs = A.curves.filter(c => !c.ctl && def.upright[(c.tg / 5) | 0] && c.n > 1);
    let best = 0, bd = 1e18;
    if (cs.length) for (let k = 0; k < 48; k++) {
      let d = 0; for (const c of cs) { const v = curveAt(c, A.dur * k / 48), r = c.k > 2 ? 1 : 0; d += ((v - r) / (c.k > 2 ? 1 : 20)) ** 2; }
      if (d < bd) { bd = d; best = k; }
    }
    return (A.fxT = A.dur * best / 48);
  }
  function fxRest(def, A, ch) { const ft = restFx(def, A); for (const c of A.curves) if (!c.ctl && def.upright[(c.tg / 5) | 0]) ch[c.tg] = curveAt(c, ft); }
  /* bend scales how much the bending chains (wing feathers, the tail...) curl in the baked poses: 1 plays the data, 0 keeps
     them straight, as the old rig's rigid wings were */
  function bendBy(def, ch, k) { if (k !== 1) for (const i of def.chain) ch[5 * i + 2] *= k; }
  /* the pose a still shows: the mood at its rest frame (or opts.t), no live layers. Returns what svg() draws. */
  function stillFrame(def, mood, t, opts = {}) {
    const A = def.actions['mood:' + mood] || def.actions['mood:' + def.restMood] || Object.values(def.actions).find(a => !a.add);
    if (!A) throw new Error('Rig2: no mood ' + mood);
    const ps = newPS(def), M = new Float64Array(6 * def.nb), K = new Float64Array(6 * def.nb);
    evalMood(def, A, t == null ? restTime(A) : t, ps);
    if (t == null && A.loop) fxRest(def, A, ps.ch);
    bendBy(def, ps.ch, opts.bend == null ? 1 : opts.bend);
    swapByAngle(def, ps.ch, ps.S, null);
    follow(def, ps.S);
    mirrors(def, ps.ch);
    world(def, ps.ch, M, K, null, 0, false);
    return { ps, M, K, A };
  }
  const drawOrder = (n, z) => { const o = []; for (let i = 0; i < n; i++) o.push(i); return o.sort((a, b) => z[a] - z[b] || a - b); };
  function css(def) {
    const id = def.id;
    let s = '.rig-' + id + '{overflow:visible}';
    for (const r of def.roles) s += '.rig-' + id + ' .k-' + r + '{fill:var(--' + id + '-' + r + ')}';
    return s;
  }
  /* Rig2.svg(def, mood, {size, view, cls, style, t, debug, detail}) -> SVG markup (detail 2 thins the outline points to half, the default up to 130 px): the mood's rest frame as filled paths with
     class k-<role> (the bird's --<id>-<role> tokens color them, as for Rig.svg). Ink layers carry the weight an outline
     gets at this size. */
  function svg(def, mood, opts = {}) {
    const { ps, K, M } = stillFrame(def, mood, opts.t, opts), vb = opts.view || def.view;
    const lw = lineWidth(def, opts.size, vb), L = def.lines || {}, extra = Math.max(0, lw - (L.min || 1.7));
    let s = '<svg xmlns="' + NS + '" class="rig rig-' + def.id + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + vb.join(' ') + '" style="--rig-lw:' + f3(lw) + '"' + (opts.size ? ' width="' + opts.size + '" height="' + Math.round(opts.size * vb[3] / vb[2]) + '"' : '') + ' aria-hidden="true">';
    if (opts.style !== false) s += '<style>' + css(def) + '</style>';
    const step = opts.detail || (opts.size && opts.size <= 130 ? 2 : 1);
    let buf = new Float64Array(0);
    for (const i of drawOrder(def.slots.length, ps.z)) {
      const sl = def.slots[i], nm = ps.S[i], D0 = nm == null ? null : sl.D[nm];
      if (!D0 || !D0.layers.length) continue;
      const D = thinned(D0, step);
      if (buf.length < 2 * D.n) buf = new Float64Array(2 * D.n);
      skinInto(D, K, buf, null);
      s += '<g data-s="' + sl.id + '">';
      for (const La of D.layers) {
        const sink = svgSink();
        if (La.ribbon) { const rb = ribbon(buf, D.loops[La.loops[0]][0], D.loops[La.loops[0]][1], La.ribbon, lw / (L.min || 1.7), true); for (const lp of rb) trace(sink, lp, 0, lp.length / 2, new Uint8Array(lp.length / 2)); }
        else for (const li of La.loops) trace(sink, buf, D.loops[li][0], D.loops[li][1], D.corner);
        const role = def.roles[La.role];
        s += '<path class="k-' + role + '" fill-rule="evenodd" d="' + sink.d + '"' + (La.a < 0.999 ? ' opacity="' + f3(La.a) + '"' : '') + (La.ink && extra > 0.02 ? ' style="stroke:var(--' + def.id + '-' + role + ');stroke-width:' + f3(extra) + 'px;stroke-linejoin:round"' : '') + '/>';
      }
      s += '</g>';
    }
    if (opts.debug) s += '<g class="rig-bones" style="pointer-events:none">' + def.bones.map(b => { const o = 6 * b.i; let r = '<circle cx="' + f3(M[o + 4]) + '" cy="' + f3(M[o + 5]) + '" r="2.6" fill="#fff" stroke="#E8412C" stroke-width="1.4"/>'; if (b.p >= 0) r = '<path d="M' + f3(M[6 * b.p + 4]) + ' ' + f3(M[6 * b.p + 5]) + 'L' + f3(M[o + 4]) + ' ' + f3(M[o + 5]) + '" stroke="#E8412C" stroke-width="1.2" stroke-dasharray="3 2" opacity=".8"/>' + r; return r; }).join('') + '</g>';
    return s + '</svg>';
  }

  /* ----- viseme script from text (as rig.js): vowels open the beak, m/b/p close it ----- */
  function visemes(def, text, rate) {
    const V = def.visemes || {}, out = [], per = 1 / (13 * (rate || 1));
    let t = 0, prev = null;
    for (const ch of String(text).toLowerCase()) {
      let v;
      if ('aáàâä'.includes(ch)) v = V.a; else if ('eéèêiíïy'.includes(ch)) v = V.e; else if ('oóòôöuúùûü'.includes(ch)) v = V.o;
      else if ('mbp'.includes(ch)) v = V.m; else if ('fvw'.includes(ch)) v = V.f; else if (/[\s]/.test(ch)) v = V.rest; else if (/[.,!?¡¿;:…]/.test(ch)) { out.push([t, V.rest]); t += per * 3; prev = V.rest; continue; } else v = V.c || V.e;
      if (v !== prev) out.push([t, v]);
      prev = v; t += per;
    }
    out.push([t, V.rest]);
    return { keys: out, dur: t + 0.05 };
  }
  /* a step track of [time, value] */
  function stepTrack(keys, t) { let v = keys[0][1]; for (const k of keys) { if (k[0] <= t) v = k[1]; else break; } return v; }

  /* ----- live instances ----- */
  const live = new Set(), made = new Set(), defs = {}, loading = {};
  let raf = 0, lastT = 0, swept = 0, held = false;
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  function tick(now) {
    raf = 0;
    if (held || hidden()) { lastT = 0; return; }   // Rig2.hold: every live bird waits; a hidden page waits too
    const t = now / 1000, dt = lastT ? Math.min(t - lastT, 0.1) : 1 / 60;
    lastT = t;
    for (const r of live) r._frame(t, dt);
    if (t - swept > 4) { swept = t; sweep(); }
    if (live.size) raf = requestAnimationFrame(tick); else lastT = 0;
  }
  /* an instance whose element left the page lets go of its observer; it picks up again if its element comes back */
  function sweep() {
    for (const r of made) if (!r.el.isConnected) { made.delete(r); live.delete(r); if (io) io.unobserve(r.el); r._gone = true; }
  }
  const wake = () => { if (!held && !raf && live.size && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick); };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { for (const e of es) { const r = e.target._rig2; if (r) { r._visible = e.isIntersecting; r._sync(); } } }) : null;
  /* colors are read from the element's custom properties; a change of theme (system or <html data-theme>) rereads them */
  const recolor = () => { for (const r of made) { r._dirty = true; r._sync(); if (!live.has(r) && r.el.isConnected) r.render(0); } };
  if (RMQ && RMQ.addEventListener) RMQ.addEventListener('change', e => { RM = e.matches; for (const r of made) r._sync(); });
  if (typeof matchMedia === 'function') { const dq = matchMedia('(prefers-color-scheme: dark)'); if (dq.addEventListener) dq.addEventListener('change', recolor); }
  if (typeof MutationObserver === 'function' && typeof document !== 'undefined') new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  if (typeof addEventListener === 'function') addEventListener('resize', () => { for (const r of made) { r._sized = true; if (r.el.isConnected && !live.has(r)) r.render(0); } });   // the pixel ratio changes with page zoom
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (hidden()) { if (raf) cancelAnimationFrame(raf); raf = 0; lastT = 0; } else wake(); });

  function create(def, opts = {}) {
    if (!def || !def.drawings) throw new Error('Rig2.create: pass the data from Rig2.load()');
    const vb = opts.view || def.view, nb = def.nb, ns = def.slots.length, L = def.look, lines = def.lines;
    sweep();
    const el = document.createElement('span');
    el.className = 'rig2 rig2-' + def.id + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    /* the canvas reaches past the bird's box (a hop, a spread wing, the zzz), as an SVG with visible overflow does. The sides
       stay inside a screen's usual 16px gutter (a canvas, unlike an SVG's overflow, would make the page scroll sideways). */
    const BL = Array.isArray(opts.bleed) ? opts.bleed : [0.12, 0.45, 0.08];
    canvas.style.cssText = 'position:absolute;pointer-events:none;display:block;left:' + -BL[0] * 100 + '%;top:' + -BL[1] * 100 + '%;width:' + (1 + 2 * BL[0]) * 100 + '%;height:' + (1 + BL[1] + BL[2]) * 100 + '%';
    /* the box keeps the view's proportions whatever its container does to its width (as an SVG's viewBox does) */
    el.style.cssText = 'position:relative;display:inline-block;flex:none;line-height:0;aspect-ratio:' + vb[2] + '/' + vb[3] + ';' + (opts.size ? 'width:' + opts.size + 'px;max-width:100%' : 'width:100%');
    el.append(canvas);
    const ctx = canvas.getContext('2d');
    const R = { el, canvas, def, bend: opts.bend == null ? 1 : opts.bend, _visible: true, _running: opts.autoplay !== false, time: 0, mood: null, debug: !!opts.debug, speed: opts.speed || 1, override: { bones: {}, params: {}, slots: {} }, onEvent: null, draws: 0 };
    let cssW = opts.size || 0, step = 1, scale = 1, inkExtra = 0, colors = null, last = null, blendingNow = false;
    const lastS = new Array(ns).fill(null), lastZ = new Float64Array(ns), psSnap = newPS(def);
    R._dirty = true; R._sized = true;

    /* state */
    const psFrom = newPS(def), ps = newPS(def), M = new Float64Array(6 * nb), K = new Float64Array(6 * nb), lastK = new Float64Array(6 * nb);
    const scratch = [new Float64Array(4 * nb), new Float64Array(4 * nb)], tm = new Float64Array(6), T0 = new Float64Array(6);
    const springs = new Array(nb).fill(null); for (const s of def.springs) springs[s.bone] = Object.assign({}, s);
    const swapOn = def.swaps.map(() => false);
    const stateOf = (act, frozen) => ({ act, t0: R.time, frozen, snap: null, prev: -1 });
    let to = null, from = null, b0 = 0, bdur = 0, bease = EASE.back, switchAt = 0.28;
    let moves = [], fxs = [], blinkAt = 1.5 + Math.random() * 2, blinkT = -1, glanceAt = 2.5 + Math.random() * 3, glance = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    const idlePhase = opts.phase != null ? opts.phase : Math.random() * 20;   // birds side by side don't breathe in step (phase: 0 for the same as rig.js)
    let hz = 0, talk = null, babble = false, babbleNext = 0, babbleV = null, lookTarget = null;
    const localT = (m, t) => {
      if (m.frozen != null || reduced()) return m.frozen != null ? m.frozen : restTime(m.act);
      const x = Math.max(0, t - m.t0);
      return m.act.loop ? x % m.act.dur : Math.min(x, m.act.dur);
    };
    const evalState = (m, t, out) => {
      if (m.snap) { out.ch.set(m.snap.ch); for (let i = 0; i < ns; i++) { out.S[i] = m.snap.S[i]; out.z[i] = m.snap.z[i]; } out.P.set(m.snap.P); } else { evalMood(def, m.act, localT(m, t), out); if (m.frozen != null && m.act.loop) fxRest(def, m.act, out.ch); bendBy(def, out.ch, R.bend); }
    };
    const copyPS = (src, dst) => { dst.ch.set(src.ch); for (let i = 0; i < ns; i++) { dst.S[i] = src.S[i]; dst.z[i] = src.z[i]; } dst.P.set(src.P); };

    /* sizing: the canvas is backed at the device's pixel ratio (3 at most) */
    function resize() {
      const w = el.offsetWidth || (el.isConnected ? 0 : opts.size) || 0;   // layout width: not changed by a transform animation on a parent
      if (!w) return false;
      const dpr = Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 3);
      const h = w * vb[3] / vb[2], cw = Math.max(1, Math.round(w * (1 + 2 * BL[0]) * dpr)), ch = Math.max(1, Math.round(h * (1 + BL[1] + BL[2]) * dpr));
      if (cw === canvas.width && ch === canvas.height && w === cssW) return true;
      cssW = w; canvas.width = cw; canvas.height = ch;
      scale = w * dpr / vb[2];
      T0.set([scale, 0, 0, scale, -vb[0] * scale + BL[0] * w * dpr, -vb[1] * scale + BL[1] * h * dpr]);
      inkExtra = Math.max(0, lineWidth(def, w, vb) - (lines.min || 1.7));
      step = opts.detail || clamp(Math.floor(4 / (2.5 * w / vb[2])), 1, 4);   // keep a point about every 4 css pixels
      last = null;
      return true;
    }
    function readColors() {
      const cs = getComputedStyle(el), out = [];
      let any = false;
      for (const r of def.roles) { const v = cs.getPropertyValue('--' + def.id + '-' + r).trim(); if (v) any = true; out.push(v || '#888'); }
      if (!any && !el.isConnected) return null;
      return out;
    }

    R.set = function (spec, o = {}) {
      const A = def.actions['mood:' + spec] || def.actions['mood:' + def.restMood];
      if (!A) return R;
      const rm = reduced(), t = R.time;
      const prevTo = to;
      to = stateOf(A, o.clip === false || rm ? restTime(A) : null);
      bdur = o.dur != null ? o.dur : 0.32;
      if (rm) bdur = 0;
      bease = EASE[o.ease || 'back'] || EASE.back;
      switchAt = o.switchAt != null ? o.switchAt : 0.28;
      b0 = t;
      if (prevTo && bdur > 0) {
        /* a switch in the middle of a blend freezes what is on screen; otherwise the old mood goes on moving as it fades */
        if (blendingNow) { const sn = newPS(def); copyPS(psSnap, sn); from = { snap: sn }; } else from = prevTo;
      } else from = null;
      R.mood = spec;
      if (!live.has(R)) R.render();   // nothing is running it (paused, off screen, or reduced motion): draw the new mood once
      return R;
    };
    R.play = function (name, o = {}) {
      const A = def.actions['move:' + name] || (def.actions[name] && def.actions[name].add ? def.actions[name] : null);
      if (!A || reduced()) return R;   // a move is motion: reduced motion plays none
      if (o.restart !== false) moves = moves.filter(k => k.act !== A);
      moves.push({ act: A, name, t0: R.time, loop: o.loop != null ? o.loop : A.loop, stopAt: null, then: o.then, speed: o.speed || 1, prev: -1 });
      R._sync();
      return R;
    };
    /* stop(name) fades a move out; stop() also settles the mood's own motion (a dance ends, the pose stays) */
    R.stop = function (name) {
      for (const k of moves) if (!name || k.name === name) k.stopAt = R.time;
      if (!name && to && to.frozen == null && to.act.loop) {
        from = to; to = stateOf(to.act, restTime(to.act)); to.t0 = R.time; b0 = R.time; bdur = 0.18; bease = EASE.inOut; switchAt = 0.28;
        if (!live.has(R)) R.render();
      }
      return R;
    };
    R.playing = name => moves.some(k => k.name === name && k.stopAt == null);
    R.hop = () => R.play(def.hopClip);
    R.say = function (text, o = {}) {
      const v = visemes(def, text, o.rate);
      talk = { keys: v.keys, t0: R.time + (o.delay || 0), dur: v.dur };
      R._sync();
      return new Promise(res => { talk.done = res; });
    };
    R.talking = function (on) { babble = !!on; babbleNext = 0; if (!on) babbleV = null; R._sync(); return R; };
    R.look = function (x, y) { lookTarget = x == null ? null : { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; return R; };
    R.lookAtPoint = function (clientX, clientY) {
      const r = el.getBoundingClientRect();
      if (!r.width) return R;
      return R.look((clientX - (r.left + r.width / 2)) / (r.width * 0.9), (clientY - (r.top + r.height * 0.42)) / (r.height * 0.7));
    };
    R.pause = () => { R._running = false; R._sync(); return R; };
    R.resume = () => { R._running = true; R._sync(); return R; };
    R.destroy = () => { live.delete(R); made.delete(R); if (io) io.unobserve(el); if (ro) ro.disconnect(); };
    R.setDebug = on => { R.debug = !!on; R.render(0); return R; };
    R.snapshot = function () {
      const out = { bones: {}, params: {}, slots: {} };
      def.bones.forEach(b => { const o = {}; let any = false; CHN.forEach((k, j) => { const v = ps.ch[5 * b.i + j], r = j > 2 ? 1 : 0; if (Math.abs(v - r) > 0.005) { o[k] = Math.round(v * 100) / 100; any = true; } }); if (any) out.bones[b.id] = o; });
      PNAMES.forEach((k, j) => { if (Math.abs(ps.P[j]) > 0.005) out.params[k] = Math.round(ps.P[j] * 100) / 100; });
      def.slots.forEach((sl, i) => { if (ps.S[i] !== sl.rest) out.slots[sl.id] = ps.S[i]; });
      return out;
    };
    /* the loop runs while the bird is on screen; under reduced motion it holds the rest frame (and only moves its beak while talking) */
    R._sync = function () {
      if (R._gone && el.isConnected) { R._gone = false; made.add(R); if (io) io.observe(el); }
      const on = R._running && R._visible && (!reduced() || !!talk || babble);
      if (on && !live.has(R)) { live.add(R); wake(); }
      else if (!on && live.has(R)) live.delete(R);
      if (R._visible && R._dirty && el.isConnected && !live.has(R)) R.render(0);
    };
    R._frame = function (t, dt) {
      if (!el.isConnected) { if (io) live.delete(R); return; }   // the observer wakes it again once it's back on screen
      dt *= R.speed;
      R.time += dt;
      R.render(dt);
    };

    /* one frame: mood blend, moves, idle, glance, look, level head, overrides, blink, talk, drivers, world, draw */
    R.render = function (dt = 0) {
      const t = R.time, rm = reduced();
      // mood: the action the bird is in, blended from the one it was in
      const ww = bdur > 0 && from ? bease(clamp((t - b0) / bdur, 0, 1)) : 1;
      evalState(to, t, ps);
      let blending = false;
      if (from && bdur > 0 && t - b0 < bdur) {
        blending = true;
        evalState(from, t, psFrom);
        const a = ps.ch, b = psFrom.ch;
        for (let i = 0; i < a.length; i++) a[i] = b[i] + (a[i] - b[i]) * ww;
        for (let i = 0; i < 3; i++) ps.P[i] = lerp(psFrom.P[i], ps.P[i], ww);
        if (ww < switchAt) for (let i = 0; i < ns; i++) ps.S[i] = psFrom.S[i];
        if (ww < 0.5) for (let i = 0; i < ns; i++) ps.z[i] = psFrom.z[i];
        copyPS(ps, psSnap);   // what a switch in the middle of this blend starts from
      } else if (from) from = null;
      blendingNow = blending;
      const ch = ps.ch, S = ps.S, P0 = ps.P;
      const turn0 = P0[0], lookX0 = P0[1], lookY0 = P0[2];
      // fx started by the mood's own action (at its start)
      if (!rm) fxStart(to, localT(to, t));
      // moves layered on: additive offsets, faded in and out
      const keep = [];
      for (const k of moves) {
        const A = k.act, dur = A.dur;
        let lt = (t - k.t0) * k.speed, done = false;
        if (k.loop) lt = lt % dur; else if (lt >= dur) { lt = dur; done = true; }
        let w = Math.min(1, (t - k.t0) / 0.06);
        if (k.stopAt != null) { const f = 1 - (t - k.stopAt) / 0.18; if (f <= 0) done = true; w *= clamp(f, 0, 1); }
        if (rm) w = 0;
        addMove(def, A, lt, w, ps, k.stopAt == null && !done);
        if (!rm) fxStart(k, lt);
        if (done) { if (k.then && k.stopAt == null) setTimeout(() => R.set(k.then), 0); if (R.onEvent) R.onEvent('end', k.name); } else keep.push(k);
      }
      moves = keep;
      // idle: breathing, a slow head drift, wing sway
      const idle = to.act.idle || {};
      if (!rm && idle.amp !== 0) {
        const amp = idle.amp == null ? 1 : idle.amp, en = idle.energy || 1, ph = (t + idlePhase) * en * TAU;
        for (const id in def.idle) {
          const bi = def.byId[id]; if (bi == null) continue;
          for (const c in def.idle[id]) {
            const [a, period, off] = def.idle[id][c], j = CHN.indexOf(c), v = a * amp * Math.sin(ph / period + (off || 0));
            if (j > 2) ch[5 * bi + j] *= 1 + v; else ch[5 * bi + j] += v;
          }
        }
      }
      // glances: a quick look somewhere, then back
      if (!rm && to.act.glance && !lookTarget) {
        if (t > glanceAt) { glance.tx = (Math.random() * 2 - 1) * 0.55; glance.ty = (Math.random() * 2 - 1) * 0.35; glance.until = t + 0.7 + Math.random() * 1.1; glanceAt = glance.until + 2.2 + Math.random() * 4; }
        if (t > glance.until) { glance.tx = 0; glance.ty = 0; }
      } else { glance.tx = 0; glance.ty = 0; }
      const gk = Math.min(1, dt * 9);
      glance.x += ((lookTarget ? lookTarget.x : glance.tx) - glance.x) * gk;
      glance.y += ((lookTarget ? lookTarget.y : glance.ty) - glance.y) * gk;
      const nbC = 5 * nb, O = R.override;
      const faceV = ch[nbC], F = 1 + faceV < 0 ? -1 : 1;   // a look is on screen; lookX, turn and the head's tilt follow the bird
      let lookX1 = clamp(lookX0 + glance.x * F, -1, 1), lookY1 = clamp(lookY0 + glance.y, -1, 1), turn1 = turn0;
      const hb = L.head ? def.byId[L.head] : null;
      if (lookTarget && hb != null) { ch[5 * hb + 2] += glance.x * F * (L.headR || 3); turn1 += glance.x * F * (L.turn || 0.2); }
      // the head holds level against a turned screen; it eases toward the level rather than snapping
      if (hb != null) {
        hz += ((rm ? 0 : clamp(horizon, -HORIZON_MAX, HORIZON_MAX)) - hz) * Math.min(1, dt * 7);
        if (Math.abs(hz) > 0.02) ch[5 * hb + 2] += hz;
      }
      // overrides from puppet controls (absolute)
      for (const id in O.bones) { const bi = def.byId[id]; if (bi != null) for (const c in O.bones[id]) { const j = CHN.indexOf(c); if (j >= 0) ch[5 * bi + j] = O.bones[id][c]; } }
      if (O.params.turn != null) turn1 = O.params.turn;
      if (O.params.lookX != null) lookX1 = O.params.lookX;
      if (O.params.lookY != null) lookY1 = O.params.lookY;
      if (O.params.facing != null) ch[nbC] = O.params.facing < 0 ? -2 : 0;
      for (const id in O.slots) { const si = def.slotIdx[id]; if (si != null) S[si] = O.slots[id]; }
      // blink: squash the pupils, swap to the closed drawing at the bottom of the blink
      if (to.act.blink && blinkT < 0 && t > blinkAt) { blinkT = t; blinkAt = t + 2.2 + Math.random() * 3.8 + (Math.random() < 0.2 ? -1.9 : 0); }
      if (blinkT >= 0) {
        const u = (t - blinkT) / 0.17;
        if (u >= 1) blinkT = -1;
        else {
          const k = u < 0.4 ? 1 - u / 0.4 : (u - 0.4) / 0.6;
          for (const sl of def.slots) {
            if (!sl.blink || !sl.blink.from.includes(S[sl.i])) continue;
            if (k < 0.35) S[sl.i] = sl.blink.to; else ch[5 * sl.bone + 4] *= 0.2 + 0.8 * k;
          }
        }
      }
      // talking: viseme script or babble
      const Mo = def.mouth, mouth = Mo && def.slotIdx[Mo.slot];
      let mv = null;
      if (talk) {
        const lt = t - talk.t0;
        if (lt >= talk.dur) { const d = talk.done; talk = null; if (d) d(); R._sync(); } else if (lt >= 0) mv = stepTrack(talk.keys, lt);
      } else if (babble) {
        if (t >= babbleNext) { const V = def.visemes, pool = [V.a, V.e, V.o, V.e, V.m, V.a, V.rest]; babbleV = pool[Math.floor(Math.random() * pool.length)]; babbleNext = t + 0.07 + Math.random() * 0.09; }
        mv = babbleV;
      }
      if (mouth != null && mv != null) {
        S[mouth] = mv;
        if (Mo.beak) { const bs = def.slotIdx[Mo.beak.slot]; if (bs != null) S[bs] = Mo.beak.open.includes(mv) ? Mo.beak.openAtt : Mo.beak.closedAtt; }
        if (Mo.jaw) { const jb = def.byId[Mo.jaw.bone]; if (jb != null && Mo.jaw.drop[mv]) ch[5 * jb + 1] += Mo.jaw.drop[mv]; }
      }
      swapByAngle(def, ch, S, swapOn);
      follow(def, S);
      // the live turn and look, on top of what the mood baked in
      const Mi = def.proc.mirror || {}, H0 = turn0 < 0 && Mi.head ? -1 : 1, H1 = turn1 < 0 && Mi.head ? -1 : 1;
      if (turn1 !== turn0) { turnDelta(def, turn0, turn1, ch, scratch); if (def.mirrorH != null && H1 !== H0) ch[nbC + 1] += H1 - H0; }
      if (lookX1 !== lookX0 || lookY1 !== lookY0 || H1 !== H0) {
        const dx = lookX1 * (L.x || 5) * H1 - lookX0 * (L.x || 5) * H0, dy = (lookY1 - lookY0) * (L.y || 5);
        for (const id of L.pupils || []) {
          const bi = def.byId[id]; if (bi == null) continue;
          let x = ch[5 * bi] + dx, y = ch[5 * bi + 1] + dy;
          if (L.room && L.room[id]) { const q = inRoom(x, y, L.room[id]); x = q[0]; y = q[1]; }
          ch[5 * bi] = x; ch[5 * bi + 1] = y;
        }
        for (const id of L.brows || []) { const bi = def.byId[id]; if (bi != null) ch[5 * bi + 1] += (lookY1 - lookY0) * (L.brow || 1.5); }
      }
      mirrors(def, ch);
      world(def, ch, M, K, springs, dt, !rm);
      R.frame = { ch, S, z: ps.z, P: [turn1, lookX1, lookY1], M, K };
      R._paint();
    };

    /* effects: a sequence of drawing frames at the effect's own fps, started where the action says */
    function fxStart(m, lt) {
      const evs = m.act.fx; if (!evs.length) return;
      if (lt < m.prev) m.prev = -1;
      for (const e of evs) if (e.t > m.prev && e.t <= lt && def.fx[e.name]) fxs.push({ fx: def.fx[e.name], t0: R.time, x: e.x, y: e.y });
      m.prev = lt;
    }

    /* ----- drawing ----- */
      let skin = new Float64Array(0);
    function pathOf(D, li) {   // a rigid drawing's layer as a Path2D in setup space, built once
      const c = D.p2d || (D.p2d = []);
      if (c[li]) return c[li];
      const La = D.layers[li], p = new Path2D();
      if (La.ribbon) { for (const lp of ribbon(D.pts, D.loops[La.loops[0]][0], D.loops[La.loops[0]][1], La.ribbon, 1, true)) trace(p, lp, 0, lp.length / 2, new Uint8Array(lp.length / 2)); }
      else for (const l of La.loops) trace(p, D.pts, D.loops[l][0], D.loops[l][1], D.corner);
      return (c[li] = p);
    }
    function paintLayers(D, rigid) {
      for (let li = 0; li < D.layers.length; li++) {
        const La = D.layers[li], col = colors[La.role];
        if (rigid) {
          const p = pathOf(D, li);
          ctx.fillStyle = col; if (La.a !== 1) ctx.globalAlpha = La.a;
          ctx.fill(p, 'evenodd');
          if (La.ink && inkExtra > 0.02) { ctx.strokeStyle = col; ctx.lineWidth = inkExtra; ctx.lineJoin = 'round'; ctx.stroke(p); }
        } else {
          ctx.beginPath();
          if (La.ribbon) { for (const lp of ribbon(skin, D.loops[La.loops[0]][0], D.loops[La.loops[0]][1], La.ribbon, 1, true)) trace(ctx, lp, 0, lp.length / 2, new Uint8Array(lp.length / 2)); }
          else for (const l of La.loops) trace(ctx, skin, D.loops[l][0], D.loops[l][1], D.corner);
          ctx.fillStyle = col; if (La.a !== 1) ctx.globalAlpha = La.a;
          ctx.fill('evenodd');
          if (La.ink && inkExtra > 0.02) { ctx.strokeStyle = col; ctx.lineWidth = inkExtra; ctx.lineJoin = 'round'; ctx.stroke(); }
        }
        if (La.a !== 1) ctx.globalAlpha = 1;
      }
    }
    /* has the picture changed enough to draw again? bones that moved less than a fraction of a device pixel don't count */
    function moved() {
      if (!last || last.W !== canvas.width || last.H !== canvas.height || last.dbg !== R.debug || fxs.length || def.hasShapes) return true;
      for (let i = 0; i < ns; i++) if (ps.S[i] !== lastS[i] || ps.z[i] !== lastZ[i]) return true;
      const thr = 0.25 / scale;
      for (let i = 0; i < K.length; i += 6) {
        const l = Math.max(Math.abs(K[i] - lastK[i]), Math.abs(K[i + 1] - lastK[i + 1]), Math.abs(K[i + 2] - lastK[i + 2]), Math.abs(K[i + 3] - lastK[i + 3]));
        if (l * 110 + Math.max(Math.abs(K[i + 4] - lastK[i + 4]), Math.abs(K[i + 5] - lastK[i + 5])) > thr) return true;
      }
      return false;
    }
    R._paint = function () {
      if (!el.isConnected) return;
      if (R._sized) { if (!resize()) return; R._sized = false; }   // the layout is read when the box has changed size, not every frame
      if (R._dirty || !colors) { const c = readColors(); if (!c) return; colors = c; R._dirty = false; last = null; }
      const S = ps.S;
      if (last && !moved()) return;
      R.draws++;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const order = drawOrder(ns, ps.z), shapes = R._shapes ? R._shapes() : null;
      for (const i of order) {
        const nm = S[i]; if (nm == null) continue;
        const D0 = def.slots[i].D[nm]; if (!D0 || !D0.layers.length) continue;
        const D = thinned(D0, step);
        if (D.rigid >= 0 && !shapes) {
          mulTo(tm, 0, T0, 0, K, 6 * D.rigid);
          ctx.setTransform(tm[0], tm[1], tm[2], tm[3], tm[4], tm[5]);
          paintLayers(D, true);
        } else {
          if (skin.length < 2 * D.n) skin = new Float64Array(2 * D.n);
          skinInto(D, K, skin, shapes && shapes[D.key]);
          ctx.setTransform(T0[0], T0[1], T0[2], T0[3], T0[4], T0[5]);
          paintLayers(D, false);
        }
      }
      ctx.setTransform(T0[0], T0[1], T0[2], T0[3], T0[4], T0[5]);
      for (let i = fxs.length - 1; i >= 0; i--) {
        const f = fxs[i], k = Math.floor((R.time - f.t0) * f.fx.fps);
        if (k >= f.fx.frames.length) { fxs.splice(i, 1); continue; }
        const D = f.fx.frames[k], ro = 6 * def.byId.root;
        ctx.save(); ctx.translate(M[ro] * f.x + M[ro + 2] * f.y + M[ro + 4], M[ro + 1] * f.x + M[ro + 3] * f.y + M[ro + 5]);
        for (let li = 0; li < D.layers.length; li++) { const La = D.layers[li]; ctx.fillStyle = colors[La.role]; ctx.fill(pathOf(D, li), 'evenodd'); }
        ctx.restore();
      }
      if (R.debug) {
        ctx.lineWidth = 1.4 / scale; ctx.strokeStyle = '#E8412C';
        for (const b of def.bones) {
          const o = 6 * b.i;
          if (b.p >= 0) { ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(M[6 * b.p + 4], M[6 * b.p + 5]); ctx.lineTo(M[o + 4], M[o + 5]); ctx.stroke(); ctx.setLineDash([]); }
          ctx.beginPath(); ctx.arc(M[o + 4], M[o + 5], 2.4, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        }
      }
      lastK.set(K); lastZ.set(ps.z);
      for (let i = 0; i < ns; i++) lastS[i] = S[i];
      last = { W: canvas.width, H: canvas.height, dbg: R.debug };
    };
    /* blend shapes: weight per drawing from the mood's and the playing moves' shape curves */
    R._shapes = def.hasShapes ? function () {
      const w = {}, add = (A, lt, f, abs) => { for (const s of A.shapes) { const D = def.drawings[s.key]; if (!D || !D.shapes[s.name]) continue; const v = curveAt(s.c, lt) * f; (w[s.key] = w[s.key] || {})[s.name] = abs ? v : ((w[s.key][s.name]) || 0) + v; } };
      add(to.act, localT(to, R.time), 1, true);
      for (const k of moves) add(k.act, k.loop ? ((R.time - k.t0) * k.speed) % k.act.dur : Math.min((R.time - k.t0) * k.speed, k.act.dur), 1, false);
      const out = {};
      for (const key in w) out[key] = Object.keys(w[key]).map(n => ({ d: def.drawings[key].shapes[n], w: w[key][n] }));
      return out;
    } : null;

    el._rig2 = R;
    made.add(R);
    if (io) io.observe(el);
    let ro = null;
    /* sized by CSS: keep the canvas right for whatever size it lands at */
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { R._sized = true; if (el.isConnected && !live.has(R)) R.render(0); }); ro.observe(el); }
    R.set(opts.mood || def.restMood, { dur: 0, clip: opts.intro !== false });
    if (opts.look) R.look(opts.look[0], opts.look[1]);
    R.render(0);
    R._sync();
    return R;
  }

  /* Checks the data for mistakes a person would make editing it, or an exporter would. Returns a list of problems. */
  function validate(def) {
    const errs = [];
    if (!def || !def.drawings) return ['not a prepared rig (use Rig2.prep or Rig2.load)'];
    const role = i => def.roles[i] != null;
    for (const key in def.drawings) {
      const D = def.drawings[key];
      for (let j = 0; j < D.n; j++) { let s = 0; for (let k = 0; k < 3; k++) { s += D.sw[3 * j + k]; if (D.sb[3 * j + k] >= def.nb) errs.push(key + ': point ' + j + ' skins to a missing bone'); } if (Math.abs(s - 1) > 0.002) errs.push(key + ': weights of point ' + j + ' sum to ' + s); }
      for (const lp of D.loops) { if (lp[1] < 4) errs.push(key + ': a loop has fewer than 4 points'); if (lp[0] + lp[1] > D.n) errs.push(key + ': a loop runs past the points'); }
      for (const La of D.layers) { if (!role(La.role)) errs.push(key + ': layer with an unknown role'); for (const l of La.loops) if (!D.loops[l]) errs.push(key + ': layer uses a missing loop ' + l); }
    }
    for (const sl of def.slots) for (const nm of sl.drawings) if (!sl.D[nm]) errs.push('slot ' + sl.id + ': no drawing ' + nm);
    for (const sl of def.slots) if (sl.rest != null && !sl.D[sl.rest]) errs.push('slot ' + sl.id + ': rest drawing ' + sl.rest + ' is missing');
    for (const k in def.actions) { const A = def.actions[k]; for (const s of A.sw) for (const v of s.v) if (v != null && !def.slots[s.i].D[v]) errs.push(k + ': slot ' + def.slots[s.i].id + ' has no drawing ' + v); }
    if (!def.actions['mood:' + def.restMood]) errs.push('no rest mood ' + def.restMood);
    return errs;
  }

  /* Rig2.load(id) -> Promise of the prepared rig (fetches <base>media/birds/<id>.json once) */
  function load(id, url) {
    if (defs[id]) return Promise.resolve(defs[id]);
    if (loading[id]) return loading[id];
    const u = url || (api.base || '') + 'media/birds/' + id + '.json';
    return (loading[id] = fetch(u).then(r => { if (!r.ok) throw new Error('Rig2: ' + u + ' ' + r.status); return r.json(); }).then(j => (defs[id] = prep(j)), e => { delete loading[id]; throw e; }));
  }
  /* hold(true) pauses every live bird until hold(false), for while something covers the whole page */
  const hold = on => { held = !!on; if (!held) wake(); };
  const api = {
    load, create, svg, hold, validate, prep, css, lineWidth, EASE, get: id => defs[id] || null, base: '', defs,
    setHorizon: d => { horizon = Number.isFinite(d) ? d : 0; },
    version: '1.0.0',
    /* pure math, for tests */
    _m: { mul, invert, mulTo, chanMat, makeCurve, curveAt, solveTime, restTime, restFx, trace, svgSink, ribbon, thinned, skinInto, prep, newPS, evalMood, addMove, world, stillFrame, turnDrive, turnDelta, mirrorScale, inRoom, visemes, swapByAngle, follow, mirrors, drawOrder, lastLE }
  };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Rig2;
