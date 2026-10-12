/** Counterfactual stationary same-class duels. The shipped game has no player-vs-player target path.
 * Uses production actors, skill acceptance/resolution, budgets, timers and defense function.
 * Player defense/dodge/reduction replace the monster receiver; no stat-specific handicaps.
 * CC on players is unspecified and excluded; poison timing is retained. Both attacks commit together.
 */
import {Simulation,type Monster} from '../src/simulation';
import {progression} from '../src/config/balance';
import {damageAfterDefense} from '../src/game/classes';
import {equipment,gearSets,rollGear,type Bonuses} from '../src/game/equipment';
import type {ClassId} from '../src/game/classes';
export type Build='str'|'vit'|'agi';
export type Gear='none'|'common'|'legend10'|'legendRolled';
const randomOf=new WeakMap<Simulation,()=>number>();
export function seeded(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function makeActor(job:ClassId,level:number,build:Build,gear:Gear,random:()=>number,branch:0|1=0){
 const s=new Simulation(random,undefined,null);randomOf.set(s,random);s.save.level=level;s.setClass(job);s.save.points=progression.initial.points+(level-1)*progression.pointsPerLevel;
 while(s.save.points)s.stat(build);
 if(gear!=='none'){
  const set=[...gearSets].filter(x=>x.level<=level).sort((a,b)=>b.level-a.level)[0];
  const gearRandom=seeded(481);
  if(set)for(const g of equipment.filter(g=>g.setId===set.id)){
   const rolled=rollGear(g.id,gear==='common'?'common':'legend',gearRandom);
   const item={...rolled,name:g.name,icon:g.icon,count:1,secondary:gear==='legendRolled'?rolled.secondary:{} as Bonuses,refine:gear==='common'?0:10};
   s.addEquipmentItem(item);s.equip(item.id!);
  }
 }
 for(let stage=1;stage<=Math.floor(level/10);stage++)s.chooseSkill(s.skillList.find(k=>k.stage===stage&&k.branch===branch)!.id);
 s.save.hotbar=s.unlockedSkills.slice(-6).map(k=>k.id);s.save.hp=s.maxHp;s.save.mp=s.maxMp;s.x=0;s.z=0;s.obstacles=[];s.target=0;s.enemyFilter=()=>false;
 const proxy={...s.monsters[0],id:0,x:1,z:0,homeX:1,homeZ:0,hp:1e9,alive:true,stun:0,slow:0,poison:0,poisonTimer:0,poisonDamage:0};s.monsters=[proxy];return s;
}
export function profile(s:Simulation){return{stats:s.save.stats,hp:s.maxHp,mp:s.maxMp,atk:s.damage,def:s.defense,aps:1/s.attackInterval,crit:s.criticalChance,critMultiplier:s.criticalMultiplier,ehp:s.maxHp*(1+s.defense/progression.defenseScale),basicExpectedDps:s.damage/s.attackInterval*(1+s.criticalChance*(s.criticalMultiplier-1)),gearBonuses:s.gearBonuses};}
export function duel(a:Simulation,b:Simulation,skills:boolean,maxSeconds=180){
 const actors=[a,b],proxies=actors.map(s=>s.monsters[0]),damage=[0,0];
 for(const s of actors){s.save.hp=s.maxHp;s.save.mp=s.maxMp;s.cast=null;s.actionTime=0;s.attackTimer=0;s.skillCooldowns={};s.time=0;s.auto=skills;s.autoSkillCursor=0;}
 actors.forEach((s,i)=>{const other=actors[1-i],m=proxies[i];m.hp=other.maxHp;m.alive=true;m.poison=0;m.poisonTimer=0;
  s.hit=(enemy:Monster,amount:number,skill=false)=>{
   const random=randomOf.get(s)!;if(!enemy.alive)return;
   // A missed swing still spends its normal recovery, just like a connected swing.
   if(!skill)s.actionTime=.25;
   if(random()<Math.min(progression.caps.dodge,(other.gearBonuses.dodgeChance||0)/100))return;
   const variance=progression.varianceBase+random()*progression.varianceSpread,crit=random()<s.criticalChance;
   const skillMultiplier=s.skillDamageMultiplier??(1+(s.gearBonuses.skillDamage||0)/100);
   let atk=amount*variance*(crit?s.criticalMultiplier:1)*(1+(s.gearBonuses.damageBonus||0)/100)*(skill?skillMultiplier:1)*(1+(s.fury.time>0?s.fury.power:0));
   const armor=other.defense*(1-Math.min(progression.caps.armorPen,(s.gearBonuses.armorPen||0)/100));
   const dealt=Math.max(1,Math.round(damageAfterDefense(atk,armor)*(1-Math.min(progression.caps.damageReduction,(other.gearBonuses.damageReduction||0)/100))));
   const effective=Math.min(enemy.hp,dealt);enemy.hp-=dealt;enemy.alive=enemy.hp>0;damage[1-i]+=dealt;
   s.save.hp=Math.min(s.maxHp,s.save.hp+effective*Math.min(progression.caps.lifesteal,(s.gearBonuses.lifesteal||0)/100));
  };
 });
 const dt=.025;
 for(let t=0;t<maxSeconds;t+=dt){
  damage.fill(0);for(let i=0;i<2;i++){proxies[i].hp=actors[1-i].save.hp;proxies[i].alive=true;actors[i].tick(dt,0,0);
   const m=proxies[i];if(m.poison>0){m.poisonTimer-=dt;if(m.poisonTimer<=0){actors[i].hit(m,m.poisonDamage,true);m.poisonTimer+=1;}m.poison=Math.max(0,m.poison-dt);}
  }
  a.save.hp-=damage[0];b.save.hp-=damage[1];
  if(a.save.hp<=0||b.save.hp<=0)return{winner:a.save.hp<=0?(b.save.hp<=0?'draw':'b'):'a',reason:a.save.hp<=0&&b.save.hp<=0?'double-ko':'kill',seconds:t+dt,hp:[Math.max(0,a.save.hp)/a.maxHp,Math.max(0,b.save.hp)/b.maxHp]};
 }
 return{winner:'draw',reason:'timeout',seconds:maxSeconds,hp:[a.save.hp/a.maxHp,b.save.hp/b.maxHp]};
}
