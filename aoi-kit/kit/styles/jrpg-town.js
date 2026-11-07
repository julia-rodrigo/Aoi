// 6. JRPG: a hi-bit seaside town, classic blue menu windows with white frames, typed text, Aoi in a portrait window.
(window.STYLES = window.STYLES || {})['jrpg-town'] = {
  id: 'jrpg-town', name: 'JRPG adventure',
  blurb: 'Hi-bit seaside town. Classic blue game windows with white frames, pixel type that types itself, Aoi in a portrait window.',
  fontFiles: { Dot: '/kit/fonts/DotGothic16-Regular.ttf' },
  fonts: { title: 'Dot', titleW: 400, body: 'Dot', bodyW: 400, label: 'Dot', labelJA: 'Dot' },
  images: { bg: '/kit/styles/plates/jrpg-town.jpg' },
  palette: {
    ink: '#ffffff', muted: '#c9d3ff', line: '#ffffff', accent: '#ffd84a', cyan: '#8fe3ff', soft: 'rgba(255,216,74,.12)',
    card: '#1d2c86', bar: '#152070', num: '#8d9ae0', code: '#ffffff', hi: 'rgba(255,216,74,.35)', focus: 'rgba(255,216,74,.18)', shadow: 'rgba(0,0,30,.4)',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 0,
    layouts: { center: { x: 960, bottom: 840, s: 3 }, left: { x: 520, bottom: 840, s: 3 }, right: { x: 1400, bottom: 840, s: 3 }, corner: { x: 1610, bottom: 800, s: 2 } },
    behind(K, t, r) { window.STYLES['jrpg-town'].win(K, r.x - 16, r.y - 16, r.w + 32, r.h + 32, false); },
    clip(K, r) { K.ctx.rect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); },
  },
  text: 'type',
  textStroke: ['#0b1240', 8],
  transition: 'cut',
  win(K, x, y, w, h, on) {
    const { ctx } = K;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, on ? '#3248c8' : '#2a3cb0'); g.addColorStop(1, on ? '#141f6e' : '#0f1858');
    ctx.fillStyle = g; K.rr(x, y, w, h, 10); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; K.rr(x + 3, y + 3, w - 6, h - 6, 8); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = on ? '#ffd84a' : 'rgba(150,170,255,.6)'; K.rr(x + 10, y + 10, w - 20, h - 20, 5); ctx.stroke();
  },
  card(K, x, y, w, h, o) { window.STYLES['jrpg-town'].win(K, x, y, w, h, o.on); },
  bullet(K, x, y, s, color) {
    const { ctx, C } = K; if (color !== C.accent) return;
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 2.6, y + s * 1.5); ctx.lineTo(x, y + s * 3); ctx.fill();
  },
  arrow(K, x, y, gap) { const { ctx } = K; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 10, y - 12); ctx.lineTo(x + gap - 10, y); ctx.lineTo(x + 10, y + 12); ctx.fill(); },
  underline() {},
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, t, .02);
    ctx.fillStyle = 'rgba(10,16,60,.18)'; ctx.fillRect(0, 0, W, H);
  },
  subs(K, c, a, lang, t) {
    const { ctx, F, W } = K;
    const x = 80, y = 868, w = W - 160, h = 180;
    window.STYLES['jrpg-town'].win(K, x, y, w, h, false);
    const n = K.typed(c, t);
    const name = lang === 'ja' ? 'アオイ' : 'AOI';
    ctx.font = F.body(lang === 'ja' ? 42 : 44); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd84a'; ctx.fillText(name, x + 50, y + 74);
    ctx.fillStyle = '#fff'; ctx.fillText(c.t.slice(0, n), x + 50, y + 132, w - 110);
  },
  hud(K, t, secs, k) {
    const { ctx, F } = K;
    ctx.font = F.pixel(28); const w = ctx.measureText(secs[k].title).width + 60;
    window.STYLES['jrpg-town'].win(K, 40, 30, w, 70, false);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(secs[k].title, 70, 66);
  },
};
