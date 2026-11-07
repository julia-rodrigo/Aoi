// Standing, blue: Moss standing in Aoi's own blues. She stands at the bottom edge, changes side each chapter,
// and turns to present or point when new content arrives. Content fills the space beside her.
(window.STYLES = window.STYLES || {})['stand-blue'] = {
  extends: 'moss-stand', id: 'stand-blue', name: 'Standing, blue',
  blurb: 'Moss standing in her blues: navy ink, royal-blue accent and italic key words, soft blue light behind her. Changes side each chapter, presents new content.',
  palette: {
    ink: '#0B1640', muted: '#69739A', line: '#D9DFEE', accent: '#1F4FC0', cyan: '#36C9F0', soft: '#E8EEFB', card: '#FFFFFF',
    bar: '#F5F7FC', num: '#A9B1CC', code: '#0B1640', hi: 'rgba(31,79,192,.12)', focus: 'rgba(31,79,192,.09)', shadow: 'rgba(11,22,64,.08)',
    row: '#F1F4FB', onAcc: '#FFFFFF', ring: 'rgba(31,79,192,.16)', subFill: 'rgba(255,255,255,.95)', subLine: '#D9DFEE', subInk: '#0B1640',
    canvas: '#FFFFFF', glow: '31,79,192',
  },
  sides: 'alternate', poses: true, transition: 'drop', regionBottom: 910,
  flow: { dir: 'vertical', node: 20, track: 4 },
  list: { style: 'rows', rowR: 18, r: 28 },
  host: {
    mode: 'solid', bob: 0, shadow: null, clip: null, front: null,
    behind(K, t, r) {
      const { ctx, C } = K; const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * .5, 20, r.x + r.w / 2, r.y + r.h * .5, r.w * .78);
      g.addColorStop(0, `rgba(${C.glow},.17)`); g.addColorStop(1, `rgba(${C.glow},0)`); ctx.fillStyle = g; ctx.fillRect(r.x - r.w, r.y - r.h, r.w * 3, r.h * 3);
    },
    layouts: { center: { x: 960, bottom: 1080, s: 3 }, left: { x: 500, bottom: 1080, s: 3 }, right: { x: 1420, bottom: 1080, s: 3 }, corner: { x: 1650, bottom: 1080, s: 2 } },
  },
  room(K, t) {
    const { ctx, W, H, C } = K;
    ctx.fillStyle = C.canvas; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * .3, -200, 50, W * .3, -200, 1500); g.addColorStop(0, 'rgba(31,79,192,.05)'); g.addColorStop(1, 'rgba(31,79,192,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
};
