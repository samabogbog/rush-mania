import {economy} from '../config/balance.js';
import type {Item} from '../simulation.js';

export type PotionEffect={amount:number;remaining:number;duration:number};
export type PotionRecovery={hp:PotionEffect|null;mp:PotionEffect|null};
/** The caller excludes elites; each normal kill rolls both potions exactly once, independently. */
export function rollPotionDrops(random=Math.random):Item[]{
 const out:Item[]=[];
 if(random()<economy.potionDrops.red)out.push({name:'Red potion',icon:'health-potion',category:'consumable',count:1});
 if(random()<economy.potionDrops.blue)out.push({name:'Blue potion',icon:'mana-potion',category:'consumable',count:1});
 return out;
}
