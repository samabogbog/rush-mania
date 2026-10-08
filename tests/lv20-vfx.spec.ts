import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';

const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(skill=>skill.level===20).map(skill=>({job,skill})));
test('six level twenty impacts are immediate, volumetric and reach five to six decorative units',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),styles=new Set<string>();
 expect(rows).toHaveLength(6);
 for(const {job,skill} of rows){
  const original=JSON.stringify(skill),counts:number[]=[];
  for(const low of [true,false]){
   vfx.setLowQuality(low);vfx.release(skill,job,0,0,4,2);
   const cue=vfx.diagnostics.lv20Cue!;styles.add(cue.style);
   expect(cue.skillId).toBe(skill.id);expect(cue.impactSeconds).toBe(0);expect(cue.heroSeconds).toBe(.28);expect(cue.decorativeRadius).toBe(5.6);
   expect(cue.focal).toEqual(job==='swordsman'?{x:0,z:0}:{x:4,z:2});
   const enabled=()=>scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D);
   for(const shape of ['core','ring','beam'])expect(enabled().some(m=>m.metadata?.vfxShape===shape)).toBe(true);
   const beam=enabled().find(m=>m.metadata?.vfxShape==='beam')!;
   expect(beam.getTotalVertices()).toBeGreaterThan(16);expect(beam.billboardMode).toBe(0);
   const glow=(beam.material as any).emissiveColor;expect(Math.max(glow.r,glow.g,glow.b)).toBeGreaterThan(0);
   counts.push(vfx.diagnostics.active);expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);
   vfx.update(.49);
   const rings=enabled().filter(m=>m.metadata?.vfxShape==='ring');expect(rings).toHaveLength(3);
   expect(Math.max(...rings.map(m=>m.scaling.x))).toBeGreaterThan(5);expect(Math.max(...rings.map(m=>m.scaling.x))).toBeLessThanOrEqual(5.6);
   expect(enabled().some(m=>Math.hypot(m.position.x-cue.focal.x,m.position.z-cue.focal.z)>4.5&&m.position.y>.7)).toBe(true);
   vfx.update(2);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);vfx.clear();expect(vfx.diagnostics.lv20Cue).toBeNull();
  }
  expect(counts[1]).toBeGreaterThan(counts[0]+15);expect(JSON.stringify(skill)).toBe(original);
 }
 expect(styles.size).toBe(6);vfx.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
});

test('level twenty prioritizes hero meshes under pool pressure and preserves level ten cues',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const low of [true,false]){
  vfx.setLowQuality(low);
  for(let repeat=0;repeat<10;repeat++)for(const {job,skill} of rows){
   vfx.release(skill,job,0,0,4,2);
   const focal=vfx.diagnostics.lv20Cue!.focal;
   expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape==='core'&&m.position.x===focal.x&&m.position.z===focal.z)).toBe(true);
   expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);
  }
  vfx.clear();expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.drawCount).toBe(0);
 }
 const lv10=skills.swordsman.find(s=>s.level===10&&s.branch===0)!;
 vfx.release(lv10,'swordsman',0,0,4,2);
 expect(vfx.diagnostics.lv20Cue).toBeNull();expect(vfx.diagnostics.lv10Cue).toMatchObject({skillId:lv10.id,style:'power-cleave-beam',impactSeconds:.08,decorativeRadius:3.4});
 vfx.clear();expect(vfx.diagnostics.lv10Cue).toBeNull();vfx.dispose();expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
});
