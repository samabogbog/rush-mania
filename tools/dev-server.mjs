// Local-only identity simulator. This file is never bundled into the Sites Worker.
import {createServer} from 'node:http';
import {openGameDatabase} from './sqlite-database.mjs';
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('.local',{recursive:true});
await build({entryPoints:['server/worker.ts'],bundle:true,platform:'node',format:'esm',outfile:'.local/worker.mjs'});
const {default:worker}=await import('../.local/worker.mjs');
const database=await openGameDatabase(process.env.MOSSVALE_DB_PATH||'.local/game.sqlite');
const {DB}=database;
const adminId=process.env.MOSSVALE_DEV_ADMIN_ID||'local-sprout';
createServer(async(req,res)=>{
 try {
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
  const headers=new Headers(req.headers); const cookie=headers.get('cookie')||'';const id=cookie.match(/mossvale-dev=([a-zA-Z0-9_-]{1,40})/)?.[1]||'local-sprout';
  const origin=headers.get('origin');
  if(origin&&!['http://localhost:5173','http://127.0.0.1:5173','http://localhost:8787','http://127.0.0.1:8787'].includes(origin)){res.writeHead(403);res.end('Invalid request origin');return;}
  headers.delete('oai-authenticated-user-email');headers.delete('cf-connecting-ip');headers.set('cf-connecting-ip','127.0.0.1');
  headers.set('oai-authenticated-user-id',id);
  if(id===adminId)headers.set('oai-authenticated-user-email','local-admin@localhost');if(origin)headers.set('origin','http://127.0.0.1:8787'); // Origin was checked against the loopback allowlist above.
  const request=new Request('http://127.0.0.1:8787'+req.url,{method:req.method,headers,...(body.length?{body}:{} )});
  const response=await worker.fetch(request,{DB,ADMIN_EMAIL:'local-admin@localhost'});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local server error')}
}).listen(8787,'127.0.0.1',()=>console.log('SQLite game API ready on 127.0.0.1:8787. Use ?online=1 in Vite. Local admin: '+adminId));

for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{database.close();process.exit(0)});
