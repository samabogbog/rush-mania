import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {skills,type ClassId} from '../src/game/classes';
const out='artifacts/dynamic-skills';
const fixture=`<!doctype html><html><body style="margin:0;background:#d2dfdc"><canvas style="width:100vw;height:100vh;display:block"></canvas><div id="label" style="position:absolute;top:12px;left:12px;font:18px sans-serif;color:#142722;background:#ffffffb0;padding:8px"></div><script type="module" src="/tests/dynamic-skills-fixture.ts"></script></body></html>`;
for(const job of ['swordsman','mage','archer'] as ClassId[])test(`${job}: all 20 volumetric previews, frozen rigs, multiview and reset`,async({browser})=>{
 mkdirSync(out,{recursive:true});const context=await browser.newContext({viewport:{width:720,height:600},recordVideo:{dir:out+'/video',size:{width:720,height:600}}});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error('QA_PAGE_ERROR',e.message)});await page.route('**/dynamic-review.html*',r=>r.fulfill({contentType:'text/html',body:fixture}));await page.goto(`/dynamic-review.html?job=${job}`);await page.waitForFunction(()=>(window as any).review?.library.active===1,{},{timeout:45000});const records:any[]=[];
 for(const low of [false,true]){
  await page.evaluate(low=>(window as any).review.quality(low),low);
  for(const skill of skills[job])for(const progress of low?[.4]:[.15,.4,.85]){
   await page.evaluate(({id,progress})=>(window as any).review.preview(id,progress),{id:skill.id,progress});await page.waitForTimeout(35);
   const d=await page.evaluate(()=>(window as any).review.describe());expect(d.modelErrors).toBe(0);expect(d.actorPosition).toEqual([0,0,0]);expect(d.actorRotation).toEqual([0,0,0]);expect(d.vfx.active).toBeLessThanOrEqual(low?40:96);expect(d.vfx.pooled).toBeLessThanOrEqual(160);expect(d.shapes.length).toBeGreaterThan(0);
   for(const shape of d.shapes){expect(shape.billboard).toBe(0);expect(shape.texture).toBe(false);expect(shape.vertices).toBeGreaterThan(12);expect(Math.min(...shape.extent)).toBeGreaterThan(.001);}
   records.push({id:skill.id,low,progress,...d});await page.screenshot({path:`${out}/preview-${skill.id}-${low?'low':'high'}-${progress}.png`});
  }
 }
 await page.evaluate(()=>(window as any).review.quality(false));
 for(const skill of skills[job].filter(s=>[1,4,7,10].includes(s.stage))){
  for(const angle of [0,Math.PI/2,Math.PI]){await page.evaluate(({id,angle})=>{const r=(window as any).review;r.cameraAt(angle);r.preview(id,.4);},{id:skill.id,angle});await page.waitForTimeout(35);await page.screenshot({path:`${out}/angle-${skill.id}-${Math.round(angle*100)}.png`});}
  await page.evaluate(id=>(window as any).review.play(id),skill.id);await page.waitForTimeout(700);
  for(const progress of [.05,.18,.32,.46,.6,.74,.88,1]){await page.evaluate(({id,progress})=>(window as any).review.preview(id,progress),{id:skill.id,progress});await page.waitForTimeout(20);await page.screenshot({path:`${out}/film-${skill.id}-${progress}.png`});}
 }
 // Isolated interruption reset checks exercise local pivot without touching game state.
 const resets:any[]=[];for(const kind of ['cancel','hurt','death','hidden']){await page.evaluate(id=>(window as any).review.preview(id,.4),`${job}-10`);const result=await page.evaluate(kind=>{const r=(window as any).review;if(kind==='hurt'){r.library.animate(r.actor,false,120,false,false,.016);r.library.animate(r.actor,false,100,false,false,.016);return r.reset(100,true,false)}return r.reset(kind==='death'?0:120,kind!=='hidden',kind==='cancel')},kind);expect(result.every((p:any)=>p.position.every((v:number)=>Math.abs(v)<1e-8)&&p.rotation.every((v:number)=>Math.abs(v)<1e-8))).toBe(true);resets.push({kind,result});}
 expect(errors).toEqual([]);writeFileSync(`${out}/preview-${job}.json`,JSON.stringify({environment:'Chromium ANGLE SwiftShader software renderer; render-only isolated fixture, not learned combat',records,resets,errors},null,2));const video=page.video();await context.close();if(video)await video.saveAs(`${out}/preview-${job}.webm`);
});
