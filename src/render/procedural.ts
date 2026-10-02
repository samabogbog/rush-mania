import { classes, type ClassId } from "../game/classes";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Primitives } from "./primitives";
import { species, type Kind } from "../simulation";
import { zones } from "../game/content";
import {zoneObstacles} from "../game/map-data";
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
  // Geometric moonlit ground, worn paths and luminous grass beds.
  for (let x = -19; x <= 19; x += 2) {
    for (let z = -18; z <= 18; z += 2) {
      const c = [0x80c46b, 0x86ca70, 0x8bcd75, 0x82c268][
        Math.floor(rand() * 4)
      ];
      const t = mesh({ kind: "plane", w: 2, h: 2 }, c, x, 0, z, undefined);
      t.rotation.x = -Math.PI / 2;
    }
  }
  const path = mesh(
    { kind: "plane", w: 3.3, h: 34 },
    0xc6ba86,
    0,
    0.007,
    0,
    undefined,
  );
  path.rotation.x = -Math.PI / 2;
  const p2 = mesh(
    { kind: "plane", w: 33, h: 2.8 },
    0xc6ba86,
    0,
    0.01,
    2,
    undefined,
  );
  p2.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 48; i++) {
    const x = (rand() - 0.5) * 28,
      z = (rand() - 0.5) * 27;
    if (Math.abs(x) < 2 || Math.abs(z - 2) < 1.8) continue;
    const m = mesh(
      { kind: "disc", r: 0.2 + rand() * 0.5, n: 5 },
      0xd6ceac,
      x,
      0.015,
      z,
      undefined,
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rand() * 6;
  }
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
        const bx = x + xx * 0.65,
          bz = z + zz * 0.65;
        const g = factory.group();
        g.position.set(bx, 0, bz);
        for (let k = 0; k < 3; k++) {
          const grass = mesh(
            { kind: "cone", r: 0.28, h: 0.9 + rand() * 0.25, n: 5 },
            xx % 2 ? 0x29da74 : 0x65f083,
            (rand() - 0.5) * 0.3,
            0.5,
            (rand() - 0.5) * 0.3,
            g,
          );
          grass.rotation.z = (rand() - 0.5) * 0.3;
        }
      }
  }
  const wall = (x: number, z: number) => {
    const group = factory.group();
    group.position.set(x, 0, z);
    box(1.05, 1.05, 1.05, 0x9295c8, 0, 0.55, 0, group);
    box(0.87, 0.13, 0.87, 0xd3d6ff, 0, 1.13, 0, group);
    box(0.46, 0.035, 0.46, 0x656ab0, 0, 1.21, 0, group);
    box(0.12, 0.3, 0.03, 0xc3caff, 0, 0.7, 0.535, group);
    blocking.push({ x, z, r: 0.72 });
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
    const g = factory.group();
    g.position.set(x, 0, z);
    box(0.3, 1.8, 0.3, 0x9b603b, 0, 0.9, 0, g);
    ball(1.7, 0x38a875, 0, 2.7, 0, g);
    ball(1.25, 0x7dd457, 0.7, 2.8, 0, g);
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
  const portal = factory.group();
  portal.position.set(0, 0, -14.8);
  box(0.55, 3, 0.6, 0x8877a7, -1.25, 1.5, 0, portal);
  box(0.55, 3, 0.6, 0x8877a7, 1.25, 1.5, 0, portal);
  box(3.2, 0.5, 0.6, 0xa292c3, 0, 3, 0, portal);
  const glow = mesh(
    { kind: "disc", r: 1.18, n: 32 },
    0x8d75ed,
    0,
    1.55,
    0,
    portal,
  );
  glow.material = factory.material(0x8d75ed, true, 0.5);
  const stall = factory.group();
  stall.position.set(-4, 0, -14);
  box(2.2, 0.8, 1, 0x8f6372, 0, 0.45, 0, stall);
  box(0.12, 2, 0.12, 0x9f8594, -1, 1, 0, stall);
  box(0.12, 2, 0.12, 0x9f8594, 1, 1, 0, stall);
  box(2.7, 0.2, 1.5, 0xe6c580, 0, 2, 0, stall);
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
  box(0.62, 0.7, 0.38, classes[job].color, 0, 0.95, 0, g);
  box(0.72, 0.13, 0.42, 0xffcb75, 0, 0.72, 0, g);
  ball(0.42, 0xf5c5a6, 0, 1.65, 0, g);
  ball(0.43, 0x493650, 0, 1.9, -0.03, g, 0.65);
  box(0.43, 0.2, 0.15, 0x55405b, 0, 1.82, 0.32, g);
  box(0.23, 0.46, 0.25, 0x51446b, -0.19, 0.35, 0, g);
  box(0.23, 0.46, 0.25, 0x51446b, 0.19, 0.35, 0, g);
  box(0.29, 0.18, 0.38, 0x493851, -0.19, 0.1, 0.06, g);
  box(0.29, 0.18, 0.38, 0x493851, 0.19, 0.1, 0.06, g);
  ball(0.16, 0xf5c5a6, -0.47, 1, 0.02, g);
  ball(0.16, 0xf5c5a6, 0.47, 1, 0.02, g);
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
  box(0.03, 0.07, 0.03, 0x33263a, -0.14, 1.64, 0.39, g);
  box(0.03, 0.07, 0.03, 0x33263a, 0.14, 1.64, 0.39, g);
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
 for(let x=-18;x<=18;x+=2)for(let z=-18;z<=18;z+=2){const tile=mesh({kind:'plane',w:2,h:2},(x+z)%4?data.ground:data.ground^0x040a05,x,.002,z);tile.rotation.x=-Math.PI/2;}
 for(const [w,h,x,z] of [[3.4,30,0,0],[30,3,0,2]]){const path=mesh({kind:'plane',w,h},data.path,x,.012,z);path.rotation.x=-Math.PI/2;}
 for(const obstacle of blocking) {
   if(zone==='town')continue;
   const g=factory.group('terrain-prop');g.position.set(obstacle.x,0,obstacle.z);
   if(zone==='orchard'){box(.22,1.4,.22,0x9c6138,0,.7,0,g);ball(.8,0x78ca46,0,1.8,0,g);ball(.15,0xff5e68,.5,1.6,.3,g);ball(.15,0xff7c45,-.4,1.9,.2,g);}
   else if(zone==='marsh'){ball(.7,0x69ad9c,0,.36,0,g,.5);mesh({kind:'cone',r:.32,h:1.5,n:5},0x87f4d3,0,1.1,0,g);}
   else if(zone==='frost'){ball(.8,0x83a4c9,0,.48,0,g,.7);ball(.58,0xe9faff,0,.85,0,g,.35);}
   else {box(1,1.45,1,0x675c93,0,.75,0,g);box(1.13,.14,1.13,0xc6aff1,0,1.5,0,g);}
 }
 for(let i=0;i<30;i++) {
   const angle=i/30*Math.PI*2,x=Math.cos(angle)*18.5,z=Math.sin(angle)*18.5,g=factory.group('area-border');g.position.set(x,0,z);
   if(zone==='ruins'){box(1.8,3,1.8,0x6b5a96,0,1.5,0,g);box(2,.2,2,0xc4a7e9,0,3,0,g);}
   else if(zone==='frost'){mesh({kind:'cone',r:1.9,h:4,n:5},0x88a8cb,0,2,0,g);mesh({kind:'cone',r:.95,h:2,n:5},0xf0faff,0,3.1,0,g);}
   else {box(.28,2,.28,0x96603d,0,1,0,g);ball(1.35,zone==='orchard'?0xeeb445:zone==='marsh'?0x35a9a0:0x44b873,0,2.7,0,g);ball(.9,data.accent,.65,2.6,0,g);}
 }
 if(zone==='town') {
  for(const [x,z] of [[-8,-7],[8,-7],[-8,7],[8,7]]){const g=factory.group('cottage');g.position.set(x,0,z);box(3.3,2.3,3,0xffebc9,0,1.15,0,g);box(3.7,.3,3.5,0xe66b85,0,2.45,0,g);mesh({kind:'cone',r:2.65,h:1.5,n:4},0xf3979c,0,3.1,0,g).rotation.y=Math.PI/4;box(.8,1.3,.07,0x96643e,0,.65,1.55,g);box(.65,.65,.08,0x78d6ef,-1,1.3,1.55,g);box(.65,.65,.08,0x78d6ef,1,1.3,1.55,g);}
  const fountain=factory.group('fountain');fountain.position.set(0,0,6);mesh({kind:'cylinder',top:1.7,bottom:1.7,h:.5,n:12},0xf2ce94,0,.25,0,fountain);mesh({kind:'cylinder',top:1.4,bottom:1.4,h:.1,n:12},0x60d9ef,0,.53,0,fountain);box(.3,1.1,.3,0xffe8c0,0,1,0,fountain);ball(.25,0x7cddff,0,1.7,0,fountain);}
 if(zone==='marsh')for(const [x,z] of [[-8,-4],[8,6]]){const pool=mesh({kind:'disc',r:3.1,n:18},0x499fe9,x,.02,z);pool.rotation.x=-Math.PI/2;const bridge=box(6.5,.15,.8,0xc99c68,x,.15,z);bridge.isPickable=false;}
 const portal=factory.group('travel-portal');portal.position.set(0,0,-12.8);box(.4,2.8,.5,0x9670c2,-1.2,1.4,0,portal);box(.4,2.8,.5,0x9670c2,1.2,1.4,0,portal);box(3,.35,.5,0xd7b4f7,0,2.9,0,portal);const light=mesh({kind:'disc',r:1.1,n:24},data.accent,0,1.5,0,portal);light.material=factory.material(data.accent,true,.8);
}
