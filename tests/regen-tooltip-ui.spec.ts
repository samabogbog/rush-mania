import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {gearById,rollGear} from '../src/game/equipment';
test('hover and pinned equipment details show percent regen and high-roll colors without source prose',async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.zone='town';
 const g=gearById('moonveil-coat')!;
 const item={...rollGear(g.id,'epic',()=>.5),name:g.name,icon:g.icon,count:1,secondary:{hpRegen:.24,mpRegen:.45,critChance:.1}};
 sim.addEquipmentItem(item);
 await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?practice=1');await expect(page.locator('#hp-text')).toContainText('/');await page.keyboard.press('i');
 const cell=page.locator(`.inventory-grid [data-item="${item.id}"]`);await cell.hover();
 for(const id of ['#item-tooltip','#item-details']){
  if(id==='#item-details')await cell.click();const tip=page.locator(id);await expect(tip).toBeVisible();
  await expect(tip).not.toContainText(g.description);await expect(tip).not.toContainText('Total base-stat');await expect(tip).not.toContainText('Refinement');await expect(tip).not.toContainText('Monsters Lv');
  const high=tip.locator('.secondary-roll-high'),excellent=tip.locator('.secondary-roll-excellent');
  await expect(high).toContainText('0.24%/s');await expect(excellent).toContainText('0.45%/s');
  expect(await high.locator('b').evaluate(e=>Number(getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(700);
  expect(await excellent.locator('b').evaluate(e=>Number(getComputedStyle(e).fontWeight))).toBeGreaterThanOrEqual(700);
  expect(await high.locator('b').evaluate(e=>getComputedStyle(e).color)).not.toBe(await excellent.locator('b').evaluate(e=>getComputedStyle(e).color));
  expect(await high.evaluate(e=>getComputedStyle(e).color)).toBe(await excellent.evaluate(e=>getComputedStyle(e).color));
  expect(await high.evaluate(e=>getComputedStyle(e).color)).not.toBe(await high.locator('b').evaluate(e=>getComputedStyle(e).color));
 }
 await page.screenshot({path:'.local/regen-tooltip-desktop.png'});
 await page.setViewportSize({width:390,height:844});const box=await page.locator('#item-details').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);expect(box!.y+box!.height).toBeLessThanOrEqual(844);
 expect(errors).toEqual([]);
});
