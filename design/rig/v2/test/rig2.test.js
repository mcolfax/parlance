#!/usr/bin/env node
/* Tests for js/core/rig2.js, the pure math and the SVG still renderer (no canvas needed).
   node design/rig/v2/test/rig2.test.js          ends with "ok", or FAIL and exit code 1
   Plain Node. jsdom (already a dev dependency) is used only to parse the SVG that Rig2.svg writes. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..', '..');
const BIRD_JSON = path.join(ROOT, 'media', 'birds', 'pip.json');
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL:', msg); } };

if (!fs.existsSync(BIRD_JSON)) {
  console.log('FAIL: media/birds/pip.json is missing. Make it with: python3 design/rig/v2/tools/export.py <pip.blend> media/birds/pip.json (design/rig/v2/tools/README.md)');
  process.exit(1);
}
const Rig2 = require(path.join(ROOT, 'js', 'core', 'rig2.js'));
const m = Rig2._m;
const raw = JSON.parse(fs.readFileSync(BIRD_JSON, 'utf8'));
const def = Rig2.prep(raw);

/* ---- the file and its checks ---- */
{
  const errs = Rig2.validate(def);
  ok(errs.length === 0, 'Rig2.validate(pip) finds no problems: ' + errs.slice(0, 3).join(' | '));
  ok(def.nb === raw.bones.length && Object.keys(def.actions).length === Object.keys(raw.actions).length, 'prep keeps every bone and action');
  let worst = 0, n = 0;
  for (const k in def.drawings) { const D = def.drawings[k]; for (let j = 0; j < D.n; j++) { worst = Math.max(worst, Math.abs(D.sw[3 * j] + D.sw[3 * j + 1] + D.sw[3 * j + 2] - 1)); n++; } }
  ok(n > 5000 && worst < 0.002, 'weights sum to 1 on every point (' + n + ' points, worst ' + worst.toExponential(1) + ')');
  ok(Object.keys(def.drawings).some(k => def.drawings[k].rigid >= 0) && Object.keys(def.drawings).some(k => def.drawings[k].n && def.drawings[k].rigid < 0), 'rigid and deforming drawings are told apart');
  /* the bind matrices in the file undo the rest matrices (the runtime computes its own, exactly) */
  let wi = 0;
  raw.bones.forEach((b, i) => { const B = [Math.cos((b.rot || 0) * Math.PI / 180), Math.sin((b.rot || 0) * Math.PI / 180), 0, 0, b.x, b.y]; B[2] = -B[1]; B[3] = B[0]; const p = m.mul(b.inv, B); wi = Math.max(wi, Math.abs(p[0] - 1), Math.abs(p[1]), Math.abs(p[2]), Math.abs(p[3] - 1), Math.abs(p[4]), Math.abs(p[5])); });
  ok(wi < 0.02, 'the file\'s inverse bind matrices agree with the runtime\'s (worst ' + wi.toFixed(4) + ')');
}

/* ---- curves against Blender's own samples (golden) ---- */
{
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'pip-golden.json'), 'utf8'));
  let worst = 0, count = 0;
  for (const name in g.actions) {
    const A = def.actions[name], G = g.actions[name];
    ok(!!A && Math.abs(A.dur - G.dur) < 1e-3, 'golden: action ' + name + ' exists with the same length');
    if (!A) continue;
    for (const cname in G.curves) {
      const dot = cname.lastIndexOf('.'), ci = ['x', 'y', 'r', 'sx', 'sy'].indexOf(cname.slice(dot + 1));
      const bi = def.byId[cname.slice(0, dot)];
      const tg = cname.startsWith('ctl_') ? def.nb * 5 + (cname.slice(4, dot) === 'facing' ? 0 : 1) : 5 * bi + ci;
      const c = A.curves.find(q => q.tg === tg);
      if (!c) { ok(false, 'golden: curve ' + name + ' ' + cname + ' is in the prepared action'); continue; }
      G.curves[cname].forEach((v, i) => { const e = Math.abs(m.curveAt(c, G.dur * i / (g.samples - 1)) - v); worst = Math.max(worst, e); count++; });
    }
  }
  ok(count > 9000, 'golden: ' + count + ' samples compared');
  ok(worst <= 0.01, 'golden: every curve matches Blender to 0.01 (worst ' + worst.toFixed(4) + ')');
  /* handles and the hold flag, on a made-up curve: a step holds, a bezier with flat handles eases */
  const step = m.makeCurve([[0, 0, 0, 0, 0, 0, 1], [1, 10, 1, 10, 1, 10]]);
  ok(m.curveAt(step, 0.5) === 0 && m.curveAt(step, 1) === 10 && m.curveAt(step, -1) === 0 && m.curveAt(step, 9) === 10, 'curves: a held key steps, and the ends hold');
  const ease = m.makeCurve([[0, 0, 0, 0, 0.5, 0], [1, 10, 0.5, 10, 1, 10]]);
  ok(Math.abs(m.curveAt(ease, 0.5) - 5) < 1e-6 && m.curveAt(ease, 0.1) < 1 && m.curveAt(ease, 0.9) > 9, 'curves: flat handles ease in and out');
  ok(m.curveAt(m.makeCurve([[0, 3, 0, 3, 0, 3]]), 5) === 3, 'curves: one key is a constant');
  const zero = m.makeCurve([[0, 1, 0, 1, 0, 1], [0, 2, 0, 2, 0, 2], [1, 3, 1, 3, 1, 3]]);
  ok(Number.isFinite(m.curveAt(zero, 0)) && Number.isFinite(m.curveAt(zero, 0.5)), 'curves: two keys at the same time do not divide by zero');
}

/* ---- skinning ---- */
{
  /* a bird with a root, an arm pivoting at (100, 100), and a chain bone `fore` that points right (rot 90) from (100, 150) */
  const demo = Rig2.prep({
    format: 'parlance-rig2', v: 1, id: 'demo', name: 'Demo', fps: 30, view: [0, 0, 240, 260], lines: {}, roles: ['body'],
    bones: [{ id: 'root', parent: null, x: 120, y: 250 }, { id: 'arm', parent: 'root', x: 100, y: 100 }, { id: 'wing', parent: 'root', x: 100, y: 150 }, { id: 'fore', parent: 'wing', x: 100, y: 150, rot: 90, len: 40 }],
    slots: [{ id: 'arm', bone: 'arm', rest: 'a', drawings: ['a'] }],
    drawings: { 'arm/a': { pts: [110, 100, 130, 100, 130, 110, 110, 110], skin: [[1, 1], [1, 1], [3, 0.5, 2, 0.5], [3, 1]], loops: [[0, 4]], layers: [{ fill: 'body', loops: [0] }] } },
    actions: { 'mood:happy': { dur: 1, loop: false, add: false, curves: { 'arm.r': [[0, 90, 0, 90, 0, 90]], 'wing.r': [[0, 30, 0, 30, 0, 30]], 'fore.r': [[0, 0, 0, 0, 0, 0]] }, swaps: [], order: [] } },
    fx: {}, procedural: {}
  });
  const D = demo.drawings['arm/a'], out = new Float64Array(8);
  const run = (chs) => {
    const ps = m.newPS(demo), M = new Float64Array(24), K = new Float64Array(24);
    m.evalMood(demo, demo.actions['mood:happy'], 0, ps);
    for (const k in chs) ps.ch[k] = chs[k];
    m.world(demo, ps.ch, M, K, null, 0, false);
    return K;
  };
  const near = (a, b, msg) => ok(Math.abs(a - b) < 1e-9, msg + ' (' + a + ' vs ' + b + ')');
  /* arm.r 90 turns (110, 100) a quarter turn clockwise about its pivot (100, 100): to (100, 110) */
  let K = run({});
  m.skinInto(D, K, out, null);
  near(out[0], 100, 'skin: a point weighted 1.0 to a bone turned 90 degrees clockwise about its pivot lands at x'); near(out[1], 110, 'skin: ... and y');
  near(out[2], 100, 'skin: (130, 100) goes to x 100'); near(out[3], 130, 'skin: ... y 130');
  /* the weight-0.5 point follows the half of `wing` and half of `fore`: both turn 30 degrees about (100, 150): same place */
  const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6), px = 130 - 100, py = 110 - 150;
  near(out[4], 100 + c30 * px - s30 * py, 'skin: a half-and-half point turns with its two bones (x)'); near(out[5], 150 + s30 * px + c30 * py, 'skin: ... (y)');
  /* a chain bone's own turn is in its frame: fore.r 90 adds a quarter turn to the wing's 30 degrees, about the same head */
  K = run({ [5 * 3 + 2]: 90 });
  m.skinInto(D, K, out, null);
  const c120 = Math.cos(2 * Math.PI / 3), s120 = Math.sin(2 * Math.PI / 3), qx = 110 - 100, qy = 110 - 150;
  near(out[6], 100 + c120 * qx - s120 * qy, 'skin: weight 1.0 on a chain bone turned 90 degrees under a parent turned 30 (x)'); near(out[7], 150 + s120 * qx + c120 * qy, 'skin: ... (y)');
  /* blend shapes are added before skinning: a shift along x by 2.5 shows, after the arm's quarter turn, as a shift along y */
  K = run({});
  m.skinInto(D, K, out, null);
  const a0 = Float64Array.from(out);
  m.skinInto(D, K, out, [{ d: Float64Array.from([0, 5, 0]), w: 0.5 }]);
  near(out[0] - a0[0], 0, 'skin: a blend shape is added before the bones move it (x)'); near(out[1] - a0[1], 2.5, 'skin: ... (y, 5 x 0.5)');
  /* K is the product of rig.js local() matrices down the chain, for bones with rot 0 */
  const local = (b, c) => { const cs = Math.cos(c.r * Math.PI / 180), sn = Math.sin(c.r * Math.PI / 180), A = cs * c.sx, B = sn * c.sx, C = -sn * c.sy, Dd = cs * c.sy; return [A, B, C, Dd, b.x + c.x - (A * b.x + C * b.y), b.y + c.y - (B * b.x + Dd * b.y)]; };
  let worst = 0;
  const ps = m.newPS(def), M = new Float64Array(6 * def.nb), Kp = new Float64Array(6 * def.nb);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  m.evalMood(def, def.actions['mood:happy'], 0, ps);
  for (let i = 0; i < def.nb; i++) { const c = 5 * i; ps.ch[c] = (rnd() - 0.5) * 20; ps.ch[c + 1] = (rnd() - 0.5) * 20; ps.ch[c + 2] = (rnd() - 0.5) * 120; ps.ch[c + 3] = 0.7 + rnd() * 0.6; ps.ch[c + 4] = 0.7 + rnd() * 0.6; }
  m.world(def, ps.ch, M, Kp, null, 0, false);
  const flat = [1, 0, 0, 1, 0, 0], W = [];
  for (const b of def.bones) {
    if ((raw.bones[b.i].rot || 0) !== 0) { W[b.i] = null; continue; }
    const p = b.p >= 0 ? W[b.p] : flat;
    if (!p) { W[b.i] = null; continue; }
    const c = 5 * b.i; W[b.i] = m.mul(p, local(b, { x: ps.ch[c], y: ps.ch[c + 1], r: ps.ch[c + 2], sx: ps.ch[c + 3], sy: ps.ch[c + 4] }));
    for (let k = 0; k < 6; k++) worst = Math.max(worst, Math.abs(W[b.i][k] - Kp[6 * b.i + k]));
  }
  ok(W.filter(Boolean).length > 25 && worst < 1e-9, 'skinning matrix equals the product of rig.js local() matrices down the chain (' + W.filter(Boolean).length + ' bones, worst ' + worst.toExponential(1) + ')');
}

/* ---- the pose of every mood matches the old rig's ---- */
{
  global.Bird = require(path.join(ROOT, 'js', 'core', 'bird.js'));
  const Rig = require(path.join(ROOT, 'js', 'core', 'rig.js'));
  const PIP = require(path.join(ROOT, 'js', 'core', 'pip.js'));
  const c = Rig.compile(PIP);
  const moods = Object.keys(PIP.moods);
  ok(moods.every(k => def.actions['mood:' + k]), 'every mood of the old Pip is an action');
  let worst = 0, wm = '';
  for (const mood of moods) {
    const sf = Rig.staticFrame(PIP, mood), st = m.stillFrame(def, mood);
    let w = 0;
    for (const b of c.bones) {
      const i = def.byId[b.id], W = sf.W[b.i], o = 6 * i, K = st.K;
      w = Math.max(w, Math.hypot(W[0] * b.x + W[2] * b.y + W[4] - (K[o] * b.x + K[o + 2] * b.y + K[o + 4]), W[1] * b.x + W[3] * b.y + W[5] - (K[o + 1] * b.x + K[o + 3] * b.y + K[o + 5])));
    }
    const drawn = (Rig.svg(PIP, mood).match(/data-s="/g) || []).length, mine = st.ps.S.filter((nm, k) => nm != null && def.slots[k].D[nm] && def.slots[k].D[nm].layers.length).length;
    if (w > worst) { worst = w; wm = mood; }
    ok(w < 4, 'still of ' + mood + ': every bone within 4 units of the old rig (worst ' + w.toFixed(2) + ')');
    ok(Math.abs(drawn - mine) <= 2, 'still of ' + mood + ': about as many drawings shown as the old rig (' + mine + ' vs ' + drawn + ')');
  }
  console.log('  pose parity: worst bone distance ' + worst.toFixed(2) + ' units (' + wm + ')');
  /* the 2.5D turn as a difference: turning by d from a baked turn moves the bones as rig.js's drivers do */
  const T = Rig.staticFrame(PIP, { pose: 'stand', face: 'happy', params: { turn: 0.22 } }), T2 = Rig.staticFrame(PIP, { pose: 'stand', face: 'happy', params: { turn: 0.05 } });
  const ps = m.newPS(def), M = new Float64Array(6 * def.nb), K = new Float64Array(6 * def.nb), s2 = [new Float64Array(4 * def.nb), new Float64Array(4 * def.nb)];
  m.evalMood(def, def.actions['mood:happy'], 0, ps); m.turnDelta(def, 0.22, 0.05, ps.ch, s2); m.mirrors(def, ps.ch); m.world(def, ps.ch, M, K, null, 0, false);
  let wt = 0;
  for (const b of c.bones) { const i = def.byId[b.id], W = T2.W[b.i], o = 6 * i; wt = Math.max(wt, Math.hypot(W[0] * b.x + W[2] * b.y + W[4] - (K[o] * b.x + K[o + 2] * b.y + K[o + 4]), W[1] * b.x + W[3] * b.y + W[5] - (K[o + 1] * b.x + K[o + 3] * b.y + K[o + 5]))); }
  ok(wt < 0.5, 'a live turn from 0.22 to 0.05 over the baked mood matches rig.js turning to 0.05 (worst ' + wt.toFixed(3) + ' units)');
  const st = m.stillFrame(def, 'oops');
  ok(Math.abs(m.mirrorScale(-2) + 1) < 1e-9 && m.mirrorScale(0) === 1 && Math.abs(m.mirrorScale(-1)) >= 0.72 - 1e-9 && m.mirrorScale(-1.2) < 0 && m.mirrorScale(-0.8) > 0, 'mirror scale: sign of the control, never narrower than 0.72');
  ok(st.K[6 * def.byId.facing] < -0.99, 'oops faces the other way (the facing bone is mirrored)');
  ok(m.inRoom(50, 0, [2, 3, 4, 5])[0] === 2 && m.inRoom(-50, 0, [2, 3, 4, 5])[0] === -3, 'look room: a pupil stays inside its eye');
  const V = m.visemes(def, 'Ma', 1);
  ok(V.keys[0][1] === def.visemes.m && V.keys.some(k => k[1] === def.visemes.a) && V.keys[V.keys.length - 1][1] === def.visemes.rest, 'visemes: m closes the beak, a opens it, the line ends at rest');
}

/* ---- drawings: splines and ribbons ---- */
{
  const rec = () => { const s = { segs: [], moveTo(x, y) { s.m = [x, y]; }, bezierCurveTo(...a) { s.segs.push(a); }, closePath() { s.closed = true; } }; return s; };
  const sq = [0, 0, 10, 0, 10, 10, 0, 10], s = rec();
  m.trace(s, sq, 0, 4, new Uint8Array([1, 1, 1, 1]));
  ok(s.closed && s.segs.length === 4 && s.segs[0][4] === 10 && s.segs[0][5] === 0 && s.segs[3][4] === 0 && s.segs[3][5] === 0, 'trace: a closed loop of 4 segments that ends where it started');
  ok(Math.abs(s.segs[0][1]) < 1e-9 && Math.abs(s.segs[0][3]) < 1e-9, 'trace: corner points have straight tangents, so a square stays square');
  const r = rec(), circ = []; for (let i = 0; i < 24; i++) circ.push(50 + 20 * Math.cos(i / 24 * 2 * Math.PI), 50 + 20 * Math.sin(i / 24 * 2 * Math.PI));
  m.trace(r, circ, 0, 24, new Uint8Array(24));
  let dev = 0; for (let i = 0; i < 24; i++) { const sg = r.segs[i], t = 0.5, x = ((1 - t) ** 3) * (i ? r.segs[i - 1][4] : circ[0]) + 3 * ((1 - t) ** 2) * t * sg[0] + 3 * (1 - t) * t * t * sg[2] + t ** 3 * sg[4]; const y = ((1 - t) ** 3) * (i ? r.segs[i - 1][5] : circ[1]) + 3 * ((1 - t) ** 2) * t * sg[1] + 3 * (1 - t) * t * t * sg[3] + t ** 3 * sg[5]; dev = Math.max(dev, Math.abs(Math.hypot(x - 50, y - 50) - 20)); }
  ok(dev < 0.05, 'trace: the spline through 24 points of a circle of radius 20 stays within 0.05 of the circle (' + dev.toFixed(3) + ')');
  const rb = m.ribbon(sq, 0, 4, [2, 2, 2, 2], 1, true), area = lp => { let a = 0; for (let i = 0; i < lp.length / 2; i++) { const j = (i + 1) % (lp.length / 2); a += lp[2 * i] * lp[2 * j + 1] - lp[2 * j] * lp[2 * i + 1]; } return Math.abs(a / 2); };
  ok(rb.length === 2 && area(rb[0]) > 0 && area(rb[1]) > 0 && Math.abs(area(rb[0]) - area(rb[1])) > 1, 'ribbon: a closed outline gives an outer and an inner loop');
  const op = m.ribbon([0, 0, 10, 0, 20, 0], 0, 3, [0, 4, 0], 1, false);
  ok(op.length === 1 && op[0].length === 12 && Math.abs(Math.abs(op[0][3] - op[0][9]) - 4) < 1e-9, 'ribbon: a tapered open stroke is one polygon, 4 wide where w is 4 and pointed at the ends');
}

/* ---- thinning, bend and rest frames ---- */
{
  const hd = def.drawings['head/on'], th = m.thinned(hd, 2);
  ok(th !== hd && th.n < hd.n * 0.65 && th.n > hd.n * 0.4 && th.loops.length === hd.loops.length && th.layers.length === hd.layers.length && m.thinned(hd, 2) === th && m.thinned(hd, 1) === hd, 'thinned: every second point goes, once per drawing, and the loops and layers stay (' + hd.n + ' -> ' + th.n + ')');
  let cornersKept = true, k = 0; for (let j = 0; j < hd.n; j++) if (hd.corner[j]) { k++; let f = false; for (let q = 0; q < th.n; q++) if (th.corner[q] && th.pts[2 * q] === hd.pts[2 * j] && th.pts[2 * q + 1] === hd.pts[2 * j + 1]) f = true; if (!f) cornersKept = false; }
  ok(cornersKept && th.loops.every(l => l[1] >= 4), 'thinned: corners are kept, and no loop falls under 4 points (' + k + ' corners in the head)');
  const wing = def.drawings['wingL/folded'], tw = m.thinned(wing, 3);
  let sums = 0; for (let j = 0; j < tw.n; j++) sums = Math.max(sums, Math.abs(tw.sw[3 * j] + tw.sw[3 * j + 1] + tw.sw[3 * j + 2] - 1));
  ok(sums < 0.002 && tw.rigid === wing.rigid, 'thinned: a deforming drawing keeps its weights');
  const bent = m.stillFrame(def, 'love'), straight = m.stillFrame(def, 'love', null, { bend: 0 });
  ok(def.chain.length > 20 && def.chain.every(i => straight.ps.ch[5 * i + 2] === 0) && def.chain.some(i => bent.ps.ch[5 * i + 2] !== 0), 'bend: 0 straightens every chain bone (' + def.chain.length + ' chain bones), 1 plays the baked curl');
  ok(m.restTime(def.actions['mood:cheer']) === def.actions['mood:cheer'].dur && m.restTime(def.actions['mood:wave']) === 0, 'a still shows where a mood ends, and where a loop starts');
  ok(m.stillFrame(def, 'sleep').ps.ch[5 * def.byId.fxHead + 3] > 0.5, 'a still of sleep shows its zzz (an effect that fades inside a loop is taken where it is visible)');
}

/* ---- Rig2.svg: every mood parses and carries the role classes ---- */
{
  const { JSDOM } = require('jsdom');
  const parse = s => new (new JSDOM('').window.DOMParser)().parseFromString(s, 'image/svg+xml');
  const roles = new Set(def.roles), seen = new Set(), always = ['ink', 'body', 'belly', 'beak', 'face'];
  let bad = '';
  for (const k in def.actions) {
    if (!k.startsWith('mood:')) continue;
    const mood = k.slice(5), s = Rig2.svg(def, mood, { size: 72, style: false, cls: 'pip-svg' }), doc = parse(s);
    if (doc.querySelector('parsererror')) { bad += mood + ' does not parse; '; continue; }
    const svg = doc.documentElement, got = new Set([...doc.querySelectorAll('path')].map(p => p.getAttribute('class').replace(/^k-/, '')));
    got.forEach(r => seen.add(r));
    if (svg.tagName !== 'svg' || !/rig-pip/.test(svg.getAttribute('class')) || !/pip-svg/.test(svg.getAttribute('class')) || !svg.getAttribute('viewBox')) bad += mood + ' has no rig svg root; ';
    for (const r of got) if (!roles.has(r)) bad += mood + ' uses an unknown role ' + r + '; ';
    for (const r of always) if (!got.has(r)) bad += mood + ' misses role ' + r + '; ';
    for (const p of doc.querySelectorAll('path')) if (!/^M[-\d. C]+Z/.test(p.getAttribute('d').replace(/Z.*$/s, 'Z'))) { bad += mood + ' has a bad path; '; break; }
  }
  ok(!bad, 'Rig2.svg: every mood parses, uses known roles, and shows the always-there ones' + (bad ? ': ' + bad : ''));
  const missing = [...roles].filter(r => !seen.has(r));
  ok(missing.length === 0, 'Rig2.svg: across the moods every role class appears (missing: ' + missing.join(', ') + ')');
  const s72 = Rig2.svg(def, 'happy', { size: 72 }), s240 = Rig2.svg(def, 'happy', { size: 240 });
  ok(/<style>.*\.k-body\{fill:var\(--pip-body\)\}/.test(s72) && /--rig-lw:3\.\d/.test(s72) && /--rig-lw:2\.6/.test(s240), 'Rig2.svg: a style block with token colors, and outlines that weigh more when the bird is small');
  ok(/stroke-width:1\.\d+px/.test(s72) && !/stroke-width/.test(s240), 'Rig2.svg: ink carries the extra weight at 72 px and none at 240 px');
  const cheerEnd = Rig2.svg(def, 'cheer', { style: false }), cheerMid = Rig2.svg(def, 'cheer', { style: false, t: 0.5 });
  ok(cheerEnd !== cheerMid, 'Rig2.svg: opts.t picks another frame of the action');
  ok(Rig2.svg(def, 'nothing-like-this', { style: false }) === Rig2.svg(def, def.restMood, { style: false }), 'Rig2.svg: an unknown mood falls back to the rest mood');
  console.log('  svg size: happy at 72 px ' + (s72.length / 1024).toFixed(0) + ' KB');
}

if (fails) { console.log('FAIL ' + fails + ' (passed ' + passes + ')'); process.exit(1); }
console.log('passed ' + passes + ' checks');
console.log('ok');
