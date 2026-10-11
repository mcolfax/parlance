"use strict";
/* ===================== WEB HOST =====================
   Parlance has two homes. Inside the Claude artifact, window.claude provides accounts, the database and the
   tutor. The web version (built by dev/web.js, which sets window.PARLANCE_WEB) has no Claude, so this file
   provides the same window.claude.use() surface for 'db', 'user' and 'downloads', backed by our Supabase project (WEB in
   config.js). Sync, live content, feedback, names, sharing and Studio then work unchanged; the tutor stays
   Claude-only. Everywhere else (the artifact, the preview, the tests' Claude fakes) this file does nothing.
   Sign-in is email and password, or Google, through Supabase Auth's HTTP API. The session lives in this browser.
   ==================================================== */
const WEB_SESSION = 'parlance.web.session';
const Web = { on: false, ready: null, session: null, refreshing: null, settings: null, notice: '' };

/* ----- HTTP ----- */
function webError(status, d){
  const pg = d && typeof d.code === 'string' ? d.code : '';
  const code = ['42501', '23514', '22023', '54000'].includes(pg) ? 'invalid_argument' : pg === 'P0002' ? 'not_found'
    : pg === 'PGRST301' || pg === 'PGRST302' ? 'revoked' : status >= 500 ? 'unavailable' : 'failed';
  return { code, status, reason: (d && (d.error_code || d.code)) || '', message: (d && (d.message || d.msg || d.error_description)) || 'Request failed (' + status + ')' };
}
async function webFetch(path, opt = {}){
  const headers = { apikey: WEB.key };
  if (opt.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opt.auth !== false){ const t = await webToken(); if (t) headers.Authorization = 'Bearer ' + t; }
  let res;
  try { res = await fetch(WEB.url + path, { method: opt.method || (opt.body === undefined ? 'GET' : 'POST'), headers, body: opt.body === undefined ? undefined : JSON.stringify(opt.body) }); }
  catch (e){ throw { code: 'unavailable', status: 0, reason: '', message: 'Couldn’t reach the server' }; }
  const text = await res.text(); let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  if (!res.ok) throw webError(res.status, data);
  return data;
}
function webRpc(fn, args){ return webFetch('/rest/v1/rpc/' + fn, { body: args || {} }); }

/* ----- session ----- */
function webUser(u){
  const m = (u && u.user_metadata) || {}, pic = String(m.avatar_url || m.picture || '');   // Google sign-in brings a photo
  return { id: u.id, email: u.email || '', name: String(m.name || m.full_name || '').trim().slice(0, 40), avatar: /^https:\/\//.test(pic) ? pic : '' };
}
function webKeep(s){ Web.session = s; if (s) writeJSON(WEB_SESSION, s); else { try { localStorage.removeItem(WEB_SESSION); } catch (e) {} } }
function webAdopt(r){   // a token response from Supabase Auth, or the fragment Google sign-in returns with
  const now = Math.floor(Date.now() / 1000);
  webKeep({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: +r.expires_at || now + (+r.expires_in || 3600),
    user: r.user ? webUser(r.user) : (Web.session && Web.session.user) || null });
}
async function webToken(){
  const s = Web.session; if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  if (!Web.refreshing) Web.refreshing = webRefresh().finally(() => { Web.refreshing = null; });
  await Web.refreshing;
  if (!Web.session) throw { code: 'revoked', status: 401, reason: '', message: 'Signed out' };
  return Web.session.access_token;
}
async function webRefresh(){
  try { webAdopt(await webFetch('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: Web.session.refresh_token }, auth: false })); }
  catch (e){ if (e.status >= 400 && e.status < 500) webKeep(null); else throw e; }   // a refused refresh token means signed out
}
function webCleanUrl(){ try { history.replaceState(null, '', location.pathname); } catch (e) {} }
async function webStart(){
  const hash = new URLSearchParams(location.hash.replace(/^#/, '')), query = new URLSearchParams(location.search);
  if (hash.get('access_token') && hash.get('refresh_token')){
    webAdopt(Object.fromEntries(hash)); webCleanUrl();
    if (hash.get('type') === 'recovery') setTimeout(() => { if (typeof openWebNewPassword === 'function') openWebNewPassword(); }, 1200);   // from a "set a new password" email
  }
  else {
    const err = hash.get('error_description') || query.get('error_description');
    if (err){ Web.notice = err; webCleanUrl(); setTimeout(() => { if (typeof toast === 'function') toast('Couldn’t sign in: ' + err); }, 1500); }
    const s = readJSON(WEB_SESSION);
    Web.session = s && s.access_token && s.refresh_token ? s : null;
  }
  if (!Web.session) return;
  try {
    Web.session.user = webUser(await webFetch('/auth/v1/user')); webKeep(Web.session);
    if (Web.session.user.name) webRpc('profile_set', { n: Web.session.user.name }).catch(() => {});
  } catch (e){ if (e.code === 'revoked' || e.status === 401 || e.status === 403) webKeep(null); }
}

/* ----- sign-in (the sheet is openWebSignIn in me.js) ----- */
async function webSettings(){ if (!Web.settings) Web.settings = await webFetch('/auth/v1/settings', { auth: false }); return Web.settings; }
async function webSignIn(email, password){ webAdopt(await webFetch('/auth/v1/token?grant_type=password', { body: { email, password }, auth: false })); }
async function webSignUp(name, email, password){
  const r = await webFetch('/auth/v1/signup', { body: { email, password, data: { name } }, auth: false });
  if (!r || !r.access_token) throw { code: 'confirm', status: 200, reason: 'confirm', message: '' };   // the project still requires email confirmation
  webAdopt(r);
}
async function webRecover(email){ await webFetch('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { body: { email }, auth: false }); }
async function webUpdateUser(change){   // { password } or { data: { name } }
  const u = webUser(await webFetch('/auth/v1/user', { method: 'PUT', body: change }));
  Web.session.user = u; webKeep(Web.session);
  if (change.data && change.data.name !== undefined) await webRpc('profile_set', { n: u.name });
  return u;
}
function webGoogle(){ location.assign(WEB.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + location.pathname)); }
async function webSignOut(){ try { await webFetch('/auth/v1/logout', { method: 'POST' }); } catch (e) {} webKeep(null); }
function webReload(){ location.reload(); }

/* ----- the window.claude.use() surface: 'db' and 'user' ----- */
function webSnap(path, data){ return { id: path.split('/').pop(), exists: data != null, data: () => data == null ? undefined : JSON.parse(JSON.stringify(data)) }; }
function webDoc(path){
  return { id: path.split('/').pop(), path,
    async get(){ return webSnap(path, await webRpc('doc_get', { p: path })); },
    async set(d){ await webRpc('doc_set', { p: path, d: JSON.parse(JSON.stringify(d)) }); },
    async update(d){ await webRpc('doc_update', { p: path, d: JSON.parse(JSON.stringify(d)) }); } };
}
function webCollection(c){
  const get = async () => { const docs = ((await webRpc('doc_list', { c })) || []).map(r => webSnap(r.path, r.data)); return { docs, size: docs.length, empty: !docs.length }; };
  return { path: c, doc: id => webDoc(c + '/' + id), get,
    onSnapshot(next, fail){   // the artifact pushes changes; here we check every WEB.poll ms while the page is visible
      let stopped = false, timer = null;
      const tick = async () => {
        clearTimeout(timer); if (stopped) return;
        if (document.visibilityState !== 'hidden'){ try { const s = await get(); if (!stopped) next(s); } catch (e){ if (!stopped && fail) fail(e); } }
        if (!stopped) timer = setTimeout(tick, WEB.poll);
      };
      const onVis = () => { if (document.visibilityState === 'visible') tick(); };
      document.addEventListener('visibilitychange', onVis);
      tick();
      return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
    } };
}
const webDB = { doc: webDoc, collection: webCollection };
const webDownloads = {   // saves a file through the browser, like the artifact's downloads capability
  async save({ filename, data }){
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' })); a.download = filename;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
};
const webUserApi = {
  async id(){ return Web.session && Web.session.user ? Web.session.user.id : null; },
  async me(){ const u = Web.session && Web.session.user; return { id: u ? u.id : null, name: u ? u.name : '', avatarUrl: (u && u.avatar) || '' }; },
  async isOwner(){ if (!Web.session) return false; try { return !!(await webRpc('is_owner')); } catch (e){ return false; } },
  async profiles(ids){ const o = {}; for (const r of (await webRpc('profile_names', { ids })) || []) o[r.id] = { name: r.name }; return o; }
};
/* Home Screen: true when opened from the Home Screen icon; Chrome hands us its install prompt to offer in Me */
function webStandalone(){ return navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
function webIOS(){ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
if (!window.claude && window.PARLANCE_WEB && typeof WEB === 'object' && WEB.url){
  Web.on = true;
  window.addEventListener('beforeinstallprompt', e => { Web.install = e; });
  window.addEventListener('appinstalled', () => { Web.install = null; });
  Web.ready = webStart().catch(() => {});
  window.claude = { use: async name => { await Web.ready; return name === 'db' ? webDB : name === 'user' ? webUserApi : name === 'downloads' ? webDownloads : null; } };
}
