import {test,expect,type Page} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {gearById,rollGear} from '../src/game/equipment';
import {refineStones} from '../src/game/refinement';
import {transact} from '../server/realm';
import {capture,type Realm} from '../server/protocol';
import type {RealmStore} from '../server/store';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/refinement-redesign',{recursive:true});
function fixture(){const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.zone='town';s.save.gold=10000;
 for(const [id,refine,crit] of [['coat-a',0,2],['coat-b',8,7]] as const){const g=gearById('field-coat')!;s.addEquipmentItem({...rollGear(g.id,'rare',()=>.5),id,name:g.name,icon:g.icon,count:1,refine,secondary:{critChance:crit}});}s.equip('coat-a');s.addItem(refineStones.common.name,refineStones.common.icon,10);s.addItem(refineStones.rare.name,refineStones.rare.icon,2);return s;}
const snap=(p:Page)=>p.evaluate(()=>(window as any).mossvale.snapshot());
async function practice(page:Page){await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},fixture().save);await page.goto('/?practice=1');await page.locator('#practice-start').click();if(page.viewportSize()!.width<=900){await page.locator('#mobile-menu-toggle').click();await page.locator('[data-mobile-panel="forge"]').click();}else await page.locator('[data-panel="forge"]').first().click();await page.locator('[data-forge-tab="refine"]').click();}
test('duplicate items select exact piece, show outcomes and keep craft separately usable',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await practice(page);
 await expect(page.locator('#refine-item')).toHaveCount(0);await expect(page.locator('[data-refine-item]')).toHaveCount(2);
 await page.locator('[data-refine-item="coat-b"]').click();await expect(page.locator('.refine-summary')).toContainText('+8');await expect(page.locator('[data-refine-item="coat-b"]')).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'artifacts/refinement-redesign/desktop.png'});
 await page.evaluate(()=>Math.random=()=>.999);await page.locator('#refine').click();await expect(page.locator('#refine-result')).toContainText(/fail/i);let s=await snap(page);expect(s.items.find((i:any)=>i.id==='coat-b').refine).toBe(8);expect(s.items.find((i:any)=>i.id==='coat-a').refine).toBe(0);expect(s.gold).toBe(9620);
 await page.locator('[data-refine-item="coat-a"]').click();await page.locator('#refine').click();await expect(page.locator('#refine-result')).toContainText(/success/i);s=await snap(page);expect(s.items.find((i:any)=>i.id==='coat-a').refine).toBe(1);expect(s.items.find((i:any)=>i.id==='coat-b').secondary.critChance).toBe(7);
 await page.locator('[data-forge-tab="craft"]').click();await expect(page.locator('[data-refine-item]')).toHaveCount(0);await page.locator('[data-craft-category="material"]').click();await page.locator('[data-craft="rare-refine-stone"]').click();expect((await snap(page)).items.find((i:any)=>i.name===refineStones.common.name).count).toBe(3);
 expect(errors).toEqual([]);
});
test('mobile grid and details fit and bag shortcut selects the identical piece',async({page})=>{
 await page.setViewportSize({width:390,height:844});await practice(page);await page.locator('[data-refine-item="coat-b"]').click();await page.locator('[data-refine-stone="rare"]').click();await expect(page.locator('.refine-summary')).toContainText('drop to +7');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:'artifacts/refinement-redesign/mobile.png'});await page.keyboard.press('Escape');await page.keyboard.press('i');await page.locator('.inventory-grid [data-item="coat-b"]').click();await page.locator('#item-details [data-item-action="refine"]').click();await expect(page.locator('[data-forge-tab="refine"]')).toHaveAttribute('aria-selected','true');await expect(page.locator('[data-refine-item="coat-b"]')).toHaveAttribute('aria-pressed','true');
});
class Store implements RealmStore {realm:Realm|null=null;revision=0;async read(){return this.realm?{realm:structuredClone(this.realm),revision:this.revision}:null}async create(r:Realm){this.realm=structuredClone(r)}async commit(n:number,r:Realm){if(n!==this.revision)return false;this.realm=structuredClone(r);this.revision++;return true}}
test('network refinement waits for authoritative response, blocks duplicates and reports server failure',async({page})=>{
 const store=new Store(),identity={id:'refine-qa',name:'Refiner'};await transact(store,identity,{connect:true},1000);store.realm!.players[identity.id].actor=capture(fixture());let release:()=>void=()=>{},held=false;let upgrades=0;
 await page.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data:any={};
 if(path==='/api/auth/status')data={account:{username:'QA'}};
 else if(path==='/api/characters')data={characters:[{id:identity.id,name:'Refiner',job:'swordsman',level:100,slot:1}],selectedId:identity.id};
 else if(path==='/api/realtime-ticket')data={available:false};
 else if(path==='/api/game'){const input=route.request().postDataJSON()||{};if(input.commands?.some((c:any)=>c.type==='upgrade')){upgrades++;held=true;await new Promise<void>(r=>release=r);}data=await transact(store,identity,input,1000);}
 await route.fulfill({json:data});});
 await page.goto('/');await page.locator('#character-start').click();await page.locator('[data-panel="forge"]').first().click();await page.locator('[data-forge-tab="refine"]').click();await page.locator('[data-refine-item="coat-a"]').click();await page.locator('#refine').click();await expect.poll(()=>held).toBe(true);await expect(page.locator('#refine')).toBeDisabled();expect(store.realm!.players[identity.id].actor.save.gold).toBe(10000);await page.locator('#refine').evaluate((b:HTMLButtonElement)=>b.click());expect(upgrades).toBe(1);release();await expect(page.locator('#refine-result')).toContainText(/success/i);await expect.poll(async()=>(await snap(page)).items.find((i:any)=>i.id==='coat-a').refine).toBe(1);
 // Rare +8 with random .999 fails and stays +8; the browser must display the actual server result.
 await page.locator('[data-refine-item="coat-b"]').click();held=false;await page.locator('#refine').click();await expect.poll(()=>held).toBe(true);const original=Math.random;Math.random=()=>.999;try{release();await expect(page.locator('#refine-result')).toContainText(/fail/i);}finally{Math.random=original;}
 expect(store.realm!.players[identity.id].actor.save.items.find(i=>i.id==='coat-b')!.refine).toBe(8);expect(upgrades).toBe(2);
});
