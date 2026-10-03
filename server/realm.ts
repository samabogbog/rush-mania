import {itemCatalog,itemCategory} from '../src/game/items';
import {rollGear,rarityOrder,BAG_CAPACITY,type Rarity} from '../src/game/equipment';
import {isStoneTier} from '../src/game/refinement';
import {communityCommand,communitySnapshot,partyOf,shareKill} from './community';
import { Simulation, type Save } from '../src/simulation';
import { zoneObstacles } from '../src/game/map-data';
import {isZone, type ZoneId} from '../src/game/content';
import {isGearSlot} from '../src/game/equipment';
import { isClass } from '../src/game/classes';
import { capture, type Command, type Player, type Realm, type Snapshot } from './protocol';
import type { RealmStore } from './store';
export class GameError extends Error { constructor(message:string,public status=400){super(message)} }
export function freshRealm(now:number):Realm { const sim=new Simulation(Math.random,undefined,null); return {version:2,time:now,players:{},rooms:{glade:{zone:'glade',monsters:sim.monsters}},chat:[],ledger:[]}; }
function roomFor(realm:Realm,id:string,zone:ZoneId) {
  if(!realm.rooms) {realm.rooms={glade:{zone:'glade',monsters:realm.monsters||new Simulation(Math.random,undefined,null).monsters}};delete realm.monsters;realm.version=2;}
  if(!realm.rooms[id]) {const sim=new Simulation(Math.random,undefined,null);sim.populateZone(zone);realm.rooms[id]={zone,monsters:sim.monsters};}
  return realm.rooms[id];
}
function hydrate(player:Player, realm:Realm) {
  const sim=new Simulation(Math.random,player.actor.save as Save,null), normalizedSave=sim.save;
  Object.assign(sim,structuredClone(player.actor));sim.save=normalizedSave;sim.cooldowns=Array.from({length:10},(_,n)=>n<6?sim.skillCooldowns[sim.save.hotbar[n]||'']||0:sim.auxiliaryCooldown||0);sim.online=true;sim.balance=realm.balance||{};
  player.room ||= sim.save.zone;
  sim.monsters=roomFor(realm,player.room,sim.save.zone).monsters;sim.obstacles=zoneObstacles(sim.save.zone);sim.actorId=player.id;
  sim.onEvent=(text,type='system',x,z)=>{player.events.push({id:++player.serial,text,type,x,z});player.events=player.events.slice(-40)};
  return sim;
}
function support(realm:Realm,player:Player,sim:Simulation,actors:{p:Player;sim:Simulation}[]) {
 sim.onSupport=skill=>{if(skill.effect==='guard'&&sim.save.job==='swordsman')for(const monster of sim.monsters)if(monster.alive&&Math.hypot(monster.x-sim.x,monster.z-sim.z)<5){monster.owner=player.id;monster.aggro=true;}const party=partyOf(realm,player.id);if(!party)return;for(const friend of actors){if(friend.p.id===player.id||!party.members.includes(friend.p.id)||friend.p.room!==player.room||friend.sim.save.hp<=0||Math.hypot(friend.sim.x-sim.x,friend.sim.z-sim.z)>8)continue;
  if(skill.effect==='heal')friend.sim.save.hp=Math.min(friend.sim.maxHp,friend.sim.save.hp+friend.sim.maxHp*skill.power*.6*friend.sim.healingMultiplier);
  else if(skill.effect==='guard'||skill.effect==='fury'){const buff=skill.effect==='guard'?friend.sim.guard:friend.sim.fury;buff.time=skill.duration||6;buff.power=skill.power*.7;}
  friend.sim.onEvent(player.name+' shared '+skill.name,'reward');
 }};
}
function advance(realm:Realm,now:number) {
  for(const id of Object.keys(realm.rooms||{}))if(id.startsWith('dungeon:')&&!realm.community?.parties.some(p=>'dungeon:'+p.id===id))delete realm.rooms![id];
  const active=Object.values(realm.players).filter(p=>now-p.lastSeen<10_000);
  const sims=active.map(p=>({p,sim:hydrate(p,realm)}));
  const ownership=new Map<object,string>();
  for(const room of Object.values(realm.rooms||{})) {
    const occupants=sims.filter(({p})=>p.room&&realm.rooms?.[p.room]===room);
    for(const m of room.monsters) {
      if(m.owner&&!occupants.some(({p})=>p.id===m.owner)){m.owner=undefined;m.aggro=false;m.windup=0;}
      const owner=occupants.find(({p})=>p.id===m.owner) ?? occupants.find(({sim})=>sim.target===m.id) ?? occupants[0];
      if(owner)ownership.set(m,owner.p.id);
    }
  }
  for(const {p,sim} of sims) {
    sim.enemyFilter=m=>ownership.get(m)===p.id;support(realm,p,sim,sims);
    sim.onKill=(monster)=> {
      if(shareKill(realm,p,monster,sims,now))return true;
      const gold=Math.round(sim.monsterSpec(monster.kind).gold*(1+(sim.gearBonuses.goldBonus||0)/100));
      realm.ledger.push({id:crypto.randomUUID(),player:p.id,action:`kill:${monster.kind}`,at:now,goldDelta:gold});
    };
  }
  // Server clock only. No offline farming or long catch-up bursts after inactivity.
  let remaining=Math.max(0,Math.min(0.5,(now-realm.time)/1000));
  while(remaining>0.00001) {
    const dt=Math.min(0.025,remaining);
    for(const {p,sim} of sims) {
      const input=now-p.inputAt<500?p.input:[0,0];
      sim.tick(dt,input[0],input[1]);
    }
    remaining-=dt;
  }
  for(const {p,sim} of sims) p.actor=capture(sim);

  realm.time=now; realm.ledger=realm.ledger.slice(-500);
}
function execute(player:Player,realm:Realm,command:Command,now:number,admin=false) {
  if(!command || typeof command.id!=='string' || typeof command.type!=='string' || !Array.isArray(command.args)) throw new GameError('Invalid command');
  const [session,sequenceString]=command.id.split(':'); const sequence=Number(sequenceString);
  if(session!==player.session.id) throw new GameError('This character was opened in another session. Reconnect to continue.',409);
  if(!Number.isSafeInteger(sequence)||sequence<1) throw new GameError('Invalid sequence');
  if(sequence<=player.session.sequence) return; // Idempotent replay after a dropped response.
  if(sequence!==player.session.sequence+1) throw new GameError('Commands must arrive in order',409);
  const sim=hydrate(player,realm), [a,b]=command.args; const before=sim.save.gold;
  const allies=Object.values(realm.players).filter(p=>p.id!==player.id&&p.room===player.room&&now-p.lastSeen<10000).map(p=>({p,sim:hydrate(p,realm)}));support(realm,player,sim,allies);
  sim.onKill=monster=>shareKill(realm,player,monster,[{p:player,sim},...allies],now);
  const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  const handled=communityCommand(realm,player,command.type,command.args,now,command.id);
  if(handled)sim.save=player.actor.save;
  else switch(command.type) {
    case 'adminSpawn': {
      if(!admin)throw new GameError('Admin access required',403);
      const entry=itemCatalog.find(i=>i.id===a),rarity=command.args[2],refine=command.args[3];
      if(!entry||!integer(b,1,entry.gearId?20:9999)||typeof rarity!=='string'||!rarityOrder.includes(rarity as Rarity)||!integer(refine,0,10))throw new GameError('Invalid spawn request');
      const existing=!entry.gearId&&sim.save.items.find(i=>i.name===entry.name&&i.count>0);
      const slots=sim.save.items.filter(i=>i.count>0).length+(entry.gearId?b as number:existing?0:1);
      if(slots>BAG_CAPACITY) {sim.onEvent('Bag full. Nothing spawned.');break;}
      if(entry.gearId)for(let n=0;n<(b as number);n++)sim.addEquipmentItem({...rollGear(entry.gearId,rarity as Rarity),refine:refine as number,name:entry.name,icon:entry.icon,count:1,category:itemCategory(entry)});
      else sim.addItem(entry.name,entry.icon,b as number);
      realm.ledger.push({id:command.id,player:player.id,action:`adminSpawn:${entry.id}:${b}:${rarity}:+${refine}`,at:now,goldDelta:0});
      sim.onEvent(`Admin spawned ${b} × ${entry.name}`,'reward');break;
    }
    case 'select': if(integer(a,0,sim.monsters.length-1)) sim.select(a as number); else throw new GameError('Invalid target'); break;
    case 'goTo': if(typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)) sim.goTo(a,b); else throw new GameError('Invalid position');break;
    case 'nearest':sim.nearest();break;
    case 'clearTarget':sim.clearTarget();break;
    case 'setAuto':if(typeof a!=='boolean') throw new GameError('Invalid auto setting');sim.setAuto(a);break;
    case 'skill':if(!integer(a,0,5))throw new GameError('Invalid hotbar slot');sim.skill(a as number);break;
    case 'castSkill':if(typeof a!=='string')throw new GameError('Invalid skill');sim.castSkill(a);break;
    case 'usePotion':sim.usePotion(a===true);break;
    case 'collect':sim.collect();break;
    case 'upgrade':if(typeof a!=='string'||!isStoneTier(command.args[1]))throw new GameError('Invalid refinement');sim.upgrade(a,command.args[1]);break;
    case 'stat':if(a!=='str'&&a!=='vit'&&a!=='agi')throw new GameError('Invalid attribute');sim.stat(a);break;
    case 'claim':sim.claim();break;
    case 'setClass':if(!isClass(a))throw new GameError('Invalid class');sim.setClass(a);break;
    case 'chooseSkill':if(typeof a!=='string')throw new GameError('Invalid skill choice');sim.chooseSkill(a);break;
    case 'resetSkills':sim.resetSkills();break;
    case 'assignAuxiliary':if(!integer(a,0,3)||(b!==null&&typeof b!=='string'))throw new GameError('Invalid auxiliary assignment');sim.assignAuxiliary(a as number,b as string|null);break;
    case 'useAuxiliary':if(!integer(a,0,3))throw new GameError('Invalid auxiliary slot');sim.useAuxiliary(a as number);break;
    case 'assignSkill':if(!integer(a,0,5)||typeof b!=='string')throw new GameError('Invalid assignment');sim.assignSkill(a as number,b);break;
    case 'buy':if(typeof a!=='string')throw new GameError('Invalid item');sim.buy(a);break;
    case 'sell':sim.sell();break;
    case 'toggleTutorial':sim.toggleTutorial();break;
    case 'interact':if(typeof a!=='string')throw new GameError('Invalid NPC');sim.interact(a);break;
    case 'craft':if(typeof a!=='string')throw new GameError('Invalid recipe');sim.craft(a);break;
    case 'equip':if(typeof a!=='string')throw new GameError('Invalid equipment');sim.equip(a);break;
    case 'unequip':if(!isGearSlot(a))throw new GameError('Invalid equipment slot');sim.unequip(a);break;
    case 'claimQuest':if(typeof a!=='string')throw new GameError('Invalid quest');sim.claimQuest(a);break;
    case 'travel': {
      if(!isZone(a))throw new GameError('Invalid area');
      if(a==='ruins'){const party=partyOf(realm,player.id);if(!party||party.members.length<2||party.members.length>4){sim.onEvent('Form a party of 2–4 adventurers to enter');break;};const members=party.members.map(id=>realm.players[id]);if(members.some(p=>p.actor.save.level<40)){sim.onEvent('All party members must be level 40');break;};if(sim.travel(a,true)){player.room='dungeon:'+party.id;sim.monsters=roomFor(realm,player.room,a).monsters;}}
      else if(sim.travel(a)) {player.room=a;sim.monsters=roomFor(realm,a,a).monsters;}
      break;
    }
    case 'reportBug': {if(typeof a!=='string')throw new GameError('Invalid report');const text=a.trim().slice(0,500);if(text){const last=realm.reports?.findLast(r=>r.player===player.id);if(!last||now-last.at>60000){realm.reports??=[];realm.reports.push({id:crypto.randomUUID(),player:player.id,text,zone:sim.save.zone,at:now});realm.reports=realm.reports.slice(-100);sim.onEvent('Bug report saved. Thank you!');}}break;}
    case 'chat': {
      if(typeof a!=='string') throw new GameError('Invalid chat');
      const text=a.trim().replace(/[\u0000-\u001f]/g,'').slice(0,100);
      const last=realm.chat.findLast(m=>m.from===player.name);
      if(text&&(!last||now-last.at>=1000)) realm.chat.push({id:crypto.randomUUID(),from:player.name,text,at:now});
      realm.chat=realm.chat.slice(-60); break;
    }
    default:throw new GameError('Unknown action');
  }
  if(!handled&&sim.save.gold!==before) realm.ledger.push({id:command.id,player:player.id,action:command.type,at:now,goldDelta:sim.save.gold-before});
  if(!handled)for(const ally of allies)ally.p.actor=capture(ally.sim);
  realm.metrics??={};realm.metrics[command.type]=(realm.metrics[command.type]||0)+1;
  player.actor=capture(sim);player.session.sequence=sequence;player.acknowledged=[command.id];
}
export async function transact(store:RealmStore,identity:{id:string;name:string;admin?:boolean},input:{connect?:boolean;commands?:Command[];movement?:unknown}={},now=Date.now()):Promise<Snapshot> {
  for(let retry=0;retry<8;retry++) {
    let row=await store.read();
    if(!row){await store.create(freshRealm(now));row=await store.read()}
    if(!row)throw new GameError('The game database is unavailable',503);
    const {realm,revision}=row;if(realm.maintenance)throw new GameError("Realm maintenance. Your adventure is saved; reconnect when it reopens.",503); advance(realm,now);
    let player=realm.players[identity.id];
    if(!player) {
      if(Object.keys(realm.players).length>=128)throw new GameError('This alpha realm has reached its account capacity',503);
      const sim=new Simulation(Math.random,undefined,null);
      player={room:sim.save.zone,id:identity.id,name:identity.name.slice(0,24),actor:capture(sim),lastSeen:now,input:[0,0],inputAt:0,acknowledged:[],events:[],serial:0,session:{id:crypto.randomUUID(),sequence:0}};
      realm.players[identity.id]=player;
    }
    player.actor=capture(hydrate(player,realm));
    if(now-player.lastSeen>10_000) {player.actor.target=null;player.actor.destination=null;player.actor.auto=false;}
    if(input.connect) player.session={id:crypto.randomUUID(),sequence:0};
    if(input.movement!==undefined) {
      const m=input.movement;
      if(!Array.isArray(m)||m.length!==2||m.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1)) throw new GameError('Invalid movement');
      player.input=[m[0],m[1]];player.inputAt=now;
    }
    if(input.commands) {
      if(!Array.isArray(input.commands)||input.commands.length>8)throw new GameError('Too many commands');
      for(const command of input.commands)execute(player,realm,command,now,identity.admin===true);
    }
    player.lastSeen=now;realm.ledger=realm.ledger.slice(-500);
    if(await store.commit(revision,realm)) return {balance:realm.balance||{},community:communitySnapshot(realm,player,now),player:structuredClone(player),monsters:structuredClone(roomFor(realm,player.room||player.actor.save.zone,player.actor.save.zone).monsters),peers:Object.values(realm.players).filter(p=>p.id!==identity.id&&p.room===player.room&&now-p.lastSeen<10_000).map(p=>({id:p.id,name:p.name,job:p.actor.save.job,x:p.actor.x,z:p.actor.z,hp:p.actor.save.hp,maxHp:100+p.actor.save.stats.vit*4+(p.actor.save.level-1)*12})),chat:structuredClone(realm.chat),revision:revision+1,serverTime:now};
  }
  throw new GameError('The realm is busy. Your commands can be retried safely.',503);
}
