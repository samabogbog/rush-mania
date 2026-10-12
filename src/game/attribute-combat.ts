import {classConfig,progression} from '../config/balance.js';
import {gearById,itemBonuses,setBonuses,type Bonuses} from './equipment.js';
import type {Save} from '../simulation.js';

/** Canonical gear aggregation shared with snapshots; never constructs a world simulation. */
export function equippedAttributeBonuses(save:Save):Bonuses{
 const out:Bonuses={},sets=new Map<string,number>();
 for(const id of Object.values(save.equipped)){
  const item=save.items.find(i=>i.id===id&&i.count===1),gear=item?.gearId?gearById(item.gearId):undefined;
  if(!gear||(gear.job&&gear.job!==save.job))continue;
  if(gear.setId)sets.set(gear.setId,(sets.get(gear.setId)||0)+1);
  for(const [key,value] of Object.entries(itemBonuses(item!)))out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
 }
 for(const [id,count] of sets)for(const [key,value] of Object.entries(setBonuses(id,count)))out[key as keyof Bonuses]=(out[key as keyof Bonuses]||0)+value;
 return out;
}
export function savedAttributeCombat(save:Save){return attributeCombat(save,equippedAttributeBonuses(save),classConfig.classes[save.job].speed)}

type AttributeActor={level:number;stats:{str:number;vit:number;agi:number}};
/** Spending a point supplies shared attack growth, then specializes a logarithmic point budget.
 * STR-only allocations preserve original additive attack progression with any equipment. Gear and level
 * cannot dilute previously allocated HP/defense, and split allocations gain no free multiplier.
 * Precision is AGI's damage contribution after its cadence/critical contribution is accounted for.
 */
export function attributeCombat(actor:AttributeActor,gear:Bonuses,jobSpeed:number){
 const p=progression,a=p.attributes,initial=p.initial.stats;
 const budget=p.initial.points+(actor.level-1)*p.pointsPerLevel;
 const rawInvestment={str:Math.max(0,actor.stats.str-initial.str),vit:Math.max(0,actor.stats.vit-initial.vit),agi:Math.max(0,actor.stats.agi-initial.agi)};
 // Old or imported allocations share one legal budget; normalization never rewrites the save.
 const largest=Math.max(rawInvestment.str,rawInvestment.vit,rawInvestment.agi);
 const scaledTotal=largest>0?rawInvestment.str/largest+rawInvestment.vit/largest+rawInvestment.agi/largest:0;
 const overBudget=largest>0&&largest>budget/scaledTotal;
 const investment=(key:keyof typeof initial)=>overBudget?(rawInvestment[key]/largest)*budget/scaledTotal:rawInvestment[key];
 const spent=overBudget?budget:rawInvestment.str+rawInvestment.vit+rawInvestment.agi;
 const intrinsicAttack=p.atkBase+Math.min(actor.stats.str,initial.str)*p.atkPrimary+(actor.level-1)*p.atkPerLevel;
 const gearAttack=(gear.atk||0)+(gear.str||0)*p.atkPrimary;
 const spentPower=Math.pow(a.pointPower,spent);
 const baseAttack=(intrinsicAttack+p.atkPrimary*spent+gearAttack)/spentPower;
 const power=(key:keyof typeof initial)=>Math.pow(a.pointPower,investment(key));
 const strPower=power('str'),vitPower=power('vit'),agiPower=power('agi');
 const baseHp=p.hpBase+Math.min(actor.stats.vit,initial.vit)*p.hpVit+(actor.level-1)*p.hpPerLevel+(gear.hp||0)+(gear.vit||0)*p.hpVit;
 const baseDefense=Math.min(actor.stats.vit,initial.vit)*p.defVit+actor.level*p.defPerLevel+(gear.def||0)+(gear.vit||0)*p.defVit;
 const baseCrit=Math.min(p.caps.crit,p.critBase+(Math.min(actor.stats.agi,initial.agi)+(gear.agi||0))*p.critAgi+(gear.critChance||0)/100);
 const critMultiplier=p.critMultiplier+(gear.critDamage||0)/100;
 const baseCritExpectation=1+baseCrit*(critMultiplier-1);
 // Criticals consume a fixed share of AGI's logarithmic budget. More critical damage
 // on gear therefore cannot make the attack display fall when allocating a point.
 const crit=critMultiplier>1?Math.min(p.caps.crit,(baseCritExpectation*Math.pow(agiPower,a.agilityCriticalShare)-1)/(critMultiplier-1)):baseCrit;
 const critGain=(1+crit*(critMultiplier-1))/(1+baseCrit*(critMultiplier-1));
 const baseRate=1/jobSpeed,gearAgi=Math.max(0,Math.min(actor.stats.agi,initial.agi)+(gear.agi||0)-p.attackAgiBase);
 const equippedRate=baseRate+(p.attackRateCeiling-baseRate)*gearAgi/(gearAgi+p.attackAgiHalfSaturation);
 const rate=Math.min(p.attackRateCeiling,equippedRate*Math.pow(agiPower,a.agilityCadenceShare));
 const cadenceGain=rate/equippedRate;
 const precision=agiPower/(cadenceGain*critGain);
 return {
  hp:baseHp*Math.pow(vitPower,1-a.vitalityArmorShare),
  defense:(p.defenseScale+baseDefense)*Math.pow(vitPower,a.vitalityArmorShare)-p.defenseScale,
  damage:baseAttack*strPower*precision,
  criticalChance:crit,
  attackInterval:1/(rate*(1+Math.min(p.caps.attackSpeed,(gear.attackSpeed||0)/100))),
  // Finesse carries cadence's offensive value into fixed-timing skills and their damage ticks.
  skillDamageMultiplier:cadenceGain*(1+(gear.skillDamage||0)/100),
 };
}
