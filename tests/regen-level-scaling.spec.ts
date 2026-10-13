import {test,expect} from '@playwright/test';
import {equipment,rollGear,secondaryRollMaximum,secondaryRollQuality,secondaryRollValue} from '../src/game/equipment';
import {Simulation} from '../src/simulation';
import {equipmentConfig} from '../src/config/balance';
for(const [level,hp,mp] of [[10,.2,.3],[30,.23,.35],[50,.25,.4],[70,.28,.45],[90,.3,.5]])test(`Lv${level} actual generated gear respects HP/MP maxima and quality`,()=>{
 const gear=equipment.find(g=>g.level===level)!;expect(gear).toBeDefined();
 for(const [key,max] of [['hpRegen',hp],['mpRegen',mp]] as const){
  const selection=(Object.keys(equipmentConfig.affixRanges).indexOf(key)+.5)/Object.keys(equipmentConfig.affixRanges).length;
  for(const maxRoll of [false,true]){let n=0;const item=rollGear(gear.id,'common',()=>n++===0?selection:1,maxRoll);expect(item.secondary).toEqual({[key]:max});}
  expect(secondaryRollMaximum(key,level)).toBe(max);expect(secondaryRollQuality(key,max,level)).toBe('excellent');
  for(const roll of [0,.1,.3,.5,.9,1])expect(secondaryRollValue(key,level,roll)).toBeLessThanOrEqual(max);
 }
});
test('existing low-level gear regeneration rolls survive loading without reroll or retroactive reduction',()=>{
 const sim=new Simulation(()=>.5,undefined,null),gear=equipment.find(g=>g.level===10)!;
 const item={...rollGear(gear.id,'rare',()=>.5),count:1,secondary:{hpRegen:.3,mpRegen:.5}};sim.addEquipmentItem(item);sim.equip(item.id!);
 const loaded=new Simulation(()=>.5,structuredClone(sim.save),null);expect(loaded.save.items.find(i=>i.id===item.id)!.secondary).toEqual({hpRegen:.3,mpRegen:.5});expect(loaded.save.equipped).toEqual(sim.save.equipped);
});
