import {test,expect,type Page,type Browser,type BrowserContext} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Simulation} from '../src/simulation';
import {zones,species,type ZoneId} from '../src/game/content';
import {WORLD_SIZE,WORLD_BOUNDS} from '../src/game/map-data';

const dir='artifacts/expanded-world';
const areas=Object.keys(zones) as ZoneId[];
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).mossvale.snapshot());
const summaries:any[]=[];
mkdirSync(dir,{recursive:true});

// Test response only: initial offline position. The checked-in runtime and save schema are unchanged.
// This establishes a fixture position, never evidence that the player traversed there.
async function boot(browser:Browser,zone:ZoneId,x=0,z=2,quality='low',video=false) {
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone=zone;sim.save.level=100;sim.save.hp=sim.maxHp;sim.save.mp=sim.maxMp;
 const context=await browser.newContext({viewport:{width:1200,height:800},...(video?{recordVideo:{dir:`${dir}/video`,size:{width:1200,height:800}}}:{})});
 await context.addInitScript(({save,quality})=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality',quality)}, {save:sim.save,quality});
 await context.route('**/src/main.ts*',async route=>{
  const response=await route.fetch();const body=await response.text();
  const marker='const feedback = new FeedbackAudio();';expect(body).toContain(marker);
  const cameraMarker='const nodes = /* @__PURE__ */ new Map();';expect(body).toContain(cameraMarker);
  const hook=`let reviewOverview=false;const originalRender=world.scene.render.bind(world.scene);world.scene.render=(...args)=>{if(reviewOverview){world.camera.position.set(0,110,.01);world.camera.setTarget(world.camera.position.clone().set(0,0,0));world.camera.upVector.set(0,0,1);const aspect=world.engine.getAspectRatio(world.camera);world.camera.orthoLeft=-52*aspect;world.camera.orthoRight=52*aspect;world.camera.orthoTop=52;world.camera.orthoBottom=-52;world.camera.getViewMatrix(true);world.camera.getProjectionMatrix(true);world.scene.updateTransformMatrix(true);}return originalRender(...args);};window.__expandedReview={resources(){return {materials:world.scene.materials.length,textures:world.scene.textures.length,meshes:world.scene.meshes.length}},overview(){reviewOverview=true},npc(id){const n=sim.zone.npcs.find(n=>n.id===id);return world.project(n.x,n.z,.9)}};`;
  await route.fulfill({response,body:body.replace(marker,`sim.x = ${x}; sim.z = ${z}; ${marker}`).replace(cameraMarker,hook+cameraMarker)});
 });
 const page=await context.newPage();const errors:string[]=[];let firstError:Error|undefined;
 page.on('pageerror',e=>{errors.push(e.message);firstError=e;});
 await page.goto('/?practice=1',{waitUntil:'domcontentloaded',timeout:30000});
 await expect.poll(async()=>{if(firstError)throw firstError;return await page.evaluate(()=>{const s=(window as any).mossvale?.snapshot();return !!s&&s.drawCalls>0&&s.riggedActors===s.modelsExpected})},{timeout:45000}).toBe(true);
 expect((await snapshot(page)).modelErrors).toBe(0);expect(errors).toEqual([]);
 return {page,context,errors};
}
async function walk(page:Page,key:string,axis:'x'|'z',sign:number,min=.45) {
 const before=await snapshot(page);await page.keyboard.down(key);
 try {await page.waitForFunction(({axis,origin,sign,min})=>((window as any).mossvale.snapshot()[axis]-origin)*sign>min,{axis,origin:before[axis],sign,min},{timeout:12000});}
 finally {await page.keyboard.up(key);}
 const after=await snapshot(page);expect((after[axis]-before[axis])*sign).toBeGreaterThan(min);
 return {key,before:{x:before.x,z:before.z},after:{x:after.x,z:after.z}};
}
async function mapClick(page:Page,x:number,z:number) {
 await page.keyboard.press('m');const map=page.locator('#large-map');await expect(map).toBeVisible();
 const box=(await map.boundingBox())!;await page.mouse.click(box.x+((x-WORLD_BOUNDS.minX)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX))*box.width,box.y+((z-WORLD_BOUNDS.minZ)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ))*box.height);
 const s=await snapshot(page);expect(s.destination?.x).toBeCloseTo(x,0);expect(s.destination?.z).toBeCloseTo(z,0);
 return s;
}
async function finish(context:BrowserContext,page:Page,name:string,errors:string[]) {
 expect(errors).toEqual([]);const video=page.video();await context.close();if(video)await video.saveAs(`${dir}/${name}.webm`);
}

for(const zone of areas)test(`${zone}: seeded sector actual WASD, square bounds and complete GLBs`,async({browser})=>{
 test.setTimeout(300000);const evidence:any[]=[];
 for(const [row,col] of (zone==='glade'?[-1,0,1].flatMap(row=>[-1,0,1].map(col=>[row,col])):[[0,0],[1,0]])) {
  const fixture={x:col*40,z:row*40};const {page,context,errors}=await boot(browser,zone,fixture.x,fixture.z);
  const movement=await walk(page,'d','x',1);const s=await snapshot(page);
  expect(s.x).toBeGreaterThanOrEqual(WORLD_BOUNDS.minX);expect(s.x).toBeLessThanOrEqual(WORLD_BOUNDS.maxX);
  expect(s.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.minZ);expect(s.z).toBeLessThanOrEqual(WORLD_BOUNDS.maxZ);
  expect(s.monsters.filter((m:any)=>species[m.kind as keyof typeof species].boss)).toHaveLength(1);
  expect(s.monsters.filter((m:any)=>species[m.kind as keyof typeof species].miniBoss)).toHaveLength(1);
  await page.screenshot({path:`${dir}/${zone}-sector-${row+1}-${col+1}-low.png`});
  evidence.push({fixturePositionOnly:fixture,movement,modelErrors:s.modelErrors,riggedActors:s.riggedActors,monsters:s.monsters.length,sceneMeshes:s.sceneMeshes,drawCalls:s.drawCalls,vfx:s.vfx});
  if(zone==='glade'&&row===0&&col===0) {
   await mapClick(page,32,0);await page.waitForFunction(()=>(window as any).mossvale.snapshot().x>25,{},{timeout:55000});
   const traveled=await snapshot(page);expect(traveled.x).toBeGreaterThan(25);expect(Math.abs(traveled.z)).toBeLessThan(2);
   await page.screenshot({path:`${dir}/${zone}-actual-map-walk-outer.png`});evidence.push({actualMapClickWalk:true,position:{x:traveled.x,z:traveled.z}});
  }
  if(row===0&&col===0){await page.evaluate(()=>(window as any).__expandedReview.overview());await page.waitForTimeout(300);await page.screenshot({path:`${dir}/${zone}-render-only-whole-square-overview.png`});}
  await finish(context,page,zone,errors);
 }
 summaries.push({zone,sectors:evidence});writeFileSync(`${dir}/${zone}-movement.json`,JSON.stringify(evidence,null,2));
});

for(const zone of ['glade','frost'] as ZoneId[])for(const quality of ['low','high'])test(`${zone} ${quality}: actual boss proximity windup and damage without selection`,async({browser})=>{
 test.setTimeout(300000);
 const {page,context,errors}=await boot(browser,zone,19,32,quality,true);
 const before=await snapshot(page);const boss=before.monsters.find((m:any)=>species[m.kind as keyof typeof species].boss);expect(boss).toBeTruthy();
 expect(before.target).toBeNull();expect(boss.aggro).toBe(false);
 await walk(page,'d','x',1,8);
 const observed=await page.evaluate(async(id:number)=>{
  const samples:any[]=[];const end=performance.now()+180000;let agg=false,wind=false,hpLoss=false;let prior=(window as any).mossvale.snapshot().hp;
  while(performance.now()<end){const s=(window as any).mossvale.snapshot(),m=s.monsters.find((m:any)=>m.id===id);agg ||= m.aggro;wind ||=m.windup>0;hpLoss ||=s.hp<prior;prior=s.hp;samples.push({hp:s.hp,target:s.target,x:s.x,z:s.z,monster:{x:m.x,z:m.z,aggro:m.aggro,windup:m.windup}});if(agg&&wind&&hpLoss)break;await new Promise(r=>requestAnimationFrame(r));}
  return {agg,wind,hpLoss,samples};
 },boss.id);
 expect(observed.agg).toBe(true);expect(observed.wind).toBe(true);expect(observed.hpLoss).toBe(true);expect(observed.samples.every((s:any)=>s.target===null)).toBe(true);
 await page.screenshot({path:`${dir}/${zone}-${quality}-actual-boss-combat.png`});
 const after=await snapshot(page);expect(after.modelErrors).toBe(0);expect(after.vfx.active).toBeLessThanOrEqual(after.vfx.limit);expect(after.vfx.pooled).toBeLessThanOrEqual(160);expect(after.sceneMeshes).toBeLessThanOrEqual(before.sceneMeshes+after.vfx.pooled+32);
 let lifecycle:any=null;
 if(zone==='frost'&&quality==='high'){
  await page.waitForFunction(()=>(window as any).mossvale.snapshot().hp<=0,{},{timeout:180000});const dead=await snapshot(page);await page.screenshot({path:`${dir}/frost-high-actual-player-death.png`});
  await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return s.hp>0&&Math.hypot(s.x,s.z-2)<1},{},{timeout:15000});const rescued=await snapshot(page);await page.screenshot({path:`${dir}/frost-high-actual-rescue.png`});lifecycle={dead,rescued};
 }
 if(zone==='glade'&&quality==='low'){
  await mapClick(page,0,2);await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return Math.hypot(s.x,s.z-2)<2},{},{timeout:35000});
  await page.waitForFunction(id=>{const m=(window as any).mossvale.snapshot().monsters.find((m:any)=>m.id===id);return !m.aggro&&!m.returning},boss.id,{timeout:15000});lifecycle={leashReset:await snapshot(page)};await page.screenshot({path:`${dir}/glade-low-actual-leash-reset.png`});
 }
 writeFileSync(`${dir}/${zone}-${quality}-combat.json`,JSON.stringify({fixturePositionOnly:{x:19,z:32},actualWASD:true,noPlayerSelectionOrAttack:true,environment:'Headless Chromium ANGLE SwiftShader; not player hardware FPS',before,after,observed,lifecycle},null,2));
 await finish(context,page,`${zone}-${quality}-actual-boss-combat`,errors);
});

test('town central hub remains safe, NPC panel and portal travel work; outer bounds clamp real input',async({browser})=>{
 const {page,context,errors}=await boot(browser,'town');const initial=await snapshot(page);
 await page.waitForTimeout(2000);const safe=await snapshot(page);expect(safe.hp).toBe(initial.hp);expect(safe.monsters.every((m:any)=>!m.aggro)).toBe(true);
 // NPC interaction is a real canvas pick at the rendered guide position.
 await mapClick(page,0,-5);await page.waitForFunction(()=>Math.hypot((window as any).mossvale.snapshot().x,(window as any).mossvale.snapshot().z+5)<.8,{},{timeout:15000});
 const guide=await page.evaluate(()=>(window as any).__expandedReview.npc('guide'));await page.mouse.click(guide.x,guide.y);await expect(page.locator('.game-panel')).toContainText('Adventure journal');
 await page.keyboard.press('Escape');
 await mapClick(page,0,-11);await page.waitForFunction(()=>Math.hypot((window as any).mossvale.snapshot().x,(window as any).mossvale.snapshot().z+11)<1,{},{timeout:15000});
 await page.keyboard.press('m');await page.locator('[data-travel="glade"]').click();await page.waitForFunction(()=>(window as any).mossvale.snapshot().zone==='glade');
 await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return s.riggedActors===s.modelsExpected});
 await page.screenshot({path:`${dir}/town-safe-portal-travel.png`});expect((await snapshot(page)).modelErrors).toBe(0);await finish(context,page,'town-hub',errors);
 for(const [x,z,key,axis,edge] of [[45.8,0,'d','x',46],[-45.8,0,'a','x',-46],[0,45.8,'s','z',46],[0,-45.8,'w','z',-46]] as const){
  const f=await boot(browser,'town',x,z);await f.page.keyboard.down(key);await f.page.waitForFunction(({axis,edge})=>Math.abs((window as any).mossvale.snapshot()[axis]-edge)<.01,{axis,edge},{timeout:12000});await f.page.keyboard.up(key);const s=await snapshot(f.page);expect(s[axis]).toBeCloseTo(edge,1);await finish(f.context,f.page,'bounds',f.errors);
 }
});

test('repeated glade and town visits keep material and mesh resources bounded',async({browser})=>{
 test.setTimeout(180000);const {page,context,errors}=await boot(browser,'town');const visits:any[]=[];
 for(const zone of ['glade','town','glade','town'] as ZoneId[]){
  await mapClick(page,0,-11);await page.waitForFunction(()=>Math.hypot((window as any).mossvale.snapshot().x,(window as any).mossvale.snapshot().z+11)<1,{},{timeout:20000});
  await page.keyboard.press('m');await page.locator(`[data-travel="${zone}"]`).click();await page.waitForFunction(z=>(window as any).mossvale.snapshot().zone===z,zone);
  await page.waitForFunction(()=>{const s=(window as any).mossvale.snapshot();return s.riggedActors===s.modelsExpected&&s.modelErrors===0},{},{timeout:30000});
  visits.push({zone,snapshot:await snapshot(page),resources:await page.evaluate(()=>(window as any).__expandedReview.resources())});
 }
 for(const zone of ['town','glade']){const samples=visits.filter(v=>v.zone===zone);expect(samples[1].resources.materials).toBeLessThanOrEqual(samples[0].resources.materials+8);expect(samples[1].resources.meshes).toBeLessThanOrEqual(samples[0].resources.meshes+8);}
 writeFileSync(`${dir}/repeated-zone-resources.json`,JSON.stringify({environment:'Headless Chromium ANGLE SwiftShader; bounded resource counts only',visits},null,2));await finish(context,page,'resources',errors);
});

test('all six square whole-world overviews use a render-only overhead camera',async({browser})=>{
 test.setTimeout(120000);
 for(const zone of areas){const {page,context,errors}=await boot(browser,zone,0,2,'high');await page.evaluate(()=>(window as any).__expandedReview.overview());await page.waitForTimeout(500);await page.screenshot({path:`${dir}/${zone}-render-only-whole-square-overview.png`});await finish(context,page,`${zone}-overview`,errors);}
});

test('glade miniboss normal camera shows purple crown and actual proximity warning',async({browser})=>{
 const {page,context,errors}=await boot(browser,'glade',-45,32,'low',true);const before=await snapshot(page);const mini=before.monsters.find((m:any)=>species[m.kind as keyof typeof species].miniBoss);expect(mini.aggro).toBe(false);await walk(page,'d','x',1,8);
 await page.waitForFunction(id=>{const s=(window as any).mossvale.snapshot(),m=s.monsters.find((m:any)=>m.id===id);return m.aggro&&m.windup>0&&s.target===null},mini.id,{timeout:60000});
 await page.screenshot({path:`${dir}/glade-low-actual-miniboss-windup.png`});writeFileSync(`${dir}/glade-low-miniboss.json`,JSON.stringify({fixturePositionOnly:{x:-45,z:32},actualWASD:true,noPlayerSelectionOrAttack:true,before,after:await snapshot(page)},null,2));await finish(context,page,'glade-low-actual-miniboss',errors);
});
