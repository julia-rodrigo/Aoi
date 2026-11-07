# Stage 2: the words (the exposure sheet)

Command: `./studio transcribe <video>`

Reads: voice/voice.wav, voice/voice.json, script.md.

Makes:
- words.json: every word that was said, with its start and end time (ElevenLabs Scribe on the real audio).
- mouth.json: one mouth shape per 1/12 s (closed, mid, open, oh, ee) from loudness and the letter being said,
  and a loudness level per 1/30 s for the wave bar.
- words_check.md: every place where the voice and the script disagree.

Japanese (`--lang ja`): words.ja.json, mouth.ja.json (kana vowels via pykakasi), words_check.ja.md (compared by reading).
Katakana words come back in Latin letters ("Claude", "AI"); that is fine.

Check (you or Claude): skim words_check.md. Numbers written as digits always show up; they are fine if they sound right.
A wrong name: spell it the way it sounds in script.md, then run speak and transcribe again (only that paragraph is redone).
