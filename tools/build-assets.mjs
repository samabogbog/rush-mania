import { build } from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('.local',{recursive:true});
await build({entryPoints:['tools/author-rigged-assets.ts'],bundle:true,platform:'node',format:'esm',outfile:'.local/author-assets.mjs'});
// The legacy procedural author still rebuilds monsters. Its hero output must
// never replace accepted mesh heroes, even if the process fails halfway.
const heroes=['swordsman','mage','archer'];
const before=JSON.parse(await readFile('public/models/manifest.json','utf8'));
const binaries=await Promise.all(heroes.map(id=>readFile(`public/models/${id}.glb`)));
let status=1;
try{status=spawnSync(process.execPath,['.local/author-assets.mjs'],{stdio:'inherit'}).status??1;}
finally{
 for(let i=0;i<heroes.length;i++)await writeFile(`public/models/${heroes[i]}.glb`,binaries[i]);
 const current=JSON.parse(await readFile('public/models/manifest.json','utf8'));
 for(const id of heroes)current[id]=before[id];
 await writeFile('public/models/manifest.json',JSON.stringify(current,null,2)+'\n');
}
if(status!==0)process.exit(status);
const exported=spawnSync(process.execPath,['tools/export-mesh-characters.mjs'],{stdio:'inherit'});
if(exported.status!==0)process.exit(exported.status||1);
