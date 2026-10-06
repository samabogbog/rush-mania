import {contentConfig} from '../config/balance';
export type Family='slime'|'cap'|'plant'|'beast'|'insect'|'wisp'|'golem';
export type AttackShape='circle'|'line'|'cone';
export type MonsterSpec={hp:number;xp:number;color:number;drop:string;icon:string;defense:number;atk:number;gold:number;level:number;family:Family;shape:AttackShape;windup:number;range:number;boss?:boolean;miniBoss?:boolean;tier?:'boss'|'mini';modelKind?:string;aggroRadius?:number;leashRadius?:number};
export const species = contentConfig.species as typeof contentConfig.species & Record<keyof typeof contentConfig.species,MonsterSpec>;
export type Kind=keyof typeof species;
export type ZoneId='town'|'glade'|'orchard'|'marsh'|'frost'|'ruins';
export type Zone={name:string;level:number;maxLevel:number;description:string;ground:number;path:number;accent:number;species:Kind[];music:number[];npcs:{id:string;name:string;x:number;z:number;panel:string}[]};
export const zones = contentConfig.zones as Record<ZoneId,Zone>;
export function isZone(value:unknown):value is ZoneId {return typeof value==='string'&&Object.hasOwn(zones,value)}
export const questDefinitions = contentConfig.quests as (Omit<typeof contentConfig.quests[number], "zone"> & {zone:ZoneId})[];

/** Checkpoints are exact; interpolate between them, clamp rates outside them. */
export function normalMonsterBalance(level:number){
 const rows=contentConfig.normalBalance.checkpoints,first=rows[0],last=rows[rows.length-1];
 const upper=rows.find(row=>row.level>=level)||last,lower=[...rows].reverse().find(row=>row.level<=level)||first;
 const t=upper.level===lower.level?0:(level-lower.level)/(upper.level-lower.level);
 const interpolate=(a:number,b:number)=>a+(b-a)*t,scale=level<first.level?level/first.level:1;
 return {hp:interpolate(lower.hp,upper.hp)*scale,atk:interpolate(lower.atk,upper.atk)*scale,defense:interpolate(lower.defense,upper.defense)*scale,gold:interpolate(lower.gold,upper.gold)*scale,
 drops:Object.fromEntries(Object.keys(first.drops).map(key=>[key,interpolate(lower.drops[key as keyof typeof first.drops],upper.drops[key as keyof typeof first.drops])])) as typeof first.drops};
}
