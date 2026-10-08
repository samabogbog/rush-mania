import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';

// Vercel's Node builder emits separate files. A bundled preview hides missing
// extensions, so import the emitted API files in an ordinary native Node process.
test.beforeAll(()=>{execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.vercel-node.json'],{cwd:process.cwd(),encoding:'utf8',timeout:90000});});

for(const [route,method] of [['game','POST'],['operations','GET'],['realtime-ticket','POST'],['auth/status','GET'],['auth/register','POST'],['auth/login','POST'],['auth/logout','POST'],['characters','GET'],['characters','POST'],['characters/create','POST'],['characters/select','POST']])test(`native Node24 loads unbundled /api/${route} and invokes ${method}`,()=>{
 const code=`delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;const module=await import('./.local/vercel-node/api/${route}.js');if(typeof module.${method}!=='function')throw Error('Missing HTTP handler');const response=await module.${method}(new Request('https://game.test/api/${route}',{method:'${method}'}));console.log(JSON.stringify({status:response.status,body:await response.json()}));`;
 const output=execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']});
 expect(JSON.parse(output.trim())).toEqual({status:503,body:{error:'Game temporarily unavailable. Retrying is safe.'}});
});
