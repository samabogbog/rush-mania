export const REFINE_CAP=10;
export const refineSuccess=[1,1,.8,.6,.4,.2,.1,.06,.03,.01] as const;
export type StoneTier='common'|'rare';
export const isStoneTier=(value:unknown):value is StoneTier=>value==='common'||value==='rare';
export const refineStones={common:{name:'Common refine stone',icon:'ice-shard'},rare:{name:'Rare refine stone',icon:'crystal-dust'}} as const;
export const refineLevel=(value:number|undefined)=>Math.max(0,Math.min(REFINE_CAP,Math.floor(value||0)));
export const refineBonus=(level:number)=>{const n=refineLevel(level);return n*(19+n)/2;};
export const refineChance=(current:number,tier:StoneTier)=>current>=REFINE_CAP?0:Math.min(1,refineSuccess[refineLevel(current)]*(tier==='rare'?2:1));
export const refineCost=(current:number)=>60+refineLevel(current)*40;
export function rollRefinement(current:number,tier:StoneTier,random:()=>number){
 const level=refineLevel(current);
 if(level>=REFINE_CAP)return {level,success:false,downgraded:false};
 if(random()<refineChance(level,tier))return {level:level+1,success:true,downgraded:false};
 const downgraded=random()<.15;
 return {level:downgraded?(tier==='rare'?Math.max(0,level-1):0):level,success:false,downgraded};
}
export function rollStoneDrop(boss:boolean,random:()=>number):StoneTier|undefined {
 const roll=random();return roll<(boss ? .2 : .03)?'rare':roll<(boss ? .8 : .23)?'common':undefined;
}
