import worker from './worker.js';
import type {Database} from './store.js';

export function vercelRequest(request:Request,platform=false):Request {
  const headers=new Headers(request.headers);
  const remove:string[]=[];
  headers.forEach((_value,key)=>{if(key.startsWith('oai-authenticated-') || key==='cf-connecting-ip')remove.push(key);});
  for(const key of remove)headers.delete(key);
  // Vercel overwrites x-forwarded-for at its ingress; never trust it off-platform.
  // https://vercel.com/docs/headers/request-headers#x-forwarded-for
  if(platform){const ip=request.headers.get('x-forwarded-for')?.trim();if(ip && /^[a-fA-F0-9:.]+$/.test(ip))headers.set('cf-connecting-ip',ip);}
  return new Request(request,{headers});
}

export async function handleVercelRequest(request:Request,DB:Database,adminAccountId?:string,platform=false,realtime?:{url?:string;secret?:string}):Promise<Response> {
  return worker.fetch(vercelRequest(request,platform),{DB,ADMIN_ACCOUNT_ID:adminAccountId,REALTIME_SERVER_URL:realtime?.url,REALTIME_SIGNING_SECRET:realtime?.secret});
}
