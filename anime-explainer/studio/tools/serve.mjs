// ./studio preview <video> [--port 4810]: the sweatbox. Plays the scene with the voice and music in your browser.
// ./studio watch <video>: the rendered languages on one page, swapped at any second.
import { startServer, videoArg, opt } from './server.mjs';
const v = videoArg();
const page = opt('page', 'player');
const port = +opt('port', page === 'watch' ? 4811 : page === 'gallery' ? 4812 : 4810);
await startServer(port);
const url = page === 'gallery' ? `/kit/styles/gallery.html?video=${v}` : `/kit/player/${page}.html?video=${v}`;
console.log(`${page}: http://localhost:${port}${url}`);
console.log(page === 'watch' ? 'Space plays or pauses. L switches the language. Ctrl+C stops the server.'
  : 'Space plays or pauses. L swaps the voice language. S changes subtitles. Arrows move 2 s or one beat. Ctrl+C stops the server.');
