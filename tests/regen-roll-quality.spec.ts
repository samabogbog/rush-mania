import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {equipmentConfig} from '../src/config/balance';
import {formatStat,normalizeSecondary,rollGear,secondaryRollValue,secondaryRollMaximum,secondaryRollQuality,type SecondaryStat} from '../src/game/equipment';

test('HP and MP regeneration scale with max resources and exclude healing received and lifesteal',()=>{
 for(const level of [1,100]){
  const sim=new Simulation(()=>.5,undefined,null);sim.save.level=level;sim.populateZone('town');
  sim.save.hp=10;sim.save.mp=10;sim.tick(2,0,0);
  expect(sim.save.hp).toBeCloseTo(10+sim.maxHp*.006);expect(sim.save.mp).toBeCloseTo(10+sim.maxMp*.01);
  const item={...rollGear('field-coat','legend',()=>.5),count:1,secondary:{hpRegen:4,mpRegen:4,healingBonus:100,lifesteal:25}};
  expect(sim.addEquipmentItem(item)).toBe(true);expect(sim.equip(item.id!)).toBe(true);
  expect(sim.healingMultiplier).toBe(2);expect(sim.gearBonuses.lifesteal).toBe(25);
  expect(sim.hpRegenPercent).toBe(.6);expect(sim.mpRegenPercent).toBe(1);
  sim.save.hp=10;sim.save.mp=10;sim.tick(2,0,0);
  expect(sim.save.hp).toBeCloseTo(10+sim.maxHp*.012);expect(sim.save.mp).toBeCloseTo(10+sim.maxMp*.02);
  sim.save.hp=sim.maxHp-.01;sim.save.mp=sim.maxMp-.01;sim.tick(1,0,0);
  expect(sim.save.hp).toBe(sim.maxHp);expect(sim.save.mp).toBe(sim.maxMp);
  sim.save.hp=0;sim.save.mp=10;sim.deathTime=5;sim.tick(1,0,0);
  expect(sim.save.hp).toBe(0);expect(sim.save.mp).toBe(10);
 }
});

test('regen normalization, formatting and level-independent rolls agree',()=>{
 expect(normalizeSecondary({hpRegen:4,mpRegen:2,healingBonus:37,lifesteal:12})).toEqual({hpRegen:.3,mpRegen:.5,healingBonus:37,lifesteal:12});
 expect(formatStat('hpRegen',.23)).toBe('0.23%/s');expect(formatStat('mpRegen',.45)).toBe('0.45%/s');
 for(const level of [1,10,90,100]){
  expect(secondaryRollValue('hpRegen',level,0)).toBe(.1);expect(secondaryRollValue('hpRegen',level,1)).toBe(.3);
  expect(secondaryRollValue('mpRegen',level,0)).toBe(.1);expect(secondaryRollValue('mpRegen',level,1)).toBe(.5);
  expect(secondaryRollValue('hpRegen',level,.125)).toBe(.13);expect(secondaryRollValue('mpRegen',level,.125)).toBe(.15);
 }
});

test('quality uses rounded roll maximum with inclusive 80/90 boundaries and red precedence',()=>{
 for(const level of [1,10,90,100])for(const key of Object.keys(equipmentConfig.affixRanges) as SecondaryStat[]){
  const rawMax=equipmentConfig.affixRanges[key][1];
  const expected=key==='hpRegen'?.3:key==='mpRegen'?.5:Math.round(rawMax*(.65+level/140)*10)/10;
  expect(secondaryRollMaximum(key,level)).toBe(expected);
 }
 for(const [key,max] of [['hpRegen',.3],['mpRegen',.5],['critChance',secondaryRollMaximum('critChance',90)]] as [SecondaryStat,number][]){
  expect(secondaryRollQuality(key,max*.8-1e-8,90)).toBeUndefined();
  expect(secondaryRollQuality(key,max*.8,90)).toBe('high');
  expect(secondaryRollQuality(key,max*.9-1e-8,90)).toBe('high');
  expect(secondaryRollQuality(key,max*.9,90)).toBe('excellent');
  expect(secondaryRollQuality(key,max,90)).toBe('excellent');
 }
 expect(secondaryRollQuality('hpRegen',3,10)).toBe('excellent');
 expect(secondaryRollQuality('mpRegen',3,10)).toBe('excellent');
});
