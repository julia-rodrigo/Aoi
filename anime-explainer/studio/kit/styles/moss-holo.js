// Moss, hologram: the motion-design type and cards, with Aoi as the hologram over a phone on a white desk.
(window.STYLES = window.STYLES || {})['moss-holo'] = {
  extends: 'moss-window', id: 'moss-holo', name: 'Moss, hologram',
  blurb: 'Same Moss type and cards, but Aoi is the hologram over a phone on a white desk (the hologram idea, in your editorial type).',
  host: { mode: 'holo', beam: true, wave: true, particles: 'holo', bob: 5, behind: null, clip: null, front: null,
    layouts: { center: { x: 960, bottom: 848, s: 3 }, left: { x: 520, bottom: 848, s: 3 }, right: { x: 1400, bottom: 848, s: 3 }, corner: { x: 1610, bottom: 872, s: 2 } } },
  palette: { holo: '120,225,255', wallTop: '#FFFFFF', wallBot: '#F4F4F1', deskEdge: '#E4E4DF' },
  room(K, t) {
    const { ctx, W, H, DESK_Y } = K;
    const g = ctx.createLinearGradient(0, 0, 0, DESK_Y); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#F1F2EC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, DESK_Y);
    const d = ctx.createLinearGradient(0, DESK_Y, 0, H); d.addColorStop(0, '#FFFFFF'); d.addColorStop(1, '#F4F4F1');
    ctx.fillStyle = d; ctx.fillRect(0, DESK_Y, W, H - DESK_Y);
    ctx.fillStyle = '#E4E4DF'; ctx.fillRect(0, DESK_Y, W, 1.5);
  },
};
