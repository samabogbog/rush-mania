import {test as base,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
const test=base.extend({browser:async({playwright},use)=>{const browser=await playwright.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{await use(browser)}finally{await browser.close()}}});
test('six areas render rigged creatures, portal travel and equipment comparisons without page errors',async({browser})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.gold=3000;sim.addItem('Dew jelly','jelly',10);sim.addItem('Verdant leaf','leaf',10);sim.craft('sprout-blade');sim.addItem('Field Coat','field-coat');sim.equip(sim.save.items.find(i=>i.gearId==='field-coat')!.id!);
 const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?practice=1');await page.waitForFunction(()=>(window as any).mossvale?.snapshot().riggedActors>=20);expect((await page.evaluate(()=>(window as any).mossvale.snapshot())).modelErrors).toBe(0);
 await page.keyboard.press('i');await page.locator('[data-item]:not([data-item="sword"])').filter({hasText:'+0'}).first().hover();await expect(page.locator('#item-tooltip')).toContainText('vs equipped');await page.screenshot({path:'artifacts/equipment-compare.png'});await page.keyboard.press('Escape');
 // Walk to the portal through real controls, then change areas through the map.
 await page.keyboard.down('w');await page.waitForFunction(()=>(window as any).mossvale.snapshot().z< -8,{},{timeout:60000});await page.keyboard.up('w');
 for(const zone of ['town','orchard','marsh','frost','ruins']){
  await page.keyboard.press('m');await page.locator(`[data-travel="${zone}"]`).click();await page.waitForFunction(z=>(window as any).mossvale.snapshot().zone===z,zone,{timeout:30000});await page.screenshot({path:`artifacts/area-${zone}.png`});
 }
 expect(errors).toEqual([]);await context.close();
});
