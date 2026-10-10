"use strict";
/* ===================== INTRO FILM =====================
   A 35-second animated film drawn in SVG, scored with the theme song (MEDIA.song) plus live sound effects.
   Everything is a function of the playhead time t, so play, pause, scrub and replay are exact. While the song
   plays, the playhead follows the song's clock so pictures and music stay in sync.
   - filmActors(): what moves, as keyframes [[time, value, ease]]
   - FILM_CAPTIONS / FILM_CUES: on-screen text and sound effects by time
   - filmScore(): a synthesized backup score, used only if the song can't play
   ====================================================== */
const FILM_DUR = 35.5;
const EASE = {
  lin: x => x,
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  inOut: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
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
function inner(svg){ return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }

/* ----- the cast of the film ----- */
const FILM_CAST = ['lena', 'jonas', 'weber', 'emre', 'sofia', 'diego', 'carmen', 'mateo'];
const ROUTE_PTS = [[64, 520], [116, 446], [158, 372], [204, 300], [250, 232], [296, 160]];
const FILM_CAPTIONS = [
  [4.8, 9.0, 'Meet Pip, a parrot who loves to repeat after you.'],
  [9.3, 15.0, 'German with friends in Berlin. Spanish with friends in Mexico City.'],
  [15.3, 21.0, 'Short lessons, real stories, and a tutor who talks back.'],
  [21.3, 26.0, 'Daily quests, streaks and badges keep you going.'],
  [26.3, 31.0, 'From A1 to C2, one stop at a time.'],
  [31.4, FILM_DUR + 1, 'Ready? Let’s go.']
];
const FILM_CUES = [[0.3, 'ding'], [1.9, 'whoosh'], [5.2, 'chirp'], [6.9, 'pop'], [9.2, 'whoosh'],
  [10.0, 'pop', 0.6], [10.4, 'pop', 0.6], [10.8, 'pop', 0.6], [11.2, 'pop', 0.6], [12.2, 'pop', 0.6], [12.6, 'pop', 0.6], [13.0, 'pop', 0.6], [13.4, 'pop', 0.6],
  [15.4, 'select'], [16.6, 'select'], [17.8, 'select'], [19.0, 'select'], [21.2, 'whoosh'], [23.0, 'chest'], [23.7, 'coin'], [24.0, 'coin'], [24.3, 'coin'], [24.6, 'streak'],
  [26.3, 'whoosh'], [27.0, 'tap'], [27.6, 'tap'], [28.2, 'tap'], [28.8, 'tap'], [29.4, 'tap'], [30.2, 'level'], [31.6, 'chirp'], [33.2, 'ding']];

function filmScore(){
  const beat = 60 / 108, bar = beat * 4, ev = [];
  const chords = [['C3', 'E3', 'G3', 'C2'], ['B2', 'D3', 'G3', 'G1'], ['A2', 'C3', 'E3', 'A1'], ['A2', 'C3', 'F3', 'F1']];
  const melody = [
    [[0, 'E5', 0.5], [0.5, 'G5', 0.5], [1, 'A5', 0.5], [1.5, 'G5', 0.5], [2, 'E5', 1], [3, 'D5', 0.5], [3.5, 'C5', 0.5]],
    [[0, 'D5', 0.5], [0.5, 'G5', 0.5], [1, 'B5', 0.5], [1.5, 'A5', 0.5], [2, 'G5', 1.5], [3.5, 'D5', 0.5]],
    [[0, 'C5', 0.5], [0.5, 'E5', 0.5], [1, 'A5', 1], [2, 'G5', 0.5], [2.5, 'E5', 0.5], [3, 'C5', 1]],
    [[0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'F5', 0.5], [1.5, 'E5', 0.5], [2, 'D5', 1], [3, 'C5', 0.5], [3.5, 'D5', 0.5]]
  ];
  for (let b = 0; b < 15; b++){
    const t0 = b * bar, ch = chords[b % 4];
    for (const n of ch.slice(0, 3)) ev.push({ t: t0, kind: 'pad', n, d: bar * 1.02, g: b < 1 ? 0.014 : 0.02 });
    if (b >= 1){ ev.push({ t: t0, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 1.3 }); ev.push({ t: t0 + beat * 1.5, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 0.5, g: 0.05 }); ev.push({ t: t0 + beat * 2, kind: 'bass', n: ch[3].replace(/\d/, d => +d + 1), d: beat * 1.5 }); }
    if (b >= 2 && b <= 13){ for (let i = 0; i < 4; i++) ev.push({ t: t0 + beat * i + beat / 2, kind: 'hat' }); ev.push({ t: t0, kind: 'kick' }); ev.push({ t: t0 + beat * 2, kind: 'kick' }); }
    if (b >= 3 && b <= 13) for (const [o, n, d] of melody[b % 4]) ev.push({ t: t0 + o * beat, kind: 'lead', n, d: d * beat * 0.95 });
  }
  const end = 15 * bar;
  for (const n of ['C3', 'E3', 'G3', 'C4']) ev.push({ t: end, kind: 'pad', n, d: 3.2, g: 0.022 });
  ev.push({ t: end, kind: 'bass', n: 'C2', d: 2.5 });
  ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => ev.push({ t: end + i * 0.12, kind: 'bell', n, d: 1.6 }));
  return ev;
}

function filmSVG(){
  const avatarAt = id => '<g class="f-av" id="f-av-' + id + '"><g transform="scale(0.62) translate(-32 -32)"><clipPath id="fc-' + id + '"><circle cx="32" cy="32" r="32"/></clipPath><g clip-path="url(#fc-' + id + ')">' + inner(avatarSVG(id)) + '</g><circle cx="32" cy="32" r="31" fill="none" stroke="#fff" stroke-width="3"/></g></g>';
  const card = (i, icon, a, b) => '<g id="f-card' + i + '"><rect x="-150" y="-36" width="300" height="72" rx="18" class="f-card"/><circle cx="-112" cy="0" r="22" class="f-card-ic"/><g transform="translate(-124 -12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner(IC[icon]) + '</g><text x="-78" y="-4" class="f-card-a">' + a + '</text><text x="-78" y="17" class="f-card-b">' + b + '</text></g>';
  const route = ROUTE_PTS.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return '<svg class="film-svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
    '<defs><linearGradient id="f-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2FA3AE"/><stop offset="1" stop-color="#F0B42C"/></linearGradient><radialGradient id="f-glow"><stop offset="0" stop-color="#2FA3AE" stop-opacity=".35"/><stop offset="1" stop-color="#2FA3AE" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="360" height="640" class="f-bg"/><circle cx="180" cy="300" r="260" fill="url(#f-glow)" id="f-glowc"/>' +
    '<g class="f-stars">' + [[30, 60], [80, 120], [140, 40], [220, 90], [300, 50], [330, 140], [40, 200], [260, 180], [100, 260], [320, 260]].map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 3 ? 1.2 : 1.8) + '" style="animation-delay:' + (i * 0.37).toFixed(2) + 's"/>').join('') + '</g>' +
    /* scene 1-2: title, line, stations */
    '<g id="f-title"><circle cx="168" cy="190" r="16" fill="#2FA3AE"/><circle cx="190" cy="190" r="16" fill="#F0B42C" opacity=".92"/><text x="180" y="262" class="f-h1">Parlance</text><text x="180" y="292" class="f-sub">German &amp; Spanish, your way</text></g>' +
    '<path id="f-line1" d="M-20 420 L380 420" class="f-line"/>' +
    '<g id="f-stations"><circle cx="60" cy="420" r="9" class="f-st"/><circle cx="180" cy="420" r="9" class="f-st"/><circle cx="300" cy="420" r="9" class="f-st"/></g>' +
    /* scene 3: two cities */
    '<g id="f-berlin"><g class="f-sky-de"><rect x="40" y="170" width="38" height="70" rx="3"/><rect x="84" y="150" width="30" height="90" rx="3"/><path d="M146 240 V104 M146 82 V96"/><circle cx="146" cy="110" r="14"/><rect x="176" y="182" width="50" height="58" rx="3"/><rect x="232" y="160" width="34" height="80" rx="3"/><rect x="272" y="196" width="48" height="44" rx="3"/></g><text x="180" y="56" class="f-city de">Berlin · Deutsch</text></g>' +
    '<g id="f-cdmx"><g class="f-sky-es"><rect x="40" y="430" width="46" height="62" rx="4" class="h1"/><rect x="92" y="412" width="40" height="80" rx="4" class="h2"/><rect x="138" y="440" width="52" height="52" rx="4" class="h3"/><rect x="196" y="420" width="42" height="72" rx="4" class="h1"/><rect x="244" y="436" width="36" height="56" rx="4" class="h2"/><rect x="286" y="416" width="36" height="76" rx="4" class="h3"/></g>' +
    '<path d="M30 386 Q180 420 330 386" class="f-string"/>' + [50, 85, 120, 155, 190, 225, 260, 295].map((x, i) => '<path d="M' + (x - 9) + ' ' + (390 + Math.sin(i / 7 * Math.PI) * 14) + ' h18 v13 l-4 -3 l-5 4 l-5 -4 l-4 3 z" class="pp' + (i % 4) + '"/>').join('') +
    '<text x="180" y="376" class="f-city es">Ciudad de México · Español</text></g>' +
    '<g id="f-cast">' + FILM_CAST.map(id => avatarAt(id)).join('') + '</g>' +
    '<g id="f-hallo"><rect x="-32" y="-13" width="64" height="26" rx="13" class="f-bub"/><text x="0" y="5" class="f-bub-t">Hallo!</text></g>' +
    '<g id="f-hola"><rect x="-35" y="-13" width="70" height="26" rx="13" class="f-bub"/><text x="0" y="5" class="f-bub-t">¡Hola!</text></g>' +
    /* scene 4: feature cards */
    card(0, 'learn', 'Lessons', 'A1 to C2, built for real use') + card(1, 'stories', '16 stories', 'With friends in two cities') + card(2, 'talk', 'A tutor who talks back', 'Real conversations, gently corrected') + card(3, 'review', 'Review that remembers', 'Words return before you forget') +
    /* scene 5: rewards */
    '<g id="f-chest"><g class="chest film" transform="translate(-80 -72) scale(2)">' + inner(chestSVG()) + '</g></g>' +
    '<g id="f-coins">' + [0, 1, 2, 3, 4].map(i => '<circle id="f-coin' + i + '" r="7" class="f-coin"/>').join('') + '</g>' +
    '<g id="f-medals">' + ['flame', 'book', 'trophy'].map((ic2, i) => '<g id="f-medal' + i + '"><g class="medal on" transform="translate(-32 -36)">' + inner(medal(ic2, true, 64).innerHTML) + '</g></g>').join('') + '</g>' +
    '<g id="f-streak"><g transform="translate(-58 -20) scale(1.6)" fill="#F28C28">' + inner(IC.flame) + '</g><text x="6" y="10" class="f-num" id="f-streak-n">1</text><text x="-2" y="40" class="f-num-l">day streak</text></g>' +
    /* scene 6: route */
    '<g id="f-route"><path d="' + route + '" class="f-route"/>' + ROUTE_PTS.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="f-rst" id="f-rst' + i + '"/><text x="' + (p[0] + (i % 2 ? -24 : 24)) + '" y="' + (p[1] + 5) + '" class="f-rlb" text-anchor="' + (i % 2 ? 'end' : 'start') + '">' + LEVELS[i] + '</text>').join('') + '</g>' +
    '<g id="f-confetti">' + Array.from({ length: 22 }, (_, i) => '<rect id="f-cf' + i + '" width="7" height="11" rx="2" class="cf' + (i % 4) + '"/>').join('') + '</g>' +
    /* scene 7: end card */
    '<g id="f-end"><text x="180" y="444" class="f-end de">Los geht’s!</text><text x="180" y="482" class="f-end es">¡Vámonos!</text><text x="180" y="516" class="f-end en">Let’s go.</text></g>' +
    /* Pip on top of everything */
    '<g id="f-bubble"><rect x="-72" y="-20" width="144" height="36" rx="18" class="f-bub"/><path d="M-6 15 L4 26 L10 15 Z" class="f-bub"/><text x="0" y="5" class="f-bub-t" id="f-bubble-t">Hi! I’m Pip.</text></g>' +
    '<g id="f-pip"><g transform="translate(-60 -57)" class="pip happy" id="f-pip-in">' + inner(pipSVG('happy')) + '</g></g>' +
    '</svg>';
}

/* keyframes per element id; x/y are absolute stage coordinates of the element's local origin */
function filmActors(){
  const A = {};
  A['f-title'] = { o: fade(1.6, 2.4, 4.4, 5.0), y: [[1.6, 26], [2.6, 0, 'out'], [4.4, 0], [5.0, -30, 'in']] };
  A['f-line1'] = { draw: [[0.2, 0], [1.6, 1, 'out']], o: [[0, 1], [8.8, 1], [9.4, 0]] };
  A['f-stations'] = { o: [[1.0, 0], [1.5, 1], [8.8, 1], [9.4, 0]] };
  A['f-berlin'] = { o: fade(9.3, 10.0, 14.6, 15.2), y: [[9.3, -30], [10.2, 0, 'out']] };
  A['f-cdmx'] = { o: fade(9.6, 10.3, 14.6, 15.2), y: [[9.6, 30], [10.5, 0, 'out']] };
  A['f-cast'] = { o: [[9.7, 0], [9.8, 1], [14.6, 1], [15.2, 0]] };
  FILM_CAST.forEach((id, i) => { const t = [10.0, 10.4, 10.8, 11.2, 12.2, 12.6, 13.0, 13.4][i]; A['f-av-' + id] = { x: 72 + (i % 4) * 72, y: i < 4 ? 286 : 540, s: [[t, 0.01], [t + 0.45, 1, 'back']], o: [[t, 0], [t + 0.1, 1]] }; });
  A['f-hallo'] = { x: 72, y: 248, o: fade(11.0, 11.3, 14.3, 14.7), s: [[11.0, 0.6], [11.4, 1, 'back']] };
  A['f-hola'] = { x: 72, y: 502, o: fade(13.6, 13.9, 14.3, 14.7), s: [[13.6, 0.6], [14.0, 1, 'back']] };
  [15.4, 16.6, 17.8, 19.0].forEach((t, i) => { A['f-card' + i] = { x: [[t, 560], [t + 0.7, 180, 'back']], y: 150 + i * 92, o: [[t - 0.05, 0], [t, 1], [20.6, 1], [21.1, 0]] }; });
  A['f-chest'] = { x: 180, y: 336, s: [[21.4, 0.2], [22.1, 1, 'back'], [25.6, 1], [26.1, 0.6, 'in']], o: [[21.4, 0], [21.7, 1], [25.6, 1], [26.1, 0]] };
  [[-90, -140], [-40, -170], [10, -190], [60, -165], [100, -130]].forEach(([dx, dy], i) => { A['f-coin' + i] = { x: [[23.0, 180], [23.9 + i * 0.05, 180 + dx, 'out']], y: [[23.0, 320], [23.9 + i * 0.05, 320 + dy, 'out'], [25.6, 330 + dy]], o: [[23.0, 0], [23.1, 1], [25.4, 1], [25.9, 0]], s: 1 }; });
  [[90, 196], [180, 168], [270, 196]].forEach(([x, y], i) => { const t = 23.6 + i * 0.3; A['f-medal' + i] = { x, y, s: [[t, 0.1], [t + 0.5, 0.95, 'back']], r: [[t, -40], [t + 0.5, 0, 'out']], o: [[t, 0], [t + 0.15, 1], [25.6, 1], [26.1, 0]] }; });
  A['f-streak'] = { x: 168, y: 486, o: [[24.2, 0], [24.5, 1], [25.6, 1], [26.1, 0]], s: [[24.2, 0.6], [24.7, 1, 'back']] };
  A['f-route'] = { o: [[26.1, 0], [26.6, 1], [31.0, 1], [31.6, 0]], draw: [[26.1, 0], [27.0, 1, 'out']] };
  A['f-end'] = { o: [[31.6, 0], [32.3, 1]], y: [[31.6, 20], [32.4, 0, 'out']] };
  A['f-glowc'] = { o: [[0, 0.6], [30.2, 0.6], [30.5, 1], [31.5, 0.6]] };
  // Pip: flies in, perches on the line, visits the cities, hops with each card, rides the route, takes a bow
  const routeX = ROUTE_PTS.map((p, i) => [27.0 + i * 0.6, p[0], 'inOut']), routeY = ROUTE_PTS.map((p, i) => [27.0 + i * 0.6, p[1] - 30, 'inOut']);
  A['f-pip'] = {
    x: [[4.4, -90], [6.2, 180, 'out'], [9.2, 180], [10.2, 296, 'inOut'], [15.0, 296], [15.6, 180, 'inOut'], [21.0, 180], [21.6, 296, 'inOut'], [26.2, 296], [26.9, 64, 'inOut'], ...routeX, [31.4, 296], [32.2, 180, 'inOut']],
    y: [[4.4, 300], [6.2, 380, 'out'], [9.2, 380], [10.2, 170, 'inOut'], [15.0, 170], [15.6, 520, 'inOut'], [21.0, 520], [21.6, 476, 'inOut'], [26.2, 476], [26.9, 490, 'inOut'], ...routeY, [31.4, 130], [32.2, 320, 'inOut']],
    s: [[4.4, 0.9], [6.2, 0.9], [9.2, 0.9], [10.2, 0.55], [15.0, 0.55], [15.6, 0.7], [21.0, 0.7], [21.6, 0.7], [26.2, 0.7], [26.9, 0.62], [31.4, 0.62], [32.2, 1.45, 'back']],
    o: [[4.3, 0], [4.5, 1]],
    hop: [[6.8, 7.4], [15.5, 15.9], [16.7, 17.1], [17.9, 18.3], [19.1, 19.5], [33.0, 33.6]]
  };
  A['f-bubble'] = { x: [[6.3, 205], [9.0, 205]], y: 300, o: fade(6.7, 7.0, 8.7, 9.0), s: [[6.7, 0.6], [7.1, 1, 'back']] };
  return A;
}
const FILM_PIP = [[0, 'happy', ''], [4.4, 'happy', 'fly'], [6.2, 'happy', ''], [6.8, 'cheer', ''], [8.0, 'happy', ''], [9.4, 'happy', 'fly'], [10.2, 'think', ''], [15.0, 'happy', 'fly'], [15.6, 'cheer', ''], [21.0, 'happy', 'fly'], [21.6, 'wow', ''], [23.2, 'cheer', ''], [26.2, 'happy', 'fly'], [30.2, 'cheer', 'fly'], [31.4, 'happy', 'fly'], [32.2, 'cheer', '']];

const Film = { open: false, t: 0, playing: false, raf: 0, muted: false, prev: 0 };
function openFilm(opts = {}){
  Object.assign(Film, { open: true, t: 0, playing: false, prev: 0, onDone: opts.onDone || null, doneLabel: opts.doneLabel || 'Close', muted: !S.settings.sfx && false });
  openOverlay('film'); sfx('open');
  const close = h('button', { class: 'icon-btn plain f-x', type: 'button', 'aria-label': 'Close the film', html: IC.close, onclick: () => endFilm(false) });
  Film.muteBtn = h('button', { class: 'chip f-mute', type: 'button', 'aria-pressed': 'true', onclick: () => { Film.muted = !Film.muted; Film.muteBtn.setAttribute('aria-pressed', String(!Film.muted)); Film.muteBtn.replaceChildren(ic('speaker'), Film.muted ? 'Sound off' : 'Sound on'); if (Film.muted) filmMusicStop(); else if (Film.playing) filmMusicStart(); } }, ic('speaker'), 'Sound on');
  OV.head.replaceChildren(close, h('div', { class: 'ov-title grow' }, 'Welcome to Parlance'), Film.muteBtn);
  const stage = h('div', { class: 'film-stage', html: filmSVG(), role: 'img', 'aria-label': 'Intro film: Pip the parrot shows you around Parlance' });
  Film.caption = h('div', { class: 'film-cap', 'aria-live': 'polite' });
  Film.big = h('button', { class: 'film-big', type: 'button', 'aria-label': 'Play', html: '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>' });
  Film.big.addEventListener('click', e => { e.stopPropagation(); filmPlay(); });
  const wrap = h('div', { class: 'film-wrap' }, stage, Film.caption, Film.big);
  wrap.addEventListener('click', () => { if (Film.playing) filmPause(); else filmPlay(); });
  OV.bodyIn.replaceChildren(wrap);
  Film.svg = stage.querySelector('svg');
  Film.els = {}; Film.actors = filmActors();
  for (const id of Object.keys(Film.actors)){ const el = Film.svg.querySelector('#' + id); if (el) Film.els[id] = el; }
  Film.pipIn = Film.svg.querySelector('#f-pip-in'); Film.pipMood = 'happy'; Film.pipCls = '';
  Film.lens = {};
  for (const id of ['f-line1']){ const el = Film.els[id]; let L = 420; try { L = el.getTotalLength() || 420; } catch (e) {} Film.lens[id] = L; el.style.strokeDasharray = L; }
  const rp = Film.svg.querySelector('.f-route'); let RL = 560; try { RL = rp.getTotalLength() || 560; } catch (e) {} Film.lens['f-route'] = RL; rp.style.strokeDasharray = RL;
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
function filmRender(t){
  const A = Film.actors;
  for (const [id, a] of Object.entries(A)){
    const el = Film.els[id]; if (!el) continue;
    const o = a.o == null ? 1 : kv(t, a.o);
    el.style.opacity = o.toFixed(3); el.style.visibility = o < 0.005 ? 'hidden' : 'visible';
    if (o < 0.005) continue;
    if (a.draw != null){ const L = Film.lens[id] || (id === 'f-route' ? Film.lens['f-route'] : 400); const target = id === 'f-route' ? el.querySelector('.f-route') : el; target.style.strokeDashoffset = (L * (1 - kv(t, a.draw))).toFixed(1); }
    const x = a.x == null ? 0 : kv(t, a.x), y = a.y == null ? 0 : kv(t, a.y), s = a.s == null ? 1 : kv(t, a.s), r = a.r == null ? 0 : kv(t, a.r);
    let hy = 0; if (a.hop) for (const [h0, h1] of a.hop) if (t >= h0 && t <= h1){ const p = (t - h0) / (h1 - h0); hy = -Math.sin(p * Math.PI) * 26; }
    if (a.x != null || a.y != null || a.s != null || a.r != null || a.hop) el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y + hy).toFixed(1) + ') rotate(' + r.toFixed(1) + ') scale(' + s.toFixed(3) + ')');
  }
  // Pip mood + flying
  let mood = 'happy', cls = '';
  for (const [mt, m, c] of FILM_PIP) if (t >= mt){ mood = m; cls = c; }
  if (mood !== Film.pipMood){ Film.pipMood = mood; Film.pipIn.innerHTML = inner(pipSVG(mood)); }
  if (('pip ' + mood + (cls ? ' ' + cls : '')) !== Film.pipIn.getAttribute('class')) Film.pipIn.setAttribute('class', 'pip ' + mood + (cls ? ' ' + cls : ''));
  // route stations light up as Pip passes; chest opens; streak counts
  ROUTE_PTS.forEach((_, i) => { const st = Film.svg.querySelector('#f-rst' + i); if (st) st.classList.toggle('lit', t >= 27.0 + i * 0.6); });
  const ch = Film.svg.querySelector('#f-chest .chest'); if (ch) ch.classList.toggle('open', t >= 23.0);
  const n = Film.svg.querySelector('#f-streak-n'); if (n) n.textContent = String(Math.max(1, Math.min(7, Math.floor((t - 24.4) / 0.16) + 1)));
  // confetti at the summit
  for (let i = 0; i < 22; i++){
    const el = Film.svg.querySelector('#f-cf' + i); if (!el) continue;
    const t0 = 30.2, p = (t - t0) / 1.6;
    if (p <= 0 || p >= 1){ el.style.visibility = 'hidden'; continue; }
    const a = (i / 22) * Math.PI * 2, d = 40 + (i % 5) * 18;
    const x = 296 + Math.cos(a) * d * EASE.out(p), y = 160 + Math.sin(a) * d * EASE.out(p) + p * p * 90;
    el.style.visibility = 'visible'; el.style.opacity = String(1 - p);
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (p * 540 + i * 30).toFixed(0) + ')');
  }
  // captions, bubble text, controls
  const cap = FILM_CAPTIONS.find(c => t >= c[0] && t < c[1]);
  const txt = cap ? cap[2] : '';
  if (Film.caption.textContent !== txt){ Film.caption.textContent = txt; Film.caption.classList.toggle('on', !!txt); }
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
