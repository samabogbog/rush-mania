import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';

test('six level ten releases carry thick emissive beams and wide bounded ballistic impacts in both modes',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(s=>s.level===10).map(skill=>({job,skill})));
 expect(rows).toHaveLength(6);
 for(const {job,skill} of rows){
  const immutable=JSON.stringify(skill),counts:number[]=[];
  for(const low of [true,false]){
   vfx.setLowQuality(low);vfx.anticipation(skill,job,0,0);expect(vfx.diagnostics.active).toBeGreaterThanOrEqual(5);vfx.clear();
   vfx.release(skill,job,0,0,4,2);
   const beam=scene.meshes.find(m=>m.metadata?.vfxShape==='beam'&&m.material)!;
   expect(beam).toBeTruthy();const beamGlow=(beam.material as any).emissiveColor;expect(Math.max(beamGlow.r,beamGlow.g,beamGlow.b)).toBeLessThanOrEqual(.8);
   expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);counts.push(vfx.diagnostics.active);
   vfx.update(.24);const core=scene.meshes.find(m=>m.isEnabled()&&m.metadata?.vfxShape==='core')!;expect(core).toBeTruthy();const coreGlow=(core.material as any).emissiveColor;expect(Math.max(coreGlow.r,coreGlow.g,coreGlow.b)).toBeGreaterThan(Math.max(beamGlow.r,beamGlow.g,beamGlow.b));
   vfx.update(.25);
   const cx=job==='swordsman'&&skill.branch?0:4,cz=job==='swordsman'&&skill.branch?0:2;
   expect(scene.meshes.some(m=>m.isEnabled()&&Math.hypot(m.position.x-cx,m.position.z-cz)>1.5)).toBe(true);
   vfx.update(2);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);
  }
  expect(counts[1]).toBeGreaterThan(counts[0]+8);expect(JSON.stringify(skill)).toBe(immutable);
 }
 vfx.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
});

test('level ten impact families retain class-specific volumes and focal centers',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const [job,branch,shape] of [['swordsman',0,'crescent'],['swordsman',1,'slab'],['mage',0,'comet'],['mage',1,'spiral'],['archer',0,'arrow'],['archer',1,'branch']] as const){
  const skill=skills[job].find(s=>s.level===10&&s.branch===branch)!;vfx.release(skill,job,0,0,4,2);vfx.update(.16);
  expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape===shape)).toBe(true);
  const core=scene.meshes.find(m=>m.isEnabled()&&m.metadata?.vfxShape==='core')!;
  expect(core.position.x).toBe(job==='swordsman'&&branch===1?0:4);expect(core.position.z).toBe(job==='swordsman'&&branch===1?0:2);vfx.clear();
 }
 vfx.dispose();scene.dispose();engine.dispose();
});
