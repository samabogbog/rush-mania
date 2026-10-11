// Render-only motion QA. No Simulation mutation and no VFX modification.
import {Engine} from '@babylonjs/core/Engines/engine';
import {SceneInstrumentation} from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {ModelLibrary} from '../src/render/model-library';
import {skillPose,skillRecoveryDuration} from '../src/render/skill-choreography';
import {skillCastDuration} from '../src/game/skill-timing';
import {skills,type ClassId} from '../src/game/classes';
const engine=new Engine(document.querySelector('canvas')!,true),scene=new Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=new Color4(.72,.8,.78,1);
const camera=new FreeCamera('motion-camera',new Vector3(3,2.1,4),scene);camera.setTarget(new Vector3(0,1,0));new HemisphericLight('sky',new Vector3(0,1,0),scene).intensity=1;
const ground=MeshBuilder.CreateGround('ground',{width:8,height:8},scene),mat=new StandardMaterial('ground-material',scene);mat.diffuseColor=new Color3(.3,.45,.35);ground.material=mat;
const job=new URLSearchParams(location.search).get('job') as ClassId,actor=new TransformNode('authoritative-root',scene),library=new ModelLibrary(scene);library.attach(job,actor);
const instrumentation=new SceneInstrumentation(scene);
let playback:any=null,last=performance.now(),context:any=null,samples:any[]=[];
function pose(id:string,t:number,phase:'anticipation'|'release',frozen:boolean){const skill=skills[job].find(s=>s.id===id)!,duration=phase==='anticipation'?skillCastDuration(skill.cast):skillRecoveryDuration(skill.stage);context={job,stage:skill.stage,branch:skill.branch,effect:skill.effect,skillId:id,duration,phase,progress:Math.min(1,t/duration),frozen};library.setSkillMotion(actor,context);library.animate(actor,false,120,false,phase==='anticipation',.016);document.querySelector('#label')!.textContent=`${skill.name} · ${phase} ${t.toFixed(2)} s`;}
function describe(){let minY=Infinity;const bounds:any[]=[];for(const mesh of actor.getChildMeshes().filter(m=>m.isEnabled()&&m.isVisible&&m.getTotalVertices())){const data=mesh.getPositionData(true,true);if(!data)continue;mesh.computeWorldMatrix(true);let low=Infinity;for(let i=0;i<data.length;i+=3){const v=Vector3.TransformCoordinates(new Vector3(data[i],data[i+1],data[i+2]),mesh.getWorldMatrix());low=Math.min(low,v.y);}bounds.push({name:mesh.name,minY:low});minY=Math.min(minY,low);}return {context,pose:context?skillPose(context):null,modelErrors:library.errors,loaded:library.active,actorPosition:actor.position.asArray(),motion:library.motionDiagnostics,bounds,minY,drawCalls:instrumentation.drawCallsCounter.current,meshes:scene.meshes.length,materials:scene.materials.length,animationGroups:scene.animationGroups.length,joints:actor.getDescendants().filter((n:any)=>/hip|knee|wrist|foot|upperarm|spine|head/i.test(n.name)&&n.rotationQuaternion).map((n:any)=>({name:n.name,rotation:n.rotationQuaternion.asArray(),position:n.position.asArray()}))};}
engine.runRenderLoop(()=>{const now=performance.now(),dt=(now-last)/1000;last=now;if(playback){playback.t+=dt;const {id,t}=playback,skill=skills[job].find(s=>s.id===id)!,cast=skillCastDuration(skill.cast),duration=skillRecoveryDuration(skill.stage);pose(id,t<cast?t:t-cast,t<cast?'anticipation':'release',false);samples.push({t,...describe()});if(t>=cast+duration){library.setSkillMotion(actor,null);library.animate(actor,false,120,false,false,.016);playback=null;}}scene.render();});
(window as any).motionReview={library,describe,sample(id:string,t:number,phase='release'){playback=null;pose(id,t,phase as any,true);scene.render();return describe();},play(id:string){samples=[];playback={id,t:0};last=performance.now();},reset(){context=null;library.setSkillMotion(actor,null);library.animate(actor,false,120,false,false,.016);scene.render();},disposeActor(){const before=scene.animationGroups.length;actor.dispose();return {before,after:scene.animationGroups.length,active:library.active,aimGroups:scene.animationGroups.filter(g=>g.name==='archer-upper-body-aim').length};},get playing(){return !!playback},get samples(){return samples}};
