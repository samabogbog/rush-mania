import {createClient, type Client, type InValue} from '@libsql/client';
import type {Database, Statement} from './store';
import {migrateDatabase} from './libsql-migrations';

/** Keep the Sites D1 contract and SQLite compare-and-swap writes unchanged. */
export function libsqlDatabase(client:Client):Database {
  return {prepare(sql:string):Statement {
    const statement=(args:InValue[]):Statement=>({
      bind(...values:unknown[]) {return statement(values.map(value=>{
        if(value===null || typeof value==='string' || typeof value==='number' || typeof value==='bigint' || value instanceof Uint8Array || value instanceof ArrayBuffer)return value;
        throw new TypeError('Unsupported SQL parameter');
      }));},
      async first<T>() {const result=await client.execute({sql,args});return result.rows.length ? Object.fromEntries(Object.entries(result.rows[0])) as T : null;},
      async run() {const result=await client.execute({sql,args});return {meta:{changes:result.rowsAffected}};}
    });
    return statement([]);
  }};
}

export async function initializeDatabase(client:Client):Promise<Database> {
  await migrateDatabase(client);
  return libsqlDatabase(client);
}

let database:Promise<Database>|undefined;
export function getTursoDatabase():Promise<Database> {
  if(database)return database;
  const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
  if(!url || !authToken)throw new Error('Turso database is not configured');
  if(!/^(libsql|https):\/\//.test(url))throw new Error('Production database must be remote');
  const client=createClient({url,authToken});
  database=initializeDatabase(client).catch(error=>{database=undefined;client.close();throw error;});
  return database;
}
