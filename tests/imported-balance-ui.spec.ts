import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {progression} from '../src/config/balance';
test('imported EXP requirements render after complete models at level 1, 50 and cap',async({browser})=>{
 for(const level of [1,50,100]){
  const sim=new Simulation(()=>.5,undefined,null);sim.save.level=level;sim.save.xp=level===100?0:23;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
  const context=await browser.newContext({viewport:{width:1200,height:800}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);await page.goto('/?practice=1');
  await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:45000});
  await expect(page.locator('#exp-text')).toHaveText(level===100?'MAX LEVEL':`23 / ${Math.ceil(progression.levels[level-1].nextLevelXp).toLocaleString()}`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1200);expect(errors).toEqual([]);
  if(level===50)await page.screenshot({path:'artifacts/imported-exp-level50.png'});await context.close();
 }
});
