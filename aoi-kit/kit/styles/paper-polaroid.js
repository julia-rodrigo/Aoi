// Paper polaroid: paper world; Aoi in a taped instant photo (the paper version of a cam window).
(window.STYLES = window.STYLES || {})['paper-polaroid'] = {
  extends: 'paper-v2', id: 'paper-polaroid', name: 'Paper, polaroid',
  blurb: 'Paper world with Aoi in a taped instant photo (a paper cam window), handwritten name under her, marker highlights.',
  host: {
    mode: 'solid', shadow: null, bob: 0,
    layouts: { center: { x: 960, bottom: 860, s: 3 }, left: { x: 540, bottom: 860, s: 3 }, right: { x: 1380, bottom: 860, s: 3 }, corner: { x: 1610, bottom: 880, s: 2 } },
    behind(K, t, r) {
      const { ctx } = K; const p = r.s * 9;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(-.015); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      ctx.shadowColor = 'rgba(60,50,30,.22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#FFFEFB'; ctx.fillRect(r.x - p, r.y - p * 1.6, r.w + p * 2, r.h + p * 6.4); ctx.shadowColor = 'transparent';
      const g = ctx.createLinearGradient(0, r.y - p * .6, 0, r.y + r.h); g.addColorStop(0, '#EAE6DC'); g.addColorStop(1, '#D9D3C4');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y - p * .6, r.w, r.h + p * .6);
    },
    clip(K, r) { const p = r.s * 9; K.ctx.rect(r.x, r.y - p * .6, r.w, r.h + p * .6); },
    front(K, t, r) {
      const { ctx, F } = K; const p = r.s * 9;
      ctx.font = K.LANG === 'ja' ? F.pixel(r.s * 12) : `${r.s * 17}px Caveat`; ctx.fillStyle = '#3a3630'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(K.LANG === 'ja' ? 'アオイ' : 'Aoi', r.x + r.w / 2, r.y + r.h + p * 2.4);
      const tape = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(240,226,180,.85)'; ctx.fillRect(-r.s * 22, -r.s * 6, r.s * 44, r.s * 12); ctx.restore(); };
      tape(r.x + r.w / 2, r.y - p * 1.6, .03);
    },
  },
};
