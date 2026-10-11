import {test,expect} from '@playwright/test';
test('realtime anticipation uses triple casting and recovery, and cannot replace an active recovery',async()=>{
 Object.defineProperty(globalThis,'document',{value:{addEventListener(){}},configurable:true});
 const {RealtimeNetworkSimulation}=await import('../src/game/realtime-network');
 Reflect.deleteProperty(globalThis,'document');
 const anticipate=(RealtimeNetworkSimulation.prototype as any).anticipate;
 const actor=(cast:number)=>({paused:false,save:{hp:100,mp:100},renderActionTime:0,skillCooldownRemaining:()=>0,unlockedSkills:[{id:'test',cast,stage:5,mp:1,cooldown:4}],sequence:1,cooldownMultiplier:1,skillCooldownTotals:{},target:2});
 const casting:any=actor(.35);anticipate.call(casting,'test');expect(casting.cast.total).toBeCloseTo(1.05);expect(casting.cast.remaining).toBeCloseTo(1.05);expect(casting.preview.duration).toBeCloseTo(1.05);
 const instant:any=actor(0);anticipate.call(instant,'test');expect(instant.cast).toBeUndefined();expect(instant.actionTime).toBeCloseTo(1.26);expect(instant.preview.duration).toBe(0);expect(instant.previewActionUntil-instant.preview.started).toBeCloseTo(1260);
 const blocked:any=actor(.35);blocked.renderActionTime=.5;anticipate.call(blocked,'test');expect(blocked.preview).toBeUndefined();expect(blocked.cast).toBeUndefined();expect(blocked.skillCooldownTotals).toEqual({});
});
