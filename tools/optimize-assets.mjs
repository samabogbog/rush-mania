import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune} from '@gltf-transform/functions';
import {readFile,writeFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),manifest=JSON.parse(await readFile('public/models/manifest.json','utf8'));
for(const [id,entry] of Object.entries(manifest)) {
 const path='public'+entry.file,doc=await io.read(path);await doc.transform(dedup(),prune());await io.write(path,doc);
 const root=doc.getRoot(),clips=root.listAnimations().map(a=>a.getName());
 if(root.listSkins().length!==1||root.listSkins()[0].listJoints().length!==7||entry.clips.some(n=>!clips.includes(n)))throw Error('Invalid rig '+id);
 entry.bytes=(await readFile(path)).length;entry.materials=root.listMaterials().length;entry.vertices=root.listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getAttribute('POSITION')?.getCount()||0),0),0);
}
await writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2));console.log('Verified and optimized '+Object.keys(manifest).length+' original rigs.');
