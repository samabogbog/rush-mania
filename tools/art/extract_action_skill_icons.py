"""Mechanical grid extraction of image_gen artwork. No painting or alpha padding."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont,ImageOps
root=Path(__file__).resolve().parents[2]
config=json.loads((root/'src/config/classes.json').read_text())['skills']
# Explicit visually verified atlas dividers: generator rows are not uniformly spaced.
# Insets remove the thin boundary seams; ImageOps.fit retains artwork proportions.
dividers={
 'swordsman':([0,276,561,843,1122],[0,263,517,784,1049,1402]),
 'mage':([0,279,561,844,1122],[0,256,512,770,1044,1402]),
 'archer':([0,278,561,846,1122],[0,259,518,778,1043,1402]),
}
entries=[]
for job,skills in config.items():
    source=root/f'art/skills-v4/{job}-atlas.png'
    if not source.exists(): continue
    atlas=Image.open(source).convert('RGB')
    for i,skill in enumerate(skills):
        x,y=i%4,i//4
        xs,ys=dividers[job]
        box=(xs[x]+3,ys[y]+3,xs[x+1]-3,ys[y+1]-3)
        image=ImageOps.fit(atlas.crop(box),(192,192),Image.Resampling.LANCZOS)
        target=root/f"public/icons/skills-v4/skill-{skill['id']}.png"
        image.save(target,optimize=True)
        entries.append(dict(id=skill['id'],name=skill['name'],path=str(target.relative_to(root)),source=str(source.relative_to(root)),source_box=box,size=[192,192],opaque=True,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(root/'art/skills-v4/manifest.json').write_text(json.dumps(dict(version=4,source='Original OpenAI image_gen bright stylized action artwork',layout='4 columns x 5 rows; row-major; no alpha padding',skills=entries),indent=2)+'\n')
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',10)
sheet=Image.new('RGB',(1200,1020),'#172835');draw=ImageDraw.Draw(sheet)
for i,e in enumerate(entries):
    x=(i%10)*120;y=(i//10)*170
    icon=Image.open(root/e['path'])
    sheet.paste(icon.resize((112,112),Image.Resampling.LANCZOS),(x+4,y+4))
    sheet.paste(icon.resize((40,40),Image.Resampling.LANCZOS),(x+17,y+117))
    sheet.paste(icon.resize((32,32),Image.Resampling.LANCZOS),(x+72,y+121))
    draw.text((x+3,y+159),e['id'].replace('swordsman','sword'),font=font,fill='white')
sheet.save(root/'art/skills-v4/contact-sheet.png')
print(f'{len(entries)} opaque RGB192x192 icons; {len(set(e["sha256"] for e in entries))} unique')
