import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test,expect} from '@playwright/test';
import fixture from './monsters-v3-fixture.json' with {type:'json'};
import {normalMonsterBalance,species} from '../src/game/content';
import {contentConfig} from '../src/config/balance';
import {gearSlots,gearById,rollEquipmentDrops} from '../src/game/equipment';
import {Simulation} from '../src/simulation';
import {transact,MONSTER_BALANCE_REVISION,ROOM_LAYOUT_REVISION} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
test('all twenty v3 CSV rows match stats and all seven material probabilities exactly',()=>{
 const bytes=readFileSync(new URL('../docs/balance/imported/monsters-v3.csv',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sourceSha256);
 expect(contentConfig.normalBalance.checkpoints.map(row=>row.level)).toEqual(fixture.rows.map(row=>row.level));
 for(const row of fixture.rows){const actual=normalMonsterBalance(row.level);expect([actual.hp,actual.atk,actual.defense,actual.gold]).toEqual([row.hp,row.atk,row.defense,row.gold]);for(const [key,value] of Object.entries(row.drops))expect(actual.drops[key as keyof typeof actual.drops]).toBeCloseTo(value,12);}
 expect(normalMonsterBalance(100).hp).toBe(12000);expect(normalMonsterBalance(100).atk).toBe(2650);
 expect(normalMonsterBalance(100).drops).toEqual(normalMonsterBalance(95).drops);
});
function onlySlot(index:number,roll:number,rarity?:'common'|'rare'){
 const values:number[]=[];
 for(let n=0;n<gearSlots.length;n++){values.push(n===index?roll:1);if(n===index&&rarity){if(n===0)values.push(0);if(rarity==='rare')values.push(0,.5);}}
 return ()=>values.shift()??1;
}
test('CSV equipment percentages apply per individual slot with disjoint boundaries at every level',()=>{
 for(const row of fixture.rows)for(const [index,slot] of gearSlots.entries()){
  const attack=slot==='weapon'||slot==='accessory',common=attack?row.equipment.attackCommon:row.equipment.defenseCommon,rare=attack?row.equipment.attackRare:row.equipment.defenseRare,total=Math.round((common+rare)*1e12)/1e12;
  for(const [roll,rarity] of [[common-Number.EPSILON,'common'],[common,'rare'],[total-Number.EPSILON,'rare']] as const){const drops=rollEquipmentDrops(row.level,'normal',onlySlot(index,roll,rarity));expect(drops).toHaveLength(1);expect(drops[0].rarity).toBe(rarity);expect(gearById(drops[0].gearId!)!).toMatchObject({slot,level:row.gearLevel});}
  expect(rollEquipmentDrops(row.level,'normal',onlySlot(index,total))).toEqual([]);
 }
 expect(new Set(rollEquipmentDrops(100,'normal',()=>0).map(item=>gearById(item.gearId!)!.slot))).toEqual(new Set(gearSlots));
});
test('normal material and refine rolls include just below and exclude exact CSV thresholds',()=>{
 const sim=new Simulation(()=>1,undefined,null),monster=sim.monsters[0];
 const keys=['shade_common','shade_rare','rune_common','rune_rare','sky_common','sky_rare'] as const;
 for(const row of fixture.rows){sim.balance[monster.kind]={level:row.level};
  sim.random=()=>row.drops.commonStone-Number.EPSILON;expect(sim.rollStoneLoot(monster)?.name).toBe('Common refine stone');sim.random=()=>Math.round(row.drops.commonStone*1e12)/1e12;expect(sim.rollStoneLoot(monster)).toBeUndefined();
  for(const [index,key] of keys.entries()){const chance=Math.round(row.drops[key]*1e12)/1e12;let cursor=0;sim.random=()=>cursor++===index?Math.max(0,chance-Number.EPSILON):1;expect(sim.rollMaterialLoot(monster)).toHaveLength(chance>0?1:0);cursor=0;sim.random=()=>cursor++===index?chance:1;expect(sim.rollMaterialLoot(monster)).toEqual([]);}
 }
});
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(realm:Realm){this.realm=structuredClone(realm);}async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}}
test('revision 5 migration preserves all monster state except proportional live HP and preserves player session/save/target',async()=>{
 const store=new Store(),identity={id:'v3-migrate',name:'Keeper'};await transact(store,identity,{connect:true},1000);const room=store.realm!.rooms!.glade;
 room.balanceRevision=5;expect(room.layoutRevision).toBe(ROOM_LAYOUT_REVISION);
 for(const [index,monster] of room.monsters.entries()){monster.hp=contentConfig.normalBalance.revision5Hp[monster.kind]*.25;monster.poison=3;monster.poisonDamage=7;if(index===1){monster.alive=false;monster.hp=-7;monster.respawn=41;}}
 const boss=room.monsters.find(m=>species[m.kind].boss)!;store.realm!.balance={[boss.kind]:{hp:12345}};boss.hp=12345*.4;
 store.realm!.players[identity.id].actor.target=room.monsters[0].id;
 const player=structuredClone(store.realm!.players[identity.id]),before=structuredClone(room.monsters);
 await transact(store,identity,{},1000);const next=store.realm!.rooms!.glade,sim=new Simulation(()=>.5,undefined,null);
 expect(next.balanceRevision).toBe(MONSTER_BALANCE_REVISION);expect(next.layoutRevision).toBe(ROOM_LAYOUT_REVISION);
 for(const [index,monster] of next.monsters.entries()){expect({...monster,hp:before[index].hp}).toEqual(before[index]);expect(monster.hp).toBeCloseTo(!monster.alive?-7:monster.id===boss.id?12345*.4:sim.monsterSpec(monster.kind).hp*.25,10);}
 expect(store.realm!.players[identity.id].actor.save).toEqual(player.actor.save);expect(store.realm!.players[identity.id].actor.target).toBe(player.actor.target);expect(store.realm!.players[identity.id].session).toEqual(player.session);
 const first=structuredClone(next);await transact(store,identity,{},1000);expect(store.realm!.rooms!.glade).toEqual(first);
});
test('revision 5 HP history also applies when an older room layout is rebuilt',async()=>{
 const store=new Store(),identity={id:'v3-old-layout',name:'Keeper'};await transact(store,identity,{connect:true},1000);const room=store.realm!.rooms!.glade;room.balanceRevision=5;room.layoutRevision=5;
 for(const m of room.monsters)m.hp=contentConfig.normalBalance.revision5Hp[m.kind]*.4;
 await transact(store,identity,{},1000);const sim=new Simulation(()=>.5,undefined,null),next=store.realm!.rooms!.glade;
 expect(next.layoutRevision).toBe(ROOM_LAYOUT_REVISION);expect(next.balanceRevision).toBe(MONSTER_BALANCE_REVISION);
 for(const m of next.monsters)expect(m.hp).toBeCloseTo(sim.monsterSpec(m.kind).hp*.4,10);
});
