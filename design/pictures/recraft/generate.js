/* Makes the cast figures and story scenes with the Recraft API (see ../PLAN.md, Phase 6, and PROMPTS.md).
   Usage: node design/pictures/recraft/generate.js <command>
     balance                      prints the API units left on the account (1 USD = 1,000 units)
     style [id,id…]               makes a reusable Recraft style from reference figures (default: lena,jonas from incoming/) and saves its id in style.json
     gen cast|scenes|<id,id…> [--n 2] [--force]
                                  generates candidates for those ids from prompts-data.js into candidates/<id>-<k>.svg
     pick <id> <k>                copies candidates/<id>-<k>.svg to incoming/<id>.svg (then: node design/pictures/tools.js svg)
   Options: --max-usd 8 (stop before a run would take the total past this; default 8), --dry (print what would be sent).
   The token comes from the RECRAFT_API_TOKEN environment variable (or a file named by RECRAFT_API_TOKEN_FILE). It never goes in the repo.
   Every call's cost (the "credits" Recraft returns, in API units) is added to recraft-usage.json: commit it with the pictures.
   Models and prices: recraftv4_1_vector makes SVG at 0.08 USD an image; a style costs 0.005 USD. Image URLs last about 24 hours, so
   candidates are downloaded as soon as they are made. On a non-2xx answer the script prints the status and body and stops. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HERE = __dirname;
const BASE = (process.env.RECRAFT_API_BASE || 'https://external.api.recraft.ai/v1').replace(/\/$/, '');
const MODEL = 'recraftv4_1_vector', SIZE = { cast: '1:2', scenes: '2:1' }, PRICE = 0.08;
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const MAX_USD = +(opt('--max-usd') || 8), N = Math.min(6, Math.max(1, +(opt('--n') || 1))), DRY = flag('--dry'), FORCE = flag('--force');
const F = { usage: path.join(HERE, 'recraft-usage.json'), style: path.join(HERE, 'style.json'), cand: path.join(HERE, 'candidates'), inc: path.join(HERE, 'incoming') };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function token(){
  const t = process.env.RECRAFT_API_TOKEN || (process.env.RECRAFT_API_TOKEN_FILE && fs.readFileSync(process.env.RECRAFT_API_TOKEN_FILE, 'utf8').trim());
  if (!t) throw new Error('Set RECRAFT_API_TOKEN (or RECRAFT_API_TOKEN_FILE) first.');
  return t;
}
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const usage = () => readJSON(F.usage, { note: 'API units spent on Recraft, counted from the credits each call returns (1 USD = 1,000 units). Commit this with the pictures.', units: 0, calls: [] });
function spend(kind, id, n, units){ const u = usage(); u.units += units; u.calls.push({ at: new Date().toISOString().slice(0, 16), kind, id, n, units }); fs.writeFileSync(F.usage, JSON.stringify(u, null, 1) + '\n'); return u.units; }

async function api(method, route, body){
  for (let i = 0; ; i++){
    const res = await fetch(BASE + route, { method, headers: { Authorization: 'Bearer ' + token(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (res.ok){ try { return JSON.parse(text); } catch (e) { throw new Error('Recraft answered 200 but not JSON: ' + text.slice(0, 200)); } }
    if ((res.status === 429 || res.status >= 500) && i < 3){ await sleep(2000 * 2 ** i); continue; }
    throw new Error('Recraft answered ' + res.status + ' to ' + method + ' ' + route + ': ' + text.slice(0, 400));
  }
}
async function download(url){
  const res = await fetch(url); const text = await res.text();
  if (!res.ok) throw new Error('Downloading ' + url.slice(0, 60) + ' gave ' + res.status);
  if (!/<svg[\s>]/.test(text)) throw new Error('The download isn’t an SVG: ' + text.slice(0, 80));
  return text;
}
function prompts(){ const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(HERE, 'prompts-data.js'), 'utf8') + '\n;this.P = PROMPTS;', ctx); return ctx.P; }

/* a style is made from PNGs: render the reference SVGs with Playwright and send them as data URLs */
async function pngDataUrls(files){
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { throw new Error('style needs Playwright: NODE_PATH="$(npm root -g)" node design/pictures/recraft/generate.js style'); }
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), out = [];
  for (const f of files){
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
    const svg = fs.readFileSync(f, 'utf8').replace(/<svg\b/, '<svg width="1024" height="1024"');
    await page.setContent('<body style="margin:0;background:#fff">' + svg + '</body>');
    out.push('data:image/png;base64,' + (await page.screenshot({ type: 'png' })).toString('base64')); await page.close();
  }
  await browser.close(); return out;
}

const commands = {
  async balance(){ const me = await api('GET', '/users/me'); console.log(me.credits + ' API units left (about ' + (me.credits / 1000).toFixed(2) + ' USD)'); },
  async style(){
    const ids = (args[1] && !args[1].startsWith('--') ? args[1] : 'lena,jonas').split(',');
    const files = ids.map(id => path.join(F.inc, id + '.svg')); for (const f of files) if (!fs.existsSync(f)) throw new Error('Missing ' + f);
    if (DRY){ console.log('would create a style for ' + MODEL + ' from ' + ids.join(', ')); return; }
    const res = await api('POST', '/styles', { image_urls: await pngDataUrls(files), model: MODEL, match: 'flexible' });
    if (!res.id) throw new Error('No style id in the answer: ' + JSON.stringify(res).slice(0, 200));
    fs.writeFileSync(F.style, JSON.stringify({ id: res.id, model: MODEL, refs: ids, createdAt: new Date().toISOString().slice(0, 10) }, null, 1) + '\n');
    spend('style', ids.join('+'), 0, 5); console.log('style ' + res.id + ' saved to style.json (0.005 USD)');
  },
  async gen(){
    const sel = args[1] || '', P = prompts(), style = readJSON(F.style, null);
    if (!style) throw new Error('Make the style first: node design/pictures/recraft/generate.js style');
    const items = sel === 'cast' ? P.cast.filter(c => !fs.existsSync(path.join(F.inc, c.file)) || FORCE).map(c => ({ ...c, kind: 'cast' }))
      : sel === 'scenes' ? P.scenes.filter(s => !fs.existsSync(path.join(F.inc, s.file)) || FORCE).map(s => ({ ...s, kind: 'scenes' }))
      : sel.split(',').filter(Boolean).map(id => { const c = P.cast.find(x => x.id === id), s = P.scenes.find(x => x.id === id); if (!c && !s) throw new Error('No prompt for ' + id); return c ? { ...c, kind: 'cast' } : { ...s, kind: 'scenes' }; });
    if (!items.length) throw new Error('Nothing to generate (those already have a file in incoming/; add --force to redo).');
    fs.mkdirSync(F.cand, { recursive: true });
    let spent = usage().units / 1000;
    console.log(items.length + ' prompt(s), ' + N + ' candidate(s) each, up to ' + (items.length * N * PRICE).toFixed(2) + ' USD (spent so far ' + spent.toFixed(2) + ', cap ' + MAX_USD + ')');
    for (const it of items){
      if (spent + N * PRICE > MAX_USD) throw new Error('Stopping: another ' + N + ' image(s) would take the total past ' + MAX_USD + ' USD. Raise --max-usd to go on.');
      const body = { prompt: it.prompt, model: MODEL, size: SIZE[it.kind], n: N, style_id: style.id, response_format: 'url' };
      if (DRY){ console.log(it.id + ': ' + JSON.stringify({ ...body, prompt: body.prompt.slice(0, 60) + '…' })); continue; }
      const res = await api('POST', '/images/generations', body);
      for (let k = 0; k < res.data.length; k++){ const svg = await download(res.data[k].url); fs.writeFileSync(path.join(F.cand, it.id + '-' + (k + 1) + '.svg'), svg); }
      const units = typeof res.credits === 'number' ? res.credits : N * PRICE * 1000; spent = spend(it.kind, it.id, res.data.length, units) / 1000;
      console.log(it.id + ': ' + res.data.length + ' candidate(s) in candidates/ (' + (units / 1000).toFixed(3) + ' USD, ' + spent.toFixed(2) + ' in all)');
    }
  },
  async pick(){
    const [id, k] = [args[1], args[2]], src = path.join(F.cand, id + '-' + k + '.svg');
    if (!id || !k || !fs.existsSync(src)) throw new Error('Usage: pick <id> <k>, with candidates/<id>-<k>.svg present.');
    fs.mkdirSync(F.inc, { recursive: true }); fs.copyFileSync(src, path.join(F.inc, id + '.svg')); console.log('incoming/' + id + '.svg is candidate ' + k);
  }
};
const cmd = args[0];
if (!commands[cmd]){ console.log('Usage: node design/pictures/recraft/generate.js balance | style [ids] | gen cast|scenes|<ids> [--n 2] [--force] [--max-usd 8] [--dry] | pick <id> <k>'); process.exit(cmd ? 1 : 0); }
commands[cmd]().then(() => console.log('ok'), e => { console.log('FAIL ' + (e && e.message || e)); process.exit(1); });
