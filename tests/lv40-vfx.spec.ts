import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';
const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(s=>s.level===40).map(skill=>({job,skill})));
test('all six Lv40 skills keep their focal silhouette under repeated overlapping casts, recycle and dispose',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),styles=new Set<string>();
 for(const low of [true,false]){
  vfx.setLowQuality(low);
  for(let repeat=0;repeat<12;repeat++)for(const {job,skill} of rows){
   const before=JSON.stringify(skill),x=repeat*30+skill.branch*10;
   vfx.release(skill,job,x,0,x+4,2);
   const d=vfx.diagnostics;expect(d.active).toBeLessThanOrEqual(low?40:96);expect(d.pooled).toBeLessThanOrEqual(160);
   const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D);
   expect(meshes.some(m=>m.metadata?.vfxShape==='core'&&Math.abs(m.position.x-x)<8)).toBe(true);
   const cue=(d as any).lv40Cue;expect(cue?.skillId).toBe(skill.id);styles.add(cue.style);const focal=job==='swordsman'&&skill.branch===1?{x,z:0}:{x:x+4,z:2};expect(cue.focal).toEqual(focal);expect(meshes.some(m=>m.metadata?.vfxShape==='core'&&m.position.x===focal.x&&m.position.z===focal.z)).toBe(true);
   expect(cue.decorativeRadius).toBeGreaterThan(6.6);
   expect(meshes.every(m=>m.billboardMode===0&&!((m.material as any)?.diffuseTexture))).toBe(true);
   expect(JSON.stringify(skill)).toBe(before);
  }
  vfx.update(3);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.drawCount).toBe(0);
  vfx.clear();expect((vfx.diagnostics as any).lv40Cue).toBeNull();
 }
 expect(styles.size).toBe(6);vfx.dispose();expect(scene.meshes).toHaveLength(0);expect(vfx.diagnostics.materials).toBe(0);scene.dispose();engine.dispose();
});
test('Lv40 effects stay anchored to the game target and build a broader late wave than Lv30',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const low of [true,false])for(const {job,skill} of rows){
  vfx.setLowQuality(low);vfx.release(skill,job,0,0,4,2);vfx.update(.56);
  expect(vfx.diagnostics.active).toBeGreaterThan(0);
  const rings=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='ring'&&m.position.y<.6);
  expect(rings.some(m=>m.scaling.x>6.6)).toBe(true);
  vfx.update(3);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
 }
 vfx.dispose();scene.dispose();engine.dispose();
});
