"""Align the face parts to base.png and pack the host sprites for the player.

Each part (mouth_*, blink, eyes_*) is a GPT edit of base.png. The edit can move a few pixels and it loses the
transparent background, so this script:
  1. aligns each part to the base on the face area around the part (OpenCV ECC, similarity transform),
  2. keeps only the pixels inside the part's box that really changed (the mouth or the eyes),
  3. snaps the base and every part to one pixel-art grid with one shared palette,
  4. writes kit/character/aoi/sprites/{base.png, <part>.png, manifest.json}.

  python prep.py [--grid 4]     # 4 = one art pixel per 4 source pixels (256 px wide sprite)
"""
import argparse, json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

CHAR = Path(__file__).resolve().parent.parent / 'character' / 'aoi'
RAW, OUT = CHAR / 'raw', CHAR / 'sprites'

# boxes in base.png pixels (x0, y0, x1, y1); found from the base portrait
MOUTH_BOX = (430, 585, 600, 695)
EYES_BOX = (300, 330, 740, 528)


def part_box(name):
    return MOUTH_BOX if name.startswith('mouth') else EYES_BOX


def load(name):
    return np.asarray(Image.open(RAW / f'{name}.png').convert('RGBA')).astype(np.float32)


def align(base, part, box):
    """Warp part onto base. ECC runs on the face area with the part's own box blanked out."""
    g0 = cv2.cvtColor(base[..., :3].astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    g1 = cv2.cvtColor(part[..., :3].astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    mask = (base[..., 3] > 200).astype(np.uint8)
    x0, y0, x1, y1 = box
    mask[y0 - 20:y1 + 20, x0 - 20:x1 + 20] = 0
    warp = np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
    _, warp = cv2.findTransformECC(g0, g1, warp, cv2.MOTION_EUCLIDEAN, crit, mask, 5)
    h, w = g0.shape
    out = cv2.warpAffine(part, warp, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    return out, warp


def changed_mask(base, part, box, thresh=38):
    x0, y0, x1, y1 = box
    d = np.abs(base[..., :3] - part[..., :3]).sum(2)
    m = np.zeros(d.shape, np.uint8)
    m[y0:y1, x0:x1] = (d[y0:y1, x0:x1] > thresh).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    m = cv2.dilate(m, np.ones((7, 7), np.uint8))
    # fill holes so the inside of an open mouth is one piece
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    big = [c for c in cnts if cv2.contourArea(c) > 60]
    m2 = np.zeros_like(m)
    cv2.drawContours(m2, big, -1, 1, -1)
    m2[:y0], m2[y1:], m2[:, :x0], m2[:, x1:] = 0, 0, 0, 0
    return m2.astype(bool)


def pixelate(rgba, grid):
    """Box-average to the art grid. Alpha is made hard (0 or 255)."""
    h, w = rgba.shape[:2]
    im = Image.fromarray(rgba.astype(np.uint8), 'RGBA').resize((w // grid, h // grid), Image.BOX)
    a = np.asarray(im).copy()
    a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    return a


def quantize(arr, palette_img):
    rgb = Image.fromarray(arr[..., :3])
    q = np.asarray(rgb.quantize(palette=palette_img, dither=Image.Dither.NONE).convert('RGB'))
    out = arr.copy()
    out[..., :3] = q
    return out


def key_green(rgba):
    """Flat green background -> alpha; green spill on the edges is pulled back."""
    a = rgba.copy()
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)
    bg = (greenness > 70) & (g > 140)
    alpha = np.where(bg, 0, 255).astype(np.float32)
    alpha = cv2.morphologyEx(alpha.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(np.float32)
    spill = (greenness > 0) & ~bg
    a[..., 1] = np.where(spill, np.maximum(r, b) + greenness * .15, g)
    a[..., 3] = alpha
    return a


def head_match(base, pose):
    """Similarity transform (scale + shift) that puts the pose's head where the base head is.
    ECC on the head area (hair, headset, face); falls back to matching the head's width and top."""
    def gray(x):
        g = cv2.cvtColor(x[..., :3].astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        return g * (x[..., 3] > 128)
    g0, g1 = gray(base), gray(pose)
    mask = np.zeros(g0.shape, np.uint8)
    mask[:640, :] = (base[:640, :, 3] > 128)
    def bbox(x):
        ys, xs = np.nonzero(x[:600, :, 3] > 128)
        return xs.min(), ys.min(), xs.max(), ys.max()
    bx0, by0, bx1, _ = bbox(base)
    px0, py0, px1, _ = bbox(pose)
    s0 = (bx1 - bx0) / max(1, (px1 - px0))
    warp = np.array([[s0, 0, bx0 - s0 * px0], [0, s0, by0 - s0 * py0]], np.float32)
    try:
        crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6)
        inv = cv2.invertAffineTransform(warp)
        _, inv = cv2.findTransformECC(g0, g1, inv.astype(np.float32), cv2.MOTION_AFFINE, crit, mask, 5)
        A = cv2.invertAffineTransform(inv)
        sc = np.sqrt(abs(np.linalg.det(A[:, :2])))
        if 0.9 < sc < 1.35:
            warp = np.array([[sc, 0, A[0, 2]], [0, sc, A[1, 2]]], np.float32)
    except cv2.error:
        pass
    return warp


def warp_to(img, warp):
    h, w = img.shape[:2]
    return cv2.warpAffine(img, warp, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def auto_box(base, part, pad=24):
    d = np.abs(base[..., :3] - part[..., :3]).sum(2) * (base[..., 3] > 128)
    m = (d > 60).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n < 2:
        return None
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = [1 + i for i, a in enumerate(areas) if a >= .25 * areas.max()]      # both eyes, not only the larger one
    x0 = min(stats[k, 0] for k in keep); y0 = min(stats[k, 1] for k in keep)
    x1 = max(stats[k, 0] + stats[k, 2] for k in keep); y1 = max(stats[k, 1] + stats[k, 3] for k in keep)
    H, W = m.shape
    return (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))


def compose_poses(base):
    """Each pose: keyed, scaled onto the base head, with its own mouths and blink composed inside auto-found boxes."""
    out = {}
    for d in sorted((RAW / 'poses').glob('*/base.png')):
        name = d.parent.name
        pb = key_green(np.asarray(Image.open(d).convert('RGBA')).astype(np.float32))
        warp = head_match(base, pb)
        pbw = warp_to(pb, warp)
        frames = {'base': pbw}
        parts = {}
        for f in sorted(d.parent.glob('*.png')):
            if f.stem == 'base':
                continue
            raw = key_green(np.asarray(Image.open(f).convert('RGBA')).astype(np.float32))
            box0 = (300, 260, 760, 760)
            try:
                al, _ = align(pb, raw, (0, 0, 1, 1))
            except cv2.error:
                al = raw
            alw = warp_to(al, warp)
            box = auto_box(pbw, alw) or box0
            m = changed_mask(pbw, alw, box)
            full = pbw.copy()
            full[m, :3] = alw[m, :3]
            frames[f.stem] = full
            parts[f.stem] = box
        out[name] = {'frames': frames, 'boxes': parts, 'scale': float(warp[0, 0])}
        print(f'pose {name:10s} scale={warp[0, 0]:.3f} parts={sorted(parts)}')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grid', type=int, default=4)
    ap.add_argument('--colors', type=int, default=72)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    base = load('base')
    parts = sorted(p.stem for p in RAW.glob('*.png') if p.stem.startswith(('mouth_', 'eyes_', 'blink')))

    composed = {'base': base}
    for name in parts:
        box = part_box(name)
        warped, warp = align(base, load(name), box)
        m = changed_mask(base, warped, box)
        full = base.copy()
        full[m, :3] = warped[m, :3]
        composed[name] = full
        print(f'{name:16s} shift=({warp[0, 2]:+.1f},{warp[1, 2]:+.1f}) rot={np.degrees(np.arctan2(warp[1, 0], warp[0, 0])):+.2f} changed={m.sum()}')

    poses = compose_poses(base) if (RAW / 'poses').exists() else {}
    pix = {k: pixelate(v, a.grid) for k, v in composed.items()}
    ppix = {pn: {fk: pixelate(fv, a.grid) for fk, fv in pv['frames'].items()} for pn, pv in poses.items()}
    # one palette for every frame, built from the base plus all parts so mouth insides keep their colors
    allpix = list(pix.values()) + [f for pv in ppix.values() for f in pv.values()]
    stack = np.concatenate([p[..., :3][p[..., 3] > 0] for p in allpix])[None]
    pal = Image.fromarray(stack).quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pix = {k: quantize(v, pal) for k, v in pix.items()}
    ppix = {pn: {fk: quantize(fv, pal) for fk, fv in pv.items()} for pn, pv in ppix.items()}

    b = pix['base']
    Image.fromarray(b, 'RGBA').save(OUT / 'base.png')
    manifest = {'grid': a.grid, 'width': b.shape[1], 'height': b.shape[0], 'parts': {}}
    for name in parts:
        p = pix[name]
        diff = (np.abs(p[..., :3].astype(int) - b[..., :3].astype(int)).sum(2) > 0) & (b[..., 3] > 0)
        x0, y0, x1, y1 = [v // a.grid for v in part_box(name)]
        diff[:y0], diff[y1:], diff[:, :x0], diff[:, x1:] = False, False, False, False
        ys, xs = np.nonzero(diff)
        if not len(xs):
            print(f'{name}: no change, skipped')
            continue
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        patch = p[by0:by1, bx0:bx1].copy()
        patch[..., 3] = np.where(diff[by0:by1, bx0:bx1], 255, 0)
        Image.fromarray(patch, 'RGBA').save(OUT / f'{name}.png')
        manifest['parts'][name] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0),
                                   'kind': 'mouth' if name.startswith('mouth') else 'eyes'}
    manifest['poses'] = {}
    for pn, frames in ppix.items():
        pdir = OUT / 'poses' / pn
        pdir.mkdir(parents=True, exist_ok=True)
        pb = frames['base']
        Image.fromarray(pb, 'RGBA').save(pdir / 'base.png')
        entry = {}
        for fk, fv in frames.items():
            if fk == 'base':
                continue
            diff = (np.abs(fv[..., :3].astype(int) - pb[..., :3].astype(int)).sum(2) > 0) & (pb[..., 3] > 0)
            bx = poses[pn]['boxes'][fk]
            x0, y0, x1, y1 = [v // a.grid for v in bx]
            diff[:y0], diff[y1:], diff[:, :x0], diff[:, x1:] = False, False, False, False
            ys, xs = np.nonzero(diff)
            if not len(xs):
                continue
            bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            patch = fv[by0:by1, bx0:bx1].copy()
            patch[..., 3] = np.where(diff[by0:by1, bx0:bx1], 255, 0)
            Image.fromarray(patch, 'RGBA').save(pdir / f'{fk}.png')
            entry[fk] = {'x': int(bx0), 'y': int(by0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'kind': 'mouth' if fk.startswith('mouth') else 'eyes'}
        manifest['poses'][pn] = {'parts': entry}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    # preview sheet: base + every part composited, 3x nearest
    names = ['base'] + list(manifest['parts'])
    cols = 4
    rows = (len(names) + cols - 1) // cols
    W, H = b.shape[1] * 2, b.shape[0] * 2
    sheet = Image.new('RGB', (cols * W, rows * H), (226, 233, 242))
    for i, n in enumerate(names):
        im = Image.fromarray(b, 'RGBA')
        if n != 'base':
            pt = manifest['parts'][n]
            im = im.copy()
            im.alpha_composite(Image.open(OUT / f'{n}.png'), (pt['x'], pt['y']))
        sheet.paste(im.resize((W, H), Image.NEAREST), ((i % cols) * W, (i // cols) * H), im.resize((W, H), Image.NEAREST))
    sheet.save(CHAR / 'sheet_sprites.png')
    print(f'wrote {OUT} ({len(manifest["parts"])} parts, {b.shape[1]}x{b.shape[0]})')


if __name__ == '__main__':
    main()
