#!/usr/bin/env node
/* Review pictures: the old rig and Rig2 side by side, light and dark, at 412 px wide, deviceScaleFactor 1.
   node design/rig/v2/test/rig2.shots.js [out dir, default design/rig/v2/review/wp3]
   Both rigs are stepped by hand to the same moment with the look pinned (no random glance), so a pair shows the same pose.
   Needs the preview server (npm run preview) and Playwright. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const BASE = process.env.PREVIEW || 'http://127.0.0.1:8765';
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'review', 'wp3'));
/* [label, mood, move or null, seconds into it] */
const SHEETS = {
  moods: [['happy', 'happy', null, 0.6], ['cheer', 'cheer', null, 0.9], ['oops', 'oops', null, 0.5], ['wave', 'wave', null, 0.6], ['sleep', 'sleep', null, 1.0], ['fly', 'fly', null, 0.4]],
  more: [['think', 'think', null, 1.0], ['wow', 'wow', null, 0.25], ['sad', 'sad', null, 0.8], ['laugh', 'laugh', null, 0.3], ['proud', 'proud', null, 0.9], ['love', 'love', null, 1.0], ['dizzy', 'dizzy', null, 0.5], ['dance', 'dance', null, 0.3]],
  moves: [['hop (rise)', 'happy', 'hop', 0.3], ['hop (land)', 'happy', 'hop', 0.52], ['bow', 'happy', 'bow', 0.7], ['lookAround', 'happy', 'lookAround', 0.9], ['wobble', 'happy', 'wobble', 0.35], ['shake', 'happy', 'shake', 0.28]]
};
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { let s = 20260; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.goto(BASE + '/design/rig/v2/index.html#bird=pip&theme=' + theme);
    await page.waitForFunction(() => window.__review && window.__review.nw);
    for (const name in SHEETS) {
      await page.evaluate(({ rows, name }) => {
        const st = window.__review; st.old.destroy(); st.nw.destroy();
        document.querySelectorAll('.page > *').forEach(e => { e.style.display = 'none'; });
        let box = document.getElementById('sheet'); if (box) box.remove();
        box = document.createElement('div'); box.id = 'sheet'; box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 0 4px';
        document.querySelector('.page').append(box);
        const size = 150, view = [-8, 14, 256, 244];
        const head = t => { const h = document.createElement('div'); h.textContent = t; h.style.cssText = 'font:600 12px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--muted2);text-align:center'; return h; };
        box.append(head('Old rig'), head('Rig2'));
        for (const [label, mood, move, secs] of rows) {
          const a = Rig.create(PIP, { size, view, mood, autoplay: false }), b = Rig2.create(st.def, { size, view, mood, autoplay: false, phase: 0 });
          const cells = [a, b].map(r => { const c = document.createElement('div'); c.style.cssText = 'background:var(--stage);border-radius:14px;padding:26px 0 6px;display:flex;flex-direction:column;align-items:center;position:relative'; const cap = document.createElement('div'); cap.textContent = label; cap.style.cssText = 'position:absolute;left:8px;top:6px;font:11px ui-monospace,monospace;color:var(--muted2)'; c.append(cap, r.el); box.append(c); return c; });
          a.look(0, 0); b.look(0, 0); a.set(mood, { dur: 0 }); b.set(mood, { dur: 0 });
          if (move) { a.play(move); b.play(move); }
          let t = 0; while (t < secs - 1e-9) { a._frame(0, 1 / 60); b._frame(0, 1 / 60); t += 1 / 60; }
          a.pause(); b.pause();
        }
      }, { rows: SHEETS[name], name });
      await page.waitForTimeout(250);
      const file = path.join(OUT, `${name}-${theme}.png`);
      await page.locator('#sheet').screenshot({ path: file });
      console.log(file);
    }
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
