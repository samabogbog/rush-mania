import {test,expect} from '@playwright/test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {Primitives} from '../src/render/primitives';
import {buildZoneMap} from '../src/render/procedural';
import {zones,type ZoneId} from '../src/game/content';
import {zoneObstacles} from '../src/game/map-data';

test('all environment maps merge their geometry with compatible vertex attributes and preserve collision proxies',()=>{
 for(const zone of Object.keys(zones) as ZoneId[]){
  const engine=new NullEngine(),scene=new Scene(engine),factory=new Primitives(scene);
  const exclude=factory.mesh({kind:'plane',w:1,h:1},0xffffff,0,-1,0),blocking:{x:number;z:number;r:number}[]=[];
  buildZoneMap(factory,blocking,zone);
  expect(blocking,zone).toEqual(zoneObstacles(zone));
  const before=scene.meshes.length,paint=scene.getMeshByName('soft-painted-meadow')?.getVerticesData('color')?.slice(0,3);
  expect(()=>factory.mergeStatic(exclude),zone).not.toThrow();
  expect(scene.meshes.length,zone).toBeLessThan(before);
  if(paint){expect(scene.meshes.some(m=>{const c=m.getVerticesData('color');if(!c)return false;for(let i=0;i<c.length;i+=4)if(paint.every((v,k)=>Math.abs(v-c[i+k])<.00001))return true;return false;}),zone+' meadow gradient preserved').toBe(true);}
  expect(scene.meshes.every(m=>m.getTotalVertices()>0),zone).toBe(true);
  expect(scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0),zone+' static vertex budget').toBeLessThanOrEqual(120000);
  console.log('ENVIRONMENT_GEOMETRY',zone,JSON.stringify({meshes:scene.meshes.length,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0)}));
  scene.dispose();engine.dispose();
 }
});
