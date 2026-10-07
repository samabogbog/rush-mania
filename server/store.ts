import type { Realm } from './protocol.js';
export interface Statement { bind(...values:unknown[]): Statement; first<T>(): Promise<T|null>; run(): Promise<{meta:{changes:number}}> }
export interface Database { prepare(sql:string):Statement }
export interface RealmStore { read():Promise<{revision:number; realm:Realm}|null>; create(realm:Realm):Promise<void>; commit(revision:number,realm:Realm):Promise<boolean> }
export class D1RealmStore implements RealmStore {
  constructor(private db:Database) {}
  async read() { const row=await this.db.prepare('SELECT revision, state FROM realms WHERE id = ?').bind('glade-01').first<{revision:number;state:string}>(); return row ? {revision:row.revision,realm:JSON.parse(row.state) as Realm}:null; }
  async create(realm:Realm) { await this.db.prepare('INSERT OR IGNORE INTO realms (id, revision, state, updated_at) VALUES (?, ?, ?, ?)').bind('glade-01',0,JSON.stringify(realm),Date.now()).run(); }
  async commit(revision:number,realm:Realm) { const state=JSON.stringify(realm); if(state.length>2_000_000) throw new Error('Realm capacity reached');
    const leases=await this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='realtime_leases'").bind().first();
    const guard=leases?' AND NOT EXISTS(SELECT 1 FROM realtime_leases WHERE id = ? AND expires_at > ?)':'';
    const now=Date.now(),values:unknown[]=[state,now,'glade-01',revision];if(leases)values.push('glade-01',now);
    const result=await this.db.prepare('UPDATE realms SET state = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?'+guard).bind(...values).run(); return result.meta.changes===1; }
}
