import {test,expect} from '@playwright/test';
import {Simulation,type Item} from '../src/simulation';
import {gearById,rollGear,itemBonuses,rarityOrder,type Rarity} from '../src/game/equipment';
import {runeTypes,runeById,runeValue,type RuneId} from '../src/game/runes';
import {sameStack} from '../src/game/crafting';
const maxima:Record<string,number>={critChance:6.5,critDamage:23.3,damageBonus:9.1,lifesteal:5.2,hpRegen:.3,mpRegen:.5,armorPen:10.3,damageReduction:6.5,dodgeChance:5.2,cooldownReduction:7.8};
const factors:Record<Rarity,number>={common:.4,rare:.55,epic:.7,ancient:.85,legend:1};
function setup(random=()=>.5){const s=new Simulation(random,undefined,null);s.save.level=100;s.save.zone='town';s.save.gold=10000;const g=gearById('field-coat')!;const item:Item={...rollGear(g.id,'legend',()=>.5),name:g.name,icon:g.icon,count:1,secondary:{hpRegen:.3,mpRegen:.5,critChance:2}};s.addEquipmentItem(item);s.equip(item.id!);return {s,id:item.id!};}
function give(s:Simulation,id:RuneId,count=1,rarity:Rarity='common'){const r=runeById(id)!;expect(s.addItem(r.name,r.icon,count,rarity)).toBe(true);}
const count=(s:Simulation,id:RuneId,rarity:Rarity='common')=>s.save.items.filter(i=>i.runeId===id&&i.rarity===rarity).reduce((n,i)=>n+i.count,0);
const full=(s:Simulation)=>{while(s.save.items.filter(i=>i.count>0).length<240)s.save.items.push({name:'filler-'+s.save.items.length,icon:'leaf',count:1});};
test('all 50 rune values are fixed and physical runes never merge with Rune stone',()=>{
 expect(runeTypes.map(r=>r.id)).toEqual(Object.keys(maxima));for(const r of runeTypes)for(const rarity of rarityOrder)expect(runeValue(r.id,rarity)).toBe(Math.round(maxima[r.id]*factors[rarity]*1000)/1000);
 const {s}=setup();for(const rarity of rarityOrder){give(s,'hpRegen',2,rarity);give(s,'hpRegen',3,rarity);expect(count(s,'hpRegen',rarity)).toBe(5);}s.addItem('Rune stone','leaf',2,'common');
 const common=s.save.items.find(i=>i.runeId==='hpRegen'&&i.rarity==='common')!,rare=s.save.items.find(i=>i.runeId==='hpRegen'&&i.rarity==='rare')!;expect(sameStack(common,rare)).toBe(false);expect(s.save.items.filter(i=>i.runeId==='hpRegen')).toHaveLength(25);expect(s.save.items.find(i=>i.name==='Rune stone')!.count).toBe(2);
 const loaded=new Simulation(()=>.5,structuredClone(s.save),null);for(const rarity of rarityOrder)expect(count(loaded,'hpRegen',rarity)).toBe(5);
});
test('convert consumes four distinct same-rarity kinds, including the chosen result kind, without zeny',()=>{
 const {s}=setup();const ingredients:RuneId[]=['critChance','critDamage','hpRegen','mpRegen'];for(const id of ingredients)give(s,id,1,'rare');const gold=s.save.gold;
 expect(s.craft('rune:critChance','rare',ingredients)).toBe(true);expect(count(s,'critChance','rare')).toBe(1);for(const id of ingredients.slice(1))expect(count(s,id,'rare')).toBe(0);expect(s.save.gold).toBe(gold);
});
test('invalid conversion and mismatched rarity leave every ingredient unchanged',()=>{
 const {s}=setup();for(const id of ['critChance','critDamage','hpRegen','mpRegen'] as RuneId[])give(s,id,4,'common');give(s,'hpRegen',4,'rare');
 for(const input of [['critChance','critDamage','hpRegen'],['critChance','critDamage','hpRegen','not-a-rune']]){const before=structuredClone(s.save);expect(s.craft('rune:damageBonus','common',input as RuneId[])).toBe(false);expect(s.save).toEqual(before);}
 const before=structuredClone(s.save);expect(s.craft('rune:damageBonus','rare',['critChance','critDamage','hpRegen','mpRegen'])).toBe(false);expect(s.save).toEqual(before);
});
test('two-to-one upgrade reaches Legend from 16 Common and excludes socketed materials',()=>{
 const {s,id}=setup();give(s,'hpRegen',16);for(const rarity of rarityOrder.slice(0,-1)){const amount=count(s,'hpRegen',rarity)/2;for(let n=0;n<amount;n++)expect(s.upgradeRune('hpRegen',rarity)).toBe(true);}expect(count(s,'hpRegen','legend')).toBe(1);const before=structuredClone(s.save);expect(s.upgradeRune('hpRegen','legend')).toBe(false);expect(s.save).toEqual(before);
 give(s,'mpRegen',2);expect(s.socketRune(id,0,'mpRegen','common')).toBe(true);const socketed=structuredClone(s.save);expect(s.upgradeRune('mpRegen','common')).toBe(false);expect(s.save).toEqual(socketed);
});
test('full-bag conversion and upgrade consume exact pieces and free source slots',()=>{
 const {s}=setup();const kinds:RuneId[]=['critChance','critDamage','hpRegen','mpRegen'];for(const kind of kinds)give(s,kind,2);full(s);
 const chosen=kinds.map(kind=>s.save.items.filter(i=>i.runeId===kind)[1].id!);
 expect(s.craft('rune:damageBonus','common',chosen)).toBe(true);expect(s.save.items).toHaveLength(237);for(const id of chosen)expect(s.save.items.some(i=>i.id===id)).toBe(false);for(const kind of kinds)expect(count(s,kind)).toBe(1);
 give(s,'armorPen',3);const pieces=s.save.items.filter(i=>i.runeId==='armorPen');expect(s.upgradeRune(pieces[1].id!,pieces[2].id!)).toBe(true);expect(s.save.items).toHaveLength(239);expect(s.save.items.some(i=>i.id===pieces[0].id)).toBe(true);expect(count(s,'armorPen','rare')).toBe(1);
});
test('socket, swap and removal update cached stats; duplicate kinds reject across rarity',()=>{
 const {s,id}=setup();give(s,'hpRegen',1,'legend');give(s,'mpRegen',1,'legend');give(s,'hpRegen',1,'common');const before=s.gearBonuses;
 expect(s.socketRune(id,0,'hpRegen','legend')).toBe(true);expect(s.gearBonuses.hpRegen).toBeCloseTo((before.hpRegen||0)+.3);const duplicate=structuredClone(s.save);expect(s.socketRune(id,1,'hpRegen','common')).toBe(false);expect(s.save).toEqual(duplicate);
 expect(s.socketRune(id,1,'mpRegen','legend')).toBe(true);const item=s.save.items.find(i=>i.id===id)!;expect(itemBonuses(item).hpRegen).toBe(.6);expect(itemBonuses(item).mpRegen).toBe(1);expect(item.secondary).toEqual({hpRegen:.3,mpRegen:.5,critChance:2});
 const loaded=new Simulation(()=>.5,structuredClone(s.save),null);expect(loaded.gearBonuses).toEqual(s.gearBonuses);expect(loaded.save.items.find(i=>i.id===id)!.runes).toEqual(item.runes);
 expect(s.unsocketRune(id,0)).toBe(true);expect(count(s,'hpRegen','legend')).toBe(1);expect(s.gearBonuses.hpRegen).toBe(before.hpRegen);expect(s.save.gold).toBe(10000);
});
test('full bag blocks removal but swapping a physical piece returns the old rune without loss',()=>{
 const {s,id}=setup();give(s,'hpRegen');give(s,'mpRegen',2);expect(s.socketRune(id,0,'hpRegen','common')).toBe(true);full(s);const before=structuredClone(s.save);expect(s.unsocketRune(id,0)).toBe(false);expect(s.save).toEqual(before);
 const incoming=s.save.items.filter(i=>i.runeId==='mpRegen')[1].id!;expect(s.socketRune(id,0,incoming)).toBe(true);expect(count(s,'hpRegen')).toBe(1);expect(count(s,'mpRegen')).toBe(1);expect(s.save.items.some(i=>i.id===incoming)).toBe(false);expect(s.save.items).toHaveLength(240);
});
test('socketed gear cannot sell/salvage and standalone runes survive bulk material sale',()=>{
 const {s,id}=setup();give(s,'hpRegen',2);expect(s.socketRune(id,0,'hpRegen','common')).toBe(true);s.unequip('armor');expect(s.sellItem(id)).toBe(false);expect(s.salvageItem(id)).toBe(false);s.sell();expect(count(s,'hpRegen')).toBe(1);expect(s.save.items.find(i=>i.id===id)!.runes![0]).toMatchObject({runeId:'hpRegen',rarity:'common'});
});
