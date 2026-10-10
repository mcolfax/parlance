/* Lists the files to publish alongside index.html, as the Artifact tool's `files` map ({ "published/path": "source/path" }).
   Usage: node dev/files.js [rootDir] > files.json   (paths are relative to the repo root unless rootDir is given) */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const INCLUDE = ['styles', 'js', 'content', 'media', 'docs', 'styleguide.html', 'dev/test.js'];
const out = {};
function walk(rel){
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  if (fs.statSync(abs).isDirectory()){ for (const f of fs.readdirSync(abs).sort()) if (!f.startsWith('.')) walk(path.join(rel, f)); return; }
  out[rel.split(path.sep).join('/')] = process.argv[2] ? abs : rel.split(path.sep).join('/');
}
INCLUDE.forEach(walk);
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
