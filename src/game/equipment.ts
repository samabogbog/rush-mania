import {equipmentConfig as config, economy,craftingConfig as crafting} from '../config/balance.js';
import {refineBonus} from './refinement.js';
import type {ClassId} from './classes.js';
export const gearSlots=['weapon','helmet','armor','pants','boots','accessory'] as const;
export type GearSlot=typeof gearSlots[number];
export const isGearSlot=(value:unknown):value is GearSlot=>typeof value==='string'&&gearSlots.includes(value as GearSlot);
export const BAG_CAPACITY=economy.bagCapacity;
export const rarityOrder=['common','rare','epic','ancient','legend'] as const;
export type Rarity=typeof rarityOrder[number];
export const rarityLabels:Record<Rarity,string>={common:'Common',rare:'Rare',epic:'Epic',ancient:'Ancient',legend:'Legend'};
export const secondaryCounts:Record<Rarity,number>=config.secondaryCounts;
export type SecondaryStat='critChance'|'critDamage'|'damageBonus'|'skillDamage'|'lifesteal'|'hpRegen'|'mpRegen'|'attackSpeed'|'moveSpeed'|'armorPen'|'damageReduction'|'dodgeChance'|'expBonus'|'goldBonus'|'healingBonus'|'cooldownReduction';

export type Bonuses={atk?:number;def?:number;hp?:number;mp?:number;str?:number;vit?:number;agi?:number}&Partial<Record<SecondaryStat,number>>;
export type GearDefinition={id:string;name:string;slot:GearSlot;job?:ClassId;weaponIcons?:Record<ClassId,string>;legacyIds?:string[];legacyNames?:string[];level:number;rarity:Rarity;setId?:string;dropOnly?:boolean;icon:string;bonuses:Bonuses;cost:number;materials:[string,number][];description:string};
export const equipment = structuredClone(config.crafted) as GearDefinition[];
export const gearById=(id:string)=>equipment.find(g=>g.id===id||g.legacyIds?.includes(id));
export const gearByName=(name:string)=>equipment.find(g=>g.name===name||g.legacyNames?.includes(name));

export const gearIcon=(gear:{slot?:string;icon:string;weaponIcons?:Record<ClassId,string>},job:ClassId='swordsman')=>(gear.slot==='weapon'?gear.weaponIcons?.[job]:undefined)||gear.icon;
export const statLabels:Record<keyof Bonuses,string>={atk:'ATK',def:'DEF',hp:'Max HP',mp:'Max MP',str:'STR',vit:'VIT',agi:'AGI',critChance:'Critical chance',critDamage:'Critical damage',damageBonus:'Damage bonus',skillDamage:'Skill damage',lifesteal:'Lifesteal',hpRegen:'HP regeneration',mpRegen:'MP regeneration',attackSpeed:'Attack speed',moveSpeed:'Move speed',armorPen:'Armor penetration',damageReduction:'Damage reduction',dodgeChance:'Dodge chance',expBonus:'EXP bonus',goldBonus:'Zeny bonus',healingBonus:'Healing received',cooldownReduction:'Cooldown reduction'};
export const percentStats=new Set<keyof Bonuses>(['critChance','critDamage','damageBonus','skillDamage','lifesteal','attackSpeed','moveSpeed','armorPen','damageReduction','dodgeChance','expBonus','goldBonus','healingBonus','cooldownReduction']);
export const formatStat=(key:keyof Bonuses,value:number)=>`${Math.round(value*((key==='hpRegen'||key==='mpRegen')?100:10))/((key==='hpRegen'||key==='mpRegen')?100:10)}${(key==='hpRegen'||key==='mpRegen')?'%/s':percentStats.has(key)?'%':''}`;
export function normalizeSecondary(secondary:Bonuses|undefined):Bonuses|undefined {
 if(!secondary)return undefined;
 const normalized={...secondary};
 if(normalized.hpRegen!==undefined)normalized.hpRegen=Math.max(0,Math.min(config.hpRegenPerPieceCap,normalized.hpRegen));
 if(normalized.mpRegen!==undefined)normalized.mpRegen=Math.max(0,Math.min(config.mpRegenPerPieceCap,normalized.mpRegen));
 return normalized;
}
export const gearSets=config.sets;
for(const set of gearSets){
 const lv=set.level;
 const pieces:{slot:GearSlot;suffix:string;job?:ClassId;icon:string;bonuses:Bonuses}[]=[
  {slot:'weapon',suffix:'Weapon',icon:'swords',bonuses:{}},
  {slot:'helmet',suffix:'Helmet',icon:'gear-helmet',bonuses:{}},
  {slot:'armor',suffix:'Coat',icon:set.armorIcon,bonuses:{}},
  {slot:'pants',suffix:'Pants',icon:set.id+'-pants',bonuses:{}},
  {slot:'boots',suffix:'Boots',icon:'gear-boots',bonuses:{}},
  {slot:'accessory',suffix:'Charm',icon:set.charmIcon,bonuses:{}},
 ];
 for(const piece of pieces){const formulas=config.pieceFormulas[(piece.slot==='weapon'?'blade':piece.slot==='pants'?'gloves':piece.suffix.toLowerCase()) as keyof typeof config.pieceFormulas] as Record<string,number[]>;piece.bonuses={};for(const [stat,[slope,base]] of Object.entries(formulas))piece.bonuses[stat as keyof Bonuses]=['str','agi'].includes(stat)?Math.ceil(lv/(1/slope)+base):stat==='atk'||stat==='def'?Math.round(lv*slope+base):lv*slope+base;}
 for(const piece of pieces)equipment.push({id:`${set.id}-${piece.suffix.toLowerCase()}`,name:`${set.name} ${piece.slot==='pants'?'Pants':piece.suffix}`,slot:piece.slot,job:piece.job,level:lv,rarity:'common',setId:set.id,dropOnly:true,icon:piece.slot==='weapon'?set.id+'-blade':`${set.id}-${piece.suffix.toLowerCase()}`,legacyIds:piece.slot==='weapon'?['blade','staff','bow'].map(suffix=>set.id+'-'+suffix):piece.slot==='pants'?[set.id+'-gloves']:undefined,legacyNames:piece.slot==='weapon'?['Blade','Staff','Bow'].map(suffix=>set.name+' '+suffix):piece.slot==='pants'?[set.name+' Gloves']:undefined,weaponIcons:piece.slot==='weapon'?{swordsman:set.id+'-blade',mage:set.id+'-staff',archer:set.id+'-bow'}:undefined,bonuses:piece.bonuses,cost:0,materials:[],description:set.theme});
}
for(const gear of equipment){
 const offensive=gear.slot==='weapon'||gear.slot==='accessory',o=crafting.primary.offense,d=crafting.primary.defense;
 if(offensive){const atk=gear.bonuses.atk||Math.round(gear.level*o.atkPerLevel+o.atkBase);gear.bonuses={atk,...(gear.slot==='accessory'?{}:gear.job==='archer'?{agi:Math.ceil(gear.level/o.primaryLevelDivisor)}:{str:Math.ceil(gear.level/o.primaryLevelDivisor)})};}
 else gear.bonuses={def:gear.bonuses.def||Math.round(gear.level*d.defPerLevel+d.defBase),hp:gear.bonuses.hp||gear.level*d.hpPerLevel+d.hpBase};
 const tier=Math.floor(gear.level/crafting.recipe.levelDivisor);gear.materials=[['Shade essence',crafting.recipe.essenceBase+tier],[offensive?'Rune stone':'Sky feather',crafting.recipe.partnerBase+tier]];gear.cost=gear.level*crafting.recipe.zenyPerLevel;
}
export type GearInstance={id?:string;gearId?:string;refine?:number;rarity?:Rarity;secondary?:Bonuses};
export const itemRarity=(item:GearInstance):Rarity=>item.rarity||gearById(item.gearId||'')?.rarity||'common';
export function itemBonuses(item:GearInstance,refinement=true):Bonuses {
 const gear=gearById(item.gearId||'');if(!gear)return {};
 const multiplier=config.rarityMultiplier[itemRarity(item)];
 const out:Bonuses={};for(const [key,value] of Object.entries(gear.bonuses))out[key as keyof Bonuses]=Math.round(Math.round(value*multiplier)*(refinement?1+refineBonus(item.refine||0)/100:1)*100)/100;
 for(const [key,value] of Object.entries(normalizeSecondary(item.secondary)||{}))out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
 return out;
}
const affixRanges=config.affixRanges as Record<SecondaryStat,[number,number]>;
/** Shared by generation and roll-quality UI; regen rolls use percent/sec without level scaling. */
export function secondaryRollValue(key:SecondaryStat,level:number,roll:number):number {
 const [min,max]=affixRanges[key],value=min+(max-min)*roll;
 if(key==='hpRegen'||key==='mpRegen')return Math.min(key==='hpRegen'?config.hpRegenPerPieceCap:config.mpRegenPerPieceCap,Math.round(value*100)/100);
 return Math.round(value*(config.affixFactorBase+level/config.affixLevelDivisor)*10)/10;
}
export function secondaryRollMaximum(key:SecondaryStat,level:number):number {return secondaryRollValue(key,level,1);}
export function secondaryRollQuality(key:SecondaryStat,value:number,level:number):'high'|'excellent'|undefined {
 const maximum=secondaryRollMaximum(key,level),effective=normalizeSecondary({[key]:value})![key]!;
 if(maximum<=0)return undefined;
 if(effective>=maximum*.9-Number.EPSILON*maximum)return 'excellent';
 if(effective>=maximum*.8-Number.EPSILON*maximum)return 'high';
 return undefined;
}
export function rollGear(id:string,rarity:Rarity,random= Math.random,maxRoll=false):GearInstance {
 const gear=gearById(id);if(!gear)throw new Error('Unknown equipment');
 const pool=Object.keys(affixRanges) as SecondaryStat[],secondary:Bonuses={};
 for(let n=0;n<secondaryCounts[rarity];n++){const index=Math.min(pool.length-1,Math.floor(random()*pool.length)),key=pool.splice(index,1)[0];const roll=random();secondary[key]=secondaryRollValue(key,gear.level,maxRoll?1:roll);}
 return {id:crypto.randomUUID(),gearId:gear.id,refine:0,rarity,secondary};
}
/** Rates are per slot per kill. Common/Rare are disjoint; slots roll independently.
 * Levels between table entries use the preceding row; values outside the table clamp.
 * Elite rolls use their own guaranteed two-item weighted table. */
export function equipmentDropRow(level:number){return [...config.drops.levels].reverse().find(row=>level>=row.monsterLevel)||config.drops.levels[0];}
export type EquipmentDropTier='normal'|'boss'|'mini';
export function rollEquipmentDrops(level:number,tier:EquipmentDropTier|boolean,random=Math.random):GearInstance[] {
 const kind=tier===true?'boss':tier===false?'normal':tier;
 if(kind!=='normal')return rollEliteEquipmentDrops(level,kind,random);
 const row=equipmentDropRow(level),set=gearSets.find(s=>s.level===row.gearLevel);
 if(!set)throw new Error(`Unknown equipment drop set level ${row.gearLevel}`);
 const drops:GearInstance[]=[];
 for(const slot of gearSlots){
  const multiplier=config.drops.slotMultipliers[slot],roll=random();
  const rarity:Rarity|undefined=roll<row.common*multiplier?'common':roll<(row.common+row.rare)*multiplier?'rare':undefined;
  if(!rarity)continue;
  const pool=equipment.filter(g=>g.setId===set.id&&g.slot===slot);
  const gear=pool.length===1?pool[0]:pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  drops.push(rollGear(gear.id,rarity,random));
 }
 return drops;
}
/** Two independent weighted group draws, then uniform slot choice within the group.
 * Repeated slots/items are allowed; rollGear gives every piece its own UUID/affixes. */
export function rollEliteEquipmentDrops(level:number,tier:'boss'|'mini',random=Math.random):GearInstance[] {
 const configRow=[...config.eliteDrops.levels].reverse().find(row=>level>=row.monsterLevel)||config.eliteDrops.levels[0];
 const set=gearSets.find(s=>s.level===configRow.gearLevel);
 if(!set)throw new Error(`Unknown elite drop set level ${configRow.gearLevel}`);
 const weights=config.eliteDrops[tier],drops:GearInstance[]=[];
 for(let n=0;n<config.eliteDrops.count;n++){
  const roll=random();let cumulative=0;
  const selected=weights.find(row=>{cumulative=Math.round((cumulative+row.weight)*1e15)/1e15;return roll<cumulative;})||weights[weights.length-1];
  const slots=config.eliteDrops.groups[selected.group as keyof typeof config.eliteDrops.groups];
  const slot=slots[Math.min(slots.length-1,Math.floor(random()*slots.length))];
  const pool=equipment.filter(g=>g.setId===set.id&&g.slot===slot);
  const gear=pool.length===1?pool[0]:pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  drops.push(rollGear(gear.id,selected.rarity as Rarity,random));
 }
 return drops;
}
export function setBonuses(id:string,pieces:number):Bonuses {const set=gearSets.find(s=>s.id===id);if(!set)return {};const bonuses:Bonuses={};if(pieces>=2)bonuses.hp=set.level*config.setBonuses.hpLevel;if(pieces>=4){bonuses.atk=Math.round(set.level*config.setBonuses.atkLevel);bonuses.def=Math.round(set.level*config.setBonuses.defLevel);}if(pieces>=6){bonuses.damageBonus=config.setBonuses.damageBonus;bonuses.hpRegen=Math.min(config.hpRegenPerPieceCap,Math.round(set.level/config.setBonuses.hpRegenLevelDivisor*config.setBonuses.hpRegenMax*100)/100);bonuses.moveSpeed=config.setBonuses.moveSpeed;}return bonuses;}
