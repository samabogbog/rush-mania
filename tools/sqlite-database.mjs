import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
/** Same prepared-statement interface as Sites D1, backed by a durable SQLite file. */
export async function openGameDatabase(path='.local/game.sqlite',migrations='drizzle') {
 await mkdir(dirname(path),{recursive:true});
 const sqlite=new DatabaseSync(path);
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of (await readdir(migrations)).filter(n=>n.endsWith('.sql')).sort()) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)) {sqlite.exec(await readFile(migrations+'/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);}sqlite.exec('COMMIT');}
  catch(error){sqlite.exec('ROLLBACK');sqlite.close();throw error;}
 }
 const DB={prepare(sql){const statement=sqlite.prepare(sql);return {bind(...values){return {async first(){return statement.get(...values)??null;},async run(){return {meta:{changes:Number(statement.run(...values).changes)}};}};}};}};
 return {DB,close:()=>sqlite.close()};
}
