import itemMigrationData from './item-migration.json' with {type:'json'};
import salvageData from './salvage.json' with {type:'json'};
import skillRankData from './skill-ranks.json' with {type:'json'};
import craftingData from './crafting.json' with {type:'json'};
import progressionData from './progression.json' with {type:'json'};
import equipmentData from './equipment.json' with {type:'json'};
import refinementData from './refinement.json' with {type:'json'};
import classData from './classes.json' with {type:'json'};
import contentData from './content.json' with {type:'json'};
import economyData from './economy.json' with {type:'json'};
import schema from './schema.json' with {type:'json'};
/** Browser/Worker-safe validation. Reject bad edits before a game/session starts. */
export function validateBalance(value:unknown, shape:unknown, path='balance'):void {
 if(typeof shape==='string'){
  if(typeof value!==shape || (shape==='number'&&(!Number.isFinite(value)||(Number(value)<0&&!/\.(x|z)$/.test(path)))))throw new Error(`Invalid balance config ${path}: expected non-negative finite ${shape}`);
 }else if(Array.isArray(shape)){
  if(!Array.isArray(value)||value.length!==shape.length)throw new Error(`Invalid balance config ${path}: expected ${shape.length} entries`);
  shape.forEach((s,i)=>validateBalance(value[i],s,`${path}[${i}]`));
 }else if(shape&&typeof shape==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Invalid balance config ${path}: expected object`);
  for(const key of Object.keys(value))if(!Object.hasOwn(shape,key))throw new Error(`Invalid balance config ${path}.${key}: unknown key`);
  for(const [key,s] of Object.entries(shape))validateBalance((value as Record<string,unknown>)[key],s,`${path}.${key}`);
 }
}
const data={itemMigration:itemMigrationData,salvage:salvageData,skillRanks:skillRankData,crafting:craftingData,progression:progressionData,equipment:equipmentData,refinement:refinementData,classes:classData,content:contentData,economy:economyData};
export function validateConfiguration(config:typeof data){
 validateBalance(config,schema);
 if(config.itemMigration.saveVersion!==9||config.itemMigration.realmRevision!==1||new Set(config.itemMigration.retiredMaterials).size!==config.itemMigration.retiredMaterials.length||config.itemMigration.retiredMaterials.some(name=>config.crafting.materials.includes(name)))throw new Error('Invalid balance config itemMigration: revision/material identity');

 config.salvage.levels.forEach((row,i)=>{if(row.level!==[10,30,50,70,90][i])throw new Error('Invalid balance config salvage.levels: ordered gear tiers');for(const key of ['common','rare','epic'] as const)if(!Number.isSafeInteger(row[key])||row[key]<1)throw new Error('Invalid balance config salvage.levels: positive integer yields');});
 if(config.salvage.materials.offense.join('|')!=='Shade essence|Rune stone'||config.salvage.materials.defense.join('|')!=='Shade essence|Sky feather')throw new Error('Invalid balance config salvage.materials: material identities');
 if(config.salvage.sale.potionFraction>1||config.salvage.sale.gearFraction>1||!Number.isSafeInteger(config.salvage.sale.materialUnitPrice))throw new Error('Invalid balance config salvage.sale: fraction/price');

 const ranks=config.skillRanks;if(ranks.maxRank!==5||ranks.pointsPerLevel!==1||ranks.rankCost!==1||ranks.defaultAttackRadius<=0)throw new Error('Invalid balance config skillRanks: ranks/points/radius contract');
 ranks.levels.forEach((row,i)=>{if(row.unlockLevel!==(i+1)*10)throw new Error('Invalid balance config skillRanks.levels: ordered 10–100');for(const n of row.damagePercent)if(n<=0)throw new Error('Invalid balance config skillRanks.damagePercent');for(const n of row.targets)if(!Number.isInteger(n)||n<1)throw new Error('Invalid balance config skillRanks.targets');});
 if(config.crafting.materials.join('|')!=='Shade essence|Sky feather|Rune stone')throw new Error('Invalid balance config crafting.materials: fixed three-material identity');
 if(config.crafting.upgradeCount!==5)throw new Error('Invalid balance config crafting.upgradeCount: requires 5 to 1');
 for(const [key,value] of Object.entries(config.crafting.recipe))if(!Number.isSafeInteger(value)||value<1)throw new Error('Invalid balance config crafting.recipe.'+key);
 for(const [key,value] of Object.entries(config.crafting.dropCount))if(!Number.isSafeInteger(value)||value<1)throw new Error('Invalid balance config crafting.dropCount.'+key);
 if(config.crafting.primary.offense.primaryLevelDivisor<=0)throw new Error('Invalid balance config crafting.primary.offense.primaryLevelDivisor');

 const unique=(list:{id:string}[],path:string)=>{const ids=new Set<string>();for(const item of list){if(ids.has(item.id))throw new Error(`Invalid balance config ${path}: duplicate id ${item.id}`);ids.add(item.id);}};
 unique(config.equipment.crafted,'equipment.crafted');unique(config.equipment.sets,'equipment.sets');unique(config.content.quests,'content.quests');
 if(config.economy.bagCapacity!==144)throw new Error('Invalid balance config economy.bagCapacity: fixed 144-slot UI contract');
 if(config.progression.maxLevel!==100)throw new Error('Invalid balance config progression.maxLevel: fixed 10 skill stages require level 100');
 const positive=(v:number,path:string)=>{if(v<=0)throw new Error(`Invalid balance config ${path}: must be greater than zero`)};
 for(const [path,v] of Object.entries({'progression.defenseScale':config.progression.defenseScale,'equipment.affixLevelDivisor':config.equipment.affixLevelDivisor,'equipment.setBonuses.hpRegenLevelDivisor':config.equipment.setBonuses.hpRegenLevelDivisor,'progression.moveBase':config.progression.moveBase}))positive(v,path);
 config.progression.levels.forEach((row,i)=>{if(row.level!==i+1)throw new Error('Invalid balance config progression.levels: levels must be ordered 1–100');positive(row.monsterXp,'progression.levels.monsterXp');positive(row.multiplier,'progression.levels.multiplier');positive(row.nextLevelXp,'progression.levels.nextLevelXp');});
 positive(config.progression.attackRateCeiling,'progression.attackRateCeiling');
 positive(config.progression.attackAgiHalfSaturation,'progression.attackAgiHalfSaturation');
 for(const [job,entry] of Object.entries(config.classes.classes)){
  positive(entry.speed,`classes.classes.${job}.speed`);
  if(1/entry.speed>config.progression.attackRateCeiling)throw new Error(`Invalid balance config classes.classes.${job}.speed: base attack rate exceeds progression.attackRateCeiling`);
 }
 for(const [path,v] of Object.entries({'progression.pointsPerLevel':config.progression.pointsPerLevel,'progression.initial.points':config.progression.initial.points,'refinement.stoneCraftCount':config.refinement.stoneCraftCount,'refinement.rareDowngradeLevels':config.refinement.rareDowngradeLevels,...Object.fromEntries(Object.entries(config.economy.party).filter(([k])=>['maxMembers','dungeonMinMembers','dungeonLevel'].includes(k)).map(([k,v])=>['economy.party.'+k,v]))}))if(!Number.isInteger(v))throw new Error(`Invalid balance config ${path}: expected integer`);
 positive(config.refinement.stoneCraftCount,'refinement.stoneCraftCount');
 for(const [path,v] of Object.entries(config.progression.initial.stats))if(!Number.isInteger(v))throw new Error(`Invalid balance config progression.initial.stats.${path}: expected integer`);
 const probability=(v:number,path:string)=>{if(v>1)throw new Error(`Invalid balance config ${path}: probability exceeds 1`)};
 for(const [key,v] of Object.entries(config.crafting.dropChance))probability(v,`equipment.dropChance.${key}`);
 for(const [key,list] of Object.entries({...Object.fromEntries(Object.entries(config.crafting.rarityThresholds).map(([k,v])=>['material-'+k,v])),...Object.fromEntries(Object.entries(config.refinement.stoneDropThresholds).map(([k,v])=>['stone-'+k,v]))})){let last=0;for(const v of list){probability(v,key);if(v<last)throw new Error(`Invalid balance config ${key}: thresholds must ascend`);last=v;}}
 const dropRows=config.equipment.drops.levels;
 dropRows.forEach((row,i)=>{if(!Number.isInteger(row.monsterLevel)||row.monsterLevel<1||row.monsterLevel>100||(i>0&&row.monsterLevel<=dropRows[i-1].monsterLevel))throw new Error('Invalid balance config equipment.drops.levels: monster levels must ascend');if(!config.equipment.sets.some(set=>set.level===row.gearLevel))throw new Error('Invalid balance config equipment.drops.levels: unknown gear level');probability(row.common,'equipment.drops.common');probability(row.rare,'equipment.drops.rare');for(const multiplier of Object.values(config.equipment.drops.slotMultipliers))probability((row.common+row.rare)*multiplier,'equipment.drops.slot probability');});
 for(const zone of Object.values(config.content.zones))if(zone.level<1||zone.recommendedLevel<1||zone.recommendedLevel>zone.maxLevel||zone.maxLevel>100)throw new Error('Invalid balance config content.zones: entry/recommended range');
 if(config.equipment.eliteDrops.count!==2)throw new Error('Invalid balance config equipment.eliteDrops.count: elites require exactly 2');
 for(const [group,slots] of Object.entries(config.equipment.eliteDrops.groups)){const expected=group==='attack'?['weapon','accessory']:['helmet','armor','pants','boots'];if(slots.join('|')!==expected.join('|'))throw new Error('Invalid balance config equipment.eliteDrops.groups.'+group);}
 for(const tier of ['boss','mini'] as const){const weights=config.equipment.eliteDrops[tier];let total=0;for(const row of weights){probability(row.weight,'equipment.eliteDrops.'+tier);if(!['attack','defense'].includes(row.group)||!['rare','epic'].includes(row.rarity))throw new Error('Invalid balance config equipment.eliteDrops: unknown group or rarity');total+=row.weight;}if(Math.abs(total-1)>1e-10)throw new Error('Invalid balance config equipment.eliteDrops.'+tier+': weights must total 1');}
 config.equipment.eliteDrops.levels.forEach((row,i)=>{if(!Number.isInteger(row.monsterLevel)||row.monsterLevel<1||row.monsterLevel>100||(i>0&&row.monsterLevel<=config.equipment.eliteDrops.levels[i-1].monsterLevel)||!config.equipment.sets.some(set=>set.level===row.gearLevel))throw new Error('Invalid balance config equipment.eliteDrops.levels');});
 for(const tier of ['boss','mini'] as const)for(const key of ['hp','atk','defense','goldPerLevel'] as const)positive(config.content.normalBalance[tier][key],'content.normalBalance.'+tier+'.'+key);
 config.refinement.success.forEach(v=>probability(v,'refinement.success'));
 probability(config.economy.marketFee,'economy.marketFee');
 for(const [key,v] of Object.entries(config.progression.caps))if(key!=='healing')probability(v,`progression.caps.${key}`);
 probability(config.progression.critBase,'progression.critBase');
 probability(config.refinement.downgradeChance,'refinement.downgradeChance');
 if(config.refinement.cap!==config.refinement.success.length)throw new Error('Invalid balance config refinement: cap must equal success table length');
 for(const count of Object.values(config.equipment.secondaryCounts))if(!Number.isInteger(count)||count>Object.keys(config.equipment.affixRanges).length)throw new Error('Invalid balance config equipment.secondaryCounts');
 for(const [stat,[min,max]] of Object.entries(config.equipment.affixRanges))if(min>max)throw new Error(`Invalid balance config equipment.affixRanges.${stat}: min exceeds max`);
 for(const [job,list] of Object.entries(config.classes.skills)){const ids=new Set<string>();for(const s of list){if((s.effect==='guard'&&s.power>1)||s.stage<1||s.stage>10||!Number.isInteger(s.stage)||ids.has(s.id)||![0,1].includes(s.branch)||!['hit','area','stun','slow','poison'].includes(s.effect))throw new Error(`Invalid balance config classes.skills.${job}: duplicate id or unknown branch/effect`);ids.add(s.id);}}
 if(config.content.normalBalance.checkpoints.length!==19)throw new Error('Invalid balance config content.normalBalance: requires 19 checkpoints');
 config.content.normalBalance.checkpoints.forEach((row,i)=>{if(row.level!==(i+1)*5)throw new Error('Invalid balance config content.normalBalance: checkpoints must be 5–95');for(const [key,v] of Object.entries(row.drops))probability(v,'content.normalBalance.drops.'+key);for(const key of ['hp','atk','defense','gold'] as const)positive(row[key],'content.normalBalance.'+key);});
 for(const monster of Object.values(config.content.species))if(!Number.isInteger(monster.level)||monster.level<1||monster.level>100)throw new Error('Invalid balance config content.species: level must be 1–100');
 for(const [id,zone] of Object.entries(config.content.zones))for(const kind of zone.species)if(!Object.hasOwn(config.content.species,kind))throw new Error(`Invalid balance config content.zones.${id}: unknown species ${kind}`);
 for(const quest of config.content.quests)if(!Object.hasOwn(config.content.zones,quest.zone))throw new Error(`Invalid balance config content.quests.${quest.id}: unknown zone`);
 for(const n of [config.progression.maxLevel,config.economy.bagCapacity,config.refinement.cap])if(!Number.isInteger(n)||n<1)throw new Error('Invalid balance config: level/capacity/cap must be positive integers');
}
validateConfiguration(data);
export const craftingConfig=craftingData;
export const progression=progressionData;
export const equipmentConfig=equipmentData;
export const refinement=refinementData;
export const classConfig=classData;
export const contentConfig=contentData;
export const economy=economyData;

export const skillRankConfig=skillRankData;

export const salvageConfig=salvageData;

export const itemMigrationConfig=itemMigrationData;
