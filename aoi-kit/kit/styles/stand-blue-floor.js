(window.STYLES = window.STYLES || {})['stand-blue-floor'] = {
  extends: 'stand-blue', id: 'stand-blue-floor', name: 'Standing, stage floor',
  blurb: 'A white wall and a soft blue floor band, so she stands on a small stage; a gentle shadow under her.',
  room(K, t) {
    const { ctx, W, H } = K; const fy = 930;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, fy);
    const f = ctx.createLinearGradient(0, fy, 0, H); f.addColorStop(0, '#E9EEFA'); f.addColorStop(1, '#DCE4F6'); ctx.fillStyle = f; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = '#D3DCF0'; ctx.fillRect(0, fy, W, 2);
  },
  regionBottom: 900,
};
