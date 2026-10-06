import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../server/worker';
import {D1RealmStore} from '../server/store';
import {transact} from '../server/realm';

function adapter(sqlite:DatabaseSync):any{return {prepare(sql:string){return {bind(...values:any[]){return {async first(){return sqlite.prepare(sql).get(...values)||null},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}}}}}}}}
function req(path:string,body?:unknown,cookie='',site='legacy-owner',email='owner@game.test'){
 return new Request('https://game.test/api/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://game.test','Content-Type':'application/json',Cookie:cookie,'oai-authenticated-user-id':site,'oai-authenticated-user-email':email},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
test('accounts retain purchased legacy items after database reopen; sessions cannot grant another principal admin rights',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'mossvale-auth-'));let sqlite=new DatabaseSync(join(folder,'game.sqlite'));
 try{
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
  let DB=adapter(sqlite),env={DB,ADMIN_EMAIL:'owner@game.test'};
  const previous=await transact(new D1RealmStore(DB),{id:'legacy-owner',name:'Old hero'},{connect:true});
  await transact(new D1RealmStore(DB),{id:'legacy-owner',name:'Old hero'},{commands:[{id:previous.player.session.id+':1',type:'buy',args:['Red potion']}]});
  const registered=await worker.fetch(req('auth/register',{username:'oldhero',password:'test-only password 123'}),env);
  expect(registered.status).toBe(200);const cookie=registered.headers.get('set-cookie')!.split(';')[0];
  expect(await registered.json()).toEqual({account:{username:'oldhero'}});
  sqlite.close();sqlite=new DatabaseSync(join(folder,'game.sqlite'));DB=adapter(sqlite);env={DB,ADMIN_EMAIL:'owner@game.test'};
  const connected=await worker.fetch(req('game',{connect:true},cookie),env);expect(connected.status).toBe(200);const snapshot=await connected.json();
  expect(snapshot.player.actor.save.gold).toBe(105);expect(snapshot.player.actor.save.items.find((i:any)=>i.name==='Red potion').count).toBe(9);expect(snapshot.admin).toBe(true);
  const another=await worker.fetch(req('game',{},cookie,'other-site','owner@game.test'),env);expect((await another.json()).admin).toBe(false);
  expect((await worker.fetch(req('operations',undefined,cookie,'other-site','other@game.test'),env)).status).toBe(403);
  const second=await worker.fetch(req('auth/register',{username:'newhero',password:'test-only password 123'}),env);expect(second.status).toBe(200);
  const secondCookie=second.headers.get('set-cookie')!.split(';')[0];const fresh=await(await worker.fetch(req('game',{connect:true},secondCookie),env)).json();
  expect(fresh.player.id).not.toBe(snapshot.player.id);expect(fresh.player.actor.save.gold).toBe(120);expect(fresh.admin).toBe(false);
  const last=cookie.slice(-1);const forged=cookie.slice(0,-1)+(last==='0'?'1':'0');expect((await worker.fetch(req('game',{},forged),env)).status).toBe(401);
  sqlite.prepare('UPDATE game_sessions SET expires_at=0').run();expect((await worker.fetch(req('game',{},cookie),env)).status).toBe(401);
  expect((await worker.fetch(req('game',{}),env)).status).toBe(401);
 }finally{sqlite.close();rmSync(folder,{recursive:true,force:true})}
});
