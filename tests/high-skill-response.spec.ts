import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {skills,type ClassId} from '../src/game/classes';
import {skillCastDuration,skillRecoveryDuration} from '../src/game/skill-timing';
import {capture,type Realm} from '../server/protocol';
import {transact} from '../server/realm';
import type {RealmStore} from '../server/store';
function fighter(job:ClassId,id:string){
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.setClass(job);const skill=skills[job].find(k=>k.id===id)!;
 for(let stage=1;stage<skill.stage;stage++)expect(s.chooseSkill(`${job}-${stage}`)).toBe(true);expect(s.chooseSkill(id)).toBe(true);
 s.save.hotbar=[id,null,null,null,null,null];s.save.mp=s.maxMp;s.populateZone('glade');s.obstacles=[];s.x=0;s.z=0;s.attackTimer=100;
 s.monsters=s.monsters.slice(0,8).map((m,i)=>({...m,id:i,x:1+i*.02,z:0,homeX:1,homeZ:0,hp:1e9,attack:1e6,stun:1e6}));s.target=0;return s;
}
test('all twelve Lv90/100 skills damage within 0.2s, resolve once, retain recovery and reject spam',()=>{
 for(const job of ['swordsman','mage','archer'] as const)for(const skill of skills[job].filter(k=>k.level>=90))for(const step of [.01,.025,.05,.2]){
  const s=fighter(job,skill.id),hits:number[]=[],hit=s.hit.bind(s);s.hit=(m,a,isSkill=false)=>{if(isSkill)hits.push(s.time);hit(m,a,isSkill)};
  expect(s.castSkill(skill.id)).toBe(true);const spent=s.save.mp;expect(s.castSkill(skill.id)).toBe(false);expect(s.save.mp).toBe(spent);
  while(!hits.length&&s.time<.2-1e-9)s.tick(step,0,0);
  expect(hits.length).toBeGreaterThan(0);expect(hits[0]).toBeLessThanOrEqual(.2+1e-9);expect(s.cast).toBeNull();expect(s.actionTime).toBeGreaterThan(0);expect(s.actionTime).toBeLessThanOrEqual(skillRecoveryDuration(skill.stage));
  const count=hits.length;s.tick(.025,0,0);expect(hits.length).toBe(count);expect(s.skillCooldowns[skill.id]).toBeGreaterThan(0);
 }
 for(const job of ['swordsman','mage','archer'] as const)for(const skill of skills[job])expect(skillCastDuration(skill.cast,skill.level)).toBeCloseTo(skill.level>=90?Math.min((skill.cast||0)*3,.05):(skill.cast||0)*3);
});
class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(rev:number,r:Realm){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
test('realtime client predicts the same short cast as server for all twelve high-tier skills',async()=>{
 Object.defineProperty(globalThis,'document',{value:{addEventListener(){}},configurable:true});
 const {RealtimeNetworkSimulation}=await import('../src/game/realtime-network');Reflect.deleteProperty(globalThis,'document');
 const anticipate=(RealtimeNetworkSimulation.prototype as any).anticipate;
 for(const job of ['swordsman','mage','archer'] as const)for(const skill of skills[job].filter(k=>k.level>=90)){
  const actor:any={paused:false,save:{hp:100,mp:1000},renderActionTime:0,skillCooldownRemaining:()=>0,unlockedSkills:[skill],sequence:1,cooldownMultiplier:1,skillCooldownTotals:{},target:0};
  anticipate.call(actor,skill.id);expect(actor.preview.duration).toBe(skillCastDuration(skill.cast,skill.level));
  if(skill.cast)expect(actor.cast.total).toBe(.05);else expect(actor.actionTime).toBeCloseTo(skillRecoveryDuration(skill.stage));
 }
});
test('authoritative command path damages within 200ms and replay cannot spend or damage again',async()=>{
 for(const job of ['swordsman','mage','archer'] as const)for(const skill of skills[job].filter(k=>k.level>=90)){
  const store=new Store(),user={id:'latency',name:'Latency'};let snap=await transact(store,user,{connect:true},1000);const s=fighter(job,skill.id);
  store.realm!.players[user.id].actor=capture(s);store.realm!.rooms![store.realm!.players[user.id].room!].monsters=structuredClone(s.monsters);
  const cmd={id:snap.player.session.id+':1',type:'skill',args:[0]};snap=await transact(store,user,{commands:[cmd]},1000);
  for(let time=1025;time<=1200&&snap.monsters.every(m=>m.hp===1e9);time+=25)snap=await transact(store,user,{},time);
  expect(snap.monsters.some(m=>m.hp<1e9)).toBe(true);expect(snap.player.actor.cast).toBeNull();const mp=snap.player.actor.save.mp,hp=snap.monsters.map(m=>m.hp);
  const repeated=await transact(store,user,{commands:[cmd]},1200);expect(repeated.monsters.map(m=>m.hp)).toEqual(hp);expect(repeated.player.actor.save.mp).toBeGreaterThanOrEqual(mp);
 }
});
