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
import { Primitives } from '../src/render/primitives';
import { buildPlayer,creature } from '../src/render/procedural';
import { classes,type ClassId } from '../src/game/classes';
import { species,type Kind } from '../src/game/content';
import {mkdir,writeFile} from 'node:fs/promises';
const engine=new NullEngine({renderWidth:256,renderHeight:256,textureSize:256,deterministicLockstep:true,lockstepMaxSteps:4});
await mkdir('public/models',{recursive:true});
const manifest:Record<string,unknown>={};
for(const asset of [...Object.keys(classes).map(id=>({id,type:'hero' as const})),...Object.keys(species).map(id=>({id,type:'monster' as const}))]) {
 const scene=new Scene(engine);scene.useRightHandedSystem=true;const factory=new Primitives(scene);
 const hero=asset.type==='hero',root=hero?factory.group('character-root'):creature(factory,asset.id as Kind);
 if(hero)buildPlayer(factory,root,asset.id as ClassId);root.name=asset.id;
 const skeleton=new Skeleton(asset.id+'-skeleton',asset.id,scene),joints:TransformNode[]=[],bones:Bone[]=[];
 const specifications=hero?[['hips',-1,0,.68,0],['spine',0,0,.37,0],['head',1,0,.5,0],['left-hand',1,-.43,.18,0],['right-hand',1,.43,.18,0],['left-leg',0,-.19,0,0],['right-leg',0,.19,0,0]]:[['hips',-1,0,.3,0],['spine',0,0,.4,0],['head',1,0,.55,0],['left-hand',1,-.5,.3,0],['right-hand',1,.5,.3,0],['left-leg',0,-.22,0,0],['right-leg',0,.22,0,0]];
 for(const [name,parent,x,y,z] of specifications as [string,number,number,number,number][]) {
   const node=new TransformNode(name,scene);node.position.set(x,y,z);node.rotationQuaternion=Quaternion.Identity();node.parent=parent<0?root:joints[parent];
   const bone=new Bone(name,skeleton,parent<0?null:bones[parent],Matrix.Translation(x,y,z));bone.linkTransformNode(node);joints.push(node);bones.push(bone);
 }
 for(const part of root.getChildMeshes().filter((m):m is Mesh=>m instanceof Mesh)) {
   const p=part.position;let index=1;
   if(hero){if(Math.abs(p.x)>.4)index=p.x<0?3:4;else if(p.y>1.4)index=2;else if(p.y<.6)index=p.x<0?5:6;}
   else {if(Math.abs(p.x)>.4)index=p.x<0?3:4;else if(p.y>1.2)index=2;else if(p.y<.3&&Math.abs(p.x)>.1)index=p.x<0?5:6;}
   const indices:number[]=[],weights:number[]=[];for(let vertex=0;vertex<part.getTotalVertices();vertex++){indices.push(index,0,0,0);weights.push(1,0,0,0)}
   part.setVerticesData(VertexBuffer.MatricesIndicesKind,indices);part.setVerticesData(VertexBuffer.MatricesWeightsKind,weights);
 }
 factory.mergeActor(root);for(const mesh of root.getChildMeshes()){mesh.skeleton=skeleton;mesh.numBoneInfluencers=4;}
 function clip(name:string,length:number,poses:Record<number,[number,number,number][]>){
   const group=new AnimationGroup(name,scene);
   for(let index=0;index<joints.length;index++){
    const values=poses[index]||[[0,0,0],[0,0,0]];
    const animation=new Animation(name+'-'+joints[index].name,'rotationQuaternion',30,Animation.ANIMATIONTYPE_QUATERNION,Animation.ANIMATIONLOOPMODE_CYCLE);
    animation.setKeys(values.map(([x,y,z],i)=>({frame:i*length/(values.length-1),value:Quaternion.RotationYawPitchRoll(y,x,z)})));
    group.addTargetedAnimation(animation,joints[index]);
   }
   group.normalize(0,length);return group;
 }
 clip('idle',60,{1:[[0,0,-.025],[0,0,.025],[0,0,-.025]],2:[[0,.035,0],[0,-.035,0],[0,.035,0]]});
 clip('walk',24,{3:[[.4,0,.03],[-.4,0,.03],[.4,0,.03]],4:[[-.4,0,-.03],[.4,0,-.03],[-.4,0,-.03]],5:[[-.65,0,0],[.65,0,0],[-.65,0,0]],6:[[.65,0,0],[-.65,0,0],[.65,0,0]],1:[[0,0,-.05],[0,0,.05],[0,0,-.05]]});
 clip('attack',15,{4:[[0,0,0],[-1.35,0,-.3],[.75,0,.2],[0,0,0]],1:[[0,0,0],[0,-.35,0],[0,.35,0],[0,0,0]]});
 clip('skill',30,{3:[[0,0,0],[-1.5,0,-.45],[-1.5,0,-.45],[0,0,0]],4:[[0,0,0],[-1.5,0,.45],[-1.5,0,.45],[0,0,0]],2:[[0,0,0],[-.15,0,0],[-.15,0,0],[0,0,0]]});
 clip('hurt',12,{1:[[0,0,0],[.2,0,-.18],[-.08,0,.15],[0,0,0]]});
 clip('death',24,{0:[[0,0,0],[0,0,-.4],[0,0,-1.57]],3:[[0,0,0],[0,0,.4],[0,0,.4]],4:[[0,0,0],[0,0,-.4],[0,0,-.4]]});
 for(const mesh of scene.meshes)mesh.computeWorldMatrix(true);skeleton.prepare();
 const exported=await GLTF2Export.GLBAsync(scene,asset.id,{exportWithoutWaitingForScene:true});
 const file=exported.glTFFiles[asset.id+'.glb'] as Blob;const data=new Uint8Array(await file.arrayBuffer());await writeFile('public/models/'+asset.id+'.glb',data);
 manifest[asset.id]={file:'/models/'+asset.id+'.glb',bytes:data.byteLength,type:asset.type,joints:7,clips:['idle','walk','attack','skill','hurt','death'],origin:'original project-authored procedural mesh and rig',units:'meters',forward:'+Z',materials:1};
 scene.dispose();
}
engine.dispose();await writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2));console.log('Authored '+Object.keys(manifest).length+' rigged GLBs with six animation clips.');
