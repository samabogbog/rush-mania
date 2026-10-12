import {makeActor,seeded,profile,type Build,type Gear} from './attribute-duel-audit';
import {normalMonsterBalance} from '../src/game/content';
import {zoneMonsterGroups} from '../src/game/map-data';
import {writeFileSync} from 'node:fs';
const rows:any[]=[];
for(const job of ['swordsman','mage','archer'] as const)for(const level of [20,50,100])for(const gear of ['none','common','legend10','legendRolled'] as Gear[])for(const build of ['str','vit','agi'] as Build[])for(const skills of [false,true]){
 let kills=0,deaths=0,totalSeconds=0,totalHp=0,totalDamageEvents=0;
 for(let n=0;n<30;n++){
  const s=makeActor(job,level,build,gear,seeded(713+n*19)),m=s.monsters[0],spec=normalMonsterBalance(level);
  const group=zoneMonsterGroups(s.save.zone)[0];s.x=group.x;s.z=group.z;m.x=group.x+1;m.z=group.z;m.homeX=m.x;m.homeZ=m.z;m.groupId=group.id;m.aggro=true;m.returning=false;m.windup=0;m.attack=0;
  s.balance[m.kind]={hp:spec.hp,atk:spec.atk,defense:spec.defense,xp:0,gold:0};m.hp=spec.hp;s.enemyFilter=()=>true;s.auto=skills;
  s.onEvent=(_text,type)=>{if(type==='damage')totalDamageEvents++;};s.onKill=()=>true;
  let t=0;for(;t<120&&s.save.hp>0&&m.alive;t+=.025)s.tick(.025,0,0);
  if(!m.alive)kills++;if(s.save.hp<=0)deaths++;totalSeconds+=t;totalHp+=Math.max(0,s.save.hp)/s.maxHp;
 }
 rows.push({job,level,gear,build,mode:skills?'skills':'basic',kills,deaths,trials:30,seconds:totalSeconds/30,hpRemaining:totalHp/30,damageEvents:totalDamageEvents,profile:profile(makeActor(job,level,build,gear,seeded(1)))});
}
writeFileSync('artifacts/attribute-balance/pve-after.json',JSON.stringify({scope:'Stationary normal-monster encounter using production tick/hit/AI, same-level configured normal stats, no consumables/kiting; game has no PvP',rows},null,2));
