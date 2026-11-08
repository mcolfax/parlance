/* Builds the web version (for people without Claude) into dist/: the files the artifact publishes, plus index.html
   wrapped in a full page that sets window.PARLANCE_WEB, so js/core/host.js gives it accounts and a database.
   Vercel runs this on every push to main (vercel.json). Usage: node dev/web.js */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const OFFLINE = true;   // false writes a worker that removes itself and its cache (the kill switch, flow/plans/…-p2-works-offline.md)
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'dist');
function build(){
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
  const install = '<meta name="google-site-verification" content="FJY_qrIKoddmgzrMgvWSJ6QmUpQPdsfurvgYhT-jLK4">' +
    '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="media/icons/icon-192.png"><link rel="apple-touch-icon" href="media/icons/icon-180.png">' +
    '<meta name="apple-mobile-web-app-title" content="Parlance"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">' +
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="' + bgLight + '"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="' + bgDark + '">';
  /* the same page skeleton the artifact host wraps around index.html (see dev/preview.py), with the title in the head */
  const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const title = (page.match(/<title>[^<]*<\/title>/) || ['<title>Parlance</title>'])[0];
  fs.writeFileSync(path.join(OUT, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + title + install +
    '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]{display:none!important}</style>' +
    '<script>window.PARLANCE_WEB = true;</script></head><body>\n' + page.replace(title, '') + '\n</body></html>\n');
  writeServiceWorker(OUT);
  console.log('Built dist/ with ' + (Object.keys(files).length + 6) + ' files');
}
/* dist/sw.js and dist/offline.json: every served file with a short content hash, its size and whether it's lazy */
function writeServiceWorker(out){
  const crypto = require('crypto'), list = {};
  const walk = d => { for (const n of fs.readdirSync(path.join(out, d))){ const rel = d ? d + '/' + n : n, abs = path.join(out, rel);
    if (fs.statSync(abs).isDirectory()) walk(rel);
    else if (!/^(dev|docs)\//.test(rel) && !/^media\/film\/.*\.(mp4|webm)$/.test(rel) && !['styleguide.html', 'sw.js', 'offline.json'].includes(rel)){
      const buf = fs.readFileSync(abs);
      list[rel] = [crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12), buf.length, /^media\/voice\/.*\.mp3$/.test(rel) || /^media\/abc-adventure\./.test(rel) ? 1 : 0];
    } } };
  walk('');
  const version = (/const APP_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(out, 'js', 'config.js'), 'utf8')) || [])[1] || '';
  const src = OFFLINE ? fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8').replace("'__VERSION__'", () => JSON.stringify(version)).replace('__MANIFEST__', () => JSON.stringify(list))
    : "self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(caches.delete('parlance').then(() => self.registration.unregister())));\n";
  fs.writeFileSync(path.join(out, 'sw.js'), src);
  fs.writeFileSync(path.join(out, 'offline.json'), JSON.stringify(OFFLINE ? { version, files: list } : { version, files: list, off: true }));
  return list;
}
module.exports = { writeServiceWorker };
if (require.main === module) build();
