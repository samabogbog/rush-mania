import {test,expect} from '@playwright/test';
import {zones,species,type ZoneId} from '../src/game/content';
import {zoneSpawns,zoneMonsterGroups} from '../src/game/map-data';
import {equipmentDropRow,rollEquipmentDrops,gearSlots,gearById} from '../src/game/equipment';
import {Simulation} from '../src/simulation';
import {contentConfig,equipmentConfig,economy} from '../src/config/balance';
import {transact,ROOM_LAYOUT_REVISION,MONSTER_BALANCE_REVISION} from '../server/realm';
import {shareKill} from '../server/community';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
const expected=[['town',1,1,100,[]],['glade',1,1,20,[5,10,15]],['orchard',10,20,40,[25,35]],['marsh',30,40,60,[45,55]],['frost',50,60,80,[65,75]],['ruins',70,80,100,[85,95]]] as const;
test('map entry/recommended levels, spawned normal levels and empty town match the new table',()=>{
 for(const [id,entry,min,max,levels] of expected){const zone=zones[id];expect([zone.level,zone.recommendedLevel,zone.maxLevel]).toEqual([entry,min,max]);const spawns=zoneSpawns(id);expect([...new Set(spawns.filter(s=>!species[s.kind].boss&&!species[s.kind].miniBoss).map(s=>species[s.kind].level))].sort((a,b)=>a-b)).toEqual(levels);if(id==='town'){expect(spawns).toEqual([]);expect(zoneMonsterGroups(id)).toEqual([]);}else{expect(spawns.filter(s=>species[s.kind].boss||species[s.kind].miniBoss).map(s=>species[s.kind].level)).toEqual([max,max]);}}
 expect(economy.party.dungeonLevel).toBe(70);
});
const rates=[[5,10,.01,.002],[10,10,.015,.003],[15,10,.02,.004],[25,30,.01,.002],[35,30,.02,.004],[45,50,.01,.002],[55,50,.02,.004],[65,70,.01,.002],[75,70,.02,.004],[85,90,.01,.002],[95,90,.02,.004]];
/** One slot succeeds; other slots fail. Extra random draws select weapon and Rare affix. */
function onlySlot(index:number,roll:number,rare:boolean,success=true){const values:number[]=[];for(let n=0;n<gearSlots.length;n++){values.push(n===index?roll:1);if(n===index&&success){if(n===0)values.push(0);if(rare)values.push(0,.5);}}return ()=>values.shift()??1;}
test('every table row and slot has exact disjoint Common/Rare boundaries and defense ×1.5',()=>{
 for(const [level,gearLevel,common,rare] of rates){expect(equipmentDropRow(level)).toEqual({monsterLevel:level,gearLevel,common,rare});for(const [index,slot] of gearSlots.entries()){const m=slot==='weapon'||slot==='accessory'?1:1.5,c=common*m,total=(common+rare)*m;
  for(const boss of [false]){const lo=rollEquipmentDrops(level,boss,onlySlot(index,c-Number.EPSILON,false));expect(lo).toHaveLength(1);expect(lo[0].rarity).toBe('common');expect(gearById(lo[0].gearId!)!.slot).toBe(slot);expect(gearById(lo[0].gearId!)!.level).toBe(gearLevel);const hi=rollEquipmentDrops(level,boss,onlySlot(index,c,true));expect(hi).toHaveLength(1);expect(hi[0].rarity).toBe('rare');expect(rollEquipmentDrops(level,boss,onlySlot(index,total,false,false))).toEqual([]);}
 }}
 expect(equipmentDropRow(1).monsterLevel).toBe(5);expect(equipmentDropRow(100).monsterLevel).toBe(95);expect(equipmentDropRow(20).monsterLevel).toBe(15);
});
test('six independent slot rolls reach solo loot and party rotation without duplicate identities',()=>{
 const sim=new Simulation(()=>0,undefined,null),monster=sim.monsters[0];sim.x=monster.x;sim.z=monster.z;sim.hit(monster,1e9);const loot=sim.loot.filter(l=>l.item?.gearId);expect(loot).toHaveLength(6);expect(new Set(loot.map(l=>l.item!.id)).size).toBe(6);expect(new Set(loot.map(l=>gearById(l.item!.gearId!)!.slot))).toEqual(new Set(gearSlots));expect(loot.every(l=>l.item!.rarity==='common')).toBe(true);
 const a=new Simulation(()=>0,undefined,null),b=new Simulation(()=>0,undefined,null),m=a.monsters[0];a.x=b.x=m.x;a.z=b.z=m.z;a.rollStoneLoot=()=>undefined;a.rollMaterialLoot=()=>[];a.hasLegacyDrop=()=>false;
 const realm={community:{parties:[{id:'p',leader:'a',members:['a','b'],invites:[],lootCursor:0}],friends:{},requests:{},trades:[],listings:[]},ledger:[]} as unknown as Realm;
 const pa={id:'a',room:'glade'},pb={id:'b',room:'glade'};
 expect(shareKill(realm,pa as any,m,[{p:pa as any,sim:a},{p:pb as any,sim:b}],1000)).toBe(true);expect(a.save.items.filter(i=>i.gearId)).toHaveLength(3);expect(b.save.items.filter(i=>i.gearId)).toHaveLength(3);expect(new Set([...a.save.items,...b.save.items].filter(i=>i.gearId).map(i=>i.id)).size).toBe(6);
});
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(r:Realm){this.realm=structuredClone(r);}async commit(rev:number,r:Realm){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}}
test('revision2 saved worlds retain health fractions, dead/status timers, accounts and overrides; town empties once',async()=>{
 const store=new Store(),identity={id:'old-world',name:'Keeper'};await transact(store,identity,{connect:true},1000);const r=store.realm!,room=r.rooms!.glade;room.layoutRevision=4;room.balanceRevision=2;const alive=room.monsters[0],dead=room.monsters[1];alive.hp=contentConfig.normalBalance.previousRevisionHp[alive.kind]*.25;alive.poison=3;alive.poisonDamage=7;dead.alive=false;dead.hp=0;dead.respawn=41;
 r.balance={MooncapMonarch:{hp:10000,atk:321}};const boss=room.monsters.find(m=>m.kind==='MooncapMonarch')!;boss.hp=5000;
 r.rooms!.town={zone:'town',monsters:structuredClone(room.monsters),layoutRevision:4,balanceRevision:2};const saved=structuredClone(r.players[identity.id].actor.save);saved.gold=98765;saved.items.push({id:'old-legend',gearId:'starfall-gloves',name:'Starfall Pants',icon:'gear-pants',count:1,rarity:'legend',refine:0,category:'armor'});r.players[identity.id].actor.save=structuredClone(saved);
 const snap=await transact(store,identity,{},1000),next=store.realm!.rooms!.glade;expect(snap.player.actor.save).toEqual(saved);expect(next.layoutRevision).toBe(ROOM_LAYOUT_REVISION);expect(next.balanceRevision).toBe(MONSTER_BALANCE_REVISION);expect(next.monsters[0].hp).toBeCloseTo(new Simulation(()=>.5,undefined,null).monsterSpec(alive.kind).hp*.25);expect(next.monsters[0].poison).toBe(3);expect(next.monsters[0].poisonDamage).toBe(7);expect(next.monsters[1].alive).toBe(false);expect(next.monsters[1].respawn).toBe(41);expect(next.monsters.find(m=>m.kind==='MooncapMonarch')!.hp).toBe(5000);expect(store.realm!.rooms!.town.monsters).toEqual([]);expect(store.realm!.balance).toEqual(r.balance);
 const before=structuredClone(next.monsters),session=snap.player.session.id;const again=await transact(store,identity,{},1000);expect(store.realm!.rooms!.glade.monsters).toEqual(before);expect(again.player.session.id).toBe(session);expect(again.player.actor.save).toEqual(saved);
});
test('entry levels gate practice and authoritative travel independently of recommendations',async()=>{
 for(const [zone,entry] of expected.filter(([id])=>!['town','glade','ruins'].includes(id))){const sim=new Simulation(()=>.5,undefined,null);sim.x=0;sim.z=-11;sim.save.level=entry-1;expect(sim.travel(zone)).toBe(false);sim.save.level=entry;expect(sim.travel(zone)).toBe(true);expect(sim.save.zone).toBe(zone);}
 const store=new Store(),identity={id:'gate',name:'Gate'};let snap=await transact(store,identity,{connect:true},1000);
 for(const [zone,entry] of expected.filter(([id])=>!['town','glade','ruins'].includes(id))){const current=store.realm!.players.gate;current.actor.save.level=entry-1;current.actor.x=0;current.actor.z=-11;const before=current.actor.save.zone;const command=(s:typeof snap)=>({id:`${s.player.session.id}:${s.player.session.sequence+1}`,type:'travel',args:[zone]});snap=await transact(store,identity,{commands:[command(snap)]},1000);expect(snap.player.actor.save.zone).toBe(before);store.realm!.players.gate.actor.save.level=entry;store.realm!.players.gate.actor.x=0;store.realm!.players.gate.actor.z=-11;snap=await transact(store,identity,{commands:[command(snap)]},1000);expect(snap.player.actor.save.zone).toBe(zone);}
});
