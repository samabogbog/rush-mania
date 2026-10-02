from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]
atlas=Image.open(root/'artwork/material-equipment-atlas.png').convert('RGBA')
names=['honey','fur','tusk','antler','wisp-essence','crystal-dust','ice-shard','frost-fang','feather','root-core','field-coat','shell-vest','wisp-robe','root-plate','leaf-charm','root-signet']
manifest=[]
for i,name in enumerate(names):
 row,col=divmod(i,4)
 tile=atlas.crop((round(col*atlas.width/4),round(row*atlas.height/4),round((col+1)*atlas.width/4),round((row+1)*atlas.height/4)))
 bbox=tile.getchannel('A').point(lambda a:255 if a>20 else 0).getbbox()
 if not bbox:raise ValueError(name)
 art=tile.crop(bbox);ratio=96/max(art.size);art=art.resize((round(art.width*ratio),round(art.height*ratio)),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(art,((128-art.width)//2,(128-art.height)//2));canvas.save(root/'public/icons'/f'{name}.png',optimize=True)
 manifest.append(dict(name=name,canvas=[128,128],content=list(art.size),maxContent=96,minimumPadding=16))
(root/'artwork/material-icon-manifest.json').write_text(json.dumps(manifest,indent=2))
print('Normalized 16 new icons with matching 16px minimum padding.')
