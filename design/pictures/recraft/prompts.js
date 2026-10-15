/* Writes the Recraft prompts for the cast and the story scenes (see ../PLAN.md, "Cast and scenes with Recraft").
   Usage: node design/pictures/recraft/prompts.js     writes prompts-data.js (read by prompts.html) and PROMPTS.md
   The cast prompts are built from content/cast.js (skin, hair, shirt, accessories), so they stay true to the characters the app
   already has. The scene prompts are written by hand below, one per built-in story, from what happens in it.
   Every prompt stands alone and stays under MAX_BYTES (Recraft's older vector models cap a prompt at 1000 bytes; newer ones vary):
   plain ASCII, no accents, no character names. */
const fs = require('fs');
const path = require('path');
const { loadApp } = require('../tools.js');
const MAX_BYTES = 950;

/* ---------- the shared look: the Sticker style Matt chose on the board ---------- */
const STYLE_CAST = 'Flat vector sticker illustration, friendly cartoon style: thick even dark green outline (#0B2A1E) around every shape, simple flat fills with one soft shade shape, no gradients, no texture, warm saturated colors. Cute chibi proportions, head about one third of the body height. No text, no white border, no shadow, no background.';
const STYLE_SCENE = 'Flat vector illustration of a cozy scene, friendly cartoon style: thick even dark green outline (#0B2A1E) around every object, simple flat fills with one soft shade shape, no gradients, no texture, warm saturated colors. Wide 2:1 composition, eye level, floor line about three quarters down. No people, no animals, no text, no letters. Keep the lower middle floor area open and uncluttered.';

/* ---------- the cast: what the data does not say (age, build, trousers, shoes) ---------- */
const PEOPLE = {
  lena:      { who: 'woman', age: 'early 30s', build: 'slim', skin: 'light peach', hair: 'copper-red', top: 'sweater', legs: 'dark plum trousers', shoes: 'white sneakers' },
  jonas:     { who: 'man', age: 'mid 20s', build: 'slim', skin: 'light tan', hair: 'dark blond', top: 'sweatshirt', legs: 'navy jeans', shoes: 'grey sneakers' },
  weber:     { who: 'woman', age: 'late 60s', build: 'slim', skin: 'very light', hair: 'silver-white', top: 'cardigan', legs: 'dark grey slacks', shoes: 'comfortable beige shoes' },
  emre:      { who: 'man', age: 'mid 40s', build: 'sturdy', skin: 'medium tan', hair: 'black', top: 'shirt', legs: 'dark jeans', shoes: 'brown boots' },
  leyla:     { who: 'woman', age: 'early 30s', build: 'slim', skin: 'warm tan', hair: null, top: 'blouse', legs: 'wide charcoal trousers', shoes: 'flat shoes' },
  brandt:    { who: 'man', age: 'early 60s', build: '', skin: 'light peach', hair: 'grey', top: 'shirt', legs: 'dark grey trousers', shoes: 'polished black shoes' },
  sofia:     { who: 'woman', age: 'mid 30s', build: 'slim', skin: 'warm tan', hair: 'very dark brown', top: 'blouse', legs: 'light denim jeans', shoes: 'tan flats' },
  diego:     { who: 'man', age: 'early 40s', build: 'sturdy', skin: 'medium brown', hair: 'dark brown', top: 'shirt with rolled sleeves', legs: 'dark olive trousers', shoes: 'white sneakers' },
  carmen:    { who: 'woman', age: 'about 70', build: 'round', skin: 'brown', hair: 'light grey', top: 'blouse', legs: 'long dark skirt', shoes: 'sensible brown shoes' },
  mateo:     { who: 'man', age: 'late 20s', build: 'slim', skin: 'deep brown', hair: 'black', top: 't-shirt', legs: 'khaki trousers', shoes: 'white sneakers' },
  valentina: { who: 'woman', age: 'late 30s', build: 'athletic', skin: 'dark brown', hair: 'black', top: 'shirt', legs: 'black jeans', shoes: 'dark boots' },
  andres:    { who: 'man', age: 'mid 50s', build: '', skin: 'medium brown', hair: 'very dark brown', top: 'shirt', legs: 'grey trousers', shoes: 'brown shoes' },
  giulia:    { who: 'woman', age: 'early 30s', build: 'slim', skin: 'light olive', hair: 'dark brown', top: 'blouse', legs: 'dark blue jeans', shoes: 'tan sandals' },
  luca:      { who: 'man', age: 'early 20s', build: 'slim', skin: 'light olive', hair: 'very dark brown', top: 't-shirt', legs: 'black jeans', shoes: 'white sneakers' },
  nonna:     { who: 'woman', age: 'about 70', build: 'round', skin: 'light', hair: 'white-grey', top: 'cardigan', legs: 'long dark skirt', shoes: 'comfortable shoes' },
  marco:     { who: 'man', age: 'mid 50s', build: 'sturdy', skin: 'warm tan', hair: 'dark brown', top: 'shirt with rolled sleeves', legs: 'brown trousers', shoes: 'brown shoes' },
  conti:     { who: 'woman', age: 'mid 40s', build: '', skin: 'light peach', hair: 'brown', top: 'blouse', legs: 'dark trousers', shoes: 'flat shoes' },
  bianchi:   { who: 'man', age: 'about 65', build: '', skin: 'light olive', hair: 'light grey', top: 'collared shirt', legs: 'dark trousers', shoes: 'polished shoes' }
};
const HAIR_STYLE = {   // the style names in HAIR (js/core/art.js)
  bob: 'chin-length bob with a side fringe', messy: 'short messy tousled hair', silver: 'short fluffy curly hair', short: 'short neat hair',
  long: 'long straight hair past the shoulders', curly: 'big voluminous curly hair', bun: 'hair tied up in a bun on top of the head',
  side: 'side-swept hair'
};
function castPrompt(id, c){
  const p = PEOPLE[id], L = c.look, feats = [];
  let hair;
  if (L.style === 'hijab') hair = 'a raspberry pink headscarf (' + L.hair + ') covering hair and neck, face fully visible';
  else if (L.style === 'cap') hair = 'a red baseball cap (#E4572E) over short ' + p.hair + ' hair';
  else if (L.style === 'braids') hair = 'two long ' + p.hair + ' braids with yellow ribbon ties (' + L.ribbon + ')';
  else if (L.style === 'bald') hair = 'bald on top with short ' + p.hair + ' hair above the ears (' + L.hair + ')';
  else hair = p.hair + ' ' + HAIR_STYLE[L.style] + ' (' + L.hair + ')';
  if (L.glasses) feats.push('round glasses');
  if (L.beard) feats.push('a short full beard');
  if (L.mustache) feats.push('a mustache');
  if (L.freckles) feats.push('freckles on the cheeks');
  if (L.earrings) feats.push('small gold earrings');
  const tie = L.tie ? ' with an amber tie (' + L.tie + ')' : '';
  const text = STYLE_CAST + ' Full-length front view of ' + (p.build ? 'a ' + p.build + ' ' : 'a ') + p.who + ' ' + (/^about/.test(p.age) ? p.age + ' years old' : 'in ' + (p.who === 'woman' ? 'her ' : 'his ') + p.age) + ', standing relaxed, arms slightly away from the body, both shoes visible. ' +
    cap(p.skin) + ' skin (' + L.skin + '), ' + hair + (feats.length ? ', ' + feats.join(', ') : '') + '. Wearing a ' + p.top + ' (' + L.shirt + ')' + tie + ', ' + p.legs + ', ' + p.shoes + '. Friendly smile, simple dot eyes. One character, centered, fills the frame, transparent background.';
  return text.replace(/\s+/g, ' ');
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- the scenes, one per built-in story: where it happens and what is in the room ---------- */
const CITY = {
  de: 'Berlin: cream and grey tenement buildings, tall windows, bicycles, linden trees.',
  es: 'Mexico City: colorful low buildings, jacaranda trees, bright tiles.',
  it: 'Rome: ochre and terracotta walls, green shutters, cobblestones, umbrella pines.'
};
const SCENES = {
  'de-s1': 'Tiny corner cafe, sunny morning. Wooden counter along the back right with a shiny espresso machine, glass case of croissants, shelf of cups, small round tables, big window, pendant lamps.',
  'de-s2': 'Bright apartment-building hallway in daytime: two neighboring front doors, a doormat, a big potted plant, coat hooks, a bicycle against the wall, a window with soft light.',
  'de-s3': 'Rainy Saturday on a city street in front of an apartment building entrance with a small awning. Grey clouds, rain streaks, puddles, wet shiny pavement, parked bikes, a lit cafe window.',
  'de-s4': 'Late-evening corner shop (Spaeti), glowing windows: shelves of bread rolls, a milk fridge, crates of fruit outside, a street lamp, dark blue night sky. Counter with a till inside.',
  'de-s5': 'Night outside an apartment building: a closed front door with a keyhole and a doorstep, a street lamp with warm light, dark blue starry sky, a bicycle leaning on the wall, one lit window above.',
  'de-s6': 'Evening in front of a small old cinema: glowing marquee with blank lights, two empty poster frames, a popcorn cart, a bench, a street lamp, dusk sky.',
  'de-s7': 'Empty sunny two-room apartment above a shop: wooden parquet floor, tall windows with a street view, a few cardboard moving boxes, a radiator, a set of keys on a hook.',
  'de-s8': 'Cold winter living room: a desk with a laptop, a sheet of paper and a pen, a mug, a radiator, a thick blanket over a chair, a window with snowflakes outside.',
  'de-s9': 'Late-night pharmacy: a glowing green cross sign (symbol only), a counter with medicine boxes, tall shelves, a night bell by the glass door, dark street outside.',
  'es-s1': 'Small neighborhood cafe, sunny morning. Counter with an espresso machine and a basket of sweet rolls, colorful tile counter front, wooden stools, hanging plants, papel picado banner without text.',
  'es-s2': 'Cozy family living room: a sofa with embroidered cushions, a wall of framed photos, a plant, a cat basket, a window with a purple jacaranda tree outside, afternoon light.',
  'es-s3': 'Open-air market stall, morning: crates of tomatoes, avocados and limes, bunches of cilantro, a hanging scale, a red and white striped awning, colorful cloths.',
  'es-s4': 'Park after a rainy afternoon starts: big old trees, a bike rack with bicycles, a wet path with puddles, grey-violet clouds, falling rain streaks.',
  'es-s5': 'Restaurant dining room during a blackout at night: candles and lanterns on tables, a guitar leaning on a chair, dark windows with a city skyline, warm candlelight.',
  'es-s6': 'Small concert hall after a show: a stage with a drum kit and microphone stand, speaker stacks, string lights, colored spotlight beams, a few empty chairs.',
  'es-s7': 'Empty bright apartment for rent: living room with tiled floor, a balcony with plants, a few moving boxes, a set of keys on a hook, a blank paper sign on the door.',
  'es-s8': 'Small TV studio set: two armchairs and a side table with water glasses, big studio lights on stands, a camera on a tripod, a red on-air lamp without text, colorful backdrop.',
  'es-s9': 'Street in heavy afternoon rain: a pink and white taxi parked at the curb with wipers on, wet street, puddles, jacaranda trees, rain streaks, buildings with lit windows.',
  'it-s1': 'Roman cafe-bar, sunny morning: a zinc counter with a silver espresso machine, a glass case of cornetti, tiny marble tables, bottles on shelves, green shutters open to the street.',
  'it-s2': 'Cozy family living room: a bookshelf full of books, a sofa with a crocheted blanket, framed photos on the wall, a plant, a window with shutters, warm evening light.',
  'it-s3': 'Open-air market stall, morning: crates of tomatoes, oranges, potatoes and lemons, a hanging scale, a green striped awning, cobblestones.',
  'it-s4': 'Afternoon thunderstorm: dark clouds, heavy rain, wet cobblestones with puddles, a bus stop shelter, an ochre building, an umbrella pine.',
  'it-s5': 'Small family pensione lobby during a blackout at night: a reception desk with candles, a guitar on a chair, a key rack with keys, a staircase, dark windows, warm candlelight.',
  'it-s6': 'Small concert hall after a show: a stage with a drum kit and microphone stand, speaker stacks, string lights, colored spotlight beams, a few empty chairs.',
  'it-s7': 'Empty bright apartment for rent: parquet floor, tall shuttered windows, a balcony with terracotta pots, a few moving boxes, a set of keys on a hook.',
  'it-s8': 'Cozy study at home: a desk with an open notebook, a coffee cup and a lamp, a bookshelf, a blank framed diploma, a necktie hung over a chair, a window with shutters.',
  'it-s9': 'Small hotel entrance in the rain, early evening: a lantern by the door, a scooter at the curb with a delivery box on the back, wet cobblestones, rain streaks.'
};
const sceneForPrompt = (id, lang) => (STYLE_SCENE + ' ' + SCENES[id] + ' ' + CITY[lang]).replace(/\s+/g, ' ');

const STEPS = [
  'Pick Recraft\'s vector illustration style and the newest vector model. If Recraft lets you set colors, enter the Selva palette below.',
  'Generate Lena first. Make four versions, keep the best, and ask for changes until you like it. Then save her (and two more you approve) as a custom style in Recraft, so the other 17 come out in the same hand.',
  'Generate the rest of the cast. Use the same canvas shape for all of them (tall, 1:2 or the closest), so one crop works for every face.',
  'Generate the 27 scenes in the widest shape Recraft offers (2:1 or 16:9). The app crops it to 320 by 140, so keep nothing important in the top or bottom tenth.',
  'Export every file as SVG, not PNG. Name the cast files like lena.svg and the scenes like de-s1.svg.',
  'Upload the SVGs to design/pictures/recraft/incoming/ in the GitHub repo (Add file, then Upload files, on the branch ccr-b60380d9-e408p9), or attach them to the chat, and tell me. Send them in batches if you like: the six German characters, then a few scenes, and so on.'
];
const PALETTE = [['Outline', '#0B2A1E'], ['Red', '#E5483A'], ['Orange', '#FF8A1F'], ['Yellow', '#FFC93C'], ['Green', '#3DAA5C'], ['Teal', '#1FA3A0'], ['Blue', '#2F7BE0'], ['Sky', '#9ED3F2'], ['Purple', '#8B5CC6'], ['Pink', '#F27BA4'], ['Brown', '#9A6234'], ['Tan', '#E6A957'], ['Cream', '#FFF1D6']];
const FIXES = [
  ['A background appears', 'Add: isolated on a plain transparent background, no ground, no shadow.'],
  ['The outline is thin or uneven', 'Add: extra thick, even outline, the same weight on every shape.'],
  ['The proportions look realistic', 'Add: chibi proportions, very big head, short body, simple hands.'],
  ['The character is cropped', 'Add: the whole body is visible from the top of the head to the soles of the shoes.'],
  ['A scene has people or writing in it', 'Add: no people, no signs with writing, no letters, no numbers.'],
  ['The colors are muted or gradient', 'Add: flat solid fills, bright saturated colors, no gradients.']
];

(async () => {
  const app = await loadApp(P => JSON.parse(JSON.stringify({ CAST: P.CAST, STORIES: P.STORIES.map(s => ({ id: s.id, lang: s.lang, level: s.level, title: s.title, en: s.en, scene: s.scene, cast: s.cast })) })));
  const bad = [];
  const cast = Object.entries(app.CAST).filter(([id, c]) => c.look).map(([id, c]) => {
    if (!PEOPLE[id]) { bad.push('No PEOPLE entry for ' + id); return null; }
    const prompt = castPrompt(id, c);
    return { id, file: id + '.svg', name: c.name, lang: c.lang, role: c.role, prompt, bytes: Buffer.byteLength(prompt) };
  }).filter(Boolean);
  const scenes = app.STORIES.map(s => {
    if (!SCENES[s.id]) { bad.push('No scene text for ' + s.id); return null; }
    const prompt = sceneForPrompt(s.id, s.lang);
    return { id: s.id, file: s.id + '.svg', lang: s.lang, level: s.level, title: s.title, en: s.en, cast: s.cast.map(id => app.CAST[id].name), prompt, bytes: Buffer.byteLength(prompt) };
  }).filter(Boolean);
  for (const x of [...cast, ...scenes]){
    if (x.bytes > MAX_BYTES) bad.push(x.id + ' is ' + x.bytes + ' bytes (max ' + MAX_BYTES + ')');
    if (/[^\x20-\x7E]/.test(x.prompt)) bad.push(x.id + ' has a non-ASCII character');
  }
  const data = { styleCast: STYLE_CAST, styleScene: STYLE_SCENE, steps: STEPS, palette: PALETTE, fixes: FIXES, maxBytes: MAX_BYTES, cast, scenes };
  fs.writeFileSync(path.join(__dirname, 'prompts-data.js'), '/* Generated by node design/pictures/recraft/prompts.js. Do not edit by hand. */\nconst PROMPTS = ' + JSON.stringify(data, null, 1) + ';\n');
  const md = ['# Recraft prompts', '', 'Generated by `node design/pictures/recraft/prompts.js`. Each prompt is under ' + MAX_BYTES + ' bytes and stands alone.', '',
    '## How to use these', '', ...STEPS.map((s, i) => (i + 1) + '. ' + s), '', '## Colors', '', PALETTE.map(([n, h]) => n + ' `' + h + '`').join(', '), '',
    '## If it goes wrong', '', ...FIXES.map(([a, b]) => '- **' + a + '.** ' + b), '',
    '## Cast (' + cast.length + ')', '', ...cast.flatMap(c => ['### ' + c.name + ' (' + c.lang + '): `' + c.file + '`', '*' + c.role + '*', '', '```', c.prompt, '```', '']),
    '## Scenes (' + scenes.length + ')', '', ...scenes.flatMap(s => ['### ' + s.id + ' ' + s.title + ' (' + s.level + '): `' + s.file + '`', '*' + s.en + '. In the story: ' + s.cast.join(', ') + '.*', '', '```', s.prompt, '```', ''])].join('\n');
  fs.writeFileSync(path.join(__dirname, 'PROMPTS.md'), md);
  console.log(cast.length + ' cast prompts (max ' + Math.max(...cast.map(c => c.bytes)) + ' bytes), ' + scenes.length + ' scene prompts (max ' + Math.max(...scenes.map(s => s.bytes)) + ' bytes)');
  if (bad.length){ console.log(bad.map(b => 'FAIL ' + b).join('\n')); process.exit(1); }
  console.log('ok');
})().catch(e => { console.log('FAIL ' + (e && e.message || e)); process.exit(1); });
