# Works offline: the web app opens and teaches without a connection

- **Cycle:** set when promoted (premium program P2, `flow/PREMIUM.md`)
- **Status:** queued (promote: move to `flow/plans/<cycle date>-p2-works-offline.md`, set Release, Base and `approved`)
- **Release:** 4.33.0, or the next free minor when promoted
- **Base:** `main` at promotion time (nothing below depends on line numbers)
- **Proposals built:** web `proposals/pfmw53mrwk`, "Make the web app work offline", approved by Matt himself in chat on 2026-11-06, on one condition: it must cost nothing. Check its status before building (POLICY "If Matt approved a Red proposal himself").
- **Roadmap items:** R-28

## Why this, why now

Matt uses the web version from his Android Home Screen. With no connection (the subway, a plane, a weak signal), it shows nothing. A **service worker** keeps a copy of the app on the phone (about 6 MB: pages, scripts, styles, course content, pictures, scenes, voice indexes). Every lesson, review, story and practice session then opens offline, and progress syncs when the connection comes back, as it already does. Voices are bigger (about 28 MB per language), so they're kept as you use them, with a **Save voices for offline** button in Me to keep a whole language. The two fonts are self-hosted, so the app looks the same offline.

**It costs nothing.** A service worker runs in the browser. Vercel's free Hobby plan serves the files (100 GB a month; this adds about 6 MB per phone, then only the files that changed in each release, plus 28 MB per language for anyone who saves voices). No server, no new service, no Supabase change. `vercel.json` already allows a same-origin worker (`worker-src 'self' blob:`), so it doesn't change.

The Claude artifact can't have a service worker, so everything here is web-only. In the artifact, the new code does nothing.

## Gate

| Package | Zone | Why | Extra checks |
|---|---|---|---|
| WP1 | Red, approved by Matt (proposal above) | `dev/web.js` builds the worker (POLICY Red: `dev/web.js`). The guard reports STOP for it; that STOP is covered by the approved proposal | No change to `vercel.json`, `host.js`, the database or its rules; nothing new is sent anywhere; the artifact is unaffected; a version's files always come from that version; a kill switch exists (Risks) |
| WP2 | Green | Self-hosting the two fonts the app already uses (OFL licensed) removes an outside host; no visual change | The fonts look identical in the screenshots; the artifact still shows them (check after publish) |
| WP3 | Amber | Audio files (voice packs) cached on the phone; Friends shows an offline notice (POLICY "Audio and speech", "Friends") | No new database path; nothing about what a card shares changes |

## Work packages

They run **one after another** (WP1, WP2, WP3) on the cycle branch: WP2 and WP3 both build on WP1's files.

### WP1 — The service worker

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** first
- **Owns (may edit):** new `dev/sw.js` (the worker's source); `dev/web.js` (writes `dist/sw.js` and `dist/offline.json`); new `js/core/offline.js`; `index.html` (one script tag, directly after `js/core/host.js`); `js/core/remote.js` (the Refresh button's `onclick`); new `dev/offline.js` (a Playwright check); `package.json` (one script); `dev/test.js` (one block)
- **Reads first:** all of `dev/web.js` (45 lines); `dev/files.js`; `checkUpdateBanner()` in `js/core/remote.js`; `recFetch()` in `js/core/audio.js` (voice packs and indexes are fetched whole, never with a Range header); `serve()` and `playwright()` in `dev/flow.js` (to copy for `dev/offline.js`); the `vercel.json` Content-Security-Policy (to confirm nothing needs changing).
- **Must not touch:** `vercel.json`, `js/core/host.js`, `dev/supabase.sql`, the inline flag script in `dev/web.js` (its hash is in `vercel.json`).

**Spec.**

*How it caches.* At build time, `dev/web.js` lists every file in `dist/` with a short content hash and size. Each file is cached under `<path>?v=<hash>`, so a version's files always match each other, and a new release fetches only the files whose hash changed. Files are **precached** when the worker installs, except voice packs (`media/voice/*.mp3`) and the theme song (`media/abc-adventure.*`). Those are **lazy**: cached the first time they're fetched, and only if their hash matches. `dev/`, `docs/` and `styleguide.html` are left out. Requests to other origins (Supabase, Google Fonts until WP2) are never touched. A new release reaches the phone when the browser sees a new `sw.js` (it checks on every navigation; Vercel serves it with `max-age=0`). The new worker installs, fetches only the changed files, takes over at once (`skipWaiting`, `clients.claim`), and deletes cache entries no longer listed.

*`dev/sw.js`* (the source; `dev/web.js` replaces the two placeholders):
```js
/* Parlance's service worker, for the web version only (the Claude artifact can't have one). dev/web.js writes dist/sw.js from
   this file with VERSION and MANIFEST filled in. MANIFEST: { path: [hash, bytes, lazy] } for every file the web version serves
   (not dev/, docs/ or styleguide.html). Each file is cached as <path>?v=<hash>, so one version's files always match; lazy files
   (voice packs, the theme song) are cached when first fetched, and only if their hash matches. */
const VERSION = '__VERSION__';
const MANIFEST = __MANIFEST__;
const CACHE = 'parlance';
const SCOPE = new URL(self.registration.scope);
const keyOf = p => new URL(p + '?v=' + MANIFEST[p][0], SCOPE).href;
async function hashOf(res){ const buf = await res.clone().arrayBuffer(), d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf)); return [...d.slice(0, 6)].map(b => b.toString(16).padStart(2, '0')).join(''); }
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  for (const p of Object.keys(MANIFEST)){
    if (MANIFEST[p][2] || await c.match(keyOf(p))) continue;
    const r = await fetch(new URL(p, SCOPE).href, { cache: 'no-cache' });
    if (!r.ok) throw new Error(p + ' ' + r.status);   // a failed install keeps the old version whole
    await c.put(keyOf(p), r);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE), keep = new Set(Object.keys(MANIFEST).map(keyOf));
  for (const r of await c.keys()) if (!keep.has(r.url)) await c.delete(r);
  await self.clients.claim();
})()));
function pathOf(req){
  const u = new URL(req.url); if (u.origin !== SCOPE.origin || !u.pathname.startsWith(SCOPE.pathname)) return null;
  let p = decodeURIComponent(u.pathname.slice(SCOPE.pathname.length));
  if (req.mode === 'navigate' && (p === '' || p === 'index.html')) p = 'index.html';
  return MANIFEST[p] ? p : null;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;   // audio elements ask for ranges: leave those to the network
  const p = pathOf(req); if (!p) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(keyOf(p));
    if (hit) return hit;
    const r = await fetch(new URL(p, SCOPE).href, { cache: 'no-cache' });
    if (!r.ok) return r;
    if (await hashOf(r) === MANIFEST[p][0]){ c.put(keyOf(p), r.clone()); return r; }
    self.registration.update();   // the site has a newer version than this worker
    return MANIFEST[p][2] ? new Response('', { status: 409 }) : r;   // a lazy file from another version would not match its index: refuse it (the voice falls back to the device's)
  })());
});
self.addEventListener('message', e => { if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION }); });
```

*`dev/web.js`*:
- At the top: `const OFFLINE = true;   // false writes a worker that removes itself and its cache (the kill switch, flow/plans/…-p2-works-offline.md)`.
- Wrap the build in `function build(){ … }` and run it with `if (require.main === module) build();`. Export `module.exports = { writeServiceWorker }`.
- After everything else is written to `dist/`, call `writeServiceWorker(OUT)`:
```js
/* dist/sw.js and dist/offline.json: every served file with a short content hash, its size and whether it's lazy */
function writeServiceWorker(out){
  const crypto = require('crypto'), list = {};
  const walk = d => { for (const n of fs.readdirSync(path.join(out, d))){ const rel = d ? d + '/' + n : n, abs = path.join(out, rel);
    if (fs.statSync(abs).isDirectory()) walk(rel);
    else if (!/^(dev|docs)\//.test(rel) && !['styleguide.html', 'sw.js', 'offline.json'].includes(rel)){
      const buf = fs.readFileSync(abs);
      list[rel] = [crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12), buf.length, /^media\/voice\/.*\.mp3$/.test(rel) || /^media\/abc-adventure\./.test(rel) ? 1 : 0];
    } } };
  walk('');
  const version = (/const APP_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(out, 'js', 'config.js'), 'utf8')) || [])[1] || '';
  const src = OFFLINE ? fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8').replace("'__VERSION__'", JSON.stringify(version)).replace('__MANIFEST__', JSON.stringify(list))
    : "self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(caches.delete('parlance').then(() => self.registration.unregister())));\n";
  fs.writeFileSync(path.join(out, 'sw.js'), src);
  fs.writeFileSync(path.join(out, 'offline.json'), JSON.stringify({ version, files: list }));
  return list;
}
```
(The hash is the first 12 hex digits of SHA-256, the same 6 bytes `hashOf()` in the worker reads.)

*`js/core/offline.js`*:
```js
"use strict";
/* ===================== WORKS OFFLINE (web version only) =====================
   Registers dist/sw.js (built by dev/web.js from dev/sw.js), which keeps the app on the phone so it opens without a
   connection. The Claude artifact can't have a service worker: there, Offline.on stays false and nothing here runs. */
const Offline = { on: false, reg: null, ready: false, told: false };
function offlineStart(){
  if (!window.PARLANCE_WEB || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  Offline.on = true;
  navigator.serviceWorker.register('sw.js').then(reg => { Offline.reg = reg; return navigator.serviceWorker.ready; }).then(() => { Offline.ready = true; }).catch(() => { Offline.on = false; });
  window.addEventListener('offline', () => {
    if (!Offline.ready || Offline.told || typeof toast !== 'function') return;
    Offline.told = true; toast('You’re offline. Lessons, reviews and stories still work, and your progress syncs when you’re back.');
  });
}
/* before a Refresh: let the new version's worker arrive and take over, so the reload opens the new version (at most ms) */
function offlineUpdate(ms){
  const reg = Offline.reg; if (!reg || !navigator.onLine) return Promise.resolve();
  return new Promise(res => {
    let t = 0; const done = () => { clearTimeout(t); navigator.serviceWorker.removeEventListener('controllerchange', done); res(); };
    t = setTimeout(done, ms || 8000);
    navigator.serviceWorker.addEventListener('controllerchange', done);
    reg.update().then(() => { if (!reg.installing && !reg.waiting) done(); }, done);
  });
}
offlineStart();
```

*Refresh* (`checkUpdateBanner()` in `js/core/remote.js`): the button's `onclick` becomes `e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Updating…'; saveLocal(); syncNow(); (typeof offlineUpdate === 'function' ? offlineUpdate() : Promise.resolve()).then(() => setTimeout(() => { try { location.reload(); } catch (err) { toast('Close and reopen Parlance to update.'); } }, 350)); }`.

*`dev/offline.js`* (run as `npm run offline-check`; add `"offline-check": "node dev/offline.js"` to `package.json` scripts). Copy `serve()` and `playwright()` from `dev/flow.js` (serving a given folder; `/` → `index.html`; add `.webmanifest` → `application/manifest+json` and `.woff2` → `font/woff2`). Then, printing `PASS`/`FAIL <what>` per check and exiting 1 on any failure:
1. `node dev/web.js`. Check `dist/sw.js` has no `__MANIFEST__` or `__VERSION__` left, `dist/offline.json` lists `index.html`, every `js/**/*.js` that `index.html` loads, `media/voice/es.json` (not lazy) and at least one lazy `media/voice/*.mp3`, and that each listed hash equals the file's.
2. Serve `dist/` on `127.0.0.1` (a secure context, so the worker registers). Open it at 412 × 915 with the same localStorage as `dev/flow.js shots` (onboarded, film seen, music and sounds off). Wait until `navigator.serviceWorker.controller` is set (reload once if needed) and the Cache Storage `parlance` holds every non-lazy file.
3. `context.setOffline(true)`, reload: `#app .view` appears within 10 s; visit Learn, Stories, Review and Me (click the tab buttons); `startLesson(coreOrder(S.settings.lang)[0].id)`, then `Run.pos = Run.queue.length; nextEx()`, Continue: the lesson is in `JSON.parse(localStorage['parlance.v2'])` progress. No page errors (ignore failed requests to other origins).
4. Online again. Make a second build: copy `dist/` to a temp folder, change `APP_VERSION` in its `js/config.js` to `9.9.9`, run `require('./web.js').writeServiceWorker(tmp)`, and serve that folder on the same port instead. In the page, `await offlineUpdate()` then reload: `APP_VERSION === '9.9.9'`, and Cache Storage no longer holds the old `js/config.js` key.
5. Kill switch: build a third folder the same way with `OFFLINE` forced false (write the kill-switch worker text directly, as `writeServiceWorker` does), serve it, `offlineUpdate()`, reload twice: `navigator.serviceWorker.controller` is null and the `parlance` cache is gone.

*`dev/test.js`* (jsdom, the artifact build): one block directly **before** `// placement: all right goes to the top`: `offline: nothing runs in the artifact` (`Offline.on === false` and `Offline.reg === null`); `offline: Refresh still reloads` (with the update banner shown, clicking Refresh calls `location.reload` within 1 s; stub `location.reload` the way the page allows, or check that `offlineUpdate()` resolves at once when `Offline.reg` is null).

**Steps.**
1. `dev/sw.js`; `dev/web.js` (`OFFLINE`, `build()`, `writeServiceWorker`).
2. `js/core/offline.js`; its script tag after `js/core/host.js` in `index.html`.
3. The Refresh change in `js/core/remote.js`.
4. `dev/offline.js` and the `package.json` script.
5. The jsdom checks.
6. `npm test` (FAIL 0; it already runs `node dev/web.js` and checks the inline script's hash against `vercel.json`, which must still match because that script doesn't change), `npm run offline-check` (all PASS), `node dev/flow.js guard` (the only STOP line is `dev/web.js`, covered by the approved proposal), commit.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with the two new checks.
- [ ] `npm run offline-check` prints PASS for all five steps.
- [ ] `vercel.json`, `js/core/host.js` and `dev/supabase.sql` are unchanged (`git diff --stat` shows none of them).
- [ ] `node dev/flow.js guard`: no FIX; any STOP names only files this approved proposal covers.

**Stop and report if:** the worker needs a change to `vercel.json` (the CSP or headers) to register; a check shows files from two versions served together; or sign-in breaks with the worker on (the Google sign-in redirect lands on `/` with a `#` fragment, which the worker serves as `index.html`; if anything else in the sign-in flow is served from cache, exclude that path and say so).

### WP2 — Self-hosted fonts

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP1
- **Owns (may edit):** new `media/fonts/` (woff2 files and their licence), new `styles/fonts.css`, `index.html` (the Google Fonts lines), `styleguide.html` (the same lines), `dev/test.js` (one check)
- **Reads first:** the `<link>` lines for `fonts.googleapis.com` and `fonts.gstatic.com` in `index.html` and `styleguide.html`; `--display` and `--body` in `styles/tokens.css` (the families are `"Fredoka"` and `"Nunito"`; keep those names).
- **Must not touch:** `styles/tokens.css`, `vercel.json`.

**Spec.** Today the page loads `Fredoka` (weights 500–700) and `Nunito` (400–800, and italic 400) from Google Fonts. Self-host the same variable fonts:
1. In the scratchpad, `npm pack @fontsource-variable/fredoka@5.3.0 @fontsource-variable/nunito@5.3.0` and unpack both. Don't add them to `package.json`.
2. Copy into `media/fonts/`: `fredoka-latin-wght-normal.woff2`, `fredoka-latin-ext-wght-normal.woff2`, `nunito-latin-wght-normal.woff2`, `nunito-latin-ext-wght-normal.woff2`, `nunito-latin-wght-italic.woff2`, `nunito-latin-ext-wght-italic.woff2`. Copy each package's `LICENSE` as `media/fonts/OFL-fredoka.txt` and `media/fonts/OFL-nunito.txt`.
3. `styles/fonts.css`: one `@font-face` per file with `font-family: "Fredoka"` or `"Nunito"`, `font-style`, `font-weight: 300 700` (Fredoka) or `200 1000` (Nunito), `font-display: swap`, `src: url(../media/fonts/<file>) format("woff2")`, and the `unicode-range` copied from the package's own CSS for that subset. A comment at the top names the packages and versions and the OFL licence.
4. In `index.html` and `styleguide.html`, replace the Google Fonts `preconnect` and `stylesheet` lines with `<link rel="stylesheet" href="styles/fonts.css">`, placed before `styles/tokens.css`.

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with a new check `fonts: no outside font host` (`index.html` contains neither `fonts.googleapis.com` nor `fonts.gstatic.com`, and every `url(…)` in `styles/fonts.css` points at a file that exists).
- [ ] `node dev/flow.js shots --steps "tab:Learn;shot:fonts-learn;tab:Me;shot:fonts-me"` looks the same as before the change: compare against shots taken on the base commit; the headings are Fredoka, the body is Nunito, ä ö ü ß ñ à è show in the same faces, light and dark.
- [ ] `npm run offline-check` still passes, and its offline step now shows the same fonts as online.
- [ ] `node dev/flow.js guard`: no FIX.

**Stop and report if:** a glyph the course uses falls back to another font (check the special characters in `LANGS[*].chars`), or `npm pack` can't reach the registry.

### WP3 — Offline in the app

- **Agent:** parlance-builder
- **Model:** sonnet
- **Runs:** after WP2
- **Owns (may edit):** `js/core/offline.js` (new `offlineVoices`, `saveVoices`), `js/ui/me.js` (new `offlineCard`; one call in `viewMe`), `js/ui/friends.js` (one notice at the top of `viewFriends`), `styles/components.css` (one `.offline-card` rule), `dev/offline.js` (two more steps), `dev/test.js` (one block)
- **Reads first:** `js/core/offline.js` (WP1); `viewMe()` (the "Your progress is saved" card) and `webHomeScreenCard()` in `js/ui/me.js`; `viewFriends()` in `js/ui/friends.js`; `recIndex()` and `recPack()` in `js/core/audio.js` (pack names come from `media/voice/<lang>.json`).
- **Must not touch:** `js/core/audio.js`, `js/core/social.js`, `dev/sw.js`, `dev/web.js`.

**Spec.**
- `js/core/offline.js`:
```js
/* the voice files for a language, from offline.json (the worker's list): which are kept on this phone, and their size */
async function offlineVoices(lang){
  const m = await (await fetch('offline.json')).json(), c = await caches.open('parlance');
  const packs = Object.keys(m.files).filter(p => p.startsWith('media/voice/' + lang + '-') && p.endsWith('.mp3'));
  let kept = 0, bytes = 0;
  for (const p of packs){ bytes += m.files[p][1]; if (await c.match(new URL(p + '?v=' + m.files[p][0], location.href).href)) kept++; }
  return { packs, kept, total: packs.length, mb: Math.round(bytes / 1048576) };
}
/* fetch each pack once; the worker keeps it. onStep(done, total) after each */
async function saveVoices(lang, onStep){
  const v = await offlineVoices(lang); let n = 0;
  for (const p of v.packs){ try { await fetch(p); } catch (e) {} onStep(++n, v.total); }
  return offlineVoices(lang);
}
```
- `offlineCard()` in `js/ui/me.js`, appended right after the "Your progress is saved" card, only when `Offline.on`:
  - `h3`: `Use Parlance offline`
  - `p.small.muted`: `Parlance is kept on this phone, so lessons, reviews and stories open without a connection. Your progress syncs when you’re back online.`
  - A voice line filled in after `offlineVoices(lang)` resolves (show `Checking voices…` until then). When `kept === total`: `ic('check')` and `<Language> voices are saved for offline.` Otherwise, a `btn btn-quiet btn-sm` button `Save <Language> voices for offline (<mb> MB)` and `p.small.muted` `Until then, lessons you haven’t opened yet use your phone’s own voice when offline. Best on Wi-Fi.` While saving: the button is disabled and reads `Saving voices… <n> of <total>`, and when done the line redraws.
  - If `navigator.onLine` is false, the button is disabled and the note reads `Connect to save voices.`
- `viewFriends()`: when `!navigator.onLine`, the first thing after the top bar is `h('div', { class: 'notice' }, 'Friends needs a connection. Everything else works offline, and your progress syncs when you’re back.')`.
- CSS: `.offline-card .row{align-items:center;gap:8px}`.
- `dev/offline.js`: two more steps: (6) online, on Me, `Save Spanish voices for offline` saves every `media/voice/es-*.mp3` into the cache and the line then reads `Spanish voices are saved for offline.`; (7) offline, a lesson's first word plays its recorded clip (the request for its pack is answered from the cache: check with `page.on('requestfailed')` that no `media/voice` request failed).

**Acceptance criteria:**
- [ ] `npm test` ends with FAIL 0, with a new check `offline: no offline card in the artifact` (`#app .offline-card` is absent in the jsdom page, where `Offline.on` is false) and `offline: Friends says it needs a connection` (with `navigator.onLine` stubbed false, the Friends tab shows the notice).
- [ ] `npm run offline-check` prints PASS for all seven steps.
- [ ] `node dev/flow.js guard`: no FIX.

**Stop and report if:** saving a language's voices would need more than one request per pack, or anything in `social.js` throws offline (report the error; don't change the Friends data code).

## Integration

After WP3 (`parlance-chores`, Haiku):
- [ ] `js/config.js`: `APP_VERSION` and the `RELEASES` entry below.
- [ ] `docs/ARCHITECTURE.md`, "Two homes": a bullet: "**Works offline (web only).** `dev/web.js` writes `dist/sw.js` (from `dev/sw.js`) and `dist/offline.json`: every served file with a content hash. The worker precaches the app (about 6 MB) and keeps voice packs and the theme song when first fetched (or all of a language's voices from Me → Use Parlance offline). Each file is cached as `<path>?v=<hash>`, so one version's files always match; a new release takes over when the browser sees the new `sw.js`, and Refresh waits for it (`offlineUpdate()`). Kill switch: `OFFLINE = false` in `dev/web.js` ships a worker that removes itself. The artifact has none (`Offline.on` is false)." In "Where things live", add `js/core/offline.js`, `dev/sw.js`, `dev/offline.js` and `styles/fonts.css` / `media/fonts/` rows.
- [ ] `CLAUDE.md`, "Commands": `npm run offline-check   # the web version offline: builds dist/, checks the worker, caching, updates and the kill switch (Playwright)`.
- [ ] No content changed: no pictures, no voices.

## Release notes

- **Title:** Works offline
- **Notes:**
  - The web version now works without a connection. Lessons, reviews, stories and practice all open offline, and your progress syncs when you're back.
  - Save a language's voices for offline in Me, so every word and story is read aloud even on a plane.

## Verification plan

- Commands: `npm test` (FAIL 0), `npm run offline-check` (all PASS), `node dev/flow.js guard` (STOP only for the approved files).
- Screens: the WP2 font comparison; Me with the offline card (`node dev/flow.js shots` doesn't set `PARLANCE_WEB`, so take this one from `dev/offline.js`: add `--shots <folder>` to it to save a 412px screenshot of Me online and of Learn offline, light and dark).
- Spot checks for the reviewer: read `dev/sw.js` line by line. Install never leaves a half-cached version (any failed fetch fails the install). Fetch never stores a file under another version's hash. Cross-origin, POST and Range requests pass through. Activate deletes only `parlance` cache keys not in the manifest.
- **After shipping, Matt's phone check:** open the Home Screen app online once, wait 30 seconds, then turn on airplane mode and open it again. It should open on Learn, and a lesson should run. Save Spanish voices in Me on Wi-Fi, then play a story offline.

## Risks and rollback

- **A stuck old version** is the classic service-worker failure. Prevention: `skipWaiting` + `clients.claim`, `sw.js` served with `max-age=0`, Refresh waits for the new worker, and the update test in `offline-check`. **Kill switch:** set `OFFLINE = false` in `dev/web.js` and push to `main`. Every phone's worker then deletes its cache and unregisters on the next open, and the site works exactly as before. Then fix and turn it back on.
- **Storage:** about 6 MB, plus up to 28 MB per language if voices are saved. The browser may clear it under storage pressure; the app then loads from the network as it does today.
- **Old page, new deploy:** a page left open across a release can fetch a voice pack from the new version. The worker refuses a mismatched lazy file (the voice falls back to the device's), the same way today's page would get a mismatched pack.
- **The artifact** is untouched: `Offline.on` stays false there, and the fonts are the same faces from the artifact's own files. The orchestrator checks the published artifact shows Fredoka and Nunito after publishing. If it doesn't, revert WP2 alone (patch release).

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** | **Dropped:** | **Escalated:**
- **Notes for the next cycle:** Promote `flow/plans/queue/p3-keep-going.md`.
