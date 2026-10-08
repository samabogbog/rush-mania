import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../server/worker';
import {D1RealmStore} from '../server/store';
import {transact} from '../server/realm';
import {verifyTicket} from '../server/realtime-ticket';
const password='characters test password',secret='characters-test-secret-longer-than-32-characters';
function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const name of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+name,'utf8'));const DB:any={prepare(sql:string){return {bind(...values:any[]){return {async first(){return sqlite.prepare(sql).get(...values)||null},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}}}}}}};const request=(path:string,data?:unknown,cookie='',site='legacy-owner')=>new Request('https://game.test/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:'https://game.test',Cookie:cookie,'Content-Type':'application/json','oai-authenticated-user-id':site},...(data===undefined?{}:{body:JSON.stringify(data)})});const call=(path:string,data?:unknown,cookie='',extra:any={})=>worker.fetch(request(path,data,cookie),{DB,...extra});const register=async(username:string)=>{const response=await call('auth/register',{username,password});expect(response.status).toBe(200);return response.headers.get('set-cookie')!.split(';')[0]};return {sqlite,DB,call,register};}
test('lazy original slot preserves player ID and exact saved inventory while fresh chosen job is isolated',async()=>{const f=fixture();try{
 const store=new D1RealmStore(f.DB),initial=await transact(store,{id:'legacy-owner',name:'Original mage',job:'mage'},{connect:true});await transact(store,{id:'legacy-owner',name:'Original mage'},{commands:[{id:initial.player.session.id+':1',type:'buy',args:['Red potion']}]});const before=await store.read(),save=structuredClone(before!.realm.players['legacy-owner'].actor.save);
 const cookie=await f.register('oldaccount');const roster=await(await f.call('characters',undefined,cookie)).json();expect(roster.characters).toEqual([{id:'legacy-owner',name:'Original mage',job:'mage',slot:1,level:save.level}]);expect((await store.read())!.realm).toEqual(before!.realm);expect(f.sqlite.prepare('SELECT player_id FROM game_accounts').get()!.player_id).toBe('legacy-owner');
 expect((await f.call('game',{connect:true},cookie)).status).toBe(409);
 const newHero=await(await f.call('characters',{name:'New Archer',job:'archer'},cookie)).json();expect(newHero.character.slot).toBe(2);expect((await store.read())!.realm).toEqual(before!.realm);await f.call('characters/select',{id:newHero.character.id},cookie);const connected=await(await f.call('game',{connect:true},cookie)).json();expect(connected.player.id).toBe(newHero.character.id);expect(connected.player.actor.save.job).toBe('archer');expect(connected.player.actor.save.gold).toBe(120);expect(connected.player.actor.save.level).toBe(1);expect((await store.read())!.realm.players['legacy-owner'].actor.save).toEqual(save);
 const freshPotion=connected.player.actor.save.items.find((i:any)=>i.name==='Red potion');expect(freshPotion.count).toBe(8);expect(save.items.find(i=>i.name==='Red potion')!.count).toBe(9);
 }finally{f.sqlite.close()}});
test('three-slot cap handles sequential and concurrent creation, validates ownership and requires origin',async()=>{const f=fixture();try{
 const a=await f.register('firstaccount'),b=await f.register('otheraccount');expect((await(await f.call('characters',undefined,a)).json()).characters).toEqual([]);
 const first=await(await f.call('characters',{name:'First hero',job:'swordsman'},a)).json();const responses=await Promise.all(Array.from({length:6},(_,n)=>f.call('characters',{name:'Hero '+n,job:'mage'},a)));expect(responses.filter(r=>r.status===201)).toHaveLength(2);expect(responses.filter(r=>r.status===409)).toHaveLength(4);expect((await f.call('characters',{name:'Fourth hero',job:'archer'},a)).status).toBe(409);const roster=await(await f.call('characters',undefined,a)).json();expect(roster.characters.map((c:any)=>c.slot)).toEqual([1,2,3]);expect(new Set(roster.characters.map((c:any)=>c.id)).size).toBe(3);
 expect((await f.call('characters/select',{id:first.character.id},b)).status).toBe(403);expect((await(await f.call('characters',undefined,b)).json()).selectedId).toBeNull();expect((await f.call('characters',{name:'Wrong job',job:'admin'},b)).status).toBe(400);expect((await f.call('characters',undefined,'')).status).toBe(401);
 const noOrigin=new Request('https://game.test/api/characters',{method:'POST',headers:{Cookie:b,'Content-Type':'application/json'},body:JSON.stringify({name:'No origin',job:'mage'})});expect((await worker.fetch(noOrigin,{DB:f.DB})).status).toBe(403);
 }finally{f.sqlite.close()}});
test('selection is per login session and tickets use only selected owned character identity',async()=>{const f=fixture();try{
 const cookieA=await f.register('sessionaccount');const chars=[];for(const job of ['mage','archer'])chars.push((await(await f.call('characters',{name:'Hero '+job,job},cookieA)).json()).character);await f.call('characters/select',{id:chars[0].id},cookieA);const login=await f.call('auth/login',{username:'sessionaccount',password});const cookieB=login.headers.get('set-cookie')!.split(';')[0];expect((await(await f.call('characters',undefined,cookieB)).json()).selectedId).toBeNull();await f.call('characters/select',{id:chars[1].id},cookieB);
 expect((await(await f.call('characters',undefined,cookieA)).json()).selectedId).toBe(chars[0].id);expect((await(await f.call('characters',undefined,cookieB)).json()).selectedId).toBe(chars[1].id);
 const ticket=await(await f.call('realtime-ticket',{playerId:chars[0].id,name:'Forged',job:'mage'},cookieB,{REALTIME_SERVER_URL:'wss://realtime.test/socket',REALTIME_SIGNING_SECRET:secret})).json();const claims=await verifyTicket(ticket.ticket,secret);expect(claims.playerId).toBe(chars[1].id);expect(claims.name).toBe(chars[1].name);expect(claims.job).toBe('archer');expect(f.sqlite.prepare('SELECT selected_character_id FROM game_sessions WHERE token_hash=?').get(claims.sessionHash)!.selected_character_id).toBe(chars[1].id);
 await f.call('characters/select',{id:chars[0].id},cookieB);expect(f.sqlite.prepare('SELECT account_id FROM game_sessions WHERE token_hash=? AND account_id=? AND expires_at>? AND selected_character_id=?').get(claims.sessionHash,claims.accountId,Date.now(),claims.playerId)).toBeUndefined();
 }finally{f.sqlite.close()}});

test('configured account administrator keeps item grants across all three characters; other accounts remain ordinary',async()=>{
 const f=fixture();try{
  const cookie=await f.register('configuredadmin');const account=f.sqlite.prepare('SELECT id FROM game_accounts WHERE username=?').get('configuredadmin')!;
  const env={ADMIN_ACCOUNT_ID:String(account.id),REALTIME_SERVER_URL:'wss://realtime.test/socket',REALTIME_SIGNING_SECRET:secret};
  for(const job of ['swordsman','mage','archer']){
   const created=await(await f.call('characters',{name:'Admin '+job,job},cookie,env)).json();await f.call('characters/select',{id:created.character.id},cookie,env);
   const signed=await(await f.call('realtime-ticket',{},cookie,env)).json();expect((await verifyTicket(signed.ticket,secret)).admin).toBe(true);
   const connected=await(await f.call('game',{connect:true},cookie,{ADMIN_ACCOUNT_ID:String(account.id)})).json();expect(connected.admin).toBe(true);
   const grant=await f.call('game',{commands:[{id:connected.player.session.id+':1',type:'adminSpawn',args:['potion:Red potion',5,'common',0]}]},cookie,{ADMIN_ACCOUNT_ID:String(account.id)});expect(grant.status).toBe(200);expect((await grant.json()).player.actor.save.items.find((i:any)=>i.name==='Red potion').count).toBe(13);
  }
  const other=await f.register('ordinaryaccount');const hero=await(await f.call('characters',{name:'Ordinary hero',job:'mage'},other,env)).json();await f.call('characters/select',{id:hero.character.id},other,env);const signed=await(await f.call('realtime-ticket',{admin:true},other,env)).json();expect((await verifyTicket(signed.ticket,secret)).admin).toBe(false);
 }finally{f.sqlite.close()}
});
