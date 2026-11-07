# The pipeline

One video = one folder in videos/. Five stages. Each stage reads the file before it, makes one main file,
and a person checks that file before the next stage runs. That check stops one bad take from becoming a bad video.

| Stage | Command | Reads | Makes | The check |
|---|---|---|---|---|
| 1 Voice | `./studio speak <v>` | brief.md, script.md | voice/voice.wav, voice/take.md | You listen to the whole take. A bad paragraph: `--redo N`. |
| 2 Words | `./studio transcribe <v>` | voice/voice.wav | words.json, mouth.json, words_check.md | Read words_check.md. Fix wrong names in script.md. |
| 3 Storyboard | `./studio cues <v>` | storyboard.txt, words.json | cues.md, bundle.json | Read cues.md (the timed storyboard) before any animation. |
| 4 Animation | `./studio stills <v>` then `./studio preview <v>` | bundle.json, scene.js, kit/ | stills/sheet_*.jpg | Claude reads the sheets and fixes overlaps. You watch the preview with sound. Notes go back to storyboard.txt. |
| 5 Render | `./studio render <v>` then `./studio notes <v>` | everything above | render/<v>.mp4, render/<v>_phone.mp4, description.md | You pick the title and the thumbnail. |

## Languages (English sets the timeline)

A video can have more languages (`languages: en, ja` in brief.md). English goes through stages 1 to 3 first.
Then each other language is fitted onto the English timeline: every beat starts at the same second in every
language, so the renders have the same length and the same frame for every beat, and you can swap languages at any moment.

| Step | Command | Makes | The check |
|---|---|---|---|
| Translate | Claude writes lang/ja/script.md (same paragraphs and sentences) and lang/ja/strings.json (on-screen text) | | You or a reader skim it |
| Voice | `./studio speak <v> --lang ja` | voice/ja/voice.wav, voice/ja/fit.md | fit.md: no beat over 1.25x. Shorten a line that is. |
| Words | `./studio transcribe <v> --lang ja` | words.ja.json, mouth.ja.json, words_check.ja.md | Fix a misread word with `{shown|spoken}` |
| Storyboard | `./studio cues <v>` | bundle.json (all languages), subs/en.srt, subs/ja.srt | |
| Render | `./studio render <v> --lang ja` | render/<v>.ja.mp4 | `./studio watch <v>`: swap languages while it plays |

Subtitles come from the voice's own timing, snapped to where each sound starts, so they land on the words.
Every voice gets a subtitle track in every language: the Japanese voice with English subtitles shows each English
sentence over the Japanese sentence it translates (subs/ja-voice.en.srt), in one or two lines.
Defaults: on-screen text and subtitles are English whatever the voice (anime with subs).
`--subs ja|off` and `--text ja` change that; `captions: off` in the brief turns subtitles off.

## Styles (the look around Aoi)

A style is one file in kit/styles/<id>.js: background, how Aoi appears (hologram, solid, sticker, framed),
cards, fonts, subtitles, section label and transitions. Aoi's sprites never change. Pick one with `style:` in brief.md.
A style can `extends` another and change only a few things, so new rounds branch from a pick.

| Command | Makes |
|---|---|
| `./studio styles <v> --round 2 --parent <id> --styles a,b,c` | Six frames per style from the live player, no render (seconds) |
| `./studio gallery <v>` | The sheet page: every round, numbered, with Play live (EN or JA) |

The kit also handles, for every style:
- Content fills the space beside Aoi (`regionOf`): titles, statements, lists, steps and files size themselves to it.
- `sides: 'alternate'` moves her to the other lower corner at each chapter (`aoi=corner-left` or `side=left` on a beat forces it).
- `poses: true`: when a content beat starts she turns toward it (present_l/r, point_l/r) for about 2 s, with her own lip sync.
  Poses: kit/gen/gen_poses.py (edits of base.png on green, then mouths and blink), keyed and scaled in kit/gen/prep.py.

Where it came from: animation studios since about 1930. Voice first, an exposure sheet with every syllable
on a frame, a storyboard timed to the track (the Leica reel), pencil tests in the sweatbox, then ink and paint.

| Studio step | Here |
|---|---|
| Record the voices first | speak |
| Exposure sheet | words.json + mouth.json |
| Leica reel | cues.md |
| Pencil test | stills sheets |
| Sweatbox | preview |
| Ink and paint | render |

## Voices and the master language

- Voice providers: ElevenLabs (default) or Fish Audio (`"provider": "fish"` in kit/voices/voices.json; Drama 3 with
  `"model": "drama-3"`, key FISH_API_KEY in .env). Fish returns audio only, so letter timing comes from Scribe.
  `python tools/fish_voices.py` samples library voices. Drama 3 takes `[plain-language directions]` and `<french>...</french>`.
- `master: ja` in the brief makes Japanese the timeline (beats, chapters); a language without a take is text only
  (English subtitles and on-screen text). Japanese cue words are found in the script itself, then timed from the take.
