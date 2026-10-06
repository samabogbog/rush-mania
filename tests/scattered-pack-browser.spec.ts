import {test,expect} from '@playwright/test';
import {WORLD_BOUNDS,zoneMonsterGroups} from '../src/game/map-data';
test('pack idles at positions across a broad map cell while its territory remains visible',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(()=>{localStorage.removeItem('mossvale-save');localStorage.setItem('mossvale-quality','low')});await page.goto('/?practice=1');
 await page.waitForFunction(()=>{const d=(window as any).mossvale?.snapshot();return d&&d.riggedActors===d.modelsExpected&&d.modelErrors===0},{},{timeout:60000});
 await expect(page.locator('#hp-text')).toContainText('/');
 const group=zoneMonsterGroups('glade')[0],snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot());
 await page.keyboard.press('m');await page.screenshot({path:'artifacts/scattered-full-map.png'});const box=(await page.locator('#large-map').boundingBox())!;
 await page.mouse.click(box.x+(group.x-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*box.width,box.y+(group.z-5-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*box.height);
 await page.waitForFunction(({x,z})=>{const s=(window as any).mossvale.snapshot();return !s.destination&&Math.hypot(s.x-x,s.z-z)<.2},{x:group.x,z:group.z-5},{timeout:30000});
 const state=await snap(),pack=state.monsters.filter((m:any)=>m.groupId===group.id),radii=pack.map((m:any)=>Math.hypot(m.homeX-group.x,m.homeZ-group.z));
 expect(pack).toHaveLength(group.count);expect(Math.max(...radii)-Math.min(...radii)).toBeGreaterThan(10);expect(pack.every((m:any)=>!m.aggro)).toBe(true);
 expect(state.activeGroupId).toBeNull();expect(state.territoriesCount).toBe(6);
 await page.screenshot({path:'artifacts/scattered-pack.png'});expect(errors).toEqual([]);
});
