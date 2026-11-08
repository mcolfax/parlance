"use strict";
/* Checks the web version's offline support in a real browser (Playwright). Run: npm run offline-check
   It builds dist/ with dev/web.js, serves it on 127.0.0.1 (a secure context, so the service worker registers; the response headers
   are vercel.json's, so the Content-Security-Policy is the real one), and checks eight things, printing PASS or FAIL for each:
     1  the build: dist/sw.js is filled in, dist/offline.json lists the app's files with their true hashes
     2  the worker installs, takes over, and the cache holds every file that isn't lazy
     3  with the network off: reload, visit the tabs, finish a lesson; the progress is saved; nothing breaks
     4  a new release (a second build, version 9.9.9) arrives through offlineUpdate() and replaces the old files
     5  a release whose files don't match its list (it went live mid-install) fails to install; the old version stays whole
     6  the kill switch: a worker that removes itself and the cache leaves the site as it was before
     7  Me → Save Spanish voices for offline keeps every Spanish voice pack, and the card says so
     8  with the network off, a lesson's first word comes from the kept pack (no voice request fails)
   --width <px> changes the phone's width (default 412). --shots <folder> also saves screenshots of Me (online, and after saving voices), Learn and Friends (offline), light and dark.
   Needs Playwright (preinstalled in cloud sessions; otherwise NODE_PATH="$(npm root -g)"). Leaves nothing running. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2), shotsDir = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
const width = args.includes('--width') ? +args[args.indexOf('--width') + 1] : 412;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function report(n, okay, what){ results.push(okay); console.log((okay ? 'PASS ' : 'FAIL ') + n + (what ? ' ' + what : '')); }

/* ----- a static server whose folder can change while it runs, with vercel.json's headers ----- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
function serve(){
  const headers = {};
  for (const h of JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers[0].headers) headers[h.key.toLowerCase()] = h.value;
  const s = { root: DIST, hits: [], server: null, port: 0 };
  s.server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); s.hits.push(u);
    const rel = path.normalize(u === '/' ? 'index.html' : u).replace(/^([/\\])+/, ''), file = path.join(s.root, rel);
    if (!file.startsWith(s.root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404, headers); return res.end(); }
    res.writeHead(200, { ...headers, 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'max-age=0' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => s.server.listen(0, '127.0.0.1', () => { s.port = s.server.address().port; r(s); }));
}
function playwright(){
  try { return require('playwright'); } catch (e) {}
  const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  return require(path.join(g, 'playwright'));
}

/* a copy of dist/ as a later release would build it */
function nextRelease(version, killed, tamper){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'parlance-offline-'));
  fs.cpSync(DIST, tmp, { recursive: true });
  const cfg = path.join(tmp, 'js', 'config.js');
  fs.writeFileSync(cfg, fs.readFileSync(cfg, 'utf8').replace(/const APP_VERSION = '[^']+'/, "const APP_VERSION = '" + version + "'"));
if (killed){   // the kill-switch worker and offline.json, exactly as dev/web.js writes them with OFFLINE = false
    fs.writeFileSync(path.join(tmp, 'sw.js'), "self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(caches.delete('parlance').then(() => self.registration.unregister())));\n");
    fs.writeFileSync(path.join(tmp, 'offline.json'), JSON.stringify({ version, files: {}, off: true }));
  }
  else require('./web.js').writeServiceWorker(tmp);
  if (tamper){   // change one byte after the list was written: the list's hash no longer matches the file (a release going live mid-install)
    const f = path.join(tmp, tamper), buf = fs.readFileSync(f); buf[buf.length - 1] ^= 1; fs.writeFileSync(f, buf);
  }
  return tmp;
}

async function main(){
  /* 1 ----- the build */
  execFileSync(process.execPath, [path.join(__dirname, 'web.js')], { cwd: ROOT, stdio: 'ignore' });
  const swSrc = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8'), man = JSON.parse(fs.readFileSync(path.join(DIST, 'offline.json'), 'utf8'));
  const crypto = require('crypto'), problems = [];
  if (/__MANIFEST__|__VERSION__/.test(swSrc)) problems.push('sw.js still has a placeholder');
  const pageScripts = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const need = ['index.html', 'media/voice/es.json', ...pageScripts];
  for (const f of need) if (!man.files[f]) problems.push(f + ' is not listed');
  if (man.files['media/voice/es.json'] && man.files['media/voice/es.json'][2]) problems.push('media/voice/es.json is lazy');
  if (!Object.keys(man.files).some(f => /^media\/voice\/.*\.mp3$/.test(f) && man.files[f][2] === 1)) problems.push('no lazy voice pack is listed');
  for (const [f, [hash, bytes]] of Object.entries(man.files)){
    const buf = fs.existsSync(path.join(DIST, f)) ? fs.readFileSync(path.join(DIST, f)) : null;
    if (!buf) problems.push(f + ' is listed but missing');
    else if (crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12) !== hash || buf.length !== bytes) problems.push(f + ' has a different hash or size than listed');
  }
  if (Object.keys(man.files).some(f => /^(dev|docs)\//.test(f) || f === 'styleguide.html')) problems.push('dev/, docs/ or styleguide.html is listed');
  const eager = Object.values(man.files).filter(v => !v[2]).reduce((n, v) => n + v[1], 0);
  if (Object.keys(man.files).some(f => /^media\/film\/.*\.(mp4|webm)$/.test(f))) problems.push('an intro film is listed (videos are fetched with Range requests, so the cache can’t serve them)');
  if (eager >= 10 * 1024 * 1024) problems.push('the files cached at install total ' + (eager / 1048576).toFixed(1) + ' MB (10 MB or more)');
  report('1 build', !problems.length, problems.slice(0, 5).join('; ') || Object.keys(man.files).length + ' files listed, ' + (eager / 1048576).toFixed(1) + ' MB cached at install (not lazy)');

  const { chromium } = playwright();
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.port + '/', tmps = [];
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  try {
    const newCtx = async () => {
      const ctx = await browser.newContext({ viewport: { width, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'light' });
      await ctx.route(u => !u.toString().startsWith('http://127.0.0.1:' + srv.port), r => r.abort());   // Supabase, Google Fonts: not reachable here
      await ctx.addInitScript(() => {   // an onboarded learner who has seen the film, with music and sounds off (as dev/flow.js shots)
        try { if (!localStorage.getItem('parlance.v2')) localStorage.setItem('parlance.v2', JSON.stringify({ v: 9, settings: { onboarded: true, lang: 'es', seenVersion: '999.0.0', filmSeen: true, homeMusic: false, sfx: false, autoplay: false } })); } catch (e) {}
      });
      return ctx;
    };
    const ctx = await newCtx();
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const view = () => page.waitForSelector('#app .view', { timeout: 10000 });
    const shot = async name => {
      if (!shotsDir) return;
      fs.mkdirSync(shotsDir, { recursive: true });
      await page.evaluate(() => { const c = document.querySelector('.offline-card'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(200);
      for (const scheme of ['light', 'dark']){ await page.emulateMedia({ colorScheme: scheme }); await sleep(300); await page.screenshot({ path: path.join(shotsDir, scheme + '-' + name + '.png') }); }
      await page.emulateMedia({ colorScheme: 'light' });
    };
    const tab = async t => { await page.locator('#tabs .tab', { hasText: t }).first().click({ timeout: 5000 }); await sleep(500); };

    /* 2 ----- install and take over */
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!(r && r.active)) && window.Offline && Offline.ready, null, { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 5000 }).catch(() => {});
    if (!await page.evaluate(() => !!navigator.serviceWorker.controller)){ await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {}); }
    const wantKeys = Object.keys(man.files).filter(f => !man.files[f][2]).map(f => new URL(f + '?v=' + man.files[f][0], base).href);
    const haveKeys = await page.evaluate(async () => (await (await caches.open('parlance')).keys()).map(r => r.url));
    const lazyKeys = Object.keys(man.files).filter(f => man.files[f][2]).map(f => new URL(f + '?v=' + man.files[f][0], base).href);
    const missing = wantKeys.filter(k => !haveKeys.includes(k)), extra = haveKeys.filter(k => !wantKeys.includes(k) && !lazyKeys.includes(k));   // a lazy file the page already used (a voice pack) may be there
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    await view();
    await tab('Me'); await shot('me-online'); await tab('Learn');
    report('2 install', controlled && !missing.length && !extra.length, controlled ? (missing.length ? 'missing from the cache: ' + missing.slice(0, 3).join(', ') : extra.length ? 'unexpected in the cache: ' + extra.slice(0, 3).join(', ') : wantKeys.length + ' files cached') : 'the worker never took over');

    /* 3 ----- offline */
    await ctx.setOffline(true);
    const hitsBefore = srv.hits.length, bad = [];
    page.on('requestfailed', r => { if (r.url().startsWith(base) && !/media\/voice\/|sw\.js/.test(r.url())) bad.push(r.url()); });
    await page.reload({ waitUntil: 'load' });
    let off = '';
    try {
      await view();
      for (const t of ['Learn', 'Stories', 'Review', 'Me']) await tab(t);
      await shot('me-offline');
      await tab('Friends'); await shot('friends-offline');
      await tab('Learn'); await shot('learn-offline');
      const id = await page.evaluate(() => { const id = coreOrder(S.settings.lang)[0].id; startLesson(id); return id; });
      await page.waitForSelector('.ov-foot button', { timeout: 10000 });
      await page.evaluate(() => { Run.pos = Run.queue.length; nextEx(); });
      await page.locator('button:visible', { hasText: 'Continue' }).first().click({ timeout: 10000 });
      await sleep(500);
      const saved = await page.evaluate(id => { try { saveLocal(); } catch (e) {} const s = JSON.parse(localStorage['parlance.v2']); const L = s.langs && s.langs[s.settings.lang]; return !!(L && L.done && L.done[id]); }, id);
      if (!saved) off = 'the finished lesson is not in the saved progress';
    } catch (e) { off = String(e.message).split('\n')[0]; }
    const appHits = srv.hits.slice(hitsBefore).filter(u => u !== '/sw.js' && !/^\/media\/voice\/.*\.mp3$/.test(u));
    if (!off && appHits.length) off = 'the server was asked for ' + appHits.slice(0, 3).join(', ') + ' while offline';
    if (!off && bad.length) off = 'failed requests: ' + bad.slice(0, 3).join(', ');
    if (!off && errors.length) off = 'page error: ' + errors[0];
    report('3 offline', !off, off || 'reload, tabs and a finished lesson all worked with the network off');
    await ctx.setOffline(false);

    /* 4 ----- a new release */
    const t2 = nextRelease('9.9.9'); tmps.push(t2); srv.root = t2;
    await page.goto(base, { waitUntil: 'load' }); await view();
    await page.evaluate(() => offlineUpdate());
    await page.reload({ waitUntil: 'load' }); await view();
    const ver = await page.evaluate(() => APP_VERSION);
    const keys = await page.evaluate(async () => (await (await caches.open('parlance')).keys()).map(r => r.url));
    const oldCfg = new URL('js/config.js?v=' + man.files['js/config.js'][0], base).href;
    report('4 update', ver === '9.9.9' && !keys.includes(oldCfg), ver !== '9.9.9' ? 'the page still reports ' + ver : keys.includes(oldCfg) ? 'the old js/config.js is still cached' : 'the new version took over and the old files are gone');

    /* 5 ----- a release whose files don't match its list: the install fails and the old version stays whole */
    const t2b = nextRelease('9.9.10', false, 'js/config.js'); tmps.push(t2b); srv.root = t2b;
    const man2 = JSON.parse(fs.readFileSync(path.join(t2b, 'offline.json'), 'utf8'));
    await page.evaluate(() => offlineUpdate(4000));
    const five = await page.evaluate(async () => {
      const c = navigator.serviceWorker.controller; if (!c) return { none: true };
      const version = await new Promise(res => { const t = setTimeout(() => res(''), 3000); navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.version){ clearTimeout(t); res(e.data.version); } }); c.postMessage('version'); });
      return { version, keys: (await (await caches.open('parlance')).keys()).map(r => r.url) };
    });
    const badCfg = new URL('js/config.js?v=' + man2.files['js/config.js'][0], base).href;
    report('5 mismatch', !five.none && five.version === '9.9.9' && !five.keys.includes(badCfg),
      five.none ? 'no worker controls the page' : five.version !== '9.9.9' ? 'the worker answers ' + (five.version || 'nothing') + ' instead of 9.9.9' : five.keys.includes(badCfg) ? 'the mismatched js/config.js was cached' : 'the release with a changed file did not install; version ' + five.version + ' stays whole');

    /* 6 ----- the kill switch */
    const t3 = nextRelease('9.9.8', true); tmps.push(t3); srv.root = t3;
    await page.evaluate(() => offlineUpdate());
    await page.reload({ waitUntil: 'load' }); await view(); await sleep(800);
    await page.reload({ waitUntil: 'load' }); await view(); await sleep(800);
    const k = await page.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, caches: await caches.keys(), ver: APP_VERSION }));
    report('6 kill switch', !k.controller && !k.caches.includes('parlance'), k.controller ? 'a worker still controls the page' : k.caches.includes('parlance') ? 'the cache is still there' : 'no worker, no cache (page version ' + k.ver + ')');

    /* 7 ----- save a language's voices (a fresh phone: the worker installs again from the first build) */
    srv.root = DIST;
    await ctx.close();
    const ctx2 = await newCtx(), p2 = await ctx2.newPage();
    p2.on('pageerror', e => errors.push(e.message));
    const view2 = () => p2.waitForSelector('#app .view', { timeout: 10000 });
    await p2.goto(base, { waitUntil: 'load' });
    await p2.waitForFunction(() => window.Offline && Offline.ready, null, { timeout: 30000 }).catch(() => {});
    await p2.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 5000 }).catch(() => {});
    if (!await p2.evaluate(() => !!navigator.serviceWorker.controller)){ await p2.reload({ waitUntil: 'load' }); await p2.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {}); }
    await view2();
    const esPacks = Object.keys(man.files).filter(f => /^media\/voice\/es-.*\.mp3$/.test(f));
    let six = '';
    try {
      await p2.locator('#tabs .tab', { hasText: 'Me' }).first().click({ timeout: 5000 });
      const save = p2.locator('.offline-card button', { hasText: 'Save Spanish voices for offline' });
      await save.waitFor({ timeout: 10000 });
      await save.click();
      await p2.locator('.offline-card', { hasText: 'Spanish voices are saved for offline.' }).waitFor({ timeout: 60000 });
      const have = await p2.evaluate(async () => (await (await caches.open('parlance')).keys()).map(r => r.url));
      const lacking = esPacks.filter(f => !have.includes(new URL(f + '?v=' + man.files[f][0], base).href));
      if (!esPacks.length) six = 'no Spanish voice packs are listed';
      else if (lacking.length) six = lacking.length + ' of ' + esPacks.length + ' packs are not in the cache, for example ' + lacking[0];
      if (shotsDir){ fs.mkdirSync(shotsDir, { recursive: true }); await p2.evaluate(() => document.querySelector('.offline-card').scrollIntoView({ block: 'center' })); await sleep(200); for (const scheme of ['light', 'dark']){ await p2.emulateMedia({ colorScheme: scheme }); await sleep(300); await p2.screenshot({ path: path.join(shotsDir, scheme + '-me-voices-saved.png') }); } await p2.emulateMedia({ colorScheme: 'light' }); }
    } catch (e) { six = String(e.message).split('\n')[0]; }
    report('7 save voices', !six, six || esPacks.length + ' Spanish voice packs kept, and the card says so');

    /* 8 ----- offline, the first word plays from the kept pack */
    const failedVoice = [];
    p2.on('requestfailed', r => { if (/media\/voice\//.test(r.url())) failedVoice.push(r.url()); });
    await ctx2.setOffline(true);
    let seven = '';
    try {
      await p2.reload({ waitUntil: 'load' }); await view2();
      const got = await p2.evaluate(async () => {
        const l = coreOrder(S.settings.lang)[0], text = lessonSaid(l)[0], lang = S.settings.lang;
        startLesson(l.id);
        const idx = await recIndex(lang), clip = idx && recClip(idx, text);
        if (!clip) return { text, why: 'the word has no recorded clip' };
        const buf = await recPack(lang, clip[0]);
        return { text, why: buf && buf.byteLength >= clip[1] + clip[2] ? '' : 'the pack did not load', played: await speak(text, lang) };
      });
      if (got.why) seven = got.why + ' (' + got.text + ')';
      else if (failedVoice.length) seven = 'voice requests failed: ' + failedVoice.slice(0, 2).join(', ');
    } catch (e) { seven = String(e.message).split('\n')[0]; }
    report('8 voices offline', !seven, seven || 'the first word’s recorded clip loaded with the network off');
    await ctx2.close();
  } finally {
    await browser.close(); srv.server.close();
    for (const t of tmps) fs.rmSync(t, { recursive: true, force: true });
  }
}
main().then(() => { console.log(results.every(Boolean) && results.length === 8 ? '\nAll eight steps passed.' : '\nSomething failed.'); process.exit(results.every(Boolean) && results.length === 8 ? 0 : 1); },
  e => { console.error(e && e.stack || e); console.log('FAIL (the check itself stopped: ' + String(e && e.message).split('\n')[0] + ')'); process.exit(1); });
