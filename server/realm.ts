import { Simulation, type Save } from '../src/simulation';
import { gladeObstacles } from '../src/game/map-data';
import { isClass } from '../src/game/classes';
import { capture, type Command, type Player, type Realm, type Snapshot } from './protocol';
import type { RealmStore } from './store';
export class GameError extends Error { constructor(message:string,public status=400){super(message)} }
export function freshRealm(now:number):Realm { const sim=new Simulation(Math.random,undefined,null); return {version:1,time:now,players:{},monsters:sim.monsters,chat:[],ledger:[]}; }
function hydrate(player:Player, realm:Realm) {
  const sim=new Simulation(Math.random,player.actor.save as Save,null);
  Object.assign(sim,structuredClone(player.actor)); sim.monsters=realm.monsters; sim.obstacles=gladeObstacles(); sim.actorId=player.id;
  sim.onEvent=(text,type='system',x,z)=>{player.events.push({id:++player.serial,text,type,x,z}); player.events=player.events.slice(-40)};
  return sim;
}
function advance(realm:Realm,now:number) {
  const active=Object.values(realm.players).filter(p=>now-p.lastSeen<10_000);
  const sims=active.map(p=>({p,sim:hydrate(p,realm)}));
  const ownership=new Map<number,string>();
  for(const m of realm.monsters) {
    if(m.owner && !sims.some(({p})=>p.id===m.owner)) { m.owner=undefined; m.aggro=false; m.windup=0; }
    const owner=sims.find(({p})=>p.id===m.owner) ?? sims.find(({sim})=>sim.target===m.id) ?? sims[0];
    if(owner) ownership.set(m.id,owner.p.id);
  }
  for(const {p,sim} of sims) {
    sim.enemyFilter=m=>ownership.get(m.id)===p.id;
    sim.onKill=(monster)=> { // Kill ownership is stable; party rewards are added in the social milestone.
      realm.ledger.push({id:crypto.randomUUID(),player:p.id,action:`kill:${monster.kind}`,at:now,goldDelta:8});
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
  if(!sims.length) for(const m of realm.monsters) {m.aggro=false;m.windup=0;m.owner=undefined;}
  realm.time=now; realm.ledger=realm.ledger.slice(-500);
}
function execute(player:Player,realm:Realm,command:Command,now:number) {
  if(!command || typeof command.id!=='string' || typeof command.type!=='string' || !Array.isArray(command.args)) throw new GameError('Invalid command');
  const [session,sequenceString]=command.id.split(':'); const sequence=Number(sequenceString);
  if(session!==player.session.id) throw new GameError('This character was opened in another session. Reconnect to continue.',409);
  if(!Number.isSafeInteger(sequence)||sequence<1) throw new GameError('Invalid sequence');
  if(sequence<=player.session.sequence) return; // Idempotent replay after a dropped response.
  if(sequence!==player.session.sequence+1) throw new GameError('Commands must arrive in order',409);
  const sim=hydrate(player,realm), [a,b]=command.args; const before=sim.save.gold;
  const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  switch(command.type) {
    case 'select': if(integer(a,0,realm.monsters.length-1)) sim.select(a as number); else throw new GameError('Invalid target'); break;
    case 'goTo': if(typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)) sim.goTo(a,b); else throw new GameError('Invalid position');break;
    case 'nearest':sim.nearest();break;
    case 'clearTarget':sim.clearTarget();break;
    case 'setAuto':if(typeof a!=='boolean') throw new GameError('Invalid auto setting');sim.setAuto(a);break;
    case 'skill':if(!integer(a,0,5))throw new GameError('Invalid hotbar slot');sim.skill(a as number);break;
    case 'castSkill':if(typeof a!=='string')throw new GameError('Invalid skill');sim.castSkill(a);break;
    case 'usePotion':sim.usePotion(a===true);break;
    case 'collect':sim.collect();break;
    case 'upgrade':if(sim.save.weapon>=20)throw new GameError('Refinement cap reached');sim.upgrade();break;
    case 'stat':if(a!=='str'&&a!=='vit'&&a!=='agi')throw new GameError('Invalid attribute');sim.stat(a);break;
    case 'claim':sim.claim();break;
    case 'setClass':if(!isClass(a))throw new GameError('Invalid class');sim.setClass(a);break;
    case 'assignSkill':if(!integer(a,0,3)||typeof b!=='string')throw new GameError('Invalid assignment');sim.assignSkill(a as number,b);break;
    case 'buy':if(typeof a!=='string')throw new GameError('Invalid item');sim.buy(a);break;
    case 'sell':sim.sell();break;
    case 'chat': {
      if(typeof a!=='string') throw new GameError('Invalid chat');
      const text=a.trim().replace(/[\u0000-\u001f]/g,'').slice(0,100);
      const last=realm.chat.findLast(m=>m.from===player.name);
      if(text&&(!last||now-last.at>=1000)) realm.chat.push({id:crypto.randomUUID(),from:player.name,text,at:now});
      realm.chat=realm.chat.slice(-60); break;
    }
    default:throw new GameError('Unknown action');
  }
  if(sim.save.gold!==before) realm.ledger.push({id:command.id,player:player.id,action:command.type,at:now,goldDelta:sim.save.gold-before});
  player.actor=capture(sim);player.session.sequence=sequence;player.acknowledged=[command.id];
}
export async function transact(store:RealmStore,identity:{id:string;name:string},input:{connect?:boolean;commands?:Command[];movement?:unknown}={},now=Date.now()):Promise<Snapshot> {
  for(let retry=0;retry<8;retry++) {
    let row=await store.read();
    if(!row){await store.create(freshRealm(now));row=await store.read()}
    if(!row)throw new GameError('The game database is unavailable',503);
    const {realm,revision}=row; advance(realm,now);
    let player=realm.players[identity.id];
    if(!player) {
      if(Object.keys(realm.players).length>=128)throw new GameError('This alpha realm has reached its account capacity',503);
      const sim=new Simulation(Math.random,undefined,null);
      player={id:identity.id,name:identity.name.slice(0,24),actor:capture(sim),lastSeen:now,input:[0,0],inputAt:0,acknowledged:[],events:[],serial:0,session:{id:crypto.randomUUID(),sequence:0}};
      realm.players[identity.id]=player;
    }
    if(now-player.lastSeen>10_000) {player.actor.target=null;player.actor.destination=null;player.actor.auto=false;}
    if(input.connect) player.session={id:crypto.randomUUID(),sequence:0};
    if(input.movement!==undefined) {
      const m=input.movement;
      if(!Array.isArray(m)||m.length!==2||m.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1)) throw new GameError('Invalid movement');
      player.input=[m[0],m[1]];player.inputAt=now;
    }
    if(input.commands) {
      if(!Array.isArray(input.commands)||input.commands.length>8)throw new GameError('Too many commands');
      for(const command of input.commands)execute(player,realm,command,now);
    }
    player.lastSeen=now;realm.ledger=realm.ledger.slice(-500);
    if(await store.commit(revision,realm)) return {player:structuredClone(player),monsters:structuredClone(realm.monsters),peers:Object.values(realm.players).filter(p=>p.id!==identity.id&&now-p.lastSeen<10_000).map(p=>({id:p.id,name:p.name,job:p.actor.save.job,x:p.actor.x,z:p.actor.z,hp:p.actor.save.hp,maxHp:100+p.actor.save.stats.vit*4+(p.actor.save.level-1)*12})),chat:structuredClone(realm.chat),revision:revision+1,serverTime:now};
  }
  throw new GameError('The realm is busy. Your commands can be retried safely.',503);
}
