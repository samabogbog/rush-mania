import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {mkdirSync} from 'node:fs';
test('town is peaceful and map UI separates entry level from recommended level',async({page})=>{
 const seed=new Simulation(()=>.5,undefined,null);seed.save.zone='town';seed.save.level=10;seed.save.hp=seed.maxHp;seed.save.mp=seed.maxMp;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},seed.save);
 await page.goto('/?practice=1');const ready=()=>page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:60000});await ready();await expect(page.locator('#hp-text')).toContainText(String(seed.maxHp));
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot());expect((await snap()).monsters).toEqual([]);expect((await snap()).territoriesCount).toBe(0);
 await page.keyboard.press('m');
 for(const text of ['Entry Lv 1 · Recommended Lv 1–100','Entry Lv 1 · Recommended Lv 1–20','Entry Lv 10 · Recommended Lv 20–40','Entry Lv 30 · Recommended Lv 40–60','Entry Lv 50 · Recommended Lv 60–80','Entry Lv 70 · Recommended Lv 80–100'])await expect(page.locator('.area-list')).toContainText(text);
 await expect(page.locator('[data-travel="orchard"]')).toBeEnabled();await expect(page.locator('[data-travel="marsh"]')).toBeDisabled();
 mkdirSync('artifacts/map-balance',{recursive:true});await page.screenshot({path:'artifacts/map-balance/town-map.png'});
 await page.locator('[data-travel="orchard"]').click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return Math.hypot(s.x,s.z+11)<2.9},{},{timeout:30000});
 await page.keyboard.press('m');await page.locator('[data-travel="orchard"]').click();await page.waitForFunction(()=>(window as any).mossvale.snapshot().zone==='orchard');await ready();
 expect((await snap()).monsters).toHaveLength(44);expect((await snap()).level).toBe(10);await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/map-balance/orchard-entry-lv10.png'});expect(errors).toEqual([]);
});
