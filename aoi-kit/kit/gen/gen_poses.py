"""Presenting poses for the host: each pose is an edit of base.png, then its own mouth shapes and blink are edits of the pose,
so lip sync works inside the pose. Backgrounds are flat green and keyed out in prep.py.

  python gen_poses.py bases                 # the pose images
  python gen_poses.py parts                 # mouths + blink for every pose
  python gen_poses.py parts present_l       # only this pose
Writes kit/character/aoi/raw/poses/<pose>/<part>.png
"""
import sys, concurrent.futures as cf
from pathlib import Path
from gen_character import post, RAW

POSES = RAW / 'poses'
GREEN = "The background is a solid, flat, pure green (#00FF00) with nothing else on it. "
FRAME = ("Keep the same framing, crop and scale: her head stays the same size and in about the same place, her shoulders are "
         "cut by the bottom edge, and the raised hand stays fully inside the image. Keep the exact same girl, hair, headset, "
         "white tech jacket, hi-bit pixel-art style, colors and line weight. ")
POSE = {
    'present_l': ("She turns her head and shoulders slightly toward the left side of the image, into a gentle three-quarter view, and "
                  "raises her right hand (the hand on the left side of the image) to shoulder height with the palm open and facing up, "
                  "gesturing toward the left edge as if presenting something next to her. She looks toward the left with a warm "
                  "closed-mouth smile. "),
    'present_r': ("She turns her head and shoulders slightly toward the right side of the image, into a gentle three-quarter view, "
                  "and raises her left hand (the hand on the right side of the image) to shoulder height with the palm open and facing "
                  "up, gesturing toward the right edge as if presenting something next to her. She looks toward the right with a warm "
                  "closed-mouth smile. "),
    'point_l': ("She faces the viewer, glances toward the left side of the image, and raises her right hand (the hand on the left "
                "side of the image) beside her face with the index finger pointing toward the left edge, like a cheerful presenter "
                "pointing at a screen. Small closed-mouth smile. "),
    'point_r': ("She faces the viewer, glances toward the right side of the image, and raises her left hand (the hand on the right "
                "side of the image) beside her face with the index finger pointing toward the right edge, like a cheerful presenter "
                "pointing at a screen. Small closed-mouth smile. "),
}
KEEP = ("Keep everything else exactly the same: the same pose, the same arm and hand, the same head angle, the same framing, "
        "the same green background, the same pixel-art style and colors. It must look like another frame of the same animation. ")
MOUTH = "Only her mouth changes. Her eyes, eyebrows, head, hand and everything else stay exactly the same. "
PARTS = {
    'mouth_mid': MOUTH + "Her mouth is half open as if saying 'eh' mid-word: a small open mouth that shows a little dark inside.",
    'mouth_open': MOUTH + "Her mouth is open wide as if saying 'ah' while talking happily: a rounded open mouth with the dark inside and a hint of tongue.",
    'mouth_o': MOUTH + "Her mouth makes a small round 'oh' shape, as if saying 'ooh'.",
    'mouth_smile': MOUTH + "She has a wide happy open-mouth smile, like a cheerful 'hee', showing a little of her top teeth.",
    'blink': ("Only her eyes change. Her mouth, head, hand and everything else stay exactly the same. Her eyes are fully closed "
              "in a relaxed blink: BOTH eyes are closed at the same time (the near eye and the far eye), each a single soft curved "
              "line of lashes. This is a blink, not a wink."),
}


def edit(src, out, prompt):
    if out.exists():
        return print('skip', out.relative_to(RAW))
    with open(src, 'rb') as f:
        png = post('https://api.openai.com/v1/images/edits', files={'image': (src.name, f, 'image/png')},
                   data={'model': 'gpt-image-2.5-sunburst', 'prompt': prompt, 'size': '1024x1024', 'quality': 'high',
                         'output_format': 'png', 'n': '1'})
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(png)
    print('wrote', out.relative_to(RAW), flush=True)


if __name__ == '__main__':
    what, only = sys.argv[1], sys.argv[2:]
    jobs = []
    for pose, desc in POSE.items():
        if only and pose not in only:
            continue
        if what == 'bases':
            jobs.append((RAW / 'base.png', POSES / pose / 'base.png', desc + FRAME + GREEN))
        else:
            for part, p in PARTS.items():
                jobs.append((POSES / pose / 'base.png', POSES / pose / f'{part}.png', p + ' ' + KEEP + GREEN))
    with cf.ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda j: edit(*j), jobs))
