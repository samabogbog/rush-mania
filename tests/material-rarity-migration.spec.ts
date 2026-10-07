import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {equipment,itemBonuses,rollGear,rarityOrder,secondaryCounts} from '../src/game/equipment';
import {craftingMaterials,materialKey,materialCount,rollMaterialDrops} from '../src/game/crafting';
import {itemCatalog,itemCategory} from '../src/game/items';
import {questDefinitions} from '../src/game/content';
import {refineBonus} from '../src/game/refinement';
import {transact} from '../server/realm';
import {community} from '../server/community';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';

test('old Legend becomes Ancient once while preserving equipped UUID, refinement, affixes and numerical bonuses',()=>{
 const sim=new Simulation(()=>.5,undefined,null),gear=equipment.find(g=>g.level===90&&g.slot==='weapon')!;
 const item={...rollGear(gear.id,'ancient',()=>.5),name:gear.name,icon:gear.icon,count:1,refine:10};
 sim.save.items=[item,{name:'Shade essence',count:7,icon:'leaf',rarity:'ancient',id:materialKey('Shade essence','ancient')}];sim.save.equipped.weapon=item.id!;
 const expected=itemBonuses(item),old=structuredClone(sim.save);old.version=8;for(const i of old.items){i.rarity='legend';if(!i.gearId)i.id=materialKey(i.name,'legend');}
 const loaded=new Simulation(()=>0,old,null),piece=loaded.save.items.find(i=>i.gearId)!;
 expect(piece).toMatchObject({id:item.id,rarity:'ancient',refine:10,secondary:item.secondary});expect(loaded.save.equipped.weapon).toBe(item.id);
 expect(itemBonuses(piece)).toEqual(expected);expect(expected.atk).toBe(Math.round(Math.round(gear.bonuses.atk!*1.45)*(1+refineBonus(10)/100)*100)/100);
 expect(materialCount(loaded.save.items,'Shade essence','ancient')).toBe(7);expect(materialCount(loaded.save.items,'Shade essence','legend')).toBe(0);
 expect(new Simulation(()=>0,structuredClone(loaded.save),null).save.items).toEqual(loaded.save.items);
 const newLegend={...rollGear(gear.id,'legend',()=>.5),name:gear.name,icon:gear.icon,count:1};loaded.save.items.push(newLegend);
 expect(new Simulation(()=>0,structuredClone(loaded.save),null).save.items.find(i=>i.id===newLegend.id)?.rarity).toBe('legend');
});

test('five tiers are ordered with unchanged Ancient stats and stronger five-affix Legend',()=>{
 expect(rarityOrder).toEqual(['common','rare','epic','ancient','legend']);expect(secondaryCounts).toEqual({common:1,rare:2,epic:3,ancient:4,legend:5});
 const gear=equipment.find(g=>g.level===90&&g.slot==='weapon')!;
 const ancient=rollGear(gear.id,'ancient',()=>.5),legend=rollGear(gear.id,'legend',()=>.5);
 expect(Object.keys(ancient.secondary!)).toHaveLength(4);expect(Object.keys(legend.secondary!)).toHaveLength(5);
 expect(itemBonuses({...legend,secondary:{}},false).atk).toBe(Math.round(gear.bonuses.atk!*1.75));
 expect(itemBonuses({...legend,secondary:{}},false).atk!).toBeGreaterThan(itemBonuses({...ancient,secondary:{}},false).atk!);
});

test('retired materials disappear without changing currency, valid materials or quest progress',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.items=[{name:'Forest mushroom',count:23,icon:'mushroom'},{name:'Honey drop',count:9,icon:'honey'},{name:'Amber antler',count:4,icon:'antler'},{name:'Shade essence',count:3,icon:'leaf',rarity:'rare'},{name:'Red potion',count:8,icon:'health-potion'}];sim.save.gold=12345;sim.save.quests={amber:{progress:12,claimed:false}};const old=structuredClone(sim.save);old.version=8;
 const loaded=new Simulation(()=>.5,old,null);expect(loaded.save.items.map(i=>i.name).sort()).toEqual(['Red potion','Shade essence']);expect(loaded.save.gold).toBe(12345);expect(loaded.save.quests.amber).toEqual({progress:12,claimed:false});expect(materialCount(loaded.save.items,'Shade essence','rare')).toBe(3);
 expect(itemCatalog.filter(i=>i.category==='material').map(i=>i.name).sort()).toEqual([...craftingMaterials].sort());
 for(const quest of questDefinitions)expect([...craftingMaterials,'Red potion','Blue potion']).toContain(quest.item);
});

test('solo drops across every farming area contain only active materials and never new Legend',()=>{
 for(const boss of [false,true])for(const roll of [0,.4,.75,.95,.999999]){const seq=[0,0,roll],drops=rollMaterialDrops(boss,()=>seq.shift()!);expect(drops[0].rarity).not.toBe('legend');expect(craftingMaterials).toContain(drops[0].name);}
 for(const zone of ['glade','orchard','marsh','frost','ruins'] as const){const sim=new Simulation(()=>0,undefined,null);sim.save.level=100;sim.populateZone(zone);sim.random=()=>0;for(const monster of [...sim.monsters])sim.hit(monster,1e12);for(const drop of sim.loot){if(itemCategory(drop.item||drop)==='material')expect(craftingMaterials).toContain(drop.name);}}
});

class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(realm:Realm){this.realm=structuredClone(realm);}async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}}
test('server migrates disconnected saves, escrow, floor loot and pending trade IDs exactly once',async()=>{
 const store=new Store();await transact(store,{id:'a',name:'A'},{connect:true},1000);await transact(store,{id:'b',name:'B'},{connect:true},1000);const realm=store.realm!;
 delete (realm as any).itemRevision;
 for(const player of Object.values(realm.players)){player.actor.save.version=8;player.actor.save.items=[];}
 const old={name:'Rune stone',count:5,icon:'ice-shard',rarity:'legend' as const,id:materialKey('Rune stone','legend')};realm.players.b.actor.save.items.push(structuredClone(old),{name:'Forest mushroom',count:50,icon:'mushroom'});
 realm.players.b.actor.loot=[{x:0,z:0,name:old.name,icon:old.icon,item:structuredClone(old)},{x:0,z:0,name:'Honey drop',icon:'honey'}];
 const c=community(realm);c.listings=[{id:'keep',seller:'b',item:structuredClone(old),price:10,at:1000},{id:'retire',seller:'b',item:{name:'Amber antler',count:2,icon:'antler'},price:7,at:1000}];
 c.trades=[{id:'trade',players:['a','b'],accepted:true,offers:{b:{item:old.id,count:5,gold:0},a:{item:'',count:0,gold:0}},confirmed:['a'],at:1000}];
 const gold=realm.players.b.actor.save.gold;
 await transact(store,{id:'a',name:'A'},{},1000);const migrated=store.realm!,b=migrated.players.b;
 expect(b.actor.save.items).toHaveLength(1);expect(b.actor.save.items[0]).toMatchObject({rarity:'ancient',id:materialKey('Rune stone','ancient'),count:5});expect(b.actor.save.gold).toBe(gold);
 expect(b.actor.loot).toHaveLength(1);expect(b.actor.loot[0].item?.rarity).toBe('ancient');
 expect(community(migrated).listings.map(l=>l.id)).toEqual(['keep']);expect(community(migrated).listings[0].item.rarity).toBe('ancient');expect(community(migrated).trades[0].offers.b.item).toBe(materialKey('Rune stone','ancient'));
 b.actor.save.items.push({...old,rarity:'legend',id:materialKey('Rune stone','legend')});await transact(store,{id:'a',name:'A'},{},1000);
 expect(materialCount(store.realm!.players.b.actor.save.items,'Rune stone','legend')).toBe(5);expect(materialCount(store.realm!.players.b.actor.save.items,'Rune stone','ancient')).toBe(5);
});

test('a pending trade of retired materials is cancelled without spending either players gold',async()=>{
 const store=new Store();await transact(store,{id:'a',name:'A'},{connect:true},1000);await transact(store,{id:'b',name:'B'},{connect:true},1000);const r=store.realm!;delete r.itemRevision;
 for(const p of Object.values(r.players))p.actor.save.version=8;
 r.players.b.actor.save.items.push({name:'Honey drop',icon:'honey',count:5});
 community(r).trades=[{id:'obsolete',players:['a','b'],accepted:true,offers:{b:{item:'Honey drop',count:5,gold:20},a:{item:'',count:0,gold:15}},confirmed:['a'],at:1000}];
 const gold=Object.fromEntries(Object.entries(r.players).map(([id,p])=>[id,p.actor.save.gold]));await transact(store,{id:'a',name:'A'},{},1000);
 expect(community(store.realm!).trades).toEqual([]);expect(Object.fromEntries(Object.entries(store.realm!.players).map(([id,p])=>[id,p.actor.save.gold]))).toEqual(gold);
});
