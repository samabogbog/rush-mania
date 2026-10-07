from PIL import Image, ImageDraw
from pathlib import Path
import shutil,json
source=Path('/workspace/generated_images/exec-2755233e-8cdc-4eab-b7da-4faef458f3ee.png')
out=Path('public/icons/materials'); art=Path('artifacts/material-icons')
shutil.copy2(source,art/'generated-atlas.png')
im=Image.open(source).convert('RGBA')
families=['shade-essence','sky-feather','rune-stone']; tiers=['common','rare','epic','ancient','legend']; records=[]
sheet=Image.new('RGB',(5*280,3*304),(23,28,43)); draw=ImageDraw.Draw(sheet)
small=Image.new('RGB',(5*130,3*90),(23,28,43)); sd=ImageDraw.Draw(small)
for row,family in enumerate(families):
 for col,tier in enumerate(tiers):
  cell=im.crop((round(col*im.width/5),[0,338,640][row],round((col+1)*im.width/5),[338,640,972][row]))
  bbox=cell.getchannel('A').point(lambda v:255 if v>=8 else 0).getbbox()
  icon=cell.crop(bbox); scale=204/max(icon.size); icon=icon.resize((round(icon.width*scale),round(icon.height*scale)),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(256,256)); canvas.alpha_composite(icon,((256-icon.width)//2,(256-icon.height)//2))
  name=f'{family}-{tier}.png'; canvas.save(out/name)
  sheet.paste(canvas,(col*280+12,row*304+12),canvas); draw.text((col*280+12,row*304+273),f'{family} / {tier}',fill='white')
  thumb=canvas.resize((40,40),Image.Resampling.LANCZOS); small.paste(thumb,(col*130+45,row*90+8),thumb); sd.text((col*130+15,row*90+54),tier,fill='white')
  records.append({'file':str(out/name),'size':[256,256],'bbox':canvas.getchannel('A').getbbox()})
sheet.save(art/'contact-sheet.png'); small.save(art/'contact-sheet-40px.png')
(art/'origin.json').write_text(json.dumps({'origin':'Fresh OpenAI image_gen generation','source':str(source),'processing':'5x3 cell extraction, alpha bounding box crop, proportional Lanczos resample to max 204px, center on transparent 256px canvas','icons':records},indent=2))
print(json.dumps(records,indent=2))
