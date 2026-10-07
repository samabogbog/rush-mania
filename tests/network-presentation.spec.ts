import {test,expect} from '@playwright/test';
import {EntityPresentation,LocalPresentation} from '../src/game/network-presentation';
test('entity snapshots interpolate over frames without changing authoritative objects',()=>{
 const buffer=new EntityPresentation(),entity={id:'m1',life:'alive',x:0,z:0};buffer.accept([entity],0);buffer.accept([{...entity,x:1}],250);
 const samples=Array.from({length:6},(_,i)=>buffer.position('m1',entity,buffer.delayMs+25+i*20).x);
 expect(samples[0]).toBeGreaterThan(0);expect(samples.at(-1)!).toBeLessThan(1);expect(samples.every((x,i)=>i===0||x>samples[i-1])).toBe(true);expect(entity.x).toBe(0);
});
test('extrapolation is bounded and freezes on lost connection; tracks disappear on removal',()=>{
 const b=new EntityPresentation();b.accept([{id:'m',life:'alive',x:0,z:0}],0);b.accept([{id:'m',life:'alive',x:1,z:0}],200);
 const late=b.position('m',{x:1,z:0},1000);expect(late.x).toBeLessThanOrEqual(1.5);expect(b.position('m',{x:1,z:0},10000)).toEqual(late);b.accept([],11000);expect(b.bufferedSamples).toBe(0);
});
test('respawn, teleport and zone reset never interpolate between different locations',()=>{
 const b=new EntityPresentation();b.accept([{id:'m',life:'alive',x:0,z:0}],0);b.accept([{id:'m',life:'dead',x:2,z:0}],200);expect(b.position('m',{x:2,z:0},200).x).toBe(2);
 b.accept([{id:'m',life:'alive',x:20,z:0}],400);expect(b.position('m',{x:20,z:0},400).x).toBe(20);
 b.accept([{id:'m',life:'alive',x:-20,z:0}],600,true);expect(b.bufferedSamples).toBe(1);expect(b.position('m',{x:-20,z:0},600).x).toBe(-20);
});
test('local presentation moves each frame between delayed snapshots and respects obstacles and stale cutoff',()=>{
 const p=new LocalPresentation({x:0,z:0});const positions:number[]=[];
 for(let i=0;i<42;i++){p.tick(1/60,{x:4.4,z:0},i*1000/60,()=>false);positions.push(p.position.x);}
 expect(positions.every((x,i)=>i===0||x>positions[i-1])).toBe(true);expect(p.position.x).toBeGreaterThan(3);
 const before=p.position.x;p.tick(1/60,{x:4.4,z:0},700,()=>true);expect(p.position.x).toBe(before);
 p.tick(1/60,{x:4.4,z:0},1500,()=>false);expect(p.position.x).toBe(before);
 p.reconcile({x:10,z:0},true);expect(p.position.x).toBe(10);
});
test('server correction cannot reverse a held movement input under latency',()=>{
 const p=new LocalPresentation({x:4,z:0});p.reconcile({x:1,z:0});
 for(let i=0;i<42;i++){const before=p.position.x;p.tick(1/60,{x:4.4,z:0},i*1000/60,()=>false);expect(p.position.x).toBeGreaterThan(before);}
});
test('buffer covers a slow regular snapshot cadence after warmup without rewinding',()=>{
 const b=new EntityPresentation();let last=0;
 for(let i=0;i<20;i++){const at=i*700;b.accept([{id:'m',life:'alive',x:i*.7,z:0}],at);for(let t=at;t<at+700;t+=100){const position=b.position('m',{x:i*.7,z:0},t).x;expect(position).toBeGreaterThanOrEqual(last);last=position;}}
 expect(b.delayMs).toBeGreaterThan(700);expect(b.delayMs).toBeLessThanOrEqual(900);expect(b.bufferedSamples).toBeLessThanOrEqual(8);
});
