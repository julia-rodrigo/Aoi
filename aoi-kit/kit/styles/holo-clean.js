// Hologram clean: warm white room with no grid and no floating squares; rounded type kept; quieter cards.
(window.STYLES = window.STYLES || {})['holo-clean'] = {
  extends: 'holo-desk-v2', id: 'holo-clean', name: 'Hologram clean',
  blurb: 'The hologram desk with less on the wall: warm white, no grid or squares, rounded type kept, quiet hairline cards and dot markers.',
  palette: { line: '#E6E8EE', shadow: 'rgba(30,40,70,.06)', row: '#F4F5F8' },
  marker: 'dot', bullet: null,
  list: { style: 'rows', r: 26, rowR: 16 },
  room(K, t) {
    const { ctx, W, H, DESK_Y } = K;
    const g = ctx.createLinearGradient(0, 0, 0, DESK_Y); g.addColorStop(0, '#FCFCFB'); g.addColorStop(1, '#EEF1F6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, DESK_Y);
    const d = ctx.createLinearGradient(0, DESK_Y, 0, H); d.addColorStop(0, '#FFFFFF'); d.addColorStop(1, '#F3F4F7');
    ctx.fillStyle = d; ctx.fillRect(0, DESK_Y, W, H - DESK_Y); ctx.fillStyle = '#E2E5EC'; ctx.fillRect(0, DESK_Y, W, 2);
  },
  underline(K, x, y, k) { const { ctx, C } = K; ctx.fillStyle = C.accent; K.rr(x, y, 220 * k, 8, 4); ctx.fill(); },
};
