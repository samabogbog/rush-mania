import {test,expect} from '@playwright/test';
import {readFileSync,statSync} from 'node:fs';
import {skills,type ClassId} from '../src/game/classes';
import {skillPose} from '../src/render/skill-choreography';
test('all eighteen authentic learned casts drive the same gravity/rotation poses as deterministic previews after final runtime freeze',()=>{
 const latest=Math.max(...['src/render/model-library.ts','src/render/skill-choreography.ts'].map(f=>statSync(f).mtimeMs));
 for(const job of Object.keys(skills)as ClassId[])for(const skill of skills[job].filter(s=>[50,60,70].includes(s.level))){
  const path=`artifacts/skill-motion-lv50-70/${skill.id}-gameplay.json`;expect(statSync(path).mtimeMs).toBeGreaterThan(latest);const proof=JSON.parse(readFileSync(path,'utf8'));
  const actual=proof.timeline.flatMap((f:any)=>f.poses||[]).filter((a:any)=>a.context?.skillId===skill.id);expect(actual.length).toBeGreaterThan(2);
  for(const a of actual){const p=skillPose(a.context);for(let n=0;n<3;n++){expect(a.position[n]).toBeCloseTo([p.x,p.y,p.z][n],6);expect(a.rotation[n]).toBeCloseTo([p.pitch,p.yaw,p.roll][n],6);}}
  expect(proof.recovered.vfx.active).toBe(0);expect(proof.errors).toEqual([]);
 }
});
