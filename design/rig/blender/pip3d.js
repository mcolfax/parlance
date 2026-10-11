"use strict";
/* ===================== PIP 3D =====================
   Plays Pip's Blender rig with three.js. blender/pip.blend is the source; its glTF export (pip.gltf.json) carries
   the meshes, the bones, every mood and move as an animation, and the settings this player needs. The player:
   - cross-fades moods and layers moves (hop, nod…) on top,
   - switches drawings (eyes, mouths, wing shapes) at the right moment of a fade,
   - and runs the live parts: breathing, blinks, quick glances, looking at a point, talking, and spring
     follow-through on the crest, tail and wing tips.
   Classic script. three.js loads on first use from jsdelivr (or opts.three / opts.loader); the page maps 'three' in an
   import map, or the player adds one.
     const pip = await Pip3D.create(el, { src: 'pip.gltf.json', mood: 'happy' });
     pip.set('cheer'); pip.play('hop'); pip.look(0.5, -0.2); pip.say('Hallo!'); pip.talking(true); pip.destroy();
   ================================================== */
const Pip3D = (() => {
  const VERSION = '0.185.0';
  const CDN = 'https://cdn.jsdelivr.net/npm/three@' + VERSION + '/';
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const RMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(RMQ && RMQ.matches);
  const HIDE = 1e-4;
  const SWITCH = { wingL: 0.62, wingR: 0.62, legL: 0.5, legR: 0.5 };   // how far into a fade each slot switches drawing

  /* three.js's loader imports 'three' by name, so the page needs an import map for it. The review page has one;
     on a page without one, it is added here before the first module loads. */
  let libs = null;
  const lib = o => {
    if (libs) return libs;
    const three = o.three || CDN + 'build/three.module.min.js';
    if (typeof document !== 'undefined' && !document.querySelector('script[type="importmap"]')) {
      const im = document.createElement('script'); im.type = 'importmap';
      im.textContent = JSON.stringify({ imports: { three } });
      document.head.append(im);
    }
    return (libs = Promise.all([import(three), import(o.loader || CDN + 'examples/jsm/loaders/GLTFLoader.js')])
      .then(([T, L]) => ({ T, GLTFLoader: L.GLTFLoader })));
  };
  /* The rig ships as glTF JSON with its binary buffer embedded (a plain .json publishes anywhere). It is rebuilt
     into a GLB in memory, so loading never fetches a data: URI. */
  function toGLB(buf) {
    const u8 = new Uint8Array(buf);
    if (u8[0] === 0x67 && u8[1] === 0x6C && u8[2] === 0x54 && u8[3] === 0x46) return buf;   // already a GLB
    const json = JSON.parse(new TextDecoder().decode(u8));
    const uri = json.buffers && json.buffers[0] && json.buffers[0].uri;
    if (!uri || !uri.startsWith('data:')) return buf;
    const raw = atob(uri.slice(uri.indexOf(',') + 1)), bin = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
    delete json.buffers[0].uri;
    const js = new TextEncoder().encode(JSON.stringify(json));
    const jl = (js.length + 3) & ~3, bl = (bin.length + 3) & ~3;
    const out = new Uint8Array(28 + jl + bl), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
    dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20); out.fill(0x20, 20 + js.length, 20 + jl);
    dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); out.set(bin, 28 + jl);
    return out.buffer;
  }
  const files = new Map();
  const fetchFile = src => {
    if (!files.has(src)) files.set(src, fetch(src).then(r => { if (!r.ok) throw new Error('Pip3D: ' + r.status + ' for ' + src); return r.arrayBuffer(); }).then(toGLB));
    return files.get(src);
  };

  /* one animation frame loop for every Pip on the page; Pips off screen or in a hidden tab sleep */
  const live = new Set();
  let raf = 0, lastT = 0;
  const tick = now => {
    raf = 0;
    const t = now / 1000, dt = lastT ? Math.min(t - lastT, 0.1) : 1 / 60;
    lastT = t;
    for (const p of live) if (p._awake()) p._frame(dt);
    if (live.size) raf = requestAnimationFrame(tick); else lastT = 0;
  };
  const wake = () => { if (!raf && live.size) raf = requestAnimationFrame(tick); };

  /* text -> viseme keys [[t, mouth drawing]]: vowels open the beak, m/b/p close it */
  function visemes(V, text, rate) {
    const out = [], per = 1 / (13 * (rate || 1));
    let t = 0, prev = null;
    for (const ch of String(text).toLowerCase()) {
      let v;
      if ('aáàâä'.includes(ch)) v = V.a; else if ('eéèêiíïy'.includes(ch)) v = V.e; else if ('oóòôöuúùûü'.includes(ch)) v = V.o;
      else if ('mbp'.includes(ch)) v = V.m; else if ('fvw'.includes(ch)) v = V.f; else if (/\s/.test(ch)) v = V.rest;
      else if (/[.,!?¡¿;:…]/.test(ch)) { out.push([t, V.rest]); t += per * 3; prev = V.rest; continue; } else v = V.c || V.e;
      if (v !== prev) out.push([t, v]);
      prev = v; t += per;
    }
    out.push([t, V.rest]);
    return { keys: out, dur: t + 0.05 };
  }
  const step = (keys, t) => { let v = keys[0][1]; for (const k of keys) if (t >= k[0]) v = k[1]; return v; };

  async function create(el, opts = {}) {
    const { T, GLTFLoader } = await lib(opts);
    const buf = await fetchFile(opts.src || 'pip.gltf.json');
    const gltf = await new GLTFLoader().parseAsync(buf.slice(0), '');
    const root = gltf.scene;
    const cfg = JSON.parse(root.userData.pip3d);
    const U = cfg.unit;                                   // metres per part-sheet unit
    const scene = new T.Scene();
    scene.add(root);

    /* flat colors, as drawn: depth keeps the draw order */
    root.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material, a = m.opacity == null ? 1 : m.opacity, tr = m.transparent || a < 1;
      o.material = new T.MeshBasicMaterial({ color: m.color, transparent: tr, opacity: a, depthWrite: !tr, side: T.DoubleSide });
      o.frustumCulled = false;
    });

    /* camera framing the rig's view box (x 120 / ground y 250 of the part sheet are the origin) */
    let view = opts.view || cfg.view;
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
    cam.position.set(0, 0, 5);
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    function fit() {
      const [vx, vy, vw, vh] = view;
      const w = el.clientWidth || 200, h = el.clientHeight || Math.round(w * vh / vw);
      renderer.setPixelRatio(Math.min(opts.pixelRatio || globalThis.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      let l = (vx - 120) * U, r = (vx + vw - 120) * U, t = (250 - vy) * U, b = (250 - vy - vh) * U;
      const want = w / h, have = (r - l) / (t - b);
      if (want > have) { const ex = ((t - b) * want - (r - l)) / 2; l -= ex; r += ex; } else { const ey = ((r - l) / want - (t - b)) / 2; b -= ey; t += ey; }
      Object.assign(cam, { left: l, right: r, top: t, bottom: b }); cam.updateProjectionMatrix();
      api.dirty = true;
    }

    /* bones, their rest pose, and the show bones that switch drawings */
    const node = n => root.getObjectByName(n);
    const bones = {};
    for (const id in cfg.bones) bones[id] = node(id);
    const rest = new Map();
    root.traverse(o => rest.set(o, [o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
    const show = {};
    for (const sid in cfg.slots) for (const a of cfg.slots[sid].atts) { const b = node('show_' + sid + '_' + a); if (b) (show[sid] = show[sid] || {})[a] = b; }
    const S = {};                                          // the drawing each slot shows
    for (const sid in cfg.slots) S[sid] = cfg.slots[sid].att;
    const applySlots = st => { for (const sid in show) for (const a in show[sid]) show[sid][a].scale.setScalar(a === st[sid] ? 1 : HIDE); };

    /* animations: moods play whole; moves are made additive and layer on top. Drawing switches are handled here,
       at a set point in each fade, so two eyes never show at half size. */
    const mixer = new T.AnimationMixer(root);
    const clips = {}, moves = {};
    for (const c0 of gltf.animations) { const c = c0.clone(); c.tracks = c.tracks.filter(t => !t.name.startsWith('show_')); clips[c.name] = c; }
    for (const k in cfg.moves) if (clips['move_' + k]) moves[k] = T.AnimationUtils.makeClipAdditive(clips['move_' + k].clone(), 0);

    /* bones the live layers move. three.js writes an animated value only when it changes, so each frame these
       bones go back to what the animation last gave them (not to rest), then the live offsets go on top. */
    const touched = new Set(), base = new Map();
    const T_ = b => { if (b && !touched.has(b)) { touched.add(b); base.set(b, [b.position.clone(), b.quaternion.clone(), b.scale.clone()]); } return b; };
    for (const id of ['body', 'head', 'wingL', 'wingR', 'jaw', 'root'].concat(cfg.look.pupils, cfg.look.brows)) T_(bones[id]);
    const add = (b, ch, v) => {
      if (!b) return;
      if (ch === 'x') b.position.x += v * U; else if (ch === 'y') b.position.y -= v * U;
      else if (ch === 'r') b.rotateZ(-v * DEG); else if (ch === 'sx') b.scale.x *= 1 + v; else if (ch === 'sy') b.scale.y *= 1 + v;
    };

    /* springs: the crest feathers and tail swing after the body moves; the bend bones of the feathers, tail and wing
       tips lag a little more, so they curve */
    const springs = [];
    root.updateMatrixWorld(true);
    const springOn = (b, tipLocal, s) => { T_(b); springs.push(Object.assign({ b, tip: tipLocal, q: null, v: new T.Vector2(), k: 160, d: 12, limit: 24, squash: 0 }, s)); };
    for (const id in cfg.springs) {
      const s = cfg.springs[id], b = bones[id]; if (!b) continue;
      const n = Math.hypot(s.dir[0], s.dir[1]) || 1;
      const p = b.getWorldPosition(new T.Vector3());
      const tipW = new T.Vector3(p.x + s.dir[0] / n * s.len * U, p.y - s.dir[1] / n * s.len * U, p.z);
      springOn(b, b.worldToLocal(tipW.clone()), { k: s.k, d: s.d, limit: s.limit, squash: s.squash || 0, len: s.len * U });
    }
    root.traverse(o => {
      if (!o.isBone || !/_(bend|folded|spread)_[23]$/.test(o.name)) return;
      // the bone's tip: its child bone, or (the last bone of a chain) as far along as its parent is long
      const c = o.children.find(x => x.isBone);
      const here = o.getWorldPosition(new T.Vector3());
      const len = c ? c.getWorldPosition(new T.Vector3()).distanceTo(here) : here.distanceTo(o.parent.getWorldPosition(new T.Vector3()));
      springOn(o, c ? o.worldToLocal(c.getWorldPosition(new T.Vector3())) : new T.Vector3(0, len, 0), { k: 230, d: 15, limit: 16, len });
    });

    /* state */
    let action = null, mood = null, moodT = 0, fade = 0, from = null;
    let time = 0, blinkAt = 1 + Math.random() * 2, blinkT = -1, glanceAt = 2, glance = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    let lookTarget = null, talk = null, babble = false, babbleNext = 0, babbleV = null;
    const layered = new Set();
    const slotsAt = (name, t) => {
      const m = cfg.moods[name], out = {};
      const lt = m.loop ? t % (m.dur || 1) : t;
      for (const sid in m.slots) out[sid] = step(m.slots[sid], lt);
      return out;
    };

    function set(name, o = {}) {
      const m = cfg.moods[name], clip = clips[name];
      if (!m || !clip) return api;
      const a = mixer.clipAction(clip);
      a.reset();
      a.setLoop(m.loop ? T.LoopRepeat : T.LoopOnce, Infinity);
      a.clampWhenFinished = true;
      fade = o.dur == null ? (action ? 0.32 : 0) : o.dur;
      if (reduced()) { a.time = m.loop ? 0 : clip.duration; a.paused = true; fade = 0; }
      if (action && action !== a && fade > 0) { a.play(); action.crossFadeTo(a, fade, false); }
      else { if (action && action !== a) action.stop(); a.play(); }
      from = mood ? slotsAt(mood, moodT) : null;
      action = a; mood = name; moodT = 0;
      api.dirty = true; wake();
      return api;
    }
    function play(name, o = {}) {
      const clip = moves[name];
      if (!clip || reduced()) return api;
      const a = mixer.clipAction(clip);
      a.reset(); a.setLoop(o.loop ?? cfg.moves[name].loop ? T.LoopRepeat : T.LoopOnce, Infinity); a.clampWhenFinished = false;
      a.timeScale = o.speed || 1; a.play(); layered.add(a);
      api.dirty = true; wake();
      return api;
    }
    function stop(name) { for (const a of layered) if (a.getClip() === moves[name]) { a.fadeOut(0.18); layered.delete(a); } return api; }
    mixer.addEventListener('finished', e => { if (layered.has(e.action)) { e.action.stop(); layered.delete(e.action); } });

    function frame(dt) {
      time += dt; moodT += dt;
      const rm = reduced(), calm = rm || !!opts.calm;
      for (const b of touched) { const r = base.get(b); b.position.copy(r[0]); b.quaternion.copy(r[1]); b.scale.copy(r[2]); }
      mixer.update(rm ? 0 : dt);
      for (const b of touched) { const r = base.get(b); r[0].copy(b.position); r[1].copy(b.quaternion); r[2].copy(b.scale); }
      // drawings switch 30% into a fade; wing shapes wait until the wing is most of the way round
      const st = slotsAt(mood, moodT);
      if (from) for (const sid in st) if (moodT < fade * (SWITCH[sid] || 0.3)) st[sid] = from[sid];
      Object.assign(S, st);
      const m = cfg.moods[mood] || {};
      // breathing, a slow head drift, wing sway
      if (!calm) for (const id in cfg.idle) for (const ch in cfg.idle[id]) { const [a, per, off] = cfg.idle[id][ch]; add(bones[id], ch, a * Math.sin(time * TAU / per + (off || 0))); }
      // glances, or a point to look at
      if (!calm && m.glance !== false && !lookTarget) {
        if (time > glanceAt) { glance.tx = (Math.random() * 2 - 1) * 0.55; glance.ty = (Math.random() * 2 - 1) * 0.35; glance.until = time + 0.7 + Math.random() * 1.1; glanceAt = glance.until + 2.2 + Math.random() * 4; }
        if (time > glance.until) { glance.tx = 0; glance.ty = 0; }
      } else if (!lookTarget) { glance.tx = 0; glance.ty = 0; }
      const gk = Math.min(1, dt * 9);
      glance.x += ((lookTarget ? lookTarget.x : glance.tx) - glance.x) * gk;
      glance.y += ((lookTarget ? lookTarget.y : glance.ty) - glance.y) * gk;
      const L = cfg.look;
      for (const id of L.pupils) { add(bones[id], 'x', glance.x * L.x); add(bones[id], 'y', glance.y * L.y); }
      for (const id of L.brows) add(bones[id], 'y', glance.y * (L.brow || 1.5));
      if (lookTarget && L.head) add(bones[L.head], 'r', glance.x * (L.headR || 3));
      // blinks: the open eyes squash shut and swap to the blink drawing at the bottom
      if (!calm && m.blink !== false && blinkT < 0 && time > blinkAt) { blinkT = time; blinkAt = time + 2.2 + Math.random() * 3.8 + (Math.random() < 0.2 ? -1.9 : 0); }
      if (blinkT >= 0) {
        const u = (time - blinkT) / 0.17;
        if (u >= 1) blinkT = -1;
        else {
          const k = u < 0.4 ? 1 - u / 0.4 : (u - 0.4) / 0.6;
          for (const sid in cfg.slots) {
            const bl = cfg.slots[sid].blink;
            if (!bl || !bl.from.includes(S[sid])) continue;
            if (k < 0.35) S[sid] = bl.to; else { const b = bones[cfg.slots[sid].bone]; if (b) { T_(b); b.scale.y *= 0.2 + 0.8 * k; } }
          }
        }
      }
      // talking: a viseme script, or babble while a voice plays
      let mv = null;
      if (talk) { const lt = time - talk.t0; if (lt >= talk.dur) { const d = talk.done; talk = null; if (d) d(); } else if (lt >= 0) mv = step(talk.keys, lt); }
      else if (babble) { if (time >= babbleNext) { const V = cfg.visemes, pool = [V.a, V.e, V.o, V.e, V.m, V.a, V.rest]; babbleV = pool[Math.floor(Math.random() * pool.length)]; babbleNext = time + 0.07 + Math.random() * 0.09; } mv = babbleV; }
      if (mv != null) {
        const M = cfg.mouth;
        S[M.slot] = mv;
        if (M.beak) S[M.beak.slot] = M.beak.open.includes(mv) ? M.beak.openAtt : M.beak.closedAtt;
        if (M.jaw && M.jaw.drop[mv]) add(bones[M.jaw.bone], 'y', M.jaw.drop[mv]);
      }
      applySlots(S);
      // springs, last, on the posed skeleton
      root.updateMatrixWorld(true);
      if (!calm) for (const s of springs) {
        const P = s.b.getWorldPosition(new T.Vector3());
        const tip = s.tip.clone().applyMatrix4(s.b.matrixWorld);
        if (!s.q || dt > 0.09) { s.q = new T.Vector2(tip.x, tip.y); s.v.set(0, 0); }
        let rem = dt;
        while (rem > 1e-5) {
          const h = Math.min(rem, 1 / 120); rem -= h;
          const ax = s.k * (tip.x - s.q.x) - s.d * s.v.x, ay = s.k * (tip.y - s.q.y) - s.d * s.v.y;
          s.v.x += ax * h; s.v.y += ay * h; s.q.x += s.v.x * h; s.q.y += s.v.y * h;
        }
        let da = Math.atan2(s.q.y - P.y, s.q.x - P.x) - Math.atan2(tip.y - P.y, tip.x - P.x);
        da = ((da / DEG + 540) % 360 - 180);
        if (s.b.matrixWorld.determinant() < 0) da = -da;
        da = clamp(da, -s.limit, s.limit);
        s.b.rotateZ(da * DEG);
        if (s.squash) s.b.scale.y *= clamp(1 + (Math.hypot(s.q.x - P.x, s.q.y - P.y) / (s.len || 1) - 1) * s.squash, 0.8, 1.25);
        s.b.updateMatrixWorld(true);
      }
      renderer.render(scene, cam);
    }

    /* life cycle */
    let visible = true;
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => { for (const e of es) visible = e.isIntersecting; if (visible) wake(); }) : null;
    if (io) io.observe(el);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { fit(); if (!live.has(api)) frame(0); }) : null;
    if (ro) ro.observe(el);
    const api = {
      el, canvas, scene, camera: cam, renderer, mixer, cfg, dirty: true, speed: 1,
      get mood() { return mood; },
      moods: Object.keys(cfg.moods), moves: Object.keys(moves),
      set, play, stop,
      hop: () => play('hop'),
      look(x, y) { lookTarget = x == null ? null : { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; wake(); return api; },
      lookAtPoint(cx, cy) { const r = el.getBoundingClientRect(); if (!r.width) return api; return api.look((cx - (r.left + r.width / 2)) / (r.width * 0.9), (cy - (r.top + r.height * 0.4)) / (r.height * 0.7)); },
      say(text, o = {}) { const v = visemes(cfg.visemes, text, o.rate); talk = { keys: v.keys, t0: time + (o.delay || 0), dur: v.dur }; wake(); return new Promise(res => { talk.done = res; }); },
      talking(on) { babble = !!on; babbleNext = 0; if (!on) babbleV = null; wake(); return api; },
      pause() { live.delete(api); return api; },
      resume() { live.add(api); wake(); return api; },
      setView(v) { view = v || opts.view || cfg.view; fit(); return api; },
      snapshot(t) { if (t != null) { mixer.setTime(t); } frame(0); return canvas.toDataURL('image/png'); },
      destroy() { live.delete(api); if (io) io.disconnect(); if (ro) ro.disconnect(); mixer.stopAllAction(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); },
      _awake: () => visible && !(typeof document !== 'undefined' && document.hidden),
      _frame: dt => frame(dt * api.speed)
    };
    fit();
    set(opts.mood || 'happy', { dur: 0 });
    frame(0);
    if (opts.live !== false) { live.add(api); wake(); }
    return api;
  }

  /* still images of moods from one hidden renderer (a page can only keep a few WebGL canvases alive):
     [{ mood, t, view }] -> PNG data URLs. A mood is caught after its move, or a third of the way into a loop. */
  async function stills(items, opts = {}) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + (opts.width || 240) + 'px;height:' + (opts.height || 304) + 'px;pointer-events:none';
    document.body.append(host);
    const p = await create(host, Object.assign({}, opts, { live: false, calm: true }));
    const out = [];
    for (const it of items) {
      if (it.view) p.setView(it.view);
      p.set(it.mood, { dur: 0 });
      const m = p.cfg.moods[it.mood] || { dur: 0 };
      const t = it.t != null ? it.t : m.loop ? m.dur * 0.3 : m.dur + 0.05;
      for (let x = 0; x < t; x += 1 / 30) p._frame(1 / 30);
      p._frame(0);
      out.push(p.canvas.toDataURL('image/png'));
    }
    p.destroy(); host.remove();
    return out;
  }

  return { create, stills, version: VERSION };
})();
if (typeof module !== 'undefined') module.exports = Pip3D;
