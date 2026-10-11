import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';
const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(s=>s.level===100).map(skill=>({job,skill})));
test('all six icon-authored Lv100 focal volumes survive overlapping casts on low/high and fully dispose',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),styles=new Set<string>();
 for(const low of [true,false]){
  vfx.setLowQuality(low);
  for(let repeat=0;repeat<12;repeat++)for(const {job,skill} of rows){
   const before=JSON.stringify(skill),x=repeat*30+skill.branch*10;
   vfx.anticipation(skill,job,x,0);vfx.release(skill,job,x,0,x+4,2);
   const d=vfx.diagnostics,cue=(d as any).lv100Cue;expect(cue.skillId).toBe(skill.id);styles.add(cue.style);
   expect(cue.decorativeRadius).toBeGreaterThan(15.6);expect(cue.heroSeconds).toBeGreaterThan(1.38);
   expect(cue.focal).toEqual(job==='swordsman'&&skill.effect==='area'?{x,z:0}:{x:x+4,z:2});
   expect(d.active).toBeLessThanOrEqual(low?40:96);expect(d.pooled).toBeLessThanOrEqual(160);
   const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D);
   expect(meshes.some(m=>['ring','core'].includes(m.metadata?.vfxShape)&&m.position.x===cue.focal.x&&m.position.z===cue.focal.z)).toBe(true);
   expect(meshes.length).toBeGreaterThan(1);vfx.update(.75);expect(vfx.diagnostics.drawCount).toBeGreaterThan(5);expect(meshes.every(m=>m.billboardMode===0&&!(m.material as any)?.diffuseTexture)).toBe(true);expect(JSON.stringify(skill)).toBe(before);
  }
  vfx.update(5);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.drawCount).toBe(0);vfx.clear();expect((vfx.diagnostics as any).lv100Cue).toBeNull();
 }
 expect(styles.size).toBe(6);vfx.dispose();expect(scene.meshes).toHaveLength(0);expect(vfx.diagnostics.materials).toBe(0);scene.dispose();engine.dispose();
});
test('Lv100 crescendo remains visible after Lv90 fades, while pooling and materials stabilize',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const low of [true,false])for(const {job,skill} of rows){
  vfx.setLowQuality(low);const base=skills[job].find(s=>s.level===90&&s.branch===skill.branch)!;
  vfx.release(base,job,0,0,4,2);vfx.update(2.4);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
  vfx.release(skill,job,0,0,4,2);vfx.update(.75);
  const hero={ 'swordsman-10':'fireblade','swordsman-b-10':'sword','mage-10':'galaxyarm','mage-b-10':'worldcrown','archer-10':'arrow','archer-b-10':'stag' }[skill.id];
  expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape===hero)).toBe(true);
  if(skill.id==='mage-b-10')expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape==='blossom')).toBe(true);
  if(skill.id==='archer-10')expect(scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='featherwing')).toHaveLength(2);
  vfx.update(1.65);expect(vfx.diagnostics.drawCount).toBeGreaterThan(0);vfx.update(5);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
 }
 const first={pooled:vfx.diagnostics.pooled,materials:vfx.diagnostics.materials};
 for(let n=0;n<10;n++)for(const {job,skill} of rows){vfx.release(skill,job,0,0,4,2);vfx.update(5);vfx.clear();}
 expect(vfx.diagnostics.pooled).toBe(first.pooled);expect(vfx.diagnostics.materials).toBe(first.materials);vfx.dispose();scene.dispose();engine.dispose();
});
