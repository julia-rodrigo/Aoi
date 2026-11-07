# Stage 1: the voice

Command: `./studio speak <video>` (`--list` shows paragraph numbers, `--redo 4` rolls paragraph 4 again, `--redo all`).

Reads:
- brief.md: `voice:` picks a preset in kit/voices/voices.json.
- script.md: `# ` lines are sections (chapters). Blank lines split paragraphs. One paragraph = one ElevenLabs take.
  Audio tags such as `[excited]`, `[whispers]`, `[laughs]` work with the eleven_v3 presets. Lines that start with `>` are notes.

Makes:
- voice/chunk_NN.wav + .json for each paragraph (cached: only changed paragraphs are made again).
- voice/voice.wav: all paragraphs joined, with short gaps and a longer gap before a new section.
- voice/voice.json: paragraph times, section times, and the letter timing from ElevenLabs.
- voice/take.md: the paragraph list with start times.

Check (you): listen to voice/voice.wav from start to end. For a bad line, roll that paragraph only.

Script markup:
- `[excited]` and other tags: eleven_v3 voices only (the English preset). Other models drop them.
- `{CLAUDE.md|Claude dot M D}`: subtitles show the first part, the voice says the second. Use it for file names,
  and in Japanese for any kanji the voice misreads (`{間|あいだ}`).

Other languages (`--lang ja`):
- Run them after the English storyboard is timed (stage 3): the beats are the sync points.
- lang/ja/script.md must have the same paragraphs and the same number of sentences in each paragraph.
- The Japanese preset (aoi-ja, Yui) uses eleven_multilingual_v2 at speed 1.1. eleven_v3 pauses too long at Japanese commas.
- Each beat's speech starts when the English beat's speech starts. Inside a beat, sentences keep their own pace.
  Long pauses shrink first; then the speech speeds up (pitch kept). voice/ja/fit.md lists every beat.
  Over 1.25x: shorten that line. Write Japanese with few commas; every 、 is a pause.

Before the script: Claude asks you who the video is for, its shape, the metaphor, and whose voice it is in.
The answers go in brief.md. Write the script the way Aoi talks: short sentences, warm, a little playful.
