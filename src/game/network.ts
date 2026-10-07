import {requireGameAccount} from '../ui/account-auth';
import {WORLD_BOUNDS} from './map-data';
import {type StoneTier} from './refinement';
import { Simulation } from '../simulation';
import type { ZoneId } from './content';
import type { Rarity, GearSlot } from './equipment';
import type { ClassId } from './classes';
import { actorFields, type Command, type Snapshot } from '../../server/protocol';
import {EntityPresentation,LocalPresentation} from './network-presentation';
export class NetworkSimulation extends Simulation {
  override online=true;
  override connection='Connecting…';
  protected session=''; protected sequence=0; protected queue:Command[]=[];
  private view?:LocalPresentation;private receivedAt=performance.now();private rtt=0;private sentInput:[number,number]=[0,0];
  protected presentation=new EntityPresentation();private payloadBytes=0;
  override get renderX(){return this.view?.position.x??this.x}
  override get renderZ(){return this.view?.position.z??this.z}
  private get snapshotAge(){return Math.max(0,performance.now()-this.receivedAt);}
  override get renderTime(){return this.time+Math.min(1.2,this.snapshotAge/1000);}
  override get renderActionTime(){return Math.max(0,this.actionTime-this.snapshotAge/1000);}
  override get renderHurtTime(){return Math.max(0,this.hurtTime-this.snapshotAge/1000);}
  override get renderCast(){return this.cast?{...this.cast,remaining:Math.max(0,this.cast.remaining-this.snapshotAge/1000)}:null;}
  override renderMonster(monster:Simulation['monsters'][number]){return this.presentation.position('monster:'+monster.id,monster,performance.now());}
  override renderPeer(player:Simulation['remotePlayers'][number]){return this.presentation.position('peer:'+player.id,player,performance.now());}
  get networkDiagnostics(){return Object.freeze({rttMs:this.rtt,snapshotIntervalMs:this.presentation.intervalMs,snapshotAgeMs:this.snapshotAge,payloadBytes:this.payloadBytes,interpolationDelayMs:this.presentation.delayMs,bufferedSamples:this.presentation.bufferedSamples,pendingCommands:this.queue.length,inFlight:this.running,retries:this.retry,predictionStale:this.snapshotAge>=1200,transport:'http' as string});}
  protected input:[number,number]=[0,0]; private running=false; private timer?:ReturnType<typeof setTimeout>;
  private eventCursor=0; private chatSeen=new Set<string>(); private retry=0; protected stopped=false;
  constructor(snapshot:Snapshot,private polling=true) {super(Math.random,snapshot.player.actor.save,null);this.accept(snapshot);this.session=snapshot.player.session.id;this.sequence=snapshot.player.session.sequence;if(polling)this.schedule(200);}
  protected accept(snapshot:Snapshot) {
    const oldZone=this.save.zone,oldAlive=this.save.hp>0&&this.deathTime<=0,oldX=this.x,oldZ=this.z;
    this.receivedAt=performance.now();
    const before=JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.skillChoices,this.save.skillRanks,this.save.auxiliary,this.save.items,this.save.gold,this.save.equipped,this.save.zone,this.save.quests]);
    for(const field of actorFields) if(snapshot.player.actor[field]!==undefined)(this as unknown as Record<string,unknown>)[field]=snapshot.player.actor[field];
    this.skillCooldownTotals=snapshot.player.actor.skillCooldownTotals||{...this.skillCooldowns};this.autoSkillCursor=snapshot.player.actor.autoSkillCursor||0;
    const socialChanged=JSON.stringify([this.community,this.remotePlayers.map(p=>p.id)])!==JSON.stringify([snapshot.community,snapshot.peers.map(p=>p.id)]);this.community=snapshot.community;
    this.balance=snapshot.balance||{};this.admin=snapshot.admin===true;
    const alive=this.save.hp>0&&this.deathTime<=0,reset=oldZone!==this.save.zone||oldAlive!==alive||Math.hypot(oldX-this.x,oldZ-this.z)>3;
    if(!this.view)this.view=new LocalPresentation({x:this.x,z:this.z});
    const length=Math.hypot(...this.input),lead=alive&&!this.paused&&!reset?Math.min(.2,this.rtt/2000)*this.movementSpeed:0;
    this.view.reconcile({x:this.x+this.input[0]/Math.max(1,length)*lead,z:this.z+this.input[1]/Math.max(1,length)*lead},reset);
    this.monsters=snapshot.monsters;this.remotePlayers=snapshot.peers;
    this.presentation.accept([...this.monsters.map(monster=>({id:'monster:'+monster.id,x:monster.x,z:monster.z,life:monster.kind+':'+monster.alive})),...this.remotePlayers.map(player=>({id:'peer:'+player.id,x:player.x,z:player.z,life:player.job+':'+(player.hp>0)}))],this.receivedAt,reset);
    this.queue=this.queue.filter(c=>Number(c.id.split(':')[1])>snapshot.player.session.sequence);
    for(const event of snapshot.player.events)if(event.id>this.eventCursor){this.eventCursor=event.id;this.onEvent(event.text,event.type,event.x,event.z)}
    for(const chat of snapshot.chat)if(!this.chatSeen.has(chat.id)){this.chatSeen.add(chat.id);this.onEvent(`${chat.from}: ${chat.text}`,'chat')}
    if(this.chatSeen.size>120)this.chatSeen=new Set(snapshot.chat.map(m=>m.id));
    this.connection='Online · server saved'; this.retry=0;
    if(socialChanged||before!==JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.skillChoices,this.save.skillRanks,this.save.auxiliary,this.save.items,this.save.gold,this.save.equipped,this.save.zone,this.save.quests]))this.onEvent('', 'sync');
  }
  protected send(type:string,...args:unknown[]) { if(this.stopped)return; if(this.queue.length>=32){this.onEvent('Waiting for connection. Try again shortly.');return;}this.queue.push({id:`${this.session}:${++this.sequence}`,type,args});this.schedule(0); }
  private schedule(delay:number) {if(!this.polling)return;if(this.timer)clearTimeout(this.timer);if(!this.stopped)this.timer=setTimeout(()=>void this.flush(),delay);}
  private async flush() {
    if(this.running||this.stopped)return;this.running=true;const started=performance.now();this.sentInput=this.paused?[0,0]:[...this.input];
    try {
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commands:this.queue.slice(0,8),movement:this.sentInput}),signal:AbortSignal.timeout(8000)});
      const text=await response.text();this.payloadBytes=new TextEncoder().encode(text).byteLength;
      const body=JSON.parse(text);
      if(!response.ok){if(response.status===409||response.status===401){this.stopped=true;this.connection=body.error;this.onEvent(body.error);if(response.status===401)location.reload();return;}throw new Error(body.error)}
      this.rtt=performance.now()-started;this.accept(body as Snapshot);
    }catch {this.retry++;this.connection=`Reconnecting… (${this.queue.length} pending)`;}
    finally{this.running=false;const changed=this.input[0]!==this.sentInput[0]||this.input[1]!==this.sentInput[1];this.schedule(this.retry?Math.min(4000,200*2**Math.min(4,this.retry)):this.queue.length||changed?0:Math.max(0,200-(performance.now()-started)));}
  }
  override tick(dt:number,dx:number,dz:number){
    const input:[number,number]=this.paused?[0,0]:[Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,dz))];
    if(input[0]!==this.input[0]||input[1]!==this.input[1]){this.input=input;this.schedule(0);}
    if(!this.view)return;
    // Presentation only. Authoritative coordinates, damage and items stay in server snapshots.
    const length=Math.hypot(...input),moving=this.save.hp>0&&this.deathTime<=0&&!this.paused;
    this.view.tick(dt,{x:moving?input[0]/Math.max(1,length)*this.movementSpeed:0,z:moving?input[1]/Math.max(1,length)*this.movementSpeed:0},this.snapshotAge,point=>point.x<WORLD_BOUNDS.minX||point.x>WORLD_BOUNDS.maxX||point.z<WORLD_BOUNDS.minZ||point.z>WORLD_BOUNDS.maxZ||this.obstacles.some(o=>Math.hypot(point.x-o.x,point.z-o.z)<o.r+.3));
  }
  override stopMovementInput(){if(this.input[0]||this.input[1]){this.input=[0,0];this.schedule(0);}}
  override skillCooldownRemaining(id:string){return Math.max(0,(this.skillCooldowns[id]||0)-(performance.now()-this.receivedAt)/1000);}
  override spawnItem(id:string,count:number,rarity:Rarity='common',refine=0){if(this.admin)this.send('adminSpawn',id,count,rarity,refine);}
  override persist(){} // Durable save belongs to the server; browser cannot submit a character object.
  override select(id:number){this.send('select',id)}
  override nearest(){this.send('nearest')}
  override goTo(x:number,z:number){this.send('goTo',x,z)}
  override clearTarget(){this.send('clearTarget')}
  override setAuto(value:boolean){this.send('setAuto',value)}
  override skill(n:number){this.send('skill',n)}
  override castSkill(id:string){this.send('castSkill',id);return true}
  override useItem(name:string){this.send('useItem',name);return true}
  override usePotion(blue=false){this.send('usePotion',blue);return true}
  override collect(){this.send('collect')}
  override upgrade(id:string=this.save.equipped.weapon||'',tier:StoneTier='common'){this.send('upgrade',id,tier);return true}
  override stat(key:'str'|'vit'|'agi'){this.send('stat',key)}
  override claim(){this.send('claim')}
  override setClass(job:ClassId){this.send('setClass',job);return true}
  override upgradeSkill(id:string){this.send('upgradeSkill',id);return true}
  override chooseSkill(id:string){this.send('chooseSkill',id);return true}
  override resetSkills(){this.send('resetSkills');return true}
  override assignAuxiliary(slot:number,name:string|null){this.send('assignAuxiliary',slot,name);return true}
  override useAuxiliary(slot:number){this.send('useAuxiliary',slot);return true}
  override assignSkill(slot:number,id:string){this.send('assignSkill',slot,id);return true}
  override buy(name:string){this.send('buy',name)}
  override sellItem(key:string,count=1){this.send('sellItem',key,count);return true}
  override salvageItem(key:string){this.send('salvageItem',key);return true}
  override sell(){this.send('sell')}
  override toggleTutorial(){this.send('toggleTutorial')}
  override interact(id:string){this.send('interact',id)}
  override craft(id:string,rarity:Rarity='common'){this.send('craft',id,rarity);return true}
  override upgradeMaterial(name:string,rarity:Rarity){this.send('upgradeMaterial',name,rarity);return true}
  override equip(id:string){this.send('equip',id);return true}
  override unequip(slot:GearSlot){this.send('unequip',slot)}
  override claimQuest(id:string){this.send('claimQuest',id);return true}
  override travel(zone:ZoneId){this.send('travel',zone);return true}
  override communityAction(type:string,...args:unknown[]){this.send(type,...args)}
  chat(text:string){this.send('chat',text)}
  dispose(){this.stopped=true;if(this.timer)clearTimeout(this.timer)}
}
export class RealmConnectionError extends Error{constructor(message:string,public status:number){super(message)}}
export async function startSimulation():Promise<Simulation> {
  if(new URLSearchParams(location.search).get('practice')==='1')return new Simulation();
  await requireGameAccount();
  const ticket=await fetch('/api/realtime-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
  if(!ticket.ok)throw new RealmConnectionError('Cannot connect to the online realm.',ticket.status);
  const configuration=await ticket.json();
  if(configuration.available===true){const {RealtimeNetworkSimulation}=await import('./realtime-network');return RealtimeNetworkSimulation.connect(configuration)}
  if(configuration.available!==false)throw new RealmConnectionError('Invalid realm transport configuration',503);
  const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connect:true}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new RealmConnectionError('Cannot connect to the online realm. Your character is kept on the server.',response.status);
  return new NetworkSimulation(await response.json());
}
