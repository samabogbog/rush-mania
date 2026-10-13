import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {environmentPalette} from '../src/render/environment-art';
import type {ZoneId} from '../src/game/content';
import {WORLD_BOUNDS} from '../src/game/map-data';
test.use({viewport:{width:1200,height:800}});
test('real portal travel rebuilds all six scenes after warm-up twice without growing decoration resources',async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone='town';sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','high')},sim.save);
 await page.goto('/?practice=1');await page.locator('#practice-start').click();const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot());
 const ready=async()=>{await expect.poll(async()=>{if(errors.length)throw Error(errors[0]);return page.evaluate(()=>{const d=(window as any).mossvale?.snapshot();return !!d&&d.modelsExpected>0&&d.riggedActors===d.modelsExpected&&d.modelErrors===0;})},{timeout:60000}).toBe(true);};await ready();
 mkdirSync('artifacts/reference-environment',{recursive:true});
 await page.keyboard.press('m');const cottageMap=(await page.locator('#large-map').boundingBox())!;await page.mouse.click(cottageMap.x+(6-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*cottageMap.width,cottageMap.y+(-4-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*cottageMap.height);
 await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return Math.hypot(s.x-6,s.z+4)<.5;},{},{timeout:40000});
 await page.mouse.move(600,400);await page.mouse.wheel(0,-700);await page.waitForTimeout(500);await page.screenshot({path:'artifacts/reference-environment/cottage-close-high.png'});
 await page.locator('[data-panel="settings"]').click();await page.getByRole('combobox',{name:'Graphics quality'}).click();await page.getByRole('option',{name:'low',exact:true}).click();await page.keyboard.press('Escape');expect((await snap()).quality).toBe('low');
 await page.keyboard.press('m');const b=(await page.locator('#large-map').boundingBox())!;await page.mouse.click(b.x+(0-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*b.width,b.y+(-11-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*b.height);
 await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return Math.hypot(s.x,s.z+11)<2.5;},{},{timeout:40000});const arrival=await snap();const evidence:any[]=[];
 for(let cycle=0;cycle<3;cycle++){for(const zone of ['orchard','marsh','frost','ruins','glade','town']){await page.keyboard.press('m');await page.locator(`[data-travel="${zone}"]`).click();await page.waitForFunction(zone=>(window as any).mossvale.snapshot().zone===zone,zone);await page.waitForFunction(p=>(window as any).mossvale.snapshot().environmentPalette.ground===p.ground,environmentPalette(zone as ZoneId));await ready();const s=await snap();evidence.push({cycle,zone,materials:s.sceneMaterials,textures:s.sceneTextures,meshes:s.sceneMeshes,details:s.environmentDetails});expect(s.environmentDetails.clusters).toBeGreaterThan(600);expect(s.modelErrors).toBe(0);}}
 writeFileSync('artifacts/reference-environment/travel-resources.json',JSON.stringify({arrival:{x:arrival.x,z:arrival.z},evidence,pageErrors:errors},null,2));
 for(const zone of ['orchard','marsh','frost','ruins','glade','town']){const a=evidence.find(s=>s.cycle===1&&s.zone===zone),b=evidence.find(s=>s.cycle===2&&s.zone===zone);expect(b.meshes).toBe(a.meshes);expect(b.textures).toBeLessThanOrEqual(a.textures+2);expect(b.materials).toBeLessThanOrEqual(a.materials+2);expect(b.details).toEqual(a.details);}
 expect(errors).toEqual([]);mkdirSync('artifacts/reference-environment',{recursive:true});writeFileSync('artifacts/reference-environment/travel-resources.json',JSON.stringify({arrival:{x:arrival.x,z:arrival.z},evidence,pageErrors:errors},null,2));
});
