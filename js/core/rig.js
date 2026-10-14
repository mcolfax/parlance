"use strict";
/* ===================== RIG =====================
   A cut-out character rig for SVG, built the way Spine and Rive rigs are built, small enough to ship as one
   classic script with no dependencies:
   - bones: a hierarchy of pivots (neck, shoulders, crest…). Every drawing is authored in one shared "setup"
     space, so a bone's transform is a rotation, scale and offset around its pivot.
   - slots: the draw order. Each slot hangs on a bone and shows one drawing at a time (its attachment), so
     swapping eyes, beaks or wing shapes is a data change, not new art.
   - poses and faces: snapshots of bone channels, attachments and params, blended with easing.
   - clips: keyframed tracks layered on the pose (additive by default).
   - procedural layers: breathing, blinks, glances, talking, look-at, and springs that give the crest, tail
     and wing tips follow-through.
   - 2.5D turn: face features ride a sphere, so a head turns with parallax instead of needing new drawings.
   Characters are plain data (see pip.js). Rig.svg() returns a static SVG string; Rig.create() a live one.
   ================================================ */
const Rig = (() => {
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
  const CH = ['x', 'y', 'r', 'sx', 'sy', 'a'];
  const REST = { x: 0, y: 0, r: 0, sx: 1, sy: 1, a: 1 };
  const PARAMS = ['turn', 'bodyTurn', 'lookX', 'lookY', 'facing'];
  const PARAM0 = { facing: 1 };   // defaults other than 0
  const MULT = { sx: 1, sy: 1, a: 1 };   // channels that combine by multiplying; the rest add
  const NS = 'http://www.w3.org/2000/svg';
  const RMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let RM = !!(RMQ && RMQ.matches);
  if (RMQ && RMQ.addEventListener) RMQ.addEventListener('change', e => { RM = e.matches; });
  const reduced = () => RM;
  /* the horizon: how far the screen is turned from level, in degrees (clockwise is positive). A bird's head turns the
     other way, like a chicken's, so it stays upright within HORIZON_MAX. Set by Rig.setHorizon (the phone's sensor feeds it from art.js). */
  const HORIZON_MAX = 28;
  let horizon = 0;
  const f3 = v => (Math.abs(v) < 1e-4 ? '0' : String(Math.round(v * 1000) / 1000));

  /* ----- 2D affine matrices, SVG order [a b c d e f] ----- */
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const app = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  /* translate(pivot + offset) · rotate · scale · translate(-pivot): scale happens in the bone's own axes */
  function local(b, c) {
    const cs = Math.cos(c.r * DEG), sn = Math.sin(c.r * DEG);
    const a = cs * c.sx, bb = sn * c.sx, cc = -sn * c.sy, d = cs * c.sy;
    return [a, bb, cc, d, b.x + c.x - (a * b.x + cc * b.y), b.y + c.y - (bb * b.x + d * b.y)];
  }

  /* ----- compile a character definition once ----- */
  function compile(def) {
    if (def._c) return def._c;
    const byId = {};
    const bones = def.bones.map((b, i) => {
      const T = def.turn || {};
      let turn = b.turn || null;
      /* a feature's angle on the head's sphere comes from where it is drawn, unless the bone names one */
      if (turn && turn.R && turn.phi == null) turn = Object.assign({}, turn, { phi: Math.asin(clamp((b.x - (T.cx || 120)) / turn.R, -1, 1)) / DEG });
      const o = { id: b.id, i, x: b.x, y: b.y, parent: -1, kids: [], turn };
      if (byId[b.id]) throw new Error('Rig: duplicate bone ' + b.id);
      byId[b.id] = o;
      if (b.parent){
        const p = byId[b.parent];
        if (!p) throw new Error('Rig: bone ' + b.id + ' is listed before its parent ' + b.parent);
        o.parent = p.i; p.kids.push(i);
      }
      return o;
    });
    const slotById = {};
    const slots = def.slots.map((s, i) => {
      if (!byId[s.bone]) throw new Error('Rig: slot ' + s.id + ' hangs on a missing bone ' + s.bone);
      const o = { id: s.id, i, bone: byId[s.bone].i, z: i, att: s.att === undefined ? null : s.att, parts: def.parts[s.id] || {}, blink: s.blink || null, showWith: s.showWith || null };
      slotById[s.id] = o;
      return o;
    });
    /* a slot that shows its drawing only while another slot shows one of a list (an eye's white goes with the open
       eyes, not the closed ones) */
    for (const o of slots) if (o.showWith){
      const ref = slotById[o.showWith.slot];
      if (!ref) throw new Error('Rig: slot ' + o.id + ' shows with a missing slot ' + o.showWith.slot);
      o.showWith = { ref: ref.i, drawings: o.showWith.drawings };
    }
    const springs = Object.keys(def.springs || {}).map(id => {
      if (!byId[id]) throw new Error('Rig: spring on a missing bone ' + id);
      const s = def.springs[id], n = Math.hypot(s.dir[0], s.dir[1]) || 1;
      return { id, bone: byId[id].i, len: s.len, dx: s.dir[0] / n, dy: s.dir[1] / n, k: s.k || 160, d: s.d || 12, limit: s.limit || 30, squash: s.squash || 0, g: s.g || 0 };
    });
    const swaps = (def.swaps || []).map(w => {
      if (!slotById[w.slot] || !byId[w.bone]) throw new Error('Rig: swap on a missing slot or bone ' + w.slot + '/' + w.bone);
      return { slot: slotById[w.slot].i, bone: byId[w.bone].i, from: w.from, to: w.to, deg: w.deg || 15 };
    });
    const upright = new Set(((def.mirror || {}).upright || []).filter(id => byId[id]).map(id => byId[id].i));
    return (def._c = { bones, byId, slots, slotById, springs, swaps, upright });
  }

  /* ----- poses: { bones: {id: {ch: v}}, slots: {id: att|null}, params: {name: v}, z: {slotId: 'front'|'back'|n}, idle, glance } ----- */
  function merge(into, p) {
    if (!p) return into;
    if (p.bones) for (const id in p.bones){ into.bones[id] = Object.assign({}, into.bones[id], p.bones[id]); }
    if (p.slots) Object.assign(into.slots, p.slots);
    if (p.params) Object.assign(into.params, p.params);
    if (p.z) Object.assign(into.z, p.z);
    for (const k of ['idle', 'glance', 'blink', 'ease', 'dur']) if (p[k] !== undefined) into[k] = p[k];
    return into;
  }
  /* A spec is a mood name, a pose name, a pose object, or {pose, face, ...extra pose fields}. */
  function resolve(def, spec) {
    const out = { bones: {}, slots: {}, params: {}, z: {} };
    const pose = name => {
      const p = def.poses && def.poses[name];
      if (!p) return null;
      if (p.use) pose(p.use);
      merge(out, p);
      return p;
    };
    if (typeof spec === 'string'){
      const m = def.moods && def.moods[spec];
      if (m){ pose(m.pose); merge(out, def.faces[m.face]); merge(out, m); out.mood = spec; }
      else if (!pose(spec) && def.faces && def.faces[spec]) merge(out, def.faces[spec]);
    } else if (spec){
      if (spec.pose) pose(spec.pose);
      if (spec.face) merge(out, def.faces[spec.face]);
      merge(out, spec);
    }
    return out;
  }
  /* Expand a resolved pose into dense arrays the evaluator can blend. */
  function dense(c, def, p) {
    const b = c.bones.map(() => Object.assign({}, REST));
    for (const id in p.bones){ const bo = c.byId[id]; if (bo) Object.assign(b[bo.i], p.bones[id]); }
    const s = c.slots.map(sl => (Object.prototype.hasOwnProperty.call(p.slots, sl.id) ? p.slots[sl.id] : sl.att));
    const z = c.slots.map(sl => sl.z);
    const front = c.slots.length + 10;
    for (const id in p.z){ const sl = c.slotById[id]; if (!sl) continue; const v = p.z[id]; z[sl.i] = v === 'front' ? front + sl.i : v === 'back' ? -10 + sl.i : v; }
    const pr = {}; PARAMS.forEach(k => { pr[k] = p.params[k] !== undefined ? p.params[k] : def.rest && def.rest[k] != null ? def.rest[k] : PARAM0[k] || 0; });
    pr.bodyTurnSet = p.params.bodyTurn !== undefined;
    return { b, s, z, p: pr, idle: p.idle || null, glance: p.glance !== false, blink: p.blink !== false };
  }

  /* ----- keyframed tracks: [[time, value, ease]] ----- */
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++){
      const k = keys[i];
      if (t < k[0]){ const p = keys[i - 1]; if (typeof k[1] !== 'number') return p[1]; const u = (t - p[0]) / (k[0] - p[0]); return lerp(p[1], k[1], (EASE[k[2] || 'inOut'] || EASE.inOut)(u)); }
    }
    return keys[keys.length - 1][1];
  }

  /* ----- evaluate a frame: channels → world matrices → springs ----- */
  function addCh(c, ch, v, w) { if (MULT[ch]) c[ch] *= 1 + (v - 1) * w; else c[ch] += v * w; }
  /* the head mirrors once it turns past the front (turn below 0); then it is the mirrored drawing turned by -turn */
  const headSign = (def, turn) => (turn < 0 && def.mirror && def.mirror.head ? -1 : 1);
  /* a blended facing (between 1 and -1 in a fade) as a scale: its sign, never narrower than 0.72, so the bird
     squashes a little as it turns round instead of shrinking to nothing */
  const faceScale = f => (f < 0 ? -1 : 1) * Math.max(Math.abs(f == null ? 1 : f), 0.72);
  function drivers(c, def, chans, params) {
    const T = def.turn || { head: 35, body: 0.6 };
    const Mi = def.mirror || {}, H = headSign(def, params.turn);
    const lim = (v, a, b) => clamp(v, a == null ? -9 : a, b == null ? 9 : b);
    /* turn 0 faces front; the drawings were made at turn T.setup, so features move by the difference */
    const kb = T.body == null ? 0.6 : T.body, s0 = T.setup || 0;
    const th = (lim(params.turn * H, T.max == null ? null : -T.max, T.max) - s0) * T.head;
    const thb = (lim(params.bodyTurnSet ? params.bodyTurn : params.turn * kb, T.bodyMin, T.bodyMax) - s0 * kb) * T.head;
    if (Mi.facing && c.byId[Mi.facing]) chans[c.byId[Mi.facing].i].sx *= faceScale(params.facing);
    if (H < 0 && c.byId[Mi.head]) chans[c.byId[Mi.head].i].sx *= -1;
    for (const b of c.bones){
      const s = b.turn; if (!s) continue;
      const ch = chans[b.i], t = s.body ? thb : th, abs = t + (s.body ? s0 * kb : s0) * T.head;
      if (s.R){ const phi = s.phi || 0; ch.x += s.R * (Math.sin((phi + t) * DEG) - Math.sin(phi * DEG)); if (s.squash){ ch.sx *= clamp(Math.cos((phi + t) * DEG) / Math.cos(phi * DEG), 0.35, 1.35); } }
      if (s.near) { const k = 1 + s.near * (t / T.head); ch.sx *= k; ch.sy *= k; }
      if (s.wx) ch.sx *= clamp(1 + s.wx * (t / T.head), 0.4, 1.6);   // foreshorten width only
      if (s.flip) { const k = clamp(abs / s.flip, -1, 1); ch.sx *= Math.abs(k) < 0.04 ? 0.04 * Math.sign(k || 1) : k; }
      if (s.dx) ch.x += s.dx * (t / T.head);
      if (s.rot) ch.r += s.rot * (t / T.head);
    }
    const sh = def.shadow;
    if (sh){
      const bo = c.byId[sh.bone], fo = c.byId[sh.follow];
      if (bo && fo){ const lift = clamp(-chans[fo.i].y / (sh.lift || 90), 0, 0.7); const ch = chans[bo.i]; ch.x += chans[fo.i].x; ch.sx *= 1 - lift * 0.6; ch.sy *= 1 - lift * 0.6; ch.a *= 1 - lift * 0.5; }
    }
  }
  function world(c, chans, springs, dt, live) {
    const W = new Array(c.bones.length), A = new Array(c.bones.length);
    const sp = {};
    if (springs) for (const s of springs) sp[s.bone] = s;
    for (const b of c.bones){
      let ch = chans[b.i];
      const parent = b.parent >= 0 ? W[b.parent] : [1, 0, 0, 1, 0, 0];
      /* effects that would read backwards (a question mark, notes) stay the right way round under a mirror */
      if (c.upright && c.upright.has(b.i) && parent[0] * parent[3] - parent[1] * parent[2] < 0) ch = Object.assign({}, ch, { sx: -ch.sx });
      let m = mul(parent, local(b, ch));
      const s = sp[b.i];
      if (s && live){
        const P = app(m, b.x, b.y), Tt = app(m, b.x + s.dx * s.len, b.y + s.dy * s.len);
        const restLen = Math.hypot(Tt[0] - P[0], Tt[1] - P[1]);
        if (restLen > 0.5){
          if (!s.q || dt > 0.09){ s.q = Tt.slice(); s.v = [0, 0]; }
          let rem = dt;
          while (rem > 1e-5){
            const h = Math.min(rem, 1 / 120); rem -= h;
            const ax = s.k * (Tt[0] - s.q[0]) - s.d * s.v[0], ay = s.k * (Tt[1] - s.q[1]) - s.d * s.v[1] + s.g;
            s.v[0] += ax * h; s.v[1] += ay * h; s.q[0] += s.v[0] * h; s.q[1] += s.v[1] * h;
          }
          let da = (Math.atan2(s.q[1] - P[1], s.q[0] - P[0]) - Math.atan2(Tt[1] - P[1], Tt[0] - P[0])) / DEG;
          da = ((da + 540) % 360) - 180;
          if (parent[0] * parent[3] - parent[1] * parent[2] < 0) da = -da;   // a mirrored parent turns local rotation around
          s.angle = clamp(da, -s.limit, s.limit);
          s.stretch = s.squash ? clamp(1 + (Math.hypot(s.q[0] - P[0], s.q[1] - P[1]) / restLen - 1) * s.squash, 0.8, 1.25) : 1;
          const c2 = Object.assign({}, ch, { r: ch.r + s.angle, sy: ch.sy * s.stretch });
          m = mul(parent, local(b, c2));
        }
      }
      W[b.i] = m;
      A[b.i] = (b.parent >= 0 ? A[b.parent] : 1) * ch.a;
    }
    return { W, A };
  }

  /* ----- markup ----- */
  function css(def) {
    const id = def.id, P = def.palette || {}, L = def.lines || {};
    const v = k => 'var(--' + id + '-' + k + ',' + P[k] + ')';
    let s = '.rig-' + id + '{overflow:visible}';
    for (const k in P) s += '.rig-' + id + ' .k-' + k + '{fill:' + v(k) + '}';
    s += '.rig-' + id + ' .o{stroke:' + v('ink') + ';stroke-width:calc(var(--rig-lw,2) * 1px);stroke-linejoin:round;stroke-linecap:round}';
    const lmin = L.min || 1.7;
    s += '.rig-' + id + ' .ol{fill:none;stroke:' + v('ink') + ';stroke-width:calc(var(--rig-lw,2) * 1px);stroke-linejoin:round;stroke-linecap:round}';
    s += '.rig-' + id + ' .ol2{fill:none;stroke:' + v('ink') + ';stroke-width:calc(var(--rig-lw,2) * ' + (L.thin || 0.5) + 'px);stroke-linejoin:round;stroke-linecap:round}';
    /* drawn ink shapes (brows, pupils, feather lines) put on weight as the outline does when the bird is small */
    s += '.rig-' + id + ' .k-ink{stroke:' + v('ink') + ';stroke-width:calc((var(--rig-lw,' + lmin + ') - ' + lmin + ') * ' + (L.grow == null ? 0.6 : L.grow) + 'px);stroke-linejoin:round}';
    s += '.rig-' + id + ' .ln{fill:none;stroke:' + v('ink') + ';stroke-width:calc(var(--rig-lw,2) * ' + (L.feature || 1.25) + 'px);stroke-linecap:round;stroke-linejoin:round}';
    s += '.rig-' + id + ' .ln2{fill:none;stroke:' + v('ink') + ';stroke-width:calc(var(--rig-lw,2) * ' + (L.detail || 0.75) + 'px);stroke-linecap:round;stroke-linejoin:round}';
    s += '.rig-' + id + ' .gl{fill:none;stroke:' + v('gloss') + ';stroke-linecap:round}';
    for (const k in P) s += '.rig-' + id + ' .s-' + k + '{fill:none;stroke:' + v(k) + ';stroke-linecap:round;stroke-linejoin:round}';
    for (const k in P) s += '.rig-' + id + ' .t-' + k + '{stroke:' + v(k) + '}';   // a rim color on a filled shape
    return s;
  }
  function injectCSS(def) {
    if (typeof document === 'undefined') return;
    const sid = 'rig-css-' + def.id;
    if (document.getElementById(sid)) return;
    const st = document.createElement('style'); st.id = sid; st.textContent = css(def);
    (document.head || document.documentElement).appendChild(st);
  }
  /* Line weight that reads at any size: about 1.35 screen px, kept within a range of character units. px is the
     width the view box (def.view unless given) is drawn at. */
  function lineWidth(def, px, view) {
    const L = def.lines || {}, vb = view || def.view;
    if (!px) return L.base || 2;
    const perUnit = px / vb[2];
    return clamp((L.px || 1.35) / perUnit, L.min || 1.7, L.max || 3.8);
  }
  const mstr = m => 'matrix(' + m.map(f3).join(' ') + ')';

  /* ----- evaluate a dense pose statically (no time layers) ----- */
  function staticFrame(def, spec) {
    const c = compile(def);
    const d = dense(c, def, resolve(def, spec || def.restMood || {}));
    const chans = d.b.map(o => Object.assign({}, o));
    swapByAngle(c, chans, d.s);
    follow(c, d.s);
    drivers(c, def, chans, d.p);
    applyLook(c, def, chans, d.p);
    const { W, A } = world(c, chans, null, 0, false);
    return { c, d, chans, W, A };
  }
  /* lookX follows the bird; a mirrored head turns it round. A pupil stays inside its eye white (look.room). */
  function applyLook(c, def, chans, p) {
    const L = def.look || {}, H = headSign(def, p.turn);
    for (const id of L.pupils || []){
      const b = c.byId[id]; if (!b) continue;
      const ch = chans[b.i];
      ch.x += p.lookX * (L.x || 5) * H; ch.y += p.lookY * (L.y || 5);
      if (L.room && L.room[id]){ const q = inRoom(ch.x, ch.y, L.room[id]); ch.x = q[0]; ch.y = q[1]; }
    }
    for (const id of L.brows || []){ const b = c.byId[id]; if (b) chans[b.i].y += p.lookY * (L.brow || 1.5); }
  }
  /* an offset kept inside a quarter-ellipse per quadrant: room = [right, left, down, up] */
  function inRoom(dx, dy, room) {
    dx = clamp(dx, -room[1], room[0]); dy = clamp(dy, -room[3], room[2]);
    const ax = Math.max(dx >= 0 ? room[0] : room[1], 1e-3), ay = Math.max(dy >= 0 ? room[2] : room[3], 1e-3);
    const q = (dx / ax) * (dx / ax) + (dy / ay) * (dy / ay);
    return q > 1 ? [dx / Math.sqrt(q), dy / Math.sqrt(q)] : [dx, dy];
  }
  /* slots that show only with certain drawings of another slot (showWith) */
  function follow(c, S) {
    for (const sl of c.slots) if (sl.showWith) S[sl.i] = sl.showWith.drawings.includes(S[sl.showWith.ref]) ? sl.att : null;
  }
  /* drawings chosen by a bone's angle (def.swaps): either drawing of the pair, by how far the bone has turned from
     rest; `on` keeps a live rig from flickering at the threshold */
  function swapByAngle(c, chans, S, on) {
    c.swaps.forEach((w, k) => {
      if (S[w.slot] !== w.from && S[w.slot] !== w.to) return;
      const sw = Math.abs(chans[w.bone].r) >= (on && on[k] ? w.deg - 3 : w.deg);
      if (on) on[k] = sw;
      S[w.slot] = sw ? w.to : w.from;
    });
  }

  /* Rig.svg(def, spec, {size, style, cls, debug}) -> static SVG string */
  function svg(def, spec, opts = {}) {
    const { c, d, W, A } = staticFrame(def, spec);
    const vb = opts.view || def.view;
    const order = c.slots.slice().sort((a, b) => d.z[a.i] - d.z[b.i] || a.i - b.i);
    let s = '<svg xmlns="' + NS + '" class="rig rig-' + def.id + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + vb.join(' ') + '" style="--rig-lw:' + f3(lineWidth(def, opts.size, vb)) + '"' + (opts.size ? ' width="' + opts.size + '" height="' + Math.round(opts.size * vb[3] / vb[2]) + '"' : '') + ' aria-hidden="true">';
    if (opts.style !== false) s += '<style>' + css(def) + '</style>';
    for (const sl of order){
      const att = d.s[sl.i];
      if (att == null || !sl.parts[att]) continue;
      const a = A[sl.bone];
      if (a <= 0.001) continue;
      s += '<g data-s="' + sl.id + '" transform="' + mstr(W[sl.bone]) + '"' + (a < 0.999 ? ' opacity="' + f3(a) + '"' : '') + '>' + sl.parts[att] + '</g>';
    }
    if (opts.debug) s += skeletonMarkup(c, W);
    return s + '</svg>';
  }
  function skeletonMarkup(c, W) {
    let s = '<g class="rig-bones" style="pointer-events:none">';
    for (const b of c.bones){
      const p = app(W[b.i], b.x, b.y);
      if (b.parent >= 0){ const q = app(W[b.parent], c.bones[b.parent].x, c.bones[b.parent].y); s += '<path d="M' + f3(q[0]) + ' ' + f3(q[1]) + 'L' + f3(p[0]) + ' ' + f3(p[1]) + '" stroke="#E8412C" stroke-width="1.2" stroke-dasharray="3 2" opacity=".8"/>'; }
      s += '<circle cx="' + f3(p[0]) + '" cy="' + f3(p[1]) + '" r="2.6" fill="#fff" stroke="#E8412C" stroke-width="1.4"/>';
    }
    return s + '</g>';
  }
  /* Every drawing, for part sheets: [{slot, name, bone, pivot:[x,y], markup}] */
  function parts(def) {
    const c = compile(def), out = [];
    for (const sl of c.slots) for (const name in sl.parts){ const b = c.bones[sl.bone]; out.push({ slot: sl.id, name, bone: b.id, pivot: [b.x, b.y], markup: sl.parts[name] }); }
    return out;
  }

  /* ----- live instances ----- */
  const live = new Set(), made = new Set();
  let raf = 0, lastT = 0, swept = 0;
  function tick(now) {
    raf = 0;
    const t = now / 1000, dt = lastT ? Math.min(t - lastT, 0.1) : 1 / 60;
    lastT = t;
    for (const r of live) r._frame(t, dt);
    if (t - swept > 4){ swept = t; sweep(); }
    if (live.size) raf = requestAnimationFrame(tick); else lastT = 0;
  }
  /* a rig whose element has left the page lets go of its observer, so screens that redraw often don't pile them up;
     it picks up again if its element comes back */
  function sweep() {
    for (const r of made) if (!r.el.isConnected){ made.delete(r); live.delete(r); if (io) io.unobserve(r.el); r._gone = true; }
  }
  const wake = () => { if (!raf && live.size && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick); };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { for (const e of es){ const r = e.target._rig; if (r){ r._visible = e.isIntersecting; r._sync(); } } }) : null;

  /* Viseme script from text: vowels open the beak, m/b/p close it, the rest give a small opening. */
  function visemes(def, text, rate) {
    const V = def.visemes || {}, out = [];
    const per = 1 / (13 * (rate || 1));
    let t = 0, prev = null;
    for (const ch of String(text).toLowerCase()){
      let v;
      if ('aáàâä'.includes(ch)) v = V.a; else if ('eéèêiíïy'.includes(ch)) v = V.e; else if ('oóòôöuúùûü'.includes(ch)) v = V.o;
      else if ('mbp'.includes(ch)) v = V.m; else if ('fvw'.includes(ch)) v = V.f; else if (/[\s]/.test(ch)) v = V.rest; else if (/[.,!?¡¿;:…]/.test(ch)){ out.push([t, V.rest]); t += per * 3; prev = V.rest; continue; } else v = V.c || V.e;
      if (v !== prev) out.push([t, v]);
      prev = v; t += per;
    }
    out.push([t, V.rest]);
    return { keys: out, dur: t + 0.05 };
  }

  function create(def, opts = {}) {
    const c = compile(def);
    injectCSS(def);
    const vb = opts.view || def.view;
    sweep();
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', vb.join(' '));
    el.setAttribute('class', 'rig rig-' + def.id + (opts.cls ? ' ' + opts.cls : ''));
    el.setAttribute('aria-hidden', 'true');
    if (opts.size){ el.setAttribute('width', opts.size); el.setAttribute('height', Math.round(opts.size * vb[3] / vb[2])); }
    el.style.setProperty('--rig-lw', f3(lineWidth(def, opts.size, vb)));
    let html = '<g class="rig-slots">';
    for (const sl of c.slots){
      html += '<g data-s="' + sl.id + '">';
      for (const name in sl.parts) html += '<g data-a="' + name + '" style="display:none">' + sl.parts[name] + '</g>';
      html += '</g>';
    }
    el.innerHTML = html + '</g><g class="rig-debug"></g>';
    const slotsG = el.firstChild, debugG = el.lastChild;
    const sEls = Array.from(slotsG.children);
    const aEls = sEls.map(g => { const m = {}; for (const k of g.children) m[k.getAttribute('data-a')] = k; return m; });
    const last = { tr: [], att: [], op: [], order: '' };

    const R = {
      el, def, _visible: true, _running: opts.autoplay !== false,
      time: 0, mood: null, debug: !!opts.debug, speed: opts.speed || 1,
      override: { bones: {}, params: {}, slots: {} },
      onEvent: null
    };
    let from = dense(c, def, resolve(def, def.restMood || {})), to = from, b0 = 0, bdur = 0, bease = EASE.out, switchAt = 0.3;
    let moodClip = null;   // the clip the current mood started (R.set), which ends with the mood
    let clips = [], blinkAt = 1.5 + Math.random() * 2, blinkT = -1, glanceAt = 2.5 + Math.random() * 3, glance = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    let hz = 0, talk = null, babble = false, babbleNext = 0, babbleV = null, lookTarget = null, cur = null;
    const springs = c.springs.map(s => Object.assign({}, s));
    const swapOn = c.swaps.map(() => false);

    function baseNow(t) {
      const w = bdur > 0 ? bease(clamp((t - b0) / bdur, 0, 1)) : 1;
      const b = to.b.map((o, i) => { const f = from.b[i], r = {}; for (const k of CH) r[k] = lerp(f[k], o[k], w); return r; });
      const p = {}; for (const k of PARAMS) p[k] = lerp(from.p[k], to.p[k], w);
      p.bodyTurnSet = to.p.bodyTurnSet || from.p.bodyTurnSet;
      if (p.bodyTurnSet){ const kb = def.turn && def.turn.body != null ? def.turn.body : 0.6; const fb = from.p.bodyTurnSet ? from.p.bodyTurn : from.p.turn * kb, tb = to.p.bodyTurnSet ? to.p.bodyTurn : to.p.turn * kb; p.bodyTurn = lerp(fb, tb, w); }
      const s = w >= switchAt ? to.s.slice() : from.s.slice();
      const z = w >= 0.5 ? to.z : from.z;
      return { b, p, s, z, w };
    }

    R.set = function (spec, o = {}) {
      const target = resolve(def, spec);
      const nd = dense(c, def, target);
      const t = R.time;
      const nowB = cur || baseNow(t);
      from = { b: nowB.b, p: nowB.p, s: nowB.s, z: nowB.z, idle: to.idle, glance: to.glance, blink: to.blink };
      if (nowB.p.bodyTurnSet === undefined) from.p.bodyTurnSet = false;
      to = nd;
      const rm = reduced();
      bdur = o.dur != null ? o.dur : target.dur != null ? target.dur : 0.32;
      if (rm) bdur = Math.min(bdur, 0.12);
      bease = EASE[o.ease || target.ease || 'back'] || EASE.back;
      switchAt = o.switchAt != null ? o.switchAt : 0.28;
      b0 = t;
      if (typeof spec === 'string'){
        R.mood = spec;
        const m = def.moods && def.moods[spec];
        /* a mood's clip lasts as long as the mood: the wave that greets you must not go on swinging a wing once the bird is
           happy again (a looping clip never ends by itself) */
        const next = m && m.clip && o.clip !== false ? m.clip : null;
        if (moodClip && moodClip !== next) R.stop(moodClip);
        moodClip = next;
        if (next) R.play(next, { then: m.then });
      }
      if (!R._running) R.render();
      return R;
    };
    R.play = function (name, o = {}) {
      const clip = typeof name === 'string' ? def.clips[name] : name;
      if (!clip) return R;
      if (o.restart !== false) clips = clips.filter(k => k.clip !== clip);
      clips.push({ clip, name: typeof name === 'string' ? name : 'clip', t0: R.time, loop: o.loop != null ? o.loop : !!clip.loop, stopAt: 0, then: o.then || clip.then, speed: o.speed || 1 });
      R._sync();
      return R;
    };
    R.stop = function (name) {
      for (const k of clips) if (!name || k.name === name) k.stopAt = R.time;
      return R;
    };
    R.playing = name => clips.some(k => k.name === name && !k.stopAt);
    R.hop = () => R.play(def.hopClip || 'hop');
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
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
      return R.look((clientX - cx) / (r.width * 0.9), (clientY - cy) / (r.height * 0.7));
    };
    R.pause = () => { R._running = false; R._sync(); return R; };
    R.resume = () => { R._running = true; R._sync(); return R; };
    R.destroy = () => { live.delete(R); made.delete(R); if (io) io.unobserve(el); };
    R.setDebug = on => { R.debug = !!on; if (!on) debugG.innerHTML = ''; if (!R._running) R.render(); return R; };
    R.snapshot = function () {
      const b = cur || baseNow(R.time), out = { bones: {}, params: {}, slots: {} };
      c.bones.forEach((bo, i) => { const o = {}; let any = false; for (const k of CH){ const v = b.b[i][k]; if (Math.abs(v - REST[k]) > 0.005){ o[k] = Math.round(v * 100) / 100; any = true; } } if (any) out.bones[bo.id] = o; });
      for (const k of ['turn', 'lookX', 'lookY']) if (Math.abs(b.p[k]) > 0.005) out.params[k] = Math.round(b.p[k] * 100) / 100;
      c.slots.forEach((sl, i) => { if (b.s[i] !== sl.att) out.slots[sl.id] = b.s[i]; });
      return out;
    };
    R._sync = function () {
      if (R._gone && el.isConnected){ R._gone = false; made.add(R); if (io) io.observe(el); }
      const on = R._running && R._visible;
      if (on && !live.has(R)){ live.add(R); wake(); }
      else if (!on && live.has(R)) live.delete(R);
    };

    /* one frame: base pose → clips → idle → look → overrides → drivers → world → DOM */
    R._frame = function (t, dt) {
      if (!el.isConnected){ if (io) live.delete(R); return; }   // the observer wakes it again once it's back on screen
      dt *= R.speed;
      R.time += dt;
      R.render(dt);
    };
    R.render = function (dt = 0) {
      const t = R.time, rm = reduced();
      const base = baseNow(t);
      cur = base;
      const chans = base.b.map(o => Object.assign({}, o));
      const P = Object.assign({}, base.p);
      const S = base.s.slice();
      const idle = to.idle || {};
      // clips
      const keep = [];
      for (const k of clips){
        const cl = k.clip, dur = cl.dur || 1;
        let lt = (t - k.t0) * k.speed;
        let done = false;
        if (k.loop) lt = lt % dur; else if (lt >= dur){ lt = dur; done = true; }
        let w = Math.min(1, (t - k.t0) / (cl.fadeIn || 0.06));
        if (k.stopAt){ const f = 1 - (t - k.stopAt) / (cl.fadeOut || 0.18); if (f <= 0) done = true; w *= clamp(f, 0, 1); }
        if (rm && !cl.slotsOnly) w = 0;
        for (const key in cl.tracks){
          const keys = cl.tracks[key], dot = key.indexOf('.');
          const kind = key.slice(0, dot), name = key.slice(dot + 1);
          if (kind === 'slot'){ const sl = c.slotById[name]; if (sl && (!k.stopAt) && (!done || cl.holdSlots)) S[sl.i] = track(keys, lt); continue; }
          if (kind === 'param'){ P[name] = (P[name] || 0) + track(keys, lt) * w; continue; }
          const bo = c.byId[kind]; if (!bo || w <= 0) continue;
          const v = track(keys, lt);
          if (cl.abs) chans[bo.i][name] = lerp(chans[bo.i][name], v, w); else addCh(chans[bo.i], name, v, w);
        }
        if (done){ if (k.then && !k.stopAt) setTimeout(() => R.set(k.then), 0); if (R.onEvent) R.onEvent('end', k.name); }
        else keep.push(k);
      }
      clips = keep;
      // idle: breathing, a slow head drift, wing sway
      if (!rm && idle.amp !== 0){
        const amp = idle.amp == null ? 1 : idle.amp, en = idle.energy || 1, ph = t * en * TAU;
        const I = def.idle || {};
        for (const id in I){
          const bo = c.byId[id]; if (!bo) continue;
          for (const ch in I[id]){ const [a, period, off] = I[id][ch]; const v = a * amp * Math.sin(ph / period + (off || 0)); if (MULT[ch]) chans[bo.i][ch] *= 1 + v; else chans[bo.i][ch] += v; }
        }
      }
      // glances: a quick look somewhere, then back
      if (!rm && to.glance && !lookTarget){
        if (t > glanceAt){ glance.tx = (Math.random() * 2 - 1) * 0.55; glance.ty = (Math.random() * 2 - 1) * 0.35; glance.until = t + 0.7 + Math.random() * 1.1; glanceAt = glance.until + 2.2 + Math.random() * 4; }
        if (t > glance.until){ glance.tx = 0; glance.ty = 0; }
      } else { glance.tx = 0; glance.ty = 0; }
      const gk = Math.min(1, dt * 9);
      glance.x += ((lookTarget ? lookTarget.x : glance.tx) - glance.x) * gk;
      glance.y += ((lookTarget ? lookTarget.y : glance.ty) - glance.y) * gk;
      const F = P.facing < 0 ? -1 : 1;   // a look is on screen; lookX, turn and the head's tilt follow the bird
      P.lookX = clamp(P.lookX + glance.x * F, -1, 1); P.lookY = clamp(P.lookY + glance.y, -1, 1);
      if (lookTarget && def.look && def.look.head){ const hb = c.byId[def.look.head]; if (hb) chans[hb.i].r += glance.x * F * (def.look.headR || 3); P.turn += glance.x * F * (def.look.turn || 0.2); }
      // the head holds level against a turned screen; it eases toward the level rather than snapping
      const hb = def.look && def.look.head && c.byId[def.look.head];
      if (hb){
        hz += ((rm ? 0 : clamp(horizon, -HORIZON_MAX, HORIZON_MAX)) - hz) * Math.min(1, dt * 7);
        if (Math.abs(hz) > 0.02) chans[hb.i].r += hz;
      }
      // overrides from puppet controls (absolute)
      const O = R.override;
      for (const id in O.bones){ const bo = c.byId[id]; if (bo) Object.assign(chans[bo.i], O.bones[id]); }
      for (const k in O.params) P[k] = O.params[k];
      for (const id in O.slots){ const sl = c.slotById[id]; if (sl) S[sl.i] = O.slots[id]; }
      // blink: squash the pupils, swap to the closed drawing at the bottom of the blink
      if (to.blink && blinkT < 0 && t > blinkAt){ blinkT = t; blinkAt = t + 2.2 + Math.random() * 3.8 + (Math.random() < 0.2 ? -1.9 : 0); }
      if (blinkT >= 0){
        const u = (t - blinkT) / 0.17;
        if (u >= 1) blinkT = -1;
        else {
          const k = u < 0.4 ? 1 - u / 0.4 : (u - 0.4) / 0.6;
          for (const sl of c.slots){
            if (!sl.blink || !sl.blink.from.includes(S[sl.i])) continue;
            if (k < 0.35) S[sl.i] = sl.blink.to; else { const bo = chans[sl.bone]; bo.sy *= 0.2 + 0.8 * k; }
          }
        }
      }
      // talking: viseme script or babble
      const mouth = def.mouth && c.slotById[def.mouth.slot];
      let mv = null;
      if (talk){
        const lt = t - talk.t0;
        if (lt >= talk.dur){ const d = talk.done; talk = null; if (d) d(); }
        else if (lt >= 0) mv = track(talk.keys, lt);
      } else if (babble){
        if (t >= babbleNext){ const V = def.visemes; const pool = [V.a, V.e, V.o, V.e, V.m, V.a, V.rest]; babbleV = pool[Math.floor(Math.random() * pool.length)]; babbleNext = t + 0.07 + Math.random() * 0.09; }
        mv = babbleV;
      }
      if (mouth && mv != null){
        S[mouth.i] = mv;
        const M = def.mouth;
        if (M.beak){ const bs = c.slotById[M.beak.slot]; if (bs) S[bs.i] = M.beak.open.includes(mv) ? M.beak.openAtt : M.beak.closedAtt; }
        if (M.jaw){ const jb = c.byId[M.jaw.bone]; if (jb && M.jaw.drop[mv]) chans[jb.i].y += M.jaw.drop[mv]; }
      }
      swapByAngle(c, chans, S, swapOn);
      follow(c, S);
      drivers(c, def, chans, P);
      applyLook(c, def, chans, P);
      const { W, A } = world(c, chans, rm ? null : springs, dt, !rm);
      // DOM
      const order = c.slots.map(s => s.i).sort((a, b) => base.z[a] - base.z[b] || a - b);
      const ok = order.join(',');
      if (ok !== last.order){ for (const i of order) slotsG.appendChild(sEls[i]); last.order = ok; }
      for (const sl of c.slots){
        const i = sl.i, g = sEls[i], att = S[i];
        if (att !== last.att[i]){
          const prev = aEls[i][last.att[i]]; if (prev) prev.style.display = 'none';
          const nx = aEls[i][att]; if (nx) nx.style.display = '';
          last.att[i] = att;
        }
        if (att == null || !aEls[i][att]) continue;
        const tr = mstr(W[sl.bone]);
        if (tr !== last.tr[i]){ g.setAttribute('transform', tr); last.tr[i] = tr; }
        const op = A[sl.bone], os = op < 0.999 ? f3(Math.max(0, op)) : '';
        if (os !== last.op[i]){ if (os) g.setAttribute('opacity', os); else g.removeAttribute('opacity'); last.op[i] = os; }
      }
      if (R.debug) debugG.innerHTML = skeletonMarkup(c, W);
      R.frame = { chans, P, S, W };
    };

    el._rig = R;
    made.add(R);
    if (io) io.observe(el);
    /* sized by CSS: keep the line weight right for whatever size it lands at */
    if (!opts.size && typeof ResizeObserver === 'function'){
      new ResizeObserver(() => { const w = el.getBoundingClientRect().width; if (w) el.style.setProperty('--rig-lw', f3(lineWidth(def, w, vb))); }).observe(el);
    }
    R.set(opts.mood || def.restMood || 'happy', { dur: 0, clip: opts.intro !== false });
    if (opts.look) R.look(opts.look[0], opts.look[1]);
    R.render(0);
    R._sync();
    return R;
  }

  /* Checks a definition for mistakes a person would make editing it by hand. Returns a list of problems. */
  function validate(def) {
    const errs = [];
    let c;
    try { c = compile(def); } catch (e){ return [e.message]; }
    const checkPose = (where, p) => {
      if (!p) return;
      for (const id in p.bones || {}){ if (!c.byId[id]) errs.push(where + ': no bone ' + id); else for (const k in p.bones[id]) if (!CH.includes(k)) errs.push(where + ': bad channel ' + id + '.' + k); }
      for (const id in p.slots || {}){ const sl = c.slotById[id]; if (!sl) errs.push(where + ': no slot ' + id); else if (p.slots[id] != null && !sl.parts[p.slots[id]]) errs.push(where + ': slot ' + id + ' has no drawing ' + p.slots[id]); }
      for (const k in p.params || {}) if (!PARAMS.includes(k)) errs.push(where + ': bad param ' + k);
      for (const id in p.z || {}) if (!c.slotById[id]) errs.push(where + ': z on missing slot ' + id);
      if (p.use && !def.poses[p.use]) errs.push(where + ': uses missing pose ' + p.use);
    };
    for (const k in def.poses || {}) checkPose('pose ' + k, def.poses[k]);
    for (const k in def.faces || {}) checkPose('face ' + k, def.faces[k]);
    for (const k in def.moods || {}){ const m = def.moods[k]; if (m.pose && !def.poses[m.pose]) errs.push('mood ' + k + ': no pose ' + m.pose); if (m.face && !def.faces[m.face]) errs.push('mood ' + k + ': no face ' + m.face); if (m.clip && !def.clips[m.clip]) errs.push('mood ' + k + ': no clip ' + m.clip); checkPose('mood ' + k, m); }
    for (const k in def.clips || {}){
      for (const key in def.clips[k].tracks){
        const dot = key.indexOf('.'), kind = key.slice(0, dot), name = key.slice(dot + 1), keys = def.clips[k].tracks[key];
        if (kind === 'slot'){ const sl = c.slotById[name]; if (!sl) errs.push('clip ' + k + ': no slot ' + name); else keys.forEach(kk => { if (kk[1] != null && !sl.parts[kk[1]]) errs.push('clip ' + k + ': slot ' + name + ' has no drawing ' + kk[1]); }); }
        else if (kind === 'param'){ if (!PARAMS.includes(name)) errs.push('clip ' + k + ': bad param ' + name); }
        else if (!c.byId[kind]) errs.push('clip ' + k + ': no bone ' + kind);
        else if (!CH.includes(name)) errs.push('clip ' + k + ': bad channel ' + key);
        for (let i = 1; i < keys.length; i++) if (keys[i][0] < keys[i - 1][0]) errs.push('clip ' + k + ': keys out of order in ' + key);
      }
    }
    for (const sl of c.slots) if (sl.att != null && !sl.parts[sl.att]) errs.push('slot ' + sl.id + ': default drawing ' + sl.att + ' is missing');
    for (const w of def.swaps || []){ const sl = c.slotById[w.slot]; for (const a of [w.from, w.to]) if (sl && !sl.parts[a]) errs.push('swap on ' + w.slot + ': no drawing ' + a); }
    const Mi = def.mirror || {};
    for (const id of [Mi.facing, Mi.head].concat(Mi.upright || [])) if (id && !c.byId[id]) errs.push('mirror: no bone ' + id);
    const V = def.visemes || {}, ms = def.mouth && c.slotById[def.mouth.slot];
    if (ms) for (const k in V) if (V[k] != null && !ms.parts[V[k]]) errs.push('viseme ' + k + ': mouth has no drawing ' + V[k]);
    return errs;
  }

  return { create, setHorizon: d => { horizon = Number.isFinite(d) ? d : 0; }, svg, parts, validate, resolve, compile, css, lineWidth, EASE, staticFrame, inRoom, version: '1.0.0' };
})();
if (typeof module !== 'undefined') module.exports = Rig;
