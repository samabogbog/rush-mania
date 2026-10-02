import {test as base,expect} from '@playwright/test';
const test=base.extend({browser:async({playwright},use)=>{
 const browser=await playwright.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await use(browser)}finally{await browser.close()}
}});
const state=(page:any)=>page.evaluate(()=>(window as any).mossvale.snapshot());
test('online peer, safe chat, network interruption and server save survive reload',async({browser})=>{
 const id='qa-'+Date.now();const first=await browser.newContext();const second=await browser.newContext();
 await first.addCookies([{name:'mossvale-dev',value:id+'-a',url:'http://127.0.0.1:5173'}]);
 await second.addCookies([{name:'mossvale-dev',value:id+'-b',url:'http://127.0.0.1:5173'}]);
 const a=await first.newPage();const errors:string[]=[];a.on('pageerror',e=>errors.push(e.message));
 await a.goto('/?online=1');await expect(a.locator('.save-indicator')).toHaveText('Online · server saved');
 const joined=await second.request.post('/api/game',{data:{connect:true}});expect(joined.ok()).toBe(true);const peer=await joined.json();
 await second.request.post('/api/game',{data:{commands:[{id:`${peer.player.session.id}:1`,type:'goTo',args:[4,4]},{id:`${peer.player.session.id}:2`,type:'chat',args:['Hello <img onerror=alert(1)>']}],movement:[0,0]}});
 await expect(a.locator('.peer-label')).toHaveCount(1);
 await expect(a.locator('#chat-log')).toContainText('Hello <img onerror=alert(1)>');expect(await a.locator('#chat-log img').count()).toBe(0);
 await a.screenshot({path:'artifacts/online-peer.png',timeout:20000});
 await second.close();
 const original=await state(a);await a.getByRole('button',{name:'Shop',exact:true}).click();
 await first.setOffline(true);await a.getByRole('button',{name:'Buy · 15 z'}).click();
 await expect(a.locator('.save-indicator')).toContainText('Reconnecting');expect((await state(a)).gold).toBe(original.gold);
 await first.setOffline(false);
 await expect.poll(async()=>(await state(a)).gold).toBe(original.gold-15);
 await a.reload();await expect(a.locator('.save-indicator')).toHaveText('Online · server saved');expect((await state(a)).gold).toBe(original.gold-15);
 await a.screenshot({path:'artifacts/online-world.png',timeout:20000});
 expect(errors).toEqual([]);await first.close();
});
