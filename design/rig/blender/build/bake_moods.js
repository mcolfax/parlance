/* Bake every mood (and the layered moves) of the SVG rig into sparse keyframes for Blender.
   Values are what the SVG rig shows: pose + face + move, with the 2.5D turn and the look offsets folded in.
   Usage: node bake_moods.js <dir with rig.js and pip.js, js/core> <out.json>
   Output: { moods: { name: { loop, dur, bones: { bone: { ch: [[t, v, ease], …] } }, slots: { slot: [[t, att]] }, depth: { slot: d } } },
             moves: { name: { loop, dur, bones: … } } }   (moves are offsets from rest, for layering on any mood) */
const path = require('path');
const [dir, out] = process.argv.slice(2);
const Rig = require(path.join(dir, 'rig.js'));
const def = require(path.join(dir, 'pip.js'));
const c = Rig.compile(def);
const EASE = Rig.EASE;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const MULT = { sx: 1, sy: 1, a: 1 };
const CH = ['x', 'y', 'r', 'sx', 'sy', 'a'];

function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t < k[0]) { const p = keys[i - 1]; if (typeof k[1] !== 'number') return p[1]; const u = (t - p[0]) / (k[0] - p[0]); return lerp(p[1], k[1], (EASE[k[2] || 'inOut'] || EASE.inOut)(u)); }
  }
  return keys[keys.length - 1][1];
}
/* the SVG rig's turn drivers and mirrors, from rig.js */
const Mi = def.mirror || {};
const CTL = [Mi.facing, Mi.head].filter(Boolean).map(id => 'ctl_' + id);   // control bones the bake adds
const headSign = turn => (turn < 0 && Mi.head ? -1 : 1);
const lim = (v, a, b) => clamp(v, a == null ? -9 : a, b == null ? 9 : b);
function drive(chans, params) {
  const T = def.turn, kb = T.body == null ? 0.6 : T.body, s0 = T.setup || 0, H = headSign(params.turn);
  const th = (lim(params.turn * H, T.max == null ? null : -T.max, T.max) - s0) * T.head;
  const thb = (lim(params.bodyTurnSet ? params.bodyTurn : params.turn * kb, T.bodyMin, T.bodyMax) - s0 * kb) * T.head;
  // mirrors go on control bones (ctl_facing, ctl_head: 0, or -2 for mirrored): Blender drivers and the player
  // mirror the bones from them, since a negative scale doesn't survive the glTF export
  if (Mi.facing) chans['ctl_' + Mi.facing].x = (params.facing < 0 ? -1 : 1) - 1;
  if (Mi.head) chans['ctl_' + Mi.head].x = H - 1;
  for (const b of c.bones) {
    const s = b.turn; if (!s) continue;
    const ch = chans[b.id], t = s.body ? thb : th, abs = t + (s.body ? s0 * kb : s0) * T.head;
    if (s.R) { const phi = s.phi || 0; ch.x += s.R * (Math.sin((phi + t) * DEG) - Math.sin(phi * DEG)); if (s.squash) ch.sx *= clamp(Math.cos((phi + t) * DEG) / Math.cos(phi * DEG), 0.35, 1.35); }
    if (s.near) { const k = 1 + s.near * (t / T.head); ch.sx *= k; ch.sy *= k; }
    if (s.wx) ch.sx *= clamp(1 + s.wx * (t / T.head), 0.4, 1.6);
    if (s.flip) { const k = clamp(abs / s.flip, -1, 1); ch.sx *= Math.abs(k) < 0.04 ? 0.04 * Math.sign(k || 1) : k; }
    if (s.dx) ch.x += s.dx * (t / T.head);
    if (s.rot) ch.r += s.rot * (t / T.head);
  }
  const L = def.look || {};
  for (const id of L.pupils || []) { const ch = chans[id]; ch.x += params.lookX * (L.x || 5) * H; ch.y += params.lookY * (L.y || 5); if (L.room && L.room[id]) [ch.x, ch.y] = Rig.inRoom(ch.x, ch.y, L.room[id]); }
  for (const id of L.brows || []) chans[id].y += params.lookY * (L.brow || 1.5);
  const sh = def.shadow;
  if (sh) { const fo = chans[sh.follow], ch = chans[sh.bone]; const lift = clamp(-fo.y / (sh.lift || 90), 0, 0.7); ch.x += fo.x; ch.sx *= 1 - lift * 0.6; ch.sy *= 1 - lift * 0.6; }
}
/* full evaluation of a resolved pose + clip at time t: bone channels, slots, params */
function evaluate(pose, clip, t, withPose = true) {
  const chans = {};
  for (const b of c.bones) chans[b.id] = Object.assign({ x: 0, y: 0, r: 0, sx: 1, sy: 1, a: 1 }, withPose ? pose.bones[b.id] || {} : {});
  for (const id of CTL) chans[id] = { x: 0, y: 0, r: 0, sx: 1, sy: 1, a: 1 };
  const params = {};
  const dflt = k => (k === 'facing' ? 1 : k === 'turn' && !withPose ? def.turn.setup : 0);
  for (const k of ['turn', 'bodyTurn', 'lookX', 'lookY', 'facing']) params[k] = pose.params[k] !== undefined ? pose.params[k] : withPose && def.rest && def.rest[k] != null ? def.rest[k] : dflt(k);
  params.bodyTurnSet = pose.params.bodyTurn !== undefined;
  const slots = Object.assign({}, pose.slots);
  if (clip) for (const key in clip.tracks) {
    const dot = key.indexOf('.'), kind = key.slice(0, dot), name = key.slice(dot + 1), v = track(clip.tracks[key], t);
    if (kind === 'slot') slots[name] = v;
    else if (kind === 'param') params[name] += v;
    else if (chans[kind]) { if (MULT[name]) chans[kind][name] *= v; else chans[kind][name] += v; }
  }
  // drawings chosen by a bone's angle (the far wing opens once it swings away), as the player does it
  for (const w of def.swaps || []) {
    const cur = slots[w.slot] !== undefined ? slots[w.slot] : c.slotById[w.slot].att;
    if (cur === w.from || cur === w.to) slots[w.slot] = Math.abs(chans[w.bone].r) >= w.deg ? w.to : w.from;
  }
  drive(chans, params);
  for (const id in chans) { const ch = chans[id]; if (ch.a !== 1) { ch.sx *= ch.a; ch.sy *= ch.a; } delete ch.a; }
  return { chans, slots, params };
}
/* key times for a channel: the times its value can change, plus the ease into each */
function keyTimes(clip) {
  const times = {}; // "bone.ch" or "*param" -> [[t, ease]]
  if (!clip) return times;
  for (const key in clip.tracks) times[key] = clip.tracks[key].map(k => [k[0], k[2] || 'inOut']);
  return times;
}
const DRIVEN = {};   // which channels a param moves
for (const b of c.bones) if (b.turn) { DRIVEN[b.id + '.x'] = 1; DRIVEN[b.id + '.sx'] = 1; DRIVEN[b.id + '.sy'] = 1; DRIVEN[b.id + '.r'] = 1; }
for (const id of (def.look.pupils || [])) { DRIVEN[id + '.x'] = 1; DRIVEN[id + '.y'] = 1; }
for (const id of (def.look.brows || [])) DRIVEN[id + '.y'] = 1;
DRIVEN['shadow.x'] = DRIVEN['shadow.sx'] = DRIVEN['shadow.sy'] = 1;
for (const id of CTL) DRIVEN[id + '.x'] = 1;

function bake(pose, clip, withPose) {
  const dur = clip ? clip.dur : 1;
  const kt = keyTimes(clip);
  const paramKeys = Object.keys(kt).filter(k => k.startsWith('param.')).flatMap(k => kt[k]);
  const rootKeys = Object.keys(kt).filter(k => k.startsWith('root.')).flatMap(k => kt[k]);
  const res = { loop: !!(clip && clip.loop), dur, bones: {}, slots: {} };
  const dense = []; for (let f = 1; f < Math.round(dur * 30); f++) dense.push([f / 30, 'linear']);
  const base = evaluate(pose, clip, 0, withPose);
  for (const b of c.bones.concat(CTL.map(id => ({ id })))) {
    for (const ch of ['x', 'y', 'r', 'sx', 'sy']) {
      const id = b.id + '.' + ch;
      let times = [[0, 'inOut']];
      if (kt[id]) times = kt[id].slice();
      if (kt[b.id + '.a'] && (ch === 'sx' || ch === 'sy')) times = times.concat(kt[b.id + '.a']);
      if (DRIVEN[id] && paramKeys.length) times = times.concat(paramKeys, dense);   // the drivers aren't linear: sample them every frame
      if (b.id === 'shadow' && rootKeys.length) times = times.concat(rootKeys);
      const seen = new Map();
      for (const [t, e] of times) if (!seen.has(t) || seen.get(t) === 'inOut') seen.set(t, e);
      const ts = [...seen.keys()].sort((a, b2) => a - b2);
      const keys = ts.map(t => [Math.round(t * 1000) / 1000, Math.round(evaluate(pose, clip, t, withPose).chans[b.id][ch] * 10000) / 10000, seen.get(t)]);
      const restv = MULT[ch] ? 1 : 0;
      const constant = keys.every(k => Math.abs(k[1] - keys[0][1]) < 1e-4);
      // (the mirror controls are always keyed, so opening any action in Blender sets them)
      if (constant && Math.abs(keys[0][1] - restv) < 1e-4 && !CTL.includes(b.id)) continue;
      (res.bones[b.id] = res.bones[b.id] || {})[ch] = constant ? [keys[0]] : keys;
    }
  }
  // which drawing each slot shows over time
  const slotTimes = new Set([0]);
  if (clip) for (const key in clip.tracks) if (key.startsWith('slot.')) clip.tracks[key].forEach(k => slotTimes.add(k[0]));
  if (clip) for (const w of def.swaps || []) (clip.tracks[w.bone + '.r'] || []).forEach(k => slotTimes.add(k[0]));
  for (const sl of c.slots) {
    const seq = [...slotTimes].sort((a, b2) => a - b2).map(t => [t, evaluate(pose, clip, t, withPose).slots[sl.id] !== undefined ? evaluate(pose, clip, t, withPose).slots[sl.id] : sl.att]);
    const comp = seq.filter((k, i) => i === 0 || k[1] !== seq[i - 1][1]);
    res.slots[sl.id] = comp;
  }
  return res;
}
const outData = { setupTurn: def.turn.setup, moods: {}, moves: {} };
for (const m of Object.keys(def.moods)) {
  const pose = Rig.resolve(def, m);
  const mood = def.moods[m];
  const clip = mood.clip ? def.clips[mood.clip] : null;
  const r = bake(pose, clip, true);
  r.clip = mood.clip || null;
  r.depth = pose.z || {};
  r.blink = pose.blink !== false; r.glance = pose.glance !== false;
  outData.moods[m] = r;
}
// layered moves: offsets from rest, played on top of any mood (tap to hop, nod, shake…)
const empty = { bones: {}, slots: {}, params: {}, z: {} };
for (const k of ['hop', 'nod', 'shake', 'bow', 'lookAround', 'wave', 'flap', 'dance', 'laugh', 'wobble', 'surprise']) {
  const clip = def.clips[k]; if (!clip) continue;
  const r = bake(empty, clip, false);
  delete r.slots;
  outData.moves[k] = r;
}
require('fs').writeFileSync(out, JSON.stringify(outData));
const n = o => Object.values(o).reduce((s, b) => s + Object.values(b).reduce((s2, k) => s2 + k.length, 0), 0);
for (const m in outData.moods) console.log('mood', m.padEnd(8), 'dur', outData.moods[m].dur, outData.moods[m].loop ? 'loop' : 'once', 'keys', n(outData.moods[m].bones), 'depth', JSON.stringify(outData.moods[m].depth));
for (const m in outData.moves) console.log('move', m.padEnd(10), 'dur', outData.moves[m].dur, 'keys', n(outData.moves[m].bones));
