import '@babylonjs/loaders/glTF';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import type {PBRMaterial} from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type {Material} from '@babylonjs/core/Materials/material';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import type {Scene} from '@babylonjs/core/scene';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import type {AnimationGroup} from '@babylonjs/core/Animations/animationGroup';
export type Motion='idle'|'walk'|'run'|'attack'|'attack-heavy'|'skill'|'skill-heal'|'skill-guard'|'skill-ultimate'|'hurt'|'death';
export type SkillMotionContext={stage:number;effect:string;phase:'anticipation'|'release'|'recovery';progress:number;job?:string;branch?:number};
/** One downloaded mesh/rig per kind; instances have independent skeletons and clips. */
export class ModelLibrary {
 private cache=new Map<string,Promise<AssetContainer>>();
 private actors=new Map<TransformNode,{clips:Map<string,AnimationGroup>;motion:Motion;remaining:number;hp:number;suspended:boolean;skillMotion?:SkillMotionContext|null}>();
 private low=false;private originals=new Map<AbstractMesh,Material>();private vertexColors=new Map<AbstractMesh,{linear:number[];gamma:number[];stride:number}>();private simple=new Map<Material,StandardMaterial>();
 private closed=false;loaded=0;errors=0;
 get active(){return this.actors.size}
 constructor(private scene:Scene){}
 attach(id:string,target:TransformNode,decorate:(root:TransformNode)=>void=()=>{}) {
  let promise=this.cache.get(id);if(!promise){promise=LoadAssetContainerAsync('/models/'+id+'.glb',this.scene,{pluginOptions:{gltf:{animationStartMode:0}}}).then(container=>{container.animationGroups.forEach(g=>g.stop());return container;});this.cache.set(id,promise);}
  const fallback=target.getChildMeshes();
  void promise.then(container=>{
   if(this.closed||target.isDisposed())return;
   const instance=container.instantiateModelsToScene(name=>id+'-'+name,false,{doNotInstantiate:true});
   for(const root of instance.rootNodes)root.parent=target;
   for(const mesh of fallback)mesh.dispose();
   target.scaling.setAll(1);
   const clips=new Map(instance.animationGroups.map(g=>[g.name.replace(/^.*-(idle|walk|run|attack-heavy|attack|skill-ultimate|skill-guard|skill-heal|skill|hurt|death)$/,'$1'),g]));
   for(const group of clips.values())for(const entry of group.targetedAnimations){entry.animation.enableBlending=true;entry.animation.blendingSpeed=.16;}
   this.actors.set(target,{clips,motion:'idle',remaining:0,hp:NaN,suspended:false});if(target.isEnabled())clips.get('idle')?.start(true);
   const actorMeshes=target.getChildMeshes();
   for(const mesh of actorMeshes)if(mesh.material?.getClassName()==='PBRMaterial'){this.originals.set(mesh,mesh.material);this.applyMaterial(mesh,mesh.material);}
   this.loaded++;decorate(target);
   target.onDisposeObservable.addOnce(()=>{this.actors.delete(target);for(const mesh of actorMeshes){this.originals.delete(mesh);this.vertexColors.delete(mesh);}instance.dispose();});
  }).catch(()=>{if(!this.closed)this.errors++;});
 }
 setSkillMotion(target:TransformNode,context:SkillMotionContext|null){const actor=this.actors.get(target);if(actor){if(!context&&actor.skillMotion)actor.remaining=0;actor.skillMotion=context;}}
 animate(target:TransformNode,moving:boolean,hp:number,action:boolean,casting:boolean,dt:number,visible=true) {
  const actor=this.actors.get(target);if(!actor)return;
  const active=target.isEnabled()&&visible;
  if(!active){if(!actor.suspended){actor.clips.forEach(g=>g.stop());actor.suspended=true;}return;}
  if(actor.suspended){actor.suspended=false;actor.clips.get(actor.motion)?.start(actor.motion==='idle'||actor.motion==='walk');}
  const damaged=hp<actor.hp;actor.hp=hp;actor.remaining=Math.max(0,actor.remaining-dt);
  const context=actor.skillMotion;
  const skillMotion:Motion=context?.stage&&context.stage>=8?'skill-ultimate':context?.effect==='heal'?'skill-heal':context?.effect==='guard'?'skill-guard':context?.job==='swordsman'&&context.stage>=4?'attack-heavy':'skill';
  const next:Motion=hp<=0?'death':damaged?'hurt':casting?skillMotion:context?skillMotion:action?'attack':actor.remaining>0?actor.motion:moving?'walk':'idle';
  if(next===actor.motion)return;
  actor.clips.forEach(g=>g.stop());actor.motion=next;
  actor.remaining=next==='hurt'?.32:next==='attack'?.45:next.startsWith('skill')?1.2:next==='attack-heavy'?.9:0;
  actor.clips.get(next)?.start(next==='idle'||next==='walk');
 }
 setLowQuality(low:boolean){this.low=low;for(const [mesh,original] of this.originals){if(mesh.isDisposed()){this.originals.delete(mesh);continue;}this.applyMaterial(mesh,original);}}
 private applyMaterial(mesh:AbstractMesh,original:Material){
  if(!this.low){if(mesh.material!==original){const colors=this.vertexColors.get(mesh);if(colors)mesh.setVerticesData('color',colors.linear,false,colors.stride);}mesh.material=original;return;}
  let material=this.simple.get(original);
  if(!material){const pbr=original as PBRMaterial;material=new StandardMaterial('low-'+original.name,this.scene);material.diffuseColor=pbr.albedoColor.toGammaSpace();material.emissiveColor=pbr.emissiveColor.toGammaSpace();material.specularColor=Color3.Black();material.alpha=pbr.alpha;material.backFaceCulling=pbr.backFaceCulling;material.maxSimultaneousLights=2;this.simple.set(original,material);}
  if(mesh.material!==material){
   // GLTF/PBR vertex colors are linear; StandardMaterial consumes gamma colors.
   let colors=this.vertexColors.get(mesh);const buffer=mesh.getVerticesData('color');
   if(!colors&&buffer){if(mesh instanceof Mesh)mesh.makeGeometryUnique();const stride=mesh.getVertexBuffer('color')!.getSize(),linear=Array.from(buffer),gamma=linear.map((v,i)=>i%stride===3?v:Math.pow(v,1/2.2));colors={linear,gamma,stride};this.vertexColors.set(mesh,colors);}
   if(colors)mesh.setVerticesData('color',colors.gamma,false,colors.stride);
  }
  mesh.material=material;
 }
 dispose(){this.closed=true;this.actors.clear();this.cache.forEach(p=>void p.then(c=>c.dispose()).catch(()=>{}));this.cache.clear();this.originals.clear();this.vertexColors.clear();this.simple.forEach(m=>m.dispose());this.simple.clear();}
}
