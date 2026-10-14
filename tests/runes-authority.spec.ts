import {test,expect} from '@playwright/test';
import {transact,migrateRealmItems} from '../server/realm';
import {Simulation} from '../src/simulation';
import {capture,type Realm,type Snapshot} from '../server/protocol';
import type {RealmStore} from '../server/store';
import {gearById,rollGear} from '../src/game/equipment';
import {runeById,makeRuneItem,runeKey,type RuneId} from '../src/game/runes';
import {community,communityCommand,shareKill} from '../server/community';
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(n:number,r:Realm){if(n!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
async function setup(){const store=new Store();let a=await transact(store,{id:'a',name:'A'},{connect:true},1000),b=await transact(store,{id:'b',name:'B'},{connect:true},1000);const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.zone='town';const g=gearById('field-coat')!,item={...rollGear(g.id,'rare',()=>.5),name:g.name,icon:g.icon,count:1};sim.addEquipmentItem(item);for(const id of ['hpRegen','mpRegen','critChance','critDamage'] as RuneId[]){const r=runeById(id)!;sim.addItem(r.name,r.icon,4,'common');}store.realm!.players.a.actor=capture(sim);store.realm!.players.a.room='town';a.player.actor=structuredClone(store.realm!.players.a.actor);return {store,a,b,gearId:item.id!};}
const pieces=(s:Snapshot,kind:string,rarity='common')=>s.player.actor.save.items.filter(i=>i.runeId===kind&&i.rarity===rarity);
const command=(s:Snapshot,type:string,args:unknown[])=>({id:`${s.player.session.id}:${s.player.session.sequence+1}`,type,args});
test('authoritative rune commands preserve ownership and repeated requests consume/refund once',async()=>{
 const {store,gearId,...initial}=await setup();let {a,b}=initial;
 const socket=command(a,'socketRune',[gearId,0,pieces(a,'hpRegen')[2].id]);a=await transact(store,{id:'a',name:'A'},{commands:[socket]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[socket]},1000);expect(pieces(a,'hpRegen','common').length).toBe(3);
 const before=structuredClone(store.realm!.players.a.actor.save);b=await transact(store,{id:'b',name:'B'},{commands:[command(b,'unsocketRune',[gearId,0])]},1000);expect(store.realm!.players.a.actor.save).toEqual(before);expect(b.player.actor.save.items.some(i=>i.runeId)).toBe(false);
 const remove=command(a,'unsocketRune',[gearId,0]);a=await transact(store,{id:'a',name:'A'},{commands:[remove]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[remove]},1000);expect(pieces(a,'hpRegen','common').length).toBe(4);
 const upgrade=command(a,'upgradeRune',pieces(a,'hpRegen').slice(1,3).map(i=>i.id));a=await transact(store,{id:'a',name:'A'},{commands:[upgrade]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[upgrade]},1000);expect(pieces(a,'hpRegen','rare').length).toBe(1);expect(pieces(a,'hpRegen','common').length).toBe(2);
 const convert=command(a,'craft',['rune:critChance','common',['hpRegen','mpRegen','critChance','critDamage'].map(kind=>pieces(a,kind)[0].id)]);a=await transact(store,{id:'a',name:'A'},{commands:[convert]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[convert]},1000);expect(pieces(a,'hpRegen','common').length).toBe(1);expect(pieces(a,'critChance','common').length).toBe(4);
 const reconnect=await transact(store,{id:'a',name:'A'},{connect:true},15000);expect(reconnect.player.actor.save.items).toEqual(a.player.actor.save.items);
});
test('invalid slots and rune types cannot enter stored equipment or charge inventory',async()=>{
 const {store,gearId,...initial}=await setup();let {a}=initial;const before=structuredClone(store.realm!.players.a.actor.save);
 for(const args of [[gearId,2,'hpRegen','common'],[gearId,0,'not-a-rune','common'],[gearId,0,'hpRegen','fake']]){a=await transact(store,{id:'a',name:'A'},{commands:[command(a,'socketRune',args)]},1000);expect(a.player.events.at(-1)!.text).toContain('Rune:');}
 expect(store.realm!.players.a.actor.save).toEqual(before);
});
test('market and trade retain physical rune identities and sockets on unique equipment',async()=>{
 const {store,gearId}=await setup(),r=store.realm!,a=r.players.a,b=r.players.b;
 const sim=new Simulation(()=>.5,a.actor.save,null);expect(sim.socketRune(gearId,0,'hpRegen','common')).toBe(true);a.actor=capture(sim);const sockets=structuredClone(a.actor.save.items.find(i=>i.id===gearId)!.runes);
 const rare=runeById('hpRegen')!;const bs=new Simulation(()=>.5,b.actor.save,null);bs.addItem(rare.name,rare.icon,2,'rare');b.actor=capture(bs);
 const listed=a.actor.save.items.find(i=>i.runeId==='hpRegen')!;communityCommand(r,a,'marketList',[listed.id,1,10],1000,'rune-list');const listing=community(r).listings[0];communityCommand(r,b,'marketBuy',[listing.id],1000,'rune-buy');expect(b.actor.save.items.filter(i=>i.runeId==='hpRegen'&&i.rarity==='common').length).toBe(1);expect(b.actor.save.items.filter(i=>i.runeId==='hpRegen'&&i.rarity==='rare').length).toBe(2);
 for(const p of [a,b]){p.room='town';p.actor.x=0;p.actor.z=0;p.lastSeen=1000;}communityCommand(r,a,'tradeInvite',['b'],1000,'invite');const t=community(r).trades[0];communityCommand(r,b,'tradeAccept',[t.id],1000,'accept');communityCommand(r,a,'tradeOffer',[t.id,{item:gearId,count:1,gold:0}],1000,'offer-a');communityCommand(r,b,'tradeOffer',[t.id,{item:'',count:0,gold:0}],1000,'offer-b');communityCommand(r,a,'tradeConfirm',[t.id],1000,'confirm-a');communityCommand(r,b,'tradeConfirm',[t.id],1000,'confirm-b');expect(b.actor.save.items.find(i=>i.id===gearId)!.runes).toEqual(sockets);expect(a.actor.save.items.some(i=>i.id===gearId)).toBe(false);
});
test('legacy market bundles preserve total price, reject full buyers, and cancel without losing excess pieces',async()=>{
 const {store}=await setup(),r=store.realm!,a=r.players.a,b=r.players.b;r.itemRevision=3;
 community(r).listings=[{id:'old-bundle',seller:a.id,item:{...makeRuneItem('hpRegen','rare'),id:runeKey('hpRegen','rare'),count:5},price:100,at:1000}];
 migrateRealmItems(r);const listing=community(r).listings[0];expect(listing.price).toBe(100);expect(listing.runeBundle).toHaveLength(5);expect(listing.runeBundle!.every(i=>i.count===1)).toBe(true);const ids=listing.runeBundle!.map(i=>i.id);migrateRealmItems(r);expect(community(r).listings[0].runeBundle!.map(i=>i.id)).toEqual(ids);
 while(b.actor.save.items.length<238)b.actor.save.items.push({name:'filler-'+b.actor.save.items.length,icon:'leaf',count:1});const before=structuredClone(b.actor.save);communityCommand(r,b,'marketBuy',[listing.id],1000,'blocked-buy');expect(b.actor.save).toEqual(before);expect(community(r).listings).toHaveLength(1);
 while(a.actor.save.items.length<239)a.actor.save.items.push({name:'filler-'+a.actor.save.items.length,icon:'leaf',count:1});communityCommand(r,a,'marketCancel',[listing.id],1000,'cancel');expect(a.actor.save.items).toHaveLength(240);expect(a.actor.save.runeOverflow).toHaveLength(4);expect([...a.actor.save.items,...a.actor.save.runeOverflow!].filter(i=>ids.includes(i.id)).length).toBe(5);expect(community(r).listings).toHaveLength(0);
});
test('old stack trade offers clear safely and new rune listings cannot offer quantity greater than one',async()=>{
 const {store}=await setup(),r=store.realm!,a=r.players.a,b=r.players.b;const old={...makeRuneItem('hpRegen'),id:runeKey('hpRegen','common'),count:7};a.actor.save.items=[old];a.actor.save.version=11;r.itemRevision=3;
 community(r).trades=[{id:'old-trade',players:[a.id,b.id],accepted:true,offers:{[a.id]:{item:old.id!,count:3,gold:0},[b.id]:{item:'',count:0,gold:0}},confirmed:[a.id],at:1000}];
 migrateRealmItems(r);expect(a.actor.save.items.filter(i=>i.runeId==='hpRegen')).toHaveLength(7);expect(community(r).trades[0].offers[a.id]).toBeUndefined();expect(community(r).trades[0].confirmed).toEqual([]);
 const before=structuredClone(a.actor.save);communityCommand(r,a,'marketList',[a.actor.save.items[0].id,2,10],1000,'invalid-list');expect(a.actor.save).toEqual(before);expect(community(r).listings).toHaveLength(0);
});
test('legacy rune bundle purchase charges the original total once and transfers every physical identity',async()=>{
 const {store}=await setup(),r=store.realm!,a=r.players.a,b=r.players.b;r.itemRevision=3;b.actor.save.gold=500;
 community(r).listings=[{id:'purchase-bundle',seller:a.id,item:{...makeRuneItem('mpRegen','epic'),id:runeKey('mpRegen','epic'),count:4},price:100,at:1000}];migrateRealmItems(r);const ids=community(r).listings[0].runeBundle!.map(i=>i.id),sellerGold=a.actor.save.gold;
 communityCommand(r,b,'marketBuy',['purchase-bundle'],1000,'purchase');expect(b.actor.save.gold).toBe(400);expect(a.actor.save.gold).toBeGreaterThan(sellerGold);for(const id of ids)expect(b.actor.save.items.find(i=>i.id===id)!.count).toBe(1);expect(community(r).listings).toHaveLength(0);
 const before=structuredClone(b.actor.save);communityCommand(r,b,'marketBuy',['purchase-bundle'],1000,'retry');expect(b.actor.save).toEqual(before);
});
test('authoritative pending-rune claims reject other players and repeated command refunds only once',async()=>{
 const {store,...initial}=await setup();let {a,b}=initial;const p=store.realm!.players.a;p.actor.save.runeOverflow=[makeRuneItem('lifesteal','legend'),makeRuneItem('lifesteal','legend')];const ids=p.actor.save.runeOverflow.map(i=>i.id);
 b=await transact(store,{id:'b',name:'B'},{commands:[command(b,'claimRuneOverflow',[])]},1000);expect(b.player.actor.save.items.some(i=>ids.includes(i.id))).toBe(false);expect(store.realm!.players.a.actor.save.runeOverflow).toHaveLength(2);
 const claim=command(a,'claimRuneOverflow',[]);a=await transact(store,{id:'a',name:'A'},{commands:[claim]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[claim]},1000);expect(a.player.actor.save.runeOverflow).toEqual([]);expect(a.player.actor.save.items.filter(i=>ids.includes(i.id))).toHaveLength(2);
});

test('authoritative conversion of four same-kind UUIDs consumes once and rejects repeated or foreign UUIDs',async()=>{
 const {store,...initial}=await setup();let {a,b}=initial;const owned=pieces(a,'hpRegen').map(i=>i.id),before=structuredClone(store.realm!.players.a.actor.save);
 a=await transact(store,{id:'a',name:'A'},{commands:[command(a,'craft',['rune:damageBonus','common',[owned[0],owned[0],owned[1],owned[2]]])]},1000);expect(a.player.actor.save).toEqual(before);
 b=await transact(store,{id:'b',name:'B'},{commands:[command(b,'craft',['rune:damageBonus','common',owned])]},1000);expect(b.player.actor.save.items.some(i=>i.runeId==='damageBonus')).toBe(false);expect(store.realm!.players.a.actor.save).toEqual(before);
 const c=command(a,'craft',['rune:damageBonus','common',owned]);a=await transact(store,{id:'a',name:'A'},{commands:[c]},1000);a=await transact(store,{id:'a',name:'A'},{commands:[c]},1000);expect(pieces(a,'hpRegen')).toHaveLength(0);expect(pieces(a,'damageBonus')).toHaveLength(1);expect(pieces(a,'damageBonus')[0].count).toBe(1);
});
