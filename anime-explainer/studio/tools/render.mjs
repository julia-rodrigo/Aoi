// ./studio render <video> [--lang ja] [--subs en|ja|off] [--workers 2] [--from 0 --to 12] [--fps 30]
//   [--layer host --host right]: only Aoi and the subtitles on a clear frame -> render/<video>.host_<from>-<to>.mov
//   (ProRes 4444 with alpha) and render/<video>.mix_<from>-<to>.wav, to lay over a motion-engine render (tools/blend.mjs).
// Stage 5: plays the scene in headless Chrome one frame at a time, mixes the voice with the music and the
// sound effects, and writes render/<video>.<lang>.mp4 (1080p) plus a _phone.mp4 (720p). Every language has the
// same length and the same frame for every beat, so the files can be swapped at any second (see ./studio watch).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { startServer, videoArg, opt, ROOT } from './server.mjs';

const v = videoArg();
const vdir = path.join(ROOT, 'videos', v);
const bundle = JSON.parse(fs.readFileSync(path.join(vdir, 'bundle.json'), 'utf8'));
const lang = opt('lang', bundle.master || 'en');
const subs = opt('subs', bundle.captions ? 'en' : 'off');      // en, ja or off (English by default, whatever the voice)
const text = opt('text', 'en');                                 // on-screen text language
const layer = opt('layer', ''), hostAt = opt('host', '');
const L = bundle.langs ? bundle.langs[lang] : bundle;
if (!L) { console.error(`no ${lang} in bundle.json: run ./studio cues ${v} after the ${lang} voice and words`); process.exit(1); }
const fps = +opt('fps', 30);
const onBox = !!process.env.OFFLOAD;                 // pc.py sets OFFLOAD=1 on the render boxes
const workers = Math.min(onBox ? 8 : 2, +opt('workers', onBox ? 6 : 2));   // two at most on a laptop, so it stays usable
const t0 = +opt('from', 0), t1 = Math.min(bundle.duration, +opt('to', bundle.duration));
const partial = t0 > 0 || t1 < bundle.duration;
const out = path.join(vdir, 'render');
const work = path.join(out, 'work');
fs.mkdirSync(work, { recursive: true });
const workTag = `${lang}-${subs}-${text}${layer ? '-' + layer : ''}`;

const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} failed: ${err.slice(-1500)}`))));
});

const nFrames = Math.round((t1 - t0) * fps);
const srv = await startServer(0);
const url = `http://127.0.0.1:${srv.address().port}/kit/player/player.html?video=${v}&render=1&lang=${lang}&subs=${subs}&text=${text}${layer ? `&layer=${layer}` : ''}${hostAt ? `&host=${hostAt}` : ''}`;
const browser = await chromium.launch({ headless: true });
const started = Date.now();
let done = 0;
const ranges = Array.from({ length: workers }, (_, w) => [Math.floor(nFrames * w / workers), Math.floor(nFrames * (w + 1) / workers)]);

async function worker(w, [a, b]) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('page error:', String(e)));
  await page.goto(url);
  await page.evaluate(() => window.studio.ready);
  const file = path.join(work, `part_${workTag}_${w}.${layer ? 'mov' : 'mp4'}`);
  const enc = layer ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'animation'];
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', ...enc, file], { stdio: ['pipe', 'ignore', 'inherit'] });
  const closed = new Promise((res) => ff.on('close', res));
  const canvas = page.locator('#c');
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.studio.seek(t), t0 + f / fps);
    const png = await canvas.screenshot({ type: 'png', omitBackground: !!layer });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
    if (w === 0 && done % 60 === 0) {
      const el = (Date.now() - started) / 1000;
      process.stdout.write(`\rframes ${done}/${nFrames}  ${(done / el).toFixed(1)} fps  eta ${Math.round((nFrames - done) / (done / el))} s   `);
    }
  }
  ff.stdin.end();
  await closed;
  await page.close();
  return file;
}

const parts = await Promise.all(ranges.map((r, w) => worker(w, r)));
await browser.close(); srv.close();
console.log(`\nframes done in ${Math.round((Date.now() - started) / 1000)} s`);

// join the parts
fs.writeFileSync(path.join(work, `parts_${workTag}.txt`), parts.map((p) => `file '${p}'`).join('\n'));
const silent = path.join(work, `video_${workTag}.${layer ? 'mov' : 'mp4'}`);
await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, `parts_${workTag}.txt`), '-c', 'copy', silent]);

// audio: voice + music bed (low, faded) + sound effects, then loudness to -14 LUFS for YouTube
const dur = (t1 - t0).toFixed(3);
const voiceWav = path.join(ROOT, L.audio.replace(/^\//, ''));
const inputs = ['-ss', String(t0), '-t', dur, '-i', voiceWav,
  '-stream_loop', '-1', '-t', dur, '-i', path.join(ROOT, 'kit', 'audio', 'music_bed.mp3')];
const fx = L.sfx.filter((e) => e.t >= t0 && e.t < t1);
fx.forEach((e) => inputs.push('-i', path.join(ROOT, 'kit', 'audio', 'sfx', `${e.name}.mp3`)));
const musicVol = +opt('music', 0.11);
let filter = `[0:a]aresample=48000,aformat=channel_layouts=stereo[vo];` +
  `[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${musicVol},afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, dur - 2.5)}:d=2.5[mu];`;
fx.forEach((e, i) => { const ms = Math.round((e.t - t0) * 1000); filter += `[${i + 2}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.32,adelay=${ms}|${ms}[f${i}];`; });
filter += `[vo][mu]${fx.map((_, i) => `[f${i}]`).join('')}amix=inputs=${2 + fx.length}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]`;
const mix = path.join(work, `mix_${lang}.wav`);
await run('ffmpeg', ['-y', ...inputs, '-filter_complex', filter, '-map', '[a]', '-ar', '48000', mix]);

if (layer) {
  const span = `${t0}-${t1.toFixed(2)}`;
  const lay = path.join(out, `${v}.${layer}_${span}.mov`), wav = path.join(out, `${v}.mix_${span}.wav`);
  fs.copyFileSync(silent, lay); fs.copyFileSync(mix, wav);
  console.log(`render: ${lay}\n        ${wav}`);
  process.exit(0);
}
const tag = subs === 'en' && text === 'en' ? lang : `${lang}-subs-${subs}-text-${text}`;
const name = partial ? `${v}.${tag}_${t0}-${t1}` : `${v}.${tag}`;
const final = path.join(out, `${name}.mp4`);
await run('ffmpeg', ['-y', '-i', silent, '-i', mix, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
const phone = path.join(out, `${name}_phone.mp4`);
await run('ffmpeg', ['-y', '-i', final, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-crf', '22', '-preset', 'medium',
  '-tune', 'animation', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', phone]);
console.log(`render: ${final}\n        ${phone}`);
