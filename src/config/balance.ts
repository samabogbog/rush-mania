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
const data={crafting:craftingData,progression:progressionData,equipment:equipmentData,refinement:refinementData,classes:classData,content:contentData,economy:economyData};
export function validateConfiguration(config:typeof data){
 validateBalance(config,schema);
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
 positive(1+(config.progression.initial.stats.agi-config.progression.attackAgiBase)*config.progression.attackAgiFactor,'progression.attackInterval denominator');
 for(const [path,v] of Object.entries({'progression.pointsPerLevel':config.progression.pointsPerLevel,'progression.initial.points':config.progression.initial.points,'refinement.stoneCraftCount':config.refinement.stoneCraftCount,'refinement.rareDowngradeLevels':config.refinement.rareDowngradeLevels,...Object.fromEntries(Object.entries(config.economy.party).filter(([k])=>['maxMembers','dungeonMinMembers','dungeonLevel'].includes(k)).map(([k,v])=>['economy.party.'+k,v]))}))if(!Number.isInteger(v))throw new Error(`Invalid balance config ${path}: expected integer`);
 positive(config.refinement.stoneCraftCount,'refinement.stoneCraftCount');
 for(const [path,v] of Object.entries(config.progression.initial.stats))if(!Number.isInteger(v))throw new Error(`Invalid balance config progression.initial.stats.${path}: expected integer`);
 const probability=(v:number,path:string)=>{if(v>1)throw new Error(`Invalid balance config ${path}: probability exceeds 1`)};
 for(const [key,v] of Object.entries(config.crafting.dropChance))probability(v,`equipment.dropChance.${key}`);
 for(const [key,list] of Object.entries({...Object.fromEntries(Object.entries(config.crafting.rarityThresholds).map(([k,v])=>['material-'+k,v])),...Object.fromEntries(Object.entries(config.refinement.stoneDropThresholds).map(([k,v])=>['stone-'+k,v]))})){let last=0;for(const v of list){probability(v,key);if(v<last)throw new Error(`Invalid balance config ${key}: thresholds must ascend`);last=v;}}
 const dropRows=config.equipment.drops.levels;
 dropRows.forEach((row,i)=>{if(!Number.isInteger(row.monsterLevel)||row.monsterLevel<1||row.monsterLevel>100||(i>0&&row.monsterLevel<=dropRows[i-1].monsterLevel))throw new Error('Invalid balance config equipment.drops.levels: monster levels must ascend');if(!config.equipment.sets.some(set=>set.level===row.gearLevel))throw new Error('Invalid balance config equipment.drops.levels: unknown gear level');probability(row.common,'equipment.drops.common');probability(row.rare,'equipment.drops.rare');for(const multiplier of Object.values(config.equipment.drops.slotMultipliers))probability((row.common+row.rare)*multiplier,'equipment.drops.slot probability');});
 for(const zone of Object.values(config.content.zones))if(zone.level<1||zone.recommendedLevel<1||zone.recommendedLevel>zone.maxLevel||zone.maxLevel>100)throw new Error('Invalid balance config content.zones: entry/recommended range');
 config.refinement.success.forEach(v=>probability(v,'refinement.success'));
 probability(config.economy.marketFee,'economy.marketFee');
 for(const [key,v] of Object.entries(config.progression.caps))if(key!=='attackSpeed'&&key!=='healing')probability(v,`progression.caps.${key}`);
 probability(config.progression.critBase,'progression.critBase');
 probability(config.refinement.downgradeChance,'refinement.downgradeChance');
 if(config.refinement.cap!==config.refinement.success.length)throw new Error('Invalid balance config refinement: cap must equal success table length');
 for(const count of Object.values(config.equipment.secondaryCounts))if(!Number.isInteger(count)||count>Object.keys(config.equipment.affixRanges).length)throw new Error('Invalid balance config equipment.secondaryCounts');
 for(const [stat,[min,max]] of Object.entries(config.equipment.affixRanges))if(min>max)throw new Error(`Invalid balance config equipment.affixRanges.${stat}: min exceeds max`);
 for(const [job,list] of Object.entries(config.classes.skills)){const ids=new Set<string>();for(const s of list){if((s.effect==='guard'&&s.power>1)||s.stage<1||s.stage>10||!Number.isInteger(s.stage)||ids.has(s.id)||![0,1].includes(s.branch)||!['hit','area','heal','guard','fury','stun','slow','poison'].includes(s.effect))throw new Error(`Invalid balance config classes.skills.${job}: duplicate id or unknown branch/effect`);ids.add(s.id);}}
 config.content.normalBalance.checkpoints.forEach((row,i)=>{if(row.level!==(i+1)*10)throw new Error('Invalid balance config content.normalBalance: checkpoints must be 10–90');for(const [key,v] of Object.entries(row.drops))probability(v,'content.normalBalance.drops.'+key);for(const key of ['hp','atk','defense'] as const)positive(row[key],'content.normalBalance.'+key);});
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
