// 5. Visual novel: a rooftop at golden hour, Aoi large like a VN sprite, the subtitles are a dialogue box with her name.
(window.STYLES = window.STYLES || {})['vn-rooftop'] = {
  id: 'vn-rooftop', name: 'Visual novel',
  blurb: 'Golden-hour school rooftop. Aoi large like a visual-novel sprite; subtitles become a dialogue box with her name and typed text.',
  fontFiles: { ZenMaruB: '/kit/fonts/ZenMaruGothic-Bold.ttf', ZenMaruM: '/kit/fonts/ZenMaruGothic-Medium.ttf' },
  fonts: { title: 'ZenMaruB', titleW: 700, body: 'ZenMaruM', bodyW: 500, label: 'ZenMaruB', labelJA: 'ZenMaruB', labelUpper: false },
  images: { bg: '/kit/styles/plates/vn-rooftop.jpg' },
  palette: {
    ink: '#3a2440', muted: '#7d6283', line: 'rgba(255,255,255,.7)', accent: '#ff6f91', cyan: '#ffb36b', soft: '#fff0f4',
    card: 'rgba(255,255,255,.84)', bar: 'rgba(255,240,245,.9)', num: '#c4a9c2', code: '#3a2440', hi: 'rgba(255,179,107,.45)',
    focus: 'rgba(255,111,145,.16)', shadow: 'rgba(80,30,60,.25)',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 3,
    layouts: { center: { x: 960, bottom: 1030, s: 4 }, left: { x: 560, bottom: 1030, s: 4 }, right: { x: 1380, bottom: 1030, s: 4 }, corner: { x: 1580, bottom: 880, s: 3 } },
  },
  content: { dx: 30, dy: -40, scale: .8 },
  transition: 'fade',
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, t, .03);
    ctx.fillStyle = 'rgba(255,220,200,.08)'; ctx.fillRect(0, 0, W, H);
  },
  subs(K, c, a, lang, t) {
    const { ctx, F, W } = K;
    const x = 110, y = 840, w = W - 220, h = 200;
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.90)'); g.addColorStop(1, 'rgba(255,240,246,.92)');
    ctx.shadowColor = 'rgba(80,30,60,.3)'; ctx.shadowBlur = 30; K.rr(x, y, w, h, 28); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,111,145,.55)'; K.rr(x + 10, y + 10, w - 20, h - 20, 20); ctx.stroke();
    const name = lang === 'ja' ? 'アオイ' : 'Aoi';
    ctx.font = F.title(34); const nw = ctx.measureText(name).width + 60;
    K.rr(x + 40, y - 30, nw, 60, 30); ctx.fillStyle = '#ff6f91'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(name, x + 70, y);
    const n = K.typed(c, t);
    ctx.font = F.body(lang === 'ja' ? 46 : 48); ctx.fillStyle = '#3a2440'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(c.t.slice(0, n), x + 70, y + 112, w - 140);
    if (n >= c.t.length && Math.floor(t * 2.5) % 2) { ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.moveTo(x + w - 70, y + h - 60); ctx.lineTo(x + w - 46, y + h - 60); ctx.lineTo(x + w - 58, y + h - 44); ctx.fill(); }
  },
  hud(K, t, secs, k) {
    const { ctx, F } = K;
    ctx.font = F.title(28); const w = ctx.measureText(secs[k].title).width + 48;
    K.rr(50, 40, w, 52, 26); ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fill();
    ctx.fillStyle = '#ff6f91'; ctx.textBaseline = 'middle'; ctx.fillText(secs[k].title, 74, 67);
  },
};
