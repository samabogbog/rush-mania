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
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import type {AnimationGroup} from '@babylonjs/core/Animations/animationGroup';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {skillPose,type ChoreographyContext} from './skill-choreography';
import {MODEL_ASSET_REVISIONS} from './model-revisions';
export type Motion='idle'|'walk'|'run'|'attack'|'attack-heavy'|'skill'|'skill-heal'|'skill-guard'|'skill-ultimate'|'hurt'|'death';
export type SkillMotionContext=ChoreographyContext;
/** One downloaded mesh/rig per kind; instances have independent skeletons and clips. */
export class ModelLibrary {
 private cache=new Map<string,Promise<AssetContainer>>();
 private actors=new Map<TransformNode,{clips:Map<string,AnimationGroup>;motion:Motion;remaining:number;hp:number;suspended:boolean;pivot:TransformNode;clipKey:string;modelId:string;skillMotion?:SkillMotionContext|null}>();
 private low=false;private originals=new Map<AbstractMesh,Material>();private vertexColors=new Map<AbstractMesh,{linear:number[];gamma:number[];stride:number}>();private simple=new Map<Material,Material>();
 private closed=false;loaded=0;errors=0;
 get active(){return this.actors.size}
 get motionDiagnostics(){return [...this.actors.values()].filter(a=>a.skillMotion).map(a=>{const group=a.clips.get(skillPose(a.skillMotion!).clip);return {context:a.skillMotion,clip:a.clipKey,isPlaying:group?.isPlaying,frame:group?.animatables[0]?.masterFrame,position:a.pivot.position.asArray(),rotation:a.pivot.rotation.asArray()};});}
 constructor(private scene:Scene){}
 attach(id:string,target:TransformNode,decorate:(root:TransformNode)=>void=()=>{}) {
  let promise=this.cache.get(id);if(!promise){const revision=MODEL_ASSET_REVISIONS[id];promise=LoadAssetContainerAsync('/models/'+id+'.glb'+(revision?'?v='+revision:''),this.scene,{pluginOptions:{gltf:{animationStartMode:0}}}).then(container=>{container.animationGroups.forEach(g=>g.stop());return container;});this.cache.set(id,promise);}
  const fallback=target.getChildMeshes();
  void promise.then(container=>{
   if(this.closed||target.isDisposed())return;
   const instance=container.instantiateModelsToScene(name=>id+'-'+name,false,{doNotInstantiate:true});
   const pivot=new TransformNode(id+'-motion-pivot',this.scene);pivot.parent=target;pivot.setPivotPoint(new Vector3(0,.9,0));
   for(const root of instance.rootNodes)root.parent=pivot;
   for(const mesh of fallback)mesh.dispose();
   target.scaling.setAll(1);
   const clips=new Map(instance.animationGroups.map(g=>[g.name.replace(/^.*-(idle|walk|run|attack-heavy|attack|skill-ultimate|skill-guard|skill-heal|skill|jump|land|dodge|spin|hurt|death)$/,'$1'),g]));
   for(const group of clips.values())for(const entry of group.targetedAnimations){entry.animation.enableBlending=true;entry.animation.blendingSpeed=.35;}
   this.actors.set(target,{clips,motion:'idle',remaining:0,hp:NaN,suspended:false,pivot,clipKey:'idle',modelId:id});if(target.isEnabled()){const rest=clips.get(id==='archer'?'skill':'idle');if(id==='archer'&&rest)for(const entry of rest.targetedAnimations)entry.animation.enableBlending=false;rest?.start(id!=='archer');if(id==='archer'&&rest){rest.pause();rest.goToFrame(rest.to);}}
   const actorMeshes=target.getChildMeshes();
   for(const mesh of actorMeshes)if(mesh.material?.getClassName()==='PBRMaterial'){this.originals.set(mesh,mesh.material);this.applyMaterial(mesh,mesh.material);}
   this.loaded++;decorate(target);
   target.onDisposeObservable.addOnce(()=>{this.actors.delete(target);for(const mesh of actorMeshes){this.originals.delete(mesh);this.vertexColors.delete(mesh);}instance.dispose();});
  }).catch(()=>{if(!this.closed)this.errors++;});
 }
 setSkillMotion(target:TransformNode,context:SkillMotionContext|null){const actor=this.actors.get(target);if(actor){if(!context&&actor.skillMotion){actor.remaining=0;actor.clipKey='';}actor.skillMotion=context;}}
 animate(target:TransformNode,moving:boolean,hp:number,action:boolean,casting:boolean,dt:number,visible=true) {
  const actor=this.actors.get(target);if(!actor)return;
  const active=target.isEnabled()&&visible;
  const damaged=hp<actor.hp;actor.hp=hp;actor.remaining=Math.max(0,actor.remaining-dt);
  if(!active||hp<=0||damaged){actor.skillMotion=null;actor.pivot.position.setAll(0);actor.pivot.rotation.setAll(0);}
  if(!active){if(!actor.suspended){actor.clips.forEach(g=>g.stop());actor.suspended=true;actor.clipKey='';}return;}
  actor.suspended=false;
  const context=actor.remaining>0&&actor.motion==='hurt'?null:actor.skillMotion;
  const pose=context?skillPose(context):null;
  if(pose){actor.pivot.position.set(pose.x,pose.y,pose.z);actor.pivot.rotation.set(pose.pitch,pose.yaw,pose.roll);}
  else {actor.pivot.position.setAll(0);actor.pivot.rotation.setAll(0);}
  const next:Motion=hp<=0?'death':damaged?'hurt':context?'skill':action?'attack':actor.remaining>0?actor.motion:moving?'run':'idle';
  // The generic idle points this rigid crossbow below the planted feet.
  // Archer rests in the authored ranged aiming endpoint instead.
  const idleAim=actor.modelId==='archer'&&!context&&next==='idle';
  const clip=idleAim?'skill':pose?.clip||next,key=idleAim?'idle-aim':context?`${context.skillId||context.job}:${context.phase==='anticipation'?'anticipation':'execution'}:${clip}:${context.frozen?'frozen':'live'}`:clip;
  if(key!==actor.clipKey){
   // Only the active Archer landing/hold skips blending; restore on the next
   // motion transition so jump, locomotion and basic attacks keep their blends.
   if(actor.modelId==='archer'){
    for(const g of actor.clips.values())for(const entry of g.targetedAnimations)entry.animation.enableBlending=!context?.frozen;
    if(clip==='skill')for(const entry of (actor.clips.get(clip)?.targetedAnimations||[]))entry.animation.enableBlending=false;
   }
   actor.clips.forEach(g=>g.stop());actor.motion=next;actor.clipKey=key;
   actor.remaining=next==='hurt'?.22:next==='attack'?.26:0;
   const group=actor.clips.get(clip)||actor.clips.get(next);
   group?.start(next==='idle'||next==='run'||context?.phase==='anticipation',pose?.speed||(next==='attack'?1.8:1));
  }
  const group=actor.clips.get(clip)||actor.clips.get(next);
  if(idleAim&&group){group.pause();group.goToFrame(group.to);}
  if(pose&&group){group.speedRatio=pose.speed;if(context?.frozen){group.pause();group.goToFrame(group.from+(group.to-group.from)*pose.clipProgress);}}
 }
 setLowQuality(low:boolean){this.low=low;for(const [mesh,original] of this.originals){if(mesh.isDisposed()){this.originals.delete(mesh);continue;}this.applyMaterial(mesh,original);}}
 private applyMaterial(mesh:AbstractMesh,original:Material){
  if(!this.low){if(mesh.material!==original){const colors=this.vertexColors.get(mesh);if(colors)mesh.setVerticesData('color',colors.linear,false,colors.stride);}mesh.material=original;return;}
  const pbrOriginal=original as PBRMaterial;
  if(pbrOriginal.albedoTexture){
   // glTF color atlases may use an sRGB GPU buffer. Keep the PBR color pipeline:
   // StandardMaterial's diffuse sampler would consume its linear values as gamma.
   let textured=this.simple.get(original);
   if(!textured){const pbr=pbrOriginal.clone('low-'+original.name)!;pbr.maxSimultaneousLights=2;pbr.reflectionTexture=null;pbr.bumpTexture=null;textured=pbr;this.simple.set(original,textured);}
   mesh.material=textured;return;
  }
  let material=this.simple.get(original);
  if(!material){const pbr=original as PBRMaterial,standard=new StandardMaterial('low-'+original.name,this.scene);standard.diffuseColor=pbr.albedoColor.toGammaSpace();standard.emissiveColor=pbr.emissiveColor.toGammaSpace();standard.specularColor=Color3.Black();standard.alpha=pbr.alpha;standard.backFaceCulling=pbr.backFaceCulling;standard.maxSimultaneousLights=2;material=standard;this.simple.set(original,material);}
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
