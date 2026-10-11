/* Every mood of a bird on one sheet, for checking a new part sheet in poses its model sheet doesn't show.
   node moods.js <bird> <out.png> [px per mood (160)] [moods, comma separated]   Needs Playwright. */
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const [bird, out, size = '160', only] = process.argv.slice(2);
const core = path.join(__dirname, '..', '..', '..', '..', 'js', 'core');
global.Bird = require(path.join(core, 'bird.js'));
const Rig = require(path.join(core, 'rig.js'));
const def = require(path.join(core, bird + '.js'));
const moods = only ? only.split(',') : Object.keys(def.moods);
const n = Number(size), cols = Math.min(moods.length, 6), rows = Math.ceil(moods.length / cols);
const view = [-8, 4, 256, 258];
const h = Math.round(n * view[3] / view[2]);
const cells = moods.map(m => '<figure style="margin:0;width:' + n + 'px;font:12px sans-serif;text-align:center">' + Rig.svg(def, m, { view, size: n }) + '<figcaption>' + m + '</figcaption></figure>').join('');
const html = '<body style="margin:0;padding:8px;background:#F0F4E4;display:grid;grid-template-columns:repeat(' + cols + ',' + n + 'px);gap:8px">' + cells + '</body>';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: cols * (n + 8) + 16, height: rows * (h + 26) + 16 } });
  await pg.setContent(html);
  await pg.screenshot({ path: out, fullPage: true });
  await b.close();
  console.log(out);
})();
