"""Shared helpers for the studio commands."""
import json, re, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
KIT = ROOT / 'kit'
VIDEOS = ROOT / 'videos'
SR = 44100


def env(name):
    """An API key: from the environment, or from a .env file in the studio folder or any folder above it."""
    import os
    if os.environ.get(name):
        return os.environ[name]
    here = Path(__file__).resolve().parent.parent
    for f in [d / '.env' for d in (here, *here.parents)] + [Path.cwd() / '.env']:
        if f.exists():
            for line in f.read_text().splitlines():
                if line.strip().startswith(name + '='):
                    return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit(f'{name} is not set. Add it to {here / ".env"} (copy .env.example) or export it.')


def video_dir(slug):
    d = VIDEOS / slug
    if not d.is_dir():
        sys.exit(f'no video folder: {d}  (make one with ./studio new {slug})')
    return d


def brief_field(vdir, key, default=None):
    """Read 'key: value' from the brief (first match, case-insensitive)."""
    for line in (vdir / 'brief.md').read_text().splitlines():
        m = re.match(rf'^\s*[-*]?\s*{key}\s*:\s*(.+?)\s*$', line, re.I)
        if m:
            return m.group(1).split('#')[0].strip()
    return default


# Script markup:
#   [excited]                 a direction (ElevenLabs v3, Fish Audio Drama 3): sent to the voice, never shown in subtitles
#   <whisper>...</whisper>    Drama 3 tags (also <french>, <emphasis> ...): sent to the voice, never shown
#   {CLAUDE.md|Claude dot M D} show the first part in subtitles, say the second part
PIECE = re.compile(r'\{([^|{}]*)\|([^{}]*)\}|\[[^\]]*\]|<[^<>{}\n]{1,40}>')
CJK = '　-ヿ㐀-鿿＀-￯'
TOKEN = re.compile(rf'[{CJK}]|[^\s{CJK}]+\s*|\s+')
LANG_NAMES = {'en': 'English', 'ja': 'Japanese'}


def pieces(text):
    """Script text -> [(tts, display, kind)], kind = plain, swap or tag."""
    out, pos = [], 0
    for m in PIECE.finditer(text):
        if m.start() > pos:
            out.append((text[pos:m.start()], text[pos:m.start()], 'plain'))
        if m.group(0).startswith('{'):
            out.append((m.group(2), m.group(1), 'swap'))
        else:
            out.append((m.group(0), '', 'tag'))         # [direction] or <tag>
        pos = m.end()
    if pos < len(text):
        out.append((text[pos:], text[pos:], 'plain'))
    return out


def tts_text(text, tags=True):
    """What ElevenLabs gets: the spoken side of every {shown|spoken}, and the tags (eleven_v3 only)."""
    return ''.join(p[0] for p in pieces(text) if tags or p[2] != 'tag')


def shown(text):
    """What a viewer reads: the shown side of every {shown|spoken}, no tags."""
    return re.sub(r'\s+', ' ', ''.join(p[1] for p in pieces(text))).strip()


def spoken(text):
    """What the voice says: no tags."""
    return re.sub(r'\s+', ' ', ''.join(p[0] for p in pieces(text) if p[2] != 'tag')).strip()


def tokens(text, tags=True):
    """Subtitle tokens: [{d: shown text, a, b: character range in tts_text}]. English splits by word,
    Japanese by character, a {shown|spoken} part is one token."""
    out, pos = [], 0
    for tts, disp, kind in pieces(text):
        if kind == 'swap':
            out.append({'d': disp, 'a': pos, 'b': pos + len(tts)})
        elif kind == 'plain':
            for m in TOKEN.finditer(tts):
                out.append({'d': m.group(0), 'a': pos + m.start(), 'b': pos + m.end()})
        elif not tags:
            continue
        pos += len(tts)
    return out


def ends_sentence(d):
    s = d.strip().rstrip('"\')」』）')
    return s.endswith(('.', '!', '?', '。', '！', '？', '…'))


def wordish(d):
    return any(ch.isalnum() for ch in d)


def sentences(toks):
    """Group tokens into sentences (a sentence ends on . ! ? 。 ！ ？)."""
    out, cur = [], []
    for t in toks:
        if not cur and not t['d'].strip():
            continue
        cur.append(t)
        if ends_sentence(t['d']):
            out.append(cur)
            cur = []
    if any(wordish(t['d']) for t in cur):
        out.append(cur)
    return out


def tok_time(tok, align, tts):
    """(start, end) of a token from per-character timing, ignoring spaces and punctuation."""
    idx = [i for i in range(tok['a'], tok['b']) if i < len(align) and tts[i].isalnum()]
    if not idx:
        return None
    return min(align[i][0] for i in idx), max(align[i][1] for i in idx)


def sent_span(sent, align, tts):
    """Speech start and end of a sentence, and its tts character range."""
    times = [tok_time(t, align, tts) for t in sent]
    times = [x for x in times if x]
    return {'start': times[0][0], 'end': times[-1][1], 'a': sent[0]['a'], 'b': sent[-1]['b']}


def text_align(chars, starts, ends, text):
    """Per-character (start, end) for text, from ElevenLabs alignment (which may differ from text a little)."""
    import difflib
    al = ''.join(chars)
    if al == text:
        return [[round(a, 4), round(b, 4)] for a, b in zip(starts, ends)]
    out = [None] * len(text)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=text, b=al, autojunk=False).get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                out[i1 + k] = [starts[j1 + k], ends[j1 + k]]
        elif op == 'replace' and j2 > j1:
            for k in range(i2 - i1):
                j = j1 + min(j2 - j1 - 1, int(k * (j2 - j1) / max(1, i2 - i1)))
                out[i1 + k] = [starts[j], ends[j]]
    last = [0.0, 0.0]
    for i in range(len(out)):
        if out[i] is None:
            out[i] = [last[1], last[1]]
        last = out[i]
    return [[round(a, 4), round(b, 4)] for a, b in out]


def lang_paths(vdir, lang):
    """script, voice folder and file suffix for a language (en is the master timeline)."""
    if lang == 'en':
        return vdir / 'script.md', vdir / 'voice', ''
    return vdir / 'lang' / lang / 'script.md', vdir / 'voice' / lang, f'.{lang}'


def languages(vdir):
    """Languages in brief order; the first one is the master timeline unless `master:` says otherwise."""
    v = brief_field(vdir, 'languages', 'en') or 'en'
    langs = [x.strip() for x in v.split(',') if x.strip()]
    m = master_lang(vdir, langs)
    return [m] + [l for l in langs if l != m]


def master_lang(vdir, langs=None):
    """The language whose voice sets the timeline (beats, chapters). English unless the brief says `master: ja`."""
    return (brief_field(vdir, 'master', None) or 'en').strip()


def has_voice(vdir, lang):
    """A language can be text only (subtitles and on-screen text) when nobody voices it."""
    _, vo, _ = lang_paths(vdir, lang)
    return (vo / 'voice.json').exists()


def norm_tokens(text):
    t = spoken(text).lower().replace('’', "'")
    t = re.sub(r"[^a-z0-9' ]+", ' ', t.replace('-', ' '))
    return [w.strip("'") for w in t.split() if w.strip("'")]


def parse_script(path):
    """script.md -> [{section, text}]. '# ' lines are sections (chapters); blank lines split chunks;
    lines starting with '>' or '//' are notes and are not spoken."""
    chunks, section, buf = [], None, []

    def flush():
        if buf:
            chunks.append({'section': section, 'text': ' '.join(buf).strip()})
            buf.clear()
    for line in path.read_text().splitlines():
        s = line.strip()
        if s.startswith('# '):
            flush()
            section = shown(s[2:].strip())
        elif not s:
            flush()
        elif s.startswith(('>', '//', '<!--')):
            continue
        else:
            buf.append(s)
    flush()
    return chunks


def read_wav(path):
    with wave.open(str(path)) as w:
        n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        a = a.reshape(-1, ch).mean(1)
    return a, sr


def sound_edges(pcm, sr=SR, win=0.005, need_on=0.06, need_off=0.08):
    """Where sound starts (after 60 ms of quiet) and stops (before 80 ms of quiet), in seconds.
    A low threshold catches soft starts like "s" and "h"; a louder sound must follow within 120 ms."""
    w = int(win * sr)
    n = len(pcm) // w
    if n < 3:
        return [], []
    env = np.sqrt((pcm[:n * w].reshape(n, w) ** 2).mean(1))
    p95 = np.percentile(env[env > 1e-4], 95) if (env > 1e-4).any() else 1.0
    floor = np.percentile(env, 10)                    # room tone between sentences (0 in a joined track)
    q_lvl = max(0.0175 * p95, 2.2 * floor)
    quiet, loud = env < q_lvl, env > 0.12 * p95
    q, q2, conf = int(need_on / win), int(need_off / win), int(0.12 / win)
    ons = [i * win for i in range(n) if not quiet[i] and quiet[max(0, i - q):i].all() and (i >= q or quiet[:i].all())
           and loud[i:i + conf].any()]
    offs = [i * win for i in range(1, n) if not quiet[i - 1] and quiet[i:i + q2].all()]
    if not quiet[-1]:
        offs.append(n * win)
    return ons, offs


def write_wav(path, a, sr=SR):
    a = np.clip(a, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype(np.int16).tobytes())


def dump(path, obj):
    Path(path).write_text(json.dumps(obj, indent=1, ensure_ascii=False))


def load(path):
    return json.loads(Path(path).read_text())


def ts(sec):
    m, s = divmod(sec, 60)
    return f'{int(m)}:{s:05.2f}'
