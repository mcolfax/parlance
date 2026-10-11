/* node compose.js parts.json out.png [order] [concept.png] — renders traced parts in draw order over the
   neutral crop's area (viewBox 23.5 -10 185 304) at 4 px/unit, plus a side-by-side and an onion overlay */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const [src, out, orderArg, concept] = process.argv.slice(2);
const J = JSON.parse(fs.readFileSync(src, 'utf8'));
const P = J.parts;
const order = (orderArg || 'tail:fan,legL:stand,legR:stand,body:on,belly:on,wingL:folded,wingR:folded,head:on,crest1:on,crest3:on,crest2:on,patchL:on,patchR:on,pupilL:open,pupilR:open,browL:arc,browR:arc,mouth:grin,beak:open').split(',');
const pal = { ink: '#0B2A1E', body: '#08777B', body2: '#066C70', belly: '#F8EFD3', face: '#FDF7EA', beak: '#F5B23E', beak2: '#EDA634', mouth: '#3E2519', tongue: '#F06A55',
  crest: '#EC6034', crest2: '#F6B33F', tail: '#EE6236', tail2: '#C9472A', feet: '#858D88', glint: '#FFFFFF', gloss: '#6CC3C2', gloss2: '#FDE59A', white: '#FFFDF6' };
let css = '.o{fill:none;stroke:' + pal.ink + ';stroke-width:2.6px;stroke-linejoin:round;stroke-linecap:round}.o2{fill:none;stroke:' + pal.ink + ';stroke-width:1.3px;stroke-linejoin:round;stroke-linecap:round}';
for (const k in pal) css += '.k-' + k + '{fill:' + pal[k] + '}';
let body = '';
for (const item of order){ const [s, a] = item.split(':'); if (P[s] && P[s][a]) body += '<g data-s="' + s + '">' + P[s][a] + '</g>'; }
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="740" height="1216" viewBox="23.5 -10 185 304"><style>' + css + '</style><rect x="23.5" y="-10" width="185" height="304" fill="#F0F4E3"/>' + body + '</svg>';
fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 740, height: 1216 } });
  await pg.setContent('<html><body style="margin:0">' + svg + '</body></html>');
  await pg.screenshot({ path: out, clip: { x: 0, y: 0, width: 740, height: 1216 } });
  await b.close();
})();
