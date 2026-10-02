import {test,expect} from '@playwright/test';
import {transact,freshRealm,GameError} from '../server/realm';
import {D1RealmStore} from '../server/store';
import type {RealmStore} from '../server/store';
import type {Realm,Snapshot,Command} from '../server/protocol';
import worker from '../server/worker';
class MemoryStore implements RealmStore {
 revision=0; realm:Realm|null=null; collisions=0;
 async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}
 async create(realm:Realm){if(!this.realm)this.realm=structuredClone(realm)}
 async commit(revision:number,realm:Realm){if(revision!==this.revision){this.collisions++;return false;}this.realm=structuredClone(realm);this.revision++;return true}
}
const identity={id:'player-a',name:'Sprout'};
function command(snapshot:Snapshot,type:string,args:unknown[]=[],offset=1):Command {return{id:`${snapshot.player.session.id}:${snapshot.player.session.sequence+offset}`,type,args}}
test('server owns movement, combat, inventory and persistence; reconnect cancels stale combat',async()=>{
 const store=new MemoryStore();let snap=await transact(store,identity,{connect:true},1000);
 const malicious=await transact(store,identity,{...({save:{gold:999999,level:100},x:14} as {})},1100);
 expect(malicious.player.actor.save.gold).toBe(120);expect(malicious.player.actor.save.level).toBe(1);expect(malicious.player.actor.x).toBe(0);
 snap=await transact(store,identity,{movement:[1,0]},1200);
 snap=await transact(store,identity,{movement:[1,0]},1450);
 expect(snap.player.actor.x).toBeCloseTo(1.1,1);
 await expect(transact(store,identity,{movement:[999,0]},1500)).rejects.toThrow('Invalid movement');
 snap=await transact(store,identity,{commands:[command(snap,'select',[1])],movement:[0,0]},1600);
 for(let time=1800;time<=14000;time+=200)snap=await transact(store,identity,{},time);
 expect(snap.player.actor.save.kills).toBeGreaterThan(0);expect(snap.monsters.some(m=>!m.alive)).toBe(true);
 const reconnected=await transact(store,identity,{connect:true},40000);
 expect(reconnected.player.actor.save.kills).toBe(snap.player.actor.save.kills);
 expect(reconnected.player.actor.auto).toBe(false);expect(reconnected.player.actor.target).toBeNull();
});
test('lost responses and duplicate actions charge only once; stale sessions cannot trade',async()=>{
 const store=new MemoryStore();const snap=await transact(store,identity,{connect:true},1000);
 const buy=command(snap,'buy',['Red potion']);
 const first=await transact(store,identity,{commands:[buy]},1100);
 const retry=await transact(store,identity,{commands:[buy]},1300);
 expect(first.player.actor.save.gold).toBe(105);expect(retry.player.actor.save.gold).toBe(105);
 expect(retry.player.actor.save.items.find(i=>i.name==='Red potion')?.count).toBe(9);
 const next=await transact(store,identity,{connect:true},1400);
 await expect(transact(store,identity,{commands:[buy]},1500)).rejects.toThrow('another session');
 await expect(transact(store,identity,{commands:[command(next,'buy',['Red potion'],3)]},1600)).rejects.toThrow('in order');
 const bad=[command(next,'buy',['Red potion']),command(next,'invent-money',[],2)];
 await expect(transact(store,identity,{commands:bad},1700)).rejects.toThrow('Unknown action');
 expect((await store.read())!.realm.players[identity.id].actor.save.gold).toBe(105); // Whole transaction rolls back.
});
test('two identities see the same monsters, other players, and realm chat',async()=>{
 const store=new MemoryStore();const a=await transact(store,identity,{connect:true},1000);
 const b=await transact(store,{id:'player-b',name:'Mallow'},{connect:true},1100);
 expect(b.peers.map(p=>p.name)).toContain('Sprout');
 const sent=await transact(store,identity,{commands:[command(a,'chat',['<img onerror=alert(1)>'])]},1200);
 const other=await transact(store,{id:'player-b',name:'Mallow'},{},1300);
 expect(other.chat[0].text).toBe('<img onerror=alert(1)>'); // Client renders chat with textContent.
 expect(other.monsters.map(m=>m.hp)).toEqual(sent.monsters.map(m=>m.hp));
 expect(other.peers[0].id).toBe(identity.id);
});
test('optimistic transactions retry contention without losing either reward',async()=>{
 const store=new MemoryStore();const a=await transact(store,identity,{connect:true},1000);const b=await transact(store,{id:'player-b',name:'Mallow'},{connect:true},1000);
 await Promise.all([transact(store,identity,{commands:[command(a,'buy',['Red potion'])]},1200),transact(store,{id:'player-b',name:'Mallow'},{commands:[command(b,'buy',['Blue potion'])]},1200)]);
 expect(store.collisions).toBeGreaterThan(0);
 expect(store.realm!.players['player-a'].actor.save.gold).toBe(105);expect(store.realm!.players['player-b'].actor.save.gold).toBe(100);
});
test('Worker requires dispatcher identity and rejects foreign origins',async()=>{
 const db={prepare(){throw new Error('must not touch DB')}};
 expect((await worker.fetch(new Request('https://game.test/api/game'),{DB:db})).status).toBe(401);
 expect((await worker.fetch(new Request('https://game.test/api/game',{method:'POST',headers:{'oai-authenticated-user-id':'a',Origin:'https://evil.test'},body:'{}'}),{DB:db})).status).toBe(403);
});

test('D1 prepared statements persist across store instances; operator backup requires signed owner email',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {readFileSync}=await import('node:fs');
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_lethal_lady_bullseye.sql','utf8'));
 const DB={prepare(sql:string){return{bind(...values:unknown[]){return{async first<T>(){return (sqlite.prepare(sql).get(...values as any[])??null) as T|null},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...values as any[]).changes)}}}}},async first<T>(){return null as T|null},async run(){return{meta:{changes:0}}}}}};
 const snapshot=await transact(new D1RealmStore(DB),identity,{connect:true},1000);
 await transact(new D1RealmStore(DB),identity,{commands:[command(snapshot,'buy',['Red potion'])]},1200);
 expect((await new D1RealmStore(DB).read())!.realm.players[identity.id].actor.save.gold).toBe(105);
 const env={DB,ADMIN_EMAIL:'owner@game.test'};
 const denied=await worker.fetch(new Request('https://game.test/api/operations',{headers:{'oai-authenticated-user-id':'a','oai-authenticated-user-email':'other@game.test'}}),env);
 expect(denied.status).toBe(403);
 const headers={'oai-authenticated-user-id':'a','oai-authenticated-user-email':'owner@game.test'};
 const report=await worker.fetch(new Request('https://game.test/api/operations',{headers}),env);expect(report.status).toBe(200);
 expect((await report.json()).players[0].gold).toBe(105);
 const backup=await worker.fetch(new Request('https://game.test/api/operations',{method:'POST',headers,body:'{}'}),env);expect(backup.status).toBe(200);
 expect((sqlite.prepare('SELECT count(*) AS n FROM backups').get() as any).n).toBe(1);
 sqlite.close();
});

test('another player in combat does not block class changes outside your own combat',async()=>{
 const {Simulation}=await import('../src/simulation');const a=new Simulation(()=>.5,undefined,null),b=new Simulation(()=>.5,undefined,null);
 a.actorId='a';b.actorId='b';b.monsters=a.monsters;b.hit(b.monsters[0],10);
 expect(a.setClass('mage')).toBe(true);expect(b.setClass('mage')).toBe(false);
});
