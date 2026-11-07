// 8. Retro CRT: synthwave sunset and grid, Aoi on an old CRT TV, VHS captions.
(window.STYLES = window.STYLES || {})['vapor-crt'] = {
  id: 'vapor-crt', name: 'Retro CRT',
  blurb: 'Synthwave sunset with a moving neon grid. Aoi lives on an old CRT TV with scanlines and colour fringe. Black-box VHS captions.',
  fontFiles: { VT323: '/kit/fonts/VT323-Regular.ttf', Dot: '/kit/fonts/DotGothic16-Regular.ttf', ZenKakuM: '/kit/fonts/ZenKakuGothicNew-Medium.ttf' },
  fonts: { title: 'VT323, Dot', titleW: 400, body: 'ZenKakuM', bodyW: 500, label: 'VT323', labelJA: 'Dot' },
  palette: {
    ink: '#fff0fb', muted: '#e2b8e6', line: 'rgba(255,62,165,.45)', accent: '#ff3ea5', cyan: '#3ff3ff', soft: 'rgba(255,62,165,.16)',
    card: 'rgba(28,6,48,.78)', bar: 'rgba(255,255,255,.05)', num: '#9b6aa9', code: '#ffe9fb', hi: 'rgba(63,243,255,.35)', focus: 'rgba(255,62,165,.18)', shadow: 'rgba(0,0,0,.5)',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 0,
    layouts: { center: { x: 960, bottom: 800, s: 3 }, left: { x: 540, bottom: 800, s: 3 }, right: { x: 1380, bottom: 800, s: 3 }, corner: { x: 1650, bottom: 780, s: 2 } },
    behind(K, t, r) {
      const { ctx } = K; const p = r.s * 22;
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
      K.rr(r.x - p, r.y - p, r.w + p * 2, r.h + p * 2.6, r.s * 18); ctx.fillStyle = '#d9cfc0'; ctx.fill(); ctx.shadowColor = 'transparent';
      K.rr(r.x - p * .35, r.y - p * .35, r.w + p * .7, r.h + p * .7, r.s * 14); ctx.fillStyle = '#1a1a1a'; ctx.fill();
      const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 10, r.x + r.w / 2, r.y + r.h / 2, r.w * .75);
      g.addColorStop(0, '#16424a'); g.addColorStop(1, '#061417'); K.rr(r.x, r.y, r.w, r.h, r.s * 10); ctx.fillStyle = g; ctx.fill();
      // colour fringe: soft red and blue copies of her a few pixels off
      ctx.save(); K.rr(r.x, r.y, r.w, r.h, r.s * 10); ctx.clip(); ctx.globalAlpha = .35; ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'sepia(1) saturate(6) hue-rotate(-50deg)'; K.sprite(r.x - r.s * 2, r.y, r.w, r.h);
      ctx.filter = 'sepia(1) saturate(6) hue-rotate(170deg)'; K.sprite(r.x + r.s * 2, r.y, r.w, r.h); ctx.restore();
      // knobs
      for (let i = 0; i < 2; i++) { ctx.fillStyle = '#8c8275'; ctx.beginPath(); ctx.arc(r.x + r.w - p * (.6 + i * .9), r.y + r.h + p * 1.35, p * .3, 0, Math.PI * 2); ctx.fill(); }
    },
    clip(K, r) { K.rr(r.x, r.y, r.w, r.h, r.s * 10); },
    front(K, t, r) {
      const { ctx } = K;
      ctx.save(); K.rr(r.x, r.y, r.w, r.h, r.s * 10); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = r.y; y < r.y + r.h; y += r.s * 2) ctx.fillRect(r.x, y, r.w, r.s);
      const band = r.y + ((t * 120) % (r.h + 80)) - 40; ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(r.x, band, r.w, 40);
      const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w * .5, r.y + r.h * .5); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
    },
  },
  transition: 'cut',
  content: { dx: 10, dy: 20, scale: .9 },
  textStroke: ['#12021f', 8],
  room(K, t) {
    const { ctx, W, H } = K; const hz = 560;
    const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#1b0636'); sky.addColorStop(.55, '#6a1b7a'); sky.addColorStop(1, '#ff6f91');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + .5 * K.hash(i * 7 + Math.floor(t * 2))})`; ctx.fillRect(K.hash(i) * W, K.hash(i * 3) * hz * .6, 2, 2); }
    const sx = 1180, sy = hz - 40, sr = 230, sun = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
    sun.addColorStop(0, '#ffe66d'); sun.addColorStop(1, '#ff3ea5');
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = sun; ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    for (let i = 0; i < 8; i++) { const y = sy - 20 + i * 26; ctx.clearRect(sx - sr, y, sr * 2, 4 + i * 1.6); } ctx.restore();
    ctx.fillStyle = '#12021f'; ctx.fillRect(0, hz, W, H - hz);
    ctx.strokeStyle = 'rgba(255,62,165,.75)'; ctx.lineWidth = 2;
    for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, hz); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
    const off = (t * .8) % 1;
    for (let i = 0; i < 14; i++) { const k = (i + off) / 14, y = hz + (H - hz) * k * k; ctx.globalAlpha = .3 + .7 * k; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    ctx.fillStyle = C.card; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 3; ctx.strokeStyle = o.on ? C.cyan : C.accent; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = o.on ? C.cyan : C.accent; ctx.fillRect(x + 8, y + 8, 10, 10);
  },
  underline(K, x, y, k) { const { ctx, C } = K; ctx.fillStyle = C.cyan; ctx.fillRect(x, y, 560 * k, 8); ctx.fillStyle = C.accent; ctx.fillRect(x + 8, y + 12, 560 * k, 8); },
  subs(K, c, a, lang) {
    const { ctx, F, W } = K;
    ctx.font = lang === 'ja' ? '40px Dot' : '50px VT323'; const w = Math.min(1600, ctx.measureText(c.t).width);
    ctx.fillStyle = 'rgba(0,0,0,.86)'; ctx.fillRect(W / 2 - w / 2 - 22, 990, w + 44, 64);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.t, W / 2, 1023, 1600);
  },
  hud(K, t, secs, k) {
    const { ctx } = K; ctx.font = '40px VT323'; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`PLAY ▶  ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`, 60, 80);
    ctx.font = K.LANG === 'ja' ? '28px Dot' : '34px VT323'; ctx.fillStyle = '#ffd1f0'; ctx.fillText(K.LANG === 'ja' ? secs[k].title : secs[k].title.toUpperCase(), 60, 120);
  },
  overlay(K, t) { const { ctx, W, H } = K; ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); K.vignette(.45); },
};
