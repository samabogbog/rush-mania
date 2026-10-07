import {refinement as config} from '../config/balance.js';
export const REFINE_CAP=config.cap;
export const refineSuccess=config.success;
export type StoneTier='common'|'rare';
export const isStoneTier=(value:unknown):value is StoneTier=>value==='common'||value==='rare';
export const refineStones={common:{name:'Common refine stone',icon:'ice-shard'},rare:{name:'Rare refine stone',icon:'crystal-dust'}} as const;
export const refineLevel=(value:number|undefined)=>Math.max(0,Math.min(REFINE_CAP,Math.floor(value||0)));
export const refineBonus=(level:number)=>{const n=refineLevel(level);return n*(config.bonusLinear+n)/2;};
export const refineChance=(current:number,tier:StoneTier)=>current>=REFINE_CAP?0:Math.min(1,refineSuccess[refineLevel(current)]*(tier==='rare'?config.rareMultiplier:1));
export const refineCost=(current:number)=>config.costBase+refineLevel(current)*config.costPerLevel;
export function rollRefinement(current:number,tier:StoneTier,random:()=>number){
 const level=refineLevel(current);
 if(level>=REFINE_CAP)return {level,success:false,downgraded:false};
 if(random()<refineChance(level,tier))return {level:level+1,success:true,downgraded:false};
 const downgraded=random()<config.downgradeChance;
 return {level:downgraded?(tier==='rare'?Math.max(0,level-config.rareDowngradeLevels):0):level,success:false,downgraded};
}
export function rollStoneDrop(boss:boolean,random:()=>number):StoneTier|undefined {
 const roll=random();return roll<(boss ? config.stoneDropThresholds.boss[0] : config.stoneDropThresholds.normal[0])?'rare':roll<(boss ? config.stoneDropThresholds.boss[1] : config.stoneDropThresholds.normal[1])?'common':undefined;
}
