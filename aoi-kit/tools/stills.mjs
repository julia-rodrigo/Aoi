// ./studio stills <video> [--at 0.9] [--beat N]: the pencil test. One frame per beat on contact sheets in stills/.
// --beat N also saves that beat's frame at full size (stills/beat_NN.png).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, videoArg, opt, ROOT } from './server.mjs';

const v = videoArg();
const at = +opt('at', 0.9);
const one = opt('beat');
const out = path.join(ROOT, 'videos', v, 'stills');
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.startsWith('sheet_')) fs.unlinkSync(path.join(out, f));
const srv = await startServer(0);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/kit/player/player.html?video=${v}&render=1`);
const info = await page.evaluate(() => window.studio.ready);
const times = info.beats.map((b) => Math.min(b.start + at, b.start + (b.end - b.start) * 0.6));
const sheets = await page.evaluate(({ times, beats }) => {
  const cols = 3, perSheet = 12, tw = 640, th = 360, lab = 44;
  const res = [];
  for (let s = 0; s < times.length; s += perSheet) {
    const n = Math.min(perSheet, times.length - s), rows = Math.ceil(n / cols);
    const sh = document.createElement('canvas'); sh.width = cols * tw; sh.height = rows * (th + lab);
    const g = sh.getContext('2d'); g.fillStyle = '#10131f'; g.fillRect(0, 0, sh.width, sh.height);
    for (let i = 0; i < n; i++) {
      const k = s + i; window.studio.seek(times[k]);
      const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lab);
      g.drawImage(document.getElementById('c'), x, y + lab, tw, th);
      g.fillStyle = '#fff'; g.font = '600 22px -apple-system, sans-serif';
      const b = beats[k];
      g.fillText(`${k + 1}  ${Math.floor(times[k] / 60)}:${(times[k] % 60).toFixed(1).padStart(4, '0')}  ${b.type}`, x + 12, y + 30);
      g.strokeStyle = '#2f5bff'; g.strokeRect(x + .5, y + lab + .5, tw - 1, th - 1);
    }
    res.push(sh.toDataURL('image/jpeg', 0.88));
  }
  return res;
}, { times, beats: info.beats });
sheets.forEach((d, i) => fs.writeFileSync(path.join(out, `sheet_${String(i + 1).padStart(2, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64')));
if (one) {
  await page.evaluate((t) => window.studio.seek(t), times[+one - 1]);
  await page.locator('#c').screenshot({ path: path.join(out, `beat_${String(one).padStart(2, '0')}.png`) });
}
await browser.close(); srv.close();
if (errors.length) console.log('page errors:\n' + [...new Set(errors)].join('\n'));
console.log(`stills: ${times.length} beats on ${sheets.length} sheet(s) in ${out}`);
