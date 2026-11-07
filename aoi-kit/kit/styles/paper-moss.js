// Paper moss: the paper texture with the Gallery Moss accent and italic serif key words; sticker Aoi.
(window.STYLES = window.STYLES || {})['paper-moss'] = {
  extends: 'paper-v2', id: 'paper-moss', name: 'Paper, moss',
  blurb: 'Warm paper with your Moss accent: italic serif key words in moss instead of marker, white hairline cards, sticker Aoi.',
  fontFiles: { InstrumentSerifItalic: { url: '/kit/fonts/InstrumentSerif-Italic.ttf', desc: { sizeAdjust: '118%' } } },
  fonts: { italic: 'InstrumentSerifItalic' },
  mark: 'italic', underline: false, label: false,
  palette: { accent: '#55663A', ring: 'rgba(85,102,58,.16)', soft: '#F1F3EA', focus: 'rgba(85,102,58,.10)', row: '#FBF9F3' },
  list: { style: 'rows', r: 10, rowR: 6 },
  marker: 'dot', bullet: null,
  hud(K, t, secs, k) { const { ctx, F, C } = K; ctx.font = F.title(36); ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic'; ctx.fillText(secs[k].title, 64, 78); },
};
