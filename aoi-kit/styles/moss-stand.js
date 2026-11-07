// Moss, standing: the motion-design type; Aoi stands at the bottom edge of the frame, no frame around her.
(window.STYLES = window.STYLES || {})['moss-stand'] = {
  extends: 'moss-window', id: 'moss-stand', name: 'Moss, standing',
  blurb: 'Moss type and cards. Aoi stands at the bottom edge of the frame like a presenter, on a soft moss light; cards in a single sheet.',
  host: { mode: 'solid', behind(K, t, r) {
      const { ctx } = K; const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * .55, 20, r.x + r.w / 2, r.y + r.h * .55, r.w * .75);
      g.addColorStop(0, 'rgba(85,102,58,.16)'); g.addColorStop(1, 'rgba(85,102,58,0)'); ctx.fillStyle = g; ctx.fillRect(r.x - r.w, r.y - r.h, r.w * 3, r.h * 3);
    }, clip: null, front: null, shadow: null, bob: 0,
    layouts: { center: { x: 960, bottom: 1080, s: 3 }, left: { x: 520, bottom: 1080, s: 3 }, right: { x: 1400, bottom: 1080, s: 3 }, corner: { x: 1640, bottom: 1080, s: 2 } } },
  flow: { style: 'cards', r: 22 },
};
