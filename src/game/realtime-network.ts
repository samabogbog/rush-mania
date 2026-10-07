import {NetworkSimulation,RealmConnectionError} from './network';
import {EntityPresentation,LocalPresentation,type Position} from './network-presentation';
import {WORLD_BOUNDS} from './map-data';
import type {Snapshot} from '../../server/protocol';
import type {RealtimeServerMessage,RealtimeTicketResponse} from '../../server/realtime-protocol';

type Frame={sequence:number;dx:number;dz:number;dt:number};
/** Replays movement presentation only. Commands, combat and save objects are never replayed. */
export class MovementReplay {
 private frames:Frame[]=[];
 record(sequence:number,movement:[number,number],dt:number){if(dt<=0)return;this.frames.push({sequence,dx:movement[0],dz:movement[1],dt:Math.min(.1,dt)});while(this.frames.length>180)this.frames.shift();}
 reconcile(position:Position,acknowledged:number,speed:number,blocked:(point:Position)=>boolean){this.frames=this.frames.filter(f=>f.sequence>acknowledged);const target={...position};for(const f of this.frames){const length=Math.max(1,Math.hypot(f.dx,f.dz));const next={x:target.x+f.dx/length*speed*f.dt,z:target.z+f.dz/length*speed*f.dt};if(!blocked(next))Object.assign(target,next)}return target;}
 clear(){this.frames=[];}
 get pending(){return this.frames.length;}
}

type WireSnapshot=Extract<RealtimeServerMessage,{type:'snapshot'}>&{savedAt?:number};
export class RealtimeNetworkSimulation extends NetworkSimulation {
 private socket?:WebSocket;private packetTimer?:ReturnType<typeof setInterval>;private reconnectTimer?:ReturnType<typeof setTimeout>;private handshakeTimer?:ReturnType<typeof setTimeout>;
 private prediction:LocalPresentation;private replay=new MovementReplay();private inputSequence=0;private acknowledgedInput=0;
 private lastSent=0;private sentAt=new Map<number,number>();private lastSnapshot=performance.now();private websocketRtt=0;private reconnects=0;private connecting=false;
 private tickHz=20;private snapshotHz=10;private durableSequence=0;private savedAt=0;private bytes=0;
 private preview?:{sequence:number;id:string;started:number;duration:number;cooldown:number};
 private previewActionUntil=0;
 constructor(snapshot:Snapshot){super(snapshot,false);this.presentation=new EntityPresentation(200,100);this.prediction=new LocalPresentation({x:this.x,z:this.z});this.durableSequence=snapshot.player.session.sequence;this.packetTimer=setInterval(()=>this.pump(),50);}
 static async connect(configuration:RealtimeTicketResponse){
  return new Promise<RealtimeNetworkSimulation>((resolve,reject)=>{
   const socket=new WebSocket(configuration.url);const timeout=setTimeout(()=>{socket.close();reject(new RealmConnectionError('Realtime realm did not respond. Reload to reconnect.',503))},8000);
   socket.onopen=()=>socket.send(JSON.stringify({type:'hello',ticket:configuration.ticket}));
   socket.onerror=()=>{clearTimeout(timeout);socket.close();reject(new RealmConnectionError('Realtime realm unavailable. Your character is safe.',503))};
   socket.onclose=()=>{clearTimeout(timeout);reject(new RealmConnectionError('Realtime realm disconnected. Reload to reconnect.',503))};
   socket.onmessage=event=>{try{const message=JSON.parse(String(event.data)) as RealtimeServerMessage;if(message.type==='error'){clearTimeout(timeout);socket.close();reject(new RealmConnectionError(message.error,503));return}if(message.type!=='snapshot')return;clearTimeout(timeout);const simulation=new RealtimeNetworkSimulation(message.snapshot);simulation.bind(socket);simulation.receive(message);resolve(simulation)}catch{clearTimeout(timeout);socket.close();reject(new RealmConnectionError('Invalid realtime realm response',503))}};
  });
 }
 private bind(socket:WebSocket){this.socket=socket;this.connecting=false;this.lastSnapshot=performance.now();socket.onmessage=event=>{this.bytes=new TextEncoder().encode(String(event.data)).byteLength;try{const message=JSON.parse(String(event.data)) as RealtimeServerMessage;if(message.type==='snapshot')this.receive(message);else if(message.type==='error'){this.onEvent(message.error);if(!message.retryable){this.stopped=true;this.connection=message.error;this.clearTimers();socket.close()}else socket.close()}}catch{socket.close()}};socket.onclose=()=>{if(!this.stopped)this.scheduleReconnect()};socket.onerror=()=>socket.close();}
 private movementBlocked=(point:Position)=>point.x<WORLD_BOUNDS.minX||point.x>WORLD_BOUNDS.maxX||point.z<WORLD_BOUNDS.minZ||point.z>WORLD_BOUNDS.maxZ||this.obstacles.some(o=>Math.hypot(point.x-o.x,point.z-o.z)<o.r+.3);
 private receive(message:WireSnapshot){
  const snapshot=message.snapshot,now=performance.now();
  if(snapshot.player.session.id!==this.session){
   if(this.queue.length){this.stopped=true;this.connection='Session changed. Reload to check your saved adventure.';this.onEvent(this.connection);this.clearTimers();this.socket?.close();return;}
   this.session=snapshot.player.session.id;this.sequence=snapshot.player.session.sequence;this.replay.clear();
  }
  const reset=this.save.zone!==snapshot.player.actor.save.zone||(this.save.hp>0)!==(snapshot.player.actor.save.hp>0)||Math.hypot(this.x-snapshot.player.actor.x,this.z-snapshot.player.actor.z)>3;
  const sent=this.sentAt.get(message.acknowledgedInput);if(sent!==undefined)this.websocketRtt=now-sent;
  for(const sequence of this.sentAt.keys())if(sequence<=message.acknowledgedInput)this.sentAt.delete(sequence);
  this.acknowledgedInput=message.acknowledgedInput;this.durableSequence=message.durableCommandSequence;this.tickHz=message.tickHz;this.snapshotHz=message.snapshotHz;this.savedAt=message.savedAt??this.savedAt;
  const pending=this.queue.filter(command=>Number(command.id.split(':').at(-1))>this.durableSequence);
  super.accept(snapshot);this.queue=pending;this.sequence=Math.max(this.sequence,snapshot.player.session.sequence);
  if(reset)this.replay.clear();
  this.prediction.reconcile(this.replay.reconcile({x:this.x,z:this.z},this.acknowledgedInput,this.movementSpeed,this.movementBlocked),reset);
  if(this.preview&&snapshot.player.session.sequence>=this.preview.sequence)this.preview=undefined;
  this.lastSnapshot=now;this.reconnects=0;this.connection=this.queue.length?`Online · ${this.queue.length} pending save`:this.savedAt?'Online · server saved':'Online · connected';
 }
 private pump(){if(this.stopped)return;if(this.socket?.readyState!==WebSocket.OPEN){return}if(performance.now()-this.lastSnapshot>8000){this.socket.close();return}this.transmit();}
 private transmit(){if(this.stopped||this.socket?.readyState!==WebSocket.OPEN)return;this.lastSent=performance.now();const sequence=++this.inputSequence;this.sentAt.set(sequence,performance.now());while(this.sentAt.size>200)this.sentAt.delete(this.sentAt.keys().next().value!);this.socket.send(JSON.stringify({type:'input',sequence,movement:this.paused?[0,0]:this.input,commands:this.queue.slice(0,8)}));}
 protected override send(type:string,...args:unknown[]){if(this.stopped)return;const before=this.sequence;super.send(type,...args);if(this.sequence===before)return;if(['skill','castSkill'].includes(type))this.anticipate(type==='skill'?this.save.hotbar[Number(args[0])]:String(args[0]));this.connection=`Online · ${this.queue.length} pending save`;this.transmit();}
 private anticipate(id:string|null|undefined){if(!id||this.paused||this.save.hp<=0||this.preview||this.cast||this.skillCooldownRemaining(id)>0)return;const skill=this.unlockedSkills.find(s=>s.id===id);if(!skill||this.save.mp<skill.mp)return;this.preview={sequence:this.sequence,id,started:performance.now(),duration:skill.cast||.2,cooldown:skill.cooldown*this.cooldownMultiplier};this.previewActionUntil=performance.now()+250;this.skillCooldownTotals[id]=this.preview.cooldown;if(skill.cast)this.cast={skillId:id,targetId:this.target,remaining:skill.cast,total:skill.cast};else this.actionTime=.25;}
 override get renderX(){return this.prediction?.position.x??this.x}
 override get renderZ(){return this.prediction?.position.z??this.z}
 override get renderActionTime(){return Math.max(super.renderActionTime,(this.previewActionUntil-performance.now())/1000)}
 override get renderCast(){if(this.preview){const remaining=Math.max(0,this.preview.duration-(performance.now()-this.preview.started)/1000);if(remaining>0)return{skillId:this.preview.id,targetId:this.target,remaining,total:this.preview.duration}}return super.renderCast;}
 override skillCooldownRemaining(id:string){return Math.max(super.skillCooldownRemaining(id),this.preview?.id===id?Math.max(0,this.preview.cooldown-(performance.now()-this.preview.started)/1000):0)}
 override tick(dt:number,dx:number,dz:number){
  const movement:[number,number]=this.paused?[0,0]:[Math.max(-1,Math.min(1,dx)),Math.max(-1,Math.min(1,dz))];const changed=movement[0]!==this.input[0]||movement[1]!==this.input[1];this.input=movement;if(changed&&performance.now()-this.lastSent>=50)this.transmit();
  const alive=this.save.hp>0&&this.deathTime<=0&&!this.stopped,age=performance.now()-this.lastSnapshot,length=Math.max(1,Math.hypot(...movement));
  if(alive&&age<1200){this.replay.record(this.inputSequence,movement,dt);this.prediction.tick(dt,{x:movement[0]/length*this.movementSpeed,z:movement[1]/length*this.movementSpeed},age,this.movementBlocked)}
 }
 override stopMovementInput(){this.input=[0,0];this.transmit();}
 private scheduleReconnect(){if(this.stopped||this.reconnectTimer||this.connecting)return;this.reconnects++;this.connection=`Reconnecting… (${this.queue.length} pending)`;this.reconnectTimer=setTimeout(()=>{this.reconnectTimer=undefined;void this.reconnect()},Math.min(8000,250*2**Math.min(this.reconnects-1,5)));}
 private async reconnect(){if(this.stopped)return;this.connecting=true;try{const response=await fetch('/api/realtime-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});if(response.status===401){this.dispose();location.reload();return}if(!response.ok)throw new Error('Ticket unavailable');const ticket=await response.json() as RealtimeTicketResponse;if(!ticket.available)throw new Error('Realtime transport disabled');const socket=new WebSocket(ticket.url);this.socket=socket;const timeout=setTimeout(()=>socket.close(),8000);this.handshakeTimer=timeout;socket.onopen=()=>socket.send(JSON.stringify({type:'hello',ticket:ticket.ticket,resumeSession:this.session}));socket.onmessage=event=>{try{const message=JSON.parse(String(event.data)) as RealtimeServerMessage;if(message.type!=='snapshot'){if(message.type==='error'&&!message.retryable){this.stopped=true;this.connection=message.error;this.onEvent(message.error);this.clearTimers()}socket.close();return}clearTimeout(timeout);this.handshakeTimer=undefined;this.replay.clear();this.sentAt.clear();this.bind(socket);this.receive(message);this.transmit()}catch{socket.close()}};socket.onerror=()=>socket.close();socket.onclose=()=>{clearTimeout(timeout);this.connecting=false;this.scheduleReconnect()};}catch{this.connecting=false;this.scheduleReconnect()}}
 override get networkDiagnostics(){return Object.freeze({...super.networkDiagnostics,transport:'websocket',rttMs:this.websocketRtt,snapshotAgeMs:performance.now()-this.lastSnapshot,payloadBytes:this.bytes,pendingCommands:this.queue.length,inFlight:this.connecting,retries:this.reconnects,predictionStale:performance.now()-this.lastSnapshot>=1200,tickHz:this.tickHz,snapshotHz:this.snapshotHz,acknowledgedInput:this.acknowledgedInput,inputSequence:this.inputSequence,pendingMovementFrames:this.replay.pending,durableCommandSequence:this.durableSequence,commandSequence:this.sequence,lastSavedAt:this.savedAt,websocketState:this.socket?.readyState??WebSocket.CLOSED})}
 private clearTimers(){if(this.packetTimer)clearInterval(this.packetTimer);if(this.reconnectTimer)clearTimeout(this.reconnectTimer);if(this.handshakeTimer)clearTimeout(this.handshakeTimer)}
 override dispose(){super.dispose();this.clearTimers();this.socket?.close();this.sentAt.clear();this.replay.clear();}
}
