import {test,expect} from '@playwright/test';
import {transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
class MemoryStore implements RealmStore{
 realm:Realm|null=null;revision=0;
 async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}
 async create(realm:Realm){this.realm=structuredClone(realm);}
 async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}
}
const identity={id:'latency-test',name:'Latency test'};
test('700ms movement heartbeat still advances authoritative position',async()=>{
 const store=new MemoryStore();const initial=await transact(store,identity,{connect:true,movement:[1,0]},1000);
 const next=await transact(store,identity,{movement:[1,0]},1700);
 expect(next.player.actor.x-initial.player.actor.x).toBeGreaterThan(0.1);
 expect(next.player.actor.x-initial.player.actor.x).toBeLessThan(5);
});
test('expired movement input stops and reconnect cannot farm offline time',async()=>{
 const store=new MemoryStore();await transact(store,identity,{connect:true,movement:[1,0]},1000);
 const first=await transact(store,identity,{},1700);const stopped=await transact(store,identity,{},10000);
 expect(stopped.player.actor.x).toBe(first.player.actor.x);
 const resumed=await transact(store,identity,{connect:true},1000000);
 expect(resumed.player.actor.x).toBe(stopped.player.actor.x);
 expect(resumed.player.actor.auto).toBe(false);
 expect(resumed.player.actor.save.kills).toBe(stopped.player.actor.save.kills);
});
test('explicit release of movement stops on the next server step',async()=>{
 const store=new MemoryStore();await transact(store,identity,{connect:true,movement:[1,0]},1000);
 const release=await transact(store,identity,{movement:[0,0]},1200);
 const later=await transact(store,identity,{movement:[0,0]},1500);
 expect(later.player.actor.x).toBe(release.player.actor.x);
});
