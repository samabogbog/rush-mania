import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {rollGear} from '../src/game/equipment';
import {progression} from '../src/config/balance';

const intervals={swordsman:1,mage:1.2,archer:1.1} as const;
for(const [job,baseline] of Object.entries(intervals) as [keyof typeof intervals,number][]){
 test(`${job} normal attack baseline and diminishing AGI returns`,()=>{
  const sim=new Simulation(()=>.5,undefined,null);sim.setClass(job);
  for(const agi of [0,5]){sim.save.stats.agi=agi;expect(sim.attackInterval).toBeCloseTo(baseline,12);}
  const rates=[5,55,105,155].map(agi=>{sim.save.stats.agi=agi;return 1/sim.attackInterval;});
  expect(rates[1]).toBeCloseTo((1/baseline+2)/2,12);
  expect(rates[2]-rates[1]).toBeLessThan(rates[1]-rates[0]);
  expect(rates[3]-rates[2]).toBeLessThan(rates[2]-rates[1]);
  sim.save.stats.agi=1_000_005;
  expect(1/sim.attackInterval).toBeLessThan(2);
  expect(1/sim.attackInterval).toBeGreaterThan(1.9999);
 });
}

test('equipped AGI enters the curve while gear attack speed caps at 25%',()=>{
 const sim=new Simulation(()=>.5,undefined,null);
 const item={...rollGear('field-coat','rare',()=>.5),count:1,secondary:{agi:50,attackSpeed:25}};
 expect(sim.addEquipmentItem(item)).toBe(true);expect(sim.equip(item.id!)).toBe(true);
 expect(sim.agility).toBe(55);expect(sim.attackSpeedBonus).toBe(25);
 expect(sim.attackInterval).toBeCloseTo(1/(1.5*1.25),12);
 const equipped=sim.save.items.find(i=>i.id===item.id)!;
 equipped.secondary={agi:50,attackSpeed:100};sim.save={...sim.save};
 expect(sim.attackSpeedBonus).toBe(25);expect(sim.attackInterval).toBeCloseTo(1/(1.5*1.25),12);
 equipped.secondary={agi:50,attackSpeed:10};sim.save={...sim.save};
 expect(sim.attackSpeedBonus).toBe(10);expect(sim.attackInterval).toBeCloseTo(1/(1.5*1.1),12);
 sim.save.stats.agi=1_000_005;equipped.secondary={attackSpeed:100};sim.save={...sim.save};
 expect(1/sim.attackInterval).toBeGreaterThan(2);expect(1/sim.attackInterval).toBeLessThan(2.5);
});

test('normal attack tick uses the shared nonlinear interval as its timer',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.setClass('mage');sim.save.stats.agi=55;
 const monster=sim.monsters[0];sim.monsters=[monster];monster.x=sim.x;monster.z=sim.z;
 monster.hp=100000;sim.target=monster.id;sim.attackTimer=0;
 sim.tick(.01,0,0);
 expect(monster.hp).toBeLessThan(100000);
 expect(sim.attackTimer).toBeCloseTo(12/17,12);
 const hp=monster.hp;sim.tick(.1,0,0);expect(monster.hp).toBe(hp);
});

test('curve tuning values and gear cap are the configured defaults',()=>{
 expect(progression.attackRateCeiling).toBe(2);
 expect(progression.attackAgiHalfSaturation).toBe(50);
 expect(progression.caps.attackSpeed).toBe(.25);
});
