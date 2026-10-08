import {test,expect} from '@playwright/test';
import {transact} from '../server/realm';
import {rollGear,gearById,secondaryRollMaximum,secondaryCounts,rarityOrder,type SecondaryStat} from '../src/game/equipment';
function store(){let realm:any=null,revision=0;return {async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:any){realm=structuredClone(r)},async commit(v:number,r:any){if(v!==revision)return false;realm=structuredClone(r);revision++;return true}};}
test('max rolls retain random affix selection and normal rolls remain unchanged',()=>{
 const random=()=>{let index=0;const values=[.1,.2,.8,.3,.5,.4,.2,.5,.7,.6];return ()=>values[index++%values.length]};
 const normal=rollGear('starfall-weapon','legend',random()),explicitFalse=rollGear('starfall-weapon','legend',random(),false),max=rollGear('starfall-weapon','legend',random(),true);
 expect(normal.secondary).toEqual(explicitFalse.secondary);expect(Object.keys(max.secondary!)).toEqual(Object.keys(normal.secondary!));expect(max.secondary).not.toEqual(normal.secondary);
 for(const rarity of rarityOrder){const item=rollGear('starfall-weapon',rarity,random(),true);expect(Object.keys(item.secondary!)).toHaveLength(secondaryCounts[rarity]);}
 const level=gearById('starfall-weapon')!.level;for(const [key,value] of Object.entries(max.secondary!))expect(value).toBe(secondaryRollMaximum(key as SecondaryStat,level));
 expect(Object.keys(rollGear('starfall-weapon','legend',()=>.99,true).secondary!)).not.toEqual(Object.keys(max.secondary!));
});
test('server max grants require admin, validate flag and audit effective max mode',async()=>{
 const db=store(),user={id:'max-admin',name:'Admin',admin:true};let snapshot=await transact(db,user,{connect:true},1000);const id=snapshot.player.session.id+':1';
 await expect(transact(db,{id:user.id,name:user.name},{commands:[{id,type:'adminSpawn',args:['starfall-weapon',1,'legend',0,true]}]},1000)).rejects.toMatchObject({status:403});
 await expect(transact(db,user,{commands:[{id,type:'adminSpawn',args:['starfall-weapon',1,'legend',0,'true']}]},1000)).rejects.toMatchObject({status:400});
 snapshot=await transact(db,user,{commands:[{id,type:'adminSpawn',args:['starfall-weapon',2,'legend',0,true]}]},1000);
 const items=snapshot.player.actor.save.items.filter(item=>item.gearId==='starfall-weapon');expect(items).toHaveLength(2);for(const item of items)for(const [key,value] of Object.entries(item.secondary!))expect(value).toBe(secondaryRollMaximum(key as SecondaryStat,gearById(item.gearId!)!.level));
 expect((await db.read())!.realm.ledger.at(-1).action).toContain(':max=true');
 snapshot=await transact(db,user,{commands:[{id:snapshot.player.session.id+':2',type:'adminSpawn',args:['material:Rune stone',1,'rare',0,true]}]},1000);expect(snapshot.player.actor.save.items.find(i=>i.name==='Rune stone')!.secondary).toBeUndefined();expect((await db.read())!.realm.ledger.at(-1).action).toContain(':max=false');
 for(const flag of [undefined,false]){snapshot=await transact(db,user,{commands:[{id:snapshot.player.session.id+':'+(snapshot.player.session.sequence+1),type:'adminSpawn',args:flag===undefined?['starfall-weapon',1,'rare',0]:['starfall-weapon',1,'rare',0,flag]}]},1000);expect((await db.read())!.realm.ledger.at(-1).action).toContain(':max=false');}
});
