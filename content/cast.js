"use strict";
/* ===================== CAST =====================
   Recurring characters appear in stories and play the roles in Talk.
   Story items: [speaker, target line, English] or ['?', question, 'correct|wrong|wrong'].
   ========================================================== */
const CAST = {
  lena:   { name: 'Lena', lang: 'de', role: 'Runs a tiny café in Berlin', pitch: 1.12, rate: 1.0,
            look: { skin: '#F2C6A8', hair: '#B5562B', style: 'bob', shirt: '#2F7F86', bg: '#D7EBED', freckles: true } },
  jonas:  { name: 'Jonas', lang: 'de', role: 'Student, night shifts at a hotel desk', pitch: 0.92, rate: 1.0,
            look: { skin: '#EBC2A0', hair: '#8A6A3C', style: 'messy', shirt: '#E0A53A', bg: '#FAEDCB', glasses: true } },
  weber:  { name: 'Frau Weber', lang: 'de', role: 'Retired doctor, lives next door', pitch: 1.02, rate: 0.9,
            look: { skin: '#F1D2BE', hair: '#C9CED3', style: 'silver', shirt: '#7847B3', bg: '#E9E0F5', glasses: true, earrings: true } },
  emre:   { name: 'Emre', lang: 'de', role: 'Owns the corner shop', pitch: 0.84, rate: 1.0,
            look: { skin: '#C98E64', hair: '#1E1B1A', style: 'short', shirt: '#C22E29', bg: '#F9E2DF', beard: true } },
  sofia:  { name: 'Sofía', lang: 'es', role: 'Doctor in Mexico City', pitch: 1.12, rate: 1.0,
            look: { skin: '#D9A27A', hair: '#2B1D18', style: 'long', shirt: '#1A8448', bg: '#DBF0E4', earrings: true } },
  diego:  { name: 'Diego', lang: 'es', role: 'Chef, Sofía’s brother', pitch: 0.88, rate: 1.0,
            look: { skin: '#C68A5E', hair: '#3A2A20', style: 'curly', shirt: '#F4F1EA', bg: '#FAEDCB', beard: true } },
  carmen: { name: 'Doña Carmen', lang: 'es', role: 'Their grandmother, sells fruit at the market', pitch: 1.04, rate: 0.88,
            look: { skin: '#B97E58', hair: '#BDBDBD', style: 'bun', shirt: '#C22E29', bg: '#F9E2DF', earrings: true } },
  mateo:  { name: 'Mateo', lang: 'es', role: 'Musician, makes the coffee', pitch: 0.96, rate: 1.0,
            look: { skin: '#A86B48', hair: '#1E1B1A', style: 'cap', shirt: '#2360C6', bg: '#DCE6F7' } },
  /* the learner's own bird: name, kind and voice follow their choice in Me → Your bird (art.js) */
  pip:    { get name(){ return typeof pipName === 'function' ? pipName() : 'Pip'; }, lang: '*',
            get role(){ return 'Your ' + (typeof pipKind === 'function' ? pipKind() : 'parrot') + ' and travel buddy'; },
            get pitch(){ return typeof pipVoice === 'function' ? pipVoice().pitch : 1.35; }, rate: 1.0 }
};
