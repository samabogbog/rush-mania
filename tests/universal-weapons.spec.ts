import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {equipment,gearById,gearByName,gearIcon,gearSets,gearSlots,rollEquipmentDrops,rollGear} from '../src/game/equipment';
import {migrateStoredItem,migrateStoredLoot} from '../src/game/item-migration';
import {migrateRealmItems,freshRealm} from '../server/realm';
import {capture} from '../server/protocol';
test('one canonical weapon per family and six unique slots per drop set, with compatible old IDs',()=>{
 expect(equipment.filter(g=>g.slot==='weapon')).toHaveLength(8);
 for(const set of gearSets){expect(equipment.filter(g=>g.setId===set.id)).toHaveLength(6);expect(equipment.filter(g=>g.setId===set.id).map(g=>g.slot).sort()).toEqual([...gearSlots].sort());for(const suffix of ['blade','staff','bow'])expect(gearById(set.id+'-'+suffix)?.id).toBe(set.id+'-weapon');expect(gearById(set.id+'-gloves')?.id).toBe(set.id+'-pants');expect(gearById(set.id+'-pants')?.icon).toBe(set.id+'-pants')}
 expect(gearById('bloom-staff')?.id).toBe('sprout-weapon');expect(gearByName('Willow Bow')?.name).toBe('Sprout Weapon');expect(rollGear('willow-bow','common',()=>0).gearId).toBe('sprout-weapon');
 const drops=rollEquipmentDrops(10,'normal',()=>0);expect(drops).toHaveLength(6);expect(drops.filter(d=>gearById(d.gearId!)?.slot==='weapon')[0].gearId).toBe('thornwood-weapon');
});
test('legacy weapon migration preserves UUID, refinement, rarity, secondary rolls and equipped UUID across classes',()=>{
 for(const definition of equipment.filter(g=>g.slot==='weapon'))for(const legacy of definition.legacyIds||[]){const original={id:'stable-'+legacy,gearId:legacy,name:'Old weapon',icon:'old',count:1,refine:7,rarity:'legend' as const,secondary:{critChance:7.1,hpRegen:.4}};const migrated=migrateStoredItem(original,false)!;expect(migrated).toEqual({...original,gearId:definition.id,name:definition.name,icon:definition.icon});
  const sim=new Simulation(()=>.5,undefined,null);const save=structuredClone(sim.save);save.version=9;save.level=100;save.items=[original];save.equipped.weapon=original.id;const loaded=new Simulation(()=>.5,save,null),bonuses=loaded.gearBonuses;
  for(const job of ['mage','archer','swordsman'] as const){expect(loaded.setClass(job)).toBe(true);expect(loaded.save.equipped.weapon).toBe(original.id);expect(loaded.gearBonuses).toEqual(bonuses);expect(gearIcon(definition,job)).toBe(definition.weaponIcons![job])}
  expect(loaded.save.items[0]).toMatchObject(migrated);
 }
});
test('ground loot and market escrow migrate names and canonical IDs without changing item ownership',()=>{
 const item={id:'escrow-uuid',gearId:'moonveil-staff',name:'Moonveil Staff',icon:'moonveil-staff',count:1,rarity:'legend' as const,refine:4,secondary:{critChance:3}};
 const loot=migrateStoredLoot([{x:4,z:5,name:item.name,icon:item.icon,item}],false);expect(loot[0]).toMatchObject({x:4,z:5,name:'Moonveil Weapon',item:{...item,name:'Moonveil Weapon',icon:'moonveil-blade',gearId:'moonveil-weapon'}});
 const realm=freshRealm(1000),sim=new Simulation(()=>.5,undefined,null);sim.save.version=9;sim.loot=[{x:4,z:5,name:item.name,icon:item.icon,item}];realm.itemRevision=1;realm.players.hero={id:'hero',name:'Hero',actor:capture(sim),session:{id:'session',sequence:5},lastSeen:1000,input:[0,0],inputAt:0,acknowledged:[],events:[],serial:0};realm.community={trades:[],listings:[{id:'listing',seller:'hero',item,price:123}]} as any;
 migrateRealmItems(realm);expect(realm.players.hero.actor.loot[0].item?.id).toBe(item.id);expect(realm.community!.listings[0].item.gearId).toBe('moonveil-weapon');expect(realm.community!.listings[0].price).toBe(123);expect(realm.community!.listings[0].item.rarity).toBe('legend');expect(realm.players.hero.actor.loot[0].item?.rarity).toBe('legend');expect(realm.itemRevision).toBe(2);
});
