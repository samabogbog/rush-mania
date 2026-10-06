import {craftingConfig as config} from '../config/balance';
import {rarityOrder,type Rarity,type GearDefinition} from './equipment';
export const craftingMaterials=config.materials;
export const isCraftMaterial=(name:string)=>craftingMaterials.includes(name);
export const isRarity=(value:unknown):value is Rarity=>typeof value==='string'&&rarityOrder.includes(value as Rarity);
export const materialRarity=(item:{rarity?:Rarity})=>item.rarity||'common';
export const materialKey=(name:string,rarity:Rarity)=>`material:${name}:${rarity}`;
export const sameStack=(a:{name:string;rarity?:Rarity;gearId?:string},b:{name:string;rarity?:Rarity;gearId?:string})=>!a.gearId&&!b.gearId&&a.name===b.name&&(!isCraftMaterial(a.name)||materialRarity(a)===materialRarity(b));
export const materialCount=(items:{name:string;count:number;rarity?:Rarity}[],name:string,rarity:Rarity)=>items.filter(i=>i.name===name&&materialRarity(i)===rarity).reduce((n,i)=>n+i.count,0);
export function gearRecipe(gear:GearDefinition):[string,number][]{const tier=Math.floor(gear.level/config.recipe.levelDivisor);return [['Shade essence',config.recipe.essenceBase+tier],[gear.slot==='weapon'||gear.slot==='accessory'?'Rune stone':'Sky feather',config.recipe.partnerBase+tier]];}
export const craftCost=(gear:GearDefinition)=>gear.level*config.recipe.zenyPerLevel;
export function rollMaterialDrops(boss:boolean,random=Math.random){const kind=boss?'boss':'normal';if(random()>=config.dropChance[kind])return [];const name=config.materials[Math.min(config.materials.length-1,Math.floor(random()*config.materials.length))],roll=random(),t=config.rarityThresholds[kind],rarity:Rarity=roll<t[0]?'common':roll<t[1]?'rare':roll<t[2]?'epic':'legend';return [{name,rarity,count:config.dropCount[kind]}];}
