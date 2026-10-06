import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {zones,type ZoneId} from '../src/game/content';
import {zoneMonsterGroups,zoneSpawns,zoneObstacles,protectedPosition,WORLD_BOUNDS,validateMonsterGroupConfig,monsterGroupConfig} from '../src/game/map-data';
import {transact,ROOM_LAYOUT_REVISION} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
for(const zone of Object.keys(zones) as ZoneId[])test(`${zone} packs have six to eight members and clear ground`,()=>{
 const entries=zoneSpawns(zone),groups=zoneMonsterGroups(zone),obstacles=zoneObstacles(zone);
 expect(groups).toHaveLength(6);
 for(const g of groups){expect(entries.filter(m=>m.groupId===g.id)).toHaveLength(g.count);expect(g.count).toBeGreaterThanOrEqual(6);expect(g.count).toBeLessThanOrEqual(8);expect(protectedPosition(zone,g.x,g.z)).toBe(false);expect(obstacles.some(o=>Math.hypot(g.x-o.x,g.z-o.z)<g.radius+o.r)).toBe(false);}
 const regular=entries.filter(m=>m.groupId);
 expect(Math.max(...regular.map(m=>m.x))-Math.min(...regular.map(m=>m.x))).toBeGreaterThan(75);
 expect(Math.max(...regular.map(m=>m.z))-Math.min(...regular.map(m=>m.z))).toBeGreaterThan(75);
 expect(new Set(regular.map(m=>`${Math.round(m.x/30)},${Math.round(m.z/30)}`)).size).toBe(9);
 expect(zoneSpawns(zone)).toEqual(entries);
 const sim=new Simulation(()=>.123,undefined,null);sim.populateZone(zone);
 for(const g of groups){
  const members=entries.filter(m=>m.groupId===g.id),distances=members.map(m=>Math.hypot(m.x-g.x,m.z-g.z));
  expect(Math.max(...distances)-Math.min(...distances)).toBeGreaterThan(.8);
  expect(Math.max(...distances)).toBeGreaterThan(15);
  expect(Math.max(...members.map(m=>m.x))-Math.min(...members.map(m=>m.x))).toBeGreaterThan(15);
  expect(Math.max(...members.map(m=>m.z))-Math.min(...members.map(m=>m.z))).toBeGreaterThan(10);

  for(const [index,m] of members.entries()){
   for(const other of members.slice(index+1))expect(Math.hypot(m.x-other.x,m.z-other.z)).toBeGreaterThanOrEqual(.8);
   const home=sim.monsters.filter(actor=>actor.groupId===g.id)[index];expect([home.homeX,home.homeZ]).toEqual([m.x,m.z]);
  }
  for(let n=0;n<32;n++){const angle=n/32*Math.PI*2,x=g.x+Math.cos(angle)*g.radius,z=g.z+Math.sin(angle)*g.radius;expect(protectedPosition(zone,x,z)).toBe(false);}
  for(const h of groups)if(h.id!==g.id)expect(Math.hypot(g.x-h.x,g.z-h.z)).toBeGreaterThan(9.6);
 }
 for(const m of entries){expect(obstacles.some(o=>Math.hypot(m.x-o.x,m.z-o.z)<o.r+.3)).toBe(false);expect(protectedPosition(zone,m.x,m.z)).toBe(false);expect(m.x).toBeGreaterThanOrEqual(WORLD_BOUNDS.minX);expect(m.x).toBeLessThanOrEqual(WORLD_BOUNDS.maxX);expect(m.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.minZ);expect(m.z).toBeLessThanOrEqual(WORLD_BOUNDS.maxZ);}
});
test('stationary territory pulls entire pack and respawns; leaving returns without healing',()=>{
 const s=new Simulation(()=>.5,undefined,null),g=zoneMonsterGroups('glade')[0];s.x=g.x;s.z=g.z;s.save.hp=s.maxHp;
 const pack=s.monsters.filter(m=>m.groupId===g.id);s.tick(.025,0,0);expect(pack.every(m=>m.aggro)).toBe(true);expect(s.target).toBeNull();
 for(let n=0;n<700;n++)s.tick(.025,0,0);
 expect(pack.every(m=>Math.hypot(m.x-s.x,m.z-s.z)<1.6)).toBe(true);
 const m=pack[0];m.alive=false;m.hp=0;m.respawn=.01;s.tick(.025,0,0);expect(m.alive&&m.aggro).toBe(true);
 m.hp=7;s.x=g.x+g.radius+1;s.tick(.025,0,0);expect(pack.every(m=>!m.aggro)).toBe(true);
 for(let n=0;n<1000;n++)s.tick(.025,0,0);expect(m.hp).toBe(7);expect(m.returning).toBe(false);
});
class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(r:Realm){this.realm=structuredClone(r);}async commit(v:number,r:Realm){if(v!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}}
test('server assigns same group to nearest living occupant and hands off dead/disconnected owners; respawn reacquires',async()=>{
 const store=new Store(),a={id:'a',name:'A'},b={id:'b',name:'B'};await transact(store,a,{connect:true},1000);await transact(store,b,{connect:true},1000);
 const g=zoneMonsterGroups('glade')[0];for(const p of Object.values(store.realm!.players)){p.actor.x=g.x;p.actor.z=g.z+1;}store.realm!.players.b.actor.z=g.z;
 let snap=await transact(store,a,{},1025);let pack=snap.monsters.filter(m=>m.groupId===g.id);expect(pack.every(m=>m.owner==='b'&&m.aggro)).toBe(true);
 store.realm!.players.b.actor.save.hp=0;store.realm!.players.b.actor.deathTime=1;
 const dead=store.realm!.rooms!.glade.monsters.find(m=>m.groupId===g.id)!;dead.alive=false;dead.hp=0;dead.respawn=.01;
 snap=await transact(store,b,{},1050);pack=snap.monsters.filter(m=>m.groupId===g.id);expect(pack.every(m=>m.owner==='a'&&m.aggro&&m.alive)).toBe(true);
 store.realm!.players.a.lastSeen=-10000;store.realm!.players.b.actor.save.hp=100;store.realm!.players.b.actor.deathTime=0;
 snap=await transact(store,b,{},1075);expect(snap.monsters.filter(m=>m.groupId===g.id).every(m=>m.owner==='b')).toBe(true);
 store.realm!.players.b.actor.x=0;store.realm!.players.b.actor.z=-11;
 snap=await transact(store,b,{},1100);expect(snap.monsters.filter(m=>m.groupId===g.id).every(m=>!m.aggro&&!m.owner)).toBe(true);
});
test('Auto stays stationary through two natural kill and respawn cycles',()=>{
 const s=new Simulation(()=>.5,undefined,null),g=zoneMonsterGroups('glade')[0];s.x=g.x;s.z=g.z;s.auto=true;
 // Isolate one real configured pack member, with ordinary damage and a short test respawn clock.
 const m=s.monsters.find(m=>m.groupId===g.id)!;s.monsters=[m];s.balance[m.kind]={hp:1,atk:1};m.hp=1;
 let deaths=0,previous=true;
 for(let n=0;n<1500&&deaths<2;n++){s.tick(.025,0,0);expect(s.x).toBe(g.x);expect(s.z).toBe(g.z);if(previous&&!m.alive){deaths++;m.respawn=.1;}previous=m.alive;}
 expect(deaths).toBe(2);
});
test('revision-3 nearby layout migrates to scatter preserving HP fraction, status, respawn and items exactly once',async()=>{
 const store=new Store(),id={id:'keeper',name:'Keeper'};await transact(store,id,{connect:true},1000);
 const room=store.realm!.rooms!.glade,m=room.monsters[0],s=new Simulation(()=>.5,undefined,null);
 m.hp=s.monsterSpec(m.kind).hp*.25;m.poison=3;m.poisonDamage=7;const dead=room.monsters[1];dead.alive=false;dead.hp=0;dead.respawn=9;room.layoutRevision=3;
 for(const g of zoneMonsterGroups('glade'))for(const [index,old] of room.monsters.filter(actor=>actor.groupId===g.id).entries()){
  const angle=index/g.count*Math.PI*2;old.x=old.homeX=g.x+Math.cos(angle)*4.8;old.z=old.homeZ=g.z+Math.sin(angle)*4.8;
 }
 const oldHomes=room.monsters.map(actor=>[actor.homeX,actor.homeZ]);
 const items=structuredClone(store.realm!.players.keeper.actor.save.items);store.realm!.players.keeper.actor.loot=[{x:1,z:2,name:'Retained',icon:'?'}];
 const snap=await transact(store,id,{},1000),next=store.realm!.rooms!.glade;
 expect(next.layoutRevision).toBe(ROOM_LAYOUT_REVISION);
 expect(next.monsters.map(actor=>[actor.homeX,actor.homeZ])).not.toEqual(oldHomes);
 expect(next.monsters.map(actor=>[actor.homeX,actor.homeZ])).toEqual(zoneSpawns('glade').map(actor=>[actor.x,actor.z]));
 expect(next.monsters[0].hp).toBe(s.monsterSpec(m.kind).hp*.25);expect(next.monsters[0].poison).toBe(3);expect(next.monsters[1].alive).toBe(false);expect(next.monsters[1].respawn).toBe(9);
 expect(snap.player.actor.save.items).toEqual(items);expect(snap.player.actor.loot).toEqual([{x:1,z:2,name:'Retained',icon:'?'}]);
 const saved=structuredClone(next.monsters);await transact(store,id,{},1000);expect(store.realm!.rooms!.glade.monsters).toEqual(saved);
});
test('manual attack outside a territory retains ordinary retaliation and chase',()=>{
 const s=new Simulation(()=>.5,undefined,null),m=s.monsters[0];s.monsters=[m];s.obstacles=[];
 s.x=m.homeX+3;s.z=m.homeZ;s.balance[m.kind]={hp:1000};m.hp=1000;
 expect(protectedPosition('glade',s.x,s.z)).toBe(false);s.hit(m,1);const start=m.x,playerHp=s.save.hp;
 s.tick(.025,0,0);expect(m.aggro).toBe(true);expect(m.territoryAggro).toBe(false);expect(m.returning).toBe(false);expect(m.x).toBeGreaterThan(start);
 for(let n=0;n<180;n++)s.tick(.025,0,0);expect(s.save.hp).toBeLessThan(playerHp);
});
test('server ticks the second manual attacker outside circles, rather than the first occupant',async()=>{
 const store=new Store(),a={id:'a',name:'A'},b={id:'b',name:'B'};await transact(store,a,{connect:true},1000);await transact(store,b,{connect:true},1000);
 const m=store.realm!.rooms!.glade.monsters[0];store.realm!.players.a.actor.x=0;store.realm!.players.a.actor.z=0;
 const p=store.realm!.players.b;p.actor.x=m.x+3;p.actor.z=m.z;p.actor.target=m.id;m.aggro=true;m.owner='b';m.territoryAggro=false;
 const before=m.x,snap=await transact(store,a,{},1025),result=snap.monsters.find(e=>e.id===m.id)!;
 expect(result.owner).toBe('b');expect(result.aggro).toBe(true);expect(result.territoryAggro).toBe(false);expect(result.returning).toBeFalsy();expect(result.x).toBeGreaterThan(before);
});

test('group config validates editable values and lookups reuse stable objects',()=>{
 expect(zoneMonsterGroups('glade')).toBe(zoneMonsterGroups('glade'));
 for(const key of ['radius','runSpeed'] as const){const config=structuredClone(monsterGroupConfig);config[key]=0;expect(()=>validateMonsterGroupConfig(config)).toThrow();config[key]=NaN;expect(()=>validateMonsterGroupConfig(config)).toThrow();}
 for(const count of [5,9,6.5]){const config=structuredClone(monsterGroupConfig);config.maps.glade[0].count=count;expect(()=>validateMonsterGroupConfig(config)).toThrow();}
 const duplicate=structuredClone(monsterGroupConfig);duplicate.maps.glade[0].id=duplicate.maps.town[0].id;expect(()=>validateMonsterGroupConfig(duplicate)).toThrow();
 const badCenter=structuredClone(monsterGroupConfig);badCenter.maps.glade[0].x=Infinity;expect(()=>validateMonsterGroupConfig(badCenter)).toThrow();
});

for(const zone of Object.keys(zones) as ZoneId[])test(`${zone} all broad-cell homes rush around obstacles to their stationary trigger`,()=>{
 for(const g of zoneMonsterGroups(zone))for(const offset of [0,2]){
  const s=new Simulation(()=>.5,undefined,null);s.save.zone=zone;s.populateZone(zone);for(const m of s.monsters)s.balance[m.kind]={atk:0};s.x=g.x+offset;s.z=g.z;s.save.hp=s.maxHp;
  s.monsters=s.monsters.filter(m=>m.groupId===g.id);
  const reached=new Set<number>();
  for(let n=0;n<1600;n++){s.save.hp=s.maxHp;s.tick(.025,0,0);for(const m of s.monsters)if(Math.hypot(m.x-s.x,m.z-s.z)<1.6)reached.add(m.id);}
  expect(reached.size,`${g.id} offset ${offset}`).toBe(g.count);
  expect(s.monsters.every(m=>m.aggro)).toBe(true);
 }
});
