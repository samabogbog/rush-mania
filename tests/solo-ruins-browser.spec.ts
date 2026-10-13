import {test,expect} from '@playwright/test';
test('map menu describes final dungeon solo entry and keeps the level gate',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('mossvale-quality','low'));
 await page.goto('/?practice=1');await page.locator('#practice-start').click();
 await page.locator('[data-panel="map"]').first().click();
 const area=page.locator('.area-list article').filter({hasText:'Rootheart Ruins'});
 await expect(area).toContainText('SOLO / PARTY');await expect(area).toContainText('Enter alone or in a party of up to 4');await expect(area).toContainText('Entry Lv 70');await expect(area.locator('[data-travel="ruins"]')).toBeDisabled();
 await area.screenshot({path:'artifacts/solo-ruins/map-entry.png'});expect(errors).toEqual([]);
});
