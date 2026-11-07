"""Stage 1, the voice: script.md -> voice/voice.wav, one ElevenLabs take per paragraph.

  ./studio speak <video>                  # English (the master timeline)
  ./studio speak <video> --lang ja        # Japanese, fitted onto the English timeline
  ./studio speak <video> --redo 4         # roll paragraph 4 again (comma list, or 'all')
  ./studio speak <video> --list           # show the paragraphs and their numbers

Each paragraph is cached in voice[/<lang>]/chunk_NN.wav + .json. A paragraph is made again only when its text or
the voice changes, or when you --redo it, so a bad line costs one paragraph, not the take.

English sets the timeline. Another language is fitted onto it sentence by sentence: each sentence starts when the
English sentence starts, so every beat, chapter and sound effect lands at the same second in every language, and the
languages can be swapped at any moment. A sentence that is too long for its English slot is sped up (pitch kept);
fit.md lists every sentence and flags the ones to shorten.
"""
import argparse, base64, hashlib, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
import requests
from common import (SR, KIT, video_dir, brief_field, parse_script, spoken, tts_text, tokens, sentences, sent_span,
                    text_align, lang_paths, read_wav, write_wav, dump, load, env, ts, sound_edges, master_lang)

GAP = 0.32         # silence between paragraphs (master)
SECTION_GAP = 0.7  # silence before a new section (master)
LEAD, TAIL = 0.4, 1.2
SLOT_GAP = 0.08    # a fitted sentence ends this long before the next sentence starts
FAST, TOO_FAST = 1.12, 1.25
LEVEL = 0.12       # speech RMS after leveling


def tts(preset, text, lang='en'):
    """One take of one paragraph -> (pcm at 44.1 kHz, letter timing). Providers: ElevenLabs (default) or Fish Audio."""
    if preset.get('provider') == 'fish':
        return fish_tts(preset, text, lang)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{preset['voice_id']}/with-timestamps?output_format=pcm_44100"
    body = {'text': text, 'model_id': preset['model_id'], 'voice_settings': preset.get('voice_settings')}
    for attempt in range(4):
        r = requests.post(url, headers={'xi-api-key': env('ELEVENLABS_API_KEY')}, json=body, timeout=300)
        if r.ok:
            d = r.json()
            pcm = np.frombuffer(base64.b64decode(d['audio_base64']), dtype=np.int16).astype(np.float32) / 32768
            return pcm, d.get('alignment') or d.get('normalized_alignment')
        print(f'  ElevenLabs {r.status_code}: {r.text[:200]}', flush=True)
        if r.status_code < 500 and r.status_code != 429:
            sys.exit(1)
    sys.exit('ElevenLabs failed 4 times')


def fish_tts(preset, text, lang):
    """Fish Audio TTS (docs.fish.audio, POST /v1/tts). It returns audio only, so the letter timing comes from
    ElevenLabs Scribe on the take (character timestamps); sentence edges are snapped to the sound later."""
    import io, wave
    body = {'text': text, 'reference_id': preset['reference_id'], 'format': 'wav', 'sample_rate': SR, 'latency': 'normal',
            'normalize': True, 'prosody': {'speed': preset.get('speed', 1.0), 'volume': 0}}
    if preset.get('language'):
        body['language'] = preset['language']
    head = {'Authorization': f"Bearer {env('FISH_API_KEY')}", 'Content-Type': 'application/json', 'model': preset.get('model', 'drama-3')}
    for attempt in range(4):
        r = requests.post('https://api.fish.audio/v1/tts', headers=head, json=body, timeout=600)
        if r.ok and r.content[:4] == b'RIFF':
            with wave.open(io.BytesIO(r.content)) as w:
                sr, ch = w.getframerate(), w.getnchannels()
                pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            if ch > 1:
                pcm = pcm.reshape(-1, ch).mean(1)
            if sr != SR:
                pcm = np.interp(np.arange(int(len(pcm) * SR / sr)) * sr / SR, np.arange(len(pcm)), pcm).astype(np.float32)
            return pcm, None
        print(f'  Fish Audio {r.status_code}: {r.text[:200]}', flush=True)
        if r.status_code < 500 and r.status_code != 429:
            sys.exit(1)
    sys.exit('Fish Audio failed 4 times')


def stt_align(pcm, lang):
    """Letter timing for a take from ElevenLabs Scribe (character timestamps)."""
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / 'take.wav'
        write_wav(f, pcm)
        with open(f, 'rb') as fh:
            r = requests.post('https://api.elevenlabs.io/v1/speech-to-text', headers={'xi-api-key': env('ELEVENLABS_API_KEY')},
                              files={'file': ('take.wav', fh, 'audio/wav')},
                              data={'model_id': 'scribe_v2', 'timestamps_granularity': 'character', 'language_code': lang,
                                    'tag_audio_events': 'false'}, timeout=600)
    r.raise_for_status()
    chars, starts, ends = [], [], []
    for w in r.json()['words']:
        if w.get('start') is None:
            continue
        if w.get('characters'):
            for c in w['characters']:
                chars.append(c['text']); starts.append(c['start']); ends.append(c['end'])
        else:
            n = max(1, len(w['text']))
            for k, ch in enumerate(w['text']):
                chars.append(ch); starts.append(w['start'] + (w['end'] - w['start']) * k / n); ends.append(w['start'] + (w['end'] - w['start']) * (k + 1) / n)
    return {'characters': chars, 'character_start_times_seconds': starts, 'character_end_times_seconds': ends}


def trim(pcm, align, thresh=0.004):
    """Cut leading and trailing silence; shift the timing to match."""
    idx = np.nonzero(np.abs(pcm) > thresh)[0]
    if not len(idx):
        return pcm, align
    a, b = max(0, idx[0] - int(0.03 * SR)), min(len(pcm), idx[-1] + int(0.08 * SR))
    off = a / SR
    if align is None:
        return pcm[a:b], None
    align = {**align,
             'character_start_times_seconds': [max(0, t - off) for t in align['character_start_times_seconds']],
             'character_end_times_seconds': [max(0, t - off) for t in align['character_end_times_seconds']]}
    return pcm[a:b], align


def make_chunks(chunks, preset, vname, vo, redo, lang='en'):
    """Make missing or changed paragraph takes, four at a time. Returns how many were made."""
    import concurrent.futures as cf
    todo = []
    for i, c in enumerate(chunks, 1):
        tags = preset.get('tags', 'v3' in preset.get('model_id', '') or preset.get('provider') == 'fish')
        text = tts_text(c['text'], tags)
        vid = preset.get('voice_id') or preset.get('reference_id')
        key = hashlib.sha1(f"{vid}|{preset.get('model_id') or preset.get('model')}|{preset.get('speed', 1)}|{text}".encode()).hexdigest()[:12]
        meta_p, wav_p = vo / f'chunk_{i:02d}.json', vo / f'chunk_{i:02d}.wav'
        if meta_p.exists() and wav_p.exists() and load(meta_p).get('key') == key and i not in redo:
            continue
        todo.append((i, c, text, key, tags, meta_p, wav_p))

    def one(job):
        i, c, text, key, tags, meta_p, wav_p = job
        print(f'speak {i:02d}: {spoken(c["text"])[:80]}', flush=True)
        pcm, align = tts(preset, text, lang)
        pcm, align = trim(pcm, align)
        if align is None:
            align = stt_align(pcm, lang)
        write_wav(wav_p, pcm)
        dump(meta_p, {'key': key, 'voice': vname, 'section': c['section'], 'text': c['text'], 'tags': tags,
                      'alignment': align})

    with cf.ThreadPoolExecutor(4) as ex:
        list(ex.map(one, todo))
    for p in vo.glob('chunk_*.*'):
        if int(p.stem.split('_')[1]) > len(chunks):
            p.unlink()
    return len(todo)


def chunk_info(vo, i):
    """A paragraph take: audio, tts text, per-character timing (local), sentences (local times)."""
    pcm, _ = read_wav(vo / f'chunk_{i:02d}.wav')
    meta = load(vo / f'chunk_{i:02d}.json')
    tags = meta.get('tags', True)
    text = tts_text(meta['text'], tags)
    al = meta['alignment']
    align = text_align(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds'], text)
    sent_toks = sentences(tokens(meta['text'], tags))
    align = snap(pcm, align, [sent_span(s, align, text) for s in sent_toks])
    sents = [sent_span(s, align, text) for s in sent_toks]
    return pcm, meta, text, align, sents


def snap(pcm, align, sents):
    """ElevenLabs letter timing runs 100 to 350 ms off the real sound. Move each sentence so it starts where its
    sound starts and ends where its sound stops (letters inside are spread linearly)."""
    ons, offs = sound_edges(pcm)
    near = lambda xs, t, lo, hi: min((x for x in xs if t - lo <= x <= t + hi), key=lambda x: abs(x - t), default=None)
    out = [list(x) for x in align]
    for s in sents:
        on, off = near(ons, s['start'], 0.35, 0.35), near(offs, s['end'], 0.25, 0.45)
        if on is None and off is None:
            continue
        ns = on if on is not None else s['start'] + (off - s['end'])
        ne = off if off is not None else s['end'] + (on - s['start'])
        if ne - ns < 0.1 or s['end'] - s['start'] < 0.02:
            continue
        k = (ne - ns) / (s['end'] - s['start'])
        for j in range(s['a'], min(s['b'], len(out))):
            out[j] = [round(ns + (align[j][0] - s['start']) * k, 4), round(ns + (align[j][1] - s['start']) * k, 4)]
    return out


def level(voice):
    speech = voice[np.abs(voice) > 0.01]
    gain = min(LEVEL / (np.sqrt((speech ** 2).mean()) + 1e-9), 0.97 / (np.abs(voice).max() + 1e-9))
    return voice * gain


def speech_db(pcm):
    """Speech level of a take in dB: mean energy of its 50 ms frames that are within 30 dB of its loudest frames."""
    n = int(0.05 * SR)
    fr = pcm[:len(pcm) // n * n].reshape(-1, n) if len(pcm) >= n else pcm.reshape(1, -1)
    e = (fr.astype(np.float64) ** 2).mean(axis=1) + 1e-12
    db = 10 * np.log10(e)
    keep = db > np.percentile(db, 95) - 30
    return float(10 * np.log10(e[keep].mean()))


def even_levels(pcms, limit=4.0):
    """Each paragraph is its own take, and a take's level drifts (a direction such as [confident] also projects).
    Bring every take to the median speech level, at most `limit` dB up or down, so no paragraph jumps out."""
    lv = [speech_db(p) for p in pcms]
    mid = float(np.median(lv))
    return [p * np.float32(10 ** (max(-limit, min(limit, mid - l)) / 20)) for p, l in zip(pcms, lv)]


def join_master(chunks, vo):
    """English: paragraphs one after another with short gaps. This sets the timeline."""
    parts, out_chunks, sections, alignment, sents = [np.zeros(int(LEAD * SR), np.float32)], [], [], [], []
    t, prev_section = LEAD, object()
    takes = [chunk_info(vo, i) for i in range(1, len(chunks) + 1)]
    for k, pcm in enumerate(even_levels([x[0] for x in takes])):
        takes[k] = (pcm,) + tuple(takes[k][1:])
    for i, c in enumerate(chunks, 1):
        if i > 1:
            gap = SECTION_GAP if c['section'] != prev_section else GAP
            parts.append(np.zeros(int(gap * SR), np.float32))
            t += int(gap * SR) / SR
        if c['section'] != prev_section and c['section']:
            sections.append({'title': c['section'], 'start': round(t - (0 if i == 1 else 0.25), 3)})
        prev_section = c['section']
        pcm, meta, text, align, ss = takes[i - 1]
        g_align = [[round(t + a, 3), round(t + b, 3)] for a, b in align]
        for ch, (a, b) in zip(text, g_align):
            alignment.append([ch, a, b])
        for k, s in enumerate(ss):
            sents.append({'n': i, 'k': k, 'start': round(t + s['start'], 3), 'end': round(t + s['end'], 3)})
        out_chunks.append({'n': i, 'section': c['section'], 'text': c['text'], 'tts': text, 'tags': meta.get('tags', True),
                           'align': g_align, 'start': round(t, 3), 'end': round(t + len(pcm) / SR, 3)})
        parts.append(pcm)
        t += len(pcm) / SR
    parts.append(np.zeros(int(TAIL * SR), np.float32))
    voice = level(np.concatenate(parts))
    if sections:
        sections[0]['start'] = 0.0
    return voice, {'duration': round(len(voice) / SR, 3), 'chunks': out_chunks, 'sections': sections,
                   'sentences': sents, 'alignment': alignment}


def stretch(pcm, f):
    """Speed audio up by f (f > 1), pitch kept (Rubber Band)."""
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / 'a.wav', Path(d) / 'b.wav'
        write_wav(a, pcm)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(a), '-af', f'rubberband=tempo={f:.4f}:pitchq=quality',
                        '-ar', str(SR), '-ac', '1', str(b)], check=True)
        out, _ = read_wav(b)
    n = int(round(len(pcm) / f))
    return out[:n] if len(out) >= n else np.pad(out, (0, n - len(out)))


def edges(pcm, a, b, thr=0.008, win=0.005):
    """Tighten [a, b] (seconds) to where the sound really starts and stops, with a little air."""
    seg = pcm[int(a * SR):int(b * SR)]
    w = int(win * SR)
    n = len(seg) // w
    if n < 2:
        return a, b
    rms = np.sqrt((seg[:n * w].reshape(n, w) ** 2).mean(1))
    on = np.nonzero(rms > thr)[0]
    if not len(on):
        return a, b
    return a + max(0, on[0] * win - 0.02), a + min(len(seg) / SR, (on[-1] + 1) * win + 0.06)


def pins_from_cues(vdir, master):
    """Sentences where a beat or a section starts. These are the sync points between languages."""
    sents = master['sentences']
    pins = {0}
    cues = vdir / 'cues.json'
    starts = [b['start'] + 0.12 for b in load(cues)] if cues.exists() else [s['start'] for s in sents]
    starts += [s['start'] + 0.3 for s in master['sections']]
    for t in starts:
        g = max((k for k, s in enumerate(sents) if s['start'] <= t + 0.05), default=0)
        pins.add(g)
    return sorted(pins), cues.exists()


def fit_to_master(chunks, vo, master, lang, vdir):
    """Place this language on the English timeline. Each beat's speech starts when the English beat's speech starts;
    inside a beat the sentences keep their own pace. Long pauses shrink first; then the beat's speech is sped up."""
    en_chunks, en_sents, dur = master['chunks'], master['sentences'], master['duration']
    if len(chunks) != len(en_chunks):
        sys.exit(f'{lang}: {len(chunks)} paragraphs, English has {len(en_chunks)}. They must match one to one.')
    infos = [chunk_info(vo, i) for i in range(1, len(chunks) + 1)]
    flat, problems = [], []   # one entry per sentence, in order, with its take
    for i, (pcm, meta, text, align, ss) in enumerate(infos, 1):
        n_en = sum(1 for s in en_sents if s['n'] == i)
        if len(ss) != n_en:
            problems.append(f'paragraph {i}: {len(ss)} sentences in {lang}, {n_en} in English. Make them match one to one.')
        for k, s in enumerate(ss):
            lo = (ss[k - 1]['end'] + s['start']) / 2 if k else 0.0
            hi = (s['end'] + ss[k + 1]['start']) / 2 if k + 1 < len(ss) else len(pcm) / SR
            a, b = edges(pcm, max(lo, s['start'] - 0.15), min(hi, s['end'] + 0.4))
            flat.append({'n': i, 'k': k, 'a': a, 'b': b, 's': s})
    if problems:
        sys.exit('\n'.join(problems))
    pins, by_beats = pins_from_cues(vdir, master)
    voice = np.zeros(int(round(dur * SR)) + SR, np.float32)
    g_aligns = [[None] * len(info[2]) for info in infos]
    rows, sent_map = [], []
    for pi, g0 in enumerate(pins):
        g1 = pins[pi + 1] if pi + 1 < len(pins) else len(flat)
        seg = flat[g0:g1]
        en0 = en_sents[g0]
        slot_end = (en_sents[g1]['start'] - SLOT_GAP) if g1 < len(en_sents) else dur - 0.2
        lead = seg[0]['s']['start'] - seg[0]['a']
        p = en0['start'] - lead
        if pi == 0:   # the first beat may start in the silence before the English one
            p = max(0.12, min(p, slot_end - lead - sum(x['b'] - x['a'] for x in seg) - 0.3 * (len(seg) - 1)))
        avail = slot_end - p
        # natural gaps between sentences (a new paragraph gets a little more), capped
        gaps = []
        for x, y in zip(seg, seg[1:]):
            same = x['n'] == y['n']
            gaps.append(min(y['a'] - x['b'], 0.32) if same else 0.36)
        speech = sum(x['b'] - x['a'] for x in seg)
        cap = 0.32
        while speech + sum(gaps) > avail and cap > 0.1:      # shrink pauses before speeding up
            cap -= 0.02
            gaps = [min(gp, cap) for gp in gaps]
        total = speech + sum(gaps)
        f = max(1.0, total / avail)
        parts, offs, t = [], [], 0.0
        for j, x in enumerate(seg):
            pcm = infos[x['n'] - 1][0]
            piece = pcm[int(x['a'] * SR):int(x['b'] * SR)].copy()
            fi, fo = int(.008 * SR), int(.025 * SR)
            piece[:fi] *= np.linspace(0, 1, fi)
            piece[-fo:] *= np.linspace(1, 0, fo)
            offs.append(t)
            parts.append(piece)
            t += len(piece) / SR
            if j < len(gaps):
                parts.append(np.zeros(int(max(0, gaps[j]) * SR), np.float32))
                t += int(max(0, gaps[j]) * SR) / SR
        audio = np.concatenate(parts)
        if f > 1.0:
            audio = stretch(audio, f)
        start = int(round(p * SR))
        if start < 0:
            audio, start = audio[-start:], 0
        voice[start:start + len(audio)] += audio
        for x, off in zip(seg, offs):
            _, _, text, align, _ = infos[x['n'] - 1]
            ga = g_aligns[x['n'] - 1]
            for c in range(x['s']['a'], x['s']['b']):
                ga[c] = [round(p + (off + align[c][0] - x['a']) / f, 3), round(p + (off + align[c][1] - x['a']) / f, 3)]
            en = en_sents[g0 + seg.index(x)]
            sent_map.append([en['start'], en['end'], round(p + (off + x['s']['start'] - x['a']) / f, 3),
                             round(p + (off + x['s']['end'] - x['a']) / f, 3)])
        note = 'too fast: shorten this beat' if f > TOO_FAST else 'fast' if f > FAST else ''
        if f > TOO_FAST:
            problems.append(f'beat at {ts(en0["start"])} (paragraph {seg[0]["n"]}): sped up {f:.2f}x. Shorten it.')
        first = infos[seg[0]['n'] - 1][2][seg[0]['s']['a']:seg[0]['s']['b']]
        rows.append(f'| {pi + 1} | {ts(en0["start"])} | {avail:.2f}s | {total:.2f}s | {f:.2f}x | {note} | '
                    f'{len(seg)} | {spoken(first)[:50]} |')
    out_chunks, alignment = [], []
    for i, ((pcm, meta, text, align, ss), ga) in enumerate(zip(infos, g_aligns), 1):
        last = [out_chunks[-1]['end']] * 2 if out_chunks else [0.0, 0.0]
        for j in range(len(text)):
            if ga[j] is None:
                ga[j] = [last[1], last[1]]
            last = ga[j]
        alignment += [[ch, a2, b2] for ch, (a2, b2) in zip(text, ga)]
        out_chunks.append({'n': i, 'section': chunks[i - 1]['section'], 'text': chunks[i - 1]['text'], 'tts': text,
                           'tags': meta.get('tags', True), 'align': ga, 'start': ga[0][0] if ga else 0,
                           'end': ga[-1][1] if ga else 0})
    voice = level(voice[:int(round(dur * SR))])
    sections = []
    for c, en_c in zip(out_chunks, en_chunks):
        if c['section'] and (not sections or sections[-1]['title'] != c['section']):
            en_sec = next((s for s in master['sections'] if s['title'] == en_c['section']), None)
            sections.append({'title': c['section'], 'start': en_sec['start'] if en_sec else en_c['start']})
    if not by_beats:
        problems.append('no cues.json yet, so every sentence is a sync point. Run ./studio cues first for a looser fit.')
    return voice, {'duration': dur, 'chunks': out_chunks, 'sections': sections, 'map': sent_map,
                   'alignment': alignment}, rows, problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--lang', default='en')
    ap.add_argument('--redo', default='')
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    vdir = video_dir(a.video)
    script, vo, _ = lang_paths(vdir, a.lang)
    if not script.exists():
        sys.exit(f'no script for {a.lang}: {script}')
    vo.mkdir(parents=True, exist_ok=True)
    chunks = parse_script(script)
    if a.list:
        for i, c in enumerate(chunks, 1):
            print(f'{i:3d}  [{c["section"]}]  {spoken(c["text"])[:110]}')
        return
    presets = load(KIT / 'voices' / 'voices.json')
    vname = brief_field(vdir, 'voice' if a.lang == 'en' else f'voice_{a.lang}', 'aoi' if a.lang == 'en' else f'aoi-{a.lang}')
    if vname not in presets:
        sys.exit(f'voice preset "{vname}" is not in kit/voices/voices.json')
    preset = presets[vname]
    redo = set(range(1, len(chunks) + 1)) if a.redo == 'all' else {int(x) for x in a.redo.split(',') if x.strip()}
    made = make_chunks(chunks, preset, vname, vo, redo, a.lang)

    mlang = master_lang(vdir)
    if a.lang == mlang:
        voice, info = join_master(chunks, vo)
        rows, problems = [], []
    else:
        master = lang_paths(vdir, mlang)[1] / 'voice.json'
        if not master.exists():
            sys.exit(f'make the {mlang} voice first (it sets the timeline): ./studio speak {a.video} --lang {mlang}')
        voice, info, rows, problems = fit_to_master(chunks, vo, load(master), a.lang, vdir)
    write_wav(vo / 'voice.wav', voice)
    info['voice'] = vname
    info['lang'] = a.lang
    dump(vo / 'voice.json', info)
    dur = info['duration']
    lines = [f'# Take: {a.video} ({a.lang})', '', f'Voice: {vname} ({preset["name"]}). Length {ts(dur)}. '
             f'Made {made} new paragraph(s) this run.', '',
             'Listen to the whole take from start to end. To roll one paragraph again: '
             f'`./studio speak {a.video}{"" if a.lang == "en" else " --lang " + a.lang} --redo N`.', '',
             '| N | Starts | Section | Text |', '|---|---|---|---|']
    for c in info['chunks']:
        lines.append(f"| {c['n']} | {ts(c['start'])} | {c['section'] or ''} | {spoken(c['text'])[:90]} |")
    (vo / 'take.md').write_text('\n'.join(lines) + '\n')
    if a.lang != mlang:
        fit = [f'# Fit: {a.video} ({a.lang} on the English timeline)', '',
               'Each beat starts when the English beat starts; inside a beat the sentences keep their own pace. '
               '"Slot" is the time until the next beat. Long pauses shrink first, then the speech speeds up. '
               f'Over {FAST}x sounds rushed; over {TOO_FAST}x, shorten that sentence in lang/{a.lang}/script.md and speak again.', '',
               '| Beat | Starts | Slot | Speech | Speed | Note | Sentences | First words |', '|---|---|---|---|---|---|---|---|'] + rows
        if problems:
            fit += ['', 'To fix:'] + [f'- {p}' for p in problems]
        (vo / 'fit.md').write_text('\n'.join(fit) + '\n')
        fast = sum(1 for r in rows if '| fast |' in r or 'too fast' in r)
        print(f'fit: {len(rows)} beats, {fast} sped up past {FAST}x, {len(problems)} to fix -> {vo / "fit.md"}')
    print(f'voice ({a.lang}): {vo / "voice.wav"}  ({ts(dur)}, {len(info["chunks"])} paragraphs, {made} new)')


if __name__ == '__main__':
    main()
