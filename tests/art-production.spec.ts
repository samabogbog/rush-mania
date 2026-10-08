import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { skills } from '../src/game/classes';
import { Simulation } from '../src/simulation';
import type { ClassId } from '../src/game/classes';

const jobs: ClassId[] = ['swordsman','mage','archer'];
const seed=(job:ClassId='swordsman',zone: 'glade'|'town'='glade')=>{
 const s=new Simulation(()=>.5,undefined,null);s.save.job=job;s.save.zone=zone;s.save.level=100;for(let n=1;n<=10;n++)s.chooseSkill(`${job}-${n%2?'':'b-'}${n}`);s.assignSkill(5,`${job}-b-10`);s.save.hp=s.maxHp;s.save.mp=s.maxMp;return s.save;
};
const state=(page:any)=>page.evaluate(()=>(window as any).mossvale.snapshot());
const boot=async(page:any,job:ClassId,quality:string,zone:'glade'|'town'='glade')=>{
 await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(({save,quality}:{save:any,quality:string})=>{if(!/^https?:/.test(location.protocol))return;localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality)}, {save:seed(job,zone),quality});
 let rejectBoot!:(e:Error)=>void;const bootFailure=new Promise<never>((_,reject)=>rejectBoot=reject);void bootFailure.catch(()=>{});
 page.on('pageerror',(e:any)=>{console.log('ART_PAGE_ERROR',e.stack);rejectBoot(e)});page.on('console',(m:any)=>{if(m.type()==='error')console.log('ART_CONSOLE_ERROR',m.text())});
 await page.goto('/?practice=1',{waitUntil:'domcontentloaded',timeout:30000});console.log('ART_DOM_READY');
 await Promise.race([page.waitForFunction(()=>(window as any).mossvale?.snapshot().drawCalls>0,{},{timeout:30000}),bootFailure]);console.log('ART_RENDER_READY',await page.evaluate(()=>{const s=(window as any).mossvale.snapshot();return {quality:s.quality,drawCalls:s.drawCalls,riggedActors:s.riggedActors,sceneMeshes:s.sceneMeshes,fps:s.fps,frameP95:s.frameP95}}));
 await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return s.riggedActors>=s.monsters.length+3},{},{timeout:30000});
 expect((await state(page)).modelErrors).toBe(0);
 await page.waitForTimeout(1000);
};

for(const job of jobs)for(const quality of ['low','high'])test(`${job} ${quality}: both-path low/high skill visuals clean up without changing gameplay`,async({browser},testInfo)=>{
 const context=await browser.newContext({viewport:{width:1200,height:800},recordVideo:{dir:'artifacts/production/video',size:{width:1200,height:800}}});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await boot(page,job,quality);await expect.poll(async()=> (await state(page)).vfx.active).toBe(0);
 const frameSample=await page.evaluate(async(frameCount:number)=>{const frames:number[]=[];let last=performance.now();for(let i=0;i<frameCount;i++)await new Promise<void>(r=>requestAnimationFrame(t=>{frames.push(t-last);last=t;r()}));frames.sort((a,b)=>a-b);return {p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],samples:frames.length}},Number(process.env.MOSSVALE_ART_FRAMES||45));
 if(process.env.MOSSVALE_ART_QUICK!=='1')for(const [key,axis,sign] of [['d','x',1],['w','z',-1],['a','x',-1]] as const){const origin=(await state(page))[axis];await page.keyboard.down(key);await page.waitForFunction(({axis,origin,sign})=>{const s=(window as any).mossvale.snapshot();return (s[axis]-origin)*sign>.5},{axis,origin,sign},{timeout:20000});await page.keyboard.up(key);await page.waitForTimeout(250)}
 const before=await state(page);await page.screenshot({path:`artifacts/production/${job}-${quality}-idle.png`});
 const samples:any[]=[];
 for(const id of [`${job}-1`,`${job}-b-1`,`${job}-10`,`${job}-b-10`]){
  expect(await page.evaluate(id=>(window as any).mossvale.previewSkill(id),id)).toBe(true);
  await expect.poll(async()=> (await state(page)).vfx.active).toBeGreaterThan(0);
  // Natural timeline stays unmodified; transient phases are not polled over RPC.
  await expect.poll(async()=> (await state(page)).vfx.active,{timeout:20000}).toBe(0);
  expect(await page.evaluate(id=>(window as any).mossvale.previewSkill(id,.35),id)).toBe(true);
  expect((await state(page)).previewHeld).toBe(true);
  await page.screenshot({path:`artifacts/production/${job}-${quality}-${id}.png`});
  await page.evaluate(()=>(window as any).mossvale.clearSkillPreview());
  expect(await page.evaluate(id=>(window as any).mossvale.previewSkill(id,.65),id)).toBe(true);
  await page.screenshot({path:`artifacts/production/${job}-${quality}-${id}-impact.png`});
  await page.evaluate(()=>(window as any).mossvale.clearSkillPreview());
  expect((await state(page)).previewHeld).toBe(false);
  expect((await state(page)).vfx.active).toBe(0);
  samples.push({id,...await state(page)});
 }
 const after=await state(page);expect(after.skillCooldowns).toEqual(before.skillCooldowns);expect(after.hotbar).toEqual(before.hotbar);expect(after.items).toEqual(before.items);expect(after.kills).toBe(before.kills);expect(before.modelErrors).toBe(0);expect(after.modelErrors).toBe(0);
 expect(after.vfx.pooled).toBeLessThanOrEqual(160);expect(after.vfx.active).toBeLessThanOrEqual(after.vfx.limit);expect(after.sceneMeshes).toBeLessThanOrEqual(before.sceneMeshes+after.vfx.pooled+16);
 expect(errors).toEqual([]);mkdirSync('artifacts/production',{recursive:true});writeFileSync(`artifacts/production/${job}-${quality}-metrics.json`,JSON.stringify({environment:'Headless Chromium ANGLE SwiftShader software WebGL; metrics are not player hardware benchmarks',movementVerified:process.env.MOSSVALE_ART_QUICK!=='1',peakFrames:{renderOnly:true,ages:[.35,.65],naturalTimelineRecordedBeforeHold:true},frameSample,before,after,samples},null,2));
 const video=page.video();await context.close();if(video)await video.saveAs(`artifacts/production/${job}-${quality}.webm`);
 testInfo.annotations.push({type:'visual-review',description:'Video and screenshots require human/controller review; DOM success does not award art score.'});
});

test('town composition and mobile playfield render without UI overflow or broken art',async({page})=>{
 await boot(page,'mage','high','town');await page.screenshot({path:'artifacts/production/town-high-1200.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/production/town-high-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.keyboard.press('k');await expect(page.locator('.skill-card')).toHaveCount(20);
 await page.locator('.panel-body').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'artifacts/production/mage-icons-mobile.png'});
 const missing=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));expect(missing).toEqual([]);
});

 test('all sixty skill icons are distinct PNGs with consistent framing and valid runtime mappings',()=>{
 const manifest=JSON.parse(readFileSync('art/skills/manifest.json','utf8'));expect(manifest.skills).toHaveLength(60);const hashes=new Set<string>();
 for(const job of jobs)for(const skill of skills[job]){
  const entry=manifest.skills.find((e:any)=>e.id===skill.id);expect(entry).toBeDefined();expect(skill.icon).toBe(entry.icon);
  const bytes=readFileSync(entry.path);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(192);expect(bytes.readUInt32BE(20)).toBe(192);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const [left,top,right,bottom]=entry.visible_bounds;expect(Math.min(left,top,192-right,192-bottom)).toBeGreaterThanOrEqual(26);
  expect(Math.max(right-left,bottom-top)).toBeGreaterThanOrEqual(125);expect(Math.max(right-left,bottom-top)).toBeLessThanOrEqual(140);
 }expect(hashes.size).toBe(60);
});

test('real learned mage cast anticipates during cast and impacts only on resolution',async({page})=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.job='mage';sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 for(let n=1;n<=10;n++)sim.chooseSkill(`mage-${n}`);sim.assignSkill(0,'mage-10');
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},sim.save);
 await page.setViewportSize({width:1200,height:800});await page.goto('/?practice=1');await page.locator('#practice-start').click();await page.waitForFunction(()=>(window as any).mossvale?.snapshot().riggedActors>=3);
 await page.keyboard.press('Tab');await page.keyboard.press('1');
 await page.waitForFunction(()=>!!(window as any).mossvale.snapshot().cast);
 const casting=await state(page);expect(casting.cast.skillId).toBe('mage-10');expect(casting.skillCooldowns['mage-10']).toBeGreaterThan(0);
 if(casting.cast.remaining>.15)expect(casting.skillMotion?.phase).not.toBe('release');
 await page.screenshot({path:'artifacts/production/mage-real-cast.png'});
 await page.waitForFunction(()=>!(window as any).mossvale.snapshot().cast);
 await expect.poll(async()=>(await state(page)).vfx.active).toBeGreaterThan(0);
 await page.screenshot({path:'artifacts/production/mage-real-impact.png'});
 await expect.poll(async()=>(await state(page)).vfx.active,{timeout:20000}).toBe(0);
});
