import {test,expect} from '@playwright/test';
import {MovementReplay} from '../src/game/realtime-network';
import {EntityPresentation,LocalPresentation} from '../src/game/network-presentation';
test('movement acknowledgements discard old frames and replay only pending direction with collision',()=>{const replay=new MovementReplay();replay.record(1,[1,0],.05);replay.record(2,[1,0],.05);replay.record(3,[0,1],.05);const position=replay.reconcile({x:2,z:3},1,4,p=>p.z>3.1);expect(position.x).toBeCloseTo(2.2);expect(position.z).toBe(3);expect(replay.pending).toBe(2);expect(replay.reconcile({x:4,z:5},3,4,()=>false)).toEqual({x:4,z:5});expect(replay.pending).toBe(0);});
test('realtime interpolation stays within100–200ms and held movement never reverses during correction',()=>{const entities=new EntityPresentation(200,100);for(let i=0;i<15;i++)entities.accept([{id:'peer',x:i*.1,z:0,life:'alive'}],i*100+(i%2)*35);expect(entities.delayMs).toBeGreaterThanOrEqual(100);expect(entities.delayMs).toBeLessThanOrEqual(200);const view=new LocalPresentation({x:1,z:0});view.reconcile({x:0,z:0});for(let i=0;i<30;i++){const before=view.position.x;view.tick(1/60,{x:4,z:0},100,()=>false);expect(view.position.x).toBeGreaterThan(before)} });

test('client snapshots preserve authoritative ground loot and collect remains a server command',async()=>{
 const {NetworkSimulation}=await import('../src/game/network');const {freshRealm,transact}=await import('../server/realm');
 let realm=freshRealm(1000),revision=0;const store={async read(){return{realm:structuredClone(realm),revision}},async create(){},async commit(expected:number,next:typeof realm){if(expected!==revision)return false;realm=structuredClone(next);revision++;return true}};
 const snapshot=await transact(store,{id:'loot-client',name:'Loot client'},{connect:true},1000);
 const drop={x:1,z:2,name:'Red potion',icon:'potion'};snapshot.player.actor.loot=[drop];
 class Probe extends NetworkSimulation{constructor(){super(snapshot,false)}apply(next:typeof snapshot){this.accept(next)}get pending(){return this.queue}}
 const client=new Probe(),before=structuredClone(client.save.items);expect(client.loot).toEqual([drop]);client.collect();expect(client.pending.at(-1)?.type).toBe('collect');expect(client.loot).toEqual([drop]);expect(client.save.items).toEqual(before);
 const picked=structuredClone(snapshot);picked.player.actor.loot=[];client.apply(picked);expect(client.loot).toEqual([]);client.dispose();
});

test('applied transient command prefix does not block a later collect while durability lags',async()=>{
 const {RealtimeNetworkSimulation}=await import('../src/game/realtime-network');const {freshRealm,transact}=await import('../server/realm');
 let realm=freshRealm(1000),revision=0;const store={async read(){return{realm:structuredClone(realm),revision}},async create(){},async commit(expected:number,next:typeof realm){if(expected!==revision)return false;realm=structuredClone(next);revision++;return true}};
 const snapshot=await transact(store,{id:'queue-client',name:'Queue client'},{connect:true},1000);
 const client=new RealtimeNetworkSimulation(snapshot),packets:any[]=[];(client as any).socket={readyState:WebSocket.OPEN,send(raw:string){packets.push(JSON.parse(raw))},close(){}};
 try{for(let i=0;i<8;i++)client.select(i+1);
  const applied=structuredClone(snapshot);applied.player.session.sequence=8;
  (client as any).receive({type:'snapshot',snapshot:applied,acknowledgedInput:0,durableCommandSequence:0,savedAt:1000,tickHz:20,snapshotHz:10});
  client.collect();expect(packets.at(-1).commands.some((command:any)=>command.type==='collect')).toBe(true);
  expect(client.networkDiagnostics.pendingCommands).toBe(9);
  const originalCollectId=packets.at(-1).commands.find((command:any)=>command.type==='collect').id;
  // A restarted server can resume the same session from its older durable state.
  // Bind starts a new transmission window; retained commands keep their original IDs.
  (client as any).bind((client as any).socket);
  (client as any).receive({type:'snapshot',snapshot,acknowledgedInput:0,durableCommandSequence:0,savedAt:1000,tickHz:20,snapshotHz:10});
  (client as any).transmit();expect(packets.at(-1).commands).toHaveLength(8);expect(packets.at(-1).commands[0].id).toBe(snapshot.player.session.id+':1');
  (client as any).receive({type:'snapshot',snapshot:applied,acknowledgedInput:0,durableCommandSequence:0,savedAt:1000,tickHz:20,snapshotHz:10});
  (client as any).transmit();expect(packets.at(-1).commands).toEqual([{id:originalCollectId,type:'collect',args:[]}]);
  const saved=structuredClone(applied);saved.player.session.sequence=9;
  (client as any).receive({type:'snapshot',snapshot:saved,acknowledgedInput:0,durableCommandSequence:9,savedAt:2000,tickHz:20,snapshotHz:10});expect(client.networkDiagnostics.pendingCommands).toBe(0);
 }finally{client.dispose()}
});
