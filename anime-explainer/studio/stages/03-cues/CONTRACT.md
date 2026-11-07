# Stage 3: the storyboard (the Leica reel)

Command: `./studio cues <video>`

Reads: storyboard.txt, words.json, voice/voice.json, mouth.json.

Makes:
- cues.md: the timed table (beat, start, length, type, cue words). The whole video timed before a frame is drawn.
- cues.json and bundle.json (everything the player needs, including the text of files shown on screen).

## storyboard.txt

One beat for every time the picture changes:

```
== <type> key=value key="two words"
@ the words where this beat starts
content lines, or "- item @ words where the item appears"
```

| Type | Shows | Options and content |
|---|---|---|
| host | Aoi big over the phone | `mood=`; content lines = big text next to her (she moves to one side), `side=left/right` |
| title | Section card | `label="Stage 1"`; line 1 = title, more lines = subtitle |
| big | One statement | content = the text; `*word*` = highlight; `size=92` |
| list | Cards that appear one by one | `title=`; `- item @ cue words` |
| flow | Steps in a row with arrows | `title=`; `- step @ cue words`; `active=3` |
| screen | A real file in a window | `file=path` (from the studio folder or the video folder), `focus=12` or `focus=12-14`, `title=`; `- 20 @ cue words` moves the highlight to line 20 |
| image | A picture, slow zoom | `src=path`; line 1 = caption |
| custom | Code in the video's scene.js | `name=` (a function in `SCENE.custom`), `aoi=corner/center/left/right/hidden` |

Every beat takes `mood=` (neutral, happy, wide, think, wink, side, determined), `aoi=` (where Aoi stands)
and `sfx=` (blip, pop, shimmer, whoosh, type, none).

Languages: cues.py also builds every language listed in the brief. On-screen text comes from
lang/<lang>/strings.json (`"English": "日本語"`, or `{"text": "...", "cue": "word"}` so an item appears when that
word is said). A missing string stops the run and writes lang/<lang>/strings.missing.json.
Subtitles (subs/<lang>.srt and .vtt, and in bundle.json) are timed from the voice's letter timing:
one sentence per line, split at commas, 46 characters (English) or 22 (Japanese) at most.

Check (you or Claude): read cues.md before any animation. Fixing a beat in text is cheaper than in a finished scene.
A beat shorter than 1.2 s is flagged.
