/** Render-only choreography. All offsets are inside the actor, never world/simulation movement. */
export type ChoreographyContext={stage:number;branch?:number;job?:string;effect:string;phase:'anticipation'|'release'|'recovery';progress:number;skillId?:string;duration?:number;frozen?:boolean};
export type SkillPose={clip:string;speed:number;x:number;y:number;z:number;pitch:number;yaw:number;roll:number;clipProgress:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function skillRecoveryDuration(stage:number){return .36+Math.min(10,stage)*.012;}
export function skillPose(c:ChoreographyContext):SkillPose {
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
