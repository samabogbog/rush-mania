import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {zones,species,type ZoneId} from '../src/game/content';
for(const zone of Object.keys(zones) as ZoneId[])for(const role of ['boss','miniBoss'] as const)test(`${zone} ${role}: unselected proximity damages, leash resets, elite respawns`,()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone=zone;sim.save.level=100;sim.populateZone(zone);sim.save.hp=sim.maxHp;
 const elite=sim.monsters.find(m=>species[m.kind][role])!;sim.monsters=[elite];sim.x=elite.x-2;sim.z=elite.z;
 let windup=false,damage=false;let lastHp=sim.save.hp;
 for(let n=0;n<180;n++){sim.tick(.025,0,0);windup ||=elite.windup>0;damage ||=sim.save.hp<lastHp;lastHp=sim.save.hp;if(damage)break;}
 expect(sim.target).toBeNull();expect(elite.aggro).toBe(true);expect(windup).toBe(true);expect(damage).toBe(true);
 elite.hp=species[elite.kind].hp/2;elite.x=elite.homeX+4;sim.x=0;sim.z=2;
 for(let n=0;n<240;n++)sim.tick(.025,0,0);
 expect(elite.aggro).toBe(false);expect(elite.returning).toBe(false);expect(elite.owner).toBeUndefined();expect(elite.windup).toBe(0);expect(elite.hp).toBe(species[elite.kind].hp);
 expect(Math.hypot(elite.x-elite.homeX,elite.z-elite.homeZ)).toBeLessThan(1);
 sim.hit(elite,1e9,true);const respawn=role==='boss'?180:60;expect(elite.alive).toBe(false);expect(elite.respawn).toBe(respawn);
 // Simulation time is advanced explicitly; no claim of waiting these durations in a browser.
 for(let n=0;n<respawn*40-2;n++)sim.tick(.025,0,0);expect(elite.alive).toBe(false);
 for(let n=0;n<4;n++)sim.tick(.025,0,0);expect(elite.alive).toBe(true);expect(elite.hp).toBe(species[elite.kind].hp);expect(elite.aggro).toBe(false);
});
test('elite proximity can kill and normal rescue restores living player at camp',()=>{
 const sim=new Simulation(()=>.5,undefined,null);sim.save.zone='frost';sim.populateZone('frost');const boss=sim.monsters.find(m=>species[m.kind].boss)!;sim.monsters=[boss];sim.x=boss.x-2;sim.z=boss.z;sim.save.hp=1;
 for(let n=0;n<180&&sim.deathTime===0;n++)sim.tick(.025,0,0);
 expect(sim.deathTime).toBeGreaterThan(0);expect(sim.save.hp).toBeLessThanOrEqual(0);expect(sim.target).toBeNull();
 for(let n=0;n<200;n++)sim.tick(.025,0,0);
 expect(sim.deathTime).toBe(0);expect(sim.save.hp).toBeGreaterThan(0);expect(sim.x).toBe(0);expect(sim.z).toBe(2);
});
