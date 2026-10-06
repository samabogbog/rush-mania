import {test,expect} from '@playwright/test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../server/worker';
import {authenticatedAccount} from '../server/auth';
function fixture(){const sqlite=new DatabaseSync(':memory:');for(const file of ['0000_lethal_lady_bullseye','0001_nappy_mariko_yashida'])sqlite.exec(readFileSync('drizzle/'+file+'.sql','utf8'));const DB:any={prepare(sql:string){return{bind(...v:any[]){return{async first(){return sqlite.prepare(sql).get(...v)||null},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...v).changes)}}}}}}}};return{DB,sqlite}}
function request(path:string,data?:unknown,cookie='',site='owner'){return new Request('https://game.test/api/'+path,{method:data?'POST':'GET',headers:{Origin:'https://game.test','Content-Type':'application/json',Cookie:cookie,'oai-authenticated-user-id':site},...(data?{body:JSON.stringify(data)}:{})})}
test('salted accounts preserve one old hero, isolate accounts and enforce session expiry/logout',async()=>{const{DB,sqlite}=fixture();const env={DB};const register=async(username:string)=>worker.fetch(request('auth/register',{username,password:'a good long password'}),env);
 const a=await register('sprout');expect(a.status).toBe(200);const cookie=a.headers.get('set-cookie')!.split(';')[0];expect(a.headers.get('set-cookie')).toContain('HttpOnly');expect(a.headers.get('set-cookie')).toContain('SameSite=Strict');expect(a.headers.get('set-cookie')).toContain('Secure');expect(await a.json()).toEqual({account:{username:'sprout'}});
 const first=await authenticatedAccount(DB,request('game',undefined,cookie));expect(first!.player_id).toBe('owner');
 const b=await register('mallow');expect(b.status).toBe(200);const second=await authenticatedAccount(DB,request('game',undefined,b.headers.get('set-cookie')!.split(';')[0]));expect(second!.player_id).not.toBe('owner');
 const rows=sqlite.prepare('SELECT * FROM game_accounts').all() as any[];expect(rows[0].salt).not.toBe(rows[1].salt);expect(rows[0].password_hash).not.toBe(rows[1].password_hash);expect(rows[0].password_hash).not.toContain('password');
 expect((await worker.fetch(request('game'),env)).status).toBe(401);expect((await worker.fetch(request('auth/login',{username:'sprout',password:'incorrect password'}),env)).status).toBe(401);
 expect((await worker.fetch(request('game',{connect:true},cookie),env)).status).toBe(200);
 expect((await worker.fetch(request('auth/logout',{},cookie),env)).status).toBe(200);expect((await worker.fetch(request('game',undefined,cookie),env)).status).toBe(401);
 const login=await worker.fetch(request('auth/login',{username:'sprout',password:'a good long password'}),env);const active=login.headers.get('set-cookie')!.split(';')[0];expect(await authenticatedAccount(DB,request('game',undefined,active),Date.now()+8*86400000)).toBeNull();sqlite.close();});
test('origin rejection, duplicate claims, rate limits and no implicit trusted identity login',async()=>{const{DB,sqlite}=fixture();const env={DB};const body={username:'sprout',password:'a good long password'};
 const foreign=request('auth/register',body);foreign.headers.set('Origin','https://evil.test');expect((await worker.fetch(foreign,env)).status).toBe(403);
 const missing=request('auth/register',body);missing.headers.delete('Origin');expect((await worker.fetch(missing,env)).status).toBe(403);
 const responses=await Promise.all([worker.fetch(request('auth/register',body),env),worker.fetch(request('auth/register',{...body,username:'mallow'}),env)]);expect(responses.every(r=>[200,409].includes(r.status))).toBe(true);expect(responses.some(r=>r.status===200)).toBe(true);expect(sqlite.prepare('SELECT COUNT(*) n FROM game_accounts WHERE legacy_site_id=?').get('owner')!.n).toBe(1);
 expect(await(await worker.fetch(request('auth/status'),env)).json()).toEqual({account:null});
 for(let i=0;i<20;i++)await worker.fetch(request('auth/login',{...body,password:'incorrect password'}),env);expect((await worker.fetch(request('auth/login',body),env)).status).toBe(429);sqlite.close();});
