"use strict";
/* ===================== INTRO FILM =====================
   A 50-second animated film drawn in SVG, cut to the theme song (MEDIA.song) with live sound effects. The song runs
   at 99 beats a minute, so every scene starts on a bar line: bar(n) and bt(n) give the time of bar n and beat n.
   Everything is a function of the playhead time t, so play, pause, scrub and replay are exact. While the song plays,
   the playhead follows the song's clock so pictures and music stay in sync.
   - filmActors(): what moves, as keyframes [[time, value, ease]]
   - the scene builders (scene…): the SVG for each scene, and a small update per frame for what keyframes can't say
   - FILM_CAPTIONS / FILM_CUES: on-screen text and sound effects by time
   - FILM_LOOKS: each bird's mood and pose by time
   - filmScore(): a synthesized backup score, used only if the song can't play
   Scenes: 1 title, 2 meet your bird and the others, 3 two cities and their friends, 4 a lesson, 5 Talk, 6 a story and
   Review, 7 Friends, 8 rewards, 9 the route, 10 the end card.
   ====================================================== */
const FILM_BAR = 240 / 99, FILM_T0 = 0.2, FILM_DUR = 49.6;
const bar = n => FILM_T0 + n * FILM_BAR;
const bt = n => FILM_T0 + n * FILM_BAR / 4;
const EASE = {
  lin: x => x,
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  inOut: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  spring: x => x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(11 * x)
};
function kv(t, keys){
  if (typeof keys === 'number') return keys;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++){
    const k = keys[i];
    if (t <= k[0]){ const p = keys[i - 1]; const x = (t - p[0]) / ((k[0] - p[0]) || 1); return p[1] + (k[1] - p[1]) * EASE[k[2] || 'inOut'](x); }
  }
  return keys[keys.length - 1][1];
}
const fade = (a, b, c, d) => [[a, 0], [b, 1], [c, 1], [d, 0]];
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const prog = (t, a, d) => clamp01((t - a) / d);
const beatPulse = t => t < FILM_T0 ? 0 : Math.exp(-(((t - FILM_T0) * 4 / FILM_BAR) % 1) * 5);
function inner(svg){ return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }
const fT = (x, y, s, cls, a) => '<text x="' + x + '" y="' + y + '" class="' + cls + '"' + (a ? ' ' + a : '') + '>' + s + '</text>';
const fR = (x, y, w, h2, r, cls, a) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h2 + '" rx="' + r + '" class="' + cls + '"' + (a ? ' ' + a : '') + '/>';
const fG = (id, body, a) => '<g id="' + id + '"' + (a ? ' ' + a : '') + '>' + body + '</g>';
const fIc = (name, x, y, size, cls) => '<g transform="translate(' + x + ' ' + y + ') scale(' + (size / 24).toFixed(3) + ')" class="f-ic ' + (cls || '') + '">' + inner(IC[name]) + '</g>';

/* a bird in the film: the rig's still for a mood ('fly' spreads the wings), in the 120 x 114 box the film places and
   moves. id is any bird in MASCOTS; one whose part sheet hasn't loaded yet is Pip until it has. */
function filmBirdG(id, mood){
  const def = Bird.birds[id] || Bird.birds.pip, svg = pipSVG(mood, 110, undefined, def), lw = (svg.match(/--rig-lw:([\d.]+)/) || [0, '3'])[1];
  return '<g class="rig rig-' + def.id + '" style="--rig-lw:' + lw + '" transform="scale(' + (120 / PIP_VIEW[2]).toFixed(4) + ') translate(' + -PIP_VIEW[0] + ' ' + -PIP_VIEW[1] + ')">' + inner(svg) + '</g>';
}
const filmBirdSVG = id => fG('f-b-' + id, fG('f-bs-' + id, '<g class="pip happy" id="f-bi-' + id + '" transform="translate(-60 -57)">' + filmBirdG(id, 'happy') + '</g>'));
const filmStar = () => mascotId();
const filmOthers = () => Object.keys(MASCOTS).filter(id => id !== mascotId());
/* the five birds in a row on the perch: the learner's bird in the middle */
const filmLineup = () => { const o = filmOthers(), star = filmStar(); return [[o[0], 40, 0.62], [o[1], 106, 0.62], [star, 180, 1], [o[2], 254, 0.62], [o[3], 320, 0.62]]; };
const filmFinale = () => { const o = filmOthers(); return [[o[0], 44, 438, 0.75], [o[1], 112, 498, 0.75], [o[2], 248, 498, 0.75], [o[3], 316, 438, 0.75]]; };

/* ----- the cast of the film: a row of friends for each city; each face pops in on its own beat ----- */
const FILM_CAST = LANG_IDS.map(l => Object.keys(CAST).filter(id => CAST[id].lang === l));
/* scene 3 stacks one band per language: a city, a skyline and its friends. The bird perches in each in turn. */
const FILM_BAND = i => 36 + i * 180, FILM_BASE = i => FILM_BAND(i) + 104;
const FILM_ROW_T = [bar(4) + 0.45, bar(4) + 1.3, bar(5) + 0.15];
const FILM_PERCH = [[150, FILM_BASE(0) - 78], [276, FILM_BASE(1) - 46], [230, FILM_BASE(2) - 70]];   // where the bird sits in each city
const filmCastAt = (r, i) => { const row = FILM_CAST[r], gap = Math.min(60, 300 / row.length); return { x: 180 + (i - (row.length - 1) / 2) * gap, y: FILM_BAND(r) + 144, t: FILM_ROW_T[r] + i * 0.14 }; };
const ROUTE_PTS = [[64, 520], [116, 446], [158, 372], [204, 300], [250, 232], [296, 160]];
const ROUTE_T0 = 39.8, ROUTE_DT = 0.45;   // when the bird reaches the first level, and the gap between levels
const FILM_CAPTIONS = [
  [bar(2) + 0.3, bar(3) - 0.05, 'Meet {bird}, {a kind} who loves to repeat after you.'],
  [bar(3) + 0.1, bar(4) - 0.1, 'Or pick {others}.'],
  [bar(4) + 0.3, bar(6) - 0.1, 'German in Berlin, Spanish in Mexico City, Italian in Rome.'],
  [bar(6) + 0.3, bar(8) - 0.1, 'Short lessons that teach as you go, read aloud in natural voices.'],
  [bar(8) + 0.3, bar(10) - 0.1, 'A tutor who talks back, and gently corrects you.'],
  [bar(10) + 0.2, bar(11) - 0.05, 'Stories where every word is a tap away.'],
  [bar(11) + 0.1, bar(12) - 0.1, 'Review brings back what you miss.'],
  [bar(12) + 0.3, bar(14) - 0.1, 'Race your friends up the weekly league.'],
  [bar(14) + 0.5, bar(16) - 0.1, 'Daily quests, streaks and badges keep you going.'],
  [bar(16) + 0.3, bar(18) - 0.1, 'From A1 to C2, with a checkpoint at every stop.']
];
const FILM_CUES = [[0.3, 'ding'], [1.4, 'whoosh'], [bar(1), 'pop'], [bar(1) + 0.5, 'pop', 0.5],
  [bar(2) + 0.1, 'whoosh'], [bar(2) + 1.4, 'drop'], [bar(2) + 1.75, 'pop'], [bar(2) + 1.85, 'chirp'],
  [bar(3), 'chirp', 0.7], ...[0, 1, 2, 3].map(i => [bar(3) + 0.3 + i * 0.3, 'pop', 0.6]),
  [bar(4), 'whoosh'], ...FILM_CAST.flatMap((row, r) => row.map((id, i) => [filmCastAt(r, i).t, 'pop', 0.6])), [bar(4) + 0.6, 'select', 0.6], [bar(4) + 1.75, 'select', 0.6], [bar(5) + 0.7, 'select', 0.6],
  [bar(6), 'whoosh'], [bar(6) + 0.55, 'pop'], [bar(6) + 1.3, 'tap', 0.7], [bar(7), 'page'], [bar(7) + 0.3, 'select', 0.5], [bar(7) + 0.45, 'select', 0.5], [bar(7) + 0.6, 'select', 0.5], [bar(7) + 1.4, 'tap'], [bar(7) + 1.5, 'ok'], [bar(7) + 1.85, 'coin'],
  [bar(8), 'page'], [bar(8) + 0.4, 'pop', 0.6], [bar(8) + 1.45, 'pop'], [bar(9) + 0.15, 'ok'], [bar(9) + 1.1, 'pop', 0.7],
  [bar(10), 'page'], [bar(10) + 1.2, 'tap'], [bar(10) + 1.3, 'pop'], [bar(11), 'flip'], [bar(11) + 0.5, 'ok', 0.8], [bar(11) + 0.95, 'ok', 0.8], [bar(11) + 1.4, 'ok', 0.8], [bar(11) + 1.85, 'done'],
  [bar(12), 'page'], [bar(12) + 0.85, 'select', 0.7], [bar(13) + 0.05, 'select', 0.7], [bar(13) + 0.45, 'combo'], [bar(13) + 0.9, 'pop'], [bar(13) + 1.4, 'chirp'],
  [bar(14), 'whoosh'], [bar(14) + 0.9, 'chest'], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [bar(14) + 1.05 + i * 0.16, 'coin', 0.7]), [bar(15) + 0.05, 'badge'], [bar(15) + 0.35, 'badge'], [bar(15) + 0.65, 'badge'], [bar(15) + 0.6, 'streak'],
  [bar(16), 'whoosh'], ...ROUTE_PTS.map((p, i) => [ROUTE_T0 + i * ROUTE_DT, 'tap', 0.8]), [ROUTE_T0 + 5 * ROUTE_DT + 0.1, 'level'],
  [bar(18), 'whoosh'], [bar(18) + 0.35, 'pop'], [bar(18) + 0.95, 'pop'], [bar(19) + 0.05, 'pop'], [bar(19) + 0.65, 'pop'], [bar(19) + 1.0, 'chirp'], [bar(19) + 1.7, 'ding']];

function filmScore(){
  const beat = 60 / 108, bar2 = beat * 4, ev = [];
  const chords = [['C3', 'E3', 'G3', 'C2'], ['B2', 'D3', 'G3', 'G1'], ['A2', 'C3', 'E3', 'A1'], ['A2', 'C3', 'F3', 'F1']];
  const melody = [
    [[0, 'E5', 0.5], [0.5, 'G5', 0.5], [1, 'A5', 0.5], [1.5, 'G5', 0.5], [2, 'E5', 1], [3, 'D5', 0.5], [3.5, 'C5', 0.5]],
    [[0, 'D5', 0.5], [0.5, 'G5', 0.5], [1, 'B5', 0.5], [1.5, 'A5', 0.5], [2, 'G5', 1.5], [3.5, 'D5', 0.5]],
    [[0, 'C5', 0.5], [0.5, 'E5', 0.5], [1, 'A5', 1], [2, 'G5', 0.5], [2.5, 'E5', 0.5], [3, 'C5', 1]],
    [[0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'F5', 0.5], [1.5, 'E5', 0.5], [2, 'D5', 1], [3, 'C5', 0.5], [3.5, 'D5', 0.5]]
  ];
  const bars = Math.floor((FILM_DUR - 3.5) / bar2);
  for (let b = 0; b < bars; b++){
    const t0 = b * bar2, ch = chords[b % 4];
    for (const n of ch.slice(0, 3)) ev.push({ t: t0, kind: 'pad', n, d: bar2 * 1.02, g: b < 1 ? 0.014 : 0.02 });
    if (b >= 1){ ev.push({ t: t0, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 1.3 }); ev.push({ t: t0 + beat * 1.5, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 0.5, g: 0.05 }); ev.push({ t: t0 + beat * 2, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 1.5 }); }
    if (b >= 2 && b < bars - 1){ for (let i = 0; i < 4; i++) ev.push({ t: t0 + beat * i + beat / 2, kind: 'hat' }); ev.push({ t: t0, kind: 'kick' }); ev.push({ t: t0 + beat * 2, kind: 'kick' }); }
    if (b >= 3 && b < bars - 1) for (const [o, n, d] of melody[b % 4]) ev.push({ t: t0 + o * beat, kind: 'lead', n, d: d * beat * 0.95 });
  }
  const end = bars * bar2;
  for (const n of ['C3', 'E3', 'G3', 'C4']) ev.push({ t: end, kind: 'pad', n, d: 3.2, g: 0.022 });
  ev.push({ t: end, kind: 'bass', n: 'C2', d: 2.5 });
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => ev.push({ t: end + i * 0.12, kind: 'bell', n, d: 1.6 }));
  return ev;
}

/* =============== the scenes: each returns its SVG; their keyframes are in filmActors(), their per-frame bits in filmFX() =============== */
const LOGO_DE = 'M0 17A17 17 0 0 1 17 0A17 17 0 0 1 34 17A17 17 0 0 1 17 34H5Q0 34 0 29Z';
const LOGO_ES = 'M0 17A17 17 0 0 1 17 0A17 17 0 0 1 34 17V29Q34 34 29 34H17A17 17 0 0 1 0 17Z';
const WORD = 'Parlance';

/* a palm frond: a curved stem with leaflets either side, drawn once and placed in the corners */
function frondSVG(){
  const P = t => [2 * (1 - t) * t * 70 + t * t * 140, 2 * (1 - t) * t * -34 + t * t * -8], N = 11;
  let s = '<path d="M0 0Q70 -34 140 -8" class="f-stem"/>';
  for (let i = 1; i < N; i++){
    const t = i / N, [x, y] = P(t), [x2, y2] = P(t + 0.01), a = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, L = 52 * (1 - t * 0.6);
    for (const d of [-1, 1]) s += '<ellipse cx="' + (x + L / 2).toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (L / 2).toFixed(1) + '" ry="' + (6.5 - t * 3).toFixed(1) + '" transform="rotate(' + (a + d * 52).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
  }
  return s;
}
const FRONDS = [[-12, -8, 42, 1.25], [372, -12, 138, 1.15], [-14, 662, -38, 1.1], [376, 660, -142, 1.3]];
const FIREFLIES = Array.from({ length: 24 }, (_, i) => ({ x: (i * 97 + 31) % 340 + 10, y: (i * 151 + 17) % 640, v: 10 + (i * 7) % 16, r: 1.2 + (i % 4) * 0.5, ph: i * 1.7 }));

function sceneBackdrop(){
  return '<defs><linearGradient id="f-bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--film-bg2)"/><stop offset=".55" style="stop-color:var(--film-bg)"/><stop offset="1" style="stop-color:var(--film-mid)"/></linearGradient>' +
    '<linearGradient id="f-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:var(--film-de)"/><stop offset="1" style="stop-color:var(--film-sun)"/></linearGradient>' +
    '<radialGradient id="f-glow-de"><stop offset="0" style="stop-color:var(--film-de);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--film-de);stop-opacity:0"/></radialGradient>' +
    '<radialGradient id="f-glow-es"><stop offset="0" style="stop-color:var(--film-es);stop-opacity:.4"/><stop offset="1" style="stop-color:var(--film-es);stop-opacity:0"/></radialGradient>' +
    '<linearGradient id="f-sky-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--film-mid);stop-opacity:0"/><stop offset="1" style="stop-color:var(--film-mid);stop-opacity:.9"/></linearGradient>' +
    '<linearGradient id="f-sky-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--film-it);stop-opacity:0"/><stop offset="1" style="stop-color:var(--film-it);stop-opacity:.34"/></linearGradient>' +
    '<linearGradient id="f-sky-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--film-es);stop-opacity:0"/><stop offset="1" style="stop-color:var(--film-es);stop-opacity:.4"/></linearGradient></defs>' +
    '<rect width="360" height="640" fill="url(#f-bgg)"/>' +
    '<g id="f-rays" class="f-rays">' + Array.from({ length: 8 }, (_, i) => '<path d="M0 0L-70 -760L70 -760Z" transform="rotate(' + i * 45 + ')"/>').join('') + '</g>' +
    '<circle id="f-glow-a" cx="180" cy="300" r="270" fill="url(#f-glow-de)"/><circle id="f-glow-b" cx="180" cy="300" r="270" fill="url(#f-glow-es)"/>' +
    '<g id="f-flies">' + FIREFLIES.map((f, i) => '<circle id="f-fl' + i + '" r="' + f.r + '" class="f-fly"/>').join('') + '</g>' +
    '<g id="f-fronds">' + FRONDS.map((f, i) => '<g id="f-fr' + i + '"><g class="f-frond f-frond' + (i % 2) + '">' + frondSVG() + '</g></g>').join('') + '</g>';
}

function sceneTitle(){
  const word = WORD.split('').map((c, i) => '<tspan id="f-wl' + i + '">' + c + '</tspan>').join('');
  return fG('f-title',
    '<g transform="translate(180 168)">' + fG('f-mk0', '<path d="' + LOGO_DE + '" transform="translate(-17 -17)" class="f-mk de"/>') + fG('f-mk1', '<path d="' + LOGO_ES + '" transform="translate(-17 -17)" class="f-mk es"/>') + '<circle id="f-markring" r="40" class="f-markring"/></g>' +
    '<text x="180" y="268" class="f-h1" id="f-word">' + word + '</text>' +
    fT(180, 300, 'German, Spanish &amp; Italian, your way', 'f-sub', 'id="f-subt"') +
    ['de|Deutsch', 'es|Español', 'it|Italiano'].map((c, n) => fG('f-chip' + n, fR(-46, -15, 92, 30, 15, 'f-chip ' + c.split('|')[0]) + fT(0, 6, c.split('|')[1], 'f-chip-t'))).join('')) +
    '<path id="f-line1" d="M-20 470 L380 470" class="f-line"/>' +
    '<g id="f-stations">' + [60, 180, 300].map(x => '<circle cx="' + x + '" cy="470" r="9" class="f-st"/>').join('') + '</g>';
}

/* scene 2: meet your bird, then the others on the same perch */
function sceneBirds(){
  const names = filmLineup().map(([id, x]) => fT(x, 500, esc(MASCOTS[id].name), 'f-bname' + (id === filmStar() ? ' me' : ''), 'id="f-bn-' + id + '"')).join('');
  return fG('f-names', names) +
    fG('f-bubble', '<rect x="-74" y="-20" width="148" height="38" rx="19" class="f-bub"/><path d="M-6 17L4 28L10 17Z" class="f-bub"/><text x="0" y="5" class="f-bub-t" id="f-bubble-t">Hi! I’m ' + esc(mascot().name) + '.</text>');
}

/* scene 3: three cities, and the friends who live in them */
function sceneCities(){
  const avatarAt = id => '<g class="f-av" id="f-av-' + id + '"><g transform="scale(0.62) translate(-32 -32)"><clipPath id="fc-' + id + '"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#fc-' + id + ')">' + inner(avatarSVG(id)) + '</g><circle cx="32" cy="32" r="31" fill="none" stroke="#fff" stroke-width="3"/></g></g>';
  const rc = (x, y, w, h2, cls, r) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h2 + '" rx="' + (r == null ? 3 : r) + '"' + (cls ? ' class="' + cls + '"' : '') + '/>';
  const sky = (i, grad, art, label, cls) => fG('f-city' + i,
    '<rect x="0" y="' + FILM_BAND(i) + '" width="360" height="170" rx="22" fill="url(#' + grad + ')"/><circle cx="326" cy="' + (FILM_BAND(i) + 34) + '" r="14" class="f-orb ' + cls + '"/>' +
    '<g transform="translate(0 ' + FILM_BASE(i) + ')">' + art + '</g><text x="16" y="' + (FILM_BAND(i) + 24) + '" class="f-city ' + cls + '">' + label + '</text>');
  const berlin = '<g class="f-sky-far">' + rc(4, -40, 26, 40) + rc(118, -52, 24, 52) + rc(218, -46, 26, 46) + rc(316, -34, 26, 34) + '</g><g class="f-sky-de">' + rc(10, -44, 34, 44) + rc(48, -62, 26, 62) + rc(78, -34, 30, 34) + '<path d="M150 0V-72M150 -72V-86"/><circle cx="150" cy="-62" r="10"/>' + rc(184, -50, 40, 50) + rc(228, -66, 30, 66) + rc(262, -40, 38, 40) + rc(304, -56, 34, 56) + '</g>' +
    '<g class="f-wins">' + [[18, -34], [28, -34], [56, -52], [56, -34], [190, -40], [208, -40], [236, -56], [236, -38], [270, -30], [290, -30], [312, -46], [324, -46]].map(([x, y], n) => '<rect x="' + x + '" y="' + y + '" width="6" height="8" rx="1.5" class="f-win" style="animation-delay:' + (n * 0.4).toFixed(1) + 's"/>').join('') + '</g>';
  const cdmx = '<g class="f-sky-es">' + [[14, 48], [58, 62], [96, 40], [144, 54], [184, 44], [218, 60], [256, 46], [300, 58]].map(([x, h2], n) => rc(x, -h2, n % 2 ? 34 : 40, h2, 'h' + (n % 3 + 1), 4)).join('') + '</g><g class="f-doors">' + [34, 75, 118, 162, 199, 236, 274, 318].map((x, n) => '<rect x="' + (x - 6) + '" y="' + (-20 - (n % 2) * 6) + '" width="12" height="20" rx="6"/>').join('') + '</g>' +
    '<path d="M10 -74Q180 -50 350 -74" class="f-string"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(n => '<g id="f-bf' + n + '"><path d="M-9 0h18v13l-4-3l-5 4l-5-4l-4 3z" class="pp' + (n % 4) + '"/></g>').join('');
  const arch = (x, y) => '<path d="M' + x + ' ' + y + 'v-10a4 4 0 0 1 8 0v10z" class="f-arch"/>';
  const rome = rc(14, -52, 140, 52, 'f-cream', 4) + [0, 1, 2, 3, 4, 5, 6].map(k => arch(22 + k * 19, -4) + arch(22 + k * 19, -28)).join('') +
    rc(212, -34, 36, 34, 'f-cream', 2) + '<path d="M208 -34A22 28 0 0 1 252 -34Z" class="f-cream"/>' + rc(227, -76, 6, 12, 'f-cream', 2) + rc(160, -30, 38, 30, 'f-terra', 3) + rc(262, -40, 30, 40, 'f-terra', 3) + rc(296, -28, 44, 28, 'f-cream', 3) +
    [172, 322].map(x => '<rect x="' + (x - 1.5) + '" y="-8" width="3" height="8" class="f-trunk"/><ellipse cx="' + x + '" cy="-16" rx="14" ry="7" class="f-pine"/>').join('');
  return sky(0, 'f-sky-g', berlin, 'Berlin · Deutsch', 'de') + sky(1, 'f-sky-e', cdmx, 'Ciudad de México · Español', 'es') + sky(2, 'f-sky-i', rome, 'Roma · Italiano', 'it') +
    '<g id="f-cast">' + FILM_CAST.flat().map(id => avatarAt(id)).join('') + '</g>' +
    ['Hallo!', '¡Hola!', 'Ciao!'].map((w, n) => fG('f-hi' + n, '<rect x="-34" y="-13" width="68" height="26" rx="13" class="f-bub"/><text x="0" y="5" class="f-bub-t">' + w + '</text>')).join('');
}

/* scenes 4 to 7 share one phone, which shows the app. Its screen is 180 x 376, centred on (0,0). */
const TAPS = [  // a finger tap: page, x, y, time
  ['lesson', 0, -16, bar(7) + 1.4], ['story', 38, -4, bar(10) + 1.2]];
function scenePhone(){
  const bird = id => {
    const def = Bird.birds[filmStar()] || Bird.birds.pip, svg = pipSVG('happy', 40, PIP_FACE, def), lw = (svg.match(/--rig-lw:([\d.]+)/) || [0, '3'])[1];
    return '<clipPath id="f-hc-' + id + '"><circle cx="0" cy="0" r="14"/></clipPath><g clip-path="url(#f-hc-' + id + ')"><g class="rig rig-' + def.id + '" style="--rig-lw:' + lw + '" transform="translate(-14 -14) scale(' + (28 / PIP_FACE[2]).toFixed(4) + ') translate(' + -PIP_FACE[0] + ' ' + -PIP_FACE[1] + ')">' + inner(svg) + '</g></g>';
  };
  const face = id => '<clipPath id="f-ac-' + id + '"><circle cx="0" cy="0" r="14"/></clipPath><g clip-path="url(#f-ac-' + id + ')"><g transform="translate(-14 -14) scale(0.4375)">' + inner(avatarSVG(id)) + '</g></g>';
  const wave = (x, y, id) => fG(id, '<path d="M0 -4a5 5 0 0 1 0 8" class="f-arc"/><path d="M4 -8a10 10 0 0 1 0 16" class="f-arc"/><path d="M8 -12a15 15 0 0 1 0 24" class="f-arc"/>', 'transform="translate(' + x + ' ' + y + ')"');
  const tile = (i, y, label) => fG('lt-t' + i, fR(-70, y, 140, 40, 14, 'f-tile') + (i === 1 ? fG('lt-sel', fR(-70, y, 140, 40, 14, 'f-tile-ok') + fIc('check', 46, y + 10, 20, 'f-ok')) : '') + fT(-54, y + 26, label, 'f-tile-t'));
  const lesson = fG('pg-lesson',
    fIc('close', -80, -158, 14, 'f-dim') + fR(-52, -155, 118, 10, 5, 'f-trk') + fG('lp-fill', fR(0, 0, 118, 10, 5, 'f-fill')) +
    fG('lt-teach', fR(-76, -122, 152, 144, 20, 'f-card2') + fT(0, -96, 'NEW WORD', 'f-eyebrow') + '<text x="0" y="-56" class="f-word2"><tspan class="f-der">der</tspan> Hund</text>' + fT(0, -30, 'the dog', 'f-mean') +
      '<circle cx="0" cy="2" r="16" class="f-spk"/>' + fIc('speaker', -8, -6, 16, 'f-white') + wave(20, 2, 'lt-wave') + fT(0, 38, 'A natural voice', 'f-tiny', 'opacity=".9"')) +
    fG('lt-q', fT(0, -118, 'Which one is', 'f-q') + fT(0, -98, '“the dog”?', 'f-q') + tile(0, -82, 'Katze') + tile(1, -34, 'Hund') + tile(2, 14, 'Haus')) +
    fG('lt-btn', fR(-76, 124, 152, 44, 16, 'f-btn-edge') + fR(-76, 120, 152, 44, 16, 'f-btn') + fT(0, 148, 'Check', 'f-btn-t')) +
    fG('lt-ok', fR(-100, 78, 200, 120, 0, 'f-banner') + fIc('check', -74, 92, 22, 'f-okic') + fT(-46, 108, 'Nice!', 'f-ok-t') + fT(-46, 124, 'der Hund = the dog', 'f-tiny ok') + fR(-76, 138, 152, 40, 16, 'f-btn-edge ok') + fR(-76, 135, 152, 40, 16, 'f-btn ok') + fT(0, 160, 'Continue', 'f-btn-t')) +
    fG('lt-xp', fR(-34, -13, 68, 26, 13, 'f-xp') + fT(0, 5, '+5 XP', 'f-xp-t')));
  const talk = fG('pg-talk',
    face0() + fG('tk-dots', [0, 1, 2].map(i => '<circle id="tk-d' + i + '" cx="' + (-62 + i * 12) + '" cy="-96" r="3.5" class="f-dot"/>').join('')) +
    fG('tk-a', fR(-78, -118, 132, 46, 16, 'f-bubl') + fT(-66, -97, '¿Qué quieres', 'f-bt') + fT(-66, -81, 'pedir hoy?', 'f-bt') + '<circle cx="36" cy="-95" r="11" class="f-spk-s"/>' + fIc('speaker', 30, -101, 12, 'f-white') + wave(48, -95, 'tk-wave')) +
    fG('tk-b', fR(-24, -54, 102, 46, 16, 'f-bubr') + '<text x="-12" y="-33" class="f-bt w">Quiero un <tspan class="f-miss">cafe</tspan>,</text>' + fT(-12, -17, 'por favor.', 'f-bt w')) +
    fG('tk-c', fR(-78, 8, 156, 56, 16, 'f-chipok') + '<circle cx="-56" cy="36" r="12" class="f-okdot"/>' + fIc('check', -63, 29, 14, 'f-white') + fT(-38, 31, 'Nearly! Say “café”,', 'f-chip-s') + fT(-38, 47, 'with the accent.', 'f-chip-s')) +
    fG('tk-d', fR(-78, 76, 84, 30, 15, 'f-bubl') + fT(-36, 96, '¡Perfecto!', 'f-bt c')) +
    fR(-82, 132, 118, 40, 20, 'f-input') + fT(-68, 156, 'Say it in Spanish…', 'f-tiny') + '<circle id="tk-ring" cx="58" cy="152" r="20" class="f-ring-mic"/><circle cx="58" cy="152" r="20" class="f-mic"/>' + fIc('mic', 48, 142, 20, 'f-white'));
  function face0(){ return fG('tk-head', '<g transform="translate(-62 -150)">' + bird('tk') + '</g>' + fT(-40, -150, 'Talk', 'f-title-s') + fT(-40, -137, 'Café in Mexico City', 'f-tiny') + '<path d="M-80 -126H80" class="f-divider"/>'); }
  const story = fG('pg-story',
    fT(0, -148, 'At Lena’s café', 'f-title-s c') +
    '<clipPath id="f-ill"><rect x="-78" y="-134" width="156" height="92" rx="16"/></clipPath><g clip-path="url(#f-ill)"><rect x="-78" y="-134" width="156" height="92" class="f-ill-bg"/>' + [0, 1, 2, 3, 4, 5].map(i => '<rect x="' + (-78 + i * 26) + '" y="-134" width="26" height="22" class="' + (i % 2 ? 'f-awn1' : 'f-awn0') + '"/>').join('') + '<path d="M-78 -64H78V-42H-78Z" class="f-ill-floor"/>' +
    '<g transform="translate(-30 -84)">' + face('lena') + '</g><g transform="translate(30 -84)">' + face('jonas') + '</g></g>' +
    fR(-78, -30, 156, 118, 16, 'f-card2') + fG('st-hi', fR(6, -14, 66, 28, 9, 'f-hi')) + '<path d="M12 10H66" class="f-dots"/>' +
    fT(-38, 6, 'Lena', 'f-sw', 'text-anchor="middle"') + fT(38, 6, 'bringt', 'f-sw es', 'text-anchor="middle"') + fT(-38, 40, 'den', 'f-sw', 'text-anchor="middle"') + fT(38, 40, 'Kaffee.', 'f-sw', 'text-anchor="middle"') + fT(0, 70, 'Lena brings the coffee.', 'f-tiny c') +
    fG('st-pop', '<rect x="-48" y="-64" width="96" height="40" rx="12" class="f-pop"/><path d="M-7 -25L0 -14L7 -25Z" class="f-pop"/>' + fT(0, -47, 'brings', 'f-pop-t') + fT(0, -33, 'from bringen', 'f-pop-s')) +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<circle cx="' + (-49 + i * 14) + '" cy="132" r="4" class="f-pdot' + (i < 3 ? ' on' : '') + '"/>').join(''));
  const rows = [['die Rechnung', 'the bill'], ['der Schlüssel', 'the key'], ['bestellen', 'to order']].map(([w, m], i) => { const y = -108 + i * 56;
    return fG('rv-' + i, fR(-76, y, 152, 48, 16, 'f-card2') + fT(-62, y + 22, w, 'f-rw') + fT(-62, y + 38, m, 'f-tiny') + fG('rv-bad' + i, '<circle cx="58" cy="' + (y + 24) + '" r="12" class="f-baddot"/>' + fT(58, y + 29, '!', 'f-bang')) + fG('rv-ok' + i, '<circle cx="58" cy="' + (y + 24) + '" r="12" class="f-okdot"/>' + fIc('check', 51, y + 17, 14, 'f-white'))); }).join('');
  const review = fG('pg-review', fT(0, -148, 'Fix my mistakes', 'f-title-s c') + fT(0, -131, '3 to fix', 'f-tiny c', 'id="rv-count"') + rows +
    fG('rv-done', fR(-76, 66, 152, 56, 18, 'f-btn-edge') + fR(-76, 62, 152, 56, 18, 'f-btn') + fT(0, 86, 'All fixed!', 'f-btn-t') + fT(0, 104, '+3 XP', 'f-btn-s')) + fT(0, 150, 'Words return before you forget', 'f-tiny c'));
  const lg = [['emre', 'Emre', 340], ['sofia', 'Sofía', 285], ['mateo', 'Mateo', 232]];
  const league = fG('pg-league', fT(0, -148, 'Weekly league', 'f-title-s c') + fT(0, -132, 'Resets on Monday', 'f-tiny c') +
    [...lg, ['me', mascot().name, 150]].map(([id, nm], i) => fG('lg-' + i, fR(-78, 0, 156, 40, 14, 'f-card2' + (id === 'me' ? ' me' : '')) + fT(-62, 25, '1', 'f-rank', 'id="lg-rank' + i + '" text-anchor="middle"') + '<g transform="translate(-36 20)">' + (id === 'me' ? bird('lg') : face(id)) + '</g>' + fT(-16, 25, esc(nm), 'f-lname') + fT(70, 25, '0', 'f-lxp', 'id="lg-xp' + i + '" text-anchor="end"'))).join('') +
    fG('fd-duel', fR(-78, 0, 156, 84, 18, 'f-duel') + fIc('duel', -66, 10, 18, 'f-white') + fT(-42, 24, 'Duel with Emre', 'f-duel-t') + fT(-66, 46, 'You', 'f-tiny w', 'opacity=".9"') + fT(-66, 62, 'Emre', 'f-tiny w', 'opacity=".9"') +
      fG('fd-b0', fR(-36, 39, 100, 8, 4, 'f-bar0')) + fG('fd-b1', fR(-36, 55, 100, 8, 4, 'f-bar1')) + fT(0, 78, 'Win for a +20 XP bonus', 'f-tiny w c', 'opacity=".85"')) +
    fG('fd-heart', fIc('heart', -12, -12, 24, 'f-heart')));
  const taps = TAPS.map((p, i) => '<circle id="f-tap' + i + '" r="16" class="f-tapc"/>').join('');
  return fG('f-phone',
    fR(-98, -196, 196, 392, 32, 'f-phone-body') + fR(-94, -192, 188, 384, 29, 'f-phone-edge') +
    '<clipPath id="f-scr"><rect x="-90" y="-188" width="180" height="376" rx="25"/></clipPath>' +
    '<g clip-path="url(#f-scr)"><rect x="-90" y="-188" width="180" height="376" class="f-screen"/>' +
    '<g id="f-pages">' + lesson + talk + story + review + league + '</g>' + taps + '</g>' +
    '<rect x="-22" y="-185" width="44" height="11" rx="5.5" class="f-notch"/>');
}

/* scene 8: rewards */
function sceneRewards(){
  return fG('f-reward', '<g id="f-rays2" class="f-rays2">' + Array.from({ length: 12 }, (_, i) => '<path d="M0 0L-26 -230L26 -230Z" transform="rotate(' + i * 30 + ')"/>').join('') + '</g>') +
    fG('f-chest', '<g class="chest film" transform="translate(-80 -72) scale(2)">' + inner(chestSVG()) + '</g>') +
    fG('f-xppill', fR(-58, -19, 116, 38, 19, 'f-pill') + fIc('spark', -44, -9, 18, 'f-sun') + fT(-18, 7, '+0 XP', 'f-pill-t', 'id="f-xpn"')) +
    '<g id="f-coins">' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<g id="f-coin' + i + '"><circle r="8" class="f-coin"/><circle r="4.2" class="f-coin-in"/></g>').join('') + '</g>' +
    '<g id="f-medals">' + ['flame', 'book', 'trophy'].map((ic2, i) => fG('f-medal' + i, '<g class="medal on" transform="translate(-32 -36)">' + inner(medal(ic2, true, 64).innerHTML) + '</g>')).join('') + '</g>' +
    fG('f-streak', '<g transform="translate(-62 -24) scale(1.7)" class="f-flame">' + inner(IC.flame) + '</g>' + fT(10, 12, '1', 'f-num', 'id="f-streak-n"') + fT(0, 44, 'day streak', 'f-num-l') +
      '<g transform="translate(0 62)">' + Array.from({ length: 7 }, (_, i) => '<circle id="f-sd' + i + '" cx="' + (-45 + i * 15) + '" cy="0" r="5" class="f-sdot"/>').join('') + '</g>');
}

/* scene 9: the route, A1 to C2 */
function sceneRoute(){
  const route = ROUTE_PTS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const mid = ROUTE_PTS.slice(1).map((p, i) => [(p[0] + ROUTE_PTS[i][0]) / 2, (p[1] + ROUTE_PTS[i][1]) / 2]);
  return fG('f-route', '<path d="M0 640L90 470L180 590L250 400L360 560V640Z" class="f-hills"/><path d="' + route + '" class="f-route-glow"/><path d="' + route + '" class="f-route"/>' +
    mid.map((p, i) => '<path id="f-ck' + i + '" d="M0 -9L2.6 -3L9 -2.4L4.2 1.8L5.6 8L0 4.8L-5.6 8L-4.2 1.8L-9 -2.4L-2.6 -3Z" class="f-ck" transform="translate(' + (p[0] + (i % 2 ? 20 : -20)).toFixed(0) + ' ' + p[1].toFixed(0) + ')"/>').join('') +
    ROUTE_PTS.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="f-rst" id="f-rst' + i + '"/><text x="' + (p[0] + (i % 2 ? -24 : 24)) + '" y="' + (p[1] + 5) + '" class="f-rlb" text-anchor="' + (i % 2 ? 'end' : 'start') + '">' + LEVELS[i] + '</text>').join('') +
    fG('f-crown', '<path d="M-12 8L-14 -8L-6 -1L0 -12L6 -1L14 -8L12 8Z" class="f-crown"/>', 'transform="translate(296 128)"')) +
    '<g id="f-confetti">' + Array.from({ length: 26 }, (_, i) => '<rect id="f-cf' + i + '" width="7" height="11" rx="2" class="cf' + (i % 5) + '"/>').join('') + '</g>';
}

/* scene 10: the end card */
function sceneEnd(){
  return '<g id="f-rain">' + Array.from({ length: 30 }, (_, i) => '<rect id="f-rn' + i + '" width="7" height="11" rx="2" class="cf' + (i % 5) + '"/>').join('') + '</g>' +
    fG('f-end', fT(180, 128, 'Los geht’s!', 'f-end de', 'id="f-end0"') + fT(180, 168, '¡Vámonos!', 'f-end es', 'id="f-end1"') + fT(180, 208, 'Andiamo!', 'f-end it', 'id="f-end2"') + fT(180, 242, 'Let’s go.', 'f-end en', 'id="f-end3"')) +
    fG('f-brand', '<g transform="translate(-58 0) scale(.5)"><path d="' + LOGO_DE + '" transform="translate(-17 -17)" class="f-mk de"/></g><g transform="translate(-44 0) scale(.5)"><path d="' + LOGO_ES + '" transform="translate(-17 -17)" class="f-mk es"/></g>' + fT(-20, 8, 'Parlance', 'f-brand-t'));
}

function filmSVG(){
  const lineup = filmLineup().map(([id]) => id), finale = filmFinale().map(([id]) => id);
  const birds = [...new Set([...lineup, ...finale])];
  return '<svg class="film-svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + sceneBackdrop() +
    '<g id="f-cam">' + sceneTitle() + sceneCities() + sceneRoute() + sceneRewards() + scenePhone() + sceneEnd() + sceneBirds() +
    '<circle id="f-ring" r="10" class="f-ring"/>' +
    birds.filter(id => id !== filmStar()).map(filmBirdSVG).join('') + filmBirdSVG(filmStar()) + '</g></svg>';
}

/* keyframes per element id; x/y are absolute stage coordinates of the element's local origin.
   o opacity, x y position, s scale (sx, sy for one axis), r rotation, draw a path drawn from 0 to 1,
   hop [[from, to]] little jumps, bird: a bird, which leans into its flight, breathes and squashes when it lands (sq) */
const PHONE_X = 180, PHONE_Y = 298;
function filmActors(){
  const A = {}, star = filmStar();
  const pop = (id, t, x, y, to) => { A[id] = Object.assign(A[id] || {}, { x, y, s: [[t, 0.01], [t + 0.4, to == null ? 1 : to, 'back']], o: [[t, 0], [t + 0.08, 1]] }); };
  const b2 = bar(2), b3 = bar(3), b4 = bar(4), b5 = bar(5), b6 = bar(6), b7 = bar(7), b8 = bar(8), b9 = bar(9), b10 = bar(10), b11 = bar(11), b12 = bar(12), b13 = bar(13), b14 = bar(14), b15 = bar(15), b16 = bar(16), b17 = bar(17), b18 = bar(18), b19 = bar(19);

  /* ---- 1: title ---- */
  A['f-title'] = { o: [[0, 1], [b2 - 0.5, 1], [b2, 0]], y: [[b2 - 0.5, 0], [b2, -34, 'in']] };
  A['f-mk0'] = { x: [[0.2, -150], [1.3, -15.3, 'spring']], y: [[0.2, 40], [1.3, 0, 'out']], r: [[0.2, -200], [1.3, 0, 'out']], s: [[0.2, 0.3], [1.3, 1.7, 'out']], o: [[0.2, 0], [0.5, 1]] };
  A['f-mk1'] = { x: [[0.2, 150], [1.3, 15.3, 'spring']], y: [[0.2, -40], [1.3, 0, 'out']], r: [[0.2, 200], [1.3, 0, 'out']], s: [[0.2, 0.3], [1.3, 1.7, 'out']], o: [[0.2, 0], [0.5, 1]] };
  A['f-subt'] = { o: [[bar(1) + 0.15, 0], [bar(1) + 0.7, 1]], y: [[bar(1) + 0.15, 12], [bar(1) + 0.8, 0, 'out']] };
  A['f-chip0'] = { x: 82, y: 338, s: [[bar(1) + 0.6, 0.01], [bar(1) + 1.0, 1, 'back']], o: [[bar(1) + 0.6, 0], [bar(1) + 0.7, 1]] };
  A['f-chip2'] = { x: 278, y: 338, s: [[bar(1) + 1.0, 0.01], [bar(1) + 1.4, 1, 'back']], o: [[bar(1) + 1.0, 0], [bar(1) + 1.1, 1]] };
  A['f-chip1'] = { x: 180, y: 338, s: [[bar(1) + 0.8, 0.01], [bar(1) + 1.2, 1, 'back']], o: [[bar(1) + 0.8, 0], [bar(1) + 0.9, 1]] };
  A['f-line1'] = { draw: [[2.9, 0], [4.5, 1, 'out']], o: [[2.9, 0], [3.0, 1], [b4 - 0.1, 1], [b4 + 0.4, 0]] };
  A['f-stations'] = { o: [[3.4, 0], [3.9, 1], [b2 + 0.3, 1], [b2 + 0.7, 0]] };

  /* ---- 2: your bird, then the others ---- */
  A['f-bubble'] = { x: 200, y: 316, o: fade(b2 + 1.7, b2 + 1.85, b3 - 0.15, b3 + 0.15), s: [[b2 + 1.7, 0.6], [b2 + 2.1, 1, 'back']] };
  A['f-names'] = { o: [[b3 + 0.2, 0], [b3 + 0.5, 1], [b4 - 0.35, 1], [b4 - 0.05, 0]] };
  /* the four other birds perch on the line in scene 2 and come back to dance in scene 10, so each has both sets of keys */
  const line = filmLineup(), fin = filmFinale();
  line.forEach(([id, x, s], i) => {
    if (id === star) return;
    const k = i < 2 ? i : i - 1, t = b3 + 0.3 + k * 0.3, back = b4 - 0.3 + k * 0.05, [, fx, fy, fs] = fin.find(f => f[0] === id), f0 = b18 + 0.15 + k * 0.18;
    A['f-b-' + id] = { bird: 1,
      x: [[t, x], [b4 + 0.2, x], [f0, fx]],
      y: [[t, 526], [t + 0.35, 470 - 43 * s, 'out'], [back, 470 - 43 * s], [back + 0.45, -60, 'in'], [f0, fy + 50], [f0 + 0.4, fy, 'out']],
      s: [[t, 0.05], [t + 0.4, s, 'back'], [back + 0.45, s], [f0, 0.05], [f0 + 0.45, fs, 'back']],
      o: [[t, 0], [t + 0.06, 1], [back + 0.4, 1], [back + 0.5, 0], [f0, 0], [f0 + 0.06, 1]],
      sq: [t + 0.35, f0 + 0.4], hop: [[t + 0.8 + i * 0.08, t + 1.2 + i * 0.08]], dance: [[f0 + 0.8, FILM_DUR]] };
  });

  /* the learner's bird: flies in, perches, visits the cities, then hops from corner to corner of the phone */
  const phoneTop = PHONE_Y - 196 - 24, side = [PHONE_X + 96, PHONE_X - 96];   // where it perches on the phone
  A['f-b-' + star] = { bird: 1,
    x: [[b2, -90], [b2 + 0.7, 90, 'out'], [b2 + 1.4, 180, 'inOut'], [b4 - 0.2, 180], [b4 + 0.55, FILM_PERCH[0][0], 'inOut'], [b4 + 1.15, FILM_PERCH[0][0]], [b4 + 1.75, FILM_PERCH[1][0], 'inOut'], [b5 + 0.1, FILM_PERCH[1][0]], [b5 + 0.7, FILM_PERCH[2][0], 'inOut'], [b6 - 0.3, FILM_PERCH[2][0]], [b6 + 0.5, side[0], 'inOut'], [b8 - 0.2, side[0]], [b8 + 0.5, side[1], 'inOut'], [b10 - 0.2, side[1]], [b10 + 0.5, side[0], 'inOut'], [b11 - 0.2, side[0]], [b11 + 0.5, side[1], 'inOut'], [b12 - 0.2, side[1]], [b12 + 0.5, side[0], 'inOut'], [b14 - 0.4, side[0]], [b14 + 0.5, 52, 'inOut'],
      [b16 - 0.2, 52], [ROUTE_T0 - 0.1, 64, 'inOut'], ...ROUTE_PTS.map((p, i) => [ROUTE_T0 + i * ROUTE_DT, p[0], 'inOut']), [b18 - 0.5, 296], [b18 + 0.35, 180, 'inOut']],
    y: [[b2, 110], [b2 + 0.7, 170, 'inOut'], [b2 + 1.4, 427, 'out'], [b4 - 0.2, 427], [b4 + 0.55, FILM_PERCH[0][1] - 24, 'inOut'], [b4 + 1.15, FILM_PERCH[0][1] - 24], [b4 + 1.75, FILM_PERCH[1][1] - 24, 'inOut'], [b5 + 0.1, FILM_PERCH[1][1] - 24], [b5 + 0.7, FILM_PERCH[2][1] - 24, 'inOut'], [b6 - 0.3, FILM_PERCH[2][1] - 24], [b6 + 0.5, phoneTop, 'inOut'], [b8 - 0.2, phoneTop], [b8 + 0.5, phoneTop, 'inOut'], [b14 - 0.4, phoneTop], [b14 + 0.5, 468, 'inOut'],
      [b16 - 0.2, 468], [ROUTE_T0 - 0.1, 490, 'inOut'], ...ROUTE_PTS.map((p, i) => [ROUTE_T0 + i * ROUTE_DT, p[1] - 30, 'inOut']), [b18 - 0.5, 130], [b18 + 0.35, 372, 'inOut']],
    s: [[b2, 0.7], [b2 + 1.4, 1], [b4 - 0.2, 1], [b4 + 0.55, 0.55], [b6 - 0.3, 0.55], [b6 + 0.5, 0.55], [b14 + 0.5, 0.7], [b16 - 0.2, 0.7], [ROUTE_T0 + 5 * ROUTE_DT, 0.62], [b18 - 0.5, 0.62], [b18 + 0.35, 1.45, 'back']],
    o: [[b2 - 0.05, 0], [b2 + 0.1, 1]],
    sq: [b2 + 1.4, b4 + 0.55, b4 + 1.75, b5 + 0.7, b6 + 0.5, b8 + 0.5, b10 + 0.5, b11 + 0.5, b12 + 0.5, b14 + 0.5, b18 + 0.35],
    hop: [[b2 + 1.85, b2 + 2.3], [b7 + 1.55, b7 + 1.95], [b9 + 0.1, b9 + 0.5], [b13 + 0.2, b13 + 0.6], [b19 + 0.1, b19 + 0.7]],
    dance: [[b18 + 0.4, FILM_DUR]] };

  /* ---- 3: two cities and their friends ---- */
  [0, 1, 2].forEach(n => { const a = b4 - 0.05 + n * 0.2; A['f-city' + n] = { o: fade(a, a + 0.7, b6 - 0.55, b6 - 0.1), y: [[a, n % 2 ? 40 : -40], [a + 0.9, 0, 'out'], [b6 - 0.55, 0], [b6 - 0.1, n % 2 ? 30 : -30, 'in']] }; });
  A['f-cast'] = { o: [[b4 + 0.5, 0], [b4 + 0.6, 1], [b6 - 0.55, 1], [b6 - 0.1, 0]] };
  FILM_CAST.forEach((row, r) => row.forEach((id, i) => { const { x, y, t } = filmCastAt(r, i); A['f-av-' + id] = { x, y, s: [[t, 0.01], [t + 0.45, 1, 'back']], o: [[t, 0], [t + 0.1, 1]] }; }));
  [0, 1, 2].forEach(n => { const t = FILM_ROW_T[n] + 0.75, out = n === 2 ? b6 - 0.6 : FILM_ROW_T[n + 1] + 0.6; A['f-hi' + n] = { x: Math.max(40, filmCastAt(n, 0).x), y: FILM_BAND(n) + 108, o: fade(t, t + 0.25, out - 0.3, out), s: [[t, 0.6], [t + 0.4, 1, 'back']] }; });

  /* ---- 4 to 7: the phone ---- */
  const tilt = [[b6, -6], [b6 + 0.3, -5], [b8 - 0.35, -5], [b8 + 0.25, 4, 'inOut'], [b10 - 0.35, 4], [b10 + 0.25, -3, 'inOut'], [b12 - 0.35, -3], [b12 + 0.25, 2, 'inOut'], [b14 - 0.4, 2], [b14 + 0.3, 8, 'in']];
  A['f-phone'] = { x: [[b6, PHONE_X + 30], [b6 + 0.7, PHONE_X, 'out'], [b14 - 0.4, PHONE_X], [b14 + 0.3, PHONE_X - 60, 'in']], y: [[b6 - 0.1, 760], [b6 + 0.8, PHONE_Y, 'spring'], [b14 - 0.4, PHONE_Y], [b14 + 0.3, 820, 'in']], r: tilt, s: [[b6 - 0.1, 0.92], [b6 + 0.8, 1, 'out']], o: [[b6 - 0.1, 0], [b6 - 0.05, 1], [b14 + 0.3, 1], [b14 + 0.31, 0]] };
  const page = (id, a, b2_, dir) => { A[id] = { o: [[a - 0.01, 0], [a, 1], [b2_ - 0.28, 1], [b2_, 0]], x: [[a, 90 * dir], [a + 0.4, 0, 'out'], [b2_ - 0.28, 0], [b2_, -90 * dir, 'in']] }; };
  page('pg-lesson', b6 + 0.2, b8, 1); page('pg-talk', b8, b10, 1); page('pg-story', b10, b11, 1); page('pg-review', b11, b12, 1); page('pg-league', b12, b14 - 0.3, 1);
  /* lesson */
  A['lp-fill'] = { x: -52, y: -155, sx: [[b6 + 0.3, 0.1], [b6 + 1.4, 0.3, 'out'], [b7 + 1.5, 0.3], [b7 + 2.0, 0.62, 'out']] };
  A['lt-teach'] = { x: [[b6 + 0.35, 0], [b7 - 0.3, 0], [b7, -190, 'in']], y: [[b6 + 0.35, 30], [b6 + 0.8, 0, 'out']], s: [[b6 + 0.35, 0.7], [b6 + 0.8, 1, 'back']], o: [[b6 + 0.3, 0], [b6 + 0.5, 1], [b7 - 0.05, 1], [b7, 0]] };
  A['lt-q'] = { o: [[b7 - 0.01, 0], [b7, 1]], x: [[b7, 160], [b7 + 0.4, 0, 'out']] };
  [0, 1, 2].forEach(i => { A['lt-t' + i] = { y: [[b7 + 0.2 + i * 0.15, 20], [b7 + 0.6 + i * 0.15, 0, 'out']], o: [[b7 + 0.2 + i * 0.15, 0], [b7 + 0.4 + i * 0.15, 1]], s: i === 1 ? [[b7 + 1.4, 1], [b7 + 1.5, 1.07, 'out'], [b7 + 1.8, 1, 'inOut']] : 1 }; });
  A['lt-sel'] = { o: [[b7 + 1.4, 0], [b7 + 1.5, 1]] };
  A['lt-btn'] = { o: [[b7 + 0.2, 0], [b7 + 0.5, 1], [b7 + 1.55, 1], [b7 + 1.6, 0]], y: [[b7 + 0.2, 20], [b7 + 0.6, 0, 'out']] };
  A['lt-ok'] = { y: [[b7 + 1.5, 130], [b7 + 1.9, 0, 'back']], o: [[b7 + 1.5, 0], [b7 + 1.55, 1]] };
  A['lt-xp'] = { x: 36, y: [[b7 + 1.7, 20], [b7 + 2.3, -70, 'out']], o: fade(b7 + 1.7, b7 + 1.85, b7 + 2.15, b7 + 2.4), s: [[b7 + 1.7, 0.6], [b7 + 2.0, 1, 'back']] };
  /* talk */
  A['tk-head'] = { o: [[b8 + 0.1, 0], [b8 + 0.35, 1]] };
  A['tk-dots'] = { o: [[b8 + 0.3, 0], [b8 + 0.4, 1], [b8 + 0.8, 1], [b8 + 0.85, 0]] };
  A['tk-a'] = { x: 0, y: [[b8 + 0.85, 16], [b8 + 1.2, 0, 'out']], o: [[b8 + 0.85, 0], [b8 + 1.0, 1]], s: [[b8 + 0.85, 0.8], [b8 + 1.2, 1, 'back']] };
  A['tk-b'] = { y: [[b8 + 1.5, 24], [b8 + 1.9, 0, 'out']], o: [[b8 + 1.5, 0], [b8 + 1.65, 1]], s: [[b8 + 1.5, 0.85], [b8 + 1.9, 1, 'back']] };
  A['tk-c'] = { y: [[b9 + 0.1, 16], [b9 + 0.5, 0, 'out']], o: [[b9 + 0.1, 0], [b9 + 0.25, 1]], s: [[b9 + 0.1, 0.85], [b9 + 0.5, 1, 'back']] };
  A['tk-d'] = { y: [[b9 + 1.05, 12], [b9 + 1.4, 0, 'out']], o: [[b9 + 1.05, 0], [b9 + 1.2, 1]], s: [[b9 + 1.05, 0.8], [b9 + 1.4, 1, 'back']] };
  /* story and review */
  A['st-hi'] = { o: [[b10 + 1.2, 0], [b10 + 1.3, 1]] };
  A['st-pop'] = { x: 38, y: [[b10 + 1.3, -6], [b10 + 1.65, 0, 'back']], s: [[b10 + 1.3, 0.5], [b10 + 1.65, 1, 'back']], o: [[b10 + 1.3, 0], [b10 + 1.4, 1]] };
  [0, 1, 2].forEach(i => { const t = b11 + 0.1 + i * 0.12; A['rv-' + i] = { x: [[t, 90], [t + 0.45, 0, 'out']], o: [[t, 0], [t + 0.15, 1]] }; A['rv-bad' + i] = { o: [[b11 + 0.5 + i * 0.45, 1], [b11 + 0.52 + i * 0.45, 0]] }; A['rv-ok' + i] = { o: [[b11 + 0.5 + i * 0.45, 0], [b11 + 0.52 + i * 0.45, 1]], s: [[b11 + 0.5 + i * 0.45, 0.3], [b11 + 0.85 + i * 0.45, 1, 'back']] }; });
  A['rv-done'] = { y: [[b11 + 1.85, 30], [b11 + 2.2, 0, 'back']], o: [[b11 + 1.85, 0], [b11 + 1.95, 1]] };
  /* friends */
  A['fd-duel'] = { x: 0, y: [[b13 + 0.85, 150], [b13 + 1.3, 74, 'back']], o: [[b13 + 0.85, 0], [b13 + 0.95, 1]] };
  A['fd-b0'] = { x: 0, y: 0, sx: [[b13 + 1.1, 0.05], [b13 + 1.9, 0.78, 'out']] };
  A['fd-b1'] = { x: 0, y: 0, sx: [[b13 + 1.1, 0.05], [b13 + 1.9, 0.52, 'out']] };
  A['fd-heart'] = { x: [[b13 + 1.4, -20], [b13 + 2.1, 40, 'inOut']], y: [[b13 + 1.4, -64], [b13 + 2.1, -130, 'out']], o: fade(b13 + 1.4, b13 + 1.55, b13 + 1.9, b13 + 2.2), s: [[b13 + 1.4, 0.4], [b13 + 1.8, 1.3, 'out']] };

  /* ---- 8: rewards ---- */
  A['f-reward'] = { x: 180, y: 340, o: [[b14 + 0.1, 0], [b14 + 0.8, 1], [b16 - 0.15, 1], [b16 + 0.1, 0]] };
  A['f-chest'] = { x: 180, y: 364, s: [[b14 + 0.15, 0.2], [b14 + 0.9, 1, 'back'], [b16 - 0.15, 1], [b16 + 0.1, 0.6, 'in']], o: [[b14 + 0.15, 0], [b14 + 0.45, 1], [b16 - 0.15, 1], [b16 + 0.1, 0]] };
  A['f-xppill'] = { x: 262, y: 60, s: [[b14 + 0.9, 0.2], [b14 + 1.3, 1, 'back']], o: [[b14 + 0.9, 0], [b14 + 1.0, 1], [b16 - 0.15, 1], [b16 + 0.1, 0]] };
  for (let i = 0; i < 8; i++){
    const t = b14 + 1.05 + i * 0.16, ang = -Math.PI / 2 + (i - 3.5) * 0.28, px = 180 + Math.cos(ang) * 70, py = 330 + Math.sin(ang) * 70;
    A['f-coin' + i] = { x: [[t, 180], [t + 0.25, px, 'out'], [t + 0.7, 250, 'in']], y: [[t, 340], [t + 0.25, py, 'out'], [t + 0.7, 64, 'in']], o: [[t, 0], [t + 0.04, 1], [t + 0.66, 1], [t + 0.72, 0]], s: [[t, 0.6], [t + 0.25, 1.1, 'out'], [t + 0.7, 0.6, 'in']] };
  }
  [[90, 190], [180, 168], [270, 190]].forEach(([x, y], i) => { const t = b15 + 0.05 + i * 0.3; A['f-medal' + i] = { x: [[t, 180], [t + 0.5, x, 'out']], y: [[t, 340], [t + 0.5, y, 'out']], s: [[t, 0.1], [t + 0.5, 0.95, 'back']], r: [[t, -200], [t + 0.6, 0, 'out']], o: [[t, 0], [t + 0.12, 1], [b16 - 0.15, 1], [b16 + 0.1, 0]] }; });
  A['f-streak'] = { x: 180, y: 488, o: [[b15 + 0.4, 0], [b15 + 0.55, 1], [b16 - 0.15, 1], [b16 + 0.1, 0]], s: [[b15 + 0.4, 0.6], [b15 + 0.8, 1, 'back']] };

  /* ---- 9: the route ---- */
  A['f-route'] = { o: [[b16 - 0.1, 0], [b16 + 0.3, 1], [b18 - 0.6, 1], [b18 - 0.1, 0]] };
  A['f-crown'] = { y: 0, o: [[ROUTE_T0 + 5 * ROUTE_DT - 0.05, 0], [ROUTE_T0 + 5 * ROUTE_DT + 0.1, 1]] };

  /* ---- 10: the end ---- */
  [0.3, 0.9, 1.5, 2.1].forEach((d, n) => { const t = b18 + d; A['f-end' + n] = { x: 0, y: [[t, 24], [t + 0.45, 0, 'spring']], o: [[t, 0], [t + 0.15, 1]], s: [[t, 0.6], [t + 0.5, 1, 'back']] }; });
  A['f-brand'] = { x: 180, y: 552, o: [[b19 + 0.7, 0], [b19 + 1.1, 1]] };
  A['f-rays'] = { o: [[0, 0.5], [b14, 0.5], [b14 + 0.8, 1], [b16 - 0.3, 1], [b16, 0.5], [b18, 0.5], [b18 + 0.6, 1.2]] };
  /* the glow behind everything: green for German, mango for Spanish, both for the finale */
  A['f-glow-a'] = { o: [[0, 0.7], [b4 + 0.5, 0.7], [b4 + 1.2, 1], [b5 + 0.2, 1], [b5 + 0.8, 0.4], [b6, 0.8], [b12, 0.8], [b14, 1], [b18, 1]] };
  A['f-glow-b'] = { o: [[0, 0], [b4 + 0.5, 0], [b5 + 0.2, 0.2], [b5 + 0.8, 1], [b6 - 0.2, 1], [b6 + 0.4, 0.2], [b8, 0.2], [b10, 0.5], [b12, 0.3], [b14, 0.8], [b16, 0.4], [b18, 1]] };
  return A;
}

/* each bird's mood and pose by time: [time, mood, 'fly' | ''], the last one at or before t wins */
function filmLooks(){
  const L = {}, b = bar, star = filmStar();
  L[star] = [[0, 'happy', ''], [b(2), 'happy', 'fly'], [b(2) + 1.4, 'happy', ''], [b(2) + 1.8, 'wave', ''], [b(3) + 0.1, 'happy', ''], [b(3) + 1.1, 'love', ''], [b(4) - 0.2, 'happy', 'fly'], [b(4) + 0.55, 'think', ''], [b(4) + 1.15, 'happy', 'fly'], [b(4) + 1.75, 'wave', ''], [b(5) + 0.1, 'happy', 'fly'], [b(5) + 0.7, 'love', ''],
    [b(6) - 0.3, 'happy', 'fly'], [b(6) + 0.5, 'think', ''], [b(7) + 1.5, 'cheer', ''], [b(8) - 0.2, 'happy', 'fly'], [b(8) + 0.5, 'listen', ''], [b(9) + 0.1, 'love', ''], [b(10) - 0.2, 'happy', 'fly'],
    [b(10) + 0.5, 'happy', ''], [b(10) + 1.3, 'wow', ''], [b(11) - 0.2, 'happy', 'fly'], [b(11) + 0.5, 'proud', ''], [b(11) + 1.85, 'cheer', ''], [b(12) - 0.2, 'happy', 'fly'], [b(12) + 0.5, 'happy', ''], [b(13) + 0.15, 'dance', ''], [b(14) - 0.4, 'happy', 'fly'],
    [b(14) + 0.5, 'cheer', ''], [b(16) - 0.2, 'happy', 'fly'], [ROUTE_T0 + 5 * ROUTE_DT + 0.1, 'cheer', 'fly'], [b(18) - 0.5, 'happy', 'fly'], [b(18) + 0.35, 'cheer', ''], [b(18) + 1.2, 'dance', '']];
  for (const [id] of filmFinale()) L[id] = [[0, 'happy', ''], [b(3) + 0.9, 'wave', ''], [b(4) - 0.35, 'happy', 'fly'], [b(18), 'happy', ''], [b(18) + 0.6, 'dance', '']];
  return L;
}

const Film = { open: false, t: 0, playing: false, raf: 0, muted: false, prev: 0 };
const FILM_RINGS = [2, 4, 6, 8, 10, 12, 14, 16, 18].map(n => bar(n));
function openFilm(opts = {}){
  Object.assign(Film, { open: true, t: 0, playing: false, prev: 0, onDone: opts.onDone || null, doneLabel: opts.doneLabel || 'Close', muted: !S.settings.sfx && false });
  openOverlay('film'); sfx('open');
  const close = h('button', { class: 'icon-btn plain f-x', type: 'button', 'aria-label': 'Close the film', html: IC.close, onclick: () => endFilm(false) });
  Film.muteBtn = h('button', { class: 'chip f-mute', type: 'button', 'aria-pressed': 'true', onclick: () => { Film.muted = !Film.muted; Film.muteBtn.setAttribute('aria-pressed', String(!Film.muted)); Film.muteBtn.replaceChildren(ic('speaker'), Film.muted ? 'Sound off' : 'Sound on'); if (Film.muted) filmMusicStop(); else if (Film.playing) filmMusicStart(); } }, ic('speaker'), 'Sound on');
  OV.head.replaceChildren(close, h('div', { class: 'ov-title grow' }, 'Welcome to Parlance'), Film.muteBtn);
  const stage = h('div', { class: 'film-stage', html: filmSVG(), role: 'img', 'aria-label': 'Intro film: ' + mascot().name + ' the ' + mascot().kind + ' shows you around Parlance' });
  Film.caption = h('div', { class: 'film-cap', 'aria-live': 'polite' });
  Film.big = h('button', { class: 'film-big', type: 'button', 'aria-label': 'Play', html: '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>' });
  Film.big.addEventListener('click', e => { e.stopPropagation(); filmPlay(); });
  const wrap = h('div', { class: 'film-wrap' }, stage, Film.caption, Film.big);
  wrap.addEventListener('click', () => { if (Film.playing) filmPause(); else filmPlay(); });
  OV.bodyIn.replaceChildren(wrap);
  Film.svg = stage.querySelector('svg');
  const $ = id => Film.svg.querySelector('#' + id), all = sel => [...Film.svg.querySelectorAll(sel)];
  Film.els = {}; Film.actors = filmActors(); Film.looks = filmLooks();
  for (const id of Object.keys(Film.actors)){ const el = $(id); if (el) Film.els[id] = el; }
  /* birds: the markup of each look is made once; a part sheet that arrives late is swapped in on the next frame */
  Film.birds = [...new Set(Object.keys(Film.looks))]; Film.birdKey = {}; Film.markup = {};
  for (const id of filmOthers()) if (!Bird.birds[id]) loadMascot(id).then(() => { for (const k of Object.keys(Film.markup)) if (k.startsWith(id + ':')) delete Film.markup[k]; Film.birdKey[id] = null; if (Film.open) filmRender(Film.t); }, () => {});
  Film.lens = {};
  const L = (id, el) => { let n = 400; try { n = el.getTotalLength() || n; } catch (e) {} Film.lens[id] = n; el.style.strokeDasharray = n; return n; };
  L('f-line1', $('f-line1'));
  Film.route = all('#f-route .f-route, #f-route .f-route-glow'); Film.route.forEach(p => L('route', p));
  Film.q = { cam: $('f-cam'), ring: $('f-ring'), glowA: $('f-glow-a'), glowB: $('f-glow-b'), rays: $('f-rays'), rays2: $('f-rays2'), ringMark: $('f-markring'),
    flies: FIREFLIES.map((_, i) => $('f-fl' + i)), fronds: FRONDS.map((_, i) => $('f-fr' + i)), word: WORD.split('').map((_, i) => $('f-wl' + i)), wins: all('.f-win'),
    flags: [0, 1, 2, 3, 4, 5, 6, 7].map(i => $('f-bf' + i)), taps: TAPS.map((_, i) => $('f-tap' + i)), lg: [0, 1, 2, 3].map(i => [$('lg-' + i), $('lg-rank' + i), $('lg-xp' + i)]),
    cf: Array.from({ length: 26 }, (_, i) => $('f-cf' + i)), rain: Array.from({ length: 30 }, (_, i) => $('f-rn' + i)), chest: $('f-chest') && $('f-chest').querySelector('.chest'),
    rst: ROUTE_PTS.map((_, i) => $('f-rst' + i)), ck: [0, 1, 2, 3, 4].map(i => $('f-ck' + i)), coins: [0, 1, 2, 3, 4, 5, 6, 7].map(i => $('f-coin' + i)), sd: [0, 1, 2, 3, 4, 5, 6].map(i => $('f-sd' + i)),
    tkd: [0, 1, 2].map(i => $('tk-d' + i)), rvBad: [0, 1, 2].map(i => $('rv-bad' + i)) };
  Film.q.ltWave = [...$('lt-wave').children]; Film.q.tkWave = [...$('tk-wave').children];
  Film.score = filmScore();
  // footer controls
  Film.playBtn = h('button', { class: 'icon-btn f-play', type: 'button', 'aria-label': 'Play', onclick: () => Film.playing ? filmPause() : filmPlay() });
  Film.range = h('input', { class: 'f-range', type: 'range', min: '0', max: String(FILM_DUR), step: '0.1', value: '0', 'aria-label': 'Film position' });
  Film.range.addEventListener('input', () => filmSeek(+Film.range.value));
  Film.time = h('span', { class: 'f-time' }, '0:00');
  Film.cta = h('button', { class: 'btn btn-primary btn-wide', type: 'button', onclick: () => endFilm(true) }, Film.doneLabel);
  OV.foot.className = 'ov-foot film-foot';
  OV.footIn.replaceChildren(h('div', { class: 'f-controls' }, Film.playBtn, Film.range, Film.time), Film.cta);
  filmRender(0); filmPlayIcon();
  if (opts.autoplay !== false) filmPlay();
}
function filmVol(){ return 0.75 * (S.settings.sfxVol == null ? 0.8 : S.settings.sfxVol) + 0.2; }
function filmSongVol(){ return MEDIA.song.film * (0.4 + 0.6 * musicVol()); }
/* the film's music: the theme song when it can play, otherwise the synthesized score */
function filmMusicStart(){
  if (Film.muted) return;
  Film.usingSong = !!(MEDIA.song && !Song.failed && songEl());
  if (Film.usingSong){ Song.mode = 'film'; Song.el.loop = false; songStart(MEDIA.song.filmStart + Film.t, filmSongVol(), 0.12); }
  else musicPlay(Film.score, Film.t, filmVol());
}
function filmMusicStop(){ if (Song.mode === 'film'){ Song.mode = 'off'; songStop(0.12); } musicStop(); }
function filmPlayIcon(){
  if (!Film.playBtn) return;
  Film.playBtn.innerHTML = Film.playing ? '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  Film.playBtn.setAttribute('aria-label', Film.playing ? 'Pause' : 'Play');
  if (Film.big) Film.big.hidden = Film.playing;
}
function filmPlay(){
  if (!Film.open) return;
  if (Film.t >= FILM_DUR - 0.05){ Film.t = 0; Film.prev = 0; }
  unlockAudio();
  Film.playing = true; Film.base = Film.t; Film.t0 = performance.now(); Film.prev = Film.t;
  filmMusicStart();
  cancelAnimationFrame(Film.raf); Film.raf = requestAnimationFrame(filmTick);
  filmPlayIcon();
}
function filmPause(){
  Film.playing = false; cancelAnimationFrame(Film.raf); filmMusicStop(); filmPlayIcon();
}
function filmSeek(t){
  Film.t = Math.max(0, Math.min(FILM_DUR, t)); Film.prev = Film.t;
  filmRender(Film.t);
  if (Film.playing){ Film.base = Film.t; Film.t0 = performance.now(); if (Film.muted) return; if (Film.usingSong && !Song.failed){ Song.mode = 'film'; songSeek(MEDIA.song.filmStart + Film.t); Song.vol = filmSongVol(); songApply(0.1); if (Song.el.paused) songPlayEl(); } else musicPlay(Film.score, Film.t, filmVol()); }
}
function filmTick(now){
  if (!Film.playing || !Film.open) return;
  Film.t = Film.base + (now - Film.t0) / 1000;
  if (Film.usingSong && Song.mode === 'film' && Song.el && !Song.el.paused){
    // follow the song's clock once it is running, so a slow start or a hiccup doesn't put pictures and music out of step
    const at = Song.el.currentTime - MEDIA.song.filmStart;
    if (at > 0.05 && Math.abs(at - Film.t) > 0.25){ Film.base = at; Film.t0 = now; Film.t = at; Film.prev = Math.min(Film.prev, at); }
    const left = FILM_DUR - Film.t, fade = MEDIA.song.fadeOut;
    if (left < fade){ Song.vol = filmSongVol() * Math.max(0, left / fade); songApply(0.05); }
  }
  if (Film.t >= FILM_DUR){ Film.t = FILM_DUR; filmRender(Film.t); filmPause(); Film.cta.classList.add('pulse-cta'); return; }
  const cueVol = (Film.usingSong ? 0.7 : 1) * (S.settings.sfxVol == null ? 0.8 : S.settings.sfxVol);
  for (const [ct, name, v] of FILM_CUES) if (ct > Film.prev && ct <= Film.t && !Film.muted) playSound(name, (v || 1) * cueVol);
  Film.prev = Film.t;
  filmRender(Film.t);
  Film.raf = requestAnimationFrame(filmTick);
}
function fmtTime(t){ const s = Math.floor(t); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const lookAt = (list, t) => { let r = list[0]; for (const k of list) if (t >= k[0]) r = k; return r; };
const hideEl = el => { if (!el._h){ el.style.visibility = 'hidden'; el.style.opacity = '0'; el._h = 1; } };

/* draw one keyframed element at time t */
function filmActor(id, a, t){
  const el = Film.els[id]; if (!el) return;
  const o = a.o == null ? 1 : kv(t, a.o);
  if (o < 0.005){ hideEl(el); return; }
  el._h = 0; el.style.visibility = 'visible'; el.style.opacity = o.toFixed(3);
  if (a.draw != null) el.style.strokeDashoffset = ((Film.lens[id] || 400) * (1 - kv(t, a.draw))).toFixed(1);
  let x = a.x == null ? 0 : kv(t, a.x), y = a.y == null ? 0 : kv(t, a.y), s = a.s == null ? 1 : kv(t, a.s), r = a.r == null ? 0 : kv(t, a.r);
  const sx = a.sx == null ? 1 : kv(t, a.sx);
  if (a.hop) for (const [h0, h1] of a.hop) if (t >= h0 && t <= h1){ const p = (t - h0) / (h1 - h0); y -= Math.sin(p * Math.PI) * 26; }
  if (a.bird){
    const bid = id.slice(4), look = lookAt(Film.looks[bid] || [[0, 'happy', '']], t), fly = look[2] === 'fly';
    if (fly){
      const vx = (kv(t + 0.05, a.x) - kv(t - 0.05, a.x)) / 0.1;
      y += Math.sin(t * 15 + bid.length) * 3; r += Math.max(-16, Math.min(16, vx * 0.05));
    }
    if (a.dance) for (const [d0, d1] of a.dance) if (t >= d0 && t <= d1){
      const bt2 = (t - FILM_T0) * 4 / FILM_BAR, bi = Math.floor(bt2), ph = bt2 - bi;
      y -= Math.abs(Math.sin(Math.PI * ph)) * 12; r += (bi % 2 ? 1 : -1) * 7 * Math.sin(Math.PI * ph);
    }
    let qx = 1, qy = 1 + 0.012 * Math.sin(t * 3.1 + bid.length);   // it breathes
    if (a.sq) for (const ts of a.sq){ const dt = t - ts; if (dt >= 0 && dt < 0.5){ const k = 0.2 * Math.exp(-dt * 8) * Math.cos(dt * 24); qx *= 1 + k; qy *= 1 - k; } }
    const sqEl = Film.sq && Film.sq[bid] || (Film.sq = Film.sq || {}, Film.sq[bid] = Film.svg.querySelector('#f-bs-' + bid));
    sqEl.setAttribute('transform', 'translate(0 43) scale(' + qx.toFixed(3) + ' ' + qy.toFixed(3) + ') translate(0 -43)');
    const key = fly ? 'fly' : look[1];
    if (Film.birdKey[bid] !== key){
      Film.birdKey[bid] = key;
      const inEl = Film.svg.querySelector('#f-bi-' + bid), mk = bid + ':' + key;
      inEl.innerHTML = Film.markup[mk] || (Film.markup[mk] = filmBirdG(bid, key));
      inEl.setAttribute('class', 'pip ' + look[1] + (fly ? ' fly' : ''));
    }
  }
  if (a.x != null || a.y != null || a.s != null || a.r != null || a.hop || a.sx != null) el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + r.toFixed(1) + ') scale(' + (s * sx).toFixed(3) + ' ' + s.toFixed(3) + ')');
}

/* everything keyframes can't say: the camera, the light, sparkle, counters, the league, confetti */
function filmFX(t){
  const Q = Film.q, b = bar;
  // camera: a slow breath, a push in at the start and the end, a nudge on every bar line
  const intro = 0.1 * (1 - EASE.out(prog(t, 0, 2.6))), outro = 0.035 * EASE.in(prog(t, FILM_DUR - 4, 4));
  const sc = 1.012 + 0.01 * Math.sin(t * 0.45) + intro + outro + 0.006 * beatPulse(t) * (t > b(2) ? 1 : 0);
  Q.cam.setAttribute('transform', 'translate(180 320) rotate(' + (Math.sin(t * 0.3) * 0.3).toFixed(2) + ') scale(' + sc.toFixed(4) + ') translate(-180 -320)');
  const bp = 1 + 0.05 * beatPulse(t);
  for (const g of [Q.glowA, Q.glowB]) g.setAttribute('transform', 'translate(180 300) scale(' + bp.toFixed(3) + ') translate(-180 -300)');
  Q.rays.setAttribute('transform', 'translate(180 300) rotate(' + (t * 2.5).toFixed(2) + ')');
  if (Q.rays2) Q.rays2.setAttribute('transform', 'rotate(' + (t * 9).toFixed(2) + ')');
  // fireflies drift up, palms sway
  FIREFLIES.forEach((f, i) => {
    const el = Q.flies[i], y = ((f.y - t * f.v) % 680 + 680) % 680 - 20, x = f.x + Math.sin(t * 0.6 + f.ph) * 14;
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    el.style.opacity = (0.15 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.9 + f.ph * 2)) * (y > 20 && y < 620 ? 1 : 0)).toFixed(2);
  });
  FRONDS.forEach(([x, y, a, k], i) => Q.fronds[i].setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + (a + Math.sin(t * 0.9 + i * 1.3) * 3.5).toFixed(2) + ') scale(' + k + ')'));
  // scene change: a ring of light
  let rp = -1; for (const rt of FILM_RINGS) if (t >= rt && t < rt + 0.9) rp = (t - rt) / 0.9;
  if (rp < 0) hideEl(Q.ring); else { Q.ring._h = 0; Q.ring.style.visibility = 'visible'; Q.ring.setAttribute('transform', 'translate(180 320)'); Q.ring.setAttribute('r', (20 + 440 * EASE.out(rp)).toFixed(0)); Q.ring.style.opacity = (0.5 * (1 - rp)).toFixed(3); }
  // title: the letters spring up one by one, the logo rings out
  const markP = prog(t, 1.2, 0.8);
  if (markP <= 0 || markP >= 1) hideEl(Q.ringMark); else { Q.ringMark._h = 0; Q.ringMark.style.visibility = 'visible'; Q.ringMark.setAttribute('r', (30 + 70 * EASE.out(markP)).toFixed(0)); Q.ringMark.style.opacity = (0.6 * (1 - markP)).toFixed(3); }
  let prev = 0;
  Q.word.forEach((el, i) => {
    const p = prog(t, 1.45 + i * 0.075, 0.5), off = (1 - EASE.spring(p)) * 38;
    el.setAttribute('dy', (off - prev).toFixed(1)); prev = off; el.style.fillOpacity = Math.min(1, p * 3).toFixed(2);
  });
  // cities: windows glow, bunting flutters, sun and moon bob
  Q.wins.forEach((w, i) => { w.style.opacity = (0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1))).toFixed(2); });
  Q.flags.forEach((g, i) => { const x = 30 + i * 43, f = (x - 10) / 340; g.setAttribute('transform', 'translate(' + x + ' ' + (-74 + 48 * f * (1 - f)).toFixed(1) + ') rotate(' + (Math.sin(t * 3.2 + i * 0.9) * 8).toFixed(1) + ')'); });
  // the phone: the speaker's waves, typing dots, the mic, taps
  const wv = (arcs, on, t0) => arcs.forEach((p, i) => { p.style.opacity = on ? (0.25 + 0.75 * Math.max(0, Math.sin((t - t0) * 11 - i * 1.1))).toFixed(2) : '0'; });
  wv(Q.ltWave, t > b(6) + 1.1 && t < b(7) - 0.1, 0); wv(Q.tkWave, t > b(8) + 1.15 && t < b(9) - 0.2, 0);
  Q.tkd.forEach((d, i) => d.setAttribute('transform', 'translate(0 ' + (-Math.max(0, Math.sin(t * 10 - i * 0.9)) * 4).toFixed(1) + ')'));
  const ringEl = Film.svg.querySelector('#tk-ring'), mp = prog(t, b(9) + 0.3, 3) > 0 ? (((t - FILM_T0) * 4 / FILM_BAR) % 1) : 0;
  if (ringEl){ ringEl.setAttribute('r', (20 + 12 * mp).toFixed(1)); ringEl.style.opacity = (t > b(9) + 0.3 && t < b(10) - 0.2 ? 0.5 * (1 - mp) : 0).toFixed(2); }
  TAPS.forEach(([, x, y, t0], i) => {
    const el = Q.taps[i], p = (t - t0) / 0.5;
    if (p <= 0 || p >= 1) hideEl(el); else { el._h = 0; el.style.visibility = 'visible'; el.style.opacity = (0.6 * (1 - p)).toFixed(2); el.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (0.3 + 1.5 * EASE.out(p)).toFixed(2) + ')'); }
  });
  // review: red marks turn green one by one
  const left = [0, 1, 2].filter(i => t < b(11) + 0.5 + i * 0.45).length, cnt = Film.svg.querySelector('#rv-count');
  const txt = left ? left + ' to fix' : 'All fixed!'; if (cnt.textContent !== txt) cnt.textContent = txt;
  // the weekly league: rows slide past each other as the XP changes
  const base = [340, 285, 232], load = EASE.out(prog(t, b(12) + 0.3, 0.7));
  const xp = [...base.map(v => v * load), t < b(12) + 1.0 ? 150 * load : kv(t, [[b(12) + 1.0, 150], [b(13) + 0.5, 372, 'inOut']])];
  Q.lg.forEach(([g, rk, xe], i) => {
    if (!g) return;
    let pos = 0; xp.forEach((v, j) => { if (j !== i) pos += 1 / (1 + Math.exp(-(v - xp[i]) / 14)); });
    g.setAttribute('transform', 'translate(0 ' + (-108 + pos * 46).toFixed(1) + ')');
    const r2 = String(Math.round(pos) + 1), v2 = Math.round(xp[i]) + ' XP';
    if (rk.textContent !== r2) rk.textContent = r2; if (xe.textContent !== v2) xe.textContent = v2;
  });
  // rewards: the chest opens, coins land in the pill, the streak counts
  if (Q.chest) Q.chest.classList.toggle('open', t >= b(14) + 0.9);
  const landed = Q.coins.filter((_, i) => t >= b(14) + 1.05 + i * 0.16 + 0.7).length, xpn = Film.svg.querySelector('#f-xpn'), xt = '+' + Math.round(15 * landed / 8) + ' XP';
  if (xpn.textContent !== xt) xpn.textContent = xt;
  const sn = Math.max(1, Math.min(7, Math.floor((t - (b(15) + 0.6)) / 0.16) + 1)), snEl = Film.svg.querySelector('#f-streak-n');
  if (snEl.textContent !== String(sn)) snEl.textContent = String(sn);
  Q.sd.forEach((d, i) => d.classList.toggle('on', i < sn && t > b(15) + 0.5));
  // the route draws, levels light up as the bird passes, checkpoints twinkle, confetti at the top
  const rd = prog(t, b(16) - 0.05, 0.9), RL = Film.lens.route || 560;
  Film.route.forEach(p => { p.style.strokeDashoffset = (RL * (1 - EASE.out(rd))).toFixed(1); });
  Q.rst.forEach((st, i) => st.classList.toggle('lit', t >= ROUTE_T0 + i * ROUTE_DT - 0.05));
  Q.ck.forEach((c, i) => c.classList.toggle('lit', t >= ROUTE_T0 + (i + 0.5) * ROUTE_DT));
  const tc = ROUTE_T0 + 5 * ROUTE_DT + 0.1;
  Q.cf.forEach((el, i) => {
    const p = (t - tc) / 1.8;
    if (p <= 0 || p >= 1){ hideEl(el); return; }
    const a = (i / 26) * Math.PI * 2, d = 44 + (i % 5) * 20, x = 296 + Math.cos(a) * d * EASE.out(p), y = 160 + Math.sin(a) * d * EASE.out(p) + p * p * 110;
    el._h = 0; el.style.visibility = 'visible'; el.style.opacity = String(1 - p * p);
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (p * 540 + i * 30).toFixed(0) + ')');
  });
  // the end: confetti keeps falling
  Q.rain.forEach((el, i) => {
    const t0 = b(18) + 0.2 + (i % 6) * 0.1;
    if (t < t0){ hideEl(el); return; }
    const sp = 60 + (i * 37) % 50, y = (((t - t0) * sp + i * 53) % 700) - 40, x = ((i * 79) % 340) + 10 + Math.sin(t * 1.4 + i) * 16;
    el._h = 0; el.style.visibility = 'visible'; el.style.opacity = (0.9 * prog(t, t0, 0.6)).toFixed(2);
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((t - t0) * 200 + i * 40).toFixed(0) + ')');
  });
}

function filmRender(t){
  for (const [id, a] of Object.entries(Film.actors)) filmActor(id, a, t);
  filmFX(t);
  // captions, one word at a time; controls
  const cap = FILM_CAPTIONS.find(c => t >= c[0] && t < c[1]) || null;
  if (cap !== Film.cap){
    Film.cap = cap; Film.capSettled = false;
    const m = mascot(), txt = cap ? cap[2].replace('{bird}', m.name).replace('{a kind}', aKind(m.kind)).replace('{others}', filmOthers().map(id => MASCOTS[id].name).join(', ').replace(/, ([^,]*)$/, ' or $1')) : '';
    Film.caption.replaceChildren(...txt.split(' ').filter(Boolean).flatMap((w, i) => (i ? [' ', h('span', null, w)] : [h('span', null, w)])));
    Film.caption.classList.toggle('on', !!cap);
  }
  if (cap){
    const dt = t - cap[0], out = prog(cap[1] - t, 0, 0.25), words = Film.caption.children;
    const settled = dt > words.length * 0.07 + 0.4 && out >= 1;
    if (!(settled && Film.capSettled)){
      for (let i = 0; i < words.length; i++){ const p = EASE.out(prog(dt, i * 0.07, 0.32)); words[i].style.opacity = (p * out).toFixed(2); words[i].style.transform = 'translateY(' + ((1 - p) * 8).toFixed(1) + 'px)'; }
      Film.capSettled = settled;
    }
  }
  if (Film.range && document.activeElement !== Film.range) Film.range.value = t.toFixed(1);
  if (Film.time) Film.time.textContent = fmtTime(t) + ' / ' + fmtTime(FILM_DUR);
}
function endFilm(viaCta){
  filmPause(); Film.open = false;
  if (!S.settings.filmSeen){ S.settings.filmSeen = true; touchSettings(); }
  const cb = Film.onDone; Film.onDone = null;
  closeOverlay(); sfx('close');
  if (cb) cb(viaCta); else { UI.animate = true; render(); }
  songSync(500);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Film.playing) filmPause(); });
