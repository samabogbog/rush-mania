import {test,expect} from '@playwright/test';
test('authenticated visits and refresh stay on roster with no game connection until Start',async({page})=>{
 let connections=0,selections=0;
 await page.route('**/api/auth/status',route=>route.fulfill({json:{account:{username:'tester'}}}));
 await page.route('**/api/characters',route=>route.fulfill({json:{characters:[{id:'hero-one',name:'Fern',job:'mage',level:8,slot:1}],selectedId:'hero-one'}}));
 await page.route('**/api/characters/select',route=>{selections++;return route.fulfill({json:{selectedId:'hero-one'}})});
 await page.route('**/api/realtime-ticket',route=>{connections++;return route.fulfill({status:503,json:{error:'test realm offline'}})});
 await page.goto('/');await expect(page.getByRole('button',{name:/Fern/})).toBeVisible();await expect(page.locator('#game')).toHaveCount(0);expect(connections).toBe(0);expect(selections).toBe(0);
 await page.reload();await expect(page.locator('#character-start')).toBeVisible();await expect(page.locator('#game')).toHaveCount(0);expect(connections).toBe(0);
 await page.locator('#character-start').click();await expect.poll(()=>connections).toBe(1);expect(selections).toBe(1);
});
test('practice entry waits for explicit Start before any canvas or simulation',async({page})=>{
 await page.goto('/?practice=1');await expect(page.locator('#practice-start')).toBeVisible();await expect(page.locator('#game')).toHaveCount(0);expect(await page.evaluate(()=>Boolean((window as any).mossvale))).toBe(false);
});
test('three occupied slots suppress character creation on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:600});
 await page.route('**/api/auth/status',route=>route.fulfill({json:{account:{username:'tester'}}}));
 await page.route('**/api/characters',route=>route.fulfill({json:{characters:[1,2,3].map(slot=>({id:'hero-'+slot,name:'Adventurer '+slot,job:'swordsman',level:1,slot})),selectedId:null}}));
 await page.goto('/');await expect(page.locator('[data-character]')).toHaveCount(3);await expect(page.locator('#character-create')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('[data-character="hero-3"]').click();await expect(page.locator('[data-character="hero-3"]')).toHaveAttribute('aria-pressed','true');
});
