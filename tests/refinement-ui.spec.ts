import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {refineStones} from '../src/game/refinement';
const fixture=()=>{const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.gold=10000;sim.addItem('Field Coat','field-coat');sim.addItem(refineStones.common.name,refineStones.common.icon,10);sim.addItem(refineStones.rare.name,refineStones.rare.icon,2);return sim.save;};
test('Forge shows cumulative percentages, Rare chances and downgrade risk, refines armor and crafts stones',async({page})=>{
 const save=fixture(),coat=save.items.find(i=>i.gearId==='field-coat')!;
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},save);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?practice=1');await page.locator('[data-panel="forge"]').click();
 await expect(page.locator('#refine-item')).toHaveValue(coat.id!);await expect(page.locator('.refine-summary')).toContainText('+0 → +1');await expect(page.locator('.refine-summary')).toContainText('+0% → +10%');await page.locator('[data-refine-stone="rare"]').click();await expect(page.locator('.refine-summary')).toContainText('drop to +0');
 await page.locator('.refine-rates summary').click();await expect(page.locator('.refine-rates table')).toContainText('+145%');await page.screenshot({path:'artifacts/refinement-desktop.png'});await page.locator('.refine-rates summary').click();await page.locator('#refine').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.find((i:any)=>i.gearId==='field-coat').refine)).toBe(1);await expect(page.locator('.refine-summary')).toContainText('+10% → +21%');
 await page.locator('[data-craft-category="material"]').click();await expect(page.locator('[data-recipe="rare-refine-stone"]')).toBeVisible();await page.locator('[data-craft="rare-refine-stone"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.find((i:any)=>i.name==='Common refine stone').count)).toBe(5);expect(errors).toEqual([]);
});
test('mobile can select a stone and inspect refinement risk without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},fixture());await page.goto('/?practice=1');await page.locator('[data-panel="forge"]').click();await page.locator('[data-refine-stone="rare"]').click();await expect(page.locator('[data-refine-stone="rare"]')).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/refinement-mobile.png'});
});
