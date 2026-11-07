# Task: Aoi explainer page

Build `aoi/index.html`: ONE self-contained file (sprites embedded as base64 data URIs) that works on a phone screen, with no API keys and no audio.

- Aoi stands at the bottom of the screen. Draw her on a canvas with image smoothing off, using `aoi-kit/sprites/` and its manifest.json (256x256 base per pose, eye and mouth overlay parts at the given x/y; poses: default, point_l, point_r, present_l, present_r).
- Mouth flaps while her subtitle types out, random blinks, a gentle bob, and a different pose or expression each scene.
- Above her: a subtitle box and a content card that changes per scene, in the stand-blue-navy palette (`aoi-kit/styles/`).
- Show, do not restate: the card shows a picture of the thing (mock phone screen, repo list, checklist), never her sentence.
- Auto-advance scenes; tap to skip; play/pause and restart buttons.
- Her voice: bright, warm, short sentences (see `aoi-kit/example-script.md`).

## Topic: how Claude Code works on your phone
1. Hi, I'm Aoi! Today: Claude Code on your phone. (card: mock Code tab with a cloud "Default" session and a "Remote control" session)
2. Two kinds of sessions: cloud sessions run on Anthropic's cloud and work from a GitHub repo; remote control sessions run on your computer and your phone is the remote.
3. Cloud sessions need a repo: tap send without one and the Repositories list pops up. (card: mock New Session screen with "Default" and "Add repository" chips)
4. Keep other projects private: in the Claude GitHub app settings pick "Only select repositories" and choose one, like "test".
5. No GitHub at all? Start Claude Code on your computer and steer it from your phone; the computer must stay on and awake.
6. Recap checklist: New session → Add repository → pick a repo → type and send.
7. Outro with a wink: That's it, go build something! See you next time!

## Finish
Check a few frames at phone size in headless Chromium and fix overlaps or cut-off text. Add a short `aoi/README.md`. Commit and push to the `aoi` branch.
