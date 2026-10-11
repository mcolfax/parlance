/* Concept | rig | onion skin, for tuning a traced bird against its sheet.
   node compare.js <bird> <out.png> [mood] [crop] [scale]
   Renders the bird's rig (js/core/<bird>.js) in the mood (happy) over the matching crop (n, or c for cheer) of its
   prepared sheet (<TRACE_DIR>/<bird>/sheet.png, from run.sh), at scale px per unit (3). Needs Playwright. */
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const [bird, out, mood = 'happy', crop = 'n', scale = '3'] = process.argv.slice(2);
const k = Number(scale);
const core = path.join(__dirname, '..', '..', '..', '..', 'js', 'core');
global.Bird = require(path.join(core, 'bird.js'));
const Rig = require(path.join(core, 'rig.js'));
const def = require(path.join(core, bird + '.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'birds', bird + '.json'), 'utf8'));
const work = path.join(process.env.TRACE_DIR || path.join(__dirname, 'work'), bird);
const [x0, x1, cx] = cfg.crops[crop];
const view = [(x0 - cx) / 2 + 120, -10, (x1 - x0) / 2, 304];
const W = Math.round(view[2] * k), H = Math.round(view[3] * k);
const svg = Rig.svg(def, mood, { view, size: W });
const sheet = 'data:image/png;base64,' + fs.readFileSync(path.join(work, 'sheet.png')).toString('base64');
/* the sheet is 2 px per unit; its crop starts at x0 */
const concept = 'background:url(' + sheet + ') ' + (-x0 * k / 2) + 'px 0/auto ' + (608 * k / 2) + 'px no-repeat';
const html = '<html><body style="margin:0;display:flex;gap:8px;background:#fff">' +
  '<div style="width:' + W + 'px;height:' + H + 'px;' + concept + '"></div>' +
  '<div style="width:' + W + 'px;height:' + H + 'px;background:#F0F4E4">' + svg + '</div>' +
  '<div style="position:relative;width:' + W + 'px;height:' + H + 'px;' + concept + '"><div style="position:absolute;inset:0;opacity:.55">' + svg + '</div></div>' +
  '</body></html>';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: W * 3 + 16, height: H } });
  await pg.setContent(html);
  await pg.screenshot({ path: out });
  await b.close();
  console.log(out, W * 3 + 16, 'x', H);
})();
