// Local-only identity simulator. This file is never bundled into the Sites Worker.
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('.local',{recursive:true});
await build({entryPoints:['server/worker.ts'],bundle:true,platform:'node',format:'esm',outfile:'.local/worker.mjs'});
const {default:worker}=await import('../.local/worker.mjs');
const sqlite=new DatabaseSync('.local/game.sqlite');
sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()) {
 if(sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
 sqlite.exec('BEGIN');try{sqlite.exec(await readFile('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error}
}
const DB = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          async first() { return sqlite.prepare(sql).get(...values) ?? null; },
          async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; }
        };
      }
    };
  }
};
createServer(async(req,res)=>{
 try {
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
  const headers=new Headers(req.headers); const cookie=headers.get('cookie')||'';const id=cookie.match(/mossvale-dev=([a-zA-Z0-9_-]{1,40})/)?.[1]||'local-sprout';
  headers.set('oai-authenticated-user-id',id);headers.delete('origin'); // Trusted loopback development only.
  const request=new Request('http://127.0.0.1:8787'+req.url,{method:req.method,headers,...(body.length?{body}:{} )});
  const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local server error')}
}).listen(8787,'127.0.0.1',()=>console.log('Local game API ready on 127.0.0.1:8787. Use ?online=1 in Vite.'));
