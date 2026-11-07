// 4. Lo-fi room: a cozy desk at blue hour. Aoi is on a video call window; warm grain, soft captions.
(window.STYLES = window.STYLES || {})['lofi-room'] = {
  id: 'lofi-room', name: 'Lo-fi room',
  blurb: 'Cozy desk at blue hour, rain on the window, film grain. Aoi in a soft call window. Warm dark cards, handwritten titles, quiet captions.',
  fontFiles: { KleeOne: '/kit/fonts/KleeOne-SemiBold.ttf', ZenMaruM: '/kit/fonts/ZenMaruGothic-Medium.ttf' },
  fonts: { title: 'KleeOne', titleW: 600, body: 'ZenMaruM', bodyW: 500, label: 'KleeOne', labelJA: 'KleeOne', labelUpper: false },
  images: { bg: '/kit/styles/plates/lofi-room.jpg' },
  palette: {
    ink: '#fff3e4', muted: '#d8c2aa', line: 'rgba(255,220,180,.18)', accent: '#ffb86b', cyan: '#9fd3d6', soft: 'rgba(255,184,107,.14)',
    card: 'rgba(36,24,34,.72)', bar: 'rgba(255,255,255,.04)', num: '#8c7a70', code: '#f5e6d6', hi: 'rgba(255,184,107,.35)',
    focus: 'rgba(255,184,107,.16)', shadow: 'rgba(0,0,0,.45)',
  },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 2,
    layouts: { center: { x: 960, bottom: 860, s: 3 }, left: { x: 520, bottom: 860, s: 3 }, right: { x: 1400, bottom: 860, s: 3 }, corner: { x: 1610, bottom: 860, s: 2 } },
    behind(K, t, r) {
      const { ctx } = K; const pad = 18;
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      K.rr(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad, 26); ctx.fillStyle = 'rgba(40,28,40,.9)'; ctx.fill(); ctx.shadowColor = 'transparent';
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#f6c9a6'); g.addColorStop(1, '#a98ab8');
      K.rr(r.x, r.y, r.w, r.h - pad, 18); ctx.fillStyle = g; ctx.fill();
    },
    clip(K, r) { K.rr(r.x, r.y, r.w, r.h - 18, 18); },                 // her picture stays inside the window
    front(K, t, r) {
      const { ctx, F, C } = K;
      const label = K.LANG === 'ja' ? 'アオイ' : 'Aoi';
      ctx.font = F.body(r.s === 3 ? 30 : 24); const w = ctx.measureText(label).width + 40;
      K.rr(r.x + 18, r.y + r.h - 18 - 62, w + 26, 46, 23); ctx.fillStyle = 'rgba(30,20,28,.65)'; ctx.fill();
      ctx.fillStyle = '#7ee08a'; ctx.beginPath(); ctx.arc(r.x + 44, r.y + r.h - 18 - 39, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(label, r.x + 62, r.y + r.h - 18 - 38);
    },
  },
  transition: 'fade',
  underline(K, x, y, k) { const { ctx, C } = K; ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 520 * k, y); ctx.stroke(); },
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, t, .035);
    ctx.fillStyle = 'rgba(30,18,40,.38)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W * .7, 0); g.addColorStop(0, 'rgba(20,12,28,.6)'); g.addColorStop(1, 'rgba(20,12,28,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  subs(K, c, a, lang) {
    const { ctx, F, W } = K;
    ctx.globalAlpha = a; ctx.font = F.body(lang === 'ja' ? 38 : 40); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff6ea'; ctx.fillText(c.t, W / 2, 1018, 1600);
  },
  overlay(K, t) { K.vignette(.5, '20,10,25'); K.grain(.10, t); },
};
