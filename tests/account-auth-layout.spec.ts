import {test,expect} from '@playwright/test';
test('registration can scroll to every control on short portrait and landscape screens',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[1200,800],[390,600],[844,390]]){
  await page.setViewportSize({width,height});await page.goto('/');await page.locator('#account-register').click();
  await expect(page.locator('#account-confirm')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.locator('.account-screen').evaluate(e=>e.clientHeight)).toBeLessThanOrEqual(height);
  for(const locator of [page.locator('#account-username'),page.locator('#account-confirm'),page.locator('#account-login'),page.getByRole('link',{name:'Device practice'})]){
   await locator.scrollIntoViewIfNeeded();await expect(locator).toBeInViewport();
  }
  if(width===390)await page.screenshot({path:'artifacts/account-register-short-mobile.png'});
 }
 expect(errors).toEqual([]);
});
