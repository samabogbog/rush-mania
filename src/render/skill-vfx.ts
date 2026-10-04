import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Skill, ClassId } from '../game/classes';

type Sprite='star-glint'|'energy-flare'|'fire-comet'|'ice-burst'|'lightning-bolt'|'crescent-ribbon'|'rune-circle'|'leaf-petals'|'worldtree'|'healing-lotus'|'impact-shockwave'|'spectral-arrow';
type Shape=`sprite:${Sprite}`|'spark'|'ring'|'leaf'|'slash'|'shield'|'bolt'|'branch'|'fracture'|'arrow'|'spiral';
type Particle={mesh:Mesh;life:number;duration:number;x:number;y:number;z:number;vx:number;vy:number;vz:number;size:number;spin:number;grow:number;delay:number};
export type SkillMotion={job:ClassId;stage:number;branch:number;effect:string;phase:'anticipation'|'release'|'recovery';progress:number};
export function skillPalette(job:ClassId, skill:Skill):number[] {
 if(skill.effect==='heal')return [0x8affbb,0xfff9a8,0x41d7a1];
 if(skill.effect==='guard')return job==='swordsman'?[0x81e7ff,0xffe391,0xffffff]:[0x69f0c7,0xb8fff0,0xffeb9b];
 if(skill.effect==='poison')return [0xc489ff,0x96ff82,0xefbaff];
 if(job==='mage')return skill.branch?[0x80f69a,0xfff5bd,0x6ddce4]:skill.effect==='slow'?[0x75dfff,0xd1f6ff,0x928dff]:[0xffad68,0xffef9e,0xff6d96];
 if(job==='archer')return skill.branch?[0xb7ff88,0x64e4d4,0xffd96d]:[0xffe58c,0xffba72,0xb5edff];
 return skill.branch?[0x8bdeff,0xffe6a3,0xffffff]:[0xffdf89,0xff9778,0xfff9da];
}
/** Bounded reusable geometry. VFX never changes authoritative combat state. */
export class SkillVFX {
 private templates=new Map<Shape,Mesh>();private materials=new Map<string,StandardMaterial>();private textures=new Map<string,Texture>();
 private active:Particle[]=[];private free=new Map<Shape,Mesh[]>();private created=0;private serial=0;private low=false;
 static readonly MAX_MESHES=160;
 constructor(private scene:Scene){}
 setLowQuality(low:boolean){this.low=low;}
 get diagnostics(){return {active:this.active.length,pooled:this.created,limit:this.low?40:96};}
 private mesh(shape:Shape,color:number){
  let mesh=this.free.get(shape)?.pop();
  if(!mesh){if(this.created>=SkillVFX.MAX_MESHES){
    // Reclaim an inactive mesh of another shape, rather than starving a new
    // focal archetype when one busy skill family filled the bounded pool.
    let reclaimed=false;for(const list of this.free.values()){const stale=list.pop();if(stale){stale.dispose();this.created--;reclaimed=true;break;}}if(!reclaimed)return null;
   }let template=this.templates.get(shape);
   if(!template){const name='vfx-template-'+shape;
    template=shape.startsWith('sprite:')?MeshBuilder.CreatePlane(name,{size:1,sideOrientation:Mesh.DOUBLESIDE},this.scene):shape==='bolt'?MeshBuilder.CreateTube(name,{path:[new Vector3(0,2.8,0),new Vector3(.18,2.1,.05),new Vector3(-.18,1.6,0),new Vector3(.22,.8,.04),new Vector3(0,0,0)],radius:.065,tessellation:6},this.scene):shape==='branch'?MeshBuilder.CreateTube(name,{path:[new Vector3(0,0,0),new Vector3(.05,.6,0),new Vector3(.35,1.1,.08),new Vector3(.8,1.5,.12)],radius:.07,tessellation:8},this.scene):shape==='fracture'?MeshBuilder.CreateTube(name,{path:[new Vector3(0,0,0),new Vector3(.5,0,.12),new Vector3(.8,0,-.13),new Vector3(1.5,0,.07)],radius:.04,tessellation:5},this.scene):shape==='arrow'?MeshBuilder.CreateTube(name,{path:[new Vector3(0,0,-.6),new Vector3(0,0,.5),new Vector3(-.15,0,.25),new Vector3(0,0,.5),new Vector3(.15,0,.25)],radius:.025,tessellation:5},this.scene):shape==='spiral'?MeshBuilder.CreateTube(name,{path:Array.from({length:42},(_,i)=>new Vector3(Math.cos(i*.33)*(1-i/70),i/42*2.6,Math.sin(i*.33)*(1-i/70))),radius:.03,tessellation:5},this.scene):shape==='ring'?MeshBuilder.CreateTorus(name,{diameter:2,thickness:.055,tessellation:40},this.scene):shape==='shield'?MeshBuilder.CreateSphere(name,{diameter:2,segments:12,slice:.5},this.scene):shape==='slash'?MeshBuilder.CreateTube(name,{path:Array.from({length:20},(_,i)=>new Vector3(Math.cos(i/19*Math.PI*1.35),0,Math.sin(i/19*Math.PI*1.35))),radius:.045,tessellation:6},this.scene):shape==='leaf'?MeshBuilder.CreateSphere(name,{diameter:1,segments:6},this.scene):MeshBuilder.CreateSphere(name,{diameter:1,segments:6},this.scene);
    template.setEnabled(false);template.isPickable=false;template.receiveShadows=false;this.templates.set(shape,template);}
   mesh=template.clone('skill-vfx-'+this.serial++,null)!;mesh.metadata={vfxShape:shape};this.created++;
  }
  const sprite=shape.startsWith('sprite:')?shape.slice(7):null,key=sprite?shape:color.toString();
  let material=this.materials.get(key);if(!material){material=new StandardMaterial('vfx-'+key,this.scene);material.disableLighting=true;material.emissiveColor=sprite?Color3.White():Color3.FromInts(color>>16&255,color>>8&255,color&255);material.diffuseColor=material.emissiveColor;material.alpha=sprite?.92:.78;material.backFaceCulling=false;
   if(sprite){let texture=this.textures.get(sprite);if(!texture){texture=new Texture('/textures/vfx/'+sprite+'.png',this.scene,false,true,Texture.TRILINEAR_SAMPLINGMODE);texture.hasAlpha=true;this.textures.set(sprite,texture);}material.diffuseTexture=texture;material.emissiveTexture=texture;material.diffuseColor=Color3.Black();material.useAlphaFromDiffuseTexture=true;material.alphaMode=Constants.ALPHA_COMBINE;material.disableDepthWrite=true;}
   this.materials.set(key,material);}
  mesh.material=material;mesh.setEnabled(true);mesh.visibility=1;mesh.rotation.setAll(0);mesh.scaling.setAll(1);mesh.billboardMode=sprite?Mesh.BILLBOARDMODE_ALL:Mesh.BILLBOARDMODE_NONE;if(sprite==='rune-circle'||sprite==='impact-shockwave'){mesh.billboardMode=Mesh.BILLBOARDMODE_NONE;mesh.rotation.x=Math.PI/2;}if(sprite==='worldtree')mesh.billboardMode=Mesh.BILLBOARDMODE_Y;return mesh;
 }
 private emit(shape:Shape,color:number,x:number,y:number,z:number,size:number,duration:number,vx=0,vy=0,vz=0,grow=0,spin=0,delay=0){
  if(this.active.length>=(this.low?40:96))return;const mesh=this.mesh(shape,color);if(!mesh)return;
  mesh.position.set(x,y,z);mesh.scaling.setAll(size);if(shape==='leaf')mesh.scaling.set(size*.45,size*.18,size);if(shape==='slash')mesh.rotation.x=.55;if(shape==='arrow')mesh.rotation.y=Math.atan2(vx,vz);
  if(delay>0)mesh.setEnabled(false);this.active.push({mesh,life:duration,duration,x,y,z,vx,vy,vz,size,grow,spin,delay});
 }
 anticipation(skill:Skill,job:ClassId,x:number,z:number){const duration=skill.cast||.2;this.emit('sprite:rune-circle',0xffffff,x,.08,z,1.2+skill.stage*.08,duration,0,0,0,.4,.4);this.emit('sprite:energy-flare',0xffffff,x,.8,z,.35,duration,0,.25,0,.3);}
 release(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const colors=skillPalette(job,skill),high=skill.stage>=7,self=['heal','guard','fury'].includes(skill.effect),cx=self||job==='swordsman'&&skill.effect==='area'?x:tx,cz=self||job==='swordsman'&&skill.effect==='area'?z:tz,name=skill.name.toLowerCase();
  const life=high?1.05:.55,size=1+skill.stage*.17,direction=Math.atan2(tx-x,tz-z),travel=self||job==='swordsman'?0:Math.min(.22,Math.hypot(tx-x,tz-z)*.025);
  const sprite=(id:Sprite,px:number,py:number,pz:number,s:number,duration=life,vx=0,vy=0,vz=0,grow=0,spin=0,delay=0)=>this.emit(('sprite:'+id) as Shape,0xffffff,px,py,pz,s,duration,vx,vy,vz,grow,spin,delay);
  const glyph=()=>sprite('rune-circle',cx,.09,cz,size*1.1,life,0,0,0,.4,.3,travel);
  if(/worldtree/.test(name)){
   // Whole illustrated canopy grows from the ground; petal crown blossoms later.
   sprite('worldtree',x,1.6,z,2.6,1.25,0,.28,0,1.7);glyph();
   sprite('healing-lotus',x,.45,z,1.6,.95,0,.2,0,.55,0,.16);
   for(let i=0;i<(this.low?3:7);i++){const a=i*2.4;sprite('leaf-petals',x+Math.cos(a)*1.3,1.9,z+Math.sin(a)*1.3,.8,.85,Math.cos(a)*.3,.5,Math.sin(a)*.3,.2,0,.12+i*.035);}
   sprite('star-glint',x,2.4,z,1.15,.7,0,.3,0,.3,0,.25);
  }else if(/astral|starfall/.test(name)){
   glyph();sprite('energy-flare',cx,1.35,cz,size*1.25,.85,0,.2,0,.3,0,.1);
   sprite('star-glint',cx,1.3,cz,size,.8,0,.15,0,.45,0,.15);
   for(let i=0;i<(this.low?3:7);i++){const a=i*2.4;sprite('star-glint',cx+Math.cos(a)*1.4,3+i%2*.4,cz+Math.sin(a)*1.4,.8,.55,-Math.cos(a)*1.7,-3.2,-Math.sin(a)*1.7,.1,0,i*.035);}
   sprite('impact-shockwave',cx,.1,cz,1.8,.8,0,0,0,3.5,0,.25);
  }else if(job==='swordsman'&&/quake|earthbreaker|crush|concussion/.test(name)){
   sprite('impact-shockwave',cx,.09,cz,size,.65,0,0,0,3.5);sprite('energy-flare',cx,.4,cz,size*.7,.5);
   for(let i=0;i<(this.low?4:8);i++){const a=i*Math.PI/4;this.emit('leaf',0xffd69b,cx+Math.cos(a)*.8,.3,cz+Math.sin(a)*.8,.32,.7,Math.cos(a)*1.5,2,Math.sin(a)*1.5,.12,3);}
  }else if(job==='swordsman'&&!self){
   sprite('crescent-ribbon',x+Math.sin(direction)*.65,1,z+Math.cos(direction)*.65,size*1.2,.4,Math.sin(direction)*.7,0,Math.cos(direction)*.7,1);
   if(high){sprite('crescent-ribbon',x,1.3,z,size*1.15,.4,0,.1,0,1,0,.12);sprite('fire-comet',cx,1.5,cz,size*.8,.55,0,-1.5,0,.1,0,.1);}
   sprite('impact-shockwave',cx,.1,cz,size,.6,0,0,0,1.4,0,.15);
  }else if(job==='archer'&&(!self||/hunt/.test(name))){
   const volley=/volley|rain|barrage|scatter/.test(name),fan=/hunt/.test(name);const count=this.low?3:high?7:volley?5:1;
   for(let i=0;i<count;i++){const a=direction+(i-(count-1)/2)*(fan?.18:.065);const sx=volley?cx+(i-(count-1)/2)*.3:x,sz=volley?cz+.2:z;const sy=volley?3.2:.9;
    sprite('spectral-arrow',sx,sy,sz,high?1.2:.85,.45,volley?0:Math.sin(a)*7,volley?-5:0,volley?0:Math.cos(a)*7,0,0,i*.025);this.emit('arrow',colors[0],sx,sy,sz,.55,.45,volley?0:Math.sin(a)*7,volley?-5:0,volley?0:Math.cos(a)*7);}
   sprite(/poison|toxic|venom/.test(name)?'leaf-petals':'star-glint',cx,.8,cz,size*.8,.55,0,.2,0,.3,0,.2);
   sprite('impact-shockwave',cx,.09,cz,size*.65,.5,0,0,0,1.2,0,.2);
  }else if(skill.effect==='heal'){
   glyph();sprite('healing-lotus',cx,.55,cz,size,life,0,.5,0,.4);sprite('leaf-petals',cx,1.3,cz,size*.85,life,0,.5,0,.3,0,.15);
  }else if(skill.effect==='guard'){
   glyph();sprite('rune-circle',cx,1.1,cz,size*.8,life);const p=this.active[this.active.length-1];if(p){p.mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;p.mesh.rotation.x=0;}
   sprite('energy-flare',cx,.85,cz,size*.55,.75);this.emit('shield',colors[0],cx,.2,cz,.85,life,0,0,0,.15);
  }else if(skill.effect==='fury'){
   glyph();sprite('energy-flare',cx,1,cz,size,life,0,.2,0,.1);sprite('star-glint',cx,1.6,cz,size*.65,.65,0,.3,0,.3,0,.12);
  }else {
   const frost=/frost|blizzard/.test(name),lightning=/lightning|shock/.test(name),nature=skill.branch===1,poison=skill.effect==='poison';
   const focal:Sprite=lightning?'lightning-bolt':frost?'ice-burst':poison?'leaf-petals':nature?'leaf-petals':'fire-comet';
   if(!lightning&&skill.effect!=='area')sprite(focal,x,.95,z,.7,travel||.18,(tx-x)/(travel||.18),0,(tz-z)/(travel||.18));
   glyph();sprite(focal,cx,lightning?1.6:.9,cz,size,life,0,lightning?-.3:.15,0,.35,0,travel);
   sprite('energy-flare',cx,.7,cz,size*.65,.6,0,.15,0,.45,0,travel+.08);
   if(high){for(let i=0;i<(this.low?2:4);i++){const a=i*Math.PI/2;sprite(frost?'ice-burst':nature?'leaf-petals':'star-glint',cx+Math.sin(a),1.3,cz+Math.cos(a),.9,.65,0,.3,0,.15,0,travel+i*.04);}}
  }
  // Small accents support the illustrated focal shape; they never dominate it.
  for(let i=0;i<(this.low?3:high?9:5);i++){const a=i*2.4,v=.7+skill.stage*.06;this.emit('spark',colors[i%3],cx+Math.sin(a)*.3,.6,cz+Math.cos(a)*.3,.06,.65,Math.sin(a)*v,.8,Math.cos(a)*v,.01,1,travel);}
 }

 basic(job:ClassId,x:number,z:number){this.emit(job==='swordsman'?'slash':'spark',job==='mage'?0xb5d9ff:0xffe5a3,x,.75,z,job==='swordsman'?.65:.14,.3,0,.4,0,.9,4);}
 update(dt:number){for(let i=this.active.length-1;i>=0;i--){const p=this.active[i];if(p.delay>0){p.delay-=dt;if(p.delay>0)continue;p.mesh.setEnabled(true);}p.life-=dt;if(p.life<=0){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;let list=this.free.get(shape);if(!list){list=[];this.free.set(shape,list);}list.push(p.mesh);this.active.splice(i,1);continue;}
   const t=p.duration-p.life,fade=Math.min(1,p.life/.22);p.mesh.position.set(p.x+p.vx*t,p.y+p.vy*t-(p.vy>0&&!['ring','shield'].includes(p.mesh.metadata.vfxShape)?t*t*.55:0),p.z+p.vz*t);p.mesh.rotation.y+=p.spin*dt;p.mesh.visibility=fade;const size=p.size+p.grow*t;p.mesh.scaling.setAll(Math.max(.01,size));if(p.mesh.metadata.vfxShape==='leaf')p.mesh.scaling.set(size*.45,size*.18,size);if(p.mesh.metadata.vfxShape==='sprite:worldtree')p.mesh.position.y=Math.max(.05,size*.5+.08);
  }}
 clear(){for(const p of this.active){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;const list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}this.active=[];}
 dispose(){this.clear();this.free.forEach(list=>list.forEach(mesh=>mesh.dispose()));this.templates.forEach(mesh=>mesh.dispose());this.materials.forEach(material=>material.dispose());this.free.clear();this.templates.clear();this.materials.clear();this.textures.forEach(t=>t.dispose());this.textures.clear();}
}
