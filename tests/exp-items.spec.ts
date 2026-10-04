import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {EXP_TOME,EXP_TEST_GRANT_COUNT,itemCategory,itemCatalog} from '../src/game/items';
import {isAuxiliaryItem,MAX_LEVEL} from '../src/game/classes';
import {BAG_CAPACITY} from '../src/game/equipment';
import {transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
function store(){let realm:Realm|null=null,revision=0;return {failNext:false,async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:Realm){realm=structuredClone(r)},async commit(v:number,r:Realm){if(this.failNext){this.failNext=false;return false}if(v!==revision)return false;realm=structuredClone(r);revision++;return true}} satisfies RealmStore&{failNext:boolean};}
const admin={id:'admin',name:'Admin',admin:true};
test('EXP Tome consumes one fixed-value item, uses normal progression and stays at level cap',()=>{
 const sim=new Simulation(()=>.5,undefined,null);expect(itemCategory(EXP_TOME)).toBe('consumable');expect(itemCatalog.find(i=>i.id===EXP_TOME.id)).toBeTruthy();expect(isAuxiliaryItem(EXP_TOME.name)).toBe(false);
 sim.addItem(EXP_TOME.name,EXP_TOME.icon,2);const expected=new Simulation(()=>.5,structuredClone(sim.save),null);expected.addExperience(1000);
 expect(sim.useItem(EXP_TOME.name)).toBe(true);expect([sim.save.level,sim.save.xp,sim.save.points]).toEqual([expected.save.level,expected.save.xp,expected.save.points]);expect(sim.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(1);
 sim.save.level=MAX_LEVEL;expect(sim.useItem(EXP_TOME.name)).toBe(false);expect(sim.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(1);expect(sim.useItem('forged')).toBe(false);
});
test('verified admin connect grants 9999 atomically once, survives serialization and ledger rotation',async()=>{
 const db=store();let snap=await transact(db,admin,{connect:true},1000);expect(snap.player.actor.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(EXP_TEST_GRANT_COUNT);
 let row=(await db.read())!;row.realm.ledger=[];await db.commit(row.revision,JSON.parse(JSON.stringify(row.realm)));
 db.failNext=true;snap=await transact(db,admin,{connect:true},1000);expect(snap.player.actor.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(9999);expect(snap.player.expTestGrant?.count).toBe(9999);
 const ordinary=await transact(db,{id:'user',name:'User'},{connect:true},1000);expect(ordinary.player.expTestGrant).toBeUndefined();expect(ordinary.player.actor.save.items.some(i=>i.name===EXP_TOME.name)).toBe(false);
});
test('grant remains pending on full bag and retry creates one audited stack',async()=>{
 const db=store();await transact(db,{id:'admin',name:'Admin'},{connect:true},1000);let row=(await db.read())!;const items=row.realm.players.admin.actor.save.items;while(items.length<BAG_CAPACITY)items.push({name:'filler '+items.length,icon:'leaf',count:1});await db.commit(row.revision,row.realm);
 let snap=await transact(db,admin,{connect:true},1000);expect(snap.player.expTestGrant).toBeUndefined();expect(snap.player.actor.save.items.some(i=>i.name===EXP_TOME.name)).toBe(false);
 row=(await db.read())!;row.realm.players.admin.actor.save.items.pop();await db.commit(row.revision,row.realm);db.failNext=true;snap=await transact(db,admin,{connect:true},1000);
 expect(snap.player.actor.save.items.filter(i=>i.name===EXP_TOME.name)).toHaveLength(1);expect(snap.player.actor.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(9999);expect((await db.read())!.realm.ledger.filter(i=>i.action.startsWith('adminTestGrant:'))).toHaveLength(1);
});
test('server rejects injected EXP and grant requests; valid use is exactly once and audited',async()=>{
 const db=store();let snap=await transact(db,admin,{connect:true},1000);const session=snap.player.session.id;
 for(const [type,args] of [['useItem',[EXP_TOME.name,999999]],['useItem',['forged']],['addExperience',[999999]],['adminTestGrant',[9999]]] as [string,unknown[]][]){await expect(transact(db,admin,{commands:[{id:session+':1',type,args}]},1000)).rejects.toMatchObject({status:400})}
 const command={id:session+':1',type:'useItem',args:[EXP_TOME.name]};snap=await transact(db,admin,{commands:[command]},1000);const first=structuredClone(snap.player.actor.save);snap=await transact(db,admin,{commands:[command]},1000);expect(snap.player.actor.save).toEqual(first);expect(first.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(9998);expect((await db.read())!.realm.ledger.filter(i=>i.action.startsWith('useItem:'))).toHaveLength(1);
 const user=await transact(db,{id:'ordinary',name:'User'},{connect:true},1000);await expect(transact(db,{id:'ordinary',name:'User'},{commands:[{id:user.player.session.id+':1',type:'adminSpawn',args:[EXP_TOME.id,9999,'common',0]}]},1000)).rejects.toMatchObject({status:403});
});
test('D1 JSON marker survives SQLite reopening and admin-email authorization gates connect grant',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {D1RealmStore}=await import('../server/store');const {default:worker}=await import('../server/worker');
 // @ts-expect-error local Node database adapter is outside the Worker bundle.
 const {openGameDatabase}=await import('../tools/sqlite-database.mjs');const dir=await mkdtemp(join(tmpdir(),'exp-tome-'));let db=await openGameDatabase(join(dir,'realm.sqlite'));
 try{
  const request=(email:string)=>new Request('https://game.test/api/game',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'persisted-admin','oai-authenticated-user-email':email},body:JSON.stringify({connect:true})});
  let response=await worker.fetch(request('other@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});expect(response.status).toBe(200);let snap=await response.json() as any;expect(snap.player.expTestGrant).toBeUndefined();
  response=await worker.fetch(request('admin@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});snap=await response.json() as any;expect(snap.player.actor.save.items.find((i:any)=>i.name===EXP_TOME.name).count).toBe(9999);
  db.close();db=await openGameDatabase(join(dir,'realm.sqlite'));const store=new D1RealmStore(db.DB);expect((await store.read())!.realm.players['persisted-admin'].expTestGrant?.count).toBe(9999);
  response=await worker.fetch(request('admin@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});snap=await response.json() as any;expect(snap.player.actor.save.items.find((i:any)=>i.name===EXP_TOME.name).count).toBe(9999);expect((await store.read())!.realm.ledger.filter(i=>i.action.startsWith('adminTestGrant:'))).toHaveLength(1);
 }finally{db.close();await rm(dir,{recursive:true,force:true})}
});
