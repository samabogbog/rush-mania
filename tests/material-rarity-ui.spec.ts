import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {rarityOrder} from '../src/game/equipment';
import {craftingMaterials,materialKey} from '../src/game/crafting';

for(const width of [1200,390])test(`all15 PNG icons, Ancient/Legend tooltips and matching-tier crafting fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===1200?800:844});const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.zone='town';sim.save.gold=100000;sim.save.items=[];
 for(const name of craftingMaterials)for(const rarity of rarityOrder)sim.addItem(name,'leaf',20,rarity);
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?practice=1');await page.locator('#practice-start').click();await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:60000});await page.keyboard.press('i');
 const icons=page.locator('.inventory-grid [data-item] img');await expect(icons).toHaveCount(15);await expect.poll(()=>icons.evaluateAll(nodes=>nodes.every(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth===256))).toBe(true);
 const sources=await icons.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));expect(new Set(sources).size).toBe(15);for(const src of sources)expect(src).toMatch(/^\/icons\/materials\/(shade-essence|sky-feather|rune-stone)-(common|rare|epic|ancient|legend)\.png$/);
 const ancient=page.locator(`[data-item="${materialKey('Shade essence','ancient')}"]`);await ancient.hover();await expect(page.getByRole('tooltip')).toContainText('Ancient');await page.locator(`[data-item="${materialKey('Shade essence','legend')}"]`).hover();await expect(page.getByRole('tooltip')).toContainText('Legend');await page.mouse.move(0,0);await page.screenshot({path:`artifacts/material-icons/inventory-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.keyboard.press('Escape');await page.locator('[data-panel="forge"]').click();await expect(page.locator('[data-craft-rarity]')).toHaveCount(5);await page.locator('[data-material-upgrade="Shade essence"][data-material-rarity="ancient"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.find((i:any)=>i.name==='Shade essence'&&i.rarity==='legend')?.count)).toBe(21);
 await page.locator('[data-recipe="sprout-blade"]').click();await page.locator('[data-craft-rarity="legend"]').click();await expect(page.locator('.recipe-materials')).toContainText('Legend');await expect(page.locator('.recipe-materials img')).toHaveCount(2);for(const src of await page.locator('.recipe-materials img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src'))))expect(src).toMatch(/-legend\.png$/);
 await page.locator('[data-craft="sprout-blade"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.find((i:any)=>i.gearId==='sprout-blade')?.rarity)).toBe('legend');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:`artifacts/material-icons/crafting-${width}.png`});expect(errors).toEqual([]);
});
