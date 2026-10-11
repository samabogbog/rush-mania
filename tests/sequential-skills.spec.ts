import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {type ClassId} from '../src/game/classes';
import {skillRecoveryDuration} from '../src/render/skill-choreography';
import {capture,type Realm} from '../server/protocol';
import {transact} from '../server/realm';
import type {RealmStore} from '../server/store';
function fighter(job:ClassId='swordsman'){
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.setClass(job);
 for(let i=1;i<=6;i++)expect(s.chooseSkill(`${job}-${i}`)).toBe(true);
 s.save.hotbar=Array.from({length:6},(_,i)=>`${job}-${i+1}`);s.populateZone('glade');s.obstacles=[];s.x=0;s.z=0;s.attackTimer=100;
 s.monsters=s.monsters.slice(0,8).map((m,i)=>({...m,id:i,x:1+i*.02,z:0,homeX:1,homeZ:0,hp:1e9,attack:1e6,stun:1e6}));s.target=0;s.save.mp=s.maxMp;return s;
}
for(const job of ['swordsman','mage','archer'] as const)test(`${job}: six ready slots execute in order with cast and complete recovery gaps`,()=>{
 const s=fighter(job),casts:{id:string;time:number}[]=[],original=s.castSkill.bind(s);s.castSkill=id=>{const ok=original(id);if(ok)casts.push({id,time:s.time});return ok};s.setAuto(true);s.tick(.01,0,0);expect(casts).toHaveLength(1);
 for(let i=0;i<1000&&casts.length<6;i++)s.tick(.01,0,0);
 expect(casts.map(c=>c.id)).toEqual(s.save.hotbar);
 for(let i=1;i<casts.length;i++){const previous=s.skillList.find(k=>k.id===casts[i-1].id)!;expect(casts[i].time-casts[i-1].time).toBeGreaterThanOrEqual((previous.cast||0)+skillRecoveryDuration(previous.stage)-.0001);}
 expect(Object.keys(s.skillCooldowns)).toHaveLength(6);
});
test('manual spam during instant skill recovery spends no MP and starts no other cooldown; pause freezes gate',()=>{
 const s=fighter();expect(s.castSkill('swordsman-5')).toBe(true);expect(s.actionTime).toBeCloseTo(skillRecoveryDuration(5));const mp=s.save.mp;
 for(let n=0;n<6;n++)s.skill(n);expect(s.save.mp).toBe(mp);expect(Object.keys(s.skillCooldowns)).toEqual(['swordsman-5']);s.paused=true;s.tick(1,0,0);expect(s.actionTime).toBeCloseTo(skillRecoveryDuration(5));s.paused=false;s.target=null;s.tick(s.actionTime+.001,0,0);expect(s.castSkill('swordsman-6')).toBe(true);
});
test('cast completion cannot chain a second skill or basic swing in its release tick; normal attacks resume after recovery',()=>{
 const s=fighter('mage');s.setAuto(true);s.save.hotbar=['mage-1','mage-2',null,null,null,null];s.attackTimer=0;const hits:boolean[]=[],hit=s.hit.bind(s);s.hit=(m,amount,skill=false)=>{hits.push(skill);hit(m,amount,skill)};s.tick(.01,0,0);expect(s.cast?.skillId).toBe('mage-1');s.tick(s.cast!.remaining+.001,0,0);expect(s.cast).toBeNull();expect(s.skillCooldowns['mage-2']||0).toBe(0);expect(hits.every(Boolean)).toBe(true);s.setAuto(false);s.tick(.01,0,0);expect(hits.every(Boolean)).toBe(true);s.tick(s.actionTime+.001,0,0);expect(hits).toContain(false);
});
test('AoE and poison damage cannot truncate or restart recovery; instant skill timers match every stage',()=>{
 for(let i=1;i<=6;i++){const s=fighter();expect(s.castSkill(`swordsman-${i}`)).toBe(true);expect(s.actionTime).toBeCloseTo(skillRecoveryDuration(i));const t=s.actionTime;s.hit(s.monsters[0],1,true);expect(s.actionTime).toBe(t);s.actionTime=0;s.hit(s.monsters[0],1,true);expect(s.actionTime).toBe(0);}
});
class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(rev:number,r:Realm){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
test('authoritative server rejects six same-packet instant commands, retains gate between requests and accepts next after recovery',async()=>{
 const store=new Store(),user={id:'sequence',name:'Sequence'};let snap=await transact(store,user,{connect:true},1000);const s=fighter();store.realm!.players[user.id].actor=capture(s);store.realm!.rooms![store.realm!.players[user.id].room!].monsters=structuredClone(s.monsters);const mp=s.save.mp;
 const commands=Array.from({length:6},(_,i)=>({id:snap.player.session.id+':'+(i+1),type:'skill',args:[i]}));snap=await transact(store,user,{commands},1000);expect(Object.keys(snap.player.actor.skillCooldowns)).toEqual(['swordsman-1']);expect(snap.player.actor.save.mp).toBe(mp-s.skillList[0].mp);expect(snap.player.actor.actionTime).toBeCloseTo(skillRecoveryDuration(1));
 snap=await transact(store,user,{commands:[{id:snap.player.session.id+':7',type:'skill',args:[1]}]},1100);expect(snap.player.actor.skillCooldowns['swordsman-2']||0).toBe(0);expect(snap.player.actor.actionTime).toBeGreaterThan(0);
 snap=await transact(store,user,{commands:[{id:snap.player.session.id+':8',type:'skill',args:[1]}]},1500);expect(snap.player.actor.skillCooldowns['swordsman-2']).toBeGreaterThan(0);
});
