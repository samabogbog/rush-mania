import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeActor,seeded} from '../tools/attribute-duel-audit';
import {species,normalMonsterBalance} from '../src/game/content';
import {WORLD_BOUNDS,zoneMonsterGroups} from '../src/game/map-data';
test('v3 monsters render exact HP and a real attack earns kills and configured gold',async({page})=>{
 const s=makeActor('swordsman',100,'str','legendRolled',seeded(1));s.save.zone='glade';s.save.hotbar=Array(6).fill(null);s.save.hp=s.maxHp;s.save.mp=s.maxMp;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('artifacts/monsters-v3',{recursive:true});
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},s.save);
 await page.goto('/?practice=1');await page.locator('#practice-start').click();
 await page.waitForFunction(()=>{const d=(window as any).mossvale?.snapshot();return d&&d.modelsExpected>0&&d.riggedActors===d.modelsExpected&&d.modelErrors===0},{},{timeout:60000});
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot()),initial=await snap();
 for(const m of initial.monsters){const spec=species[m.kind as keyof typeof species],normal=normalMonsterBalance(spec.level);expect(m.hp).toBe(normal.hp*(spec.boss?40:spec.miniBoss?20:1));}
 await page.screenshot({path:'artifacts/monsters-v3/glade.png'});
 const group=zoneMonsterGroups('glade')[0];await page.keyboard.press('m');const box=(await page.locator('#large-map').boundingBox())!;
 await page.mouse.click(box.x+(group.x-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*box.width,box.y+(group.z-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)*box.height);
 await page.waitForFunction(id=>(window as any).mossvale.snapshot().activeGroupId===id,group.id,{timeout:30000});
 const before=await snap();expect(Math.hypot(before.x-initial.x,before.z-initial.z)).toBeGreaterThan(1);
 await page.locator('#auto').click();await page.waitForFunction(n=>(window as any).mossvale.snapshot().kills>n,before.kills,{timeout:45000});await page.locator('#auto').click();const after=await snap();
 const defeated=after.monsters.filter((m:any)=>!m.alive&&before.monsters.find((old:any)=>old.id===m.id)?.alive);expect(defeated).toHaveLength(after.kills-before.kills);expect(after.gold-before.gold).toBe(defeated.reduce((gold:number,m:any)=>gold+Math.round(s.monsterSpec(m.kind).gold*(1+(s.gearBonuses.goldBonus||0)/100)),0));expect(after.monsters.some((m:any)=>!m.alive||m.hp<initial.monsters.find((old:any)=>old.id===m.id).hp)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:'artifacts/monsters-v3/combat.png'});writeFileSync('artifacts/monsters-v3/browser-evidence.json',JSON.stringify({fixture:{level:100,job:'swordsman',practice:true,gear:'legendRolled',hotbar:[]},initialHp:initial.monsters.map((m:any)=>({kind:m.kind,hp:m.hp})),before:{x:before.x,z:before.z,kills:before.kills,gold:before.gold},after:{x:after.x,z:after.z,kills:after.kills,gold:after.gold,hp:after.hp},modelErrors:after.modelErrors,pageErrors:errors},null,2));
});
