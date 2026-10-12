import {test,expect} from '@playwright/test';
import {makeActor,seeded} from '../tools/attribute-duel-audit';
import {mkdirSync} from 'node:fs';

for(const job of ['swordsman','mage','archer'] as const)test(`${job}: all three allocations update real UI, saved points and integer status values`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync('artifacts/attribute-balance',{recursive:true});
 for(const build of ['str','vit','agi'] as const){
  const s=makeActor(job,100,build,'legendRolled',seeded(1));s.save.zone='town';s.save.stats[build]--;s.save.points=1;s.save.hp=s.maxHp;s.save.mp=s.maxMp;
  await page.addInitScript(save=>{localStorage.setItem('mossvale-save',JSON.stringify(save));localStorage.setItem('mossvale-quality','low');},s.save);
  await page.goto('/?practice=1');await page.locator('#practice-start').click();
  await page.waitForFunction(()=>{const s=(window as any).mossvale?.snapshot();return s&&s.modelsExpected>0&&s.riggedActors===s.modelsExpected&&s.modelErrors===0;},{},{timeout:60000});
  expect(errors).toEqual([]);await page.keyboard.press('c');
  await expect(page.locator(`[data-stat=${build}]`)).toBeEnabled();await page.locator(`[data-stat=${build}]`).click();
  await expect(page.locator(`[data-stat=${build}]`)).toBeDisabled();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mossvale-save')!));expect(saved.stats[build]).toBe(305);expect(saved.points).toBe(0);
  s.stat(build);const values=[s.maxHp,s.maxMp,s.damage,s.defense],bonuses=s.equipmentStatContributions,extra=[bonuses.hp,bonuses.mp,bonuses.atk,bonuses.def];
  const cells=page.locator('.stat-pair > span > b');await expect(cells).toHaveCount(4);
  for(let i=0;i<4;i++)await expect(cells.nth(i)).toHaveText(`${Math.round(values[i])} (+${Math.round(extra[i])})`);
  await expect(page.locator('#hp-text')).toContainText(`/ ${Math.round(s.maxHp)}`);await expect(page.locator('#mp-text')).toContainText(`/ ${Math.round(s.maxMp)}`);
  if(build==='agi')await page.screenshot({path:`artifacts/attribute-balance/${job}-status.png`});
  expect(errors).toEqual([]);
 }
});
