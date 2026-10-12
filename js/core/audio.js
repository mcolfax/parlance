"use strict";
/* ===================== AUDIO: SPEECH & EFFECTS ===================== */
const Voice = { list: [], unlocked: false, seq: 0, wait: 1500, hinted: false, lastError: '' };
function loadVoices(){ try { Voice.list = window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : []; } catch (e) { Voice.list = []; } }
if ('speechSynthesis' in window){ loadVoices(); try { window.speechSynthesis.addEventListener('voiceschanged', () => { loadVoices(); if (typeof UI !== 'undefined' && typeof render === 'function' && UI.tab === 'me' && !busy()) render(); }); } catch (e) {} }
const BAD_VOICE = /eloquence|novelty|bad news|bells|bahh|boing|bubbles|cellos|whisper|zarvox|trinoids|wobble|organ|jester|superstar|good news|deranged|hysterical|pipe|albert|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|reed|sandy|flo\b/i;
function voicesFor(lang){ return Voice.list.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(lang)).sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang)); }
function voiceScore(v, lang){
  const l = (v.lang || '').replace('_', '-').toLowerCase(); const prefs = LANGS[lang].prefs.map(x => x.toLowerCase());
  const i = prefs.indexOf(l); let s = i >= 0 ? 100 - i * 8 : (l.startsWith(lang) ? 20 : -100);
  const n = v.name || '';
  if (/premium|enhanced|neural|natural|siri/i.test(n)) s += 30;
  if (/google/i.test(n)) s += 12;
  if (BAD_VOICE.test(n)) s -= 80;
  return s;
}
function voiceFor(lang){
  if (!Voice.list.length) loadVoices();   // some browsers only fill the list after a while
  const pref = S.settings.voices[lang];
  if (pref){ const v = Voice.list.find(v => v.voiceURI === pref || v.name === pref); if (v) return v; }
  return voicesFor(lang)[0] || null;
}
function unlockAudio(){
  if (Voice.unlocked) return; Voice.unlocked = true;
  try { if ('speechSynthesis' in window){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } } catch (e) {}
  try { sfxCtx(); } catch (e) {}
}
document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
document.addEventListener('keydown', unlockAudio, { capture: true, once: true });
document.addEventListener('pointerdown', () => recUnlock(), { capture: true });
document.addEventListener('keydown', () => recUnlock(), { capture: true });
function chunks(text){
  const t = String(text).replace(/___/g, '…');
  if (t.length < 180) return [t];
  return t.match(/[^.!?;]+[.!?;]*\s*/g) || [t];
}
/* speak() turns the theme song down while a voice talks, then back up.
   A recorded voice reads the line when there is one (see "recorded voices" below); otherwise the device's voice does.
   The voice starts inside the tap that asked for it (Safari on iPhone only speaks reliably that way). If another word is
   still playing it is cancelled first and the new one follows 70ms later, because Chrome can drop a word spoken straight
   after a cancel. A voice engine left paused is woken first.
   Phones don't all have the same voices: Android may have no Mexican Spanish voice, for example. So if a try hasn't
   started after Voice.wait ms, or the engine refuses it, the next try asks for the plain language ("es", which the phone
   maps to whatever voice it has), then any other installed voice for it. If nothing plays, a one-time hint says why in
   plain words (voiceTrouble). Resolves true when it spoke, false when nothing played, null when a newer word took over. */
function speak(text, lang, slow, vo){
  songDuck(true);
  const after = r => { songDuck(false); if (Song.mode === 'home' && Song.el && Song.el.paused) songSync(200); return r; };   // iPhone may pause the song while a recording plays
  return Promise.resolve(speakRaw(text, lang, slow, vo)).then(r => { after(r); if (r === false && text) speechHint(lang); return r; }, () => after(false));
}
function speechHint(lang){
  if (Voice.hinted || !('speechSynthesis' in window) || typeof toast !== 'function') return;
  Voice.hinted = true;
  toast(voiceTrouble(Voice.lastError, lang));
}
/* what to tell someone when the voice didn't play, from the engine's reason (SpeechSynthesisErrorEvent.error, or '' for none) */
function voiceTrouble(code, lang){
  const L = LANGS[lang] ? LANGS[lang].name : 'this language';
  if (code === 'language-unavailable' || code === 'voice-unavailable' || code === 'novoice')
    return 'Your phone has no ' + L + ' voice Parlance can use. Add one in your phone’s text-to-speech settings (on iPhone: Settings → Accessibility → Spoken Content → Voices), then try again.';
  if (code === 'not-allowed') return 'The browser didn’t let the voice play. Tap the word again.';
  if (code === 'audio-busy' || code === 'audio-hardware') return 'Another app is using the speaker. Try again in a moment.';
  if (code === 'network') return 'The voice needs an internet connection. Check your connection and try again.';
  if (code === 'synthesis-unavailable' || code === 'synthesis-failed') return 'Your phone’s text-to-speech didn’t respond. Check that a text-to-speech engine is installed and on, then try again.';
  return 'The voice didn’t play. Check that your media volume is up and silent mode is off. Me → Sound has a voice test.';
}
/* the tries for one word: the best voice (or the language's usual tag), then the plain language, then any other voice for it */
function voicePlans(lang){
  const v = voiceFor(lang), plans = [v ? { voice: v, lang: v.lang } : { voice: null, lang: LANGS[lang].tts }];
  const add = p => { if (!plans.some(x => x.voice === p.voice && x.lang === p.lang)) plans.push(p); };
  add({ voice: null, lang });
  const other = voicesFor(lang).find(x => x !== v); if (other) add({ voice: other, lang: other.lang });
  return plans;
}
/* a recorded line when there is one and natural voices are on, the device's own voice otherwise. It decides at once, so
   the voice starts inside the tap: until the language's index has loaded (main.js loads it at start), the device's voice
   speaks. A clip whose pack is still on its way plays when the pack arrives, through the voice element the first tap unlocked */
function speakRaw(text, lang, slow, vo){
  const my = ++Rec.gen; recStop();
  if (!text || !recOn()) return speakDevice(text, lang, slow, vo);
  const device = () => my === Rec.gen ? speakDevice(text, lang, slow, vo) : null;
  const play = idx => { const c = idx && recClip(idx, text, vo); return c ? recPlay(lang, c, slow, my).then(r => r === null ? device() : r || null) : device(); };
  if (Rec.idx[lang] === undefined){ recIndex(lang); return speakDevice(text, lang, slow, vo); }
  return play(Rec.idx[lang]);
}
/* stop whatever is speaking */
function speakStop(){ Rec.gen++; Voice.seq++; recStop(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }
function speakDevice(text, lang, slow, vo){
  return new Promise(res => {
    if (!('speechSynthesis' in window) || !text) return res(false);
    const synth = window.speechSynthesis, id = ++Voice.seq;   // a newer word cancels this one, and its handlers know it
    let started = false, finished = false, attempt = 0, watch = 0, cap = 0, plans = [];
    const fin = ok => { if (finished) return; finished = true; clearTimeout(watch); clearTimeout(cap); res(Voice.seq === id ? ok : (started || null)); };
    const retry = () => {   // this try made no sound: on to the next one, or give up
      if (finished) return;
      if (attempt >= plans.length || Voice.seq !== id) return fin(started);
      attempt++;
      try { synth.cancel(); } catch (e) {}
      run(plans[attempt - 1], attempt);
    };
    const run = (plan, a) => {
      const parts = chunks(text);
      const rate = (slow ? 0.62 : (S.settings.speed === 'relaxed' ? 0.82 : 0.96)) * ((vo && vo.rate) || 1);
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        if (plan.voice) u.voice = plan.voice;
        u.lang = plan.lang; u.rate = rate; if (vo && vo.pitch) u.pitch = Math.max(0.5, Math.min(1.6, vo.pitch));
        u.onstart = () => { if (a === attempt){ started = true; Voice.lastError = ''; } };
        u.onerror = e => {
          const why = (e && e.error) || '';
          if (a !== attempt || why === 'interrupted' || why === 'canceled') return;
          if (!started) Voice.lastError = why;
          if (i === parts.length - 1 || !started){ if (started) fin(true); else retry(); }
        };
        if (i === parts.length - 1) u.onend = () => { if (a === attempt) fin(started); };
        synth.speak(u);
      });
      clearTimeout(watch);
      watch = setTimeout(() => { if (a === attempt && !started) retry(); }, Voice.wait);
    };
    const begin = () => {
      if (finished || Voice.seq !== id) return fin(null);
      try { Voice.lastError = ''; plans = voicePlans(lang); attempt = 1; run(plans[0], 1); } catch (e) { fin(false); }
    };
    try {
      if (synth.paused) synth.resume();   // a voice engine can stay paused after an interruption, and then nothing new plays
      if (synth.speaking || synth.pending){ synth.cancel(); setTimeout(begin, 70); } else begin();
    } catch (e) { return fin(false); }
    cap = setTimeout(() => fin(started), 12000 + String(text).length * 130);
  });
}
/* Me → Test voice: the recorded voice when there is one ('recorded'), else a check of the device's voice */
function speakTest(lang){
  const my = ++Rec.gen; recStop();
  const play = idx => { const c = idx && recClip(idx, LANGS[lang].test); return c ? recPlay(lang, c, false, my).then(r => r === null ? speakTestDevice(lang) : 'recorded') : speakTestDevice(lang); };
  if (!recOn() || Rec.idx[lang] === undefined){ if (recOn()) recIndex(lang); return speakTestDevice(lang); }
  return play(Rec.idx[lang]);
}
function speakTestDevice(lang){
  if (!('speechSynthesis' in window)) return Promise.resolve('none');
  Voice.lastError = '';
  return speakDevice(LANGS[lang].test, lang).then(r => r ? 'ok' : !voicesFor(lang).length && !Voice.lastError ? 'novoice' : (Voice.lastError || 'silent'));
}

/* ----- recorded voices (MEDIA.voice; dev/voices.js records them) -----
   <dir>/<lang>.json maps every line the built-in course can say to a clip: [pack, byte offset, byte length] in one of
   a few mp3 packs (one per unit, one for the stories, one for common lines). Each clip is a whole mp3 on its own, so it
   plays from a local copy of just its bytes. Lines with no recording (Talk, lessons on demand, live packs, your own
   saved sentences) use the device's voice. A speaker without a recording of a line falls back to the narrator's. */
const Rec = { idx: {}, loading: {}, packs: {}, bufs: {}, gen: 0, el: null, url: '', done: null, src: null, t: 0, unlocked: false, noBlob: false };
function recOn(){ return !!(MEDIA.voice && S.settings.natural !== false); }
function recKey(text){ return String(text).normalize('NFC').replace(/[‘’ʼ]/g, '\'').replace(/\s+/g, ' ').trim().toLowerCase(); }
/* whose voice: a cast member, a bird (its MASCOTS entry, or mascot()'s copy with its id) or the narrator */
function recWho(vo){
  if (vo){ if (vo.id && MASCOTS[vo.id]) return vo.id; for (const k in CAST) if (CAST[k] === vo) return k; for (const k in MASCOTS) if (MASCOTS[k] === vo) return k; }
  return 'narrator';
}
/* a bird that isn't recorded yet speaks with the device's voice at its own pitch, rather than in someone else's */
function recClip(idx, text, vo){ const k = recKey(text), v = idx.voices, who = recWho(vo); if (MASCOTS[who] && !v[who]) return null; return (v[who] && v[who].lines[k]) || (v.narrator && v.narrator.lines[k]) || null; }
function recFetch(url){
  if (!window.fetch) return Promise.reject(new Error('no fetch'));
  return fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r; });
}
/* the language's index, loaded once (a failed load is tried again a minute later) */
function recIndex(lang){
  if (Rec.idx[lang] !== undefined) return Promise.resolve(Rec.idx[lang]);
  if (!Rec.loading[lang]) Rec.loading[lang] = recFetch(MEDIA.voice.dir + '/' + lang + '.json').then(r => r.json())
    .then(j => j && j.voices && Array.isArray(j.packs) ? j : null)
    .catch(() => { setTimeout(() => { delete Rec.idx[lang]; delete Rec.loading[lang]; }, 60000); return null; })
    .then(j => { Rec.idx[lang] = j; return j; });
  return Rec.loading[lang];
}
function recPack(lang, i){
  const idx = Rec.idx[lang], name = idx && idx.packs[i]; if (!name) return Promise.resolve(null);
  const key = lang + '/' + name;
  if (!Rec.packs[key]) Rec.packs[key] = recFetch(MEDIA.voice.dir + '/' + name).then(r => r.arrayBuffer()).then(b => { Rec.bufs[key] = b; return b; }).catch(() => { delete Rec.packs[key]; return null; });
  return Rec.packs[key];
}
function recHere(lang, i){ const idx = Rec.idx[lang], name = idx && idx.packs[i]; return name ? Rec.bufs[lang + '/' + name] || null : null; }
/* fetch the packs that hold these lines, so they play at once when their turn comes */
function recWarm(lang, texts){
  if (!recOn()) return;
  recIndex(lang).then(idx => {
    if (!idx) return; const ps = new Set();
    for (const t of texts){ const k = recKey(t); for (const v of Object.values(idx.voices)) if (v.lines[k]) ps.add(v.lines[k][0]); }
    ps.forEach(i => recPack(lang, i));
  });
}
/* plays clip c. Resolves true when it played, false when something else took over, null when it couldn't play.
   When the pack is already here it starts at once (inside the tap) */
function recPlay(lang, c, slow, my){
  const go = buf => {
    if (my !== Rec.gen) return false;
    if (!buf || c[1] + c[2] > buf.byteLength) return null;
    const bytes = buf.slice(c[1], c[1] + c[2]), rate = slow ? 0.7 : S.settings.speed === 'relaxed' ? 0.85 : 1;
    try { if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)){ Voice.seq++; window.speechSynthesis.cancel(); } } catch (e) {}
    return (Rec.noBlob ? Promise.resolve('retry') : recElement(bytes, rate)).then(r => r === 'retry' && my === Rec.gen ? recBuffer(bytes, rate, my) : r);
  };
  const here = recHere(lang, c[0]);
  return here ? Promise.resolve(go(here)) : recPack(lang, c[0]).then(go);
}
function recEl(){ if (!Rec.el){ const a = new Audio(); a.preload = 'auto'; a.setAttribute('playsinline', ''); Rec.el = a; } return Rec.el; }
function recUrl(u){ const old = Rec.url; Rec.url = u || ''; return () => { if (old){ try { URL.revokeObjectURL(old); } catch (e) {} } }; }
/* through one audio element, which plays like other media (it is heard in silent mode) and slows down without dropping in pitch */
function recElement(bytes, rate){
  return new Promise(res => {
    let a, url, started = false;
    const fin = r => { if (Rec.done !== fin) return; Rec.done = null; clearTimeout(Rec.t); a.onended = a.onerror = a.onplaying = null; res(r); };
    try { a = recEl(); url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })); } catch (e) { return res('retry'); }
    Rec.done = fin;
    a.onplaying = () => { started = true; };
    a.onended = () => fin(true);
    a.onerror = () => { if (started) return fin(true); Rec.noBlob = true; fin('retry'); };   // a local copy the page may not play: Web Audio instead
    const release = recUrl(url); a.muted = false; a.src = url; release();
    try { a.defaultPlaybackRate = a.playbackRate = rate; a.preservesPitch = a.webkitPreservesPitch = true; } catch (e) {}
    Rec.t = setTimeout(() => fin(true), bytes.byteLength / 4 / rate + 4000);   // mp3 at 32 kbps: 4 bytes a millisecond
    let p; try { p = a.play(); } catch (e) { return fin(null); }
    if (p && p.catch) p.catch(e => fin(e && e.name === 'AbortError' ? false : null));
  });
}
/* through Web Audio, when the element can't play a local copy. It can't slow a voice down without lowering it, so a slow
   request goes to the device's voice */
function recBuffer(bytes, rate, my){
  const c = sfxCtx(); if (!c || !c.decodeAudioData || rate < 0.8) return Promise.resolve(null);
  return new Promise((ok, no) => { const p = c.decodeAudioData(bytes, ok, no); if (p && p.then) p.then(ok, no); }).then(buf => new Promise(res => {
    if (my !== Rec.gen) return res(false);
    const s = c.createBufferSource(); s.buffer = buf; s.connect(c.destination);
    const fin = r => { if (Rec.done !== fin) return; Rec.done = null; if (Rec.src === s) Rec.src = null; clearTimeout(Rec.t); res(r); };
    Rec.done = fin; Rec.src = s; s.onended = () => fin(true);
    s.start(); Rec.t = setTimeout(() => fin(true), (buf.duration || 0) * 1000 + 2000);
  }), () => null);
}
function recStop(){
  const s = Rec.src; Rec.src = null;
  if (Rec.done) Rec.done(false);
  if (s){ try { s.stop(); } catch (e) {} }
  if (Rec.el && !Rec.el.paused){ try { Rec.el.pause(); } catch (e) {} }
}
/* the first tap plays the voice element silently, so a recording can start later without a tap of its own (iPhone) */
function recUnlock(){
  if (Rec.unlocked || !recOn() || !window.URL || !URL.createObjectURL) return;
  Rec.unlocked = true;
  try {
    const a = recEl(), u = URL.createObjectURL(silentWav()), release = recUrl(u);
    a.muted = true; a.src = u; release();
    const p = a.play(), done = () => { if (a.src === u){ try { a.pause(); } catch (e) {} } a.muted = false; };
    if (p && p.then) p.then(done, () => { a.muted = false; if (a.src === u) Rec.unlocked = false; }); else done();
  } catch (e) { Rec.unlocked = false; }
}
function silentWav(){
  const n = 400, d = new DataView(new ArrayBuffer(44 + n * 2)); let o = 0;
  const s = t => { for (const ch of t) d.setUint8(o++, ch.charCodeAt(0)); }, u32 = v => { d.setUint32(o, v, true); o += 4; }, u16 = v => { d.setUint16(o, v, true); o += 2; };
  s('RIFF'); u32(36 + n * 2); s('WAVEfmt '); u32(16); u16(1); u16(1); u32(8000); u32(16000); u16(2); u16(16); s('data'); u32(n * 2);
  return new Blob([d.buffer], { type: 'audio/wav' });
}
/* what a lesson can say: its tip examples, words and sentences with every accepted form, and its filled-in blanks */
function lessonSaid(l){
  const forms = x => [x.t, ...(x.alt || [])];
  return [...((l.tip && l.tip.examples) || []).map(x => x.t), ...(l.vocab || []).flatMap(forms), ...(l.sentences || []).flatMap(forms), ...(l.blanks || []).map(blankSaid)].filter(t => typeof t === 'string');
}
/* every line the built-in course can say, as [lang, speaker, text, pack] in course order: what dev/voices.js records.
   A line goes in the pack where it first appears. Single words (for tap-a-word and word tiles) use the narrator. Every
   bird with a voice in MEDIA.voice records the birds' lines and its hello from the picker. */
function voiceLines(){
  const out = [], seen = new Set();
  const add = (lang, who, t, pack) => { t = String(t || '').trim(); const k = lang + '|' + who + '|' + recKey(t); if (!t || t.includes('___') || seen.has(k)) return; seen.add(k); out.push([lang, who, t, pack]); };
  const all = (lang, who, ts, pack) => { ts.forEach(t => add(lang, who, t, pack)); ts.forEach(t => tileTokens(t).forEach(w => add(lang, 'narrator', w, pack))); };
  for (const lang of Object.keys(LANGS)){
    all(lang, 'narrator', [LANGS[lang].hello, LANGS[lang].test], lang + '-common');
    for (const id in MASCOTS) if (MEDIA.voice[lang] && MEDIA.voice[lang][id]) all(lang, id, [...Object.values(PIP_SAYS[lang] || {}).flat(), birdHello(id, lang)], lang + '-common');
    for (const u of COURSE[lang].units) for (const l of u.lessons) all(lang, 'narrator', lessonSaid(l), u.lessons[0].id);
    for (const st of STORIES) if (st.lang === lang) for (const it of st.items) if (it.who && it.t) all(lang, it.who, [it.t], lang + '-stories');
  }
  return out;
}
/* ----- sound design: every effect is synthesized live, so there are no audio files to load ----- */
const SFX = { ctx: null, master: null, noise: null };
function sfxCtx(){
  if (!SFX.ctx){
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    SFX.ctx = new AC(); SFX.master = SFX.ctx.createGain(); SFX.master.gain.value = 0.9; SFX.master.connect(SFX.ctx.destination);
  }
  if (SFX.ctx.state === 'suspended') SFX.ctx.resume().catch(() => {});
  return SFX.ctx;
}
function noiseBuf(c){
  if (!SFX.noise){ const b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; SFX.noise = b; }
  return SFX.noise;
}
/* building blocks; times are seconds from now; opt.dest picks the bus (effects by default) */
function tone(c, f, start, dur, type, gain, opt = {}){
  const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime + start;
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
  if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + (opt.glide || dur));
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain || 0.07, t0 + (opt.attack || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(opt.dest || SFX.master); o.start(t0); o.stop(t0 + dur + 0.05);
  return o;
}
function bell(c, f, start, dur, gain, opt = {}){ // two-operator FM bell
  const t0 = c.currentTime + start;
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.setValueAtTime(f, t0); mod.frequency.setValueAtTime(f * (opt.ratio || 3.5), t0);
  mg.gain.setValueAtTime(f * (opt.index || 2.2), t0); mg.gain.exponentialRampToValueAtTime(f * 0.04, t0 + dur);
  mod.connect(mg); mg.connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain || 0.05, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  car.connect(g); g.connect(opt.dest || SFX.master);
  car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  return car;
}
function hiss(c, start, dur, gain, opt = {}){ // filtered noise: whooshes, paper, hats
  const t0 = c.currentTime + start; const s = c.createBufferSource(); s.buffer = noiseBuf(c);
  const f = c.createBiquadFilter(); f.type = opt.type || 'bandpass'; f.frequency.setValueAtTime(opt.f || 1200, t0);
  if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur); f.Q.value = opt.q || 0.9;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain || 0.05, t0 + (opt.attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(opt.dest || SFX.master); s.start(t0, Math.random() * 0.4); s.stop(t0 + dur + 0.05);
  return s;
}
/* The sound library. Add a sound here and call sfx('name') anywhere. */
const SOUNDS = {
  tap: c => tone(c, 1500, 0, 0.035, 'sine', 0.018),
  select: c => { tone(c, 640, 0, 0.07, 'triangle', 0.035); tone(c, 960, 0.025, 0.08, 'sine', 0.025); },
  pick: c => { tone(c, 520, 0, 0.09, 'sine', 0.05, { to: 820, glide: 0.06 }); hiss(c, 0, 0.03, 0.012, { f: 4000 }); },
  drop: c => tone(c, 760, 0, 0.1, 'sine', 0.04, { to: 440, glide: 0.08 }),
  ok: c => { bell(c, 1046.5, 0, 0.55, 0.05); bell(c, 1568, 0.075, 0.7, 0.045); hiss(c, 0.06, 0.25, 0.008, { type: 'highpass', f: 6000 }); },
  bad: c => { tone(c, 233, 0, 0.26, 'triangle', 0.07, { to: 175, glide: 0.24 }); tone(c, 117, 0.01, 0.22, 'sine', 0.05); },
  combo: c => [880, 1109, 1319, 1760].forEach((f, i) => bell(c, f, i * 0.055, 0.35, 0.035)),
  done: c => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, f, i * 0.09, 0.9, 0.04)); tone(c, 261.6, 0.3, 1.1, 'sine', 0.03, { attack: 0.08 }); },
  level: c => { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(c, f, i * 0.08, 0.5, 'triangle', 0.04)); [1046.5, 1568, 2093].forEach((f, i) => bell(c, f, 0.55 + i * 0.06, 1.0, 0.035)); },
  whoosh: c => hiss(c, 0, 0.38, 0.035, { f: 300, to: 2600, q: 0.7, attack: 0.12 }),
  pop: c => tone(c, 320, 0, 0.09, 'sine', 0.05, { to: 980, glide: 0.06 }),
  chirp: c => { tone(c, 1700, 0, 0.07, 'sine', 0.04, { to: 2600, glide: 0.05 }); tone(c, 2300, 0.08, 0.09, 'sine', 0.035, { to: 1500, glide: 0.07 }); tone(c, 1900, 0.18, 0.06, 'triangle', 0.025, { to: 2800, glide: 0.04 }); },
  page: c => { hiss(c, 0, 0.06, 0.015, { f: 3200, q: 1.4 }); tone(c, 1900, 0, 0.04, 'sine', 0.01); },
  flip: c => tone(c, 1100, 0, 0.07, 'sine', 0.025, { to: 1650, glide: 0.05 }),
  quest: c => { bell(c, 1318.5, 0, 0.5, 0.045); bell(c, 1760, 0.11, 0.7, 0.045); },
  coin: c => { bell(c, 1975.5, 0, 0.25, 0.03, { ratio: 2.4 }); bell(c, 2637, 0.06, 0.35, 0.03, { ratio: 2.4 }); },
  chest: c => { hiss(c, 0, 0.35, 0.03, { type: 'lowpass', f: 500, to: 1400, q: 4 }); [1975.5, 2349, 2637, 2093, 3136].forEach((f, i) => bell(c, f, 0.32 + i * 0.09, 0.4, 0.028, { ratio: 2.4 })); tone(c, 523.25, 0.3, 0.9, 'triangle', 0.03); },
  badge: c => { [1568, 2093, 2637, 3136].forEach((f, i) => bell(c, f, i * 0.07, 0.8, 0.03)); tone(c, 392, 0.05, 1.0, 'sine', 0.03, { attack: 0.1 }); hiss(c, 0, 0.6, 0.01, { type: 'highpass', f: 7000, attack: 0.2 }); },
  streak: c => { hiss(c, 0, 0.45, 0.03, { f: 200, to: 1800, q: 1.2, attack: 0.15 }); tone(c, 330, 0.05, 0.4, 'triangle', 0.035, { to: 660, glide: 0.35 }); },
  ding: c => { bell(c, 1318.5, 0, 0.7, 0.05, { ratio: 2, index: 1.4 }); bell(c, 1318.5, 0.2, 0.9, 0.05, { ratio: 2, index: 1.4 }); },
  open: c => { hiss(c, 0, 0.3, 0.022, { f: 600, to: 2200, attack: 0.08 }); tone(c, 392, 0.02, 0.18, 'sine', 0.028, { to: 587, glide: 0.15 }); },
  close: c => hiss(c, 0, 0.22, 0.018, { f: 1800, to: 500, attack: 0.04 })
};
function playSound(name, vol){
  try {
    const c = sfxCtx(); if (!c || !SOUNDS[name]) return;
    SFX.master.gain.setValueAtTime(Math.max(0.0001, (vol == null ? 1 : vol) * 1.2), c.currentTime);
    SOUNDS[name](c);
  } catch (e) {}
}
function sfx(name, vol){ if (S.settings.sfx) playSound(name, (S.settings.sfxVol == null ? 0.8 : S.settings.sfxVol) * (vol || 1)); }

/* ----- music: a tiny sequencer (used by the intro film) ----- */
const Music = { nodes: [], bus: null };
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n){ const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 440; const semi = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; return 440 * Math.pow(2, (semi - 69) / 12); }
function musicStop(){
  for (const n of Music.nodes){ try { n.stop(0); } catch (e) {} }
  Music.nodes = [];
  if (Music.bus){ try { Music.bus.disconnect(); } catch (e) {} Music.bus = null; }
}
/* score: [{t, kind: bass|pad|lead|bell|hat|kick, n: 'C4' or f, d, g}] in seconds; plays from `from` */
function musicPlay(score, from, volume){
  const c = sfxCtx(); if (!c) return;
  musicStop();
  const bus = c.createGain(); bus.gain.value = volume; bus.connect(c.destination); Music.bus = bus;
  for (const ev of score){
    if (ev.t + (ev.d || 0.1) < from) continue;
    const at = Math.max(0, ev.t - from) + 0.04; const f = typeof ev.n === 'number' ? ev.n : noteFreq(ev.n || 'C4'); const d = ev.d || 0.3;
    let nodes = [];
    if (ev.kind === 'bass') nodes = [tone(c, f, at, d, 'triangle', ev.g || 0.07, { dest: bus, attack: 0.01 })];
    else if (ev.kind === 'pad') nodes = [tone(c, f, at, d, 'sine', ev.g || 0.02, { dest: bus, attack: 0.25 })];
    else if (ev.kind === 'lead') nodes = [tone(c, f, at, d, 'triangle', ev.g || 0.032, { dest: bus, attack: 0.015 }), tone(c, f * 2, at, d * 0.8, 'sine', (ev.g || 0.032) * 0.3, { dest: bus })];
    else if (ev.kind === 'bell') nodes = [bell(c, f, at, d, ev.g || 0.035, { dest: bus })];
    else if (ev.kind === 'hat') nodes = [hiss(c, at, 0.05, ev.g || 0.012, { type: 'highpass', f: 7500, dest: bus })];
    else if (ev.kind === 'kick') nodes = [tone(c, 140, at, 0.22, 'sine', ev.g || 0.09, { to: 45, glide: 0.14, dest: bus, attack: 0.004 })];
    Music.nodes.push(...nodes);
  }
}
function musicVolume(v){ if (Music.bus && SFX.ctx) Music.bus.gain.setTargetAtTime(v, SFX.ctx.currentTime, 0.05); }

/* ----- the theme song (MEDIA.song in config.js) -----
   One audio file shared by the intro film and the tabs. It is fetched once and played from a local copy. On iPhone and
   iPad its volume runs through Web Audio (the only way to set volume there); elsewhere the element's own volume is used
   (see songRoute). If the local copy isn't possible it plays the file directly. Modes: 'off', 'home' (loops softly behind the tabs), 'film' (the intro film drives it). */
const Song = { el: null, url: '', local: false, routed: false, volFixed: null, gain: null, unlocked: false, failed: false, mode: 'off', vol: 0, duck: 1, ducks: 0, fetching: null, syncT: 0, stopT: 0, src: '' };
/* the file to use on this device: the first source the browser says it can play (or the first, if it won't say) */
function songSrc(){
  if (Song.src) return Song.src;
  const list = (MEDIA.song && MEDIA.song.sources) || [];
  let pick = list[0];
  try { const a = document.createElement('audio'); pick = list.find(x => a.canPlayType && a.canPlayType(x.type)) || list[0]; } catch (e) {}
  Song.src = pick ? pick.src : '';
  return Song.src;
}
function songPrefetch(){
  if (Song.fetching || !MEDIA.song) return Song.fetching;
  if (!window.fetch || !window.URL || !URL.createObjectURL){ Song.fetching = Promise.resolve(); return Song.fetching; }
  Song.fetching = fetch(songSrc()).then(r => { if (!r.ok) throw new Error('song ' + r.status); return r.blob(); })
    .then(b => { Song.url = URL.createObjectURL(b); if (Song.el && !Song.local) songUseLocal(); })
    .catch(() => {});
  return Song.fetching;
}
function songEl(){
  if (Song.el || Song.failed || !MEDIA.song) return Song.el;
  try {
    const a = new Audio(); a.preload = 'auto'; a.loop = true; a.setAttribute('playsinline', '');
    a.addEventListener('error', () => {
      if (Song.local && !Song.routed){ Song.local = false; Song.url = ''; a.src = songSrc(); return; } // local copy refused: play the file itself
      Song.failed = true; Song.mode = 'off';
      if (typeof Film !== 'undefined' && Film.open && Film.playing && !Film.muted){ Film.usingSong = false; musicPlay(Film.score, Film.t, filmVol()); }
    });
    a.addEventListener('canplay', () => { if (Song.local) songRoute(); });
    Song.el = a;
    if (Song.url) songUseLocal(); else a.src = songSrc();
  } catch (e) { Song.failed = true; Song.el = null; }
  return Song.el;
}
function songUseLocal(){
  const a = Song.el; if (!a || !Song.url) return;
  const t = a.currentTime || 0, playing = !a.paused;
  Song.local = true; a.src = Song.url;
  if (t > 0 || playing){ const go = () => { a.removeEventListener('loadedmetadata', go); try { a.currentTime = t; } catch (e) {} if (playing) songPlayEl(); }; a.addEventListener('loadedmetadata', go); }
}
/* iPhone and iPad ignore an audio element's volume, so there the song plays through Web Audio to be turned up and down.
   Everywhere else the element's own volume does the job and the song stays out of Web Audio: on Android, a song running
   through Web Audio could keep the speaking voice from being heard. */
function songVolumeFixed(){
  if (Song.volFixed == null){ try { const a = document.createElement('audio'); a.volume = 0.5; Song.volFixed = Math.abs(a.volume - 0.5) > 0.01; } catch (e) { Song.volFixed = true; } }
  return Song.volFixed;
}
function songRoute(){
  if (Song.routed || !Song.el || !songVolumeFixed()) return;
  const c = sfxCtx(); if (!c || !c.createMediaElementSource) return;
  try {
    const src = c.createMediaElementSource(Song.el); Song.gain = c.createGain(); Song.gain.gain.value = songLevel();
    src.connect(Song.gain); Song.gain.connect(c.destination); Song.routed = true; Song.el.volume = 1;
  } catch (e) {}
}
function songLevel(){ return Math.max(0, Math.min(1, Song.vol * Song.duck)); }
function songApply(ramp){
  const v = songLevel();
  if (Song.routed && Song.gain && SFX.ctx){
    const g = Song.gain.gain, now = SFX.ctx.currentTime;
    try { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v, now + (ramp || 0.05)); } catch (e) { g.value = v; }
  } else if (Song.el){ try { Song.el.volume = v; } catch (e) {} }
}
function songPlayEl(){ try { const p = Song.el.play(); if (p && p.catch) p.catch(() => {}); return true; } catch (e) { return false; } }
function songSeek(at){
  const a = Song.el; if (!a) return;
  if (a.readyState >= 1){ try { a.currentTime = at; } catch (e) {} }
  else { const f = () => { a.removeEventListener('loadedmetadata', f); try { a.currentTime = at; } catch (e) {} }; a.addEventListener('loadedmetadata', f); }
}
/* start (or keep) playing at `vol`, fading over `ramp` seconds; `at` seeks first */
function songStart(at, vol, ramp){
  const a = songEl(); if (!a) return false;
  clearTimeout(Song.stopT); sfxCtx();
  if (at != null) songSeek(at);
  if (a.paused){ Song.vol = 0; songApply(0.01); }
  Song.vol = vol;
  const ok = songPlayEl(); songApply(ramp);
  return ok;
}
function songStop(ramp){
  const a = Song.el; if (!a) return;
  Song.vol = 0; songApply(ramp || 0.05);
  clearTimeout(Song.stopT);
  Song.stopT = setTimeout(() => { if (Song.vol === 0){ try { a.pause(); } catch (e) {} } }, (ramp || 0.05) * 1000 + 40);
}
/* a voice starts (on) or stops speaking: the song turns down under it (MEDIA.song.duck), then comes back up */
function songDuck(on){
  Song.ducks = Math.max(0, Song.ducks + (on ? 1 : -1));
  const d = Song.ducks && MEDIA.song ? MEDIA.song.duck : 1;
  if (d !== Song.duck){ Song.duck = d; if (Song.mode !== 'off') songApply(on ? 0.15 : 0.6); }
}
/* browsers only let audio start after a tap: the first tap plays the element silently so it can start later */
function songUnlock(){
  if (Song.unlocked || !MEDIA.song) return;
  const a = songEl(); if (!a) return;
  Song.unlocked = true;
  if (!a.paused) return;
  try {
    a.muted = true;
    const p = a.play();
    const done = () => { if (Song.mode === 'off'){ try { a.pause(); } catch (e) {} } a.muted = false; };
    if (p && p.then) p.then(done, () => { a.muted = false; Song.unlocked = false; }); else done();
  } catch (e) { a.muted = false; Song.unlocked = false; }
}
function songGesture(){
  if (SFX.ctx && SFX.ctx.state !== 'running') SFX.ctx.resume().catch(() => {});
  if (!Song.unlocked && homeMusicOn()){ songUnlock(); songSync(450); }
}
document.addEventListener('pointerdown', songGesture, { capture: true });
document.addEventListener('keydown', songGesture, { capture: true });
/* home music: loops on every tab (Learn, Stories, Review, Talk, Friends, Me) while no lesson, review, story, chat or film is
   open, the page is visible and the setting is on. Switching tabs leaves it playing where it is; a lesson pauses it, and it
   picks up from the same spot afterwards. A speaking voice turns it down. */
function musicVol(){ return S.settings.musicVol == null ? 0.6 : S.settings.musicVol; }
function homeMusicOn(){ return !!(MEDIA.song && S.settings.homeMusic && musicVol() > 0); }
function homeVol(){ return musicVol() * MEDIA.song.home; }
function homeMusicWanted(){ return homeMusicOn() && Song.unlocked && !Song.failed && typeof UI !== 'undefined' && !busy() && !document.hidden; }
function songSync(delay){ clearTimeout(Song.syncT); Song.syncT = setTimeout(songSyncNow, delay == null ? 150 : delay); }
function songSyncNow(){
  if (typeof Film !== 'undefined' && Film.open){ if (Song.mode === 'home'){ Song.mode = 'off'; songStop(0.3); } return; } // the film drives the song while it is open
  if (homeMusicWanted()){
    if (Song.mode !== 'home'){ Song.mode = 'home'; if (Song.el) Song.el.loop = true; songStart(null, homeVol(), 1.2); }
    else if (Song.el && Song.el.paused) songStart(null, homeVol(), 0.8);
    else { Song.vol = homeVol(); songApply(0.3); }
  } else if (Song.mode === 'home'){ Song.mode = 'off'; songStop(0.5); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) songSyncNow(); else songSync(300); });

/* ----- speech recognition (works only where the browser and page allow the mic) ----- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const Mic = { state: SR ? 'unknown' : 'none' };
function micUsable(){ return Mic.state === 'unknown' || Mic.state === 'ok'; }
function listen(lang, onInterim){
  return new Promise((resolve, reject) => {
    if (!SR){ reject('none'); return; }
    let r; try { r = new SR(); } catch (e) { Mic.state = 'blocked'; reject('blocked'); return; }
    r.lang = LANGS[lang].tts; r.interimResults = true; r.maxAlternatives = 3; r.continuous = false;
    let finalText = '', settled = false;
    r.onresult = ev => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++){ const res = ev.results[i]; if (res.isFinal) finalText += res[0].transcript; else interim += res[0].transcript; }
      if (onInterim) onInterim(finalText + interim);
    };
    r.onerror = ev => { const er = ev && ev.error; if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(er)) Mic.state = 'blocked'; if (!settled){ settled = true; reject(er || 'error'); } };
    r.onend = () => { if (!settled){ settled = true; if (finalText.trim()){ Mic.state = 'ok'; resolve(finalText.trim()); } else reject('no-speech'); } };
    try { r.start(); } catch (e) { Mic.state = 'blocked'; settled = true; reject('blocked'); }
    listen.stop = () => { try { r.stop(); } catch (e) {} };
  });
}

