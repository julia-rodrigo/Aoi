(window.STYLES = window.STYLES || {})['stand-blue-spot'] = {
  extends: 'stand-blue', id: 'stand-blue-spot', name: 'Standing, soft spotlight',
  blurb: 'A large soft blue disc behind her like a studio spotlight, and a white-to-pale-blue page.',
  room(K, t) {
    const { ctx, W, H } = K; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#EEF3FC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  host: { behind(K, t, r) {
    const { ctx } = K; const cx = r.x + r.w / 2, cy = r.y + r.h * .5, R = r.w * .52;
    const g = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R); g.addColorStop(0, 'rgba(31,79,192,.16)'); g.addColorStop(1, 'rgba(31,79,192,.05)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  } },
};
