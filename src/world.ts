import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Simulation, species, type Kind } from "./simulation";
const mats = new Map<number, T.MeshLambertMaterial>();
function mat(color: number) {
  if (!mats.has(color))
    mats.set(color, new T.MeshLambertMaterial({ color, flatShading: true }));
  return mats.get(color)!;
}
function mesh(
  geo: T.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  parent?: T.Object3D,
) {
  const m: T.Mesh<T.BufferGeometry, T.Material> = new T.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}
function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  p: T.Object3D,
) {
  return mesh(new T.BoxGeometry(w, h, d), color, x, y, z, p);
}
function ball(
  r: number,
  color: number,
  x: number,
  y: number,
  z: number,
  p: T.Object3D,
  s = 1,
) {
  const m = mesh(new T.IcosahedronGeometry(r, 1), color, x, y, z, p);
  m.scale.y = s;
  return m;
}
function ring(radius: number, color: number, p: T.Object3D) {
  const m = new T.Mesh(
    new T.RingGeometry(radius - 0.05, radius, 48),
    new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: T.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.045;
  p.add(m);
  return m;
}
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  player = new T.Group();
  monsters = new Map<number, T.Group>();
  ray = new T.Raycaster();
  ground: T.Mesh;
  selection: T.Mesh;
  destination = new T.Group();
  effects: { mesh: T.Object3D; time: number }[] = [];
  lootGroup = new T.Group();
  angle = 0;
  zoom = 1;
  lastX = 0;
  lastZ = 0;
  labels: HTMLDivElement;
  blocking: { x: number; z: number; r: number }[] = [];
  ready = true;
  constructor(
    public sim: Simulation,
    public canvas: HTMLCanvasElement,
    public labelRoot: HTMLDivElement,
  ) {
    this.labels = labelRoot;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.setClearColor(0x4e4abc);
    this.scene.background = new T.Color(0x4e4abc);
    this.scene.fog = new T.Fog(0x4e4abc, 40, 75);
    this.scene.add(new T.HemisphereLight(0xffffff, 0x9aa568, 2));
    const sun = new T.DirectionalLight(0xfff1ce, 2.6);
    sun.position.set(-12, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);
    this.ground = mesh(
      new T.PlaneGeometry(80, 80),
      0x79bc64,
      0,
      -0.04,
      0,
      this.scene,
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.buildMap();
    this.sim.obstacles = this.blocking;
    this.batchStatic();
    this.buildPlayer();
    this.scene.add(this.player);
    this.selection = ring(0.94, 0xffe78c, this.scene);
    ring(0.72, 0x91f6ca, this.player);
    ring(0.33, 0xb0ffdb, this.destination);
    this.scene.add(this.destination);
    this.scene.add(this.lootGroup);
    for (const m of sim.monsters) {
      const g = this.creature(m.kind);
      g.userData.id = m.id;
      this.monsters.set(m.id, g);
      this.scene.add(g);
      const label = document.createElement("div");
      label.className = "world-label monster-label";
      label.dataset.id = String(m.id);
      label.innerHTML = `<span>${m.kind}</span><div><i></i></div>`;
      this.labels.append(label);
    }
    const name = document.createElement("div");
    name.id = "player-label";
    name.className = "world-label player-label";
    name.innerHTML = "<span>YOU · Sprout</span><div><i></i></div>";
    this.labels.append(name);
    window.addEventListener("resize", () => this.resize());
    this.resize();
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ready = false;
      this.sim.paused = true;
      this.sim.onEvent(
        "Graphics interrupted. Reload to resume your saved adventure.",
      );
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (this.sim.paused || e.button !== 0) return;
      this.ray.setFromCamera(
        new T.Vector2(
          (e.clientX / innerWidth) * 2 - 1,
          (-e.clientY / innerHeight) * 2 + 1,
        ),
        this.camera,
      );
      const hits = this.ray.intersectObjects([...this.monsters.values()], true);
      for (const hit of hits) {
        let o: T.Object3D | null = hit.object;
        while (o && o.userData.id === undefined) o = o.parent;
        if (o && sim.monsters[o.userData.id].alive) {
          sim.select(o.userData.id);
          return;
        }
      }
      const hit = this.ray.intersectObject(this.ground)[0];
      if (hit) {
        sim.target = null;
        sim.destination = {
          x: Math.max(-14, Math.min(14, hit.point.x)),
          z: Math.max(-13, Math.min(13, hit.point.z)),
        };
      }
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom = Math.max(
          0.65,
          Math.min(1.6, this.zoom + e.deltaY * 0.0005),
        );
        this.resize();
      },
      { passive: false },
    );
  }
  batchStatic() {
    this.scene.updateMatrixWorld(true);
    const groups = new Map<T.Material, T.Mesh[]>();
    this.scene.traverse((o) => {
      if (
        o instanceof T.Mesh &&
        o !== this.ground &&
        !Array.isArray(o.material)
      ) {
        const list = groups.get(o.material) || [];
        list.push(o);
        groups.set(o.material, list);
      }
    });
    for (const [material, objects] of groups) {
      const geometries = objects.map((o) =>
        o.geometry.clone().applyMatrix4(o.matrixWorld),
      );
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        const batch = new T.Mesh(merged, material);
        batch.castShadow = true;
        batch.receiveShadow = true;
        this.scene.add(batch);
        objects.forEach((o) => {
          o.parent?.remove(o);
          o.geometry.dispose();
        });
      }
      geometries.forEach((g) => g.dispose());
    }
  }
  buildMap() {
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
        const t = mesh(new T.PlaneGeometry(2, 2), c, x, 0, z, this.scene);
        t.rotation.x = -Math.PI / 2;
      }
    }
    const path = mesh(
      new T.PlaneGeometry(3.3, 34),
      0xc6ba86,
      0,
      0.007,
      0,
      this.scene,
    );
    path.rotation.x = -Math.PI / 2;
    const p2 = mesh(
      new T.PlaneGeometry(33, 2.8),
      0xc6ba86,
      0,
      0.01,
      2,
      this.scene,
    );
    p2.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 48; i++) {
      const x = (rand() - 0.5) * 28,
        z = (rand() - 0.5) * 27;
      if (Math.abs(x) < 2 || Math.abs(z - 2) < 1.8) continue;
      const m = mesh(
        new T.CircleGeometry(0.2 + rand() * 0.5, 5),
        0xd6ceac,
        x,
        0.015,
        z,
        this.scene,
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
          const g = new T.Group();
          g.position.set(bx, 0, bz);
          this.scene.add(g);
          for (let k = 0; k < 3; k++) {
            const grass = mesh(
              new T.ConeGeometry(0.28, 0.9 + rand() * 0.25, 5),
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
      const group = new T.Group();
      group.position.set(x, 0, z);
      box(1.05, 1.05, 1.05, 0x9295c8, 0, 0.55, 0, group);
      box(0.87, 0.13, 0.87, 0xd3d6ff, 0, 1.13, 0, group);
      box(0.46, 0.035, 0.46, 0x656ab0, 0, 1.21, 0, group);
      box(0.12, 0.3, 0.03, 0xc3caff, 0, 0.7, 0.535, group);
      this.scene.add(group);
      this.blocking.push({ x, z, r: 0.72 });
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
      const g = new T.Group();
      g.position.set(x, 0, z);
      box(0.3, 1.8, 0.3, 0x9b603b, 0, 0.9, 0, g);
      ball(1.7, 0x38a875, 0, 2.7, 0, g);
      ball(1.25, 0x7dd457, 0.7, 2.8, 0, g);
      this.scene.add(g);
    }
    for (const [x, z] of [
      [-12, -9],
      [12, 10],
      [-10, 10],
      [10, -12],
    ]) {
      const g = new T.Group();
      g.position.set(x, 0, z);
      for (let i = 0; i < 3; i++) {
        const c = mesh(
          new T.ConeGeometry(0.3, 0.95, 5),
          0x79dfe7,
          (i - 1) * 0.35,
          0.5,
          0,
          g,
        );
        c.rotation.z = (i - 1) * 0.25;
      }
      this.scene.add(g);
    }
    // Starting camp: portal, market stall, noticeboard and a lantern-lit path.
    const portal = new T.Group();
    portal.position.set(0, 0, -14.8);
    box(0.55, 3, 0.6, 0x8877a7, -1.25, 1.5, 0, portal);
    box(0.55, 3, 0.6, 0x8877a7, 1.25, 1.5, 0, portal);
    box(3.2, 0.5, 0.6, 0xa292c3, 0, 3, 0, portal);
    const glow = new T.Mesh(
      new T.CircleGeometry(1.18, 32),
      new T.MeshBasicMaterial({
        color: 0x8d75ed,
        transparent: true,
        opacity: 0.5,
        side: T.DoubleSide,
      }),
    );
    glow.position.y = 1.55;
    portal.add(glow);
    this.scene.add(portal);
    const stall = new T.Group();
    stall.position.set(-4, 0, -14);
    box(2.2, 0.8, 1, 0x8f6372, 0, 0.45, 0, stall);
    box(0.12, 2, 0.12, 0x9f8594, -1, 1, 0, stall);
    box(0.12, 2, 0.12, 0x9f8594, 1, 1, 0, stall);
    box(2.7, 0.2, 1.5, 0xe6c580, 0, 2, 0, stall);
    for (let i = 0; i < 4; i++)
      ball(0.14, 0xf08ba1, -0.7 + i * 0.45, 0.95, 0, stall);
    this.scene.add(stall);
    for (const [x, z] of [
      [-2, -12],
      [2, -12],
      [-13, 2],
      [13, 2],
    ]) {
      box(0.1, 1.8, 0.1, 0x94849a, x, 0.9, z, this.scene);
      const lantern = ball(0.23, 0xffd486, x, 1.9, z, this.scene);
      lantern.material = new T.MeshBasicMaterial({ color: 0xffd486 });
    }
  }
  buildPlayer() {
    const g = this.player;
    box(0.62, 0.7, 0.38, 0x9a56ef, 0, 0.95, 0, g);
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
    box(0.1, 0.95, 0.07, 0xdbe9ed, 0.65, 0.92, 0.1, g).rotation.z = -0.3;
    box(0.4, 0.1, 0.14, 0xffc974, 0.51, 0.5, 0.1, g);
    box(0.11, 0.27, 0.1, 0x604361, 0.5, 0.35, 0.1, g);
    box(0.03, 0.07, 0.03, 0x33263a, -0.14, 1.64, 0.39, g);
    box(0.03, 0.07, 0.03, 0x33263a, 0.14, 1.64, 0.39, g);
    const cape = box(0.63, 0.8, 0.06, 0x843bc8, 0, 0.94, -0.26, g);
    cape.rotation.x = -0.15;
  }
  creature(kind: Kind) {
    const g = new T.Group();
    if (kind === "Dewdrop") {
      const body = ball(0.57, species[kind].color, 0, 0.5, 0, g, 0.82);
      body.scale.x = 1.12;
      ball(0.16, 0xc8fff1, -0.2, 0.7, 0.3, g, 0.4);
      ball(0.06, 0x273747, -0.2, 0.5, 0.46, g);
      ball(0.06, 0x273747, 0.2, 0.5, 0.46, g);
      box(0.1, 0.03, 0.04, 0x406876, 0, 0.35, 0.5, g);
    } else if (kind === "Wildcap") {
      mesh(new T.CylinderGeometry(0.24, 0.28, 0.65, 7), 0xf4dab7, 0, 0.4, 0, g);
      const cap = mesh(
        new T.SphereGeometry(0.66, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        0xff597a,
        0,
        0.65,
        0,
        g,
      );
      cap.scale.y = 0.7;
      ball(0.1, 0xffe8bf, -0.27, 0.93, 0.24, g, 0.3);
      ball(0.09, 0xffe8bf, 0.3, 0.9, 0, g, 0.3);
      ball(0.045, 0x493650, -0.1, 0.42, 0.25, g);
      ball(0.045, 0x493650, 0.1, 0.42, 0.25, g);
    } else {
      ball(0.45, 0xa2e534, 0, 0.65, 0, g, 1.2);
      mesh(
        new T.ConeGeometry(0.34, 0.6, 5),
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
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h);
    const span = 10.8 * this.zoom;
    this.camera.left = (-span * w) / h;
    this.camera.right = (span * w) / h;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.near = 0.1;
    this.camera.far = 150;
    this.camera.updateProjectionMatrix();
  }
  project(x: number, z: number, y = 1.8) {
    const v = new T.Vector3(x, y, z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * innerWidth,
      y: (-0.5 * v.y + 0.5) * innerHeight,
    };
  }
  effect(type: string, x: number, z: number) {
    const g = new T.Group();
    g.position.set(x, 0.12, z);
    if (type === "whirl") {
      ring(3.6, 0xb298ff, g);
      ring(2.6, 0xc5ffed, g);
    } else if (type === "strike") {
      ring(1.2, 0xffd675, g);
      const b = ball(0.35, 0xffd675, 0, 0.8, 0, g);
      b.material = new T.MeshBasicMaterial({ color: 0xffd675 });
    } else {
      ring(1, 0xcfff95, g);
    }
    this.scene.add(g);
    this.effects.push({ mesh: g, time: 0.6 });
  }
  update(dt: number) {
    if (!this.ready) return;
    const moving =
      Math.hypot(this.sim.x - this.lastX, this.sim.z - this.lastZ) > 0.001;
    if (moving) {
      this.player.rotation.y = Math.atan2(
        this.sim.x - this.lastX,
        this.sim.z - this.lastZ,
      );
    }
    this.lastX = this.sim.x;
    this.lastZ = this.sim.z;
    this.player.position.set(
      this.sim.x,
      moving ? Math.abs(Math.sin(this.sim.time * 12)) * 0.06 : 0,
      this.sim.z,
    );
    // Soft follow keeps the battlefield readable while preserving a stable top-down view.
    const focus = new T.Vector3(this.sim.x * 0.42, 0, this.sim.z * 0.42);
    const offset = new T.Vector3(
      Math.sin(this.angle) * 24,
      29,
      Math.cos(this.angle) * 24,
    );
    this.camera.position.copy(focus).add(offset);
    this.camera.lookAt(focus);
    this.camera.updateMatrixWorld();
    const target = this.sim.monsters.find(
      (m) => m.id === this.sim.target && m.alive,
    );
    this.selection.visible = !!target;
    if (target) this.selection.position.set(target.x, 0.04, target.z);
    this.destination.visible = !!this.sim.destination;
    if (this.sim.destination)
      this.destination.position.set(
        this.sim.destination.x,
        0.05,
        this.sim.destination.z,
      );
    for (const m of this.sim.monsters) {
      const g = this.monsters.get(m.id)!;
      g.visible = m.alive;
      g.position.set(m.x, Math.sin(this.sim.time * 2 + m.id) * 0.05, m.z);
      const label = this.labels.querySelector(
        `[data-id="${m.id}"]`,
      ) as HTMLDivElement;
      const p = this.project(m.x, m.z, 1.7);
      label.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      label.style.display = m.alive ? "" : "none";
      label.classList.toggle("target", this.sim.target === m.id);
      (label.querySelector("i") as HTMLElement).style.width =
        `${(m.hp / species[m.kind].hp) * 100}%`;
    }
    const l = document.getElementById("player-label")!;
    const pp = this.project(this.sim.x, this.sim.z, 2.5);
    l.style.transform = `translate(${pp.x}px,${pp.y}px) translate(-50%,-100%)`;
    l.querySelector("i")!.style.width =
      `${(this.sim.save.hp / this.sim.maxHp) * 100}%`;

    while (this.lootGroup.children.length > this.sim.loot.length) {
      const child = this.lootGroup.children.pop() as T.Mesh;
      child.parent = null;
      child.geometry.dispose();
    }
    while (this.lootGroup.children.length < this.sim.loot.length) {
      const c = mesh(
        new T.OctahedronGeometry(0.16),
        0xffdf8a,
        0,
        0.3,
        0,
        this.lootGroup,
      );
      c.material = new T.MeshBasicMaterial({ color: 0xffdf8a });
    }
    this.sim.loot.forEach((l, i) => {
      const c = this.lootGroup.children[i];
      c.position.set(l.x, 0.35 + Math.sin(this.sim.time * 4 + i) * 0.1, l.z);
      c.rotation.y += dt;
    });
    this.effects = this.effects.filter((e) => {
      e.time -= dt;
      e.mesh.scale.multiplyScalar(1 + dt * 1.5);
      e.mesh.rotation.y += dt * 3;
      if (e.time <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            if (o.material instanceof T.MeshBasicMaterial) o.material.dispose();
          }
        });
        return false;
      }
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }
}
