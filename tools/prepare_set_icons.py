"""Split the generated equipment atlas into uniformly padded runtime PNGs."""
from pathlib import Path
from PIL import Image
import json
import numpy as np
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
atlas = Image.open(root / 'artwork/level-set-atlas.png').convert('RGBA')
sets = ['thornwood', 'suncrest', 'moonveil', 'frostguard', 'starfall']
pieces = ['blade', 'staff', 'bow', 'helmet', 'coat', 'gloves', 'boots', 'charm']
manifest = []
alpha = np.asarray(atlas.getchannel('A'))
labels, _ = ndimage.label(alpha > 20, structure=np.ones((3, 3)))
groups = {}
for label, bounds in enumerate(ndimage.find_objects(labels), start=1):
    if bounds is None:
        continue
    ys, xs = bounds
    area = int(np.count_nonzero(labels[bounds] == label))
    if area < 50:
        continue
    row = min(4, int((ys.start + ys.stop) / 2 / (atlas.height / 5)))
    col = min(7, int((xs.start + xs.stop) / 2 / (atlas.width / 8)))
    groups.setdefault((row, col), []).append((label, area))
for row, set_name in enumerate(sets):
    for col, piece in enumerate(pieces):
        name = f'{set_name}-{piece}'
        # Extract complete connected artwork, including tips extending past a
        # nominal grid boundary; retain both halves of paired gloves/boots.
        candidates = groups.get((row, col), [])
        largest = max(area for _, area in candidates)
        chosen = [label for label, area in candidates if area >= largest * .12]
        mask = ndimage.binary_dilation(np.isin(labels, chosen), iterations=2)
        tile = atlas.copy()
        tile.putalpha(Image.fromarray((alpha * mask).astype(np.uint8)))
        bbox = tile.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
        if not bbox:
            raise ValueError(f'Missing atlas tile: {name}')
        art = tile.crop(bbox)
        scale = 96 / max(art.size)
        art = art.resize((round(art.width * scale), round(art.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (128, 128))
        canvas.alpha_composite(art, ((128 - art.width) // 2, (128 - art.height) // 2))
        canvas.save(root / 'public/icons' / f'{name}.png', optimize=True)
        manifest.append(dict(name=name, canvas=[128, 128], content=list(art.size), minimumPadding=16))
(root / 'artwork/set-icon-manifest.json').write_text(json.dumps(manifest, indent=2))
print('Prepared 40 equipment PNGs with uniform 16px minimum padding.')
