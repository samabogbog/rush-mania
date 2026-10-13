import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
const phase=process.env.SATURATION_PHASE||'after',dir=`artifacts/saturation/${phase}`;mkdirSync(dir,{recursive:true});
for(const quality of ['high','low'] as const)test(`${quality}: matched game canvas saturation and intact shadows`,async({page})=>{
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.hp=s.maxHp;s.save.mp=s.maxMp;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(({save,quality})=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality)}, {save:s.save,quality});await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),body=await response.text(),marker='Object.defineProperty(window, "mossvale", {';expect(body).toContain(marker);const hook=`window.__saturationMeshesReady=()=>{const active=world.scene.getActiveMeshes();const meshes=active.data.slice(0,active.length).filter(m=>m.isEnabled()&&m.isVisible&&m.visibility>0&&m.getTotalVertices()>0&&m.material?.getClassName()==='PBRMaterial');return {count:meshes.length,ready:meshes.filter(m=>m.subMeshes?.every(s=>s.effect?.isReady())).length};};`;await route.fulfill({response,body:body.replace(marker,hook+marker)});});
 await page.goto('/?practice=1');await page.locator('#practice-start').click();await expect.poll(async()=>{if(errors.length)throw Error(errors[0]);return page.evaluate(()=>{const d=(window as any).mossvale?.snapshot();return !!d&&d.riggedActors===d.modelsExpected&&d.modelErrors===0;})},{timeout:60000}).toBe(true);
 await expect.poll(async()=>page.evaluate(()=>{const s=(window as any).__saturationMeshesReady();return s.count>0&&s.ready===s.count;}),{timeout:60000}).toBe(true);
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot());const first=await snap();expect(first.shadowsEnabled).toBe(true);expect(first.shadowFilter).toBe('pcss-contact-hardening');
 await page.screenshot({path:`${dir}/glade-${quality}.png`});
 if(phase==='after'){
  await page.locator('[data-panel="settings"]').click();await page.getByRole('combobox',{name:'Graphics quality'}).click();await page.getByRole('option',{name:quality==='high'?'low':'high',exact:true}).click();await page.keyboard.press('Escape');const switched=await snap();expect(switched.shadowsEnabled).toBe(true);expect(switched.modelErrors).toBe(0);expect(switched.sceneTextures).toBeLessThanOrEqual(first.sceneTextures+3);expect(switched.sceneMeshes).toBe(first.sceneMeshes);
 }
 expect(errors).toEqual([]);writeFileSync(`${dir}/${quality}.json`,JSON.stringify({phase,quality,render:{shadows:first.shadowsEnabled,filter:first.shadowFilter,saturation:first.saturation,grade:first.colorGrading,drawCalls:first.drawCalls,materials:first.sceneMaterials,textures:first.sceneTextures,meshes:first.sceneMeshes},pageErrors:errors},null,2));
});
