"use strict";
/* ===================== HELPERS ===================== */
const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)){
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rich(s){ return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function dayKey(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const today = () => dayKey(new Date());
function parseDay(k){ const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n){ const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); }
function weekOf(k){ const d = parseDay(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); }
function daysBetween(a, b){ return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
function plural(n, one, many){ return n === 1 ? one : (many || one + 's'); }
function reduced(){ try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
function hashStr(s){ let x = 2166136261; for (let i = 0; i < s.length; i++){ x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function haptic(p){ try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function busy(){ return !!(Run.active || Talk.open || Onb.open || Story.open || Film.open || Studio.open); }
/* little particle bursts for right answers, pairs, chests */
function burst(x, y, opts = {}){
  if (reduced() || !document.body) return;
  const n = opts.n || 12; const cs = getComputedStyle(document.documentElement);
  const colors = (opts.vars || ['--line', '--gold', '--ok', '--die', '--der']).map(v => cs.getPropertyValue(v).trim() || '#999');
  for (let i = 0; i < n; i++){
    const p = document.createElement('i'); p.className = 'spark-p' + (i % 3 === 0 ? ' sq' : '');
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5; const d = (opts.dist || 48) * (0.6 + Math.random() * 0.7);
    p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = colors[i % colors.length];
    document.body.append(p);
    if (p.animate){
      const an = p.animate([{ transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d).toFixed(1) + 'px,' + (Math.sin(a) * d - 10).toFixed(1) + 'px) scale(.2) rotate(' + (Math.random() * 300 | 0) + 'deg)', opacity: 0 }], { duration: 560 + Math.random() * 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      an.onfinish = () => p.remove();
    } else setTimeout(() => p.remove(), 30);
  }
}
function burstAt(el, opts){ if (!el || !el.getBoundingClientRect) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, opts); }

const IC = {
  close: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  music: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17.5V6.2l10-2.2v11.3"/><circle cx="6.6" cy="17.6" r="2.6" fill="currentColor"/><circle cx="16.6" cy="15.4" r="2.6" fill="currentColor"/></svg>',
  musicOff: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17.5V6.2l10-2.2v11.3"/><circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.4" r="2.6"/><path d="M3.5 3.5l17 17"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor" stroke="none"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11"/></svg>',
  slow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 15.5c0-4.2 3.6-7.5 8-7.5s8 3.3 8 7.5z"/><path d="M19.5 13.5H21a1.6 1.6 0 0 0 0-3.2h-1.6"/><path d="M6 15.5 5 18.5M10 15.5v3M14 15.5v3M18 15.5l1 3"/><path d="M8.7 8.8 10.4 11.5h3.2l1.7-2.7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12.6 2.5c.6 3.4 4.9 5.4 4.9 10.3a5.5 5.5 0 0 1-11 0c0-2.5 1.2-4 2.4-5 .1 2 .9 3.2 2.3 3.6-.5-3.4.2-6.3 1.4-8.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="draw" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  spark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.5 4.3 4.3 0 0 0 7 18z"/></svg>',
  device: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>',
  learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.5 5.5H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="13" height="13.5" rx="2.5"/><path d="M8 3.5h10a2.5 2.5 0 0 1 2.5 2.5v10.5"/></svg>',
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v11H10l-6 4z"/><path d="M8.5 10h7M8.5 13h4"/></svg>',
  words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17.5a3 3 0 0 1 3-3h11"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  wand: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M7 4l.6 1.6L9 6l-1.4.4L7 8l-.6-1.6L5 6l1.4-.4z"/></svg>',
  stories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4h11v16.5l-5.5-3.8-5.5 3.8z"/></svg>',
  translate: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 3v2M6 5c.8 3.5 3 6 6 7.5M11 5c-.8 3.5-3 6.5-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/></svg>'
};
function ic(name, cls){ return h('span', { class: 'ic' + (cls ? ' ' + cls : ''), html: IC[name], 'aria-hidden': 'true' }); }

