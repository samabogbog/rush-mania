import {test,expect} from '@playwright/test';
import {SkillCameraShake} from '../src/render/skill-camera-shake';
test('Lv80/90/100 use increasing brief impulses; lower skills and reduced motion stay still',()=>{
 const amplitudes:number[]=[],durations:number[]=[];
 for(const level of [80,90,100]){const s=new SkillCameraShake();expect(s.trigger(level)).toBe(true);amplitudes.push(s.diagnostics.amplitude);durations.push(s.diagnostics.duration);s.update(.03);expect(Math.hypot(s.diagnostics.offset.x,s.diagnostics.offset.y)).toBeGreaterThan(0);s.update(1);expect(s.diagnostics.active).toBe(false);for(const n of Object.values(s.diagnostics.offset))expect(n).toBeCloseTo(0,10);}
 expect(amplitudes[0]).toBeLessThan(amplitudes[1]);expect(amplitudes[1]).toBeLessThan(amplitudes[2]);expect(amplitudes).toEqual([.085,.105,.11]);expect(durations).toEqual([.36,.45,.54]);const extended=new SkillCameraShake();extended.trigger(100);extended.update(.4);expect(extended.diagnostics.active).toBe(true);extended.update(.14);expect(extended.diagnostics.active).toBe(false);
 for(const level of [10,50,70]){const s=new SkillCameraShake();expect(s.trigger(level)).toBe(false);expect(s.update(.1)).toEqual({x:0,y:0,z:0});}
 const s=new SkillCameraShake();expect(s.trigger(100,true)).toBe(false);expect(s.diagnostics.active).toBe(false);
});
test('shake is deterministic across time steps, bounded under repeats, resets without residual offsets',()=>{
 const a=new SkillCameraShake(),b=new SkillCameraShake();a.trigger(100);b.trigger(100);a.update(.1);for(let n=0;n<10;n++)b.update(.01);expect(a.diagnostics.offset.x).toBeCloseTo(b.diagnostics.offset.x,8);expect(a.diagnostics.offset.y).toBeCloseTo(b.diagnostics.offset.y,8);
 for(let n=0;n<100;n++){a.trigger(80);a.update(.01);expect(Math.abs(a.diagnostics.offset.x)).toBeLessThanOrEqual(.11);expect(Math.abs(a.diagnostics.offset.y)).toBeLessThanOrEqual(.11);}
 a.reset();expect(a.diagnostics.active).toBe(false);expect(a.update(10)).toEqual({x:0,y:0,z:0});
});
