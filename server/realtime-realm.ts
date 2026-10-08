import type {Client} from '@libsql/client';
import tuning from '../src/config/realtime.json' with {type:'json'};
import {advanceRealm,freshRealm,GameError,realmSnapshot,transact} from './realm.js';
import type {Realm,Command} from './protocol.js';
import type {RealmStore} from './store.js';
import type {TicketClaims} from './realtime-ticket.js';
import type {RealtimeServerMessage} from './realtime-protocol.js';

const transientCommands=new Set(['select','nearest','goTo','clearTarget','setAuto','skill','castSkill','chat']);
export type RealmFaultCode='owner_busy'|'lease_expired'|'lease_conflict'|'revision_conflict'|'database_error'|'capacity'|'maintenance'|'simulation_error'|'realm_stopped';
export class RealmFault extends GameError {
  constructor(public code:RealmFaultCode,public operation:string,public context:Record<string,number|string>={}){super(code==='owner_busy'?'Another persistent realm owns this database':'Realtime realm fault: '+code,503);}
}
export function safeDatabaseCode(error:unknown):string {
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  return /^(SQLITE_(BUSY|LOCKED|CONSTRAINT|IOERR|READONLY|CORRUPT|NOTADB|ERROR)|TRANSACTION_CLOSED|SERVER_ERROR|HTTP_SERVER_ERROR|HRANA_WEBSOCKET_ERROR|TIMEOUT|ECONNRESET|ECONNREFUSED)$/.test(code)?code:'UNKNOWN';
}
export class RealtimeRealm {
  private realm!:Realm;private revision=0;private databaseRevision=0;
  private owner=crypto.randomUUID();private expiresAt=0;private stopped=false;
  private saving?:Promise<void>;private saveRequested=false;
  private renewing?:Promise<void>;
  private durable=new Map<string,{session:string;sequence:number}>();
  private connections=new Map<string,{claims:TicketClaims;inputSequence:number}>();
  savedAt=0;
  onFailure:(error:RealmFault)=>void=()=>{};
  constructor(private client:Client){}
  get ready(){return !!this.realm&&!this.stopped&&Date.now()<this.expiresAt;}
  private check(now=Date.now()){if(this.stopped)throw new RealmFault('realm_stopped','ownership');if(now>=this.expiresAt)throw new RealmFault('lease_expired','ownership',{expiredByMs:now-this.expiresAt});}
  private fail(error:unknown,operation:string){if(this.stopped)return;this.stopped=true;const fault=error instanceof RealmFault?error:new RealmFault(operation==='tick'?'simulation_error':'database_error',operation,{databaseCode:safeDatabaseCode(error)});fault.context={...fault.context,databaseRevision:this.databaseRevision,savedAgeMs:Math.max(0,Date.now()-this.savedAt),leaseRemainingMs:this.expiresAt-Date.now(),connections:this.connections.size};this.onFailure(fault);}
  async start(now=Date.now()) {
    const tx=await this.client.transaction('write');
    try {
      await tx.execute({sql:'INSERT INTO realtime_leases(id,owner,expires_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE realtime_leases.expires_at<=?',args:['glade-01',this.owner,now+tuning.leaseMs,now]});
      const lease=await tx.execute({sql:'SELECT owner,expires_at FROM realtime_leases WHERE id=?',args:['glade-01']});if(lease.rows[0]?.owner!==this.owner)throw new RealmFault('owner_busy','start',{retryAfterMs:Math.max(0,Number(lease.rows[0]?.expires_at||now)-now)});
      const row=await tx.execute({sql:'SELECT revision,state,updated_at FROM realms WHERE id=?',args:['glade-01']});
      if(row.rows.length){this.databaseRevision=Number(row.rows[0].revision);this.realm=JSON.parse(String(row.rows[0].state));this.savedAt=Number(row.rows[0].updated_at);}
      else {this.realm=freshRealm(now);await tx.execute({sql:'INSERT INTO realms(id,revision,state,updated_at) VALUES(?,0,?,?)',args:['glade-01',JSON.stringify(this.realm),now]});this.savedAt=now;}
      if(this.realm.maintenance)throw new RealmFault('maintenance','start');
      for(const player of Object.values(this.realm.players)){this.durable.set(player.id,{session:player.session.id,sequence:player.session.sequence});player.input=[0,0];player.inputAt=0;player.lastSeen=now-10001;}
      this.realm.time=now;this.expiresAt=now+tuning.leaseMs;await tx.commit();
    }catch(error){await tx.rollback();throw error;}finally{tx.close();}
  }
  private memoryStore():RealmStore {return {read:async()=>({revision:this.revision,realm:structuredClone(this.realm)}),create:async()=>{},commit:async(revision,realm)=>{if(revision!==this.revision)return false;this.realm=realm;this.revision++;return true;}};}
  async connect(claims:TicketClaims,resumeSession?:string,now=Date.now()) {
    this.check(now);
    const session=this.realm.players[claims.playerId]?.session.id;
    if(resumeSession&&session!==resumeSession)throw new GameError('Game session changed; refresh before sending pending actions',409);
    await transact(this.memoryStore(),{id:claims.playerId,name:claims.name,job:claims.job,admin:claims.admin},{connect:!resumeSession},now);
    this.connections.set(claims.playerId,{claims,inputSequence:0});
    if(!resumeSession)void this.checkpoint().catch(()=>{});
    return this.snapshot(claims.playerId,now);
  }
  disconnect(playerId:string){this.connections.delete(playerId);const player=this.realm.players[playerId];if(player){player.input=[0,0];player.inputAt=0;player.lastSeen=0;player.actor.target=null;player.actor.destination=null;player.actor.auto=false;}}
  async input(playerId:string,sequence:number,movement:unknown,commands:Command[]|undefined,now=Date.now()) {
    this.check(now);const connection=this.connections.get(playerId);if(!connection)throw new GameError('Connect before sending movement',401);
    if(!Number.isSafeInteger(sequence)||sequence<1)throw new GameError('Invalid input sequence');
    if(!Array.isArray(movement)||movement.length!==2||movement.some(value=>typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1))throw new GameError('Invalid movement');
    const player=this.realm.players[playerId];
    if(sequence>connection.inputSequence){player.input=[movement[0],movement[1]];player.inputAt=now;connection.inputSequence=sequence;}
    player.lastSeen=now;
    if(commands!==undefined){if(!Array.isArray(commands)||commands.length>8)throw new GameError('Too many commands');
      const previous=player.session.sequence;
      await transact(this.memoryStore(),{id:playerId,name:connection.claims.name,admin:connection.claims.admin},{commands},now);
      const changed=this.realm.players[playerId].session.sequence>previous;
      if(changed&&commands.some(command=>!transientCommands.has(command.type)))void this.checkpoint().catch(()=>{});
    }
  }
  tick(now=Date.now()){try{this.check(now);if(this.realm.maintenance)throw new RealmFault('maintenance','tick');for(const id of this.connections.keys())this.realm.players[id].lastSeen=now;advanceRealm(this.realm,now);this.revision++;}catch(error){this.fail(error,'tick');}}
  snapshot(playerId:string,now=Date.now()):Extract<RealtimeServerMessage,{type:'snapshot'}>{
    this.check(now);const snapshot=realmSnapshot(this.realm,playerId,this.revision,now),connection=this.connections.get(playerId),durable=this.durable.get(playerId);
    snapshot.admin=connection?.claims.admin===true;
    return {type:'snapshot',snapshot,acknowledgedInput:connection?.inputSequence||0,durableCommandSequence:durable?.session===snapshot.player.session.id?durable.sequence:0,savedAt:this.savedAt,tickHz:tuning.tickHz,snapshotHz:tuning.snapshotHz};
  }
  checkpoint():Promise<void>{
    this.check();this.saveRequested=true;
    if(this.saving)return this.saving;
    this.saving=(async()=>{
      try{while(this.saveRequested){this.saveRequested=false;await this.saveOnce();}}
      catch(error){this.fail(error,'checkpoint');throw error;}
      // Clear before resolving: a caller in the next microtask must start a new
      // save, not attach to a completed flight and leave its request unsaved.
      finally{this.saving=undefined;}
    })();return this.saving;
  }
  private async saveOnce(){
    this.check();const realm=structuredClone(this.realm),state=JSON.stringify(realm);if(state.length>2000000)throw new RealmFault('capacity','checkpoint',{stateBytes:state.length});
    const tx=await this.client.transaction('write');
    try {const now=Date.now();this.check(now);
      const result=await tx.execute({sql:'UPDATE realms SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM realtime_leases WHERE id=? AND owner=? AND expires_at>?)',args:[state,now,'glade-01',this.databaseRevision,'glade-01',this.owner,now]});
      if(result.rowsAffected!==1){const lease=await tx.execute({sql:'SELECT owner,expires_at FROM realtime_leases WHERE id=?',args:['glade-01']});if(lease.rows[0]?.owner!==this.owner)throw new RealmFault('lease_conflict','checkpoint');if(Number(lease.rows[0]?.expires_at)<=Date.now())throw new RealmFault('lease_expired','checkpoint');const current=await tx.execute({sql:'SELECT revision FROM realms WHERE id=?',args:['glade-01']});throw new RealmFault('revision_conflict','checkpoint',{expectedRevision:this.databaseRevision,actualRevision:Number(current.rows[0]?.revision??-1)});}await tx.commit();this.databaseRevision++;this.savedAt=Date.now();
      this.durable=new Map(Object.values(realm.players).map(player=>[player.id,{session:player.session.id,sequence:player.session.sequence}]));
    }catch(error){await tx.rollback();throw error;}finally{tx.close();}
  }
  renew(now=Date.now()):Promise<void>{
    if(this.renewing)return this.renewing;
    this.renewing=(async()=>{const started=Date.now();try{this.check(now);const result=await this.client.execute({sql:'UPDATE realtime_leases SET expires_at=? WHERE id=? AND owner=? AND expires_at>?',args:[now+tuning.leaseMs,'glade-01',this.owner,now]});if(result.rowsAffected!==1)throw new RealmFault('lease_conflict','renew');this.check();this.expiresAt=now+tuning.leaseMs;}catch(error){const fault=error instanceof RealmFault?error:new RealmFault('database_error','renew',{databaseCode:safeDatabaseCode(error)});fault.context.ioDurationMs=Date.now()-started;this.fail(fault,'renew');throw fault;}finally{this.renewing=undefined;}})();return this.renewing;
  }
  async close(){if(this.stopped)return;for(const id of [...this.connections.keys()])this.disconnect(id);await this.checkpoint();this.stopped=true;await this.client.execute({sql:'DELETE FROM realtime_leases WHERE id=? AND owner=?',args:['glade-01',this.owner]});}
}
