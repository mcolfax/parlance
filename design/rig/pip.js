"use strict";
/* ===================== PIP: the default Parlance parrot =====================
   Pip's part sheet and palette. The skeleton, poses, faces, moods and moves come from bird.js; the rig runtime
   is rig.js. Every drawing is authored in the shared setup space (240 wide, centre x 120, ground at y 250, facing
   front) and hangs on the bone named by its slot. Left and right parts are drawn once and mirrored.
   Palette roles become CSS custom properties (--pip-body …) with these values as fallbacks, so the app can
   retheme Pip from styles/tokens.css.
   ========================================================================== */
const PIP = (() => {
  const B = typeof Bird !== 'undefined' ? Bird : require('./bird.js');
  const { mirror: M, path: p, ellipse: e, circle: ci, gloss, rim } = B.draw;

  /* ----- eyes: pupils sit a little toward the beak; the light comes from the upper right on both eyes ----- */
  const EYE = { L: [92, 119.5], R: [148, 119.5] };
  const eyes = {
    open: ([x, y]) => e('k-ink', x, y, 13, 15) + ci('k-glint', x + 4.6, y - 6.4, 3.8) + ci('k-glint', x - 4.6, y + 6, 1.6),
    wide: ([x, y]) => e('k-ink', x, y, 14.6, 16.8) + ci('k-glint', x + 5, y - 7, 4.6) + ci('k-glint', x - 5.4, y + 6.6, 2.1) + ci('k-glint', x + 6.8, y + 1.6, 1.1),
    wet: ([x, y]) => e('k-ink', x, y, 13.6, 15.6) + ci('k-glint', x + 4.4, y - 6.2, 4.6) + ci('k-glint', x - 5, y + 5.4, 2.6) + ci('k-glint', x + 6.4, y + 3.4, 1.3),
    happy: ([x, y]) => p('ln', 'M' + (x - 11.5) + ' ' + (y + 4) + ' Q' + x + ' ' + (y - 10) + ' ' + (x + 11.5) + ' ' + (y + 4), 'stroke-width:calc(var(--rig-lw,2) * 1.9px)'),
    closed: ([x, y]) => p('ln', 'M' + (x - 10.5) + ' ' + (y - 2) + ' Q' + x + ' ' + (y + 7.5) + ' ' + (x + 10.5) + ' ' + (y - 2), 'stroke-width:calc(var(--rig-lw,2) * 1.6px)'),
    blink: ([x, y]) => p('ln', 'M' + (x - 11) + ' ' + y + ' Q' + x + ' ' + (y + 3) + ' ' + (x + 11) + ' ' + y, 'stroke-width:calc(var(--rig-lw,2) * 1.6px)'),
    lidded: ([x, y]) => p('k-ink', 'M' + (x - 13) + ' ' + (y - 2) + ' H' + (x + 13) + ' C' + (x + 13) + ' ' + (y + 9) + ' ' + (x + 7) + ' ' + (y + 15) + ' ' + x + ' ' + (y + 15) + ' C' + (x - 7) + ' ' + (y + 15) + ' ' + (x - 13) + ' ' + (y + 9) + ' ' + (x - 13) + ' ' + (y - 2) + 'Z') + ci('k-glint', x + 5, y + 3, 2.4) + p('ln', 'M' + (x - 14.5) + ' ' + (y - 2.5) + ' H' + (x + 14.5), 'stroke-width:calc(var(--rig-lw,2) * 1.5px)'),
    squeeze: ([x, y], side) => { const s = side === 'L' ? 1 : -1; return p('ln', 'M' + (x - 7 * s) + ' ' + (y - 8) + ' L' + (x + 7 * s) + ' ' + y + ' L' + (x - 7 * s) + ' ' + (y + 8), 'stroke-width:calc(var(--rig-lw,2) * 1.7px)'); },
    heart: ([x, y]) => p('k-heart', 'M' + x + ' ' + (y + 12) + ' C' + (x - 4) + ' ' + (y + 8) + ' ' + (x - 13) + ' ' + (y + 2) + ' ' + (x - 13) + ' ' + (y - 5) + ' C' + (x - 13) + ' ' + (y - 11) + ' ' + (x - 8) + ' ' + (y - 13.5) + ' ' + (x - 4.5) + ' ' + (y - 13.5) + ' C' + (x - 1.5) + ' ' + (y - 13.5) + ' ' + x + ' ' + (y - 11) + ' ' + x + ' ' + (y - 8.5) + ' C' + x + ' ' + (y - 11) + ' ' + (x + 1.5) + ' ' + (y - 13.5) + ' ' + (x + 4.5) + ' ' + (y - 13.5) + ' C' + (x + 8) + ' ' + (y - 13.5) + ' ' + (x + 13) + ' ' + (y - 11) + ' ' + (x + 13) + ' ' + (y - 5) + ' C' + (x + 13) + ' ' + (y + 2) + ' ' + (x + 4) + ' ' + (y + 8) + ' ' + x + ' ' + (y + 12) + 'Z') + ci('k-glint', x + 6.5, y - 7, 2.4)
  };
  const pupil = side => { const o = {}; for (const k in eyes) o[k] = eyes[k](EYE[side], side); return o; };

  /* ----- wings: drawn hanging down from the shoulder (pivot 86,164). The spread wing is authored raised, as in
     the cheer concept, and turned back down by its attachment offset so every wing shape shares one rest angle. ----- */
  const WING_FOLDED = p('k-body2 o', 'M92 155.5 C79 159 67.5 170.5 63.5 186 C60.5 198 61 210 65.5 219 Q69 227.5 75.5 218.5 Q82 227 88 215.5 Q95.5 221 98.5 208.5 C100.5 197 101 181 97.8 168 C96.3 162.2 94.6 158 92 155.5 Z') +
    p('ln2', 'M75.5 218 Q75 210.5 72.3 204.5 M88 215 Q88.4 207.5 86.2 201');
  const WING_SPREAD = '<g transform="rotate(-132 86 164)">' +
    p('k-body2 o', 'M83.8 134.9 C75 119 57 96 45.7 83.4 Q26.6 76.6 38 102 Q16.6 109.1 35.5 123.5 Q21 138.2 43 144 Q41.2 167.4 58.5 159.5 Q68.1 184.2 79.3 173 C88.2 170.7 93.8 157.3 92.7 146.6 C91.6 143.8 88.2 139.3 83.8 134.9 Z') +
    p('ln2', 'M38 102 Q44.5 105.5 50.5 106.5 M35.5 123.5 Q42.5 124.5 49 123.5 M43 144 Q49 143 54.5 140 M58.5 159.5 Q62.8 156.4 66 152') + '</g>';
  const LEG = (x, y) => ({
    stand: rim('feet', 'M' + x + ' ' + (y - 6) + ' V' + (y + 12) + ' M' + x + ' ' + (y + 12) + ' L' + (x - 9) + ' ' + (y + 19) + ' M' + x + ' ' + (y + 12) + ' L' + (x + 0.5) + ' ' + (y + 21) + ' M' + x + ' ' + (y + 12) + ' L' + (x + 9) + ' ' + (y + 19), 9.4),
    tuck: rim('feet', 'M' + x + ' ' + (y - 6) + ' V' + (y + 7) + ' M' + x + ' ' + (y + 7) + ' L' + (x - 5.5) + ' ' + (y + 12) + ' M' + x + ' ' + (y + 7) + ' L' + (x + 0.5) + ' ' + (y + 13) + ' M' + x + ' ' + (y + 7) + ' L' + (x + 5.5) + ' ' + (y + 12), 8)
  });

  const parts = {
    tail: { fan: p('k-tail2 o', 'M108 205 C96 206 79 209.5 67 214 C58.5 217.5 59 226 66.5 225.5 C79 224.5 95 219 109 214 Z') + p('k-tail o', 'M108 195 C95 191 72 185.5 58 187 C49 188 46.5 197.5 52.5 202 C62 209 87 211 108 210 Z') },
    legL: LEG(99, 232),
    legR: LEG(141, 232),
    crest1: { on: p('k-crest2 o', 'M117.5 66 C107 66.5 93 62 88.5 55 C85.5 50 89.5 45 95.5 46 C103.5 47.5 112 54 119.5 61 Z') },
    crest3: { on: p('k-crest2 o', 'M123.5 64.5 C129.5 56 137.5 46.5 143.5 42.5 C148.5 39 153.5 42 152.5 47.5 C151.5 53.5 141 61.5 130.5 68.5 Z') },
    crest2: { on: p('k-crest o', 'M115 70 C106 59 101.5 45 104 34.5 C106.2 25.5 116.5 20.5 123.5 25.5 C130.5 30.8 131.5 46 128 70 Z') + gloss('M118.6 29.4 Q123.4 30 124.8 35.4', 2.6) },
    body: { on: p('k-body2 o', 'M120 148 C148 148 166 170 166 198 C166 223 146 238 120 238 C94 238 74 223 74 198 C74 170 92 148 120 148 Z') },
    belly: { on: p('k-belly o', 'M120 159 C135 159 144.5 174 144.5 194.5 C144.5 214 134 229.5 120 229.5 C106 229.5 95.5 214 95.5 194.5 C95.5 174 105 159 120 159 Z') },
    wingL: { folded: WING_FOLDED + gloss('M77.5 177 Q79.2 170.2 84.6 166.6', 3.4), spread: WING_SPREAD },
    wingR: { folded: M(WING_FOLDED), spread: M(WING_SPREAD) },
    head: { on: p('k-body o', 'M120 62.5 C154.9 62.5 176.3 84.4 176.3 120 C176.3 147.7 157.2 162 120 162 C82.8 162 63.7 147.7 63.7 120 C63.7 84.4 85.1 62.5 120 62.5 Z') + gloss('M81.5 87.5 Q85.5 79 95.5 74.8', 4.4) },
    patchL: { on: e('k-face', 90, 118, 20, 24) },
    patchR: { on: e('k-face', 150, 118, 20, 24) },
    pupilL: pupil('L'),
    pupilR: pupil('R'),
    browL: { arc: p('ln', 'M84 88 Q90 82.5 96 87') },
    browR: { arc: M(p('ln', 'M84 88 Q90 82.5 96 87')) },
    mouth: {
      closed: p('k-beak2 o', 'M112.5 134.5 C113.5 141.5 116.5 145 120 145 C123.5 145 126.5 141.5 127.5 134.5 Z'),
      smile: p('k-beak2 o', 'M112.5 134.5 C113.5 141.5 116.5 145 120 145 C123.5 145 126.5 141.5 127.5 134.5 Z') + p('ln2', 'M107.8 131.5 Q109.4 135.4 112.6 135.6 M132.2 131.5 Q130.6 135.4 127.4 135.6'),
      frown: p('k-beak2 o', 'M113.5 136 C114.5 142 117 145 120.5 145 C124 145 126.5 142 127 136 Z') + p('ln2', 'M122.5 143.2 Q126.2 140.2 129.2 142'),
      grin: p('k-beak2 o', 'M106.5 128 C107.5 141 113 149.5 120 149.5 C127 149.5 132.5 141 133.5 128 Z') + p('k-mouth', 'M109.5 129 C110.5 139.5 114.5 146 120 146 C125.5 146 129.5 139.5 130.5 129 Z') + p('k-tongue', 'M113 142.6 C114.6 139.2 117 138.2 120 138.2 C123 138.2 125.4 139.2 127 142.6 C125 145 122.6 146 120 146 C117.4 146 115 145 113 142.6 Z'),
      open: p('k-beak2 o', 'M108 128 C108.8 138.5 113.5 145 120 145 C126.5 145 131.2 138.5 132 128 Z') + p('k-mouth', 'M110.8 129 C111.6 136.8 115 141.8 120 141.8 C125 141.8 128.4 136.8 129.2 129 Z') + p('k-tongue', 'M114.6 139.4 C116 137.4 118 136.8 120 136.8 C122 136.8 124 137.4 125.4 139.4 C123.8 141.2 122 141.8 120 141.8 C118 141.8 116.2 141.2 114.6 139.4 Z'),
      wide: p('k-beak2 o', 'M103.5 127 C104.5 145 111.5 156 120 156 C128.5 156 135.5 145 136.5 127 Z') + p('k-mouth', 'M106.5 128 C107.5 143 113 152.5 120 152.5 C127 152.5 132.5 143 133.5 128 Z') + p('k-tongue', 'M111.5 147.6 C113.5 143.4 116.6 142 120 142 C123.4 142 126.5 143.4 128.5 147.6 C126.2 151 123.2 152.5 120 152.5 C116.8 152.5 113.8 151 111.5 147.6 Z'),
      o: e('k-beak2 o', 120, 143.5, 7.4, 8.6) + e('k-mouth', 120, 144.6, 4.4, 5.4)
    },
    beak: {
      closed: p('k-beak o', 'M120 115 C129 115 134.5 119.5 134.5 125.5 C134.5 131.5 127.5 137.5 120 142.5 C112.5 137.5 105.5 131.5 105.5 125.5 C105.5 119.5 111 115 120 115 Z') + p('k-beak2', 'M108.6 131.4 C112.4 136 116.2 139.2 120 141.6 C123.8 139.2 127.6 136 131.4 131.4 C127.6 134.8 123.8 136.8 120 137.8 C116.2 136.8 112.4 134.8 108.6 131.4 Z') + gloss('M110.6 121.6 Q112.6 118.8 116.4 118.1', 2.4),
      open: p('k-beak o', 'M120 115 C129 115 134.5 119.5 134.5 125 C134.5 130.5 128 135 120 137.5 C112 135 105.5 130.5 105.5 125 C105.5 119.5 111 115 120 115 Z') + gloss('M110.6 121.6 Q112.6 118.8 116.4 118.1', 2.4)
    }
  };

  return B.make({
    id: 'pip', name: 'Pip',
    palette: {
      ink: '#0B2A1E', body: '#08777B', body2: '#056C70', belly: '#F8EFD3', face: '#FDF7EA',
      beak: '#F5B23E', beak2: '#E0912C', mouth: '#4A2418', tongue: '#F06A55',
      crest: '#EC6034', crest2: '#F6B33F', tail: '#EE6236', tail2: '#C9472A', feet: '#858D88'
    },
    parts
  });
})();
if (typeof module !== 'undefined') module.exports = PIP;
