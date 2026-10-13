import {runeConfig} from '../config/balance.js';
import type {Bonuses,Rarity} from './equipment.js';
import type {Item} from '../simulation.js';

export type RuneId='critChance'|'critDamage'|'damageBonus'|'lifesteal'|'hpRegen'|'mpRegen'|'armorPen'|'damageReduction'|'dodgeChance'|'cooldownReduction';
export type RuneSocket={runeId:RuneId;rarity:Rarity};
export type RuneSockets=[RuneSocket|null,RuneSocket|null];
export const runeTypes=runeConfig.types.map(r=>({...r,id:r.id as RuneId,stat:r.id as RuneId,icon:'runes/'+r.id}));
export const runeById=(id:unknown)=>runeTypes.find(r=>r.id===id);
export const isRuneId=(id:unknown):id is RuneId=>typeof id==='string'&&!!runeById(id);
const runeRarity=(value:unknown):value is Rarity=>typeof value==='string'&&Object.hasOwn(runeConfig.rarityMultipliers,value);
export const runeKey=(id:RuneId,rarity:Rarity)=>`rune:${id}:${rarity}`;
export function runeValue(id:RuneId,rarity:Rarity){const rune=runeById(id);return rune&&runeRarity(rarity)?Math.round(rune.legend*runeConfig.rarityMultipliers[rarity]*1000)/1000:0;}
export function formatRuneStat(id:RuneId,value:number){return `${Math.round(value*1000)/1000}${id==='hpRegen'||id==='mpRegen'?'%/s':'%'}`;}
export function normalizeRuneSockets(value:unknown):RuneSockets{
 const out:RuneSockets=[null,null];
 if(!Array.isArray(value))return out;
 for(let slot=0;slot<2;slot++){const r=value[slot];if(r&&isRuneId(r.runeId)&&runeRarity(r.rarity)&&out[0]?.runeId!==r.runeId)out[slot]={runeId:r.runeId,rarity:r.rarity};}
 return out;
}
export function runeBonuses(sockets:unknown):Bonuses{const out:Bonuses={};for(const rune of normalizeRuneSockets(sockets))if(rune)out[rune.runeId]=(out[rune.runeId]||0)+runeValue(rune.runeId,rune.rarity);return out;}
export const hasSocketedRunes=(item:{runes?:RuneSockets})=>normalizeRuneSockets(item.runes).some(Boolean);
export function makeRuneItem(id:RuneId,rarity:Rarity='common',count=1):Item{const rune=runeById(id)!;return {id:runeKey(id,rarity),runeId:id,name:rune.name,icon:rune.icon,category:'rune',rarity,count};}
export function rollRuneDrops(level:number,random=Math.random){const chance=(level+runeConfig.dropLevelOffset)/runeConfig.dropDivisor;return runeTypes.flatMap(r=>random()<chance?[makeRuneItem(r.id)]:[]);}

/** Atomic bag projection: consume first, return/create second, then check final capacity. */
export function exchangeRuneItems(items:Item[],consume:(RuneSocket&{count:number})[],produce:(RuneSocket&{count:number})[],capacity:number):{items:Item[]}|{error:string}{
 const next=structuredClone(items);
 for(const request of consume){
  let remaining=request.count;
  for(const item of next)if(!item.gearId&&item.runeId===request.runeId&&(item.rarity||'common')===request.rarity&&item.count>0){const take=Math.min(remaining,item.count);item.count-=take;remaining-=take;if(!remaining)break;}
  if(remaining)return {error:'Not enough matching runes in your bag.'};
 }
 const active=next.filter(i=>i.count>0);
 for(const result of produce){const stack=active.find(i=>!i.gearId&&i.runeId===result.runeId&&(i.rarity||'common')===result.rarity);if(stack)stack.count+=result.count;else active.push(makeRuneItem(result.runeId,result.rarity,result.count));}
 if(active.length>capacity)return {error:'Bag full. Make room for the resulting runes.'};
 return {items:active};
}
