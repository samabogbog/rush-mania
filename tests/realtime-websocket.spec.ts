import {test,expect} from '@playwright/test';
import {createClient} from '@libsql/client';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {createRealtimeServer} from '../server/realtime-server';
import {signTicket} from '../server/realtime-ticket';
import {createHash} from 'node:crypto';
test('real WebSocket authenticates, moves at20Hz, rejects ticket reuse and resumes exactly once',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ws-integration-')),client=createClient({url:'file:'+join(directory,'game.sqlite')}),secret='integration-only-signing-secret-more-than32chars',origin='http://127.0.0.1:5173';
 const service=await createRealtimeServer({client,secret,origins:[origin],port:0,host:'127.0.0.1',localAuth:true});const port=(service.address as any).port,url='http://127.0.0.1:'+port;let socket:WebSocket|undefined;
 try{
  const register=await fetch(url+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'ws_player',password:'integration test password'})});expect(register.status).toBe(200);const cookie=register.headers.get('set-cookie')!.split(';')[0],token=cookie.split('=')[1];const account=(await client.execute('SELECT id,player_id,username FROM game_accounts')).rows[0];
  const post=async(path:string,body:unknown)=>fetch(url+'/api/'+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const created=await(await post('characters',{name:'WS Mage',job:'mage'})).json();expect((await post('characters/select',{id:created.character.id})).status).toBe(200);
  const ticket=()=>signTicket({version:1,realm:'glade-01',accountId:String(account.id),playerId:created.character.id,name:created.character.name,job:'mage',admin:false,origin,sessionHash:createHash('sha256').update(token).digest('hex'),issuedAt:Date.now(),expiresAt:Date.now()+60000,jti:crypto.randomUUID()},secret);
  const packets:any[]=[];
  const open=async(ticketText:string,resumeSession?:string)=>{const ws=new WebSocket('ws://127.0.0.1:'+port+'/socket',{origin});await new Promise<void>((resolve,reject)=>{ws.once('open',()=>resolve());ws.once('error',reject)});ws.on('message',raw=>packets.push(JSON.parse(raw.toString())));ws.send(JSON.stringify({type:'hello',ticket:ticketText,resumeSession}));return ws;};
  const forged=await signTicket({version:1,realm:'glade-01',accountId:String(account.id),playerId:'character:unowned',name:'Unowned',job:'archer',admin:false,origin,sessionHash:createHash('sha256').update(token).digest('hex'),issuedAt:Date.now(),expiresAt:Date.now()+60000,jti:crypto.randomUUID()},secret);
  const wrongOwner=await open(forged);await expect.poll(()=>packets.some(p=>p.type==='error')).toBe(true);expect(packets.some(p=>p.type==='snapshot')).toBe(false);wrongOwner.terminate();packets.length=0;
  const firstTicket=await ticket();socket=await open(firstTicket);await expect.poll(()=>packets.filter(p=>p.type==='snapshot').length).toBeGreaterThan(0);const first=packets.find(p=>p.type==='snapshot'),session=first.snapshot.player.session.id,x=first.snapshot.player.actor.x;expect(first.snapshot.player.id).toBe(created.character.id);expect(first.snapshot.player.actor.save.job).toBe('mage');
  socket.send(JSON.stringify({type:'input',sequence:1,movement:[1,0],commands:[{id:session+':1',type:'setAuto',args:[false]}]}));await expect.poll(()=>packets.at(-1)?.snapshot?.player.actor.x,{timeout:3000}).toBeGreaterThan(x+1);expect(packets.at(-1).tickHz).toBe(20);
  await service.realm.checkpoint();socket.close();await new Promise(resolve=>socket!.once('close',resolve));packets.length=0;socket=await open(await ticket(),session);await expect.poll(()=>packets.filter(p=>p.type==='snapshot').length).toBeGreaterThan(0);expect(packets.find(p=>p.type==='snapshot').durableCommandSequence).toBe(1);
  socket.send(JSON.stringify({type:'input',sequence:1,movement:[0,0],commands:[{id:session+':1',type:'setAuto',args:[false]}]}));await new Promise(resolve=>setTimeout(resolve,250));expect(packets.at(-1).snapshot.player.session.sequence).toBe(1);
  const denied=await fetch(url+'/api/game',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:'{}'});expect(denied.status).toBe(503);
  const replay=new WebSocket('ws://127.0.0.1:'+port+'/socket',{origin});await new Promise(resolve=>replay.once('open',resolve));const rejection=new Promise<any>(resolve=>replay.once('message',raw=>resolve(JSON.parse(raw.toString()))));replay.send(JSON.stringify({type:'hello',ticket:firstTicket}));expect((await rejection).type).toBe('error');replay.close();
  const staleTicket=await ticket(),other=await(await post('characters',{name:'Other Archer',job:'archer'})).json();await post('characters/select',{id:other.character.id});const stale=await open(staleTicket);await expect.poll(()=>packets.some(p=>p.type==='error'&&p.error==='Game session expired')).toBe(true);stale.terminate();await expect.poll(()=>socket!.readyState,{timeout:20000}).toBe(WebSocket.CLOSED);
 }finally{socket?.terminate();await service.close();client.close();await rm(directory,{recursive:true,force:true});}
});
