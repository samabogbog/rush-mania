import {itemMigrationConfig} from '../config/balance.js';
import {materialIcon} from './items.js';
import {isCraftMaterial,materialKey} from './crafting.js';
import type {Item,Simulation} from '../simulation.js';
export const retiredMaterials=new Set(itemMigrationConfig.retiredMaterials);
export const isRetiredMaterial=(item:{name:string;gearId?:string})=>!item.gearId&&retiredMaterials.has(item.name);
/** Retired materials are removed; gear UUIDs and all rolled/refined values stay intact. */
export function migrateStoredItem(item:Item,renameLegend:boolean):Item|null {
 if(isRetiredMaterial(item))return null;
 const next=structuredClone(item);
 if(renameLegend&&next.rarity==='legend')next.rarity='ancient';
 if(isCraftMaterial(next.name)&&!next.gearId){next.rarity ||= 'common';next.id=materialKey(next.name,next.rarity);next.icon=materialIcon(next.name,next.rarity);}
 return next;
}
export function migrateStoredLoot(loot:Simulation['loot'],renameLegend:boolean):Simulation['loot'] {
 return loot.flatMap(drop=>{
  if(isRetiredMaterial(drop.item||drop))return [];
  const item=drop.item?migrateStoredItem(drop.item,renameLegend):undefined;
  return [{...drop,...(item?{item,icon:item.icon}:isCraftMaterial(drop.name)?{icon:materialIcon(drop.name)}:{})}];
 });
}
