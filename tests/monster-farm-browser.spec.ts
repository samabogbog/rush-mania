import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {WORLD_BOUNDS,zoneMonsterGroups} from '../src/game/map-data';
const dir='artifacts/farm-groups';mkdirSync(dir,{recursive:true});
test('real map movement enters a visible territory; Auto farms two waves without leaving; walking out ends the rush',async({browser})=>{
 test.setTimeout(240000);
 const s=new Simulation(()=>.5,undefined,null);s.save.level=30;s.save.hp=s.maxHp;s.save.mp=s.maxMp;
 const context=await browser.newContext({viewport:{width:1200,height:800},recordVideo:{dir:dir+'/video',size:{width:1200,height:800}}});
 await context.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},s.save);
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot()),group=zoneMonsterGroups('glade')[0];
 const pack=(state:any)=>state.monsters.filter((m:any)=>m.groupId===group.id);
 try{
  await page.goto('/?practice=1');await page.waitForFunction(()=>{const d=(window as any).mossvale?.snapshot();return d&&d.riggedActors===d.modelsExpected&&d.modelErrors===0},{},{timeout:60000});
  expect((await snap()).territoriesCount).toBe(6);expect((await snap()).activeGroupId).toBeNull();
  await page.keyboard.press('m');await expect(page.getByText('Rush territory',{exact:true})).toBeVisible();await page.screenshot({path:dir+'/map-markers.png'});
  const box=(await page.locator('#large-map').boundingBox())!;
  await page.mouse.click(box.x+(group.x-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*box.width,box.y+(group.z-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*box.height);
  await page.waitForFunction(id=>(window as any).mossvale.snapshot().activeGroupId===id,group.id,{timeout:30000});
  await page.waitForFunction(({x,z})=>{const d=(window as any).mossvale.snapshot();return !d.destination&&Math.hypot(d.x-x,d.z-z)<.2},group,{timeout:30000});
  const arrived=await snap();expect(pack(arrived)).toHaveLength(group.count);expect(pack(arrived).every((m:any)=>m.aggro)).toBe(true);
  await expect.poll(async()=>pack(await snap()).filter((m:any)=>Math.hypot(m.x-arrived.x,m.z-arrived.z)<1.6).length,{timeout:30000}).toBe(group.count);
  await page.screenshot({path:dir+'/territory-rush.png'});
  await page.locator('#auto').click();
  await page.waitForFunction(n=>(window as any).mossvale.snapshot().kills>=n,arrived.kills+group.count*2,{timeout:90000});
  const farmed=await snap();expect(Math.hypot(farmed.x-arrived.x,farmed.z-arrived.z)).toBeLessThan(.01);expect(farmed.gold).toBeGreaterThan(arrived.gold);expect(farmed.hp).toBeGreaterThan(0);
  await page.screenshot({path:dir+'/second-wave.png'});await page.locator('#auto').click();
  await page.keyboard.down('a');try{await page.waitForFunction(id=>(window as any).mossvale.snapshot().activeGroupId!==id,group.id,{timeout:15000})}finally{await page.keyboard.up('a')}
  await expect.poll(async()=>pack(await snap()).filter((m:any)=>m.alive&&m.aggro).length,{timeout:10000}).toBe(0);
  await expect.poll(async()=>pack(await snap()).filter((m:any)=>m.alive).length,{timeout:45000}).toBe(group.count);
  expect(pack(await snap()).every((m:any)=>!m.aggro)).toBe(true);
  writeFileSync(dir+'/stationary-evidence.json',JSON.stringify({fixture:{level:30,practice:true},group,arrival:{x:arrived.x,z:arrived.z,kills:arrived.kills,gold:arrived.gold},farmed:{x:farmed.x,z:farmed.z,kills:farmed.kills,gold:farmed.gold,hp:farmed.hp},pageErrors:errors},null,2));
  expect(errors).toEqual([]);
 }finally{const video=page.video();await context.close();if(video)await video.saveAs(dir+'/stationary-farm.webm')}
});
