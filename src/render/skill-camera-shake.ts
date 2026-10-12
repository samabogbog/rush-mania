/** Render-only deterministic impulse in world units; elapsed and duration are seconds. */
export class SkillCameraShake {
 private level=0;private elapsed=0;private duration=0;private amplitude=0;private triggerCount=0;
 private offset={x:0,y:0,z:0};
 trigger(level:number,reducedMotion=false){
  if(reducedMotion||![80,90,100].includes(level))return false;
  const amplitude=level===80?.085:level===90?.105:.11,duration=level===80?.36:level===90?.45:.54;
  // A stronger overlapping impulse replaces the weaker one; amplitudes never add.
  if(this.elapsed<this.duration&&this.amplitude>amplitude)return false;
  this.level=level;this.elapsed=0;this.duration=duration;this.amplitude=amplitude;this.triggerCount++;this.sample();return true;
 }
 update(seconds:number){this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,Number.isFinite(seconds)?seconds:0));this.sample();return {...this.offset};}
 private sample(){const envelope=this.duration?Math.pow(Math.max(0,1-this.elapsed/this.duration),2):0,a=this.amplitude*envelope,t=this.elapsed;this.offset={x:Math.sin(t*93+1.1)*a,y:Math.sin(t*117+.7)*a*.45,z:Math.sin(t*81+2)*a*.65};}
 reset(){this.level=0;this.elapsed=0;this.duration=0;this.amplitude=0;this.offset={x:0,y:0,z:0};}
 get diagnostics(){return {level:this.level,elapsed:this.elapsed,duration:this.duration,active:this.elapsed<this.duration,amplitude:this.amplitude,offset:{...this.offset},triggerCount:this.triggerCount};}
}
