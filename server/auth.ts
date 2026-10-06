import type {Database} from './store';
import {GameError} from './realm';
const iterations=100000, lifetime=7*24*60*60*1000;
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(bytes instanceof Uint8Array?bytes.buffer:bytes),n=>n.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function digest(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations,hash:'SHA-256'},key,256))}
interface Account{id:string;username:string;player_id:string;legacy_site_id:string|null;password_hash:string;salt:string}
function token(request:Request){return request.headers.get('cookie')?.match(/(?:^|;\s*)mossvale-session=([a-f0-9]{64})(?:;|$)/)?.[1]}
function cookie(request:Request,value:string,maxAge:number){return `mossvale-session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
export async function authenticatedAccount(db:Database,request:Request,now=Date.now()):Promise<Account|null>{const value=token(request);if(!value)return null;return db.prepare('SELECT a.* FROM game_accounts a JOIN game_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(value),now).first<Account>()}
export async function authRoute(db:Database,request:Request,path:string,input:Record<string,unknown>,now=Date.now()){
 const headers=new Headers({'Cache-Control':'no-store'});
 if(path==='/api/auth/status') {if(request.method!=='GET')throw new GameError('Method not allowed',405);const a=await authenticatedAccount(db,request,now);return Response.json({account:a?{username:a.username}:null},{headers})}
 if(request.method!=='POST')throw new GameError('Method not allowed',405);
 // Browser credential endpoints always require an exact origin. Loopback adapter preserves a verified origin.
 if(request.headers.get('Origin')!==new URL(request.url).origin)throw new GameError('Invalid request origin',403);
 if(path==='/api/auth/logout'){const value=token(request);if(value)await db.prepare('DELETE FROM game_sessions WHERE token_hash=?').bind(await digest(value)).run();headers.set('Set-Cookie',cookie(request,'',0));return Response.json({ok:true},{headers})}
 if(!['/api/auth/login','/api/auth/register'].includes(path))throw new GameError('Not found',404);
 const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
 const password=typeof input.password==='string'?input.password:'';
 if(!/^[a-z0-9_]{3,24}$/.test(username)||password.length<10||password.length>128)throw new GameError('Use a 3–24 character username (letters, numbers, underscore) and a 10–128 character password',400);
 await db.prepare('DELETE FROM auth_attempts WHERE window<?').bind(Math.floor(now/600000)-1).run();
 const principal=request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'unknown';
 for(const scope of ['ip:'+principal,'user:'+username]){const key=await digest(scope),window=Math.floor(now/600000);await db.prepare('INSERT INTO auth_attempts (key, window, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END, window=excluded.window').bind(key,window).run();const row=await db.prepare('SELECT attempts FROM auth_attempts WHERE key=?').bind(key).first<{attempts:number}>();if(row&&row.attempts>20)throw new GameError('Too many attempts. Try again in 10 minutes',429)}
 let account=await db.prepare('SELECT * FROM game_accounts WHERE username=?').bind(username).first<Account>();
 if(path.endsWith('/register')){
  if(account)throw new GameError('Username unavailable',409);
  const id=random(),salt=random(),hash=await passwordHash(password,salt),site=request.headers.get('oai-authenticated-user-id');
  const bound=site?await db.prepare('SELECT id FROM game_accounts WHERE legacy_site_id=?').bind(site).first():null;
  const legacy=site&&!bound?site:null;
  account={id,username,player_id:legacy||'account:'+id,legacy_site_id:legacy,password_hash:hash,salt};
  try{await db.prepare('INSERT INTO game_accounts (id,username,player_id,legacy_site_id,password_hash,salt,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,username,account.player_id,legacy,hash,salt,now).run()}catch{throw new GameError('Username or existing hero was claimed. Try again',409)}
 }else{
  const hash=await passwordHash(password,account?.salt||'mossvale-missing-account');let difference=0;const expected=account?.password_hash||'0'.repeat(64);for(let i=0;i<64;i++)difference|=hash.charCodeAt(i)^expected.charCodeAt(i);
  if(!account||difference)throw new GameError('Invalid username or password',401);
 }
 const previous=token(request);if(previous)await db.prepare('DELETE FROM game_sessions WHERE token_hash=?').bind(await digest(previous)).run();
 const value=random();await db.prepare('DELETE FROM game_sessions WHERE expires_at<=?').bind(now).run();await db.prepare('INSERT INTO game_sessions (token_hash,account_id,expires_at) VALUES (?,?,?)').bind(await digest(value),account.id,now+lifetime).run();
 headers.set('Set-Cookie',cookie(request,value,lifetime/1000));return Response.json({account:{username:account.username}},{headers});
}
