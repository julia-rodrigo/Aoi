// Static file server for the player (the studio root). Supports Range so audio can seek in the preview.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

export function startServer(port = 0) {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    const size = fs.statSync(file).size;
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((res) => srv.listen(port, '127.0.0.1', () => res(srv)));
}

export function videoArg() {
  const v = process.argv[2];
  if (!v || !fs.existsSync(path.join(ROOT, 'videos', v, 'bundle.json'))) {
    console.error(`usage: ./studio <command> <video>   (videos/${v || '?'}/bundle.json is missing: run ./studio cues ${v || '<video>'} first)`);
    process.exit(1);
  }
  return v;
}
export function opt(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
}
