import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {species,zones} from '../src/game/content';
import {gearById} from '../src/game/equipment';
import {transact,freshRealm} from '../server/realm';
import {capture,type Realm,type Snapshot} from '../server/protocol';
import type {RealmStore} from '../server/store';
class Store implements RealmStore {revision=0;realm:Realm|null=null;async read(){return this.realm?{revision:this.revision,realm:structuredClone(this.realm)}:null}async create(realm:Realm){this.realm=structuredClone(realm)}async commit(r:number,realm:Realm){if(r!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true}}
const identity={id:'hero',name:'Sprout'};
const command=(s:Snapshot,type:string,args:unknown[]=[])=>({id:`${s.player.session.id}:${s.player.session.sequence+1}`,type,args});
test('crafting consumes exact ingredients, creates unique weapons and keeps refinement on its instance',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.gold=200;const before=structuredClone(sim.save);
 expect(sim.craft('sprout-blade')).toBe(false);expect(sim.save).toEqual(before);
 sim.addItem('Dew jelly','💧',8);sim.addItem('Verdant leaf','🌿',6);expect(sim.craft('sprout-blade')).toBe(true);
 const first=sim.save.items.find(i=>i.gearId==='sprout-blade')!;expect(sim.save.gold).toBe(160);const damage=sim.damage;
 expect(sim.equip(first.id!)).toBe(true);expect(sim.damage).toBe(damage+16);sim.upgrade();expect(first.refine).toBe(1);expect(sim.save.gold).toBe(100);expect(sim.damage).toBe(damage+23);
 expect(sim.craft('sprout-blade')).toBe(true);const second=sim.save.items.filter(i=>i.gearId==='sprout-blade')[1];expect(second.id).not.toBe(first.id);
 sim.equip(second.id!);expect(sim.damage).toBe(damage+16);sim.equip(first.id!);expect(sim.damage).toBe(damage+23);
 sim.sell();expect(sim.save.items.find(i=>i.id===first.id)?.count).toBe(1);expect(sim.save.items.find(i=>i.id===second.id)?.count).toBe(1);
 sim.setClass('mage');expect(sim.save.equipped.weapon).toBeNull();expect(sim.equip(first.id!)).toBe(false);
});
test('equipment cannot generate free health, quest rewards cannot be claimed twice',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.addItem('Field Coat','hero');const coat=sim.save.items.find(i=>i.gearId==='field-coat')!;
 const hp=sim.save.hp;sim.equip(coat.id!);expect(sim.maxHp).toBe(hp+30);expect(sim.save.hp).toBe(hp);sim.unequip('armor');expect(sim.save.hp).toBe(hp);
 for(const monster of sim.monsters.slice(0,15))sim.hit(monster,100000);
 expect(sim.save.quests.fieldwork.progress).toBe(15);const gold=sim.save.gold;expect(sim.claimQuest('fieldwork')).toBe(true);expect(sim.save.gold).toBe(gold+200);
 const once=structuredClone(sim.save);expect(sim.claimQuest('fieldwork')).toBe(false);expect(sim.save).toEqual(once);
});
test('the six areas contain 26 kinds; travel respects portal, levels and town safety',()=>{
 expect(Object.keys(zones)).toHaveLength(6);expect(Object.keys(species)).toHaveLength(26);
 const sim=new Simulation(()=>.5,undefined,null);expect(sim.travel('town')).toBe(false);expect(sim.save.zone).toBe('glade');expect(sim.destination).toEqual({x:0,z:-11});
 sim.x=0;sim.z=-11;expect(sim.travel('town')).toBe(true);expect(sim.monsters).toEqual([]);
 expect(sim.travel('orchard')).toBe(false);sim.save.level=20;expect(sim.travel('orchard')).toBe(true);expect(sim.monsters.every(m=>zones.orchard.species.includes(m.kind))).toBe(true);
 sim.online=true;sim.save.level=65;expect(sim.travel('ruins')).toBe(false);expect(sim.travel('ruins',true)).toBe(true);expect(sim.monsters.some(m=>species[m.kind].boss)).toBe(true);
});
test('server rooms isolate peers and retain existing monsters when a character leaves and returns',async()=>{
 const store=new Store();let s=await transact(store,identity,{connect:true},1000);await transact(store,{id:'other',name:'Mallow'},{connect:true},1100);
 s=await transact(store,identity,{commands:[command(s,'goTo',[0,-11])]},1200);
 for(let now=1400;now<=4600;now+=200)s=await transact(store,identity,{movement:[0,0]},now);
 s=await transact(store,identity,{commands:[command(s,'travel',['town'])]},4800);expect(s.player.actor.save.zone).toBe('town');expect(s.monsters).toEqual([]);expect(s.peers).toEqual([]);
 const townGold=s.player.actor.save.gold;s=await transact(store,identity,{commands:[command(s,'travel',['glade'])]},5000);expect(s.player.actor.save.zone).toBe('glade');expect(s.monsters).toHaveLength(17);expect(s.player.actor.save.gold).toBe(townGold);
 expect(Object.keys(store.realm!.rooms!)).toEqual(expect.arrayContaining(['glade','town']));
});
test('v1 online realm and v2 character saves migrate without losing gold, kills or items',async()=>{
 const store=new Store(),sim=new Simulation(()=>.5,undefined,null);sim.save.gold=333;sim.save.kills=7;
 const realm=freshRealm(1000);realm.monsters=sim.monsters;delete realm.rooms;realm.version=1;
 realm.players.hero={id:'hero',name:'Sprout',actor:capture(sim),lastSeen:0,input:[0,0],inputAt:0,acknowledged:[],events:[],serial:0,session:{id:'legacy',sequence:0}};
 for(const key of ['zone','equipped','quests','tutorial'])delete (realm.players.hero.actor.save as any)[key];realm.players.hero.actor.save.version=2;store.realm=realm;
 const s=await transact(store,identity,{connect:true},2000);expect(s.player.actor.save.gold).toBe(333);expect(s.player.actor.save.kills).toBe(7);expect(s.player.actor.save.zone).toBe('glade');expect(s.player.actor.save.equipped).toEqual({weapon:null,helmet:null,armor:null,gloves:null,boots:null,accessory:null});expect(store.realm!.version).toBe(2);expect(store.realm!.monsters).toBeUndefined();
});
