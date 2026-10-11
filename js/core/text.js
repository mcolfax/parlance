"use strict";
/* ===================== TEXT NORMALIZATION & CHECKING ===================== */
const PUNCT = /[.,!?;:"“”„«»()\[\]¿¡…–—\-\/]/g;
const NUMW = new Map(Object.entries({ zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 }));
const CONTR = new Map(Object.entries({
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "that's": 'that is', "what's": 'what is', "where's": 'where is', "here's": 'here is', "there's": 'there is', "who's": 'who is',
  "how's": 'how is', "name's": 'name is', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not',
  "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "can't": 'can not', cannot: 'can not', "won't": 'will not',
  "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will', "it'll": 'it will', "he'll": 'he will', "she'll": 'she will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would', "he'd": 'he would', "she'd": 'she would', "that'd": 'that would',
  "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have',
  "let's": 'let us', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', "shouldn't": 'should not', "wouldn't": 'would not', "couldn't": 'could not',
  okay: 'ok'
}));
function norm(s, lang){
  let x = String(s ?? '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/(\d):(\d)/g, '$1 $2').replace(PUNCT, ' ');
  let toks = x.split(/\s+/).filter(Boolean);
  if (lang === 'en') toks = toks.flatMap(t => (CONTR.get(t) || t).split(' '));
  toks = toks.map(t => t.replace(/'/g, '')).filter(Boolean);
  if (lang === 'en'){
    toks = toks.map(t => NUMW.has(t) ? String(NUMW.get(t)) : t);
    const out = [];
    for (let i = 0; i < toks.length; i++){
      const t = toks[i], nx = toks[i + 1];
      if (/^[2-9]0$/.test(t) && /^[1-9]$/.test(nx || '')){ out.push(String(+t + +nx)); i++; continue; }
      if ((t === 'a' || t === '1') && nx === '100'){ out.push('100'); i++; continue; }
      out.push(t);
    }
    toks = out;
  }
  return toks.join(' ');
}
function fold(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss'); }
function fold2(s){ return fold(s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')); }
function dispTokens(s){ return String(s).normalize('NFC').replace(/(\d):(\d)/g, '$1 $2').split(/[\s\-–—\/]+/).map(w => w.replace(/^[¿¡"“„«(\[]+|[.,!?;:"”»)\]…]+$/g, '')).filter(Boolean); }
function tileTokens(s){ return String(s).normalize('NFC').split(/\s+/).map(w => w.replace(/^[¿¡"“„«(]+|[.,!?;:"”»)…]+$/g, '')).filter(Boolean); }
function osa(a, b){
  const m = a.length, n = b.length; if (Math.abs(m - n) > 1) return 2;
  const d = []; for (let i = 0; i <= m; i++){ d.push(new Array(n + 1).fill(0)); d[i][0] = i; }
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++){
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
let KNOWN = { de: new Set(), es: new Set(), en: new Set() };
let NOUNS = new Map();
const COMMON = {
  de: 'der die das den dem des ein eine einen einem einer eines kein keine keinen mein meine meinen meinem meiner dein deine deinen sein seine seinen ihr ihre ihren unser unsere unseren ich du er sie es wir mich dich mir dir ihm ihn uns euch bin bist ist sind seid habe hast hat haben habt war waren wird werden kann kannst können muss nicht noch auch aber oder und mit nach von bei aus zum zur',
  es: 'el la los las un una unos unas mi mis tu tus su sus yo tú él ella nosotros nosotras ellos ellas usted ustedes es son está están estoy estás soy eres somos tengo tiene tienes tienen hay muy más pero porque para por con sin del al que qué',
  en: 'he she his her him the a an is are was were me my you your we our they their them it its this that these those in on at to for of from with and or but not no yes there where were here hear have has had will would can could do does did'
};
function reindex(){
  KNOWN = { de: new Set(), es: new Set(), en: new Set() };
  NOUNS = new Map();
  const addT = (lang, s) => fold(norm(s, lang)).split(' ').forEach(w => w && KNOWN[lang].add(w));
  for (const lang of ['de', 'es']){
    COMMON[lang].split(' ').forEach(w => KNOWN[lang].add(fold(w)));
    for (const l of allLessons(lang)){
      for (const v of l.vocab){
        [v.t, ...v.alt].forEach(s => addT(lang, s)); v.e.forEach(s => addT('en', s));
        if (lang === 'de' && v.g){ const parts = v.t.split(' '); if (LANGS.de.articles.includes(parts[0].toLowerCase()) && parts.length > 1) NOUNS.set(parts.slice(1).join(' '), v.g); }
      }
      for (const s of l.sentences){ [s.t, ...s.alt].forEach(x => addT(lang, x)); s.e.forEach(x => addT('en', x)); }
      for (const b of l.blanks){ b.o.forEach(o => addT(lang, b.t.replace('___', o))); if (b.e) addT('en', b.e); }
    }
  }
  COMMON.en.split(' ').forEach(w => KNOWN.en.add(w));
  GLOSS = { de: { exact: new Map(), fold: new Map() }, es: { exact: new Map(), fold: new Map() } };
  for (const lang of ['de', 'es']){
    for (const l of allLessons(lang)) for (const v of l.vocab){
      const val = v.e.slice(0, 2).join(' · ');
      for (const t of [v.t, ...v.alt]){
        const parts = t.split(' ');
        addGloss(lang, v.g && LANGS[lang].articles.includes(parts[0].toLowerCase()) && parts.length > 1 ? parts.slice(1).join(' ') : t, val);
      }
    }
    for (const [k, v] of Object.entries(COMMON_GLOSS[lang])) addGloss(lang, k, v, true);
    for (const [k, v] of Object.entries(STORY_GLOSS[lang])) addGloss(lang, k, v);
  }
  /* the cast's names, so tapping "Lena" in a story says who she is */
  const names = Object.values(CAST).map(c => c.name.split(' ').pop());
  for (const c of Object.values(CAST)){
    const who = c.name + ' · ' + (names.some(n => c.role.startsWith(n)) ? c.role : c.role[0].toLowerCase() + c.role.slice(1));
    for (const lang of c.lang === '*' ? ['de', 'es'] : [c.lang]) for (const part of c.name.split(' ')) if (!COMMON_GLOSS[lang][part.toLowerCase()]) addGloss(lang, part, who);
  }
}
let GLOSS = { de: { exact: new Map(), fold: new Map() }, es: { exact: new Map(), fold: new Map() } };
function addGloss(lang, key, val, over){
  const k = norm(key, lang); if (!k) return; const G = GLOSS[lang];
  if (over || !G.exact.has(k)) G.exact.set(k, val);
  const f = fold(k); if (over || !G.fold.has(f)) G.fold.set(f, val);
}
function glossLookup(word, lang){
  const G = GLOSS[lang]; if (!G) return null;
  const k = norm(word, lang); if (!k) return null;
  const hit = G.exact.get(k) || G.fold.get(fold(k));
  if (hit) return { val: hit };
  const bases = baseForms(k, lang).filter(b => b.length >= 3 && b !== k);
  for (const b of bases){ const v = G.exact.get(b); if (v) return { val: v, base: b }; }
  if (lang !== 'de') for (const b of bases){ const v = G.fold.get(fold(b)); if (v) return { val: v, base: b }; }   // in German an umlaut changes the word (Küche, Kuchen)
  return null;
}
/* the dictionary forms a word might come from, likeliest first: plurals and endings, then the commonest verb forms
   (du bezahlst → bezahlen, gewartet → warten, angerufen → anrufen; vende → vender, llegamos → llegar) */
function baseForms(k, lang){
  const out = [], cut = (suf, add) => { if (k.endsWith(suf) && k.length - suf.length >= 2) out.push(k.slice(0, -suf.length) + (add || '')); };
  if (lang === 'de'){
    ['n', 'en', 'e', 's', 'es', 'er', 'nen', 'em'].forEach(x => cut(x));
    ['e', 'st', 't', 'et', 'est', 'te', 'ten', 'test', 'tet'].forEach(x => cut(x, 'en'));
    const ge = k.match(/^(an|auf|aus|ein|mit|vor|zu|ab|zurück|weg|her|hin|los|nach|vorbei|rein|raus)?ge(.{3,})$/);
    if (ge){ const pre = ge[1] || '', rest = ge[2]; out.push(pre + rest); if (rest.endsWith('et')) out.push(pre + rest.slice(0, -2) + 'en'); if (rest.endsWith('t')) out.push(pre + rest.slice(0, -1) + 'en'); }
  } else {
    [['es', ''], ['s', ''], ['as', 'o'], ['a', 'o']].forEach(([x, a]) => cut(x, a));
    for (const x of ['o', 'as', 'a', 'amos', 'an', 'es', 'e', 'emos', 'en', 'imos', 'ó', 'é', 'aste', 'aron', 'ió', 'iste', 'ieron', 'aba', 'abas', 'ábamos', 'aban', 'ía', 'ías', 'íamos', 'ían', 'ando', 'iendo', 'ado', 'ada', 'ados', 'adas', 'ido', 'ida', 'idos', 'idas'])
      if (k.endsWith(x) && k.length - x.length >= 2) for (const inf of ['ar', 'er', 'ir']) out.push(k.slice(0, -x.length) + inf);
  }
  return out;
}
function check(input, accepted, lang, opt = {}){
  const typo = opt.typo !== false;
  const ua = norm(input, lang);
  if (!ua) return { ok: false, level: 'empty', match: accepted[0] };
  const nas = accepted.filter(Boolean).map(a => [a, norm(a, lang)]);
  for (const [a, na] of nas) if (na === ua) return { ok: true, level: 'exact', match: a };
  const fu = fold(ua);
  for (const [a, na] of nas) if (fold(na) === fu || fold2(na) === fu) return { ok: true, level: 'accent', match: a, note: accentNote(input, a, lang) };
  if (typo) for (const [a, na] of nas){
    const t = typoMatch(fu, fold(na), lang);
    if (t) return { ok: true, level: 'typo', match: a, note: typoNote(a, t, lang) };
  }
  return { ok: false, level: 'wrong', match: accepted[0] };
}
function typoMatch(u, a, lang){
  if (u.replace(/ /g, '') === a.replace(/ /g, '')) return { index: -1 };
  const tu = u.split(' '), ta = a.split(' ');
  if (tu.length !== ta.length) return null;
  let idx = -1;
  for (let i = 0; i < ta.length; i++) if (tu[i] !== ta[i]){ if (idx !== -1) return null; idx = i; }
  if (idx === -1) return null;
  const x = tu[idx], y = ta[idx];
  if (y.length < 4 || osa(x, y) !== 1) return null;
  if (KNOWN[lang] && KNOWN[lang].has(x)) return null;
  if (x.slice(0, -1) === y.slice(0, -1) || x === y.slice(0, -1) || y === x.slice(0, -1)) return null;
  return { index: idx };
}
/* notes for answers that count without matching exactly: why it counts, and the word to watch */
function typoNote(a, t, lang){
  if (t.index < 0) return 'Only the spacing differs, so it counts.';
  const disp = dispTokens(a), nt = norm(a, lang).split(' ');
  const word = (lang !== 'en' && disp.length === nt.length) ? disp[t.index] : nt[t.index];
  return 'Only one letter is off (' + word + '), so it counts.';
}
function accentNote(input, a, lang){
  const ua = norm(input, lang).split(' '), na = norm(a, lang).split(' '), da = dispTokens(a);
  const words = [];
  if (ua.length === na.length && na.length === da.length) for (let i = 0; i < na.length; i++) if (ua[i] !== na[i]) words.push(da[i]);
  const list = words.length ? words.join(', ') : a, many = words.length > 1;
  const what = lang === 'de' && /ß/.test(list) && !/[äöüÄÖÜ]/.test(list) ? (many ? 'the ß spellings differ' : 'the ß differs')
    : lang === 'de' && /[äöüÄÖÜ]/.test(list) ? (many ? 'the umlauts differ' : 'the umlaut differs')
    : lang === 'es' && /ñ/i.test(list) && !/[áéíóúü]/i.test(list) ? 'the ñ differs'
    : many ? 'the accents differ' : 'the accent differs';
  return 'Only ' + what + ' (' + list + '), so it counts.';
}
/* word-by-word comparison of an answer that counts with the answer it was matched to. Marks are per
   whitespace-separated word on each side ('' | 'accent' | 'spelling' | 'word'); changes list what differs. */
function answerDiff(input, answer, lang){
  const side = s => {
    const parts = String(s ?? '').split(/\s+/).filter(Boolean), toks = [];
    parts.forEach((p, i) => dispTokens(p).forEach(w => norm(w, lang).split(' ').filter(Boolean).forEach(k => toks.push({ k, f: fold(k), g: fold2(k), p: i }))));
    return { parts, toks, marks: parts.map(() => '') };
  };
  const U = side(input), A = side(answer), m = U.toks.length, n = A.toks.length;
  const kindOf = (x, y) => x.k === y.k ? '' : (x.f === y.f || x.f === y.g || x.g === y.f) ? 'accent' : (y.f.length >= 4 && osa(x.f, y.f) <= 1) ? 'spelling' : null;
  const L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = kindOf(U.toks[i], A.toks[j]) !== null ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const RANK = { '': 0, accent: 1, spelling: 2, word: 3 };
  const mark = (S, t, kind) => { if (RANK[kind] > RANK[S.marks[t.p]]) S.marks[t.p] = kind; };
  const words = (S, ts) => [...new Set(ts.map(t => t.p))].map(p => S.parts[p].replace(/^[¿¡"“„«(\[]+|[.,!?;:"”»)\]…]+$/g, '')).join(' ');
  const changes = []; let pu = [], pa = [], caught = 0, i = 0, j = 0;
  const flush = () => { if (pu.length || pa.length) changes.push({ kind: 'word', yours: words(U, pu), answer: words(A, pa) }); pu = []; pa = []; };
  while (i < m || j < n){
    const kind = i < m && j < n ? kindOf(U.toks[i], A.toks[j]) : null;
    if (kind !== null){
      flush(); caught++;
      if (kind){ mark(U, U.toks[i], kind); mark(A, A.toks[j], kind); changes.push({ kind, yours: words(U, [U.toks[i]]), answer: words(A, [A.toks[j]]) }); }
      i++; j++;
    } else if (j < n && (i >= m || L[i][j + 1] >= L[i + 1][j])){ mark(A, A.toks[j], 'word'); pa.push(A.toks[j++]); }
    else { mark(U, U.toks[i], 'word'); pu.push(U.toks[i++]); }
  }
  flush();
  return { yours: U.marks, answer: A.marks, changes, caught, total: n };
}
function lcsTokens(u, t){
  const m = u.length, n = t.length; const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const eq = (x, y) => x === y || (y.length >= 4 && osa(x, y) <= 1);
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = eq(u[i - 1], t[j - 1]) ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[m][n];
}
function closestAnswer(input, accepted, lang){
  const u = fold(norm(input, lang)).split(' ').filter(Boolean);
  let best = { score: 0, match: accepted[0] };
  for (const a of accepted){ const t = fold(norm(a, lang)).split(' ').filter(Boolean); if (!t.length) continue; const sc = lcsTokens(u, t) / Math.max(t.length, u.length); if (sc > best.score) best = { score: sc, match: a }; }
  return best;
}
function speechScore(heard, accepted, lang){ return closestAnswer(heard, accepted, lang).score; }
function englishVariants(item){
  const out = new Set();
  for (const e of item.e){
    out.add(e); const l = e.toLowerCase();
    if (l.startsWith('to ')) out.add(e.slice(3));
    if (item.g){ if (l.startsWith('the ')) out.add(e.slice(4)); else out.add('the ' + e); }
  }
  return [...out];
}
function hintFor(answer){ return tileTokens(answer).map(w => w.length <= 2 ? w[0] + '·'.repeat(w.length - 1) : w[0] + '·'.repeat(w.length - 1)).join('  '); }

