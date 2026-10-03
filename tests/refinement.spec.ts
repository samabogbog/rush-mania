import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {rollGear,gearById,itemBonuses} from '../src/game/equipment';
import {refineBonus,refineChance,refineStones,rollRefinement,rollStoneDrop} from '../src/game/refinement';
function setup(values:number[]=[]){const sim=new Simulation(()=>values.shift()??.5,undefined,null);sim.save.level=100;sim.save.gold=10000;const def=gearById('field-coat')!;const item={...rollGear(def.id,'rare',()=>.5),name:def.name,icon:def.icon,count:1,secondary:{critChance:5}};sim.addEquipmentItem(item);const saved=sim.save.items.find(i=>i.id===item.id)!;sim.equip(saved.id!);sim.addItem(refineStones.common.name,refineStones.common.icon,20);sim.addItem(refineStones.rare.name,refineStones.rare.icon,20);return {sim,item:saved};}
test('all ten levels use additive base percentages and exact Common/Rare chances',()=>{
 expect(Array.from({length:11},(_,n)=>refineBonus(n))).toEqual([0,10,21,33,46,60,75,91,108,126,145]);
 expect(Array.from({length:10},(_,n)=>refineChance(n,'common'))).toEqual([1,1,.8,.6,.4,.2,.1,.06,.03,.01]);
 expect(Array.from({length:10},(_,n)=>refineChance(n,'rare'))).toEqual([1,1,1,1,.8,.4,.2,.12,.06,.02]);
 const item={gearId:'field-coat',refine:10,rarity:'common' as const,secondary:{critChance:5}};expect(itemBonuses(item)).toEqual({def:24.5,hp:73.5,critChance:5});
});
test('failure downgrade is conditional: Common resets to zero, Rare loses one level, otherwise stays',()=>{
 for(const tier of ['common','rare'] as const){const values=[.999,.149];expect(rollRefinement(8,tier,()=>values.shift()!)).toEqual({level:tier==='common'?0:7,success:false,downgraded:true});const safe=[.999,.15];expect(rollRefinement(8,tier,()=>safe.shift()!).level).toBe(8);}
 expect(rollRefinement(1,'common',()=>.999).level).toBe(2);expect(rollRefinement(2,'rare',()=>.999).level).toBe(3);
});
test('refining armor consumes one stone and zeny, updates cached stats, and leaves secondary affixes intact',()=>{
 const {sim,item}=setup([.1]);const hp=sim.maxHp,def=sim.defense;expect(sim.upgrade(item.id!,'common')).toBe(true);expect(item.refine).toBe(1);expect(sim.maxHp).toBe(hp+3);expect(sim.defense).toBe(def+1);expect(item.secondary).toEqual({critChance:5});expect(sim.save.gold).toBe(9940);expect(sim.save.items.find(i=>i.name===refineStones.common.name)!.count).toBe(19);
});
test('failures pay once, reject missing resources and cap +10; lower max HP clamps current HP',()=>{
 const {sim,item}=setup([.999,0]);item.refine=8;sim.save.hp=sim.maxHp;expect(sim.upgrade(item.id!,'rare')).toBe(true);expect(item.refine).toBe(7);expect(sim.save.hp).toBeLessThanOrEqual(sim.maxHp);expect(sim.save.gold).toBe(9620);
 item.refine=10;const before=structuredClone(sim.save);expect(sim.upgrade(item.id!,'common')).toBe(false);expect(sim.save).toEqual(before);
 item.refine=0;sim.save.items.find(i=>i.name===refineStones.common.name)!.count=0;const noStone=structuredClone(sim.save);expect(sim.upgrade(item.id!,'common')).toBe(false);expect(sim.save).toEqual(noStone);expect(sim.upgrade('missing','rare')).toBe(false);
});
test('stones drop from monsters, combine five to one without zeny, and are protected from bulk material sales',()=>{
 expect(rollStoneDrop(false,()=>.02)).toBe('rare');expect(rollStoneDrop(false,()=>.1)).toBe('common');expect(rollStoneDrop(false,()=>.9)).toBeUndefined();expect(rollStoneDrop(true,()=>.7)).toBe('common');
 const sim=new Simulation(()=>.1,undefined,null);sim.hit(sim.monsters[0],99999);expect(sim.loot.some(l=>l.name===refineStones.common.name)).toBe(true);
 sim.addItem(refineStones.common.name,refineStones.common.icon,5);const gold=sim.save.gold;expect(sim.craft('rare-refine-stone')).toBe(true);expect(sim.save.gold).toBe(gold);expect(sim.save.items.find(i=>i.name===refineStones.rare.name)!.count).toBe(1);expect(sim.craft('rare-refine-stone')).toBe(false);sim.sell();expect(sim.save.items.find(i=>i.name===refineStones.rare.name)!.count).toBe(1);
});
test('old equipment above the new cap migrates to +10 without rerolling affixes or losing identity',()=>{
 const {sim,item}=setup();item.refine=20;const loaded=new Simulation(()=>.1,sim.save,null);const saved=loaded.save.items.find(i=>i.id===item.id)!;expect(saved.refine).toBe(10);expect(saved.secondary).toEqual(item.secondary);expect(loaded.save.version).toBe(7);
 const old=new Simulation(()=>.5,undefined,null).save;old.version=5;old.weapon=20;const migrated=new Simulation(()=>.5,old,null);expect(migrated.save.items.find(i=>i.id===migrated.save.equipped.weapon)!.refine).toBe(10);expect(new Simulation(()=>.5,migrated.save,null).save.items).toHaveLength(3);
 while(old.items.length<144)old.items.push({name:'Full '+old.items.length,icon:'leaf',count:1});const full=new Simulation(()=>.5,old,null);expect(full.save.items).toHaveLength(144);expect(full.save.legacyBasicRefine).toBe(true);full.save.items.pop();const freed=new Simulation(()=>.5,full.save,null);expect(freed.save.items).toHaveLength(144);expect(freed.save.equipped.weapon).toBeTruthy();
});
test('server checks item ownership, rolls authoritatively and replayed refinement consumes resources only once',async()=>{
 const {transact}=await import('../server/realm');const {capture}=await import('../server/protocol');let realm:any=null,revision=0;
 const store={async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(value:any){realm=structuredClone(value)},async commit(expected:number,value:any){if(expected!==revision)return false;realm=structuredClone(value);revision++;return true}};
 let s=await transact(store,{id:'refiner',name:'Hero'},{connect:true},1000);const {sim,item}=setup();realm.players.refiner.actor=capture(sim);const command={id:`${s.player.session.id}:1`,type:'upgrade',args:[item.id,'common',...['forged-success']]};
 s=await transact(store,{id:'refiner',name:'Hero'},{commands:[command]},1000);s=await transact(store,{id:'refiner',name:'Hero'},{commands:[command]},1000);expect(s.player.actor.save.items.find(i=>i.id===item.id)!.refine).toBe(1);expect(s.player.actor.save.gold).toBe(9940);expect(s.player.actor.save.items.find(i=>i.name===refineStones.common.name)!.count).toBe(19);
 const missing={id:`${s.player.session.id}:2`,type:'upgrade',args:['someone-elses-item','rare']};s=await transact(store,{id:'refiner',name:'Hero'},{commands:[missing]},1000);expect(s.player.actor.save.gold).toBe(9940);
});
