import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export async function migrateTurso(client,directory=new URL('../drizzle/',import.meta.url)) {
  await client.execute('CREATE TABLE IF NOT EXISTS mossvale_migrations (name TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL)');
  for(const name of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) {
    const source=await readFile(new URL(name,directory),'utf8');
    const checksum=createHash('sha256').update(source).digest('hex');
    const transaction=await client.transaction('write');
    try {
      const previous=await transaction.execute({sql:'SELECT checksum FROM mossvale_migrations WHERE name=?',args:[name]});
      if(previous.rows.length) {
        if(previous.rows[0].checksum!==checksum)throw new Error('Applied migration changed: '+name);
      }else {
        // Current Drizzle migrations contain ordinary DDL, no trigger bodies.
        for(const sql of source.split(';').map(sql=>sql.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean))await transaction.execute(sql);
        await transaction.execute({sql:'INSERT INTO mossvale_migrations (name,checksum) VALUES (?,?)',args:[name,checksum]});
      }
      await transaction.commit();
    }catch(error){await transaction.rollback();throw error;}
    finally{transaction.close();}
  }
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
  if(!url)throw new Error('Set TURSO_DATABASE_URL before migrating');
  if(!url.startsWith('file:') && !authToken)throw new Error('Set TURSO_AUTH_TOKEN for the remote database');
  const client=createClient({url,authToken});
  try{await migrateTurso(client);console.log('Mossvale SQLite migrations applied');}finally{client.close();}
}
