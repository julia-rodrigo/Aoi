"""./studio notes <video>: description.md with chapters. Times come from the master voice; titles from the English script."""
import sys
from common import video_dir, load, brief_field, master_lang, lang_paths, parse_script

v = sys.argv[1]
vdir = video_dir(v)
mlang = master_lang(vdir)
voice = load(lang_paths(vdir, mlang)[1] / 'voice.json')
titles = []
for c in parse_script(vdir / 'script.md'):
    if c['section'] and (not titles or titles[-1] != c['section']):
        titles.append(c['section'])
secs = [{'title': t, 'start': s['start']} for t, s in zip(titles, voice['sections'])] or voice['sections']


def stamp(s):
    s = int(s)
    return f'{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}' if s >= 3600 else f'{s // 60}:{s % 60:02d}'


lines = [f'# {brief_field(vdir, "title", v)}', '', '(Summary: two or three sentences. Write from the brief.)', '', 'CHAPTERS']
lines += [f'{stamp(s["start"])} {s["title"]}' for s in secs]
warn = [s['title'] for a, s in zip(secs, secs[1:]) if s['start'] - a['start'] < 10]
if len(secs) < 3 or warn:
    lines += ['', '> YouTube needs 3 or more chapters, each 10 s or longer. Too short: ' + (', '.join(warn) or 'fewer than 3 chapters')]
(vdir / 'description.md').write_text('\n'.join(lines) + '\n')
print(f'notes: {vdir / "description.md"}')
