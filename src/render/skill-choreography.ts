/** Render-only choreography. All offsets are inside the actor, never world/simulation movement. */
export {skillRecoveryDuration} from '../game/skill-timing.js';
export type ChoreographyContext={stage:number;branch?:number;job?:string;effect:string;phase:'anticipation'|'release'|'recovery';progress:number;skillId?:string;duration?:number;frozen?:boolean};
export type SkillPose={clip:string;speed:number;x:number;y:number;z:number;pitch:number;yaw:number;roll:number;clipProgress:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function skillPose(c:ChoreographyContext):SkillPose {
 if(c.stage>=5&&c.stage<=7)return midTierPose(c);
 const p=clamp(c.progress),stage=Math.max(1,Math.min(10,c.stage)),tier=(stage-1)/9,branch=c.branch||0;
 const support=['heal','guard','fury'].includes(c.effect),air=(!support&&stage>=3)||(c.job==='mage'&&c.effect==='heal'&&stage>=5),flip=air&&stage>=7&&c.job==='archer',spin=!support&&stage>=4&&(c.job==='swordsman'||c.job==='mage'&&branch===0);
 const anticipation=c.phase==='anticipation',u=anticipation?0:p;
 // Fast launch, hang and planted finish. A full turn ends exactly at the neutral orientation.
 const variant=(stage-1)%3;
 const flight=air?Math.sin(Math.PI*clamp(u/.78)):0,burst=Math.sin(Math.PI*clamp(u/.62)),settle=Math.sin(Math.PI*clamp((u-.72)/.28));
 let clip=anticipation?(support?'skill-guard':c.job==='archer'?'dodge':c.job==='swordsman'?'run':'skill-guard'):support?(c.job==='swordsman'&&c.effect==='fury'?'attack-heavy':c.effect==='heal'?'skill-heal':'skill-guard'):flip?'jump':air&&!spin?'jump':spin?'spin':c.job==='archer'?(branch?'dodge':'skill'):c.job==='swordsman'?(branch||variant===1?'attack-heavy':variant===2?'attack':'skill'):'attack';
 // Keep the crossbow in its authored aiming pose before flight reaches ground.
 // Generic Jump_Land lowers this equipped prop beneath the planted feet.
 if(!anticipation&&c.job==='archer'&&u>.62)clip='skill';
 else if(!anticipation&&u>.78)clip='land';
 return {clip,speed:anticipation?2.8:3.1+tier*1.5,x:anticipation?0:(c.job==='archer'&&branch?Math.sin(u*Math.PI*2)*(.12+tier*.18):0),y:anticipation?-.035*Math.sin(p*Math.PI):flight*(.32+tier*1.12),z:anticipation?-.06*Math.sin(p*Math.PI):burst*(support?.08:c.job==='swordsman'?.32+tier*.88:c.job==='archer'?-.24-tier*.5:.16+tier*.28),pitch:flip?Math.PI*2*clamp(u/.78):anticipation?-.12*Math.sin(p*Math.PI):-.16*burst+.08*settle,yaw:support&&c.job==='mage'?Math.sin(Math.PI*u)*(.4+tier*1.3):spin?Math.PI*2*(stage>=9&&variant===0?2:1)*clamp(u/.78):0,roll:c.job==='archer'&&branch?-.2*burst*(1-clamp((u-.42)/.2)):0,clipProgress:anticipation?p*.22:c.job==='archer'&&u>.62?clamp((u-.62)/.38):u>.78?(u-.78)/.22:clamp(u/.78)};
}

/** Lv50–70 actions use seconds: extended recovery never stretches gravity or a flip. */
function midTierPose(c:ChoreographyContext):SkillPose {
 const p=clamp(c.progress),stage=c.stage,branch=c.branch||0,archer=c.job==='archer',mage=c.job==='mage';
 const duration=c.duration&&c.duration>0?c.duration:(.36+stage*.012)*3,t=p*duration;
 const smooth=(v:number)=>{const a=clamp(v);return a*a*(3-2*a);};
 const pulse=(time:number,start:number,length:number)=>Math.sin(Math.PI*clamp((time-start)/length))**2;
 const pose:SkillPose={clip:archer?'skill':mage?'skill-guard':'skill-guard',speed:4,x:0,y:0,z:0,pitch:0,yaw:0,roll:0,clipProgress:archer?1:0};
 if(c.phase==='anticipation'){
  // Aim / draw / shield brace / staff circles, rather than looping locomotion.
  const envelope=Math.sin(Math.PI*p)**2,beat=Math.sin(t*Math.PI*2/(archer?.48:mage?.7:.58))**2;
  pose.clip=archer?'skill':mage?'skill-guard':branch?'skill-guard':'attack-heavy';
  pose.clipProgress=archer?1-.28*envelope*beat:.35*envelope*(.35+.65*beat);
  pose.pitch=-.055*envelope*(.5+.5*beat);pose.z=-.035*envelope;
  pose.yaw=(branch?-1:1)*.075*envelope*Math.sin(t*5);
  return pose;
 }
 // Defensive Lv50/70 branches brace on the ground; offensive branches vault.
 const grounded=branch===1&&stage!==6;
 const takeoff=.075,flightSeconds=stage===7?.46:stage===6?.44:.42,landing=takeoff+flightSeconds;
 const f=clamp((t-takeoff)/flightSeconds),hop=grounded?0:4.9*flightSeconds*flightSeconds*f*(1-f);
 pose.y=hop;
 const launch=pulse(t,0,takeoff),absorb=grounded?pulse(t,.03,.23):pulse(t,landing,.16);
 pose.pitch=-.07*launch+.11*absorb;
 if(!grounded&&t<landing+.16){
  pose.clip='jump';
  // Full authored crouch / tuck / knee absorption fits a real flight and landing.
  pose.clipProgress=t<takeoff?.16*smooth(t/takeoff):t<landing?.16+.60*f:.76+.24*smooth((t-landing)/.16);
  const travel=smooth(t/takeoff)*(1-smooth((t-landing)/.16));
  pose.z=(archer?-.25:mage?.10:branch?.22:.36)*travel;
  pose.x=archer&&branch?.18*Math.sin(Math.PI*f)*travel:0;
  if(archer&&stage===7){
   // Compact backward somersault, complete before feet touch; 2π is neutral.
   pose.pitch-=Math.PI*2*smooth((t-takeoff-.035)/(flightSeconds-.07));
  }else if(!archer&&!branch&&stage===7){pose.yaw=Math.PI*2*smooth((t-takeoff-.025)/(flightSeconds-.05));}
 }
 const followStart=grounded?0:landing+.16;
 if(t>=followStart){
  const q=clamp((t-followStart)/Math.max(.01,duration-followStart));
  // Consecutive authored sweeps / shots / spell gestures, each returning to rest.
  const count=stage===7?3:stage===6?2:1,beat=Math.sin(Math.PI*count*q)**2;
  pose.clip=archer?'skill':mage?(branch?(stage===5?'skill-guard':stage===6?'attack':'skill-heal'):(stage===5?'skill-heal':stage===6?'attack':'attack-heavy')):branch?'attack-heavy':stage===7?'skill-ultimate':stage===6?'attack-heavy':'attack';
  pose.clipProgress=archer?1-.82*beat:beat;
  pose.pitch=-.08*beat;pose.z=(archer?-.045:mage?.035:branch?.12:.17)*beat;
  pose.yaw=(branch?-1:1)*(mage?.16:archer?.045:.12)*Math.sin(Math.PI*count*2*q)*Math.sin(Math.PI*q)**2;
 }
 // Preserve the complete turn after landing until the neutral reset: equivalent orientation.
 if(!grounded&&stage===7&&t>=followStart){if(archer)pose.pitch-=Math.PI*2;else if(!branch)pose.yaw+=Math.PI*2;}
 if(p===1){pose.x=pose.y=pose.z=pose.pitch=pose.yaw=pose.roll=0;pose.clipProgress=archer?1:0;}
 return pose;
}
