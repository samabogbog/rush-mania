import {classConfig, progression,skillRankConfig} from '../config/balance.js';
import {EXP_CHARM} from './items.js';
export const MAX_LEVEL = progression.maxLevel;
export type ClassId = "swordsman" | "mage" | "archer";
export type SkillEffect =
  "hit" | "area" | "heal" | "guard" | "fury" | "stun" | "slow" | "poison";
export type Skill = {
  id: string;
  stage:number;
  branch:0|1;
  name: string;
  icon: string;
  level: number;
  mp: number;
  cooldown: number;
  range: number;
  power: number;
  effect: SkillEffect;
  radius?: number;
  areaSlow?:boolean;
  duration?: number;
  cast?: number;
  description: string;
  rank?:number;
  maxTargets?:number;
  damagePercent?:number;
};
export const classes = classConfig.classes as Record<ClassId,{name:string;role:string;icon:string;color:number;range:number;speed:number;weapon:string}>;
export const skills = classConfig.skills as Record<ClassId,Skill[]>;
export const skillBranches = classConfig.branches as Record<ClassId,[string,string]>;
export const auxiliaryItems:Record<string,{resource:'hp'|'mp'|'passive';icon:string}>={[EXP_CHARM.name]:{resource:'passive',icon:EXP_CHARM.icon},'Red potion':{resource:'hp',icon:'health-potion'},'Blue potion':{resource:'mp',icon:'mana-potion'}};
export const isAuxiliaryItem=(name:unknown):name is string=>typeof name==='string'&&Object.hasOwn(auxiliaryItems,name);
export function isClass(value: unknown): value is ClassId {
  return typeof value === "string" && Object.hasOwn(classes, value);
}
/** Base mitigation formula; variability and critical hits are applied before this step. */
export function damageAfterDefense(atk: number, def: number) {
  return (Math.max(0, atk) * progression.defenseScale) / (progression.defenseScale + Math.max(0, def));
}

export const isOffensiveSkill=(skill:Skill)=>!['heal','guard','fury'].includes(skill.effect);
export const skillRankCap=(_skill:Skill)=>skillRankConfig.maxRank;
export function skillAtRank(skill:Skill,rank:number):Skill {
 const n=Math.max(1,Math.min(skillRankCap(skill),Math.floor(rank||1))),row=skillRankConfig.levels.find(row=>row.unlockLevel===skill.level);
 if(!row)throw new Error(`Missing skill rank table for ${skill.id} level ${skill.level}`);
 return {...skill,rank:n,power:row.damagePercent[n-1]/100,damagePercent:row.damagePercent[n-1],maxTargets:row.targets[n-1],radius:skill.radius??skillRankConfig.defaultAttackRadius};
}
