/* Checks the contrast of the color pairs Parlance draws text and controls with, in both themes, and that the two dark blocks
   in styles/tokens.css agree. Run by npm test.  Usage: node dev/contrast.js   (exit 1 on a failure or drift)
   A color used for text or for a control's edge gets a row in PAIRS: [foreground, background, minimum ratio, what it is].
   KNOWN accepts an exception as '<theme> <fg> <bg>': '<why>' - only when Matt accepts one. */
const fs = require('fs');
const path = require('path');
const TOKENS = path.join(__dirname, '..', 'styles', 'tokens.css');

const PAIRS = [
  ['--ink', '--bg', 4.5, 'body text on the page'], ['--ink', '--surface', 4.5, 'body text on a card'],
  ['--muted', '--bg', 4.5, 'secondary text on the page'], ['--muted', '--surface', 4.5, 'secondary text on a card'], ['--muted', '--surface-2', 4.5, 'secondary text on a flat card'],
  ['--de-ink', '--de', 4.5, 'German button text'], ['--es-ink', '--es', 4.5, 'Spanish button text'], ['--it-ink', '--it', 4.5, 'Italian button text'],
  ['--de-text', '--de-soft', 4.5, 'German text on its tint'], ['--es-text', '--es-soft', 4.5, 'Spanish text on its tint'], ['--it-text', '--it-soft', 4.5, 'Italian text on its tint'],
  ['--de-text', '--bg', 4.5, 'German link on the page'], ['--es-text', '--bg', 4.5, 'Spanish link on the page'], ['--it-text', '--bg', 4.5, 'Italian link on the page'],
  ['--de-text', '--surface', 4.5, 'German link on a card'], ['--es-text', '--surface', 4.5, 'Spanish link on a card'], ['--it-text', '--surface', 4.5, 'Italian link on a card'],
  ['--ok', '--ok-bg', 4.5, 'right-answer text'], ['--bad', '--bad-bg', 4.5, 'wrong-answer text'], ['--warn', '--warn-bg', 4.5, 'note text'],
  ['--surface', '--ok', 4.5, 'text on the right-answer button'], ['--surface', '--bad', 4.5, 'text on the wrong-answer button'],
  ['--der', '--surface', 4.5, 'der nouns on a card'], ['--die', '--surface', 4.5, 'die nouns on a card'], ['--das', '--surface', 4.5, 'das nouns on a card'], ['--pl', '--surface', 4.5, 'plural nouns on a card'],
  ['--der', '--bg', 4.5, 'der nouns on the page'], ['--die', '--bg', 4.5, 'die nouns on the page'], ['--das', '--bg', 4.5, 'das nouns on the page'], ['--pl', '--bg', 4.5, 'plural nouns on the page'],
  ['--de', '--bg', 3, 'German accent shapes'], ['--it', '--bg', 3, 'Italian accent shapes'],
  ['--streak-text', '--streak-bg', 4.5, 'the streak tile']
];
// accepted exceptions. (--es on --bg is deliberately not in PAIRS: mango is a fill with dark ink on it, never a thin shape on the page.)
const KNOWN = {};

const DECL = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
function decls(body){ const o = {}; let m; DECL.lastIndex = 0; while ((m = DECL.exec(body))) o[m[1]] = m[2].trim(); return o; }
// the text between the braces of the block that starts with `head` (no nested braces in tokens.css)
function block(css, head){ const i = css.indexOf(head); if (i < 0) throw new Error('tokens.css: no block ' + head); const s = css.indexOf('{', i) + 1; return css.slice(s, css.indexOf('}', s)); }
function resolve(map){
  const out = {};
  for (const k in map){ let v = map[k]; const m = /^var\((--[a-z0-9-]+)\)$/.exec(v); if (m && map[m[1]] != null) v = map[m[1]]; out[k] = v; }
  return out;
}
function themes(){
  const css = fs.readFileSync(TOKENS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const light = decls(block(css, ':root{'));
  const dark = Object.assign({}, light, decls(block(css, ':root[data-theme="dark"]{')));
  const darkMedia = Object.assign({}, light, decls(block(css, ':root:not([data-theme="light"]){')));
  return { light: resolve(light), dark: resolve(dark), darkMedia: resolve(darkMedia) };
}

function lum(hex){
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(fg, bg){
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (!hex.test(fg) || !hex.test(bg)) return null;
  const a = lum(fg), b = lum(bg);
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
}

function report(){
  const t = themes(), rows = [], failures = [];
  for (const theme of ['light', 'dark']){
    for (const [fg, bg, min, what] of PAIRS){
      const r = ratio(t[theme][fg], t[theme][bg]);
      if (r === null) continue;   // a token that isn't there, or isn't a plain #RRGGBB: skipped
      const key = theme + ' ' + fg + ' ' + bg;
      const status = r >= min ? 'pass' : (KNOWN[key] ? 'known' : 'fail');
      const row = { theme, fg, bg, min, what, ratio: r, status };
      rows.push(row);
      if (status === 'fail') failures.push(row);
    }
  }
  const drift = Object.keys(Object.assign({}, t.dark, t.darkMedia)).filter(k => t.dark[k] !== t.darkMedia[k]);
  return { rows, failures, drift };
}

if (require.main === module){
  const { rows, failures, drift } = report();
  for (const theme of ['light', 'dark']){
    console.log('\n' + theme);
    for (const r of rows.filter(x => x.theme === theme)) console.log('  ' + r.status.padEnd(5) + String(r.ratio.toFixed(2)).padStart(6) + ' (min ' + r.min + ')  ' + r.fg + ' on ' + r.bg + '  ' + r.what);
  }
  console.log('');
  if (failures.length || drift.length){
    for (const f of failures) console.log('FAIL ' + f.theme + ' ' + f.fg + ' on ' + f.bg + ': ' + f.ratio + ' < ' + f.min + ' (' + f.what + ')');
    if (drift.length) console.log('DRIFT the two dark blocks differ: ' + drift.join(', '));
    process.exit(1);
  }
  console.log('ok');
}
module.exports = { themes, ratio, report, PAIRS, KNOWN };
