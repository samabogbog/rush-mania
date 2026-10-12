import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {contentConfig} from '../src/config/balance';
import {normalMonsterBalance,species} from '../src/game/content';
import {Simulation} from '../src/simulation';
import {MONSTER_BALANCE_REVISION,transact} from '../server/realm';
import type {Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
const names={'refine stone':'commonStone','shade essence common':'shade_common','rune stone common':'rune_common','sky feather common':'sky_common','shade essence rare':'shade_rare','rune stone rare':'rune_rare','sky feather rare':'sky_rare'} as const;
const lines=readFileSync(new URL('../docs/balance/imported/monsters-v2.csv',import.meta.url),'utf8').split(/\r?\n/).filter(line=>/^,normal,/.test(line));
test('historical v2 CSV is the exact provenance for revision 5 HP',()=>{
 expect(lines).toHaveLength(19);
 const rows=lines.map(line=>{const cells=line.split(',');return {level:Number(cells[2]),hp:Number(cells[3])};});
 const hpAt=(level:number)=>{const first=rows[0],last=rows.at(-1)!,upper=rows.find(row=>row.level>=level)||last,lower=[...rows].reverse().find(row=>row.level<=level)||first,t=upper.level===lower.level?0:(level-lower.level)/(upper.level-lower.level);return (lower.hp+(upper.hp-lower.hp)*t)*(level<first.level?level/first.level:1);};
 for(const [kind,spec] of Object.entries(species))expect(contentConfig.normalBalance.revision5Hp[kind as keyof typeof species]).toBeCloseTo(hpAt(spec.level)*(spec.boss?30:spec.miniBoss?15:1),12);
 expect(rows.find(row=>row.level===75)!.hp).toBe(3456);expect(rows.find(row=>row.level===80)!.hp).toBe(1992);
});
test('every existing species derives new HP ATK DEF gold with v3 elite multipliers and unchanged rewards',()=>{
 const sim=new Simulation(()=>.5,undefined,null);
 for(const [kind,base] of Object.entries(species)){const normal=normalMonsterBalance(base.level),actual=sim.monsterSpec(kind as keyof typeof species),tier=base.boss?contentConfig.normalBalance.boss:base.miniBoss?contentConfig.normalBalance.mini:{hp:1,atk:1,defense:1,goldPerLevel:0};
  for(const key of ['hp','atk','defense'] as const)expect(actual[key]).toBe(normal[key]*tier[key]);
  expect(actual.gold).toBe(base.boss||base.miniBoss?base.level*tier.goldPerLevel:normal.gold);
 }
 expect(contentConfig.normalBalance.boss).toMatchObject({hp:40,atk:12,defense:2,goldPerLevel:50});
 expect(contentConfig.normalBalance.mini).toMatchObject({hp:20,atk:6,defense:1.5,goldPerLevel:30});
});
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(realm:Realm){this.realm=structuredClone(realm);}async commit(revision:number,realm:Realm){if(revision!==this.revision)return false;this.realm=structuredClone(realm);this.revision++;return true;}}
test('revision 4 living monster HP fractions migrate once without changing player saves or corpse timers',async()=>{
 const store=new Store(),identity={id:'monster-v2-fixture',name:'Keeper'};const initial=await transact(store,identity,{connect:true},1000),room=store.realm!.rooms!.glade;
 room.balanceRevision=4;const normal=room.monsters.find(monster=>!species[monster.kind].boss&&!species[monster.kind].miniBoss)!,boss=room.monsters.find(monster=>species[monster.kind].boss)!,dead=room.monsters.find(monster=>monster.id!==normal.id&&monster.id!==boss.id)!;
 normal.hp=contentConfig.normalBalance.revision4Hp[normal.kind]*.25;normal.poison=3;boss.hp=contentConfig.normalBalance.revision4Hp[boss.kind]*.4;dead.alive=false;dead.hp=0;dead.respawn=41;
 const updated=await transact(store,identity,{},1000),next=store.realm!.rooms!.glade,sim=new Simulation(()=>.5,undefined,null);
 expect(next.balanceRevision).toBe(MONSTER_BALANCE_REVISION);expect(updated.player.actor.save).toEqual(initial.player.actor.save);expect(updated.player.session).toEqual(initial.player.session);
 expect(next.monsters.find(monster=>monster.id===normal.id)!.hp).toBeCloseTo(sim.monsterSpec(normal.kind).hp*.25);expect(next.monsters.find(monster=>monster.id===normal.id)!.poison).toBe(3);expect(next.monsters.find(monster=>monster.id===boss.id)!.hp).toBeCloseTo(sim.monsterSpec(boss.kind).hp*.4);expect(next.monsters.find(monster=>monster.id===dead.id)).toMatchObject({alive:false,hp:0,respawn:41});
 const hp=next.monsters.find(monster=>monster.id===boss.id)!.hp;await transact(store,identity,{},1000);expect(store.realm!.rooms!.glade.monsters.find(monster=>monster.id===boss.id)!.hp).toBe(hp);
});
