"use strict";
/* ===================== WORKS OFFLINE (web version only) =====================
   Registers dist/sw.js (built by dev/web.js from dev/sw.js), which keeps the app on the phone so it opens without a
   connection. The Claude artifact can't have a service worker: there, Offline.on stays false and nothing here runs. */
const Offline = { on: false, reg: null, ready: false, told: false };
function offlineStart(){
  if (!window.PARLANCE_WEB || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  Offline.on = true;
  /* offline.json says off:true when the kill switch is thrown (dev/web.js): then the page stops registering the worker and removes it */
  (navigator.onLine ? fetch('offline.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}, () => ({})) : Promise.resolve({})).then(m => {
    if (m && m.off){ Offline.on = false; return navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); }
    return navigator.serviceWorker.register('sw.js').then(reg => { Offline.reg = reg; return navigator.serviceWorker.ready; }).then(() => { Offline.ready = true; });
  }).catch(() => { Offline.on = false; });
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
