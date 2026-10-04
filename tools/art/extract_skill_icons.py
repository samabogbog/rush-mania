"""Non-creative atlas extraction, alpha-bounds normalization and review-sheet assembly.
Requires Pillow. Run from repository root. Source artwork is image_gen authored.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json
ROOT=Path(__file__).resolve().parents[2]
SIZE=192
CONTENT=138  # 71.875%; each side has >=14% padding
entries=[]
for job in ['swordsman','mage','archer']:
    source=ROOT/'art/skills'/f'{job}-atlas.png'
    atlas=Image.open(source).convert('RGBA')
    for index in range(20):
        col,row=index%4,index//4
        cell=atlas.crop((round(col*atlas.width/4),round(row*atlas.height/5),round((col+1)*atlas.width/4),round((row+1)*atlas.height/5)))
        source_ref=f'art/skills/{job}-atlas.png'
        source_cell=index
        overrides={('mage',10):0,('mage',18):1,('archer',10):2,('archer',17):3}
        if (job,index) in overrides:
            n=overrides[(job,index)]
            extra=Image.open(ROOT/'art/skills/nature-readability-atlas.png').convert('RGBA')
            cell=extra.crop((round((n%2)*extra.width/2),round((n//2)*extra.height/2),round((n%2+1)*extra.width/2),round((n//2+1)*extra.height/2)))
            source_ref='art/skills/nature-readability-atlas.png'
            source_cell=n
        bounds=cell.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
        assert bounds, (job,index)
        trimmed=cell.crop(bounds)
        trimmed.thumbnail((CONTENT,CONTENT),Image.Resampling.LANCZOS)
        icon=Image.new('RGBA',(SIZE,SIZE))
        icon.alpha_composite(trimmed,((SIZE-trimmed.width)//2,(SIZE-trimmed.height)//2))
        skill_id=f'{job}-{index+1}' if index<10 else f'{job}-b-{index-9}'
        rel=f'public/icons/skill-{skill_id}.png'
        output=ROOT/rel
        icon.save(output,optimize=True)
        actual=icon.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
        entries.append(dict(id=skill_id,icon=f'skill-{skill_id}',path=rel,source=source_ref,cell=source_cell,dimensions=[SIZE,SIZE],visible_bounds=list(actual),sha256=hashlib.sha256(output.read_bytes()).hexdigest()))
assert len({e['sha256'] for e in entries})==60
(ROOT/'art/skills/manifest.json').write_text(json.dumps(dict(version=1,source='OpenAI image_gen original artwork',normalization=dict(size=SIZE,max_content=CONTENT,min_padding_percent=14),skills=entries),indent=2)+'\n')
# Contact sheet also shows exact 48px hotbar size, never used as a game asset.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
sheet=Image.new('RGB',(1200,960),'#172835')
draw=ImageDraw.Draw(sheet)
for i,e in enumerate(entries):
    x=(i%10)*120;y=(i//10)*160
    im=Image.open(ROOT/e['path'])
    sheet.paste(im.resize((112,112),Image.Resampling.LANCZOS),(x+4,y),im.resize((112,112),Image.Resampling.LANCZOS))
    mini=im.resize((48,48),Image.Resampling.LANCZOS)
    sheet.paste(mini,(x+36,y+105),mini)
    draw.text((x+3,y+148),e['id'].replace('swordsman','sword'),font=font,fill='white')
sheet.save(ROOT/'art/skills/contact-sheet.png')
print('60 unique RGBA192x192 icons; normalized content <=138px; manifest and 48px contact sheet saved.')
