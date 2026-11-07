// 9. Kawaii pop: candy colours, polka dots and stars, chunky outlined cards, Aoi as a bouncy sticker.
(window.STYLES = window.STYLES || {})['kawaii-pop'] = {
  id: 'kawaii-pop', name: 'Kawaii pop',
  blurb: 'Candy colours, polka dots, twinkling stars. Chunky outlined cards with hard shadows, bouncy pop-in text, Aoi as a sticker on a sun blob.',
  fontFiles: { MochiyPop: '/kit/fonts/MochiyPopOne-Regular.ttf', ZenMaruB: '/kit/fonts/ZenMaruGothic-Bold.ttf' },
  fonts: { title: 'MochiyPop', titleW: 400, body: 'ZenMaruB', bodyW: 700, label: 'MochiyPop', labelJA: 'MochiyPop', labelUpper: false },
  palette: {
    ink: '#3a1d4a', muted: '#7b5a8c', line: '#3a1d4a', accent: '#ff4f9a', cyan: '#2ec4b6', soft: '#ffe3f0', card: '#ffffff', bar: '#fff1f8',
    num: '#c7a3d6', code: '#3a1d4a', hi: 'rgba(255,214,0,.7)', focus: 'rgba(255,79,154,.18)', shadow: 'rgba(0,0,0,0)',
  },
  host: {
    mode: 'sticker', outline: 14, outlineColor: '#ffffff', shadow: 'rgba(255,79,154,.55)', beam: false, wave: false, bob: 10,
    layouts: { center: { x: 960, bottom: 860, s: 3 }, left: { x: 520, bottom: 860, s: 3 }, right: { x: 1400, bottom: 860, s: 3 }, corner: { x: 1620, bottom: 860, s: 2 } },
    behind(K, t, r) {
      const { ctx } = K; const cx = r.x + r.w / 2, cy = r.y + r.h * .48, R = r.w * .52 * (1 + .02 * Math.sin(t * 3));
      ctx.fillStyle = '#ffe066'; ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, rr2 = R * (1 + .06 * Math.sin(a * 6 + t * 2)); i ? ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2) : ctx.moveTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }
      ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#3a1d4a'; ctx.stroke();
    },
    particles(K, t, L) {
      const { ctx } = K;
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + t * .4, R = 300 * L.s / 3 + 30 * Math.sin(t * 2 + i), x = L.x + Math.cos(a) * R, y = L.bottom - 360 * L.s / 3 + Math.sin(a) * R * .8;
        const s = (10 + 8 * K.hash(i)) * (.7 + .3 * Math.sin(t * 4 + i)); ctx.fillStyle = i % 2 ? '#ff4f9a' : '#2ec4b6';
        ctx.beginPath(); for (let j = 0; j < 8; j++) { const b = j / 8 * Math.PI * 2, rr2 = j % 2 ? s * .45 : s; ctx.lineTo(x + Math.cos(b) * rr2, y + Math.sin(b) * rr2); } ctx.fill();
      }
    },
  },
  transition: 'pop',
  text: 'pop',
  room(K, t) {
    const { ctx, W, H } = K;
    ctx.fillStyle = '#ffd6e8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let y = -40; y < H + 40; y += 70) for (let x = -40; x < W + 40; x += 70) { const o = (Math.floor(y / 70) % 2) * 35; ctx.beginPath(); ctx.arc(x + o + (t * 12) % 70, y, 9, 0, Math.PI * 2); ctx.fill(); }
    const blob = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    blob(200 + Math.sin(t * .5) * 30, 900, 260, 'rgba(46,196,182,.25)'); blob(1750, 140 + Math.cos(t * .4) * 30, 220, 'rgba(255,224,102,.45)');
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    K.rr(x + 8, y + 8, w, h, 26); ctx.fillStyle = o.on ? '#ff4f9a' : '#3a1d4a'; ctx.fill();
    K.rr(x, y, w, h, 26); ctx.fillStyle = o.on ? '#fff6fb' : C.card; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#3a1d4a'; ctx.stroke();
  },
  bullet(K, x, y, s, color) {
    const { ctx } = K; const cx = x + s * 1.5, cy = y + s * 1.6, r = s * 1.5;
    ctx.fillStyle = color === K.C.accent ? '#ff4f9a' : '#2ec4b6';
    ctx.beginPath(); ctx.moveTo(cx, cy + r * .9); ctx.bezierCurveTo(cx - r * 1.6, cy - r * .2, cx - r * .6, cy - r * 1.4, cx, cy - r * .4);
    ctx.bezierCurveTo(cx + r * .6, cy - r * 1.4, cx + r * 1.6, cy - r * .2, cx, cy + r * .9); ctx.fill();
  },
  underline(K, x, y, k) { const { ctx } = K; K.rr(x, y - 4, 600 * k, 18, 9); ctx.fillStyle = '#2ec4b6'; ctx.fill(); },
  subs(K, c, a, lang) {
    const { ctx, F, W } = K;
    ctx.globalAlpha = a; ctx.font = F.title(lang === 'ja' ? 40 : 42); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px'; ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = '#3a1d4a'; ctx.strokeText(c.t, W / 2, 1020, 1600);
    ctx.fillStyle = '#ffffff'; ctx.fillText(c.t, W / 2, 1020, 1600);
  },
  hud(K, t, secs, k) {
    const { ctx, F } = K; ctx.font = F.pixel(28); const w = ctx.measureText(secs[k].title).width + 50;
    K.rr(56, 40, w, 58, 29); ctx.fillStyle = '#3a1d4a'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(secs[k].title, 81, 70);
  },
};
