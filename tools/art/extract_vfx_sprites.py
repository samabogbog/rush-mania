"""Mechanical extraction and normalization of original image_gen VFX atlas."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
R=Path(__file__).resolve().parents[2]
source=R/'art/vfx/effects-atlas.png'
atlas=Image.open(source).convert('RGBA')
names=['star-glint','energy-flare','fire-comet','ice-burst','lightning-bolt','crescent-ribbon','rune-circle','leaf-petals','worldtree','healing-lotus','impact-shockwave','spectral-arrow']
entries=[]
for n,name in enumerate(names):
 c,r=n%3,n//3
 cell=atlas.crop((round(c*atlas.width/3),round(r*atlas.height/4),round((c+1)*atlas.width/3),round((r+1)*atlas.height/4)))
 source_ref='art/vfx/effects-atlas.png'
 source_cell=n
 repair={'ice-burst':0,'healing-lotus':1,'impact-shockwave':2,'spectral-arrow':3}
 if name in repair:
  extra=Image.open(R/'art/vfx/effects-clean-atlas.png').convert('RGBA')
  v=repair[name];col,row=v%2,v//2
  cell=extra.crop((round(col*extra.width/2),round(row*extra.height/2),round((col+1)*extra.width/2),round((row+1)*extra.height/2)))
  source_ref='art/vfx/effects-clean-atlas.png';source_cell=v
 # Trim atlas gutter slivers mechanically before normalizing, no painted edits.
 cell=cell.crop((24 if name=='spectral-arrow' else 8,8,cell.width-8,cell.height-8))
 bounds=cell.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
 assert bounds
 cell=cell.crop(bounds);cell.thumbnail((320,320),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(384,384));out.alpha_composite(cell,((384-cell.width)//2,(384-cell.height)//2))
 path=R/f'public/textures/vfx/{name}.png';out.save(path,optimize=True)
 hist=out.getchannel('A').histogram()
 assert hist[0]>0 and sum(hist[1:255])>0 and sum(hist[240:])>0
 entries.append(dict(name=name,path=f'/textures/vfx/{name}.png',source=source_ref,cell=source_cell,size=[384,384],alpha=dict(transparent=hist[0],translucent=sum(hist[1:255]),near_opaque=sum(hist[240:])),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
assert len({i['sha256'] for i in entries})==12
(R/'art/vfx/manifest.json').write_text(json.dumps(dict(version=1,provenance='Original OpenAI image_gen artwork 2026-10-04',sprites=entries),indent=2)+'\n')
sheet=Image.new('RGB',(1008,1416),'#142735');d=ImageDraw.Draw(sheet);f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for n,e in enumerate(entries):
 x=n%3*336;y=n//3*354
 im=Image.open(R/('public'+e['path']));sheet.paste(im.resize((336,336),Image.Resampling.LANCZOS),(x,y),im.resize((336,336),Image.Resampling.LANCZOS));d.text((x+10,y+331),e['name'],fill='white',font=f)
sheet.save(R/'art/vfx/contact-sheet.png')
print('12 unique 384x384 RGBA sprite PNGs; zero-alpha gutters, partial-alpha fades and near-opaque cores verified')
