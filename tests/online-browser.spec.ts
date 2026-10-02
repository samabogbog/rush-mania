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
test('online party, mutual trade and escrow market are usable through the game menus',async({browser})=>{
 const stamp='social-'+Date.now(),context=await browser.newContext(),peer=await browser.newContext();
 await context.addCookies([{name:'mossvale-dev',value:stamp+'a',url:'http://127.0.0.1:5173'}]);await peer.addCookies([{name:'mossvale-dev',value:stamp+'b',url:'http://127.0.0.1:5173'}]);
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));await page.goto('/?online=1');let partner=await (await peer.request.post('/api/game',{data:{connect:true}})).json();
 const send=async(type:string,args:unknown[])=>{partner=await(await peer.request.post('/api/game',{data:{commands:[{id:`${partner.player.session.id}:${partner.player.session.sequence+1}`,type,args}]}})).json();};
 await page.locator('[data-panel="community"]').click();await page.getByRole('button',{name:'Create party',exact:true}).click();await expect(page.getByRole('button',{name:'Leave party'})).toBeVisible();
 await page.locator(`[data-community="partyInvite"][data-id="${stamp}b"]`).click();await expect.poll(async()=>{partner=await(await peer.request.get('/api/game')).json();return partner.community.invitations.length;}).toBe(1);await send('partyAccept',[partner.community.invitations[0].id]);await expect(page.locator('.party-members')).toContainText(partner.player.name);
 await page.screenshot({path:'artifacts/party.png',timeout:20000});partner=await(await peer.request.get('/api/game')).json();await page.locator(`[data-community="tradeInvite"][data-id="${stamp}b"]`).click();await expect.poll(async()=>{partner=await(await peer.request.get('/api/game')).json();return !!partner.community.trade;}).toBe(true);const trade=partner.community.trade.id;await send('tradeAccept',[trade]);
 await expect(page.locator('#trade-gold')).toBeVisible();await page.locator('#trade-item').selectOption('');await page.locator('#trade-gold').fill('20');await page.locator('#set-trade-offer').click();await send('tradeOffer',[trade,{item:'',count:0,gold:5}]);await expect(page.locator('.trade-offers')).toContainText('5 z');await page.locator('[data-community="tradeConfirm"]').click();await send('tradeConfirm',[trade]);await expect.poll(async()=>(await state(page)).gold).toBe(105);
 await page.keyboard.press('Escape');await page.locator('[data-panel="market"]').click();await page.locator('#market-item').selectOption('Red potion');await page.locator('#market-count').fill('1');await page.locator('#market-price').fill('20');await page.locator('#list-market').click();await expect(page.locator('[data-community="marketCancel"]')).toHaveCount(1);
 partner=await(await peer.request.get('/api/game')).json();const listing=partner.community.listings.find((l:any)=>l.seller.endsWith('a'));await send('marketBuy',[listing.id]);await expect.poll(async()=>(await state(page)).gold).toBe(123);await expect(page.locator('[data-community="marketCancel"]')).toHaveCount(0);expect(errors).toEqual([]);await peer.close();await context.close();
});
test('missing signed-in identity shows a top-level ChatGPT sign-in link without starting a game',async({browser})=>{
 const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/game',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Sign in to Sites to play online'})}));await page.goto('/?online=1');await expect(page.getByRole('heading',{name:'Sign in to play online'})).toBeVisible();const link=page.getByRole('link',{name:'Sign in with ChatGPT'});await expect(link).toHaveAttribute('href','/signin-with-chatgpt?return_to=%2F');await expect(link).toHaveAttribute('target','_top');expect(await page.locator('#game').count()).toBe(0);expect(errors).toEqual([]);await context.close();
});
