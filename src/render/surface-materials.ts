import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Scene } from '@babylonjs/core/scene.js';

export type Surface = 'grass' | 'dirt' | 'stone' | 'wood' | 'plaster' | 'water';
const SIZE = 128;
const woodColors = new Set([0xa76e43,0xbc8a56,0xa57348,0x855c3c,0x95663f,0xb48152,0xdea476,0xc79564,0xbd8758,0xa97149,0xb47e51,0xc99c68,0xcba375,0xb19d73]);
const stoneColors = new Set([0xaab6a2,0xa6b1a3,0xb8bea8,0xaab3ac,0xc4c1ae,0x675c93,0xc6aff1,0x7c7398,0xb4a5cc,0xb2a5d1,0xe7dcff,0xd2c2e8,0xf2ce94,0xdfc9ac,0x83a4c9,0xb87374,0xe88e9c,0x81b8cb,0x96c9d6,0xf4abb4,0xc97987]);
const waterColors = new Set([0x60d9ef,0x499fe9,0x57aab4]);
const plasterColors = new Set([0xffedcc,0xffe8c0]);
const fract = (v:number)=>v-Math.floor(v);
const hash = (x:number,y:number)=>fract(Math.sin(x*127.1+y*311.7+42.17)*43758.5453);
const wrap = (v:number,n:number)=>(v%n+n)%n;
function noise(x:number,y:number,cells:number) {
 const px=x*cells,py=y*cells,ix=Math.floor(px),iy=Math.floor(py);
 const fx=fract(px),fy=fract(py),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 const a=hash(wrap(ix,cells),wrap(iy,cells)),b=hash(wrap(ix+1,cells),wrap(iy,cells));
 const c=hash(wrap(ix,cells),wrap(iy+1,cells)),d=hash(wrap(ix+1,cells),wrap(iy+1,cells));
 return (a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;
}
/** Original procedural textures; deterministic, seamless, mipmapped and shared across zones.
 * Neutral albedo preserves the art palette baked into vertex colors. No asset requests.
 */
export class SurfaceMaterials {
 private readonly materials = new Map<Surface,StandardMaterial>();
 private readonly textures:RawTexture[]=[];
 private readonly normals=new Map<Surface,RawTexture>();
 private low=false;
 constructor(private scene:Scene) {}
 classify(mesh:Mesh,color:number):Surface|null {
  if(mesh.metadata?.surface)return mesh.metadata.surface as Surface;
  if(waterColors.has(color))return 'water';
  if(woodColors.has(color))return 'wood';
  if(stoneColors.has(color))return 'stone';
  if(plasterColors.has(color))return 'plaster';
  const flat=mesh.getBoundingInfo().boundingBox.extendSizeWorld.y<.05;
  if(flat){
   if(mesh.name.includes('meadow'))return 'grass';
   if(mesh.name.startsWith('plane'))return (color>>16&255)>(color>>8&255)?'dirt':'grass';
   if(mesh.name.includes('path')||mesh.name.includes('promenade'))return 'dirt';
   const r=color>>16&255,g=color>>8&255,b=color&255;
   if(r>g&&g>b&&r>150)return 'stone';
  }
  return null;
 }
 material(surface:Surface) {
  const cached=this.materials.get(surface);if(cached)return cached;
  const heights=new Float32Array(SIZE*SIZE),albedo=new Uint8Array(SIZE*SIZE*4);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const u=x/SIZE,v=y/SIZE,broad=noise(u,v,6),grain=noise(u,v,32);
   let h=.5,tone=.94;
   if(surface==='grass'){
    const cx=Math.floor(u*12),cy=Math.floor(v*12),jitter=hash(cx,cy);
    const blade=Math.max(0,1-Math.abs(fract(u*12)+Math.sin(v*Math.PI*24)*.16-.25-jitter*.45)*18)*Math.max(0,1-Math.abs(fract(v*12)-.5)*2);
    h=broad*.55+blade*.25+grain*.12;tone=.84+broad*.13+blade*.025+grain*.045;
   }else if(surface==='dirt'){
    const pebble=grain>.72?(grain-.72)*.6:0;
    h=broad*.3+grain*.16+pebble;tone=.84+broad*.12+grain*.07;
   }else if(surface==='stone'){
    const row=Math.floor(v*4),px=fract(u*3+(row%2)*.5),py=fract(v*4);
    const joint=px<.025||py<.035;
    const block=hash(Math.floor(u*3+(row%2)*.5),row);
    h=joint?.12:.55+grain*.07;tone=joint?.72:.87+block*.075+grain*.045;
   }else if(surface==='wood'){
    const grainLine=.5+.5*Math.sin(u*Math.PI*24+Math.sin(v*Math.PI*4)*.8+Math.sin(v*Math.PI*8)*.25);
    const seam=fract(u*4)<.028;
    h=seam?.15:.45+grainLine*.14;tone=seam?.73:.83+grainLine*.13+grain*.035;
   }else if(surface==='water'){
    const ripple=.5+.5*Math.sin(u*Math.PI*8+Math.sin(v*Math.PI*4)*.6);
    h=.5+ripple*.08+broad*.035;tone=.93+ripple*.055;
   }else {h=grain*.1+broad*.08;tone=.91+grain*.065;}
   const index=y*SIZE+x;heights[index]=h;
   const c=Math.round(Math.min(1,tone)*255);albedo.set([c,c,c,255],index*4);
  }
  const normal=new Uint8Array(SIZE*SIZE*4),strength=surface==='stone'?.9:surface==='wood'?.7:.55;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const dx=(heights[y*SIZE+wrap(x-1,SIZE)]-heights[y*SIZE+wrap(x+1,SIZE)])*strength;
   const dy=(heights[wrap(y-1,SIZE)*SIZE+x]-heights[wrap(y+1,SIZE)*SIZE+x])*strength;
   const inv=1/Math.hypot(dx,dy,1);normal.set([Math.round((dx*inv*.5+.5)*255),Math.round((dy*inv*.5+.5)*255),Math.round((inv*.5+.5)*255),255],(y*SIZE+x)*4);
  }
  const make=(data:Uint8Array,name:string)=>{const t=RawTexture.CreateRGBATexture(data,SIZE,SIZE,this.scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);t.name=name;t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=this.low?1:4;this.textures.push(t);return t;};
  const mat=new StandardMaterial('surface-'+surface,this.scene);mat.diffuseColor=Color3.White();
  mat.diffuseTexture=make(albedo,surface+'-albedo');
  const normalTexture=make(normal,surface+'-normal');normalTexture.level=surface==='water'?.23:.45;
  this.normals.set(surface,normalTexture);mat.bumpTexture=this.low?null:normalTexture;
  // Broad subdued highlights suggest rough surfaces, without plastic gloss.
  mat.specularColor=surface==='water'?new Color3(.24,.28,.3):new Color3(.035,.032,.026);mat.specularPower=surface==='water'?64:surface==='wood'?24:12;
  this.materials.set(surface,mat);return mat;
 }
 /** World-space planar UVs maintain a consistent texel scale after merging and across sector edges. */
 projectUV(mesh:Mesh,surface:Surface) {
  const positions=mesh.getVerticesData('position'),normals=mesh.getVerticesData('normal');if(!positions||!normals)return;
  const matrix=mesh.computeWorldMatrix(true),uvs:number[]=[],tile=surface==='grass'?3:surface==='dirt'?2.8:surface==='stone'?3:surface==='wood'?1.5:surface==='water'?2.5:2;
  for(let i=0;i<positions.length;i+=3){
   const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),matrix);
   const n=Vector3.TransformNormal(Vector3.FromArray(normals,i),matrix);
   if(Math.abs(n.y)>.65)uvs.push(p.x/tile,p.z/tile);
   else if(Math.abs(n.x)>Math.abs(n.z))uvs.push(p.z/tile,p.y/tile);
   else uvs.push(p.x/tile,p.y/tile);
  }
  mesh.setVerticesData('uv',uvs);
 }
 setLowQuality(low:boolean){
  this.low=low;for(const texture of this.textures)texture.anisotropicFilteringLevel=low?1:4;
  for(const [surface,material] of this.materials)material.bumpTexture=low?null:this.normals.get(surface)??null;
 }
 get diagnostics(){return {surfaceMaterials:this.materials.size,surfaceTextures:this.textures.length,textureSize:SIZE,normalMaps:!this.low,surfaceFamilies:[...this.materials.keys()]};}
 // Zone rebuilds deliberately retain the tiny shared library. Scene disposal owns its lifetime.
}
