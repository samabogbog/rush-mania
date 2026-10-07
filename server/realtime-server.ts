import {createServer,type IncomingMessage} from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {createClient,type Client} from '@libsql/client';
import tuning from '../src/config/realtime.json' with {type:'json'};
import {initializeDatabase,libsqlDatabase} from './libsql-database.js';
import {RealtimeRealm} from './realtime-realm.js';
import {verifyTicket,type TicketClaims} from './realtime-ticket.js';
import {handleVercelRequest} from './vercel-adapter.js';
import {GameError} from './realm.js';
import type {RealtimeClientMessage} from './realtime-protocol.js';

export interface RealtimeServerOptions {client:Client;secret:string;origins:string[];port?:number;host?:string;localAuth?:boolean;publicUrl?:string;adminAccountId?:string}
export async function createRealtimeServer(options:RealtimeServerOptions){
  if(options.secret.length<32||!options.origins.length)throw new Error('Configure signing secret and frontend origin allowlist');
  const allowed=new Set(options.origins.map(value=>{const url=new URL(value);if(value!==url.origin)throw new Error('Use exact origins in allowlist');return value;}));
  await initializeDatabase(options.client);const realm=new RealtimeRealm(options.client);await realm.start();
  const sockets=new Map<string,WebSocket>(),claimsBySocket=new Map<WebSocket,TicketClaims>(),lastMessage=new Map<WebSocket,number>(),usedTickets=new Map<string,number>();
  let shuttingDown=false;let serial=Promise.resolve();
  const serialize=(fn:()=>Promise<void>|void)=>{serial=serial.then(fn).catch(()=>{});return serial;};
  const send=(socket:WebSocket,message:unknown)=>{if(socket.readyState!==WebSocket.OPEN)return;if(socket.bufferedAmount>1000000){socket.close(1013,'Connection is too slow');return;}socket.send(JSON.stringify(message));};
  const fail=(socket:WebSocket,error:unknown)=>{const known=error instanceof GameError;send(socket,{type:'error',error:known?error.message:'Realm temporarily unavailable',retryable:!known||error.status>=500});socket.close(known&&error.status<500?1008:1013,'Reconnect to the realm');};
  realm.onFailure=()=>{console.error('Realtime realm stopped: persistence or ownership unavailable');for(const socket of sockets.values())fail(socket,new GameError('Realm persistence unavailable; reconnect safely',503));};
  const server=createServer(async(req,res)=>{
    if(req.url==='/health'){res.writeHead(realm.ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ready:realm.ready,tickHz:tuning.tickHz,snapshotHz:tuning.snapshotHz,savedAt:realm.savedAt}));return;}
    if(options.localAuth&&req.url?.startsWith('/api/')){
      try{const origin=req.headers.origin;if(origin&&!allowed.has(origin)){res.writeHead(403);res.end();return;}
        const chunks:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>tuning.maxPayloadBytes)throw new GameError('Request too large',413);chunks.push(chunk);}
        const base=origin||'http://'+req.headers.host;const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
        const body=Buffer.concat(chunks);const request=new Request(base+req.url,{method:req.method,headers,...(body.length?{body}:{} )});
        const response=await handleVercelRequest(request,libsqlDatabase(options.client),options.adminAccountId,false,{url:options.publicUrl,secret:options.secret});const outgoing:Record<string,string>={};response.headers.forEach((value,name)=>{outgoing[name]=value;});res.writeHead(response.status,outgoing);res.end(Buffer.from(await response.arrayBuffer()));
      }catch(error){res.writeHead(error instanceof GameError?error.status:503);res.end('Request unavailable');}return;
    }
    res.writeHead(404);res.end('Not found');
  });
  const ws=new WebSocketServer({noServer:true,maxPayload:tuning.maxPayloadBytes});
  server.on('upgrade',(req,socket,head)=>{
    if(shuttingDown||!realm.ready||req.url!=='/socket'||!req.headers.origin||!allowed.has(req.headers.origin)||ws.clients.size>=tuning.maxConnections){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    ws.handleUpgrade(req,socket,head,client=>ws.emit('connection',client,req));
  });
  ws.on('connection',(socket:WebSocket,req:IncomingMessage)=>{
    const helloTimeout=setTimeout(()=>socket.close(1008,'Authenticate first'),5000);let count=0,window=Date.now(),authenticating=false;
    socket.on('message',raw=>{
      const now=Date.now();if(now-window>=1000){window=now;count=0;}if(++count>tuning.maxMessagesPerSecond){socket.close(1008,'Too many messages');return;}
      let message:RealtimeClientMessage;
      try{message=JSON.parse(raw.toString());if(!message||typeof message!=='object')throw new Error();}catch{fail(socket,new GameError('Invalid realtime message'));return;}
      if(message.type==='hello'){
        if(authenticating||claimsBySocket.has(socket)){fail(socket,new GameError('Already authenticating'));return;}
        authenticating=true;
        // Signature/session I/O stays outside the world mutation queue.
        void (async()=>{
          const claims=await verifyTicket(message.ticket,options.secret);if(claims.origin!==req.headers.origin||!allowed.has(claims.origin))throw new GameError('Invalid realtime origin',403);
          if(usedTickets.has(claims.jti))throw new GameError('Realtime ticket already used',401);
          usedTickets.set(claims.jti,claims.expiresAt);
          const account=await options.client.execute({sql:'SELECT a.id,a.player_id,a.username FROM game_accounts a JOIN game_sessions s ON s.account_id=a.id WHERE a.id=? AND s.token_hash=? AND s.expires_at>?',args:[claims.accountId,claims.sessionHash,Date.now()]});
          if(account.rows[0]?.player_id!==claims.playerId||account.rows[0]?.username!==claims.name)throw new GameError('Game session expired',401);
          if(message.resumeSession!==undefined&&typeof message.resumeSession!=='string')throw new GameError('Invalid resume session');
          await serialize(async()=>{try{
            if(socket.readyState!==WebSocket.OPEN)return;
            clearTimeout(helloTimeout);
            const old=sockets.get(claims.playerId);sockets.set(claims.playerId,socket);if(old&&old!==socket)old.close(1008,'Connected elsewhere');
            claimsBySocket.set(socket,claims);lastMessage.set(socket,Date.now());
            const snapshot=await realm.connect(claims,message.resumeSession);send(socket,snapshot);
          }catch(error){fail(socket,error);}});
        })().catch(error=>fail(socket,error));
      }else if(message.type==='input')void serialize(async()=>{try{
        const claims=claimsBySocket.get(socket);if(!claims||sockets.get(claims.playerId)!==socket)throw new GameError('Authenticate first',401);
        await realm.input(claims.playerId,message.sequence,message.movement,message.commands);lastMessage.set(socket,Date.now());
      }catch(error){fail(socket,error);}});
      else fail(socket,new GameError('Unknown realtime message'));
    });
    socket.on('close',()=>{clearTimeout(helloTimeout);const claims=claimsBySocket.get(socket);if(claims&&sockets.get(claims.playerId)===socket){sockets.delete(claims.playerId);void serialize(()=>realm.disconnect(claims.playerId));}claimsBySocket.delete(socket);lastMessage.delete(socket);});
    socket.on('error',()=>{});
  });
  const tick=setInterval(()=>{void serialize(()=>realm.tick());},1000/tuning.tickHz);
  const snapshots=setInterval(()=>{if(!realm.ready)return;for(const [id,socket] of sockets){if(Date.now()-(lastMessage.get(socket)||0)>10000){socket.close(1008,'Heartbeat expired');continue;}try{send(socket,realm.snapshot(id));}catch(error){fail(socket,error);}}},1000/tuning.snapshotHz);
  const autosave=setInterval(()=>{if(realm.ready)void realm.checkpoint().catch(()=>{});},tuning.autosaveMs);
  const heartbeat=setInterval(()=>{if(!realm.ready)return;void realm.renew().catch(()=>{});for(const [ticket,expiry] of usedTickets)if(expiry<Date.now())usedTickets.delete(ticket);
    for(const [socket,claims] of claimsBySocket)void options.client.execute({sql:'SELECT account_id FROM game_sessions WHERE token_hash=? AND account_id=? AND expires_at>?',args:[claims.sessionHash,claims.accountId,Date.now()]}).then(result=>{if(!result.rows.length)socket.close(1008,'Game session expired');}).catch(()=>fail(socket,new GameError('Session verification unavailable',503)));
  },tuning.leaseRenewMs);
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(options.port??8788,options.host??'0.0.0.0',()=>{server.removeListener('error',reject);resolve();});});
  const close=async()=>{shuttingDown=true;clearInterval(tick);clearInterval(snapshots);clearInterval(autosave);clearInterval(heartbeat);for(const socket of ws.clients){socket.close(1001,'Realm restarting');socket.terminate();}await serial;await realm.close();await new Promise<void>(resolve=>ws.close(()=>resolve()));await new Promise<void>(resolve=>server.close(()=>resolve()));};
  return {server,realm,close,address:server.address()};
}
export async function runRealtimeServer(){
  const url=process.env.TURSO_DATABASE_URL,secret=process.env.REALTIME_SIGNING_SECRET,origins=process.env.REALTIME_ALLOWED_ORIGINS?.split(',').map(value=>value.trim()).filter(Boolean);
  if(!url||!secret||!origins?.length)throw new Error('Set TURSO_DATABASE_URL, REALTIME_SIGNING_SECRET and REALTIME_ALLOWED_ORIGINS');
  if(!url.startsWith('file:')&&!process.env.TURSO_AUTH_TOKEN)throw new Error('Set TURSO_AUTH_TOKEN');
  if(process.env.NODE_ENV==='production'&&(url.startsWith('file:')||process.env.REALTIME_LOCAL_AUTH==='1'))throw new Error('Production uses remote Turso and Vercel session authentication');
  const client=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN});
  const service=await createRealtimeServer({client,secret,origins,port:Number(process.env.PORT||8788),localAuth:process.env.REALTIME_LOCAL_AUTH==='1',publicUrl:process.env.REALTIME_SERVER_URL,adminAccountId:process.env.ADMIN_ACCOUNT_ID});
  console.log('Persistent Mossvale realm listening');
  let closing=false;for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>{if(closing)return;closing=true;void service.close().then(()=>{client.close();process.exit(0);}).catch(()=>{client.close();process.exit(1);});});
  return service;
}
