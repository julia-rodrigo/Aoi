"""Make a new video folder from the template: ./studio new <video-slug>"""
import shutil, sys
from common import ROOT, VIDEOS

slug = sys.argv[1]
dst = VIDEOS / slug
if dst.exists():
    sys.exit(f'already exists: {dst}')
shutil.copytree(ROOT / 'stages' / 'template', dst)
print(f'made {dst}. Next: fill in brief.md with Claude, then write script.md.')
