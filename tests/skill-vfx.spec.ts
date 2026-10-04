import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {SkillVFX,skillPalette} from '../src/render/skill-vfx';
import {skills,type ClassId} from '../src/game/classes';
test('all sixty skill VFX respect quality budgets and recycle geometry after sustained bursts',()=>{
 const engine=new NullEngine();const scene=new Scene(engine);const vfx=new SkillVFX(scene);
 for(const low of [false,true]){vfx.setLowQuality(low);for(let repeat=0;repeat<8;repeat++)for(const job of Object.keys(skills) as ClassId[])for(const skill of skills[job]){vfx.anticipation(skill,job,0,0);vfx.release(skill,job,0,0,3,2);expect(vfx.diagnostics.active).toBeLessThanOrEqual(low?40:96);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);vfx.update(3);expect(vfx.diagnostics.active).toBe(0);}const ceiling=scene.meshes.length;for(let i=0;i<50;i++){vfx.release(skills.mage[9],'mage',0,0,2,2);vfx.update(3);}expect(scene.meshes.length).toBe(ceiling);}
 vfx.dispose();expect(scene.meshes.length).toBe(0);scene.dispose();engine.dispose();
});
test('healing centers on caster, weapon impacts center on target, and branches have coherent distinct palettes',()=>{
 const engine=new NullEngine();const scene=new Scene(engine);const vfx=new SkillVFX(scene);
 const heal=skills.mage.find(s=>s.name==='Worldtree Bloom')!;vfx.release(heal,'mage',10,20,-20,-30);vfx.update(.3);
 const active=scene.meshes.filter(m=>m.isEnabled());expect(active.length).toBeGreaterThanOrEqual(15);expect(active.every(m=>Math.abs(m.position.x-10)<3&&Math.abs(m.position.z-20)<3)).toBe(true);
 vfx.clear();expect(vfx.diagnostics.active).toBe(0);expect(scene.meshes.filter(m=>m.isEnabled())).toHaveLength(0);
 expect(skillPalette('mage',skills.mage[0])).not.toEqual(skillPalette('mage',skills.mage[10]));
 vfx.dispose();scene.dispose();engine.dispose();
});

test('cast cooldown acceptance does not duplicate delay; resolution releases once and movement cancellation never impacts',async()=>{
 const {castVisualTransition:transition}=await import('../src/render/skill-timing');
 const cast={skillId:'mage-10',remaining:.8,total:1,targetId:2};
 expect(transition(null,cast,0,0,.016)).toBe('start');
 expect(transition(cast,{...cast,remaining:.5},0,0,.016)).toBe('hold');
 expect(transition({...cast,remaining:.01},null,0,.35,.016)).toBe('release');
 expect(transition(null,null,.35,.33,.016)).toBe('none');
 expect(transition(cast,null,0,0,.016)).toBe('cancel');
 expect(transition(cast,null,.2,.18,.016)).toBe('cancel');
 // Network can skip most of the cast; fresh authoritative action pulse releases immediately.
 expect(transition(cast,null,0,.3,.016)).toBe('release');
});

test('full pool reclaims inactive shapes for new focal effects and arrows face their velocity',()=>{
 const engine=new NullEngine();const scene=new Scene(engine);const vfx=new SkillVFX(scene);
 // Deliberately fill every allocation with only sparks, simulating sustained narrow usage.
 const allocator=vfx as unknown as {mesh:(shape:string,color:number)=>any;free:Map<string,any[]>};
 const sparks=[];for(let i=0;i<SkillVFX.MAX_MESHES;i++)sparks.push(allocator.mesh('spark',0xffeeaa));
 for(const mesh of sparks)mesh.setEnabled(false);allocator.free.set('spark',sparks);
 expect(vfx.diagnostics.pooled).toBe(160);
 for(const [job,name,shape] of [['mage','Lightning','sprite:lightning-bolt'],['mage','Worldtree Bloom','sprite:worldtree'],['swordsman','Earthbreaker','sprite:impact-shockwave'],['mage','Astral Storm','sprite:star-glint'],['archer','Power Shot','arrow']] as const){const skill=skills[job].find(s=>s.name===name)!;vfx.release(skill,job,0,0,-4,0);vfx.update(.18);expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape===shape)).toBe(true);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);vfx.clear();}
 const hunt=skills.archer.find(s=>s.name==='Wild Hunt')!;vfx.release(hunt,'archer',0,0,-4,0);
 const arrows=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='arrow');expect(arrows.length).toBeGreaterThan(3);expect(arrows.every(m=>m.rotation.y<-.7&&m.rotation.y>-2.4)).toBe(true);
 vfx.dispose();scene.dispose();engine.dispose();
});
