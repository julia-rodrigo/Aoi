// ./studio strip <video> --times 10,10.5,11 [--out name.jpg] [--cols 4] [--w 640] [--full 12.3]: frames at those times
// on one sheet (Japanese voice, English text and subtitles), saved in videos/<video>/stills/. --full also saves that one frame at 1920x1080.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, opt, ROOT } from './server.mjs';

const v = process.argv[2];
if (!v || v.startsWith('--')) { console.error('usage: ./studio strip <video> --times 1,2,3 [--out name.jpg]'); process.exit(1); }
const times = (opt('times', '0,0.4,0.8,1.2,1.6,2.0,2.5,3.0')).split(',').map(Number);
const name = opt('out', 'strip.jpg');
const cols = +opt('cols', 4), tw = +opt('w', 640), th = Math.round(tw * 9 / 16), lab = 40;
const srv = await startServer(0);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${srv.address().port}/kit/player/player.html?video=${v}&render=1&lang=ja`);
await page.evaluate(() => window.studio.ready);
const data = await page.evaluate(({ times, cols, tw, th, lab }) => {
  const rows = Math.ceil(times.length / cols);
  const sh = document.createElement('canvas'); sh.width = cols * tw; sh.height = rows * (th + lab);
  const g = sh.getContext('2d'); g.fillStyle = '#10131f'; g.fillRect(0, 0, sh.width, sh.height);
  times.forEach((t, i) => {
    window.studio.seek(t);
    const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + lab);
    g.drawImage(document.getElementById('c'), x, y + lab, tw, th);
    g.fillStyle = '#fff'; g.font = '600 22px -apple-system, sans-serif'; g.fillText(`${t.toFixed(2)} s`, x + 12, y + 28);
    g.strokeStyle = '#2f5bff'; g.strokeRect(x + .5, y + lab + .5, tw - 1, th - 1);
  });
  return sh.toDataURL('image/jpeg', 0.9);
}, { times, cols, tw, th, lab });
const out = path.join(ROOT, 'videos', v, 'stills', name);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
const full = opt('full', '');
if (full) {
  const img = await page.evaluate((t) => { window.studio.seek(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, +full);
  const fp = path.join(ROOT, 'videos', v, 'stills', `full_${String(full).replace('.', '_')}.jpg`);
  fs.writeFileSync(fp, Buffer.from(img.split(',')[1], 'base64'));
  console.log(fp);
}
await browser.close(); srv.close();
if (errors.length) console.log('page errors:\n' + [...new Set(errors)].join('\n'));
console.log(out);
