import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {zones,species,type ZoneId} from '../src/game/content';
import {WORLD_SIZE,WORLD_BOUNDS,zoneSpawns,protectedPosition,zoneObstacles} from '../src/game/map-data';
for(const zone of Object.keys(zones) as ZoneId[])test(`${zone}: square sectors, one boss and mini, protected spawns`,()=>{
 const entries=zoneSpawns(zone);
 expect(WORLD_SIZE).toBe(96);expect(WORLD_BOUNDS.maxX).toBe(WORLD_BOUNDS.maxZ);
 expect(entries.filter(m=>species[m.kind].boss)).toHaveLength(1);
 expect(entries.filter(m=>species[m.kind].miniBoss)).toHaveLength(1);
 expect(entries.length).toBe(44);
 for(const m of entries){expect(protectedPosition(zone,m.x,m.z)).toBe(false);expect(zoneObstacles(zone).some(o=>Math.hypot(o.x-m.x,o.z-m.z)<o.r+.3)).toBe(false);}
 expect(new Set(entries.map(m=>`${Math.round(m.x/30)},${Math.round(m.z/30)}`)).size).toBe(9);
 for(const m of entries.filter(m=>species[m.kind].boss||species[m.kind].miniBoss)){
  const spec=species[m.kind],baseHp=60+spec.level*18;
  expect(spec.hp/baseHp).toBe(spec.boss?16:5);
  expect(spec.atk/(7+spec.level*2.4)).toBeCloseTo(spec.boss?3:1.8);
  expect(spec.defense/(8+spec.level*1.4)).toBeCloseTo(spec.boss?3:1.8);
 }
});
test('nearby elites acquire without selecting; windup gives time; leash heals and town hub stays safe',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.populateZone('town');sim.save.zone='town';sim.obstacles=[];
 const boss=sim.monsters.find(m=>species[m.kind].boss)!;
 sim.x=boss.x-5;sim.z=boss.z;const hp=sim.save.hp;sim.tick(.025,0,0);
 expect(boss.aggro).toBe(true);expect(sim.target).toBeNull();expect(sim.save.hp).toBeGreaterThanOrEqual(hp);
 boss.hp=1;sim.x=0;sim.z=0;sim.tick(.025,0,0);expect(boss.aggro).toBe(false);expect(boss.hp).toBeGreaterThan(1);
 for(let i=0;i<100;i++)sim.tick(.025,0,0);
 expect(sim.save.hp).toBeGreaterThanOrEqual(hp);expect(protectedPosition('town',boss.x,boss.z)).toBe(false);
});
test('movement and destination reach outer square sectors',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.monsters=[];sim.obstacles=[];sim.x=40;sim.z=40;sim.tick(1,1,1);
 expect(sim.x).toBeGreaterThan(40);expect(sim.z).toBeGreaterThan(40);
 sim.goTo(100,-100);expect(sim.destination).toEqual({x:46,z:-46});
});
import {transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
class WorldStore implements RealmStore {
 realm:Realm|null=null;revision=0;
 async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}
 async create(realm:Realm){this.realm=structuredClone(realm);}
 async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}
}
test('authority chooses nearby living player, releases dead owner, and protects town hub',async()=>{
 const store=new WorldStore(),a={id:'a',name:'Far'},b={id:'b',name:'Near'};
 await transact(store,a,{connect:true},1000);await transact(store,b,{connect:true},1000);
 const realm=store.realm!,town=new Simulation(()=>.5,undefined,null);town.populateZone('town');realm.rooms!.town={zone:'town',monsters:town.monsters};
 for(const player of Object.values(realm.players)){player.room='town';player.actor.save.zone='town';player.actor.x=0;player.actor.z=0;}
 const boss=realm.rooms!.town.monsters.find(m=>species[m.kind].boss)!;
 realm.players.b.actor.x=boss.x-5;realm.players.b.actor.z=boss.z;
 let snap=await transact(store,a,{},1025);expect(snap.monsters.find(m=>m.id===boss.id)!.owner).toBe('b');
 store.realm!.players.b.actor.save.hp=0;store.realm!.players.b.actor.deathTime=1;
 snap=await transact(store,a,{},1050);const result=snap.monsters.find(m=>m.id===boss.id)!;
 expect(result.owner).toBeUndefined();expect(result.aggro).toBe(false);expect(snap.player.actor.save.hp).toBeGreaterThan(0);
});
