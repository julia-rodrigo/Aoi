// ./studio styles <video> [--round 2 --parent sakura-classroom] [--styles a,b,c] [--lang en]
// Style sheets without a render: six frames per style (host, statement, list, file, title, flow) from the live player,
// written to kit/styles/gallery/r<round>/<style>.jpg, and the round recorded in kit/styles/gallery/rounds.json.
// Look at them with ./studio gallery <video>.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, videoArg, opt, ROOT } from './server.mjs';

const v = videoArg();
const round = +opt('round', 1);
const lang = opt('lang', 'en');
const gdir = path.join(ROOT, 'kit', 'styles', 'gallery');
const rfile = path.join(gdir, 'rounds.json');
const rounds = fs.existsSync(rfile) ? JSON.parse(fs.readFileSync(rfile, 'utf8')) : { video: v, rounds: [] };
const ids = opt('styles') ? opt('styles').split(',') : (rounds.rounds.find((r) => r.n === round) || {}).styles?.map((s) => s.id);
if (!ids || !ids.length) { console.error('give --styles a,b,c for a new round'); process.exit(1); }
const out = path.join(gdir, `r${round}`);
fs.mkdirSync(out, { recursive: true });

const bundle = JSON.parse(fs.readFileSync(path.join(ROOT, 'videos', v, 'bundle.json'), 'utf8'));
// six moments: the greeting, a statement as she turns to it, a full list, a file after she changes side, the steps, a host line
const pick = (pred, at) => { const b = bundle.beats.find(pred); return b ? (at === 'end' ? b.end - .3 : b.start + at) : null; };
const shots = [['host', pick((b) => b.type === 'host', 1.0)], ['big', pick((b) => b.type === 'big', 1.0)], ['list', pick((b) => b.type === 'list', 'end')],
  ['screen', pick((b) => b.type === 'screen', 1.2)], ['flow', pick((b) => b.type === 'flow', 'end')],
  ['host text', pick((b) => b.type === 'host' && b.body.length, 1.0) ?? pick((b) => b.type === 'title', .6)]].filter((s) => s[1] !== null);

const srv = await startServer(0);
const browser = await chromium.launch({ headless: true });
const meta = [];
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${srv.address().port}/kit/player/player.html?video=${v}&render=1&style=${id}&lang=${lang}`);
  try { await page.evaluate(() => window.studio.ready); } catch (e) { errors.push(String(e)); }
  const info = await page.evaluate(() => { const s = (window.STYLES || {}); const k = Object.keys(s).pop(); return s; });
  const sheet = await page.evaluate((shots) => {
    const cw = 960, ch = 540, cols = 3, rows = Math.ceil(shots.length / cols);
    const sh = document.createElement('canvas'); sh.width = cw * cols; sh.height = ch * rows;
    const g = sh.getContext('2d');
    shots.forEach(([, t], i) => { window.studio.seek(t); g.drawImage(document.getElementById('c'), (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); });
    return sh.toDataURL('image/jpeg', .86);
  }, shots);
  fs.writeFileSync(path.join(out, `${id}.jpg`), Buffer.from(sheet.split(',')[1], 'base64'));
  const st = info[id] || {};
  meta.push({ id, name: st.name || id, blurb: st.blurb || '', extends: st.extends || null, errors: [...new Set(errors)] });
  console.log(`${id}: ${errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok'}`);
  await page.close();
}
await browser.close(); srv.close();
const existing = rounds.rounds.find((r) => r.n === round);
const entry = { n: round, parent: opt('parent', existing?.parent || null), lang, styles: meta.map((m, i) => ({ num: i + 1, ...m })) };
rounds.rounds = rounds.rounds.filter((r) => r.n !== round).concat([entry]).sort((a, b) => a.n - b.n);
rounds.video = v;
fs.writeFileSync(rfile, JSON.stringify(rounds, null, 1));
console.log(`styles: round ${round}, ${meta.length} sheets in ${out}`);
