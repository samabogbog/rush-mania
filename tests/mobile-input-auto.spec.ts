import {test,expect} from '@playwright/test';
import {joystickVector} from '../src/game/mobile-input';
import {Simulation} from '../src/simulation';
import {NetworkSimulation} from '../src/game/network';
import {capture,type Realm} from '../server/protocol';
import {transact} from '../server/realm';
import type {RealmStore} from '../server/store';
function fighter(job:'swordsman'|'mage'='swordsman'){const sim=new Simulation(()=>.5,undefined,null);sim.save.level=30;sim.setClass(job);sim.chooseSkill(`${job}-1`);sim.chooseSkill(`${job}-2`);sim.save.hotbar=[`${job}-1`,`${job}-2`,null,null,null,null];sim.populateZone('glade');sim.obstacles=[];sim.x=0;sim.z=0;sim.monsters=sim.monsters.slice(0,8).map((m,i)=>({...m,id:i,x:1+i*.02,z:0,homeX:1,homeZ:0,hp:1e9,attack:1e6,stun:1e6}));sim.target=0;sim.save.mp=sim.maxMp;sim.setAuto(true);return sim;}
test('joystick clamps radial displacement, deadzone, diagonals and fractional speed',()=>{
 expect(joystickVector(1,1,40).dx).toBe(0);expect(joystickVector(0,0,40)).toEqual({dx:0,dz:0,knobX:0,knobZ:0});
 const half=joystickVector(20,0,40);expect(half.dx).toBeCloseTo((.5-.16)/.84);expect(half.knobX).toBe(20);
 const diagonal=joystickVector(80,80,40);expect(Math.hypot(diagonal.dx,diagonal.dz)).toBeCloseTo(1);expect(Math.hypot(diagonal.knobX,diagonal.knobZ)).toBeCloseTo(40);
 const partial=fighter(),full=fighter(),keyboard=fighter();partial.setAuto(false);full.setAuto(false);keyboard.setAuto(false);partial.tick(.1,.5,0);full.tick(.1,1,0);keyboard.tick(.1,1,1);expect(partial.x).toBeCloseTo(full.x/2);expect(Math.hypot(keyboard.x,keyboard.z)).toBeCloseTo(full.x);
});
test('Auto rotates assigned learned skills, respects ranked cap and captures actual cooldown totals',()=>{
 const s=fighter();for(let n=0;n<4;n++)s.upgradeSkill('swordsman-1');const casts:string[]=[],hits:number[]=[];const original=s.castSkill.bind(s);s.castSkill=id=>{const accepted=original(id);if(accepted)casts.push(id);return accepted;};s.hit=m=>{hits.push(m.id);};
 s.tick(.01,0,0);expect(casts).toEqual(['swordsman-1']);expect(hits).toHaveLength(6);const total=s.skillCooldownTotals['swordsman-1'];expect(s.skillCooldownRatio('swordsman-1')).toBe(1);s.tick(.01,0,0);expect(casts).toEqual(['swordsman-1','swordsman-2']);expect(s.autoSkillCursor).toBe(2);expect(s.x).toBe(0);expect(s.z).toBe(0);expect(capture(s).skillCooldownTotals['swordsman-1']).toBe(total);
 s.skillCooldowns['swordsman-1']=total/2;Object.defineProperty(s,'cooldownMultiplier',{get:()=>.6});expect(s.skillCooldownRatio('swordsman-1')).toBe(.5);expect(s.skillCooldownTotals['swordsman-1']).toBe(total);
});
test('Auto ignores unassigned/unlearned skills, blocked targets, movement, death and mana shortages silently; basic attack fallback',()=>{
 const s=fighter(),events:string[]=[];s.attackTimer=100;s.onEvent=text=>events.push(text);let casts=0;const original=s.castSkill.bind(s);s.castSkill=id=>{casts++;return original(id);};s.save.hotbar=['swordsman-20',null,null,null,null,null];s.tick(.01,0,0);expect(casts).toBe(0);
 s.save.hotbar=['swordsman-1','swordsman-2',null,null,null,null];s.direct=()=>false;s.tick(.01,0,0);expect(casts).toBe(0);s.direct=()=>true;s.save.mp=0;s.attackTimer=0;let swings=0;s.hit=()=>{swings++;};s.tick(.01,0,0);expect(casts).toBe(0);expect(swings).toBe(1);expect(events).toEqual([]);
 s.save.mp=s.maxMp;s.tick(.01,.4,0);expect(casts).toBe(0);s.deathTime=1;s.tick(.01,0,0);expect(casts).toBe(0);s.deathTime=0;s.paused=true;s.tick(.01,0,0);expect(casts).toBe(0);
});
test('Auto holds during casting but preserves ordinary chase outside stationary territories',()=>{
 const walking=fighter();walking.goTo(2,0);walking.tick(.1,0,0);expect(walking.x).toBeGreaterThan(0);expect(walking.skillCooldowns).toEqual({});
 const s=fighter('mage');s.save.mp=s.maxMp;s.tick(.01,0,0);expect(s.cast?.skillId).toBe('mage-1');s.tick(.01,0,0);expect(s.skillCooldowns['mage-2']||0).toBe(0);
 s.cast=null;s.skillCooldowns={};s.monsters.forEach(m=>{m.x=15;});s.tick(.1,0,0);expect(s.x).toBeGreaterThan(0);expect(s.z).toBe(0);expect(s.skillCooldowns).toEqual({});
 const scheduledElsewhere=fighter();scheduledElsewhere.enemyFilter=()=>false;scheduledElsewhere.tick(.01,0,0);expect(scheduledElsewhere.skillCooldowns['swordsman-1']).toBeGreaterThan(0);
});
class Store implements RealmStore{realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null;}async create(r:Realm){this.realm=structuredClone(r);}async commit(rev:number,r:Realm){if(rev!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true;}}
test('server Auto uses same assigned skills and retains rotation/totals across snapshots and legacy actors',async()=>{
 const store=new Store(),identity={id:'autofighter',name:'Auto fighter'};let snap=await transact(store,identity,{connect:true},1000);const sim=fighter();store.realm!.players[identity.id].actor=capture(sim);const room=store.realm!.rooms![store.realm!.players[identity.id].room!];room.monsters=structuredClone(sim.monsters);
 snap=await transact(store,identity,{},1100);expect(snap.player.actor.skillCooldowns['swordsman-1']).toBeGreaterThan(0);expect(snap.player.actor.skillCooldowns['swordsman-2']).toBeGreaterThan(0);expect(snap.player.actor.skillCooldownTotals['swordsman-1']).toBeGreaterThanOrEqual(snap.player.actor.skillCooldowns['swordsman-1']);expect(snap.player.actor.autoSkillCursor).toBe(2);
 delete (store.realm!.players[identity.id].actor as any).skillCooldownTotals;delete (store.realm!.players[identity.id].actor as any).autoSkillCursor;snap=await transact(store,identity,{},1200);expect(snap.player.actor.autoSkillCursor).toBe(0);expect(snap.player.actor.skillCooldownTotals).toBeDefined();expect(snap.player.actor.skillCooldowns['swordsman-1']).toBeGreaterThan(0);
});

test('network release sends zero input without waiting for animation frame and cooldown presentation interpolates',()=>{
 let queued=0;const actor={input:[.5,.3],schedule:()=>{queued++;}};
 NetworkSimulation.prototype.stopMovementInput.call(actor as any);expect(actor.input).toEqual([0,0]);expect(queued).toBe(1);NetworkSimulation.prototype.stopMovementInput.call(actor as any);expect(queued).toBe(1);
 const snapshot={skillCooldowns:{test:3},receivedAt:performance.now()-1000};expect(NetworkSimulation.prototype.skillCooldownRemaining.call(snapshot as any,'test')).toBeCloseTo(2,1);snapshot.receivedAt=performance.now()-4000;expect(NetworkSimulation.prototype.skillCooldownRemaining.call(snapshot as any,'test')).toBe(0);expect(snapshot.skillCooldowns.test).toBe(3);
});
