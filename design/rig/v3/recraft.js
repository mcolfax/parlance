/* Birds v3: new bird designs with Recraft (see PLAN.md, Stage A).
   Usage: node design/rig/v3/recraft.js <command>
     balance                       API units left (1,000 units = 1 USD)
     round1 [--dry]                Pip in four style directions, 3 images each (12 × 0.08 USD) → candidates/pip-<dir>-<k>.svg
     sheet <dir> [--dry]           Pip's model sheet in the chosen direction: turnaround, expressions, action poses,
                                   parts layout (SHEETS below; 4 images each) → candidates/pip-<dir>-<sheet>-<k>.svg
   Options: --max-usd 5 (stops before a run would take this file's total past it), --n (images per prompt).
   The Recraft key is a network secret: the proxy adds the Authorization header, so this sends no token.
   Every call's credits are added to recraft-usage.json (commit it). Image URLs last about a day: downloaded at once. */
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY){
  const r = require('child_process').spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
  process.exit(r.status === null ? 1 : r.status);
}
const fs = require('fs'), path = require('path');
const HERE = __dirname, CAND = path.join(HERE, 'candidates'), USAGE = path.join(HERE, 'recraft-usage.json');
const BASE = 'https://external.api.recraft.ai/v1', MODEL = 'recraftv4_1_vector', PRICE = 0.08;
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DRY = flag('--dry'), MAX_USD = +(opt('--max-usd') || 5);

/* Who Pip is, in every prompt. Colors are Pip's tokens (styles/tokens.css). */
const PIP = 'Pip, a young parrot mascot, chatty and curious. Teal body (#06777C), cream belly (#F9EFD6), golden hooked beak (#F6B340), ' +
  'crest of three rounded feathers (red-orange #EE5F35 middle, golden #F7B440 sides), short red-orange tail (#F06137), grey three-toed feet, ' +
  'big round eyes with dark pupils and a white highlight.';
/* What makes a design easy to rig and animate in 2D: Rive builds the bird from separate shapes. */
const RIG = 'Built for 2D rigging: head, body, wings, tail, legs and crest feathers are clear separate shapes with simple silhouettes. ' +
  'Standing, wings folded, three-quarter view to the right, whole body visible, centered, transparent background, no text, no shadow.';
const DIRS = {
  soft: 'Premium mobile-game mascot style: chunky rounded forms, appealing squash-friendly proportions with a large head, two-tone cel shading ' +
    '(one darker shade shape on each form, one soft highlight), thick smooth dark green outline (#0B2A1E) that tapers at the ends, polished and bright.',
  shape: 'Modern shape-led vector style with no outlines: forms defined by color blocks, a darker tone of each color for shade and a lighter tone for ' +
    'light, crisp geometric curves, sophisticated and clean like a premium editorial illustration.',
  sticker: 'Sticker illustration style: thick even dark green outline (#0B2A1E) around every shape, flat fills with one soft shade shape, no ' +
    'gradients, no texture, warm saturated colors, the same hand as a friendly cartoon cast of people.',
  plush: 'Soft plush-toy style: very round and huggable, the head about half of the body height, small wings, minimal features, gentle two-tone ' +
    'shading, thin soft dark outline (#0B2A1E), cute and calm.'
};
/* The model sheet for the chosen direction (sheet command). Each is one wide image. */
const SHEETS = {
  turn: 'Character model sheet, five views of the same character side by side at the same size on one line: front, three-quarter right, side ' +
    'right, three-quarter back, back. Same pose (standing, wings folded) in every view, consistent proportions and colors.',
  faces: 'Expression sheet: the same character\'s head and shoulders shown eight times in a 4 by 2 grid: happy, laughing with eyes closed, ' +
    'surprised, worried, sad, thinking, sleepy, in love. Consistent design, only the face and crest change.',
  poses: 'Action pose sheet: the same character in six full-body poses in a 3 by 2 grid: cheering with both wings raised high, waving one wing, ' +
    'hopping mid-air, flying with wings spread, pointing forward with one wing, shrugging. Strong clear silhouettes, consistent design.',
  parts: 'Rigging parts layout: the same character taken apart into separate pieces spaced apart: head without crest, three crest ' +
    'feathers, eyes open and closed, upper and lower beak, body with belly, wing folded, wing spread, tail, leg and foot. Each piece whole.'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const spent = () => readJSON(USAGE, { units: 0 }).units / 1000;
function record(kind, id, n, units){
  const u = readJSON(USAGE, { note: 'Recraft API units spent on the v3 bird designs (1,000 units = 1 USD).', units: 0, calls: [] });
  u.units += units; u.calls.push({ at: new Date().toISOString().slice(0, 16), kind, id, n, units });
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1) + '\n');
}
async function api(method, route, body){
  for (let i = 0; ; i++){
    const res = await fetch(BASE + route, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    if ((res.status === 429 || res.status >= 500) && i < 3){ await sleep(2000 * 2 ** i); continue; }
    throw new Error('Recraft answered ' + res.status + ' to ' + method + ' ' + route + ': ' + text.slice(0, 400));
  }
}
async function gen(id, prompt, n, size){
  if (prompt.length > 1000) throw new Error(id + ': prompt is ' + prompt.length + ' characters (Recraft takes 1,000)');
  const cost = n * PRICE;
  console.log(id + ': ' + n + ' × ' + MODEL + ' ' + size + ' = ' + cost.toFixed(2) + ' USD (spent ' + spent().toFixed(2) + ', cap ' + MAX_USD + ')');
  if (DRY){ console.log('  ' + prompt.length + ' chars: ' + prompt); return; }
  if (spent() + cost > MAX_USD) throw new Error('Stopping: this would pass the --max-usd cap of ' + MAX_USD);
  const res = await api('POST', '/images/generations', { prompt, model: MODEL, size, n, response_format: 'url' });
  record('gen', id, n, res.credits || Math.round(cost * 1000));
  fs.mkdirSync(CAND, { recursive: true });
  for (const [k, d] of res.data.entries()){
    const svg = await (await fetch(d.url)).text();
    if (!/<svg[\s>]/.test(svg)) throw new Error('Not an SVG: ' + svg.slice(0, 80));
    const f = path.join(CAND, id + '-' + (k + 1) + '.svg'); fs.writeFileSync(f, svg); console.log('  wrote ' + path.relative(process.cwd(), f));
  }
}
const cmds = {
  async balance(){ const me = await api('GET', '/users/me'); console.log(me.credits + ' API units left (about ' + (me.credits / 1000).toFixed(2) + ' USD)'); },
  async round1(){ const n = +(opt('--n') || 3); for (const d in DIRS) await gen('pip-' + d, DIRS[d] + ' ' + PIP + ' ' + RIG, n, '1:1'); },
  async sheet(){
    const d = args[1]; if (!DIRS[d]) throw new Error('Pick a direction: ' + Object.keys(DIRS).join(', '));
    const n = +(opt('--n') || 4);
    for (const s in SHEETS) await gen('pip-' + d + '-' + s, SHEETS[s] + ' ' + DIRS[d] + ' ' + PIP + ' Plain transparent background, no text, no labels.', n, '2:1');
  }
};
const cmd = args[0];
if (!cmds[cmd]){ console.log('Usage: node design/rig/v3/recraft.js balance | round1 [--dry] | sheet <' + Object.keys(DIRS).join('|') + '> [--dry]'); process.exit(cmd ? 1 : 0); }
cmds[cmd]().catch(e => { console.error(e.message); process.exit(1); });
