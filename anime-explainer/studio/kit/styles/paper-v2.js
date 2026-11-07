// Paper v2: the paper-and-stickers look with cleaner cards and the new components; Aoi lower; Manrope for body text.
(window.STYLES = window.STYLES || {})['paper-v2'] = {
  extends: 'paper-sticker', id: 'paper-v2', name: 'Paper v2',
  blurb: 'Paper and stickers, refined: Instrument Serif + Manrope, centred text, yellow marker highlights, list rows that sharpen, a step track.',
  fontFiles: { Manrope: { url: '/kit/fonts/Manrope.ttf', desc: { weight: '200 800' } }, ZenKakuM: '/kit/fonts/ZenKakuGothicNew-Medium.ttf',
    InstrumentSerif: { url: '/kit/fonts/InstrumentSerif-Regular.ttf', desc: { sizeAdjust: '118%' } }, ZenOldMincho: '/kit/fonts/ZenOldMincho-Regular.ttf' },
  fonts: { title: 'InstrumentSerif, ZenOldMincho', body: 'Manrope, ZenKakuM', bodyW: 600 },
  palette: { row: '#FBF8F0', ring: 'rgba(228,87,46,.14)' },
  host: { layouts: { center: { x: 960, bottom: 940, s: 3 }, left: { x: 520, bottom: 940, s: 3 }, right: { x: 1400, bottom: 940, s: 3 }, corner: { x: 1620, bottom: 960, s: 2 } } },
  list: { style: 'cards', r: 4 },
  flow: { style: 'track', node: 14, track: 3 },
  card(K, x, y, w, h, o) {
    const { ctx, C } = K;
    ctx.shadowColor = 'rgba(60,50,30,.12)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = o.fill || C.card; ctx.fillRect(x, y, w, h); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#E6DFCF'; ctx.strokeRect(x, y, w, h);
    if (o.on) { ctx.fillStyle = C.accent; ctx.fillRect(x, y, 6, h); }
  },
};
