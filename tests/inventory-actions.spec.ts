import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {equipment,rollGear,itemBonuses,BAG_CAPACITY,type Rarity} from '../src/game/equipment';
import {inventoryKey,salvageYield,itemSalePrice} from '../src/game/inventory-actions';
import {materialCount} from '../src/game/crafting';
import {salvageConfig,skillRankConfig,contentConfig,equipmentConfig,progression,craftingConfig,refinement,classConfig,economy,validateConfiguration} from '../src/config/balance';
import {transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
function fresh(){const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.items=[];s.save.equipped={weapon:null,helmet:null,armor:null,pants:null,boots:null,accessory:null};return s;}
function add(s:Simulation,level=10,slot='weapon',rarity:Rarity='common'){const gear=equipment.find(g=>g.level===level&&g.slot===slot)!;const item={...rollGear(gear.id,rarity,()=>.5),name:gear.name,icon:gear.icon,count:1};s.save.items.push(item);return item;}
test('new affix counts are 1/2/3/4 with unique stats; existing secondary rolls stay unchanged',()=>{
 for(const [rarity,count] of [['common',1],['rare',2],['epic',3],['legend',4]] as const){const s=fresh(),item=add(s,10,'weapon',rarity);expect(Object.keys(item.secondary!)).toHaveLength(count);item.secondary={critChance:3.2,goldBonus:6};const before=structuredClone(item.secondary),bonuses=itemBonuses(item);const loaded=new Simulation(()=>0,structuredClone(s.save),null);expect(loaded.save.items[0].secondary).toEqual(before);expect(itemBonuses(loaded.save.items[0])).toEqual(bonuses);}
});
test('all five tiers, six slots and rarities yield EACH correct material count with matching rarity',()=>{
 const counts=[[2,1,1],[2,2,1],[3,2,1],[3,3,1],[4,3,1]];
 for(const [index,level] of [10,30,50,70,90].entries())for(const slot of ['weapon','accessory','helmet','armor','pants','boots'])for(const [rindex,rarity] of (['common','rare','epic'] as const).entries()){
  const s=fresh(),item=add(s,level,slot,rarity),names=['Shade essence',slot==='weapon'||slot==='accessory'?'Rune stone':'Sky feather'];expect(salvageYield(item)).toEqual(names.map(name=>({name,rarity,count:counts[index][rindex]})));expect(s.salvageItem(item.id!)).toBe(true);expect(s.save.items.some(i=>i.id===item.id)).toBe(false);for(const name of names)expect(materialCount(s.save.items,name,rarity)).toBe(counts[index][rindex]);expect(new Set(s.save.items.map(inventoryKey)).size).toBe(2);
 }
 const s=fresh(),gear=equipment.find(g=>g.level<10)!;expect(salvageYield({gearId:gear.id,rarity:'common'}).map(y=>y.count)).toEqual([2,2]);const legacy=equipment.find(g=>g.level>10&&g.level<30)!;expect(salvageYield({gearId:legacy.id,rarity:'rare'}).map(y=>y.count)).toEqual([1,1]);
});
test('salvage is atomic with a full bag, merges matching rarity only and rejects Legend/equipped gear',()=>{
 const s=fresh(),item=add(s);while(s.save.items.length<BAG_CAPACITY)s.save.items.push({name:`Filler${s.save.items.length}`,icon:'leaf',count:1});const before=structuredClone(s.save);expect(s.salvageItem(item.id!)).toBe(false);expect(s.save).toEqual(before);
 s.save.items.pop();expect(s.salvageItem(item.id!)).toBe(true);expect(s.save.items).toHaveLength(BAG_CAPACITY);
 const merged=fresh(),piece=add(merged);merged.addItem('Shade essence','leaf',3,'common');while(merged.save.items.length<BAG_CAPACITY)merged.save.items.push({name:`Filler${merged.save.items.length}`,icon:'leaf',count:1});expect(merged.salvageItem(piece.id!)).toBe(true);expect(materialCount(merged.save.items,'Shade essence','common')).toBe(5);expect(merged.save.items).toHaveLength(BAG_CAPACITY);
 const wrong=fresh(),rare=add(wrong,10,'weapon','rare');wrong.addItem('Shade essence','leaf',3,'common');while(wrong.save.items.length<BAG_CAPACITY)wrong.save.items.push({name:`Filler${wrong.save.items.length}`,icon:'leaf',count:1});const snapshot=structuredClone(wrong.save);expect(wrong.salvageItem(rare.id!)).toBe(false);expect(wrong.save).toEqual(snapshot);
 const protectedGear=fresh(),legend=add(protectedGear,10,'weapon','legend'),worn=add(protectedGear);protectedGear.equip(worn.id!);const intact=structuredClone(protectedGear.save);expect(protectedGear.salvageItem(legend.id!)).toBe(false);expect(protectedGear.salvageItem(worn.id!)).toBe(false);expect(protectedGear.sellItem(worn.id!)).toBe(false);expect(protectedGear.save).toEqual(intact);protectedGear.unequip('weapon');expect(protectedGear.salvageItem(worn.id!)).toBe(true);
});
test('single-item sale respects exact stack rarity, counts, pricing and unique equipment identity',()=>{
 const s=fresh();s.addItem('Shade essence','leaf',3,'common');s.addItem('Shade essence','leaf',4,'rare');const rare=s.save.items.find(i=>i.rarity==='rare')!,gold=s.save.gold;expect(s.sellItem(inventoryKey(rare),2)).toBe(true);expect(materialCount(s.save.items,'Shade essence','common')).toBe(3);expect(materialCount(s.save.items,'Shade essence','rare')).toBe(2);expect(s.save.gold).toBe(gold+12);expect(s.sellItem('Shade essence')).toBe(false);expect(s.sellItem(inventoryKey(rare),-1)).toBe(false);expect(s.sellItem(inventoryKey(rare),3)).toBe(false);
 s.addItem('Red potion','health-potion',2);expect(itemSalePrice({name:'Red potion'})).toBe(Math.floor(economy.redPotion.cost*.5));expect(s.sellItem('Red potion')).toBe(true);expect(s.save.items.find(i=>i.name==='Red potion')!.count).toBe(1);
 const first=add(s),second=add(s);expect(s.sellItem(first.id!,2)).toBe(false);expect(s.sellItem(first.id!)).toBe(true);expect(s.save.items.some(i=>i.id===second.id)).toBe(true);expect(s.sellItem(first.id!)).toBe(false);
});
test('salvage config edits affect shared yields/prices and invalid edits fail early',()=>{
 const old=structuredClone(salvageConfig);try{salvageConfig.levels[0].common=7;salvageConfig.sale.gearFraction=.25;const s=fresh(),item=add(s);expect(salvageYield(item).map(y=>y.count)).toEqual([7,7]);expect(itemSalePrice(item)).toBe(Math.floor(10*craftingConfig.recipe.zenyPerLevel*.25));}finally{Object.assign(salvageConfig,old);}
 const cfg=()=>structuredClone({salvage:salvageConfig,skillRanks:skillRankConfig,content:contentConfig,equipment:equipmentConfig,progression,crafting:craftingConfig,refinement,classes:classConfig,economy});expect(()=>validateConfiguration(cfg())).not.toThrow();for(const change of [(c:ReturnType<typeof cfg>)=>c.salvage.levels[0].common=.5,c=>c.salvage.levels[0].rare=0,c=>c.salvage.levels[1].level=10,c=>c.salvage.materials.offense[0]='Typo',c=>c.salvage.sale.gearFraction=1.1,c=>Object.assign(c.salvage,{typo:1})]){const c=cfg();change(c);expect(()=>validateConfiguration(c)).toThrow(/Invalid balance config/);}
});
class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(r:Realm){this.realm=structuredClone(r);}async commit(rev:number,r:Realm){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}}
test('server owns item sales/salvage, rejects equipped/foreign items, preserves IDs and replay spends once',async()=>{
 const store=new Store(),user={id:'salvager',name:'Salvager'};let snap=await transact(store,user,{connect:true},1000);const s=fresh(),item=add(s,10,'weapon','rare'),sale=add(s);store.realm!.players[user.id].actor.save=structuredClone(s.save);
 const command={id:`${snap.player.session.id}:1`,type:'salvageItem',args:[item.id]};snap=await transact(store,user,{commands:[command],...{materials:999999,rarity:'legend'}} as any,1000);expect(materialCount(snap.player.actor.save.items,'Shade essence','rare')).toBe(1);snap=await transact(store,user,{commands:[command]},1000);expect(materialCount(snap.player.actor.save.items,'Rune stone','rare')).toBe(1);expect(snap.player.actor.save.items.some(i=>i.id===item.id)).toBe(false);
 const gold=snap.player.actor.save.gold,sell={id:`${snap.player.session.id}:2`,type:'sellItem',args:[sale.id,1]};snap=await transact(store,user,{commands:[sell]},1000);expect(snap.player.actor.save.gold).toBe(gold+itemSalePrice(sale));snap=await transact(store,user,{commands:[sell]},1000);expect(snap.player.actor.save.gold).toBe(gold+itemSalePrice(sale));expect(snap.player.actor.save.items.some(i=>i.id===sale.id)).toBe(false);
 const foreign={id:`${snap.player.session.id}:3`,type:'salvageItem',args:['foreign-id']};const before=structuredClone(snap.player.actor.save);snap=await transact(store,user,{commands:[foreign]},1000);expect(snap.player.actor.save).toEqual(before);
});
