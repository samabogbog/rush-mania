import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {species} from '../src/game/content';
const names={'refine stone':'commonStone','shade essence common':'shade_common','rune stone common':'rune_common','sky feather common':'sky_common','shade essence rare':'shade_rare','rune stone rare':'rune_rare','sky feather rare':'sky_rare'} as const;
const rows=readFileSync(new URL('../docs/balance/imported/monsters-v2.csv',import.meta.url),'utf8').split(/\r?\n/).filter(line=>/^,normal,/.test(line)).map(line=>{const drops=Object.fromEntries(Object.values(names).map(key=>[key,0]));for(const match of line.matchAll(/(refine stone|Shade essence common|rune stone common|sky feather common|Shade essence rare|rune stone rare|sky feather rare):([\d.]+)%?/gi))drops[names[match[1].toLowerCase() as keyof typeof names]]=Number(match[2])/100;return {level:Number(line.split(',')[2]),drops};});
for(const kind of Object.keys(species).filter(kind=>species[kind as keyof typeof species].miniBoss))test(`${kind} retains v2 stone and all material rates despite the v3 normal table`,()=>{
 const sim=new Simulation(()=>1,undefined,null),spec=species[kind as keyof typeof species];const monster=sim.monsters[0];monster.kind=kind as keyof typeof species;const lower=[...rows].reverse().find(r=>r.level<=spec.level)||rows[0],upper=rows.find(r=>r.level>=spec.level)||rows.at(-1)!,t=upper.level===lower.level?0:(spec.level-lower.level)/(upper.level-lower.level);const row={drops:Object.fromEntries(Object.keys(lower.drops).map(key=>[key,lower.drops[key]+(upper.drops[key]-lower.drops[key])*t]))};
 sim.random=()=>row.drops.commonStone-1e-12;expect(sim.rollStoneLoot(monster)?.name).toBe('Common refine stone');sim.random=()=>row.drops.commonStone+1e-12;expect(sim.rollStoneLoot(monster)).toBeUndefined();
 for(const [index,key] of (['shade_common','shade_rare','rune_common','rune_rare','sky_common','sky_rare'] as const).entries()){
  const chance=row.drops[key];let cursor=0;sim.random=()=>cursor++===index?Math.max(0,chance-1e-12):1;const drops=sim.rollMaterialLoot(monster);expect(drops).toHaveLength(chance>0?1:0);if(chance>0)expect(drops[0].rarity).toBe(key.split('_')[1]);
  cursor=0;sim.random=()=>cursor++===index?chance+1e-12:1;expect(sim.rollMaterialLoot(monster)).toEqual([]);
 }
});
