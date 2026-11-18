#!/usr/bin/env node
/* Screenshots the contact sheet page of refine.py in light and dark (tokens.css decides the colors).
   node design/rig/v2/tools/look_shot.js <page.html> <light.png> <dark.png>      (NODE_PATH at the global Playwright) */
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const [page, ...outs] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  for (const [i, theme] of ['light', 'dark'].entries()) {
    const ctx = await browser.newContext({ viewport: { width: 760, height: 400 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto('file://' + require('path').resolve(page));
    await p.evaluate(t => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await p.waitForTimeout(150);
    await p.screenshot({ path: outs[i], fullPage: true });
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
