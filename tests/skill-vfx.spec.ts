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
 const heal={...skills.mage.find(s=>s.name==='Worldtree Bloom Burst')!,effect:'heal' as const};vfx.release(heal,'mage',10,20,-20,-30);vfx.update(.3);
 const active=scene.meshes.filter(m=>m.isEnabled());expect(active.length).toBeGreaterThanOrEqual(12);expect(active.every(m=>Math.abs(m.position.x-10)<3&&Math.abs(m.position.z-20)<3)).toBe(true);
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
 for(const [job,name,shape] of [['mage','Lightning','lightning'],['mage','Worldtree Bloom Burst','tree'],['swordsman','Earthbreaker','slab'],['mage','Astral Storm','star'],['archer','Power Shot','arrow']] as const){const skill=skills[job].find(s=>s.name===name)!;vfx.release(skill,job,0,0,-4,0);vfx.update(.18);expect(scene.meshes.some(m=>m.isEnabled()&&m.metadata?.vfxShape===shape)).toBe(true);expect(vfx.diagnostics.pooled).toBeLessThanOrEqual(160);vfx.clear();}
 const hunt=skills.archer.find(s=>s.name==='Wild Hunt Strike')!;vfx.release(hunt,'archer',0,0,-4,0);vfx.update(.12);
 const arrows=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='arrow');expect(arrows.length).toBeGreaterThan(3);expect(arrows.every(m=>m.rotation.y<-.7&&m.rotation.y>-2.4)).toBe(true);
 vfx.dispose();scene.dispose();engine.dispose();
});

test('every focal mesh has volume, shaded material and no texture or billboard, in both quality modes',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 for(const low of [true,false]){vfx.setLowQuality(low);for(const job of Object.keys(skills) as ClassId[])for(const skill of skills[job]){vfx.release(skill,job,0,0,3,2);vfx.update(.12);for(const mesh of scene.meshes.filter(m=>m.isEnabled())){expect(mesh.billboardMode).toBe(0);const positions=mesh.getVerticesData('position')!;for(let axis=0;axis<3;axis++){let min=Infinity,max=-Infinity;for(let i=axis;i<positions.length;i+=3){min=Math.min(min,positions[i]);max=Math.max(max,positions[i]);}expect(max-min).toBeGreaterThan(.015);}const material=mesh.material as any;expect(material.disableLighting).toBe(false);expect(material.diffuseTexture).toBeNull();expect(material.emissiveTexture).toBeNull();}vfx.clear();}}
 expect(vfx.diagnostics.noSprites).toBe(true);expect(vfx.diagnostics.textures).toBe(0);vfx.dispose();expect(scene.materials.filter(m=>m.name.startsWith('vfx-'))).toHaveLength(0);scene.dispose();engine.dispose();
});
test('arrows interpolate exactly toward target in three dimensions',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);vfx.release(skills.archer[0],'archer',0,0,-4,2);const arrows=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='arrow');expect(arrows).toHaveLength(1);vfx.update(.3);expect(arrows[0].position.x).toBeLessThan(-2);expect(arrows[0].position.z).toBeGreaterThan(1);vfx.dispose();scene.dispose();engine.dispose();
});

test('crescent is a closed tapered volume at three view angles and solids stay opaque',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),vfx=new SkillVFX(scene);
 vfx.release(skills.swordsman[9],'swordsman',0,0,3,2);
 const blades=scene.meshes.filter(m=>m.isEnabled()&&m.metadata?.vfxShape==='crescent');expect(blades).toHaveLength(1);
 const blade=blades[0],positions=blade.getVerticesData('position')!,indices=blade.getIndices()!,edges=new Map<string,number>();
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}
 expect([...edges.values()].every(n=>n===2)).toBe(true);
 for(const angle of [0,Math.PI/4,Math.PI/2]){let min=Infinity,max=-Infinity;for(let i=0;i<positions.length;i+=3){const projected=positions[i]*Math.sin(angle)+positions[i+2]*Math.cos(angle);min=Math.min(min,projected);max=Math.max(max,projected);}expect(max-min).toBeGreaterThan(.5);}
 vfx.update(.12);expect(blade.visibility).toBe(1);expect((blade.material as any).alpha).toBe(1);expect((blade.material as any).backFaceCulling).toBe(true);
 vfx.clear();const guard={...skills.swordsman[2],effect:'guard' as const};vfx.release(guard,'swordsman',0,0,3,2);const dome=scene.meshes.find(m=>m.isEnabled()&&m.metadata?.vfxShape==='shield')!;expect((dome.material as any).alpha).toBe(.25);expect((dome.material as any).needDepthPrePass).toBe(true);
 vfx.dispose();scene.dispose();engine.dispose();
});
