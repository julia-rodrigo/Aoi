// 10. Manga panel: black-and-white panels with screentone, speed lines, Aoi in colour inside her panel, speech balloons.
(window.STYLES = window.STYLES || {})['manga-panel'] = {
  id: 'manga-panel', name: 'Manga panel',
  blurb: 'Black-and-white manga page: thick panel borders, screentone, speed lines. Aoi in colour inside her panel. Subtitles are speech balloons.',
  fontFiles: { Bangers: '/kit/fonts/Bangers-Regular.ttf', DelaGothic: '/kit/fonts/DelaGothicOne-Regular.ttf', ZenKakuB: '/kit/fonts/ZenKakuGothicNew-Bold.ttf', ZenKakuM: '/kit/fonts/ZenKakuGothicNew-Medium.ttf' },
  fonts: { title: 'Bangers, DelaGothic', titleW: 400, body: 'ZenKakuB', bodyW: 700, label: 'Bangers', labelJA: 'DelaGothic' },
  palette: {
    ink: '#111111', muted: '#4a4a4a', line: '#111111', accent: '#e10600', cyan: '#111111', soft: '#f2f2f2', card: '#ffffff', bar: '#ececec',
    num: '#9a9a9a', code: '#111111', hi: 'rgba(225,6,0,.22)', focus: 'rgba(0,0,0,.08)', shadow: 'rgba(0,0,0,0)',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 0,
    layouts: { center: { x: 960, bottom: 1000, s: 3 }, left: { x: 520, bottom: 1000, s: 3 }, right: { x: 1400, bottom: 1000, s: 3 }, corner: { x: 1606, bottom: 1000, s: 2 } },
    behind(K, t, r) {
      const { ctx } = K; const pr = window.STYLES['manga-panel'].panel(r);
      ctx.fillStyle = '#fff'; ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.save(); ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, pr.h); ctx.clip();
      const cx = r.x + r.w / 2, cy = r.y + r.h * .42; ctx.strokeStyle = '#111';
      for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2 + K.hash(i) * .05, r0 = r.w * (.42 + .1 * K.hash(i * 3 + Math.floor(t * 6))); ctx.lineWidth = 1 + 3 * K.hash(i * 5);
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * 2000, cy + Math.sin(a) * 2000); ctx.stroke(); }
      ctx.restore();
    },
    clip(K, r) { const pr = window.STYLES['manga-panel'].panel(r); K.ctx.rect(pr.x, pr.y, pr.w, pr.h); },
    front(K, t, r) { const { ctx } = K; const pr = window.STYLES['manga-panel'].panel(r); ctx.lineWidth = 8; ctx.strokeStyle = '#111'; ctx.strokeRect(pr.x, pr.y, pr.w, pr.h); },
  },
  panel(r) { const p = r.s * 14; return { x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p - r.s * 20 }; },
  transition: 'cut',
  text: 'pop',
  room(K, t) {
    const { ctx, W, H } = K;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    // screentone corners
    for (let y = 0; y < H; y += 14) for (let x = 0; x < W; x += 14) {
      const d = Math.min(Math.hypot(x, y), Math.hypot(W - x, H - y)) / 900, r = Math.max(0, 3.4 * (1 - d));
      if (r > .3) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + (y / 14 % 2) * 7, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
  },
  card(K, x, y, w, h, o) {
    const { ctx } = K; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.lineWidth = o.on ? 7 : 5; ctx.strokeStyle = '#111'; ctx.strokeRect(x, y, w, h);
    if (o.on) { ctx.fillStyle = '#e10600'; ctx.fillRect(x, y, 14, h); }
  },
  bullet(K, x, y, s, color) { const { ctx } = K; ctx.fillStyle = color === K.C.accent ? '#e10600' : '#111'; ctx.fillRect(x, y + s * .5, s * 2.4, s * 2.4); },
  arrow(K, x, y, gap) { const { ctx } = K; ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x + 6, y - 16); ctx.lineTo(x + gap - 6, y); ctx.lineTo(x + 6, y + 16); ctx.fill(); },
  underline(K, x, y, k) { const { ctx } = K; ctx.fillStyle = '#e10600'; ctx.fillRect(x, y - 2, 600 * k, 14); },
  subs(K, c, a, lang) {
    const { ctx, F, W } = K;
    ctx.font = F.body(lang === 'ja' ? 36 : 38); const w = Math.min(1500, ctx.measureText(c.t).width), cx = W / 2 - 120, cy = 1010;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 + 60, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w / 2 + 10, cy - 20); ctx.lineTo(cx + w / 2 + 120, cy - 70); ctx.lineTo(cx + w / 2 + 40, cy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 + 56, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.t, cx, cy + 2, 1500);
  },
  hud(K, t, secs, k) {
    const { ctx, F } = K; ctx.fillStyle = '#111'; ctx.fillRect(50, 36, 14, 60);
    ctx.font = F.pixel(K.LANG === 'ja' ? 30 : 44); ctx.textBaseline = 'middle'; ctx.fillText(K.LANG === 'ja' ? secs[k].title : secs[k].title.toUpperCase(), 80, 68);
  },
};
