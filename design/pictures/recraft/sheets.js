/* Plans "sticker sheets": one Recraft image holding 48 to 80 word pictures in a grid, which tools.js split then cuts into one file per word.
   A sheet costs one image (0.08 USD with recraftv4_1_vector, 0.30 with the pro model), so a word costs a fraction of a cent.
   Usage: node design/pictures/recraft/sheets.js plan [--only a-food] [--per 48|54|64|80]    writes sheets/<id>.json and prints the plan
          node design/pictures/recraft/sheets.js list                                         lists planned sheets and whether they are generated and split
   Then: node design/pictures/recraft/generate.js sheet <sheet-id> [--model recraftv4_1_pro_vector]   (asks Recraft; ask Matt before paying)
         NODE_PATH="$(npm root -g)" node design/pictures/tools.js split <sheet-id>                    (candidates/<sheet-id>-1.svg -> media/pics/<word>.svg) */
const fs = require('fs');
const path = require('path');
const HERE = __dirname, ROOT = path.join(HERE, '..', '..', '..');
const SHEETS = path.join(HERE, 'sheets');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
/* the grids Recraft can make as a vector image: a ratio it accepts, and the columns and rows that give square cells */
const GRIDS = { 48: { cols: 8, rows: 6, ratio: '4:3' }, 54: { cols: 9, rows: 6, ratio: '3:2' }, 64: { cols: 8, rows: 8, ratio: '1:1' }, 80: { cols: 10, rows: 8, ratio: '5:4' } };
const STYLE = 'Sticker sheet of flat vector illustrations in a friendly cartoon style: every object has a thick even dark green outline (#0B2A1E), simple flat fills with one soft shade shape, no gradients, no texture, warm saturated colors. Each object is a single, centered, fully visible item, never cropped. Plain transparent background, no text, no letters, no numbers, no borders, no cell lines.';
const clip = (s, n) => s.length <= n ? s : s.slice(0, n - 1).replace(/[,;:\s]+\S*$/, '');
function build(items, g){
  const list = items.map((it, i) => (i + 1) + ') ' + clip(it.brief || it.id.replace(/-/g, ' '), 100)).join('; ');
  const layout = ' Strict grid of ' + g.cols + ' columns by ' + g.rows + ' rows, one object per cell, equal spacing, empty space between objects, nothing touching or overlapping. Reading left to right, top to bottom, the ' + items.length + ' objects are: ' + list + '.';
  return (STYLE + layout).replace(/\s+/g, ' ');
}
function plan(){
  const briefs = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'briefs.json'), 'utf8')), only = opt('--only'), per = +(opt('--per') || 48), g = GRIDS[per];
  if (!g) throw new Error('--per must be one of ' + Object.keys(GRIDS).join(', '));
  const have = id => fs.existsSync(path.join(ROOT, 'media', 'pics', id + '.svg'));
  const items = Object.entries(briefs.concepts).filter(([id, c]) => !c.alias && (!only || c.batch === only || c.batch.startsWith(only)) && !have(id))
    .map(([id, c]) => ({ id, batch: c.batch, level: c.level, kind: c.kind, quiz: c.quiz, brief: c.brief || '' }))
    .sort((a, b) => a.batch.localeCompare(b.batch) || 0);
  fs.mkdirSync(SHEETS, { recursive: true });
  const out = [], byBatch = new Map(); for (const it of items) (byBatch.get(it.batch) || byBatch.set(it.batch, []).get(it.batch)).push(it);
  for (const [batch, list] of byBatch) for (let i = 0; i * per < list.length; i++){
    const part = list.slice(i * per, (i + 1) * per), rows = Math.ceil(part.length / g.cols), grid = { ...g, rows: Math.max(rows, 1) };
    const sheet = part.length === per ? g : null;   // a short last sheet is padded with the ids that are left over in other batches so it fills its grid
    const id = batch + '-' + (i + 1), prompt = build(part, sheet || { cols: g.cols, rows: grid.rows, ratio: g.ratio });
    const rec = { id, batch, per: part.length, cols: g.cols, rows: sheet ? g.rows : grid.rows, ratio: g.ratio, bytes: Buffer.byteLength(prompt), ids: part.map(x => x.id), items: part, prompt };
    fs.writeFileSync(path.join(SHEETS, id + '.json'), JSON.stringify(rec, null, 1) + '\n'); out.push(rec);
  }
  console.log(out.length + ' sheet(s) for ' + items.length + ' pictures; one sheet costs 0.08 USD (0.30 with the pro model)');
  for (const s of out) console.log('  ' + s.id.padEnd(18) + String(s.per).padStart(3) + ' objects, ' + s.cols + 'x' + s.rows + ' grid, ' + s.ratio + ', prompt ' + s.bytes + ' bytes');
  const long = out.filter(s => s.bytes > 9000); if (long.length) throw new Error('prompt too long (over 9,000 bytes): ' + long.map(s => s.id).join(', '));
}
function list(){
  if (!fs.existsSync(SHEETS)) return console.log('No sheets planned yet.');
  for (const f of fs.readdirSync(SHEETS).filter(x => x.endsWith('.json')).sort()){
    const s = JSON.parse(fs.readFileSync(path.join(SHEETS, f), 'utf8'));
    const gen = fs.existsSync(path.join(HERE, 'candidates', s.id + '-1.svg')), done = s.ids.filter(id => fs.existsSync(path.join(ROOT, 'media', 'pics', id + '.svg'))).length;
    console.log(s.id.padEnd(18) + String(s.per).padStart(3) + ' objects  generated: ' + (gen ? 'yes' : 'no ') + '  split: ' + done + '/' + s.per);
  }
}
const cmd = args[0];
try { if (cmd === 'plan') plan(); else if (cmd === 'list') list(); else { console.log('Usage: node design/pictures/recraft/sheets.js plan [--only a-food] [--per 48|54|64|80] | list'); process.exit(cmd ? 1 : 0); } console.log('ok'); }
catch (e) { console.log('FAIL ' + (e && e.message || e)); process.exit(1); }
