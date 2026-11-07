# Anime studio: faceless videos with an anime host

This folder makes a full YouTube video with an animated host (Aoi, a pixel-art anime girl, or your own character)
and no camera. Read CONTEXT.md for the five stages. Each stage has a contract in stages/.

## What lives where

- CONTEXT.md: the pipeline in one table (stage, command, file it makes, who checks it).
- studio: the one command. `./studio <stage> <video>`. `./studio setup` installs everything once.
- stages/01-voice ... 05-render: one CONTRACT.md each (reads, makes, check).
- stages/template: the empty video folder that `./studio new` copies.
- kit/: what every video shares.
  - kit/character/aoi/sprites: Aoi's sprites (base, mouth and eye parts, poses) and manifest.json.
  - kit/player: the scene kit (kit.js) that draws any frame from a video's bundle.json.
  - kit/styles: 30 looks. kit/voices/voices.json: voice presets. kit/audio: music bed and sound effects. kit/fonts.
  - kit/gen: make your own character, poses and background plates.
- videos/<video>/: one folder per video. All of a video's work stays in its folder. videos/hello-aoi is a demo.
- tools/: the code behind each command. Keys come from the environment or .env (see .env.example).

## How to work a video

1. `./studio new <video>`. Ask the user the brief questions (who it is for, shape, metaphor, voice). Write brief.md.
2. Write script.md (and lang/<lang>/script.md for the voiced language). Let the user rewrite it. Run each stage in
   order. Stop at each check for the user.
3. Do not start a stage until the check on the stage before it passed.
4. Write the storyboard as text first. Fix timing in storyboard.txt, not in code.
5. For a moment the kit cannot draw, write a `custom` beat in the video's scene.js (or scenes/*.js).

## Rules

- Show, do not restate: never put her spoken line on screen as text; show a real thing instead.
- The user picks the title and the thumbnail. Do not upload or publish.
- Render with two workers at most on a laptop. Do not open windows on the user's screen (headless only).
- Keep the character's look: change kit/gen prompts and run kit/gen/prep.py, never edit sprites by hand.
