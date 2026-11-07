# Stage 5: the render (ink and paint)

Commands: `./studio render <video>` (`--from 10 --to 20` renders a piece for a quick look), `./studio notes <video>`.

Reads: everything above.

Makes:
- render/<video>.mp4: 1920x1080, 30 fps. Headless Chrome draws each frame; FFmpeg writes the video.
  The audio is the voice, the music bed (kit/audio/music_bed.mp3, `--music 0.11`) and the beat sound effects,
  leveled to -14 LUFS.
- render/<video>_phone.mp4: a 720p copy for phones.
- description.md: a description draft with chapters from the script's sections.

Languages: `--lang ja` renders the Japanese voice, lips, on-screen text and subtitles to render/<video>.ja.mp4.
`--subs en|ja|off` picks the subtitle language (English by default) and `--text en|ja` the on-screen text (English by default). Every language file has the same length and beat frames.
`./studio watch <video>` plays all language files on one page and swaps them at any second (L key).

Check (you): watch the render once. You pick the title and the thumbnail. Nothing uploads from here.

Speed: about 10 to 15 frames a second with two workers (a 7-minute video takes about 15 to 20 minutes).
