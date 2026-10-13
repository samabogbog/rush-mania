import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeActor,seeded} from '../tools/attribute-duel-audit';
import {WORLD_BOUNDS,zoneMonsterGroups} from '../src/game/map-data';
test.use({viewport:{width:1200,height:800},video:{mode:'on',size:{width:1200,height:800}}});
test('soft shadows preserve real movement, learned skill damage and visible effects',async({page})=>{
 const dir='artifacts/soft-shadows/gameplay';mkdirSync(dir,{recursive:true});const sim=makeActor('mage',100,'vit','legendRolled',seeded(1));sim.save.zone='glade';sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','high')},sim.save);
 await page.goto('/?practice=1');await page.locator('#practice-start').click();await page.waitForFunction(()=>{const d=(window as any).mossvale?.snapshot();return d&&d.modelsExpected>0&&d.riggedActors===d.modelsExpected&&d.modelErrors===0},{},{timeout:60000});
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot()),start=await snap(),g=zoneMonsterGroups('glade')[0];
 await page.keyboard.press('m');const b=(await page.locator('#large-map').boundingBox())!;await page.mouse.click(b.x+(g.x-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*b.width,b.y+(g.z-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*b.height);
 await page.waitForFunction(id=>(window as any).mossvale.snapshot().activeGroupId===id,g.id,{timeout:40000});const arrival=await snap();expect(Math.hypot(arrival.x-start.x,arrival.z-start.z)).toBeGreaterThan(5);
 await page.keyboard.press('Tab');const target=await snap();expect(target.target).not.toBeNull();await page.keyboard.press('1');await page.waitForFunction(mp=>(window as any).mossvale.snapshot().mp<mp,arrival.mp,{timeout:10000});
 await page.waitForFunction(k=>(window as any).mossvale.snapshot().kills>k,arrival.kills,{timeout:25000});const released=await snap();expect(released.cooldowns[0]).toBeGreaterThan(0);expect(released.mp).toBeLessThan(arrival.mp);expect(released.monsters.some((m:any)=>!m.alive)).toBe(true);
 await page.screenshot({path:dir+'/combat-high.png'});const samples=await page.evaluate(async()=>{const data:any[]=[];let last=performance.now();const end=last+2500;while(performance.now()<end){await new Promise(requestAnimationFrame);const now=performance.now(),s=(window as any).mossvale.snapshot();data.push({frameMs:now-last,drawCalls:s.drawCalls,meshes:s.sceneMeshes,materials:s.sceneMaterials,textures:s.sceneTextures,vfx:s.vfx});last=now;}return data;});
 expect(errors).toEqual([]);expect(released.modelErrors).toBe(0);writeFileSync(dir+'/gameplay.json',JSON.stringify({fixture:{practice:true,job:'mage',level:100,legalLearnedSkills:true,gear:'legendRolled'},start,arrival,target,released,samples,pageErrors:errors,environment:'Chromium SwiftShader; not player FPS'},null,2));const video=page.video();await page.close();if(video)await video.saveAs(dir+'/gameplay.webm');
});
