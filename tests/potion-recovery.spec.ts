import {test,expect} from '@playwright/test';
import {Simulation} from '../src/simulation';
import {capture} from '../server/protocol';
import {species} from '../src/game/content';
function setup(level=100){const s=new Simulation(()=>.5,undefined,null);s.save.level=level;s.populateZone('town');s.save.hp=s.maxHp*.1;s.save.mp=s.maxMp*.1;return s;}
for(const level of [10,50,100])for(const blue of [false,true])test(`Lv${level} ${blue?'MP':'HP'} potion recovers exact20% over2s alongside passive regen`,()=>{
 const s=setup(level),control=new Simulation(()=>.5,structuredClone(s.save),null);control.populateZone('town');const max=blue?s.maxMp:s.maxHp,key=blue?'mp':'hp',name=blue?'Blue potion':'Red potion';const owned=s.save.items.find(i=>i.name===name)!.count,before=s.save[key];expect(s.usePotion(blue)).toBe(true);expect(s.save[key]).toBe(before);expect(s.save.items.find(i=>i.name===name)!.count).toBe(owned-1);
 for(let n=1;n<=20;n++){s.tick(.1,0,0);control.tick(.1,0,0);expect(s.save[key]-control.save[key]).toBeCloseTo(max*.2*n/20,5);}s.tick(1,0,0);control.tick(1,0,0);expect(s.save[key]-control.save[key]).toBeCloseTo(max*.2,5);
});
test('remaining recovery persists through capture and cannot heal a dead character',()=>{
 const s=setup(),base=s.save.hp,max=s.maxHp;s.usePotion(false);s.tick(.5,0,0);const actor=capture(s),restored=new Simulation(()=>.5,actor.save,null);Object.assign(restored,structuredClone(actor));for(let n=0;n<15;n++)restored.tick(.1,0,0);expect(restored.save.hp-base).toBeCloseTo(max*(.2+.003*2),5);
 const dead=setup();dead.usePotion(false);dead.save.hp=0;dead.deathTime=5;dead.tick(.5,0,0);expect(dead.save.hp).toBe(0);dead.deathTime=0;dead.save.hp=1;dead.tick(.5,0,0);expect(dead.save.hp).toBeCloseTo(1+dead.maxHp*.003*.5,5);
});
test('resource-full and shared cooldown reject without consuming a second potion; near-full recovery clamps',()=>{
 const s=setup();s.save.hp=s.maxHp;const count=s.save.items.find(i=>i.name==='Red potion')!.count;expect(s.usePotion(false)).toBe(false);expect(s.save.items.find(i=>i.name==='Red potion')!.count).toBe(count);s.save.hp=s.maxHp-1;expect(s.usePotion(false)).toBe(true);const mp=s.save.items.find(i=>i.name==='Blue potion')!.count;expect(s.usePotion(true)).toBe(false);expect(s.save.items.find(i=>i.name==='Blue potion')!.count).toBe(mp);s.tick(2,0,0);expect(s.save.hp).toBe(s.maxHp);
});
test('normal monsters at every level independently drop HP/MP at .5%, excluding elites',()=>{
 const s=setup(),normal=new Simulation(()=>.5,undefined,null).monsters[0];for(const level of [10,50,100]){s.balance[normal.kind]={level};let n=0;s.random=()=>{n++;return .005};expect(s.rollPotionLoot(normal)).toEqual([]);expect(n).toBe(2);s.random=()=>0;expect(s.rollPotionLoot(normal).map(i=>i.name)).toEqual(['Red potion','Blue potion']);let cursor=0;s.random=()=>cursor++?1:0;expect(s.rollPotionLoot(normal).map(i=>i.name)).toEqual(['Red potion']);}
 for(const flag of ['boss','miniBoss'] as const){const kind=Object.keys(species).find(k=>species[k][flag])!;let n=0;s.random=()=>{n++;return 0};expect(s.rollPotionLoot({...normal,kind})).toEqual([]);expect(n).toBe(0);}
});
test('potion replay consumes once and resumes remaining recovery through authoritative reconnect',async()=>{
 const {transact}=await import('../server/realm');let realm:any=null,revision=0;const store={async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:any){realm=structuredClone(r)},async commit(n:number,r:any){if(n!==revision)return false;realm=structuredClone(r);revision++;return true}};
 const user={id:'potion-user',name:'Potion user'};let p=await transact(store,user,{connect:true},1000);const s=setup();realm.players[user.id].actor=capture(s);realm.players[user.id].room='town';const cmd={id:p.player.session.id+':1',type:'usePotion',args:[false]};p=await transact(store,user,{commands:[cmd]},1000);p=await transact(store,user,{commands:[cmd]},1000);expect(p.player.actor.save.items.find((i:any)=>i.name==='Red potion').count).toBe(7);expect(p.player.actor.save.hp).toBe(s.save.hp);
 for(let n=1;n<=20;n++){p=await transact(store,user,n===10?{connect:true}:{},1000+n*100);expect(p.player.actor.save.hp-s.save.hp).toBeCloseTo(s.maxHp*(.2*n/20+.003*n/10),5);}expect(p.player.actor.potionRecovery.hp).toBeNull();
});
test('killed normal drops both potions into ground loot and repeated collect cannot duplicate stacks',()=>{
 const s=new Simulation(()=>0,undefined,null),m=s.monsters[0],hp=s.save.items.find(i=>i.name==='Red potion')!.count,mp=s.save.items.find(i=>i.name==='Blue potion')!.count;s.x=m.x;s.z=m.z;s.hit(m,999999);expect(s.loot.filter(l=>l.name==='Red potion'||l.name==='Blue potion')).toHaveLength(2);s.collect();s.collect();expect(s.save.items.find(i=>i.name==='Red potion')!.count).toBe(hp+1);expect(s.save.items.find(i=>i.name==='Blue potion')!.count).toBe(mp+1);
});
test('healing received bonuses do not increase the fixed twenty-percent potion amount',()=>{
 const s=setup();s.save.items.push({id:'healing-coat',gearId:'field-coat',name:'Field Coat',icon:'field-coat',count:1,secondary:{healingBonus:100}});s.equip('healing-coat');const control=new Simulation(()=>.5,structuredClone(s.save),null);control.populateZone('town');expect(s.healingMultiplier).toBe(2);s.usePotion(false);for(let n=0;n<20;n++){s.tick(.1,0,0);control.tick(.1,0,0);}expect(s.save.hp-control.save.hp).toBeCloseTo(s.maxHp*.2,5);
});
test('party potion drops roll once and rotate two pickups without duplicating party rewards',async()=>{
 const {transact}=await import('../server/realm'),{community,shareKill}=await import('../server/community');let realm:any=null,revision=0;const store={async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:any){realm=structuredClone(r)},async commit(n:number,r:any){if(n!==revision)return false;realm=structuredClone(r);revision++;return true}};for(const id of ['a','b'])await transact(store,{id,name:id},{connect:true},1000);community(realm).parties.push({id:'potions',leader:'a',members:['a','b'],invites:[],lootCursor:0});const actors=['a','b'].map(id=>({p:realm.players[id],sim:new Simulation(()=>0,realm.players[id].actor.save,null)}));for(const a of actors){a.p.room='glade';a.sim.x=0;a.sim.z=0;}let rolls=0;const original=actors[0].sim.rollPotionLoot.bind(actors[0].sim);actors[0].sim.rollPotionLoot=m=>{rolls++;return original(m)};const m=actors[0].sim.monsters[0];m.x=0;m.z=0;const totals=()=>['Red potion','Blue potion'].map(name=>actors.reduce((n,a)=>n+a.sim.save.items.filter(i=>i.name===name).reduce((x,i)=>x+i.count,0),0));const before=totals();expect(shareKill(realm,actors[0].p,m,actors,1000)).toBe(true);expect(rolls).toBe(1);expect(totals()).toEqual(before.map(n=>n+1));
});
