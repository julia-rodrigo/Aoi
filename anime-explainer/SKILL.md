---
name: anime-explainer
description: Make full-length faceless explainer videos with an animated pixel-art anime host (Aoi, or your own character), in any visual style and any language. One folder per video, five stages (voice, words, storyboard, animation, render), with a check between each stage. Fish Audio voices (Japanese voice with English subtitles by default), a live browser preview you can edit while you watch, and a frame-exact 1080p render. Triggers on "make an anime explainer", "anime explainer about", "new Aoi video", "faceless anime video", "explain X with Aoi", /anime-explainer.
---

# Anime explainer studio

This skill makes a complete YouTube explainer with an animated anime host and no camera. Everything is in `studio/`
next to this file. Read `studio/CLAUDE.md` and `studio/CONTEXT.md` before the first video of a session. Each stage
has a contract in `studio/stages/0*/CONTRACT.md` (what it reads, what it makes, what to check).

## First run (once per computer)

1. Copy the studio into the user's project, so their videos stay with their work:
   `cp -R <this skill folder>/studio ./anime-studio && cd anime-studio`
2. `./studio setup`. It makes `.venv`, installs the Python and Node packages and Chromium, and checks ffmpeg.
3. Ask the user for their keys and put them in `anime-studio/.env` (copy `.env.example`). Never print a key.
   - `FISH_API_KEY`: Fish Audio (fish.audio > API). The voice.
   - `ELEVENLABS_API_KEY`: ElevenLabs. Word timing (Scribe), and optional ElevenLabs voices.
   - `OPENAI_API_KEY`: only to design a new character or new backgrounds (GPT Image).
4. Show the demo. It needs no keys: `./studio cues hello-aoi`, then `./studio preview hello-aoi` and give the user
   the printed link. Space plays, L swaps the voice language, S the subtitles.

## Make a video

1. `./studio new <slug>`. Ask the brief questions: who it is for, the shape, one metaphor, the language. Write
   `videos/<slug>/brief.md`. Default: `languages: ja, en`, `master: ja`, `voice_ja: aoi-fish`, `style: stand-blue-navy`,
   `captions: on` (Japanese voice, English subtitles and English on-screen text).
2. Write the script: `script.md` (English, what the subtitles show) and `lang/ja/script.md` (what she says), with
   the same paragraphs and the same sentences. Directions in square brackets (`[cheerful]`), brand names as
   `{shown|spoken}`. Let the user rewrite it: a human-written script is the difference between a good video and slop.
3. Run the stages in order and stop at each check:
   - `./studio speak <slug> --lang ja`: the voice. The user listens. A bad paragraph: `--redo N`.
   - `./studio transcribe <slug> --lang ja`: the words. Read `words_check.ja.md`.
   - Write `storyboard.txt` (beats with Japanese cue words), then `./studio cues <slug>`. Read `cues.md`.
   - `./studio stills <slug>`: contact sheets. Read every sheet; fix overlaps and empty frames.
   - `./studio preview <slug>`: the live player. The user watches with sound and gives notes by time ("2:10, make
     the card bigger"). Edit the storyboard or the scene code, and the user reloads. It is the same frame the
     render makes.
   - `./studio render <slug>`: the MP4 (1080p and a 720p phone copy) and `./studio notes <slug>` for chapters.
4. The user picks the title and the thumbnail. Never upload or publish from here.

## What makes it look good (rules)

- **Show, do not restate.** The viewer reads her line in the subtitles. The screen shows something else: a real
  file, a real page, a real number, a picture of the thing. Never put her sentence on screen as text.
- **Real over drawn.** Prefer captures of real pages (headless browser, public pages only) and real files.
- **Fill the space**, keep content clear of the host and the subtitle box, and keep text inside its card.
- **Few words on screen, large type.** Each thing must read in the time it is on screen.
- **Facts are real.** No invented numbers.
- For a moment the kit cannot draw, write a custom beat in `videos/<slug>/scene.js` or `scenes/<name>.js`
  (see `stages/04-scene/CONTRACT.md`). Everything is a pure function of time.

## Styles, voices, characters

- Styles: `studio/kit/styles/*.js` (30 looks). `./studio styles <slug>` renders six frames per style to compare;
  `./studio gallery` shows them. Change `style:` in the brief.
- Voices: `studio/kit/voices/voices.json` (Fish Audio and ElevenLabs presets). `python tools/fish_voices.py` samples
  Fish library voices. Any language works: add `voice_<lang>` and `lang/<lang>/script.md`.
- Your own character: `studio/kit/gen/` (GPT Image). `gen_character.py` makes candidates, `gen_poses.py` the poses,
  `prep.py` aligns every part on one pixel grid and one palette. Never edit sprites by hand.

## Limits

- Render on a laptop with 2 workers (`--workers 2`, the default). A 6-minute video takes about 30-40 minutes.
- Headless only: never open windows on the user's screen; give links instead.
