import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist/realtime',{recursive:true});
await build({entryPoints:['server/realtime-server.ts'],bundle:true,platform:'node',format:'esm',target:'node24',packages:'external',outfile:'dist/realtime/server.mjs'});
await writeFile('dist/realtime/start.mjs',"import {runRealtimeServer} from './server.mjs';\nawait runRealtimeServer();\n");
