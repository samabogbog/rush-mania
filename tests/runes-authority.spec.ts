import {test,expect} from '@playwright/test';
import {transact} from '../server/realm';
import {Simulation} from '../src/simulation';
import {capture,type Realm,type Snapshot} from '../server/protocol';
import type {RealmStore} from '../server/store';
import {gearById,rollGear} from '../src/game/equipment';
import {runeById,runeKey,type RuneId} from '../src/game/runes';
import {community,communityCommand,shareKill} from '../server/community';
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(n:number,r:Realm){if(n!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
async function setup(){const store=new Store();let a=await transact(store,{id:'a',name:'A'},{connect:true},1000),b=await transact(store,{id:'b',name:'B'},{connect:true},1000);const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.zone='town';const g=gearById('field-coat')!,item={...rollGear(g.id,'rare',()=>.5),name:g.name,icon:g.icon,count:1};sim.addEquipmentItem(item);for(const id of ['hpRegen','mpRegen','critChance','critDamage'] as RuneId[]){const r=runeById(id)!;sim.addItem(r.name,r.icon,4,'common');}store.realm!.players.a.actor=capture(sim);store.realm!.players.a.room='town';return {store,a,b,gearId:item.id!};}
const command=(s:Snapshot,type:string,args:unknown[])=>({id:`${s.player.session.id}:${s.player.session.sequence+1}`,type,args});
test('authoritative rune commands preserve ownership and repeated requests consume/refund once',async()=>{
 const {store,gearId,...initial}=await setup();let {a,b}=initial;
 const socket=command(a,'socketRune',[gearId,0,'hpRegen','common']);a=await transact(store,{id:'a',name:'A'},{commands:[socket]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[socket]},1000);expect(a.player.actor.save.items.find(i=>i.id===runeKey('hpRegen','common'))!.count).toBe(3);
 const before=structuredClone(store.realm!.players.a.actor.save);b=await transact(store,{id:'b',name:'B'},{commands:[command(b,'unsocketRune',[gearId,0])]},1000);expect(store.realm!.players.a.actor.save).toEqual(before);expect(b.player.actor.save.items.some(i=>i.runeId)).toBe(false);
 const remove=command(a,'unsocketRune',[gearId,0]);a=await transact(store,{id:'a',name:'A'},{commands:[remove]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[remove]},1000);expect(a.player.actor.save.items.find(i=>i.id===runeKey('hpRegen','common'))!.count).toBe(4);
 const upgrade=command(a,'upgradeRune',['hpRegen','common']);a=await transact(store,{id:'a',name:'A'},{commands:[upgrade]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[upgrade]},1000);expect(a.player.actor.save.items.find(i=>i.id===runeKey('hpRegen','rare'))!.count).toBe(1);expect(a.player.actor.save.items.find(i=>i.id===runeKey('hpRegen','common'))!.count).toBe(2);
 const convert=command(a,'craft',['rune:critChance','common',['hpRegen','mpRegen','critChance','critDamage']]);a=await transact(store,{id:'a',name:'A'},{commands:[convert]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[convert]},1000);expect(a.player.actor.save.items.find(i=>i.id===runeKey('hpRegen','common'))!.count).toBe(1);expect(a.player.actor.save.items.find(i=>i.id===runeKey('critChance','common'))!.count).toBe(4);
 const reconnect=await transact(store,{id:'a',name:'A'},{connect:true},15000);expect(reconnect.player.actor.save.items).toEqual(a.player.actor.save.items);
});
test('invalid slots and rune types cannot enter stored equipment or charge inventory',async()=>{
 const {store,gearId,...initial}=await setup();let {a}=initial;const before=structuredClone(store.realm!.players.a.actor.save);
 for(const args of [[gearId,2,'hpRegen','common'],[gearId,0,'not-a-rune','common'],[gearId,0,'hpRegen','fake']]){a=await transact(store,{id:'a',name:'A'},{commands:[command(a,'socketRune',args)]},1000);expect(a.player.events.at(-1)!.text).toContain('Rune: Invalid socket request');}
 expect(store.realm!.players.a.actor.save).toEqual(before);
});
test('market and trade retain rune rarity stacks and sockets on unique equipment',async()=>{
 const {store,gearId}=await setup(),r=store.realm!,a=r.players.a,b=r.players.b;
 const sim=new Simulation(()=>.5,a.actor.save,null);expect(sim.socketRune(gearId,0,'hpRegen','common')).toBe(true);a.actor=capture(sim);const sockets=structuredClone(a.actor.save.items.find(i=>i.id===gearId)!.runes);
 const rare=runeById('hpRegen')!;const bs=new Simulation(()=>.5,b.actor.save,null);bs.addItem(rare.name,rare.icon,2,'rare');b.actor=capture(bs);
 communityCommand(r,a,'marketList',[runeKey('hpRegen','common'),2,10],1000,'rune-list');const listing=community(r).listings[0];communityCommand(r,b,'marketBuy',[listing.id],1000,'rune-buy');expect(b.actor.save.items.find(i=>i.id===runeKey('hpRegen','common'))!.count).toBe(2);expect(b.actor.save.items.find(i=>i.id===runeKey('hpRegen','rare'))!.count).toBe(2);
 for(const p of [a,b]){p.room='town';p.actor.x=0;p.actor.z=0;p.lastSeen=1000;}communityCommand(r,a,'tradeInvite',['b'],1000,'invite');const t=community(r).trades[0];communityCommand(r,b,'tradeAccept',[t.id],1000,'accept');communityCommand(r,a,'tradeOffer',[t.id,{item:gearId,count:1,gold:0}],1000,'offer-a');communityCommand(r,b,'tradeOffer',[t.id,{item:'',count:0,gold:0}],1000,'offer-b');communityCommand(r,a,'tradeConfirm',[t.id],1000,'confirm-a');communityCommand(r,b,'tradeConfirm',[t.id],1000,'confirm-b');expect(b.actor.save.items.find(i=>i.id===gearId)!.runes).toEqual(sockets);expect(a.actor.save.items.some(i=>i.id===gearId)).toBe(false);
});
