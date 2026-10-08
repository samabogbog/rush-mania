import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Primitives } from './primitives';

/** Small, deterministic art vocabulary. Static geometry is palette-baked by mergeStatic. */
export function meadowGround(f:Primitives,color:number,pathColor:number) {
 const ground=f.mesh({kind:'plane',w:32,h:32},color,0,0,0);ground.rotation.x=-Math.PI/2;f.surface(ground,'grass');
 // A continuous ribbon has no repeated tile seams and subtly wanders through the playfield.
 for(const horizontal of [false,true]) {
  const positions:number[]=[],indices:number[]=[],normals:number[]=[],uvs:number[]=[];
  for(let i=0;i<=32;i++) {
   const t=-17+i*34/32,offset=Math.sin(t*.18)*.3,width=horizontal?1.5:1.7;
   for(const edge of [-width,width]){positions.push(horizontal?t:offset+edge,.014,horizontal?2+offset+edge:t);normals.push(0,1,0);uvs.push(edge<0?0:1,i/32);}
   if(i<32){if(horizontal)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);else indices.push(i*2+1,i*2,i*2+2,i*2+3,i*2+1,i*2+2);}
  }
  // Both windings keep the strip visible through Babylon's handedness/camera conventions.
  const frontIndices=indices.slice();for(let i=0;i<frontIndices.length;i+=3)indices.push(frontIndices[i+2],frontIndices[i+1],frontIndices[i]);
  const ribbon=new Mesh('soft-winding-path',f.scene),data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uvs;data.applyToMesh(ribbon);ribbon.material=f.material(pathColor);f.surface(ribbon,'dirt');ribbon.receiveShadows=true;
 }
 for(let i=0;i<28;i++) {const t=-15+i*1.12,x=Math.sin(t*.18)*.3+(i%2?.9:-.9),stone=f.ball(.13,0xf4dfb1,x,.024,t,undefined,.2);stone.scaling.x=1.6;}
}
export function roundTree(f:Primitives,x:number,z:number,color=0x51bb71,scale=1,fruit=false) {
 const g=f.group('rounded-canopy');g.position.set(x,0,z);g.scaling.setAll(scale);
 f.mesh({kind:'cylinder',top:.14,bottom:.25,h:1.9,n:12},0xa76e43,0,.95,0,g);
 for(const [dx,dy,dz,r,c] of [[0,2.5,0,1.15,color],[-.65,2.15,.05,.85,color],[.64,2.35,.1,.88,0x8ddd77],[0,3.05,-.12,.75,color]])f.ball(r,c,dx,dy,dz,g,.86,6);
 for(const side of [-1,1]){const root=f.ball(.25,0xa76e43,side*.19,.1,.05,g,.5,6);root.scaling.x=1.5;}
 if(fruit)for(const [dx,dy,dz] of [[-.55,2.15,.65],[.55,2.45,.65],[.05,2.8,.75]])f.ball(.14,0xff7974,dx,dy,dz,g);
}
export function flowerPatch(f:Primitives,x:number,z:number,seed:number) {
 for(let i=0;i<5;i++) {
  const dx=Math.sin(seed+i*2.4)*.55,dz=Math.cos(seed+i*2.4)*.55;
  const leaf=f.ball(.19,0x3dad67,x+dx,.1,z+dz,undefined,.45,4);leaf.scaling.x=1.5;
  const colors=[0xffdd76,0xff8fa4,0xecbdff];
  for(let p=0;p<4;p++)f.ball(.07,colors[(seed+i)%3],x+dx+Math.sin(p*Math.PI/2)*.075,.23,z+dz+Math.cos(p*Math.PI/2)*.075,undefined,.55,4);
  f.ball(.043,0xfff1a0,x+dx,.25,z+dz,undefined,.5,4);
 }
}
export function roundedPortal(f:Primitives,x:number,z:number,color:number) {
 const g=f.group('moon-gate');g.position.set(x,0,z);
 for(const side of [-1,1]){f.mesh({kind:'cylinder',top:.2,bottom:.28,h:2.3,n:12},0xb2a5d1,side*1.18,1.15,0,g);f.ball(.3,0xe7dcff,side*1.18,2.35,0,g);}
 // Smooth stone voussoirs frame the luminous disc without a square lintel.
 for(let i=0;i<9;i++){const a=i*Math.PI/8;f.ball(.27,0xd2c2e8,Math.cos(a)*1.18,2.1+Math.sin(a)*1.05,0,g);}
 const light=f.mesh({kind:'disc',r:1.08,n:40},color,0,1.55,.04,g);light.material=f.material(color,true,.65);
 for(const side of [-1,1]){f.ball(.23,0xffdf83,side*1.62,.24,.35,g,.6);f.ball(.12,color,side*1.62,.6,.35,g);}
}

/** Raised double-sided curved promenade; all vertex streams match the static palette batch. */
export function gardenPath(f:Primitives,from:[number,number],to:[number,number],width=1.25,color=0xe9d5a1){
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
 const dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
 for(let i=0;i<=16;i++){const t=i/16,bend=Math.sin(t*Math.PI)*.55;for(const side of [-1,1]){positions.push(from[0]+dx*t+nx*(bend+side*width/2),.026,from[1]+dz*t+nz*(bend+side*width/2));normals.push(0,1,0);uvs.push((side+1)/2,t);}if(i<16){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+1,k,k+2,k+3,k+1);}}
 const m=new Mesh('garden-promenade',f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=indices;data.applyToMesh(m);m.material=f.material(color);f.surface(m,color===0xcba375?'wood':'dirt');m.receiveShadows=true;
}
export function meadowPatch(f:Primitives,x:number,z:number,r:number,color:number,background=0x82cc79){
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
 const channels=(c:number)=>[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255],inside=channels(color),outside=channels(background);
 for(let ring=0;ring<3;ring++)for(let i=0;i<=32;i++){
  const radius=[0,.62,1][ring],a=i*Math.PI*2/32;
  positions.push(Math.cos(a)*r*radius,.008,Math.sin(a)*r*radius*.65);normals.push(0,1,0);uvs.push((Math.cos(a)*radius+1)/2,(Math.sin(a)*radius+1)/2);
  const fade=ring===2?1:0;colors.push(...inside.map((c,k)=>c*(1-fade)+outside[k]*fade),1);
  if(ring<2&&i<32){const k=ring*33+i;indices.push(k,k+1,k+33,k+1,k+34,k+33,k+33,k+1,k,k+33,k+34,k+1);}
 }
 const patch=new Mesh('soft-painted-meadow',f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.colors=colors;data.indices=indices;data.applyToMesh(patch);patch.material=f.material(0xffffff);patch.receiveShadows=true;patch.position.set(x,0,z);f.surface(patch,'grass');
}
export function townGarden(f:Primitives){
 for(const [x,z,r,c] of [[-11,-7,4,0x89ce7b],[11,-7,4,0x89ce7b],[-11,8,4.5,0x8bd281],[11,8,4.5,0x8bd281],[-4,13,3,0x8fd183]])meadowPatch(f,x,z,r,c,0x86d877);
 const plaza=f.mesh({kind:'disc',r:4.5,n:64},0xf0dbb1,0,.021,3);plaza.rotation.x=-Math.PI/2;plaza.scaling.y=1.15;
 const inset=f.mesh({kind:'disc',r:4.15,n:64},0xe8d3a9,0,.022,3);inset.rotation.x=-Math.PI/2;inset.scaling.y=1.15;
 // Short staggered paving joints suggest fitted stone without a high-frequency checker texture.
 for(let row=0;row<7;row++)for(let col=-2;col<=2;col++){
  const x=col*1.5+(row%2?.75:0),z=-.8+row*1.05;
  if(Math.hypot(x,(z-3)/1.15)>3.65||Math.hypot(x,z-6)<1.85)continue;
  f.box(1.35,.004,.018,0xd8c096,x,.029,z);
  f.box(.018,.004,.58,0xd8c096,x+.67,.029,z+.29);
 }
 for(const [x,z] of [[-8,-5.3],[8,-5.3],[-8,8.7],[8,8.7]])gardenPath(f,[0,z<0?0:5],[x,z],1.5);
 for(let i=0;i<24;i++){const a=i*Math.PI*2/24;const stone=f.ball(.16,0xffebc8,Math.cos(a)*4.32,.035,3+Math.sin(a)*4.97,undefined,.2,6);stone.scaling.x=1.6;stone.rotation.y=-a;}
 // Small amenities sit inside existing house collision proxies, outside promenades.
 for(const [x,z] of [[-9.05,-7.15],[9.05,7.15]]){
  f.box(.9,.12,.36,0xbc8a56,x,.46,z);
  f.box(.9,.3,.09,0xa57348,x,.68,z-.16);
  for(const side of [-1,1])f.box(.1,.42,.26,0x855c3c,x+side*.32,.23,z);
  const pot=f.mesh({kind:'cylinder',top:.2,bottom:.14,h:.3,n:10},0xd79770,x,.18,z+.5);
  f.ball(.25,0x75bb73,x,.44,z+.5,undefined,.65,6);
  for(const side of [-1,1])f.ball(.075,0xffc6a6,x+side*.12,.62,z+.5,undefined,.7,4);
 }
 const board=f.group('town-noticeboard');board.position.set(-6.85,0,-7.1);
 f.box(.08,1.45,.08,0x95663f,-.4,.72,0,board);f.box(.08,1.45,.08,0x95663f,.4,.72,0,board);
 f.box(1.05,.67,.1,0xb48152,0,1.22,0,board);f.box(1.18,.09,.36,0xdea476,0,1.6,0,board);
 for(const [x,c] of [[-.22,0xffefc1],[.19,0xffdfb3]]){f.box(.27,.38,.012,c,x,1.22,.064,board);f.ball(.025,0xc46f59,x,1.36,.08,board,1,4);}
 for(const [x,z] of [[-10,-8],[10,-8],[-10,8],[10,8]]){
  for(let i=0;i<4;i++){const hedge=f.ball(.4,0x54ad68,x,.3,z+(i-1.5)*.6,undefined,.65,6);hedge.scaling.z=1.15;}
 }
}

export function fountainRipples(f:Primitives,x:number,z:number){
 for(const radius of [.55,1.05]){
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=32;i++){const a=i*Math.PI*2/32;for(const r of [radius,radius-.025]){positions.push(Math.sin(a)*r,.593,Math.cos(a)*r);normals.push(0,1,0);uvs.push(Math.sin(a)*.5+.5,Math.cos(a)*.5+.5);}if(i<32){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3,k+1,k+2,k,k+3,k+2,k+1);}}
  const ring=new Mesh('fountain-ripple',f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=indices;data.applyToMesh(ring);ring.material=f.material(0xe2fbff,true,.65);ring.position.set(x,0,z);ring.isPickable=false;
 }
}
