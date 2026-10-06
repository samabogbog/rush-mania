import monsterGroupConfig from '../config/monster-groups.json' with {type:'json'};
export {monsterGroupConfig};
import {economy} from '../config/balance';
/** Collision data shared by the server and Babylon, never supplied by a client. */
export function gladeObstacles() {
  const out: { x: number; z: number; r: number }[] = [];
  for (const [x, z, w, d] of [[-6,-4,5,1],[4,-7,4,1],[-11,0,1,4],[7,8,4,1],[12,-2,1,3],[-6,9,3,1]])
    for(let i=0;i<w;i++) for(let j=0;j<d;j++) out.push({x:x+i*1.12,z:z+j*1.12,r:0.72});
  return out;
}
import {species,zones,type ZoneId,type Kind} from './content';
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
/** Editable normal packs; town uses beginner glade species outside its safe hub. */
export function validateMonsterGroupConfig(config:typeof monsterGroupConfig){
 for(const key of ['radius','spawnRadius','runSpeed'] as const)if(!Number.isFinite(config[key])||config[key]<=0)throw new Error(`Invalid monster group ${key}`);
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
 const regular=zones[zone==='town'?'glade':zone].species.filter(k=>!species[k].boss&&!species[k].miniBoss);
 const out:{kind:Kind;x:number;z:number;groupId?:string}[]=[];
 const obstacles=zoneObstacles(zone),radius=monsterGroupConfig.spawnRadius;
 for(const [index,g] of zoneMonsterGroups(zone).entries()){
  const placed:{x:number;z:number}[]=[];
  const safe=(x:number,z:number)=>x>=WORLD_BOUNDS.minX&&x<=WORLD_BOUNDS.maxX&&z>=WORLD_BOUNDS.minZ&&z<=WORLD_BOUNDS.maxZ&&!protectedPosition(zone,x,z)&&!obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.3)&&placed.every(p=>Math.hypot(x-p.x,z-p.z)>=.8);
  for(let n=0;n<g.count;n++){
   // Independent member seeds keep offline/server homes stable across requests and respawns.
   let seed=2166136261;
   for(const char of `${g.id}:${n}`)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
   const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let value=seed;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
   let point:{x:number;z:number}|undefined;
   for(let attempt=0;attempt<96&&!point;attempt++){
    const angle=random()*Math.PI*2,distance=radius*Math.sqrt(.12+.88*random());
    const x=g.x+Math.cos(angle)*distance,z=g.z+Math.sin(angle)*distance;
    if(safe(x,z))point={x,z};
   }
   // Bounded deterministic search if random candidates are obstructed; never emit unsafe homes.
   for(let row=-6;row<=6&&!point;row++)for(let col=-6;col<=6&&!point;col++){
    const dx=col*radius/6,dz=row*radius/6,x=g.x+dx,z=g.z+dz;
    if(Math.hypot(dx,dz)<=radius&&safe(x,z))point={x,z};
   }
   if(!point)throw new Error(`No safe monster scatter position for ${g.id}:${n}`);
   placed.push(point);out.push({kind:regular[index%regular.length],...point,groupId:g.id});
  }
 }
 for(const kind of zones[zone].species)if(species[kind].boss||species[kind].miniBoss)out.push({kind,x:species[kind].boss?32:-32,z:32});
 return out;
}
