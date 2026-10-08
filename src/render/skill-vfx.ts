import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Skill, ClassId } from '../game/classes';
type Shape='spark'|'ring'|'petal'|'crescent'|'shield'|'lightning'|'branch'|'slab'|'arrow'|'spiral'|'comet'|'ice'|'star'|'tree'|'beam'|'core'|'ray';
type Particle={mesh:Mesh;life:number;duration:number;x:number;y:number;z:number;vx:number;vy:number;vz:number;size:number;spin:number;grow:number;delay:number;gravity:boolean;stretch:[number,number,number]};
export type SkillMotion={job:ClassId;stage:number;branch:number;effect:string;phase:'anticipation'|'release'|'recovery';progress:number;skillId?:string;duration?:number;frozen?:boolean};
export function skillPalette(job:ClassId, skill:Skill):number[] {
 if(skill.effect==='heal')return [0x8affbb,0xfff9a8,0x41d7a1];
 if(skill.effect==='guard')return job==='swordsman'?[0x81e7ff,0xffe391,0xffffff]:[0x69f0c7,0xb8fff0,0xffeb9b];
 if(skill.effect==='poison')return [0xc489ff,0x96ff82,0xefbaff];
 if(job==='mage')return skill.branch?[0x80f69a,0xfff5bd,0x6ddce4]:skill.effect==='slow'?[0x75dfff,0xd1f6ff,0x928dff]:[0xffad68,0xffef9e,0xff6d96];
 if(job==='archer')return skill.branch?[0xb7ff88,0x64e4d4,0xffd96d]:[0xffe58c,0xffba72,0xb5edff];
 return skill.branch?[0x8bdeff,0xffe6a3,0xffffff]:[0xffdf89,0xff9778,0xfff9da];
}
/** Immutable shared volumetric geometry, persistent shaded materials and a bounded mesh pool. */
export class SkillVFX {
 private templates=new Map<Shape,Mesh>();private materials=new Map<string,StandardMaterial>();
 private active:Particle[]=[];private free=new Map<Shape,Mesh[]>();private created=0;private serial=0;private low=false;
 private lv20Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 private lv10Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 static readonly MAX_MESHES=160;
 constructor(private scene:Scene){}
 setLowQuality(low:boolean){this.low=low;}
 get diagnostics(){return {active:this.active.length,pooled:this.created,limit:this.low?40:96,geometry3D:true,noSprites:true,textures:0,shapes:[...this.templates.keys()],materials:this.materials.size,lv10Cue:this.lv10Cue,lv20Cue:this.lv20Cue,drawCount:this.active.filter(p=>p.mesh.isEnabled()).length};}
 private template(shape:Shape){
  const name='vfx-template-'+shape,parts:Mesh[]=[];
  const tube=(path:Vector3[],radius:number)=>{const m=MeshBuilder.CreateTube(name,{path,radius,tessellation:7},this.scene);parts.push(m);return m;};
  const sphere=(x:number,y:number,z:number,s:number)=>{const m=MeshBuilder.CreateSphere(name,{diameter:s,segments:6},this.scene);m.position.set(x,y,z);parts.push(m);return m;};
  if(shape==='beam'||shape==='ray'){const m=MeshBuilder.CreateCylinder(name,{height:2,diameterTop:shape==='ray'?.035:.16,diameterBottom:shape==='ray'?.16:.22,tessellation:8},this.scene);m.rotation.x=Math.PI/2;parts.push(m);}
  else if(shape==='core'){parts.push(MeshBuilder.CreateSphere(name,{diameter:1,segments:12},this.scene));}
  else if(shape==='ring')parts.push(MeshBuilder.CreateTorus(name,{diameter:2,thickness:.10,tessellation:32},this.scene));
  else if(shape==='crescent'){
   // Closed tapered blade: a diamond cross-section gives a sharp edge and
   // broad shaded face without a cylindrical banana silhouette.
   const positions:number[]=[],indices:number[]=[],normals:number[]=[];
   const sections=33;
   for(let i=0;i<sections;i++){const t=i/(sections-1),a=-.35+t*Math.PI*1.28,taper=Math.sin(Math.PI*t),width=.018+.22*taper,depth=.012+.045*taper,r=1;
    for(const [radial,height] of [[-width,0],[0,depth],[width,0],[0,-depth]])positions.push(Math.cos(a)*(r+radial),height+Math.sin(a)*.08,Math.sin(a)*(r+radial));
   }
   for(let i=0;i<sections-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;indices.push(a,c,b,b,c,d);}
   indices.push(0,1,2,0,2,3);const last=(sections-1)*4;indices.push(last,last+2,last+1,last,last+3,last+2);
   VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;const m=new Mesh(name,this.scene);data.applyToMesh(m);parts.push(m);
  }else if(shape==='shield')parts.push(MeshBuilder.CreateSphere(name,{diameter:2,segments:16,slice:.58},this.scene));
  else if(shape==='lightning'){
   const path=[new Vector3(0,2.8,0),new Vector3(.22,2.1,.12),new Vector3(-.18,1.6,-.08),new Vector3(.24,.8,.12),Vector3.Zero()];tube(path,.07);
   tube([path[1],new Vector3(-.5,1.9,.3),new Vector3(-.8,1.25,.45)],.045);tube([path[2],new Vector3(.6,1.2,-.4),new Vector3(.85,.7,-.6)],.045);
  }else if(shape==='branch'||shape==='tree'){
   tube([Vector3.Zero(),new Vector3(.08,.7,0),new Vector3(-.08,1.4,.1),new Vector3(0,2.1,0)],shape==='tree'?.16:.08);
   for(let i=0;i<(shape==='tree'?7:3);i++){const a=i*2.4,r=shape==='tree'?.9:.55,y=.7+i*.16;tube([new Vector3(0,y,0),new Vector3(Math.cos(a)*r*.5,y+.45,Math.sin(a)*r*.5),new Vector3(Math.cos(a)*r,y+.7,Math.sin(a)*r)],.055);if(shape==='tree'){const m=sphere(Math.cos(a)*r,y+.8,Math.sin(a)*r,.95);m.scaling.y=.55;}}
  }else if(shape==='slab'){const m=MeshBuilder.CreateBox(name,{width:.7,height:.3,depth:.9},this.scene);m.rotation.set(.18,.3,.15);parts.push(m);}
  else if(shape==='arrow'){
   tube([new Vector3(0,0,-.65),new Vector3(0,0,.45)],.045);
   const tip=MeshBuilder.CreateCylinder(name,{height:.4,diameterTop:0,diameterBottom:.26,tessellation:4},this.scene);tip.rotation.x=Math.PI/2;tip.position.z=.55;parts.push(tip);
   for(const a of [0,Math.PI/2]){const f=MeshBuilder.CreateBox(name,{width:.22,height:.06,depth:.26},this.scene);f.rotation.z=a;f.position.z=-.5;parts.push(f);}
  }else if(shape==='spiral')tube(Array.from({length:40},(_,i)=>new Vector3(Math.cos(i*.35)*.8,i/40*2,Math.sin(i*.35)*.8)),.065);
  else if(shape==='ice'){
   for(let i=0;i<5;i++){const a=i*2.4;const m=MeshBuilder.CreateCylinder(name,{height:1+i%3*.3,diameterTop:0,diameterBottom:.42,tessellation:5},this.scene);m.position.set(Math.cos(a)*.35,.45,Math.sin(a)*.35);m.rotation.set(Math.sin(a)*.3,0,Math.cos(a)*.3);parts.push(m);}
  }else if(shape==='comet'){sphere(0,0,.2,.75);const m=MeshBuilder.CreateCylinder(name,{height:1.5,diameterTop:.5,diameterBottom:0,tessellation:7},this.scene);m.rotation.x=Math.PI/2;m.position.z=-.6;parts.push(m);}
  else if(shape==='star'){for(const axis of [new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)])tube([axis.scale(-.6),axis.scale(.6)],.085);sphere(0,0,0,.4);}
  else {const m=sphere(0,0,0,1);if(shape==='petal')m.scaling.set(.38,.22,1);}
  // Bake local transforms once; every emitted mesh shares this geometry.
  for(const m of parts)m.bakeCurrentTransformIntoVertices();
  const result=parts.length===1?parts[0]:Mesh.MergeMeshes(parts,true,true)!;result.name=name;result.setEnabled(false);result.isPickable=false;this.templates.set(shape,result);return result;
 }
 private mesh(shape:Shape,color:number){
  let mesh=this.free.get(shape)?.pop();
  if(!mesh){if(this.created>=SkillVFX.MAX_MESHES){let reclaimed=false;for(const list of this.free.values()){const stale=list.pop();if(stale){stale.dispose();this.created--;reclaimed=true;break;}}if(!reclaimed)return null;}
   mesh=(this.templates.get(shape)||this.template(shape)).clone('skill-vfx-'+this.serial++,null)!;mesh.metadata={vfxShape:shape,geometry3D:true};this.created++;
  }
  const luminous=['beam','core','ray'].includes(shape),hotCore=shape==='core';const key=shape==='shield'?'shield-'+color:(hotCore?'hot-core-':luminous?'radiant-':'solid-')+color;let material=this.materials.get(key);if(!material){material=new StandardMaterial('vfx-'+key,this.scene);const c=Color3.FromInts(color>>16&255,color>>8&255,color&255);
   // Keep light response on these solids while reserving the overbright flash for the core.
   // Saturating colored beam shells prevents scene lighting from washing every class to white.
   material.diffuseColor=c.scale(luminous?.2:1);material.emissiveColor=hotCore?c.scale(1.35):luminous?new Color3(Math.pow(c.r,1.6),Math.pow(c.g,1.6),Math.pow(c.b,1.6)).scale(.8):c.scale(.32);material.specularColor=new Color3(.12,.12,.12);material.alpha=shape==='shield'?.25:1;material.backFaceCulling=true;if(shape==='shield')material.needDepthPrePass=true;this.materials.set(key,material);}
  mesh.material=material;mesh.setEnabled(true);mesh.visibility=1;mesh.rotation.setAll(0);mesh.scaling.setAll(1);mesh.billboardMode=Mesh.BILLBOARDMODE_NONE;mesh.isPickable=false;return mesh;
 }
 private emit(shape:Shape,color:number,x:number,y:number,z:number,size:number,duration:number,vx=0,vy=0,vz=0,grow=0,spin=0,delay=0,gravity=false){
  if(this.active.length>=(this.low?40:96))return;const mesh=this.mesh(shape,color);if(!mesh)return;
  mesh.position.set(x,y,z);mesh.scaling.setAll(size);if(shape==='arrow'||shape==='comet'){mesh.rotation.y=Math.atan2(vx,vz);mesh.rotation.x=-Math.atan2(vy,Math.hypot(vx,vz));}if(delay>0)mesh.setEnabled(false);
  this.active.push({mesh,life:duration,duration,x,y,z,vx,vy,vz,size,grow,spin,delay,gravity,stretch:[1,1,1]});return mesh;
 }
 anticipation(skill:Skill,job:ClassId,x:number,z:number){if(skill.level===10){const c=skillPalette(job,skill),d=skill.cast||.18;this.emit('ring',c[0],x,.09,z,1.1,d,0,0,0,-2);this.emit('core',c[1],x,1,z,.13,d,0,.2,0,.75);for(let i=0;i<(this.low?3:6);i++){const a=i*Math.PI*2/(this.low?3:6);this.emit('ray',c[0],x+Math.cos(a)*.75,.5,z+Math.sin(a)*.75,.12,d,-Math.cos(a)*3,2,-Math.sin(a)*3);}return;}const c=skillPalette(job,skill),duration=skill.cast||.2;this.emit('ring',c[1],x,.08,z,.65+skill.stage*.035,duration,0,0,0,.25,.5);this.emit(skill.branch?'petal':'star',c[0],x,1,z,.16,duration,0,.4,0,.15,2);}
 release(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  if(skill.level===20){this.releaseLv20(skill,job,x,z,tx,tz);return;}
  if(skill.level===10){this.releaseLv10(skill,job,x,z,tx,tz);return;}
  const c=skillPalette(job,skill),stage=skill.stage,high=stage>=7,name=skill.name.toLowerCase(),self=['heal','guard','fury'].includes(skill.effect),cx=self||job==='swordsman'&&skill.effect==='area'?x:tx,cz=self||job==='swordsman'&&skill.effect==='area'?z:tz;
  const size=.75+stage*.085,life=.55+stage*.04,count=this.low?3:3+Math.floor(stage/2),dir=Math.atan2(tx-x,tz-z),travel=Math.max(.18,Math.min(.55,Math.hypot(tx-x,tz-z)/12));
  const orbit=(shape:Shape,y:number,r:number,s:number,delay=0)=>{for(let i=0;i<count;i++){const a=i*Math.PI*2/count+stage*.2;this.emit(shape,c[i%3],cx+Math.cos(a)*r,y,cz+Math.sin(a)*r,s,life,Math.cos(a)*.4,.4,Math.sin(a)*.4,.1,2+stage*.2,delay+i*.025);}};
  if(/worldtree/.test(name)){this.emit('tree',c[0],x,.08,z,size*.75,1.3,0,0,0,.3);orbit('petal',1.8,1.2,.35);orbit('branch',.1,.65,.5,.12);this.emit('ring',c[1],x,.1,z,size,life,0,0,0,.8);}
  else if(/astral|starfall/.test(name)){for(let i=0;i<count;i++){const a=i*2.4,sx=cx+Math.cos(a)*1.1,sz=cz+Math.sin(a)*1.1;this.emit('star',c[i%3],sx,3+i%2*.4,sz,.25+stage*.02,.5,(cx-sx)/.5,-5,(cz-sz)/.5,0,4,i*.04);}this.emit('star',c[1],cx,1,cz,size*.55,life,0,0,0,.5,2,.35);}
  else if(job==='swordsman'&&/quake|earthbreaker|crush|concussion/.test(name)){for(let i=0;i<count+2;i++){const a=i*2.4;this.emit('slab',c[i%3],cx+Math.cos(a)*.65,.12,cz+Math.sin(a)*.65,.4+stage*.025,.75,Math.cos(a)*1.6,2.1,Math.sin(a)*1.6,0,3,i*.018,true);}this.emit('ring',c[0],cx,.1,cz,size,life,0,0,0,2);}
  else if(job==='swordsman'&&!self){for(let i=0;i<1;i++){const m=this.emit('crescent',c[i%3],x+Math.sin(dir)*.6,1+i*.12,z+Math.cos(dir)*.6,size*.85,.35+i*.04,Math.sin(dir)*2,0,Math.cos(dir)*2,.7,(skill.branch?-1:1)*5,i*.07);if(m)m.rotation.set(.35+skill.branch*.8,dir+i*.55,.15);}this.emit('star',c[1],tx,.8,tz,size*.35,.45,0,0,0,.3,3,.12);}
  else if(job==='archer'&&(!self||/hunt/.test(name))){const volley=/volley|rain|barrage|scatter/.test(name),n=volley||high||/hunt/.test(name)?count:1;for(let i=0;i<n;i++){const offset=(i-(n-1)/2)*.16,sx=volley?tx+offset:x,sz=volley?tz+.4:z,sy=volley?3.4:.9;this.emit('arrow',c[i%3],sx,sy,sz,.65+stage*.025,travel,(tx-sx)/travel,(.9-sy)/travel,(tz-sz)/travel,0,0,i*.025);}orbit(skill.effect==='poison'?'petal':'star',.8,.35,.16,travel);}
  else if(skill.effect==='heal'){orbit('petal',.45,.6,size*.35);this.emit('spiral',c[0],cx,.1,cz,size*.65,life,0,0,0,.2,2);this.emit('ring',c[1],cx,.1,cz,size,life,0,0,0,.3);}
  else if(skill.effect==='guard'){this.emit('shield',c[0],cx,.05,cz,size,life,0,0,0,.15);orbit('star',.7,.9,.12);}
  else if(skill.effect==='fury'){this.emit('spiral',c[0],cx,.1,cz,size*.6,life,0,0,0,.2,5);orbit('crescent',1,.6,.35);}
  else {const focal:Shape=/lightning|shock/.test(name)?'lightning':/frost|blizzard/.test(name)?'ice':skill.branch?'branch':'comet';const delay=focal==='comet'&&skill.effect!=='area'?travel:0;if(delay)this.emit('comet',c[0],x,.95,z,.45,travel,(tx-x)/travel,0,(tz-z)/travel);this.emit(focal,c[0],cx,focal==='lightning'?0:.35,cz,size,life,0,0,0,.25,0,delay);if(stage>=4)orbit(focal==='lightning'?'lightning':focal==='ice'?'ice':skill.branch?'petal':'comet',.2,.6+stage*.04,.25+stage*.02,delay+.05);}
  for(let i=0;i<(this.low?2:count);i++){const a=i*2.4;this.emit('spark',c[i%3],cx,.7,cz,.055,.55,Math.sin(a)*(1+stage*.05),.8,Math.cos(a)*(1+stage*.05),0,2,travel,true);}
 }
 /** Decorative reach is independent of the authoritative damage radius. */
 private releaseLv10(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const c=skillPalette(job,skill),branch=skill.branch,dir=Math.atan2(tx-x,tz-z),melee=job==='swordsman',crash=melee&&branch===1;
  const cx=crash?x:tx,cz=crash?z:tz,impact=melee?.08:.14,n=this.low?8:16;
  this.lv10Cue={skillId:skill.id,style:job==='swordsman'?(branch?'bulwark-impact-column':'power-cleave-beam'):job==='mage'?(branch?'bramble-helix-burst':'fire-lance-detonation'):(branch?'snare-ring-burst':'piercing-sunbeam'),impactSeconds:impact,heroSeconds:.24,focal:{x:cx,z:cz},decorativeRadius:3.4};
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration:number,delay:number,stretch:[number,number,number],vx=0,vy=0,vz=0,grow=0,spin=0,gravity=false)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay,gravity);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  // Thick luminous solids carry the silhouette; a smaller white-hot volume adds a readable core.
  const beam=(sx:number,sy:number,sz:number,ex:number,ey:number,ez:number,width:number,duration:number,delay=0)=>{
   const dx=ex-sx,dy=ey-sy,dz=ez-sz,length=Math.hypot(dx,dy,dz);
   for(const [color,w] of [[c[0],width],[c[1],width*.36]]){const m=sculpt('beam',color,(sx+ex)/2,(sy+ey)/2,(sz+ez)/2,1,duration,delay,[w,w,length/2]);if(m)m.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);}
  };
  if(melee){
   if(crash){sculpt('shield',c[0],x,.25,z,1.15,.28,0,[1,.65,1]);beam(cx,3.8,cz,cx,.2,cz,3.2,.24,impact);}
   else {const m=this.emit('crescent',c[0],x+Math.sin(dir)*.6,1,z+Math.cos(dir)*.6,1.65,.38,Math.sin(dir)*4,0,Math.cos(dir)*4,.45,6);if(m)m.rotation.set(.75,dir,-.4);beam(x,.85,z,tx,1,tz,2.8,.24);}
  }else{
   beam(x,1,z,tx,.9,tz,job==='mage'?2.8:1.5,.3);
   if(job==='archer')this.emit('arrow',c[1],x,1,z,.9,.4,(tx-x)/.4,-.1/.4,(tz-z)/.4);
   else if(!branch)this.emit('comet',c[0],x,1,z,.7,.2,(tx-x)/.2,0,(tz-z)/.2);
   else {this.emit('spiral',c[0],cx,.1,cz,.85,.62,0,0,0,.4,5,impact);this.emit('branch',c[0],cx,.1,cz,1.15,.65,0,0,0,.1,2,impact);}
  }
  sculpt('core',c[1],cx,.85,cz,.35,.24,impact,[1,crash?2:1.2,1],0,0,0,3.2);
  for(let i=0;i<(this.low?2:3);i++){
   const m=sculpt('ring',c[i%3],cx,.12+i*.09,cz,.35+i*.12,.52+i*.07,impact+i*.035,[1,1,1],0,0,0,5.7-i*.8);if(m&&!crash&&job==='mage'&&!branch)m.rotation.x=.5+i*.35;
  }
  if(job==='archer'&&branch){for(let i=0;i<3;i++){const m=this.emit('ring',c[0],cx,.5+i*.4,cz,.8,.68,0,0,0,.45,2,impact+i*.04);if(m)m.rotation.x=.2*i;}this.emit('branch',c[0],cx,.08,cz,.8,.7,0,0,0,.3,3,impact);}
  // Wide ballistic fans give a forceful detonation, with substantial rays rather than tiny crystals.
  for(let i=0;i<n;i++){
   const a=i*Math.PI*2/n+branch*.22,v=3.8+i%3*.65;
   const shape:Shape=crash?'slab':job==='mage'&&branch?'petal':'ray';
   const m=sculpt(shape,c[i%3],cx+Math.sin(a)*.3,.65,cz+Math.cos(a)*.3,shape==='slab'?.3:shape==='petal'?.38:.3,.55+i%3*.055,impact+i%2*.018,[1,1,shape==='ray'?2:1],Math.sin(a)*v,1.6+i%3*.5,Math.cos(a)*v,-.25,shape==='ray'?0:3,true);
   if(m&&shape==='ray')m.rotation.set(-.3, a,0);
  }
  if(!this.low){for(let i=0;i<5;i++){const a=i*2.4;this.emit('spark',c[1],cx,.85,cz,.12,.5,Math.sin(a)*3.8,3.8,Math.cos(a)*3.8,-.12,2,impact,true);}}
 }
 /** Level twenty's reach is decorative; the release callback already coincides with game impact. */
 private releaseLv20(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,c=job==='mage'&&!branch?[0x65cfff,0xe3fbff,0x9e99ff]:skillPalette(job,skill);
  const cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz,dir=Math.atan2(tx-x,tz-z);
  const style=job==='swordsman'?(branch?'concussion-crown':'whirlwind-blade-vortex'):job==='mage'?(branch?'dew-bloom-fountain':'frost-nova-spires'):(branch?'venom-dart-eruption':'arrow-rain-sunburst');
  this.lv20Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:.28,focal:{x:cx,z:cz},decorativeRadius:5.6};
  // Reserve a complete hero silhouette even when previous casts filled the active budget.
  // Older decorative meshes return to their existing pool; no extra allocation tier is introduced.
  const limit=this.low?40:96;
  while(this.active.length>limit-18){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration:number,stretch:[number,number,number],vx=0,vy=0,vz=0,grow=0,spin=0,delay=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  const beam=(sx:number,sy:number,sz:number,ex:number,ey:number,ez:number,width:number)=>{
   const dx=ex-sx,dy=ey-sy,dz=ez-sz,length=Math.hypot(dx,dy,dz);
   for(const [color,w] of [[c[0],width],[c[1],width*.32]]){const m=sculpt('beam',color,(sx+ex)/2,(sy+ey)/2,(sz+ez)/2,1,.28,[w,w,length/2]);if(m)m.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);}
  };
  // These first meshes are immediate, substantial and readable with particles disabled.
  sculpt('core',c[1],cx,.9,cz,.65,.22,[1,branch?1.8:1.2,1],0,0,0,4);
  for(let i=0;i<3;i++)sculpt('ring',c[i],cx,.12+i*.13,cz,.45+i*.12,.52,[1,1,1],0,0,0,(5.6-.45-i*.12)/.52);
  beam(cx,.15,cz,cx,job==='archer'?4.8:4.1,cz,job==='swordsman'?4:2.6);
  if(job!=='swordsman')beam(x,1,z,cx,1,cz,job==='archer'?1.8:2.6);
  if(job==='swordsman'){
   if(branch){sculpt('shield',c[0],cx,.2,cz,1.8,.3,[1,.65,1]);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sculpt('slab',c[i%3],cx+Math.sin(a)*1.2,.3,cz+Math.cos(a)*1.2,.65,.48,[1,2,1],Math.sin(a)*4,2,Math.cos(a)*4,0,3);}}
   else for(let i=0;i<3;i++){const m=sculpt('crescent',c[i],cx,.6+i*.35,cz,1.8,.42,[1,1,1],0,0,0,5.4,9+i*2);if(m)m.rotation.set(.25+i*.2,dir+i*2.1,.15);}
  }else if(job==='mage'){
   if(branch){sculpt('spiral',c[0],cx,.1,cz,1.3,.6,[1,1.4,1],0,0,0,.7,6);sculpt('tree',c[0],cx,.1,cz,.9,.58,[1,1.1,1],0,0,0,.6);}
   else for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sculpt('ice',c[i%3],cx+Math.sin(a)*1.2,.1,cz+Math.cos(a)*1.2,.85,.58,[1,1.7,1],Math.sin(a)*3,0,Math.cos(a)*3,.4);}
  }else if(branch){sculpt('arrow',c[1],cx,.9,cz,1.2,.28,[1,1,1],0,0,0,0,0);sculpt('spiral',c[0],cx,.1,cz,1.3,.6,[1,1.3,1],0,0,0,.7,-5);sculpt('branch',c[2],cx,.1,cz,1.2,.58,[1,1.3,1],0,0,0,.6);}
  else for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const m=sculpt('arrow',c[i%3],cx+Math.sin(a)*1.3,3.2+i%2*.5,cz+Math.cos(a)*1.3,.95,.34,[1,1,1],0,-8,0);if(m)m.rotation.x=Math.PI/2;}
  // Radial fan spans nearly six world units, with distinct airborne volumes per family.
  const n=this.low?12:28,shape:Shape=job==='swordsman'&&branch?'slab':job==='mage'?(branch?'petal':'ice'):job==='archer'&&branch?'petal':'ray';
  for(let i=0;i<n;i++){
   const a=i*Math.PI*2/n+branch*.2,speed=8.4+i%3*.3;
   const m=sculpt(shape,c[i%3],cx+Math.sin(a)*.5,.65+i%3*.12,cz+Math.cos(a)*.5,shape==='ray'?.28:.32,.55,[1,1,shape==='ray'?2.5:1],Math.sin(a)*speed,1.4+i%3*.6,Math.cos(a)*speed,-.18,shape==='ray'?0:4);
   if(m&&shape==='ray')m.rotation.set(-.25,a,0);
  }
  if(!this.low)for(let i=0;i<10;i++){const a=i*Math.PI*2/10;sculpt('spark',c[1],cx,.9,cz,.13,.42,[1,1,1],Math.sin(a)*10,3,Math.cos(a)*10,-.15,3);}
 }
 basic(job:ClassId,x:number,z:number){this.emit(job==='swordsman'?'crescent':'star',job==='mage'?0xb5d9ff:0xffe5a3,x,.75,z,job==='swordsman'?.65:.14,.3,0,.4,0,.5,4);}
 update(dt:number){for(let i=this.active.length-1;i>=0;i--){const p=this.active[i];let elapsed=dt;if(p.delay>0){p.delay-=dt;if(p.delay>0)continue;elapsed=-p.delay;p.delay=0;p.mesh.setEnabled(true);}p.life-=elapsed;if(p.life<=0){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;let list=this.free.get(shape);if(!list){list=[];this.free.set(shape,list);}list.push(p.mesh);this.active.splice(i,1);continue;}const t=p.duration-p.life;p.mesh.position.set(p.x+p.vx*t,p.y+p.vy*t-(p.gravity?t*t*3:0),p.z+p.vz*t);p.mesh.rotation.y+=p.spin*elapsed;p.mesh.visibility=Math.min(1,p.life/.08);const scale=Math.max(.01,p.size+p.grow*t);p.mesh.scaling.set(scale*p.stretch[0],scale*p.stretch[1],scale*p.stretch[2]);}}
 clear(){this.lv10Cue=null;this.lv20Cue=null;for(const p of this.active){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;const list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}this.active.length=0;}
 dispose(){this.clear();this.free.forEach(list=>list.forEach(mesh=>mesh.dispose()));this.templates.forEach(mesh=>mesh.dispose());this.materials.forEach(material=>material.dispose());this.free.clear();this.templates.clear();this.materials.clear();this.created=0;}
}
