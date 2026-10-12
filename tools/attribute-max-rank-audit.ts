import {makeActor,seeded,duel,profile,type Build,type Gear} from './attribute-duel-audit';
import {progression} from '../src/config/balance';
import {writeFileSync} from 'node:fs';
const trials=200,rows:any[]=[];
for(const gear of ['none','common','legend10','legendRolled'] as Gear[])for(const job of ['swordsman','mage','archer'] as const)for(const branch of [0,1] as const)for(const [sa,sb] of [['str','vit'],['str','agi'],['vit','agi']] as [Build,Build][]){
 const a=makeActor(job,100,sa,gear,seeded(137),branch),b=makeActor(job,100,sb,gear,seeded(919),branch);
 for(const s of [a,b])for(const skill of s.unlockedSkills)for(let rank=1;rank<5;rank++)if(!s.upgradeSkill(skill.id))throw Error('Rank fixture failed: '+skill.id);
 let win=0,loss=0,draw=0,timeouts=0;
 for(let n=0;n<trials;n++){const r=duel(a,b,true);if(r.winner==='a')win++;else if(r.winner==='b')loss++;else draw++;if(r.reason==='timeout')timeouts++;}
 const row={job,level:100,gear,mode:branch?'skills-b':'skills',rank:5,a:sa,b:sb,trials,win,loss,draw,timeouts,score:(win+draw*.5)/trials,profiles:[profile(a),profile(b)]};rows.push(row);console.log(job,gear,row.mode,sa,sb,row.score.toFixed(3));
}
writeFileSync('artifacts/attribute-balance/max-rank.json',JSON.stringify({trials,attributes:progression.attributes,rows,scope:'Same stationary receiver adapter, Lv100 rank5 learned/upgraded through production methods, equal loadouts; no player CC.'},null,2));
