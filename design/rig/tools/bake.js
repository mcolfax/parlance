/* Exports Pip for Figma (or any vector tool): every drawing as plain SVG with literal colors and a tight viewBox
   (parts.json), and every mood as [drawing, matrix] instances in draw order (poses.json). A pose instance's matrix
   maps the drawing's own top-left to its place in a 204 x 258 frame, which is how design/rig/tools/figma-state.json's
   Figma components are placed. Needs Playwright with Chromium (preinstalled in Claude Code cloud sessions).
   Usage: node design/rig/tools/bake.js [outDir]   (default: the system temp folder) */
const path = require('path'), fs = require('fs'), os = require('os');
const { execSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e){ ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const RIG = path.join(__dirname, '..', '..', '..', 'js', 'core') + path.sep;   // rig.js, bird.js and pip.js
const OUT = process.argv[2] || os.tmpdir();
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage();
  await pg.setContent('<!doctype html><html><body></body></html>');
  for (const f of ['rig.js', 'bird.js', 'pip.js']) await pg.addScriptTag({ path: RIG + f });
  const parts = await pg.evaluate(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const st = document.createElement('style'); st.textContent = Rig.css(PIP); document.head.append(st);
    const hex = c => '#' + c.map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase();
    const paint = s => { if (!s || s === 'none') return null; const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean); return { hex: hex(p.slice(0, 3)), a: p[3] != null ? +p[3] : 1 }; };
    const out = [];
    for (const p of Rig.parts(PIP)){
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'rig rig-pip'); svg.style.setProperty('--rig-lw', '2');
      svg.innerHTML = '<g>' + p.markup + '</g>';
      document.body.append(svg);
      const g = svg.firstChild;
      let maxSW = 0;
      for (const el of g.querySelectorAll('path,ellipse,circle,rect,line,polygon,polyline')){
        const cs = getComputedStyle(el);
        const f = paint(cs.fill), s = paint(cs.stroke), sw = parseFloat(cs.strokeWidth) || 0;
        const op = parseFloat(cs.opacity), cap = cs.strokeLinecap, join = cs.strokeLinejoin;   // read everything before the classes go
        el.removeAttribute('class'); el.removeAttribute('style');
        if (f){ el.setAttribute('fill', f.hex); if (f.a < 1) el.setAttribute('fill-opacity', String(f.a)); } else el.setAttribute('fill', 'none');
        if (s && sw > 0){ el.setAttribute('stroke', s.hex); if (s.a < 1) el.setAttribute('stroke-opacity', String(s.a)); el.setAttribute('stroke-width', String(Math.round(sw * 100) / 100)); el.setAttribute('stroke-linecap', cap); el.setAttribute('stroke-linejoin', join); maxSW = Math.max(maxSW, sw); }
        if (op < 1) el.setAttribute('opacity', String(op));
      }
      const b = g.getBBox(), pad = maxSW / 2 + 0.5;
      const vb = [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2].map(v => Math.round(v * 100) / 100);
      const inner = g.innerHTML;
      out.push({ key: p.slot + '.' + p.name, slot: p.slot, name: p.name, bone: p.bone, pivot: p.pivot, vb, svg: '<svg xmlns="' + NS + '" width="' + vb[2] + '" height="' + vb[3] + '" viewBox="' + vb.join(' ') + '">' + inner + '</svg>' });
      svg.remove();
    }
    return out;
  });
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'parts.json'), JSON.stringify(parts));
  /* poses: world matrix of each slot's bone, then shift the part's viewBox origin and the pose frame's origin */
  const Rig = require(RIG + 'rig.js'); const PIP = require(RIG + 'pip.js');
  const byKey = Object.fromEntries(parts.map(p => [p.key, p]));
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const V = PIP.view, poses = {};
  for (const mood of Object.keys(PIP.moods)){
    const { c, d, W } = Rig.staticFrame(PIP, mood);
    const order = c.slots.slice().sort((a, b) => d.z[a.i] - d.z[b.i] || a.i - b.i);
    poses[mood] = [];
    for (const sl of order){
      const att = d.s[sl.i]; if (att == null) continue;
      const p = byKey[sl.id + '.' + att]; if (!p) continue;
      const m = mul(mul([1, 0, 0, 1, -V[0], -V[1]], W[sl.bone]), [1, 0, 0, 1, p.vb[0], p.vb[1]]);
      poses[mood].push([p.key, m.map(v => Math.round(v * 1000) / 1000)]);
    }
  }
  fs.writeFileSync(path.join(OUT, 'poses.json'), JSON.stringify({ view: V, poses }));
  console.log(parts.length + ' parts, ' + Object.keys(poses).length + ' poses, parts.json ' + fs.statSync(path.join(OUT, 'parts.json')).size + ' bytes, poses.json ' + fs.statSync(path.join(OUT, 'poses.json')).size + ' bytes');
  console.log('colors:', [...new Set(parts.flatMap(p => [...p.svg.matchAll(/(?:fill|stroke)="(#[0-9A-F]{6})"/g)].map(m => m[1])))].join(' '));
})();
