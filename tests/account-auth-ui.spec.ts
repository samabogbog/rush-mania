import {test,expect} from '@playwright/test';
async function loaded(page:any){await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.riggedActors===s.modelsExpected+document.querySelectorAll('.peer-label').length&&s.modelErrors===0},{},{timeout:60000});}
test('register, purchase, logout and login restore the hero; mobile form and separate account work',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1200,height:800}}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));
 const username='qa_'+Date.now(),password='Test-only adventure 123!';
 try{
  await page.goto('/');await expect(page.locator('#account-form')).toBeVisible();expect(await page.locator('#game').count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1200);
  await page.screenshot({path:'artifacts/account-login-desktop.png'});
  await page.locator('#account-register').click();await expect(page.locator('#account-confirm')).toBeVisible();
  await page.locator('#account-register').click();await expect(page.locator('#account-confirm')).toHaveCount(0);await expect(page.locator('#account-password')).toHaveAttribute('autocomplete','current-password');
  await page.locator('#account-register').click();await page.locator('#account-username').fill(username);await page.locator('#account-password').fill(password);await page.locator('#account-confirm').fill('different password');await page.locator('#account-login').click();await expect(page.locator('#account-error')).toHaveText('Passwords must match');
  await page.locator('#account-confirm').fill(password);await page.locator('#account-confirm').press('Enter');await loaded(page);
  const before=await page.evaluate(()=>(window as any).mossvale.snapshot());
  await page.locator('[data-panel="shop"]').first().click();await page.locator('[data-buy="Red potion"]').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).mossvale.snapshot().gold)).toBe(before.gold-15);
  const purchased=await page.evaluate(()=>(window as any).mossvale.snapshot());await page.keyboard.press('Escape');
  await page.screenshot({path:'artifacts/account-online-hero.png'});
  await page.locator('[data-panel="settings"]').first().click();await page.locator('#account-logout').click();await expect(page.locator('#account-form')).toBeVisible();
  expect((await context.request.get('/api/game')).status()).toBe(401);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/account-login-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);const button=await page.locator('#account-login').boundingBox();expect(button!.x).toBeGreaterThanOrEqual(0);expect(button!.x+button!.width).toBeLessThanOrEqual(390);
  await page.locator('#account-username').fill(username);await page.locator('#account-password').fill('Incorrect password 123');await page.locator('#account-login').click();await expect(page.locator('#account-error')).toHaveText('Invalid username or password');
  await page.setViewportSize({width:1200,height:800});await page.locator('#account-password').fill(password);await page.locator('#account-login').click();await loaded(page);
  const restored=await page.evaluate(()=>(window as any).mossvale.snapshot());expect(restored.gold).toBe(purchased.gold);expect(restored.items).toEqual(purchased.items);
  const second=await browser.newContext({viewport:{width:1200,height:800}}),other=await second.newPage();other.on('pageerror',e=>errors.push(e.message));
  try{await other.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));await other.goto('/');await other.locator('#account-register').click();await other.locator('#account-username').fill(username+'_b');await other.locator('#account-password').fill(password);await other.locator('#account-confirm').fill(password);await other.locator('#account-login').click();await loaded(other);expect(await other.evaluate(()=>(window as any).mossvale.snapshot().gold)).toBe(120);await other.locator('[data-panel="settings"]').first().click();await expect(other.locator('[data-panel="admin"]')).toHaveCount(0)}finally{await second.close()}
  expect(errors).toEqual([]);
 }finally{await context.close()}
});
