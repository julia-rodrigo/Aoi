// Hologram editorial: the hologram desk room with the Moss type (Instrument Serif + Manrope) and neutral ink.
(window.STYLES = window.STYLES || {})['holo-editorial'] = {
  extends: 'moss-holo', id: 'holo-editorial', name: 'Hologram editorial',
  blurb: 'The hologram desk room (soft blue wall, pixel grid) with your editorial type: serif headlines, blue italic key words, Manrope.',
  palette: { accent: '#2F5BFF', cyan: '#2FD3FF', soft: '#EAF0FF', ring: 'rgba(47,91,255,.14)', hi: 'rgba(47,91,255,.12)', focus: 'rgba(47,91,255,.10)',
    row: '#F1F4FB', line: '#DFE6F4', muted: '#6B7390', bar: '#F3F6FC', ink: '#18203A', code: '#18203A', subInk: '#18203A', subLine: '#DFE6F4' },
  room(K, t) { K.baseRoom(t); },
  hud(K, t, secs, k) {
    const { ctx, F, C } = K;
    ctx.font = F.body(22); ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic'; ctx.fillText(secs[k].title, 64, 72);
    ctx.fillStyle = C.line; ctx.fillRect(64, 88, 180, 2); ctx.fillStyle = C.accent; ctx.fillRect(64, 88, 180 * (k + 1) / secs.length, 2);
  },
};
