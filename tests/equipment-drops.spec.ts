import {test,expect} from '@playwright/test';
import {Simulation,type Item} from '../src/simulation';
import {equipment,gearSets,gearSlots,rollGear,rollEquipmentDrop,secondaryCounts,itemBonuses,BAG_CAPACITY,type Rarity} from '../src/game/equipment';
function gear(sim:Simulation,id:string,secondary:Item['secondary']={}) {const definition=equipment.find(g=>g.id===id)!;const item:Item={...rollGear(id,'common',()=>.5),name:definition.name,icon:definition.icon,count:1,secondary};sim.addEquipmentItem(item);expect(sim.equip(item.id!)).toBe(true);return item;}
test('five level sets have all six slots and rarity rolls preserve main stats with unique affixes',()=>{
 expect(gearSets.map(s=>s.level)).toEqual([10,30,50,70,90]);
 for(const set of gearSets){const pieces=equipment.filter(g=>g.setId===set.id);expect(pieces).toHaveLength(8);expect(new Set(pieces.map(p=>p.slot))).toEqual(new Set(gearSlots));expect(pieces.every(p=>Object.values(p.bonuses).some(v=>v>0))).toBe(true);}
 for(const rarity of ['common','rare','epic','legend'] as Rarity[]){const item=rollGear('thornwood-blade',rarity,()=>.99);expect(Object.keys(item.secondary!)).toHaveLength(secondaryCounts[rarity]);expect(itemBonuses(item).atk).toBeGreaterThanOrEqual(32);}
 expect(rollEquipmentDrop(1,false,()=>.5)).toBeUndefined();expect(rollEquipmentDrop(90,true,()=>.99)).toBeUndefined();
 const numbers=[.01,.1,.995,...Array(10).fill(.5)];const legend=rollEquipmentDrop(90,false,()=>numbers.shift()??.5)!;expect(legend.rarity).toBe('legend');expect(legend.gearId).toMatch(/^starfall-/);
});
test('monster gear drops retain their exact identity and rolls through a full bag and collection',()=>{
 const sim=new Simulation(()=>0,undefined,null),m=sim.monsters[0];sim.x=m.x;sim.z=m.z;sim.hit(m,99999);
 const drop=sim.loot.find(l=>l.item)!.item!;expect(drop.gearId).toMatch(/^thornwood-/);
 sim.save.items.push(...Array.from({length:BAG_CAPACITY-2},(_,i)=>({name:'material-'+i,icon:'leaf',count:1})));sim.collect();expect(sim.loot.some(l=>l.item?.id===drop.id)).toBe(true);
 sim.save.items.splice(-3);sim.collect();expect(sim.save.items.find(i=>i.id===drop.id)).toEqual(drop);sim.collect();expect(sim.save.items.filter(i=>i.id===drop.id)).toHaveLength(1);
 const loaded=new Simulation(()=>.999,structuredClone(sim.save),null);expect(loaded.save.items.find(i=>i.id===drop.id)).toEqual(drop);
});
test('damage bonuses and penetration affect damage, while lifesteal counts actual damage rather than overkill',()=>{
 const baseline=new Simulation(()=>.5,undefined,null),boosted=new Simulation(()=>.5,undefined,null);baseline.save.level=boosted.save.level=10;
 gear(boosted,'thornwood-blade',{damageBonus:50,armorPen:50,lifesteal:10,skillDamage:50});
 for(const sim of [baseline,boosted]){sim.balance.Dewdrop={defense:100};sim.monsters[0].hp=1000;}
 baseline.hit(baseline.monsters[0],100);boosted.hit(boosted.monsters[0],100);expect(baseline.monsters[0].hp).toBe(950);expect(boosted.monsters[0].hp).toBe(900);
 const next=boosted.monsters[1];next.hp=20;boosted.save.hp=50;boosted.hit(next,999999);expect(boosted.save.hp).toBe(52);
});
test('regen, movement, cooldown and healing bonuses affect gameplay; no HP is created by equipping',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.setClass('mage');sim.populateZone('town');sim.save.hp=50;sim.save.mp=0;
 gear(sim,'field-coat',{hpRegen:.4,mpRegen:2,moveSpeed:25,attackSpeed:20,cooldownReduction:20,healingBonus:25});expect(sim.save.hp).toBe(50);
 sim.tick(1,0,0);expect(sim.save.hp).toBeCloseTo(50+sim.maxHp*.009);expect(sim.save.mp).toBeCloseTo(2.7);sim.tick(.1,1,0);expect(sim.x).toBeCloseTo(.55);
 const heal=sim.skillList.find(s=>s.effect==='heal')!;sim.save.mp=sim.maxMp;sim.save.hp=1;expect(sim.castSkill(heal.id)).toBe(true);expect(sim.skillCooldowns[heal.id]).toBeCloseTo(heal.cooldown*.8);expect(sim.save.hp).toBeCloseTo(Math.min(sim.maxHp,1+sim.maxHp*heal.power*1.25));
});
test('set thresholds activate at two, four and six pieces and disappear on removal',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=10;
 for(const id of ['thornwood-blade','thornwood-helmet','thornwood-coat','thornwood-gloves','thornwood-boots','thornwood-charm'])gear(sim,id);
 expect(sim.activeSets[0].pieces).toBe(6);expect(sim.gearBonuses.damageBonus).toBe(5);expect(sim.gearBonuses.moveSpeed).toBe(5);
 sim.unequip('boots');expect(sim.gearBonuses.damageBonus).toBeUndefined();expect(sim.gearBonuses.moveSpeed).toBeUndefined();
});
test('EXP and zeny bonuses apply to rewards; drop-only gear cannot be crafted for free',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=10;gear(sim,'field-coat',{expBonus:20,goldBonus:50});const before=sim.save.gold,m=sim.monsters[0],spec=sim.monsterSpec(m.kind);sim.hit(m,999999);expect(sim.save.xp).toBe(Math.round(spec.xp*1.2));expect(sim.save.gold).toBe(before+Math.round(spec.gold*1.5));const items=structuredClone(sim.save.items);expect(sim.craft('thornwood-blade')).toBe(false);expect(sim.save.items).toEqual(items);
});
test('critical bonuses, damage reduction and dodge change combat outcomes',()=>{
 const normal=new Simulation(()=>.2,undefined,null),critical=new Simulation(()=>.2,undefined,null);gear(critical,'field-coat',{critChance:30,critDamage:50});for(const sim of [normal,critical])sim.balance.Dewdrop={defense:0};normal.hit(normal.monsters[0],10);critical.hit(critical.monsters[0],10);expect(critical.monsters[0].hp).toBeLessThan(normal.monsters[0].hp);
 const damaged=(secondary:Item['secondary'],rng:number)=>{const sim=new Simulation(()=>rng,undefined,null);gear(sim,'field-coat',secondary);const m=sim.monsters[0];m.x=sim.x;m.z=sim.z;m.windup=.1;m.aggro=true;sim.target=m.id;sim.attackTimer=100;sim.save.hp=sim.maxHp;const hp=sim.save.hp;sim.tick(.2,0,0);return hp-sim.save.hp;};
 expect(damaged({damageReduction:60},.5)).toBeLessThan(damaged({},.5));expect(damaged({dodgeChance:35},.2)).toBe(0);
});
test('server creates rolled equipment, ignores forged items and acknowledges collection only once',async()=>{
 const {transact}=await import('../server/realm');const {capture}=await import('../server/protocol');let realm:any=null,revision=0;
 const store={async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(value:any){realm=structuredClone(value)},async commit(expected:number,value:any){if(expected!==revision)return false;realm=structuredClone(value);revision++;return true}};
 const random=Math.random;Math.random=()=>0;
 try{let s=await transact(store,{id:'drop-server',name:'Hero'},{connect:true},1000);const sim=new Simulation(()=>0,undefined,null);sim.save.level=10;gear(sim,'field-coat',{goldBonus:50});const initialGold=sim.save.gold;const m=sim.monsters[0];sim.x=m.x;sim.z=m.z;sim.target=m.id;realm.players['drop-server'].actor=capture(sim);
  let now=1000;for(let i=0;i<12&&s.player.actor.save.kills<1;i++)s=await transact(store,{id:'drop-server',name:'Hero'},{movement:[0,0],...{items:[{name:'Forged Legend',secondary:{atk:999999}}]}} as any,now+=200);
  const drop=s.player.actor.loot.find(l=>l.item)!.item!;expect(drop.rarity).toBe('common');expect(drop.gearId).toMatch(/^thornwood-/);expect(realm.ledger.filter((entry:any)=>entry.action.startsWith('kill:')).reduce((total:number,entry:any)=>total+entry.goldDelta,0)).toBe(s.player.actor.save.gold-initialGold);
  const command={id:`${s.player.session.id}:1`,type:'collect',args:[]};s=await transact(store,{id:'drop-server',name:'Hero'},{commands:[command]},now+=1);s=await transact(store,{id:'drop-server',name:'Hero'},{commands:[command]},now+=1);
  expect(s.player.actor.save.items.filter(i=>i.id===drop.id)).toHaveLength(1);expect(s.player.actor.save.items.find(i=>i.id===drop.id)).toEqual(drop);expect(s.player.actor.save.items.some(i=>i.name==='Forged Legend')).toBe(false);
 }finally{Math.random=random;}
});
