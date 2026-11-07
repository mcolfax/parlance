"use strict";
/* Renders the intro film to video, one per bird, from the live film in js/ui/film.js. A phone plays video with its own
   hardware, so the film stays smooth however busy the picture is (see "Intro film" in docs/ARCHITECTURE.md).

   node dev/film.js                 every bird in MASCOTS (about 10 minutes a bird; birds render 3 at a time)
   node dev/film.js --bird kiwi     one bird
   node dev/film.js --check         says which videos no longer match the film (npm test checks the same)

   Needs Playwright (preinstalled in cloud sessions; otherwise NODE_PATH="$(npm root -g)") and ffmpeg with libx264.
   Writes media/film/<bird>.mp4 (720 x 1280, 60 frames a second, H.264, about 6 MB) and media/film/manifest.json, which
   holds each video's fingerprint: a hash of everything its picture is made from (the film's scenes, keyframes, moods and
   per-frame motion, every bird's rig, the film.css rules that draw it, and the colors it uses). Captions, sound effects and the song stay live in
   the app, so changing them needs no new video. After changing the film's picture, a bird, or a film color, run this
   and commit media/film/. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'media', 'film');
const FPS = 60, W = 360, H = 640, SCALE = 2, CRF = 26;
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };

/* The fingerprint. PRINT_EXPR runs in the page (a browser, or jsdom in the tests) with the learner's bird set to BIRD
   and returns everything the picture is drawn from; filmPrint() adds the stylesheet and colors and hashes it. */
const PRINT_EXPR = bird => '(() => { const keep = S.settings.mascot; S.settings.mascot = ' + JSON.stringify(bird) + '; try { ' +
  'const birds = Object.keys(MASCOTS).map(id => [id, Bird.birds[id] || null]); ' +
  'const code = [filmFX, filmActor, filmRigAt, filmRig, filmRender, beatPulse, kv, filmBack, Rig.create, ...Object.values(EASE)].map(String); ' +
  'return JSON.stringify([filmSVG(), filmActors(), filmLooks(), FILM_DUR, FILM_OUTRO, FRONDS, FIREFLIES, FILM_SAYS.map(s => [s[0], s[1]()]), code, birds], (k, v) => (k && k[0] === "_" ? undefined : v)); ' +
  '} finally { S.settings.mascot = keep; } })()';
function filmPrint(pageString, root = ROOT){
  // only the rules that draw the picture, not the buttons and transitions round it
  const css = fs.readFileSync(path.join(root, 'styles', 'film.css'), 'utf8').split('\n').filter(l => /^\.(f-(?!win|video|mute|x\b)|film-box|film-svg|cf\d|pp\d)/.test(l)).join('\n');
  const colors = fs.readFileSync(path.join(root, 'styles', 'tokens.css'), 'utf8').split('\n').filter(l => /--(film|pip|kiwi|mango|kakadu|rojo|chest)-/.test(l)).join('\n');
  return crypto.createHash('sha1').update(pageString).update(css).update(colors).digest('hex').slice(0, 16);
}
const manifestPath = path.join(OUT, 'manifest.json');
const readManifest = () => { try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { return { birds: {} }; } };

function serve(){
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const skeleton = '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + page + '</body></html>';
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/' || u === '/_film.html'){ res.writeHead(200, { 'content-type': 'text/html' }); return res.end(skeleton); }
    const file = path.join(ROOT, path.normalize(u).replace(/^([/\\])+/, ''));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}
function playwright(){
  try { return require('playwright'); } catch (e) {}
  return require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright'));
}

/* one page with the live film open for `bird`, its box pinned to the top left at 360 x 640, everything else hidden */
async function filmPage(browser, port, bird){
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
  await ctx.addInitScript(b => { localStorage.setItem('parlance.v2', JSON.stringify({ v: 10, settings: { onboarded: true, lang: 'de', seenVersion: '99.0.0', homeMusic: false, sfx: false, filmSeen: true, mascot: b } })); }, bird);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + port + '/_film.html');
  await page.waitForSelector('#tabs .tab', { timeout: 20000 });
  await page.evaluate(async () => { for (const id of Object.keys(MASCOTS)) { try { await loadMascot(id); } catch (e) {} } await document.fonts.ready; });
  await page.addStyleTag({ content: '.overlay.film .ov-head,.overlay.film .ov-foot,.film-cap,.film-big{display:none!important}.overlay.film .ov-body-in{padding:0!important;max-width:none!important}.film-box{position:fixed!important;left:0!important;top:0!important;width:' + W + 'px!important;transform:none!important}' });
  await page.evaluate(() => {
    openFilm({ autoplay: false, live: true });
    let prev = -1;
    /* one frame at time t: the bird says its line as the bubble pops up. After the last bar the birds dance on for
       FILM_OUTRO seconds, while the app closes the film's round window onto the bird. */
    window.__filmFrame = t => {
      if (t <= FILM_DUR) for (const [st, line] of FILM_SAYS) if (st > prev && st <= t && Film.rigs[filmStar()]) Film.rigs[filmStar()].say(line());
      prev = t;
      filmRender(t);
    };
  });
  await page.waitForTimeout(900);   // the film's own way in (a zoom) has finished
  return { ctx, page, errors };
}

async function render(browser, port, bird){
  const { ctx, page, errors } = await filmPage(browser, port, bird);
  const print = filmPrint(await page.evaluate(PRINT_EXPR(bird)));
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, bird + '.mp4'), tmp = file + '.part.mp4';
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-g', String(FPS / 2), '-movflags', '+faststart', '-an', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))); ff.on('error', rej); });
  const frames = Math.round((await page.evaluate(() => FILM_DUR + FILM_OUTRO)) * FPS) + 1, t0 = Date.now();
  for (let i = 0; i < frames; i++){
    await page.evaluate(t => window.__filmFrame(t), i / FPS);
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (i && i % 600 === 0) console.log('  ' + bird + ': ' + Math.round(i / FPS) + 's of the film, ' + Math.round((Date.now() - t0) / i) + ' ms a frame');
  }
  ff.stdin.end(); await done;
  fs.renameSync(tmp, file);
  await ctx.close();
  if (errors.length) throw new Error(bird + ': page errors while rendering: ' + errors.slice(0, 3).join('; '));
  const bytes = fs.statSync(file).size;
  console.log(bird + ': ' + path.relative(ROOT, file) + ', ' + frames + ' frames, ' + (bytes / 1048576).toFixed(1) + ' MB');
  return { print, bytes, frames };
}

async function main(){
  const { chromium } = playwright();
  const server = await serve(), port = server.address().port;
  const browser = await chromium.launch();
  const all = Object.keys(JSON.parse(execFileSync(process.execPath, ['-e', 'const vm=require("vm");const c={};vm.createContext(c);vm.runInContext(require("fs").readFileSync(' + JSON.stringify(path.join(ROOT, 'js', 'config.js')) + ',"utf8")+";this.__m=MASCOTS",c);console.log(JSON.stringify(c.__m))'], { encoding: 'utf8' })));
  const birds = opt('--bird') ? [opt('--bird')] : all;
  const man = readManifest(); man.birds = man.birds || {};
  try {
    if (args.includes('--check')){
      let stale = 0;
      for (const bird of birds){
        const { ctx, page } = await filmPage(browser, port, bird);
        const print = filmPrint(await page.evaluate(PRINT_EXPR(bird))); await ctx.close();
        const ok = man.birds[bird] && man.birds[bird].print === print && fs.existsSync(path.join(OUT, bird + '.mp4'));
        if (!ok) stale++;
        console.log(bird + ': ' + (ok ? 'up to date' : 'needs rendering'));
      }
      process.exitCode = stale ? 1 : 0;
      return;
    }
    const queue = birds.slice(), runs = [];
    for (let k = 0; k < Math.min(3, queue.length); k++) runs.push((async () => { while (queue.length){ const bird = queue.shift(); man.birds[bird] = await render(browser, port, bird); } })());
    await Promise.all(runs);
    Object.assign(man, { fps: FPS, width: W * SCALE, height: H * SCALE });
    man.birds = Object.fromEntries(Object.keys(man.birds).sort().map(k => [k, man.birds[k]]));
    fs.writeFileSync(manifestPath, JSON.stringify(man, null, 2) + '\n');
    console.log('Wrote ' + path.relative(ROOT, manifestPath) + '. Commit media/film/.');
  } finally { await browser.close(); server.close(); }
}

module.exports = { PRINT_EXPR, filmPrint, readManifest };
if (require.main === module) main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
