import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {itemCatalog,itemCategory} from '../src/game/items';
import {transact} from '../server/realm';
import worker from '../server/worker';
import {D1RealmStore} from '../server/store';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function store(){let realm:any=null,revision=0;return {async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:any){realm=structuredClone(r)},async commit(v:number,r:any){if(v!==revision)return false;realm=structuredClone(r);revision++;return true}};}
test('all catalog entries and legacy saves have correct categories without changing item identity',()=>{
 expect(new Set(itemCatalog.map(i=>i.id)).size).toBe(itemCatalog.length);for(const i of itemCatalog)expect(itemCategory(i)).toBe(i.category);
 const sim=new Simulation(()=>.5,undefined,null);sim.addItem('Sprout Blade','swords');sim.addItem('Common refine stone','ice-shard',5);sim.addItem('Dew jelly','jelly');const old=structuredClone(sim.save);for(const i of old.items)delete i.category;
 const migrated=new Simulation(()=>.5,old,null);expect(migrated.save.items.map(i=>[i.id,i.count])).toEqual(old.items.map(i=>[i.id,i.count]));expect(migrated.save.items.map(i=>i.category)).toEqual(['consumable','consumable','weapon','refine','material']);
});
test('admin grants are authoritative, audited, replay safe and ordinary players cannot forge admin rights',async()=>{
 const db=store(),user={id:'admin',name:'Admin',admin:true};let s=await transact(db,user,{connect:true},1000);const command={id:s.player.session.id+':1',type:'adminSpawn',args:['starfall-blade',2,'legend',10]};
 await expect(transact(db,{id:'admin',name:'Admin'},{commands:[command],admin:true} as any,1000)).rejects.toMatchObject({status:403});
 s=await transact(db,user,{commands:[command]},1000);s=await transact(db,user,{commands:[command]},1000);
 const gear=s.player.actor.save.items.filter(i=>i.gearId==='starfall-blade');expect(gear).toHaveLength(2);for(const i of gear){expect(i.refine).toBe(10);expect(i.rarity).toBe('legend');expect(Object.keys(i.secondary!)).toHaveLength(4);expect(i.category).toBe('weapon');}expect(gear[0].id).not.toBe(gear[1].id);expect((await db.read())!.realm.ledger.filter((l:any)=>l.action.startsWith('adminSpawn:'))).toHaveLength(1);
 await expect(transact(db,user,{commands:[{...command,id:s.player.session.id+':2',args:['not-an-item',1,'common',0]}]},1000)).rejects.toMatchObject({status:400});
});
test('full bag rejects equipment grant atomically, but allows adding to existing stack',async()=>{
 const db=store(),user={id:'admin',name:'Admin',admin:true};let s=await transact(db,user,{connect:true},1000);let row=(await db.read())!;const save=row.realm.players.admin.actor.save;while(save.items.length<143)save.items.push({name:'filler '+save.items.length,count:1,icon:'leaf'});await db.commit(row.revision,row.realm);
 s=await transact(db,user,{commands:[{id:s.player.session.id+':1',type:'adminSpawn',args:['starfall-blade',2,'legend',10]}]},1000);expect(s.player.actor.save.items).toHaveLength(143);expect(s.player.actor.save.items.some(i=>i.gearId==='starfall-blade')).toBe(false);
 s=await transact(db,user,{commands:[{id:s.player.session.id+':2',type:'adminSpawn',args:['potion:Red potion',99,'common',0]}]},1000);expect(s.player.actor.save.items.find(i=>i.name==='Red potion')!.count).toBe(107);
});
test('SQLite persists admin grants across reopening, applies migrations once and rejects stale revision commits',async()=>{
 // @ts-expect-error Node-only local database adapter deliberately remains outside the Worker bundle.
 const {openGameDatabase}=await import('../tools/sqlite-database.mjs');const dir=await mkdtemp(join(tmpdir(),'mossvale-sqlite-'));let db=await openGameDatabase(join(dir,'test.sqlite'));
 try{const env={DB:db.DB,ADMIN_EMAIL:'admin@test'};
 const registration=await worker.fetch(new Request('https://game.test/api/auth/register',{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json','oai-authenticated-user-id':'sqlite-admin','oai-authenticated-user-email':'admin@test'},body:JSON.stringify({username:'sqliteadmin',password:'a good long password'})}),env);expect(registration.status).toBe(200);const cookie=registration.headers.get('set-cookie')!.split(';')[0];
 const request=(input:any,email='admin@test')=>new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://game.test',Cookie:cookie,'Content-Type':'application/json','oai-authenticated-user-id':'sqlite-admin','oai-authenticated-user-email':email},body:JSON.stringify(input)});
 let response=await worker.fetch(request({connect:true}),env);let snap=await response.json() as any;expect(snap.admin).toBe(true);const command={id:snap.player.session.id+':1',type:'adminSpawn',args:['refine:rare',10,'common',0]};
 expect((await worker.fetch(request({commands:[command]},'other@test'),env)).status).toBe(403);
 response=await worker.fetch(request({commands:[command]}),env);expect(response.status).toBe(200);const revision=(await response.json() as any).revision;db.close();db=await openGameDatabase(join(dir,'test.sqlite'));
 const store=new D1RealmStore(db.DB),row=(await store.read())!;expect(row.revision).toBe(revision);expect(row.realm.players['sqlite-admin'].actor.save.items.find(i=>i.name==='Rare refine stone')!.count).toBe(10);expect(await store.commit(row.revision-1,row.realm)).toBe(false);
 }finally{db.close();await rm(dir,{recursive:true,force:true})}
});
