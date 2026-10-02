import {test,expect} from '@playwright/test';
import {transact} from '../server/realm';
import type {Realm,Snapshot} from '../server/protocol';
import type {RealmStore} from '../server/store';
class Store implements RealmStore {revision=0;realm:Realm|null=null;async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(n:number,r:Realm){if(n!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
async function setup(){const store=new Store();let a=await transact(store,{id:'a',name:'A'},{connect:true},1000),b=await transact(store,{id:'b',name:'B'},{connect:true},1000);let now=1000;const send=async(id:string,s:Snapshot,type:string,args:unknown[]=[])=>transact(store,{id,name:id},{commands:[{id:`${s.player.session.id}:${s.player.session.sequence+1}`,type,args}]},now+=1);return {store,a,b,send};}
test('party membership requires invitation, friends require acceptance and dungeon rooms are party instances',async()=>{
 const {store,send,...initial}=await setup();let {a,b}=initial;
 a=await send('a',a,'partyCreate');const party=a.community!.party!;
 b=await send('b',b,'partyAccept',[party.id]);expect(b.community!.party).toBeNull();expect(b.player.events.at(-1)!.text).toContain('unavailable');
 a=await send('a',a,'partyInvite',['b']);b=await send('b',b,'partyAccept',[party.id]);expect(b.community!.party!.members).toHaveLength(2);
 a=await send('a',a,'friendRequest',['b']);expect(a.community!.friends).toHaveLength(0);b=await send('b',b,'friendAccept',['a']);expect(b.community!.friends[0].id).toBe('a');
 for(const p of Object.values(store.realm!.players)){p.actor.save.level=40;p.actor.x=0;p.actor.z=-11;}
 a=await send('a',a,'travel',['ruins']);b=await send('b',b,'travel',['ruins']);expect(a.player.room).toBe('dungeon:'+party.id);expect(b.player.room).toBe(a.player.room);expect(b.peers[0].id).toBe('a');
 b=await send('b',b,'partyLeave');expect(b.player.room).toBe('town');expect(b.player.actor.save.zone).toBe('town');
});
test('trade changes clear confirmations and repeated confirmations cannot duplicate unique equipment or gold',async()=>{
 const {store,send,...initial}=await setup();let {a,b}=initial;store.realm!.players.a.actor.save.items.push({id:'blade-unique',name:'Sprout Blade',gearId:'sprout-blade',refine:3,icon:'swords',count:1});
 a=await send('a',a,'tradeInvite',['b']);const id=a.community!.trade!.id;b=await send('b',b,'tradeAccept',[id]);
 a=await send('a',a,'tradeOffer',[id,{item:'blade-unique',count:1,gold:0}]);b=await send('b',b,'tradeOffer',[id,{item:'',count:0,gold:40}]);a=await send('a',a,'tradeConfirm',[id]);expect(a.community!.trade!.confirmed).toEqual(['a']);
 b=await send('b',b,'tradeOffer',[id,{item:'',count:0,gold:35}]);expect(b.community!.trade!.confirmed).toEqual([]);
 a=await send('a',a,'tradeConfirm',[id]);b=await send('b',b,'tradeConfirm',[id]);expect(b.community!.trade).toBeNull();expect(b.player.actor.save.gold).toBe(85);expect(b.player.actor.save.items.find(i=>i.id==='blade-unique')!.refine).toBe(3);expect(store.realm!.players.a.actor.save.gold).toBe(155);
 b=await send('b',b,'tradeConfirm',[id]);expect(b.player.actor.save.gold).toBe(85);expect(b.player.actor.save.items.filter(i=>i.id==='blade-unique')).toHaveLength(1);
});
test('market escrow, sales fee, replay protection and rollback on full bags keep total inventory consistent',async()=>{
 const {store,send,...initial}=await setup();let {a,b}=initial;a=await send('a',a,'marketList',['Red potion',3,60]);const listing=a.community!.listings[0];expect(a.player.actor.save.items.find(i=>i.name==='Red potion')!.count).toBe(5);
 const buy={id:`${b.player.session.id}:1`,type:'marketBuy',args:[listing.id]};b=await transact(store,{id:'b',name:'B'},{commands:[buy]},1010);expect(b.player.actor.save.gold).toBe(60);expect(b.player.actor.save.items.find(i=>i.name==='Red potion')!.count).toBe(11);expect(store.realm!.players.a.actor.save.gold).toBe(174);
 b=await transact(store,{id:'b',name:'B'},{commands:[buy]},1011);expect(b.player.actor.save.gold).toBe(60);expect(b.player.actor.save.items.find(i=>i.name==='Red potion')!.count).toBe(11);
 a=await send('a',a,'marketList',['Blue potion',1,20]);const cancel=a.community!.listings[0].id;a=await send('a',a,'marketCancel',[cancel]);expect(a.player.actor.save.items.find(i=>i.name==='Blue potion')!.count).toBe(4);
 // A deliberately full receiver bag must not consume buyer gold or seller escrow.
 store.realm!.players.a.actor.save.items.push({id:'rare',name:'Field Coat',gearId:'field-coat',icon:'field-coat',count:1});a=await send('a',a,'marketList',['rare',1,20]);const rare=a.community!.listings[0].id;
 store.realm!.players.b.actor.save.items=Array.from({length:60},(_,i)=>({name:'material'+i,icon:'leaf',count:1}));b=await send('b',b,'marketBuy',[rare]);expect(b.player.actor.save.gold).toBe(60);expect(b.community!.listings).toHaveLength(1);expect(b.player.events.at(-1)!.text).toBe('Recipient bag is full');
});
test('party combat splits EXP and gold, rotates materials, and mage support heals nearby allies',async()=>{
 const {store,send,...initial}=await setup();let {a,b}=initial;a=await send('a',a,'partyCreate');a=await send('a',a,'partyInvite',['b']);b=await send('b',b,'partyAccept',[a.community!.party!.id]);
 const p=store.realm!.players.a;p.actor.save.level=100;p.actor.save.job='mage';p.actor.save.mp=500;p.actor.save.stats.str=500;p.actor.x=3;p.actor.z=2;p.actor.target=0;store.realm!.rooms!.glade.monsters[0].hp=1;
 a=await send('a',a,'castSkill',['mage-1']);expect(a.player.actor.save.gold).toBeGreaterThan(120);expect(store.realm!.players.b.actor.save.gold).toBeGreaterThan(120);expect(store.realm!.players.b.actor.save.kills).toBe(1);expect(a.player.actor.save.items.some(i=>i.name==='Dew jelly')).toBe(true);
 const healId='mage-5';expect(new (await import('../src/simulation')).Simulation(()=>.5,p.actor.save,null).skillList.find(s=>s.id===healId)!.effect).toBe('heal');store.realm!.players.a.actor.cast=null;store.realm!.players.b.actor.save.hp=20;a=await send('a',a,'castSkill',[healId]);expect(store.realm!.players.b.actor.save.hp).toBeGreaterThan(20);
});
