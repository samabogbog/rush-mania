import tuning from '../src/config/realtime.json' with {type:'json'};
import {GameError} from './realm.js';
export interface TicketClaims {version:1;realm:'glade-01';accountId:string;playerId:string;name:string;job?:import('../src/game/classes.js').ClassId;admin:boolean;origin:string;sessionHash:string;issuedAt:number;expiresAt:number;jti:string}
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function key(secret:string){if(secret.length<32)throw new GameError('Realtime signing secret must have at least 32 characters',503);return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signTicket(claims:TicketClaims,secret:string):Promise<string>{const body=encode(new TextEncoder().encode(JSON.stringify(claims)));const signature=await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(body));return body+'.'+encode(new Uint8Array(signature));}
export async function verifyTicket(ticket:string,secret:string,now=Date.now()):Promise<TicketClaims>{
  try {
    if(ticket.length>4096)throw new Error();const parts=ticket.split('.');if(parts.length!==2)throw new Error();
    if(!await crypto.subtle.verify('HMAC',await key(secret),decode(parts[1]),new TextEncoder().encode(parts[0])))throw new Error();
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[0]))) as TicketClaims;
    if(claims.version!==1||claims.realm!=='glade-01'||typeof claims.accountId!=='string'||!/^[a-f0-9]{64}$/.test(claims.accountId)||typeof claims.playerId!=='string'||!claims.playerId||claims.playerId.length>128||typeof claims.name!=='string'||claims.name.length>24||(claims.job!==undefined&&!['swordsman','mage','archer'].includes(claims.job))||typeof claims.admin!=='boolean'||typeof claims.origin!=='string'||typeof claims.sessionHash!=='string'||!/^[a-f0-9]{64}$/.test(claims.sessionHash)||!Number.isSafeInteger(claims.issuedAt)||!Number.isSafeInteger(claims.expiresAt)||claims.issuedAt>now+10000||claims.expiresAt<=now||claims.expiresAt-claims.issuedAt>tuning.ticketTtlMs||claims.expiresAt<=claims.issuedAt||typeof claims.jti!=='string')throw new Error();
    return claims;
  }catch{throw new GameError('Invalid or expired realtime ticket',401);}
}
export async function sessionHash(request:Request){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)mossvale-session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)throw new GameError('Game account required',401);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),value=>value.toString(16).padStart(2,'0')).join('');}
export function socketUrl(value:string){const url=new URL(value);if(url.protocol!=='wss:'&&!(url.protocol==='ws:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new GameError('Realtime URL must use secure WebSocket',503);if(url.username||url.password||url.search||url.hash)throw new GameError('Invalid realtime URL',503);return url.toString();}
