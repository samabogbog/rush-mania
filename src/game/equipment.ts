import {equipmentConfig as config, economy} from '../config/balance';
import {refineBonus} from './refinement';
import type {ClassId} from './classes';
export const gearSlots=['weapon','helmet','armor','gloves','boots','accessory'] as const;
export type GearSlot=typeof gearSlots[number];
export const isGearSlot=(value:unknown):value is GearSlot=>typeof value==='string'&&gearSlots.includes(value as GearSlot);
export const BAG_CAPACITY=economy.bagCapacity;
export const rarityOrder=['common','rare','epic','legend'] as const;
export type Rarity=typeof rarityOrder[number];
export const rarityLabels:Record<Rarity,string>={common:'Common',rare:'Rare',epic:'Epic',legend:'Legend'};
export const secondaryCounts:Record<Rarity,number>=config.secondaryCounts;
export type SecondaryStat='critChance'|'critDamage'|'damageBonus'|'skillDamage'|'lifesteal'|'hpRegen'|'mpRegen'|'attackSpeed'|'moveSpeed'|'armorPen'|'damageReduction'|'dodgeChance'|'expBonus'|'goldBonus'|'healingBonus'|'cooldownReduction';

export type Bonuses={atk?:number;def?:number;hp?:number;mp?:number;str?:number;vit?:number;agi?:number}&Partial<Record<SecondaryStat,number>>;
export type GearDefinition={id:string;name:string;slot:GearSlot;job?:ClassId;level:number;rarity:Rarity;setId?:string;dropOnly?:boolean;icon:string;bonuses:Bonuses;cost:number;materials:[string,number][];description:string};
export const equipment = config.crafted as GearDefinition[];
export const gearById=(id:string)=>equipment.find(g=>g.id===id);
export const gearByName=(name:string)=>equipment.find(g=>g.name===name);

export const statLabels:Record<keyof Bonuses,string>={atk:'ATK',def:'DEF',hp:'Max HP',mp:'Max MP',str:'STR',vit:'VIT',agi:'AGI',critChance:'Critical chance',critDamage:'Critical damage',damageBonus:'Damage bonus',skillDamage:'Skill damage',lifesteal:'Lifesteal',hpRegen:'HP regeneration',mpRegen:'MP regen / sec',attackSpeed:'Attack speed',moveSpeed:'Move speed',armorPen:'Armor penetration',damageReduction:'Damage reduction',dodgeChance:'Dodge chance',expBonus:'EXP bonus',goldBonus:'Zeny bonus',healingBonus:'Healing received',cooldownReduction:'Cooldown reduction'};
export const percentStats=new Set<keyof Bonuses>(['critChance','critDamage','damageBonus','skillDamage','lifesteal','attackSpeed','moveSpeed','armorPen','damageReduction','dodgeChance','expBonus','goldBonus','healingBonus','cooldownReduction']);
export const formatStat=(key:keyof Bonuses,value:number)=>`${Math.round(value*(key==='hpRegen'?100:10))/(key==='hpRegen'?100:10)}${key==='hpRegen'?'%/s':percentStats.has(key)?'%':''}`;
export function normalizeSecondary(secondary:Bonuses|undefined):Bonuses|undefined {
 if(!secondary)return undefined;
 const normalized={...secondary};
 if(normalized.hpRegen!==undefined)normalized.hpRegen=Math.max(0,Math.min(config.hpRegenPerPieceCap,normalized.hpRegen));
 return normalized;
}
export const gearSets=config.sets;
for(const set of gearSets){
 const lv=set.level;
 const pieces:{slot:GearSlot;suffix:string;job?:ClassId;icon:string;bonuses:Bonuses}[]=[
  {slot:'weapon',suffix:'Blade',job:'swordsman',icon:'swords',bonuses:{}},
  {slot:'weapon',suffix:'Staff',job:'mage',icon:'sparkles',bonuses:{}},
  {slot:'weapon',suffix:'Bow',job:'archer',icon:'crosshair',bonuses:{}},
  {slot:'helmet',suffix:'Helmet',icon:'gear-helmet',bonuses:{}},
  {slot:'armor',suffix:'Coat',icon:set.armorIcon,bonuses:{}},
  {slot:'gloves',suffix:'Gloves',icon:'gear-gloves',bonuses:{}},
  {slot:'boots',suffix:'Boots',icon:'gear-boots',bonuses:{}},
  {slot:'accessory',suffix:'Charm',icon:set.charmIcon,bonuses:{}},
 ];
 for(const piece of pieces){const formulas=config.pieceFormulas[piece.suffix.toLowerCase() as keyof typeof config.pieceFormulas] as Record<string,number[]>;piece.bonuses={};for(const [stat,[slope,base]] of Object.entries(formulas))piece.bonuses[stat as keyof Bonuses]=['str','agi'].includes(stat)?Math.ceil(lv/(1/slope)+base):stat==='atk'||stat==='def'?Math.round(lv*slope+base):lv*slope+base;}
 for(const piece of pieces)equipment.push({id:`${set.id}-${piece.suffix.toLowerCase()}`,name:`${set.name} ${piece.suffix}`,slot:piece.slot,job:piece.job,level:lv,rarity:'common',setId:set.id,dropOnly:true,icon:`${set.id}-${piece.suffix.toLowerCase()}`,bonuses:piece.bonuses,cost:0,materials:[],description:set.theme});
}
export type GearInstance={id?:string;gearId?:string;refine?:number;rarity?:Rarity;secondary?:Bonuses};
export const itemRarity=(item:GearInstance):Rarity=>item.rarity||gearById(item.gearId||'')?.rarity||'common';
export function itemBonuses(item:GearInstance,refinement=true):Bonuses {
 const gear=gearById(item.gearId||'');if(!gear)return {};
 const multiplier=gear.dropOnly?config.rarityMultiplier[itemRarity(item)]:1;
 const out:Bonuses={};for(const [key,value] of Object.entries(gear.bonuses))out[key as keyof Bonuses]=Math.round(Math.round(value*multiplier)*(refinement?1+refineBonus(item.refine||0)/100:1)*100)/100;
 for(const [key,value] of Object.entries(normalizeSecondary(item.secondary)||{}))out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
 return out;
}
const affixRanges=config.affixRanges as Record<SecondaryStat,[number,number]>;
export function rollGear(id:string,rarity:Rarity,random= Math.random):GearInstance {
 const gear=gearById(id);if(!gear)throw new Error('Unknown equipment');
 const pool=Object.keys(affixRanges) as SecondaryStat[],secondary:Bonuses={};
 for(let n=0;n<secondaryCounts[rarity];n++){const index=Math.min(pool.length-1,Math.floor(random()*pool.length)),key=pool.splice(index,1)[0],[min,max]=affixRanges[key];const factor=config.affixFactorBase+gear.level/config.affixLevelDivisor,roll=random();secondary[key]=key==='hpRegen'?Math.min(config.hpRegenPerPieceCap,Math.round((min+(max-min)*roll)*100)/100):Math.round((min+(max-min)*roll)*factor*10)/10;}
 return {id:crypto.randomUUID(),gearId:id,refine:0,rarity,secondary};
}
export function rollEquipmentDrop(level:number,boss:boolean,random=Math.random):GearInstance|undefined {
 if(random()>=(boss ? config.dropChance.boss : config.dropChance.normal))return;
 const set=[...gearSets].reverse().find(s=>level>=s.level)||gearSets[0],pool=equipment.filter(g=>g.setId===set.id);
 const gear=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))],roll=random();
 const thresholds=boss?config.rarityThresholds.boss:config.rarityThresholds.normal;const rarity:Rarity=roll<thresholds[0]?'common':roll<thresholds[1]?'rare':roll<thresholds[2]?'epic':'legend';
 return rollGear(gear.id,rarity,random);
}
export function setBonuses(id:string,pieces:number):Bonuses {const set=gearSets.find(s=>s.id===id);if(!set)return {};const bonuses:Bonuses={};if(pieces>=2)bonuses.hp=set.level*config.setBonuses.hpLevel;if(pieces>=4){bonuses.atk=Math.round(set.level*config.setBonuses.atkLevel);bonuses.def=Math.round(set.level*config.setBonuses.defLevel);}if(pieces>=6){bonuses.damageBonus=config.setBonuses.damageBonus;bonuses.hpRegen=Math.min(config.hpRegenPerPieceCap,Math.round(set.level/config.setBonuses.hpRegenLevelDivisor*config.setBonuses.hpRegenMax*100)/100);bonuses.moveSpeed=config.setBonuses.moveSpeed;}return bonuses;}
