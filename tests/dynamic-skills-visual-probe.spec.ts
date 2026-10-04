import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=readFileSync('tests/dynamic-skills-preview.spec.ts','utf8').split('const fixture=`')[1].split('`;\nfor(const job')[0];
test('corrective focal geometry visual probe before full capture',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error('QA_PAGE_ERROR',e.message)});await page.setViewportSize({width:900,height:750});await page.route('**/dynamic-probe.html*',r=>r.fulfill({contentType:'text/html',body:fixture}));await page.goto('/dynamic-probe.html?job=swordsman');await page.waitForFunction(()=>(window as any).review?.library.active===1,{},{timeout:45000});
 for(const id of ['swordsman-1','swordsman-2','swordsman-7','swordsman-9','swordsman-10','swordsman-b-9','swordsman-b-10']){await page.evaluate(id=>{const r=(window as any).review;r.cameraAt(.55);r.preview(id,.4)},id);await page.waitForTimeout(40);await page.screenshot({path:`artifacts/dynamic-skills/probe-${id}.png`});const d=await page.evaluate(()=>(window as any).review.describe());expect(d.modelErrors).toBe(0);expect(d.shapes.every((s:any)=>s.billboard===0&&!s.texture)).toBe(true);}
 expect(errors).toEqual([]);
});
