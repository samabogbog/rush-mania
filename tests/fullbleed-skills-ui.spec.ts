import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {skills, type ClassId} from '../src/game/classes';
import {mkdirSync} from 'node:fs';
for(const job of ['swordsman','mage','archer'] as ClassId[])test(`${job}: opaque artwork loads and fills skill hotbar, cards and loadout`,async({page})=>{
 const mobile=job==='archer';await page.setViewportSize(mobile?{width:390,height:844}:{width:1200,height:800});
 const sim=new Simulation(()=>.5,undefined,null),save=sim.save;save.level=100;save.job=job;save.skillChoices[job]=skills[job].filter(s=>s.branch===0).map(s=>s.id);save.hotbar=save.skillChoices[job].slice(0,6);for(const id of save.skillChoices[job])if(id)save.skillRanks[id]=1;
 await page.addInitScript(s=>{localStorage.setItem('mossvale-save',JSON.stringify(s));localStorage.setItem('mossvale-quality','low')},save);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?practice=1');await page.locator('#practice-start').click();await expect(page.locator('#hp-text')).toContainText('/');
 await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.modelsExpected>0&&s.riggedActors===s.modelsExpected&&s.modelErrors===0},null,{timeout:90000});
 const assertFill=async(selector:string)=>{const results=await page.locator(selector).evaluateAll(images=>images.map(el=>{const image=el as HTMLImageElement,parent=image.parentElement!,a=image.getBoundingClientRect(),b=parent.getBoundingClientRect(),cs=getComputedStyle(parent);return {loaded:image.complete&&image.naturalWidth===192&&image.currentSrc.includes('/icons/skills-v4/'),fit:getComputedStyle(image).objectFit,dx:Math.abs(a.width-(b.width-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth))),dy:Math.abs(a.height-(b.height-parseFloat(cs.borderTopWidth)-parseFloat(cs.borderBottomWidth)))}}));expect(results.length).toBeGreaterThan(0);for(const r of results){expect(r.loaded).toBe(true);expect(r.fit).toBe('cover');expect(r.dx).toBeLessThan(2);expect(r.dy).toBeLessThan(2)}};
 await assertFill('.skill-hotbar .skill-image');mkdirSync('artifacts/skills-v4',{recursive:true});await page.screenshot({path:`artifacts/skills-v4/${job}-hotbar.png`});
 if(mobile){await page.locator('#mobile-menu-toggle').click();await page.locator('[data-mobile-panel="skills"]').click()}else await page.keyboard.press('k');
 await expect(page.locator('.skill-card')).toHaveCount(20);await page.locator('.skill-image').evaluateAll(images=>Promise.all(images.map(i=>(i as HTMLImageElement).decode())));await assertFill('.skill-art .skill-image');await assertFill('.loadout-skill-art .skill-image');await page.screenshot({path:`artifacts/skills-v4/${job}-skills.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile?390:1200);expect(errors).toEqual([]);
});
