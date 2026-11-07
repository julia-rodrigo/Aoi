"""Make the kit's music bed and sound effects with ElevenLabs (music + sound-generation APIs).

  python gen_audio.py            # everything missing
Writes kit/audio/music_bed.mp3 and kit/audio/sfx/<name>.mp3. Delete a file to redo it.
"""
import concurrent.futures as cf
from pathlib import Path
import requests

AUDIO = Path(__file__).resolve().parent.parent / 'audio'
import sys  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from common import env  # noqa: E402
KEY = env('ELEVENLABS_API_KEY')
H = {'xi-api-key': KEY, 'Content-Type': 'application/json'}

MUSIC = {
    'music_bed': ("Soft, cute lo-fi chiptune background music for a friendly educational video. Gentle 8-bit square-wave "
                  "melody over warm electric piano chords, light bouncy drums, 92 BPM, bright and calm, no big drops, "
                  "steady level all the way through so a voice sits on top. Instrumental."),
}
SFX = {
    'blip': ("A soft, cute, short digital UI blip, like a gentle pixel game menu select sound.", 0.5),
    'pop': ("A tiny soft bubble pop, cute and clean, very short.", 0.5),
    'shimmer': ("A short soft hologram shimmer: a quick sparkly digital swell, airy and light.", 1.2),
    'whoosh': ("A short soft airy whoosh for a screen transition, gentle and clean.", 0.8),
    'type': ("Soft quick keyboard typing, a few light key clicks.", 1.0),
}


def music(name, prompt):
    out = AUDIO / f'{name}.mp3'
    if out.exists():
        return
    r = requests.post('https://api.elevenlabs.io/v1/music', headers=H, timeout=600,
                      json={'prompt': prompt, 'music_length_ms': 150000, 'force_instrumental': True})
    r.raise_for_status()
    out.write_bytes(r.content)
    print('wrote', out)


def sfx(name, spec):
    out = AUDIO / 'sfx' / f'{name}.mp3'
    if out.exists():
        return
    text, dur = spec
    r = requests.post('https://api.elevenlabs.io/v1/sound-generation', headers=H, timeout=300,
                      json={'text': text, 'duration_seconds': dur, 'prompt_influence': 0.6})
    r.raise_for_status()
    out.write_bytes(r.content)
    print('wrote', out)


if __name__ == '__main__':
    (AUDIO / 'sfx').mkdir(parents=True, exist_ok=True)
    with cf.ThreadPoolExecutor(6) as ex:
        jobs = [ex.submit(music, k, v) for k, v in MUSIC.items()] + [ex.submit(sfx, k, v) for k, v in SFX.items()]
        for j in jobs:
            try:
                j.result()
            except Exception as e:
                print('error:', e, getattr(getattr(e, 'response', None), 'text', '')[:300])
