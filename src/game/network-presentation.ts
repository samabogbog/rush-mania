export type Position={x:number;z:number};
type Sample=Position&{at:number;life:string};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** Arrival-time interpolation changes presentation only, never the snapshot. */
export class EntityPresentation {
  private tracks=new Map<string,Sample[]>();private playback=new Map<string,number>();private lastArrival?:number;private jitterMs=0;
  intervalMs=200;delayMs=150;
  accept(entities:(Position&{id:string;life:string})[],at:number,reset=false) {
    if(reset){this.tracks.clear();this.playback.clear();this.lastArrival=undefined;this.intervalMs=200;this.delayMs=150;this.jitterMs=0;}
    if(this.lastArrival!==undefined){const interval=clamp(at-this.lastArrival,1,2000);this.jitterMs+=(Math.abs(interval-this.intervalMs)-this.jitterMs)*.25;this.intervalMs+=(interval-this.intervalMs)*.25;this.delayMs=clamp(this.intervalMs*1.05+this.jitterMs,100,900);}
    this.lastArrival=at;const retained=new Set<string>();
    for(const entity of entities){retained.add(entity.id);let samples=this.tracks.get(entity.id)||[];const previous=samples.at(-1);
      if(previous&&(previous.life!==entity.life||Math.hypot(entity.x-previous.x,entity.z-previous.z)>3)){samples=[];this.playback.delete(entity.id);}
      samples.push({x:entity.x,z:entity.z,at,life:entity.life});while(samples.length>8)samples.shift();this.tracks.set(entity.id,samples);
    }
    for(const id of this.tracks.keys())if(!retained.has(id)){this.tracks.delete(id);this.playback.delete(id);}
  }
  position(id:string,fallback:Position,now:number):Position {
    const samples=this.tracks.get(id);if(!samples?.length)return fallback;
    // An expanding jitter buffer may slow playback, but must never rewind it.
    const time=Math.max(this.playback.get(id)??-Infinity,now-this.delayMs);this.playback.set(id,time);
    const first=samples[0];if(time<=first.at)return {x:first.x,z:first.z};
    for(let i=1;i<samples.length;i++){const next=samples[i],previous=samples[i-1];if(time<=next.at){const blend=clamp((time-previous.at)/Math.max(1,next.at-previous.at),0,1);return{x:previous.x+(next.x-previous.x)*blend,z:previous.z+(next.z-previous.z)*blend};}}
    const latest=samples.at(-1)!,previous=samples.at(-2);if(!previous)return{x:latest.x,z:latest.z};
    const seconds=clamp(time-latest.at,0,100)/1000,span=Math.max(1,latest.at-previous.at)/1000;
    let dx=(latest.x-previous.x)/span*seconds,dz=(latest.z-previous.z)/span*seconds;const distance=Math.hypot(dx,dz);if(distance>.5){dx*=.5/distance;dz*=.5/distance;}
    return{x:latest.x+dx,z:latest.z+dz};
  }
  get bufferedSamples(){let count=0;for(const samples of this.tracks.values())count+=samples.length;return count;}
}
/** Visual dead reckoning: no replayed combat, commands or authoritative writes. */
export class LocalPresentation {
  position:Position;private correction:Position={x:0,z:0};
  constructor(position:Position){this.position={...position};}
  reconcile(target:Position,reset=false){if(reset){this.position={...target};this.correction={x:0,z:0};}else this.correction={x:target.x-this.position.x,z:target.z-this.position.z};}
  tick(dt:number,velocity:Position,ageMs:number,blocked:(position:Position)=>boolean){
    dt=clamp(dt,0,.1);const freshness=clamp((1200-ageMs)/200,0,1);
    let dx=velocity.x*dt*freshness,dz=velocity.z*dt*freshness;
    if(blocked({x:this.position.x+dx,z:this.position.z+dz})){dx=0;dz=0;}
    const blend=1-Math.exp(-dt*5);let cx=this.correction.x*blend,cz=this.correction.z*blend;
    const speed=Math.hypot(velocity.x,velocity.z);
    if(speed>0){const ux=velocity.x/speed,uz=velocity.z/speed,opposing=cx*ux+cz*uz,minimum=-Math.hypot(dx,dz)*.5;
      if(opposing<minimum){cx+=ux*(minimum-opposing);cz+=uz*(minimum-opposing);}
    }
    if(!blocked({x:this.position.x+dx+cx,z:this.position.z+dz+cz})){dx+=cx;dz+=cz;this.correction.x-=cx;this.correction.z-=cz;}
    this.position.x+=dx;this.position.z+=dz;
  }
}
