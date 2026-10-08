import {test,expect} from '@playwright/test';
import {NetworkSimulation} from '../src/game/network';
import {Simulation} from '../src/simulation';
import {capture,type Snapshot} from '../server/protocol';

function snapshot():Snapshot {
 const sim=new Simulation(()=>.5,undefined,null);
 return {player:{id:'prediction-test',name:'Sprout',actor:capture(sim),lastSeen:1000,input:[0,0],inputAt:0,acknowledged:[],events:[],serial:0,session:{id:'test-session',sequence:0}},monsters:sim.monsters,peers:[],chat:[],revision:1,serverTime:1000};
}
test('delayed acknowledgement moves only presentation; prediction is bounded and obeys obstacles',async()=>{
 const original=globalThis.fetch,initial=snapshot();let release!:(response:Response)=>void;
 globalThis.fetch=async()=>new Promise<Response>(resolve=>{release=resolve});
 const sim=new NetworkSimulation(initial);
 try {
  sim.tick(.1,1,0);
  expect(sim.renderX).toBeGreaterThan(initial.player.actor.x+.3);
  expect(sim.x).toBe(initial.player.actor.x);
  expect(sim.save.gold).toBe(120);
  await expect.poll(()=>typeof release).toBe('function');
  for(let i=0;i<60;i++)sim.tick(1/60,1,0);
  expect(Math.hypot(sim.renderX-sim.x,sim.renderZ-sim.z)).toBeLessThanOrEqual(1.6);
  const before=sim.renderX;sim.obstacles=[{x:before+.44,z:sim.renderZ,r:2}];sim.tick(.1,1,0);
  expect(sim.renderX).toBeLessThan(before);
  const ack=structuredClone(initial);ack.player.actor.x=.44;ack.player.actor.save.gold=105;
  release(new Response(JSON.stringify(ack),{status:200}));
  await expect.poll(()=>sim.x).toBe(.44);expect(sim.save.gold).toBe(105);
  sim.paused=true;for(let i=0;i<30;i++)sim.tick(1/60,1,0);
  expect(sim.renderX).toBeCloseTo(sim.x,2);
 } finally {sim.dispose();globalThis.fetch=original;}
});

test('Low has a fixed pixel budget, sleeping template clips and lightweight ground markers',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 await page.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?practice=1');await page.locator('#practice-start').click();
 await page.waitForFunction(()=>(window as any).mossvale?.snapshot().riggedActors>=20);
 await expect(page.locator('#hp-text')).toHaveText('120 / 120');await page.waitForTimeout(2000);
 const inspect=()=>page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').map(e=>e.name).find(u=>u.includes('Engines_engine'))!;
  const {Engine}=await import(/* @vite-ignore */url),scene=Engine.LastCreatedEngine.scenes[0];
  const s=(window as any).mossvale.snapshot();
  const colors=scene.meshes.filter((m:any)=>m.material?.name.startsWith('low-')).map((m:any)=>({name:m.name,stride:m.getVertexBuffer('color')?.getSize(),values:Array.from(m.getVerticesData('color')||[]).slice(0,12)}));
  return {...s,colors,frame:scene.getEngine().frameId,rings:scene.meshes.filter((m:any)=>m.name==='selection-ring').map((m:any)=>m.getTotalVertices()),templateRunning:scene.animationGroups.filter((g:any)=>/^(idle|walk|attack|skill|hurt|death)$/.test(g.name)&&g.isPlaying).length};
 });
 const low=await inspect();
 expect(low.renderWidth*low.renderHeight).toBeLessThanOrEqual(960*540);
 expect(low.drawCalls).toBeLessThan(35);expect(low.activeAnimations).toBeLessThanOrEqual(18*7);
 expect(low.colors.length).toBeGreaterThan(0);expect(low.colors.every((c:any)=>c.stride===3)).toBe(true);
 for(const c of low.colors.filter((c:any)=>c.name.includes('dewdrop')||c.name.includes('wildcap')))expect(Math.max(...c.values)-Math.min(...c.values)).toBeGreaterThan(.1);
 expect(low.templateRunning).toBe(0);expect(low.rings.length).toBeGreaterThan(2);
 expect(Math.max(...low.rings)).toBe(66);
 await page.screenshot({path:'artifacts/performance-low.png'});
 await page.locator('[data-panel="settings"]').click();
 await page.locator('#graphics-quality').selectOption('high',{force:true});
 const high=await inspect();expect(high.renderWidth*high.renderHeight).toBeLessThanOrEqual(1920*1080);
 expect(high.renderWidth*high.renderHeight).toBeGreaterThan(low.renderWidth*low.renderHeight);
 await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/performance-high.png'});
 await page.locator('[data-panel="settings"]').click();await page.locator('#graphics-quality').selectOption('low',{force:true});await page.keyboard.press('Escape');
 await expect.poll(async()=>(await inspect()).frame).toBeGreaterThan(low.frame);
 expect(errors).toEqual([]);
});
