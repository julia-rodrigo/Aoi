"""Stage 3, the storyboard: storyboard.txt + words.json -> cues.json, bundle.json and cues.md (the timed table).

  ./studio cues <video>

storyboard.txt has one beat for every time the picture changes. A beat is:

  == <type> key=value key="two words"      the beat type and its options
  @ a few words from the script              the beat starts when the voice says these words
  free text or "- item @ words" lines        the beat's content (an item can have its own cue words)

Types: host, title, screen, list, flow, big, image, custom. See stages/03-cues/CONTRACT.md.
"""
import argparse, difflib, re, shlex, sys
from pathlib import Path
from common import (ROOT, KIT, video_dir, norm_tokens, dump, load, ts, brief_field, languages, lang_paths,
                    tokens, sentences, tok_time, LANG_NAMES, master_lang, has_voice, parse_script, spoken)

LEAD = 0.12   # a beat lands this long before its first word
DEFAULT_SFX = {'title': 'shimmer', 'screen': 'whoosh', 'flow': 'whoosh', 'big': 'pop', 'image': 'whoosh', 'list': 'whoosh'}
ITEM_SFX = {'list': 'blip', 'flow': 'blip'}


def storyboard_lines(path):
    """The storyboard's lines, with each `== include <file>` line (relative to the video folder) replaced by that file."""
    out = []
    for raw in path.read_text().splitlines():
        s = raw.strip()
        if s.startswith('== include '):
            out += storyboard_lines(path.parent / s[len('== include '):].strip())
        else:
            out.append(raw)
    return out


def parse_storyboard(path):
    beats, cur = [], None
    for raw in storyboard_lines(path):
        line = raw.rstrip()
        s = line.strip()
        if s.startswith('#') and not s.startswith('#!'):
            continue
        if s.startswith('=='):
            parts = shlex.split(s[2:].strip())
            opts = {}
            for p in parts[1:]:
                k, _, v = p.partition('=')
                opts[k] = v if v else True
            cur = {'type': parts[0], 'opts': opts, 'anchor': None, 'body': [], 'items': [], 'line': len(beats) + 1}
            beats.append(cur)
        elif cur is None or not s:
            continue
        elif s.startswith('@'):
            cur['anchor'] = s[1:].strip()
        elif s.startswith('- '):
            text, _, anchor = s[2:].partition(' @ ')
            cur['items'].append({'text': text.strip(), 'anchor': anchor.strip() or None})
        else:
            cur['body'].append(s)
    return beats


def ja_tokens(text):
    """Japanese cue words as kana, one token a kana (so kanji and kana spellings match)."""
    import pykakasi
    return list(re.sub(r'[^\w]', '', ''.join(x['hira'] for x in pykakasi.kakasi().convert(spoken(text)))).lower())


def heard_tokens(words, lang):
    """Heard tokens and their start times: English words, or Japanese kana read in context."""
    if lang != 'ja':
        tok, tt = [], []
        for w in words:
            for t in norm_tokens(w['w']):
                tok.append(t); tt.append(w['s'])
        return tok, tt
    import pykakasi
    text = ''.join(w['w'] for w in words)
    owner = [k for k, w in enumerate(words) for _ in w['w']]
    tok, tt, pos = [], [], 0
    for item in pykakasi.kakasi().convert(text):
        h = re.sub(r'[^\w]', '', item['hira']).lower()
        t = words[owner[min(pos, len(owner) - 1)]]['s'] if owner else 0
        tok += list(h); tt += [t] * len(h)
        pos += len(item['orig'])
    return tok, tt


TOKFN = norm_tokens


def flat(text):
    """Text for cue matching: no spaces, no punctuation, lower case."""
    return re.sub(r'[\W_]+', '', text.lower())


class ScriptCues:
    """Find cue words in the master script itself (as written) and take their time from the take's letter timing.
    A word the voice misreads cannot break a cue this way. Used for Japanese."""
    def __init__(self, voice):
        dstr, dtimes = display_index(voice)
        self.chars, self.times = [], []
        for ch, t in zip(dstr, dtimes):
            f = flat(ch)
            if f:
                self.chars.append(f); self.times.append(t)
        self.text = ''.join(self.chars)

    def find(self, anchor, start, limit=None):
        want = flat(anchor)
        i = self.text.find(want, start, limit if limit else len(self.text))
        if i >= 0:
            return i, 1.0
        best, best_i = 0, None                     # nearly the same words (a small edit in the script)
        end = len(self.text) if limit is None else limit
        for j in range(start, min(end, start + 3000)):
            r = difflib.SequenceMatcher(a=want, b=self.text[j:j + len(want)], autojunk=False).ratio()
            if r > best:
                best, best_i = r, j
        return (best_i, best) if best >= .8 else (None, best)


def find(tokens, anchor, start, limit=None):
    """Index of the anchor words in the heard tokens, at or after start. Exact first, then the closest match."""
    want = TOKFN(anchor)
    n = len(want)
    end = len(tokens) if limit is None else min(len(tokens), limit)
    for i in range(start, end - n + 1):
        if tokens[i:i + n] == want:
            return i, 1.0
    best, best_i = 0, None
    for i in range(start, min(end - n + 1, start + 900)):
        r = difflib.SequenceMatcher(a=want, b=tokens[i:i + n], autojunk=False).ratio()
        if r > best:
            best, best_i = r, i
    return (best_i, best) if best >= 0.72 else (None, best)


SUB_MAX = {'en': 46, 'ja': 22}
NO_START = set('、。，．！？!?,.)）」』ーっゃゅょぁぃぅぇぉッャュョァィゥェォ')


def display_index(voice):
    """Shown text of the whole take, with a time for every character (token start)."""
    chars, times = [], []
    for c in voice['chunks']:
        for t in tokens(c['text'], c.get('tags', True)):
            tt = tok_time(t, c['align'], c['tts'])
            for ch in t['d']:
                chars.append(ch)
                times.append(tt[0] if tt else (times[-1] if times else 0))
    return ''.join(chars), times


def clean(text, lang):
    t = re.sub(r'\s+', ' ', text).strip()
    t = re.sub(r'\s+([,.!?;:])', r'\1', t)          # space left before punctuation by a removed direction
    t = re.sub(r',\s*,', ',', t)                       # ", ," left by "English, [in French now], French"
    if lang == 'ja':
        t = t.rstrip('。').strip()
    return t


WEAK_END = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'with', 'my', 'your', 'each', 'every', 'is'}


def split_caption(items, mx, lang):
    """Split a sentence's tokens into lines of mx characters or fewer. Picks the breaks for the whole sentence at once:
    even lengths, breaks after commas, never after a weak word ("a", "the") or before a closing mark."""
    n = len(items)
    total = len(clean(''.join(d for d, _ in items), lang))
    if total <= mx or n < 2:
        return [items]
    k = -(-total // mx)
    target = total / k
    seg_len = lambda i, j: len(clean(''.join(d for d, _ in items[i:j]), lang))
    best = [0.0] + [float('inf')] * n
    back = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(j):
            ln = seg_len(i, j)
            if ln > mx or best[i] == float('inf'):
                continue
            last = items[j - 1][0].strip()
            cost = (target - ln) ** 2 / target
            if j < n:
                if last[-1:] in ',、;:':
                    cost -= 30
                if lang == 'en' and last.lower().strip('.,!?') in WEAK_END:
                    cost += 40
                if items[j][0].strip()[:1] in NO_START:
                    cost += 100
            if best[i] + cost < best[j]:
                best[j], back[j] = best[i] + cost, i
    if best[n] == float('inf'):
        return [items]
    cuts, j = [], n
    while j > 0:
        cuts.append((back[j], j))
        j = back[j]
    return [items[i:j] for i, j in reversed(cuts)]


def sound_onsets(wav_path):
    from common import read_wav, sound_edges
    a, sr = read_wav(wav_path)
    return sound_edges(a, sr)[0]


def build_subs(voice, lang, onsets=()):
    caps = []
    for c in voice['chunks']:
        for si, sent in enumerate(sentences(tokens(c['text'], c.get('tags', True)))):
            items = [(t['d'], tok_time(t, c['align'], c['tts'])) for t in sent]
            for group in split_caption(items, SUB_MAX.get(lang, 40), lang):
                text = clean(''.join(d for d, _ in group), lang)
                tt = [x for _, x in group if x]
                if text and tt:
                    st = tt[0][0]
                    near = [o for o in onsets if abs(o - st) <= 0.3]
                    if near:                          # the line starts on a real sound start
                        st = min(near, key=lambda o: abs(o - st))
                    caps.append({'s': st, 'e': max(tt[-1][1], st + 0.3), 't': text, 'n': c['n'], 'sid': (c['n'], si)})
    # join a very short line with the next one when they fit on one line ("Hi!" + "I'm Aoi.")
    merged = []
    for c in caps:
        if merged and merged[-1]['n'] == c['n'] and merged[-1]['e'] - merged[-1]['s'] < 0.9 \
                and c['s'] - merged[-1]['e'] < 0.5 and len(merged[-1]['t']) + len(c['t']) + 1 <= SUB_MAX.get(lang, 40):
            joint = ' ' if lang != 'ja' else '' if merged[-1]['sid'] == c['sid'] else '\u3000'
            merged[-1] = {**merged[-1], 'e': c['e'], 't': merged[-1]['t'] + joint + c['t'], 'sid': c['sid']}
        else:
            merged.append(dict(c))
    caps = merged
    for i, c in enumerate(caps):
        nxt = caps[i + 1]['s'] - 0.06 if i + 1 < len(caps) else c['e'] + 3
        start = max(0.0, c['s'] - 0.05)
        end = c['e'] + 0.35
        if nxt - end < 0.45:          # bridge short gaps so the line does not blink
            end = nxt - 0.03
        end = min(max(end, start + 0.8), nxt - 0.03) if i + 1 < len(caps) else max(end, start + 0.8)
        c['s'], c['e'] = round(start, 3), round(end, 3)
    return caps


def srt_time(t, sep=','):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)) % 1000:03d}'


def write_subs(vdir, lang, caps):
    d = vdir / 'subs'
    d.mkdir(exist_ok=True)
    (d / f'{lang}.srt').write_text('\n'.join(f'{i}\n{srt_time(c["s"])} --> {srt_time(c["e"])}\n{c["t"]}\n'
                                             for i, c in enumerate(caps, 1)))
    (d / f'{lang}.vtt').write_text('WEBVTT\n\n' + '\n'.join(f'{srt_time(c["s"], ".")} --> {srt_time(c["e"], ".")}\n{c["t"]}\n'
                                                           for c in caps))


def map_time(t, mp):
    """English time -> the same moment in another language, through the sentence map."""
    for es, ee, ls, le in mp:
        if es - 0.02 <= t <= ee + 0.02:
            return ls + (t - es) / max(0.05, ee - es) * (le - ls)
    return t


def strings_needed(beats):
    need = []
    for b in beats:
        for k in ('title', 'label'):
            if isinstance(b['opts'].get(k), str) and b['type'] != 'screen':   # a window title is a real path
                need.append(b['opts'][k])
        if b['type'] != 'screen':
            need += b['body'] + [it['text'] for it in b['items']]
    return list(dict.fromkeys(need))


def refine(voice, words, lang):
    """Per-character times from Scribe's word times on the real audio, wherever the heard words match the script.
    ElevenLabs letter timing drifts up to half a second inside long paragraphs; Scribe hears where words really are.
    Characters with no match keep the voice's own timing."""
    aligns = [[list(x) for x in c['align']] for c in voice['chunks']]
    if lang == 'ja':
        import pykakasi
        kk = pykakasi.kakasi()
        keep = lambda t: re.sub(r'[^\w]', '', t)
        text = ''.join(w['w'] for w in words)
        owner = [k for k, w in enumerate(words) for _ in w['w']]
        heard, pos = [], 0
        for item in kk.convert(text):
            h = keep(item['hira'])
            if owner and h:
                w0, w1 = words[owner[min(pos, len(owner) - 1)]], words[owner[min(pos + len(item['orig']) - 1, len(owner) - 1)]]
                for k, ch in enumerate(h):
                    heard.append((ch, w0['s'] + (w1['e'] - w0['s']) * k / len(h), w0['s'] + (w1['e'] - w0['s']) * (k + 1) / len(h)))
            pos += len(item['orig'])
        script = []
        for ci, c in enumerate(voice['chunks']):
            tts, pos = c['tts'], 0
            for item in kk.convert(tts):
                i = tts.find(item['orig'], pos)
                if i < 0:
                    continue
                pos = i + len(item['orig'])
                for ch in keep(item['hira']):
                    script.append((ch, ci, i, pos))
    else:
        heard = [(t, w['s'], w['e']) for w in words for t in norm_tokens(w['w'])[:1]]
        script = []
        for ci, c in enumerate(voice['chunks']):
            for m in re.finditer(r"\[[^\]]*\]|[A-Za-z0-9'’]+", c['tts']):
                n = norm_tokens(m.group(0))
                if n and not m.group(0).startswith('['):
                    script.append((n[0], ci, m.start(), m.end()))
    sm = difflib.SequenceMatcher(a=[x[0] for x in script], b=[x[0] for x in heard], autojunk=False)
    spans = {}
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, ci, a, b = script[blk.a + k]
            _, hs, he = heard[blk.b + k]
            lo, hi = spans.get((ci, a, b), (hs, he))
            spans[(ci, a, b)] = (min(lo, hs), max(hi, he))
    for (ci, a, b), (hs, he) in spans.items():
        for j in range(a, b):
            aligns[ci][j] = [hs + (he - hs) * (j - a) / (b - a), hs + (he - hs) * (j - a + 1) / (b - a)]
    return aligns, len(spans)


READ_CPS = {'en': 17, 'ja': 8}     # comfortable reading speed, characters a second


def sentence_texts(chunks, lang):
    """The shown text of every sentence, in order, with its paragraph number."""
    out = []
    for c in chunks:
        for sent in sentences(tokens(c['text'], c.get('tags', True))):
            out.append((c['n'], clean(''.join(t['d'] for t in sent), lang)))
    return out


def sentence_spans(voice):
    """Speech start and end of every sentence of a take, in order (English has them; other languages keep a map)."""
    if voice.get('sentences'):
        return [(s['start'], s['end']) for s in voice['sentences']]
    return [(m[2], m[3]) for m in voice.get('map', [])]


WEAK = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'for', 'in', 'on', 'with', 'my', 'your', 'each', 'every', 'is', 'its', "it's"}
LEADWORDS = {'of', 'on', 'in', 'to', 'for', 'with', 'and', 'but', 'before', 'after', 'that', 'what', 'who', 'when', 'so'}


def two_lines(text, mx):
    """One line, or two lines: break near the middle, after a comma if one is close, never after a weak word ("a", "the")."""
    if len(text) <= mx:
        return text
    if ' ' not in text:
        best = len(text) // 2
        while best < len(text) - 1 and text[best] in NO_START:
            best += 1
        return f'{text[:best]}\n{text[best:]}'
    def cost(i):
        a, b = text[:i].strip(), text[i:].strip()
        prev, nxt = a.split()[-1].lower().strip(',.'), b.split()[0].lower()
        return (abs(len(a) - len(b)) - (9 if a.endswith((',', ';', ':')) else 0) + (14 if prev in WEAK else 0)
                - (4 if nxt in LEADWORDS else 0) + (40 if max(len(a), len(b)) > mx + 4 else 0))
    best = min((i for i, ch in enumerate(text) if ch == ' '), key=cost)
    return f'{text[:best].strip()}\n{text[best:].strip()}'


def split_long(text, mx):
    """Split text into parts of mx characters or fewer, at commas first, then at spaces."""
    parts, cur = [], ''
    for piece in re.split(r'(?<=[,;:、])\s*', text):
        if cur and len(cur) + 1 + len(piece) > mx:
            parts.append(cur); cur = piece
        else:
            cur = (cur + ' ' + piece).strip() if cur else piece
    parts.append(cur)
    out = []
    for x in parts:
        while len(x) > mx:
            cut = x.rfind(' ', 0, mx)
            cut = cut if cut > mx // 3 else mx
            out.append(x[:cut].strip()); x = x[cut:].strip()
        out.append(x)
    return [x for x in out if x]


def cross_subs(text_chunks, text_lang, timing_voice, wav):
    """Subtitles in one language timed to the voice of another (Japanese voice, English subtitles).
    Both takes have the same sentences one to one, so each sentence's subtitle covers that sentence's speech,
    snapped to where its sound really starts and stops."""
    from common import read_wav, sound_edges
    texts, spans = sentence_texts(text_chunks, text_lang), sentence_spans(timing_voice)
    if len(texts) != len(spans):
        print(f'subtitles {text_lang} on this voice: {len(texts)} sentences vs {len(spans)} spoken. Make the scripts match sentence for sentence.')
        return []
    a, sr = read_wav(wav)
    ons, offs = sound_edges(a, sr)
    near = lambda xs, t, w: min((x for x in xs if abs(x - t) <= w), key=lambda x: abs(x - t), default=t)
    mx = SUB_MAX.get(text_lang, 40)
    caps = []
    for (n, txt), (s0, e0) in zip(texts, spans):
        s1, e1 = near(ons, s0, .25), near(offs, e0, .3)
        if caps and caps[-1]['n'] == n and caps[-1]['e'] - caps[-1]['s'] < .9 and s1 - caps[-1]['e'] < .35 and len(caps[-1]['t']) + len(txt) + 1 <= mx:
            caps[-1].update(e=e1, t=caps[-1]['t'] + (' ' if text_lang != 'ja' else '\u3000') + txt)
        elif len(txt) > 2 * mx:          # a long sentence: parts of two lines or less, timed by their share of the text
            parts = split_long(txt, 2 * mx)
            total, t0 = sum(len(x) for x in parts), s1
            for x in parts:
                t1 = t0 + (e1 - s1) * len(x) / total
                caps.append({'s': t0, 'e': t1, 't': x, 'n': n})
                t0 = t1
        else:
            caps.append({'s': s1, 'e': e1, 't': txt, 'n': n})
    for i, c in enumerate(caps):
        nxt = caps[i + 1]['s'] - .05 if i + 1 < len(caps) else c['e'] + 3
        need = len(c['t']) / READ_CPS.get(text_lang, 15)
        start = max(0.0, c['s'] - .05)
        end = max(c['e'] + .3, start + need, start + 1.0)
        if nxt - end < .45:
            end = nxt - .03
        end = min(end, nxt - .03) if i + 1 < len(caps) else end
        c['s'], c['e'], c['t'] = round(start, 3), round(end, 3), two_lines(c['t'], mx)
    return caps


def script_chunks(vdir, lang):
    script, _, _ = lang_paths(vdir, lang)
    return [{'n': i, 'text': c['text'], 'tags': True, 'section': c['section']} for i, c in enumerate(parse_script(script), 1)]


def text_only_data(vdir, lang, master_voice):
    """A language nobody voices: its section titles (on the master's times) and on-screen strings, for text and subtitles."""
    chunks, titles = script_chunks(vdir, lang), []
    for c in chunks:
        if c['section'] and (not titles or titles[-1] != c['section']):
            titles.append(c['section'])
    secs = [{'title': t, 'start': m['start']} for t, m in zip(titles, master_voice['sections'])]
    strings = {}
    sp = vdir / 'lang' / lang / 'strings.json'
    if lang != 'en' and sp.exists():
        strings = {k: (v['text'] if isinstance(v, dict) else v) for k, v in load(sp).items()}
    return {'name': LANG_NAMES.get(lang, lang), 'textOnly': True, 'sections': secs, 'strings': strings, 'subs': [], 'subsBy': {},
            '_chunks': chunks}


def lang_data(vdir, video, lang, beats, sfx_beats, mlang='en'):
    _, vo, suffix = lang_paths(vdir, lang)
    voice = load(vo / 'voice.json')
    mouth = load(vdir / f'mouth{suffix}.json')
    if lang == 'en':   # Scribe's English word times beat the voice's own timing; its Japanese times run 0.2-0.3 s late
        aligns, matched = refine(voice, load(vdir / f'words{suffix}.json'), lang)
        for c, al in zip(voice['chunks'], aligns):
            c['align'] = al
    strings, cues = {}, {}
    if lang != 'en':
        sp = vdir / 'lang' / lang / 'strings.json'
        raw = load(sp) if sp.exists() else {}
        missing = [x for x in strings_needed(beats) if x not in raw]
        if missing:
            dump(vdir / 'lang' / lang / 'strings.missing.json', {m: '' for m in missing})
            print(f'note: {lang} on-screen text: {len(missing)} strings have no translation, so they show in English '
                  f'(template: lang/{lang}/strings.missing.json). Fine when the on-screen text stays English.')
        for k, v in raw.items():
            strings[k] = v['text'] if isinstance(v, dict) else v
            cues[k] = v.get('cue', v.get('text')) if isinstance(v, dict) else v
    mp = voice.get('map', [])
    dstr, dtimes = display_index(voice)
    items, sfx = [], list(sfx_beats)
    for b in beats:
        row, last = [], b['start']
        for it in b['items']:
            if lang == mlang:
                t = it['t']
            else:
                t = None
                cue = re.sub(r'[*]', '', cues.get(it['text'], '')) if b['type'] != 'screen' else ''
                if cue:
                    for m in re.finditer(re.escape(cue), dstr):
                        ct = dtimes[m.start()] - 0.12
                        if last - 0.05 <= ct <= b['end']:
                            t = max(b['start'], ct)
                            break
                if t is None:
                    t = max(b['start'], map_time(it['t'], mp))
            row.append(round(t, 3))
            last = t
        items.append(row)
        iname = b['opts'].get('item_sfx', ITEM_SFX.get(b['type']))
        if iname and iname != 'none':
            sfx += [{'t': t, 'name': iname} for t in row if t > b['start'] + 0.05]
    caps = build_subs(voice, lang, sound_onsets(vo / 'voice.wav'))
    write_subs(vdir, lang, caps)
    for c in caps:
        c['t'] = two_lines(c['t'], SUB_MAX.get(lang, 40)) if len(c['t']) > SUB_MAX.get(lang, 40) else c['t']
    audio = f'/videos/{video}/voice/voice.wav' if lang == 'en' else f'/videos/{video}/voice/{lang}/voice.wav'
    return {'name': LANG_NAMES.get(lang, lang), 'audio': audio, 'mouth': mouth, 'subs': caps, 'subsBy': {lang: caps}, '_voice': voice,
            '_chunks': voice['chunks'],
            'sections': voice['sections'], 'strings': strings, 'items': items, 'sfx': sorted(sfx, key=lambda e: e['t'])}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    a = ap.parse_args()
    vdir = video_dir(a.video)
    global TOKFN
    mlang = master_lang(vdir)
    _, mvo, msuffix = lang_paths(vdir, mlang)
    words = load(vdir / f'words{msuffix}.json')
    voice = load(mvo / 'voice.json')
    TOKFN = ja_tokens if mlang == 'ja' else norm_tokens
    tok, tok_t = heard_tokens(words, mlang)
    finder = None
    if mlang == 'ja':
        sc = ScriptCues(voice)
        tok, tok_t, finder = list(sc.text), sc.times, sc.find
    beats = parse_storyboard(vdir / 'storyboard.txt')
    pos, errors = 0, []
    for b in beats:
        if not b['anchor']:
            errors.append(f'beat {b["line"]} ({b["type"]}) has no "@ words" line')
            continue
        i, score = (finder or find)(tok, b['anchor'], pos) if not finder else finder(b['anchor'], pos)
        if i is None:
            ctx = ('' if mlang == 'ja' else ' ').join(tok[pos:pos + 25])
            errors.append(f'beat {b["line"]} ({b["type"]}): could not find "{b["anchor"]}" after {ts(tok_t[pos] if pos < len(tok_t) else 0)}. '
                          f'Next words: "{ctx}..."')
            continue
        b['start'] = max(0.0, round(tok_t[i] - LEAD, 3))
        b['tok'] = i
        b['fuzzy'] = round(score, 2) if score < 1 else None
        pos = i + 1
    if errors:
        print('\n'.join(errors))
        sys.exit(1)
    if beats:
        beats[0]['start'] = 0.0
    for k, b in enumerate(beats):
        b['end'] = beats[k + 1]['start'] if k + 1 < len(beats) else voice['duration']
        end_tok = beats[k + 1]['tok'] if k + 1 < len(beats) else len(tok)
        p = b['tok']
        for j, it in enumerate(b['items']):
            if it['anchor']:
                i, _ = finder(it['anchor'], p, end_tok + 5) if finder else find(tok, it['anchor'], p, end_tok + 5)
                if i is None:
                    sys.exit(f'beat {b["line"]}: item "{it["text"]}" cue "{it["anchor"]}" not found inside the beat')
                it['t'] = max(b['start'], round(tok_t[i] - LEAD, 3))
                p = i + 1
            else:
                it['t'] = round(b['start'] + 0.35 + 0.45 * j, 3)

    files, later = {}, []
    for b in beats:
        f = b['opts'].get('file')
        if f:
            path = (ROOT / f) if not Path(f).is_absolute() else Path(f)
            if not path.exists():
                path = vdir / f
            if not path.exists():
                later.append((f, ROOT / f if not Path(f).is_absolute() else Path(f)))   # made by this run: filled in at the end
                files[f] = ['(made by ./studio cues)']
                continue
            files[f] = path.read_text(errors='replace').splitlines()[:600]
        img = b['opts'].get('src')
        if img:
            for cand in (vdir / img, ROOT / img):
                if cand.exists():
                    b['opts']['src'] = '/' + str(cand.relative_to(ROOT))
                    break
            else:
                sys.exit(f'beat {b["line"]}: image not found: {img}')

    sfx_beats = []
    for b in beats[1:]:
        name = b['opts'].get('sfx', DEFAULT_SFX.get(b['type']))
        if name and name != 'none':
            sfx_beats.append({'t': b['start'], 'name': name})

    out_beats = [{k: b[k] for k in ('type', 'opts', 'anchor', 'body', 'items', 'start', 'end', 'line')} for b in beats]
    dump(vdir / 'cues.json', out_beats)
    langs = {}
    for lang in languages(vdir):
        langs[lang] = lang_data(vdir, a.video, lang, out_beats, sfx_beats, mlang) if has_voice(vdir, lang) else text_only_data(vdir, lang, voice)
    # subtitles in every language for every voice: e.g. the Japanese voice with English subtitles
    for v, dv in langs.items():
        if dv.get('textOnly'):
            continue
        for t, dt in langs.items():
            if t != v:
                _, vo_v, _ = lang_paths(vdir, v)
                cs = cross_subs(dt['_chunks'], t, dv['_voice'], vo_v / 'voice.wav')
                dv['subsBy'][t] = cs
                (vdir / 'subs').mkdir(exist_ok=True)
                (vdir / 'subs' / f'{v}-voice.{t}.srt').write_text('\n'.join(
                    f'{i}\n{srt_time(c["s"])} --> {srt_time(c["e"])}\n{c["t"]}\n' for i, c in enumerate(cs, 1)))
    for dv in langs.values():
        dv.pop('_voice', None); dv.pop('_chunks', None)
    en = langs[mlang]
    bundle = {
        'video': a.video, 'title': brief_field(vdir, 'title', a.video), 'duration': voice['duration'],
        'fps': 30, 'beats': out_beats, 'files': files, 'langs': langs, 'lang_order': list(langs), 'master': mlang,
        'audio': en['audio'], 'mouth': en['mouth'], 'sections': en['sections'], 'sfx': en['sfx'], 'words': words,
        'character': brief_field(vdir, 'character', 'aoi'), 'style': brief_field(vdir, 'style', 'holo-desk'),
        'captions': (brief_field(vdir, 'captions', 'off') or 'off').lower() in ('on', 'yes', 'true'),
        'scenes': sorted(f.name for f in (vdir / 'scenes').glob('*.js')),   # more scene files, loaded after scene.js
        'hud': (brief_field(vdir, 'section_label', 'on') or 'on').lower() not in ('off', 'no', 'false'),   # the top-left section label
    }
    dump(vdir / 'bundle.json', bundle)

    lines = [f'# Cues: {a.video}', '', f'{len(beats)} beats over {ts(voice["duration"])}. This is the timed storyboard '
             '(the Leica reel). Read it before any animation.', '',
             '| # | Starts | Length | Type | Cue words | Content |', '|---|---|---|---|---|---|']
    for k, b in enumerate(out_beats, 1):
        what = ' / '.join(b['body'])[:60] or ', '.join(i['text'] for i in b['items'])[:60] or \
            ' '.join(f'{x}={y}' for x, y in b['opts'].items())[:60]
        fz = f' (close match {beats[k - 1]["fuzzy"]})' if beats[k - 1].get('fuzzy') else ''
        lines.append(f'| {k} | {ts(b["start"])} | {b["end"] - b["start"]:.1f}s | {b["type"]} | {b["anchor"]}{fz} | {what} |')
    short = [k for k, b in enumerate(out_beats, 1) if b['end'] - b['start'] < 1.2]
    if short:
        lines += ['', f'Short beats (under 1.2 s, may flash by): {", ".join(map(str, short))}']
    (vdir / 'cues.md').write_text('\n'.join(lines) + '\n')
    lines += ['', 'Languages: ' + ', '.join(f'{l} (text only)' if d.get('textOnly') else f'{l} ({len(d["subs"])} subtitle lines)' for l, d in langs.items())]
    print('\n'.join(lines[4:]))
    if later:                                  # files this run made, now that they exist
        for f, path in later:
            if path.exists():
                bundle['files'][f] = path.read_text(errors='replace').splitlines()[:600]
            else:
                print(f'note: {f} still does not exist')
        dump(vdir / 'bundle.json', bundle)
    print(f'\ncues: {len(beats)} beats -> {vdir / "cues.md"}')


if __name__ == '__main__':
    main()
