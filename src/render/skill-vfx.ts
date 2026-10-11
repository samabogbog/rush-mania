import {skillCastDuration} from '../game/skill-timing.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Skill, ClassId } from '../game/classes';
type Shape='spark'|'ring'|'petal'|'crescent'|'shield'|'lightning'|'branch'|'slab'|'arrow'|'spiral'|'comet'|'ice'|'star'|'tree'|'beam'|'core'|'ray'|'arch'|'vault'|'bastion'|'leaf'|'shockbolt'|'scream'|'sword'|'stag'|'banner'|'cloud'|'goldstar'|'impactshield'|'rootclaw'|'serpent'|'fang'|'stoneshard'|'fireblade'|'galaxyarm'|'worldcrown'|'blossom'|'featherwing'|'crownfoliage';
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
/** Authored level-fifty colors follow the actual skill icon artwork. */
function lv50Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0xffc34d,0xfff0b3,0xaa7135]:[0x67ddb5,0xf3fff1,0x238d78]):job==='mage'?(branch?[0x9bea4b,0xf7ffd0,0xf2d45f]:[0xf888bd,0xfff5f5,0x49c7ae]):branch?[0xb866ff,0xf9eeff,0x6030ae]:[0x72d14f,0xfff8ed,0xedcc63];
}
/** Level sixty follows the six v4 icons, independent of generic effect palettes. */
export function lv60Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0xff542e,0xffe0a0,0x962939]:[0xe82d43,0xffbf64,0x9c193f]):job==='mage'?(branch?[0xffd451,0xfff4c1,0xc79035]:[0x9c43ef,0xead0ff,0x5d2ba8]):branch?[0x36dfff,0xffe176,0x168aa5]:[0xe4b43e,0xfff1ac,0x727b29];
}
/** Lv70 colors sampled from the authored v4 icons, never inferred from buff names. */
export function lv70Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0x28dfe7,0xe5ffff,0x73634b]:[0xf43d23,0xffedbf,0xad1529]):job==='mage'?(branch?[0x83e632,0xf1ffd4,0x26883f]:[0x38bfff,0xe2faff,0x2469b3]):branch?[0x91e52f,0xeeffd0,0x337746]:[0x72caff,0xe9f4ff,0x416dac];
}
/** Six level-eighty icon palettes, including offensive Spirit Surge and Standard Strike. */
export function lv80Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0xffcc55,0xfff1b8,0xe54332]:[0xac52f4,0xf0caff,0x6122a4]):job==='mage'?(branch?[0x45f2ce,0xe5fff2,0x148e91]:[0x9de939,0xbc51e5,0x642596]):branch?[0x6fc53c,0xffe9a1,0x286a32]:[0x9cf332,0xd398ff,0x7329b7];
}
/** Lv90 colors follow the six v4 illustrations: gold stone, gold impact, star, wood, crimson and venom. */
export function lv90Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0xffc443,0xfff6cb,0x8c673b]:[0xffcb51,0xfff4b4,0x795139]):job==='mage'?(branch?[0x86512b,0xf2ce49,0x73c638]:[0xffd34e,0xfff7cb,0xe99528]):branch?[0x22e38a,0xc8ffb4,0x087454]:[0xe82b55,0xffc8da,0x701b38];
}
/** Final-tier colors are authored from the six actual v4 ultimate icons. */
export function lv100Palette(job:ClassId,branch:number):number[]{
 return job==='swordsman'?(branch?[0xffc638,0xfff9db,0x79513b]:[0xff5a16,0xfff5b8,0xca202f]):job==='mage'?(branch?[0xffd44b,0xff91c8,0x73d747]:[0x7431de,0xf19aff,0xffffff]):branch?[0xffcd39,0xfff6bd,0xb58223]:[0x32caff,0xeaffff,0x2381dc];
}
/** Immutable shared volumetric geometry, persistent shaded materials and a bounded mesh pool. */
export class SkillVFX {
 private templates=new Map<Shape,Mesh>();private materials=new Map<string,StandardMaterial>();
 private active:Particle[]=[];private free=new Map<Shape,Mesh[]>();private created=0;private serial=0;private low=false;
 private lv100Cue:typeof this.lv70Cue=null;
 private lv90Cue:typeof this.lv70Cue=null;
 private lv80Cue:typeof this.lv70Cue=null;
 private lv70Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number;palette:number[];endSeconds:number}|null=null;
 private lv60Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number;palette:number[];endSeconds:number}|null=null;
 private lv50Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 private lv40Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 private lv30Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 private lv20Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 private lv10Cue:{skillId:string;style:string;impactSeconds:number;heroSeconds:number;focal:{x:number;z:number};decorativeRadius:number}|null=null;
 static readonly MAX_MESHES=160;
 constructor(private scene:Scene){}
 setLowQuality(low:boolean){this.low=low;}
 get diagnostics(){return {active:this.active.length,pooled:this.created,limit:this.low?40:96,geometry3D:true,noSprites:true,textures:0,shapes:[...this.templates.keys()],materials:this.materials.size,lv10Cue:this.lv10Cue,lv20Cue:this.lv20Cue,lv30Cue:this.lv30Cue,lv40Cue:this.lv40Cue,lv50Cue:this.lv50Cue,lv60Cue:this.lv60Cue,lv70Cue:this.lv70Cue,lv80Cue:this.lv80Cue,lv90Cue:this.lv90Cue,lv100Cue:this.lv100Cue,drawCount:this.active.filter(p=>p.mesh.isEnabled()).length};}
 private template(shape:Shape){
  const name='vfx-template-'+shape,parts:Mesh[]=[];
  const tube=(path:Vector3[],radius:number)=>{const m=MeshBuilder.CreateTube(name,{path,radius,tessellation:7},this.scene);parts.push(m);return m;};
  const sphere=(x:number,y:number,z:number,s:number)=>{const m=MeshBuilder.CreateSphere(name,{diameter:s,segments:6},this.scene);m.position.set(x,y,z);parts.push(m);return m;};
  if(shape==='fireblade'||shape==='galaxyarm'){
   // Closed diamond-section ribbons: broad sculpted faces, curved tapered tips, zero textures.
   const positions:number[]=[],indices:number[]=[],normals:number[]=[],sections=49;
   for(let i=0;i<sections;i++){const t=i/(sections-1),a=shape==='fireblade'?-.8+t*3.5:t*5.2,r=shape==='fireblade'?1.1: .18+t*1.25,w=.008+Math.sin(Math.PI*t)*(shape==='fireblade'?.31:.115),h=shape==='fireblade'?.065:.055;
    for(const [dr,dy] of [[-w,0],[0,h],[w,0],[0,-h]])positions.push(Math.cos(a)*(r+dr),dy+(shape==='galaxyarm'?t*.18:Math.sin(a)*.10),Math.sin(a)*(r+dr));
   }
   for(let i=0;i<sections-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;indices.push(a,c,b,b,c,d);}
   indices.push(0,1,2,0,2,3);const end=(sections-1)*4;indices.push(end,end+2,end+1,end,end+3,end+2);
   VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=new Array(positions.length/3*2).fill(0);const mesh=new Mesh(name,this.scene);data.applyToMesh(mesh);parts.push(mesh);
  }
  else if(shape==='worldcrown'){
   // Curved tapering boughs spread into a rounded crown; the lower trunk stays open.
   const bough=(path:Vector3[],radius:number)=>{const m=MeshBuilder.CreateTube(name,{path,radiusFunction:(i)=>radius*(1-i/(path.length-1)*.91),tessellation:8},this.scene);parts.push(m);};
   bough(Array.from({length:13},(_,i)=>{const t=i/12;return new Vector3(Math.sin(t*5)*.12,t*3.3,Math.sin(t*3)*.08);}),.19);
   for(let i=0;i<8;i++){const a=i*Math.PI/4,y=1.15+i%3*.19;
    const path=Array.from({length:13},(_,j)=>{const t=j/12,r=1.85*Math.sin(t*Math.PI*.48);return new Vector3(Math.cos(a)*r,y+t*1.9-Math.sin(t*Math.PI)*.18,Math.sin(a)*r);});bough(path,.115);
    for(const side of [-1,1]){const b=a+side*.33;bough(Array.from({length:10},(_,j)=>{const t=j/9,r=.85+t;return new Vector3(Math.cos(b)*r,y+1+t*.95+Math.sin(t*Math.PI)*.1,Math.sin(b)*r);}),.065);}
    bough(Array.from({length:8},(_,j)=>{const t=j/7;return new Vector3(Math.cos(a)*t,.15*Math.sin(t*Math.PI),Math.sin(a)*t);}),.085);
   }
  }
  else if(shape==='blossom'){
   // A full rounded spray of nine flowers, each with five plump dimensional petals.
   for(let k=0;k<9;k++){const a=k*2.4,r=k===0?0:.32+(k%3)*.22,cx=Math.cos(a)*r,cz=Math.sin(a)*r,cy=.12+Math.sin(k*1.7)*.22;
    for(let i=0;i<5;i++){const b=i*Math.PI*2/5,m=sphere(cx+Math.cos(b)*.18,cy,cz+Math.sin(b)*.18,.32);m.scaling.set(1,.75,1);m.rotation.set(.25*Math.cos(a),0,.25*Math.sin(a));}
    sphere(cx,cy+.08,cz,.17);
   }
  }
  else if(shape==='crownfoliage'){
   // Dedicated ultimate foliage: many small rounded leaves grouped at crown tips.
   for(let i=0;i<13;i++){const a=i*2.4,r=i===0?0:.25+i%4*.19,m=sphere(Math.cos(a)*r,Math.sin(i*1.8)*.18,Math.sin(a)*r,.55);m.scaling.set(.65,.65,1.35);m.rotation.set(.3*Math.sin(a),a,.35*Math.cos(a));}
  }
  else if(shape==='featherwing'){
   // Layered swept white pinions have broad closed faces and a raised central ridge.
   // Seven long primary feathers overlap five shorter coverts, all in one shared mesh.
   tube([Vector3.Zero(),new Vector3(.65,.4,0),new Vector3(1.5,.58,.08)],.055);
   const positions:number[]=[],indices:number[]=[],normals:number[]=[];
   const feather=(bx:number,by:number,length:number,sweep:number,width:number,depth:number)=>{
    const base=positions.length/3,sections=21;
    for(let j=0;j<sections;j++){const t=j/(sections-1),cx=bx+sweep*t+.16*Math.sin(t*Math.PI),cy=by+length*t,cz=depth+.08*Math.sin(t*Math.PI),w=.006+width*Math.pow(Math.sin(t*Math.PI),.8),ridge=.012+.075*Math.sin(t*Math.PI);
     const dx=sweep+.16*Math.PI*Math.cos(t*Math.PI),dy=length,n=Math.hypot(dx,dy),nx=dy/n,ny=-dx/n;
     for(const [side,z] of [[-w,0],[0,ridge],[w,0],[0,-ridge]])positions.push(cx+nx*side,cy+ny*side,cz+z);
    }
    for(let j=0;j<sections-1;j++)for(let k=0;k<4;k++){const a=base+j*4+k,b=base+j*4+(k+1)%4,c=base+(j+1)*4+k,d=base+(j+1)*4+(k+1)%4;indices.push(a,c,b,b,c,d);}
    indices.push(base,base+1,base+2,base,base+2,base+3);const end=base+(sections-1)*4;indices.push(end,end+2,end+1,end,end+3,end+2);
    tube(Array.from({length:15},(_,j)=>{const t=j/14;return new Vector3(bx+sweep*t+.16*Math.sin(t*Math.PI),by+length*t,depth+.08*Math.sin(t*Math.PI)+.065);}),.019);
   };
   for(let i=0;i<7;i++)feather(.15+i*.205,.16+i*.06, .8+i*.105,.28+i*.05,.20+i*.012,.04-i*.015);
   for(let i=0;i<5;i++)feather(.18+i*.25,.15+i*.07,.52+i*.055,.15,.22,.17);
   VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=new Array(positions.length/3*2).fill(0);const feathers=new Mesh(name,this.scene);data.applyToMesh(feathers);parts.push(feathers);
  }
  else if(shape==='beam'||shape==='ray'){const m=MeshBuilder.CreateCylinder(name,{height:2,diameterTop:shape==='ray'?.035:.16,diameterBottom:shape==='ray'?.16:.22,tessellation:8},this.scene);m.rotation.x=Math.PI/2;parts.push(m);}
  else if(shape==='shockbolt'){
   // A directional, genuinely jagged arrow trail; unlike the vertical storm bolt.
   const path=[new Vector3(0,0,-1.8),new Vector3(.35,.12,-1),new Vector3(-.22,-.08,-.45),new Vector3(.42,.14,.2),new Vector3(0,0,1.6)];tube(path,.09);
   tube([path[2],new Vector3(-.7,.2,.1),new Vector3(-.45,.1,.65)],.055);
   tube([path[3],new Vector3(.9,-.1,.7),new Vector3(.65,0,1.1)],.055);
  }
  else if(shape==='goldstar'||shape==='impactshield'){
   // Closed extruded silhouettes: a real five-point star and a solid collision shield.
   const outline:Vector3[]=shape==='goldstar'?Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,r=i%2?.44:1.1;return new Vector3(Math.cos(a)*r,Math.sin(a)*r,0);}):[new Vector3(-.8,.85,0),new Vector3(.8,.85,0),new Vector3(.85,-.1,0),new Vector3(0,-1.2,0),new Vector3(-.85,-.1,0)];
   const positions:number[]=[],indices:number[]=[],normals:number[]=[],n=outline.length;
   for(const depth of [-.13,.13]){positions.push(0,0,depth);for(const v of outline)positions.push(v.x,v.y,depth);}
   for(let i=0;i<n;i++){const a=i+1,b=(i+1)%n+1;indices.push(0,b,a,n+1,n+1+a,n+1+b,a,b,n+1+a,b,n+1+b,n+1+a);}
   VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=new Array(positions.length/3*2).fill(0);const m=new Mesh(name,this.scene);data.applyToMesh(m);parts.push(m);
   if(shape==='impactshield'){tube([new Vector3(0,-.65,.2),new Vector3(0,.65,.2)],.065);tube([new Vector3(-.55,.3,.2),new Vector3(.55,.3,.2)],.065);}
  }
  else if(shape==='rootclaw'){
   // Bent wooden fingers curl inward, leaving the victim visible between the roots.
   tube([new Vector3(0,0,0),new Vector3(.5,.3,0),new Vector3(.65,1,0),new Vector3(.45,1.65,.08),new Vector3(-.15,1.85,.12)],.13);
   tube([new Vector3(.5,.55,0),new Vector3(.95,1,.18),new Vector3(.8,1.45,.25)],.085);
   tube([new Vector3(.4,.25,0),new Vector3(.9,.18,-.35),new Vector3(1.25,0,-.55)],.1);
  }
  else if(shape==='serpent'){
   // Open upper and lower jaws, brow ridges and a sweeping neck; fangs emitted separately in ivory.
   tube([new Vector3(0,0,-1.6),new Vector3(-.3,.5,-.9),new Vector3(0,1.2,-.25),new Vector3(0,1.4,.4)],.25);
   const skull=sphere(0,1.45,.5,.9);skull.scaling.set(.95,.55,1.4);
   const jaw=sphere(0,.78,.55,.7);jaw.scaling.set(.9,.24,1.5);
   for(const side of [-1,1]){tube([new Vector3(side*.32,1.5,.15),new Vector3(side*.4,1.7,.55),new Vector3(side*.25,1.6,.95)],.1);}
  }
  else if(shape==='stoneshard'){
   // Broad irregular pentagonal rock faces taper to a sharp erupting tip.
   const m=MeshBuilder.CreateCylinder(name,{height:2.3,diameterTop:0,diameterBottom:1.1,tessellation:5},this.scene);m.position.y=1.05;m.rotation.z=.18;parts.push(m);
   const ridge=MeshBuilder.CreateCylinder(name,{height:1.5,diameterTop:0,diameterBottom:.65,tessellation:4},this.scene);ridge.position.set(.35,.6,.12);ridge.rotation.z=-.35;parts.push(ridge);
  }
  else if(shape==='fang'){const m=MeshBuilder.CreateCylinder(name,{height:.75,diameterTop:.24,diameterBottom:0,tessellation:7},this.scene);parts.push(m);}
  else if(shape==='stag'){
   // Solid leaping stag, oriented +Z: haunches, chest, long neck, muzzle and branching antlers.
   const body=sphere(0,1.2,0,1.15);body.scaling.set(.65,.8,1.55);
   sphere(0,1.55,.55,.75);const neck=sphere(0,1.95,.85,.6);neck.scaling.set(.75,1.8,.8);
   const head=sphere(0,2.65,1.15,.55);head.scaling.set(.7,.8,1.4);sphere(0,2.52,1.52,.35);
   for(const side of [-1,1]){
    tube([new Vector3(side*.3,1.1,.55),new Vector3(side*.4,.65,1),new Vector3(side*.35,.15,1.5)],.1);
    tube([new Vector3(side*.3,1,-.6),new Vector3(side*.4,.5,-.95),new Vector3(side*.35,.2,-1.5)],.12);
    tube([new Vector3(side*.17,2.85,1),new Vector3(side*.55,3.45,.7),new Vector3(side*.85,3.85,.3)],.07);
    for(let i=0;i<3;i++)tube([new Vector3(side*(.35+i*.16),3.1+i*.24,.85-i*.17),new Vector3(side*(.65+i*.17),3.5+i*.22,1-i*.13)],.055);
    const ear=sphere(side*.32,2.9,1.05,.3);ear.scaling.set(1.5,.5,.7);
   }
   tube([new Vector3(0,1.5,-.7),new Vector3(0,1.85,-1.1)],.13);
  }
  else if(shape==='banner'){
   tube([new Vector3(0,0,0),new Vector3(0,3.8,0)],.07);
   const cloth=MeshBuilder.CreateBox(name,{width:1.65,height:1.6,depth:.10},this.scene);cloth.position.set(.8,2.7,0);cloth.rotation.y=.18;parts.push(cloth);
   const tip=MeshBuilder.CreateCylinder(name,{height:.45,diameterTop:0,diameterBottom:.24,tessellation:5},this.scene);tip.position.y=4;parts.push(tip);
  }
  else if(shape==='cloud'){
   for(let i=0;i<7;i++){const a=i*2.4;const m=sphere(Math.cos(a)*.55,.2+i%3*.25,Math.sin(a)*.55,.9+i%2*.2);m.scaling.y=.7;}
  }
  else if(shape==='sword'){
   // A solid faceted sword has a pointed blade, broad guard and separate grip.
   const blade=MeshBuilder.CreateCylinder(name,{height:2.7,diameterTop:0,diameterBottom:.38,tessellation:4},this.scene);blade.position.y=1.55;parts.push(blade);
   const guard=MeshBuilder.CreateBox(name,{width:1.05,height:.16,depth:.25},this.scene);guard.position.y=.22;parts.push(guard);
   const grip=MeshBuilder.CreateCylinder(name,{height:.65,diameter:.15,tessellation:7},this.scene);grip.position.y=-.18;parts.push(grip);sphere(0,-.52,0,.25);
  }
  else if(shape==='scream'){
   // Three open crimson wind blades make a broad shout front with a clear center.
   for(let k=0;k<3;k++)tube(Array.from({length:25},(_,i)=>{const a=-1.05+i/24*2.1,r=1+k*.32;return new Vector3(Math.sin(a)*r,k*.22,Math.cos(a)*r);}),.10-k*.018);
  }
  else if(shape==='core'){parts.push(MeshBuilder.CreateSphere(name,{diameter:1,segments:12},this.scene));}
  else if(shape==='arch'||shape==='vault'){
   // A smooth open vault: its empty center keeps the struck creature readable.
   const path=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI;return new Vector3(Math.cos(a),Math.sin(a)*1.5,0);});
   parts.push(MeshBuilder.CreateTube(name,{path,radius:shape==='vault'?.15:.07,tessellation:10},this.scene));
  }
  else if(shape==='bastion'){
   const body=MeshBuilder.CreateCylinder(name,{height:3,diameterTop:.62,diameterBottom:.95,tessellation:8},this.scene);body.position.y=1.5;parts.push(body);
   const cap=MeshBuilder.CreateCylinder(name,{height:.45,diameterTop:0,diameterBottom:.85,tessellation:8},this.scene);cap.position.y=3.15;parts.push(cap);
  }
  else if(shape==='leaf'){
   // A tapered curved leaf with broad shaded faces, rather than a flattened sphere.
   const positions:number[]=[],indices:number[]=[],normals:number[]=[],sections=25;
   for(let i=0;i<sections;i++){const t=i/(sections-1),bulge=Math.sin(t*Math.PI),z=t*2-1,width=.012+.55*bulge,depth=.012+.12*bulge,y=.3*bulge;
    for(const [px,py] of [[-width,y],[0,y+depth],[width,y],[0,y-depth]])positions.push(px,py,z);
   }
   for(let i=0;i<sections-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;indices.push(a,c,b,b,c,d);}
   indices.push(0,1,2,0,2,3);const last=(sections-1)*4;indices.push(last,last+2,last+1,last,last+3,last+2);
   VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;const m=new Mesh(name,this.scene);data.applyToMesh(m);parts.push(m);
  }
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
 anticipation(skill:Skill,job:ClassId,x:number,z:number){if(skill.level===100){
  const c=lv100Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;
  this.emit('ring',c[0],x,.09,z,3.8,d,0,0,0,-2);
  const shape:Shape=job==='swordsman'?(skill.branch?'sword':'fireblade'):job==='mage'?(skill.branch?'worldcrown':'galaxyarm'):skill.branch?'stag':'arrow';
  const m=this.emit(shape,c[0],x,job==='mage'?2.2:1,z,shape==='stag'?.55:.8,d,0,.2,0,.2,.3);if(m&&shape==='arrow')m.rotation.x=-Math.PI/2;
  return;}
 if(skill.level===90){
  const c=lv90Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;
  this.emit('ring',c[2],x,.09,z,3.4,d,0,0,0,-1.5);
  const shape:Shape=job==='swordsman'?(skill.branch?'impactshield':'sword'):job==='mage'?(skill.branch?'rootclaw':'goldstar'):'arrow';
  const m=this.emit(shape,c[0],x,1.1,z,.85,d,0,.2,0,.15);if(m&&shape==='sword')m.rotation.z=-.6;
  return;}
 if(skill.level===80){
  const c=lv80Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;
  this.emit('ring',c[2],x,.09,z,3.1,d,0,0,0,-1.5);
  const shape:Shape=job==='swordsman'?(skill.branch?'banner':'crescent'):job==='mage'?(skill.branch?'stag':'cloud'):'arrow';
  const m=this.emit(shape,c[0],x,job==='mage'&&skill.branch?.25:1.1,z,shape==='stag'?.65:.9,d,0,.2,0,.1);if(m&&shape==='crescent')m.rotation.z=-.3;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.emit(job==='archer'&&skill.branch?'branch':'spark',c[i],x+Math.sin(a)*1.6,.4,z+Math.cos(a)*1.6,.35,d,-Math.sin(a)*.4,.3,-Math.cos(a)*.4);}
  return;}
 if(skill.level===70){
  const c=lv70Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;
  this.emit('ring',c[2],x,.09,z,2.7,d,0,0,0,-1.2);
  if(job==='swordsman'){const m=this.emit('sword',c[1],x,1.1,z,.8,d,0,.3,0,.12);if(m)m.rotation.z=skill.branch?-.25:-1;}
  else if(job==='mage'){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const m=this.emit(skill.branch?'leaf':'ice',c[i],x+Math.sin(a)*1.3,1.5,z+Math.cos(a)*1.3,.5,d,-Math.sin(a)*.3,.3,-Math.cos(a)*.3,.12);if(m)m.rotation.y=a;}}
  else if(skill.branch){this.emit('shield',c[2],x,.2,z,1.25,d);this.emit('leaf',c[0],x,1.5,z,.9,d,0,.3,0,.1,1);}
  else {for(let i=0;i<3;i++)this.emit('arrow',c[i],x+(i-1)*.5,1.3,z,.65,d,0,.1,.2);}
  return;}
 if(skill.level===60){
  const c=lv60Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;
  this.emit('ring',c[2],x,.09,z,2.2,d,0,0,0,-1.4);
  if(job==='mage'&&skill.branch){const moon=this.emit('crescent',c[0],x,3.2,z,1.2,d,0,.35,0,.12);if(moon)moon.rotation.x=Math.PI/2;}
  else {const m=this.emit(job==='mage'?'core':job==='archer'?'arrow':'scream',c[0],x,1.3,z,job==='mage'?.42:.7,d,0,.25,0,.2);if(m&&job==='swordsman')m.rotation.y=Math.PI;}
  this.emit('ring',c[1],x,.15,z,.8,d,0,0,0,.35);return;}
 if(skill.level===50){const c=lv50Palette(job,skill.branch),d=skillCastDuration(skill.cast)||.2;this.emit('ring',c[0],x,.08,z,2,d,0,0,0,-4);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const m=this.emit('arch',c[i],x,.15,z,.85,d,0,.25,0,.4);if(m)m.rotation.y=a;}return;}if(skill.level===40){const c=skillPalette(job,skill),d=skillCastDuration(skill.cast)||.2;this.emit('ring',c[0],x,.08,z,1.7,d,0,0,0,-3);this.emit(job==='mage'?'lightning':job==='archer'?'arrow':'shield',c[1],x,1,z,.45,d,0,.5,0,.6,2);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.emit('star',c[i],x+Math.sin(a),.7,z+Math.cos(a),.2,d,-Math.sin(a)*3,1,-Math.cos(a)*3);}return;}if(skill.level===10){const c=skillPalette(job,skill),d=skillCastDuration(skill.cast)||.18;this.emit('ring',c[0],x,.09,z,1.1,d,0,0,0,-2);this.emit('core',c[1],x,1,z,.13,d,0,.2,0,.75);for(let i=0;i<(this.low?3:6);i++){const a=i*Math.PI*2/(this.low?3:6);this.emit('ray',c[0],x+Math.cos(a)*.75,.5,z+Math.sin(a)*.75,.12,d,-Math.cos(a)*3,2,-Math.sin(a)*3);}return;}const c=skillPalette(job,skill),duration=skillCastDuration(skill.cast)||.2;this.emit('ring',c[1],x,.08,z,.65+skill.stage*.035,duration,0,0,0,.25,.5);this.emit(skill.branch?'petal':'star',c[0],x,1,z,.16,duration,0,.4,0,.15,2);}
 release(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  if(skill.level===100){this.releaseLv100(skill,job,x,z,tx,tz);return;}
  if(skill.level===90){this.releaseLv90(skill,job,x,z,tx,tz);return;}
  if(skill.level===80){this.releaseLv80(skill,job,x,z,tx,tz);return;}
  if(skill.level===70){this.releaseLv70(skill,job,x,z,tx,tz);return;}
  if(skill.level===60){this.releaseLv60(skill,job,x,z,tx,tz);return;}
  if(skill.level===50){this.releaseLv50(skill,job,x,z,tx,tz);return;}
  if(skill.level===40){this.releaseLv40(skill,job,x,z,tx,tz);return;}
  if(skill.level===30){this.releaseLv30(skill,job,x,z,tx,tz);return;}
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
 /** Level thirty is a decorative release only: no gameplay range or choreography is changed. */
 private releaseLv30(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,c=job==='mage'&&!branch?[0x9d8cff,0xe9e3ff,0x69e9ff]:skillPalette(job,skill);
  const cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz,dir=Math.atan2(tx-x,tz-z);
  const style=job==='swordsman'?(branch?'field-recovery-cross-fountain':'iron-guard-fortress-crash'):job==='mage'?(branch?'spore-hex-orbital-cage':'arcane-barrier-prism-crash'):(branch?'scatter-volley-six-spoke-fan':'evasive-stance-wing-crash');
  this.lv30Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:.32,focal:{x:cx,z:cz},decorativeRadius:6.6};
  // Keep the entire new silhouette even when casts overlap. Reuse the same bounded pool.
  const limit=this.low?40:96;
  while(this.active.length>limit-24){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration:number,stretch:[number,number,number],vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  const beam=(sx:number,sy:number,sz:number,ex:number,ey:number,ez:number,width:number)=>{
   const dx=ex-sx,dy=ey-sy,dz=ez-sz,length=Math.hypot(dx,dy,dz);
   for(const [color,w] of [[c[0],width],[c[1],width*.3]]){const m=sculpt('beam',color,(sx+ex)/2,(sy+ey)/2,(sz+ez)/2,1,.32,[w,w,length/2]);if(m)m.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);}
  };
  sculpt('core',c[1],cx,1,cz,.8,.28,[1,1.6,1],0,0,0,3.4);
  for(let i=0;i<3;i++)sculpt('ring',c[i],cx,.12+i*.14,cz,.6+i*.15,.6,[1,1,1],0,0,0,(6.6-.6-i*.15)/.6);
  // Job/branch silhouettes are deliberately different from level twenty's central pillar.
  if(job==='swordsman'&&!branch){
   sculpt('shield',c[0],cx,.15,cz,2.1,.4,[1,.8,1]);
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2,px=cx+Math.sin(a)*1.7,pz=cz+Math.cos(a)*1.7;beam(px,4.8,pz,px,.15,pz,3.4);sculpt('slab',c[2],px,.25,pz,.8,.6,[1,2.4,1],Math.sin(a)*2,1.6,Math.cos(a)*2,0,2);}
  }else if(job==='swordsman'){
   for(let i=0;i<4;i++){const a=dir+i*Math.PI/2;beam(cx,.2,cz,cx+Math.sin(a)*3.8,2.8,cz+Math.cos(a)*3.8,3);}
   sculpt('spiral',c[0],cx,.1,cz,1.5,.65,[1,1.6,1],0,0,0,.5,4);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;sculpt('petal',c[2],cx+Math.sin(a)*1.5,1.5,cz+Math.cos(a)*1.5,.7,.6,[1,1,2],Math.sin(a)*3,2,Math.cos(a)*3,0,3);}
  }else if(job==='mage'&&!branch){
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3,b=dir+(i+1)*Math.PI*2/3;beam(cx+Math.sin(a)*2.8,.3,cz+Math.cos(a)*2.8,cx,4.8,cz,3);beam(cx+Math.sin(a)*2.8,.3,cz+Math.cos(a)*2.8,cx+Math.sin(b)*2.8,.3,cz+Math.cos(b)*2.8,2);}
   sculpt('shield',c[0],cx,.2,cz,2.3,.45,[1,1.5,1]);
  }else if(job==='mage'){
   for(let i=0;i<3;i++){const m=sculpt('ring',c[i],cx,1.6,cz,2,.65,[1,1,1],0,0,0,.5,2+i);if(m)m.rotation.set(Math.PI/2,0,i*Math.PI/3);const a=i*Math.PI*2/3;beam(cx+Math.sin(a)*2.3,3.5,cz+Math.cos(a)*2.3,cx,.5,cz,2.6);sculpt('core',c[0],cx+Math.sin(a)*2.3,2.8,cz+Math.cos(a)*2.3,.5,.6,[1,1,1],0,.6,0,.3);}
   sculpt('branch',c[2],cx,.1,cz,1.5,.65,[1,1.3,1],0,0,0,.4,3);
  }else if(!branch){
   for(const side of [-1,1]){const a=dir+side*1.05;beam(cx,.25,cz,cx+Math.sin(a)*4.3,3.1,cz+Math.cos(a)*4.3,3);const m=sculpt('crescent',c[0],cx+Math.sin(a)*1.8,1.1,cz+Math.cos(a)*1.8,2,.5,[1,1,1],Math.sin(a)*2,1,Math.cos(a)*2,1.2,side*5);if(m)m.rotation.set(.7,a,side*.45);}
   beam(x,1,z,cx,1,cz,1.8);sculpt('arrow',c[1],cx,1,cz,1.3,.4,[1,1,2],0,1,0);
  }else{
   for(let i=0;i<6;i++){const a=dir+(i-2.5)*.36;beam(cx,.9,cz,cx+Math.sin(a)*4.5,1.3+i%2*.5,cz+Math.cos(a)*4.5,1.8);const m=sculpt('arrow',c[i%3],cx,.9,cz,1.1,.6,[1,1,1],Math.sin(a)*9,1,Math.cos(a)*9);if(m)m.rotation.y=a;}
  }
  const shape:Shape=job==='swordsman'?(branch?'petal':'slab'):job==='mage'?(branch?'core':'star'):branch?'arrow':'ray',n=this.low?12:32;
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n+branch*.2,speed=9.2+i%3*.25;
   const m=sculpt(shape,c[i%3],cx+Math.sin(a)*.5,.8+i%3*.14,cz+Math.cos(a)*.5,shape==='ray'?.32:.35,.6,[1,1,shape==='ray'?3:1],Math.sin(a)*speed,1.8+i%3*.5,Math.cos(a)*speed,-.18,shape==='ray'||shape==='arrow'?0:4);
   if(m&&(shape==='ray'||shape==='arrow'))m.rotation.set(-.2,a,0);
  }
  if(!this.low)for(let i=0;i<12;i++){const a=i*Math.PI*2/12;sculpt('spark',c[1],cx,1,cz,.15,.5,[1,1,1],Math.sin(a)*10,3.5,Math.cos(a)*10,-.18,3);}
 }
 /** Level forty uses class-specific hero volumes; all reach remains strictly decorative. */
 private releaseLv40(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,dir=Math.atan2(tx-x,tz-z);
  const c=job==='mage'&&!branch?[0x729dff,0xe6fbff,0xc094ff]:job==='archer'&&branch?[0x69edbd,0xffed96,0x94dfff]:skillPalette(job,skill);
  const cx=job==='swordsman'&&branch?x:tx,cz=job==='swordsman'&&branch?z:tz;
  this.lv40Cue={skillId:skill.id,style:job==='swordsman'?(branch?'sweeping-challenge-blade-crown':'shield-bash-solar-anvil'):job==='mage'?(branch?'thorn-burst-root-citadel':'lightning-storm-trident'):(branch?'herbal-tonic-bloom-fountain':'pinning-shot-celestial-seal'),impactSeconds:0,heroSeconds:.44,focal:{x:cx,z:cz},decorativeRadius:7.8};
  // A full low-quality cast (at most 36 meshes) survives overlapping casts.
  // Return old decoration to the same pool before allocating the new hero.
  const limit=this.low?40:96,reserve=this.low?36:68;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration:number,stretch:[number,number,number]=[1,1,1],vx=0,vy=0,vz=0,grow=0,spin=0,delay=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  const beam=(sx:number,sy:number,sz:number,ex:number,ey:number,ez:number,width:number,delay=0,duration=.44)=>{
   const dx=ex-sx,dy=ey-sy,dz=ez-sz,length=Math.hypot(dx,dy,dz);
   for(const [color,w] of [[c[0],width],[c[1],width*.28]]){const m=sculpt('beam',color,(sx+ex)/2,(sy+ey)/2,(sz+ez)/2,1,duration,[w,w,length/2],0,0,0,0,0,delay);if(m)m.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);}
  };
  // Immediate impact anchors the target; later layers are echoes of that same hit.
  sculpt('core',c[1],cx,.95,cz,.9,.3,[1,1.3,1],0,0,0,2.4);
  for(let i=0;i<3;i++)sculpt('ring',c[i],cx,.1+i*.12,cz,.7+i*.2,.65,[1,1,1],0,0,0,(7.8-.7-i*.2)/.65,0,i*.025);
  if(job==='swordsman'&&!branch){
   const shield=sculpt('shield',c[0],cx,1.1,cz,2.7,.44,[1,.8,.55]);if(shield)shield.rotation.set(Math.PI/2,dir,0);
   beam(x,1,z,cx,1,cz,4.6);
   // A broad directional hammer face, followed by two crossing impact blades.
   for(const side of [-1,1]){const m=sculpt('crescent',c[side===1?0:2],cx,1.25,cz,2.9,.55,[1,1,1],Math.sin(dir)*2,0,Math.cos(dir)*2,1.8,side*3);if(m)m.rotation.set(Math.PI/2,dir,side*.65);}
   beam(cx,5.7,cz,cx,.2,cz,4.8,.07,.34);
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2;sculpt('slab',c[2],cx+Math.sin(a)*1.3,.2,cz+Math.cos(a)*1.3,.8,.65,[1,2,1],Math.sin(a)*5,2.5,Math.cos(a)*5,0,3);}
  }else if(job==='swordsman'){
   // Six intersecting blades form a crown instead of Lv30's healing cross.
   for(let i=0;i<6;i++){const a=dir+i*Math.PI/3;const m=sculpt('crescent',c[i%3],cx,.55+i%2*.55,cz,2.8,.65,[1,1,1],0,.35,0,4.6,(i%2?-1:1)*7);if(m)m.rotation.set(.2+i%2*.65,a,.15);}
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3;beam(cx,.2,cz,cx+Math.sin(a)*5.2,2.5,cz+Math.cos(a)*5.2,2.8,.04);}
   sculpt('spiral',c[2],cx,.1,cz,1.4,.7,[1,2,1],0,0,0,.8,-6);
  }else if(job==='mage'&&!branch){
   // A branching central bolt and three staggered satellite strikes make a storm.
   sculpt('lightning',c[1],cx,.1,cz,2.3,.42,[1,1.25,1]);
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3,px=cx+Math.sin(a)*3,pz=cz+Math.cos(a)*3;sculpt('lightning',c[i%3],px,.1,pz,1.5,.4,[1,1.25,1],0,0,0,0,0,.07+i*.055);beam(px,.3,pz,cx,.9,cz,2.4,.07+i*.055);}
   for(let i=0;i<2;i++){const m=sculpt('ring',c[2],cx,3.8+i*.6,cz,2.5,.6,[1,1,1],0,-1,0,.4,2+i);if(m)m.rotation.x=.25;}
   beam(cx,7,cz,cx,.2,cz,4.2,0,.3);
  }else if(job==='mage'){
   // Tall root spears enclose a living tree, with opening leaf petals above.
   sculpt('tree',c[0],cx,.1,cz,1.65,.85,[1,1.25,1],0,0,0,.35);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,px=cx+Math.sin(a)*2.2,pz=cz+Math.cos(a)*2.2;const m=sculpt('branch',c[i%3],px,.05,pz,1.5,.76,[.75,1.7,.75],Math.sin(a)*2,0,Math.cos(a)*2,.35,0,i%2*.055);if(m)m.rotation.set(Math.cos(a)*-.3,a,Math.sin(a)*.3);sculpt('petal',c[1],px,3.5,pz,.8,.7,[1,.6,2],Math.sin(a)*3,1,Math.cos(a)*3,.15,3,.09);}
   sculpt('spiral',c[2],cx,.1,cz,2,.75,[1,1.5,1],0,0,0,.3,5);
  }else if(!branch){
   // The pin is a towering arrow in a tilted target seal, not an evasive wing.
   beam(x,1,z,cx,1,cz,2.8);
   const arrow=sculpt('arrow',c[1],cx,1.5,cz,2.4,.72,[1,1,2.2]);if(arrow)arrow.rotation.x=Math.PI/2;
   for(let i=0;i<3;i++){const m=sculpt('ring',c[i],cx,1.6,cz,2.3+i*.35,.72,[1,1,1],0,0,0,.6,i%2?2:-2);if(m)m.rotation.set(Math.PI/2,dir,i*Math.PI/3);}
   for(let i=0;i<4;i++){const a=dir+i*Math.PI/2;beam(cx+Math.sin(a)*3.4,3.8,cz+Math.cos(a)*3.4,cx,.2,cz,2.1,.035*i);}
   sculpt('star',c[2],cx,3.4,cz,1.1,.55,[1,1,1],0,.7,0,.4,3);
  }else{
   // An upward tonic fountain and a six-petal canopy replace the Lv30 arrow fan.
   sculpt('spiral',c[0],cx,.1,cz,1.8,.85,[1,1.8,1],0,0,0,.45,5);
   beam(cx,.15,cz,cx,5.4,cz,3.4,0,.4);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;sculpt('petal',c[i%3],cx+Math.sin(a)*1.2,2.5,cz+Math.cos(a)*1.2,1,.8,[1,.7,2],Math.sin(a)*3.4,1.3,Math.cos(a)*3.4,.2,2);sculpt('core',c[0],cx+Math.sin(a)*.5,.55,cz+Math.cos(a)*.5,.27,.72,[1,1.5,1],Math.sin(a)*2,5,Math.cos(a)*2,-.12,0,.06);}
   sculpt('star',c[1],cx,4.1,cz,.8,.65,[1,1,1],0,.6,0,.4,3);
  }
  const shape:Shape=job==='swordsman'?(branch?'crescent':'slab'):job==='mage'?(branch?'petal':'ray'):branch?'petal':'arrow',n=this.low?10:32;
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n,speed=10+i%3*.5;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*.5,.6,cz+Math.cos(a)*.5,shape==='ray'?.35:.4,.65,[1,1,shape==='ray'?3:1],Math.sin(a)*speed,1.7+i%3*.6,Math.cos(a)*speed,-.25,shape==='ray'||shape==='arrow'?0:3,.055);if(m&&(shape==='ray'||shape==='arrow'))m.rotation.set(-.2,a,0);}
 }
 /** Level fifty authors open silhouettes and staggered crescendos, independent of damage. */
 private releaseLv50(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz;
  const c=lv50Palette(job,branch);
  const style=job==='swordsman'?(branch?'fortress-vault-collapse':'second-wind-twin-wings'):job==='mage'?(branch?'living-shelter-root-vault':'vital-bloom-lotus-eruption'):(branch?'stalker-focus-crossed-reticle':'field-remedy-herbal-comet');
  this.lv50Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:.6,focal:{x:cx,z:cz},decorativeRadius:9.2};
  // Preserve four anticipation meshes and guarantee every low-quality hero and echo.
  const limit=this.low?40:96,reserve=this.low?36:72;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=.6,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  const arch=(a:number,r:number,height:number,color:number,delay=0)=>{const m=sculpt(job==='swordsman'&&branch||job==='mage'&&branch?'vault':'arch',color,cx,.12,cz,r,.64,[1,height/r,1],delay,0,0,0,.25);if(m)m.rotation.y=a;};
  // Immediate small impact and low rim frame the target without filling its torso.
  sculpt('core',c[1],cx,.22,cz,.42,.22,[1,.65,1],0,0,0,0,1.5);
  sculpt('ring',c[0],cx,.09,cz,1.5,.6,[1,.6,1],0,0,0,0,2.8);
  if(job==='swordsman'&&!branch){
   // Second Wind: paired ascending blade wings with a clear central corridor.
   for(const side of [-1,1])for(let i=0;i<3;i++){const a=dir+side*(.75+i*.32),r=1.2+i*.65;const m=sculpt('crescent',c[i%3],cx+Math.sin(a)*r,.7+i*.6,cz+Math.cos(a)*r,2.1,.62,[1,.8,1],i*.035,Math.sin(a)*1.4,1.2,Math.cos(a)*1.4,.45,side*1.3);if(m)m.rotation.set(.65,a,side*.55);}
   arch(dir,2.8,2.3,c[1],.08);
   for(const side of [-1,1]){const m=sculpt('crescent',c[2],cx,.3,cz,3,.6,[1,.5,1],.24,0,.7,0,2,side*2);if(m)m.rotation.y=dir+side*.7;}
  }else if(job==='swordsman'){
   // Fortress: gold shield, open vaults and erupting amber corner bastions.
   const shield=sculpt('shield',c[0],cx+Math.sin(dir)*2,1.5,cz+Math.cos(dir)*2,2.4,.65,[1,.8,.5]);if(shield)shield.rotation.set(Math.PI/2,dir,0);
   for(let i=0;i<3;i++)arch(dir+i*Math.PI/3,2.9,3.3,c[i],i*.045);
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2,px=cx+Math.sin(a)*2.6,pz=cz+Math.cos(a)*2.6;sculpt('bastion',c[i%3],px,.08,pz,1.1,.7,[1,1,1],0,Math.sin(a)*.45,-.1,Math.cos(a)*.45);const m=sculpt('crescent',c[1],px,3.5,pz,1.65,.64,[1,.7,1],.06+i*.025,Math.sin(a)*.7,.2,Math.cos(a)*.7,.3);if(m)m.rotation.set(.35,a,.2);}
   for(let i=0;i<3;i++){const m=sculpt('crescent',c[i],cx,.4,cz,3.3,.62,[1,.65,1],.1+i*.045,0,0,0,.8,.6);if(m)m.rotation.y=dir+i*Math.PI*2/3;}
  }else if(job==='mage'&&!branch){
   // Vital Bloom: two staggered lotus tiers explode outward, never a healing column.
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=sculpt('leaf',c[i%2],cx+Math.sin(a)*2,.8,cz+Math.cos(a)*2,1.65,.7,[1,1,1.4],i%2*.04,Math.sin(a)*2,1.4,Math.cos(a)*2,.25);if(m)m.rotation.set(-.45,a,0);}
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.5;const m=sculpt('crescent',c[1],cx,2.5,cz,2.8,.62,[1,.55,1],.1,0,.5,0,.6,1);if(m)m.rotation.set(.35,a,.35);}
   for(let i=0;i<6;i++){const a=i*Math.PI/3+.45;const m=sculpt('leaf',c[i%2],cx+Math.sin(a)*2.1,3.1,cz+Math.cos(a)*2.1,1.8,.68,[1,1,1.4],.035+i%2*.03,Math.sin(a)*.9,.5,Math.cos(a)*.9,.12);if(m)m.rotation.set(-.65,a,0);}
   for(let i=0;i<4;i++)arch(dir+i*Math.PI/4,3.1,3.3,c[2],.04+i*.025);
  }else if(job==='mage'){
   // Living Shelter: a luminous leaf shield crowns the crashing root cathedral.
   const leafShield=sculpt('leaf',c[0],cx+Math.sin(dir+.8)*2.5,2.5,cz+Math.cos(dir+.8)*2.5,1.8,.68,[1.7,1,1.4],.025);if(leafShield)leafShield.rotation.set(Math.PI/2,dir+.8,.15);
   for(let i=0;i<3;i++)arch(dir+i*Math.PI/3,3.5,3.8,c[i],i*.04);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=sculpt('leaf',c[i%3],cx+Math.sin(a)*2.4,4.2,cz+Math.cos(a)*2.4,1.8,.7,[1,1,1.6],.025+i%2*.025,Math.sin(a)*.8,-.35,Math.cos(a)*.8,.12);if(m)m.rotation.set(.35,a,0);}
   for(let i=0;i<2;i++){const m=sculpt('crescent',c[1],cx,3.8+i*.5,cz,3.2,.64,[1,.65,1],.065+i*.045,0,.2,0,.2,.7);if(m)m.rotation.set(.15,dir+i*Math.PI,.2);}
   for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;const m=sculpt('branch',c[0],cx+Math.sin(a)*2.5,.1,cz+Math.cos(a)*2.5,1.2,.7,[.7,1.4,.7],.025,Math.sin(a)*1.2,0,Math.cos(a)*1.2,.15);if(m)m.rotation.y=a;const leaf=sculpt('petal',c[1],cx+Math.sin(a)*1.8,3.5,cz+Math.cos(a)*1.8,1.2,.64,[1,.6,2],.15,Math.sin(a)*2,-1.5,Math.cos(a)*2);if(leaf)leaf.rotation.y=a;}
  }else if(!branch){
   // Field Remedy: a golden herbal arrow passes through the offensive blossom wreath.
   sculpt('arrow',c[2],x,1.1,z,1.4,.24,[1,1,2],0,(cx-x)/.24,0,(cz-z)/.24);
   const herbalArrow=sculpt('arrow',c[2],cx,1.3,cz,1.8,.64,[1,1,2],.06,Math.sin(dir)*.6,0,Math.cos(dir)*.6);if(herbalArrow)herbalArrow.rotation.y=dir;
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3;arch(a,2.8,2.5,c[i],i*.035);const m=sculpt('crescent',c[i],cx,1.1,cz,2.6,.65,[1,.8,1],i*.035,0,.55,0,.8,2);if(m)m.rotation.set(.4,a,.6);sculpt('comet',c[1],cx+Math.sin(a)*2.4,3,cz+Math.cos(a)*2.4,.55,.6,[1,1,1.6],.07,-Math.sin(a)*3,-3,-Math.cos(a)*3);}
   sculpt('star',c[2],cx,4.1,cz,.95,.65,[1,1,1],.08,0,-.3,0,.2,1);
   for(let i=0;i<6;i++){const a=dir+i*Math.PI/3;const m=sculpt(i%2?'petal':'leaf',c[i%2],cx+Math.sin(a)*2.2,2.7+i%2*.6,cz+Math.cos(a)*2.2,1.7,.68,[1,1,1.4],.035+i%2*.04,Math.sin(a)*1.2,.6,Math.cos(a)*1.2,.15);if(m)m.rotation.set(-.45,a,.15);}
  }else{
   // Stalker Focus: violet crossed reticles converge on a prominent purple arrow.
   const focusArrow=sculpt('arrow',c[0],cx,1.6,cz,2.2,.65,[1,1,2.3],0,Math.sin(dir)*.5,0,Math.cos(dir)*.5);if(focusArrow)focusArrow.rotation.y=dir;
   for(let i=0;i<3;i++){const m=sculpt('ring',c[i],cx,1.25,cz,3.4,.66,[1,.65,1],i*.035,0,0,0,.15,i%2?.7:-.7);if(m)m.rotation.set(Math.PI/2,dir,i*Math.PI/3);}
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2;const m=sculpt('crescent',c[i%3],cx+Math.sin(a)*2.3,2.5,cz+Math.cos(a)*2.3,1.9,.66,[1,.8,1],i*.025,Math.sin(a)*.7,.4,Math.cos(a)*.7,.2);if(m)m.rotation.set(.6,a,.3);}
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3;sculpt('star',c[1],cx+Math.sin(a)*1.9,4,cz+Math.cos(a)*1.9,.72,.65,[1,1,1],.04+i*.03,0,-.25,0,.1,.7);}
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2,r=3;const m=sculpt('arrow',c[i%3],cx+Math.sin(a)*r,1.3,cz+Math.cos(a)*r,1.5,.6,[1,1,1.6],i*.025,-Math.sin(a)*2,0,-Math.cos(a)*2);if(m)m.rotation.y=a+Math.PI;arch(a,2.8,2.4,c[2],.08);}
  }
  // Late waves grow to 9.2 world units; staged petals/blades carry an elegant second beat.
  for(let i=0;i<2;i++)sculpt('ring',c[i+1],cx,.12+i*.08,cz,2,.58,[1,.6,1],.28+i*.12,0,0,0,(9.2-2)/.58);
  const n=this.low?10:30,shape:Shape=job==='mage'||job==='archer'&&!branch?'petal':job==='swordsman'?(branch?'slab':'leaf'):'crescent';
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n+.2,r=2.2;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*r,.65+i%2*.35,cz+Math.cos(a)*r,shape==='crescent'?.6:.55,.65,[1,.7,shape==='petal'?1.7:1],.16+i%3*.055,Math.sin(a)*8.7,1.2,Math.cos(a)*8.7,-.22,shape==='crescent'?1.2:1.8);if(m)m.rotation.y=a;}
 }
 /** Lv60 release is ornamental: the caller has already applied authoritative damage. */
 private releaseLv60(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,c=lv60Palette(job,branch),dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'&&!branch?x:tx,cz=job==='swordsman'&&!branch?z:tz;
  const style=job==='swordsman'?(branch?'crushing-advance-crimson-thrust':'war-cry-crimson-scream'):job==='mage'?(branch?'moonbeam-descending-crescent':'arcane-focus-violet-lance'):(branch?'shock-arrow-golden-zigzag':'hunter-focus-golden-eye');
  this.lv60Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:.78,focal:{x:cx,z:cz},decorativeRadius:10.8,palette:[...c],endSeconds:1.22};
  // Reserve the whole essential composition, including delayed waves, before accents.
  // Old casts return to the bounded pool; Low and High share identical hero geometry.
  const limit=this.low?40:96,reserve=this.low?36:76;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=.78,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,0,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  const beam=(sx:number,sy:number,sz:number,ex:number,ey:number,ez:number,width:number,duration=.78,delay=0,color=c[0])=>{
   const dx=ex-sx,dy=ey-sy,dz=ez-sz,length=Math.hypot(dx,dy,dz);
   const m=sculpt('beam',color,(sx+ex)/2,(sy+ey)/2,(sz+ez)/2,1,duration,[width,width,length/2],delay);if(m)m.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);
  };
  // Brief ground flash, never a torso-sized opaque sphere.
  sculpt('core',c[1],cx,.2,cz,.46,.2,[1,.4,1],0,0,0,0,1.8);
  sculpt('ring',c[0],cx,.1,cz,1.5,.78,[1,.6,1],0,0,0,0,2.6);
  // Emit the two large late waves first so overlap cannot starve the final beat.
  for(let i=0;i<2;i++)sculpt('ring',c[i?1:2],cx,.12+i*.1,cz,2.4,.66,[1,.5,1],.42+i*.14,0,0,0,(10.8-2.4)/.66);
  if(job==='swordsman'&&!branch){
   // Shouting icon: broad red wind fronts radiate from the swordsman, no buff cage.
   for(let i=0;i<4;i++){const a=dir+i*Math.PI/2;const m=sculpt('scream',c[i%3],cx,.55+i%2*.35,cz,2.1,.78,[1,.9,1],i%2*.045,Math.sin(a)*3.8,.5,Math.cos(a)*3.8,.7);if(m)m.rotation.y=a;}
   for(const side of [-1,1]){const a=dir+side*.8;const m=sculpt('crescent',c[1],cx+Math.sin(a)*2,1.9,cz+Math.cos(a)*2,3,.75,[1,.7,1],.04,Math.sin(a)*2,1,Math.cos(a)*2,.5);if(m)m.rotation.set(.6,a,side*.3);}
  }else if(job==='swordsman'){
   // Forward sword thrust: long crimson lane and staggered braking cuts show slow.
   beam(x,.55,z,cx+Math.sin(dir)*3.4,.55,cz+Math.cos(dir)*3.4,3.5,.62);
   const blade=sculpt('arrow',c[1],cx,1.1,cz,2,.68,[.7,.7,3.2],0,Math.sin(dir)*3.2,0,Math.cos(dir)*3.2);if(blade)blade.rotation.y=dir;
   for(let i=0;i<3;i++)for(const side of [-1,1]){const a=dir+side*Math.PI/2,px=cx+Math.sin(a)*(1.8+i*.4)-Math.sin(dir)*i*1.1,pz=cz+Math.cos(a)*(1.8+i*.4)-Math.cos(dir)*i*1.1;const m=sculpt('crescent',c[i%3],px,.3+i*.3,pz,2.1,.78,[1,.6,1],i*.05);if(m)m.rotation.set(.35,dir+side*.5,0);}
  }else if(job==='mage'&&!branch){
   // Purple orb sends the horizontal lavender lance through open focusing rings.
   sculpt('core',c[0],x,1.3,z,.65,.65,[1,1,1]);beam(x,1.3,z,cx,1.3,cz,3.6,.55);beam(x,1.3,z,cx,1.3,cz,1.05,.55,0,c[1]);
   for(let i=0;i<4;i++){const r=1.65+i*.42,px=cx-Math.sin(dir)*i*.85,pz=cz-Math.cos(dir)*i*.85;const m=sculpt('ring',c[i%3],px,1.4,pz,r,.78,[1,1,1],i*.025);if(m)m.rotation.set(Math.PI/2,dir,0);}
   for(const side of [-1,1]){const m=sculpt('crescent',c[1],cx,2.8,cz,3.3,.78,[1,.5,1],.08,side*Math.cos(dir)*1.2,.35,-side*Math.sin(dir)*1.2,.25);if(m)m.rotation.set(.35,dir+side*.6,.2);}
  }else if(job==='mage'){
   // Gold celestial crescent fires downward. Three thin beam rails leave the target open.
   const moon=sculpt('crescent',c[0],cx,6.8,cz,2.7,.78,[1,1,1]);if(moon)moon.rotation.set(Math.PI/2,dir,-.35);
   for(let i=0;i<3;i++){const a=dir+i*Math.PI*2/3,px=cx+Math.sin(a)*1.15,pz=cz+Math.cos(a)*1.15;beam(cx,6.4,cz,px,.35,pz,2.5,.58,0,i===1?c[1]:c[0]);const m=sculpt('ring',c[1],px,2.2,pz,.65,.7,[1,.5,1],.1);if(m)m.rotation.x=.2;}
   for(let i=0;i<3;i++){const m=sculpt('ring',c[i],cx,4.9+i*.55,cz,1.6+i*.3,.78,[1,.5,1],i*.045);if(m)m.rotation.x=.15;}
   sculpt('star',c[1],cx,4.2,cz,.52,.7,[1,1,1],.08);
  }else if(!branch){
   // Eye/arrow icon: an almond-shaped aiming frame and a single precise gold axis.
   beam(x,.75,z,cx,.75,cz,1.6,.48);
   const arrow=sculpt('arrow',c[1],cx,2.9,cz,2.5,.78,[1.3,1.3,2.3],0,Math.sin(dir)*1.3,0,Math.cos(dir)*1.3);if(arrow)arrow.rotation.y=dir;
   // Both eyelids stay above the floor: the olive outer rim bottoms at ~.49.
   // A second gold almond and corner glints frame the arrow without filling the eye.
   for(const side of [-1,1])for(let tier=0;tier<2;tier++){const m=sculpt('arch',c[tier?0:2],cx,3,cz,tier?3.2:3.8,.78,[1,tier?.32:.42,1],tier*.035);if(m)m.rotation.set(0,dir,side===1?0:Math.PI);}
   for(const side of [-1,1])sculpt('star',c[1],cx+Math.cos(dir)*side*3.8,3,cz-Math.sin(dir)*side*3.8,.48,.72,[1,1,1],.055);
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2;const m=sculpt('arrow',c[0],cx+Math.sin(a)*3.8,1.15,cz+Math.cos(a)*3.8,.9,.7,[1,1,1.5],.08,-Math.sin(a)*2,0,-Math.cos(a)*2);if(m)m.rotation.y=a+Math.PI;}
  }else{
   // Cyan projectile inside gold jagged voltage; external forks mark the stun hit.
   const arrow=sculpt('arrow',c[0],cx,1.25,cz,2.2,.78,[1,1,2.5],0,Math.sin(dir)*1.8,0,Math.cos(dir)*1.8);if(arrow)arrow.rotation.y=dir;
   for(const side of [-1,1]){const m=sculpt('shockbolt',c[1],cx+Math.cos(dir)*side*.6,1.2,cz-Math.sin(dir)*side*.6,1.65,.74,[1,1,1.5]);if(m)m.rotation.y=dir;}
   for(let i=0;i<4;i++){const a=dir+Math.PI/4+i*Math.PI/2;const m=sculpt('shockbolt',c[i%2?0:1],cx+Math.sin(a)*2.5,1.6,cz+Math.cos(a)*2.5,1.1,.65,[1,1,1],.1+i%2*.035,Math.sin(a)*1.8,.2,Math.cos(a)*1.8);if(m)m.rotation.set(-.3,a,0);}
   sculpt('ring',c[1],cx,.18,cz,2.8,.72,[1,.6,1],.08,0,0,0,.7);
  }
  // Essential silhouettes above are identical on Low/High; only satellites differ.
  const n=this.low?10:34,shape:Shape=job==='swordsman'?'crescent':job==='mage'?(branch?'star':'ray'):branch?'shockbolt':'arrow';
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n,r=3;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*r,.6+i%3*.4,cz+Math.cos(a)*r,shape==='ray'?.26:.4,.68,[1,.7,shape==='ray'?3:1],.18+i%3*.04,Math.sin(a)*9,1.1,Math.cos(a)*9,-.15);if(m)m.rotation.y=a;}
 }
 /** Six Lv70 offensive icon silhouettes; expansion is decorative, never damage reach. */
 private releaseLv70(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const branch=skill.branch,c=lv70Palette(job,branch),dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz;
  const style=job==='swordsman'?(branch?'battle-renewal-cyan-sword-cyclone':'cleave-crimson-grand-sweep'):job==='mage'?(branch?'verdant-renewal-leaf-vortex':'blizzard-glacial-shard-tempest'):(branch?'camouflage-guard-leaf-crash':'piercing-volley-silver-arrow-lanes');
  this.lv70Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:.96,focal:{x:cx,z:cz},decorativeRadius:12.6,palette:[...c],endSeconds:1.54};
  // Preserve the complete Low composition and late crescendos under overlapping casts.
  const limit=this.low?40:96,reserve=this.low?38:84;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=.96,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  sculpt('core',c[1],cx,.2,cz,.5,.18,[1,.4,1],0,0,0,0,2);
  sculpt('ring',c[0],cx,.1,cz,1.8,.96,[1,.5,1],0,0,0,0,3);
  for(let i=0;i<3;i++)sculpt('ring',c[i],cx,.12+i*.09,cz,2.6,.76,[1,.5,1],.36+i*.21,0,0,0,(12.6-2.6)/.76);
  if(job==='swordsman'&&!branch){
   // Three staggered enormous red/orange blade faces carry the icon's sweeping cut.
   for(let i=0;i<3;i++){const m=sculpt('crescent',c[i===1?1:0],cx,1.1+i*.45,cz,4.7+i*.45,.96,[1,.85,1],i===2?.1:0,Math.sin(dir)*1.5,.3,Math.cos(dir)*1.5,.65,1.6);if(m)m.rotation.set(.18+i*.13,dir+i*.4,.22);}
   const sword=sculpt('sword',c[1],cx+Math.sin(dir)*2,1.2,cz+Math.cos(dir)*2,1.7,.96,[1,1.4,1],0);if(sword)sword.rotation.set(.3,dir,-1.05);
   for(let i=0;i<4;i++){const a=dir-.8+i*.5;const m=sculpt('crescent',c[2],cx+Math.sin(a)*3,.4,cz+Math.cos(a)*3,1.7,.9,[1,.7,1],i<2?0:.24,Math.sin(a)*4,.4,Math.cos(a)*4,.2);if(m)m.rotation.y=a;}
  }else if(job==='swordsman'){
   sculpt('sword',c[1],cx,1.3,cz,1.9,.96,[1,1.5,1],0,0,1.4,0);
   for(let i=0;i<3;i++){const m=sculpt('spiral',c[i===2?1:0],cx,.15,cz,2.6+i*.4,.96,[1,1.45,1],i===2?.16:0,0,.4,0,.35,2+i);if(m)m.rotation.y=dir+i*Math.PI*2/3;}
   for(let i=0;i<6;i++){const a=i*Math.PI/3;sculpt('slab',c[2],cx+Math.sin(a)*2.4,.3,cz+Math.cos(a)*2.4,.85,.96,[1,1.8,1],i<2?0:.09+i%2*.06,Math.sin(a)*2.7,3.6,Math.cos(a)*2.7,-.12,2);}
   for(let i=0;i<3;i++){const m=sculpt('crescent',c[0],cx,1.8+i*.9,cz,3.8,.96,[1,.7,1],i===0?0:.12+i*.06,0,.6,0,.5,2);if(m)m.rotation.set(.35,dir+i*2.1,.2);}
  }else if(job==='mage'&&!branch){
   // An open icy storm: descending diagonal shards and frozen teeth, no opaque cloud.
   for(let i=0;i<8;i++){const a=i*Math.PI/4,r=2.8+i%2;const m=sculpt('ice',c[i%2],cx+Math.sin(a)*r,5.4+i%2,cz+Math.cos(a)*r,1.05,.96,[.75,1.8,.75],i<4?0:i%3*.075,-Math.sin(a)*1.8,-3.2,-Math.cos(a)*1.8);if(m)m.rotation.set(.55,a,.35);}
   for(let i=0;i<4;i++){const a=i*Math.PI/2;sculpt('ice',c[0],cx+Math.sin(a)*3.5,.1,cz+Math.cos(a)*3.5,1.45,.96,[1,1.3,1],.19+i%2*.09);}
   for(let i=0;i<3;i++){const m=sculpt('crescent',c[i],cx,1.2+i*1.2,cz,4.1,.96,[1,.55,1],.08+i*.07,0,-.2,0,.35,-1.2);if(m)m.rotation.set(.2,dir+i*2.1,.15);}
  }else if(job==='mage'){
   // Broad outward leaf blades and a double helix mark damaging renewal, never healing.
   for(let i=0;i<8;i++){const a=i*Math.PI/4;const m=sculpt('leaf',c[i%2],cx+Math.sin(a)*2.8,1.5+i%2*1.4,cz+Math.cos(a)*2.8,1.8,.96,[1,1,1.6],i<4?0:i%2*.08,Math.sin(a)*3.3,.7,Math.cos(a)*3.3,.15,1);if(m)m.rotation.set(-.5,a,.25);}
   for(let i=0;i<2;i++){const m=sculpt('spiral',c[i?2:0],cx,.1,cz,3.1,.96,[1,1.5,1],i*.09,0,.2,0,.35,2);if(m)m.rotation.y=i*Math.PI;}
   for(let i=0;i<4;i++){const a=i*Math.PI/2;const m=sculpt('leaf',c[1],cx+Math.sin(a)*2,4.8,cz+Math.cos(a)*2,1.45,.96,[1,.8,1.6],.22,Math.sin(a)*2.8,-1,Math.cos(a)*2.8,.1);if(m)m.rotation.set(.55,a,0);}
  }else if(!branch){
   // Five silver piercing lanes cross the victim; blue rails and later arrows echo them.
   for(let i=0;i<5;i++){const offset=(i-2)*1.05,px=cx+Math.cos(dir)*offset,pz=cz-Math.sin(dir)*offset;
    const m=sculpt('arrow',c[1],px-Math.sin(dir)*2.4,1+i%2*.6,pz-Math.cos(dir)*2.4,1.65,.96,[1,1,3],i%2*.055,Math.sin(dir)*6.2,0,Math.cos(dir)*6.2);if(m)m.rotation.y=dir;
    const rail=sculpt('ray',c[0],px,1+i%2*.6,pz,1,.8,[.55,.55,5.4],i%2*.055);if(rail)rail.rotation.y=dir;
    const echo=sculpt('arrow',c[0],px-Math.sin(dir)*3.4,1.2,pz-Math.cos(dir)*3.4,1.05,.96,[1,1,2.4],.35,Math.sin(dir)*7.4,0,Math.cos(dir)*7.4);if(echo)echo.rotation.y=dir;
   }
  }else{
   // A translucent guarded figure framed by a side-on leafy wreath that crashes outward.
   const guard=sculpt('shield',c[2],cx,.3,cz,2,.96,[1,1.25,1],0,0,0,0,.15);if(guard)guard.rotation.y=dir;
   const arrow=sculpt('arrow',c[1],cx,1.6,cz,1.4,.96,[1,1,2.2]);if(arrow)arrow.rotation.y=dir;
   for(let i=0;i<8;i++){const a=i*Math.PI/4,side=Math.cos(a)*3.2;const m=sculpt('leaf',c[i%2],cx+Math.cos(dir)*side,3+Math.sin(a)*2.5,cz-Math.sin(dir)*side,1.4,.96,[1,1,1.6],i%2*.055,Math.cos(dir)*Math.cos(a)*1.5,.15,-Math.sin(dir)*Math.cos(a)*1.5,.15,.8);if(m)m.rotation.set(.25,dir,a+.6);}
   for(const side of [-1,1]){const m=sculpt('crescent',c[0],cx,1,cz,4,.96,[1,.7,1],.25,Math.cos(dir)*side*2,.2,-Math.sin(dir)*side*2,.5,side);if(m)m.rotation.set(.45,dir+side*.65,.2);}
  }
  // Essential forms and all three finale waves are already reserved before satellites.
  const n=this.low?8:38,shape:Shape=job==='swordsman'?(branch?'slab':'crescent'):job==='mage'?(branch?'leaf':'ice'):branch?'leaf':'arrow';
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*3.2,.6+i%3*.5,cz+Math.cos(a)*3.2,.48,.82,[1,1,shape==='arrow'?1.6:1],.22+i%3*.055,Math.sin(a)*9.4,1.4,Math.cos(a)*9.4,-.15,shape==='arrow'?0:1.5);if(m)m.rotation.y=a;}
 }
 /** Icon-specific Lv80 crescendos remain purely decorative at the actual release. */
 private releaseLv80(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const c=lv80Palette(job,skill.branch),branch=skill.branch,dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'&&branch?x:tx,cz=job==='swordsman'&&branch?z:tz;
  const style=job==='swordsman'?(branch?'rallying-standard-golden-forward-strike':'hamstring-violet-ankle-cut'):job==='mage'?(branch?'spirit-surge-spectral-stag-charge':'venom-cloud-acid-violet-billows'):(branch?'entangling-volley-gold-arrows-gripping-vines':'poison-arrow-lime-purple-toxic-tail');
  this.lv80Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:1.16,focal:{x:cx,z:cz},decorativeRadius:14.4,palette:[...c],endSeconds:1.86};
  const limit=this.low?40:96,reserve=this.low?40:90;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=1.16,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  // Reserve the finale before optional satellites, maintaining Low's entire silhouette.
  for(let i=0;i<3;i++)sculpt('ring',c[i],cx,.10+i*.08,cz,3,.9,[1,.5,1],.38+i*.29,0,0,0,(14.4-3)/.9);
  sculpt('core',c[1],cx,.2,cz,.52,.18,[1,.35,1]);
  if(job==='swordsman'&&!branch){
   // Wide low cuts remain anchored to the enemy's ankles; tall sword columns would misread slow.
   for(let i=0;i<4;i++){const m=sculpt('crescent',c[i===1?1:0],cx,.28+i*.14,cz,5.2+i*.25,1.16,[1,.65,1],i*.055,Math.sin(dir)*1.1,0,Math.cos(dir)*1.1,.6,1.2);if(m)m.rotation.set(.07,dir+i*.45,0);}
   for(const side of [-1,1]){const m=sculpt('spiral',c[2],cx+Math.cos(dir)*side*.85,.08,cz-Math.sin(dir)*side*.85,1.1,1.16,[1,.38,1],.12);if(m)m.rotation.y=dir;}
   for(let i=0;i<4;i++){const m=sculpt('crescent',c[1],cx,.4,cz,2.8,1,[1,.45,1],.3+i*.09,Math.cos(dir)*(i%2?1:-1)*3,0,-Math.sin(dir)*(i%2?1:-1)*3,.25);if(m)m.rotation.y=dir+i*.7;}
  }else if(job==='swordsman'){
   // A forward blade lane with red battle standards: an offensive strike, never a buff cage.
   const blade=sculpt('sword',c[0],cx,1.1,cz,2.5,1.16,[1,1.9,1],0,Math.sin(dir)*3,0,Math.cos(dir)*3);if(blade)blade.rotation.set(Math.PI/2,dir,0);
   for(const side of [-1,1]){const m=sculpt('banner',c[2],cx+Math.cos(dir)*side*3,.1,cz-Math.sin(dir)*side*3,1.4,1.16,[1,1,1],0,Math.sin(dir)*.7,0,Math.cos(dir)*.7);if(m)m.rotation.y=dir;}
   for(let i=0;i<5;i++){const m=sculpt('crescent',c[i%2],cx,1+i%2*.8,cz,4.6,1.16,[1,.7,1],i*.075,Math.sin(dir)*4,.2,Math.cos(dir)*4,.6);if(m)m.rotation.set(.3,dir+(i-2)*.3,.1);}
  }else if(job==='mage'&&!branch){
   // Alternating solid billows form an open toxic bank around the victim, with a clear center.
   for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3.2+i%2*.65;sculpt('cloud',c[i%2],cx+Math.sin(a)*r,.4+i%3*.6,cz+Math.cos(a)*r,1.6,1.16,[1,1.2,1],i<5?0:.12,Math.sin(a)*1.9,.7,Math.cos(a)*1.9,.35);}
   for(let i=0;i<3;i++)sculpt('spiral',c[i],cx,.15,cz,2.5+i*.5,1.16,[1,1,1],.18+i*.1,0,.25,0,.3,.7);
  }else if(job==='mage'){
   const stag=sculpt('stag',c[0],cx-Math.sin(dir)*2,.12,cz-Math.cos(dir)*2,1.65,1.16,[1,1,1],0,Math.sin(dir)*4,.15,Math.cos(dir)*4);if(stag)stag.rotation.y=dir;
   for(const side of [-1,1]){const m=sculpt('stag',c[2],cx+Math.cos(dir)*side*3-Math.sin(dir)*3,.15,cz-Math.sin(dir)*side*3-Math.cos(dir)*3,1.1,1.16,[1,1,1],.16,Math.sin(dir)*4.5,.1,Math.cos(dir)*4.5);if(m)m.rotation.y=dir;}
   for(let i=0;i<4;i++){const m=sculpt('scream',c[i%2],cx,.45+i*.45,cz,4.4,1.16,[1,.7,1],i*.075,Math.sin(dir)*3.5,0,Math.cos(dir)*3.5,.4);if(m)m.rotation.y=dir;}
  }else if(!branch){
   const arrow=sculpt('arrow',c[0],cx-Math.sin(dir)*2,1.4,cz-Math.cos(dir)*2,2.7,1.16,[1.2,1.2,3.5],0,Math.sin(dir)*4.8,0,Math.cos(dir)*4.8);if(arrow)arrow.rotation.y=dir;
   for(let i=0;i<7;i++){const back=1.5+i*.75;const m=sculpt('cloud',c[i%2?2:1],cx-Math.sin(dir)*back,1.2+i%2*.3,cz-Math.cos(dir)*back,1.1+i*.06,1.16,[1,.7,1],i*.025,Math.sin(dir)*2.4,.3,Math.cos(dir)*2.4,.25);if(m)m.rotation.y=dir;}
   for(let i=0;i<3;i++)sculpt('spiral',c[2],cx,.2,cz,2.5+i*.45,1.16,[1,.85,1],.2+i*.1,0,.3,0,.25,1);
  }else{
   for(let i=0;i<5;i++){const side=(i-2)*1.4;const arrow=sculpt('arrow',c[1],cx+Math.cos(dir)*side-Math.sin(dir)*2,2.1+i%2*.6,cz-Math.sin(dir)*side-Math.cos(dir)*2,1.8,1.16,[1,1,3],i*.035,Math.sin(dir)*4,-.8,Math.cos(dir)*4);if(arrow)arrow.rotation.y=dir;}
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=sculpt('spiral',c[i%2?2:0],cx+Math.sin(a)*2.2,.08,cz+Math.cos(a)*2.2,1.4,1.16,[1,1.2,1],i*.025, -Math.sin(a)*.7,.1,-Math.cos(a)*.7,.2);if(m)m.rotation.y=a;const leaf=sculpt('leaf',c[0],cx+Math.sin(a)*2.8,1.2,cz+Math.cos(a)*2.8,1.2,1.16,[1,1,1.5],.12,-Math.sin(a),.15,-Math.cos(a));if(leaf)leaf.rotation.set(.45,a,0);}
  }
  const n=this.low?8:46,shape:Shape=job==='swordsman'?'crescent':job==='mage'?(branch?'spark':'cloud'):branch?'leaf':'spark';
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*3.5,.5+i%3*.5,cz+Math.cos(a)*3.5,.5,.96,[1,1,1],.3+i%3*.07,Math.sin(a)*10.2,.8,Math.cos(a)*10.2,-.12,1);if(m)m.rotation.y=a;}
 }
 /** Lv90 releases retain their icon hero at the focal point throughout the crescendo. */
 private releaseLv90(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const c=lv90Palette(job,skill.branch),branch=skill.branch,dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz;
  const style=job==='swordsman'?(branch?'unbreakable-crash-solid-gold-shield-collision':'earthbreaker-golden-sword-rock-eruption'):job==='mage'?(branch?'root-prison-woody-claws-golden-vines':'starfall-five-point-golden-meteor'):(branch?'toxic-fang-emerald-serpent-ivory-fangs':'crippling-shot-crimson-ankle-explosion');
  this.lv90Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:1.38,focal:{x:cx,z:cz},decorativeRadius:15.6,palette:[...c],endSeconds:2.12};
  const limit=this.low?40:96,reserve=this.low?40:94;
  while(this.active.length>limit-reserve){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=1.38,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  // Four reserved ground waves escalate in reach while leaving the target's body unobscured.
  for(let i=0;i<4;i++)sculpt('ring',c[i%3],cx,.08+i*.05,cz,2.8,.95,[1,.45,1],.30+i*.29,0,0,0,(15.6-2.8)/.95);
  sculpt('core',c[1],cx,.25,cz,.65,.2,[1,.45,1]);
  if(job==='swordsman'&&!branch){
   const sword=sculpt('sword',c[0],cx,3.7,cz,1.55,.22,[1,1.1,1],0,0,-10,0);if(sword)sword.rotation.z=Math.PI;
   const planted=sculpt('sword',c[0],cx,3.2,cz,1.9,1.38,[1.7,1.1,1.4],.18);if(planted)planted.rotation.z=Math.PI;
   for(let i=0;i<8;i++){const a=i*Math.PI/4,r=2.3;const m=sculpt('stoneshard',c[2],cx+Math.sin(a)*r,-.25,cz+Math.cos(a)*r,1.35,1.38,[1,1,1],.07+i%2*.07,Math.sin(a)*.5,.25,Math.cos(a)*.5,.16);if(m)m.rotation.set(.3,a,.45);sculpt('ray',c[0],cx+Math.sin(a)*r,.3,cz+Math.cos(a)*r,.55,.65,[1,1,3],.18,Math.sin(a)*3,1,Math.cos(a)*3);}
   for(let i=0;i<4;i++){const a=dir+i*Math.PI/2;const cut=sculpt('crescent',c[i%2],cx,.35+i*.16,cz,4.2,1.38,[1,.75,1],.12+i*.045,Math.sin(a)*.7,0,Math.cos(a)*.7,.4);if(cut)cut.rotation.set(.25,a,.12);}
  }else if(job==='swordsman'){
   const shield=sculpt('impactshield',c[0],cx+Math.sin(dir)*1.5+Math.cos(dir)*2.7,1.8,cz+Math.cos(dir)*1.5-Math.sin(dir)*2.7,1.7,1.38,[1,1,1],0,Math.sin(dir)*.8,0,Math.cos(dir)*.8);if(shield)shield.rotation.y=dir+.55;
   for(let i=0;i<4;i++){const arc=sculpt('scream',c[i%2?0:1],cx+Math.sin(dir)*1.7,.5+i*.55,cz+Math.cos(dir)*1.7,3.8,1.38,[1,1,1],.06+i*.055,Math.sin(dir)*1.5,.1,Math.cos(dir)*1.5,.4);if(arc)arc.rotation.set(.25,dir+(i-1.5)*.18,.12);}
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=sculpt('ray',c[i%2],cx+Math.sin(dir)*2,1.3,cz+Math.cos(dir)*2,.65,.55,[1,1,3.8],.06+i*.025,Math.sin(a)*5,Math.cos(a)*2,Math.cos(a)*5);if(m)m.rotation.set(a,dir+a,0);}
   for(let i=0;i<5;i++){const m=sculpt('slab',c[2],cx+Math.sin(dir)*2,.5,cz+Math.cos(dir)*2,.7,.9,[1,1.7,1],.15,Math.sin(dir+i)*3,1+i*.25,Math.cos(dir+i)*3,0,2);if(m)m.rotation.y=dir+i;}
  }else if(job==='mage'&&!branch){
   sculpt('goldstar',c[0],cx,4.1,cz,2.25,.35,[1,1,1],0,0,-7.5,0,0,.3);
   const star=sculpt('goldstar',c[0],cx,3.2,cz,2.1,1.38,[1,1,1],.25,0,0,0,.08,.35);if(star)star.rotation.x=-.45;
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=3+i%2;sculpt('comet',c[i%2],cx+Math.sin(a)*r,5.5,cz+Math.cos(a)*r,.65,.55,[1,1,3],i*.055,-Math.sin(a)*2,-8,-Math.cos(a)*2);}
  }else if(job==='mage'){
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const root=sculpt('rootclaw',c[0],cx+Math.sin(a)*1.7,.05,cz+Math.cos(a)*1.7,1.7,1.38,[1,1,1],i*.025);if(root)root.rotation.y=a+Math.PI;
    const vine=sculpt('spiral',c[1],cx+Math.sin(a)*1.45,.1,cz+Math.cos(a)*1.45,.65,1.38,[1,1.6,1],.12);if(vine)vine.rotation.y=a;
    const leaf=sculpt('leaf',c[2],cx+Math.sin(a)*2.4,1.5,cz+Math.cos(a)*2.4,.95,1.38,[1,1,1],.2);if(leaf)leaf.rotation.set(.5,a,.2);}
  }else if(!branch){
   const arrow=sculpt('arrow',c[0],cx-Math.sin(dir)*2,.45,cz-Math.cos(dir)*2,2.2,.28,[1,1,2.8],0,Math.sin(dir)*6,0,Math.cos(dir)*6);if(arrow)arrow.rotation.y=dir;
   const lodged=sculpt('arrow',c[0],cx,.35,cz,1.5,1.38,[1,1,2.2],.22);if(lodged)lodged.rotation.y=dir;
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=sculpt('crescent',c[i%2],cx,.28+i%2*.18,cz,2.1,1.38,[1,.55,1],.12+i*.035,Math.sin(a)*1.7,0,Math.cos(a)*1.7,.3);if(m)m.rotation.y=a;}
   for(let i=0;i<5;i++)sculpt('ray',c[1],cx,.4,cz,.5,.45,[1,1,3],.22,Math.sin(i*2.4)*7,.4,Math.cos(i*2.4)*7);
  }else{
   const head=sculpt('serpent',c[0],cx-Math.sin(dir)*2.3,.25,cz-Math.cos(dir)*2.3,2.5,1.38,[1,1,1],0,Math.sin(dir)*.45,0,Math.cos(dir)*.45);if(head)head.rotation.y=dir;
   for(const side of [-1,1]){const fang=sculpt('fang',c[1],cx-Math.sin(dir)*.3+Math.cos(dir)*side*.7,3.3,cz-Math.cos(dir)*.3-Math.sin(dir)*side*.7,1.65,1.38,[1,1,1],0,Math.sin(dir)*.45,0,Math.cos(dir)*.45);if(fang)fang.rotation.x=-.3;}
   for(const side of [-1,1])sculpt('spark',c[2],cx-Math.sin(dir)*1+Math.cos(dir)*side*.88,4.12,cz-Math.cos(dir)*1-Math.sin(dir)*side*.88,.24,1.38,[1,.75,1],0,Math.sin(dir)*.45,0,Math.cos(dir)*.45);
   const arrow=sculpt('arrow',c[0],cx-Math.sin(dir)*2,.65,cz-Math.cos(dir)*2,1.8,.35,[1,1,3],0,Math.sin(dir)*5,0,Math.cos(dir)*5);if(arrow)arrow.rotation.y=dir;
   for(let i=0;i<3;i++)sculpt('spiral',c[i%2?2:0],cx,.08,cz,2.2+i*.35,1.38,[1,.12,1],.2+i*.12,0,0,0,.12,.7);
   // Separate recurrent venom pulses visually communicate poison over time without changing damage.
   for(let i=0;i<3;i++)sculpt('core',c[0],cx,.45,cz,.35,.28,[1,.6,1],.55+i*.45,0,.25,0,.8);
  }
  const n=this.low?8:48,shape:Shape=job==='swordsman'?'stoneshard':job==='mage'?(branch?'leaf':'goldstar'):branch?'petal':'spark';
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const m=sculpt(shape,c[i%3],cx+Math.sin(a)*3,.35+i%3*.35,cz+Math.cos(a)*3,.42,.95,[1,1,1],.3+i%3*.07,Math.sin(a)*10.8,.55,Math.cos(a)*10.8,-.08,1);if(m)m.rotation.y=a;}
 }
 /** Final-tier cinematic silhouettes: release is visual only, with no gameplay timing changes. */
 private releaseLv100(skill:Skill,job:ClassId,x:number,z:number,tx:number,tz:number){
  const c=lv100Palette(job,skill.branch),branch=skill.branch,dir=Math.atan2(tx-x,tz-z),cx=job==='swordsman'?x:tx,cz=job==='swordsman'?z:tz;
  const style=job==='swordsman'?(branch?'guardian-quake-gold-sword-shattered-earth':'meteor-blade-whitegold-flaming-grand-sweep'):job==='mage'?(branch?'worldtree-gold-crown-pink-blossom-burst':'astral-storm-violet-dimensional-galaxy'):branch?'wild-hunt-golden-antler-arrow-fan':'sky-barrage-cyan-ascending-descending-arrows';
  this.lv100Cue={skillId:skill.id,style,impactSeconds:0,heroSeconds:1.9,focal:{x:cx,z:cz},decorativeRadius:17.4,palette:[...c],endSeconds:2.65};
  const limit=this.low?40:96;
  while(this.active.length){const p=this.active.pop()!;p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape,list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}
  const sculpt=(shape:Shape,color:number,px:number,py:number,pz:number,size:number,duration=1.9,stretch:[number,number,number]=[1,1,1],delay=0,vx=0,vy=0,vz=0,grow=0,spin=0)=>{
   const m=this.emit(shape,color,px,py,pz,size,duration,vx,vy,vz,grow,spin,delay);if(m){this.active[this.active.length-1].stretch=stretch;m.scaling.set(size*stretch[0],size*stretch[1],size*stretch[2]);}return m;
  };
  // Finale reservations precede satellites; five waves remain low on the floor.
  for(let i=0;i<5;i++)sculpt('ring',c[i%3],cx,.08+i*.045,cz,2.5,.95,[1,.4,1],.5+i*.30,0,0,0,(17.4-2.5)/.95);
  sculpt('core',job==='mage'&&!branch?c[2]:c[1],cx,.2,cz,.7,.22,[1,.3,1]);
  if(job==='swordsman'&&!branch){
   // Huge whitegold cutting face sits inside red and orange fire shells; the center stays open.
   for(let i=0;i<4;i++){const blade=sculpt('fireblade',i===2?c[1]:i===0?c[2]:c[0],cx,.8+i*.55,cz,6.0-i*.40,1.9,[1,1.3,1],i*.045,Math.sin(dir)*.8,.08,Math.cos(dir)*.8,.25,.65);if(blade)blade.rotation.set(.2+i*.035,dir+i*.17,.1);}
   const sword=sculpt('sword',c[1],cx+Math.cos(dir)*2.4,1.7,cz-Math.sin(dir)*2.4,2.3,1.9,[1.4,1.5,1.2]);if(sword)sword.rotation.set(.35,dir,-1.0);
   for(let i=0;i<5;i++){const a=dir-1+i*.48;const flame=sculpt('fireblade',c[i%2?0:2],cx+Math.sin(a)*3.5,.5+i%2,cz+Math.cos(a)*3.5,1.8,1.15,[1,1,1],.45,Math.sin(a)*3,.8,Math.cos(a)*3,.3,.7);if(flame)flame.rotation.set(.45,a,.4);}
   const final=sculpt('fireblade',c[1],cx,1.6,cz,6.6,1.15,[1,.6,1],.65,0,0,0,.8,.45);if(final)final.rotation.set(.18,dir+.45,0);
  }else if(job==='swordsman'){
   const slam=sculpt('sword',c[1],cx+1.4,8,cz,2.8,.28,[1.4,1.25,1.4],0,0,-17,0);if(slam)slam.rotation.z=Math.PI;
   const sword=sculpt('sword',c[1],cx+1.4,5.4,cz,2.65,1.9,[1.8,1.2,1.5],.18);if(sword)sword.rotation.z=Math.PI;
   for(let i=0;i<8;i++){const a=i*Math.PI/4,r=3.1;const stone=sculpt('stoneshard',c[2],cx+Math.sin(a)*r,-.5,cz+Math.cos(a)*r,1.7,1.9,[1,1.25,1],.1+i%2*.05,Math.sin(a)*.6,.6,Math.cos(a)*.6,.15);if(stone)stone.rotation.set(.3,a,.35);
    const eruption=sculpt('ray',i%2?c[0]:c[1],cx+Math.sin(a)*2.7,3,cz+Math.cos(a)*2.7,.65,1.45,[1,1,5],.22,Math.sin(a)*.7,1,Math.cos(a)*.7);if(eruption)eruption.rotation.x=-Math.PI/2;
   }
   for(let i=0;i<3;i++){const burst=sculpt('scream',c[i%2],cx,.4+i*.6,cz,5.2,1.35,[1,1,1],.5+i*.12,0,.25,0,.7);if(burst)burst.rotation.y=dir+i*2.1;}
  }else if(job==='mage'&&!branch){
   // Sweeping curved arms occupy a broad suspended galaxy; white stars stay separate from violet gas.
   for(let i=0;i<6;i++){const arm=sculpt('galaxyarm',i%2?0xb944f4:c[0],cx,4.8+i%2*.35,cz,5.1,1.9,[1,1.7,1],i%2*.04,0,-.2,0,.12,.65);if(arm)arm.rotation.set(.18,dir+i*Math.PI/3,0);}
   for(let i=0;i<3;i++){const arm=sculpt('galaxyarm',c[1],cx,5.1+i*.2,cz,4.6,1.55,[1,.7,1],.25,0,-.35,0,-.55,.9);if(arm)arm.rotation.set(.2,i*2.1,0);}
   sculpt('core',c[1],cx,5,cz,.65,1.45,[1,.5,1],.1,0,-.3,0,.05);
   for(let i=0;i<12;i++){const a=i*2.4,r=1.6+i%4*.9;sculpt('star',c[2],cx+Math.cos(a)*r,5.2+i%3*.3,cz+Math.sin(a)*r,.17+i%3*.045,1.8,[1,1,1],i%3*.04,0,-.22,0,0,.7);}
   for(let i=0;i<3;i++){const collapse=sculpt('galaxyarm',i%2?c[1]:c[0],cx,4.8,cz,5,1.05,[1,.8,1],.65+i*.12,0,-2.5,0,-3,1.6);if(collapse)collapse.rotation.y=i*2.1;}
  }else if(job==='mage'){
   // The trunk is offset behind the victim; eight broad crown tips frame the golden damaging bloom.
   const tree=sculpt('worldcrown',c[0],cx,.05,cz+1.2,2.4,1.9,[1.15,1,1.15],0,0,.1,0,.1);if(tree)tree.rotation.y=dir;
   for(let i=0;i<8;i++){const a=i*Math.PI/4,r=4.6,py=7.25+i%3*.42;sculpt('blossom',c[1],cx+Math.cos(a)*r,py,cz+1.2+Math.sin(a)*r,1.35,1.9,[1,1,1],.08+i%2*.08,0,.05,0,.15,.25);
    const leaf=sculpt('crownfoliage',c[2],cx+Math.cos(a)*r,py-.3,cz+1.2+Math.sin(a)*r,1.5,1.9,[1,1,1],.1);if(leaf)leaf.rotation.set(.2,a,.4);
   }
   for(let i=0;i<6;i++){const a=i*Math.PI/3;const burst=sculpt('ray',c[0],cx+Math.sin(a)*2,2.5,cz+Math.cos(a)*2,.65,1.25,[1,1,4],.6,Math.sin(a)*5,.4,Math.cos(a)*5);if(burst)burst.rotation.set(-.25,a,0);}
   for(let i=0;i<4;i++){const a=i*2.4;sculpt('blossom',c[1],cx+Math.sin(a)*3,5.4,cz+Math.cos(a)*3,.8,1.7,[1,1,1],.5,Math.sin(a)*2,-1.2,Math.cos(a)*2,0,1);}
  }else if(!branch){
   for(const side of [-1,1]){const wing=sculpt('featherwing',c[1],cx+side*.8,4.5,cz,2.4,1.9,[side,1,1]);if(wing)wing.rotation.y=dir;}
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=2.6+i%2*.7,px=cx+Math.sin(a)*r,pz=cz+Math.cos(a)*r;
    const rise=sculpt('arrow',c[0],px,2.4,pz,1.6,.55,[1,1,2.6],0,0,8,0);if(rise)rise.rotation.x=-Math.PI/2;
    const arrow=sculpt('arrow',i%2?c[1]:c[0],px,8,pz,1.8,1.2,[1,1,2.7],.48+i%3*.055,0,-5.5,0);if(arrow)arrow.rotation.x=Math.PI/2;
    const trail=sculpt('ray',c[0],px,8.6,pz,.44,1.2,[1,1,6],.48+i%3*.055,0,-5.5,0);if(trail)trail.rotation.x=Math.PI/2;
    sculpt('star',c[1],px,.3,pz,.7,.65,[1,.45,1],.96+i%3*.08,0,.15,0,.5);
   }
  }else{
   const stag=sculpt('stag',c[0],cx-Math.sin(dir)*2.2,.1,cz-Math.cos(dir)*2.2,2.15,1.9,[1.1,1,1.1],0,Math.sin(dir)*.5,.05,Math.cos(dir)*.5);if(stag)stag.rotation.y=dir;
   for(let i=0;i<7;i++){const a=dir+(i-3)*.15,side=(i-3)*.85,px=cx+Math.cos(dir)*side-Math.sin(dir)*3,pz=cz-Math.sin(dir)*side-Math.cos(dir)*3;
    const arrow=sculpt('arrow',c[1],px,1.4+i%2*.6,pz,1.8,1.65,[1.2,1.2,3.3],.08+i%2*.08,Math.sin(a)*4,.05,Math.cos(a)*4);if(arrow)arrow.rotation.y=a;
    const trail=sculpt('ray',c[0],px,1.4+i%2*.6,pz,.45,1.65,[1,1,7],.08+i%2*.08,Math.sin(a)*4,.05,Math.cos(a)*4);if(trail)trail.rotation.y=a;
   }
   for(let i=0;i<3;i++){const fan=sculpt('scream',c[i%2],cx,1+i*.65,cz,5.6,1.35,[1,.7,1],.5+i*.1,Math.sin(dir)*2,0,Math.cos(dir)*2,.4);if(fan)fan.rotation.y=dir;}
  }
  // Fill only the remaining budget, after every essential silhouette and delayed finale.
  const budget=Math.min(this.low?6:48,limit-this.active.length),shape:Shape=job==='mage'?(branch?'blossom':'star'):job==='swordsman'?(branch?'stoneshard':'fireblade'):branch?'star':'arrow';
  for(let i=0;i<budget;i++){const a=i*Math.PI*2/Math.max(1,budget);const accent=sculpt(shape,job==='mage'&&!branch?c[2]:c[i%3],cx+Math.sin(a)*3.5,job==='mage'?4:.6,cz+Math.cos(a)*3.5,.30+i%2*.12,1.1,[1,1,1],.65+i%3*.08,Math.sin(a)*7,job==='mage'?-.3:1,Math.cos(a)*7,-.06,.5);if(accent)accent.rotation.y=a;}
 }
 basic(job:ClassId,x:number,z:number){this.emit(job==='swordsman'?'crescent':'star',job==='mage'?0xb5d9ff:0xffe5a3,x,.75,z,job==='swordsman'?.65:.14,.3,0,.4,0,.5,4);}
 update(dt:number){for(let i=this.active.length-1;i>=0;i--){const p=this.active[i];let elapsed=dt;if(p.delay>0){p.delay-=dt;if(p.delay>0)continue;elapsed=-p.delay;p.delay=0;p.mesh.setEnabled(true);}p.life-=elapsed;if(p.life<=0){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;let list=this.free.get(shape);if(!list){list=[];this.free.set(shape,list);}list.push(p.mesh);this.active.splice(i,1);continue;}const t=p.duration-p.life;p.mesh.position.set(p.x+p.vx*t,p.y+p.vy*t-(p.gravity?t*t*3:0),p.z+p.vz*t);p.mesh.rotation.y+=p.spin*elapsed;p.mesh.visibility=Math.min(1,p.life/.08);const scale=Math.max(.01,p.size+p.grow*t);p.mesh.scaling.set(scale*p.stretch[0],scale*p.stretch[1],scale*p.stretch[2]);}}
 clear(){this.lv100Cue=null;this.lv90Cue=null;this.lv80Cue=null;this.lv70Cue=null;this.lv60Cue=null;this.lv50Cue=null;this.lv40Cue=null;this.lv10Cue=null;this.lv20Cue=null;this.lv30Cue=null;for(const p of this.active){p.mesh.setEnabled(false);const shape=p.mesh.metadata.vfxShape as Shape;const list=this.free.get(shape)||[];list.push(p.mesh);this.free.set(shape,list);}this.active.length=0;}
 dispose(){this.clear();this.free.forEach(list=>list.forEach(mesh=>mesh.dispose()));this.templates.forEach(mesh=>mesh.dispose());this.materials.forEach(material=>material.dispose());this.free.clear();this.templates.clear();this.materials.clear();this.created=0;}
}
