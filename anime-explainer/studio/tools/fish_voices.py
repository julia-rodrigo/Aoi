"""Find Japanese voices for Aoi in the Fish Audio library and say one line with each (free S2.1 Pro model).

  python tools/fish_voices.py [search words] [--n 8]
Writes kit/voices/samples/fish/<n>-<title>.wav and prints the voice ids. Put the chosen id in
kit/voices/voices.json ("aoi-fish": reference_id), then set voice_ja: aoi-fish in the brief.
Docs: GET https://api.fish.audio/model (language, tag, sort_by), POST /v1/tts with header model.
"""
import argparse, re, sys
from pathlib import Path
import requests
from common import KIT, env, write_wav
from speak import fish_tts

LINE = "こんにちは！アオイです。わたしは物事をわかりやすく教えるシステムです。[excited] さあ、始めましょう！"

ap = argparse.ArgumentParser()
ap.add_argument('search', nargs='*')
ap.add_argument('--n', type=int, default=8)
a = ap.parse_args()
H = {'Authorization': f"Bearer {env('FISH_API_KEY')}"}
params = {'language': 'ja', 'page_size': 40, 'sort_by': 'task_count'}
if a.search:
    params['title'] = ' '.join(a.search)
r = requests.get('https://api.fish.audio/model', headers=H, params=params, timeout=60)
r.raise_for_status()
items = [m for m in r.json()['items'] if not any(t.lower() in ('male', '男性') for t in m.get('tags', []))][:a.n]
out = KIT / 'voices' / 'samples' / 'fish'
out.mkdir(parents=True, exist_ok=True)
for i, m in enumerate(items, 1):
    pcm, _ = fish_tts({'reference_id': m['_id'], 'model': 's2.1-pro-free', 'language': 'ja'}, LINE, 'ja')
    name = re.sub(r'[^\w-]+', '_', m['title'])[:40]
    write_wav(out / f'{i:02d}-{name}.wav', pcm)
    print(f"{i:2d}  {m['_id']}  {m['title'][:40]:40s}  uses {m['task_count']:>9,}  tags {', '.join(m.get('tags', [])[:5])}")
print(f'samples: {out}')
