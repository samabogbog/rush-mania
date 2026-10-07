import {test,expect} from '@playwright/test';
import baseline from '../docs/balance/catalog.json' with {type:'json'};
import {equipment,gearSets,itemBonuses,rollEquipmentDrops,setBonuses} from '../src/game/equipment';
import {classes,skills} from '../src/game/classes';
import {species,zones,questDefinitions} from '../src/game/content';
import {refineBonus,refineChance,refineCost} from '../src/game/refinement';
import {Simulation} from '../src/simulation';
import {itemMigrationConfig,salvageConfig,craftingConfig,progression,equipmentConfig,refinement,classConfig,skillRankConfig,contentConfig,economy,validateConfiguration} from '../src/config/balance';
const config=()=>structuredClone({itemMigration:itemMigrationConfig,salvage:salvageConfig,skillRanks:skillRankConfig,crafting:craftingConfig,progression,equipment:equipmentConfig,refinement,classes:classConfig,content:contentConfig,economy});
test('default complete catalogs preserve existing ids, numbers, formulas and descriptions',()=>{
 expect(equipment.map(g=>g.id)).toEqual(baseline.equipment.map(g=>g.id));expect(gearSets).toEqual(baseline.gearSets);for(const job of ['swordsman','mage','archer'] as const)expect(skills[job].map(({id,stage,branch,level,mp,cooldown,cast})=>({id,stage,branch,level,mp,cooldown,cast}))).toEqual(baseline.skills[job].map(({id,stage,branch,level,mp,cooldown,cast})=>({id,stage,branch,level,mp,cooldown,cast}))); expect(classes).toEqual(baseline.classes);expect(questDefinitions).toEqual(baseline.questDefinitions.map(q=>({...q,item:({'Amber spore':'Rune stone','Crystal dust':'Sky feather','Frost fang':'Sky feather','Rootheart core':'Shade essence'} as Record<string,string>)[q.item]||q.item})));
 for(const gear of equipment){expect(gear.materials[0][0]).toBe('Shade essence');expect(gear.materials[1][0]).toBe(gear.slot==='weapon'||gear.slot==='accessory'?'Rune stone':'Sky feather');}
 expect(Array.from({length:11},(_,i)=>refineBonus(i))).toEqual([0,10,21,33,46,60,75,91,108,126,145]);
});
test('shared runtime consumes edited balance values, then restores them',()=>{
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});
 const old=config();try{
  progression.levels[0].nextLevelXp=220;progression.hpVit=8;refinement.costBase=90;refinement.rareMultiplier=3;refinement.success[2]=.2;
  equipmentConfig.rarityMultiplier.legend=2;equipmentConfig.setBonuses.damageBonus=17;equipmentConfig.drops.levels[0].common=0;equipmentConfig.drops.levels[0].rare=0;
  const sim=new Simulation();expect(sim.maxXp).toBe(220);expect(sim.maxHp).toBe(140);
  expect(refineCost(0)).toBe(90);expect(refineChance(2,'rare')).toBeCloseTo(.6);
  expect(itemBonuses({gearId:'thornwood-blade',rarity:'legend'},false).atk).toBe(64);
  expect(setBonuses('thornwood',6).damageBonus).toBe(17);expect(rollEquipmentDrops(5,false,()=>0)).toEqual([]);
  contentConfig.normalBalance.checkpoints[0].hp=123;expect(sim.monsterSpec('Dewdrop').hp).toBe(61.5);
  skillRankConfig.levels[0].damagePercent[0]=700;expect(sim.skillList[0].power).toBe(7);
 }finally{Object.assign(progression,old.progression);refinement.success.splice(0,refinement.success.length,...old.refinement.success);Object.assign(refinement,{...old.refinement,success:refinement.success});Object.assign(equipmentConfig,old.equipment);Object.assign(contentConfig.normalBalance,old.content.normalBalance);Object.assign(classConfig.skills.swordsman[0],old.classes.skills.swordsman[0]);Object.assign(skillRankConfig,old.skillRanks);}
});
test('bad edits fail clearly before gameplay',()=>{
 for(const change of [(c:ReturnType<typeof config>)=>c.refinement.success[0]=2,c=>c.refinement.costBase=-1,c=>c.content.zones.glade.species[0]='Typo',c=>c.equipment.crafted[1].id=c.equipment.crafted[0].id,c=>c.equipment.drops.levels[1].monsterLevel=4,c=>Object.assign(c.equipment.affixRanges,{typo:[1,2]}),c=>c.economy.potionCooldown=Number.NaN]){const c=config();change(c);expect(()=>validateConfiguration(c)).toThrow(/Invalid balance config/);}
});
