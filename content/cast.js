"use strict";
/* ===================== CAST =====================
   Recurring characters appear in stories and play the roles in Talk.
   Story items: [speaker, target line, English] or ['?', question, 'correct|wrong|wrong'].
   fig: the Recraft figure in media/cast/ that this character is (measured in content/cast-art.js); the three languages share the figures, so
        an Italian character can reuse another language's. Portraits are cropped from it by castFace() in js/core/art.js.
   look (the drawn portrait avatarSVG() in js/core/art.js falls back to when a character has no fig): skin, hair (the scarf color for 'hijab'), style (a key of HAIR),
   shirt, bg, and optionally brow, ribbon (braid ties), tie (a necktie color), glasses, beard, mustache, freckles, earrings.
   ========================================================== */
const CAST = {
  lena:   { name: 'Lena', lang: 'de', fig: 'lena', role: 'Runs a tiny café in Berlin', pitch: 1.12, rate: 1.0,
            look: { skin: '#F2C6A8', hair: '#B5562B', style: 'bob', shirt: '#2F7F86', bg: '#D7EBED', freckles: true } },
  jonas:  { name: 'Jonas', lang: 'de', fig: 'jonas', role: 'Student, night shifts at a hotel desk', pitch: 0.92, rate: 1.0,
            look: { skin: '#EBC2A0', hair: '#8A6A3C', style: 'messy', shirt: '#E0A53A', bg: '#FAEDCB', glasses: true } },
  weber:  { name: 'Frau Weber', lang: 'de', fig: 'weber', role: 'Retired doctor, lives next door', pitch: 1.02, rate: 0.9,
            look: { skin: '#F1D2BE', hair: '#C9CED3', style: 'silver', shirt: '#7847B3', bg: '#E9E0F5', glasses: true, earrings: true } },
  emre:   { name: 'Emre', lang: 'de', fig: 'emre', role: 'Owns the corner shop', pitch: 0.84, rate: 1.0,
            look: { skin: '#C98E64', hair: '#1E1B1A', style: 'short', shirt: '#C22E29', bg: '#F9E2DF', beard: true } },
  leyla:  { name: 'Leyla', lang: 'de', fig: 'leyla', role: 'Pharmacist, Emre’s cousin', pitch: 1.08, rate: 1.0,
            look: { skin: '#D6A07A', hair: '#B83A68', brow: '#2B1D18', style: 'hijab', shirt: '#F7F5EF', bg: '#FBE3EA' } },
  brandt: { name: 'Herr Brandt', lang: 'de', fig: 'brandt', role: 'Lena’s landlord, strict but fair', pitch: 0.8, rate: 0.92,
            look: { skin: '#F0C9AE', hair: '#9A9087', style: 'bald', shirt: '#3D5A80', bg: '#E1EAF2', glasses: true, tie: '#E9A23B' } },
  sofia:  { name: 'Sofía', lang: 'es', fig: 'sofia', role: 'Doctor in Mexico City', pitch: 1.12, rate: 1.0,
            look: { skin: '#D9A27A', hair: '#2B1D18', style: 'long', shirt: '#1A8448', bg: '#DBF0E4', earrings: true } },
  diego:  { name: 'Diego', lang: 'es', fig: 'diego', role: 'Chef, Sofía’s brother', pitch: 0.88, rate: 1.0,
            look: { skin: '#C68A5E', hair: '#3A2A20', style: 'curly', shirt: '#F4F1EA', bg: '#FAEDCB', beard: true } },
  carmen: { name: 'Doña Carmen', lang: 'es', fig: 'carmen', role: 'Their grandmother, sells fruit at the market', pitch: 1.04, rate: 0.88,
            look: { skin: '#B97E58', hair: '#BDBDBD', style: 'bun', shirt: '#C22E29', bg: '#F9E2DF', earrings: true } },
  mateo:  { name: 'Mateo', lang: 'es', fig: 'mateo', role: 'Musician, makes the coffee', pitch: 0.96, rate: 1.0,
            look: { skin: '#A86B48', hair: '#1E1B1A', style: 'cap', shirt: '#2360C6', bg: '#DCE6F7' } },
  valentina: { name: 'Valentina', lang: 'es', fig: 'valentina', role: 'Taxi driver who knows every street', pitch: 1.06, rate: 1.04,
            look: { skin: '#8A5A3C', hair: '#1E1B1A', style: 'braids', ribbon: '#FFD23F', shirt: '#00737D', bg: '#D6F0EC', earrings: true } },
  andres: { name: 'Andrés', lang: 'es', fig: 'andres', role: 'Runs a family hotel downtown', pitch: 0.9, rate: 0.96,
            look: { skin: '#B07A52', hair: '#2B1D18', style: 'side', shirt: '#8E3B46', bg: '#F6E1E4', mustache: true } },
  giulia: { name: 'Giulia', lang: 'it', fig: 'giulia', role: 'Runs a tiny café-bar in Rome', pitch: 1.1, rate: 1.0,
            look: { skin: '#EBC09A', hair: '#4A2C20', style: 'long', shirt: '#E0A53A', bg: '#FAEDCB', earrings: true } },
  luca:   { name: 'Luca', lang: 'it', fig: 'luca', role: 'Student, delivers by scooter at night', pitch: 0.94, rate: 1.0,
            look: { skin: '#E3B48E', hair: '#2B1D18', style: 'messy', shirt: '#3D7D4F', bg: '#E1F0E5', freckles: true } },
  nonna:  { name: 'Nonna Rosa', lang: 'it', fig: 'weber', role: 'Retired teacher, everyone’s nonna', pitch: 1.02, rate: 0.9,
            look: { skin: '#EBC9AE', hair: '#D4D4D4', style: 'bun', shirt: '#7847B3', bg: '#E9E0F5', glasses: true, earrings: true } },
  marco:  { name: 'Marco', lang: 'it', fig: 'diego', role: 'Runs the deli and a market stall', pitch: 0.86, rate: 1.0,
            look: { skin: '#D9A27A', hair: '#3A2A20', style: 'short', shirt: '#F4F1EA', bg: '#FDEBD2', mustache: true } },
  conti:  { name: 'Dottoressa Conti', lang: 'it', fig: 'sofia', role: 'Doctor, lives upstairs', pitch: 1.06, rate: 0.96,
            look: { skin: '#F0C9AE', hair: '#5A3A2A', style: 'bob', shirt: '#4A7FB5', bg: '#E1ECF6', glasses: true } },
  bianchi: { name: 'Signor Bianchi', lang: 'it', fig: 'andres', role: 'Runs a family pensione near the station', pitch: 0.82, rate: 0.94,
            look: { skin: '#E9BE9C', hair: '#C4C4C4', style: 'side', shirt: '#5B4A7A', bg: '#E8E3F0', mustache: true, tie: '#E9A23B' } },
  pip:    { name: 'Pip', lang: '*', role: 'Your parrot and travel buddy', pitch: 1.35, rate: 1.0 }
};
