import {economy} from '../config/balance';
import {equipment,gearById,gearByName} from './equipment';
import {species,questDefinitions} from './content';
import {refineStones} from './refinement';
export const EXP_TOME=economy.expTome;
export const EXP_CHARM=economy.expCharm;
export const EXP_TEST_GRANT_COUNT=1;
export const itemCategories={weapon:'Weapons',armor:'Armor',accessory:'Accessories',consumable:'Consumables',material:'Materials',refine:'Refine stones'} as const;
export type ItemCategory=keyof typeof itemCategories;
export function itemCategory(item:{name:string;gearId?:string}):ItemCategory {
 const gear=gearById(item.gearId||'')||gearByName(item.name);
 if(gear)return gear.slot==='weapon'?'weapon':gear.slot==='accessory'?'accessory':'armor';
 if(Object.values(refineStones).some(s=>s.name===item.name))return 'refine';
 if(['Red potion','Blue potion',EXP_TOME.name,EXP_CHARM.name].includes(item.name))return 'consumable';
 return 'material';
}
export const materialIcons:Record<string,string>={'Dew jelly':'jelly','Forest mushroom':'mushroom','Verdant leaf':'leaf','Honey drop':'honey','Golden honey':'honey','Soft fur':'fur','Frost fur':'fur','Boar tusk':'tusk','Amber antler':'antler','Wisp essence':'wisp-essence','Shade essence':'wisp-essence','Crystal dust':'crystal-dust','Ice shard':'ice-shard','Frost fang':'frost-fang','Sky feather':'feather','Rootheart core':'root-core','Amber leaf':'leaf','Marsh reed':'leaf','Ancient root':'leaf','Living vine':'leaf','Amber spore':'mushroom','Snow spore':'mushroom','Crystal jelly':'jelly','Rune stone':'ice-shard','Warden stone':'ice-shard','River shell':'shell-vest'};
export type CatalogItem={id:string;name:string;icon:string;category:ItemCategory;gearId?:string};
const names=new Set([...Object.values(species).map(s=>s.drop),...questDefinitions.map(q=>q.item),...equipment.flatMap(g=>g.materials.map(m=>m[0]))]);
export const itemCatalog:CatalogItem[]=[{...EXP_CHARM,category:'consumable'},{...EXP_TOME,category:'consumable'},...equipment.map(g=>({id:g.id,name:g.name,icon:g.icon,gearId:g.id,category:itemCategory(g)})),...Array.from(names).filter(name=>!name.includes('potion')).map(name=>({id:'material:'+name,name,icon:materialIcons[name]||'chest',category:'material' as const})),...['Red potion','Blue potion'].map((name,n)=>({id:'potion:'+name,name,icon:n?'mana-potion':'health-potion',category:'consumable' as const})),...Object.entries(refineStones).map(([tier,s])=>({id:'refine:'+tier,name:s.name,icon:s.icon,category:'refine' as const}))];
