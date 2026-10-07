import type {Client} from '@libsql/client';
import tuning from '../src/config/realtime.json' with {type:'json'};
import {advanceRealm,freshRealm,GameError,realmSnapshot,transact} from './realm.js';
import type {Realm,Command} from './protocol.js';
import type {RealmStore} from './store.js';
import type {TicketClaims} from './realtime-ticket.js';
import type {RealtimeServerMessage} from './realtime-protocol.js';

const transientCommands=new Set(['select','nearest','goTo','clearTarget','setAuto','skill','castSkill','chat']);
export class RealtimeRealm {
  private realm!:Realm;private revision=0;private databaseRevision=0;
  private owner=crypto.randomUUID();private expiresAt=0;private stopped=false;
  private saving?:Promise<void>;private saveRequested=false;
  private durable=new Map<string,{session:string;sequence:number}>();
  private connections=new Map<string,{claims:TicketClaims;inputSequence:number}>();
  savedAt=0;
  onFailure:(error:Error)=>void=()=>{};
  constructor(private client:Client){}
  get ready(){return !!this.realm&&!this.stopped&&Date.now()<this.expiresAt;}
  private check(now=Date.now()){if(this.stopped||now>=this.expiresAt)throw new GameError('Realm ownership unavailable',503);}
  private fail(error:unknown){if(this.stopped)return;this.stopped=true;this.onFailure(error instanceof Error?error:new Error('Realm persistence failed'));}
  async start(now=Date.now()) {
    const tx=await this.client.transaction('write');
    try {
      await tx.execute({sql:'INSERT INTO realtime_leases(id,owner,expires_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE realtime_leases.expires_at<=?',args:['glade-01',this.owner,now+tuning.leaseMs,now]});
      const lease=await tx.execute({sql:'SELECT owner FROM realtime_leases WHERE id=?',args:['glade-01']});if(lease.rows[0]?.owner!==this.owner)throw new Error('Another persistent realm owns this database');
      const row=await tx.execute({sql:'SELECT revision,state,updated_at FROM realms WHERE id=?',args:['glade-01']});
      if(row.rows.length){this.databaseRevision=Number(row.rows[0].revision);this.realm=JSON.parse(String(row.rows[0].state));this.savedAt=Number(row.rows[0].updated_at);}
      else {this.realm=freshRealm(now);await tx.execute({sql:'INSERT INTO realms(id,revision,state,updated_at) VALUES(?,0,?,?)',args:['glade-01',JSON.stringify(this.realm),now]});this.savedAt=now;}
      if(this.realm.maintenance)throw new Error('Realm is in maintenance');
      for(const player of Object.values(this.realm.players)){this.durable.set(player.id,{session:player.session.id,sequence:player.session.sequence});player.input=[0,0];player.inputAt=0;player.lastSeen=now-10001;}
      this.realm.time=now;this.expiresAt=now+tuning.leaseMs;await tx.commit();
    }catch(error){await tx.rollback();throw error;}finally{tx.close();}
  }
  private memoryStore():RealmStore {return {read:async()=>({revision:this.revision,realm:structuredClone(this.realm)}),create:async()=>{},commit:async(revision,realm)=>{if(revision!==this.revision)return false;this.realm=realm;this.revision++;return true;}};}
  async connect(claims:TicketClaims,resumeSession?:string,now=Date.now()) {
    this.check(now);
    const session=this.realm.players[claims.playerId]?.session.id;
    if(resumeSession&&session!==resumeSession)throw new GameError('Game session changed; refresh before sending pending actions',409);
    await transact(this.memoryStore(),{id:claims.playerId,name:claims.name,admin:claims.admin},{connect:!resumeSession},now);
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
  tick(now=Date.now()){try{this.check(now);if(this.realm.maintenance)throw new Error('Realm maintenance');for(const id of this.connections.keys())this.realm.players[id].lastSeen=now;advanceRealm(this.realm,now);this.revision++;}catch(error){this.fail(error);}}
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
      catch(error){this.fail(error);throw error;}
      // Clear before resolving: a caller in the next microtask must start a new
      // save, not attach to a completed flight and leave its request unsaved.
      finally{this.saving=undefined;}
    })();return this.saving;
  }
  private async saveOnce(){
    this.check();const realm=structuredClone(this.realm),state=JSON.stringify(realm);if(state.length>2000000)throw new Error('Realm capacity reached');
    const tx=await this.client.transaction('write');
    try {const now=Date.now();this.check(now);
      const result=await tx.execute({sql:'UPDATE realms SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM realtime_leases WHERE id=? AND owner=? AND expires_at>?)',args:[state,now,'glade-01',this.databaseRevision,'glade-01',this.owner,now]});
      if(result.rowsAffected!==1)throw new Error('Realm revision or ownership changed');await tx.commit();this.databaseRevision++;this.savedAt=Date.now();
      this.durable=new Map(Object.values(realm.players).map(player=>[player.id,{session:player.session.id,sequence:player.session.sequence}]));
    }catch(error){await tx.rollback();throw error;}finally{tx.close();}
  }
  async renew(now=Date.now()){try{this.check(now);const result=await this.client.execute({sql:'UPDATE realtime_leases SET expires_at=? WHERE id=? AND owner=? AND expires_at>?',args:[now+tuning.leaseMs,'glade-01',this.owner,now]});if(result.rowsAffected!==1)throw new Error('Realm ownership lost');this.expiresAt=now+tuning.leaseMs;}catch(error){this.fail(error);throw error;}}
  async close(){if(this.stopped)return;for(const id of [...this.connections.keys()])this.disconnect(id);await this.checkpoint();this.stopped=true;await this.client.execute({sql:'DELETE FROM realtime_leases WHERE id=? AND owner=?',args:['glade-01',this.owner]});}
}
