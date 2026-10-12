import {makeActor,seeded,duel,profile,type Build,type Gear} from './attribute-duel-audit';
import {writeFileSync,mkdirSync} from 'node:fs';
import {progression} from '../src/config/balance';
const trials=Number(process.argv[2]||200),out=process.argv[3]||'after';
const rows:any[]=[],pairs:[Build,Build][]=[['str','vit'],['str','agi'],['vit','agi']];
for(const level of [20,50,100])for(const gear of ['none','common','legend10','legendRolled'] as Gear[])for(const job of ['swordsman','mage','archer'] as const)for(const branch of [0,1] as const)for(const skills of (branch?[true]:[false,true]))for(const [sa,sb] of pairs){
 const a=makeActor(job,level,sa,gear,seeded(137),branch),b=makeActor(job,level,sb,gear,seeded(919),branch);let win=0,loss=0,draw=0,timeouts=0,seconds=0;
 const profiles=[profile(a),profile(b)];
 for(let n=0;n<trials;n++){const r=duel(a,b,skills);if(r.winner==='a')win++;else if(r.winner==='b')loss++;else draw++;if(r.reason==='timeout')timeouts++;seconds+=r.seconds;}
 const row={job,level,gear,mode:skills?(branch?'skills-b':'skills'):'basic',a:sa,b:sb,trials,win,loss,draw,timeouts,score:(win+draw*.5)/trials,seconds:seconds/trials,profiles};rows.push(row);
 console.log(job,level,gear,row.mode,sa,sb,row.score.toFixed(3),'draw',draw);
}
mkdirSync('artifacts/attribute-balance',{recursive:true});writeFileSync('artifacts/attribute-balance/'+out+'.json',JSON.stringify({trials,attributes:progression.attributes??null,rows,scope:'Counterfactual same-class static duels, no real PvP feature; player CC excluded, poison retained; equal gear; legendRolled includes reproducible legal random affixes.'},null,2));
