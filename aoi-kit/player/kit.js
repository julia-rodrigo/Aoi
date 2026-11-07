// The scene kit: draws any frame of a video from its bundle.json (beats, words, mouth track).
// Same code for the preview (the sweatbox) and the render (frame by frame). Everything is a function of t.
(() => {
  const W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const VIDEO = params.get('video');
  const RENDER = params.has('render');
  let LANG = params.get('lang') || '';          // the voice; default: the video's master
  let SUBS = params.get('subs') || 'auto';     // subtitle language: auto (= TEXT), en, ja, off
  let TEXT = params.get('text') || 'en';
  // layer=host draws only Aoi and the subtitles on a clear frame (to lay her over a motion-engine render);
  // host=right|left|corner|... puts her in that place for every beat
  const LAYER = params.get('layer') || '', HOSTAT = params.get('host') || '';       // on-screen text language; English by default, whatever the voice (anime with subs)
  if (RENDER) document.body.classList.add('render');
  if (params.has('embed')) document.body.classList.add('embed');
  if (params.get('layer')) { document.body.classList.add('layer'); document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; }   // a layer: nothing behind the canvas   // inside another page (compare.html): canvas only
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');

  // ---------- look (a style in kit/styles/<id>.js can change any of it) ----------
  const C = {
    wallTop: '#f6f9ff', wallBot: '#e4ecfa', desk: '#ffffff', deskFront: '#e8eef8', deskEdge: '#d5def0',
    ink: '#18203a', muted: '#5d6787', line: '#dfe6f4', accent: '#2f5bff', cyan: '#2fd3ff', pink: '#ff7eb6',
    soft: '#eaf0ff', holo: '120,225,255', card: '#ffffff', bar: '#f3f6fc', num: '#a3acc6', code: '#18203a',
    hi: 'rgba(47,211,255,.30)', focus: 'rgba(47,211,255,.20)', shadow: 'rgba(40,60,120,.10)',
    subFill: 'rgba(255,255,255,.78)', subLine: 'rgba(47,91,255,.14)', subInk: '#1d2540',
    row: '#f1f4fb', onAcc: '#ffffff', ring: 'rgba(47,91,255,.16)',
  };
  const FONT = { title: 'Rounded', titleW: 800, body: 'RoundedM', bodyW: 500, label: 'Pixel', labelJA: 'PixelJA', labelUpper: true,
    mono: 'Mono', monoB: 'MonoB', italic: null };
  const F = {
    title: (px) => `${FONT.titleW} ${px}px ${FONT.title}, Rounded`, body: (px) => `${FONT.bodyW} ${px}px ${FONT.body}, RoundedM`,
    pixel: (px) => (LANG === 'ja' ? `${px + 4}px ${FONT.labelJA}, PixelJA` : `${px}px ${FONT.label}`), mono: (px) => `${px}px ${FONT.mono}, Mono`, monoB: (px) => `${px}px ${FONT.monoB}, MonoB`,
  };
  const DESK_Y = 870;
  const LAYOUT = {
    center: { x: 960, bottom: 848, s: 3 },
    left: { x: 520, bottom: 848, s: 3 },
    right: { x: 1400, bottom: 848, s: 3 },
    corner: { x: 1610, bottom: 872, s: 2 },
    hidden: null,
  };
  let S = {};                                  // the style
  const HOST = { mode: 'holo', glow: null, glowAlpha: .55, scan: true, fadeBottom: true, beam: true, wave: true, particles: 'holo', bob: 5 };
  const MOUTH = { c: null, m: 'mouth_mid', a: 'mouth_open', o: 'mouth_o', e: 'mouth_smile' };
  const MOOD = {
    neutral: null, happy: 'eyes_happy', wide: 'eyes_wide', surprised: 'eyes_wide', think: 'eyes_think',
    thinking: 'eyes_think', wink: 'eyes_wink', side: 'eyes_side', look: 'eyes_side', determined: 'eyes_determined',
  };
  const BLINKABLE = new Set([null, 'eyes_wide', 'eyes_side', 'eyes_determined']);

  // ---------- helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
  const easeInOut = (k) => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const easeBack = (k) => { k = clamp(k); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const enter = (lt, delay = 0, dur = .45) => clamp((lt - delay) / dur);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function card(x, y, w, h, o = {}) {
    if (S.card) { ctx.save(); S.card(KIT, x, y, w, h, o); ctx.restore(); return; }
    baseCard(x, y, w, h, o);
  }
  function baseCard(x, y, w, h, { r = 20, fill = C.card, stroke = C.line, shadow = true, lw = 2 } = {}) {
    ctx.save();
    if (shadow) { ctx.shadowColor = C.shadow; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; }
    rr(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    if (stroke) { ctx.save(); rr(x, y, w, h, r); ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); ctx.restore(); }
  }
  // wrap text; *word* = accent. Returns lines of [{t, hi}] runs.
  const CJK = /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/;
  const NOSTART = '、。，．！？!?,.)）」』ーっゃゅょぁぃぅぇぉッャュョァィゥェォ';
  // words for English; single characters for Japanese, with closing marks kept on the line before
  function splitRuns(str) {
    const out = [];
    for (const w of str.split(/(\s+)/)) {
      if (!w) continue;
      if (/^\s+$/.test(w) || !CJK.test(w)) { out.push(w); continue; }
      for (const p of w.match(/[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]|[^\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]+/g)) {
        if (out.length && p.length === 1 && NOSTART.includes(p) && !/^\s+$/.test(out.at(-1))) out[out.length - 1] += p;
        else out.push(p);
      }
    }
    return out;
  }
  function wrap(text, font, maxW) {
    ctx.font = font;
    const toks = [];
    text.split(/(\*[^*]+\*)/).forEach((part) => {
      const hi = part.startsWith('*') && part.endsWith('*') && part.length > 2;
      const body = hi ? part.slice(1, -1) : part;
      if (hi && CJK.test(body) && body.length <= 12) { toks.push({ t: body, hi }); return; }   // keep a short Japanese key phrase on one line
      splitRuns(body).forEach((w) => { if (w) toks.push({ t: w, hi }); });
    });
    const lines = [[]]; let lw = 0;
    for (const tk of toks) {
      ctx.font = tk.hi ? markFont(font) : font;          // italic key words are wider: measure them in their own face
      const w = ctx.measureText(tk.t).width;
      if (/^\s+$/.test(tk.t)) { if (lines.at(-1).length) { lines.at(-1).push(tk); lw += w; } continue; }
      if (lw + w > maxW && lines.at(-1).length && !/^[.,!?;:%)\]」』、。！？]/.test(tk.t)) { while (lines.at(-1).length && /^\s+$/.test(lines.at(-1).at(-1).t)) lines.at(-1).pop(); lines.push([]); lw = 0; }
      lines.at(-1).push(tk); lw += w;
    }
    return lines.filter((l) => l.length);
  }
  // the baseline that puts a line's capitals (or kanji) centred on y; descenders do not count
  function vmid(font, y, text = 'H') {
    ctx.font = font;
    const m = ctx.measureText(CJK.test(text) ? '国' : 'H');
    return y + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  }
  // *word* marks: 'box' (highlighter bar), 'italic' (italic accent face, Nick's motion look) or 'color'
  const markFont = (font) => (S.mark === 'italic' && FONT.italic ? font.replace(/^(\d+ )?(\d+px )/, `$2`).replace(/(\d+px )/, `$1${FONT.italic}, `) : font);
  function drawRuns(runs, x, y, font, color, align = 'left') {
    ctx.font = font; ctx.textBaseline = 'alphabetic';
    const widthOf = (r) => { ctx.font = r.hi ? markFont(font) : font; return ctx.measureText(r.t).width; };
    const total = runs.reduce((a, r) => a + widthOf(r), 0);
    let cx = align === 'center' ? x - total / 2 : x;
    const px = parseInt(font.match(/(\d+)px/)[1], 10);
    for (const r of runs) {
      const w = widthOf(r);
      ctx.font = r.hi ? markFont(font) : font;
      if (r.hi && r.t.trim() && (S.mark || 'box') === 'box') {
        ctx.fillStyle = C.hi;
        ctx.fillRect(Math.round(cx - 4), Math.round(y - px * .38), Math.round(w + 8), Math.round(px * .42));
      }
      if (S.textStroke) { ctx.lineJoin = 'round'; ctx.lineWidth = S.textStroke[1]; ctx.strokeStyle = S.textStroke[0]; ctx.strokeText(r.t, cx, y); }
      ctx.fillStyle = r.hi ? (C.mark || C.accent) : color;
      ctx.fillText(r.t, cx, y);
      cx += w;
    }
    ctx.font = font;
    return total;
  }
  function textBlock(text, x, y, { font, color = C.ink, maxW = 1100, lh = 1.18, align = 'left', lt = 99, stagger = .08 }) {
    const px = parseInt(font.match(/(\d+)px/)[1], 10);
    const lines = wrap(text, font, maxW);
    let shown = (S.text === 'type') ? Math.floor(Math.max(0, lt) * 38) : Infinity;
    lines.forEach((runs, i) => {
      if (S.text === 'type') {
        const out = [];
        for (const r of runs) { if (shown <= 0) break; out.push({ ...r, t: r.t.slice(0, shown) }); shown -= r.t.length; }
        drawRuns(out, x, y + i * px * lh, font, color, align);
        return;
      }
      const k = S.text === 'pop' ? easeBack(enter(lt, i * stagger, .35)) : easeOut(enter(lt, i * stagger, .4));
      ctx.save(); ctx.globalAlpha *= clamp(k);
      if (S.text === 'pop') { const cy = y + i * px * lh - px * .35; ctx.translate(x, cy); ctx.scale(k, k); ctx.translate(-x, -cy); }
      else ctx.translate(0, (1 - k) * 24);
      drawRuns(runs, x, y + i * px * lh, font, color, align);
      ctx.restore();
    });
    return lines.length * px * lh;
  }
  // pixel diamond bullet (a style can draw its own)
  function pixelGem(x, y, s, color) {
    if (S.bullet) { ctx.save(); S.bullet(KIT, x, y, s, color); ctx.restore(); return; }
    ctx.fillStyle = color;
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].forEach(([a, b]) => ctx.fillRect(x + a * s, y + b * s, s, s));
  }

  // ---------- languages ----------
  const LD = () => (B.langs && B.langs[LANG]) || { mouth: B.mouth, sections: B.sections, strings: {}, items: null, subs: [], sfx: B.sfx };
  const TD = () => (B.langs && B.langs[TEXT]) || LD();
  const tr = (s) => (s && TD().strings && TD().strings[s]) || s;
  const itemT = (b, i) => { const it = LD().items; return it ? it[b._i][i] : b.items[i].t; };
  const subsLang = () => (SUBS === 'auto' ? (B.captions ? TEXT : 'off') : SUBS);
  // the subtitle track: that language's text, timed to the voice that is playing
  const subsTrack = (sl) => { const v = B.langs && B.langs[LANG]; return v ? ((v.subsBy && v.subsBy[sl]) || (sl === LANG ? v.subs : null)) : null; };

  // ---------- data ----------
  let B, SPR, MAN, music, scene = {};
  const imgCache = {};
  const loadImg = (src) => imgCache[src] || (imgCache[src] = new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + src)); im.src = src;
  }));

  async function loadScript(src) {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); });
  }
  // a style can extend another; objects merge one level deep, functions replace
  async function loadStyle(id) {
    window.STYLES = window.STYLES || {};
    if (!window.STYLES[id]) await loadScript(`/kit/styles/${id}.js?${Date.now()}`);
    const st = window.STYLES[id];
    if (!st) throw new Error('style ' + id);
    const base = st.extends ? await loadStyle(st.extends) : {};
    const out = { ...base };
    for (const [k, v] of Object.entries(st)) out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object') ? { ...base[k], ...v } : v;
    return out;
  }
  async function applyStyle(id) {
    S = await loadStyle(id);
    Object.assign(C, S.palette || {});
    Object.assign(FONT, S.fonts || {});
    Object.assign(HOST, S.host || {});
    for (const [k, v] of Object.entries((S.host && S.host.layouts) || {})) LAYOUT[k] = v && { ...LAYOUT[k], ...v };
    if (!(S.host && S.host.layouts && S.host.layouts.cornerL)) LAYOUT.cornerL = { ...LAYOUT.corner, x: W - LAYOUT.corner.x };
    for (const [fam, v] of Object.entries(S.fontFiles || {})) {
      const [url, desc] = typeof v === 'string' ? [v, {}] : [v.url, v.desc || {}];
      const ff = new FontFace(fam, `url(${url})`, desc); await ff.load(); document.fonts.add(ff);
    }
    KIT.img = {};
    for (const [k, src] of Object.entries(S.images || {})) KIT.img[k] = await loadImg(src);
    if (S.setup) await S.setup(KIT);
  }

  async function load() {
    B = await (await fetch(`/videos/${VIDEO}/bundle.json?${Date.now()}`)).json();
    await applyStyle(params.get('style') || B.style || 'holo-desk');
    const cdir = `/kit/character/${B.character || 'aoi'}/sprites`;
    MAN = await (await fetch(`${cdir}/manifest.json`)).json();
    SPR = { base: await loadImg(`${cdir}/base.png`) };
    await Promise.all(Object.keys(MAN.parts).map(async (n) => { SPR[n] = await loadImg(`${cdir}/${n}.png`); }));
    for (const [pn, pv] of Object.entries(MAN.poses || {})) {
      SPR[`pose:${pn}`] = await loadImg(`${cdir}/poses/${pn}/base.png`);
      for (const part of Object.keys(pv.parts)) SPR[`pose:${pn}:${part}`] = await loadImg(`${cdir}/poses/${pn}/${part}.png`);
    }
    B.beats.forEach((b, i) => { b._i = i; });
    if (!LANG || (B.langs && (!B.langs[LANG] || B.langs[LANG].textOnly))) LANG = B.master || 'en';
    for (const b of B.beats) if (b.opts.src) b.img = await loadImg(b.opts.src);
    const has = (await fetch(`/videos/${VIDEO}/scene.js`, { method: 'HEAD' })).ok;
    if (has) try {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = `/videos/${VIDEO}/scene.js?${Date.now()}`; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      scene = window.SCENE || {};
    } catch { scene = {}; }
    // more scene files (videos/<v>/scenes/*.js, listed in the bundle by cues), in name order; each one adds to
    // window.SCENE.custom and may add SCENE.overlays (functions) and SCENE.preload (image paths, ready in KIT.img[path])
    for (const f of B.scenes || []) {
      await new Promise((res) => { const s = document.createElement('script'); s.src = `/videos/${VIDEO}/scenes/${f}?${Date.now()}`; s.onload = res; s.onerror = res; document.head.appendChild(s); });
    }
    scene = window.SCENE || {};
    await Promise.all((scene.preload || []).map(async (src) => { KIT.img[src] = await loadImg(src); }));
    await document.fonts.load(F.title(40)); await document.fonts.load(F.body(40)); await document.fonts.load(F.pixel(20));
    await document.fonts.load(F.mono(20)); await document.fonts.load(F.monoB(20));
    await document.fonts.load('20px PixelJA', 'アオイ'); await document.fonts.load(F.title(40), 'アオイ'); await document.fonts.load(F.body(40), 'アオイ');
    await document.fonts.load(F.pixel(24), 'Aa'); await document.fonts.load(F.pixel(24), 'アオイ');
    buildGlow();
  }

  // ---------- the host (Aoi) ----------
  const art = document.createElement('canvas');
  const actx = art.getContext('2d');
  const holo = document.createElement('canvas');
  const hctx = holo.getContext('2d');
  const glows = {};
  let thresh;

  function buildGlow() {
    art.width = MAN.width; art.height = MAN.height;
    thresh = new Float32Array(MAN.width * MAN.height).map((_, i) => hash(i * 0.731 + 3.3));
    for (const s of [2, 3]) {
      const g = document.createElement('canvas');
      const pad = 60;
      g.width = MAN.width * s + pad * 2; g.height = MAN.height * s + pad * 2;
      const gx = g.getContext('2d');
      gx.filter = 'blur(22px)';
      gx.drawImage(SPR.base, pad, pad, MAN.width * s, MAN.height * s);
      gx.filter = 'none';
      gx.globalCompositeOperation = 'source-in';
      gx.fillStyle = `rgb(${HOST.glow || C.holo})`; gx.fillRect(0, 0, g.width, g.height);
      glows[s] = { c: g, pad };
    }
  }
  // sticker: the silhouette grown by r px in the outline color (made once per scale)
  const stickers = {};
  function stickerOutline(s) {
    if (stickers[s]) return stickers[s];
    const r = HOST.outline || 10, pad = r + 4, w = MAN.width * s, h = MAN.height * s;
    const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
    const sx = sil.getContext('2d'); sx.imageSmoothingEnabled = false; sx.drawImage(SPR.base, 0, 0, w, h);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = HOST.outlineColor || '#fff'; sx.fillRect(0, 0, w, h);
    const c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2;
    const g = c.getContext('2d');
    for (let a = 0; a < 32; a++) g.drawImage(sil, pad + Math.cos(a / 32 * Math.PI * 2) * r, pad + Math.sin(a / 32 * Math.PI * 2) * r);
    g.drawImage(sil, pad, pad);
    return (stickers[s] = { c, pad });
  }

  function beatAt(t) {
    let k = 0;
    for (let i = 0; i < B.beats.length; i++) if (B.beats[i].start <= t) k = i;
    return k;
  }
  const sectionIndex = (t) => { let k = 0; (B.sections || []).forEach((s, i) => { if (s.start <= t + .01) k = i; }); return k; };
  // where Aoi stands for a beat. Content beats put her in a lower corner; with style.sides = 'alternate' she changes
  // side at every chapter. Storyboard: aoi=corner|corner-left|center|left|right|hidden, side=left|right.
  function layoutOf(b) {
    if (HOSTAT) return HOSTAT;
    if (b.opts.aoi) return b.opts.aoi === 'corner-left' ? 'cornerL' : b.opts.aoi;
    if (b.type === 'host') return b.opts.side === 'left' ? 'right' : (b.opts.side === 'right' || b.body.length) ? 'left' : 'center';
    if (b.opts.side === 'left') return 'cornerL';
    if (b.opts.side === 'right') return 'corner';
    if (S.sides === 'alternate') return sectionIndex(b.start) % 2 ? 'cornerL' : 'corner';
    return 'corner';
  }
  // the space content may use: everything not taken by Aoi, the section label or the subtitles
  function regionOf(lay) {
    const L = LAYOUT[lay], top = B.hud === false ? 70 : (S.regionTop ?? 130), bot = S.regionBottom ?? 950;   // no section label: content may go higher
    if (!L || lay === 'center') return { x: 120, y: top, w: W - 240, h: bot - top };
    const half = MAN.width * L.s / 2 * (S.hostWidth ?? .86), gap = S.regionGap ?? 70;
    if (L.x > W / 2) { const r = L.x - half - gap; return { x: 110, y: top, w: r - 110, h: bot - top }; }
    const l = L.x + half + gap; return { x: l, y: top, w: W - 110 - l, h: bot - top };
  }
  // presenting: when a content beat starts, she turns toward it for a moment (style.poses = true)
  function poseAt(t, b) {
    if (!S.poses || !MAN.poses || b.opts.pose === 'none') return null;
    const k = b._i, lay = layoutOf(b);
    if (!LAYOUT[lay] || lay === 'center' || (b.type === 'host' && !b.body.length) || b.end - b.start < 2.2) return null;
    const prev = k > 0 ? layoutOf(B.beats[k - 1]) : lay;
    const arrive = prev !== lay ? ((S.transition || 'dissolve') === 'cut' ? 0 : TRANS + .1) : .2;
    const t0 = b.start + arrive, t1 = Math.min(b.end - .3, t0 + (S.poseHold || 1.9));
    if (t < t0 || t >= t1) return null;
    const L = LAYOUT[lay], R = regionOf(lay), toward = (R.x + R.w / 2) < L.x ? 'l' : 'r';
    const kind = b.opts.pose || (hash(k * 3.7 + 1) > .5 ? 'present' : 'point');
    const name = `${kind}_${toward}`;
    return MAN.poses[name] ? { name, t0, t1 } : null;
  }
  // mouth + eyes at time t
  function face(t, b) {
    const M = LD().mouth;
    const step = Math.floor(t * M.fps);
    const m = MOUTH[M.shapes[step] || 'c'];
    let eyes = MOOD[b.opts.mood || 'neutral'] ?? null;
    // blinks: one every 2.6-5.2 s, two steps long
    let bt = 1.2, i = 0;
    while (bt < t + 1) { if (t >= bt && t < bt + 2 / 12) { if (BLINKABLE.has(eyes)) eyes = 'blink'; break; } bt += 2.6 + 2.6 * hash(++i); }
    const pose = poseAt(t, b);
    return { m, eyes, pose };
  }
  function composeArt(fc, dissolve) {
    actx.clearRect(0, 0, art.width, art.height);
    if (fc.pose) {                       // a pose has its own blink and mouth shapes; no mood eyes
      const pn = fc.pose.name, parts = MAN.poses[pn].parts;
      actx.drawImage(SPR[`pose:${pn}`], 0, 0);
      for (const n of [fc.eyes === 'blink' ? 'blink' : null, fc.m]) {
        if (!n || !parts[n]) continue;
        actx.drawImage(SPR[`pose:${pn}:${n}`], parts[n].x, parts[n].y);
      }
    } else {
      actx.drawImage(SPR.base, 0, 0);
      for (const n of [fc.eyes, fc.m]) {
        if (!n || !SPR[n]) continue;
        const p = MAN.parts[n];
        actx.drawImage(SPR[n], p.x, p.y);
      }
    }
    if (dissolve > 0) {
      const id = actx.getImageData(0, 0, art.width, art.height);
      const d = id.data;
      for (let i = 0; i < thresh.length; i++) if (thresh[i] < dissolve) d[i * 4 + 3] = 0;
      actx.putImageData(id, 0, 0);
    }
  }
  function drawHost(t, L, dissolve, glitch, fx = {}) {
    const s = L.s, w = MAN.width * s, h = MAN.height * s;
    const bob = Math.round(Math.sin(t * 1.7) * HOST.bob / 2) * 2;
    const x = Math.round(L.x - w / 2 + (fx.dx || 0)), y = Math.round(L.bottom - h + bob + (fx.dy || 0));
    const rect = { x, y, w, h, s };
    ctx.save();
    if (fx.scale !== undefined && fx.scale !== 1) { ctx.translate(L.x, L.bottom); ctx.scale(fx.scale, fx.scale); ctx.translate(-L.x, -L.bottom); }
    if (fx.alpha !== undefined) ctx.globalAlpha = fx.alpha;
    if (HOST.behind) { ctx.save(); HOST.behind(KIT, t, rect, L); ctx.restore(); }
    if (HOST.mode !== 'holo') {
      if (HOST.mode === 'sticker') {
        const o = stickerOutline(s);
        ctx.save();
        if (HOST.shadow !== false) { ctx.shadowColor = HOST.shadow || 'rgba(0,0,0,.25)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12; }
        ctx.drawImage(o.c, x - o.pad, y - o.pad);
        ctx.restore();
      } else if (HOST.shadow) {
        ctx.save(); ctx.shadowColor = HOST.shadow; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
        ctx.imageSmoothingEnabled = false; ctx.drawImage(art, x, y, w, h); ctx.restore();
      }
      if (HOST.glow) {
        const g = glows[s] || glows[3];
        ctx.save(); ctx.globalAlpha *= HOST.glowAlpha; ctx.drawImage(g.c, x - g.pad, y - g.pad, w + g.pad * 2, h + g.pad * 2); ctx.restore();
      }
      holo.width = w; holo.height = h;
      hctx.imageSmoothingEnabled = false;
      hctx.drawImage(art, 0, 0, w, h);
      if (HOST.fadeBottom === true) {
        hctx.globalCompositeOperation = 'destination-in';
        const fade = hctx.createLinearGradient(0, 0, 0, h);
        fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(.8, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
        hctx.fillStyle = fade; hctx.fillRect(0, 0, w, h);
        hctx.globalCompositeOperation = 'source-over';
      }
      if (HOST.tint) { hctx.globalCompositeOperation = 'source-atop'; hctx.fillStyle = HOST.tint; hctx.fillRect(0, 0, w, h); hctx.globalCompositeOperation = 'source-over'; }
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      if (HOST.clip) { HOST.clip(KIT, rect); ctx.clip(); }      // a style can keep her inside a window or panel
      ctx.drawImage(holo, x, y);
      ctx.restore();
      if (HOST.front) { ctx.save(); HOST.front(KIT, t, rect, L); ctx.restore(); }
      ctx.restore();
      return rect;
    }
    // glow
    const g = glows[s] || glows[3];
    const flick = .82 + .18 * hash(Math.floor(t * 12));
    ctx.save();
    ctx.globalAlpha *= HOST.glowAlpha * flick * (1 - dissolve);
    ctx.drawImage(g.c, x - g.pad, y - g.pad, w + g.pad * 2, h + g.pad * 2);
    ctx.restore();
    // sprite at display scale
    holo.width = w; holo.height = h;
    hctx.imageSmoothingEnabled = false;
    hctx.drawImage(art, 0, 0, w, h);
    if (HOST.fadeBottom) {
      hctx.globalCompositeOperation = 'destination-in';
      const fade = hctx.createLinearGradient(0, 0, 0, h);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(.74, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      hctx.fillStyle = fade; hctx.fillRect(0, 0, w, h);
    }
    hctx.globalCompositeOperation = 'source-atop';
    hctx.fillStyle = `rgba(${C.holo},.10)`;
    if (HOST.scan) for (let yy = 0; yy < h; yy += s * 2) hctx.fillRect(0, yy, w, s);
    const band = ((t * 260) % (h + 300)) - 150;
    const bg = hctx.createLinearGradient(0, band - 60, 0, band + 60);
    bg.addColorStop(0, `rgba(${C.holo},0)`); bg.addColorStop(.5, `rgba(${C.holo},.22)`); bg.addColorStop(1, `rgba(${C.holo},0)`);
    hctx.fillStyle = bg; hctx.fillRect(0, band - 60, w, 120);
    hctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= .96;
    if (glitch > 0) {
      const slices = 9;
      for (let i = 0; i < slices; i++) {
        const sy = Math.floor(h / slices * i), sh = Math.ceil(h / slices);
        const off = (hash(i + Math.floor(t * 30) * 13) - .5) * 60 * glitch;
        ctx.globalAlpha = .5; ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(holo, 0, sy, w, sh, x + off - 6 * glitch, y + sy, w, sh);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .96;
        ctx.drawImage(holo, 0, sy, w, sh, x + off, y + sy, w, sh);
      }
    } else {
      ctx.drawImage(holo, x, y);
    }
    ctx.restore();
    if (HOST.front) { ctx.save(); HOST.front(KIT, t, rect, L); ctx.restore(); }
    ctx.restore();
    return rect;
  }
  function particles(t, L, alpha) {
    const s = L.s;
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const sp = 40 + 50 * hash(i * 3.1), ph = hash(i * 7.7) * 10, span = 380 + 200 * hash(i);
      const k = ((t * sp / span + ph) % 1);
      const px = L.x + (hash(i * 1.3) - .5) * (MAN.width * s * .95) + Math.sin(t * 1.3 + i) * 10;
      const py = DESK_Y + 30 - k * span * s / 2.2;
      const sz = (hash(i * 5.5) > .7 ? 3 : 2) * s;
      ctx.globalAlpha = alpha * Math.sin(k * Math.PI) * .8;
      ctx.fillStyle = hash(i * 9.1) > .5 ? `rgb(${C.holo})` : '#ffffff';
      ctx.fillRect(Math.round(px / s) * s, Math.round(py / s) * s, sz, sz);
    }
    ctx.restore();
  }
  function levelAt(t) {
    const M = LD().mouth; const L = M.level; const k = Math.floor(t * M.level_fps);
    return L[Math.max(0, Math.min(L.length - 1, k))] || 0;
  }
  function phoneAndBeam(t, L, alpha, top) {
    const cx = L.x, py = DESK_Y + 84, pw = L.s === 3 ? 300 : 230, pd = 44;
    ctx.save();
    // beam from the phone screen up to the hologram
    ctx.globalCompositeOperation = 'source-over';
    const beamTop = top;
    const g = ctx.createLinearGradient(0, py, 0, beamTop);
    g.addColorStop(0, `rgba(${C.holo},${.55 * alpha})`); g.addColorStop(.5, `rgba(${C.holo},${.18 * alpha})`); g.addColorStop(1, `rgba(${C.holo},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - pw * .36, py); ctx.lineTo(cx + pw * .36, py);
    ctx.lineTo(cx + pw * 1.0, beamTop); ctx.lineTo(cx - pw * 1.0, beamTop); ctx.closePath(); ctx.fill();
    // phone lying on the desk (slight perspective): shadow, side, body, screen, glow spot
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(30,40,80,.20)';
    ctx.beginPath(); ctx.ellipse(cx, py + pd * .55, pw * .6, 14, 0, 0, Math.PI * 2); ctx.fill();
    const sk = pw * .07;
    const quad = (inset, yo = 0) => {
      ctx.beginPath();
      ctx.moveTo(cx - pw / 2 + sk + inset, py - pd / 2 + inset * .55 + yo); ctx.lineTo(cx + pw / 2 - sk - inset, py - pd / 2 + inset * .55 + yo);
      ctx.lineTo(cx + pw / 2 - inset, py + pd / 2 - inset * .55 + yo); ctx.lineTo(cx - pw / 2 + inset, py + pd / 2 - inset * .55 + yo); ctx.closePath();
    };
    ctx.fillStyle = '#c9d2e6'; quad(0, 6); ctx.fill();              // side edge
    ctx.fillStyle = '#141a2c'; quad(0); ctx.fill();                 // body
    const sg = ctx.createLinearGradient(0, py - pd / 2, 0, py + pd / 2);
    sg.addColorStop(0, `rgba(${C.holo},${.9 * alpha + .1})`); sg.addColorStop(1, `rgba(47,91,255,${.85 * alpha + .15})`);
    ctx.fillStyle = sg; quad(7); ctx.fill();                        // screen
    ctx.fillStyle = '#141a2c'; ctx.fillRect(cx - pw * .07, py - pd / 2 + 6, pw * .14, 4);   // speaker slot
    const spot = ctx.createRadialGradient(cx, py, 2, cx, py, pw * .45);
    spot.addColorStop(0, `rgba(255,255,255,${.85 * alpha})`); spot.addColorStop(.35, `rgba(${C.holo},${.45 * alpha})`); spot.addColorStop(1, `rgba(${C.holo},0)`);
    ctx.fillStyle = spot; ctx.beginPath(); ctx.ellipse(cx, py - 4, pw * .45, pd * .5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function waveBar(t, L, alpha, y) {
    const w = L.s === 3 ? 380 : 270, h = L.s === 3 ? 58 : 44, x = L.x - w / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = `rgba(${C.holo},.9)`; ctx.shadowBlur = 24;
    rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(30,80,200,.35)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${C.holo},.95)`; ctx.stroke();
    ctx.shadowBlur = 0;
    const n = 26, bw = 6, gap = (w - 60) / n;
    for (let i = 0; i < n; i++) {
      const mid = 1 - Math.abs(i - n / 2) / (n / 2);
      const lv = levelAt(t - Math.abs(i - n / 2) * .01);
      const jitter = .55 + .45 * hash(i * 3 + Math.floor(t * 15));
      const bh = Math.max(4, (h - 18) * clamp(lv * jitter * (.45 + .55 * mid)));
      const bx = x + 30 + i * gap;
      ctx.fillStyle = '#eafcff';
      ctx.fillRect(Math.round(bx), Math.round(y + h / 2 - bh / 2), bw, Math.round(bh));
    }
    ctx.restore();
  }

  // ---------- the room ----------
  function room(t) {
    if (S.room) { ctx.save(); S.room(KIT, t); ctx.restore(); return; }
    baseRoom(t);
  }
  function baseRoom(t) {
    const g = ctx.createLinearGradient(0, 0, 0, DESK_Y);
    g.addColorStop(0, C.wallTop); g.addColorStop(1, C.wallBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, DESK_Y);
    // faint pixel grid on the wall
    ctx.fillStyle = 'rgba(47,91,255,.045)';
    for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 2, DESK_Y);
    for (let y = 0; y < DESK_Y; y += 48) ctx.fillRect(0, y, W, 2);
    // slow floating squares
    for (let i = 0; i < 14; i++) {
      const s = 12 + 18 * hash(i * 2.2);
      const x = (hash(i) * W + t * (6 + 8 * hash(i * 4.4))) % (W + 60) - 30;
      const y = 80 + hash(i * 3.3) * (DESK_Y - 220) + Math.sin(t * .6 + i) * 14;
      ctx.fillStyle = i % 3 ? 'rgba(47,91,255,.06)' : 'rgba(255,126,182,.08)';
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, s, s);
    }
    // desk
    const d = ctx.createLinearGradient(0, DESK_Y, 0, H);
    d.addColorStop(0, '#ffffff'); d.addColorStop(1, '#eef2fa');
    ctx.fillStyle = d; ctx.fillRect(0, DESK_Y, W, H - DESK_Y);
    ctx.fillStyle = C.deskEdge; ctx.fillRect(0, DESK_Y, W, 3);
    ctx.fillStyle = 'rgba(40,60,120,.06)'; ctx.fillRect(0, DESK_Y - 18, W, 18);
  }
  function hud(t) {
    const secs = TD().sections || LD().sections || [];
    if (!secs.length || S.hud === false || B.hud === false) return;   // brief: section_label: off
    let k = 0; secs.forEach((s, i) => { if (s.start <= t) k = i; });
    if (S.hud) { ctx.save(); S.hud(KIT, t, secs, k); ctx.restore(); return; }
    // section progress: one pill per section
    const x0 = 60, y0 = 44, pw = 26, gap = 8;
    secs.forEach((s, i) => {
      ctx.fillStyle = i < k ? C.accent : i === k ? C.cyan : 'rgba(47,91,255,.16)';
      ctx.fillRect(x0 + i * (pw + gap), y0, pw, 8);
    });
    ctx.font = F.pixel(24); ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic';
    ctx.fillText(LANG === 'ja' || !FONT.labelUpper ? secs[k].title : secs[k].title.toUpperCase(), x0, y0 + 44);
  }

  // ---------- beat types ----------
  const TYPES = {};
  // the largest size (maxPx down to minPx) at which text wraps inside maxW and stays under maxH
  function fitText(text, fontFn, maxW, maxH, maxPx, minPx = 40, lh = 1.12) {
    let px = maxPx, lines;
    for (; px > minPx; px -= 4) { lines = wrap(text, fontFn(px), maxW); if (lines.length * px * lh <= maxH && lines.every((l) => lineW(l, fontFn(px)) <= maxW)) break; }
    lines = wrap(text, fontFn(px), maxW);
    return { px, lines, h: lines.length * px * lh };
  }
  const lineW = (runs, font) => runs.reduce((a, r) => { ctx.font = r.hi ? markFont(font) : font; return a + ctx.measureText(r.t).width; }, 0);
  TYPES.host = (lt, b) => {
    if (!b.body.length) return;
    const R = KIT.reg, text = b.body.map(tr).join(' ');
    const f = fitText(text, F.title, R.w, R.h * .7, S.hostMax || 96, 48, 1.18);
    textBlock(text, R.x, R.y + (R.h - f.h) / 2 + f.px * .85, { font: F.title(f.px), maxW: R.w, lt, lh: 1.18 });
  };
  TYPES.title = (lt, b) => {
    const R = KIT.reg, k = easeOut(enter(lt, 0, .35)), text = tr(b.body[0] || '');
    const f = fitText(text, F.title, R.w, R.h * .5, S.titleMax || 150, 64, 1.08);
    const sub = b.body.slice(1).map(tr).join(' ');
    const subPx = Math.round(f.px * .36), block = f.h + (sub ? subPx * 2.4 : 0);
    let y = R.y + (R.h - block) / 2 + f.px * .82;
    if (b.opts.label && S.label !== false) {
      ctx.save(); ctx.globalAlpha = k; ctx.font = F.pixel(34); ctx.fillStyle = C.accent;
      const lab = tr(String(b.opts.label));
      ctx.fillText(LANG === 'ja' || !FONT.labelUpper ? lab : lab.toUpperCase(), R.x + 4, y - f.px * .95); ctx.restore();
    }
    textBlock(text, R.x, y, { font: F.title(f.px), maxW: R.w, lt: lt - .08, lh: 1.08 });
    const uy = y + f.h - f.px * .82 + Math.max(24, f.px * .22);
    if (S.underline === false) { /* none */ } else if (S.underline) S.underline(KIT, R.x + 4, uy, easeOut(enter(lt, .25, .6)));
    else { const n = Math.floor(easeOut(enter(lt, .25, .6)) * 24); for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? C.cyan : C.accent; ctx.fillRect(R.x + 4 + i * 22, uy, 16, 10); } }
    if (sub) textBlock(sub, R.x + 4, uy + subPx * 2, { font: F.body(subPx), color: C.muted, maxW: R.w, lt: lt - .35 });
  };
  TYPES.big = (lt, b) => {
    const R = KIT.reg, text = b.body.map(tr).join(' ');
    const f = fitText(text, F.title, R.w, R.h * .8, b.opts.size ? +b.opts.size : (S.bigMax || 132), 56, 1.12);
    textBlock(text, R.x, R.y + (R.h - f.h) / 2 + f.px * .82, { font: F.title(f.px), maxW: R.w, lt, lh: 1.12 });
  };
  // marker in front of a list row: the style's own, a dot, nothing, or the pixel gem
  function marker(x, y, on) {
    if (S.bullet) return pixelGem(x - 12, y - 12, 8, on ? C.accent : C.cyan);
    if (S.marker === 'none') return;
    if (S.marker === 'dot') { ctx.fillStyle = on ? (S.list && S.list.style === 'rows' ? C.onAcc : C.accent) : C.muted; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); return; }
    pixelGem(x - 12, y - 12, 8, on ? C.accent : C.cyan);
  }
  // A list shows all its rows at once; rows she has not reached wait blurred and sharpen when she says them.
  // style.list: { style: 'cards' (one card a row) | 'rows' (rows inside one card), blur: true, r, gap }
  TYPES.list = (lt, b, t) => {
    const o = S.list || {}, R = KIT.reg;
    const head = tr(b.opts.title || b.body[0]);
    const n = b.items.length, gap = o.gap ?? 18;
    const hf = head ? fitText(head, F.title, R.w, 200, S.headMax || 92, 44, 1.08) : { px: 0, h: 0 };
    const headGap = head ? Math.max(36, hf.px * .5) : 0;
    const rowH = Math.min(o.rowH || 150, (R.h - hf.h - headGap - (o.style === 'rows' ? 48 : 0) - gap * (n - 1)) / Math.max(1, n));
    const blockH = hf.h + headGap + n * rowH + (n - 1) * gap + (o.style === 'rows' ? 48 : 0);
    const y0 = R.y + Math.max(0, (R.h - blockH) / 2), x = R.x + (o.style === 'rows' ? 24 : 0), w = R.w - (o.style === 'rows' ? 48 : 0);
    if (head) textBlock(head, R.x, y0 + hf.px * .82, { font: F.title(hf.px), maxW: R.w, lt, lh: 1.08 });
    const top = y0 + hf.h + headGap + (o.style === 'rows' ? 24 : 0);
    const appear = easeOut(enter(lt, .1, .45));
    let latest = -1; b.items.forEach((_, i) => { if (t >= itemT(b, i)) latest = i; });
    ctx.save(); ctx.globalAlpha *= appear; ctx.translate(0, (1 - appear) * 16);
    if (o.style === 'rows') card(R.x, top - 24, R.w, n * rowH + (n - 1) * gap + 48, { r: o.r ?? 28 });
    b.items.forEach((it, i) => {
      const y = top + i * (rowH + gap), reached = t >= itemT(b, i), on = i === latest;
      const k = reached ? easeOut(enter(t - itemT(b, i), 0, .35)) : 0;
      if (o.blur === false && !reached) return;
      ctx.save();
      const blur = o.blur === false ? 0 : 9 * (1 - k);
      if (blur > .3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.globalAlpha *= .45 + .55 * k;
      if (o.style === 'rows') { rr(x, y, w, rowH, o.rowR ?? 18); ctx.fillStyle = on ? C.accent : C.row; ctx.fill(); }
      else card(x, y, w, rowH, { r: o.r ?? 20, on, stroke: on ? C.accent : C.line, lw: on ? 3 : 2 });
      const label = tr(it.text), font = F.body(Math.round(clamp(rowH * .36, 26, 54)));
      const mx = x + Math.max(36, rowH * .38), tx = S.marker === 'none' && !S.bullet ? x + Math.max(30, rowH * .3) : mx + Math.max(34, rowH * .3);
      marker(mx, y + rowH / 2, on);
      const ink = o.style === 'rows' && on ? C.onAcc : C.ink;
      drawRuns(wrap(label, font, w - (tx - x) - 30)[0] || [], tx, vmid(font, y + rowH / 2, label), font, ink);
      ctx.restore();
    });
    ctx.restore();
  };
  // Steps as a track: a hairline with one node a step. The line fills to the step she is on; steps ahead wait blurred.
  // style.flow: { style: 'track' | 'cards', node, track, blur }
  TYPES.flow = (lt, b, t) => {
    const o = S.flow || {}, R = KIT.reg;
    const head = tr(b.opts.title || b.body[0]);
    const n = b.items.length;
    let latest = -1; b.items.forEach((_, i) => { if (t >= itemT(b, i)) latest = i; });
    const state = (i) => { const reached = t >= itemT(b, i); return { reached, on: i === latest, k: reached ? easeOut(enter(t - itemT(b, i), 0, .35)) : 0 }; };
    const blurOf = (k) => (o.blur === false ? 0 : 7 * (1 - k));
    const hf = head ? fitText(head, F.title, R.w, 200, S.headMax || 92, 44, 1.08) : { px: 0, h: 0 };
    const headGap = head ? Math.max(40, hf.px * .55) : 0;
    const vertical = o.dir === 'vertical' || (o.dir !== 'horizontal' && o.style !== 'cards' && R.w < R.h * 1.65);
    const bodyH = vertical ? R.h - hf.h - headGap : Math.min(R.h - hf.h - headGap, o.style === 'cards' ? 260 : 220);
    const blockH = hf.h + headGap + bodyH;
    const y0 = R.y + Math.max(0, (R.h - blockH) / 2);
    if (head) textBlock(head, R.x, y0 + hf.px * .82, { font: F.title(hf.px), maxW: R.w, lt, lh: 1.08 });
    const top = y0 + hf.h + headGap;
    const grow = easeInOut(enter(lt, .05, .6));
    ctx.lineCap = 'round';
    if (vertical) {
      const step = bodyH / n, cx = R.x + 44, r = Math.min(o.node || 20, step * .16), lw = o.track || 4;
      const ys = b.items.map((_, i) => top + step * (i + .5));
      // one full-width row a step: hairlines between them, a soft fill on the step she is on
      b.items.forEach((_, i) => {
        const yy = ys[i] - step / 2, show = clamp((grow * n) - i);
        if (show <= 0) return;
        ctx.save(); ctx.globalAlpha *= show;
        if (i === latest) { const k = easeOut(enter(t - itemT(b, i), 0, .3)); ctx.globalAlpha *= k; rr(R.x, yy + 5, R.w, step - 10, 16); ctx.fillStyle = C.row; ctx.fill(); }
        else if (i > 0 && i !== latest + 1) { ctx.fillStyle = C.line; ctx.fillRect(R.x + 96, yy, R.w - 96, 1.5); }
        ctx.restore();
      });
      ctx.strokeStyle = C.line; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(cx, ys[0]); ctx.lineTo(cx, ys[0] + (ys[n - 1] - ys[0]) * grow); ctx.stroke();
      if (latest >= 0) {
        const k = easeInOut(enter(t - itemT(b, latest), 0, .4)), py = lerp(latest > 0 ? ys[latest - 1] : ys[0], ys[latest], k);
        ctx.strokeStyle = C.accent; ctx.lineWidth = lw + 2; ctx.beginPath(); ctx.moveTo(cx, ys[0]); ctx.lineTo(cx, py); ctx.stroke();
      }
      const px = Math.round(Math.min(o.labelMax || 76, step * .52));
      b.items.forEach((it, i) => {
        if (ys[0] + (ys[n - 1] - ys[0]) * grow < ys[i] - 2) return;
        const { reached, on, k } = state(i);
        ctx.save();
        if (on) { ctx.fillStyle = C.ring || C.soft; ctx.beginPath(); ctx.arc(cx, ys[i], r + 12 * k, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = reached ? C.accent : C.card; ctx.strokeStyle = reached ? C.accent : C.line; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, ys[i], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const bl = blurOf(k); if (bl > .3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
        ctx.globalAlpha *= .4 + .6 * k;
        const label = tr(it.text), f = fitText(label, F.title, R.w - 110, step * .9, px, 28, 1.05);
        drawRuns(f.lines[0] || [], cx + r + 46, vmid(F.title(f.px), ys[i], label), F.title(f.px), reached ? C.ink : C.muted);
        ctx.restore();
      });
      return;
    }
    if (o.style === 'cards') {
      const gap = Math.max(36, R.w * .035), w = (R.w - gap * (n - 1)) / n, h = Math.min(bodyH, w * 1.05), y = top + (bodyH - h) / 2;
      const appear = easeOut(enter(lt, .1, .45));
      ctx.save(); ctx.globalAlpha *= appear;
      b.items.forEach((it, i) => {
        const { reached, on, k } = state(i), x = R.x + i * (w + gap);
        if (i > 0) {
          const ax = x - gap + 8, bx = x - 8, ay = y + h / 2;
          ctx.strokeStyle = reached ? C.accent : C.line; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.moveTo(bx - 9, ay - 8); ctx.lineTo(bx, ay); ctx.lineTo(bx - 9, ay + 8); ctx.stroke();
        }
        ctx.save();
        const bl = blurOf(k); if (bl > .3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
        ctx.globalAlpha *= .45 + .55 * k;
        card(x, y, w, h, { r: o.r ?? 22, on, fill: on ? C.soft : C.card, stroke: on ? C.accent : C.line, lw: on ? 3 : 2 });
        const label = tr(it.text), f = fitText(label, F.title, w - 28, h * .6, Math.min(52, w * .2), 22, 1.12);
        const cy = y + h / 2 - (f.lines.length - 1) * f.px * 1.12 / 2;
        f.lines.forEach((runs, j) => drawRuns(runs, x + w / 2, vmid(F.title(f.px), cy + j * f.px * 1.12, label), F.title(f.px), reached ? C.ink : C.muted, 'center'));
        ctx.restore();
      });
      ctx.restore();
      return;
    }
    const x0 = R.x + 40, x1 = R.x + R.w - 40, y = top + bodyH * .35, r = Math.min(o.node || 22, R.w / 55), lw = o.track || 4;
    const xs = b.items.map((_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1)));
    ctx.strokeStyle = C.line; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * grow, y); ctx.stroke();
    if (latest >= 0) {
      const k = easeInOut(enter(t - itemT(b, latest), 0, .4)), px = lerp(latest > 0 ? xs[latest - 1] : x0, xs[latest], k);
      ctx.strokeStyle = C.accent; ctx.lineWidth = lw + 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(px, y); ctx.stroke();
    }
    b.items.forEach((it, i) => {
      if (x0 + (x1 - x0) * grow < xs[i] - 2) return;
      const { reached, on, k } = state(i);
      ctx.save();
      if (on) { ctx.fillStyle = C.ring || C.soft; ctx.beginPath(); ctx.arc(xs[i], y, r + 12 * k, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = reached ? C.accent : C.card; ctx.strokeStyle = reached ? C.accent : C.line; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(xs[i], y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const bl = blurOf(k); if (bl > .3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
      ctx.globalAlpha *= .45 + .55 * k;
      const label = tr(it.text), room = n > 1 ? (x1 - x0) / (n - 1) - 18 : 600;
      let fs = o.label || 52; ctx.font = F.title(fs);
      while (fs > 24 && ctx.measureText(label).width > room) ctx.font = F.title(--fs);
      drawRuns([{ t: label, hi: false }], xs[i], y + r + fs * 1.4, F.title(fs), reached ? C.ink : C.muted, 'center');
      ctx.restore();
    });
  };
  function lineColor(s) {
    if (/^\s*#/.test(s)) return [C.accent, F.monoB(25)];
    if (/^\s*(\/\/|>)/.test(s)) return [C.muted, F.mono(25)];
    if (/^\s*[-*] /.test(s)) return [C.code, F.mono(25)];
    if (/^\s*\|/.test(s)) return [C.muted, F.mono(25)];
    return [C.code, F.mono(25)];
  }
  TYPES.screen = (lt, b, t) => {
    const lines = B.files[b.opts.file] || ['(file missing)'];
    const k = easeOut(enter(lt, 0, .4)), R = KIT.reg;
    const x = R.x - 10, y = R.y - 6, w = R.w + 20, h = R.h + 12;
    ctx.save(); ctx.globalAlpha = k; ctx.translate(x + w / 2, y + h / 2); ctx.scale(.96 + .04 * k, .96 + .04 * k); ctx.translate(-(x + w / 2), -(y + h / 2));
    card(x, y, w, h, { r: 18, screen: true });
    ctx.fillStyle = C.bar; rr(x, y, w, 58, 18); ctx.fill(); ctx.fillRect(x, y + 30, w, 28);
    ctx.fillStyle = C.line; ctx.fillRect(x, y + 58, w, 2);
    ['#ff7a7a', '#ffc65c', '#4fd18b'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + 26 + i * 26, y + 23, 14, 14); });
    ctx.font = F.mono(22); ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
    ctx.fillText(b.opts.title || b.opts.file, x + 120, y + 30);
    // focus: opts.focus, then items "- 12 @ words" move it; the scroll and highlight ease between focus points
    const LH = 40, top = y + 84, rows = Math.floor((h - 100) / LH);
    const pts = [{ t: b.start, f: String(b.opts.focus || '1') }, ...b.items.map((it, i) => ({ t: itemT(b, i), f: it.text }))];
    let ci = 0; pts.forEach((p, i) => { if (t >= p.t) ci = i; });
    const span = (f) => { const [a, c] = f.split('-').map(Number); return [a - 1, (c || a) - 1]; };
    const scrollOf = (f) => clamp(span(f)[0] - Math.floor(rows * .3), 0, Math.max(0, lines.length - rows));
    const mk = ci > 0 ? easeInOut((t - pts[ci].t) / .5) : 1;
    const from = pts[Math.max(0, ci - 1)].f, to = pts[ci].f;
    const sc = lerp(scrollOf(from), scrollOf(to), mk);
    const f0 = lerp(span(from)[0], span(to)[0], mk), f1 = lerp(span(from)[1], span(to)[1], mk);
    ctx.save(); rr(x, y + 60, w, h - 60, 18); ctx.clip();
    const hk = easeOut(enter(lt, .3, .35));
    ctx.save(); ctx.globalAlpha *= hk; ctx.fillStyle = C.focus;
    ctx.fillRect(x + 2, top + (f0 - sc) * LH - 6, (w - 4) * hk, (f1 - f0 + 1) * LH); ctx.restore();
    ctx.fillStyle = C.accent; ctx.fillRect(x + 2, top + (f0 - sc) * LH - 6, 6, (f1 - f0 + 1) * LH * hk);
    for (let i = Math.floor(sc); i < Math.min(lines.length, sc + rows + 1); i++) {
      const ly = top + (i - sc) * LH + 14;
      ctx.font = F.mono(22); ctx.fillStyle = C.num; ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), x + 74, ly); ctx.textAlign = 'left';
      const [col, font] = lineColor(lines[i]);
      ctx.font = font; ctx.fillStyle = col;
      let s = lines[i].replace(/\t/g, '  ');
      while (s.length && ctx.measureText(s).width > w - 130) s = s.slice(0, -2);
      if (s.length < lines[i].length) s = s.slice(0, -1) + '…';
      ctx.fillText(s, x + 100, ly);
    }
    ctx.restore();
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  };
  TYPES.image = (lt, b) => {
    const im = b.img; if (!im) return;
    const k = easeOut(enter(lt, 0, .4)), R = KIT.reg;
    const x = R.x, y = R.y, w = R.w, h = R.h - (b.body[0] ? 60 : 0);
    ctx.save(); ctx.globalAlpha = k;
    card(x, y, w, h, { r: 18 });
    rr(x + 10, y + 10, w - 20, h - 20, 12); ctx.clip();
    const z = 1 + .05 * clamp(lt / Math.max(1, b.end - b.start));
    const fit = b.opts.fit === 'contain' ? Math.min : Math.max;        // contain: the whole picture shows
    const sc = fit((w - 20) / im.width, (h - 20) / im.height) * z;
    ctx.drawImage(im, x + w / 2 - im.width * sc / 2, y + h / 2 - im.height * sc / 2, im.width * sc, im.height * sc);
    ctx.restore();
    if (b.body[0]) { const f = F.body(34); ctx.font = f; ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic'; ctx.fillText(tr(b.body[0]), x + 6, y + h + 46, w); }
  };
  TYPES.custom = (lt, b, t) => {
    const fn = scene.custom && scene.custom[b.opts.name];
    if (fn) fn(ctx, lt, b, KIT, t);
  };

  // where subtitles go: centred, or centred in the space left of a window that sits low on the right
  function subsBox() {
    const r = KIT.hostRect;
    if (r && r.y + r.h > 950 && r.x + r.w / 2 > W * .6) { const e = r.x + r.w * .07; return { cx: (e - 30) / 2 + 30, maxW: e - 120 }; }
    if (r && r.y + r.h > 950 && r.x + r.w / 2 < W * .4) { const l = r.x + r.w * .93; return { cx: (l + W - 30) / 2, maxW: W - l - 120 }; }
    return { cx: W / 2, maxW: 1560 };
  }
  // light subtitles: medium-weight ink on a soft frosted pill, bottom center, fading in and out quickly
  function subtitles(t) {
    const sl = subsLang();
    if (sl === 'off' || !B.langs) return;
    const subs = subsTrack(sl);
    if (!subs) return;
    let c = null;
    for (const x of subs) { if (x.s <= t && t < x.e) { c = x; break; } if (x.s > t) break; }
    if (!c) return;
    const a = Math.min(1, (t - c.s) / .08, (c.e - t) / .08);
    if (S.subs) { ctx.save(); S.subs(KIT, c, clamp(a), sl, t); ctx.restore(); return; }
    const px = sl === 'ja' ? 38 : 40, lines = c.t.split('\n'), lh = px * 1.32;
    const box = subsBox();
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.font = F.body(px);
    const w = Math.min(box.maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)));
    const h = px + 28 + (lines.length - 1) * lh, bottom = 1052, y = bottom - h, x = box.cx - w / 2 - 30;
    rr(x, y, w + 60, h, Math.min(h / 2, 30));
    ctx.fillStyle = C.subFill; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.subLine; ctx.stroke();
    ctx.fillStyle = C.subInk; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    lines.forEach((l, i) => ctx.fillText(l, box.cx, vmid(F.body(px), y + 14 + px / 2 + i * lh, l), box.maxW));
    ctx.restore();
  }

  // ---------- frame ----------
  const TRANS = .42;
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const k = beatAt(t), b = B.beats[k], lt = t - b.start;
    KIT.t = t; KIT.beat = b; KIT.lt = lt;
    if (LAYER === 'host') ctx.clearRect(0, 0, W, H); else { room(t); hud(t); }
    // the host's place: on a layout change she leaves the old place, then arrives at the new one (style.transition)
    const cur = layoutOf(b), prev = k > 0 ? layoutOf(B.beats[k - 1]) : cur;
    const mode = S.transition || 'dissolve';
    let L = LAYOUT[cur], dissolve = 0, fx = {};
    if (prev !== cur && lt < TRANS && mode !== 'cut') {
      const out = lt < TRANS / 2, q = out ? lt / (TRANS / 2) : 1 - (lt - TRANS / 2) / (TRANS / 2);   // q: 0 = there, 1 = gone
      if (out) L = LAYOUT[prev];
      if (mode === 'dissolve') dissolve = q;
      if (mode === 'pop') fx = { scale: out ? 1 - easeInOut(q) : easeBack(1 - q), alpha: 1 };
      if (mode === 'slide') {
        const a = LAYOUT[prev], c = LAYOUT[cur];
        if (a && c) { const e = easeInOut(lt / TRANS); L = { x: lerp(a.x, c.x, e), bottom: lerp(a.bottom, c.bottom, e), s: e < .5 ? a.s : c.s }; }
      }
      if (mode === 'fade') fx = { alpha: 1 - q };
      if (mode === 'drop') fx = out ? { dy: easeInOut(q) * 700 } : { dy: (1 - easeOut(1 - q)) * 700 };
    }
    KIT.reg = regionOf(cur);
    const glitch = HOST.mode === 'holo' && prev === cur && k > 0 && lt < .12 && b.type !== 'host' ? 1 - lt / .12 : 0;
    // content goes behind the host; when Aoi leaves a big place, the content waits until she is mostly gone
    const wait = prev !== cur && LAYOUT[prev] && LAYOUT[prev].s >= 3 && mode !== 'cut' && mode !== 'slide' ? TRANS * .45 : 0;
    if (S.under && !LAYER) { ctx.save(); S.under(KIT, t, b, lt); ctx.restore(); }
    if (lt >= wait && !LAYER) {
      ctx.save();
      const cs = S.content || {};
      if (cs.dx || cs.dy || cs.scale) { ctx.translate(cs.dx || 0, cs.dy || 0); ctx.scale(cs.scale || 1, cs.scale || 1); }
      const fn = (S.types && S.types[b.type]) ? (a2, b2, t2) => S.types[b.type](KIT, a2, b2, t2) : TYPES[b.type];
      (fn || (() => {}))(lt - wait, b, t);
      ctx.restore();
    }
    if (scene.overlay) { ctx.save(); scene.overlay(ctx, t, b, KIT); ctx.restore(); }
    if (!LAYER) for (const fn of scene.overlays || []) { ctx.save(); fn(ctx, t, b, KIT); ctx.restore(); }
    KIT.hostRect = null;
    if (L) {
      const fc = face(t, b);
      composeArt(fc, dissolve);

      const alpha = 1 - dissolve;
      const top = L.bottom - MAN.height * L.s * .55;
      if (HOST.beam) phoneAndBeam(t, L, alpha, top);
      if (HOST.particles === 'holo') particles(t, L, alpha);
      else if (typeof HOST.particles === 'function') { ctx.save(); HOST.particles(KIT, t, L, alpha); ctx.restore(); }
      KIT.hostRect = drawHost(t, L, dissolve, glitch, fx);
      if (HOST.wave) waveBar(t, L, alpha * .95, L.bottom + (L.s === 3 ? 0 : -2));
    }
    if (S.front && !LAYER) { ctx.save(); S.front(KIT, t, b, lt); ctx.restore(); }
    subtitles(t);
    if (S.overlay && !LAYER) { ctx.save(); S.overlay(KIT, t); ctx.restore(); }
  }

  const KIT = { ctx, C, F, FONT, W, H, DESK_Y, LAYOUT, clamp, lerp, easeOut, easeBack, easeInOut, enter, hash, rr, card, baseCard, wrap,
    drawRuns, textBlock, pixelGem, loadImg, splitRuns, tr, itemT, levelAt, baseRoom, phoneAndBeam, waveBar, particles, vmid, subsBox, fitText, regionOf,
    get LANG() { return LANG; }, get MAN() { return MAN; }, get B() { return B; }, art,
    // draw the current Aoi frame (base + eyes + mouth) at a rect, crisp pixels
    sprite(x, y, w, h) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(art, x, y, w, h); ctx.restore(); },
    // a plate image covering the frame, with a slow push-in
    plate(im, t, zoom = .03, dur = 60) {
      const z = 1 + zoom * Math.min(1, t / dur);
      const sc = Math.max(W / im.width, H / im.height) * z;
      ctx.drawImage(im, W / 2 - im.width * sc / 2, H / 2 - im.height * sc / 2, im.width * sc, im.height * sc);
    },
    grain(amount = .05, t = 0) {
      if (!KIT._grain) {
        const g = document.createElement('canvas'); g.width = 256; g.height = 256; const gx = g.getContext('2d'); const id = gx.createImageData(256, 256);
        for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        gx.putImageData(id, 0, 0); KIT._grain = ctx.createPattern(g, 'repeat');
      }
      ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay';
      const o = Math.floor(hash(Math.floor(t * 12)) * 256);
      ctx.translate(o, o); ctx.fillStyle = KIT._grain; ctx.fillRect(-o, -o, W, H); ctx.restore();
    },
    vignette(a = .35, color = '0,0,0') {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
      g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    // a typewriter count of characters for a subtitle line
    typed(cap, t, speed = 1.35) { return Math.ceil(cap.t.length * clamp((t - cap.s) / Math.max(.3, (cap.e - cap.s) / speed))); },
  };

  // ---------- preview (the sweatbox) and render hooks ----------
  window.studio = {
    ready: load().then(() => { draw(0); return { duration: B.duration, fps: B.fps, style: S.id, langs: B.lang_order || ['en'], beats: B.beats.map((b) => ({ type: b.type, start: b.start, end: b.end })) }; }),
    seek: (t) => { draw(t); return true; },
  };
  if (RENDER) return;

  // Every language's voice plays at once; only the chosen one is heard. All languages share one timeline,
  // so a swap changes the voice, lips, on-screen text and subtitles at the same moment, with no jump.
  window.studio.ready.then(() => {
    const langs = (B.lang_order || ['en']).filter((l) => !(B.langs && B.langs[l] && B.langs[l].textOnly));
    const voices = Object.fromEntries(langs.map((l) => [l, new Audio((B.langs ? B.langs[l] : B).audio)]));
    const master = () => voices[langs[0]];
    const sync = () => { const t = master().currentTime; for (const a of Object.values(voices)) if (Math.abs(a.currentTime - t) > .04) a.currentTime = t; };
    const setMuted = () => { for (const [l, a] of Object.entries(voices)) a.muted = l !== LANG; };
    setMuted();
    music = new Audio('/kit/audio/music_bed.mp3'); music.loop = true; music.volume = .12;
    const sfx = {}; const fired = new Set();
    const bar = document.getElementById('bar');
    const playBtn = document.getElementById('play'), scrub = document.getElementById('scrub'), fill = document.getElementById('fill'), time = document.getElementById('time');
    const langBtn = document.createElement('button'), subsBtn = document.createElement('button');
    bar.insertBefore(langBtn, scrub); bar.insertBefore(subsBtn, scrub);
    const label = () => {
      langBtn.textContent = `Voice: ${LANG.toUpperCase()}`;
      subsBtn.textContent = `Subs: ${(SUBS === 'auto' ? TEXT : SUBS).toUpperCase()}`;
      langBtn.style.display = langs.length > 1 ? '' : 'none';
    };
    const swapLang = () => { LANG = langs[(langs.indexOf(LANG) + 1) % langs.length]; sync(); setMuted(); label(); };
    const cycleSubs = () => { const order = [...(B.lang_order || langs), 'off']; const cur = SUBS === 'auto' ? TEXT : SUBS; SUBS = order[(order.indexOf(cur) + 1) % order.length]; label(); };
    addEventListener('keydown', (e) => { if (e.code === 'KeyT') { const all = B.lang_order || langs; TEXT = all[(all.indexOf(TEXT) + 1) % all.length]; label(); } });
    langBtn.onclick = swapLang; subsBtn.onclick = cycleSubs; label();
    B.beats.forEach((b) => { const d = document.createElement('div'); d.className = 'tick'; d.style.left = (b.start / B.duration * 100) + '%'; scrub.appendChild(d); });
    (LD().sections || []).forEach((s) => { const d = document.createElement('div'); d.className = 'tick sec'; d.style.left = (s.start / B.duration * 100) + '%'; scrub.appendChild(d); });
    const playing = () => !master().paused;
    const toggle = () => {
      if (!playing()) { sync(); Object.values(voices).forEach((a) => a.play()); music.currentTime = master().currentTime % (music.duration || 130); music.play(); playBtn.textContent = 'Pause'; }
      else { Object.values(voices).forEach((a) => a.pause()); music.pause(); playBtn.textContent = 'Play'; }
    };
    const seekTo = (t) => {
      t = clamp(t, 0, B.duration);
      Object.values(voices).forEach((a) => { a.currentTime = t; });
      music.currentTime = t % (music.duration || 130);
      fired.clear(); LD().sfx.forEach((e, i) => { if (e.t < t) fired.add(i); });
    };
    playBtn.onclick = toggle;
    // a page around the player (compare.html) drives it with these; sleep stops the drawing while it is hidden
    Object.assign(window.studio, {
      play: () => { if (!playing()) toggle(); }, pause: () => { Object.values(voices).forEach((a) => a.pause()); music.pause(); playBtn.textContent = 'Play'; },
      toggle, playing, seekTo, ended: () => master().ended, time: () => master().currentTime, duration: B.duration, sleep: false,
    });
    master().addEventListener('ended', () => { music.pause(); playBtn.textContent = 'Play'; });
    scrub.onclick = (e) => { const r = scrub.getBoundingClientRect(); seekTo((e.clientX - r.left) / r.width * B.duration); };
    addEventListener('keydown', (e) => {
      const t = master().currentTime;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'KeyL') swapLang();
      if (e.code === 'KeyS') cycleSubs();
      if (e.code === 'ArrowRight') seekTo(t + 2);
      if (e.code === 'ArrowLeft') seekTo(t - 2);
      const k = beatAt(t + .01);
      if (e.code === 'ArrowDown' && B.beats[k + 1]) seekTo(B.beats[k + 1].start);
      if (e.code === 'ArrowUp') seekTo(B.beats[Math.max(0, t - B.beats[k].start < 1 ? k - 1 : k)].start);
    });
    let lastSync = 0;
    const loop = () => {
      if (window.studio.sleep) { requestAnimationFrame(loop); return; }
      const t = master().currentTime;
      if (playing() && performance.now() - lastSync > 1000) { sync(); lastSync = performance.now(); }
      if (playing()) LD().sfx.forEach((e, i) => {
        if (!fired.has(i) && t >= e.t) { fired.add(i); if (t - e.t < .25) { const a = (sfx[e.name] ||= new Audio(`/kit/audio/sfx/${e.name}.mp3`)).cloneNode(); a.volume = .35; a.play(); } }
      });
      draw(t);
      fill.style.width = (t / B.duration * 100) + '%';
      const b = B.beats[beatAt(t)];
      time.textContent = `${ts(t)} / ${ts(B.duration)}  ·  beat ${beatAt(t) + 1} ${b.type}`;
      requestAnimationFrame(loop);
    };
    loop();
  });
})();
