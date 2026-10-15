/* Builds the web version (for people without Claude) into dist/: the files the artifact publishes, plus index.html
   wrapped in a full page that sets window.PARLANCE_WEB, so js/core/host.js gives it accounts and a database.
   Vercel runs this on every push to main (vercel.json). Usage: node dev/web.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'dist');
const files = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'files.js')], { cwd: ROOT, encoding: 'utf8' }));
fs.rmSync(OUT, { recursive: true, force: true });
for (const rel of Object.keys(files)){
  const to = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), to);
}
for (const f of ['privacy.html', 'terms.html']) fs.copyFileSync(path.join(__dirname, 'legal', f), path.join(OUT, f));   /* pages Google's sign-in consent screen links to */
/* Home Screen install: a web manifest and icon tags (icons drawn by dev/icons.js), colored from the tokens */
const tokens = fs.readFileSync(path.join(ROOT, 'styles', 'tokens.css'), 'utf8');
const [bgLight, bgDark] = [...tokens.matchAll(/--bg:(#[0-9A-Fa-f]{6})/g)].map(m => m[1]);
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Parlance', short_name: 'Parlance', description: 'German, Latin American Spanish and Italian, from first words to fluent.',
  start_url: '/', scope: '/', display: 'standalone', background_color: bgLight, theme_color: bgLight,
  icons: [
    { src: 'media/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'media/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'media/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2) + '\n');
const install = '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="media/icons/icon-192.png"><link rel="apple-touch-icon" href="media/icons/icon-180.png">' +
  '<meta name="apple-mobile-web-app-title" content="Parlance"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">' +
  '<meta name="theme-color" media="(prefers-color-scheme: light)" content="' + bgLight + '"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="' + bgDark + '">';
/* the same page skeleton the artifact host wraps around index.html (see dev/preview.py), with the title in the head */
const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const title = (page.match(/<title>[^<]*<\/title>/) || ['<title>Parlance</title>'])[0];
fs.writeFileSync(path.join(OUT, 'index.html'),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + title + install +
  '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]{display:none!important}</style>' +
  '<script>window.PARLANCE_WEB = true;</script></head><body>\n' + page.replace(title, '') + '\n</body></html>\n');
console.log('Built dist/ with ' + (Object.keys(files).length + 4) + ' files');
