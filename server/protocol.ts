import type {Community} from './community.js';
import type {ZoneId} from '../src/game/content.js';
import type { Simulation, Save, Monster } from '../src/simulation.js';
export type Command = { id: string; type: string; args: unknown[] };
export type Event = { id: number; text: string; type: string; x?: number; z?: number };
export type ActorState = Pick<Simulation, 'x'|'z'|'target'|'destination'|'attackTimer'|'time'|'auto'|'cooldowns'|'auxiliaryCooldown'|'skillCooldowns'|'skillCooldownTotals'|'autoSkillCursor'|'guard'|'fury'|'cast'|'actionTime'|'hurtTime'|'deathTime'|'loot'|'route'|'routeTimer'> & {save:Save};
export type Player = { expTestGrant?: {version:1|2;count:number;at:number}; room?: string; session: { id:string; sequence:number }; id: string; name: string; actor: ActorState; lastSeen: number; input: [number, number]; inputAt: number; acknowledged: string[]; events: Event[]; serial: number };
export type Realm = { itemRevision?:number; community?:Community; maintenance?:boolean; balance?:Simulation["balance"]; reports?:{id:string;player:string;text:string;zone:ZoneId;at:number}[]; metrics?:Record<string,number>; version: 1 | 2; time: number; players: Record<string,Player>; monsters?: Monster[]; rooms?: Record<string,{zone:ZoneId;monsters:Monster[];layoutRevision?:number;balanceRevision?:number}>; chat: { id:string; from:string; text:string; at:number }[]; ledger: {id:string; player:string; action:string; at:number; goldDelta:number}[] };
export type Snapshot = { balance?:Simulation["balance"]; community?:ReturnType<typeof import('./community.js').communitySnapshot>; admin?: boolean; player: Player; monsters: Monster[]; peers: Simulation['remotePlayers']; chat: Realm['chat']; revision: number; serverTime:number };
export const actorFields = ['save','x','z','target','destination','attackTimer','time','auto','cooldowns','auxiliaryCooldown','skillCooldowns','skillCooldownTotals','autoSkillCursor','guard','fury','cast','actionTime','hurtTime','deathTime','loot','route','routeTimer'] as const;
export function capture(sim: Simulation): ActorState { return structuredClone(Object.fromEntries(actorFields.map(k=>[k,sim[k]]))) as ActorState; }
