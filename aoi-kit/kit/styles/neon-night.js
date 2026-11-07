// 2. Neon night: a dark high-rise at night, rain on the glass, neon city. Aoi is a cyan hologram with a magenta rim.
(window.STYLES = window.STYLES || {})['neon-night'] = {
  id: 'neon-night', name: 'Neon night',
  blurb: 'Rainy cyberpunk city at night. Dark glass cards with neon edges, Orbitron titles, Aoi as a bright hologram.',
  fontFiles: { Orbitron: { url: '/kit/fonts/Orbitron.ttf', desc: { weight: '400 900' } }, ZenKakuB: '/kit/fonts/ZenKakuGothicNew-Bold.ttf', ZenKakuM: '/kit/fonts/ZenKakuGothicNew-Medium.ttf' },
  fonts: { title: 'Orbitron, ZenKakuB', titleW: 800, body: 'ZenKakuM', bodyW: 500, label: 'Orbitron', labelJA: 'ZenKakuB' },
  images: { bg: '/kit/styles/plates/neon-night.jpg' },
  palette: {
    ink: '#f3f0ff', muted: '#aaa3cc', line: 'rgba(120,240,255,.28)', accent: '#ff4fd8', cyan: '#3ef2ff', pink: '#ff4fd8',
    soft: 'rgba(255,79,216,.16)', card: 'rgba(14,10,34,.74)', bar: 'rgba(255,255,255,.05)', num: '#6f6890', code: '#ece9ff',
    hi: 'rgba(255,79,216,.38)', focus: 'rgba(62,242,255,.16)', shadow: 'rgba(0,0,0,.55)', holo: '120,240,255',
    subFill: 'rgba(8,6,22,.70)', subLine: 'rgba(62,242,255,.45)', subInk: '#f3f0ff',
  },
  host: { glowAlpha: .8 },
  room(K, t) {
    const { ctx, W, H } = K;
    K.plate(K.img.bg, t, .04);
    const g = ctx.createLinearGradient(0, 0, W * .75, 0);
    g.addColorStop(0, 'rgba(6,4,18,.82)'); g.addColorStop(.6, 'rgba(6,4,18,.45)'); g.addColorStop(1, 'rgba(6,4,18,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // rain streaks
    ctx.strokeStyle = 'rgba(170,220,255,.18)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      const x = K.hash(i) * W, sp = 900 + 500 * K.hash(i * 2), y = ((t * sp + K.hash(i * 3) * H) % (H + 200)) - 100;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 34); ctx.stroke();
    }
  },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    K.rr(x, y, w, h, 14); ctx.fillStyle = o.on ? 'rgba(40,10,50,.82)' : C.card; ctx.fill();
    ctx.shadowColor = o.on ? C.accent : C.cyan; ctx.shadowBlur = o.on ? 26 : 14;
    ctx.lineWidth = o.on ? 3 : 2; ctx.strokeStyle = o.on ? C.accent : 'rgba(62,242,255,.55)'; K.rr(x, y, w, h, 14); ctx.stroke();
  },
  underline(K, x, y, k) {
    const { ctx, C } = K;
    ctx.shadowColor = C.accent; ctx.shadowBlur = 20; ctx.fillStyle = C.accent; ctx.fillRect(x, y, 520 * k, 6);
  },
  overlay(K, t) { K.vignette(.45); },
};
