import {D1RealmStore,type Database} from './store.js';
import {GameError} from './realm.js';
import {Simulation} from '../src/simulation.js';
import {species} from '../src/game/content.js';
import type {Realm} from './protocol.js';
export async function operations(db:Database,input:Record<string,unknown>,post:boolean) {
 const store=new D1RealmStore(db),row=await store.read();if(!row)throw new GameError('Realm not initialized',404);
 const backup=async()=>{const id=crypto.randomUUID();await db.prepare('INSERT INTO backups (id, revision, state, created_at) VALUES (?, ?, ?, ?)').bind(id,row.revision,JSON.stringify(row.realm),Date.now()).run();await db.prepare('DELETE FROM backups WHERE id IN (SELECT id FROM backups ORDER BY created_at DESC LIMIT -1 OFFSET 20)').bind().run();return id;};
 if(!post){const sim=new Simulation(Math.random,undefined,null);sim.balance=row.realm.balance||{};const list=await db.prepare('SELECT json_group_array(json_object(\'id\',id,\'revision\',revision,\'at\',created_at)) AS entries FROM (SELECT id,revision,created_at FROM backups ORDER BY created_at DESC LIMIT 20)').bind().first<{entries:string}>();const players=Object.values(row.realm.players);return {revision:row.revision,maintenance:!!row.realm.maintenance,players:players.map(p=>({id:p.id,name:p.name,level:p.actor.save.level,job:p.actor.save.job,gold:p.actor.save.gold,kills:p.actor.save.kills,lastSeen:p.lastSeen,zone:p.actor.save.zone,tutorial:p.actor.save.tutorial,quests:p.actor.save.quests})),ledger:row.realm.ledger.slice(-100),reports:row.realm.reports||[],metrics:row.realm.metrics||{},balance:row.realm.balance||{},catalog:Object.fromEntries(Object.keys(species).map(kind=>[kind,sim.monsterSpec(kind as keyof typeof species)])),backups:JSON.parse(list?.entries||'[]'),backup:row.realm};}
 if(!input.action||input.action==='backup')return {backupId:await backup(),revision:row.revision};
 if(input.action==='maintenance'){if(typeof input.enabled!=='boolean')throw new GameError('Invalid maintenance setting');row.realm.maintenance=input.enabled;row.realm.time=Date.now();if(!await store.commit(row.revision,row.realm))throw new GameError('Realm changed. Retry.',409);return {maintenance:input.enabled};}
 if(!row.realm.maintenance)throw new GameError('Pause the realm with maintenance before restoring or changing balance',409);
 if(input.action==='restore') {
  if(typeof input.backupId!=='string')throw new GameError('Select a server backup');
  const saved=await db.prepare('SELECT state FROM backups WHERE id = ?').bind(input.backupId).first<{state:string}>();if(!saved)throw new GameError('Backup unavailable',404);
  const realm=JSON.parse(saved.state) as Realm;if(![1,2].includes(realm.version)||!realm.players)throw new GameError('Invalid server backup');const recovery=await backup();
  realm.maintenance=true;realm.time=Date.now();for(const p of Object.values(realm.players)){p.session={id:crypto.randomUUID(),sequence:0};p.lastSeen=0;p.input=[0,0];p.actor.target=null;p.actor.auto=false;}
  if(!await store.commit(row.revision,realm))throw new GameError('Realm changed. Retry.',409);return {restored:true,recoveryBackup:recovery};
 }
 if(input.action==='balance') {
  if(typeof input.kind!=='string'||!(input.kind in species)||!input.values||typeof input.values!=='object')throw new GameError('Invalid monster tuning');
  const values=input.values as Record<string,unknown>,allowed={hp:1000000,atk:10000,defense:10000,xp:100000,gold:100000};const changes:Record<string,number>={};
  for(const [key,value] of Object.entries(values)){if(!(key in allowed)||typeof value!=='number'||!Number.isSafeInteger(value)||value< (key==='gold'||key==='defense'?0:1)||value>allowed[key as keyof typeof allowed])throw new GameError('Invalid tuning value');changes[key]=value;}
  row.realm.balance??={};row.realm.balance[input.kind]={...row.realm.balance[input.kind],...changes};
  for(const room of Object.values(row.realm.rooms||{}))for(const monster of room.monsters)if(monster.kind===input.kind&&changes.hp)monster.hp=Math.min(monster.hp,changes.hp);
  row.realm.ledger.push({id:crypto.randomUUID(),player:'operator',action:'balance:'+input.kind,at:Date.now(),goldDelta:0});
  if(!await store.commit(row.revision,row.realm))throw new GameError('Realm changed. Retry.',409);return {updated:input.kind};
 }
 throw new GameError('Unknown operator action');
}
