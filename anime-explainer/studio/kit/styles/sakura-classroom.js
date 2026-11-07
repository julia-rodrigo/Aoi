// 3. Spring classroom: a sunny classroom with cherry blossoms. Aoi stands in the room (solid, no hologram).
(window.STYLES = window.STYLES || {})['sakura-classroom'] = {
  id: 'sakura-classroom', name: 'Spring classroom',
  blurb: 'Sunny anime classroom, falling petals. Aoi stands in the room, no hologram. Notes on cream paper with washi tape, marker-style titles.',
  fontFiles: { YuseiMagic: '/kit/fonts/YuseiMagic-Regular.ttf', ZenMaruM: '/kit/fonts/ZenMaruGothic-Medium.ttf', ZenMaruB: '/kit/fonts/ZenMaruGothic-Bold.ttf' },
  fonts: { title: 'YuseiMagic', titleW: 400, body: 'ZenMaruM', bodyW: 500, label: 'YuseiMagic', labelJA: 'YuseiMagic', labelUpper: false },
  images: { bg: '/kit/styles/plates/sakura-classroom.jpg' },
  palette: {
    ink: '#3b2f2f', muted: '#7a6a63', line: '#efd9d4', accent: '#e8638b', cyan: '#6fbf98', soft: '#fde8ee', card: '#fffaf2',
    bar: '#fbefe6', num: '#c9b3aa', code: '#3b2f2f', hi: 'rgba(255,170,195,.5)', focus: 'rgba(255,170,195,.28)', shadow: 'rgba(90,50,40,.18)',
    subFill: 'rgba(255,250,242,.9)', subLine: 'rgba(232,99,139,.25)', subInk: '#3b2f2f',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 3, shadow: 'rgba(80,40,30,.25)',
    layouts: { center: { x: 960, bottom: 1080, s: 3 }, left: { x: 470, bottom: 1080, s: 3 }, right: { x: 1450, bottom: 1080, s: 3 }, corner: { x: 1640, bottom: 1080, s: 2 } },
  },
  transition: 'pop',
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, t, .03);
    const g = ctx.createLinearGradient(0, 0, W * .72, 0);
    g.addColorStop(0, 'rgba(255,248,240,.86)'); g.addColorStop(.62, 'rgba(255,248,240,.62)'); g.addColorStop(1, 'rgba(255,248,240,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  front(K, t) { // petals drifting across everything
    const { ctx, W, H } = K;
    for (let i = 0; i < 34; i++) {
      const sp = 60 + 70 * K.hash(i), x = (K.hash(i * 1.7) * W + t * (40 + 50 * K.hash(i * 4))) % (W + 80) - 40;
      const y = ((t * sp + K.hash(i * 2.3) * H) % (H + 80)) - 40, r = 6 + 6 * K.hash(i * 5), a = t * (1 + K.hash(i)) + i;
      ctx.save(); ctx.translate(x + Math.sin(t + i) * 20, y); ctx.rotate(a); ctx.scale(1, .55 + .45 * Math.sin(a * 1.3));
      ctx.fillStyle = i % 3 ? 'rgba(255,183,205,.85)' : 'rgba(255,214,226,.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * .62, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    ctx.save(); ctx.shadowColor = C.shadow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = o.on ? '#fff3f6' : C.card; ctx.fillRect(x, y, w, h); ctx.restore();
    if (!o.screen) { ctx.strokeStyle = 'rgba(130,170,220,.18)'; ctx.lineWidth = 2; for (let yy = y + 30; yy < y + h - 8; yy += 30) { ctx.beginPath(); ctx.moveTo(x + 14, yy); ctx.lineTo(x + w - 14, yy); ctx.stroke(); } }
    ctx.save(); ctx.translate(x + 26, y - 6); ctx.rotate(-.12); ctx.fillStyle = o.on ? 'rgba(232,99,139,.7)' : 'rgba(255,170,195,.65)'; ctx.fillRect(0, 0, 96, 24); ctx.restore();
    if (o.on) { ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); }
  },
  bullet(K, x, y, s, color) {
    const { ctx } = K; const cx = x + s * 1.5, cy = y + s * 1.5;
    ctx.fillStyle = color === K.C.accent ? '#e8638b' : '#f4a6bd';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * s * .9, cy + Math.sin(a) * s * .9, s * .8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(cx, cy, s * .55, 0, Math.PI * 2); ctx.fill();
  },
  underline(K, x, y, k) {
    const { ctx, C } = K; ctx.strokeStyle = C.accent; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 40 * k; i++) { const px = x + i * 13, py = y + Math.sin(i * .7) * 4; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  },
  hud(K, t, secs, k) {
    const { ctx, C, F } = K;
    ctx.save(); ctx.translate(56, 34); ctx.rotate(-.02);
    ctx.font = F.pixel(30); const w = ctx.measureText(secs[k].title).width + 44;
    ctx.fillStyle = 'rgba(255,250,242,.92)'; ctx.shadowColor = C.shadow; ctx.shadowBlur = 10; ctx.fillRect(0, 0, w, 54); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,170,195,.7)'; ctx.fillRect(w / 2 - 34, -10, 68, 20);
    ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(secs[k].title, 22, 29); ctx.restore();
  },
};
