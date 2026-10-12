/* Checks every bird's rig data and renders each mood and part once.
   Usage: node design/rig/check.js   (ends with "ok", or lists what's wrong and exits 1) */
const Rig = require('../../js/core/rig.js');
const Bird = require('../../js/core/bird.js');
const birds = ['pip', 'kiwi', 'mango', 'kakadu', 'rojo'].map(id => require('../../js/core/' + id + '.js'));
const SKELETON = Bird.BIRD.bones.map(b => b.id);
let fail = 0;
const bad = (who, msg) => { console.log('FAIL ' + who + ': ' + msg); fail++; };
for (const def of birds){
  for (const e of Rig.validate(def)) bad(def.id, e);
  const ids = new Set(def.bones.map(b => b.id));
  for (const id of SKELETON) if (!ids.has(id)) bad(def.id, 'missing shared bone ' + id);
  for (const m of Object.keys(def.moods)){
    const s = Rig.svg(def, m, { size: 160 });
    if (!s.includes('data-s="head"') || !s.includes('data-s="body"')) bad(def.id, 'mood ' + m + ' renders without a head or body');
    if (/NaN|undefined/.test(s)) bad(def.id, 'mood ' + m + ' renders NaN or undefined');
  }
  for (const p of Rig.parts(def)){
    if (/NaN|undefined/.test(p.markup)) bad(def.id, 'drawing ' + p.slot + '.' + p.name + ' has NaN or undefined');
    /* a color role the palette doesn't have draws black */
    for (const m of p.markup.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(' ')) if (/^[kst]-/.test(c) && !def.palette[c.slice(2)]) bad(def.id, 'drawing ' + p.slot + '.' + p.name + ' uses ' + c + ', which the palette has no color for');
  }
  console.log(def.id + ': ' + Object.keys(def.moods).length + ' moods, ' + Rig.parts(def).length + ' drawings, ' + def.bones.length + ' bones');
}
console.log(fail ? 'FAIL ' + fail : 'ok');
process.exit(fail ? 1 : 0);
