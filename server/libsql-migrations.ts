import type {Client} from '@libsql/client';
import migrations from './migrations.json' with {type:'json'};

/** Write transactions serialize concurrent cold starts against the primary DB. */
export async function migrateDatabase(client:Client):Promise<void> {
  const transaction=await client.transaction('write');
  try {
    await transaction.execute('CREATE TABLE IF NOT EXISTS mossvale_migrations (name TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL)');
    for(const migration of migrations) {
      const previous=await transaction.execute({sql:'SELECT checksum FROM mossvale_migrations WHERE name=?',args:[migration.name]});
      if(previous.rows.length) {
        if(previous.rows[0].checksum!==migration.checksum)throw new Error('Applied migration changed: '+migration.name);
      }else {
        for(const sql of migration.statements)await transaction.execute(sql);
        await transaction.execute({sql:'INSERT INTO mossvale_migrations (name,checksum) VALUES (?,?)',args:[migration.name,migration.checksum]});
      }
    }
    await transaction.commit();
  }catch(error){await transaction.rollback();throw error;}
  finally{transaction.close();}
}
