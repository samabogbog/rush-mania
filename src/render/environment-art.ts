import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Primitives } from './primitives';
import { type ZoneId, zones } from '../game/content';
import { zoneMonsterGroups, zoneObstacles, PORTAL_POSITION } from '../game/map-data';

/** Renderer-only palette: gameplay content keeps its original authored values. */
export function environmentPalette(zone:ZoneId){
 const palettes={town:[0xaebb77,0xd7bd8f],glade:[0xa9bb76,0xd4b98a],orchard:[0xbbc575,0xd6b584],marsh:[0x7ea88e,0xb6ab88],frost:[0xbddadb,0xb3c2c2],ruins:[0x949d7a,0xb9ac92]};
 const [ground,path]=palettes[zone];return {ground,path};
}
const tint=(color:number,factor:number)=>{const c=(shift:number)=>Math.min(255,Math.round((color>>shift&255)*factor));return c(16)<<16|c(8)<<8|c(0);};

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
export function roundTree(f:Primitives,x:number,z:number,color=0x50844d,scale=1,fruit=false) {
 const g=f.group('rounded-canopy');g.position.set(x,0,z);g.scaling.setAll(scale);
 f.mesh({kind:'cylinder',top:.14,bottom:.25,h:1.9,n:12},0xa76e43,0,.95,0,g);
 for(const [dx,dy,dz,r,c] of [[0,2.5,0,1.15,color],[-.65,2.15,.05,.85,tint(color,.8)],[.64,2.35,.1,.88,tint(color,1.16)],[0,3.05,-.12,.75,color]])f.ball(r,c,dx,dy,dz,g,.86,6);
 for(const side of [-1,1]){const root=f.ball(.25,0xa76e43,side*.19,.1,.05,g,.5,6);root.scaling.x=1.5;}
 if(fruit)for(const [dx,dy,dz] of [[-.55,2.15,.65],[.55,2.45,.65],[.05,2.8,.75]])f.ball(.14,0xc9674f,dx,dy,dz,g);
}
export function flowerPatch(f:Primitives,x:number,z:number,seed:number) {
 for(let i=0;i<5;i++) {
  const dx=Math.sin(seed+i*2.4)*.55,dz=Math.cos(seed+i*2.4)*.55;
  const leaf=f.ball(.19,0x437e53,x+dx,.1,z+dz,undefined,.45,4);leaf.scaling.x=1.5;
  const colors=[0xfff3d4,0xf4ead1,0xf6dfb6];
  for(let p=0;p<5;p++)f.ball(.07,colors[(seed+i)%3],x+dx+Math.sin(p*Math.PI*2/5)*.075,.23,z+dz+Math.cos(p*Math.PI*2/5)*.075,undefined,.55,4);
  f.ball(.043,0xd9a847,x+dx,.25,z+dz,undefined,.5,4);
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
export function meadowPatch(f:Primitives,x:number,z:number,r:number,color:number,background=0x9eaf76){
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
 const channels=(c:number)=>[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255],inside=channels(color),outside=channels(background);
 for(let ring=0;ring<3;ring++)for(let i=0;i<=32;i++){
  const radius=[0,.62,1][ring],a=i*Math.PI*2/32;
  positions.push(Math.cos(a)*r*radius,.008,Math.sin(a)*r*radius*.65);normals.push(0,1,0);uvs.push((Math.cos(a)*radius+1)/2,(Math.sin(a)*radius+1)/2);
  const fade=ring===2?1:ring===1?.65:0;colors.push(...inside.map((c,k)=>(c*.2+outside[k]*.8)*(1-fade)+outside[k]*fade),1);
  if(ring<2&&i<32){const k=ring*33+i;indices.push(k,k+1,k+33,k+1,k+34,k+33,k+33,k+1,k,k+33,k+34,k+1);}
 }
 const patch=new Mesh('soft-painted-meadow',f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.colors=colors;data.indices=indices;data.applyToMesh(patch);patch.material=f.material(0xffffff);patch.receiveShadows=true;patch.position.set(x,0,z);f.surface(patch,'grass');
}
export function townGarden(f:Primitives){
 for(const [x,z,r,c] of [[-11,-7,4,0x9da76e],[11,-7,4,0x9da76e],[-11,8,4.5,0xaab67f],[11,8,4.5,0xaab67f],[-4,13,3,0x9caa74]])meadowPatch(f,x,z,r,c,0xaebb77);
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
  f.ball(.25,0x73914f,x,.44,z+.5,undefined,.65,6);
  for(const side of [-1,1])f.ball(.075,0xffc6a6,x+side*.12,.62,z+.5,undefined,.7,4);
 }
 const board=f.group('town-noticeboard');board.position.set(-6.85,0,-7.1);
 f.box(.08,1.45,.08,0x95663f,-.4,.72,0,board);f.box(.08,1.45,.08,0x95663f,.4,.72,0,board);
 f.box(1.05,.67,.1,0xb48152,0,1.22,0,board);f.box(1.18,.09,.36,0xdea476,0,1.6,0,board);
 for(const [x,c] of [[-.22,0xffefc1],[.19,0xffdfb3]]){f.box(.27,.38,.012,c,x,1.22,.064,board);f.ball(.025,0xc46f59,x,1.36,.08,board,1,4);}
 for(const [x,z] of [[-10,-8],[10,-8],[-10,8],[10,8]]){
  for(let i=0;i<4;i++){const hedge=f.ball(.4,0x487d4c,x,.3,z+(i-1.5)*.6,undefined,.65,6);hedge.scaling.z=1.15;}
 }
}

export function fountainRipples(f:Primitives,x:number,z:number){
 for(const radius of [.55,1.05]){
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=32;i++){const a=i*Math.PI*2/32;for(const r of [radius,radius-.025]){positions.push(Math.sin(a)*r,.593,Math.cos(a)*r);normals.push(0,1,0);uvs.push(Math.sin(a)*.5+.5,Math.cos(a)*.5+.5);}if(i<32){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3,k+1,k+2,k,k+3,k+2,k+1);}}
  const ring=new Mesh('fountain-ripple',f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=indices;data.applyToMesh(ring);ring.material=f.material(0xe2fbff,true,.65);ring.position.set(x,0,z);ring.isPickable=false;
 }
}

/** Pitched clay roof stays inside the original cottage's visual envelope. */
export function cottageRoof(f:Primitives,g:import('@babylonjs/core/Meshes/transformNode.js').TransformNode,index:number){
 const clay=index%2?0xc27843:0xc87543;
 for(const side of [-1,1]){
  const roof=f.box(2.95,.13,1.65,clay,0,2.39,side*.65,g);roof.rotation.x=side*.48;f.surface(roof,'stone');
  for(let row=0;row<5;row++){
   const z=side*(.12+row*.29),y=2.74-Math.abs(z)*.52;
   const joint=f.box(2.94,.024,.025,tint(clay,.85),0,y,z,g);joint.rotation.x=side*.48;
   for(let col=0;col<6;col++){
    const seam=f.box(.018,.022,.22,tint(clay,.91),(col-2.5)*.47+(row%2?.12:0),y-.065,z+side*.12,g);seam.rotation.x=side*.48;
   }
  }
 }
 f.box(3.02,.12,.13,0xd08a50,0,2.78,0,g);
 // Timber gables make the roof read as a cottage from either camera rotation.
 for(const side of [-1,1]){
  const positions=[side*1.21,2, -1.2,side*1.21,2,1.2,side*1.21,2.72,0];
  const m=new Mesh('cottage-gable',f.scene),d=new VertexData();d.positions=positions;d.indices=[0,1,2,2,1,0];d.normals=[];VertexData.ComputeNormals(positions,d.indices,d.normals);d.uvs=[0,0,1,0,.5,1];d.applyToMesh(m);m.material=f.material(0xffedcc);m.parent=g;m.receiveShadows=true;f.surface(m,'plaster');
 }
}

/** Hand-painted faceted leaves and lotus accents share the existing static sector batch. */
export function waterGarden(f:Primitives,x:number,z:number,r:number){
 for(let i=0;i<9;i++){
  const a=i*2.399,rad=r*(.48+(i%3)*.12),px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
  if(Math.abs(pz-z)<.7)continue;
  const pad=f.mesh({kind:'disc',r:.23+(i%2)*.09,n:9},i%2?0x92ab4f:0x7e9e48,px,.038,pz);pad.rotation.x=-Math.PI/2;pad.rotation.z=a;
  if(i%3===0){for(let p=0;p<5;p++)f.ball(.075,0xf5e6bf,px+Math.cos(p*1.257)*.08,.075,pz+Math.sin(p*1.257)*.08,undefined,.55,4);f.ball(.04,0xdcb15b,px,.094,pz,undefined,.5,4);}
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,px=x+Math.cos(a)*(r+.08),pz=z+Math.sin(a)*(r+.08);
  if(Math.abs(pz-z)<.65)continue;
  const bank=f.ball(.28,0x9b9c70,px,.045,pz,undefined,.22,5);bank.scaling.x=1.6;bank.rotation.y=-a;
 }
}

/** Fixed-budget sector batches. No frame allocations, picking, collision, or gameplay objects. */
export function meadowDetails(f:Primitives,zone:ZoneId,sx:number,sz:number){
 const obstacles=zoneObstacles(zone),groups=zoneMonsterGroups(zone),palette=environmentPalette(zone);
 let seed=(Math.imul(sx+53,73856093)^Math.imul(sz+71,19349663)^zone.length)>>>0;
 const rand=()=>{seed=Math.imul(seed,1664525)+1013904223>>>0;return seed/4294967296;};
 const safe=(x:number,z:number)=>{
  if([-32,0,32].some(v=>Math.abs(x-v)<2.2||Math.abs(z-v-2)<2.1))return false;
  if(groups.some(g=>Math.hypot(x-g.x,z-g.z)<3.6))return false;
  if(obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.4))return false;
  if(Math.hypot(x-PORTAL_POSITION.x,z-PORTAL_POSITION.z)<2.1||zones[zone].npcs.some(n=>Math.hypot(x-n.x,z-n.z)<1.5))return false;
  if(zone==='town'&&sx===0&&sz===0&&(Math.hypot(x,(z-3)/1.15)<5||Math.abs(x)<7&&Math.abs(z)<10))return false;
  if(zone==='marsh'&&((sx===0&&sz===0&&[[-8,-4],[8,6]].some(([px,pz])=>Math.hypot(x-px,z-pz)<3.6))||Math.hypot(x-sx-8,z-sz+7)<4.5))return false;
  return true;
 };
 const makeBatch=(highOnly:boolean)=>{
  const positions:number[]=[],normals:number[]=[],colors:number[]=[],indices:number[]=[],uvs:number[]=[];let clusters=0;
  const vertex=(x:number,y:number,z:number,color:number)=>{positions.push(x,y,z);normals.push(0,.8,.6);colors.push((color>>16&255)/255,(color>>8&255)/255,(color&255)/255,1);uvs.push(0,0);return positions.length/3-1;};
  const triangle=(a:number,b:number,c:number)=>indices.push(a,b,c,c,b,a);
  const leaf=zone==='frost'?0x748f91:zone==='ruins'?0x66775e:zone==='marsh'?0x416f63:0x437a51;
  const budget=highOnly?30:80;
  for(let attempt=0;attempt<budget*8&&clusters<budget;attempt++){
   const x=sx-14.5+rand()*29,z=sz-14.5+rand()*29;if(!safe(x,z))continue;clusters++;
   const scale=.8+rand()*.55;
   for(let b=0;b<3;b++){
    const a=rand()*Math.PI*2,h=(.26+rand()*.35)*scale,w=.10*scale,dx=Math.cos(a),dz=Math.sin(a),bend=.14+(b%2)*.13;
    const base=vertex(x-dz*w*.45,.012,z+dx*w*.45,tint(leaf,.94)),base2=vertex(x+dz*w*.45,.012,z-dx*w*.45,leaf);
    const mid=vertex(x+dx*bend*.35-dz*w,h*.57,z+dz*bend*.35+dx*w,tint(leaf,1.12)),mid2=vertex(x+dx*bend*.35+dz*w,h*.57,z+dz*bend*.35-dx*w,tint(leaf,1.2));
    const tip=vertex(x+dx*bend,h,z+dz*bend,0x8da653);triangle(base,base2,mid);triangle(base2,mid2,mid);triangle(mid,mid2,tip);
   }
   if(clusters%5===0&&zone!=='ruins'){
    const fx=x+.18,fz=z+.1,h=.24*scale;
    for(let petal=0;petal<5;petal++){
     const a=petal*Math.PI*2/5,dx=Math.cos(a),dz=Math.sin(a),c=vertex(fx,h,fz,0xd9b044);
     triangle(c,vertex(fx+dx*.205-dz*.066,h+.018,fz+dz*.205+dx*.066,0xfaf0d5),vertex(fx+dx*.205+dz*.066,h+.018,fz+dz*.205-dx*.066,0xfaf0d5));
    }
   }else if(clusters%11===0&&zone!=='frost'&&zone!=='ruins'){
    for(let berry=0;berry<3;berry++){const bx=x+(berry-1)*.09;triangle(vertex(bx-.035,.19,z+.05,0xb85f4c),vertex(bx+.035,.19,z+.05,0xc97357),vertex(bx,.26,z+.05,0xd78261));}
   }
  }
  const m=new Mesh('meadow-details-'+(highOnly?'high':'base')+'-'+sx+'-'+sz,f.scene),data=new VertexData();data.positions=positions;data.normals=normals;data.colors=colors;data.uvs=uvs;data.indices=indices;data.applyToMesh(m);m.material=f.material(0xffffff);m.isPickable=false;m.receiveShadows=true;m.metadata={environmentDetail:true,highOnly,clusters};m.freezeWorldMatrix();
 };
 makeBatch(false);makeBatch(true);
 // Gentle contact shade anchors scenery even when low quality omits the live shadow map.
 const positions:number[]=[],normals:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];let contacts=0;
 for(const o of obstacles.filter(o=>Math.abs(o.x-sx)<16&&Math.abs(o.z-sz)<16)){
  const radius=Math.min(2.3,o.r*1.4+.2),start=positions.length/3;positions.push(o.x,.009,o.z);normals.push(0,1,0);colors.push(.16,.25,.2,.24);uvs.push(0,0);
  for(let i=0;i<=12;i++){const a=i*Math.PI/6;positions.push(o.x+Math.cos(a)*radius,.009,o.z+Math.sin(a)*radius*.78);normals.push(0,1,0);colors.push(.16,.25,.2,0);uvs.push(0,0);if(i<12)indices.push(start,start+i+1,start+i+2,start,start+i+2,start+i+1);}contacts++;
 }
 if(contacts){const m=new Mesh('scenery-contact-shade-'+sx+'-'+sz,f.scene),d=new VertexData();d.positions=positions;d.normals=normals;d.colors=colors;d.uvs=uvs;d.indices=indices;d.applyToMesh(m);m.material=f.material(0xffffff,true,.8);m.hasVertexAlpha=true;m.isPickable=false;m.metadata={contactShadows:contacts};m.freezeWorldMatrix();}
 // Texture-backed broad olive patches soften uniform fields without radial decals.
 for(let i=0;i<3;i++){const x=sx-11+i*9,z=sz+(i%2?9:-8);if(safe(x,z))meadowPatch(f,x,z,3.8,tint(palette.ground,i%2?.92:1.03),palette.ground);}
}
