import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {attributeCombat,savedAttributeCombat} from '../src/game/attribute-combat';
import {progression} from '../src/config/balance';
import {makeActor,seeded,profile,duel} from '../tools/attribute-duel-audit';
import {rollGear} from '../src/game/equipment';
import {equipment,itemBonuses,gearSets,setBonuses,gearById} from '../src/game/equipment';
import {transact,realmSnapshot} from '../server/realm';
import type {RealmStore} from '../server/store';
import type {Realm} from '../server/protocol';

test('attribute profile cache invalidates after spending, equipment, refine, class and save changes',()=>{
 const s=new Simulation(()=>.5,undefined,null),initial=s.attributeCombat;
 expect(s.attributeCombat).toBe(initial);s.stat('str');expect(s.attributeCombat).not.toBe(initial);
 const spent=s.attributeCombat;expect(spent.damage).toBeGreaterThan(initial.damage);
 s.save.level=100;expect(s.attributeCombat).not.toBe(spent);
 const item={...rollGear('field-coat','rare',()=>.5),count:1};s.addEquipmentItem(item);s.equip(item.id!);
 const equipped=s.attributeCombat;s.save.items.find(i=>i.id===item.id)!.refine=10;
 expect(s.attributeCombat).not.toBe(equipped);
 const refined=s.attributeCombat;s.setClass('mage');expect(s.attributeCombat).not.toBe(refined);
 const changed=s.attributeCombat;s.save=structuredClone(s.save);expect(s.attributeCombat).not.toBe(changed);
 expect(s.attributeCombat).toEqual(attributeCombat(s.save,s.gearBonuses,s.job.speed));
});

test('legal full allocations share offense-survival budget within every class',()=>{
 for(const job of ['swordsman','mage','archer'] as const)for(const level of [20,50,100])for(const gear of ['none','common','legend10'] as const){
  const actors=(['str','vit','agi'] as const).map(build=>makeActor(job,level,build,gear,seeded(1)));
  for(const s of actors){expect(s.save.points).toBe(0);expect(Object.values(s.save.stats).reduce((a,b)=>a+b,0)).toBe(15+3*level);}
  const values=actors.map(s=>{const p=profile(s);return p.ehp*p.basicExpectedDps;});
  expect(values[1]/values[0]).toBeCloseTo(1,10);expect(values[2]/values[0]).toBeCloseTo(1,10);
 }
});

test('equipment contribution numbers equal canonical equipped-minus-unequipped stats',()=>{
 for(const build of ['str','vit','agi'] as const){
  const s=makeActor('archer',100,build,'legend10',seeded(1)),naked=attributeCombat(s.save,{},s.job.speed),bonus=s.equipmentStatContributions;
  expect(bonus.hp).toBeCloseTo(s.maxHp-naked.hp,10);expect(bonus.atk).toBeCloseTo(s.damage-naked.damage,10);expect(bonus.def).toBeCloseTo(s.defense-naked.defense,10);
 }
});

test('stat allocation is saved intact without redistributing earned points',()=>{
 const s=makeActor('mage',100,'agi','common',seeded(1)),saved=structuredClone(s.save),loaded=new Simulation(()=>.5,saved,null);
 expect(loaded.save.stats).toEqual(saved.stats);expect(loaded.save.points).toBe(saved.points);
 expect(loaded.maxHp).toBeCloseTo(s.maxHp,10);expect(loaded.damage).toBeCloseTo(s.damage,10);
 expect(loaded.criticalChance).toBeLessThanOrEqual(progression.caps.crit);
});

test('every legal point increases its effect even with maximum critical-damage equipment',()=>{
 for(const level of [20,50,100])for(const job of ['swordsman','mage','archer'] as const){
  const actor={level,stats:{str:5,vit:5,agi:5}},gear={critDamage:139.8};
  for(const key of ['str','vit','agi'] as const){
   actor.stats={str:5,vit:5,agi:5};let before=attributeCombat(actor,gear,1);
   for(let n=0;n<3*level;n++){
    actor.stats[key]++;const after=attributeCombat(actor,gear,1);
    if(key==='vit'){expect(after.hp).toBeGreaterThan(before.hp);expect(after.defense).toBeGreaterThan(before.defense);}
    else expect(after.damage).toBeGreaterThan(before.damage);
    if(key==='agi'){expect(after.criticalChance).toBeGreaterThanOrEqual(before.criticalChance);expect(after.attackInterval).toBeLessThanOrEqual(before.attackInterval);}
    before=after;
   }
  }
 }
});

test('peer snapshot helper shares exact equipment, class and attribute calculation without spawning a world',()=>{
 for(const job of ['swordsman','mage','archer'] as const)for(const build of ['str','vit','agi'] as const){
  const s=makeActor(job,100,build,'legendRolled',seeded(1));expect(savedAttributeCombat(s.save)).toEqual(s.attributeCombat);
 }
});

test('full STR preserves the previous additive attack progression for swordsman and mage',()=>{
 for(const job of ['swordsman','mage'] as const)for(const level of [1,20,50,100])for(const gear of ['none','common','legend10','legendRolled'] as const){
  const s=makeActor(job,level,'str',gear,seeded(1));
  const before=progression.atkBase+(s.save.stats.str+(s.gearBonuses.str||0))*progression.atkPrimary+(level-1)*progression.atkPerLevel+(s.gearBonuses.atk||0);
  expect(s.damage).toBeCloseTo(before,10);
 }
});

test('splitting a legal allocation does not multiply into a larger combat budget',()=>{
 for(const gear of ['none','common','legendRolled'] as const){
  const s=makeActor('mage',100,'str',gear,seeded(1)),full=profile(s),budget=full.ehp*full.basicExpectedDps;
  for(const [str,vit,agi] of [[100,100,100],[150,150,0],[10,40,250]]){
   s.save.stats={str:5+str,vit:5+vit,agi:5+agi};const mixed=profile(s);
   expect(mixed.ehp*mixed.basicExpectedDps/budget).toBeCloseTo(1,10);
  }
 }
});

test('duel adapter is symmetric and both skill branches start through production acceptance',()=>{
 for(const job of ['swordsman','mage','archer'] as const)for(const branch of [0,1] as const){
  const a=makeActor(job,100,'str','common',seeded(19),branch),b=makeActor(job,100,'str','common',seeded(19),branch);
  const result=duel(a,b,true);expect(result.winner).toBe('draw');expect(result.reason).toBe('double-ko');
  expect(Object.keys(a.skillCooldowns).length).toBeGreaterThan(0);expect(a.save.mp).toBeLessThan(a.maxMp);
  expect(Object.keys(b.skillCooldowns).length).toBeGreaterThan(0);expect(b.save.mp).toBeLessThan(b.maxMp);
 }
});

test('equipping an attack-only weapon cannot reduce a vitality build health or defense',()=>{
 const s=makeActor('swordsman',100,'vit','none',seeded(1)),hp=s.maxHp,def=s.defense;
 for(const id of ['sprout-weapon','amber-weapon','frost-weapon','starfall-weapon']){
  const definition=gearById(id)!;expect(definition).toBeDefined();
  const item={...rollGear(definition.id,'common',()=>.5),count:1,secondary:{}};s.addEquipmentItem(item);s.equip(item.id!);
  expect(s.maxHp).toBeGreaterThanOrEqual(hp);expect(s.defense).toBeGreaterThanOrEqual(def);
 }
});

test('level gains never dilute existing investments with the strongest legal gear',()=>{
 for(let level=1;level<100;level++){
  const set=[...gearSets].filter(x=>x.level<=level).sort((a,b)=>b.level-a.level)[0];
  const gear:Record<string,number>={};
  if(set){const pieces=equipment.filter(g=>g.setId===set.id);for(const g of pieces){const item={...rollGear(g.id,'legend',()=>.5),refine:10,secondary:{}};for(const [k,v] of Object.entries(itemBonuses(item)))gear[k]=(gear[k]||0)+v;}
   for(const [k,v] of Object.entries(setBonuses(set.id,pieces.length)))gear[k]=(gear[k]||0)+v;
  }
  for(const key of ['str','vit','agi'] as const){
   const actor={level,stats:{str:5,vit:5,agi:5}};actor.stats[key]+=3*level;
   const before=attributeCombat(actor,gear,1),after=attributeCombat({...actor,level:level+1},gear,1);
   expect(after.damage).toBeGreaterThan(before.damage);expect(after.hp).toBeGreaterThan(before.hp);expect(after.defense).toBeGreaterThan(before.defense);
  }
 }
});

test('actual server peer snapshots include equipment and allocated vitality in max HP',async()=>{
 const store:RealmStore&{realm:Realm|null;revision:number}={realm:null,revision:0,async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;},async create(r){this.realm=structuredClone(r);},async commit(rev,r){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}};
 await transact(store,{id:'attribute-observer',name:'Observer'},{connect:true},1000);
 await transact(store,{id:'attribute-peer',name:'Peer'},{connect:true},1000);
 const s=makeActor('mage',100,'vit','legendRolled',seeded(1));store.realm!.players['attribute-peer'].actor.save=structuredClone(s.save);
 const snap=realmSnapshot(store.realm!,'attribute-observer',store.revision,1000),peer=snap.peers.find(p=>p.id==='attribute-peer')!;
 expect(peer.maxHp).toBeCloseTo(s.maxHp,10);
});

test('unspent points and partial STR allocations preserve existing attack values',()=>{
 for(const job of ['swordsman','mage'] as const)for(const level of [1,20,50,100]){
  const s=makeActor(job,level,'str','legendRolled',seeded(1));
  for(const invested of [0,Math.floor(3*level/2),3*level]){
   s.save.stats={str:5+invested,vit:5,agi:5};
   const old=progression.atkBase+(s.save.stats.str+(s.gearBonuses.str||0))*progression.atkPrimary+(level-1)*progression.atkPerLevel+(s.gearBonuses.atk||0);
   expect(s.damage).toBeCloseTo(old,10);
  }
 }
});

test('spending another attribute cannot dilute previously allocated vitality; imported overspending stays finite',()=>{
 const s=makeActor('mage',100,'str','legendRolled',seeded(1));s.save.stats={str:105,vit:105,agi:104};s.save.points=1;
 const hp=s.maxHp,def=s.defense,atk=s.damage;s.stat('str');expect(s.maxHp).toBe(hp);expect(s.defense).toBe(def);expect(s.damage).toBeGreaterThan(atk);
 s.save.stats={str:1e308,vit:1e308,agi:1e308};const saved=structuredClone(s.save.stats),p=s.attributeCombat;
 for(const value of Object.values(p))expect(Number.isFinite(value)).toBe(true);expect(s.save.stats).toEqual(saved);
});

test('duel receiver dodge still consumes the ordinary swing recovery and timer',()=>{
 const a=makeActor('swordsman',100,'str','common',()=>0),b=makeActor('swordsman',100,'agi','common',()=>0);
 for(const s of [a,b]){s.save.items.find(i=>i.id===s.save.equipped.weapon)!.secondary={dodgeChance:100};s.save={...s.save};}
 const result=duel(a,b,false,.025);expect(result.reason).toBe('timeout');expect(result.hp).toEqual([1,1]);
 for(const s of [a,b]){expect(s.actionTime).toBe(.25);expect(s.attackTimer).toBe(s.attackInterval);}
});
