import type {Command,Snapshot} from './protocol.js';
export type RealtimeTicketResponse={available:true;url:string;ticket:string;expiresAt:number};
export type RealtimeUnavailable={available:false};
export type RealtimeClientMessage=
  | {type:'hello';ticket:string;resumeSession?:string}
  | {type:'input';sequence:number;movement:[number,number];commands?:Command[]};
export type RealtimeServerMessage=
  | {type:'snapshot';snapshot:Snapshot;acknowledgedInput:number;durableCommandSequence:number;savedAt:number;tickHz:number;snapshotHz:number}
  | {type:'error';error:string;retryable:boolean};
// hello returns snapshot.player.session.id + persisted command sequence. Reconnect
// passes resumeSession to retain that session, then replays unacked command IDs.
// acknowledgedInput refers to accepted movement sequence only, not a save.
// durableCommandSequence is checkpointed before emitting any command ack.
