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
export function zoneSpawns(zone:ZoneId):{kind:Kind;x:number;z:number}[] {
 const regular=zones[zone].species.filter(k=>!species[k].boss&&!species[k].miniBoss);
 const out:{kind:Kind;x:number;z:number}[]=[];
 for(const [col,row] of [[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])for(let n=0;n<3;n++) {
  const x=col*SECTOR_SIZE+[-7,6,0][n],z=row*SECTOR_SIZE+[4,-5,10][n];
  if(regular.length&&!protectedPosition(zone,x,z)&&!zoneObstacles(zone).some(o=>Math.hypot(x-o.x,z-o.z)<o.r+1))out.push({kind:regular[(out.length)%regular.length],x,z});
 }
 for(const kind of zones[zone].species)if(species[kind].boss||species[kind].miniBoss)out.push({kind,x:species[kind].boss?32:-32,z:32});
 return out;
}
