import '@babylonjs/loaders/glTF';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import type {Scene} from '@babylonjs/core/scene';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import type {AnimationGroup} from '@babylonjs/core/Animations/animationGroup';
export type Motion='idle'|'walk'|'attack'|'skill'|'hurt'|'death';
/** One downloaded mesh/rig per kind; instances have independent skeletons and clips. */
export class ModelLibrary {
 private cache=new Map<string,Promise<AssetContainer>>();
 private actors=new Map<TransformNode,{clips:Map<string,AnimationGroup>;motion:Motion;remaining:number;hp:number}>();
 private closed=false;loaded=0;errors=0;
 get active(){return this.actors.size}
 constructor(private scene:Scene){}
 attach(id:string,target:TransformNode,decorate:(root:TransformNode)=>void=()=>{}) {
  let promise=this.cache.get(id);if(!promise){promise=LoadAssetContainerAsync('/models/'+id+'.glb',this.scene);this.cache.set(id,promise);}
  const fallback=target.getChildMeshes();
  void promise.then(container=>{
   if(this.closed||target.isDisposed())return;
   const instance=container.instantiateModelsToScene(name=>id+'-'+name,false,{doNotInstantiate:true});
   for(const root of instance.rootNodes)root.parent=target;
   for(const mesh of fallback)mesh.dispose();
   target.scaling.setAll(1);
   const clips=new Map(instance.animationGroups.map(g=>[g.name.replace(/^.*-(idle|walk|attack|skill|hurt|death)$/,'$1'),g]));
   this.actors.set(target,{clips,motion:'idle',remaining:0,hp:Infinity});clips.get('idle')?.start(true);this.loaded++;decorate(target);
   target.onDisposeObservable.addOnce(()=>{this.actors.delete(target);instance.dispose();});
  }).catch(()=>{if(!this.closed)this.errors++;});
 }
 animate(target:TransformNode,moving:boolean,hp:number,action:boolean,casting:boolean,dt:number) {
  const actor=this.actors.get(target);if(!actor)return;
  const damaged=hp<actor.hp;actor.hp=hp;actor.remaining=Math.max(0,actor.remaining-dt);
  const next:Motion=hp<=0?'death':damaged?'hurt':casting?'skill':action?'attack':actor.remaining>0?actor.motion:moving?'walk':'idle';
  if(next===actor.motion)return;
  actor.clips.forEach(g=>g.stop());actor.motion=next;
  actor.remaining=next==='hurt'?.32:next==='attack'?.45:next==='skill'?.8:0;
  actor.clips.get(next)?.start(next==='idle'||next==='walk');
 }
 dispose(){this.closed=true;this.actors.clear();this.cache.forEach(p=>void p.then(c=>c.dispose()).catch(()=>{}));this.cache.clear();}
}
