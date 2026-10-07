import {getTursoDatabase} from './libsql-database.js';
import {handleVercelRequest} from './vercel-adapter.js';

export async function handle(request:Request):Promise<Response> {
  try {
    return await handleVercelRequest(request,await getTursoDatabase(),process.env.ADMIN_ACCOUNT_ID,process.env.VERCEL==='1');
  }catch {
    console.error('Vercel game database unavailable');
    return Response.json({error:'Game temporarily unavailable. Retrying is safe.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
