import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
const phase=process.env.SOFT_SHADOW_PHASE||'after',dir=`artifacts/soft-shadows/${phase}`;mkdirSync(dir,{recursive:true});
for(const [quality,width,height] of [['high',1200,800],['auto',1200,800],['low',1200,800],['low',390,844]] as const)test(`${quality} ${width}: moving actors and tree shadows stay visible`,async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone='glade';sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await page.addInitScript(({save,quality})=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality)},{save:sim.save,quality});
 await page.goto('/?practice=1');await page.locator('#practice-start').click();await expect.poll(async()=>{if(errors.length)throw Error(errors[0]);return page.evaluate(()=>{const d=(window as any).mossvale?.snapshot();return !!d&&d.modelsExpected>0&&d.riggedActors===d.modelsExpected&&d.modelErrors===0;})},{timeout:60000}).toBe(true);
 if(quality==='auto')await page.waitForFunction(()=>(window as any).mossvale.snapshot().autoReduced,{}, {timeout:45000});
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot()),before=await snap();
 await page.mouse.move(width*.5,height*.4);await page.mouse.wheel(0,-300);await page.screenshot({path:`${dir}/${quality}-${width}-standing.png`});
 await page.keyboard.down('d');try{await page.waitForFunction(x=>(window as any).mossvale.snapshot().x>x+1.1,before.x,{timeout:15000});}finally{await page.keyboard.up('d');}const moved=await snap();expect(moved.x-before.x).toBeGreaterThan(1.1);
 await page.screenshot({path:`${dir}/${quality}-${width}-moved.png`});expect(errors).toEqual([]);expect(moved.modelErrors).toBe(0);
 if(phase==='after'){expect(moved.shadowsEnabled).toBe(true);expect(moved.shadowFilter).toBe(moved.shadowPCSSSupported?'pcss-contact-hardening':'blur-exponential');if(moved.shadowPCSSSupported)expect(moved.shadowSourceSizeUV).toBeGreaterThanOrEqual(.04);else expect(moved.shadowBlurKernel).toBeGreaterThanOrEqual(6);expect(moved.shadowCasters.enabled).toBeGreaterThan(0);}
 const summary=(s:any)=>Object.fromEntries(['x','z','quality','autoReduced','shadowsEnabled','shadowFilter','shadowFilterId','shadowPCSSSupported','shadowWebGLVersion','shadowSourceSizeUV','shadowSampling','shadowMapSize','shadowBlurKernel','shadowBlurScale','shadowDarkness','shadowDepthScale','shadowCasters','lighting','environmentPalette','modelErrors','drawCalls','sceneMeshes','sceneMaterials','sceneTextures','fps','frameP95'].map(k=>[k,s[k]]));
 writeFileSync(`${dir}/${quality}-${width}.json`,JSON.stringify({phase,before:summary(before),moved:summary(moved),pageErrors:errors,environment:'Chromium SwiftShader; no player hardware FPS claim'},null,2));
});
