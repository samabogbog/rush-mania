/** Unit stick displacement, with a radial deadzone and continuous speed beyond it. */
export function joystickVector(x:number,z:number,radius:number,deadzone=.16){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||radius<=0)return {dx:0,dz:0,knobX:0,knobZ:0};
  const distance=Math.hypot(x,z),clamped=Math.min(distance,radius);
  const magnitude=Math.max(0,(clamped/radius-deadzone)/(1-deadzone));
  const unit=distance?1/distance:0;
  return {dx:x*unit*magnitude,dz:z*unit*magnitude,knobX:x*unit*clamped,knobZ:z*unit*clamped};
}
