import {createClient} from '@libsql/client';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const accountFields=['id','username','player_id','legacy_site_id','password_hash','salt','created_at'];
const realmFields=['id','revision','state','updated_at'];
const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
const integer=value=>Number.isSafeInteger(value) && value>=0;
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha256=value=>createHash('sha256').update(value).digest('hex');
function exact(row,fields,label){if(!object(row)||Object.keys(row).length!==fields.length||fields.some(key=>!Object.hasOwn(row,key)))throw new Error('Invalid '+label+' fields');}
function unique(rows,key,label){const values=rows.map(row=>row[key]).filter(value=>value!==null);if(new Set(values).size!==values.length)throw new Error('Duplicate '+label);}

export function validateTransfer(bundle,{reopenRealm=false}={}) {
  if(!object(bundle)||bundle.format!=='mossvale-sites-transfer-v1'||!Array.isArray(bundle.accounts)||!Array.isArray(bundle.realms)||bundle.realms.length===0)throw new Error('Invalid or empty transfer bundle');
  const accounts=bundle.accounts.map(row=>{
    exact(row,accountFields,'account');
    if(!hash(row.id)||typeof row.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(row.username)||typeof row.player_id!=='string'||!row.player_id||!(row.legacy_site_id===null||typeof row.legacy_site_id==='string'&&row.legacy_site_id.length>0)||!integer(row.created_at)||!hash(row.password_hash)||!hash(row.salt))throw new Error('Invalid account data');
    if(row.legacy_site_id!==null&&row.player_id!==row.legacy_site_id)throw new Error('Account legacy player mismatch');
    return {...row};
  });
  for(const key of ['id','username','player_id','legacy_site_id'])unique(accounts,key,'account '+key);
  let players=0,unboundPlayers=0,maintenanceRealms=0;
  const bound=new Set(accounts.map(row=>row.player_id));
  const playerIds=new Set();
  const realms=bundle.realms.map(row=>{
    exact(row,realmFields,'realm');
    if(typeof row.id!=='string'||!row.id||!integer(row.revision)||!integer(row.updated_at)||typeof row.state!=='string')throw new Error('Invalid realm data');
    let state;try{state=JSON.parse(row.state);}catch{throw new Error('Realm state is not complete valid JSON');}
    if(!object(state)||![1,2].includes(state.version)||!Number.isFinite(state.time)||!object(state.players)||!Array.isArray(state.chat)||!Array.isArray(state.ledger)||(Object.hasOwn(state,'maintenance')&&typeof state.maintenance!=='boolean'))throw new Error('Invalid realm state structure');
    for(const [id,player] of Object.entries(state.players)) {
      if(!object(player)||player.id!==id||typeof player.name!=='string'||!object(player.actor)||!object(player.actor.save)||!object(player.session)||typeof player.session.id!=='string'||!integer(player.session.sequence)||!Number.isFinite(player.lastSeen)||!Array.isArray(player.acknowledged)||!Array.isArray(player.events))throw new Error('Invalid player state structure');
      if(playerIds.has(id))throw new Error('Duplicate player across realms');
      playerIds.add(id);players++;if(!bound.has(id))unboundPlayers++;
    }
    if(state.maintenance)maintenanceRealms++;
    if(reopenRealm&&state.maintenance){state.maintenance=false;return {...row,state:JSON.stringify(state)};}
    return {...row};
  });
  unique(realms,'id','realm id');
  if(realms.length!==1||realms[0].id!=='glade-01')throw new Error('Expected exactly the glade-01 game realm');
  const canonical=JSON.stringify({format:bundle.format,accounts,realms});
  return {accounts,realms,report:{accounts:accounts.length,realms:realms.length,players,unboundPlayers,maintenanceRealms,reopenedRealms:reopenRealm?maintenanceRealms:0,sourceSha256:sha256(JSON.stringify(bundle)),sha256:sha256(canonical)}};
}

export async function readTransfer(source,{sqlite=false}={}) {
  if(!sqlite)return JSON.parse(await readFile(source,'utf8'));
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(source,{readOnly:true});
  try{return {format:'mossvale-sites-transfer-v1',accounts:db.prepare('SELECT '+accountFields.join(',')+' FROM game_accounts ORDER BY id').all(),realms:db.prepare('SELECT '+realmFields.join(',')+' FROM realms ORDER BY id').all()};}finally{db.close();}
}

export async function importTransfer(client,bundle,{apply=false,reopenRealm=false}={}) {
  const transfer=validateTransfer(bundle,{reopenRealm});
  const transaction=await client.transaction(apply?'write':'read');
  try {
    for(const [table,fields] of [['game_accounts',accountFields],['realms',realmFields]]) {
      const columns=await transaction.execute('PRAGMA table_info('+table+')');
      if(columns.rows.length!==fields.length||fields.some(field=>!columns.rows.some(row=>row.name===field)))throw new Error('Target schema missing or incompatible; run migrations first');
      const count=await transaction.execute('SELECT COUNT(*) AS count FROM '+table);
      if(Number(count.rows[0].count)!==0)throw new Error('Target must have no accounts or realm rows; import refuses to overwrite');
    }
    if(apply) {
      for(const row of transfer.accounts)await transaction.execute({sql:'INSERT INTO game_accounts ('+accountFields.join(',')+') VALUES (?,?,?,?,?,?,?)',args:accountFields.map(key=>row[key])});
      for(const row of transfer.realms)await transaction.execute({sql:'INSERT INTO realms ('+realmFields.join(',')+') VALUES (?,?,?,?)',args:realmFields.map(key=>row[key])});
    }
    await transaction.commit();
    return {mode:apply?'applied':'dry-run',...transfer.report};
  }catch(error){await transaction.rollback();throw error;}
  finally{transaction.close();}
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),options=new Set(args.filter(arg=>arg.startsWith('--'))),paths=args.filter(arg=>!arg.startsWith('--'));
  if(paths.length!==1||[...options].some(option=>!['--apply','--sqlite','--reopen-realm'].includes(option)))throw new Error('Usage: node tools/import-sites-turso.mjs SOURCE [--sqlite] [--apply] [--reopen-realm]');
  const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
  if(!url||(!url.startsWith('file:')&&!/^(libsql|https):\/\//.test(url)))throw new Error('Set a valid TURSO_DATABASE_URL');
  if(!url.startsWith('file:')&&!authToken)throw new Error('Set TURSO_AUTH_TOKEN for remote target');
  const client=createClient({url,authToken});
  try{console.log(JSON.stringify(await importTransfer(client,await readTransfer(paths[0],{sqlite:options.has('--sqlite')}),{apply:options.has('--apply'),reopenRealm:options.has('--reopen-realm')})));}
  catch{console.error('Transfer failed. No partial import was committed. Check the source, empty target and migrated schema.');process.exitCode=1;}
  finally{client.close();}
}
