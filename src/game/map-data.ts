import monsterGroupConfig from '../config/monster-groups.json' with {type:'json'};
export {monsterGroupConfig};
import {economy} from '../config/balance.js';
/** Collision data shared by the server and Babylon, never supplied by a client. */
export function gladeObstacles() {
  const out: { x: number; z: number; r: number }[] = [];
  for (const [x, z, w, d] of [[-6,-4,5,1],[4,-7,4,1],[-11,0,1,4],[7,8,4,1],[12,-2,1,3],[-6,9,3,1]])
    for(let i=0;i<w;i++) for(let j=0;j<d;j++) out.push({x:x+i*1.12,z:z+j*1.12,r:0.72});
  return out;
}
import {species,zones,type ZoneId,type Kind} from './content.js';
export function zoneObstacles(zone:ZoneId) {
 if(zone==='glade')return [...gladeObstacles(),...outerObstacles(zone)];
 const out:{x:number;z:number;r:number}[]=[];
 if(zone==='town') return [{x:-8,z:-7,r:2},{x:8,z:-7,r:2},{x:-8,z:7,r:2},{x:8,z:7,r:2},...outerObstacles(zone)];
 const rows=zone==='ruins'?[[-10,-4,6,1],[5,-4,6,1],[-10,5,6,1],[5,5,6,1]]:zone==='orchard'?[[-9,-4,1,5],[8,-4,1,5],[-7,7,4,1]]:zone==='marsh'?[[-8,-3,3,3],[6,5,3,3],[-11,9,2,2]]:[[-9,-4,5,1],[6,-5,1,5],[-4,8,5,1]];
 for(const [x,z,w,d] of rows)for(let i=0;i<w;i++)for(let j=0;j<d;j++)out.push({x:x+i*1.12,z:z+j*1.12,r:zone==='orchard'?.55:.72});
 return [...out,...outerObstacles(zone)];
}
export const GROVE_OFFSETS=[[-11,-10],[-7,-12],[10,-9],[12,7],[-10,11],[7,12]] as const;
function outerObstacles(zone:ZoneId){const out:{x:number;z:number;r:number}[]=[];for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++){if(!row&&!col)continue;for(let n=0;n<3;n++)out.push({x:col*32+12+n*1.3,z:row*32-12,r:.65});}for(const sx of [-32,0,32])for(const sz of [-32,0,32]){if(!sx&&!sz)continue;for(const [dx,dz] of GROVE_OFFSETS)out.push({x:sx+dx,z:sz+dz,r:zone==='ruins'?.7:zone==='frost'?1.15:.32});}return out;}

/** Three 32-unit sectors per axis; physical terrain is exactly 96 × 96. */
export const SECTOR_SIZE=32;
export const WORLD_SIZE=SECTOR_SIZE*3;
export const WORLD_BOUNDS={minX:-46,maxX:46,minZ:-46,maxZ:46} as const;
export const PORTAL_POSITION={x:0,z:-11} as const;
export const TOWN_SAFE_RADIUS=economy.map.townSafeRadius;
export function protectedPosition(zone:ZoneId,x:number,z:number) {
 return (zone==='town'&&Math.hypot(x,z)<TOWN_SAFE_RADIUS)||Math.hypot(x-PORTAL_POSITION.x,z-PORTAL_POSITION.z)<economy.map.portalSafeRadius||zones[zone].npcs.some(n=>Math.hypot(x-n.x,z-n.z)<economy.map.npcSafeRadius);
}
/** Editable normal packs; town intentionally has no packs or monsters. */
export function validateMonsterGroupConfig(config:typeof monsterGroupConfig){
 for(const key of ['radius','runSpeed'] as const)if(!Number.isFinite(config[key])||config[key]<=0)throw new Error(`Invalid monster group ${key}`);
 for(const [zone,groups] of Object.entries(config.maps))if(groups.length&&!zones[zone as ZoneId].species.some(k=>!species[k].boss&&!species[k].miniBoss))throw new Error(`Invalid monster group ${zone}: no normal species`);
 const ids=new Set<string>();
 for(const groups of Object.values(config.maps))for(const g of groups){
  if(!g.id||ids.has(g.id))throw new Error('Invalid monster group duplicate ID');ids.add(g.id);
  if(!Number.isFinite(g.x)||!Number.isFinite(g.z))throw new Error('Invalid monster group center');
  if(!Number.isSafeInteger(g.count)||g.count<6||g.count>8)throw new Error('Invalid monster group count');
 }
}
validateMonsterGroupConfig(monsterGroupConfig);
const cachedGroups=Object.fromEntries(Object.entries(monsterGroupConfig.maps).map(([zone,groups])=>[zone,groups.map(g=>Object.freeze({...g,radius:monsterGroupConfig.radius}))])) as unknown as Record<ZoneId,readonly Readonly<{id:string;x:number;z:number;count:number;radius:number}>[]>;
export function zoneMonsterGroups(zone:ZoneId) {return cachedGroups[zone];}
export function monsterGroup(zone:ZoneId,id?:string){return id?zoneMonsterGroups(zone).find(g=>g.id===id):undefined;}
export function insideMonsterGroup(zone:ZoneId,id:string|undefined,x:number,z:number){const g=monsterGroup(zone,id);return !!g&&!protectedPosition(zone,x,z)&&Math.hypot(x-g.x,z-g.z)<=g.radius;}
export function zoneSpawns(zone:ZoneId):{kind:Kind;x:number;z:number;groupId?:string}[] {
 const regular=zones[zone].species.filter(k=>!species[k].boss&&!species[k].miniBoss);
 const out:{kind:Kind;x:number;z:number;groupId?:string}[]=[];
 const obstacles=zoneObstacles(zone),groups=zoneMonsterGroups(zone);
 const placed:{x:number;z:number}[]=[];
 for(const [index,g] of groups.entries()){
  let seed=2166136261;
  for(const char of g.id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let value=seed;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
  const safe=(x:number,z:number)=>!protectedPosition(zone,x,z)&&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.9);
  const candidates:{x:number;z:number}[]=[];
  // Stratified world samples belong to the nearest trigger, forming broad map-wide cells.
  // Retry each tile a bounded number of times, then use its center as a safe fallback.
  const tile=7.5;
  for(let row=0;row<12;row++)for(let col=0;col<12;col++)for(let attempt=0;attempt<9;attempt++){
   const x=-45+(col+(attempt===8?.5:.1+.8*random()))*tile,z=-45+(row+(attempt===8?.5:.1+.8*random()))*tile;
   const distance=Math.hypot(x-g.x,z-g.z);
   if(groups.some(h=>Math.hypot(x-h.x,z-h.z)<distance)||!safe(x,z))continue;
   candidates.push({x,z});break;
  }
  const members:{x:number;z:number}[]=[];
  for(let n=0;n<g.count;n++){
   // Farthest-point selection spreads members across their cell instead of clustering by the circle.
   const eligible=candidates.filter(p=>placed.every(h=>Math.hypot(p.x-h.x,p.z-h.z)>=.8));
   const point=n===0?eligible[Math.floor(random()*eligible.length)]:eligible.reduce<typeof eligible[number]|undefined>((best,p)=>{
    const score=(v:typeof p)=>Math.min(...members.map(h=>Math.hypot(v.x-h.x,v.z-h.z)));
    return !best||score(p)>score(best)?p:best;
   },undefined);
   if(!point)throw new Error(`No safe monster scatter position for ${g.id}:${n}`);
   members.push(point);placed.push(point);out.push({kind:regular[index%regular.length],...point,groupId:g.id});
  }
 }
 for(const kind of zones[zone].species)if(species[kind].boss||species[kind].miniBoss)out.push({kind,x:species[kind].boss?32:-32,z:32});
 return out;
}
