import { classes, type ClassId } from "../game/classes";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Primitives } from "./primitives";
import { species, type Kind } from "../simulation";
import { zones } from "../game/content";
import {zoneObstacles} from "../game/map-data";
import { meadowGround, roundTree, flowerPatch, roundedPortal, townGarden, meadowPatch, fountainRipples } from './environment-art';
export type Obstacle = { x: number; z: number; r: number };
export function buildMap(factory: Primitives, blocking: Obstacle[]) {
  const mesh = factory.mesh.bind(factory),
    box = factory.box.bind(factory),
    ball = factory.ball.bind(factory);
  let seed = 78;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  meadowGround(factory,0x82cc79,0xe9d5a1);
  for(const [x,z,r,c] of [[-9,-7,4,0x88cf7d],[8,-8,4,0x7bc672],[-7,10,3,0x8bd281],[11,6,3.5,0x7bc672]])meadowPatch(factory,x,z,r,c);
  for(const [x,z] of [[-8,-9],[6,-10],[-9,6],[10,6],[-13,-5],[13,10]]) flowerPatch(factory,x,z,Math.abs(x+z));
  const beds = [
    [-9, -6, 4, 2],
    [-7, 5, 4, 2],
    [8, -6, 5, 2],
    [9, 5, 3, 3],
    [-5, -11, 5, 2],
    [5, 11, 4, 2],
    [-12, 10, 3, 2],
    [13, -11, 3, 2],
  ];
  for (const [x, z, w, d] of beds) {
    for (let xx = 0; xx < w; xx++)
      for (let zz = 0; zz < d; zz++) {
        const bx = x + xx * 0.65 + (rand()-.5)*.46,
          bz = z + zz * 0.65 + (rand()-.5)*.46;
        const g = factory.group();
        g.position.set(bx, 0, bz);
        for (let k = 0; k < 3; k++) {
          const grass = mesh(
            { kind: "sphere", r: 0.17, segments: 4 },
            xx % 2 ? 0x62bd79 : 0x94d988,
            (rand() - 0.5) * 0.3,
            0.24,
            (rand() - 0.5) * 0.3,
            g,
          );
          grass.scaling.set(.65,1.25+rand()*.5,.65);
          grass.rotation.z = (rand() - 0.5) * 0.3;
        }
      }
  }
  const wall = (x: number, z: number) => {
    const group = factory.group('garden-stone');group.position.set(x,0,z);
    const tone=[0xa6b1a3,0xb8bea8,0xaab3ac,0xc4c1ae][Math.floor(rand()*4)];
    const stone=ball(.56,tone,0,.28,0,group,.5+rand()*.12,8);stone.scaling.x=.94+rand()*.1;stone.scaling.z=.88+rand()*.12;stone.rotation.y=rand()*Math.PI;stone.rotation.z=(rand()-.5)*.15;
    const moss=ball(.28,0x7db077,.07,.57,-.02,group,.12,6);moss.scaling.x=1.3;moss.scaling.z=.85;moss.rotation.y=rand()*Math.PI;
    blocking.push({x,z,r:.72});
  };
  [
    [-6, -4, 5, 1],
    [4, -7, 4, 1],
    [-11, 0, 1, 4],
    [7, 8, 4, 1],
    [12, -2, 1, 3],
    [-6, 9, 3, 1],
  ].forEach(([x, z, w, d]) => {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < d; j++) wall(x + i * 1.12, z + j * 1.12);
  });
  for (let i = 0; i < 38; i++) {
    const a = (i / 38) * Math.PI * 2,
      x = Math.cos(a) * (18 + rand() * 3),
      z = Math.sin(a) * (18 + rand() * 3);
    roundTree(factory,x,z,i%3===0?0x61c888:0x42b476,.9+rand()*.25);
  }
  for (const [x, z] of [
    [-12, -9],
    [12, 10],
    [-10, 10],
    [10, -12],
  ]) {
    const g = factory.group();
    g.position.set(x, 0, z);
    for (let i = 0; i < 3; i++) {
      const c = mesh(
        { kind: "cone", r: 0.3, h: 0.95, n: 5 },
        0x79dfe7,
        (i - 1) * 0.35,
        0.5,
        0,
        g,
      );
      c.rotation.z = (i - 1) * 0.25;
    }
  }
  // Starting camp: portal, market stall, noticeboard and a lantern-lit path.
  roundedPortal(factory,0,-14.8,0xb39bff);
  const stall = factory.group();
  stall.position.set(-4, 0, -14);
  box(2.2, 0.8, 1, 0x8f6372, 0, 0.45, 0, stall);
  box(0.12, 2, 0.12, 0x9f8594, -1, 1, 0, stall);
  box(0.12, 2, 0.12, 0x9f8594, 1, 1, 0, stall);
  const canopy=ball(1.35,0xffba8e,0,2,0,stall,.22);canopy.scaling.z=.65;
  for(const side of [-1,1])ball(.17,0xffdc96,side,2.05,.6,stall,.6);
  for (let i = 0; i < 4; i++)
    ball(0.14, 0xf08ba1, -0.7 + i * 0.45, 0.95, 0, stall);
  for (const [x, z] of [
    [-2, -12],
    [2, -12],
    [-13, 2],
    [13, 2],
  ]) {
    box(0.1, 1.8, 0.1, 0x94849a, x, 0.9, z, undefined);
    const lantern = ball(0.23, 0xffd486, x, 1.9, z, undefined);
    lantern.material = factory.material(0xffd486, true);
  }
}
export function buildPlayer(
  factory: Primitives,
  g: TransformNode,
  job: ClassId = "swordsman",
) {
  const box = factory.box.bind(factory),
    ball = factory.ball.bind(factory);
  const coat=ball(.39,classes[job].color,0,.92,0,g,1.05);coat.scaling.z=.76;
  const belt=ball(.4,0xffcb75,0,.72,0,g,.15);belt.scaling.z=.78;
  ball(0.51, 0xffd5b5, 0, 1.58, .035, g,.95);
  ball(0.52, 0x684b39, 0, 1.81, -0.065, g, 0.68);
  for(const side of [-1,0,1])ball(.18,0x684b39,side*.24,1.86,.31,g,.7);
  ball(.16,0x5b506d,-.19,.36,0,g,1.4);
  ball(.16,0x5b506d,.19,.36,0,g,1.4);
  const bootL=ball(.19,0x73513e,-.19,.14,.07,g,.6);bootL.scaling.z=1.3;
  const bootR=ball(.19,0x73513e,.19,.14,.07,g,.6);bootR.scaling.z=1.3;
  ball(.18,classes[job].color,-.38,1.03,0,g,1.05);ball(.15,0xffd5b5,-.43,.84,.06,g);
  ball(.18,classes[job].color,.38,1.03,0,g,1.05);ball(.15,0xffd5b5,.43,.84,.06,g);
  if (job === "swordsman") {
    box(0.1, 0.95, 0.07, 0xdbe9ed, 0.65, 0.92, 0.1, g).rotation.z = -0.3;
    box(0.4, 0.1, 0.14, 0xffc974, 0.51, 0.5, 0.1, g);
    box(0.11, 0.27, 0.1, 0x604361, 0.5, 0.35, 0.1, g);
  } else if (job === "mage") {
    box(0.09, 1.7, 0.09, 0x98633d, 0.55, 0.9, 0.1, g);
    ball(0.22, 0x6fddff, 0.55, 1.8, 0.1, g);
    box(0.4, 0.1, 0.2, 0xffdd7c, 0.55, 1.55, 0.1, g);
  } else {
    box(0.09, 0.85, 0.08, 0x915631, 0.6, 1, 0.12, g);
    box(0.08, 0.48, 0.08, 0xc78c4c, 0.5, 1.5, 0.12, g).rotation.z = -0.35;
    box(0.08, 0.48, 0.08, 0xc78c4c, 0.5, 0.5, 0.12, g).rotation.z = 0.35;
    box(0.02, 1.35, 0.02, 0xffe4b0, 0.42, 1, 0.12, g);
    box(0.08, 0.7, 0.25, 0x705337, -0.25, 1, -0.35, g);
  }
  for(const side of [-1,1]){
   const eye=ball(.064,0x352b31,side*.18,1.6,.497,g,1.3);eye.scaling.z=.4;
   ball(.018,0xffffff,side*.18-.012,1.625,.522,g);
   const cheek=ball(.065,0xffa7a3,side*.3,1.46,.435,g,.5);cheek.scaling.z=.4;
  }
  const smile=ball(.043,0xb87667,0,1.435,.524,g,.35);smile.scaling.z=.3;
  const cape = box(0.63, 0.8, 0.06, classes[job].color, 0, 0.94, -0.26, g);
  cape.rotation.x = -0.15;
}
export function creature(factory: Primitives, kind: Kind) {
  const mesh = factory.mesh.bind(factory),
    box = factory.box.bind(factory),
    ball = factory.ball.bind(factory);
  const g = factory.group();
  if (species[kind].family === "slime") {
    const body = ball(0.57, species[kind].color, 0, 0.5, 0, g, 0.82);
    body.scaling.x = 1.12;
    ball(0.16, 0xc8fff1, -0.2, 0.7, 0.3, g, 0.4);
    ball(0.06, 0x273747, -0.2, 0.5, 0.46, g);
    ball(0.06, 0x273747, 0.2, 0.5, 0.46, g);
    box(0.1, 0.03, 0.04, 0x406876, 0, 0.35, 0.5, g);
  } else if (species[kind].family === "cap") {
    mesh(
      { kind: "cylinder", top: 0.24, bottom: 0.28, h: 0.65, n: 7 },
      0xf4dab7,
      0,
      0.4,
      0,
      g,
    );
    const cap = mesh(
      { kind: "sphere", r: 0.66, half: true },
      species[kind].color,
      0,
      0.65,
      0,
      g,
    );
    cap.scaling.y = 0.7;
    ball(0.1, 0xffe8bf, -0.27, 0.93, 0.24, g, 0.3);
    ball(0.09, 0xffe8bf, 0.3, 0.9, 0, g, 0.3);
    ball(0.045, 0x493650, -0.1, 0.42, 0.25, g);
    ball(0.045, 0x493650, 0.1, 0.42, 0.25, g);
  } else if(species[kind].family==='beast') {
    ball(.55,species[kind].color,0,.7,0,g,1.05);ball(.45,species[kind].color,0,1.4,.1,g);
    for(const side of [-1,1]){ball(.14,species[kind].color,side*.3,1.93,.08,g,1.8);ball(.08,0x3c324c,side*.18,1.45,.48,g);ball(.2,0x74476c,side*.23,.17,.15,g);ball(.12,species[kind].color,side*.5,.8,.15,g);}
    ball(.13,0xffd4e2,0,1.29,.53,g);
  } else if(species[kind].family==='insect') {
    ball(.5,species[kind].color,0,.85,0,g,.85);box(.2,.08,.95,0x4b345c,0,.98,0,g);
    ball(.32,species[kind].color,0,1.22,.32,g);
    for(const side of [-1,1]){ball(.45,0xe1faff,side*.56,1.05,-.08,g,.2);ball(.06,0x352f49,side*.13,1.23,.62,g);box(.04,.35,.04,0x714967,side*.2,1.62,.29,g);ball(.07,0xffb849,side*.2,1.85,.29,g);}
  } else if(species[kind].family==='wisp') {
    ball(.57,species[kind].color,0,.9,0,g,1.1);mesh({kind:'cone',r:.3,h:.7,n:6},species[kind].color,0,.3,0,g);
    ball(.25,0xebffdf,0,1.0,.5,g,.55);for(const side of [-1,1]){ball(.05,0x433461,side*.14,1.02,.69,g);ball(.16,species[kind].color,side*.63,.9,0,g);}
  } else if(species[kind].family==='golem') {
    box(.85,.9,.6,species[kind].color,0,.9,0,g);box(.7,.55,.55,0xd7cfeb,0,1.65,0,g);
    for(const side of [-1,1]){box(.35,.6,.45,species[kind].color,side*.24,.35,0,g);box(.32,.7,.4,species[kind].color,side*.68,.95,0,g);ball(.07,0xffdc77,side*.18,1.68,.31,g);}
    const core=mesh({kind:'gem',r:.22},0xffdf76,0,1.1,.34,g);core.material=factory.material(0xffdf76,true);
    if(species[kind].boss){g.scaling.setAll(1.8);for(const side of [-1,1])mesh({kind:'cone',r:.2,h:.65,n:4},0xffe398,side*.35,2.08,0,g).rotation.z=side*.4;}
  } else {
    ball(0.45, species[kind].color, 0, 0.65, 0, g, 1.2);
    mesh(
      { kind: "cone", r: 0.34, h: 0.6, n: 5 },
      0x38d771,
      0,
      1.35,
      0,
      g,
    ).rotation.z = 0.4;
    ball(0.13, 0x7d9957, -0.42, 0.63, 0, g);
    ball(0.13, 0x7d9957, 0.42, 0.63, 0, g);
    ball(0.05, 0x3d4c39, -0.15, 0.75, 0.36, g);
    ball(0.05, 0x3d4c39, 0.15, 0.75, 0.36, g);
    ball(0.16, 0x667958, -0.2, 0.14, 0, g);
    ball(0.16, 0x667958, 0.2, 0.14, 0, g);
  }
  return g;
}

/** Area art stays outside rules; identical collision proxies are imported by the server. */
export function buildZoneMap(factory:Primitives,blocking:Obstacle[],zone:import('../game/content').ZoneId) {
 if(zone==='glade'){buildMap(factory,blocking);return;}
 const data=zones[zone],box=factory.box.bind(factory),ball=factory.ball.bind(factory),mesh=factory.mesh.bind(factory);
 blocking.push(...zoneObstacles(zone));
 meadowGround(factory,data.ground,data.path);
 if(zone!=='ruins'&&zone!=='frost')for(const [x,z] of [[-5,-9],[5,10],[-12,6]])flowerPatch(factory,x,z,Math.abs(x+z));
 for(const obstacle of blocking) {
   if(zone==='town')continue;
   const g=factory.group('terrain-prop');g.position.set(obstacle.x,0,obstacle.z);
   if(zone==='orchard'){roundTree(factory,obstacle.x,obstacle.z,0x87c958,.65,true);}
   else if(zone==='marsh'){ball(.7,0x69ad9c,0,.36,0,g,.5);mesh({kind:'cone',r:.32,h:1.5,n:5},0x87f4d3,0,1.1,0,g);}
   else if(zone==='frost'){ball(.8,0x83a4c9,0,.48,0,g,.7);ball(.58,0xe9faff,0,.85,0,g,.35);}
   else {box(1,1.45,1,0x675c93,0,.75,0,g);box(1.13,.14,1.13,0xc6aff1,0,1.5,0,g);}
 }
 for(let i=0;i<30;i++) {
   const angle=i/30*Math.PI*2,x=Math.cos(angle)*18.5,z=Math.sin(angle)*18.5,g=factory.group('area-border');g.position.set(x,0,z);
   if(zone==='ruins'){box(1.8,3,1.8,0x6b5a96,0,1.5,0,g);box(2,.2,2,0xc4a7e9,0,3,0,g);}
   else if(zone==='frost'){mesh({kind:'cone',r:1.9,h:4,n:5},0x88a8cb,0,2,0,g);mesh({kind:'cone',r:.95,h:2,n:5},0xf0faff,0,3.1,0,g);}
   else {roundTree(factory,x,z,zone==='orchard'?0xeeb445:zone==='marsh'?0x35a9a0:0x44b873,1,zone==='orchard');}
 }
 if(zone==='town') {
  townGarden(factory);
  for(const [index,[x,z]] of [[-8,-7],[8,-7],[-8,7],[8,7]].entries()){
   const g=factory.group('storybook-cottage');g.position.set(x,0,z);
   box(2.4,2.0,2.4,0xffedcc,0,1,0,g);
   for(const sx of [-1,1])for(const sz of [-1,1])mesh({kind:'cylinder',top:.12,bottom:.12,h:2,n:10},0xc79564,sx*1.17,1,sz*1.17,g);
   box(2.45,.14,2.45,0xbd8758,0,1.87,0,g);
   const eave=mesh({kind:'cylinder',top:1.62,bottom:1.62,h:.16,n:24},0xb87374,0,2.04,0,g);eave.scaling.z=.94;
   const roof=ball(1.65,index%2?0x81b8cb:0xe88e9c,0,2.23,0,g,.35,10);roof.scaling.z=.94;
   for(const side of [-1,1]){box(.1,1.5,.13,0xc79564,side*.53,.95,1.23,g);box(2.3,.1,.12,0xc79564,0,.4,1.23,g);}
   for(let band=0;band<3;band++){const tile=ball(.27,index%2?0x96c9d6:0xf4abb4,(band-1)*.58,2.44,1.05,g,.18,6);tile.scaling.z=.65;}
   if(index%2===0){
    box(.5,.48,.42,0xffedcc,-.55,2.38,.91,g);
    const hood=ball(.39,0xc97987,-.55,2.66,.91,g,.4,6);hood.scaling.z=.8;
    const attic=mesh({kind:'disc',r:.15,n:16},0xa8e5ef,-.55,2.4,1.13,g);attic.isPickable=false;
   }
   const chimney=mesh({kind:'cylinder',top:.2,bottom:.24,h:1,n:12},0xdfc9ac,.85,2.8,-.3,g);
   chimney.rotation.z=-.08;
   // Arched oak door, circular sky-glass windows and warm timber framing.
   box(.65,1.05,.09,0xa97149,0,.53,1.25,g);ball(.33,0xa97149,0,1.06,1.25,g);
   ball(.04,0xffd377,.19,.65,1.35,g);
   for(const side of [-1,1]){
    const frame=mesh({kind:'disc',r:.35,n:24},0xb47e51,side*.88,1.28,1.25,g);
    const pane=mesh({kind:'disc',r:.26,n:24},0x9ee8f3,side*.88,1.28,1.251,g);
    frame.isPickable=pane.isPickable=false;
    box(.035,.5,.025,0xb47e51,side*.88,1.28,1.28,g);box(.5,.035,.025,0xb47e51,side*.88,1.28,1.28,g);
    box(.52,.09,.2,0xb47e51,side*.88,.94,1.3,g);
    for(let i=0;i<3;i++)ball(.08,0xffa2b5,side*.88+(i-1)*.15,1.04,1.35,g);
   }
   flowerPatch(factory,x-1.9,z+1.8,index);
  }
  const fountain=factory.group('fountain');fountain.position.set(0,0,6);mesh({kind:'cylinder',top:1.7,bottom:1.7,h:.5,n:32},0xf2ce94,0,.25,0,fountain);mesh({kind:'cylinder',top:1.4,bottom:1.4,h:.1,n:32},0x60d9ef,0,.53,0,fountain);box(.3,1.1,.3,0xffe8c0,0,1,0,fountain);ball(.25,0x7cddff,0,1.7,0,fountain);fountainRipples(factory,0,6);}
 if(zone==='marsh')for(const [x,z] of [[-8,-4],[8,6]]){const pool=mesh({kind:'disc',r:3.1,n:18},0x499fe9,x,.02,z);pool.rotation.x=-Math.PI/2;const bridge=box(6.5,.15,.8,0xc99c68,x,.15,z);bridge.isPickable=false;}
 roundedPortal(factory,0,-12.8,data.accent);
}
