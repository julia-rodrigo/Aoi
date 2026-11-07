# Anime explainer skill

Make full-length explainer videos with an animated anime host, in any style and any language, with Claude Code.
This is the system behind the Aoi video: one folder per video, five stages, and a check between each one.

## What you need

- Claude Code.
- A Mac or Linux computer (Windows works in WSL), with Python 3.10+, Node.js 20+ and ffmpeg.
- A Fish Audio API key (the voice) and an ElevenLabs API key (word timing). An OpenAI key only if you want to
  design your own character. A typical 5-minute video costs well under $1 in API calls.

## Install (2 minutes)

1. Unzip this file into your Claude Code skills folder: `~/.claude/skills/` (you get `~/.claude/skills/anime-explainer/`).
2. Open Claude Code in the folder where you keep your projects and paste the prompt from `PROMPT.md`.
3. Claude copies the studio into your project, runs the setup, asks for your keys, and shows you the demo video.

## Make a video

Tell Claude: "Make an anime explainer about <your topic>". It asks a few questions, writes a script for you to
rewrite (please do: your own words are what make it good), then runs the voice, the timing, the storyboard and the
animation. You watch a live preview in your browser and give notes by time ("2:10, make the card bigger"). When it
looks right, it renders the MP4.

## What is inside

- `SKILL.md`: the instructions Claude follows.
- `studio/`: the whole studio. The `studio` command, the scene player, 30 visual styles, Aoi's sprites, voice presets,
  music and sound effects, the character generator, and a demo video (`videos/hello-aoi`).
- `studio/FONTS-LICENSE.md`: every font is free to share (Open Font License).
