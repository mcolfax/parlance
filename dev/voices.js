/* Records the course's voices with Google Cloud Text-to-Speech into media/voice/ (see "Recorded voices" in docs/ARCHITECTURE.md).
   It loads the app, asks it for every line it can say (voiceLines() in js/core/audio.js), keeps every clip already
   recorded with the same voice and speed, records only what is new, and writes one mp3 pack per unit, one for the
   stories and one for common lines, plus an index per language. Packs left with no lines are deleted.
   The Google key comes from the Claude Code environment: a network secret that adds an X-Goog-Api-Key header to requests
   for texttospeech.googleapis.com, or a GOOGLE_TTS_KEY environment variable. Never put it in the repo.
   Usage: node dev/voices.js [--dry] [--list] [--only de-common,de-1-1] [--max-chars 300000]
     --dry        count what would be recorded, without calling Google or writing anything
     --list       print the Chirp 3 HD voices Google has for each language, for choosing MEDIA.voice in js/config.js
     --only       record new lines only in these packs (lines already recorded elsewhere are kept)
     --max-chars  stop before recording more than this many characters in one run (default 300000)
   Recording must never cost anything. Chirp 3 HD voices are free for the first million characters a month (Pacific
   time), then US$30 per million. So every run adds what it records to dev/voice-usage.json, month by month, and refuses
   to start a run that would take the month past MONTH_CAP, a margin under the free million. There is no flag to go past
   it. Characters are counted as UTF-8 bytes (an accented letter counts twice), never fewer than Google counts, and the
   total is saved as the run goes, so a run that fails partway still counts. Commit dev/voice-usage.json with the
   recordings so the next session sees it. Learners never call Google: the app only plays these files. */
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const ROOT = path.join(__dirname, '..'), BASE = 'https://parlance.test/', API = 'https://texttospeech.googleapis.com/v1/';
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DRY = flag('--dry'), ONLY = opt('--only') ? new Set(opt('--only').split(',')) : null, MAX = +(opt('--max-chars') || 300000);
const KEY = process.env.GOOGLE_TTS_KEY || '';
const MONTH_CAP = 900000, USAGE = path.join(ROOT, 'dev', 'voice-usage.json');
const cost = text => Buffer.byteLength(text, 'utf8');
const billMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
function readUsage(){ try { const u = JSON.parse(fs.readFileSync(USAGE, 'utf8')); return u && u.months ? u : { months: {} }; } catch (e) { return { months: {} }; } }
const Spent = { month: '', base: 0, run: 0 };
function saveUsage(){
  if (!Spent.month) return;
  const u = readUsage(); u.note = 'Characters recorded with Google Cloud Text-to-Speech per billing month (Pacific time), counted by dev/voices.js. The first 1,000,000 a month are free; the script stops at ' + MONTH_CAP.toLocaleString('en-US') + '.';
  u.months[Spent.month] = Spent.base + Spent.run;
  fs.writeFileSync(USAGE, JSON.stringify({ note: u.note, months: u.months }, null, 2) + '\n');
}
process.on('exit', saveUsage);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the app itself, loaded from disk, says what it can say */
class LocalOnly extends ResourceLoader { fetch(url){ if (!url.startsWith(BASE)) return null; const pr = fs.promises.readFile(path.join(ROOT, decodeURIComponent(url.slice(BASE.length).split('?')[0]))); pr.abort = () => {}; return pr; } }
async function fromApp(){
  const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + page + '</body></html>', {
    url: BASE + 'index.html', runScripts: 'dangerously', resources: new LocalOnly(), pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse(w){ w.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} }); w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function(){}; w.HTMLCanvasElement.prototype.getContext = () => null; }
  });
  await new Promise(r => { if (dom.window.document.readyState === 'complete') r(); else dom.window.addEventListener('load', r); });
  for (let i = 0; i < 100 && !dom.window.__parlance; i++) await sleep(20);
  if (!dom.window.__parlance) throw new Error('The app did not load in jsdom. Run npm test to see why.');
  const app = JSON.parse(dom.window.eval('JSON.stringify({ lines: voiceLines().map(l => l.concat(recKey(l[2]))), voice: MEDIA.voice, rates: Object.fromEntries(Object.entries(CAST).map(([k, c]) => [k, c.rate || 1])) })'));
  dom.window.close();
  return app;
}

/* Google Cloud Text-to-Speech */
async function google(url, body){
  for (let i = 0; ; i++){
    const headers = { 'Content-Type': 'application/json' }; if (KEY) headers['X-Goog-Api-Key'] = KEY;   // without one, the environment's network secret adds it
    const r = await fetch(API + url, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) return r.json();
    const msg = (await r.text()).slice(0, 400);
    if ((r.status === 401 || r.status === 403) && /API key|unregistered callers|PERMISSION_DENIED|API_KEY/i.test(msg)) throw new Error('Google turned the key down (' + r.status + '). Check the network secret for texttospeech.googleapis.com (header X-Goog-Api-Key, no prefix) or GOOGLE_TTS_KEY, and that the key may use the Text-to-Speech API: ' + msg);
    if ((r.status === 429 || r.status >= 500) && i < 6){ await sleep(1500 * 2 ** i); continue; }
    throw new Error('Google answered ' + r.status + ' to ' + url + ': ' + msg);
  }
}
const localeOf = voice => voice.split('-').slice(0, 2).join('-');
async function voicesFor(locale){ return ((await google('voices?languageCode=' + locale)).voices || []).filter(v => /Chirp3-HD/.test(v.name)); }
function stripId3(b){   // a clip is just its mp3 frames, so clips can sit back to back in a pack
  if (b.length > 10 && b.toString('latin1', 0, 3) === 'ID3'){ const n = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]; return b.subarray(10 + n + (b[5] & 0x10 ? 10 : 0)); }
  return b;
}
async function record(text, voice, rate){
  Spent.run += cost(text); saveUsage();   // counted before asking, so even a request that fails counts
  const j = await google('text:synthesize', { input: { text }, voice: { languageCode: localeOf(voice), name: voice }, audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000, speakingRate: rate } });
  return stripId3(Buffer.from(j.audioContent, 'base64'));
}

/* what is already recorded: name|rate|key -> the clip's bytes */
function recorded(dir, lang){
  const have = new Map(), file = path.join(dir, lang + '.json');
  if (!fs.existsSync(file)) return have;
  const idx = JSON.parse(fs.readFileSync(file, 'utf8')), packs = idx.packs.map(p => { try { return fs.readFileSync(path.join(dir, p)); } catch (e) { return null; } });
  for (const v of Object.values(idx.voices)) for (const [k, [p, s, n]] of Object.entries(v.lines)) if (packs[p] && s + n <= packs[p].length) have.set(v.name + '|' + v.rate + '|' + k, packs[p].subarray(s, s + n));
  return have;
}
/* the index, one line per clip so a change shows up as a small diff */
function indexText(idx){
  const voices = Object.entries(idx.voices).map(([who, v]) => JSON.stringify(who) + ':{"name":' + JSON.stringify(v.name) + ',"rate":' + v.rate + ',"lines":{\n' +
    Object.entries(v.lines).map(([k, c]) => JSON.stringify(k) + ':' + JSON.stringify(c)).join(',\n') + '\n}}');
  return '{"v":1,"lang":' + JSON.stringify(idx.lang) + ',"packs":' + JSON.stringify(idx.packs) + ',\n"voices":{\n' + voices.join(',\n') + '\n}}\n';
}

async function main(){
  const app = await fromApp(), cfg = app.voice;
  if (!cfg) throw new Error('MEDIA.voice is not set in js/config.js');
  const dir = path.join(ROOT, cfg.dir), langs = Object.keys(cfg).filter(k => k !== 'dir');
  if (flag('--list')){
    for (const lang of langs){ const loc = localeOf(cfg[lang].narrator); console.log(loc + ': ' + (await voicesFor(loc)).map(v => v.name.split('-').pop() + ' (' + v.ssmlGender.toLowerCase() + ')').join(', ')); }
    return;
  }
  if (!DRY) for (const lang of langs){   // every voice in MEDIA.voice must exist before anything is recorded
    const loc = localeOf(cfg[lang].narrator), have = new Set((await voicesFor(loc)).map(v => v.name));
    const missing = Object.values(cfg[lang]).filter(n => !have.has(n));
    if (missing.length) throw new Error('Google has no ' + missing.join(', ') + '. Run node dev/voices.js --list to see the voices it has.');
  }
  const plan = {};
  let chars = 0;
  for (const lang of langs){
    const have = recorded(dir, lang), todo = [], keep = [];
    for (const [l, who, text, pack, key] of app.lines){
      if (l !== lang) continue;
      const name = cfg[lang][who] || cfg[lang].narrator, rate = app.rates[who] || 1, id = name + '|' + rate + '|' + key;
      const item = { who, text, pack, key, name, rate, id };
      if (have.has(id)){ item.bytes = have.get(id); keep.push(item); }
      else if (!ONLY || ONLY.has(pack)){ todo.push(item); chars += cost(text); keep.push(item); }
    }
    plan[lang] = { keep, todo };
    console.log(lang + ': ' + keep.length + ' lines (' + (keep.length - todo.length) + ' already recorded), ' + todo.length + ' to record, ' + todo.reduce((n, x) => n + cost(x.text), 0) + ' characters');
  }
  const month = billMonth(), used = readUsage().months[month] || 0;
  console.log('This month (' + month + '): ' + used + ' characters recorded so far, ' + chars + ' in this run, ' + (MONTH_CAP - used) + ' left under the cap.');
  if (DRY) return;
  if (chars > MAX) throw new Error('This run would record ' + chars + ' characters, over --max-chars ' + MAX + '. Raise it to go ahead.');
  if (used + chars > MONTH_CAP) throw new Error('Stopped: this run would take ' + month + ' to ' + (used + chars) + ' characters, past the ' + MONTH_CAP + ' cap that keeps recording free. Record fewer packs with --only, or wait for next month.');
  Object.assign(Spent, { month, base: used, run: 0 });
  for (const lang of langs){
    const { keep, todo } = plan[lang]; let done = 0;
    const work = todo.slice();
    await Promise.all([...Array(4)].map(async () => {
      for (let it; (it = work.shift());){
        it.bytes = await record(it.text, it.name, it.rate);
        if (++done % 100 === 0 || done === todo.length) console.log('  ' + lang + ' ' + done + '/' + todo.length);
      }
    }));
    /* packs in course order; each clip sits in the pack where its line first appears */
    const packs = [], parts = {}, idx = { lang, packs, voices: {} };
    for (const it of keep){
      if (!parts[it.pack]){ parts[it.pack] = { i: packs.length, bufs: [], size: 0 }; packs.push(it.pack + '.mp3'); }
      const p = parts[it.pack];
      const v = idx.voices[it.who] || (idx.voices[it.who] = { name: it.name, rate: it.rate, lines: {} });
      v.lines[it.key] = [p.i, p.size, it.bytes.length]; p.bufs.push(it.bytes); p.size += it.bytes.length;
    }
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, p] of Object.entries(parts)) fs.writeFileSync(path.join(dir, name + '.mp3'), Buffer.concat(p.bufs));
    fs.writeFileSync(path.join(dir, lang + '.json'), indexText(idx));
    for (const f of fs.readdirSync(dir)) if (f.startsWith(lang + '-') && f.endsWith('.mp3') && !packs.includes(f)){ fs.unlinkSync(path.join(dir, f)); console.log('  removed ' + f); }
    const mb = Object.values(parts).reduce((n, p) => n + p.size, 0) / 1e6;
    console.log(lang + ': wrote ' + packs.length + ' packs, ' + keep.length + ' clips, ' + mb.toFixed(1) + ' MB');
  }
  saveUsage();
  console.log('Recorded ' + Spent.run + ' characters this run; ' + (Spent.base + Spent.run) + ' this month.');
}
main().then(() => process.exit(0), e => { console.error(e.message || e); process.exit(1); });
