import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import type {ZoneId} from '../src/game/content';
const phase=process.env.REFERENCE_PHASE||'after',dir=`artifacts/reference-environment/${phase}`;mkdirSync(dir,{recursive:true});
const cases=[['town','high',1200,800],['glade','high',1200,800],['glade','low',390,844],['orchard','high',1200,800],['marsh','high',1200,800],['frost','high',1200,800],['ruins','high',1200,800]] as const;
for(const [zone,quality,width,height] of cases)test(`${zone} ${quality} ${width}: real movement, complete models and environment capture`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const sim=new Simulation(()=>.5,undefined,null);sim.save.zone=zone;sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 await page.setViewportSize({width,height});await page.addInitScript(({save,quality})=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality);},{save:sim.save,quality});
 await page.goto('/?practice=1');await page.locator('#practice-start').click();
 await expect.poll(async()=>{if(errors.length)throw Error(errors[0]);return page.evaluate(()=>{const d=(window as any).mossvale?.snapshot();return !!d&&d.modelsExpected>0&&d.riggedActors===d.modelsExpected&&d.modelErrors===0;});},{timeout:60000}).toBe(true);
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot());const before=await snap();
 await page.keyboard.down('d');try{await page.waitForFunction(x=>(window as any).mossvale.snapshot().x>x+.6,before.x,{timeout:10000});}finally{await page.keyboard.up('d');}
 const moved=await snap();expect(moved.x-before.x).toBeGreaterThan(.6);
 await page.mouse.move(width*.45,height*.4);await page.mouse.wheel(0,-360);
 await page.waitForTimeout(1000);const idle=await snap();await page.screenshot({path:`${dir}/${zone}-${quality}-${width}.png`});
 await page.locator(width<600?'#mobile-auto':'#auto').click();expect((await snap()).auto).toBe(true);
 const samples=await page.evaluate(async()=>{const values:any[]=[];let previous=performance.now();const end=previous+2000;while(performance.now()<end){await new Promise(requestAnimationFrame);const now=performance.now(),d=(window as any).mossvale.snapshot();values.push({frameMs:now-previous,drawCalls:d.drawCalls,sceneMeshes:d.sceneMeshes,sceneMaterials:d.sceneMaterials,sceneTextures:d.sceneTextures,vfx:d.vfx,fps:d.fps,frameP95:d.frameP95});previous=now;}return values;});
 await page.locator(width<600?'#mobile-auto':'#auto').click();expect((await snap()).auto).toBe(false);const final=await snap();expect(final.modelErrors).toBe(0);expect(errors).toEqual([]);
 writeFileSync(`${dir}/${zone}-${quality}-${width}.json`,JSON.stringify({phase,fixture:{zone,quality,width,height,practice:true,level:100},movement:{before:{x:before.x,z:before.z},after:{x:moved.x,z:moved.z}},idle,final,samples,pageErrors:errors,performanceEnvironment:'headless Chromium SwiftShader; not player hardware FPS'},null,2));
});
