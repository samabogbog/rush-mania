"""Slice generated artwork into uniform transparent sprites; do not redraw artwork."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
atlas=Image.open(root/'artwork/icon-atlas.png').convert('RGBA')
names=['backpack','swords','wind','health-potion','mana-potion','leaf','mushroom','jelly','hero','anvil','store','map','coins','quest','settings','help','crosshair','hand','auto','moon','sound-off','sound-on','plus','close','arrow-right','arrow-down','sparkles','map-pin','focus','save','minus','cursor','expand','sprout','shield','chest']
alpha=atlas.getchannel('A').point(lambda a:255 if a>20 else 0)
def cuts(horizontal):
    size=atlas.height if horizontal else atlas.width
    histogram=[]
    for i in range(size):
        stripe=alpha.crop((0,i,atlas.width,i+1) if horizontal else (i,0,i+1,atlas.height))
        histogram.append(sum(stripe.getdata()))
    boundaries=[0]
    for cell in range(1,6):
        expected=round(cell*size/6)
        boundaries.append(min(range(expected-32,expected+33),key=lambda p:histogram[p]))
    return boundaries+[size]
xs,ys=cuts(False),cuts(True)
manifest=[]
for i,name in enumerate(names):
    row,col=divmod(i,6)
    tile=atlas.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
    bbox=tile.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox()
    if not bbox: raise ValueError(name)
    art=tile.crop(bbox)
    scale=96/max(art.size)
    art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(128,128))
    canvas.alpha_composite(art,((128-art.width)//2,(128-art.height)//2))
    canvas.save(root/'public/icons'/f'{name}.png',optimize=True)
    manifest.append({'name':name,'canvas':[128,128],'content':list(art.size),'maxContent':96,'minimumPadding':16})
(root/'artwork/icon-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Prepared {len(names)} PNG sprites from {atlas.size}; consistent 128px canvas / 96px artwork.')
