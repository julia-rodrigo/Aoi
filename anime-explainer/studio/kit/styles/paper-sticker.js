// 7. Paper and stickers: an editorial notebook. Aoi is a die-cut sticker held by tape; serif titles, marker highlights.
(window.STYLES = window.STYLES || {})['paper-sticker'] = {
  id: 'paper-sticker', name: 'Paper and stickers',
  blurb: 'Warm paper, editorial serif titles, handwritten notes and yellow marker. Aoi is a die-cut sticker held on with tape.',
  fontFiles: { InstrumentSerif: '/kit/fonts/InstrumentSerif-Regular.ttf', InstrumentSans: { url: '/kit/fonts/InstrumentSans.ttf', desc: { weight: '400 700' } },
    Caveat: { url: '/kit/fonts/Caveat.ttf', desc: { weight: '400 700' } }, KleeOne: '/kit/fonts/KleeOne-SemiBold.ttf' },
  fonts: { title: 'InstrumentSerif, KleeOne', titleW: 400, body: 'InstrumentSans, KleeOne', bodyW: 500, label: 'Caveat', labelJA: 'KleeOne', labelUpper: false },
  images: { bg: '/kit/styles/plates/paper.jpg' },
  palette: {
    ink: '#1f1d1a', muted: '#6b655c', line: '#ddd6c6', accent: '#e4572e', cyan: '#2e86ab', soft: '#fff4c7', card: '#fffdf7',
    bar: '#f6f1e6', num: '#b8b0a0', code: '#1f1d1a', hi: 'rgba(255,214,10,.6)', focus: 'rgba(255,214,10,.3)', shadow: 'rgba(60,50,30,.16)',
  },
  host: {
    mode: 'sticker', outline: 12, outlineColor: '#ffffff', shadow: 'rgba(60,50,30,.28)', beam: false, wave: false, particles: null, bob: 0,
    layouts: { center: { x: 960, bottom: 900, s: 3 }, left: { x: 520, bottom: 900, s: 3 }, right: { x: 1400, bottom: 900, s: 3 }, corner: { x: 1620, bottom: 900, s: 2 } },
    front(K, t, r) {
      const { ctx } = K; const tape = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(240,226,180,.82)'; ctx.fillRect(-60, -16, 120, 32); ctx.restore(); };
      tape(r.x + r.w * .3, r.y + r.h * .1, -.55); tape(r.x + r.w * .72, r.y + r.h * .1, .5);
    },
  },
  transition: 'pop',
  text: 'pop',
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, 0, 0);
    ctx.fillStyle = 'rgba(120,100,70,.10)';
    for (let x = 40; x < W; x += 40) for (let y = 40; y < H; y += 40) ctx.fillRect(x, y, 3, 3);
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate((K.hash(x * .37 + y * .11) - .5) * .02); ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.shadowColor = C.shadow; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.fillStyle = o.on ? '#fffbea' : C.card; ctx.fillRect(x, y, w, h); ctx.shadowColor = 'transparent';
    if (o.on) { ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 8, h / 2 + 6, -.01, 0, Math.PI * 2); ctx.stroke(); }
  },
  bullet(K, x, y, s, color) {
    const { ctx, C } = K; ctx.strokeStyle = color === C.accent ? C.accent : '#8a8273'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + s * 1.6); ctx.lineTo(x + s, y + s * 2.6); ctx.lineTo(x + s * 3, y); ctx.stroke();
  },
  underline(K, x, y, k) {
    const { ctx } = K; ctx.fillStyle = 'rgba(255,214,10,.7)'; ctx.beginPath(); ctx.moveTo(x - 6, y - 4);
    ctx.lineTo(x + 640 * k, y - 10); ctx.lineTo(x + 640 * k + 4, y + 12); ctx.lineTo(x - 2, y + 16); ctx.fill();
  },
  subs(K, c, a, lang) {
    const { ctx, F, W } = K;
    ctx.globalAlpha = a; ctx.font = F.body(lang === 'ja' ? 38 : 40); const w = Math.min(1560, ctx.measureText(c.t).width);
    ctx.fillStyle = 'rgba(255,253,247,.94)'; ctx.shadowColor = 'rgba(60,50,30,.18)'; ctx.shadowBlur = 10; ctx.fillRect(W / 2 - w / 2 - 28, 990, w + 56, 62); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1f1d1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.t, W / 2, 1022, 1560);
  },
  hud(K, t, secs, k) {
    const { ctx, F, C } = K; ctx.font = F.pixel(K.LANG === 'ja' ? 30 : 40); ctx.fillStyle = C.accent; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${k + 1}. ${secs[k].title}`, 60, 74);
  },
};
