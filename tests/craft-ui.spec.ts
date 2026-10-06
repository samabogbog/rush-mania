import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';

const fixture=()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.gold=10000;
 sim.addItem('Shade essence','jelly',8);sim.addItem('Rune stone','leaf',6);return sim.save;
};
test('craft recipes use eight-column categorized slots, inspect materials and craft through the selected recipe',async({page})=>{
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},fixture());
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?practice=1');await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:45000});await page.locator('[data-panel="forge"]').click();
 await expect(page.locator('.craft-group')).toHaveCount(7);await expect(page.locator('.recipe-card')).toHaveCount(0);
 await expect(page.locator('[data-recipe="starfall-blade"]')).toBeVisible();await expect(page.locator('[data-recipe="starfall-gloves"] img')).toHaveAttribute('src','/icons/gear-pants.png');await page.locator('[data-recipe="starfall-gloves"]').click();await expect(page.getByLabel('Recipe details')).toContainText('Pants');await expect(page.getByLabel('Recipe details')).toContainText('Sky feather');
 const columns=await page.locator('.craft-grid').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);expect(columns).toBe(8);
 await page.locator('[data-recipe="sprout-blade"]').click();await expect(page.getByLabel('Recipe details')).toContainText('Shade essence');await expect(page.locator('[data-craft="sprout-blade"]')).toBeEnabled();
 await expect.poll(()=>page.locator('.craft-panel img').evaluateAll(images=>images.filter(i=>!(i as HTMLImageElement).complete||!(i as HTMLImageElement).naturalWidth).map(i=>i.getAttribute('src')))).toEqual([]);
 await page.screenshot({path:'artifacts/craft-grid.png'});await page.locator('[data-craft="sprout-blade"]').click();
 await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.filter((i:any)=>i.gearId==='sprout-blade').length)).toBe(1);
 await page.locator('[data-craft-category="armor"]').click();await expect(page.locator('.craft-group')).toHaveCount(1);await expect(page.locator('.craft-group h3')).toHaveText('Armor');await expect(page.locator('[data-recipe="sprout-blade"]')).toHaveCount(0);
 await page.locator('[data-craft-category="accessory"]').click();await expect(page.locator('.craft-group h3')).toHaveText('Charms');expect(errors).toEqual([]);
});

test('character info button reveals live secondary values on hover and can pin the panel',async({page})=>{
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},fixture());await page.goto('/?practice=1');await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:45000});await page.keyboard.press('c');
 const popover=page.locator('#secondary-popover'),button=page.getByRole('button',{name:'Show secondary stats'});await expect(popover).toBeHidden();await button.hover();await expect(popover).toBeVisible();await expect(popover).toContainText('0.5%/s');await expect(popover.locator('.secondary-character-stats > span')).toHaveCount(16);await page.screenshot({path:'artifacts/character-info.png'});
 await page.mouse.move(0,0);await expect(popover).toBeHidden();await button.click();await page.mouse.move(0,0);await expect(popover).toBeVisible();await button.click();await expect(popover).toBeHidden();
});

test('mobile craft grid fits eight columns and the info panel works by touch',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},fixture());await page.goto('/?practice=1');await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:45000});await page.locator('[data-panel="forge"]').click();
 const fit=await page.locator('.craft-grid').first().evaluate(e=>({columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,right:e.getBoundingClientRect().right,width:document.documentElement.scrollWidth}));expect(fit.columns).toBe(8);expect(fit.right).toBeLessThanOrEqual(390);expect(fit.width).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/craft-mobile.png'});
 await page.keyboard.press('Escape');await page.keyboard.press('c');await page.getByRole('button',{name:'Show secondary stats'}).click();await expect(page.locator('#secondary-popover')).toBeVisible();const bounds=await page.locator('#secondary-popover').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/character-info-mobile.png'});
});

test('craft rarity selection, upgrades and inventory tooltips show distinct matching material tiers',async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.gold=10000;for(const name of ['Shade essence','Rune stone','Sky feather']){sim.addItem(name,'leaf',5,'common');sim.addItem(name,'leaf',20,'epic');}
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);await page.goto('/?practice=1');await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:45000});await page.locator('[data-panel="forge"]').click();await page.locator('[data-recipe="sprout-blade"]').click();
 await expect(page.locator('[data-craft-rarity="common"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-craft-rarity="rare"]').click();await expect(page.locator('[data-craft="sprout-blade"]')).toBeDisabled();await expect(page.locator('.recipe-materials')).toContainText('Rare');
 await page.locator('[data-material-upgrade="Shade essence"][data-material-rarity="common"]').click();await page.locator('[data-material-upgrade="Rune stone"][data-material-rarity="common"]').click();await expect(page.locator('[data-craft="sprout-blade"]')).toBeDisabled();
 await page.locator('[data-craft-rarity="epic"]').click();await expect(page.locator('[data-craft="sprout-blade"]')).toBeEnabled();await page.screenshot({path:'artifacts/material-rarity-craft.png'});await page.locator('[data-craft="sprout-blade"]').click();await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().items.find((i:any)=>i.gearId==='sprout-blade')?.rarity)).toBe('epic');
 await page.keyboard.press('Escape');await page.locator('[data-panel="inventory"]').click();const rare=page.locator('[data-item="material:Shade essence:rare"]'),epic=page.locator('[data-item="material:Shade essence:epic"]');await expect(rare).toHaveClass(/rarity-rare/);await expect(epic).toHaveClass(/rarity-epic/);await rare.hover();await expect(page.locator('#item-tooltip')).toContainText('Shade essence · Rare');await epic.hover();await expect(page.locator('#item-tooltip')).toContainText('Shade essence · Epic');await page.screenshot({path:'artifacts/material-rarity-inventory.png'});
});
