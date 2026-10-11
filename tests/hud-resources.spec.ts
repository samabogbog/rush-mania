import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {rollGear} from '../src/game/equipment';
import {mkdirSync,writeFileSync} from 'node:fs';
test('HUD resource bars and integer labels stay within the identity card on desktop and mobile',async({page})=>{
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.zone='town';const gear=rollGear('starfall-helmet','ancient',()=>.61);s.addEquipmentItem({...gear,count:1});const item=s.save.items.find(i=>i.gearId==='starfall-helmet')!;expect(s.equip(item.id!)).toBe(true);s.save.hp=s.maxHp-.3;s.save.mp=s.maxMp-.6;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},s.save);await page.goto('/?practice=1');await page.locator('#practice-start').click();await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.modelsExpected>0&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:60000});
 await page.locator('.name-line strong').evaluate(el=>el.textContent='Adventurer b71x');mkdirSync('artifacts/hud-resources',{recursive:true});const results=[];
 for(const [width,height] of [[1200,800],[800,600],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await expect(page.locator('#hp-text')).toHaveText(/^[0-9]+ \/ [0-9]+$/);await expect(page.locator('#mp-text')).toHaveText(/^[0-9]+ \/ [0-9]+$/);
  const metrics=await page.locator('.identity').evaluate(el=>{const frame=el.getBoundingClientRect();return Array.from(el.querySelectorAll('.resource,.xp-mini,.identity-more')).filter(n=>getComputedStyle(n).display!=='none').map(n=>{const b=n.getBoundingClientRect();return{className:n.className,left:b.left-frame.left,right:b.right-frame.right,top:b.top-frame.top,bottom:b.bottom-frame.bottom}})});
  for(const m of metrics){expect(m.left).toBeGreaterThanOrEqual(0);expect(m.right).toBeLessThanOrEqual(0);expect(m.top).toBeGreaterThanOrEqual(0);expect(m.bottom).toBeLessThanOrEqual(0)}
  await expect(page.locator('#hp-text')).toContainText(`/ ${Math.round(s.maxHp)}`);await expect(page.locator('#mp-text')).toContainText(`/ ${Math.round(s.maxMp)}`);results.push({width,height,metrics});await page.locator('.identity').screenshot({path:`artifacts/hud-resources/${width}x${height}.png`});
 }
 expect(errors).toEqual([]);writeFileSync('artifacts/hud-resources/evidence.json',JSON.stringify({results,pageErrors:errors},null,2));
});
