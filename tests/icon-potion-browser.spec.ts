import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {runeTypes} from '../src/game/runes';
import {refineStones} from '../src/game/refinement';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/icons-potions',{recursive:true});
test('new rune/refinement art renders in compact forge and potion recovers gradually from hotbar',async({page})=>{
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.zone='town';s.save.hp=s.maxHp*.1;s.save.mp=s.maxMp*.1;s.addItem('Field Coat','field-coat');for(const r of runeTypes)s.addItem(r.name,r.icon,1,'common');for(const t of ['common','rare'] as const)s.addItem(refineStones[t].name,refineStones[t].icon,5);
 await page.setViewportSize({width:1200,height:800});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},s.save);await page.goto('/?practice=1');await page.locator('#practice-start').click();await page.locator('[data-panel="forge"]').first().click();await page.locator('[data-craft-category="rune"]').click();await expect.poll(()=>page.locator('[data-rune-recipe] img').evaluateAll(nodes=>nodes.filter(n=>!(n as HTMLImageElement).complete||!(n as HTMLImageElement).naturalWidth).length)).toBe(0);await page.screenshot({path:'artifacts/icons-potions/runes.png'});
 await page.locator('[data-forge-tab="refine"]').click();await expect(page.locator('[data-refine-stone="common"] img')).toHaveAttribute('src','/icons/refine-stone-common.png');await expect(page.locator('[data-refine-stone="rare"] img')).toHaveAttribute('src','/icons/refine-stone-rare.png');await page.screenshot({path:'artifacts/icons-potions/gems.png'});await page.keyboard.press('Escape');await page.locator('[data-panel="shop"]').first().click();await expect(page.locator('.panel-body')).toContainText('20%');await expect(page.locator('.panel-body')).toContainText('2');await page.keyboard.press('Escape');
 const start=await page.evaluate(()=>(window as any).mossvale.snapshot());await page.keyboard.press('7');await expect.poll(async()=>(await page.evaluate(()=>(window as any).mossvale.snapshot())).items.find((i:any)=>i.name==='Red potion').count).toBe(start.items.find((i:any)=>i.name==='Red potion').count-1);
 await expect.poll(async()=>page.evaluate(()=>(window as any).mossvale.snapshot().hp),{timeout:60000}).toBeGreaterThan(start.hp+s.maxHp*.19);expect(errors).toEqual([]);
});
