import {type StoneTier} from './refinement';
import { Simulation } from '../simulation';
import type { ZoneId } from './content';
import type { GearSlot } from './equipment';
import type { ClassId } from './classes';
import { actorFields, type Command, type Snapshot } from '../../server/protocol';
export class NetworkSimulation extends Simulation {
  override online=true;
  override connection='Connecting…';
  private session=''; private sequence=0; private queue:Command[]=[];
  private view?:{x:number;z:number};private receivedAt=performance.now();private rtt=0;private sentInput:[number,number]=[0,0];
  override get renderX(){return this.view?.x??this.x}
  override get renderZ(){return this.view?.z??this.z}
  private input:[number,number]=[0,0]; private running=false; private timer?:ReturnType<typeof setTimeout>;
  private eventCursor=0; private chatSeen=new Set<string>(); private retry=0; private stopped=false;
  constructor(snapshot:Snapshot) {super(Math.random,snapshot.player.actor.save,null);this.accept(snapshot);this.session=snapshot.player.session.id;this.sequence=snapshot.player.session.sequence;this.schedule(200);}
  private accept(snapshot:Snapshot) {
    const oldZone=this.save.zone;this.receivedAt=performance.now();
    const before=JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.items,this.save.gold,this.save.equipped,this.save.zone,this.save.quests]);
    for(const field of actorFields) (this as unknown as Record<string,unknown>)[field]=snapshot.player.actor[field];
    const socialChanged=JSON.stringify([this.community,this.remotePlayers.map(p=>p.id)])!==JSON.stringify([snapshot.community,snapshot.peers.map(p=>p.id)]);this.community=snapshot.community;
    this.balance=snapshot.balance||{};this.admin=snapshot.admin===true;
    if(!this.view||oldZone!==this.save.zone||Math.hypot(this.view.x-this.x,this.view.z-this.z)>3)this.view={x:this.x,z:this.z};
    this.monsters=snapshot.monsters;this.remotePlayers=snapshot.peers;
    this.queue=this.queue.filter(c=>Number(c.id.split(':')[1])>snapshot.player.session.sequence);
    for(const event of snapshot.player.events)if(event.id>this.eventCursor){this.eventCursor=event.id;this.onEvent(event.text,event.type,event.x,event.z)}
    for(const chat of snapshot.chat)if(!this.chatSeen.has(chat.id)){this.chatSeen.add(chat.id);this.onEvent(`${chat.from}: ${chat.text}`,'chat')}
    if(this.chatSeen.size>120)this.chatSeen=new Set(snapshot.chat.map(m=>m.id));
    this.connection='Online · server saved'; this.retry=0;
    if(socialChanged||before!==JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.items,this.save.gold,this.save.equipped,this.save.zone,this.save.quests]))this.onEvent('', 'sync');
  }
  private send(type:string,...args:unknown[]) { if(this.stopped)return; if(this.queue.length>=32){this.onEvent('Waiting for connection. Try again shortly.');return;}this.queue.push({id:`${this.session}:${++this.sequence}`,type,args});this.schedule(0); }
  private schedule(delay:number) {if(this.timer)clearTimeout(this.timer);if(!this.stopped)this.timer=setTimeout(()=>void this.flush(),delay);}
  private async flush() {
    if(this.running||this.stopped)return;this.running=true;const started=performance.now();this.sentInput=this.paused?[0,0]:[...this.input];
    try {
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commands:this.queue.slice(0,8),movement:this.sentInput}),signal:AbortSignal.timeout(8000)});
      const body=await response.json();
      if(!response.ok){if(response.status===409||response.status===401){this.stopped=true;this.connection=body.error;this.onEvent(body.error);return;}throw new Error(body.error)}
      this.rtt=performance.now()-started;this.accept(body as Snapshot);
    }catch {this.retry++;this.connection=`Reconnecting… (${this.queue.length} pending)`;}
    finally{this.running=false;const changed=this.input[0]!==this.sentInput[0]||this.input[1]!==this.sentInput[1];this.schedule(this.retry?Math.min(4000,200*2**Math.min(4,this.retry)):this.queue.length||changed?0:Math.max(0,200-(performance.now()-started)));}
  }
  override tick(dt:number,dx:number,dz:number){
    const input:[number,number]=this.paused?[0,0]:[Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,dz))];
    if(input[0]!==this.input[0]||input[1]!==this.input[1]){this.input=input;this.schedule(0);}
    if(!this.view)return;
    // Presentation only. Authoritative coordinates, damage and items stay in server snapshots.
    const length=Math.hypot(...input),lead=Math.min(.15,this.rtt/2000)*this.movementSpeed;
    const targetX=this.x+(length?input[0]/length*lead:0),targetZ=this.z+(length?input[1]/length*lead:0);
    const blend=1-Math.exp(-dt*(length?3:16));
    this.view.x+=(targetX-this.view.x)*blend;this.view.z+=(targetZ-this.view.z)*blend;
    if(length&&performance.now()-this.receivedAt<1000&&this.save.hp>0&&this.deathTime<=0){const nx=this.view.x+input[0]/length*this.movementSpeed*dt,nz=this.view.z+input[1]/length*this.movementSpeed*dt;const blocked=Math.abs(nx)>14||Math.abs(nz)>13||this.obstacles.some(o=>Math.hypot(nx-o.x,nz-o.z)<o.r+.3);if(!blocked&&Math.hypot(nx-this.x,nz-this.z)<=1.6){this.view.x=nx;this.view.z=nz;}}
  }
  override persist(){} // Durable save belongs to the server; browser cannot submit a character object.
  override select(id:number){this.send('select',id)}
  override nearest(){this.send('nearest')}
  override goTo(x:number,z:number){this.send('goTo',x,z)}
  override clearTarget(){this.send('clearTarget')}
  override setAuto(value:boolean){this.send('setAuto',value)}
  override skill(n:number){this.send('skill',n)}
  override castSkill(id:string){this.send('castSkill',id);return true}
  override usePotion(blue=false){this.send('usePotion',blue)}
  override collect(){this.send('collect')}
  override upgrade(id:string=this.save.equipped.weapon||'',tier:StoneTier='common'){this.send('upgrade',id,tier);return true}
  override stat(key:'str'|'vit'|'agi'){this.send('stat',key)}
  override claim(){this.send('claim')}
  override setClass(job:ClassId){this.send('setClass',job);return true}
  override assignSkill(slot:number,id:string){this.send('assignSkill',slot,id);return true}
  override buy(name:string){this.send('buy',name)}
  override sell(){this.send('sell')}
  override toggleTutorial(){this.send('toggleTutorial')}
  override interact(id:string){this.send('interact',id)}
  override craft(id:string){this.send('craft',id);return true}
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
  if(import.meta.env.DEV&&!new URLSearchParams(location.search).has('online') || new URLSearchParams(location.search).get('practice')==='1')return new Simulation();
  const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connect:true}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new RealmConnectionError('Cannot connect to the online realm. Your character is kept on the server.',response.status);
  return new NetworkSimulation(await response.json());
}
