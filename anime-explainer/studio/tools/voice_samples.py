"""Say one line with every voice preset, to compare them: python tools/voice_samples.py ["text"]
Writes kit/voices/samples/<preset>.wav."""
import sys
from common import KIT, load, write_wav
from speak import tts, trim

text = sys.argv[1] if len(sys.argv) > 1 else ("[excited] Hi! I'm Aoi. And this whole video came out of one folder on "
                                              "Nick's computer. [curious] Want to see how it works?")
out = KIT / 'voices' / 'samples'
out.mkdir(parents=True, exist_ok=True)
for name, preset in load(KIT / 'voices' / 'voices.json').items():
    pcm, al = trim(*tts(preset, text))
    write_wav(out / f'{name}.wav', pcm)
    print(f'{name:10s} {len(pcm) / 44100:.1f}s  {out / (name + ".wav")}')
