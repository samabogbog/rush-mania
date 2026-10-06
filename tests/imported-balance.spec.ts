import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import expectedLevels from './imported-levels-fixture.json' with {type:'json'};
import {contentConfig,progression,validateConfiguration,craftingConfig,equipmentConfig,refinement,classConfig,economy} from '../src/config/balance';
import {normalMonsterBalance,species} from '../src/game/content';
import {Simulation} from '../src/simulation';
import {transact,MONSTER_BALANCE_REVISION} from '../server/realm';
import type {RealmStore} from '../server/store';
import type {Realm} from '../server/protocol';
test('all 100 spreadsheet levels are exact and cap does not expose level 101',()=>{
 const sim=new Simulation(()=>.5,undefined,null);
 expect(progression.levels.map(r=>[r.level,r.monsterXp,r.multiplier,r.nextLevelXp])).toEqual(expectedLevels);
 for(const row of progression.levels){sim.save.level=row.level;expect(sim.maxXp).toBe(row.level===100?0:row.nextLevelXp);}
 sim.save.level=99;sim.save.xp=0;sim.addExperience(progression.levels[98].nextLevelXp-.5);expect(sim.save.level).toBe(99);sim.addExperience(.5);expect(sim.save.level).toBe(100);expect(sim.save.xp).toBe(0);
});
test('normal checkpoints, interpolation, early levels, and elite multipliers share one runtime',()=>{
 const points=contentConfig.normalBalance.checkpoints;
 for(const row of points)expect(normalMonsterBalance(row.level)).toEqual({hp:row.hp,atk:row.atk,defense:row.defense,gold:row.gold,drops:row.drops});
 expect(normalMonsterBalance(1).hp).toBe(21.6);expect(normalMonsterBalance(1).drops).toEqual(points[0].drops);expect(normalMonsterBalance(100)).toEqual(normalMonsterBalance(90));
 expect(normalMonsterBalance(35).hp).toBe(780);expect(normalMonsterBalance(35).drops.shade_rare).toBe(.00375);
 const sim=new Simulation(()=>.5,undefined,null);
 for(const [kind,base] of Object.entries(species)){const spec=sim.monsterSpec(kind as keyof typeof species),normal=normalMonsterBalance(base.level),tier=base.boss?contentConfig.normalBalance.boss:base.miniBoss?contentConfig.normalBalance.mini:{hp:1,atk:1,defense:1,gold:1,xp:1};for(const key of ['hp','atk','defense','gold'] as const)expect(spec[key]).toBe(normal[key]*tier[key]);expect(spec.xp).toBe(progression.levels[base.level-1].monsterXp*tier.xp);}
 sim.balance.Dewdrop={hp:999,xp:123};expect(sim.monsterSpec('Dewdrop').hp).toBe(999);expect(sim.monsterSpec('Dewdrop').xp).toBe(123);
});
test('normal drops use independent exact boundaries, zero chances, common stones, and no guaranteed craft materials',()=>{
 const sim=new Simulation(()=>0,undefined,null);sim.populateZone('ruins');const monster=sim.monsters.find(m=>m.kind==='ShadeWisp')!;
 expect(sim.hasLegacyDrop(monster)).toBe(false);expect(sim.rollStoneLoot(monster)?.name).toBe('Common refine stone');expect(sim.rollMaterialLoot(monster)).toHaveLength(6);
 const rates=normalMonsterBalance(50).drops;sim.random=()=>rates.commonStone;expect(sim.rollStoneLoot(monster)).toBeUndefined();
 const old=structuredClone(contentConfig.normalBalance);try{for(const row of contentConfig.normalBalance.checkpoints)for(const key of Object.keys(row.drops))row.drops[key as keyof typeof row.drops]=0;sim.random=()=>0;expect(sim.rollStoneLoot(monster)).toBeUndefined();expect(sim.rollMaterialLoot(monster)).toEqual([]);}finally{Object.assign(contentConfig.normalBalance,old);}
 sim.random=()=>1;expect(sim.rollMaterialLoot(monster)).toEqual([]);expect(sim.rollStoneLoot(monster)).toBeUndefined();
});
test('loading existing progress grants no levels and preserves assets and allocated stats',()=>{
 const saved=new Simulation(()=>.5,undefined,null).save;saved.level=40;saved.xp=1e6;saved.gold=321;saved.stats.str=99;saved.points=7;saved.items.push({name:'Shade essence',icon:'?',rarity:'rare',count:8,category:'material',id:'material:Shade essence:rare'});
 const loaded=new Simulation(()=>.5,structuredClone(saved),null);expect(loaded.save).toEqual(saved);expect(loaded.save.level).toBe(40);expect(loaded.maxXp).toBe(expectedLevels[39][3]);
});
test('persisted monster HP migrates once without resetting targets, timers, player progress, or admin overrides',async()=>{
 const store:RealmStore&{realm?:Realm;revision:number}={revision:0,async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;},async create(r){this.realm=structuredClone(r);},async commit(rev,r){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}};
 const id={id:'import-player',name:'Import'};const initial=await transact(store,id,{connect:true},1000),room=store.realm!.rooms!.glade;delete room.balanceRevision;
 const alive=room.monsters[0],dead=room.monsters[1];alive.hp=species[alive.kind].hp*.25;dead.alive=false;dead.hp=-7;dead.respawn=41;
 store.realm!.balance={MooncapMonarch:{hp:12345,xp:999}};const boss=room.monsters.find(m=>m.kind==='MooncapMonarch')!;boss.hp=12345*.5;
 const saved=structuredClone(initial.player.actor.save),session=initial.player.session.id;
 const result=await transact(store,id,{},1000),current=store.realm!.rooms!.glade;expect(result.player.actor.save).toEqual(saved);expect(result.player.session.id).toBe(session);expect(current.balanceRevision).toBe(MONSTER_BALANCE_REVISION);expect(current.monsters[0].hp).toBeCloseTo(new Simulation(()=>.5,undefined,null).monsterSpec(alive.kind).hp*.25);expect(current.monsters[1].respawn).toBe(41);expect(current.monsters[1].hp).toBe(-7);expect(current.monsters.find(m=>m.id===boss.id)!.hp).toBe(6172.5);
 const hp=current.monsters[0].hp;await transact(store,id,{},1000);expect(store.realm!.rooms!.glade.monsters[0].hp).toBe(hp);
});
test('invalid imported level and probability edits are rejected before runtime',()=>{
 const config=()=>structuredClone({crafting:craftingConfig,progression,equipment:equipmentConfig,refinement,classes:classConfig,content:contentConfig,economy});
 for(const mutate of [(c:ReturnType<typeof config>)=>c.progression.levels[1].level=1,c=>c.progression.levels[0].monsterXp=0,c=>c.content.normalBalance.checkpoints[0].drops.commonStone=1.1,c=>c.content.normalBalance.checkpoints[0].level=11]){const c=config();mutate(c);expect(()=>validateConfiguration(c)).toThrow(/Invalid balance config/);}
});

test('all nine CSV checkpoints preserve stats and percentages including malformed Lv40 separator',()=>{
 const lines=readFileSync(new URL('../docs/balance/imported/monsters.csv',import.meta.url),'utf8').split(/\r?\n/).filter(line=>/^,normal,/.test(line));
 expect(lines).toHaveLength(9);
 for(const line of lines){const cells=line.split(','),level=Number(cells[2]),row=normalMonsterBalance(level);expect([row.hp,row.atk,row.defense,row.gold]).toEqual(cells.slice(3,7).map(Number));
  const names={'refine stone':'commonStone','Shade essence common':'shade_common','rune stone common':'rune_common','sky feather common':'sky_common','Shade essence rare':'shade_rare','rune stone rare':'rune_rare','sky feather rare':'sky_rare'} as const;
  const expected=Object.fromEntries(Object.values(names).map(key=>[key,0]));for(const match of line.matchAll(/(refine stone|Shade essence common|rune stone common|sky feather common|Shade essence rare|rune stone rare|sky feather rare):([\d.]+)%/g))expected[names[match[1] as keyof typeof names]]=Number(match[2])/100;expect(row.drops).toEqual(expected);
 }
});
test('each independent material rate includes just below and excludes exact probability boundary',()=>{
 const sim=new Simulation(()=>0,undefined,null);sim.populateZone('ruins');const monster=sim.monsters.find(m=>m.kind==='ShadeWisp')!,rates=normalMonsterBalance(50).drops;
 const keys=['shade_common','shade_rare','rune_common','rune_rare','sky_common','sky_rare'] as const;
 for(const [index,key] of keys.entries()){let cursor=0;sim.random=()=>cursor++===index?rates[key]-Number.EPSILON:1;const drops=sim.rollMaterialLoot(monster);expect(drops).toHaveLength(1);expect(drops[0].name).toBe(({shade:'Shade essence',rune:'Rune stone',sky:'Sky feather'} as const)[key.split('_')[0] as 'shade'|'rune'|'sky']);expect(drops[0].rarity).toBe(key.split('_')[1]);cursor=0;sim.random=()=>cursor++===index?rates[key]:1;expect(sim.rollMaterialLoot(monster)).toHaveLength(0);}
});
