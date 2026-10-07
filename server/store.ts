import type { Realm } from './protocol.js';
export interface Statement { bind(...values:unknown[]): Statement; first<T>(): Promise<T|null>; run(): Promise<{meta:{changes:number}}> }
export interface Database { prepare(sql:string):Statement }
export interface RealmStore { read():Promise<{revision:number; realm:Realm}|null>; create(realm:Realm):Promise<void>; commit(revision:number,realm:Realm):Promise<boolean> }
export class D1RealmStore implements RealmStore {
  constructor(private db:Database) {}
  async read() { const row=await this.db.prepare('SELECT revision, state FROM realms WHERE id = ?').bind('glade-01').first<{revision:number;state:string}>(); return row ? {revision:row.revision,realm:JSON.parse(row.state) as Realm}:null; }
  async create(realm:Realm) { await this.db.prepare('INSERT OR IGNORE INTO realms (id, revision, state, updated_at) VALUES (?, ?, ?, ?)').bind('glade-01',0,JSON.stringify(realm),Date.now()).run(); }
  async commit(revision:number,realm:Realm) { const state=JSON.stringify(realm); if(state.length>2_000_000) throw new Error('Realm capacity reached'); const result=await this.db.prepare('UPDATE realms SET state = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(state,Date.now(),'glade-01',revision).run(); return result.meta.changes===1; }
}
