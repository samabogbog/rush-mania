/** Project-authored low-poly art. No third-party model or skeleton is used. */
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Matrix,Vector3,Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { GLTF2Export } from '@babylonjs/serializers/glTF/2.0/glTFSerializer';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Primitives, type Shape } from '../src/render/primitives';
import { creature } from '../src/render/procedural';
import { classes,type ClassId } from '../src/game/classes';
import { species,type Kind } from '../src/game/content';
import {mkdir,writeFile} from 'node:fs/promises';
/** Smooth, deliberately small meshes; vertex palette is still baked into one draw. */
class ChibiPrimitives extends Primitives {
 override mesh(shape:Shape,color:number,x=0,y=0,z=0,parent?:TransformNode):Mesh {
  if(shape.kind==='sphere'||shape.kind==='box') {
   const sphere=shape.kind==='sphere';
   const m=MeshBuilder.CreateSphere('rounded-part',{diameter:sphere?shape.r*2:1,segments:sphere&&shape.r>=.4?12:8,slice:sphere&&shape.half?.5:1},this.scene);
   if(!sphere)m.scaling.set(shape.w,shape.h,shape.d);
   m.material=this.material(color);m.position.set(x,y,z);m.parent=parent||null;return m;
  }
  if(shape.kind==='cylinder'||shape.kind==='cone')shape={...shape,n:Math.max(shape.n,16)};
  return super.mesh(shape,color,x,y,z,parent);
 }
}
function authorHero(f:ChibiPrimitives,g:TransformNode,job:ClassId) {
 const skin=0xffd2b0,hair=job==='mage'?0x7353a2:job==='archer'?0xb66d40:0x734b45;
 const suit=classes[job].color,cream=0xffedce,boots=0x544264;
 const ell=(r:number,c:number,x:number,y:number,z:number,sx=1,sy=1,sz=1,bone?:number)=>{const m=f.ball(r,c,x,y,z,g);m.scaling.set(sx,sy,sz);if(bone!==undefined)m.metadata={bone};return m;};
 ell(.39,suit,0,.95,0,1,.94,.8,1);ell(.35,cream,0,.71,.02,1,.22,.8,0);
 ell(.25,cream,0,1.23,.18,1,.32,.8,1);
 ell(.53,skin,0,1.66,.025,1,1,.9,2);ell(.55,hair,0,job==='mage'?1.8:1.86,-.08,1,job==='mage'?.5:.68,.88,2);
 ell(.2,hair,0,2.0,.32,.92,.5,.55,2);
 // Sculpted bangs, expressive shining eyes, flush cheeks and tiny smile.
 for(const side of [-1,1]){
  ell(.21,hair,side*.26,1.98,.3,1,.54,.6,2).rotation.z=side*.35;
  ell(.14,skin,side*.5,1.62,0,.6,1,.6,2);
  ell(.093,0x342942,side*.19,1.64,.466,.8,1.18,.32,2);
  ell(.026,0xffffff,side*.175,1.677,.494,1,1,.25,2);
  ell(.065,0xffa6ab,side*.31,1.52,.434,1,.5,.2,2);
  ell(.14,suit,side*.46,1.16,0,1,1.25,1,side<0?3:4);
  ell(.12,skin,side*.48,.91,.02,1,1.2,1,side<0?7:8);
  ell(.15,boots,side*.19,.42,0,.83,1.55,.85,side<0?5:6);
  ell(.17,boots,side*.19,.14,.065,1,.7,1.45,side<0?9:10);
  ell(.16,cream,side*.19,.31,0,.9,.28,.95,side<0?5:6);
 }
 ell(.038,0xb65e67,0,1.49,.489,1,.45,.25,2);
 ell(.065,0xffd463,0,.87,.31,1,1,.3,1);
 // Cape hangs behind the torso, not a hard rectangular slab.
 ell(.35,suit,0,.91,-.24,1,.95,.18,1);
 if(job==='mage'){
  // Bell robe, gold hem and a swept storybook hat.
  const robe=f.mesh({kind:'cylinder',top:.28,bottom:.45,h:.7,n:20},suit,0,.79,0,g);robe.metadata={bone:1};
  const hem=f.mesh({kind:'cylinder',top:.455,bottom:.46,h:.08,n:20},cream,0,.45,0,g);hem.metadata={bone:1};
  ell(.13,0xffcf68,0,1.2,.32,.6,1,.35,1);
  const brim=ell(.6,suit,0,2.14,-.04,1,.08,1,2);
  const hatPath=[new Vector3(0,2.14,-.04),new Vector3(-.03,2.32,-.04),new Vector3(-.11,2.49,-.04),new Vector3(-.25,2.61,-.04),new Vector3(-.41,2.62,-.04)];
  const hat=MeshBuilder.CreateTube('swept-wizard-hat',{path:hatPath,radiusFunction:(i)=>[.43,.32,.22,.1,.025][i],tessellation:20,cap:Mesh.CAP_ALL},f.scene);hat.material=f.material(suit);hat.parent=g;hat.metadata={bone:2};
  ell(.09,0xffda7b,-.41,2.62,-.04,1,1,1,2);
  ell(.18,0xffdd7b,.56,1.53,.09,1,.45,1,12);ell(.17,0x7df0fa,.56,1.73,.09,.8,1.2,.8,12);
  const staff=f.mesh({kind:'cylinder',top:.038,bottom:.045,h:1.4,n:12},0xb57d50,.56,.88,.09,g);staff.metadata={bone:12};
 }else if(job==='swordsman'){
  for(const side of [-1,1])ell(.2,0xb9dded,side*.42,1.18,.015,1,.55,.9,side<0?3:4);
  ell(.26,0xc5e2ee,0,1.02,.245,1,.95,.34,1);
  for(const side of [-1,1])ell(.13,0x82b5d2,side*.23,1.06,.29,.45,1.5,.22,1);
  const blade=f.mesh({kind:'box',w:.16,h:.72,d:.04},0xe2f5ff,.64,1.42,.12,g);blade.metadata={bone:12};
  // The blade is intentionally planar rather than a rounded body primitive.
  blade.dispose();const edge=MeshBuilder.CreateBox('steel-blade',{width:.15,height:.72,depth:.035},f.scene);edge.position.set(.64,1.42,.12);edge.material=f.material(0xe2f5ff);edge.parent=g;edge.metadata={bone:12};
  const tip=f.mesh({kind:'cone',r:.106,h:.15,n:4},0xe2f5ff,.64,1.855,.12,g);tip.scaling.z=.23;tip.rotation.y=Math.PI/4;tip.metadata={bone:12};
  ell(.2,0xffd17c,.64,1.04,.12,1,.23,.45,12);ell(.065,0x815476,.64,.91,.12,1,1.45,1,12);ell(.08,0xffd17c,.64,.81,.12,1,.5,1,12);
 }else{
  ell(.3,0x42ab77,0,1.98,-.04,1.5,.3,1,2);
  const feather=ell(.16,0xffdc81,-.34,2.13,-.04,.36,1.4,.22,2);feather.rotation.z=-.45;
  // Continuous yew bow, taut string and a leather quiver with visible arrows.
  const bowPath=Array.from({length:17},(_,i)=>{const a=-1.15+i*2.3/16;return new Vector3(.38+.18*Math.cos(a),.91+.48*Math.sin(a),.13);});
  const bow=MeshBuilder.CreateTube('yew-bow',{path:bowPath,radius:.035,tessellation:8,cap:Mesh.CAP_ALL},f.scene);bow.material=f.material(0xbf834d);bow.parent=g;bow.metadata={bone:12};
  const string=MeshBuilder.CreateTube('drawstring',{path:[new Vector3(.453,1.3475,.13),new Vector3(.453,.91,.13),new Vector3(.453,.4725,.13)],radius:.008,tessellation:6,cap:Mesh.CAP_ALL},f.scene);string.material=f.material(cream);string.parent=g;string.metadata={bone:12,bowString:true};
  ell(.05,0x735039,.56,.91,.13,1,2,1,12);
  const quiver=f.mesh({kind:'cylinder',top:.13,bottom:.11,h:.63,n:12},0x906442,-.28,.98,-.29,g);quiver.metadata={bone:1};quiver.rotation.z=-.2;
  for(let i=0;i<3;i++){const arrow=f.mesh({kind:'cylinder',top:.012,bottom:.012,h:.65,n:6},cream,-.31+i*.05,1.38,-.3,g);arrow.metadata={bone:1};ell(.035,0xffdc81,-.31+i*.05,1.65,-.3,.4,1.3,.4,1);}
  ell(.27,0x338d67,0,1.2,-.22,1.2,.6,.45,1);
  const sash=ell(.22,0xb98148,.07,1.02,.27,.35,1.5,.25,1);sash.rotation.z=-.42;

 }
}
const engine=new NullEngine({renderWidth:256,renderHeight:256,textureSize:256,deterministicLockstep:true,lockstepMaxSteps:4});
await mkdir('public/models',{recursive:true});
const manifest:Record<string,unknown>={};
for(const asset of [...Object.keys(classes).map(id=>({id,type:'hero' as const})),...Object.keys(species).map(id=>({id,type:'monster' as const}))]) {
 const scene=new Scene(engine);scene.useRightHandedSystem=true;const factory=new ChibiPrimitives(scene);
 const hero=asset.type==='hero',root=hero?factory.group('character-root'):creature(factory,asset.id as Kind);
 if(hero)authorHero(factory,root,asset.id as ClassId);
 else {
  const family=species[asset.id as Kind].family;
  if(family==='cap'){
   for(const m of root.getChildMeshes())if(Math.abs(m.position.y-.42)<.001&&Math.abs(m.position.z-.25)<.001)m.dispose();
   const rim=MeshBuilder.CreateTorus('cream-cap-underskirt',{diameter:1.2,thickness:.055,tessellation:20},scene);rim.material=factory.material(0xffeccd);rim.parent=root;rim.position.y=.65;rim.metadata={bone:1};
   for(const [x,z] of [[-.25,.22],[.26,.18],[.04,-.25],[-.3,-.18]]){const y=.65+.462*Math.sqrt(1-(x*x+z*z)/(.66*.66));const dot=factory.ball(.095,0xffedcf,x,y+.016,z,root);dot.scaling.set(1,.23,1);dot.metadata={bone:1};}
  }
  const face:Record<string,[number,number,number]>={slime:[.2,.63,.54],cap:[.15,.75,.64],beast:[.18,1.45,.55],insect:[.13,1.23,.655],wisp:[.14,1.02,.735],golem:[.18,1.68,.36]};
  const [eyeX,eyeY,eyeZ]=face[family]||[.15,.75,.41];
  for(const side of [-1,1]){factory.ball(family==='slime'?.09:.074,0xfffbef,side*eyeX,eyeY,eyeZ,root);factory.ball(.044,0x342942,side*eyeX,eyeY,eyeZ+.065,root);const sparkle=factory.ball(.018,0xffffff,side*eyeX-.012,eyeY+.018,eyeZ+.105,root);sparkle.scaling.z=.3;const blush=factory.ball(.053,0xffb6bc,side*(eyeX+.1),eyeY-.075,eyeZ+.018,root);blush.scaling.set(1,.5,.2);}
 }
 if(!hero&&species[asset.id as Kind].family==='slime'){const mouth=factory.ball(.04,0x47738a,0,.47,.577,root);mouth.scaling.set(1,.35,.3);}
 root.name=asset.id;
 const skeleton=new Skeleton(asset.id+'-skeleton',asset.id,scene),joints:TransformNode[]=[],bones:Bone[]=[];
 const specifications=hero?[['hips',-1,0,.68,0],['spine',0,0,.37,0],['head',1,0,.5,0],['left-hand',1,-.43,.18,0],['right-hand',1,.43,.18,0],['left-leg',0,-.19,0,0],['right-leg',0,.19,0,0],['left-elbow',3,0,-.2,0],['right-elbow',4,0,-.2,0],['left-knee',5,0,-.28,0],['right-knee',6,0,-.28,0],['left-wrist',7,-.05,-.12,.02],['right-wrist',8,.05,-.12,.02]]:[['hips',-1,0,.3,0],['spine',0,0,.4,0],['head',1,0,.55,0],['left-hand',1,-.5,.3,0],['right-hand',1,.5,.3,0],['left-leg',0,-.22,0,0],['right-leg',0,.22,0,0]];
 if(hero&&asset.id==='archer')specifications.push(['string-nock',1,.453,-.14,.13]);
 for(const [name,parent,x,y,z] of specifications as [string,number,number,number,number][]) {
   const node=new TransformNode(name,scene);node.position.set(x,y,z);node.rotationQuaternion=Quaternion.Identity();node.parent=parent<0?root:joints[parent];
   const bone=new Bone(name,skeleton,parent<0?null:bones[parent],Matrix.Translation(x,y,z));bone.linkTransformNode(node);joints.push(node);bones.push(bone);
 }
 for(const part of root.getChildMeshes().filter((m):m is Mesh=>m instanceof Mesh)) {
   const p=part.position;let index=1;
   if(hero){if(Math.abs(p.x)>.4)index=p.x<0?3:4;else if(p.y>1.4)index=2;else if(p.y<.6)index=p.x<0?5:6;}
   else {if(Math.abs(p.x)>.4)index=p.x<0?3:4;else if(p.y>1.2)index=2;else if(p.y<.3&&Math.abs(p.x)>.1)index=p.x<0?5:6;}
   if(part.metadata?.bone!==undefined)index=part.metadata.bone;
   const indices:number[]=[],weights:number[]=[];for(let vertex=0;vertex<part.getTotalVertices();vertex++){const assigned=part.metadata?.bowString&&Math.abs(part.getVerticesData(VertexBuffer.PositionKind)![vertex*3+1]-.91)<.06?13:index;indices.push(assigned,0,0,0);weights.push(1,0,0,0)}
   part.setVerticesData(VertexBuffer.MatricesIndicesKind,indices);part.setVerticesData(VertexBuffer.MatricesWeightsKind,weights);
 }
 factory.mergeActor(root);for(const mesh of root.getChildMeshes()){mesh.skeleton=skeleton;mesh.numBoneInfluencers=4;}
 // Offline two-bone arm IK: wrists actually reach the nock/grip, not an arm-wave.
 function archerTracks(group:AnimationGroup,length:number,action:boolean){
  if(!hero||asset.id!=='archer')return;
  const entries=(joint:number,property:string)=>group.targetedAnimations.find(t=>t.target===joints[joint]&&t.animation.targetProperty===property);
  const track=(joint:number,property:string,values:(Quaternion|Vector3)[])=>{let entry=entries(joint,property);if(!entry){const animation=new Animation(group.name+'-'+joint+'-'+property,property,30,property==='position'?Animation.ANIMATIONTYPE_VECTOR3:Animation.ANIMATIONTYPE_QUATERNION,Animation.ANIMATIONLOOPMODE_CYCLE);animation.setKeys(values.map((value,frame)=>({frame,value})));group.addTargetedAnimation(animation,joints[joint]);entry=entries(joint,property)!;}entry.animation.setKeys(values.map((value,frame)=>({frame,value})));};
  const mix=(points:Vector3[],t:number)=>{const u=t*(points.length-1),i=Math.min(points.length-2,Math.floor(u)),f=u-i;return Vector3.Lerp(points[i],points[i+1],f*f*(3-2*f));};
  const v=(x:number,y:number,z:number)=>new Vector3(x,y,z);
  const lower=[v(-.05,-.12,.02),v(.05,-.12,.02)];
  const aim=(from:Vector3,to:Vector3)=>Quaternion.FromUnitVectorsToRef(from.normalizeToNew(),to.normalizeToNew(),Quaternion.Identity());
  const solve=(shoulder:Vector3,wrist:Vector3,side:number)=>{const delta=wrist.subtract(shoulder),distance=Math.min(.331,Math.max(.07,delta.length())),direction=delta.normalizeToNew(),l1=.2,l2=lower[side].length();const cosine=Math.max(-1,Math.min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance)));let bend=Vector3.Down().subtract(direction.scale(Vector3.Dot(Vector3.Down(),direction)));if(bend.length()<.01)bend=v(side===0?-.5:.5,0,-1);bend.normalize();const elbow=shoulder.add(direction.scale(l1*cosine)).add(bend.scale(l1*Math.sqrt(1-cosine*cosine)));const upper=aim(v(0,-.2,0),elbow.subtract(shoulder)),foreGlobal=aim(lower[side],wrist.subtract(elbow));return{upper,elbow:Quaternion.Inverse(upper).multiply(foreGlobal),foreGlobal};};
  const leftS=[v(-.43,.18,0),v(-.20,.18,.34),v(-.20,.18,.34),v(-.20,.18,.34),v(-.22,.18,.31),v(-.36,.18,.08),v(-.43,.18,0)];
  const rightS=[v(.43,.18,0),v(.22,.18,.32),v(.22,.18,.32),v(.22,.18,.32),v(.24,.18,.30),v(.38,.18,.08),v(.43,.18,0)];
  const leftW=[v(-.48,-.14,.02),v(.04,.09,.523),v(.04,.09,.32),v(.04,.09,.25),v(.015,.07,.27),v(-.28,-.04,.12),v(-.48,-.14,.02)];
  const rightW=[v(.48,-.14,.02),v(.15,.09,.55),v(.15,.09,.55),v(.15,.09,.55),v(.15,.085,.53),v(.38,-.055,.14),v(.48,-.14,.02)];
  const yaws=[0,-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2,-.35,0];
  const values=new Map<string,(Quaternion|Vector3)[]>();const push=(joint:number,property:string,value:Quaternion|Vector3)=>{const key=joint+':'+property;if(!values.has(key))values.set(key,[]);values.get(key)!.push(value);};
  for(let frame=0;frame<=length;frame++){
   const t=frame/length;let wrist:Vector3,desired:Quaternion;
   if(action){const ls=mix(leftS,t),rs=mix(rightS,t),lw=mix(leftW,t),rw=mix(rightW,t),left=solve(ls,lw,0),right=solve(rs,rw,1);const u=t*6,i=Math.min(5,Math.floor(u)),f=u-i,yaw=yaws[i]+(yaws[i+1]-yaws[i])*f*f*(3-2*f);desired=Quaternion.RotationYawPitchRoll(yaw,0,0);wrist=rw;
    push(3,'position',ls);push(4,'position',rs);push(3,'rotationQuaternion',left.upper);push(4,'rotationQuaternion',right.upper);push(7,'rotationQuaternion',left.elbow);push(8,'rotationQuaternion',right.elbow);push(11,'rotationQuaternion',Quaternion.Inverse(left.foreGlobal));push(12,'rotationQuaternion',Quaternion.Inverse(right.foreGlobal).multiply(desired));
    const released=wrist.add(Vector3.TransformCoordinates(v(-.027,0,.11),Matrix.FromQuaternionToRef(desired,Matrix.Identity())));
    // Nock follows the pulling hand only while held; it springs forward on release.
    const release=Math.max(0,Math.min(1,(t-1/3)/(1/6))),draw=t>=1/6&&t<=1/3?1:t>1/3&&t<1/2?1-release*release*(3-2*release):0;const nock=Vector3.Lerp(released,lw,draw);push(13,'position',nock);push(13,'rotationQuaternion',desired);
   }else{
    const shoulder=(entries(4,'position')!.animation.getKeys()[frame].value as Vector3),upper=(entries(4,'rotationQuaternion')!.animation.getKeys()[frame].value as Quaternion),elbow=(entries(8,'rotationQuaternion')!.animation.getKeys()[frame].value as Quaternion),fore=upper.multiply(elbow),w=(entries(12,'rotationQuaternion')!.animation.getKeys()[frame].value as Quaternion);desired=fore.multiply(w);wrist=shoulder.add(Vector3.TransformCoordinates(v(0,-.2,0),Matrix.FromQuaternionToRef(upper,Matrix.Identity()))).add(Vector3.TransformCoordinates(lower[1],Matrix.FromQuaternionToRef(fore,Matrix.Identity())));push(13,'position',wrist.add(Vector3.TransformCoordinates(v(-.027,0,.11),Matrix.FromQuaternionToRef(desired,Matrix.Identity()))));push(13,'rotationQuaternion',desired);
   }
  }
  for(const [key,data] of values){const [joint,property]=key.split(':');track(Number(joint),property,data);}
 }
 function clip(name:string,length:number,poses:Record<number,[number,number,number][]>){
   // Seven authored beats: rest, anticipation, loaded pose, impact, follow-through,
   // settle, rest. Distinct class body mechanics, not a shared arms-up gesture.
   const action=hero&&['attack','attack-heavy','skill','skill-ultimate'].includes(name);
   const ultimate=name==='skill-ultimate',heavy=name==='attack-heavy'||ultimate;let wristDesired:number[]|undefined;
   if(action){
    if(asset.id==='swordsman'){
     poses[1]=[[0,0,0],[-.12,-.38,-.06],[-.2,heavy?-.65:-.42,-.08],[heavy?.27:.12,.5,.07],[.12,.3,.04],[-.03,.08,0],[0,0,0]];
     poses[4]=[[0,0,0],[-.8,-.12,.3],[ultimate?-2.3:-1.65,-.2,.75],[.3,.15,.45],[.8,.25,.3],[.14,.04,0],[0,0,0]];
     poses[3]=[[0,0,0],[-.45,.15,.2],[ultimate?-1.9:-.8,.15,ultimate?.66:.2],[.05,-.1,.35],[.2,0,.1],[.08,0,.02],[0,0,0]];
     poses[7]=[[.1,0,0],[.2,0,0],[ultimate?.58:.3,0,0],[.18,0,0],[.1,0,0],[.12,0,0],[.1,0,0]];
     poses[8]=[[.1,0,0],[.3,0,0],[ultimate?.6:.4,0,0],[-.15,0,0],[.15,0,0],[.15,0,0],[.1,0,0]];
     poses[5]=[[0,0,0],[.12,0,-.06],[.19,0,-.1],[-.25,0,-.08],[-.14,0,-.04],[.02,0,0],[0,0,0]];
     poses[6]=[[0,0,0],[-.12,0,.06],[-.22,0,.1],[.21,0,.08],[.14,0,.04],[.01,0,0],[0,0,0]];
    }else if(asset.id==='mage'){
     poses[1]=[[0,0,0],[.08,-.18,-.04],[.12,-.3,-.06],[-.13,.28,.06],[-.05,.15,.03],[.02,.03,0],[0,0,0]];
     poses[4]=[[0,0,0],[-.3,-.12,.14],[ultimate?-1.35:-.65,-.2,.24],[ultimate?-1.65:-1.05,.22,.14],[-.8,.2,.18],[-.16,.03,.04],[0,0,0]];
     poses[3]=[[0,0,0],[-.42,.4,-.4],[-.85,.65,-.7],[-1.05,-.35,-.3],[-.52,-.5,.18],[-.12,-.1,-.03],[0,0,0]];
     poses[7]=[[.1,0,0],[.45,0,0],[.7,0,0],[-.15,0,0],[.25,0,0],[.15,0,0],[.1,0,0]];
     poses[8]=[[.1,0,0],[.18,0,0],[.4,0,0],[.12,0,0],[.25,0,0],[.14,0,0],[.1,0,0]];
     poses[2]=[[0,0,0],[.08,.15,0],[.1,.22,0],[-.12,-.18,0],[-.04,-.1,0],[.02,0,0],[0,0,0]];
    }else{
     // Bow is carried in the right hand; left elbow draws across the chest.
     poses[1]=[[0,0,0],[.06,-.25,-.04],[ultimate?.14:.07,-.45,-.07],[-.06,-.34,.04],[-.03,-.12,.02],[.02,0,0],[0,0,0]];
     poses[4]=[[0,0,0],[-.8,-.25,-.08],[-1.4,-.3,-.08],[-1.35,-.3,-.08],[-.85,-.2,-.05],[-.12,0,0],[0,0,0]];
     poses[3]=[[0,0,0],[-.6,-.7,.3],[-1.15,-1.05,.72],[-.72,-1.15,.9],[-.35,-.5,.36],[-.08,-.1,.08],[0,0,0]];
     poses[7]=[[.1,0,0],[.6,0,0],[1.3,0,0],[.15,0,0],[.2,0,0],[.12,0,0],[.1,0,0]];
     poses[8]=[[.1,0,0],[.18,0,0],[.05,0,0],[.04,0,0],[.14,0,0],[.12,0,0],[.1,0,0]];
     poses[5]=[[0,0,0],[.1,0,-.04],[ultimate?.38:.16,0,-.07],[ultimate?.35:.12,0,-.06],[.08,0,-.03],[.01,0,0],[0,0,0]];
     poses[6]=[[0,0,0],[-.08,0,.04],[ultimate?-.24:-.1,0,.07],[-.12,0,.06],[-.05,0,.03],[0,0,0],[0,0,0]];
     poses[2]=[[0,0,0],[0,.22,0],[.04,.4,0],[0,.3,0],[0,.1,0],[0,0,0],[0,0,0]];
    }
    poses[9]=[[.04,0,0],[.12,0,0],[ultimate?.4:.24,0,0],[.18,0,0],[.12,0,0],[.06,0,0],[.04,0,0]];
    poses[10]=[[.04,0,0],[.15,0,0],[ultimate?.32:.25,0,0],[.28,0,0],[.16,0,0],[.07,0,0],[.04,0,0]];
    // Wrist keeps the held prop oriented independently of bent elbow/short arms.
    // Blade: high loaded silhouette -> broad forward-down cutting arc.
    // Staff and bow: remain upright while shoulder reaches and free hand draws.
    const desired=asset.id==='swordsman'?[0,-.15,-.1,1.05,1.65,.3,0]:asset.id==='mage'?[0,.12,ultimate?-.1:.05,ultimate?-.08:.25,.12,.04,0]:[0,0,0,0,.08,.02,0];
    wristDesired=desired;
    poses[12]=poses[4].map((v,i)=>[-v[0]-poses[8][i][0]+desired[i],0,0]);
    poses[11]=poses[3].map((v,i)=>[-v[0]-poses[7][i][0]+(asset.id==='archer'?-.1:0),0,0]);

   }

   if(hero){poses[7]=poses[7]||[[.08,0,0],[.22,0,0],[.08,0,0]];poses[8]=poses[8]||[[.08,0,0],[.25,0,0],[.08,0,0]];if(name==='walk'||name==='run'){poses[9]=[[.08,0,0],[.55,0,0],[.08,0,0],[.03,0,0],[.08,0,0]];poses[10]=[[.08,0,0],[.03,0,0],[.08,0,0],[.55,0,0],[.08,0,0]];}}
   const group=new AnimationGroup(name,scene);
   for(let index=0;index<joints.length;index++){
    const values=poses[index]||[[0,0,0],[0,0,0]];
    const animation=new Animation(name+'-'+joints[index].name,'rotationQuaternion',30,Animation.ANIMATIONTYPE_QUATERNION,Animation.ANIMATIONLOOPMODE_CYCLE);
    let rotations=values.map(([x,y,z])=>Quaternion.RotationYawPitchRoll(y,x,z));
    if(hero&&action&&index===12&&wristDesired)rotations=poses[4].map(([x,y,z],i)=>{const upper=Quaternion.RotationYawPitchRoll(y,x,z),[ex,ey,ez]=poses[8][i],forearm=Quaternion.RotationYawPitchRoll(ey,ex,ez);return Quaternion.Inverse(upper.multiply(forearm)).multiply(Quaternion.RotationYawPitchRoll(0,wristDesired![i],0));});
    // Dense smoothstep samples retain eased anticipation and recovery in GLTF.
    animation.setKeys(Array.from({length:length+1},(_,frame)=>{
     const tGlobal=frame/length;
     if(hero&&index===12){
      const sample=(bone:number)=>{const source=poses[bone]||[[0,0,0],[0,0,0]],u=tGlobal*(source.length-1),i=Math.min(source.length-2,Math.floor(u)),t=u-i,e=t*t*(3-2*t);const [ax,ay,az]=source[i],[bx,by,bz]=source[i+1];return Quaternion.Slerp(Quaternion.RotationYawPitchRoll(ay,ax,az),Quaternion.RotationYawPitchRoll(by,bx,bz),e);};
      const desired=wristDesired||[0,0],u=tGlobal*(desired.length-1),i=Math.min(desired.length-2,Math.floor(u)),t=u-i,e=t*t*(3-2*t),pitch=desired[i]+(desired[i+1]-desired[i])*e;
      return{frame,value:Quaternion.Inverse(sample(4).multiply(sample(8))).multiply(Quaternion.RotationYawPitchRoll(0,pitch,0))};
     }
     const u=tGlobal*(rotations.length-1),i=Math.min(rotations.length-2,Math.floor(u)),t=u-i,e=t*t*(3-2*t);return {frame,value:Quaternion.Slerp(rotations[i],rotations[i+1],e)};
    }));
    group.addTargetedAnimation(animation,joints[index]);
   }
   if(hero){
    const clearance=action&&asset.id==='swordsman';const shifts=clearance?[0,.04,.12,.07,.045,.015,0]:[0,0,0,0,0,0,0];const base=joints[4].position.clone();
    const place=new Animation(name+'-shoulder-clearance','position',30,Animation.ANIMATIONTYPE_VECTOR3,Animation.ANIMATIONLOOPMODE_CYCLE);
    place.setKeys(Array.from({length:length+1},(_,frame)=>{const u=frame/length*6,i=Math.min(5,Math.floor(u)),t=u-i,e=t*t*(3-2*t);return{frame,value:base.add(new Vector3(shifts[i]+(shifts[i+1]-shifts[i])*e,0,clearance?.015*Math.sin(frame/length*Math.PI):0))};}));group.addTargetedAnimation(place,joints[4]);
   }
   if(hero){
    const base=new Vector3(0,.68,0);
    const offsets:Vector3[]=name==='death'?[Vector3.Zero(),new Vector3(-.04,-.08,0),new Vector3(-.12,-.44,0)]:action?[Vector3.Zero(),new Vector3(-.025,-.009,-.025),new Vector3(-.045,-.015,-.04),new Vector3(.045,-.007,.055),new Vector3(.025,.009,.025),new Vector3(-.006,.002,-.003),Vector3.Zero()]:name==='walk'||name==='run'?[Vector3.Zero(),new Vector3(.022,.022,0),Vector3.Zero(),new Vector3(-.022,.022,0),Vector3.Zero()]:[Vector3.Zero(),new Vector3(0,.008,0),Vector3.Zero()];
    const weight=new Animation(name+'-weight','position',30,Animation.ANIMATIONTYPE_VECTOR3,Animation.ANIMATIONLOOPMODE_CYCLE);
    weight.setKeys(Array.from({length:length+1},(_,frame)=>{const u=frame/length*(offsets.length-1),i=Math.min(offsets.length-2,Math.floor(u)),t=u-i,e=t*t*(3-2*t);return {frame,value:base.add(Vector3.Lerp(offsets[i],offsets[i+1],e))};}));group.addTargetedAnimation(weight,joints[0]);
   }
   archerTracks(group,length,action);group.normalize(0,length);return group;
 }
 clip('idle',60,{1:[[0,0,-.025],[0,0,.025],[0,0,-.025]],2:[[0,.035,0],[0,-.035,0],[0,.035,0]]});
 clip('walk',30,{3:[[.4,0,.03],[-.4,0,.03],[.4,0,.03]],4:[[-.4,0,-.03],[.4,0,-.03],[-.4,0,-.03]],5:[[-.65,0,0],[.65,0,0],[-.65,0,0]],6:[[.65,0,0],[-.65,0,0],[.65,0,0]],1:[[0,0,-.05],[0,0,.05],[0,0,-.05]]});
 clip('attack',15,hero&&asset.id==='archer'?{3:[[0,0,0],[-1.1,-.4,-.05],[-1.1,-.4,-.05],[0,0,0]],4:[[0,0,0],[-1,.7,.2],[-.6,.9,.1],[0,0,0]],1:[[0,0,0],[0,-.15,0],[0,.08,0],[0,0,0]]}:hero&&asset.id==='mage'?{4:[[0,0,0],[-.7,0,.2],[-1.1,0,.1],[0,0,0]],3:[[0,0,0],[-.3,0,-.2],[-.65,0,-.3],[0,0,0]],1:[[0,0,0],[-.08,0,0],[.05,0,0],[0,0,0]]}:{4:[[0,0,0],[-1.35,0,-.3],[.75,0,.2],[0,0,0]],1:[[0,0,0],[0,-.35,0],[0,.35,0],[0,0,0]]});
 clip('skill',30,hero&&asset.id==='archer'?{3:[[0,0,0],[-1.2,-.35,0],[-1.2,-.35,0],[0,0,0]],4:[[0,0,0],[-1,.85,.15],[-.65,1,.1],[0,0,0]],2:[[0,0,0],[0,-.15,0],[0,-.15,0],[0,0,0]]}:{3:[[0,0,0],[-1.5,0,-.45],[-1.5,0,-.45],[0,0,0]],4:[[0,0,0],[-1.5,0,.45],[-1.5,0,.45],[0,0,0]],2:[[0,0,0],[-.15,0,0],[-.15,0,0],[0,0,0]]});
 clip('run',18,{1:[[.08,0,-.05],[.12,0,.05],[.08,0,-.05]],3:[[.65,0,.05],[-.65,0,.05],[.65,0,.05]],4:[[-.65,0,-.05],[.65,0,-.05],[-.65,0,-.05]],5:[[-.85,0,0],[.85,0,0],[-.85,0,0]],6:[[.85,0,0],[-.85,0,0],[.85,0,0]]});
 clip('attack-heavy',27,{1:[[0,0,0],[-.12,-.5,-.08],[.1,.6,.06],[0,0,0]],4:[[0,0,0],[-1.6,-.35,-.25],[.55,.25,.1],[0,0,0]],3:[[0,0,0],[-.4,0,.25],[.2,0,.1],[0,0,0]],2:[[0,0,0],[.1,.15,0],[-.06,-.1,0],[0,0,0]]});
 clip('skill-heal',36,{3:[[0,0,0],[-.8,-.3,-.4],[-1.1,.15,-.25],[0,0,0]],4:[[0,0,0],[-.8,.3,.4],[-1.1,-.15,.25],[0,0,0]],1:[[0,0,0],[-.07,0,0],[.04,0,0],[0,0,0]],2:[[0,0,0],[.15,0,0],[-.15,0,0],[0,0,0]]});
 clip('skill-guard',30,{3:[[0,0,0],[-1.1,-.3,-.2],[-1.1,-.3,-.2],[0,0,0]],4:[[0,0,0],[-.85,.3,.2],[-.85,.3,.2],[0,0,0]],1:[[0,0,0],[.12,0,0],[.08,0,0],[0,0,0]]});
 clip('skill-ultimate',42,{1:[[0,0,0],[.14,-.3,0],[-.12,.2,0],[.08,.4,0],[0,0,0]],3:[[0,0,0],[-.4,0,-.3],[-1.7,0,-.7],[-.8,0,-.3],[0,0,0]],4:[[0,0,0],[-.5,0,.3],[-1.9,0,.7],[.4,.4,.2],[0,0,0]],2:[[0,0,0],[.2,0,0],[-.2,0,0],[.04,0,0],[0,0,0]]});
 clip('hurt',12,{1:[[0,0,0],[.2,0,-.18],[-.08,0,.15],[0,0,0]]});
 clip('death',24,{0:[[0,0,0],[0,0,-.4],[0,0,-1.57]],3:[[0,0,0],[0,0,.4],[0,0,.4]],4:[[0,0,0],[0,0,-.4],[0,0,-.4]]});
 // Offline foot plant: sample the actual skinned boot vertices, not guessed pivots.
 // Adjust only the animated hips; gameplay root and collision remain untouched.
 if(hero){
  const rest=joints.map(j=>j.position.clone()),meshes=root.getChildMeshes().filter((m):m is Mesh=>m instanceof Mesh);
  for(const group of scene.animationGroups){
   const hip=group.targetedAnimations.find(t=>t.target===joints[0]&&t.animation.targetProperty==='position')!;
   const keys=hip.animation.getKeys();
   for(let frame=0;frame<keys.length;frame++){
    joints.forEach((j,i)=>{j.position.copyFrom(rest[i]);j.rotationQuaternion=Quaternion.Identity();});
    for(const entry of group.targetedAnimations){const key=entry.animation.getKeys()[frame];if(entry.animation.targetProperty==='position')entry.target.position.copyFrom(key.value);else entry.target.rotationQuaternion=key.value.clone();}
    skeleton.prepare(true);let minimum=Infinity;
    for(const mesh of meshes){const points=mesh.getPositionData(true,false),indices=mesh.getVerticesData(VertexBuffer.MatricesIndicesKind)!;if(!points)continue;for(let v=0;v<points.length/3;v++)if(group.name==='death'||indices[v*4]===9||indices[v*4]===10)minimum=Math.min(minimum,points[v*3+1]);}
    if(Number.isFinite(minimum))keys[frame].value.y+=.003-minimum;
   }
   hip.animation.setKeys(keys);
  }
  joints.forEach((j,i)=>{j.position.copyFrom(rest[i]);j.rotationQuaternion=Quaternion.Identity();});
 }
 for(const mesh of scene.meshes)mesh.computeWorldMatrix(true);skeleton.prepare(true);
 const exported=await GLTF2Export.GLBAsync(scene,asset.id,{exportWithoutWaitingForScene:true});
 const file=exported.glTFFiles[asset.id+'.glb'] as Blob;const data=new Uint8Array(await file.arrayBuffer());await writeFile('public/models/'+asset.id+'.glb',data);
 manifest[asset.id]={file:'/models/'+asset.id+'.glb',bytes:data.byteLength,type:asset.type,joints:joints.length,clips:['idle','walk','run','attack','attack-heavy','skill','skill-heal','skill-guard','skill-ultimate','hurt','death'],origin:'original project-authored procedural mesh and rig',units:'meters',forward:'+Z',materials:1,artRevision:asset.id==='archer'?'chibi-rounded-6-archery-ik':'chibi-rounded-5-clearance-grounded',style:'smooth pastel chibi, original authored geometry'};
 scene.dispose();
}
engine.dispose();await writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2));console.log('Authored '+Object.keys(manifest).length+' rigged GLBs with eleven animation clips.');
