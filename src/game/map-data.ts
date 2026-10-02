/** Collision data shared by the server and Babylon, never supplied by a client. */
export function gladeObstacles() {
  const out: { x: number; z: number; r: number }[] = [];
  for (const [x, z, w, d] of [[-6,-4,5,1],[4,-7,4,1],[-11,0,1,4],[7,8,4,1],[12,-2,1,3],[-6,9,3,1]])
    for(let i=0;i<w;i++) for(let j=0;j<d;j++) out.push({x:x+i*1.12,z:z+j*1.12,r:0.72});
  return out;
}
import type {ZoneId} from './content';
export function zoneObstacles(zone:ZoneId) {
 if(zone==='glade')return gladeObstacles();
 const out:{x:number;z:number;r:number}[]=[];
 if(zone==='town') return [{x:-8,z:-7,r:2},{x:8,z:-7,r:2},{x:-8,z:7,r:2},{x:8,z:7,r:2}];
 const rows=zone==='ruins'?[[-10,-4,6,1],[5,-4,6,1],[-10,5,6,1],[5,5,6,1]]:zone==='orchard'?[[-9,-4,1,5],[8,-4,1,5],[-7,7,4,1]]:zone==='marsh'?[[-8,-3,3,3],[6,5,3,3],[-11,9,2,2]]:[[-9,-4,5,1],[6,-5,1,5],[-4,8,5,1]];
 for(const [x,z,w,d] of rows)for(let i=0;i<w;i++)for(let j=0;j<d;j++)out.push({x:x+i*1.12,z:z+j*1.12,r:zone==='orchard'?.55:.72});
 return out;
}
