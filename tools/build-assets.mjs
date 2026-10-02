import { build } from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
await mkdir('.local',{recursive:true});
await build({entryPoints:['tools/author-rigged-assets.ts'],bundle:true,platform:'node',format:'esm',outfile:'.local/author-assets.mjs'});
const result=spawnSync(process.execPath,['.local/author-assets.mjs'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
