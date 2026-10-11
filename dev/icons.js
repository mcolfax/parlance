/* Draws the web version's Home Screen icons into media/icons/ from the real art (pipSVG in js/core/art.js) and
   tokens (styles/tokens.css): Pip in the German line color on the Spanish one. Run it again after changing Pip.
   Needs Playwright: NODE_PATH="$(npm root -g)" node dev/icons.js */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'media', 'icons');
const ICONS = [   // [file, size, Pip's height as a share of the icon]
  ['icon-180.png', 180, 0.78],            // apple-touch-icon (iOS rounds the corners itself)
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['icon-maskable-512.png', 512, 0.6]     // Android crops maskable icons to a shape; keep Pip inside the safe circle
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage();
  await page.route(/^https?:/, r => r.abort());   // the style guide's web fonts aren't needed for the art
  await page.goto('file://' + path.join(ROOT, 'styleguide.html'));
  await page.waitForFunction(() => typeof pipSVG === 'function');
  for (const [file, size, share] of ICONS){
    await page.setViewportSize({ width: size, height: size });
    await page.evaluate(([size, share]) => {
      document.head.append(Object.assign(document.createElement('style'), { textContent: '*{animation:none!important;transition:none!important}html,body{margin:0;padding:0;background:var(--es)}' }));
      const box = document.createElement('div');
      box.style.cssText = 'width:' + size + 'px;height:' + size + 'px;display:grid;place-items:center;background:var(--es)';
      box.innerHTML = '<span class="pip happy" style="--pip:' + Math.round(size * share) + 'px">' + pipSVG('happy') + '</span>';
      box.querySelector('.p-shadow').remove();
      document.body.replaceChildren(box);
    }, [size, share]);
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: size, height: size } });
    console.log('Drew media/icons/' + file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
