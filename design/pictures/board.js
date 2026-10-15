"use strict";
/* Picture style board (design/pictures/board.html). Each sample is drawn once on a 64 x 64 grid with role classes
   (pk-red, pk-line, pk-shade …); the page paints it three ways (s-flat, s-ink, s-sticker). `sp` marks the spot-color
   shapes the Ink style keeps. The people and the scene use the app's own cast data (CAST in content/cast.js). */

/* ---------------- the sixteen sample words ---------------- */
const WORDS = [
  { id: 'bread', en: 'bread', de: 'das Brot', level: 'A1', svg:
    '<path class="pk-tan sp" d="M9 40 C9 25 19 15 32 15 C45 15 55 25 55 40 C55 46 52 50 47 50 L17 50 C12 50 9 46 9 40Z"/>' +
    '<path class="pk-shade" d="M9 40 C9 46 12 50 17 50 L47 50 C52 50 55 46 55 40 C55 43 50 44 47 44 L17 44 C12 44 9 43 9 40Z"/>' +
    '<path class="pk-line3" d="M21 24 L25 33 M30 21 L34 31 M39 24 L43 33"/><path class="pk-hi" d="M15 34 C15 29 17 26 20 23"/>' },
  { id: 'apple', en: 'apple', de: 'der Apfel', level: 'A1', svg:
    '<path class="pk-red sp" d="M32 21 C26 14 11 17 11 34 C11 46 21 57 32 52 C43 57 53 46 53 34 C53 17 38 14 32 21Z"/>' +
    '<path class="pk-shade" d="M53 34 C53 46 43 57 32 52 C38 50 45 44 46 34 C47 26 44 21 40 17 C49 18 53 26 53 34Z"/>' +
    '<path class="pk-line3" d="M32 21 C32 16 33 12 36 9"/><path class="pk-green sp" d="M34 15 C37 8 45 7 49 10 C46 16 39 18 34 15Z"/>' +
    '<path class="pk-hi" d="M17 33 C17 27 20 24 24 22"/>' },
  { id: 'coffee', en: 'coffee', de: 'der Kaffee', level: 'A1', svg:
    '<ellipse class="pk-paper" cx="31" cy="52" rx="25" ry="5"/>' +
    '<path class="pk-teal" fill-rule="evenodd" d="M46 29 H51 C60 29 60 46 47 46 H45 V42 H47 C53 42 53 33 49 33 H46Z"/>' +
    '<path class="pk-teal sp" d="M13 26 H47 V37 C47 46 41 51 30 51 C19 51 13 46 13 37Z"/>' +
    '<path class="pk-shade" d="M47 26 V37 C47 46 41 51 30 51 C38 49 41 44 41 36 V26Z"/>' +
    '<ellipse class="pk-paper" cx="30" cy="26" rx="17" ry="4.6"/><ellipse class="pk-brown sp" cx="30" cy="26.6" rx="14" ry="3.2"/>' +
    '<path class="pk-line" d="M23 18 C20 14 26 12 23 8 M31 18 C28 14 34 12 31 8 M39 18 C36 14 42 12 39 8"/><path class="pk-hi" d="M17 35 C17 38 18 40 20 42"/>' },
  { id: 'dog', en: 'dog', de: 'der Hund', level: 'A1', svg:
    '<path class="pk-brown sp" d="M18 19 C10 18 7 32 11 43 C17 44 21 35 22 25Z"/><path class="pk-brown sp" d="M46 19 C54 18 57 32 53 43 C47 44 43 35 42 25Z"/>' +
    '<ellipse class="pk-tan" cx="32" cy="33" rx="16" ry="16"/><ellipse class="pk-cream" cx="32" cy="42" rx="9.5" ry="7.5"/>' +
    '<ellipse class="pk-ink" cx="32" cy="37.5" rx="3.6" ry="2.6"/><circle class="pk-ink" cx="24.5" cy="30" r="2.3"/><circle class="pk-ink" cx="39.5" cy="30" r="2.3"/>' +
    '<path class="pk-pink" d="M29 45.4 C29 52 35 52 35 45.4Z"/><path class="pk-line" d="M32 40.2 V44 M27 44 C29.5 47.2 34.5 47.2 37 44"/>' +
    '<path class="pk-hi" d="M21 24 C23 20 26 18 29 18"/>' },
  { id: 'train', en: 'train', de: 'der Zug', level: 'A1', svg:
    '<circle class="pk-paper" cx="13" cy="8" r="3.2"/><circle class="pk-paper" cx="19.5" cy="5.5" r="2.6"/>' +
    '<path class="pk-ink" d="M13 25 L14 16 H21 L22 25Z"/><rect class="pk-ink" x="11" y="13" width="12" height="4" rx="2"/>' +
    '<rect class="pk-blue sp" x="7" y="24" width="31" height="19" rx="7"/><path class="pk-yellow" d="M26 24 C26 18.5 33 18.5 33 24Z"/>' +
    '<rect class="pk-ink" x="33" y="11.5" width="23" height="5.5" rx="2"/><rect class="pk-red sp" x="35" y="16" width="19" height="28" rx="3"/>' +
    '<rect class="pk-sky" x="39.5" y="21" width="10" height="9" rx="2"/>' +
    '<rect class="pk-ink" x="5" y="41" width="51" height="6" rx="2"/>' +
    '<circle class="pk-ink" cx="18" cy="48" r="7"/><circle class="pk-ink" cx="44" cy="48" r="7"/><circle class="pk-yellow" cx="18" cy="48" r="2.4"/><circle class="pk-yellow" cx="44" cy="48" r="2.4"/>' +
    '<circle class="pk-yellow" cx="8.5" cy="32" r="2.6"/><rect class="pk-grey" x="4" y="56" width="54" height="3" rx="1.5"/>' +
    '<path class="pk-shade" d="M7 36 H38 V37 C38 41 34 43 31 43 H14 C10 43 7 40 7 36Z"/>' },
  { id: 'key', en: 'key', de: 'der Schlüssel', level: 'A2', svg:
    '<g transform="rotate(45 20 20)"><path class="pk-yellow sp" d="M27 17.5 H55 V22.5 H53 V30 H49 V22.5 H46 V27.5 H42 V22.5 H27Z"/></g>' +
    '<path class="pk-yellow sp" fill-rule="evenodd" d="M10 20 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0Z M15.5 20 a4.5 4.5 0 1 0 9 0 a4.5 4.5 0 1 0 -9 0Z"/>' +
    '<path class="pk-hi" d="M13 15 C14.5 12.5 16.5 11.3 19 11"/>' },
  { id: 'glasses', en: 'glasses', de: 'die Brille', level: 'A1', svg:
    '<path class="pk-brown" d="M9 30 L4 22 L8.5 20 L13.5 28Z"/><path class="pk-brown" d="M55 30 L60 22 L55.5 20 L50.5 28Z"/>' +
    '<circle class="pk-sky sp" cx="19" cy="36" r="10"/><circle class="pk-sky sp" cx="45" cy="36" r="10"/>' +
    '<path class="pk-brown" fill-rule="evenodd" d="M8 36 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0Z M11.5 36 a7.5 7.5 0 1 1 15 0 a7.5 7.5 0 1 1 -15 0Z"/>' +
    '<path class="pk-brown" fill-rule="evenodd" d="M34 36 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0Z M37.5 36 a7.5 7.5 0 1 1 15 0 a7.5 7.5 0 1 1 -15 0Z"/>' +
    '<path class="pk-brown" d="M29.5 32.5 C31 30 33 30 34.5 32.5 V35 C33 33.4 31 33.4 29.5 35Z"/>' +
    '<path class="pk-hi" d="M13.5 32 C14.5 30.2 16 29.2 17.8 29 M39.5 32 C40.5 30.2 42 29.2 43.8 29"/>' },
  { id: 'to-read', en: 'to read', de: 'lesen', level: 'A1', svg:
    '<path class="pk-teal sp" d="M12 58 C12 41 19 33 32 33 C45 33 52 41 52 58Z"/>' +
    '<circle class="pk-figure" cx="32" cy="19" r="10.5"/><circle class="pk-ink" cx="27.8" cy="21" r="1.7"/><circle class="pk-ink" cx="36.2" cy="21" r="1.7"/>' +
    '<path class="pk-line" d="M29 26.2 Q32 28.2 35 26.2"/>' +
    '<path class="pk-orange sp" d="M7 41 L32 46.5 L57 41 V54 L32 59.5 L7 54Z"/>' +
    '<path class="pk-paper" d="M10 41.5 L32 46.8 V56.5 L10 51.2Z"/><path class="pk-paper" d="M54 41.5 L32 46.8 V56.5 L54 51.2Z"/>' +
    '<path class="pk-line" d="M14 45.5 L28 48.9 M14 49.6 L28 53 M36 48.9 L50 45.5 M36 53 L50 49.6"/>' +
    '<circle class="pk-figure" cx="9.5" cy="46" r="3.6"/><circle class="pk-figure" cx="54.5" cy="46" r="3.6"/>' },
  { id: 'to-sleep', en: 'to sleep', de: 'schlafen', level: 'A1', svg:
    '<path class="pk-yellow sp" d="M50 8 A9 9 0 1 0 55 22 A7 7 0 0 1 50 8Z"/><path class="pk-yellow" d="M31 13.5 L32.2 17 L35.7 18.2 L32.2 19.4 L31 22.9 L29.8 19.4 L26.3 18.2 L29.8 17Z"/>' +
    '<rect class="pk-brown sp" x="6" y="37" width="52" height="7" rx="2.5"/><rect class="pk-brown" x="8" y="43" width="4" height="9" rx="1.5"/><rect class="pk-brown" x="52" y="43" width="4" height="9" rx="1.5"/>' +
    '<rect class="pk-brown" x="6" y="27" width="5" height="17" rx="2.2"/>' +
    '<rect class="pk-paper" x="12" y="32" width="17" height="8" rx="4"/>' +
    '<circle class="pk-figure" cx="20" cy="30.5" r="6.8"/><path class="pk-line" d="M16.8 29.8 Q18.8 32.2 20.8 29.8"/>' +
    '<path class="pk-purple sp" d="M26 34 Q26 30.5 30.5 30.5 H52 Q56 30.5 56 35 V41 H26Z"/><path class="pk-line" d="M28 36.5 H53"/>' },
  { id: 'to-swim', en: 'to swim', de: 'schwimmen', level: 'A2', svg:
    '<path class="pk-figure" d="M30 38 C36 32 42 24 46 16 L51.5 19.5 C47.5 28 41.5 36 35 43Z"/><circle class="pk-figure" cx="48.8" cy="16" r="3.8"/>' +
    '<circle class="pk-figure" cx="23" cy="30" r="8"/><path class="pk-red sp" d="M15 29.6 A8 8 0 0 1 31 29.6 C28 31 18 31 15 29.6Z"/><circle class="pk-ink" cx="27" cy="32" r="1.5"/>' +
    '<path class="pk-blue sp" d="M5 37 q6.75 -5 13.5 0 t13.5 0 t13.5 0 t13.5 0 V57 H5Z"/>' +
    '<path class="pk-shade" d="M5 46 q6.75 -4 13.5 0 t13.5 0 t13.5 0 t13.5 0 V57 H5Z"/>' +
    '<path class="pk-hi" d="M11 41.5 q3.5 -2.6 7 0 M33 43 q3.5 -2.6 7 0"/>' +
    '<circle class="pk-sky" cx="43" cy="11" r="1.7"/><circle class="pk-sky" cx="55" cy="12" r="1.7"/><circle class="pk-sky" cx="56.5" cy="21" r="1.4"/>' },
  { id: 'to-cook', en: 'to cook', de: 'kochen', level: 'A1', svg:
    '<path class="pk-line" d="M11 38 C8 34 14 32 11 28 M53 38 C50 34 56 32 53 28"/>' +
    '<path class="pk-teal sp" d="M18 48 C18 41 24 37 32 37 C40 37 46 41 46 48Z"/>' +
    '<circle class="pk-figure" cx="32" cy="29" r="9"/><circle class="pk-ink" cx="28.2" cy="29.5" r="1.5"/><circle class="pk-ink" cx="35.8" cy="29.5" r="1.5"/><path class="pk-line" d="M28.8 33.4 Q32 35.8 35.2 33.4"/>' +
    '<circle class="pk-paper" cx="25" cy="14" r="6"/><circle class="pk-paper" cx="32" cy="10.5" r="7"/><circle class="pk-paper" cx="39" cy="14" r="6"/><rect class="pk-paper" x="24" y="15.5" width="16" height="7" rx="2.5"/>' +
    '<path class="pk-tan" d="M36 48 L39.5 49 L52 25 L48.5 23.5Z"/><ellipse class="pk-tan" cx="51" cy="22" rx="3.2" ry="4.4" transform="rotate(25 51 22)"/>' +
    '<rect class="pk-red sp" x="15" y="44" width="34" height="14" rx="4"/><rect class="pk-grey" x="12" y="41" width="40" height="5.5" rx="2.7"/>' +
    '<rect class="pk-grey" x="6" y="46" width="8" height="3.6" rx="1.8"/><rect class="pk-grey" x="50" y="46" width="8" height="3.6" rx="1.8"/>' +
    '<path class="pk-shade" d="M49 47 V54 C49 56.5 47 58 45 58 H40 C44 56 45 52 45 47Z"/>' },
  { id: 'tired', en: 'tired', de: 'müde', level: 'A1', svg:
    '<circle class="pk-figure" cx="32" cy="32" r="22"/>' +
    '<path class="pk-line3" d="M16.5 28.5 Q21.5 33 26.5 28.5 M37.5 28.5 Q42.5 33 47.5 28.5"/>' +
    '<path class="pk-shade" d="M17 34.5 Q21.5 38.8 26 34.5 Q21.5 36.5 17 34.5Z M38 34.5 Q42.5 38.8 47 34.5 Q42.5 36.5 38 34.5Z"/>' +
    '<path class="pk-line" d="M14.5 26.5 L27 22.8 M49.5 26.5 L37 22.8"/>' +
    '<circle class="pk-blush" cx="16.5" cy="41" r="3.6"/><circle class="pk-blush" cx="47.5" cy="41" r="3.6"/>' +
    '<ellipse class="pk-ink" cx="32" cy="44.5" rx="5.6" ry="6.4"/><ellipse class="pk-pink sp" cx="32" cy="48.2" rx="3.6" ry="2.6"/>' },
  { id: 'big', en: 'big', de: 'groß', level: 'A1', svg: null },
  { id: 'blue', en: 'blue', de: 'blau', level: 'A1', svg:
    '<path class="pk-blue sp" d="M6 44 C4 34 12 29 21 31 C26 26 38 26 44 32 C54 32 58 41 53 48 C48 55 34 56 26 53 C14 55 7 51 6 44Z"/>' +
    '<path class="pk-shade" d="M53 48 C48 55 34 56 26 53 C36 52 46 47 49 40 C51 36 50 33 47 32 C56 33 58 42 53 48Z"/>' +
    '<path class="pk-hi" d="M12 41 C12 36 15 34 20 34"/>' +
    '<g transform="translate(34 30) rotate(32)"><rect class="pk-tan" x="-3" y="-27" width="6" height="21" rx="3"/><rect class="pk-grey" x="-4.4" y="-9" width="8.8" height="8" rx="1.6"/>' +
    '<path class="pk-blue sp" d="M-4.4 -1.5 H4.4 L2.6 8 Q0 11.5 -2.6 8Z"/></g>' },
  { id: 'to-recycle', en: 'to recycle', de: 'recyceln', level: 'B2', svg: null },
  { id: 'cloud-nine', en: 'to be on cloud nine', de: 'im siebten Himmel sein', level: 'C1', svg: null }
];

/* ---------------- drawings built from the apple, and two more ---------------- */
const f1 = n => +n.toFixed(1);
const APPLE = WORDS.find(w => w.id === 'apple').svg;
/* "big": the same apple twice, the target in color and the other one small and grey */
const mono = svg => svg.replace(/class="pk-(red|green|orange|yellow|teal|blue|sky|purple|pink|brown|tan|cream|paper)( sp)?"/g, 'class="pk-grey"').replace(/<path class="pk-hi"[^>]*\/>/g, '');
WORDS.find(w => w.id === 'big').svg =
  '<g transform="translate(-1 4.5) scale(.82)">' + APPLE + '</g>' +
  '<g transform="translate(44.5 35.4) scale(.27)">' + mono(APPLE) + '</g>' +
  '<path class="pk-line" d="M5 56.5 H59"/>';
/* an arc with an arrowhead at its end, clockwise, for the recycling bin */
function arrowArc(cx, cy, r, a0, a1){
  const rad = a => a * Math.PI / 180, P = a => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const [x0, y0] = P(a0), [x1, y1] = P(a1), tx = -Math.sin(rad(a1)), ty = Math.cos(rad(a1)), nx = Math.cos(rad(a1)), ny = Math.sin(rad(a1));
  const tip = [x1 + tx * 4.4, y1 + ty * 4.4], b1 = [x1 + nx * 3.6, y1 + ny * 3.6], b2 = [x1 - nx * 3.6, y1 - ny * 3.6];
  return '<path class="pk-linew" d="M' + f1(x0) + ' ' + f1(y0) + ' A' + r + ' ' + r + ' 0 0 1 ' + f1(x1) + ' ' + f1(y1) + '"/>' +
    '<path class="pk-linew hd" d="M' + f1(tip[0]) + ' ' + f1(tip[1]) + ' L' + f1(b1[0]) + ' ' + f1(b1[1]) + ' L' + f1(b2[0]) + ' ' + f1(b2[1]) + 'Z"/>';
}
WORDS.find(w => w.id === 'to-recycle').svg =
  '<path class="pk-green sp" d="M16 24 H48 L44.5 56 H19.5Z"/><path class="pk-shade" d="M48 24 L44.5 56 H39 L42 24Z"/>' +
  arrowArc(32, 40, 8.2, 205, 315) + arrowArc(32, 40, 8.2, 25, 135) +
  '<rect class="pk-grey" x="13" y="17.5" width="38" height="7.5" rx="3.7"/><path class="pk-grey" d="M25 17.5 V14.5 Q25 11.5 28 11.5 H36 Q39 11.5 39 14.5 V17.5Z"/>';
const HEART = (x, y, s) => '<path class="pk-pink sp" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 4 C-6.5 -1 -3 -6.5 0 -2.6 C3 -6.5 6.5 -1 0 4Z"/>';
WORDS.find(w => w.id === 'cloud-nine').svg =
  '<path class="pk-figure" d="M25.5 29 L15 20 L18.5 16.5 L28.5 25Z"/><path class="pk-figure" d="M38.5 29 L49 20 L45.5 16.5 L35.5 25Z"/>' +
  '<circle class="pk-figure" cx="14.5" cy="18" r="3"/><circle class="pk-figure" cx="49.5" cy="18" r="3"/>' +
  '<path class="pk-orange sp" d="M23.5 36 C23.5 27 27.5 23 32 23 C36.5 23 40.5 27 40.5 36Z"/>' +
  '<circle class="pk-figure" cx="32" cy="14.5" r="7.6"/><path class="pk-line" d="M27.4 13.4 Q29 11.4 30.6 13.4 M33.4 13.4 Q35 11.4 36.6 13.4"/><path class="pk-ink" d="M28.4 17 Q32 22.2 35.6 17Z"/>' +
  '<path class="pk-paper" d="M13 53 C4 53 4 40 13 40 C13 31 26 27.5 32 34.5 C38 27.5 51 31 51 40 C60 40 60 53 51 53Z"/>' +
  '<path class="pk-shade" d="M13 53 C20 49 44 49 51 53Z"/>' + HEART(10, 24, 1.15) + HEART(54, 28, 1) + HEART(55, 11, .8);

/* ---------------- the cast, drawn full length ---------------- */
const LEGS = { lena: '#5B4B70', jonas: '#3D5A80' };   // trousers: the board's guess; the cast data would get a `legs` color
const SKIN_SH = '#000';
/* castHead(look) -> { back, front }: the portrait's head split in two so a body can sit between them. Every shape carries
   class "o", which the style turns into an ink outline (or none). */
function castHead(L){
  const hs = HAIR[L.style] || HAIR.short;
  const fill = (s, col) => s ? '<g fill="' + col + '" class="o">' + s + '</g>' : '';
  let back = fill(hs.back, L.hair) + '<rect x="28" y="35" width="8" height="10" rx="3" fill="' + L.skin + '" class="o"/><rect x="28" y="35" width="8" height="5" fill="#000" opacity=".08"/>';
  let s = '<ellipse cx="32" cy="28" rx="11.5" ry="13" fill="' + L.skin + '" class="o"/>';
  if (L.style === 'bald') s += '<ellipse cx="27" cy="18.8" rx="3.4" ry="1.5" transform="rotate(-24 27 18.8)" fill="#fff" opacity=".3"/>';
  s += fill(hs.front, L.hair);
  if (L.style === 'braids') s += [21.35, 42.65].map(x => '<rect x="' + (x - 2.3) + '" y="55.4" width="4.6" height="2" rx="1" fill="' + (L.ribbon || L.shirt) + '"/>').join('');
  if (L.style === 'cap') s += '<path d="M19.5 24.5 C20 14 26 11.5 32 11.5 C38 11.5 44 14 44.5 24.5 Z" fill="#E4572E" class="o"/><path d="M40 23 C46 22.4 52 23.4 54.5 25.4 C50.5 27 45 26.6 40 26 Z" fill="#C2411D" class="o"/>';
  if (L.beard) s += '<path d="M20.8 30 C21.3 40.5 26 44.5 32 44.5 C38 44.5 42.7 40.5 43.2 30 C41 35.5 37 38 32 38 C27 38 23 35.5 20.8 30Z" fill="' + L.hair + '" class="o"/>';
  s += '<circle cx="27.5" cy="29" r="1.7" fill="#1B1B1B"/><circle cx="36.5" cy="29" r="1.7" fill="#1B1B1B"/>';
  s += '<path d="M25 25.3 Q27.5 24 30 25.3 M34 25.3 Q36.5 24 39 25.3" fill="none" stroke="' + (L.brow || (L.style === 'silver' || L.style === 'bun' ? '#8D8D8D' : L.hair)) + '" stroke-width="1.3" stroke-linecap="round"/>';
  s += '<path d="M28.6 34.2 Q32 37 35.4 34.2" fill="none" stroke="' + (L.beard ? '#F4E3D7' : '#7A3B2A') + '" stroke-width="1.5" stroke-linecap="round"/>';
  if (L.mustache) s += '<path d="M26.6 33.6 C28.4 31.8 30.9 31.9 32 33 C33.1 31.9 35.6 31.8 37.4 33.6 C35.6 35 33.5 34.8 32 34 C30.5 34.8 28.4 35 26.6 33.6 Z" fill="' + L.hair + '"/>';
  s += '<circle cx="24.5" cy="32.5" r="2" fill="#FF8A80" opacity=".28"/><circle cx="39.5" cy="32.5" r="2" fill="#FF8A80" opacity=".28"/>';
  if (L.freckles) s += '<g fill="#B5562B" opacity=".45"><circle cx="25.5" cy="31.6" r=".55"/><circle cx="27" cy="32.6" r=".55"/><circle cx="37" cy="32.6" r=".55"/><circle cx="38.5" cy="31.6" r=".55"/></g>';
  if (L.glasses) s += '<g fill="none" stroke="#2A2A2A" stroke-width="1.2"><circle cx="27.5" cy="29" r="3.8"/><circle cx="36.5" cy="29" r="3.8"/><path d="M31.3 29 H32.7"/></g>';
  if (L.earrings) s += '<circle cx="20.6" cy="33.5" r="1.5" fill="#E8B84A"/><circle cx="43.4" cy="33.5" r="1.5" fill="#E8B84A"/>';
  return { back, front: s };
}
/* a portrait (bust) in the style: the same head over shoulders, on the cast member's color */
function bustSVG(id){
  const L = CAST[id].look, hd = castHead(L);
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="' + L.bg + '"/>' + hd.back +
    '<path d="M9 66 C10 52 21 44.5 32 44.5 C43 44.5 54 52 55 66 Z" fill="' + L.shirt + '" class="o"/><path d="M27 44.8 L32 50 L37 44.8" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.6" stroke-linejoin="round"/>' +
    (L.tie ? '<path d="M30.5 45.1 H33.5 L33 47.6 H31 Z M31 47.6 L30 56.5 L32 59 L34 56.5 L33 47.6 Z" fill="' + L.tie + '"/>' : '') + hd.front + '</svg>';
}
const MUG = (x, y, k) => '<g transform="translate(' + x + ' ' + y + ') scale(' + (k || 1) + ')"><path class="pk-paper" d="M0 0 H9 V7 C9 9.6 7 11 4.5 11 C2 11 0 9.6 0 7Z"/><path class="pk-paper" fill-rule="evenodd" d="M9 1.8 H10.4 C13.8 1.8 13.8 8.2 10.4 8.2 H9 V6.4 H10.2 C11.6 6.4 11.6 3.6 10.2 3.6 H9Z"/><ellipse class="pk-brown" cx="4.5" cy="0.4" rx="4.5" ry="1.3"/><path class="pk-line" d="M2.4 -3 C1 -4.8 3.6 -5.8 2.2 -7.8 M6.2 -3 C4.8 -4.8 7.4 -5.8 6 -7.8"/></g>';
/* figureInner(id, pose) -> markup in a 64-wide space, feet at y 101: the head, a body in the cast member's colors and trousers */
function figureInner(id, pose){
  const L = CAST[id].look, hd = castHead(L), legs = LEGS[id] || '#3D4A5C', sk = L.skin;
  const arm = (side, bent) => {
    const m = x => side === 'l' ? x : 64 - x;
    if (!bent) return '<path d="M' + m(21.5) + ' 50 C' + m(17) + ' 52 ' + m(15.5) + ' 62 ' + m(16.5) + ' 72 L' + m(21) + ' 72 C' + m(21.5) + ' 63 ' + m(22) + ' 57 ' + m(25) + ' 53Z" fill="' + L.shirt + '" class="o"/><circle cx="' + m(18.8) + '" cy="74" r="3" fill="' + sk + '" class="o"/>';
    return '<rect x="-3.4" y="0" width="6.8" height="14.5" rx="3.4" fill="' + L.shirt + '" class="o" transform="translate(42.2 51) rotate(-21)"/>' +
      '<rect x="-3.2" y="-14" width="6.4" height="14.5" rx="3.2" fill="' + L.shirt + '" class="o" transform="translate(47 64) rotate(-50)"/>';
  };
  let s = '<rect x="22.5" y="76" width="8.6" height="23" rx="3.2" fill="' + legs + '" class="o"/><rect x="32.9" y="76" width="8.6" height="23" rx="3.2" fill="' + legs + '" class="o"/>' +
    '<ellipse cx="26" cy="100.3" rx="6.6" ry="3.2" fill="#2A2A2A" class="o"/><ellipse cx="38.4" cy="100.3" rx="6.6" ry="3.2" fill="#2A2A2A" class="o"/>' + hd.back +
    '<path d="M20.5 79 L21 53 C21 47 25.5 44.5 32 44.5 C38.5 44.5 43 47 43 53 L43.5 79Z" fill="' + L.shirt + '" class="o"/><path d="M27 44.8 L32 50 L37 44.8" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.6" stroke-linejoin="round"/>' +
    (L.tie ? '<path d="M30.5 45.1 H33.5 L33 47.6 H31 Z M31 47.6 L30 56.5 L32 59 L34 56.5 L33 47.6 Z" fill="' + L.tie + '"/>' : '');
  s += arm('l', false) + arm('r', pose === 'hold');
  if (pose === 'hold') s += MUG(33.4, 46.4, 1) + '<circle cx="37.6" cy="57.4" r="3" fill="' + sk + '" class="o"/>';
  return s + hd.front;
}
const figureSVG = (id, pose, h) => '<svg viewBox="8 4 48 102" aria-hidden="true">' + figureInner(id, pose) + '</svg>';

/* ---------------- a story scene: de-s1, "Ein Kaffee, bitte" (Lena behind the counter, Jonas ordering) ---------------- */
function cafeScene(){
  const fig = (id, pose, x, feet, s) => '<g transform="translate(' + f1(x - 32 * s) + ' ' + f1(feet - 101 * s) + ') scale(' + s + ')">' + figureInner(id, pose) + '</g>';
  return '<svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<rect class="pk-wall" width="320" height="140"/><rect class="pk-floor" y="106" width="320" height="34"/>' +
    '<rect class="pk-brown" x="14" y="14" width="88" height="66" rx="7"/><rect class="pk-sky" x="20" y="20" width="76" height="54" rx="3"/><circle class="pk-yellow" cx="80" cy="36" r="8"/>' +
    '<path class="pk-green" d="M20 74 V58 C30 50 42 54 50 60 C60 52 74 54 96 62 V74Z"/><path class="pk-line" d="M58 20 V74 M20 47 H96"/>' +
    '<rect class="pk-ink" x="110" y="12" width="62" height="32" rx="4"/><path class="pk-linew" d="M118 22 H144 M118 30 H160 M118 38 H136"/>' +
    '<path class="pk-line" d="M196 0 V26 M282 0 V32"/><path class="pk-yellow" d="M182 40 a14 14 0 0 1 28 0Z"/><path class="pk-yellow" d="M268 46 a14 14 0 0 1 28 0Z"/>' +
    '<ellipse class="pk-glow" cx="196" cy="48" rx="26" ry="9"/><ellipse class="pk-glow" cx="282" cy="54" rx="26" ry="9"/>' +
    '<rect class="pk-brown" x="124" y="62" width="76" height="5" rx="2"/><rect class="pk-paper" x="132" y="53" width="10" height="9" rx="2"/><rect class="pk-red" x="148" y="53" width="10" height="9" rx="2"/><rect class="pk-teal" x="164" y="53" width="10" height="9" rx="2"/><rect class="pk-paper" x="180" y="53" width="10" height="9" rx="2"/>' +
    fig('lena', 'hold', 226, 121, .98) +
    '<rect class="pk-brown" x="108" y="100" width="212" height="40"/><path class="pk-line" d="M142 100 V140 M176 100 V140 M210 100 V140 M244 100 V140 M278 100 V140 M312 100 V140"/>' +
    '<rect class="pk-tan" x="102" y="92" width="224" height="11" rx="3"/>' +
    '<rect class="pk-grey" x="268" y="64" width="42" height="28" rx="4"/><rect class="pk-red" x="272" y="55" width="34" height="11" rx="3"/><rect class="pk-ink" x="280" y="78" width="4" height="7"/><rect class="pk-ink" x="294" y="78" width="4" height="7"/><rect class="pk-paper" x="278" y="86" width="8" height="6" rx="2"/><rect class="pk-paper" x="292" y="86" width="8" height="6" rx="2"/>' +
    '<rect class="pk-grey" x="146" y="89.5" width="54" height="3" rx="1.5"/><path class="pk-sky" opacity=".55" d="M150 90 a23 21 0 0 1 46 0Z"/><ellipse class="pk-tan" cx="165" cy="85" rx="8" ry="4.6"/><ellipse class="pk-tan" cx="181" cy="85" rx="8" ry="4.6"/>' +
    fig('jonas', 'stand', 66, 137, 1.02) + '</svg>';
}

/* ---------------- the page ---------------- */
const DIRS = [
  { id: 'flat', name: 'Flat', line: 'Shapes and color, no lines.', rules: ['No outlines. Two to four fills from the Selva palette and one soft shade shape for depth.', 'Small details are ink at 60%.', 'This is how the story scenes are drawn today, so it is the quietest change.'] },
  { id: 'ink', name: 'Ink and spot', line: 'Line drawings with a splash of color.', rules: ['A 2.3 unit ink outline with round caps and joins on every shape.', 'Paper fill, with one or two spot colors that carry the meaning.', 'Ink and paper swap in dark mode, like the unit signs and the medals.'] },
  { id: 'sticker', name: 'Sticker', line: 'Cut-out stickers.', rules: ['Full Selva fills with an ink outline, the way Pip and the chest are drawn.', 'A white sticker border and a soft shadow, added by one CSS rule so every picture gets them the same way.', 'The boldest and most playful; the busiest on a small screen.'] }
];
const cls = d => 's-' + d.id;
const picEl = (w, d, size) => h('span', { class: 'pic ' + cls(d), style: '--pic:' + size + 'px', role: 'img', 'aria-label': w.en, html: '<svg viewBox="0 0 64 64" aria-hidden="true">' + w.svg + '</svg>' });
const blk = (title, note, ...kids) => h('section', { class: 'blk', 'data-comment-target': '' },
  h('div', { class: 'blk-head' }, h('h2', null, title), h('button', { class: 'cbtn', type: 'button', 'data-comment': '' }, 'Comment')), note ? h('p', { class: 'note' }, note) : null, ...kids);
const state = { dir: DIRS[2].id };
const cur = () => DIRS.find(d => d.id === state.dir);

function wordsBlock(){
  const grid = h('div', { class: 'wgrid' }, WORDS.map(w => h('div', { class: 'b-wrow' },
    h('div', { class: 'wl' }, h('span', null, w.en), h('small', null, w.level + ' · ' + w.de)),
    h('div', { class: 'trio' }, DIRS.map(d => picEl(w, d, 112))))));
  const small = h('div', { class: 'small-rows' }, DIRS.map(d => h('div', { class: 'szrow' }, h('b', null, d.name), WORDS.map(w => picEl(w, d, 44)))));
  return blk('The words', 'The same sixteen drawings painted three ways: flat, ink and spot, and sticker. Nouns, verbs, an adjective pair, a color, one B2 word and one C1 idiom.',
    h('div', { class: 'cols' }, DIRS.map(d => h('span', null, d.name))), grid,
    h('h3', { style: 'font:var(--type-title-s);margin:6px 0 0' }, 'At 44 px, as on the new-word card'), small);
}
function lessonBlock(d){
  const W = id => WORDS.find(w => w.id === id);
  const row = (art, noun, g, en, w) => h('div', { class: 'wl-row has-pic' }, picEl(w, d, 44),
    h('div', { class: 't' }, h('span', { class: 'noun g-' + g }, h('span', { class: 'art' }, art), ' ' + noun)), h('div', { class: 'e' }, en),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Play audio', html: IC.speaker }));
  const card = h('div', { class: 'phone' }, h('div', { class: 'ex teach' }, h('span', { class: 'eyebrow' }, 'New words'),
    h('div', { class: 'wordlist teach-words' }, row('das', 'Brot', 'n', 'bread', W('bread')), row('der', 'Apfel', 'm', 'apple', W('apple')), row('der', 'Kaffee', 'm', 'coffee', W('coffee'))),
    h('p', { class: 'hint' }, 'Tap a word to hear it.')), h('div', { class: 'mock-foot' }, h('button', { class: 'btn btn-primary btn-wide', type: 'button' }, 'Continue')));
  const opts = ['dog', 'bread', 'apple', 'coffee'].map(id => W(id));
  const q = h('div', { class: 'phone' }, h('div', { class: 'ex' }, h('div', { class: 'q-label' }, 'Tap the picture'),
    h('div', { class: 'prompt-row' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Play audio', html: IC.speaker }), h('div', { class: 'prompt' }, h('span', { class: 'noun g-m' }, h('span', { class: 'art' }, 'der'), ' Hund'))),
    h('div', { class: 'opts pics' }, opts.map(w => { const b = h('button', { class: 'opt', type: 'button', 'aria-label': w.en }, picEl(w, d, 104));
      b.addEventListener('click', () => { q.querySelectorAll('.opt').forEach(x => x.classList.remove('m-hit', 'm-bad')); b.classList.add(w.id === 'dog' ? 'm-hit' : 'm-bad'); });
      return b; }))), h('p', { class: 'note', style: 'font-size:14px' }, 'Tap any picture to try it.'));
  return blk('In a lesson', 'The new-word card and the A1 picture question, with the app’s real styles. A1 and A2 lessons would ask this question a couple of times; B levels pick the word for a picture; C levels type it.',
    h('div', { class: 'pair' }, card, q));
}
function castBlock(d){
  const fig = (id, pose, hgt) => h('figure', null, h('span', { class: 'fig ' + cls(d), style: '--fh:' + hgt + 'px', html: figureSVG(id, pose) }), CAST[id].name + (pose === 'hold' ? ' + cup' : ''));
  const port = (id, styled) => h('figure', null, styled ? h('span', { class: 'portrait ' + cls(d), style: '--pw:84px', html: bustSVG(id) }) : avatar(id, 84), styled ? 'In this style' : 'Today');
  return blk('The cast', 'Full-length figures use the same heads as the portraits, so the cast keeps its faces. Outlines here follow the silhouette plus the main shapes; the final drawing would trace every shape.',
    h('div', { class: 'fig-row' }, fig('lena', 'stand', 150), fig('lena', 'hold', 150), fig('jonas', 'stand', 150), fig('jonas', 'hold', 150)),
    h('div', { class: 'fig-row' }, port('lena', false), port('lena', true), port('jonas', false), port('jonas', true)));
}
function sceneBlock(d){
  const sc = c => h('div', { class: 'sc ' + c + ' ' + cls(d), html: cafeScene() });
  return blk('A story scene', 'Ein Kaffee, bitte (A1): Lena behind the counter, Jonas ordering. Shown at the size of a story card and at the size of the story header. Today this story shares a people-free café backdrop with two others.',
    h('div', { class: 'scenes' }, sc('b-card'), sc('big')));
}
function rulesCard(d){
  return h('div', { class: 'rule' }, h('b', null, d.name), h('p', null, d.line), h('ul', null, d.rules.map(r => h('li', null, r))));
}
function render(){
  const d = cur(), dyn = document.getElementById('dyn'); if (!dyn) return;
  document.querySelectorAll('.b-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === d.id)));
  document.getElementById('rules').replaceChildren(rulesCard(d));
  dyn.replaceChildren(lessonBlock(d), castBlock(d), sceneBlock(d));
}
function boot(){
  const main = document.getElementById('main');
  const seg = h('div', { class: 'b-seg', role: 'group', 'aria-label': 'Style' }, DIRS.map(d => h('button', { type: 'button', 'data-dir': d.id, onclick: () => { state.dir = d.id; render(); } }, d.name)));
  main.append(h('div', { style: 'display:flex;flex-direction:column;gap:28px' }, wordsBlock(),
    h('div', { class: 'sticky' }, h('h2', { style: 'font:var(--type-h2);margin:0' }, 'One style, in use'), seg, h('div', { id: 'rules' })),
    h('div', { id: 'dyn', style: 'display:flex;flex-direction:column;gap:28px' }),
    h('section', { class: 'ask' }, h('h2', null, 'What I need from you'), h('ol', null,
      h('li', null, 'Which direction: Flat, Ink and spot, or Sticker?'),
      h('li', null, 'Any change to the palette or the line weight?'),
      h('li', null, 'Should the cast portraits change to match? I would say yes, so the scenes and the story bubbles agree.'),
      h('li', null, 'Should the story header stay 320 by 140?')))));
  render();
  const themes = [null, 'light', 'dark']; let ti = 0;
  document.getElementById('theme').addEventListener('click', e => { ti = (ti + 1) % 3; const t = themes[ti]; if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; e.target.textContent = 'Theme: ' + (t || 'system'); });
  /* comments: each block can open the viewer's comment box on itself */
  let comments = null; document.body.dataset.comments = 'off';
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-comment]'); if (!b || !comments) return;
    try { await comments.openComposer({ element: b.closest('[data-comment-target]') || b.parentElement }); }
    catch (err) { if (err && ['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(err.code)) document.body.dataset.comments = 'off'; }
  });
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('comments').then(c => { comments = c; if (c) document.body.dataset.comments = 'on'; }, () => {});
}
boot();
