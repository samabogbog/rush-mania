import {test,expect} from '@playwright/test';
import {skillPose,skillRecoveryDuration} from '../src/render/skill-choreography';
test('sixty branch/stage recipes land cleanly and remain within local visual envelope',()=>{
 for(const job of ['swordsman','mage','archer'])for(const branch of [0,1])for(let stage=1;stage<=10;stage++){
  const context={job,branch,stage,effect:'hit',phase:'release' as const,progress:0};
  for(let i=0;i<=100;i++){const p=skillPose({...context,progress:i/100});expect(Math.abs(p.z)).toBeLessThanOrEqual(1.201);expect(p.y).toBeGreaterThanOrEqual(-.001);expect(p.y).toBeLessThanOrEqual(1.441);expect(p.speed).toBeGreaterThan(3);}
  const final=skillPose({...context,progress:1});expect(final.y).toBeCloseTo(0);expect(final.z).toBeCloseTo(0);expect(Math.sin(final.pitch)).toBeCloseTo(0);expect(Math.sin(final.yaw)).toBeCloseTo(0);expect(final.clip).toBe(job==='archer'?'skill':'land');expect(skillRecoveryDuration(stage)).toBeLessThanOrEqual(.48);
 }
});
test('high archer flips use source jump and support skills retain full-body casting',()=>{
 expect(skillPose({job:'archer',stage:10,branch:0,effect:'hit',phase:'release',progress:.35}).clip).toBe('jump');
 expect(skillPose({job:'archer',stage:10,branch:0,effect:'hit',phase:'release',progress:.35}).pitch).toBeGreaterThan(Math.PI/2);
 expect(skillPose({job:'mage',stage:10,branch:1,effect:'heal',phase:'release',progress:.35}).clip).toBe('skill-heal');
});

test('archer returns to weapon-safe aiming before ground contact, while other landings stay authored',()=>{
 for(const progress of [.64,.68,.72,.76,.8,.84,.9,1]){
  expect(skillPose({job:'archer',stage:10,branch:0,effect:'hit',phase:'recovery',progress}).clip).toBe('skill');
 }
 for(const job of ['mage','swordsman'])expect(skillPose({job,stage:10,branch:0,effect:'hit',phase:'recovery',progress:.9}).clip).toBe('land');
});

test('archer branch landing roll settles before low ground clearance without changing flip endpoint',()=>{
 for(const branch of [0,1])for(const progress of [.68,.72,.76,.8,.84,.9,1]){
  const pose=skillPose({job:'archer',stage:10,branch,effect:'hit',phase:'release',progress});
  expect(pose.clip).toBe('skill');expect(pose.roll).toBeCloseTo(0);
 }
 expect(skillPose({job:'archer',stage:10,branch:1,effect:'hit',phase:'release',progress:1}).pitch).toBeCloseTo(2*Math.PI);
});
