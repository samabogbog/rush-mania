import type {Database} from './store.js';
import type {Account} from './auth.js';
import {sessionHash} from './realtime-ticket.js';
import {GameError} from './realm.js';
import {isClass,type ClassId} from '../src/game/classes.js';
import type {Realm} from './protocol.js';
export interface Character {id:string;name:string;job:ClassId;slot:number;level:number}
async function savedPlayers(db:Database){const row=await db.prepare('SELECT state FROM realms WHERE id=?').bind('glade-01').first<{state:string}>();return row?(JSON.parse(row.state) as Realm).players:{};}
/** Register the original hero by its unchanged player ID; never rewrite realm state. */
async function preserveOriginal(db:Database,account:Account){
 const hero=(await savedPlayers(db))[account.player_id];if(!hero)return;
 await db.prepare('INSERT OR IGNORE INTO game_characters(id,account_id,slot,name,job,created_at) VALUES(?,?,1,?,?,?)').bind(account.player_id,account.id,hero.name,hero.actor.save.job,Date.now()).run();
}
export async function selectedCharacter(db:Database,request:Request,account:Account):Promise<Character>{
 const row=await db.prepare('SELECT c.id,c.name,c.job,c.slot FROM game_characters c JOIN game_sessions s ON s.selected_character_id=c.id AND s.account_id=c.account_id WHERE s.token_hash=? AND s.account_id=? AND s.expires_at>?').bind(await sessionHash(request),account.id,Date.now()).first<Character>();
 if(!row)throw new GameError('Select a character before entering the world',409);return {...row,level:1};
}
async function roster(db:Database,request:Request,account:Account){
 const row=await db.prepare("SELECT json_group_array(json_object('id',id,'name',name,'job',job,'slot',slot)) AS characters FROM (SELECT id,name,job,slot FROM game_characters WHERE account_id=? ORDER BY slot)").bind(account.id).first<{characters:string}>();
 const players=await savedPlayers(db),characters=(JSON.parse(row?.characters||'[]') as Character[]).map(c=>({...c,job:players[c.id]?.actor.save.job||c.job,level:players[c.id]?.actor.save.level||1}));
 const session=await db.prepare('SELECT selected_character_id FROM game_sessions WHERE token_hash=? AND account_id=? AND expires_at>?').bind(await sessionHash(request),account.id,Date.now()).first<{selected_character_id:string|null}>();
 return {characters,selectedId:session?.selected_character_id||null};
}
export async function charactersRoute(db:Database,request:Request,account:Account|null,path:string,input:Record<string,unknown>){
 if(!account)throw new GameError('Game account required',401);
 if(request.method==='POST'&&request.headers.get('Origin')!==new URL(request.url).origin)throw new GameError('Invalid request origin',403);
 await preserveOriginal(db,account);
 if(path==='/api/characters'&&request.method==='GET')return Response.json(await roster(db,request,account),{headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')throw new GameError('Method not allowed',405);
 if(path==='/api/characters'||path==='/api/characters/create'){
  const name=typeof input.name==='string'?input.name.trim():'';
  if(name.length<2||name.length>24||/[\u0000-\u001f\u007f<>]/.test(name))throw new GameError('Character name must be 2–24 characters',400);
  if(!isClass(input.job))throw new GameError('Choose swordsman, mage, or archer',400);
  const id='character:'+crypto.randomUUID();
  // One SQLite statement chooses and reserves the free slot atomically. CHECK and UNIQUE enforce the cap even under concurrent requests.
  const result=await db.prepare('INSERT INTO game_characters(id,account_id,slot,name,job,created_at) SELECT ?,?,slots.slot,?,?,? FROM (SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3) slots WHERE NOT EXISTS(SELECT 1 FROM game_characters WHERE account_id=? AND slot=slots.slot) ORDER BY slots.slot LIMIT 1').bind(id,account.id,name,input.job,Date.now(),account.id).run();
  if(!result.meta.changes)throw new GameError('This account already has three characters',409);
  const resultRoster=await roster(db,request,account);return Response.json({...resultRoster,character:resultRoster.characters.find(c=>c.id===id)},{status:201,headers:{'Cache-Control':'no-store'}});
 }
 if(path==='/api/characters/select'){
  if(typeof input.id!=='string')throw new GameError('Invalid character',400);
  const result=await db.prepare('UPDATE game_sessions SET selected_character_id=? WHERE token_hash=? AND account_id=? AND expires_at>? AND EXISTS(SELECT 1 FROM game_characters WHERE id=? AND account_id=?)').bind(input.id,await sessionHash(request),account.id,Date.now(),input.id,account.id).run();
  if(!result.meta.changes)throw new GameError('Character does not belong to this account',403);
  return Response.json(await roster(db,request,account),{headers:{'Cache-Control':'no-store'}});
 }
 throw new GameError('Not found',404);
}
