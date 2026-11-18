#!/usr/bin/env node
/* Baseline of the current (v1) SVG rig, so the v2 runtime can be compared against it.
   node design/rig/v2/tools/baseline.js <bird|all>
   - Each mood of the bird: 2 s at 412 × 412 CSS px, 60 fps, H.264 CRF 28 → design/rig/v2/baseline/<bird>/<mood>.mp4
   - Contact sheet of every mood at its 0.5 s frame, 6 columns → design/rig/v2/baseline/<bird>-sheet.png
   - Perf: three live birds at 120 px, CPU throttled 4× over CDP, 5 s. Mean and p95 ms per animation frame spent in the
     rig's tick → design/rig/v2/baseline/perf.json (merged per bird).
   Needs the preview server: npm run preview (http://127.0.0.1:8765/). Playwright and ffmpeg must be on the machine. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { once } = require('events');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const OUT = path.join(__dirname, '..', 'baseline');
const BASE = process.env.PREVIEW || 'http://127.0.0.1:8765';
const BIRDS = ['pip', 'kiwi', 'mango', 'kakadu', 'rojo'];
const PX = 412, FPS = 60, FRAMES = 2 * FPS, SHEET_T = 0.5, SHEET_COLS = 6, SHEET_CELL = 240;
const PERF = { px: 120, n: 3, seconds: 5, rate: 4 };

/* blinks and glances are random in the rig: seed Math.random so a rerun gives the same frames */
function seedRandom() {
  let s = 20260;
  Math.random = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const svgUrl = bird => `${BASE}/design/rig/svg.html#${bird}`;

async function newPage(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1 }, opts));
  await ctx.addInitScript(seedRandom);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  return ctx;
}

function encoder(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code + ' for ' + file)))));
  return { ff, done };
}

async function captureBird(browser, bird) {
  const ctx = await newPage(browser, { viewport: { width: PX, height: PX } });
  const page = await ctx.newPage();
  await page.goto(svgUrl(bird), { waitUntil: 'load' });
  const moods = await page.evaluate(b => Object.keys(BIRD_DEFS[b].moods), bird);
  const sheet = [];
  for (const mood of moods) {
    await page.evaluate(([b, m, px]) => {
      Rig.hold(true);   // the page's own loop stops; the frames below are stepped by hand
      const old = document.getElementById('cap');
      if (old){ if (window.__cap) window.__cap.R.destroy(); old.remove(); }
      const wrap = document.createElement('div');
      wrap.id = 'cap';
      wrap.style.cssText = `position:fixed;left:0;top:0;width:${px}px;height:${px}px;background:#F0F4E4;z-index:2147483000;overflow:hidden`;
      const R = Rig.create(BIRD_DEFS[b], { size: px, mood: m, intro: false, autoplay: false });
      wrap.append(R.el);
      document.body.append(wrap);
      window.__cap = { R };
    }, [bird, mood, PX]);
    const file = path.join(OUT, bird, mood + '.mp4');
    const { ff, done } = encoder(file);
    let keep = null;
    for (let i = 0; i < FRAMES; i++){
      if (i) await page.evaluate(dt => window.__cap.R._frame(0, dt), 1 / FPS);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: PX, height: PX } });
      if (i === Math.round(SHEET_T * FPS)) keep = png;
      if (!ff.stdin.write(png)) await once(ff.stdin, 'drain');
    }
    ff.stdin.end();
    await done;
    sheet.push({ mood, png: keep });
    console.log(`${bird}/${mood}.mp4`);
  }
  await ctx.close();
  return sheet;
}

async function contactSheet(browser, bird, cells) {
  const figs = cells.map(c => `<figure><img src="data:image/png;base64,${c.png.toString('base64')}" width="${SHEET_CELL}" height="${SHEET_CELL}"><figcaption>${c.mood}</figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf8"><body style="margin:0;padding:8px;background:#F0F4E4;font:14px/1.2 sans-serif;color:#15301F">` +
    `<div style="display:grid;grid-template-columns:repeat(${SHEET_COLS},${SHEET_CELL}px);gap:8px">${figs}</div>` +
    `<style>figure{margin:0;text-align:center}figcaption{padding:4px 0}</style></body>`;
  const ctx = await newPage(browser, { viewport: { width: SHEET_COLS * (SHEET_CELL + 8) + 16, height: 600 } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const file = path.join(OUT, bird + '-sheet.png');
  await page.screenshot({ path: file, fullPage: true });
  await ctx.close();
  return file;
}

async function measure(browser, bird) {
  const ctx = await newPage(browser, { viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  await page.goto(svgUrl(bird), { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: PERF.rate });
  const ms = await page.evaluate(async ({ b, n, px, seconds }) => {
    /* only the three birds made here run: the svg page's own rigs are paused */
    for (const el of document.querySelectorAll('.rig')) if (el._rig) el._rig.pause();
    const times = [];
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => orig(ts => {
      if (cb.name === 'tick'){ const t0 = performance.now(); cb(ts); times.push(performance.now() - t0); }
      else cb(ts);
    });
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:0;top:0;display:flex;gap:8px;z-index:2147483000;background:#F0F4E4';
    document.body.append(holder);
    for (let i = 0; i < n; i++) holder.append(Rig.create(BIRD_DEFS[b], { size: px, mood: 'happy' }).el);
    await new Promise(r => setTimeout(r, seconds * 1000));
    return times;
  }, { b: bird, n: PERF.n, px: PERF.px, seconds: PERF.seconds });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
  const sorted = ms.slice().sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)];
  const r3 = v => Math.round(v * 1000) / 1000;
  return { instances: PERF.n, size: PERF.px, rate: PERF.rate, seconds: PERF.seconds, frames: sorted.length, mean: r3(mean), p95: r3(p95), max: r3(sorted[sorted.length - 1]) };
}

(async () => {
  const arg = process.argv[2];
  const list = arg === 'all' ? BIRDS : BIRDS.includes(arg) ? [arg] : null;
  if (!list){ console.error('usage: node design/rig/v2/tools/baseline.js <' + BIRDS.join('|') + '|all>'); process.exit(2); }
  const up = await fetch(svgUrl('pip').split('#')[0]).then(r => r.ok, () => false);
  if (!up){ console.error('no preview server at ' + BASE + ': run npm run preview first'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const perfFile = path.join(OUT, 'perf.json');
    const perf = fs.existsSync(perfFile) ? JSON.parse(fs.readFileSync(perfFile, 'utf8')) : {};
    for (const bird of list){
      const cells = await captureBird(browser, bird);
      console.log(await contactSheet(browser, bird, cells));
      perf[bird] = await measure(browser, bird);
      console.log(bird, JSON.stringify(perf[bird]));
    }
    const sorted = {};
    for (const k of Object.keys(perf).sort()) sorted[k] = perf[k];
    fs.writeFileSync(perfFile, JSON.stringify(sorted, null, 2) + '\n');
    console.log(perfFile);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
