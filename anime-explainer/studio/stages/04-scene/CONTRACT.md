# Stage 4: the animation (pencil test and sweatbox)

Commands: `./studio stills <video>` (contact sheets), `./studio preview <video>` (play it with sound in a browser).

Reads: bundle.json, the video's scene.js (optional), kit/player/kit.js, kit/character, kit/audio.

Makes: stills/sheet_NN.jpg (one frame per beat, labeled). `--beat N` also saves that beat full size.

Styles: kit/styles/<id>.js registers `window.STYLES[id]` with any of: palette, fonts, fontFiles, images (plates),
room, hud, card, bullet, arrow, underline, subs, overlay, front, under, text (rise, type, pop), textStroke,
transition (dissolve, pop, slide, fade, drop, cut), content ({dx, dy, scale}), types (replace a beat type),
host ({mode: holo, solid or sticker; layouts; glow; beam; wave; particles; behind; clip; front; outline}).
Background plates: kit/gen/gen_plates.py (GPT Image 2.5). The player takes `?style=<id>`.

How the scene is drawn:
- kit/player/kit.js draws every frame as a function of time: the room, the section bar, the beat's content, and Aoi.
- Aoi is a hologram over a phone on the desk. Her mouth follows mouth.json, she blinks, and her eyes follow the beat's mood.
  When her place changes between beats, she dissolves out and back in, pixel by pixel.
- For a moment the kit cannot draw, write it in videos/<video>/scene.js:
  `window.SCENE = { custom: { name(ctx, lt, beat, kit, t) { ... } }, overlay(ctx, t, beat, kit) { ... } }`

Check:
1. Claude reads every sheet and fixes text that overlaps Aoi, runs off the edge, or is too small.
2. You watch the whole preview with the voice (the sweatbox). L swaps the language live, S changes subtitles. Timing notes go back to storyboard.txt, then `./studio cues`.
