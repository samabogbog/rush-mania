import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';
const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(s=>s.level===60).map(skill=>({job,skill})));
test('all six icon-authored Lv60 focal volumes survive overlapping casts on low/high and fully dispose',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),styles=new Set<string>();
 for(const low of [true,false]){
  vfx.setLowQuality(low);
  for(let repeat=0;repeat<12;repeat++)for(const {job,skill} of rows){
   const before=JSON.stringify(skill),x=repeat*30+skill.branch*10;
   vfx.anticipation(skill,job,x,0);vfx.release(skill,job,x,0,x+4,2);
   const d=vfx.diagnostics,cue=(d as any).lv60Cue;expect(cue.skillId).toBe(skill.id);styles.add(cue.style);
   expect(cue.decorativeRadius).toBeGreaterThan(9.2);expect(cue.heroSeconds).toBeGreaterThan(.6);
   expect(cue.focal).toEqual(job==='swordsman'&&skill.effect==='area'?{x,z:0}:{x:x+4,z:2});
   expect(d.active).toBeLessThanOrEqual(low?40:96);expect(d.pooled).toBeLessThanOrEqual(160);
   const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D);
   expect(meshes.some(m=>m.metadata?.vfxShape==='ring'&&m.position.x===cue.focal.x&&m.position.z===cue.focal.z)).toBe(true);
   expect(meshes.length).toBeGreaterThan(6);expect(meshes.every(m=>m.billboardMode===0&&!(m.material as any)?.diffuseTexture)).toBe(true);expect(JSON.stringify(skill)).toBe(before);
  }
  vfx.update(5);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.drawCount).toBe(0);vfx.clear();expect((vfx.diagnostics as any).lv60Cue).toBeNull();
 }
 expect(styles.size).toBe(6);vfx.dispose();expect(scene.meshes).toHaveLength(0);expect(vfx.diagnostics.materials).toBe(0);scene.dispose();engine.dispose();
});
test('Lv60 crescendo remains visible after Lv50 fades, while pooling and materials stabilize',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const low of [true,false])for(const {job,skill} of rows){
  vfx.setLowQuality(low);const base=skills[job].find(s=>s.level===50&&s.branch===skill.branch)!;
  vfx.release(base,job,0,0,4,2);vfx.update(1.1);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
  vfx.release(skill,job,0,0,4,2);vfx.update(1.1);expect(vfx.diagnostics.drawCount).toBeGreaterThan(0);vfx.update(5);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
 }
 const first={pooled:vfx.diagnostics.pooled,materials:vfx.diagnostics.materials};
 for(let n=0;n<10;n++)for(const {job,skill} of rows){vfx.release(skill,job,0,0,4,2);vfx.update(5);vfx.clear();}
 expect(vfx.diagnostics.pooled).toBe(first.pooled);expect(vfx.diagnostics.materials).toBe(first.materials);vfx.dispose();scene.dispose();engine.dispose();
});
test('Hunter Focus complete eye silhouette stays above the ground on both quality settings',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),skill=skills.archer.find(s=>s.id==='archer-6')!;
 for(const low of [true,false]){
  vfx.setLowQuality(low);vfx.release(skill,'archer',0,0,4,2);vfx.update(.4);
  const eyelids=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='arch');expect(eyelids.length).toBeGreaterThanOrEqual(4);
  for(const m of eyelids){m.computeWorldMatrix(true);expect(m.getBoundingInfo().boundingBox.minimumWorld.y).toBeGreaterThan(.1);}
  vfx.clear();
 }
 vfx.dispose();scene.dispose();engine.dispose();
});
