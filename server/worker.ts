import { D1RealmStore, type Database } from './store';
import { GameError, transact } from './realm';
interface Env { ADMIN_EMAIL?: string; DB: Database; ASSETS?: { fetch(request:Request):Promise<Response> } }
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Assets unavailable',{status:503});
    if(!['/api/game','/api/operations'].includes(url.pathname))return Response.json({error:'Not found'},{status:404});
    const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
    try {
      const id=request.headers.get('oai-authenticated-user-id');
      if(!id)throw new GameError('Sign in to Sites to play online',401);
      if(!env.DB)throw new GameError('Game database unavailable',503);
      if(!['GET','POST'].includes(request.method))throw new GameError('Method not allowed',405);
      if(request.method==='POST' && request.headers.get('Origin') && request.headers.get('Origin')!==url.origin)throw new GameError('Invalid request origin',403);
      if(Number(request.headers.get('Content-Length')||0)>8192)throw new GameError('Request too large',413);
      const raw=request.method==='POST'?await request.text():'';if(raw.length>8192)throw new GameError('Request too large',413);
      let input={};try{input=raw?JSON.parse(raw):{};}catch{throw new GameError('Invalid JSON')}
      if(!input||typeof input!=='object'||Array.isArray(input))throw new GameError('Invalid request');
      const admin=!!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')===env.ADMIN_EMAIL;
      if(url.pathname==='/api/operations') {
        if(!admin)throw new GameError('Operator access required',403);
        const row=await new D1RealmStore(env.DB).read();if(!row)throw new GameError('Realm not initialized',404);
        if(request.method==='POST') {
          const backupId=crypto.randomUUID();
          await env.DB.prepare('INSERT INTO backups (id, revision, state, created_at) VALUES (?, ?, ?, ?)').bind(backupId,row.revision,JSON.stringify(row.realm),Date.now()).run();
          return Response.json({backupId,revision:row.revision},{headers});
        }
        const players=Object.values(row.realm.players);
        return Response.json({revision:row.revision,players:players.map(p=>({id:p.id,name:p.name,level:p.actor.save.level,job:p.actor.save.job,gold:p.actor.save.gold,kills:p.actor.save.kills,lastSeen:p.lastSeen})),ledger:row.realm.ledger.slice(-100),backup:row.realm}, {headers});
      }
      const snapshot=await transact(new D1RealmStore(env.DB),{id,name:'Adventurer '+id.slice(-4)},input);
      snapshot.admin=admin;
      return Response.json(snapshot,{headers});
    }catch(error) {
      if(error instanceof GameError)return Response.json({error:error.message},{status:error.status,headers});
      console.error('game request failed',error instanceof Error?error.message:'unknown error');
      return Response.json({error:'Game temporarily unavailable. Retrying is safe.'},{status:503,headers});
    }
  }
};
