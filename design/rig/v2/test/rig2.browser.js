#!/usr/bin/env node
/* Browser checks for js/core/rig2.js (Chromium through Playwright): pose parity with the old rig, speed, reduced motion.
   node design/rig/v2/test/rig2.browser.js [parity|behavior|perf|rm|all]      ends with "ok", or FAIL and exit code 1
   Needs the preview server (npm run preview, http://127.0.0.1:8765/) and Playwright (NODE_PATH="$(npm root -g)" if it
   isn't found). The speed check measures the way design/rig/v2/tools/baseline.js does: CPU throttled 4x over CDP, three
   live birds at 120 px for 5 s, mean and p95 milliseconds per animation frame spent in the rig's tick. */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.PREVIEW || 'http://127.0.0.1:8765';
const PAGE = BASE + '/design/rig/v2/index.html';
const BASELINE = require('../baseline/perf.json');
const what = process.argv[2] || 'all';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

/* blinks and glances are random: seed Math.random so a rerun gives the same frames */
function seed() {
  let s = 20260;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
async function open(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 1 }, opts));
  await ctx.addInitScript(seed);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(PAGE + '#bird=pip');
  await page.waitForFunction(() => window.__review && window.__review.nw);
  return { ctx, page, errs };
}

/* Pose parity: the same mood, the same time, both rigs stepped by hand at 60 fps with the look pinned (so no random glance):
   how far apart is each bone of the bird definition in the world, in setup units. The old rig blends its pose and fades its
   clip in over 0.06 s; Rig2 plays the clip baked, so the first moments differ and the check starts at 0.4 s. */
async function parity(browser) {
  const { ctx, page, errs } = await open(browser);
  const res = await page.evaluate(() => {
    const st = window.__review, def = st.def, out = {};
    st.old.destroy(); st.nw.destroy();
    const times = [0.4, 0.7, 1.0, 1.6, 2.4], rows = [];
    for (const mood of Object.keys(PIP.moods)) {
      const a = Rig.create(PIP, { size: 100, mood, autoplay: false, view: [-8, 14, 256, 244] }), b = Rig2.create(def, { size: 100, mood, autoplay: false, phase: 0, view: [-8, 14, 256, 244] });
      document.body.append(a.el, b.el);
      a.look(0, 0); b.look(0, 0);
      a.set(mood, { dur: 0 }); b.set(mood, { dur: 0 });
      let t = 0, worst = 0, where = '', mean = 0, n = 0;
      for (const target of times) {
        while (t < target - 1e-9) { a._frame(0, 1 / 60); b._frame(0, 1 / 60); t += 1 / 60; }
        for (let bi = 0; bi < a.def.bones.length; bi++) {
          const bone = a.def.bones[bi], i = b.def.byId[bone.id]; if (i == null) continue;
          const W = a.frame.W[bi];
          const K = b.frame.K, o = 6 * i;
          const dx = W[0] * bone.x + W[2] * bone.y + W[4] - (K[o] * bone.x + K[o + 2] * bone.y + K[o + 4]), dy = W[1] * bone.x + W[3] * bone.y + W[5] - (K[o + 1] * bone.x + K[o + 3] * bone.y + K[o + 5]);
          const d = Math.hypot(dx, dy); mean += d; n++;
          if (d > worst) { worst = d; where = bone.id + '@' + target; }
        }
      }
      rows.push({ mood, worst: Math.round(worst * 100) / 100, where, mean: Math.round(mean / n * 100) / 100 });
      a.destroy(); b.destroy(); a.el.remove(); b.el.remove();
    }
    return rows;
  });
  for (const r of res) ok(r.worst < 6, `parity ${r.mood.padEnd(7)} worst ${r.worst} units (${r.where}), mean ${r.mean}`);
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

/* Speed: three live Pips at 120 px, CPU 4x throttled, 5 s. Rig2's tick is the function the rAF wrapper times. */
async function perf(browser) {
  const out = {};
  for (const rig of ['rig2', 'old', 'rig2 dance', 'old dance']) {
    const { ctx, page } = await open(browser);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const ms = await page.evaluate(async ({ rig, n, px, seconds, mood }) => {
      const st = window.__review;
      st.old.destroy(); st.nw.destroy();
      for (const e of document.querySelectorAll('.stage .box')) e.textContent = '';
      const times = [], orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = cb => orig(ts => { if (cb.name === 'tick') { const t0 = performance.now(); cb(ts); times.push(performance.now() - t0); } else cb(ts); });
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:0;top:0;display:flex;gap:8px;z-index:2147483000;background:#F0F4E4';
      document.body.append(holder);
      for (let i = 0; i < n; i++) holder.append((rig.startsWith('rig2') ? Rig2.create(st.def, { size: px, mood }) : Rig.create(PIP, { size: px, mood })).el);
      await new Promise(r => setTimeout(r, seconds * 1000));
      return times;
    }, { rig, n: 3, px: 120, seconds: 5, mood: rig.endsWith('dance') ? 'dance' : 'happy' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    const s = ms.slice().sort((a, b) => a - b), mean = s.reduce((x, y) => x + y, 0) / s.length, p95 = s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
    out[rig] = { frames: s.length, mean: Math.round(mean * 1000) / 1000, p95: Math.round(p95 * 1000) / 1000, max: Math.round(s[s.length - 1] * 1000) / 1000 };
    console.log('  ' + rig.padEnd(10) + JSON.stringify(out[rig]) + (rig.endsWith('dance') ? '   (dancing: motion all the time; not part of the pass mark)' : ''));
  }
  const b = BASELINE.pip;
  ok(out.rig2.mean <= b.mean, `three live Pips at 120 px, 4x throttle: mean ${out.rig2.mean} ms <= ${b.mean} ms (the old rig's baseline)`);
  ok(out.rig2.p95 <= 4, `... and p95 ${out.rig2.p95} ms <= 4 ms`);
  ok(out.rig2.frames > 200, `... over ${out.rig2.frames} frames`);
}

/* Reduced motion: one draw, then no further canvas draws for 2 s */
async function reducedMotion(browser) {
  const { ctx, page, errs } = await (async () => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(seed);
    await ctx.addInitScript(() => {
      window.__fills = 0;
      const f = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function () { window.__fills++; return f.apply(this, arguments); };
    });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(PAGE + '#bird=pip');
    await page.waitForFunction(() => window.__review && window.__review.nw);
    return { ctx, page, errs };
  })();
  await page.waitForTimeout(400);
  const a = await page.evaluate(() => { window.__review.old.destroy(); return { fills: window.__fills, draws: window.__review.nw.draws, rm: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
  ok(a.rm, 'the page runs under prefers-reduced-motion: reduce');
  ok(a.fills > 0 && a.draws >= 1, `the bird drew its rest frame (${a.draws} draw, ${a.fills} fills)`);
  await page.waitForTimeout(2000);
  const b = await page.evaluate(() => ({ fills: window.__fills, draws: window.__review.nw.draws }));
  ok(b.fills === a.fills && b.draws === a.draws, `no canvas draws for the next 2 s (fills ${a.fills} -> ${b.fills}, draws ${a.draws} -> ${b.draws})`);
  /* a mood change still draws once */
  await page.evaluate(() => window.__review.nw.set('cheer'));
  await page.waitForTimeout(300);
  const c = await page.evaluate(() => ({ draws: window.__review.nw.draws }));
  ok(c.draws === b.draws + 1, 'a new mood draws its rest frame once (' + b.draws + ' -> ' + c.draws + ')');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}


/* Behavior: the API a screen uses, live, in Chromium */
async function behavior(browser) {
  const { ctx, page, errs } = await open(browser, { deviceScaleFactor: 2 });
  const r = await page.evaluate(async () => {
    const st = window.__review, def = st.def, out = {};
    st.old.destroy(); st.nw.destroy();
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:0;top:0;width:300px'; document.body.append(holder);
    const mk = (o = {}) => { const R = Rig2.create(def, Object.assign({ size: 120, mood: 'happy', view: [-8, 14, 256, 244] }, o)); holder.append(R.el); return R; };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const frames = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const rootY = R => R.frame.ch[5 * def.byId.root + 1];
    // size and pixel ratio: the canvas reaches past the box and is backed at the device's ratio
    let R = mk(); await frames(3);
    out.dpr = { css: [R.el.offsetWidth, R.el.offsetHeight], back: [R.canvas.width, R.canvas.height], pos: getComputedStyle(R.canvas).position, draws: R.draws };
    // painted: the canvas has pixels
    const px = R.canvas.getContext('2d').getImageData(0, 0, R.canvas.width, R.canvas.height).data; let nz = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) nz++;
    out.pixels = nz;
    // a CSS-sized bird follows its box
    const box = document.createElement('div'); box.style.cssText = 'width:90px'; holder.append(box);
    const C = Rig2.create(def, { mood: 'happy', view: [-8, 14, 256, 244] }); box.append(C.el); await frames(3);
    out.cssSized = { box: C.el.offsetWidth, back: C.canvas.width };
    box.style.width = '60px'; await frames(4); out.cssResized = { box: C.el.offsetWidth, back: C.canvas.width }; C.destroy();
    // a move: hop lifts the bird (root y goes negative) and ends
    let ended = null; R.onEvent = (k, n) => { ended = n; };
    R.hop(); let minY = 0; for (let i = 0; i < 45; i++) { await frames(1); minY = Math.min(minY, rootY(R)); }
    await wait(300); out.hop = { minY: Math.round(minY * 10) / 10, ended, playing: R.playing('hop'), settled: Math.abs(rootY(R)) < 1 };
    // a mood change blends: the first frames are the old pose, then the new one
    R.set('cheer'); await wait(60); const mid = R.frame.ch[5 * def.byId.wingL + 2]; await wait(700);
    out.cheer = { mid: Math.round(mid), later: Math.round(R.frame.ch[5 * def.byId.wingL + 2]), slot: R.frame.S[def.slotIdx.fxBody] };
    // a switch in the middle of a blend still lands
    R.set('wow'); await wait(40); R.set('sad'); await wait(800); out.chain = { mood: R.mood, face: R.frame.S[def.slotIdx.mouth] };
    // look: pupils move toward the target, stay in their room
    R.set('happy', { dur: 0 }); await wait(100); const p0 = R.frame.ch[5 * def.byId.pupilL];
    R.look(1, 0); await wait(400); const p1 = R.frame.ch[5 * def.byId.pupilL]; R.look(-1, 1); await wait(400); const p2 = R.frame.ch[5 * def.byId.pupilL], py = R.frame.ch[5 * def.byId.pupilL + 1];
    const room = def.look.room.pupilL; out.look = { right: Math.round((p1 - p0) * 10) / 10, left: Math.round((p2 - p0) * 10) / 10, inRoom: p2 >= -room[1] - 1e-6 && p1 <= room[0] + 1e-6 && py <= room[2] + 1e-6 };
    R.look(null);
    // lookAtPoint: a pointer far to the right turns the look right
    R.lookAtPoint(innerWidth, R.el.getBoundingClientRect().top + 60); await wait(400); out.lookPoint = R.frame.P[1] > 0.3; R.look(null);
    // talking: the beak and mouth change while it says a line, and the promise resolves
    const seen = new Set(); const t0 = performance.now(); const done = R.say('Hallo, ich bin Pip!'); const id = setInterval(() => seen.add(R.frame.S[def.slotIdx.mouth]), 16);
    await done; clearInterval(id); out.say = { mouths: seen.size, ms: Math.round(performance.now() - t0) };
    R.talking(true); await wait(500); const bab = R.frame.S[def.slotIdx.beak]; R.talking(false); out.babble = bab;
    // overrides are absolute
    R.override.bones.head = { r: 40 }; await frames(2); out.override = R.frame.ch[5 * def.byId.head + 2]; R.override.bones = {};
    // speed halves the clock
    R.speed = 0.5; const a0 = R.time; await wait(500); out.speed = Math.round((R.time - a0) * 100) / 100; R.speed = 1;
    // pause and resume
    R.pause(); const d1 = R.draws; await wait(300); out.paused = R.draws === d1; R.resume(); await wait(300); out.resumed = R.draws > d1;
    // hold stops every bird
    Rig2.hold(true); await frames(2); const t1 = R.time; await wait(300); out.held = R.time === t1; Rig2.hold(false); await wait(200); out.unheld = R.time > t1;
    // a bird below the fold sleeps until it scrolls into view
    const far = document.createElement('div'); far.style.cssText = 'height:3000px'; document.body.append(far);
    const F = Rig2.create(def, { size: 80, mood: 'happy', view: [-8, 14, 256, 244] }); far.append(F.el); F.el.style.marginTop = '2500px'; await wait(400);
    const off = F.time; await wait(300); out.offscreen = { slept: F.time === off, visible: F._visible };
    F.el.scrollIntoView(); await wait(500); out.scrolled = F.time > off; F.destroy();
    // a bird whose element leaves the page stops running
    const G = mk(); await frames(3); G.el.remove(); await wait(200); const gt = G.time; await wait(200); out.removed = G.time === gt;
    // theme: a token change on <html> recolors, with no frame running
    const T = mk({ autoplay: false }); await frames(3);
    const at = (R, ux, uy) => { const w = R.el.offsetWidth, h = w * 244 / 256, k = devicePixelRatio; return R.canvas.getContext('2d').getImageData(Math.round(((ux + 8) * (w / 256) + 0.12 * w) * k), Math.round(((uy - 14) * (w / 256) + 0.45 * h) * k), 1, 1).data; };
    const col = () => { const d = at(T, 126, 200); return [d[0], d[1], d[2]].join(','); };
    const before = col(); document.documentElement.style.setProperty('--pip-belly', '#FF0000'); await wait(300); const after = col(); document.documentElement.style.removeProperty('--pip-belly');
    out.theme = { before, after };
    // the shadow token carries its own alpha: dark mode makes it darker, not invisible
    out.shadow = at(T, 70, 251)[3];
    // a mood Pip doesn't have falls back to the rest mood; a move it doesn't have is ignored
    T.set('no-such-mood'); T.play('no-such-move'); out.unknown = T.mood === 'no-such-mood' && T.frame.S[def.slotIdx.mouth] === 'grin';
    return out;
  });
  const near = (a, b, e) => Math.abs(a - b) <= e;
  ok(r.dpr.css[0] === 120 && r.dpr.css[1] === 114 && r.dpr.back[0] === Math.round(120 * 1.24 * 2) && r.dpr.pos === 'absolute', `the canvas is backed at the device pixel ratio and reaches past the box (${JSON.stringify(r.dpr)})`);
  ok(r.pixels > 3000, `the first draw put ${r.pixels} pixels on the canvas`);
  ok(r.cssSized.box === 90 && r.cssSized.back === Math.round(90 * 1.24 * 2) && r.cssResized.box === 60 && r.cssResized.back === Math.round(60 * 1.24 * 2), `a bird sized by CSS follows its box (${JSON.stringify([r.cssSized, r.cssResized])})`);
  ok(r.hop.minY < -15 && r.hop.ended === 'hop' && !r.hop.playing && r.hop.settled, `hop lifts the bird, ends with an event and settles (${JSON.stringify(r.hop)})`);
  ok(r.cheer.mid < 70 && r.cheer.later > 80, `a new mood blends in over a third of a second (${JSON.stringify(r.cheer)})`);
  ok(r.chain.mood === 'sad' && r.chain.face === 'frown', `a switch in the middle of a blend lands in the last mood (${JSON.stringify(r.chain)})`);
  ok(r.look.right > 1 && r.look.left < -2 && r.look.inRoom, `look moves the pupils each way and keeps them in the eye (${JSON.stringify(r.look)})`);
  ok(r.lookPoint, 'lookAtPoint turns the look toward a pointer to the right');
  ok(r.say.mouths >= 3 && r.say.ms > 400 && r.say.ms < 4000, `say moves the mouth through ${r.say.mouths} shapes and resolves after ${r.say.ms} ms`);
  ok(['open', 'closed'].includes(r.babble), 'talking(true) babbles the beak');
  ok(near(r.override, 40, 1e-6), 'an override sets a bone absolutely');
  ok(near(r.speed, 0.25, 0.08), `speed 0.5 runs the clock at half pace (${r.speed} s in 0.5 s)`);
  ok(r.paused && r.resumed, 'pause stops the drawing and resume starts it again');
  ok(r.held && r.unheld, 'Rig2.hold stops every bird and releasing it starts them again');
  ok(r.offscreen.slept && !r.offscreen.visible && r.scrolled, `a bird below the fold sleeps until it scrolls into view (${JSON.stringify(r.offscreen)}, ${r.scrolled})`);
  ok(r.removed, 'a bird whose element left the page stops running');
  ok(r.theme.before !== r.theme.after && r.theme.after === '255,0,0', `a token change on <html> recolors a paused bird (${JSON.stringify(r.theme)})`);
  ok(r.shadow > 15 && r.shadow < 80, `the shadow is drawn once at its token's alpha, not twice (alpha ${r.shadow}/255)`);
  ok(r.unknown, 'an unknown mood falls back to the rest mood and an unknown move is ignored');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

(async () => {
  const up = await fetch(PAGE).then(r => r.ok, () => false);
  if (!up) { console.error('no preview server at ' + BASE + ': run npm run preview first'); process.exit(1); }
  const browser = await chromium.launch();
  try {
    if (what === 'parity' || what === 'all') await parity(browser);
    if (what === 'behavior' || what === 'all') await behavior(browser);
    if (what === 'rm' || what === 'all') await reducedMotion(browser);
    if (what === 'perf' || what === 'all') await perf(browser);
  } finally { await browser.close(); }
  if (fails) { console.log('FAIL ' + fails); process.exit(1); }
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
