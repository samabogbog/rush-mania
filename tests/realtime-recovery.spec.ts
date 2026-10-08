import {test,expect} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
test.beforeAll(()=>execFileSync(process.execPath,['tools/build-realtime.mjs'],{timeout:30000}));
test('CLI exits nonzero on ownership loss so Railway can restart; conflicting owner survives',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'realtime-recover-')),url='file:'+join(directory,'realm.sqlite');
 const child=spawn(process.execPath,['dist/realtime/start.mjs'],{env:{...process.env,NODE_ENV:'development',TURSO_DATABASE_URL:url,REALTIME_SIGNING_SECRET:'local-recovery-test-secret-more-than32chars',REALTIME_ALLOWED_ORIGINS:'https://rush-mania.vercel.app',PORT:'0'},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);const exited=new Promise<number|null>(resolve=>child.once('exit',resolve));const client=createClient({url});
 try{await expect.poll(()=>stdout,{timeout:10000}).toContain('Persistent Mossvale realm listening');await client.execute("UPDATE realtime_leases SET owner='other-realm' WHERE id='glade-01'");const code=await Promise.race([exited,new Promise<string>(resolve=>setTimeout(()=>resolve('timeout'),20000))]);expect(code).toBe(1);expect(stderr).toContain('lease_conflict');expect((await client.execute("SELECT owner FROM realtime_leases WHERE id='glade-01'")).rows[0].owner).toBe('other-realm');}
 finally{if(child.exitCode===null){child.kill('SIGKILL');await exited;}client.close();await rm(directory,{recursive:true,force:true});}
});
