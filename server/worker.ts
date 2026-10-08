import {charactersRoute,selectedCharacter} from './characters.js';
import {authRoute,authenticatedAccount} from './auth.js';
import {operations} from './operations.js';
import { D1RealmStore, type Database } from './store.js';
import { GameError, transact } from './realm.js';
import {sessionHash,signTicket,socketUrl} from './realtime-ticket.js';
import tuning from '../src/config/realtime.json' with {type:'json'};
interface Env { ADMIN_EMAIL?: string; ADMIN_ACCOUNT_ID?: string; REALTIME_SERVER_URL?:string; REALTIME_SIGNING_SECRET?:string; DB: Database; ASSETS?: { fetch(request:Request):Promise<Response> } }
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Assets unavailable',{status:503});
    if(!['/api/game','/api/operations','/api/realtime-ticket','/api/characters','/api/characters/create','/api/characters/select'].includes(url.pathname)&&!url.pathname.startsWith('/api/auth/'))return Response.json({error:'Not found'},{status:404});
    const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
    try {
      const siteId=request.headers.get('oai-authenticated-user-id');
      if(!env.DB)throw new GameError('Game database unavailable',503);
      if(!['GET','POST'].includes(request.method))throw new GameError('Method not allowed',405);
      if(request.method==='POST' && request.headers.get('Origin') && request.headers.get('Origin')!==url.origin)throw new GameError('Invalid request origin',403);
      if(Number(request.headers.get('Content-Length')||0)>8192)throw new GameError('Request too large',413);
      const raw=request.method==='POST'?await request.text():'';if(raw.length>8192)throw new GameError('Request too large',413);
      let input={};try{input=raw?JSON.parse(raw):{};}catch{throw new GameError('Invalid JSON')}
      if(!input||typeof input!=='object'||Array.isArray(input))throw new GameError('Invalid request');
      if(url.pathname.startsWith('/api/auth/'))return await authRoute(env.DB,request,url.pathname,input as Record<string,unknown>);
      const trustedAdmin=!!siteId && !!env.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')===env.ADMIN_EMAIL;
      const account=await authenticatedAccount(env.DB,request);
      if(url.pathname.startsWith('/api/characters'))return await charactersRoute(env.DB,request,account,url.pathname,input as Record<string,unknown>);
      const accountAdmin=!!env.ADMIN_ACCOUNT_ID && !!account && account.id===env.ADMIN_ACCOUNT_ID;
      if(url.pathname==='/api/realtime-ticket') {
        if(request.method!=='POST')throw new GameError('Method not allowed',405);
        if(request.headers.get('Origin')!==url.origin)throw new GameError('Invalid request origin',403);
        if(!account)throw new GameError('Game account required',401);
        if(!env.REALTIME_SERVER_URL)return Response.json({available:false},{headers});
        if(!env.REALTIME_SIGNING_SECRET)throw new GameError('Realtime service unavailable',503);
        const character=await selectedCharacter(env.DB,request,account);
        const now=Date.now(),expiresAt=now+tuning.ticketTtlMs;
        const ticket=await signTicket({version:1,realm:'glade-01',accountId:account.id,playerId:character.id,name:character.name,job:character.job,admin:accountAdmin,origin:url.origin,sessionHash:await sessionHash(request),issuedAt:now,expiresAt,jti:crypto.randomUUID()},env.REALTIME_SIGNING_SECRET);
        return Response.json({available:true,url:socketUrl(env.REALTIME_SERVER_URL),ticket,expiresAt},{headers});
      }
      if(url.pathname==='/api/game'&&!account)throw new GameError('Log in to your game account to play online',401);
      if(url.pathname==='/api/operations'&&!trustedAdmin&&!accountAdmin)throw new GameError('Operator access required',403);
      if(env.REALTIME_SERVER_URL)throw new GameError('The persistent realm is active. Connect through realtime; HTTP realm operations are unavailable.',503);
      const leaseTable=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='realtime_leases'").bind().first();
      if(leaseTable&&await env.DB.prepare('SELECT id FROM realtime_leases WHERE id=? AND expires_at>?').bind('glade-01',Date.now()).first())throw new GameError('The persistent realm is active. HTTP realm operations are unavailable.',503);
      if(url.pathname==='/api/operations') {
        if(!trustedAdmin && !accountAdmin)throw new GameError('Operator access required',403);
        return Response.json(await operations(env.DB,input as Record<string,unknown>,request.method==='POST'),{headers});
      }
      if(!account)throw new GameError('Log in to your game account to play online',401);
      const character=await selectedCharacter(env.DB,request,account);
      const id=character.id;
      const admin=accountAdmin || (!!siteId && trustedAdmin && account.legacy_site_id===siteId);
      const snapshot=await transact(new D1RealmStore(env.DB),{id,name:character.name,job:character.job,admin},input);
      snapshot.admin=admin;
      return Response.json(snapshot,{headers});
    }catch(error) {
      if(error instanceof GameError)return Response.json({error:error.message},{status:error.status,headers});
      console.error('game request failed',error instanceof Error?error.message:'unknown error');
      return Response.json({error:'Game temporarily unavailable. Retrying is safe.'},{status:503,headers});
    }
  }
};
