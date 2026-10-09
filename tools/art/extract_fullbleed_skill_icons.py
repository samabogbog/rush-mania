"""Mechanical grid extraction of image_gen artwork. No painting or alpha padding."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont,ImageOps
root=Path(__file__).resolve().parents[2]
config=json.loads((root/'src/config/classes.json').read_text())['skills']
# Explicit visually verified atlas dividers: generator rows are not uniformly spaced.
# Insets remove the thin boundary seams; ImageOps.fit retains artwork proportions.
dividers={
 'swordsman':([0,267,561,855,1122],[0,261,524,787,1051,1402]),
 'mage':([0,286,562,842,1122],[0,260,520,784,1048,1402]),
 'archer':([0,268,562,856,1122],[0,260,520,782,1046,1402]),
}
entries=[]
for job,skills in config.items():
    source=root/f'art/skills-v2/{job}-atlas.png'
    if not source.exists(): continue
    atlas=Image.open(source).convert('RGB')
    for i,skill in enumerate(skills):
        x,y=i%4,i//4
        xs,ys=dividers[job]
        box=(xs[x]+3,ys[y]+3,xs[x+1]-3,ys[y+1]-3)
        image=ImageOps.fit(atlas.crop(box),(192,192),Image.Resampling.LANCZOS)
        target=root/f"public/icons/skills-v2/skill-{skill['id']}.png"
        image.save(target,optimize=True)
        entries.append(dict(id=skill['id'],name=skill['name'],path=str(target.relative_to(root)),source=str(source.relative_to(root)),source_box=box,size=[192,192],opaque=True,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(root/'art/skills-v2/manifest.json').write_text(json.dumps(dict(version=2,source='Original OpenAI image_gen full-bleed artwork',layout='4 columns x 5 rows; row-major; no alpha padding',skills=entries),indent=2)+'\n')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
sheet=Image.new('RGB',(1200,1020),'#172835');draw=ImageDraw.Draw(sheet)
for i,e in enumerate(entries):
    x=(i%10)*120;y=(i//10)*170
    icon=Image.open(root/e['path'])
    sheet.paste(icon.resize((112,112),Image.Resampling.LANCZOS),(x+4,y+4))
    sheet.paste(icon.resize((40,40),Image.Resampling.LANCZOS),(x+40,y+120))
    draw.text((x+3,y+159),e['id'].replace('swordsman','sword'),font=font,fill='white')
sheet.save(root/'art/skills-v2/contact-sheet.png')
print(f'{len(entries)} opaque RGB192x192 icons; {len(set(e["sha256"] for e in entries))} unique')
