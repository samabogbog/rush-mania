/** Collision data shared by the server and Babylon, never supplied by a client. */
export function gladeObstacles() {
  const out: { x: number; z: number; r: number }[] = [];
  for (const [x, z, w, d] of [[-6,-4,5,1],[4,-7,4,1],[-11,0,1,4],[7,8,4,1],[12,-2,1,3],[-6,9,3,1]])
    for(let i=0;i<w;i++) for(let j=0;j<d;j++) out.push({x:x+i*1.12,z:z+j*1.12,r:0.72});
  return out;
}
