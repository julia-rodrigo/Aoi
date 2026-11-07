"""Make the host character's images with GPT Image 2.5 (OpenAI images API).

  python gen_character.py base <name> "<extra prompt>"     # new base portrait (generations)
  python gen_character.py edits                             # every face part (edits of base.png)
  python gen_character.py edits mouth_open blink            # only these parts

Writes kit/character/aoi/raw/<name>.png (1024x1024). Existing files are skipped; delete one to redo it.
"""
import base64, concurrent.futures as cf, sys, time
from pathlib import Path
import requests

CHAR = Path(__file__).resolve().parent.parent / 'character' / 'aoi'
RAW = CHAR / 'raw'
import sys  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from common import env  # noqa: E402
KEY = env('OPENAI_API_KEY')
MODEL = "gpt-image-2.5-sunburst"

LOOK = ("An original cute anime girl who is a holographic AI assistant. Bust portrait: head and shoulders, facing the "
        "viewer straight on, head level and centered, both shoulders visible and cut off by the bottom edge of the image, "
        "clear empty space above the head and on both sides. Glossy short bob of deep royal-blue hair with a few lighter "
        "cyan highlights and soft bangs, big bright blue eyes, small nose, a small soft closed-mouth smile. She wears a "
        "white over-ear headset with glowing cyan ear cups and a thin boom microphone on the right side of the image, and "
        "a white high-collar zip-up tech jacket with thin glowing cyan trim along the collar. ")

STYLE = {
    "pixel": ("Hi-bit pixel art: detailed pixel art with crisp square pixels, about 120 pixels across the face, a "
              "limited palette, clean dark-navy pixel outlines, cel-shaded with two tones per color, no blur, no "
              "anti-aliasing, no dithering noise. "),
    "cel": ("Clean modern anime illustration: crisp dark-navy line art of even weight, flat cel shading with two tones "
            "per color, simple shapes, no painterly texture, no gradients, no glow effects, no blur. "),
}
BG = "Fully transparent background: no backdrop, no floor, no shadow, no glow, no particles."

KEEP = ("Keep everything else exactly the same: the same girl, the same hair, the same headset, the same top, the same "
        "art style, the same colors, the same line weight, the same transparent background, and the same framing, crop, "
        "scale and position. Her head and shoulders do not move at all. It must look like another frame of the same "
        "animation, drawn on the same grid. ")
MOUTH_ONLY = "Only her mouth changes. Her eyes, eyebrows, hair and everything else stay exactly the same. "
EYES_ONLY = "Only her eyes and eyebrows change. Her mouth stays closed in the same small soft smile, and everything else stays exactly the same. "

EDITS = {
    # mouth shapes for lip sync (composited over the mouth area only)
    "mouth_mid": MOUTH_ONLY + "Her mouth is half open as if saying 'eh' mid-word: a small open mouth that shows a little dark inside.",
    "mouth_open": MOUTH_ONLY + "Her mouth is open wide as if saying 'ah' while talking happily: a rounded open mouth that shows the dark inside and a hint of tongue.",
    "mouth_o": MOUTH_ONLY + "Her mouth makes a small round 'oh' shape, as if saying 'ooh'.",
    "mouth_smile": MOUTH_ONLY + "She has a wide happy open-mouth smile, like a cheerful 'hee', showing a little of her top teeth.",
    # eyes (composited over the eye area only)
    "blink": EYES_ONLY + "Her eyes are fully closed in a relaxed blink: each eye is a single soft curved line of lashes.",
    "eyes_happy": EYES_ONLY + "Her eyes are closed in a happy smile, curved upward like upside-down U shapes (anime ^ ^ eyes).",
    "eyes_wide": EYES_ONLY + "Her eyes are wide open in surprise with small pupils, and her eyebrows are raised high.",
    "eyes_think": EYES_ONLY + "She is thinking: her eyes look up and toward the upper left of the image, and one eyebrow is raised a little.",
    "eyes_wink": EYES_ONLY + "She winks: the eye on the left side of the image is closed as a happy curved line, the other eye is open.",
    "eyes_side": EYES_ONLY + "Her eyes look to the right side of the image, as if she is looking at something next to her.",
    "eyes_determined": EYES_ONLY + "She looks determined and confident: eyebrows angled down a little, a focused bright gaze.",
}


def post(url, **kw):
    for attempt in range(4):
        try:
            r = requests.post(url, headers={'Authorization': f'Bearer {KEY}'}, timeout=400, **kw)
            d = r.json()
            if 'error' in d:
                raise RuntimeError(d['error'].get('message', str(d['error'])))
            return base64.b64decode(d['data'][0]['b64_json'])
        except Exception as e:
            print(f'  retry {attempt + 1}: {e}', flush=True)
            time.sleep(6 * (attempt + 1))
    raise RuntimeError(f'failed: {url}')


def base(name, style, extra=''):
    out = RAW / f'{name}.png'
    if out.exists():
        return print(f'skip {out.name}')
    prompt = LOOK + STYLE[style] + extra + ' ' + BG
    png = post('https://api.openai.com/v1/images/generations',
               json={'model': MODEL, 'prompt': prompt, 'size': '1024x1024', 'quality': 'high',
                     'background': 'transparent', 'output_format': 'png', 'n': 1})
    out.write_bytes(png)
    print(f'wrote {out}')


def edit(name, src='base.png'):
    out = RAW / f'{name}.png'
    if out.exists():
        return print(f'skip {out.name}')
    prompt = EDITS[name] + ' ' + KEEP
    with open(RAW / src, 'rb') as f:
        png = post('https://api.openai.com/v1/images/edits',
                   files={'image': ('base.png', f, 'image/png')},
                   data={'model': MODEL, 'prompt': prompt, 'size': '1024x1024', 'quality': 'high',
                         'background': 'transparent', 'output_format': 'png', 'n': '1'})
    out.write_bytes(png)
    print(f'wrote {out}')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'base':
        base(sys.argv[2], sys.argv[3], ' '.join(sys.argv[4:]))
    elif cmd == 'edits':
        names = sys.argv[2:] or list(EDITS)
        with cf.ThreadPoolExecutor(4) as ex:
            list(ex.map(edit, names))
