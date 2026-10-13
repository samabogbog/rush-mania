import {test,expect} from '@playwright/test';
import {rollRuneDrops,runeTypes} from '../src/game/runes';
import {Simulation,type Monster} from '../src/simulation';
import {species} from '../src/game/content';
import {shareKill,community} from '../server/community';
import {freshRealm,transact} from '../server/realm';
import {capture,type Realm} from '../server/protocol';
for(const [level,rate] of [[10,.002],[50,.0036],[90,.0052]])test(`normal Lv${level} rolls ten independent Common drops at correct probability`,()=>{
 let calls=0;expect(rollRuneDrops(level,()=>{calls++;return rate})).toEqual([]);expect(calls).toBe(10);
 calls=0;const all=rollRuneDrops(level,()=>{calls++;return rate-1e-8});expect(calls).toBe(10);expect(all).toHaveLength(10);expect(all.map(i=>i.runeId)).toEqual(runeTypes.map(r=>r.id));expect(all.every(i=>i.rarity==='common'&&i.count===1)).toBe(true);
 let n=0;const mixed=rollRuneDrops(level,()=>n++%2?1:0);expect(mixed).toHaveLength(5);
});
test('boss and mini-boss rune drops are excluded without consuming RNG',()=>{
 let calls=0;const s=new Simulation(()=>{calls++;return 0},undefined,null);const m=s.monsters[0];
 for(const flag of ['boss','miniBoss'] as const){const kind=Object.keys(species).find(k=>species[k][flag])!;calls=0;expect(s.rollRuneLoot({...m,kind})).toEqual([]);expect(calls).toBe(0);}
 calls=0;expect(s.rollRuneLoot(m)).toHaveLength(10);expect(calls).toBe(10);
});
test('party rotates all rune drops once per kill rather than rolling per party member',async()=>{
 let realm:Realm|null=null,revision=0;const store={async read(){return realm?{realm:structuredClone(realm),revision}:null},async create(r:Realm){realm=structuredClone(r)},async commit(n:number,r:Realm){if(n!==revision)return false;realm=structuredClone(r);revision++;return true}};
 for(const id of ['a','b'])await transact(store,{id,name:id},{connect:true},1000);const r=realm! as Realm;community(r).parties.push({id:'rune-party',leader:'a',members:['a','b'],invites:[],lootCursor:0});
 const actors=['a','b'].map(id=>({p:r.players[id],sim:new Simulation(()=>0,r.players[id].actor.save,null)}));for(const a of actors){a.p.room='glade';a.sim.x=0;a.sim.z=0;}
 let rolls=0;const original=actors[0].sim.rollRuneLoot.bind(actors[0].sim);actors[0].sim.rollRuneLoot=m=>{rolls++;return original(m)};
 const m=actors[0].sim.monsters[0];m.x=0;m.z=0;expect(shareKill(r,actors[0].p,m,actors,1000)).toBe(true);expect(rolls).toBe(1);
 const runes=actors.flatMap(a=>a.sim.save.items).filter(i=>i.runeId);expect(runes).toHaveLength(10);expect(new Set(runes.map(i=>i.runeId)).size).toBe(10);for(const actor of actors)expect(actor.sim.save.items.filter(i=>i.runeId)).toHaveLength(5);
});
test('normal monster kill creates ground rune items and Collect preserves their identity and rarity',()=>{
 const s=new Simulation(()=>0,undefined,null),m=s.monsters[0];s.x=m.x;s.z=m.z;s.hit(m,999999);expect(m.alive).toBe(false);
 expect(s.loot.filter(l=>l.item?.runeId)).toHaveLength(10);s.collect();const collected=s.save.items.filter(i=>i.runeId);expect(collected).toHaveLength(10);expect(collected.every(i=>i.rarity==='common'&&i.count===1&&i.category==='rune')).toBe(true);expect(s.loot.some(l=>l.item?.runeId)).toBe(false);
});
