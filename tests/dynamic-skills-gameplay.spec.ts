import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {skills,type ClassId} from '../src/game/classes';
const out='artifacts/dynamic-skills';
const jobs:ClassId[]=['swordsman','mage','archer'];
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).mossvale.snapshot());
async function ready(page:Page){await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.drawCalls>0&&s.riggedActors>=s.monsters.length+3},{},{timeout:45000});expect((await snapshot(page)).modelErrors).toBe(0);}
async function assign(page:Page,id:string,slot:number){await page.keyboard.press('k');const trigger=page.locator(`[data-slot-for="${id}"]`);await trigger.evaluate((el,value)=>{const s=el as HTMLSelectElement;s.value=String(value);s.dispatchEvent(new Event('change',{bubbles:true}));},slot);await page.locator(`[data-assign="${id}"]`).click();await page.keyboard.press('Escape');expect((await snapshot(page)).hotbar[slot]).toBe(id);}
async function approach(page:Page,range:number){
 await page.keyboard.press('Tab');await expect.poll(async()=>(await snapshot(page)).target).not.toBeNull();
 const initial=await snapshot(page),targetId=initial.target;await page.locator('#untarget').evaluate((b:HTMLElement)=>b.click());
 // Keep a read-only target id while actual WASD clears targeting; select again only when in skill range.
 for(let i=0;i<48;i++){const s=await snapshot(page),target=s.monsters.find((m:any)=>m.id===targetId&&m.alive);if(!target)throw Error('Approach target died before skill');const dx=target.x-s.x,dz=target.z-s.z;if(Math.hypot(dx,dz)<=range-.15){await page.keyboard.press('Tab');return;}const key=Math.abs(dx)>Math.abs(dz)?dx>0?'d':'a':dz>0?'s':'w';await page.keyboard.down(key);await page.waitForTimeout(100);await page.keyboard.up(key);}
 throw Error('Real keyboard approach did not reach range');
}
for(const job of jobs)for(const branch of [0,1] as const)for(const quality of ['low','high'])test(`${job} branch ${branch} ${quality}: learn and genuinely cast stages 1 and 10`,async({browser})=>{
 mkdirSync(out,{recursive:true});const name=`real-${job}-b${branch}-${quality}`;
 const context=await browser.newContext({viewport:{width:1200,height:800},recordVideo:{dir:out+'/video',size:{width:1200,height:800}}});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error('QA_PAGE_ERROR',e.message)});
 const sim=new Simulation(()=>.5,undefined,null);sim.save.job=job;sim.save.level=100;sim.save.hp=sim.maxHp*.5;sim.save.mp=sim.maxMp;sim.save.tutorial=['skip'];
 await page.addInitScript(({save,quality})=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality)},{save:sim.save,quality});
 await page.goto('/?practice=1');await page.locator('#practice-start').click();await ready(page);await page.keyboard.press('k');for(let stage=1;stage<=10;stage++)await page.locator(`[data-learn="${job}-${branch?'b-':''}${stage}"]`).click();await expect(page.locator('.learned-tag')).toHaveCount(10);await page.keyboard.press('Escape');
 const records:any[]=[];
 for(const stage of [1,10]){
  const skill=skills[job].find(s=>s.stage===stage&&s.branch===branch)!;await page.locator('#untarget').evaluate((b:HTMLElement)=>b.click());await assign(page,skill.id,stage===1?0:1);
  if(!['guard','fury','heal'].includes(skill.effect))await approach(page,skill.range);
  const before=await snapshot(page);expect(before.unlockedSkills).toContain(skill.id);await page.keyboard.press(stage===1?'1':'2');
  await page.waitForFunction(id=>(window as any).mossvale.snapshot().skillCooldowns[id]>0,skill.id,{timeout:12000});const accepted=await snapshot(page);
  expect(accepted.mp).toBeLessThan(before.mp);expect(accepted.skillCooldowns[skill.id]).toBeGreaterThan(0);if(skill.cast){expect(accepted.cast?.skillId).toBe(skill.id);expect(accepted.cast?.total).toBe(skill.cast);}
  await page.screenshot({path:`${out}/${name}-stage${stage}-accepted.png`});
  await page.waitForFunction(()=>!(window as any).mossvale.snapshot().cast,{},{timeout:10000});const resolved=await snapshot(page);
  if(skill.effect==='heal')expect(resolved.hp).toBeGreaterThan(before.hp);
  else if(skill.effect==='guard'||skill.effect==='fury')await expect(page.locator('#combat-state')).toContainText(skill.effect==='guard'?'Guard':'Attack boost');
  else {const a=before.monsters.find((m:any)=>m.id===before.target),b=resolved.monsters.find((m:any)=>m.id===before.target);expect(resolved.kills>before.kills||!!(a&&b&&b.hp<a.hp)).toBe(true);}
  await page.waitForFunction(()=>!(window as any).mossvale.snapshot().skillMotion,{},{timeout:10000});const recovered=await snapshot(page);expect(recovered.modelErrors).toBe(0);expect(errors).toEqual([]);
  records.push({skill,before,accepted,resolved,recovered,combatState:await page.locator('#combat-state').textContent()});await page.screenshot({path:`${out}/${name}-stage${stage}-recovered.png`});
 }
 const idle=await snapshot(page);await page.keyboard.down('d');await page.waitForFunction(x=>(window as any).mossvale.snapshot().x>x+.3,idle.x,{timeout:10000});await page.keyboard.up('d');const moved=await snapshot(page);expect(moved.x).toBeGreaterThan(idle.x+.3);expect(errors).toEqual([]);
 writeFileSync(`${out}/${name}.json`,JSON.stringify({environment:'Chromium ANGLE SwiftShader software renderer',records,movementAfterRecovery:{idle,moved},errors},null,2));const video=page.video();await context.close();if(video)await video.saveAs(`${out}/${name}.webm`);
});
