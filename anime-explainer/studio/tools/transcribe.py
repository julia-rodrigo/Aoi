"""Stage 2, the words: voice.wav -> words.json (every word with its start and end), mouth.json (lip sync),
and words_check.md (every place where the voice and the script disagree).

  ./studio transcribe <video>             # English
  ./studio transcribe <video> --lang ja   # Japanese (files get a .ja suffix)

The words come from ElevenLabs Scribe on the real audio, so a slurred or wrong word shows up in the check.
The mouth follows the voice's loudness and the sound being said (letters in English, kana vowels in Japanese).
"""
import argparse, difflib, re
import numpy as np
import requests
from common import (video_dir, parse_script, norm_tokens, spoken, lang_paths, read_wav, dump, load, env, ts)

STEP = 12  # mouth changes 12 times a second (anime "on twos")
EN_CLASS = {'a': 'a', 'e': 'e', 'i': 'e', 'y': 'e', 'o': 'o', 'u': 'o', 'w': 'o', 'm': 'c', 'b': 'c', 'p': 'c'}

# kana -> vowel
_ROWS = {'a': 'あかさたなはまやらわがざだばぱぁゃゎ', 'i': 'いきしちにひみりぎじぢびぴぃ', 'u': 'うくすつぬふむゆるぐずづぶぷぅゅゔ',
         'e': 'えけせてねへめれげぜでべぺぇ', 'o': 'おこそとのほもよろをごぞどぼぽぉょ'}
KANA_V = {ch: v for v, row in _ROWS.items() for ch in row}
KANA_V.update({'ん': 'n', 'っ': 'q'})
SMALL = set('ぁぃぅぇぉゃゅょゎ')
JA_CLASS = {'a': 'a', 'i': 'e', 'e': 'e', 'o': 'o', 'u': 'm', 'n': 'c', 'q': 'c'}


def scribe(path, lang):
    with open(path, 'rb') as f:
        r = requests.post('https://api.elevenlabs.io/v1/speech-to-text', headers={'xi-api-key': env('ELEVENLABS_API_KEY')},
                          files={'file': ('voice.wav', f, 'audio/wav')},
                          data={'model_id': 'scribe_v2', 'timestamps_granularity': 'word', 'language_code': lang,
                                'tag_audio_events': 'false'}, timeout=600)
    r.raise_for_status()
    return [{'w': w['text'], 's': round(w['start'], 3), 'e': round(w['end'], 3)}
            for w in r.json()['words'] if w.get('type') == 'word' and w.get('start') is not None]


def hira(text):
    import pykakasi
    return ''.join(x['hira'] for x in pykakasi.kakasi().convert(text))


def morae(h):
    out = []
    for ch in h:
        ch = chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ヶ' else ch
        if ch == 'ー' and out:
            out.append(out[-1])
        elif ch in SMALL and out:
            out[-1] = KANA_V.get(ch, out[-1])
        elif ch in KANA_V:
            out.append(KANA_V[ch])
    return out


def phones(voice, lang):
    """(mouth class, start, end) for each sound, from the per-character timing of every paragraph."""
    out = []
    for c in voice['chunks']:
        tts, al = c['tts'], c['align']
        if lang == 'ja':
            import pykakasi
            pos = 0
            for item in pykakasi.kakasi().convert(tts):
                i = tts.find(item['orig'], pos)
                if i < 0:
                    continue
                pos = i + len(item['orig'])
                span = [al[j] for j in range(i, pos) if tts[j].strip()]
                ms = morae(item['hira'])
                if not span or not ms:
                    continue
                s, e = min(x[0] for x in span), max(x[1] for x in span)
                dt = (e - s) / len(ms)
                out += [(JA_CLASS[m], s + k * dt, s + (k + 1) * dt) for k, m in enumerate(ms)]
        else:
            inside_tag = False
            for ch, (s, e) in zip(tts, al):
                inside_tag = (inside_tag or ch == '[') and ch != ']'
                if ch.isalpha() and not inside_tag:
                    out.append((EN_CLASS.get(ch.lower(), 'm'), s, e))
    return out


def mouth_track(wav, sr, ph, duration):
    """Loudness per 1/12 s step plus the sound being said -> one mouth shape per step."""
    hop = sr // STEP
    n = int(duration * STEP) + 1
    env_ = np.array([np.sqrt((wav[i * hop:(i + 1) * hop] ** 2).mean() + 1e-12) for i in range(n)])
    ref = np.percentile(env_[env_ > 0.01], 90) if (env_ > 0.01).any() else 1
    lev = np.clip(env_ / ref, 0, 1.2)
    want = [''] * n
    rank = {'a': 4, 'o': 3, 'e': 2, 'm': 1, 'c': 0}
    for cls, s, e in ph:
        for k in range(int(s * STEP), min(n, int(e * STEP) + 1)):
            if not want[k] or rank[cls] > rank[want[k]]:
                want[k] = cls
    shapes = []
    for k in range(n):
        L, w = lev[k], want[k]
        if L < 0.14 or w == 'c':
            shapes.append('c')
        elif L < 0.42:
            shapes.append('o' if w == 'o' else 'm')
        else:
            shapes.append(w if w in ('a', 'e', 'o') else 'a')
    hop30 = sr // 30
    n30 = int(duration * 30) + 1
    lvl = [round(float(min(1, np.sqrt((wav[i * hop30:(i + 1) * hop30] ** 2).mean() + 1e-12) / ref)), 3) for i in range(n30)]
    return {'fps': STEP, 'shapes': ''.join(shapes), 'level_fps': 30, 'level': lvl}


def check_en(script_chunks, words, chunks):
    script_tokens = [t for c in script_chunks for t in norm_tokens(c['text'])]
    heard = [t for w in words for t in norm_tokens(w['w'])]
    times = [w['s'] for w in words for _ in norm_tokens(w['w'])]
    return diff(script_tokens, heard, times, chunks, ' ')


def check_ja(script_chunks, words, chunks):
    keep = lambda s: re.sub(r'[^\w]', '', s)
    script = keep(hira(''.join(spoken(c['text']) for c in script_chunks)))
    import pykakasi
    text = ''.join(w['w'] for w in words)
    owner = [k for k, w in enumerate(words) for _ in w['w']]   # character -> word
    heard, times, pos = [], [], 0
    for item in pykakasi.kakasi().convert(text):               # whole text at once, so kanji read in context
        h = keep(item['hira'])
        t = words[owner[min(pos, len(owner) - 1)]]['s'] if owner else 0
        heard += list(h)
        times += [t] * len(h)
        pos += len(item['orig'])
    return diff(list(script), heard, times, chunks, '')


def diff(a, b, times, chunks, sep):
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    rows = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            continue
        t = times[j1] if j1 < len(times) else (times[-1] if times else 0)
        n = next((c['n'] for c in chunks if c['start'] - 0.2 <= t <= c['end'] + 0.2), '?')
        rows.append(f'| {ts(t)} | {n} | {sep.join(a[i1:i2]) or "(nothing)"} | {sep.join(b[j1:j2]) or "(nothing)"} |')
    return sm.ratio(), rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--lang', default='en')
    a = ap.parse_args()
    vdir = video_dir(a.video)
    script, vo, sfx = lang_paths(vdir, a.lang)
    voice = load(vo / 'voice.json')
    words = scribe(vo / 'voice.wav', a.lang)
    dump(vdir / f'words{sfx}.json', words)
    wav, sr = read_wav(vo / 'voice.wav')
    dump(vdir / f'mouth{sfx}.json', mouth_track(wav, sr, phones(voice, a.lang), voice['duration']))
    chunks = parse_script(script)
    ratio, rows = (check_ja if a.lang == 'ja' else check_en)(chunks, words, voice['chunks'])
    unit = 'kana' if a.lang == 'ja' else 'words'
    lines = [f'# Words check: {a.video} ({a.lang})', '',
             f'{len(words)} words heard. Match with the script ({unit}): {ratio * 100:.1f}%. {len(rows)} place(s) disagree.', '',
             'Numbers and names often show up here. Those are fine if they sound right. Fix a real mistake in the script '
             '(spell the name the way it sounds), then speak and transcribe again.', '']
    if rows:
        lines += ['| Time | Paragraph | Script says | Voice says |', '|---|---|---|---|'] + rows
    (vdir / f'words_check{sfx}.md').write_text('\n'.join(lines) + '\n')
    print(f'words ({a.lang}): {len(words)} words, {ratio * 100:.1f}% match, {len(rows)} place(s) to check -> '
          f'{vdir / f"words_check{sfx}.md"}')


if __name__ == '__main__':
    main()
