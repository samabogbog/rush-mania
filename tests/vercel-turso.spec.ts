import {test,expect} from '@playwright/test';
import {createClient,type Client} from '@libsql/client';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {initializeDatabase} from '../server/libsql-database';
import {migrateDatabase} from '../server/libsql-migrations';
import {handleVercelRequest,vercelRequest} from '../server/vercel-adapter';
import {D1RealmStore} from '../server/store';
import {freshRealm} from '../server/realm';
import migrations from '../server/migrations.json' with {type:'json'};

const clients:Client[]=[];let directory='';
test.beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'mossvale-vercel-'));});
test.afterEach(async()=>{for(const client of clients.splice(0))client.close();await rm(directory,{recursive:true,force:true});});
function client(){const c=createClient({url:'file:'+join(directory,'game.sqlite')});clients.push(c);return c;}
function request(path:string,data?:unknown,cookie='',extra:Record<string,string>={}){return new Request('https://mossvale.vercel.app/api/'+path,{method:data!==undefined?'POST':'GET',headers:{Origin:'https://mossvale.vercel.app','Content-Type':'application/json',Cookie:cookie,...extra},...(data!==undefined?{body:JSON.stringify(data)}:{})});}

test('embedded migration checksums and statements exactly match checked-in SQLite SQL',async()=>{
 for(const migration of migrations){const sql=await readFile('drizzle/'+migration.name,'utf8');expect(migration.checksum).toBe(createHash('sha256').update(sql).digest('hex'));expect(migration.statements).toEqual(sql.split(';').map(s=>s.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean));}
});
test('automatic migrations and CLI migrations are idempotent and retain accounts and realm after reopen',async()=>{
 const c=client(),DB=await initializeDatabase(c),realm=freshRealm(1000);await new D1RealmStore(DB).create(realm);await migrateDatabase(c);
 const {migrateTurso}=await import('../tools/migrate-turso.mjs');await migrateTurso(c);
 const row=await new D1RealmStore(DB).read();expect(row?.revision).toBe(0);expect(row?.realm.players).toEqual({});expect((await c.execute('SELECT COUNT(*) n FROM mossvale_migrations')).rows[0].n).toBe(migrations.length);
 c.close();clients.splice(clients.indexOf(c),1);const reopened=await initializeDatabase(client());expect(await new D1RealmStore(reopened).read()).toEqual(row);
});
test('realm concurrent revision writes have one winner and stale writes cannot overwrite it',async()=>{
 const DB=await initializeDatabase(client()),store=new D1RealmStore(DB);const realm=freshRealm(1000);await store.create(realm);const left={...realm,time:2000},right={...realm,time:3000};
 expect((await Promise.all([store.commit(0,left),store.commit(0,right)])).sort()).toEqual([false,true]);expect((await store.read())?.revision).toBe(1);expect(await store.commit(0,realm)).toBe(false);
});
test('changed migration checksums fail without resetting data',async()=>{
 const c=client();await initializeDatabase(c);await c.execute("UPDATE mossvale_migrations SET checksum='changed' WHERE name='0001_nappy_mariko_yashida.sql'");await expect(migrateDatabase(c)).rejects.toThrow('Applied migration changed');expect((await c.execute("SELECT COUNT(*) n FROM sqlite_master WHERE name='game_accounts'")).rows[0].n).toBe(1);
});
test('adapter strips claimed owner identity and caller-supplied Cloudflare IP; platform forwarding is explicit',()=>{
 const r=request('auth/status',undefined,'',{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@test','oai-authenticated-extra':'admin','cf-connecting-ip':'9.9.9.9','x-forwarded-for':'1.2.3.4'});
 const local=vercelRequest(r);expect([...local.headers.keys()].some(k=>k.startsWith('oai-authenticated-'))).toBe(false);expect(local.headers.has('cf-connecting-ip')).toBe(false);
 expect(vercelRequest(r,true).headers.get('cf-connecting-ip')).toBe('1.2.3.4');r.headers.set('x-forwarded-for','1.2.3.4, 9.9.9.9');expect(vercelRequest(r,true).headers.has('cf-connecting-ip')).toBe(false);
});
test('real registration, online save and logout use session cookies with separate heroes despite forged owner headers',async()=>{
 const c=client(),DB=await initializeDatabase(c),headers={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@test'},password='a good long password';
 const first=await handleVercelRequest(request('auth/register',{username:'sprout',password},'',headers),DB);expect(first.status).toBe(200);const cookie=first.headers.get('set-cookie')!.split(';')[0];expect(first.headers.get('set-cookie')).toMatch(/HttpOnly; SameSite=Strict.*Secure/);
 const second=await handleVercelRequest(request('auth/register',{username:'mallow',password},'',headers),DB);expect(second.status).toBe(200);const rows=(await c.execute('SELECT id,player_id,legacy_site_id FROM game_accounts')).rows;expect(rows).toHaveLength(2);expect(rows.every(r=>r.legacy_site_id===null)).toBe(true);expect(new Set(rows.map(r=>r.player_id)).size).toBe(2);
 const created=await(await handleVercelRequest(request('characters',{name:'Sprout hero',job:'mage'},cookie),DB)).json();await handleVercelRequest(request('characters/select',{id:created.character.id},cookie),DB);
 const online=await handleVercelRequest(request('game',{connect:true},cookie,headers),DB);expect(online.status).toBe(200);const snapshot=await online.json();expect(snapshot.admin).toBe(false);expect(snapshot.player.id).toMatch(/^character:/);expect((await c.execute('SELECT COUNT(*) n FROM realms')).rows[0].n).toBe(1);
 expect((await handleVercelRequest(request('game'),DB)).status).toBe(401);expect((await handleVercelRequest(request('auth/logout',{},cookie),DB)).status).toBe(200);expect((await handleVercelRequest(request('game',undefined,cookie),DB)).status).toBe(401);
});
test('only the configured account authenticated by its own session receives admin and operations access',async()=>{
 const c=client(),DB=await initializeDatabase(c),password='a good long password';const a=await handleVercelRequest(request('auth/register',{username:'adminuser',password}),DB),b=await handleVercelRequest(request('auth/register',{username:'ordinary',password}),DB);const cookieA=a.headers.get('set-cookie')!.split(';')[0],cookieB=b.headers.get('set-cookie')!.split(';')[0];
 const id=(await c.execute("SELECT id FROM game_accounts WHERE username='adminuser'")).rows[0].id as string;
 expect((await handleVercelRequest(request('operations'),DB,id)).status).toBe(403);expect((await handleVercelRequest(request('operations',undefined,cookieB,{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'admin@test'}),DB,id)).status).toBe(403);
 const created=await(await handleVercelRequest(request('characters',{name:'Admin hero',job:'swordsman'},cookieA),DB)).json();await handleVercelRequest(request('characters/select',{id:created.character.id},cookieA),DB);
 const online=await handleVercelRequest(request('game',{connect:true},cookieA),DB,id);expect((await online.json()).admin).toBe(true);expect((await handleVercelRequest(request('operations',undefined,cookieA),DB,id)).status).toBe(200);
});
test('origin checks, malformed bodies and unknown API routes are preserved through Vercel',async()=>{
 const DB=await initializeDatabase(client());expect((await handleVercelRequest(request('auth/register',{username:'sprout',password:'a good long password'},'',{Origin:'https://evil.test'}),DB)).status).toBe(403);
 const noOrigin=request('auth/login',{});noOrigin.headers.delete('Origin');expect((await handleVercelRequest(noOrigin,DB)).status).toBe(403);
 const malformed=new Request('https://mossvale.vercel.app/api/auth/login',{method:'POST',headers:{Origin:'https://mossvale.vercel.app'},body:'{' });expect((await handleVercelRequest(malformed,DB)).status).toBe(400);
 expect((await handleVercelRequest(request('auth/login',{password:'x'.repeat(9000)}),DB)).status).toBe(413);expect((await handleVercelRequest(request('unknown'),DB)).status).toBe(404);
});
