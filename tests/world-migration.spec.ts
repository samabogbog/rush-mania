import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {species,zones,type ZoneId} from '../src/game/content';
import {transact,ROOM_LAYOUT_REVISION} from '../server/realm';
import type {RealmStore} from '../server/store';
import type {Realm} from '../server/protocol';
class Store implements RealmStore {
 realm:Realm|null=null;revision=0;
 async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}
 async create(realm:Realm){this.realm=structuredClone(realm);}
 async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}
}
test('persisted zones and party rooms reconcile once without changing accounts or balance',async()=>{
 const store=new Store(),identity={id:'existing',name:'Keeper'};
 const initial=await transact(store,identity,{connect:true},1000);
 const realm=store.realm!,player=realm.players.existing;
 player.actor.save.gold=54321;player.actor.save.kills=123;player.actor.save.quests={fieldwork:{progress:12,claimed:false}};
 player.actor.save.items.push({name:'Dew jelly',icon:'💧',count:19,category:'material'});
 const saved=structuredClone(player.actor.save);realm.balance={MooncapMonarch:{hp:43210,atk:543,defense:321}};
 for(const zone of Object.keys(zones) as ZoneId[]){const sim=new Simulation(()=>.5,undefined,null);sim.populateZone(zone);realm.rooms![zone]={zone,monsters:sim.monsters.slice(0,1)};}
 realm.rooms!['dungeon:party']={zone:'ruins',monsters:[]};
 realm.community={parties:[{id:'party',leader:'existing',members:['existing'],invites:[],lootCursor:0}],friends:{},requests:{},trades:[],listings:[]};
 player.actor.target=0;player.actor.cast={skillId:'stale',targetId:0,remaining:100,total:100};player.actor.auto=true;
 player.actor.destination={x:12,z:12};player.actor.route=[{x:8,z:8}];player.actor.loot=[{x:0,z:0,name:'stale',icon:'?'}];
 const result=await transact(store,identity,{},1000);
 expect(result.player.actor.save).toEqual(saved);expect(result.player.session.id).not.toBe(initial.player.session.id);
 expect(result.player.actor.target).toBeNull();expect(result.player.actor.cast).toBeNull();expect(result.player.actor.destination).toBeNull();expect(result.player.actor.route).toEqual([]);expect(result.player.actor.loot).toEqual([]);expect(result.player.actor.auto).toBe(false);
 for(const room of Object.values(store.realm!.rooms!)){expect(room.layoutRevision).toBe(ROOM_LAYOUT_REVISION);expect(room.monsters.filter(m=>species[m.kind].boss)).toHaveLength(1);expect(room.monsters.filter(m=>species[m.kind].miniBoss)).toHaveLength(1);}
 expect(store.realm!.rooms!.glade.monsters.find(m=>m.kind==='MooncapMonarch')!.hp).toBe(43210);
 const damaged=store.realm!.rooms!.orchard.monsters[0];damaged.hp=17;
 const dead=store.realm!.rooms!.orchard.monsters[1];dead.alive=false;dead.respawn=41;
 const session=result.player.session.id;
 const second=await transact(store,identity,{},1000);
 expect(second.player.session.id).toBe(session);expect(store.realm!.rooms!.orchard.monsters[0].hp).toBe(17);expect(store.realm!.rooms!.orchard.monsters[1].respawn).toBe(41);
 expect(store.realm!.balance).toEqual({MooncapMonarch:{hp:43210,atk:543,defense:321}});
 await expect(transact(store,identity,{commands:[{id:`${initial.player.session.id}:1`,type:'select',args:[0]}]},1000)).rejects.toThrow('another session');
 const reconnected=await transact(store,identity,{connect:true},1000);expect(reconnected.player.actor.save).toEqual(saved);
});
test('legacy realm.monsters array upgrades before hydrating stale actor target',async()=>{
 const store=new Store(),identity={id:'legacy',name:'Legacy'};await transact(store,identity,{connect:true},1000);
 const realm=store.realm!;realm.version=1;realm.monsters=realm.rooms!.glade.monsters.slice(0,1);delete realm.rooms;
 realm.players.legacy.actor.target=0;realm.players.legacy.actor.auto=true;
 const result=await transact(store,identity,{},1000);
 expect(store.realm!.monsters).toBeUndefined();expect(store.realm!.rooms!.glade.layoutRevision).toBe(ROOM_LAYOUT_REVISION);
 expect(result.player.actor.target).toBeNull();expect(result.player.actor.auto).toBe(false);expect(result.monsters.length).toBeGreaterThan(1);
});
import {NetworkSimulation} from '../src/game/network';
test('online movement predicts within outer sectors and respects shared square edge',async()=>{
 const store=new Store(),snapshot=await transact(store,{id:'prediction',name:'Predict'},{connect:true},1000);
 snapshot.player.actor.x=40;snapshot.player.actor.z=40;
 const sim=new NetworkSimulation(snapshot);sim.dispose();sim.obstacles=[];
 sim.tick(.05,1,1);expect(sim.renderX).toBeGreaterThan(40);expect(sim.renderZ).toBeGreaterThan(40);
 snapshot.player.actor.x=46;snapshot.player.actor.z=46;
 const edge=new NetworkSimulation(snapshot);edge.dispose();edge.obstacles=[];edge.tick(.05,1,1);
 expect(edge.renderX).toBe(46);expect(edge.renderZ).toBe(46);
});
