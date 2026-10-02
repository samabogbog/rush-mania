import type { Simulation, Save, Monster } from '../src/simulation';
export type Command = { id: string; type: string; args: unknown[] };
export type Event = { id: number; text: string; type: string; x?: number; z?: number };
export type ActorState = Pick<Simulation, 'x'|'z'|'target'|'destination'|'attackTimer'|'time'|'auto'|'cooldowns'|'skillCooldowns'|'guard'|'fury'|'cast'|'actionTime'|'hurtTime'|'loot'|'route'|'routeTimer'> & {save:Save};
export type Player = { session: { id:string; sequence:number }; id: string; name: string; actor: ActorState; lastSeen: number; input: [number, number]; inputAt: number; acknowledged: string[]; events: Event[]; serial: number };
export type Realm = { version: 1; time: number; players: Record<string,Player>; monsters: Monster[]; chat: { id:string; from:string; text:string; at:number }[]; ledger: {id:string; player:string; action:string; at:number; goldDelta:number}[] };
export type Snapshot = { admin?: boolean; player: Player; monsters: Monster[]; peers: Simulation['remotePlayers']; chat: Realm['chat']; revision: number; serverTime:number };
export const actorFields = ['save','x','z','target','destination','attackTimer','time','auto','cooldowns','skillCooldowns','guard','fury','cast','actionTime','hurtTime','loot','route','routeTimer'] as const;
export function capture(sim: Simulation): ActorState { return structuredClone(Object.fromEntries(actorFields.map(k=>[k,sim[k]]))) as ActorState; }
