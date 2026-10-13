import {test as base,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {mkdirSync,writeFileSync} from 'node:fs';
const test=base.extend({browser:async({playwright},use)=>{const browser=await playwright.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-webgl2','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{await use(browser);}finally{await browser.close();}}});
test('WebGL1 uses exponential soft shadow fallback with visible moving casters',async({page})=>{
 const s=new Simulation(()=>.5,undefined,null);s.save.level=100;s.save.hp=s.maxHp;s.save.mp=s.maxMp;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:800});
 await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low')},s.save);
 await page.goto('/?practice=1');await page.locator('#practice-start').click();await expect.poll(async()=>{if(errors.length)throw Error(errors[0]);return page.evaluate(()=>{const d=(window as any).mossvale?.snapshot();return !!d&&d.riggedActors===d.modelsExpected&&d.modelErrors===0});},{timeout:60000}).toBe(true);
 const snap=()=>page.evaluate(()=>(window as any).mossvale.snapshot()),before=await snap();expect(before.shadowWebGLVersion).toBe(1);expect(before.shadowPCSSSupported).toBe(false);expect(before.shadowsEnabled).toBe(true);expect(before.shadowFilter).toBe('blur-exponential');expect(before.shadowFilterId).toBe(3);expect(before.shadowCasters.enabled).toBeGreaterThan(0);
 await page.keyboard.down('d');try{await page.waitForFunction(x=>(window as any).mossvale.snapshot().x>x+1,before.x,{timeout:15000});}finally{await page.keyboard.up('d');}const after=await snap();expect(after.x).toBeGreaterThan(before.x+1);expect(errors).toEqual([]);
 mkdirSync('artifacts/soft-shadows/fallback',{recursive:true});await page.screenshot({path:'artifacts/soft-shadows/fallback/webgl1.png'});writeFileSync('artifacts/soft-shadows/fallback/webgl1.json',JSON.stringify({webgl:after.shadowWebGLVersion,filter:after.shadowFilter,mapSize:after.shadowMapSize,casters:after.shadowCasters,movement:{before:before.x,after:after.x},pageErrors:errors},null,2));
});
