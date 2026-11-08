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
