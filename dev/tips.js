"use strict";
/* Where each table lands in a tip that has no blank lines (dev only; dev/files.js does not publish it).

   node dev/tips.js            one summary line per language and a total
   node dev/tips.js --list     also one line per table that moves between the old and the new rule
   node dev/tips.js --check    exit 1 (printing the lesson ids) if the app's tipBites() puts a table anywhere but where
                               the new rule below does

   OLD rule: a table goes to the card whose bold words its caption names most (the last card if none does).
   NEW rule: for each card, a bold word (longer than two letters) in the caption scores 3 and one in the head or cells
   scores 1; the table goes to the highest score. A tie keeps the card the caption alone picks (if it is among the tied
   ones), else the last tied card. No points anywhere: the last card.
   "Unnamed": a table on a card none of whose bold words appear in the table's caption, head or cells.
   The tool cuts the tip into cards itself, so it checks tipBites() rather than repeating it. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), has = n => args.includes(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the app in jsdom, as dev/flow.js loadApp() does it */
async function loadApp(root, fn){
  const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
  const BASE = 'https://parlance.test/';
  class LocalOnly extends ResourceLoader {
    fetch(url){
      if (!url.startsWith(BASE)) return null;
      const file = path.join(root, decodeURIComponent(url.slice(BASE.length).split('?')[0]));
      const pr = fs.promises.readFile(file).catch(() => Buffer.from(''));
      pr.abort = () => {}; return pr;
    }
  }
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + page + '</body></html>', {
    url: BASE + 'index.html', runScripts: 'dangerously', resources: new LocalOnly(), pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse(w){
      w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} }); w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function(){}; w.HTMLCanvasElement.prototype.getContext = () => null;
      w.fetch = () => Promise.reject(new Error('offline'));
    }
  });
  await new Promise(r => { if (dom.window.document.readyState === 'complete') r(); else dom.window.addEventListener('load', r); });
  for (let i = 0; i < 500 && !dom.window.__parlance; i++) await sleep(20);
  if (!dom.window.__parlance) throw new Error('The app did not load in jsdom from ' + root + '. Run npm test to see why.');
  try { return await fn(dom.window.__parlance, dom.window); } finally { dom.window.close(); }
}

const plain = s => String(s).replace(/\*\*/g, '').toLowerCase();

/* the cards of a tip with no blank lines, as lists of bold words (the cut is the app's sentence-length rule) */
function cards(body){
  const sents = String(body).split(/(?<=[.!?)])\s+(?=[A-ZÄÖÜÁÉÍÓÚÑ¿¡*])/).map(x => x.trim()).filter(Boolean);
  const n = Math.max(1, Math.min(3, sents.length, Math.round(String(body).length / 200)));
  const total = sents.reduce((a, x) => a + x.length, 0), out = [];
  let cur = [], len = 0;
  for (const x of sents){
    cur.push(x); len += x.length;
    if (out.length < n - 1 && len >= total / n * (out.length + 1)){ out.push(cur.join(' ')); cur = []; }
  }
  if (cur.length) out.push(cur.join(' '));
  return out.map(b => [...b.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].toLowerCase()).filter(w => w.length > 2));
}
const count = (words, key) => words.filter(w => key.includes(w)).length;
const capKey = t => plain(t.cap);
const cellKey = t => plain([...(t.head || []), ...t.rows.flat()].join(' '));
/* the card the caption alone picks (the old rule) */
function oldAt(cs, t){
  let best = -1, at = cs.length - 1;
  cs.forEach((w, i) => { const hit = count(w, capKey(t)); if (hit > best && hit > 0){ best = hit; at = i; } });
  return at;
}
function newAt(cs, t){
  const sc = cs.map(w => 3 * count(w, capKey(t)) + count(w, cellKey(t))), mx = Math.max(...sc);
  let at = oldAt(cs, t);
  if (mx > 0 && sc[at] !== mx) at = sc.lastIndexOf(mx);
  return at;
}
const named = (cs, i, t) => count(cs[i], capKey(t) + ' ' + cellKey(t)) > 0;

async function main(){
  const list = has('--list'), check = has('--check');
  const lines = [], bad = [];
  const tot = { lessons: 0, tables: 0, moved: 0, a: 0, b: 0 };
  await loadApp(ROOT, (P, w) => {
    for (const [lang, c] of Object.entries(P.COURSE)){
      const s = { lessons: 0, tables: 0, moved: 0, a: 0, b: 0 };
      for (const l of c.units.flatMap(u => u.lessons)){
        const tip = l.tip;
        if (!tip || !tip.body || /\n\s*\n/.test(tip.body)) continue;
        const cs = cards(tip.body), tables = tip.tables || [];
        s.lessons++; s.tables += tables.length;
        let moved = false;
        tables.forEach(t => {
          const o = oldAt(cs, t), n = newAt(cs, t);
          if (!named(cs, o, t)) s.a++;
          if (!named(cs, n, t)) s.b++;
          if (o !== n){ moved = true; if (list) lines.push(l.id + '  ' + t.cap + ': card ' + (o + 1) + ' → card ' + (n + 1)); }
        });
        if (moved) s.moved++;
        if (check){
          const bs = w.eval('tipBites(getLesson(' + JSON.stringify(l.id) + ').tip)');
          const same = bs.length === cs.length && tables.every(t => bs.findIndex(b => b.tables.includes(t)) === newAt(cs, t));
          if (!same) bad.push(l.id);
        }
      }
      lines.push(lang + ': ' + s.lessons + ' lessons, ' + s.tables + ' tables, ' + s.moved + ' lessons change, unnamed before ' + s.a + ', after ' + s.b);
      for (const k of Object.keys(tot)) tot[k] += s[k];
    }
  });
  lines.push('total: ' + tot.lessons + ' lessons, ' + tot.tables + ' tables, ' + tot.moved + ' lessons change, unnamed before ' + tot.a + ', after ' + tot.b);
  console.log(lines.join('\n'));
  if (check){
    if (bad.length){ console.log('tipBites() differs from the rule in: ' + bad.join(', ')); process.exit(1); }
    console.log('check ok: tipBites() matches the rule in every lesson');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
