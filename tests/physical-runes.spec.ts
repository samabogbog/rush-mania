import {test,expect} from '@playwright/test';
import {Simulation,type Item} from '../src/simulation';
import {makeRuneItem,runeKey,type RuneId} from '../src/game/runes';
import {sameStack} from '../src/game/crafting';
const kinds:RuneId[]=['critChance','critDamage','hpRegen','mpRegen'];
const bag=(s:Simulation)=>s.save.items.filter(i=>i.count>0);
const runes=(s:Simulation)=>s.save.items.filter(i=>i.runeId);
const full=(s:Simulation)=>{while(bag(s).length<240)s.save.items.push({name:'filler-'+bag(s).length,icon:'leaf',count:1});};
function fresh(){const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.zone='town';s.save.items=[];return s;}
test('legacy stacked runes migrate losslessly into bag and pending reserve with stable physical IDs',()=>{
 const s=fresh(),legacy=structuredClone(s.save);legacy.version=11;
 const potion:Item={name:'Red potion',icon:'health-potion',count:20};
 legacy.items=[potion,{...makeRuneItem('hpRegen','legend'),id:runeKey('hpRegen','legend'),count:246},makeRuneItem('mpRegen','rare')];
 const stable=legacy.items[2].id;const loaded=new Simulation(()=>.5,legacy,null);
 expect(loaded.save.version).toBe(12);expect(bag(loaded)).toHaveLength(240);expect(loaded.save.runeOverflow).toHaveLength(8);
 const all=[...runes(loaded),...loaded.save.runeOverflow!];expect(all).toHaveLength(247);expect(new Set(all.map(i=>i.id)).size).toBe(247);expect(all.every(i=>i.count===1&&!i.id!.startsWith('rune:'))).toBe(true);expect(all.some(i=>i.id===stable)).toBe(true);expect(loaded.save.items.find(i=>i.name==='Red potion')!.count).toBe(20);
 const again=new Simulation(()=>.5,structuredClone(loaded.save),null);expect(again.save.items).toEqual(loaded.save.items);expect(again.save.runeOverflow).toEqual(loaded.save.runeOverflow);
 const before=structuredClone(again.save);expect(again.claimRuneOverflow()).toBe(false);expect(again.save).toEqual(before);
 again.save.items.splice(1,3);const pendingIds=again.save.runeOverflow!.slice(0,3).map(i=>i.id);expect(again.claimRuneOverflow()).toBe(true);expect(bag(again)).toHaveLength(240);expect(again.save.runeOverflow).toHaveLength(5);for(const id of pendingIds)expect(again.save.items.some(i=>i.id===id)).toBe(true);
 const reloaded=new Simulation(()=>.5,structuredClone(again.save),null);expect(reloaded.save.runeOverflow).toEqual(again.save.runeOverflow);expect(reloaded.save.items).toEqual(again.save.items);
});
test('rune grants allocate each piece, preserve IDs on reload and reject oversized grants atomically',()=>{
 const s=fresh();expect(s.addRune('critChance','common',3)).toBe(true);expect(runes(s)).toHaveLength(3);expect(new Set(runes(s).map(i=>i.id)).size).toBe(3);expect(sameStack(runes(s)[0],runes(s)[1])).toBe(false);
 const reloaded=new Simulation(()=>.5,structuredClone(s.save),null);expect(runes(reloaded)).toEqual(runes(s));full(s);const before=structuredClone(s.save);expect(s.addRune('hpRegen','legend',2)).toBe(false);expect(s.save).toEqual(before);
});
test('conversion validates physical ownership, distinct identity and rarity without consuming on failure',()=>{
 const s=fresh();for(const kind of kinds)s.addRune(kind,'common',2);s.addRune('mpRegen','rare');const ids=kinds.map(kind=>runes(s).find(i=>i.runeId===kind)!.id!);
 const rare=runes(s).find(i=>i.runeId==='mpRegen'&&i.rarity==='rare')!.id!;
 for(const inputs of [[ids[0],ids[0],ids[2],ids[3]],[...ids.slice(0,3),rare],[...ids.slice(0,3),'foreign-id']]){const before=structuredClone(s.save);expect(s.craft('rune:critChance','common',inputs)).toBe(false);expect(s.save).toEqual(before);}
 expect(s.craft('rune:critChance','common',ids)).toBe(true);for(const id of ids)expect(s.save.items.some(i=>i.id===id)).toBe(false);expect(runes(s).filter(i=>i.runeId==='critChance')).toHaveLength(2);
});
test('upgrade rejects reused, mixed and foreign pieces and consumes only the chosen pair',()=>{
 const s=fresh();s.addRune('hpRegen','common',3);s.addRune('mpRegen');s.addRune('hpRegen','rare');const common=runes(s).filter(i=>i.runeId==='hpRegen'&&i.rarity==='common');
 for(const second of [common[0].id!,runes(s).find(i=>i.runeId==='mpRegen')!.id!,runes(s).find(i=>i.rarity==='rare')!.id!,'foreign']){const before=structuredClone(s.save);expect(s.upgradeRune(common[0].id!,second)).toBe(false);expect(s.save).toEqual(before);}
 expect(s.upgradeRune(common[1].id!,common[2].id!)).toBe(true);expect(s.save.items.some(i=>i.id===common[0].id)).toBe(true);expect(runes(s).filter(i=>i.runeId==='hpRegen'&&i.rarity==='rare')).toHaveLength(2);
});

test('four same-kind physical runes convert into chosen type and legacy references resolve distinct pieces',()=>{
 const s=fresh();s.addRune('critChance','rare',6);const all=runes(s).map(i=>i.id!),chosen=all.slice(1,5),gold=s.save.gold;
 expect(s.craft('rune:mpRegen','rare',chosen)).toBe(true);for(const id of chosen)expect(s.save.items.some(i=>i.id===id)).toBe(false);for(const id of [all[0],all[5]])expect(s.save.items.some(i=>i.id===id)).toBe(true);expect(runes(s).filter(i=>i.runeId==='mpRegen'&&i.rarity==='rare')).toHaveLength(1);expect(s.save.gold).toBe(gold);
 s.addRune('hpRegen','common',4);expect(s.craft('rune:armorPen','common',['hpRegen','hpRegen','hpRegen','hpRegen'])).toBe(true);expect(runes(s).some(i=>i.runeId==='hpRegen')).toBe(false);
 const before=structuredClone(s.save);expect(s.craft('rune:damageBonus','rare',['critChance','critChance','critChance','critChance'])).toBe(false);expect(s.save).toEqual(before);
});
test('same-kind conversion frees three slots in a full bag and mixed kinds remain valid',()=>{
 const s=fresh();s.addRune('hpRegen','common',4);const ids=runes(s).map(i=>i.id!);full(s);expect(s.craft('rune:hpRegen','common',ids)).toBe(true);expect(bag(s)).toHaveLength(237);expect(runes(s)).toHaveLength(1);
 s.save.items=s.save.items.filter(i=>i.runeId);s.addRune('hpRegen','common',1);s.addRune('critChance','common',2);expect(s.craft('rune:mpRegen','common',runes(s).map(i=>i.id!))).toBe(true);expect(runes(s)).toHaveLength(1);expect(runes(s)[0].runeId).toBe('mpRegen');
});
