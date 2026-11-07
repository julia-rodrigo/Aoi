"""Background plates for the styles (GPT Image 2.5, 1536x1024, no people, no text) -> kit/styles/plates/<name>.png
  python gen_plates.py            # all missing
  python gen_plates.py neon-night # only these
"""
import base64, concurrent.futures as cf, sys, time
from pathlib import Path
import requests

OUT = Path(__file__).resolve().parent.parent / 'styles' / 'plates'
import sys  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from common import env  # noqa: E402
KEY = env('OPENAI_API_KEY')
COMMON = (" Wide 16:9-style composition. Keep the left two thirds calm and slightly simpler so text can sit on top. "
          "No people, no characters, no animals, no readable text, no letters, no logos, no watermark.")
PLATES = {
    'neon-night': "Anime background art, Makoto Shinkai style: a dim high-rise apartment at night, a huge floor-to-ceiling window "
                  "on the right showing a rainy neon cyberpunk city skyline with glowing magenta and cyan signs, rain streaks on "
                  "the glass, a sleek dark desk along the bottom edge, deep blue and purple shadows, cinematic.",
    'sakura-classroom': "Anime background art, Kyoto Animation style: an empty Japanese high school classroom on a spring "
                        "afternoon, tall windows on the right with cherry blossom trees outside, warm sunbeams across wooden "
                        "desks, a clean green chalkboard on the left wall, soft pastel colors, gentle and bright.",
    'lofi-room': "Anime background art, lo-fi study aesthetic: a cozy small bedroom desk corner at blue hour, warm desk lamp glow, "
                 "a closed laptop, mugs, books and plants, string lights, a window with a soft rainy city view, warm amber and "
                 "dusty purple tones, slightly grainy, calm and cozy.",
    'vn-rooftop': "Anime visual novel background art: a school rooftop at golden hour, chain-link fence, water tower, the city "
                  "and sea far below, big soft clouds, warm orange, pink and lavender sky, painterly and luminous.",
    'jrpg-town': "Hi-bit pixel art background in the style of a modern HD-2D JRPG: a peaceful seaside fantasy town on a hill "
                 "in the morning, red roofs, windmill, blue sea, fluffy clouds, crisp detailed pixel art with soft depth of "
                 "field and light bloom.",
    'paper': "A flat top-down photo of a sheet of warm off-white cotton watercolor paper, subtle fibers and tooth, very soft "
             "even lighting, no objects, no shadows, no marks, seamless texture.",
}


def gen(name):
    out = OUT / f'{name}.png'
    if out.exists():
        return print('skip', name)
    for attempt in range(4):
        try:
            r = requests.post('https://api.openai.com/v1/images/generations', headers={'Authorization': f'Bearer {KEY}'},
                              json={'model': 'gpt-image-2.5-sunburst', 'prompt': PLATES[name] + COMMON, 'size': '1536x1024',
                                    'quality': 'high', 'output_format': 'png', 'n': 1}, timeout=400)
            d = r.json()
            if 'error' in d:
                raise RuntimeError(d['error'].get('message'))
            out.write_bytes(base64.b64decode(d['data'][0]['b64_json']))
            return print('wrote', out)
        except Exception as e:
            print(f'  retry {name} {attempt + 1}: {e}', flush=True)
            time.sleep(8 * (attempt + 1))


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    with cf.ThreadPoolExecutor(6) as ex:
        list(ex.map(gen, sys.argv[1:] or list(PLATES)))
