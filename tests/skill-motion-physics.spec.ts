import {test,expect} from '@playwright/test';
import {skills,type ClassId} from '../src/game/classes';
import {skillPose} from '../src/render/skill-choreography';
import {skillRecoveryDuration,skillCastDuration} from '../src/game/skill-timing';
const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(s=>[50,60,70].includes(s.level)).map(skill=>({job,skill})));
const at=(job:string,skill:any,t:number,duration=skillRecoveryDuration(skill.stage))=>skillPose({job,stage:skill.stage,branch:skill.branch,effect:skill.effect,skillId:skill.id,phase:'release',progress:t/duration,duration});
test('all eighteen Lv50–70 skills land within .54 seconds with constant gravity instead of stretched airborne motion',()=>{
 expect(rows).toHaveLength(18);
 for(const {job,skill} of rows){
  const grounded=skill.branch===1&&skill.stage!==6,T=skill.stage===7?.46:skill.stage===6?.44:.42,land=.075+T;
  for(const t of [.1,.2,.3,.4]){const p=at(job,skill,t);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.y).toBeLessThan(.27);expect(p.y).toBeCloseTo(at(job,skill,t,2.4).y,8);}
  if(!grounded){const h=.001,t=.075+T/2;const acc=(at(job,skill,t+h).y-2*at(job,skill,t).y+at(job,skill,t-h).y)/(h*h);expect(acc).toBeCloseTo(-9.8,4);expect(at(job,skill,t).y).toBeCloseTo(9.8*T*T/8,6);}else expect(at(job,skill,.3).y).toBe(0);
  for(const t of [land,.6,.8,1,skillRecoveryDuration(skill.stage)])expect(at(job,skill,t).y).toBeCloseTo(0,8);
 }
});
test('takeoff, landing, grounded followthrough and reset remain continuous; Piercing Volley completes flip before touchdown',()=>{
 const delta=.00001;
 for(const {job,skill} of rows){const duration=skillRecoveryDuration(skill.stage),land=.075+(skill.stage===7?.46:skill.stage===6?.44:.42);
  for(const t of [.075,land,land+.16,duration]){const a=at(job,skill,t-delta),b=at(job,skill,Math.min(duration,t+delta));for(const k of ['x','y','z']as const)expect(Math.abs(a[k]-b[k])).toBeLessThan(.001);for(const k of ['pitch','yaw','roll']as const)expect(Math.abs(Math.atan2(Math.sin(a[k]-b[k]),Math.cos(a[k]-b[k])))).toBeLessThan(.005);}
  const final=at(job,skill,duration);expect([final.x,final.y,final.z,final.pitch,final.yaw,final.roll]).toEqual([0,0,0,0,0,0]);
 }
 const skill=skills.archer.find(s=>s.id==='archer-7')!;expect(at('archer',skill,.3).pitch).toBeLessThan(-Math.PI/2);expect(Math.abs(Math.sin(at('archer',skill,.515).pitch))).toBeLessThan(.05);expect(at('archer',skill,.54).y).toBe(0);
});
test('long actual casts keep deliberate grounded gestures and followthrough fills recovery without changing skill data',()=>{
 for(const {job,skill} of rows){const before=JSON.stringify(skill),duration=skillRecoveryDuration(skill.stage);const poses=[.8,.9,1,1.1].map(t=>at(job,skill,t));expect(new Set(poses.map(p=>p.clipProgress.toFixed(3))).size).toBeGreaterThan(1);
  if(skill.cast){const d=skillCastDuration(skill.cast),samples=[.1,.4,.7,1].map(t=>skillPose({job,stage:skill.stage,branch:skill.branch,effect:skill.effect,skillId:skill.id,phase:'anticipation',progress:t/d,duration:d}));expect(samples.every(p=>p.y===0)).toBe(true);expect(new Set(samples.map(p=>p.clipProgress.toFixed(3))).size).toBeGreaterThan(1);}
  expect(JSON.stringify(skill)).toBe(before);expect(duration).toBeCloseTo((.36+skill.stage*.012)*3,10);
 }
});
