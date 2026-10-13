import {test,expect} from '@playwright/test';
import {transact} from '../server/realm';
import type {Realm,Snapshot} from '../server/protocol';
import type {RealmStore} from '../server/store';
class Store implements RealmStore {
 revision=0;realm:Realm|null=null;
 async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}
 async create(r:Realm){this.realm=structuredClone(r)}
 async commit(n:number,r:Realm){if(n!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}
}
async function setup(){
 const store=new Store();let now=1000;
 const snapshots:Record<string,Snapshot>={};
 for(const id of ['a','b'])snapshots[id]=await transact(store,{id,name:id},{connect:true},now++);
 const send=async(id:string,type?:string,args:unknown[]=[],elapsed=1)=>{
  now+=elapsed;const s=snapshots[id];
  return snapshots[id]=await transact(store,{id,name:id},{commands:type?[{id:`${s.player.session.id}:${s.player.session.sequence+1}`,type,args}]:[]},now);
 };
 const ready=(id:string,level=70)=>{const p=store.realm!.players[id];p.actor.save.level=level;p.actor.x=0;p.actor.z=-11;};
 return {store,send,ready};
}
test('unpartied adventurers enter separate ruins instances and reconnect without resetting monsters',async()=>{
 const {store,send,ready}=await setup();ready('a');ready('b');
 const before=structuredClone(store.realm!.players.a.actor.save);
 const a=await send('a','travel',['ruins']),b=await send('b','travel',['ruins']);
 expect(a.player.actor.save.zone).toBe('ruins');expect(b.player.actor.save.zone).toBe('ruins');
 expect(a.player.room).not.toBe(b.player.room);expect(b.peers).toHaveLength(0);
 expect(a.community!.party).toBeNull();
 for(const key of ['gold','items','equipped','stats','points','kills'] as const)expect(a.player.actor.save[key]).toEqual(before[key]);
 const room=a.player.room!;const monster=store.realm!.rooms![room].monsters[0];monster.alive=false;monster.hp=0;monster.respawn=500;
 const reconnect=await send('a',undefined,[],15000);
 expect(reconnect.player.room).toBe(room);expect(store.realm!.rooms![room].monsters[0].alive).toBe(false);
 ready('a');await send('a','travel',['town']);await send('a');
 expect(store.realm!.rooms![room]).toBeUndefined();expect(store.realm!.rooms![b.player.room!]).toBeDefined();
});
test('solo entry retains level, portal and combat restrictions',async()=>{
 const {store,send,ready}=await setup();ready('a',69);
 let a=await send('a','travel',['ruins']);expect(a.player.actor.save.zone).toBe('glade');expect(a.player.events.at(-1)!.text).toContain('70');
 ready('a');store.realm!.players.a.actor.z=0;
 a=await send('a','travel',['ruins']);expect(a.player.actor.save.zone).toBe('glade');expect(a.player.events.at(-1)!.text).toContain('portal');
 ready('a');store.realm!.players.a.actor.target=store.realm!.rooms!.glade.monsters[0].id;
 a=await send('a','travel',['ruins']);expect(a.player.actor.save.zone).toBe('glade');expect(a.player.events.at(-1)!.text).toContain('combat');
});
test('one-member parties can enter and remaining member stays when a companion leaves',async()=>{
 const {store,send,ready}=await setup();let a=await send('a','partyCreate');const party=a.community!.party!.id;
 ready('a');a=await send('a','travel',['ruins']);expect(a.player.room).toBe('dungeon:'+party);
 await send('a','partyInvite',['b']);await send('b','partyAccept',[party]);ready('b');let b=await send('b','travel',['ruins']);expect(b.player.room).toBe(a.player.room);expect(b.peers.some(p=>p.id==='a')).toBe(true);
 b=await send('b','partyLeave');expect(b.player.actor.save.zone).toBe('town');
 a=await send('a');expect(a.player.actor.save.zone).toBe('ruins');expect(a.player.room).toBe('dungeon:'+party);
});
test('legacy zone-only ruins reconnects privately and leaving party cancels pending actions',async()=>{
 const {store,send,ready}=await setup();ready('a');
 Object.assign(store.realm!.players.a,{room:'ruins'});store.realm!.players.a.actor.save.zone='ruins';
 let a=await send('a');expect(a.player.room).not.toBe('ruins');expect(a.player.actor.save.zone).toBe('ruins');
 ready('a');await send('a','travel',['town']);a=await send('a','partyCreate');ready('a');a=await send('a','travel',['ruins']);
 const p=store.realm!.players.a;
 p.actor.cast={skillId:'swordsman-1',targetId:null,remaining:1,total:1};p.actor.destination={x:5,z:5};p.actor.route=[{x:5,z:5}];p.input=[1,0];p.inputAt=a.serverTime;
 a=await send('a','partyLeave');expect(a.player.actor.save.zone).toBe('town');expect(a.player.actor.x).toBe(0);expect(a.player.actor.z).toBe(-9);expect(a.player.actor.cast).toBeNull();expect(a.player.actor.destination).toBeNull();expect(a.player.actor.route).toHaveLength(0);expect(store.realm!.players.a.input).toEqual([0,0]);
});
