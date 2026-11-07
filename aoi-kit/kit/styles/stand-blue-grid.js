(window.STYLES = window.STYLES || {})['stand-blue-grid'] = {
  extends: 'stand-blue', id: 'stand-blue-grid', name: 'Standing, dot grid',
  blurb: 'A faint blue dot grid on white, like a design canvas; cards sit on it with soft shadows.',
  room(K, t) {
    const { ctx, W, H } = K; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(31,79,192,.16)';
    for (let y = 30; y < H; y += 36) for (let x = 30; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
  },
};
