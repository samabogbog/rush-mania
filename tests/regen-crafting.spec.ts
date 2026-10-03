import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {rollGear,gearById,BAG_CAPACITY,formatStat} from '../src/game/equipment';

test('base regen heals 0.5% of max HP each second, scales with max HP, and never revives dead actors',()=>{
 for(const level of [1,100]){
  const sim=new Simulation(()=>.5,undefined,null);sim.save.level=level;sim.populateZone('town');sim.save.hp=10;
  expect(sim.hpRegenPercent).toBe(.5);sim.tick(2,0,0);expect(sim.save.hp).toBeCloseTo(10+sim.maxHp*.01);
  sim.save.hp=sim.maxHp-.01;sim.tick(1,0,0);expect(sim.save.hp).toBe(sim.maxHp);
  sim.save.hp=0;sim.deathTime=5;sim.tick(1,0,0);expect(sim.save.hp).toBe(0);
 }
});

test('HP affixes stay at or below 0.5%/s for every item tier and combine with base regen',()=>{
 for(const id of ['thornwood-blade','suncrest-blade','moonveil-blade','frostguard-blade','starfall-blade']){
  const values=[5.1/16,.999];const rolled=rollGear(id,'rare',()=>values.shift()??.999);expect(rolled.secondary!.hpRegen).toBe(.5);
 }
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.populateZone('town');const definition=gearById('starfall-coat')!;
 sim.addEquipmentItem({...rollGear(definition.id,'rare'),name:definition.name,icon:definition.icon,count:1,secondary:{hpRegen:.5}});
 sim.equip(sim.save.items.find(i=>i.gearId===definition.id)!.id!);expect(sim.hpRegenPercent).toBe(1);sim.save.hp=100;sim.tick(1,0,0);expect(sim.save.hp).toBeCloseTo(100+sim.maxHp*.01);expect(formatStat('hpRegen',.25)).toBe('0.25%/s');
 const legacy=structuredClone(sim.save);legacy.version=4;legacy.items.find(i=>i.gearId===definition.id)!.secondary!.hpRegen=3;
 const loaded=new Simulation(()=>.5,legacy,null);expect(loaded.save.version).toBe(6);expect(loaded.save.items.find(i=>i.gearId===definition.id)!.secondary!.hpRegen).toBe(.5);expect(loaded.hpRegenPercent).toBe(1);
});

test('crafting uses the new bag capacity and rejects a full bag before charging anything',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.gold=1000;sim.addItem('Dew jelly','jelly',100);sim.addItem('Verdant leaf','leaf',100);
 for(let n=sim.save.items.length;n<70;n++)sim.save.items.push({name:'Material '+n,icon:'leaf',count:1});
 expect(sim.craft('sprout-blade')).toBe(true);expect(sim.save.items.some(i=>i.gearId==='sprout-blade')).toBe(true);
 while(sim.save.items.length<BAG_CAPACITY)sim.save.items.push({name:'Material '+sim.save.items.length,icon:'leaf',count:1});
 const before=structuredClone(sim.save);expect(sim.craft('sprout-blade')).toBe(false);expect(sim.save).toEqual(before);
});
