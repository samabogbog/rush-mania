import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {zones,type ZoneId} from '../src/game/content';
import {zoneMonsterGroups,zoneSpawns,zoneObstacles,protectedPosition,WORLD_BOUNDS,validateMonsterGroupConfig,monsterGroupConfig} from '../src/game/map-data';
import {transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
for(const zone of Object.keys(zones) as ZoneId[])test(`${zone} packs have six to eight members and clear ground`,()=>{
 const entries=zoneSpawns(zone),groups=zoneMonsterGroups(zone),obstacles=zoneObstacles(zone);
 expect(groups).toHaveLength(6);
 for(const g of groups){expect(entries.filter(m=>m.groupId===g.id)).toHaveLength(g.count);expect(g.count).toBeGreaterThanOrEqual(6);expect(g.count).toBeLessThanOrEqual(8);expect(protectedPosition(zone,g.x,g.z)).toBe(false);expect(obstacles.some(o=>Math.hypot(g.x-o.x,g.z-o.z)<g.radius+o.r)).toBe(false);}
 for(const g of groups){
  for(let n=0;n<32;n++){const angle=n/32*Math.PI*2,x=g.x+Math.cos(angle)*g.radius,z=g.z+Math.sin(angle)*g.radius;expect(protectedPosition(zone,x,z)).toBe(false);}
  for(const h of groups)if(h.id!==g.id)expect(Math.hypot(g.x-h.x,g.z-h.z)).toBeGreaterThan(9.6);
 }
 for(const m of entries){expect(obstacles.some(o=>Math.hypot(m.x-o.x,m.z-o.z)<o.r+.3)).toBe(false);expect(protectedPosition(zone,m.x,m.z)).toBe(false);expect(m.x).toBeGreaterThanOrEqual(WORLD_BOUNDS.minX);expect(m.x).toBeLessThanOrEqual(WORLD_BOUNDS.maxX);expect(m.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.minZ);expect(m.z).toBeLessThanOrEqual(WORLD_BOUNDS.maxZ);}
});
test('stationary territory pulls entire pack and respawns; leaving returns without healing',()=>{
 const s=new Simulation(()=>.5,undefined,null),g=zoneMonsterGroups('glade')[0];s.x=g.x;s.z=g.z;s.save.hp=s.maxHp;
 const pack=s.monsters.filter(m=>m.groupId===g.id);s.tick(.025,0,0);expect(pack.every(m=>m.aggro)).toBe(true);expect(s.target).toBeNull();
 const m=pack[0];m.alive=false;m.hp=0;m.respawn=.01;s.tick(.025,0,0);expect(m.alive&&m.aggro).toBe(true);
 m.hp=7;s.x=g.x+g.radius+1;s.tick(.025,0,0);expect(pack.every(m=>!m.aggro)).toBe(true);
 for(let n=0;n<100;n++)s.tick(.025,0,0);expect(m.hp).toBe(7);expect(m.returning).toBe(false);
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
test('layout migration preserves HP fraction, status, respawn and items exactly once',async()=>{
 const store=new Store(),id={id:'keeper',name:'Keeper'};await transact(store,id,{connect:true},1000);
 const room=store.realm!.rooms!.glade,m=room.monsters[0],s=new Simulation(()=>.5,undefined,null);
 m.hp=s.monsterSpec(m.kind).hp*.25;m.poison=3;m.poisonDamage=7;const dead=room.monsters[1];dead.alive=false;dead.hp=0;dead.respawn=9;room.layoutRevision=1;
 const items=structuredClone(store.realm!.players.keeper.actor.save.items);store.realm!.players.keeper.actor.loot=[{x:1,z:2,name:'Retained',icon:'?'}];
 const snap=await transact(store,id,{},1000),next=store.realm!.rooms!.glade;
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
 for(const key of ['radius','spawnRadius','runSpeed'] as const){const config=structuredClone(monsterGroupConfig);config[key]=0;expect(()=>validateMonsterGroupConfig(config)).toThrow();config[key]=NaN;expect(()=>validateMonsterGroupConfig(config)).toThrow();}
 for(const count of [5,9,6.5]){const config=structuredClone(monsterGroupConfig);config.maps.glade[0].count=count;expect(()=>validateMonsterGroupConfig(config)).toThrow();}
 const duplicate=structuredClone(monsterGroupConfig);duplicate.maps.glade[0].id=duplicate.maps.town[0].id;expect(()=>validateMonsterGroupConfig(duplicate)).toThrow();
 const badCenter=structuredClone(monsterGroupConfig);badCenter.maps.glade[0].x=Infinity;expect(()=>validateMonsterGroupConfig(badCenter)).toThrow();
});
