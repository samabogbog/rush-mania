import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';

const rows=(Object.keys(skills) as ClassId[]).flatMap(job=>skills[job].filter(skill=>skill.level===30).map(skill=>({job,skill})));
const styles=['iron-guard-fortress-crash','field-recovery-cross-fountain','arcane-barrier-prism-crash','spore-hex-orbital-cage','evasive-stance-wing-crash','scatter-volley-six-spoke-fan'];
test('six named level thirty silhouettes have immediate luminous volumes and six to seven unit waves',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene),seen=new Set<string>();
 expect(rows.map(r=>r.skill.name)).toEqual(['Iron Guard Crash','Field Recovery Burst','Arcane Barrier Crash','Spore Hex','Evasive Stance Crash','Scatter Volley']);
 for(const {job,skill} of rows){
  const original=JSON.stringify(skill),counts:number[]=[];
  for(const low of [true,false]){
   vfx.setLowQuality(low);vfx.release(skill,job,0,0,4,2);
   const cue=vfx.diagnostics.lv30Cue!;seen.add(cue.style);
   expect(cue).toMatchObject({skillId:skill.id,impactSeconds:0,heroSeconds:.32,decorativeRadius:6.6,focal:job==='swordsman'?{x:0,z:0}:{x:4,z:2}});
   const enabled=()=>scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D);
   for(const shape of ['core','beam','ring'])expect(enabled().some(m=>m.metadata?.vfxShape===shape)).toBe(true);
   const beams=enabled().filter(m=>m.metadata?.vfxShape==='beam');
   expect(beams.length).toBeGreaterThanOrEqual(6);
   for(const beam of beams){expect(beam.getTotalVertices()).toBeGreaterThan(16);expect(beam.billboardMode).toBe(0);const glow=(beam.material as any).emissiveColor;expect(Math.max(glow.r,glow.g,glow.b)).toBeGreaterThan(0);}
   counts.push(vfx.diagnostics.active);expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);
   // Observe the actual moving wave and particles, rather than trusting diagnostic radius.
   vfx.update(.55);
   const waves=enabled().filter(m=>m.metadata?.vfxShape==='ring'&&m.position.y<.5);
   expect(waves).toHaveLength(3);for(const wave of waves){expect(wave.scaling.x).toBeGreaterThan(6);expect(wave.scaling.x).toBeLessThanOrEqual(6.6);}
   expect(enabled().some(m=>Math.hypot(m.position.x-cue.focal.x,m.position.z-cue.focal.z)>5.2&&m.position.y>1)).toBe(true);
   vfx.update(2);expect(vfx.diagnostics.active).toBe(0);expect(vfx.diagnostics.drawCount).toBe(0);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);
   vfx.clear();expect(vfx.diagnostics.lv30Cue).toBeNull();
  }
  expect(counts[1]).toBeGreaterThan(counts[0]+20);expect(JSON.stringify(skill)).toBe(original);
 }
 expect([...seen]).toEqual(styles);vfx.dispose();expect(scene.meshes).toHaveLength(0);expect(vfx.diagnostics.materials).toBe(0);scene.dispose();engine.dispose();
});

test('level thirty protects its core, waves and complete beam silhouette under bounded pool pressure',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);let serial=0;
 for(const low of [true,false]){
  vfx.setLowQuality(low);
  for(let repeat=0;repeat<12;repeat++)for(const {job,skill} of rows){
   const x=serial++*20,z=skill.branch*20;vfx.release(skill,job,x,z,x+4,z+2);
   const {focal}=vfx.diagnostics.lv30Cue!;
   const meshes=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.geometry3D&&Math.hypot(m.position.x-focal.x,m.position.z-focal.z)<6);
   expect(meshes.some(m=>m.metadata?.vfxShape==='core'&&m.position.x===focal.x&&m.position.z===focal.z)).toBe(true);
   expect(meshes.filter(m=>m.metadata?.vfxShape==='beam').length).toBeGreaterThanOrEqual(6);
   expect(meshes.filter(m=>m.metadata?.vfxShape==='ring'&&m.position.y<.5)).toHaveLength(3);
   expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);
  }
  vfx.clear();expect(vfx.diagnostics.drawCount).toBe(0);expect(vfx.diagnostics.lv30Cue).toBeNull();
 }
 for(const level of [10,20])for(const {job} of rows.filter(r=>r.skill.branch===0)){
  const skill=skills[job].find(s=>s.level===level&&s.branch===0)!;vfx.release(skill,job,0,0,4,2);
  const cue=level===10?vfx.diagnostics.lv10Cue:vfx.diagnostics.lv20Cue;
  expect(cue).toMatchObject({skillId:skill.id,impactSeconds:level===10?(job==='swordsman'?.08:.14):0,decorativeRadius:level===10?3.4:5.6});
  expect(vfx.diagnostics.lv30Cue).toBeNull();vfx.update(2);expect(vfx.diagnostics.active).toBe(0);vfx.clear();
 }
 vfx.dispose();expect(vfx.diagnostics.pooled).toBe(0);expect(scene.meshes).toHaveLength(0);scene.dispose();engine.dispose();
});
