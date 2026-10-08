import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {mkdirSync} from 'node:fs';
test('textured world survives quality switches, stays bounded and preserves touch playfield',async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone='town';sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 await page.setViewportSize({width:1200,height:800});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','high')},sim.save);
 await page.goto('/?practice=1');await expect(page.locator('#hp-text')).toContainText('/',{timeout:60000});
 await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.modelsExpected>0&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},null,{timeout:60000});
 const snapshot=()=>page.evaluate(()=>(window as any).mossvale.snapshot());const first=await snapshot();expect(first.surfaceTextures).toBeGreaterThan(0);expect(first.surfaceTextures).toBeLessThanOrEqual(12);expect(first.texturedMapMeshes).toBeGreaterThan(3);expect(first.shadowsEnabled).toBe(true);expect(first.shadowFilter).toBe('blur-close-exponential');expect(first.shadowBlurKernel).toBe(20);expect(first.textureDetail).toBe(.6);
 mkdirSync('artifacts/graphics-upgrade',{recursive:true});await page.screenshot({path:'artifacts/graphics-upgrade/qa-town-high.png'});
 for(const quality of ['low','high','low','high']){
  await page.locator('[data-panel="settings"]').click();await page.getByRole('combobox',{name:'Graphics quality'}).click();await page.getByRole('option',{name:quality,exact:true}).click();await expect(page.locator('#graphics-quality')).toHaveValue(quality);await page.keyboard.press('Escape');
  await expect.poll(async()=>(await snapshot()).quality).toBe(quality);const state=await snapshot();expect(state.modelErrors).toBe(0);expect(state.shadowsEnabled).toBe(quality!=='low');expect(state.surfaceTextures).toBe(first.surfaceTextures);expect(state.sceneTextures).toBeLessThanOrEqual(first.sceneTextures+3);
 }
 const last=await snapshot();expect(last.sceneMeshes).toBeLessThanOrEqual(first.sceneMeshes+5);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/graphics-upgrade/qa-town-mobile.png'});
 for(const selector of ['#mobile-joystick','#mobile-attack','#mobile-auto']){const b=await page.locator(selector).boundingBox();expect(b).not.toBeNull();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(390);expect(b!.y+b!.height).toBeLessThanOrEqual(844);}
 expect(errors).toEqual([]);
});
