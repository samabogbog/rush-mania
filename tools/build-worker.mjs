import { build } from 'esbuild';
import {mkdir,writeFile,rm,readdir} from 'node:fs/promises';
// Remove prior static-only artifacts; dist/client and dist/server are the supported outputs.
for (const name of await readdir('dist')) if (!['client','server'].includes(name)) await rm('dist/'+name,{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/worker.ts'],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:'dist/server/index.js',minify:true});
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'mossvale-game',main:'index.js',compatibility_date:'2026-10-02',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'mossvale-local',database_id:'local',migrations_dir:'../../drizzle'}]},null,2));
