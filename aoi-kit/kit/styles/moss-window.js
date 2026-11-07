// Moss, cam window: Nick's motion-design look (Gallery Moss) in light mode. Aoi sits in a rounded cam window, bottom right.
(window.STYLES = window.STYLES || {})['moss-window'] = {
  id: 'moss-window', name: 'Moss, cam window',
  blurb: 'Your motion look in light mode: white canvas, Instrument Serif with italic moss words, Manrope, hairline cards. Aoi in a cam window bottom right.',
  fontFiles: {
    InstrumentSerif: { url: '/kit/fonts/InstrumentSerif-Regular.ttf', desc: { sizeAdjust: '118%' } },
    InstrumentSerifItalic: { url: '/kit/fonts/InstrumentSerif-Italic.ttf', desc: { sizeAdjust: '118%' } },
    Manrope: { url: '/kit/fonts/Manrope.ttf', desc: { weight: '200 800' } },
    DMMono: '/kit/fonts/DMMono-Medium.ttf', ZenOldMincho: '/kit/fonts/ZenOldMincho-Regular.ttf', ZenKakuM: '/kit/fonts/ZenKakuGothicNew-Medium.ttf',
  },
  fonts: { title: 'InstrumentSerif, ZenOldMincho', titleW: 400, body: 'Manrope, ZenKakuM', bodyW: 600, italic: 'InstrumentSerifItalic',
    label: 'Manrope', labelJA: 'ZenKakuM', labelUpper: false, mono: 'DMMono', monoB: 'DMMono' },
  palette: {
    ink: '#141414', muted: '#8A8A83', line: '#E4E4DF', accent: '#55663A', cyan: '#55663A', soft: '#EEF2E6', card: '#FFFFFF',
    bar: '#F7F7F4', num: '#B5B5AD', code: '#141414', hi: 'rgba(85,102,58,.14)', focus: 'rgba(85,102,58,.10)', shadow: 'rgba(20,20,20,.07)',
    row: '#F4F3F1', onAcc: '#FFFFFF', ring: 'rgba(85,102,58,.16)',
    subFill: 'rgba(255,255,255,.94)', subLine: '#E4E4DF', subInk: '#141414', canvas: '#FFFFFF',
  },
  mark: 'italic', label: false, underline: false, marker: 'none', transition: 'fade',
  list: { style: 'rows', rowR: 16, r: 28 },
  flow: { style: 'track', node: 15, track: 3 },
  host: {
    mode: 'solid', beam: false, wave: false, particles: null, bob: 0,
    layouts: { center: { x: 960, bottom: 950, s: 3 }, left: { x: 540, bottom: 950, s: 3 }, right: { x: 1380, bottom: 950, s: 3 }, corner: { x: 1622, bottom: 1032, s: 2 } },
    win(r) { const top = r.h * .07; return { x: r.x, y: r.y - top, w: r.w, h: r.h + top, rad: r.s * 12 }; },
    behind(K, t, r) {
      const { ctx } = K; const w = window.STYLES['moss-window'].host.win(r);
      ctx.shadowColor = 'rgba(20,20,20,.10)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
      K.rr(w.x, w.y, w.w, w.h, w.rad); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowColor = 'transparent';
      const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h); g.addColorStop(0, '#F3F4EE'); g.addColorStop(1, '#E2E6D8');
      K.rr(w.x, w.y, w.w, w.h, w.rad); ctx.fillStyle = g; ctx.fill();
    },
    clip(K, r) { const w = window.STYLES['moss-window'].host.win(r); K.rr(w.x, w.y, w.w, w.h, w.rad); },
    front(K, t, r) { const { ctx } = K; const w = window.STYLES['moss-window'].host.win(r); ctx.lineWidth = 1.5; ctx.strokeStyle = '#E4E4DF'; K.rr(w.x, w.y, w.w, w.h, w.rad); ctx.stroke(); },
  },
  room(K, t) {
    const { ctx, W, H, C } = K;
    ctx.fillStyle = C.canvas; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * .3, -200, 50, W * .3, -200, 1400); g.addColorStop(0, 'rgba(85,102,58,.045)'); g.addColorStop(1, 'rgba(85,102,58,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K; const r = o.r ?? 24;
    ctx.shadowColor = C.shadow; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    K.rr(x, y, w, h, r); ctx.fillStyle = o.fill || C.card; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = o.on ? 2.5 : 1.5; ctx.strokeStyle = o.on ? C.accent : C.line; K.rr(x, y, w, h, r); ctx.stroke();
  },
  hud(K, t, secs, k) {
    const { ctx, F, C } = K;
    ctx.font = F.body(22); ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic'; ctx.fillText(secs[k].title, 64, 72);
    const w = 180, x0 = 64; ctx.fillStyle = C.line; ctx.fillRect(x0, 88, w, 2);
    ctx.fillStyle = C.accent; ctx.fillRect(x0, 88, w * (k + 1) / secs.length, 2);
  },
};
