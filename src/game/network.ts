import { Simulation } from '../simulation';
import type { ClassId } from './classes';
import { actorFields, type Command, type Snapshot } from '../../server/protocol';
export class NetworkSimulation extends Simulation {
  override online=true;
  override connection='Connecting…';
  private session=''; private sequence=0; private queue:Command[]=[];
  private input:[number,number]=[0,0]; private running=false; private timer?:ReturnType<typeof setTimeout>;
  private eventCursor=0; private chatSeen=new Set<string>(); private retry=0; private stopped=false;
  constructor(snapshot:Snapshot) {super(Math.random,snapshot.player.actor.save,null);this.accept(snapshot);this.session=snapshot.player.session.id;this.sequence=snapshot.player.session.sequence;this.schedule(200);}
  private accept(snapshot:Snapshot) {
    const before=JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.items,this.save.gold]);
    for(const field of actorFields) (this as unknown as Record<string,unknown>)[field]=snapshot.player.actor[field];
    this.admin=snapshot.admin===true;
    this.monsters=snapshot.monsters;this.remotePlayers=snapshot.peers;
    this.queue=this.queue.filter(c=>Number(c.id.split(':')[1])>snapshot.player.session.sequence);
    for(const event of snapshot.player.events)if(event.id>this.eventCursor){this.eventCursor=event.id;this.onEvent(event.text,event.type,event.x,event.z)}
    for(const chat of snapshot.chat)if(!this.chatSeen.has(chat.id)){this.chatSeen.add(chat.id);this.onEvent(`${chat.from}: ${chat.text}`,'chat')}
    if(this.chatSeen.size>120)this.chatSeen=new Set(snapshot.chat.map(m=>m.id));
    this.connection='Online · server saved'; this.retry=0;
    if(before!==JSON.stringify([this.save.job,this.save.stats,this.save.points,this.save.weapon,this.save.hotbar,this.save.items,this.save.gold]))this.onEvent('', 'sync');
  }
  private send(type:string,...args:unknown[]) { if(this.stopped)return; if(this.queue.length>=32){this.onEvent('Waiting for connection. Try again shortly.');return;}this.queue.push({id:`${this.session}:${++this.sequence}`,type,args});this.schedule(0); }
  private schedule(delay:number) {if(this.timer)clearTimeout(this.timer);if(!this.stopped)this.timer=setTimeout(()=>void this.flush(),delay);}
  private async flush() {
    if(this.running||this.stopped)return;this.running=true;
    try {
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commands:this.queue.slice(0,8),movement:this.paused?[0,0]:this.input}),signal:AbortSignal.timeout(8000)});
      const body=await response.json();
      if(!response.ok){if(response.status===409||response.status===401){this.stopped=true;this.connection=body.error;this.onEvent(body.error);return;}throw new Error(body.error)}
      this.accept(body as Snapshot);
    }catch {this.retry++;this.connection=`Reconnecting… (${this.queue.length} pending)`;}
    finally{this.running=false;this.schedule(Math.min(4000,this.retry?200*2**Math.min(4,this.retry):200));}
  }
  override tick(_dt:number,dx:number,dz:number){this.input=[Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,dz))];}
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
  override upgrade(){this.send('upgrade')}
  override stat(key:'str'|'vit'|'agi'){this.send('stat',key)}
  override claim(){this.send('claim')}
  override setClass(job:ClassId){this.send('setClass',job);return true}
  override assignSkill(slot:number,id:string){this.send('assignSkill',slot,id);return true}
  override buy(name:string){this.send('buy',name)}
  override sell(){this.send('sell')}
  chat(text:string){this.send('chat',text)}
  dispose(){this.stopped=true;if(this.timer)clearTimeout(this.timer)}
}
export async function startSimulation():Promise<Simulation> {
  if(import.meta.env.DEV&&!new URLSearchParams(location.search).has('online') || new URLSearchParams(location.search).get('practice')==='1')return new Simulation();
  const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connect:true}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Cannot connect to the online realm. Reload to retry. Your character is kept on the server.');
  return new NetworkSimulation(await response.json());
}
