// Independent render-only QA fixture; no gameplay state changes.

import {Engine} from '@babylonjs/core/Engines/engine';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {ModelLibrary} from '../src/render/model-library';
const engine=new Engine(document.querySelector('canvas'),true),scene=new Scene(engine);scene.clearColor=new Color4(.77,.85,.88,1);
const camera=new FreeCamera('review-camera',new Vector3(0,1.25,4),scene);camera.setTarget(new Vector3(0,.9,0));camera.minZ=.05;
new HemisphericLight('sky',new Vector3(0,1,0),scene).intensity=.85;
const sun=new DirectionalLight('sun',new Vector3(-1,-2,1),scene);sun.position=new Vector3(4,8,-4);sun.intensity=1.2;const shadow=new ShadowGenerator(1024,sun);shadow.usePercentageCloserFiltering=true;
const ground=MeshBuilder.CreateGround('ground',{width:12,height:12},scene);ground.receiveShadows=true;const gm=new StandardMaterial('ground-mat',scene);gm.diffuseColor=new Color3(.5,.64,.54);ground.material=gm;
const library=new ModelLibrary(scene),actor=new TransformNode('review-actor',scene);const job=new URLSearchParams(location.search).get('job');library.attach(job,actor,root=>root.getChildMeshes().forEach(m=>shadow.addShadowCaster(m)));
engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());
window.review={scene,engine,actor,library,camera,Vector3,shadow,describe(){const meshes=actor.getChildMeshes().filter(m=>m.getTotalVertices()>0&&m.isEnabled());return {loaded:library.active,errors:library.errors,meshes:meshes.map(m=>({name:m.name,vertices:m.getTotalVertices(),material:m.material?.getClassName(),texture:!!(m.material?.albedoTexture||m.material?.diffuseTexture),maxSimultaneousLights:m.material?.maxSimultaneousLights,reflectionTexture:!!m.material?.reflectionTexture,bumpTexture:!!m.material?.bumpTexture,gammaSpace:(m.material?.albedoTexture||m.material?.diffuseTexture)?.gammaSpace,color:(m.material?.albedoColor||m.material?.diffuseColor)?.asArray(),normals:m.getVerticesData('normal')?.length||0})),soles:meshes.filter(m=>/LegLeft|LegRight/.test(m.name)).map(m=>{m.computeWorldMatrix(true);const positions=m.getPositionData(true,true);let minY=Infinity,maxY=-Infinity;for(let i=0;i<positions.length;i+=3){const point=Vector3.TransformCoordinates(new Vector3(positions[i],positions[i+1],positions[i+2]),m.getWorldMatrix());minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}return {mesh:m.name,minY,maxY}}),clips:scene.animationGroups.map(g=>({name:g.name,targets:g.targetedAnimations.length})),bones:scene.skeletons.flatMap(s=>s.bones.map(b=>({name:b.name,position:b.getAbsolutePosition().asArray()}))),bounds:meshes.map(m=>{m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;return {name:m.name,min:b.minimumWorld.asArray(),max:b.maximumWorld.asArray()}})}}};
