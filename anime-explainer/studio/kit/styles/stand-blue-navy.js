(window.STYLES = window.STYLES || {})['stand-blue-navy'] = {
  extends: 'stand-blue', id: 'stand-blue-navy', name: 'Standing, navy and cyan',
  blurb: 'More contrast: deep navy headlines and active rows, cyan italic key words and rings taken from her headset.',
  palette: { ink: '#071034', accent: '#0E2A7A', hi: 'rgba(54,201,240,.16)', ring: 'rgba(54,201,240,.30)', soft: '#E6F7FD', glow: '54,160,230', mark: '#1A9BD0' },
  transition: 'cut',
  room(K, t) {
    const { ctx, W, H } = K; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(54,201,240,0)'); g.addColorStop(1, 'rgba(54,201,240,.06)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
};
