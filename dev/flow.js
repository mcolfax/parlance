"use strict";
/* The enhancement flow's tools (see flow/README.md). Nothing here publishes, pushes or spends anything.

   node dev/flow.js snapshot [--json]
       The course as it stands: version, shape per language, exercise types, picture and scene coverage, the next free
       unit and story numbers, this month's voice and Recraft spend, the policy knobs. The planner starts from this.

   node dev/flow.js guard [--base <ref>] [--json] [--allow-orphans <file>]
       Compares the working tree (committed or not) with <ref> (default origin/main) and sorts what it finds into:
         stop  this needs Matt: never auto-ship it (flow/POLICY.md, "Red")
         fix   a rule is broken: the builder fixes it before review
         note  allowed, but the reviewer must look at it closely
       Exit code 0 = clean or notes only, 1 = something to fix, 2 = something needs Matt.
       --allow-orphans takes a JSON file listing review-card keys whose text changed on purpose, each carried over by an
       alias pack written in both homes at ship time (flow/POLICY.md, "Changing existing content").

   node dev/flow.js shots [--out <dir>] [--lang de|es|it] [--scheme light|dark|both] [--steps "<steps>"] [--width 412]
       Screenshots at Android phone size (412 x 915 by default), signed out, onboarding done, music and sounds off.
       Without --steps it visits every tab. Steps are separated by ";":
         tab:Stories        tap that tab
         click:Start lesson tap the first visible button or link whose text contains it
         sel:.station       tap the first element matching a CSS selector
         js:startLesson('de-1-1')   run code in the page (every app function is global)
         key:Escape         press a key
         reload             reload the page (progress made so far stays), e.g. to leave a lesson
         wait:600           wait (ms)
         scroll:400         scroll the page down (px); top: back to the top
         shot:lesson-1      save what the phone shows as <out>/<scheme>-<lang>-lesson-1.png
         full:learn         the same, but the whole scrolling page
       Needs Playwright (preinstalled in cloud sessions; otherwise NODE_PATH="$(npm root -g)"). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const args = process.argv.slice(2), cmd = args[0];
const opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const has = n => args.includes(n);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- loading the app in jsdom from any folder (the working tree or an old commit) ---------- */
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
  for (let i = 0; i < 150 && !dom.window.__parlance; i++) await sleep(20);
  if (!dom.window.__parlance) throw new Error('The app did not load in jsdom from ' + root + '. Run npm test to see why.');
  try { return await fn(dom.window.__parlance, dom.window); } finally { dom.window.close(); }
}

/* everything the guard and the snapshot compare, read from a loaded app */
function facts(P, w){
  const E = s => { try { return w.eval(s); } catch (e) { return undefined; } };
  const out = { version: P.APP_VERSION, schema: E('SCHEMA_VERSION'), migrations: E('MIGRATIONS.length'), lsKey: E('LS_KEY'),
    releaseTop: E('RELEASES[0] && RELEASES[0].v'), langs: {}, lessonIds: [], storyIds: [], keys: [], types: E('Object.keys(RENDER)') || [],
    pics: E('Object.keys(PICS).length') || 0, scenes: Object.keys(E('typeof STORY_ART === "object" ? STORY_ART : {}') || {}) };
  for (const [lang, c] of Object.entries(P.COURSE)){
    const lessons = c.units.flatMap(u => u.lessons), byLevel = Object.fromEntries(LEVELS.map(L => [L, 0]));
    let words = 0, pictured = 0, unitMax = 0;
    for (const l of lessons){
      byLevel[l.level] = (byLevel[l.level] || 0) + 1; out.lessonIds.push(l.id);
      const m = /^[a-z]+-(\d+)-\d+$/.exec(l.id); if (m) unitMax = Math.max(unitMax, +m[1]);
      l.vocab.forEach((v, i) => { words++; try { if (P.picFor(v, lang)) pictured++; } catch (e) {} out.keys.push(w.itemKey(l, 'v', i)); });
      l.sentences.forEach((s, i) => out.keys.push(w.itemKey(l, 's', i)));
    }
    const stories = P.STORIES.filter(s => s.lang === lang);
    const storyMax = Math.max(0, ...stories.map(s => +((/-s(\d+)$/.exec(s.id) || [])[1] || 0)));
    out.langs[lang] = { units: c.units.length, lessons: lessons.length, byLevel, stories: stories.length,
      storiesWithScene: stories.filter(s => out.scenes.includes(s.id)).length, words, pictured, nextUnit: unitMax + 1, nextStory: storyMax + 1 };
  }
  out.storyIds = P.STORIES.map(s => s.id);
  return out;
}

/* a copy of the files the app needs at <ref>, in a temp folder */
function checkout(ref){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parlance-base-'));
  const tar = path.join(dir, 'base.tar');
  const want = ['index.html', 'js', 'content', 'styles'].filter(p => { try { git('cat-file', '-e', ref + ':' + p); return true; } catch (e) { return false; } });
  execFileSync('git', ['archive', '--format=tar', '-o', tar, ref, ...want], { cwd: ROOT });
  execFileSync('tar', ['-xf', tar, '-C', dir]); fs.rmSync(tar);
  return dir;
}

/* ---------- snapshot ---------- */
async function snapshot(){
  const f = await loadApp(ROOT, facts);
  const voice = readJSON(path.join(ROOT, 'dev', 'voice-usage.json'), { months: {} });
  const recraft = readJSON(path.join(ROOT, 'design', 'pictures', 'recraft', 'recraft-usage.json'), { units: 0, calls: [] });
  const month = new Date().toLocaleString('sv', { timeZone: 'America/Los_Angeles' }).slice(0, 7);
  const recraftMonth = (recraft.calls || []).filter(c => String(c.at || '').startsWith(month)).reduce((a, c) => a + (+c.units || 0), 0);
  const policy = readJSON(path.join(ROOT, 'flow', 'policy.json'), {});
  const roadmap = fs.existsSync(path.join(ROOT, 'flow', 'ROADMAP.md')) ? fs.readFileSync(path.join(ROOT, 'flow', 'ROADMAP.md'), 'utf8') : '';
  const rows = [...roadmap.matchAll(/^\|\s*(R-\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|\s*([a-z-]+)[^|]*\|/gm)].map(m => ({ id: m[1], status: m[5] }));
  const plans = fs.existsSync(path.join(ROOT, 'flow', 'plans')) ? fs.readdirSync(path.join(ROOT, 'flow', 'plans')).filter(n => /^\d{4}-\d\d-\d\d-.*\.md$/.test(n)).sort() : [];
  const releases = (() => { try { return loadReleases(); } catch (e) { return []; } })();
  const out = {
    version: f.version, schema: f.schema, releases,
    shape: f.langs, exerciseTypes: f.types, pictures: f.pics,
    voiceChars: { month, used: (voice.months || {})[month] || 0, cap: 900000 },
    recraftUnits: { month, used: recraftMonth, budget: (policy.budgets || {}).recraftUnitsPerMonth || 0, allTime: recraft.units || 0 },
    roadmap: { open: rows.filter(r => r.status === 'open').map(r => r.id), planned: rows.filter(r => r.status === 'planned').map(r => r.id), done: rows.filter(r => r.status === 'done').length, needsMatt: rows.filter(r => r.status === 'needs-matt').map(r => r.id) },
    plans: plans.slice(-6), policy
  };
  if (has('--json')) return console.log(JSON.stringify(out, null, 2));
  const L = [];
  L.push('Parlance ' + out.version + ' (schema ' + out.schema + ')');
  for (const r of releases) L.push('  ' + r.v + ' ' + r.date + '  ' + r.title);
  L.push('', 'Shape (every language must match):');
  for (const [lang, s] of Object.entries(out.shape)) L.push('  ' + lang + ': ' + s.units + ' units, ' + s.lessons + ' lessons (' + LEVELS.map(x => x + ' ' + s.byLevel[x]).join(', ') + '), ' + s.stories + ' stories (' + s.storiesWithScene + ' with a scene), ' +
    Math.round(100 * s.pictured / Math.max(1, s.words)) + '% of words pictured; next unit ' + lang + '-' + s.nextUnit + '-1, next story ' + lang + '-s' + s.nextStory);
  L.push('', 'Exercise types: ' + out.exerciseTypes.join(', '), 'Drawn word pictures: ' + out.pictures);
  L.push('Voices this month: ' + out.voiceChars.used.toLocaleString('en') + ' of the 900,000 cap. Recraft this month: ' + out.recraftUnits.used + ' units (budget ' + out.recraftUnits.budget + ').');
  L.push('Roadmap: ' + out.roadmap.open.length + ' open (' + out.roadmap.open.join(' ') + '), ' + out.roadmap.planned.length + ' planned, ' + out.roadmap.done + ' done, waiting on Matt: ' + (out.roadmap.needsMatt.join(' ') || 'none') + '.');
  L.push('Latest plans: ' + (out.plans.join(', ') || 'none'));
  L.push('Policy: ' + JSON.stringify({ ...policy, note: undefined }));
  console.log(L.join('\n'));
}
function loadReleases(){   // the newest few RELEASES entries, read without loading the app
  const src = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
  return [...src.matchAll(/\{ v: '([\d.]+)', date: '([\d-]+)', title: '([^']*)'/g)].slice(0, 5).map(m => ({ v: m[1], date: m[2], title: m[3] }));
}

/* ---------- guard ---------- */
const STOP_PATHS = [   // touching these needs Matt (flow/POLICY.md, Red)
  [/^dev\/supabase\.sql$/, 'the web database rules and functions'],
  [/^vercel\.json$/, 'the web version’s security headers and build'],
  [/^dev\/web\.js$/, 'the web build (its inline script is pinned by hash in vercel.json)'],
  [/^dev\/legal\//, 'the privacy policy or terms'],
  [/^\.github\//, 'GitHub Actions'],
  [/^js\/core\/host\.js$/, 'web sign-in and the database bridge'],
  [/^dev\/keep-awake\.js$/, 'the job that keeps the web database awake'],
  [/^media\/abc-adventure\./, 'the theme song'],
  [/^media\/icons\//, 'the Home Screen icon'],
  [/^design\/rig\/blender\//, 'a bird’s rig'],
  [/^js\/core\/(pip|kiwi|mango|kakadu|rojo)\.js$/, 'a bird’s traced art'],
  [/^flow\/POLICY\.md$/, 'the approval rules themselves'],
  [/^flow\/policy\.json$/, 'the flow’s budgets and switches']
];
const NOTE_PATHS = [   // allowed, but the reviewer looks closely
  [/^js\/core\/state\.js$/, 'saved state, merging or sync'],
  [/^js\/core\/social\.js$/, 'Friends data'],
  [/^js\/core\/remote\.js$/, 'live content and the update banner'],
  [/^js\/core\/(rig|bird)\.js$/, 'the birds’ rig'],
  [/^js\/core\/text\.js$/, 'how answers are checked'],
  [/^js\/core\/engine\.js$/, 'learning logic and grading'],
  [/^js\/core\/audio\.js$/, 'speech, sounds or music (check Chrome on Android)'],
  [/^index\.html$/, 'the script list'],
  [/^dev\/test\.js$/, 'the test suite (make sure no check was weakened)'],
  [/^dev\/voices\.js$/, 'the voice recorder'],
  [/^\.claude\//, 'the flow’s own agents or skills']
];
async function guard(){
  const baseRef = opt('--base') || 'origin/main';
  let base; try { base = git('merge-base', 'HEAD', baseRef).trim(); } catch (e) { base = git('rev-parse', baseRef).trim(); }
  const found = { stop: [], fix: [], note: [] };
  const add = (k, msg) => { if (!found[k].includes(msg)) found[k].push(msg); };

  const tracked = git('diff', '--name-status', base).trim().split('\n').filter(Boolean).map(l => { const p = l.split('\t'); return { st: p[0][0], file: p[p.length - 1], from: p[1] }; });
  const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean).map(f => ({ st: 'A', file: f }));
  const changes = [...tracked, ...untracked];
  const files = changes.map(c => c.file);
  const diffOf = file => { try { return git('diff', '-U0', base, '--', file); } catch (e) { return ''; } };
  const addedOf = file => {
    if (untracked.some(u => u.file === file)) { try { return fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n'); } catch (e) { return []; } }
    return diffOf(file).split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
  };
  const removedOf = file => diffOf(file).split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => l.slice(1));

  for (const c of changes){
    for (const [re, what] of STOP_PATHS) if (re.test(c.file)) add('stop', c.file + ' changed: ' + what + '.');
    for (const [re, what] of NOTE_PATHS) if (re.test(c.file)) add('note', c.file + ' changed: ' + what + '.');
    if (c.st === 'D' && /^(content|js|styles|media)\//.test(c.file)) add('stop', c.file + ' was deleted.');
    if (c.st === 'R') add('note', c.from + ' was renamed to ' + c.file + '.');
  }

  /* line rules on what was added */
  const known = (() => { try { return git('grep', '-h', '-o', '-E', 'https://[a-zA-Z0-9.-]+', base, '--', 'js', 'content', 'styles', 'index.html'); } catch (e) { return ''; } })();   // git grep exits 1 when nothing matches
  const seenHosts = new Set((known.match(/https:\/\/[a-zA-Z0-9.-]+/g) || []).map(s => s.toLowerCase()));
  for (const file of files){
    if (!fs.existsSync(path.join(ROOT, file)) || fs.statSync(path.join(ROOT, file)).isDirectory()) continue;
    if (/\.(png|jpe?g|mp3|mp4|webm|ogg|wav|blend|svg)$/.test(file)) continue;
    const added = addedOf(file);
    if (/^(js|content|styles)\//.test(file) || file === 'index.html'){
      for (const l of added) for (const host of (l.match(/https:\/\/[a-zA-Z0-9.-]+/g) || [])) if (!seenHosts.has(host.toLowerCase())) add('stop', file + ' reaches a new outside host: ' + host + ' (privacy, and the web version’s Content-Security-Policy).');
      if (added.some(l => /\b(eval|new Function)\s*\(/.test(l) && !/^\s*(\/\/|\*)/.test(l))) add('note', file + ' adds eval or new Function.');
      if (added.some(l => /\binnerHTML\s*=/.test(l))) add('note', file + ' sets innerHTML: make sure nothing a learner or friend typed can reach it.');
    }
    if (/^styles\//.test(file) && file !== 'styles/tokens.css'){
      const bad = added.filter(l => /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(l.replace(/var\([^)]*\)/g, '')));
      if (bad.length) add('fix', file + ' writes a literal color (use a token from styles/tokens.css): ' + bad[0].trim().slice(0, 100));
    }
    if (/^js\/ui\//.test(file)){
      const bad = added.filter(l => /['"`]#[0-9a-fA-F]{3,8}['"`]|\brgba?\(\s*\d/.test(l));
      if (bad.length) add('fix', file + ' writes a literal color (use a token): ' + bad[0].trim().slice(0, 100));
    }
    if (file === 'styles/tokens.css'){
      const changed = removedOf(file).filter(l => /^\s*--[a-z0-9-]+\s*:/.test(l));
      if (changed.length) add('stop', 'styles/tokens.css changes ' + changed.length + ' existing token(s), which changes the Selva look (adding new tokens is fine): ' + changed[0].trim().slice(0, 80));
    }
    if (/^content\/(es-|stories-es)/.test(file)){
      const bad = added.filter(l => /\b(vosotr[oa]s|vuestr[oa]s?|os\s+(?:lo|la|las|los)\b|habéis|tenéis|sois|estáis|queréis|podéis|vais)\b/i.test(l));
      if (bad.length) add('fix', file + ' uses Spain-only Spanish (Parlance teaches Latin American Spanish: ustedes, never vosotros): ' + bad[0].trim().slice(0, 100));
    }
    if (/^content\/(it-|stories-it)/.test(file)){
      /* a straight apostrophe between two letters can only sit inside a string (l\'acqua, "un'amica"): write l’acqua */
      const bad = added.filter(l => !/^\s*(\/\/|\/?\*)/.test(l) && /[a-zà-ù]\\?'[a-zà-ù]/i.test(l));
      if (bad.length) add('fix', file + ' writes an apostrophe as \' (use the typographic ’, as in l’acqua and I’m): ' + bad[0].trim().slice(0, 100));
    }
    if (file === 'dev/voices.js'){
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      if (!/900[_,]?000/.test(src)) add('stop', 'dev/voices.js no longer holds the 900,000-character monthly cap.');
      if (removedOf(file).some(l => /900[_,]?000/.test(l))) add('stop', 'dev/voices.js changes a line that holds the monthly voice cap.');
    }
  }
  if (files.includes('design/pictures/recraft/recraft-usage.json')){
    const before = (() => { try { return JSON.parse(git('show', base + ':design/pictures/recraft/recraft-usage.json')).units || 0; } catch (e) { return 0; } })();
    const now = readJSON(path.join(ROOT, 'design/pictures/recraft/recraft-usage.json'), { units: 0 }).units || 0;
    const budget = (readJSON(path.join(ROOT, 'flow', 'policy.json'), {}).budgets || {}).recraftUnitsPerMonth || 0;
    if (now - before > budget) add('stop', 'Recraft spent ' + (now - before) + ' units (US$' + ((now - before) / 1000).toFixed(2) + ') in this change, over the monthly budget of ' + budget + ' in flow/policy.json.');
    else if (now > before) add('note', 'Recraft spent ' + (now - before) + ' units, within the budget of ' + budget + '.');
  }

  /* the course itself, before and after */
  let dir;
  try {
    dir = checkout(base);
    const [a, b] = [await loadApp(dir, facts), await loadApp(ROOT, facts)];
    const goneL = a.lessonIds.filter(id => !b.lessonIds.includes(id)), goneS = a.storyIds.filter(id => !b.storyIds.includes(id));
    if (goneL.length) add('stop', 'Lesson ids disappeared (progress would be lost): ' + goneL.slice(0, 12).join(', '));
    if (goneS.length) add('stop', 'Story ids disappeared (progress would be lost): ' + goneS.join(', '));
    const shapes = Object.entries(b.langs).map(([l, s]) => l + ' ' + s.units + '/' + s.lessons + '/' + s.stories);
    const same = new Set(Object.values(b.langs).map(s => s.units + '/' + s.lessons + '/' + s.stories)).size === 1;
    if (!same) add('fix', 'The languages no longer have the same shape (units/lessons/stories): ' + shapes.join(', ') + '. Every language keeps the same shape.');
    for (const l of Object.keys(b.langs)) if (a.langs[l]){
      const lv = s => LEVELS.map(x => s.byLevel[x]).join('/');
      if (b.langs[l].lessons !== a.langs[l].lessons || b.langs[l].stories !== a.langs[l].stories) add('note', l + ': ' + a.langs[l].lessons + ' → ' + b.langs[l].lessons + ' lessons (' + lv(b.langs[l]) + ' by level), ' + a.langs[l].stories + ' → ' + b.langs[l].stories + ' stories. Update the counts in dev/test.js, CLAUDE.md and docs/ARCHITECTURE.md.');
    }
    const fresh = new Set(b.keys), allow = new Set(opt('--allow-orphans') ? readJSON(opt('--allow-orphans'), []) : []);
    const orphans = a.keys.filter(k => !fresh.has(k) && !allow.has(k) && b.lessonIds.includes(k.split('|')[0]));
    if (orphans.length) add('fix', orphans.length + ' review-card key(s) changed, so learners’ cards for them would stop being reviewed: ' + orphans.slice(0, 6).join('  ') +
      (orphans.length > 6 ? ' …' : '') + '. Keep the old text, or follow flow/POLICY.md "Changing existing content" and pass --allow-orphans.');
    if (b.lsKey !== 'parlance.v2') add('stop', 'The storage key is no longer parlance.v2.');
    if (b.schema !== a.schema){
      if (b.schema < a.schema) add('stop', 'SCHEMA_VERSION went down (' + a.schema + ' → ' + b.schema + ').');
      else if (b.migrations <= a.migrations) add('fix', 'SCHEMA_VERSION went up to ' + b.schema + ' but MIGRATIONS has no new step (js/core/state.js).');
      else add('note', 'Saved state changes shape (schema ' + a.schema + ' → ' + b.schema + '): check the migration is idempotent and merges keep unknown fields.');
    }
    if (b.migrations < a.migrations) add('stop', 'A step was removed from MIGRATIONS.');
    const goneT = a.types.filter(t => !b.types.includes(t)), newT = b.types.filter(t => !a.types.includes(t));
    if (goneT.length) add('stop', 'Exercise types were removed: ' + goneT.join(', ') + ' (learners’ saved lessons may hold them).');
    if (newT.length) add('note', 'New exercise types: ' + newT.join(', ') + '. Check each has tests, works with no tutor and no microphone, and at 412px.');
    if (b.version !== a.version){
      if (b.releaseTop !== b.version) add('fix', 'APP_VERSION is ' + b.version + ' but the newest RELEASES entry is ' + b.releaseTop + '.');
      const [x, y] = [a.version, b.version].map(v => v.split('.').map(Number));
      if (!(y[0] > x[0] || (y[0] === x[0] && (y[1] > x[1] || (y[1] === x[1] && y[2] > x[2]))))) add('fix', 'APP_VERSION must go up (' + a.version + ' → ' + b.version + ').');
      if (y[0] > x[0]) add('stop', 'A major version bump (' + a.version + ' → ' + b.version + ') is Matt’s call.');
    }
  } catch (e) {
    add('fix', 'Could not compare the course before and after: ' + e.message);
  } finally { if (dir) fs.rmSync(dir, { recursive: true, force: true }); }

  const size = (() => { try { return git('diff', '--shortstat', base).trim(); } catch (e) { return ''; } })();
  const result = { base, files: files.length, size, ...found };
  if (has('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('Guard: ' + files.length + ' file(s) changed since ' + base.slice(0, 7) + (size ? ' (' + size + ')' : ''));
    for (const k of ['stop', 'fix', 'note']){
      const title = { stop: 'STOP: needs Matt, do not ship', fix: 'FIX before review', note: 'NOTE for the reviewer' }[k];
      if (found[k].length){ console.log('\n' + title + ':'); found[k].forEach(m => console.log('  - ' + m)); }
    }
    console.log('\n' + (found.stop.length ? 'Result: STOP' : found.fix.length ? 'Result: FIX' : 'Result: CLEAR' + (found.note.length ? ' (with notes)' : '')));
  }
  process.exitCode = found.stop.length ? 2 : found.fix.length ? 1 : 0;
}

/* ---------- shots ---------- */
function serve(root){
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2' };
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const skeleton = '<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + page + '</body></html>';
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/' || u === '/_flow.html'){ res.writeHead(200, { 'content-type': 'text/html' }); return res.end(skeleton); }
    const file = path.join(root, path.normalize(u).replace(/^([/\\])+/, ''));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}
function playwright(){
  try { return require('playwright'); } catch (e) {}
  const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  return require(path.join(g, 'playwright'));
}
async function shots(){
  const out = path.resolve(opt('--out') || path.join(ROOT, 'flow', 'shots')), lang = opt('--lang') || 'de', width = +(opt('--width') || 412);
  const schemes = (opt('--scheme') || 'both') === 'both' ? ['light', 'dark'] : [opt('--scheme')];
  const steps = (opt('--steps') || ['Learn', 'Stories', 'Review', 'Talk', 'Friends', 'Me'].map(t => 'tab:' + t + ';wait:700;shot:' + t.toLowerCase()).join(';')).split(';').map(s => s.trim()).filter(Boolean);
  fs.mkdirSync(out, { recursive: true });
  const version = (/const APP_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8')) || [])[1] || '';
  const { chromium } = playwright();
  const server = await serve(ROOT), port = server.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const saved = [], problems = [];
  try {
    for (const scheme of schemes){
      const ctx = await browser.newContext({ viewport: { width, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme, reducedMotion: 'reduce' });
      await ctx.route(u => !u.toString().startsWith('http://127.0.0.1:' + port), r => r.abort());
      await ctx.addInitScript(([l, ver]) => {   // a learner who has seen this version's What's new, with music and sounds off
        try { if (!localStorage.getItem('parlance.v2')) localStorage.setItem('parlance.v2', JSON.stringify({ v: 9, settings: { onboarded: true, lang: l, seenVersion: ver, homeMusic: false, sfx: false, autoplay: false } })); } catch (e) {}
      }, [lang, version]);
      const page = await ctx.newPage();
      page.on('pageerror', e => problems.push(scheme + ': page error: ' + e.message));
      await page.goto('http://127.0.0.1:' + port + '/_flow.html', { waitUntil: 'load' });
      await page.waitForSelector('#tabs .tab', { timeout: 15000 }).catch(() => problems.push(scheme + ': the tab bar never appeared'));
      await sleep(900);
      for (const st of steps){
        const i = st.indexOf(':'), k = i < 0 ? st : st.slice(0, i), v = i < 0 ? '' : st.slice(i + 1);
        try {
          if (k === 'tab') await page.locator('#tabs .tab', { hasText: v }).first().click({ timeout: 4000 });
          else if (k === 'click') await page.locator('button:visible, a:visible, [role=button]:visible', { hasText: v }).first().click({ timeout: 4000 });
          else if (k === 'sel') await page.locator(v).first().click({ timeout: 4000 });
          else if (k === 'js') await page.evaluate(code => { (0, eval)(code); }, v);
          else if (k === 'top') await page.evaluate(() => window.scrollTo(0, 0));
          else if (k === 'reload'){ await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#tabs .tab', { timeout: 15000 }); await sleep(900); }
          else if (k === 'key') await page.keyboard.press(v);
          else if (k === 'wait') await sleep(+v || 300);
          else if (k === 'scroll') await page.mouse.wheel(0, +v || 400);
          else if (k === 'shot' || k === 'full'){
            await sleep(250);
            const f = path.join(out, scheme + '-' + lang + '-' + v.replace(/[^a-z0-9-]+/gi, '-') + '.png');
            await page.screenshot({ path: f, fullPage: k === 'full' }); saved.push(f);
            const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
            if (wide) problems.push(scheme + ' ' + v + ': the page scrolls sideways at ' + width + 'px');
          } else problems.push('unknown step ' + st);
        } catch (e) { problems.push(scheme + ': step "' + st + '" failed: ' + String(e.message).split('\n')[0]); }
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  console.log('Saved ' + saved.length + ' screenshot(s):\n' + saved.map(s => '  ' + path.relative(process.cwd(), s)).join('\n'));
  if (problems.length){ console.log('\nProblems:\n' + problems.map(p => '  - ' + p).join('\n')); process.exitCode = 1; }
}

const run = { snapshot, guard, shots }[cmd];
if (!run){ console.error('usage: node dev/flow.js snapshot [--json] | guard [--base <ref>] [--json] [--allow-orphans <file>] | shots [--out dir] [--lang de] [--scheme both] [--steps "..."]'); process.exit(1); }
run().catch(e => { console.error(e && e.stack || e); process.exit(3); });
