"use strict";
/* ===================== ART: Pip, cast portraits, unit signs, story scenes ===================== */
/* Pip is a parrot: a chatty travel buddy who repeats after you. Body and head take the current
   line color (petrol in German, saffron in Spanish); crest and tail stay warm red and gold.
   Moods: happy, cheer, think, oops, sleep, wow. Classes on .pip drive the motion (art.css). */
const PIP_FACE = {
  happy: { eyes: '<ellipse cx="50" cy="42.5" rx="4.6" ry="5.4"/><ellipse cx="70" cy="42.5" rx="4.6" ry="5.4"/><circle class="p-glint" cx="51.7" cy="40.3" r="1.6"/><circle class="p-glint" cx="71.7" cy="40.3" r="1.6"/>', beak: 'closed' },
  cheer: { eyes: '<path class="p-line" d="M44 44.5 Q49.5 37 55 44.5"/><path class="p-line" d="M65 44.5 Q70.5 37 76 44.5"/>', beak: 'open' },
  think: { eyes: '<ellipse cx="52" cy="40" rx="4.2" ry="5"/><ellipse cx="73" cy="40" rx="4.2" ry="5"/><circle class="p-glint" cx="53.4" cy="38" r="1.4"/><circle class="p-glint" cx="74.4" cy="38" r="1.4"/><path class="p-line thin" d="M66 29.5 Q71 26.5 76.5 29.5"/>', beak: 'closed' },
  oops: { eyes: '<ellipse cx="49.5" cy="44" rx="4" ry="4.8"/><ellipse cx="70.5" cy="44" rx="4" ry="4.8"/><path class="p-line thin" d="M42 33 L54 36.5"/><path class="p-line thin" d="M78 33 L66 36.5"/>', beak: 'small' },
  sleep: { eyes: '<path class="p-line" d="M44 43 Q49.5 48 55 43"/><path class="p-line" d="M65 43 Q70.5 48 76 43"/>', beak: 'closed' },
  wow: { eyes: '<circle cx="49" cy="42" r="6.4"/><circle cx="71" cy="42" r="6.4"/><circle class="p-glint" cx="51.3" cy="39.6" r="2.1"/><circle class="p-glint" cx="73.3" cy="39.6" r="2.1"/>', beak: 'open' }
};
const PIP_BEAK = {
  closed: '<path class="p-beak" d="M60 45 C54 45 51.5 49 52.5 53 C53.5 57 57 60 60 63.5 C63 60 66.5 57 67.5 53 C68.5 49 66 45 60 45 Z"/><path class="p-beak-hi" d="M55.6 49.4 C57 47.8 58.7 47.3 60.4 47.4"/>',
  small: '<path class="p-mouth" d="M55.5 57.5 Q60 64 64.5 57.5 Q60 59.5 55.5 57.5 Z"/><path class="p-beak" d="M60 44.5 C54 44.5 51.5 48.5 52.5 52.5 C53.5 56 57 58.5 60 61 C63 58.5 66.5 56 67.5 52.5 C68.5 48.5 66 44.5 60 44.5 Z"/><path class="p-beak-hi" d="M55.6 49 C57 47.4 58.7 46.9 60.4 47"/>',
  open: '<path class="p-mouth" d="M53.5 55 Q60 72 66.5 55 Q60 58.5 53.5 55 Z"/><ellipse class="p-tongue" cx="60" cy="62.5" rx="3.2" ry="2.2"/><path class="p-beak" d="M60 43 C54 43 51.5 47 52.5 51 C53.2 53.8 56.5 56.2 60 58.5 C63.5 56.2 66.8 53.8 67.5 51 C68.5 47 66 43 60 43 Z"/><path class="p-beak-hi" d="M55.6 47.4 C57 45.8 58.7 45.3 60.4 45.4"/>'
};
function pipSVG(mood){
  const f = PIP_FACE[mood] || PIP_FACE.happy;
  return '<svg class="pip-svg" viewBox="0 0 120 114" aria-hidden="true">' +
    '<ellipse class="p-shadow" cx="60" cy="109" rx="26" ry="4"/>' +
    '<g class="p-bob">' +
      '<path class="p-tail a" d="M64 89 C70 99 74 106 82 112 C78 113.5 73 112.5 70 110.5 C66 104 62 98 59 91 Z"/>' +
      '<path class="p-tail b" d="M57 90 C58 99 59 106 63 112.5 C59 113.5 55 112.5 53 110.5 C52 104 52 98 53 91 Z"/>' +
      '<g class="p-crest"><path class="c1" d="M51 23 C43 17 43 9 49 7 C48 12 50 17 54 20 Z"/><path class="c2" d="M60 18.5 C61 8 67 3 74 6 C69 8 66 13 64 19.5 Z"/><path class="c3" d="M55 20.5 C49 10 52 2.5 59 3 C56 8 57 13 60 18.5 Z"/></g>' +
      '<ellipse class="p-body" cx="60" cy="70" rx="25" ry="28"/>' +
      '<ellipse class="p-belly" cx="60" cy="79" rx="15" ry="17"/>' +
      '<path class="p-feet" d="M52.5 96 V101.5 M48.5 102.5 Q52.5 100.5 56.5 102.5 M67.5 96 V101.5 M63.5 102.5 Q67.5 100.5 71.5 102.5"/>' +
      '<g class="p-wing l" style="transform-origin:43px 58px"><path d="M41 56 C28 62 24.5 80 31 95 C35 96.5 40 90.5 43 82.5 C45.2 74.5 45.5 64 44.5 58 Z"/><path class="p-feather" d="M33.5 88.5 L38.5 84.5 M31.5 81.5 L37.5 78 M32 74 L38.5 71.5"/></g>' +
      '<g class="p-wing r" style="transform-origin:77px 58px"><path d="M79 56 C92 62 95.5 80 89 95 C85 96.5 80 90.5 77 82.5 C74.8 74.5 74.5 64 75.5 58 Z"/><path class="p-feather" d="M86.5 88.5 L81.5 84.5 M88.5 81.5 L82.5 78 M88 74 L81.5 71.5"/></g>' +
      '<circle class="p-head" cx="60" cy="42" r="24"/>' +
      '<ellipse class="p-face" cx="49" cy="42" rx="10.5" ry="11"/><ellipse class="p-face" cx="71" cy="42" rx="10.5" ry="11"/>' +
      '<g class="p-eyes">' + f.eyes + '</g>' +
      '<circle class="p-cheek" cx="41" cy="54" r="3.6"/><circle class="p-cheek" cx="79" cy="54" r="3.6"/>' +
      '<g class="p-beakg">' + PIP_BEAK[f.beak] + '</g>' +
      '<g class="p-spark"><path d="M92 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z"/><path d="M28 14 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1z"/><path d="M99 30 l.8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8 2 -.8z"/></g>' +
    '</g>' +
    '<g class="p-z"><text x="88" y="26">z</text><text x="98" y="14">z</text></g>' +
    '</svg>';
}
const PIP_SAYS = {
  de: { cheer: ['Super!', 'Toll gemacht!', 'Wunderbar!', 'Klasse!', 'Sehr gut!', 'Weiter so!'], oops: ['Fast!', 'Kein Problem!', 'Gleich klappt’s!', 'Nochmal!'], hello: ['Hallo!', 'Los geht’s!', 'Alles einsteigen!', 'Bereit?', 'Gute Fahrt!'], sleep: ['Gute Nacht!'] },
  es: { cheer: ['¡Genial!', '¡Muy bien!', '¡Excelente!', '¡Increíble!', '¡Así se hace!', '¡Bravo!'], oops: ['¡Casi!', '¡No pasa nada!', '¡Ya casi!', '¡Otra vez!'], hello: ['¡Hola!', '¡Vámonos!', '¡Todos a bordo!', '¿Listos?', '¡Buen viaje!'], sleep: ['¡Buenas noches!'] }
};
function pickSay(lang, kind){ const l = PIP_SAYS[lang] || PIP_SAYS.de; const a = l[kind] || l.hello; return a[Math.floor(Math.random() * a.length)]; }
/* pip(mood, size, {say, lang, tap}) -> element. Tapping Pip makes it hop and say something in the target language. */
function pip(mood, size, opts = {}){
  const el = h('span', { class: 'pip ' + (mood || 'happy') + (opts.cls ? ' ' + opts.cls : ''), style: '--pip:' + (size || 72) + 'px', 'aria-hidden': opts.say ? null : 'true' });
  el.innerHTML = pipSVG(mood);
  if (opts.say){ el.append(h('span', { class: 'pip-say' + (opts.sayPos ? ' ' + opts.sayPos : ''), role: 'note' }, opts.say)); }
  if (opts.tap !== false){
    el.addEventListener('click', e => {
      e.stopPropagation();
      const lang = opts.lang || (typeof S !== 'undefined' ? S.settings.lang : 'de');
      const line = pickSay(lang, mood === 'oops' ? 'oops' : mood === 'cheer' ? 'cheer' : 'hello');
      el.classList.remove('hop'); void el.getBoundingClientRect(); el.classList.add('hop');
      const b = el.querySelector('.pip-say') || h('span', { class: 'pip-say' + (opts.sayPos ? ' ' + opts.sayPos : '') });
      b.textContent = line; if (!b.parentNode) el.append(b);
      b.classList.remove('pop'); void b.getBoundingClientRect(); b.classList.add('pop');
      sfx('chirp'); setTimeout(() => speak(line, lang, false, CAST.pip), 180); haptic(8);
    });
  }
  return el;
}
function setPipMood(el, mood){ if (!el) return; el.classList.remove('happy', 'cheer', 'think', 'oops', 'sleep', 'wow'); el.classList.add(mood); const say = el.querySelector('.pip-say'); el.innerHTML = pipSVG(mood); if (say) el.append(say); }

/* ----- cast portraits ----- */
const HAIR = {
  bob: { back: '<path d="M19 30 C17 16 25 11 32 11 C39 11 47 16 45 30 L46 41 C42 43 38 42 37 39.5 L27 39.5 C26 42 22 43 18 41 Z"/>',
    front: '<path d="M20.5 25.5 C21 16 28 13.5 33 14 C39 14 44 18 43.5 25.5 C38 20.5 33 20 27 22.5 C25 23.5 22.5 24.5 20.5 25.5Z"/>' },
  messy: { back: '', front: '<path d="M20 27.5 C18 17 25 12.5 31 13 C33 10.5 39 10.5 42 13.5 C46.5 16 45.5 22 44 26.5 C42 22.5 40 21.5 38 19 C36 22.5 31 22.5 29 19.5 C27 22.5 23 23.5 20 27.5Z"/>' },
  silver: { back: '<circle cx="22" cy="21" r="4.4"/><circle cx="26.5" cy="16" r="4.8"/><circle cx="32.5" cy="14.2" r="5"/><circle cx="38.5" cy="16" r="4.8"/><circle cx="43" cy="21" r="4.4"/>',
    front: '<path d="M20.5 27 C20 19 26 16 32 16 C38 16 44 19 43.5 27 C41 22.5 36 21 32 21 C28 21 23 22.5 20.5 27Z"/>' },
  short: { back: '', front: '<path d="M20.5 26.5 C20 16 26 12.5 32 12.5 C39 12.5 44 16 43.5 26.5 C41 21 37 19.5 32 19.5 C27 19.5 23 21 20.5 26.5Z"/>' },
  long: { back: '<path d="M18 28 C17 15 25 11 32 11 C40 11 47 15 46 28 L47.5 53 C43 56 21 56 16.5 53 Z"/>',
    front: '<path d="M20.5 27.5 C21 17 27 13 33 13 C39 13 44 17 43.5 27.5 C41.5 21 38.5 17.5 33.5 17 C30 20 25.5 23 20.5 27.5Z"/>' },
  curly: { back: '<circle cx="21" cy="23" r="5"/><circle cx="24.5" cy="16.5" r="5.5"/><circle cx="32" cy="13.5" r="6"/><circle cx="39.5" cy="16.5" r="5.5"/><circle cx="43" cy="23" r="5"/>',
    front: '<path d="M21.5 26 C22 20.5 26 18.5 32 18.5 C38 18.5 42 20.5 42.5 26 C39.5 23.5 36 22.5 32 22.5 C28 22.5 24.5 23.5 21.5 26Z"/>' },
  bun: { back: '<circle cx="32" cy="10" r="6.2"/>', front: '<path d="M20.5 28 C20 17 26 13.5 32 13.5 C38 13.5 44 17 43.5 28 C42 22 38 19 32 19 C26 19 22 22 20.5 28Z"/>' },
  cap: { back: '<path d="M20.5 29 C20.5 25 21 23 22 22 L22 30 Z M43.5 29 C43.5 25 43 23 42 22 L42 30 Z"/>', front: '' }
};
function avatarSVG(id){
  const c = CAST[id]; if (!c || !c.look) return pipSVG('happy');
  const L = c.look, hs = HAIR[L.style] || HAIR.short;
  const fill = (s, col) => s ? '<g fill="' + col + '">' + s + '</g>' : '';
  let s = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="' + L.bg + '"/>';
  s += fill(hs.back, L.hair);
  s += '<rect x="28" y="35" width="8" height="10" rx="3" fill="' + L.skin + '"/><rect x="28" y="35" width="8" height="5" fill="#000" opacity=".08"/>';
  s += '<path d="M9 66 C10 52 21 44.5 32 44.5 C43 44.5 54 52 55 66 Z" fill="' + L.shirt + '"/><path d="M27 44.8 L32 50 L37 44.8" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.6" stroke-linejoin="round"/>';
  s += '<ellipse cx="32" cy="28" rx="11.5" ry="13" fill="' + L.skin + '"/>';
  s += fill(hs.front, L.hair);
  if (L.style === 'cap') s += '<path d="M19.5 24.5 C20 14 26 11.5 32 11.5 C38 11.5 44 14 44.5 24.5 Z" fill="#E4572E"/><path d="M40 23 C46 22.4 52 23.4 54.5 25.4 C50.5 27 45 26.6 40 26 Z" fill="#C2411D"/><circle cx="32" cy="12.4" r="1.3" fill="#C2411D"/>';
  if (L.beard) s += '<path d="M20.8 30 C21.3 40.5 26 44.5 32 44.5 C38 44.5 42.7 40.5 43.2 30 C41 35.5 37 38 32 38 C27 38 23 35.5 20.8 30Z" fill="' + L.hair + '"/>';
  s += '<circle cx="27.5" cy="29" r="1.7" fill="#1B1B1B"/><circle cx="36.5" cy="29" r="1.7" fill="#1B1B1B"/>';
  s += '<path d="M25 25.3 Q27.5 24 30 25.3 M34 25.3 Q36.5 24 39 25.3" fill="none" stroke="' + (L.style === 'silver' || L.style === 'bun' ? '#8D8D8D' : L.hair) + '" stroke-width="1.3" stroke-linecap="round"/>';
  s += '<path d="M28.6 34.2 Q32 37 35.4 34.2" fill="none" stroke="' + (L.beard ? '#F4E3D7' : '#7A3B2A') + '" stroke-width="1.5" stroke-linecap="round"/>';
  s += '<circle cx="24.5" cy="32.5" r="2" fill="#FF8A80" opacity=".28"/><circle cx="39.5" cy="32.5" r="2" fill="#FF8A80" opacity=".28"/>';
  if (L.freckles) s += '<g fill="#B5562B" opacity=".45"><circle cx="25.5" cy="31.6" r=".55"/><circle cx="27" cy="32.6" r=".55"/><circle cx="37" cy="32.6" r=".55"/><circle cx="38.5" cy="31.6" r=".55"/></g>';
  if (L.glasses) s += '<g fill="none" stroke="#2A2A2A" stroke-width="1.2"><circle cx="27.5" cy="29" r="3.8"/><circle cx="36.5" cy="29" r="3.8"/><path d="M31.3 29 H32.7"/></g>';
  if (L.earrings) s += '<circle cx="20.6" cy="33.5" r="1.5" fill="#E8B84A"/><circle cx="43.4" cy="33.5" r="1.5" fill="#E8B84A"/>';
  return s + '</svg>';
}
function avatar(id, size, cls){
  const el = h('span', { class: 'cast-av' + (id === 'pip' ? ' is-pip' : '') + (cls ? ' ' + cls : ''), style: '--av:' + (size || 40) + 'px', title: CAST[id] ? CAST[id].name : '' });
  el.innerHTML = id === 'pip' ? pipSVG('happy') : avatarSVG(id);
  return el;
}

/* ----- unit signs (24px line icons on a station roundel) ----- */
const UNIT_ART = {
  'Greetings & introductions': '<path d="M4 5h16v11h-9l-5 4v-4H4z"/><path d="M8.5 10.5h7M8.5 13h4"/>',
  'Numbers & time': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
  'Food & ordering': '<path d="M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.6a2.4 2.4 0 0 1 0 4.8H16M8.5 3.5c0 1 1 1.5 1 2.6M12.5 3.5c0 1 1 1.5 1 2.6"/>',
  'Family & descriptions': '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 20c.5-3.6 2.8-5.6 5.5-5.6s5 2 5.5 5.6M14.6 15.3c.7-.3 1.5-.5 2.4-.5 2.3 0 4 1.7 4.4 5"/>',
  'Daily routine': '<path d="M3 18.5h18M7 18.5a5 5 0 0 1 10 0M12 6v3M5.6 9.8l2 2M18.4 9.8l-2 2M2.5 14.5h2M19.5 14.5h2"/>',
  'Travel & directions': '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  'Telling stories': '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/>',
  'Health & feelings': '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M7.5 12.5h2.5l1.2-2 1.8 4 1.2-2h2.3"/>',
  'Work & opinions': '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6v1.9M3 13h18"/>',
  'News & society': '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-4 0M7 8.5h7M7 12h7M7 15.5h4"/>',
  'What if…': '<path d="M7.5 16a4 4 0 0 1-.4-8 5 5 0 0 1 9.6-1.2 4 4 0 0 1 .8 7.9 4 4 0 0 1-3.5 1.3z"/><circle cx="6.5" cy="19.5" r="1.1"/><circle cx="9.5" cy="18.2" r=".7"/>',
  'Making your case': '<path d="M12 4v16M7.5 20h9M5 7h14"/><path d="M5 7l-2.6 5.5a2.6 2.6 0 0 0 5.2 0zM19 7l-2.6 5.5a2.6 2.6 0 0 0 5.2 0z"/>',
  'Formal & professional': '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',
  'Idioms & nuance': '<path d="M4 5h16v11h-9l-5 4v-4H4z"/><path d="M12 7.6l.9 1.9 2.1.9-2.1.9-.9 1.9-.9-1.9-2.1-.9 2.1-.9z"/>',
  'Mastery': '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5a3 3 0 0 0 3 4M16 5.5h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M10 16.5h4V20h-4z"/>',
  'Colors, clothes & weather': '<path d="M3 12.5a9 9 0 0 1 18 0z"/><path d="M12 12.5v6a2 2 0 0 1-4 0M12 3v.6"/>',
  'Around town': '<path d="M3 20h18M5 20V9.5l5-3V20M10 20V4h9v16"/><path d="M13 8h3M13 11.5h3M13 15h3M7 12.5h1M7 15.5h1"/>',
  'Culture & free time': '<path d="M9 18V6.5l10-2.2V16"/><circle cx="6.6" cy="18" r="2.4"/><circle cx="16.6" cy="16" r="2.4"/><path d="M9 10l10-2.2"/>',
  'Life & society': '<path d="M4 11.5 12 5l8 6.5M6 10v10h12V10"/><path d="M12 17.6s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8z"/>'
};
function unitSign(title, size){
  const p = UNIT_ART[title] || UNIT_ART['Telling stories'];
  return h('span', { class: 'unit-sign', style: '--us:' + (size || 46) + 'px', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>' });
}

/* ----- story scenes (320 x 140) ----- */
const SCENES = {
  cafe: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-paper" x="26" y="20" width="96" height="62" rx="8"/><circle class="sc-warm" cx="96" cy="44" r="13"/><path class="sc-line" d="M74 20v62M26 51h96"/>' +
    '<path class="sc-ink" d="M190 0v26M250 0v34"/><path class="sc-warm" d="M176 26a14 14 0 0 1 28 0zM236 34a14 14 0 0 1 28 0z"/><ellipse class="sc-glow" cx="190" cy="30" rx="18" ry="6"/><ellipse class="sc-glow" cx="250" cy="38" rx="18" ry="6"/>' +
    '<rect class="sc-floor" y="96" width="320" height="44"/><rect class="sc-a" x="0" y="92" width="320" height="12"/>' +
    '<rect class="sc-ink" x="210" y="58" width="44" height="34" rx="5"/><rect class="sc-paper" x="216" y="64" width="32" height="10" rx="3"/><path class="sc-ink-s" d="M226 74v8M238 74v8"/>' +
    '<path class="sc-paper" d="M140 76h22v10a6 6 0 0 1-6 6h-10a6 6 0 0 1-6-6z"/><path class="sc-line" d="M162 79h3a3.5 3.5 0 0 1 0 7h-3"/>' +
    '<g class="steam"><path class="sc-steam" d="M146 70c-3-4 3-6 0-11"/><path class="sc-steam" d="M154 70c-3-4 3-6 0-11"/></g>' +
    '<path class="sc-red" d="M100 78h20v8a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z"/>',
  home: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-floor" y="112" width="320" height="28"/>' +
    '<rect class="sc-a" x="128" y="22" width="64" height="92" rx="6"/><rect class="sc-paper o3" x="136" y="30" width="48" height="34" rx="4"/><circle class="sc-warm" cx="180" cy="74" r="4"/><rect class="sc-red" x="122" y="112" width="76" height="8" rx="3"/>' +
    '<rect class="sc-paper" x="40" y="34" width="54" height="40" rx="4"/><path class="sc-sage" d="M46 68l14-16 10 10 8-6 12 12z"/><circle class="sc-warm" cx="82" cy="46" r="5"/>' +
    '<path class="sc-warm" d="M236 88h34l-5 26h-24z"/><path class="sc-sage" d="M253 88c-14-6-18-24-8-32 4 10 8 14 8 32zM253 88c12-4 18-20 10-30-4 10-10 14-10 30zM253 88c-2-14 2-26 0-40"/>' +
    '<rect class="sc-paper" x="226" y="30" width="60" height="30" rx="15"/><text class="sc-text" x="256" y="50" text-anchor="middle">{HELLO}</text>',
  rain: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-floor" y="110" width="320" height="30"/>' +
    '<g class="sc-cloud"><circle cx="70" cy="40" r="20"/><circle cx="98" cy="32" r="24"/><circle cx="128" cy="42" r="18"/><rect x="56" y="40" width="88" height="20" rx="10"/></g>' +
    '<g class="sc-cloud o7"><circle cx="220" cy="30" r="16"/><circle cx="244" cy="24" r="20"/><circle cx="268" cy="32" r="15"/><rect x="208" y="30" width="72" height="16" rx="8"/></g>' +
    '<g class="rain"><path d="M70 70l-4 10M92 74l-4 10M114 68l-4 10M80 92l-4 10M104 94l-4 10M230 56l-4 10M252 60l-4 10M268 52l-4 10M240 82l-4 10M262 86l-4 10"/></g>' +
    '<circle class="sc-sage" cx="40" cy="92" r="20"/><rect class="sc-ink" x="38" y="96" width="4" height="16"/>' +
    '<path class="sc-warm" d="M150 84a26 26 0 0 1 52 0z"/><path class="sc-line" d="M176 84v22a4 4 0 0 1-8 0"/>',
  shop: '<rect class="sc-night" width="320" height="140"/><circle class="sc-moon" cx="282" cy="26" r="10"/><rect class="sc-floor" y="110" width="320" height="30"/>' +
    '<g><rect class="sc-red" x="20" y="16" width="34" height="18"/><rect class="sc-paper" x="54" y="16" width="34" height="18"/><rect class="sc-red" x="88" y="16" width="34" height="18"/><rect class="sc-paper" x="122" y="16" width="34" height="18"/><rect class="sc-red" x="156" y="16" width="34" height="18"/><rect class="sc-paper" x="190" y="16" width="34" height="18"/></g>' +
    '<rect class="sc-glowbox" x="24" y="38" width="196" height="72"/><path class="sc-line" d="M24 62h196M24 86h196"/>' +
    '<g class="sc-jars"><rect class="sc-a" x="34" y="44" width="14" height="18" rx="3"/><rect class="sc-warm" x="54" y="48" width="12" height="14" rx="3"/><rect class="sc-red" x="72" y="46" width="14" height="16" rx="3"/><rect class="sc-sage" x="94" y="44" width="16" height="18" rx="3"/><rect class="sc-a" x="118" y="48" width="12" height="14" rx="3"/><rect class="sc-warm" x="136" y="44" width="16" height="18" rx="3"/>' +
    '<rect class="sc-paper" x="40" y="70" width="18" height="16" rx="3"/><rect class="sc-sage" x="64" y="70" width="14" height="16" rx="3"/><rect class="sc-red" x="86" y="72" width="16" height="14" rx="3"/><rect class="sc-warm" x="110" y="70" width="14" height="16" rx="3"/><rect class="sc-a" x="160" y="68" width="20" height="18" rx="3"/></g>' +
    '<rect class="sc-paper" x="236" y="58" width="58" height="52" rx="5"/><rect class="sc-a" x="236" y="58" width="58" height="12" rx="5"/><path class="sc-line" d="M246 82h38M246 92h26"/>',
  night: '<rect class="sc-night" width="320" height="140"/><g class="stars"><circle cx="40" cy="20" r="1.6"/><circle cx="90" cy="34" r="1.2"/><circle cx="150" cy="16" r="1.8"/><circle cx="200" cy="30" r="1.2"/><circle cx="300" cy="44" r="1.5"/></g>' +
    '<path class="sc-moon" d="M264 18a16 16 0 1 0 14 24 13 13 0 1 1-14-24z"/><rect class="sc-floor dark" y="112" width="320" height="28"/>' +
    '<rect class="sc-house" x="110" y="34" width="110" height="78"/><rect class="sc-a" x="146" y="58" width="38" height="54" rx="4"/><circle class="sc-warm" cx="176" cy="88" r="3"/><rect class="sc-warmglow" x="122" y="46" width="18" height="18" rx="2"/><rect class="sc-paper o2" x="190" y="46" width="18" height="18" rx="2"/>' +
    '<path class="sc-line light" d="M54 112V52"/><path class="sc-warm" d="M44 52h20l-4-10h-12z"/><ellipse class="sc-glow" cx="54" cy="60" rx="26" ry="12"/>' +
    '<g class="sc-key"><circle cx="252" cy="96" r="7"/><path d="M259 96h20M272 96v6M277 96v4"/></g>',
  cinema: '<rect class="sc-night" width="320" height="140"/><rect class="sc-screen" x="40" y="14" width="240" height="66" rx="4"/><path class="sc-beam" d="M160 140L60 80h200z"/>' +
    '<g class="sc-seats"><rect x="20" y="96" width="44" height="22" rx="8"/><rect x="72" y="96" width="44" height="22" rx="8"/><rect x="124" y="96" width="44" height="22" rx="8"/><rect x="176" y="96" width="44" height="22" rx="8"/><rect x="228" y="96" width="44" height="22" rx="8"/></g>' +
    '<path class="sc-paper" d="M272 104l18 0-3 30h-12z"/><path class="sc-red" d="M276 104h3l-.6 30h-2.4zM283 104h3l-.6 30h-2.4z"/><g class="sc-popcorn"><circle cx="275" cy="102" r="4"/><circle cx="281" cy="99" r="4.5"/><circle cx="287" cy="102" r="4"/></g>',
  flat: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-floor" y="118" width="320" height="22"/>' +
    '<rect class="sc-house" x="70" y="12" width="150" height="106"/><g class="sc-wins"><rect x="84" y="24" width="26" height="22" rx="2"/><rect x="132" y="24" width="26" height="22" rx="2"/><rect x="180" y="24" width="26" height="22" rx="2"/><rect x="84" y="58" width="26" height="22" rx="2"/><rect x="180" y="58" width="26" height="22" rx="2"/></g><rect class="sc-warmglow" x="132" y="58" width="26" height="22" rx="2"/>' +
    '<rect class="sc-red" x="70" y="88" width="150" height="10"/><rect class="sc-glowbox" x="84" y="98" width="122" height="20"/>' +
    '<rect class="sc-paper" x="236" y="50" width="56" height="34" rx="4" transform="rotate(-6 264 67)"/><path class="sc-line" d="M246 62h34M246 72h22" transform="rotate(-6 264 67)"/><path class="sc-line" d="M264 50v-18"/>' +
    '<g class="sc-key"><circle cx="40" cy="98" r="7"/><path d="M47 98h20M60 98v6M65 98v4"/></g>',
  desk: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-a" x="0" y="96" width="320" height="10"/><rect class="sc-floor" y="106" width="320" height="34"/>' +
    '<g transform="rotate(-4 140 70)"><rect class="sc-paper" x="104" y="34" width="76" height="60" rx="3"/><path class="sc-line" d="M114 48h50M114 58h56M114 68h44M114 78h52"/></g><path class="sc-ink" d="M198 92l26-46 5 3-26 46-6 2z"/>' +
    '<path class="sc-line" d="M262 96V56l-18-18"/><path class="sc-warm" d="M232 30l24 0-8 16z" transform="rotate(-40 244 38)"/><ellipse class="sc-glow" cx="236" cy="66" rx="30" ry="14"/>' +
    '<g class="sc-radiator"><rect x="24" y="44" width="56" height="46" rx="4"/><path d="M36 48v38M48 48v38M60 48v38M72 48v38"/></g><path class="sc-snow" d="M52 22v16M45 26l14 8M59 26l-14 8"/>',
  market: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-floor" y="114" width="320" height="26"/>' +
    '<g><path class="sc-red" d="M10 10h50l-6 26h-38z"/><path class="sc-paper" d="M60 10h50l-6 26H54z"/><path class="sc-warm" d="M110 10h50l-6 26h-50z"/><path class="sc-paper" d="M160 10h50l-6 26h-50z"/><path class="sc-red" d="M210 10h50l-6 26h-50z"/><path class="sc-paper" d="M260 10h50l-6 26h-50z"/></g>' +
    '<rect class="sc-crate" x="30" y="78" width="80" height="36" rx="3"/><rect class="sc-crate" x="120" y="78" width="80" height="36" rx="3"/><rect class="sc-crate" x="210" y="78" width="80" height="36" rx="3"/>' +
    '<g class="sc-red"><circle cx="46" cy="74" r="9"/><circle cx="64" cy="72" r="9"/><circle cx="82" cy="74" r="9"/><circle cx="56" cy="64" r="8"/><circle cx="74" cy="63" r="8"/></g>' +
    '<g class="sc-avo"><ellipse cx="140" cy="72" rx="8" ry="10"/><ellipse cx="158" cy="70" rx="8" ry="10"/><ellipse cx="176" cy="72" rx="8" ry="10"/><ellipse cx="150" cy="60" rx="7" ry="9"/><ellipse cx="168" cy="60" rx="7" ry="9"/></g>' +
    '<g class="sc-warm"><circle cx="226" cy="74" r="9"/><circle cx="244" cy="72" r="9"/><circle cx="262" cy="74" r="9"/><circle cx="280" cy="72" r="8"/><circle cx="236" cy="62" r="8"/><circle cx="254" cy="61" r="8"/><circle cx="272" cy="62" r="8"/></g>' +
    '<path class="sc-sage" d="M88 50c4-8 12-10 16-6-6 2-10 6-16 6z"/>',
  concert: '<rect class="sc-night" width="320" height="140"/><g class="beams"><path class="sc-beam a" d="M60 0l-40 120h60z"/><path class="sc-beam b" d="M160 0l-30 120h60z"/><path class="sc-beam c" d="M260 0l-20 120h60z"/></g>' +
    '<rect class="sc-a" x="0" y="112" width="320" height="28"/><path class="sc-line light" d="M160 112V64"/><rect class="sc-paper" x="154" y="50" width="12" height="18" rx="6"/><path class="sc-line light" d="M146 112h28"/>' +
    '<g class="sc-crowd"><circle cx="30" cy="124" r="12"/><circle cx="64" cy="128" r="12"/><circle cx="98" cy="124" r="12"/><circle cx="222" cy="126" r="12"/><circle cx="256" cy="122" r="12"/><circle cx="290" cy="127" r="12"/></g>' +
    '<g class="notes"><path class="sc-warm" d="M210 50v-18l12-3v16"/><circle class="sc-warm" cx="207" cy="50" r="4"/><circle class="sc-warm" cx="219" cy="45" r="4"/><path class="sc-red" d="M100 40v-16"/><circle class="sc-red" cx="97" cy="40" r="4"/></g>',
  studio: '<rect class="sc-sky" width="320" height="140"/><rect class="sc-floor" y="112" width="320" height="28"/>' +
    '<rect class="sc-ink" x="196" y="42" width="66" height="40" rx="6"/><circle class="sc-paper" cx="214" cy="62" r="11"/><circle class="sc-a" cx="214" cy="62" r="6"/><rect class="sc-ink" x="262" y="54" width="14" height="16" rx="2"/><path class="sc-line" d="M228 82l-14 30M228 82v30M228 82l14 30"/>' +
    '<rect class="sc-ink" x="34" y="18" width="70" height="22" rx="11"/><circle class="sc-onair" cx="48" cy="29" r="5"/><path class="sc-line light" d="M60 29h34"/>' +
    '<rect class="sc-paper" x="96" y="70" width="64" height="42" rx="6"/><path class="sc-line" d="M108 84h40M108 94h28"/><path class="sc-ink" d="M126 70V52"/><rect class="sc-ink" x="120" y="40" width="12" height="16" rx="6"/>'
};
function sceneArt(kind, cls, lang){ const svg = (SCENES[kind] || SCENES.cafe).replace('{HELLO}', (LANGS[lang] || LANGS.de).hello); return h('div', { class: 'scene' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: '<svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice">' + svg + '</svg>' }); }

/* ----- chest + medals ----- */
function chestSVG(){
  return '<svg viewBox="0 0 80 72" aria-hidden="true"><ellipse class="ch-glow" cx="40" cy="34" rx="34" ry="22"/>' +
    '<g class="ch-coins"><circle cx="30" cy="30" r="5"/><circle cx="42" cy="26" r="5"/><circle cx="52" cy="31" r="5"/></g>' +
    '<rect class="ch-base" x="12" y="34" width="56" height="32" rx="5"/><rect class="ch-band" x="12" y="44" width="56" height="5"/><rect class="ch-band" x="36" y="34" width="8" height="32"/>' +
    '<g class="ch-lid"><path class="ch-base" d="M12 36v-8a12 12 0 0 1 12-12h32a12 12 0 0 1 12 12v8z"/><rect class="ch-band" x="36" y="16" width="8" height="20"/></g>' +
    '<rect class="ch-lock" x="35" y="40" width="10" height="11" rx="2.5"/></svg>';
}
const BADGE_ART = {
  flag: '<path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/>',
  flame: '<path d="M12.6 3c.6 3.2 4.6 5 4.6 9.6a5.2 5.2 0 0 1-10.4 0c0-2.3 1.1-3.8 2.3-4.7.1 1.9.8 3 2.1 3.4-.4-3.2.2-5.9 1.4-8.3z"/>',
  book: '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5v13"/>',
  chat: '<path d="M4 5h16v11h-9l-5 4v-4H4z"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  abc: '<path d="M3.5 17l3-9 3 9M4.6 14h3.8M12 8v9h3a2.3 2.3 0 0 0 0-4.6h-3M12 12.4h2.6a2.2 2.2 0 0 0 0-4.4H12M21 9a3.6 3.6 0 1 0 0 6.5"/>',
  stack: '<path d="M12 3 3 7.5l9 4.5 9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z"/>',
  chest: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M4 12V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3M10.5 13h3v3h-3z"/>',
  trophy: UNIT_ART['Mastery'],
  mountain: '<path d="M2.5 19.5 9 8l4 6 2.5-3.5 6 9z"/><path d="M7.4 10.8 9 12.5l1.6-1.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'
};
function medal(icon, earned, size){
  return h('span', { class: 'medal' + (earned ? ' on' : ''), style: '--md:' + (size || 64) + 'px', 'aria-hidden': 'true',
    html: '<svg viewBox="0 0 64 72"><path class="md-rib l" d="M20 44 12 70l10-5 6 7 6-24z"/><path class="md-rib r" d="M44 44l8 26-10-5-6 7-6-24z"/><circle class="md-ring" cx="32" cy="30" r="27"/><circle class="md-face" cx="32" cy="30" r="21"/>' +
      '<g transform="translate(20 18)" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="md-ic">' + (BADGE_ART[icon] || BADGE_ART.star) + '</g></svg>' });
}
