import {salvageConfig,economy} from '../config/balance';
import {gearById,itemRarity,type GearInstance} from './equipment';
import {craftCost,isCraftMaterial,materialKey} from './crafting';
import {EXP_CHARM,EXP_TOME} from './items';
/** Legacy material stacks without IDs still resolve by name AND rarity, never by name alone. */
export function inventoryKey(item:{id?:string;name:string;rarity?:import('./equipment').Rarity}){return item.id||(isCraftMaterial(item.name)?materialKey(item.name,item.rarity||'common'):item.name);}
export function salvageYield(item:GearInstance){
 const gear=item.gearId?gearById(item.gearId):undefined,rarity=itemRarity(item);
 if(!gear||(rarity==='ancient'||rarity==='legend'))return [];
 const row=[...salvageConfig.levels].reverse().find(row=>gear.level>=row.level)||salvageConfig.levels[0];
 const group=gear.slot==='weapon'||gear.slot==='accessory'?'offense':'defense';
 return salvageConfig.materials[group].map(name=>({name,rarity,count:row[rarity]}));
}
export function itemSalePrice(item:GearInstance&{name:string}){
 const sale=salvageConfig.sale,gear=item.gearId?gearById(item.gearId):undefined;
 if(gear)return Math.floor((gear.cost||craftCost(gear))*sale.gearFraction*sale.rarityMultipliers[itemRarity(item)]);
 if(item.name===EXP_CHARM.name||item.name===EXP_TOME.name)return 0;
 if(item.name==='Red potion'||item.name==='Blue potion')return Math.floor(economy[item.name==='Red potion'?'redPotion':'bluePotion'].cost*sale.potionFraction);
 return sale.materialUnitPrice;
}
