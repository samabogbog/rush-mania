import {test,expect} from '@playwright/test';
import {createClient,type Client} from '@libsql/client';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeDatabase} from '../server/libsql-database';
import {handleVercelRequest} from '../server/vercel-adapter';
import {importTransfer,validateTransfer} from '../tools/import-sites-turso.mjs';

let directory:string;const clients:Client[]=[];
test.beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'mossvale-transfer-'));});
test.afterEach(async()=>{for(const c of clients.splice(0))c.close();await rm(directory,{recursive:true,force:true});});
function client(name:string){const c=createClient({url:'file:'+join(directory,name+'.sqlite')});clients.push(c);return c;}
function request(path:string,data:unknown,cookie=''){return new Request('https://game.vercel.app/api/'+path,{method:'POST',headers:{Origin:'https://game.vercel.app','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});}
async function source(){const c=client('source'),DB=await initializeDatabase(c);const register=await handleVercelRequest(request('auth/register',{username:'transferhero',password:'transfer test password'}),DB);expect(register.status).toBe(200);const cookie=register.headers.get('set-cookie')!.split(';')[0];expect((await handleVercelRequest(request('game',{connect:true},cookie),DB)).status).toBe(200);return {format:'mossvale-sites-transfer-v1',accounts:(await c.execute('SELECT * FROM game_accounts')).rows.map(r=>({...r})),realms:(await c.execute('SELECT * FROM realms')).rows.map(r=>({...r}))};}

test('full transfer preserves account credentials and exact realm; existing password reaches same hero',async()=>{
 const bundle=await source(),target=client('target'),DB=await initializeDatabase(target);
 const report=await importTransfer(target,bundle,{apply:true});expect(report).toMatchObject({mode:'applied',accounts:1,realms:1,players:1});
 expect((await target.execute('SELECT * FROM game_accounts')).rows.map(r=>({...r}))).toEqual(bundle.accounts);
 expect((await target.execute('SELECT * FROM realms')).rows.map(r=>({...r}))).toEqual(bundle.realms);
 expect(Number((await target.execute('SELECT COUNT(*) n FROM game_sessions')).rows[0].n)).toBe(0);
 const login=await handleVercelRequest(request('auth/login',{username:'transferhero',password:'transfer test password'}),DB);expect(login.status).toBe(200);
 const cookie=login.headers.get('set-cookie')!.split(';')[0],response=await handleVercelRequest(request('game',{connect:true},cookie),DB);expect(response.status).toBe(200);
 const snapshot=await response.json();expect(snapshot.player.id).toBe(bundle.accounts[0].player_id);expect(snapshot.player.actor.save.level).toBe(JSON.parse(String(bundle.realms[0].state)).players[snapshot.player.id].actor.save.level);
});
test('dry run writes nothing; repeated apply refuses overwriting existing data',async()=>{
 const bundle=await source(),target=client('target');await initializeDatabase(target);
 expect((await importTransfer(target,bundle)).mode).toBe('dry-run');expect(Number((await target.execute('SELECT COUNT(*) n FROM game_accounts')).rows[0].n)).toBe(0);
 await importTransfer(target,bundle,{apply:true});await expect(importTransfer(target,bundle,{apply:true})).rejects.toThrow('refuses to overwrite');expect((await target.execute('SELECT state FROM realms')).rows[0].state).toBe(bundle.realms[0].state);
});
test('truncated state and duplicate accounts fail; reopening only alters maintenance',async()=>{
 const bundle=await source();expect(()=>validateTransfer({...bundle,realms:[{...bundle.realms[0],state:'{"version":2'}]})).toThrow('complete valid JSON');expect(()=>validateTransfer({...bundle,accounts:[bundle.accounts[0],bundle.accounts[0]]})).toThrow('Duplicate');
 const realm=JSON.parse(String(bundle.realms[0].state));realm.maintenance=true;const paused={...bundle,realms:[{...bundle.realms[0],state:JSON.stringify(realm)}]};expect(JSON.parse(validateTransfer(paused).realms[0].state).maintenance).toBe(true);const result=validateTransfer(paused,{reopenRealm:true});realm.maintenance=false;expect(JSON.parse(result.realms[0].state)).toEqual(realm);expect(result.report.reopenedRealms).toBe(1);
});
test('failure after account insertion rolls back the entire transfer',async()=>{
 const bundle=await source(),target=client('target');await initializeDatabase(target);await target.execute("CREATE TRIGGER block_transfer BEFORE INSERT ON realms BEGIN SELECT RAISE(ABORT,'test failure'); END");
 await expect(importTransfer(target,bundle,{apply:true})).rejects.toThrow();expect(Number((await target.execute('SELECT COUNT(*) n FROM game_accounts')).rows[0].n)).toBe(0);expect(Number((await target.execute('SELECT COUNT(*) n FROM realms')).rows[0].n)).toBe(0);
});
