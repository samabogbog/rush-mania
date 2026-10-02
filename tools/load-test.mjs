// Exercises the local SQLite-backed Worker; these are API results, not production capacity claims.
import {performance} from 'node:perf_hooks';
const count=20,base='http://127.0.0.1:8787/api/game',prefix='load-'+Date.now();
const timings=[];let errors=0;
async function call(index,body){const started=performance.now();const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Cookie:`mossvale-dev=${prefix}-${index}`},body:JSON.stringify(body)});timings.push(performance.now()-started);if(!response.ok){errors++;return null}return response.json()}
const players=await Promise.all(Array.from({length:count},(_,i)=>call(i,{connect:true})));
const commands=players.map(p=>({id:`${p.player.session.id}:1`,type:'buy',args:['Red potion']}));
await Promise.all(commands.map((command,i)=>call(i,{commands:[command]})));
await Promise.all(commands.map((command,i)=>call(i,{commands:[command]}))); // dropped-response replay
for(let round=0;round<10;round++)await Promise.all(players.map((_,i)=>call(i,{movement:[round%2?-.7:.7,0]})));
const final=await Promise.all(players.map((_,i)=>call(i,{movement:[0,0]})));
const invariant=final.every(p=>p?.player.actor.save.gold===105&&p.player.actor.save.items.find(i=>i.name==='Red potion')?.count===9);
const sorted=timings.sort((a,b)=>a-b);const report={environment:'local Node24 SQLite Worker adapter; no Cloudflare network',players:count,requests:timings.length,errors,replayInvariant:invariant,p50Ms:Math.round(sorted[Math.floor(sorted.length*.5)]),p95Ms:Math.round(sorted[Math.floor(sorted.length*.95)]),maxMs:Math.round(sorted.at(-1))};
console.log(JSON.stringify(report,null,2));if(errors||!invariant)process.exitCode=1;
