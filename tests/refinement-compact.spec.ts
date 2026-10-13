import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {gearById,rollGear} from '../src/game/equipment';
import {refineStones} from '../src/game/refinement';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/refinement-compact',{recursive:true});
for(const [width,height] of [[1200,800],[390,844],[360,740]])test(`${width}x${height}: refinement fits one screen and equipment pages retain unique selection`,async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.level=100;sim.save.gold=10000;sim.save.zone='town';
 const g=gearById('field-coat')!;
 for(let n=0;n<60;n++)sim.addEquipmentItem({...rollGear(g.id,'legend',()=>.5),id:`equipment-${n}`,name:g.name,icon:g.icon,count:1,refine:n%10,secondary:{critChance:5,critDamage:15,damageReduction:4,hpRegen:.3,mpRegen:.3}});
 sim.equip('equipment-0');sim.addItem(refineStones.common.name,refineStones.common.icon,20);sim.addItem(refineStones.rare.name,refineStones.rare.icon,20);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height});await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);
 await page.goto('/?practice=1');await page.locator('#practice-start').click();
 if(width<=900){await page.locator('#mobile-menu-toggle').click();await page.locator('[data-mobile-panel="forge"]').click()}else await page.locator('[data-panel="forge"]').first().click();await page.locator('[data-forge-tab="refine"]').click();
 const fit=async()=>{
  const bounds=await page.locator('.panel-body').evaluate(e=>({height:e.clientHeight,content:e.scrollHeight,width:e.clientWidth,contentWidth:e.scrollWidth}));expect(bounds.content).toBeLessThanOrEqual(bounds.height+1);expect(bounds.contentWidth).toBeLessThanOrEqual(bounds.width+1);
  const action=await page.locator('#refine').boundingBox();expect(action!.y).toBeGreaterThanOrEqual(0);expect(action!.y+action!.height).toBeLessThanOrEqual(height);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const card=await page.locator('[data-refine-item]').first().boundingBox();expect(card!.width).toBeLessThanOrEqual(width>900?72:56);
 };
 await fit();await page.getByRole('button',{name:'Next equipment page'}).click();await expect(page.locator('[data-refine-item="equipment-0"]')).toHaveCount(0);
 const id=width>700?'equipment-30':'equipment-20',item=page.locator(`[data-refine-item="${id}"]`);await item.click();await expect(item).toHaveAttribute('aria-pressed','true');await fit();
 await page.screenshot({path:`artifacts/refinement-compact/${width}x${height}.png`});
 const before=await page.evaluate(()=>(window as any).mossvale.snapshot());await page.evaluate(()=>Math.random=()=>0);await page.locator('#refine').click();await expect(page.locator('#refine-result')).toContainText(/success/i);await fit();
 const after=await page.evaluate(()=>(window as any).mossvale.snapshot());expect(after.items.find((i:any)=>i.id===id).refine).toBe(before.items.find((i:any)=>i.id===id).refine+1);expect(after.items.find((i:any)=>i.id==='equipment-0').refine).toBe(0);expect(errors).toEqual([]);
});
