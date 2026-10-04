import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {EXP_CHARM,EXP_TOME,EXP_TEST_GRANT_COUNT,itemCategory,itemCatalog} from '../src/game/items';
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
test('passive equips in any auxiliary slot, multiplies once, keeps fixed legacy books and level cap',()=>{
 for(let slot=0;slot<4;slot++){
  const sim=new Simulation(()=>.5,undefined,null);expect(sim.assignAuxiliary(slot,EXP_CHARM.name)).toBe(false);sim.addItem(EXP_CHARM.name,EXP_CHARM.icon,2);expect(sim.assignAuxiliary(slot,EXP_CHARM.name)).toBe(true);expect(sim.experienceMultiplier).toBe(9999);expect(sim.assignSkill(0,EXP_CHARM.name)).toBe(false);
  sim.addExperience(.001);expect(sim.save.xp).toBe(10);sim.save.auxiliary.fill(EXP_CHARM.name);expect(sim.experienceMultiplier).toBe(9999);expect(sim.useAuxiliary(slot)).toBe(false);expect(sim.useItem(EXP_CHARM.name)).toBe(false);expect(sim.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(2);
  const restored=new Simulation(()=>.5,structuredClone(sim.save),null);expect(restored.experienceMultiplier).toBe(9999);restored.save.auxiliary.fill(null);restored.addExperience(1);expect(restored.save.xp).toBe(11);restored.save.level=MAX_LEVEL;restored.addExperience(9999);expect(restored.save.xp).toBe(0);
 }
});
test('verified connect grants one charm atomically and v1 marker preserves legacy inventory',async()=>{
 const db=store();let snap=await transact(db,admin,{connect:true},1000);expect(snap.player.actor.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(1);expect(snap.player.expTestGrant?.version).toBe(2);
 let row=(await db.read())!;row.realm.ledger=[];await db.commit(row.revision,row.realm);db.failNext=true;snap=await transact(db,admin,{connect:true},1000);expect(snap.player.actor.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(1);
 row=(await db.read())!;row.realm.players.admin.expTestGrant={version:1,count:9999,at:1};row.realm.players.admin.actor.save.items=row.realm.players.admin.actor.save.items.filter(i=>i.name!==EXP_CHARM.name);row.realm.players.admin.actor.save.items.push({name:EXP_TOME.name,icon:EXP_TOME.icon,count:123});await db.commit(row.revision,row.realm);
 snap=await transact(db,admin,{connect:true},1000);expect(snap.player.expTestGrant?.version).toBe(2);expect(snap.player.actor.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(123);expect(snap.player.actor.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(1);
});
test('server rejects forged bonus/item and unowned passive; valid assignment persists without consumption',async()=>{
 const db=store();let snap=await transact(db,admin,{connect:true},1000);const send=async(type:string,args:unknown[])=>transact(db,admin,{commands:[{id:snap.player.session.id+':'+(snap.player.session.sequence+1),type,args}]},1000);
 for(const [type,args] of [['useItem',[EXP_CHARM.name]],['useItem',['forged']],['addExperience',[999999]],['experienceMultiplier',[999999]],['adminTestGrant',[9999]]] as [string,unknown[]][]){await expect(send(type,args)).rejects.toMatchObject({status:400})}
 snap=await send('assignAuxiliary',[3,EXP_CHARM.name]);expect(snap.player.actor.save.auxiliary[3]).toBe(EXP_CHARM.name);snap=await send('useAuxiliary',[3]);expect(snap.player.actor.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(1);expect(snap.player.actor.auxiliaryCooldown).toBe(0);snap=await transact(db,admin,{connect:true},1000);expect(snap.player.actor.save.auxiliary[3]).toBe(EXP_CHARM.name);
 const user={id:'ordinary',name:'User'};let ordinary=await transact(db,user,{connect:true},1000);ordinary=await transact(db,user,{commands:[{id:ordinary.player.session.id+':1',type:'assignAuxiliary',args:[2,EXP_CHARM.name]}]},1000);expect(ordinary.player.actor.save.auxiliary[2]).toBeNull();expect(ordinary.player.expTestGrant).toBeUndefined();
});
test('full bag defers one-charm grant and retries once',async()=>{
 const db=store();await transact(db,{...admin,admin:false},{connect:true},1000);let row=(await db.read())!;row.realm.players.admin.actor.save.items.push({name:EXP_CHARM.name,icon:EXP_CHARM.icon,count:0});while(row.realm.players.admin.actor.save.items.filter(i=>i.count>0).length<BAG_CAPACITY)row.realm.players.admin.actor.save.items.push({name:'filler '+row.realm.players.admin.actor.save.items.length,icon:'leaf',count:1});await db.commit(row.revision,row.realm);let snap=await transact(db,admin,{connect:true},1000);expect(snap.player.expTestGrant).toBeUndefined();row=(await db.read())!;row.realm.players.admin.actor.save.items.pop();await db.commit(row.revision,row.realm);snap=await transact(db,admin,{connect:true},1000);expect(snap.player.expTestGrant?.count).toBe(1);
});
test('D1 JSON marker survives SQLite reopening and admin-email authorization gates connect grant',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {D1RealmStore}=await import('../server/store');const {default:worker}=await import('../server/worker');
 // @ts-expect-error local Node database adapter is outside the Worker bundle.
 const {openGameDatabase}=await import('../tools/sqlite-database.mjs');const dir=await mkdtemp(join(tmpdir(),'exp-tome-'));let db=await openGameDatabase(join(dir,'realm.sqlite'));
 try{
  const request=(email:string)=>new Request('https://game.test/api/game',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'persisted-admin','oai-authenticated-user-email':email},body:JSON.stringify({connect:true})});
  let response=await worker.fetch(request('other@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});expect(response.status).toBe(200);let snap=await response.json() as any;expect(snap.player.expTestGrant).toBeUndefined();
  response=await worker.fetch(request('admin@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});snap=await response.json() as any;expect(snap.player.actor.save.items.find((i:any)=>i.name===EXP_CHARM.name).count).toBe(1);
  db.close();db=await openGameDatabase(join(dir,'realm.sqlite'));const store=new D1RealmStore(db.DB);expect((await store.read())!.realm.players['persisted-admin'].expTestGrant?.count).toBe(1);
  response=await worker.fetch(request('admin@test'),{DB:db.DB,ADMIN_EMAIL:'admin@test'});snap=await response.json() as any;expect(snap.player.actor.save.items.find((i:any)=>i.name===EXP_CHARM.name).count).toBe(1);expect((await store.read())!.realm.ledger.filter(i=>i.action.startsWith('adminTestGrant:'))).toHaveLength(1);
 }finally{db.close();await rm(dir,{recursive:true,force:true})}
});

test('quest and party EXP apply recipient charm exactly once',async()=>{
 const {shareKill}=await import('../server/community');const {capture}=await import('../server/protocol');const {freshRealm}=await import('../server/realm');
 const boosted=new Simulation(()=>.5,undefined,null),plain=new Simulation(()=>.5,undefined,null);boosted.addItem(EXP_CHARM.name,EXP_CHARM.icon);boosted.assignAuxiliary(2,EXP_CHARM.name);
 const expected=new Simulation(()=>.5,structuredClone(boosted.save),null);expected.save.auxiliary.fill(null);expected.addExperience(200*9999);boosted.save.quests['first-craft']={progress:1,claimed:false};expect(boosted.claimQuest('first-craft')).toBe(true);expect([boosted.save.level,boosted.save.xp]).toEqual([expected.save.level,expected.save.xp]);
 boosted.save.level=1;boosted.save.xp=0;const realm=freshRealm(1000);const p=(id:string,sim:Simulation)=>({id,name:id,room:sim.save.zone,actor:capture(sim),session:{id,sequence:0},lastSeen:1000,input:[0,0] as [number,number],inputAt:0,acknowledged:[],events:[],serial:0});const a=p('a',boosted),b=p('b',plain);realm.players={a,b};realm.community={parties:[{id:'p',leader:'a',members:['a','b'],invites:[],lootCursor:0}],friends:{},requests:{},trades:[],listings:[]};
 const monster=boosted.monsters.find(m=>m.kind==='Dewdrop')!;boosted.x=plain.x=monster.x;boosted.z=plain.z=monster.z;expect(shareKill(realm,a,monster,[{p:a,sim:boosted},{p:b,sim:plain}],1000)).toBe(true);expected.save.level=1;expected.save.xp=0;expected.addExperience(12*9999);expect([boosted.save.level,boosted.save.xp]).toEqual([expected.save.level,expected.save.xp]);expect(plain.save.xp).toBe(12);
});

test('solo kill awards actual multiplied EXP and equipped charm does not boost legacy Tome',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.addItem(EXP_CHARM.name,EXP_CHARM.icon);sim.assignAuxiliary(2,EXP_CHARM.name);const expected=new Simulation(()=>.5,structuredClone(sim.save),null);expected.save.auxiliary.fill(null);const monster=sim.monsters.find(m=>m.kind==='Dewdrop')!;const events:string[]=[];sim.onEvent=text=>events.push(text);expected.addExperience(24*9999);sim.hit(monster,10000);expect([sim.save.level,sim.save.xp]).toEqual([expected.save.level,expected.save.xp]);expect(events.some(e=>e.includes('+239976 EXP'))).toBe(true);
 sim.save.level=1;sim.save.xp=0;sim.addItem(EXP_TOME.name,EXP_TOME.icon);expected.save.level=1;expected.save.xp=0;expected.addExperience(1000);expect(sim.useItem(EXP_TOME.name)).toBe(true);expect([sim.save.level,sim.save.xp]).toEqual([expected.save.level,expected.save.xp]);
});

test('bulk material sale retains passive charm and legacy EXP consumables',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.addItem(EXP_CHARM.name,EXP_CHARM.icon);sim.addItem(EXP_TOME.name,EXP_TOME.icon,2);sim.addItem('Dew jelly','jelly',3);sim.assignAuxiliary(2,EXP_CHARM.name);sim.sell();expect(sim.save.items.find(i=>i.name===EXP_CHARM.name)!.count).toBe(1);expect(sim.save.items.find(i=>i.name===EXP_TOME.name)!.count).toBe(2);expect(sim.save.items.find(i=>i.name==='Dew jelly')).toBeUndefined();expect(sim.experienceMultiplier).toBe(9999);
});
