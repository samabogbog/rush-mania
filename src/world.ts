import { classes, type ClassId } from "./game/classes";
import "@babylonjs/core/Culling/ray";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Matrix } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Simulation, species } from "./simulation";
import { Primitives } from "./render/primitives";
import {
  buildMap,
  buildPlayer,
  creature,
  type Obstacle,
} from "./render/procedural";
import type { GameWorld } from "./render/contracts";

/** Babylon owns graphics resources; Simulation owns all gameplay and saved state. */
export class World implements GameWorld {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  private readonly factory: Primitives;
  private readonly instrumentation: SceneInstrumentation;
  private readonly player: TransformNode;
  private readonly heroModels = new Map<ClassId, TransformNode>();
  private readonly warnings = new Map<number, Mesh>();
  private readonly monsters = new Map<number, TransformNode>();
  private readonly monsterLabels = new Map<number, HTMLDivElement>();
  private readonly playerLabel: HTMLDivElement;
  private readonly ground: Mesh;
  private readonly selection: Mesh;
  private readonly destination: TransformNode;
  private readonly loot: Mesh[] = [];
  private effects: { mesh: TransformNode; time: number }[] = [];
  private readonly events = new AbortController();
  private lastX = 0;
  private lastZ = 0;
  private ready = true;
  private disposed = false;
  private pausedBeforeLoss = false;
  angle = 0;
  zoom = 1;
  blocking: Obstacle[] = [];

  constructor(
    public sim: Simulation,
    public canvas: HTMLCanvasElement,
    public labels: HTMLDivElement,
  ) {
    this.engine = new Engine(canvas, true, {
      stencil: true,
      preserveDrawingBuffer: false,
    });
    this.engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.7));
    this.scene = new Scene(this.engine);
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = Color4.FromHexString("#4e4abcff");
    this.scene.ambientColor = new Color3(0.08, 0.08, 0.08);
    this.scene.detachControl();
    this.camera = new FreeCamera(
      "isometric-camera",
      new Vector3(0, 29, 24),
      this.scene,
    );
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 150;
    const sky = new HemisphericLight("sky", Vector3.Up(), this.scene);
    sky.intensity = 0.75;
    sky.groundColor = Color3.FromHexString("#9aa568");
    const sun = new DirectionalLight(
      "sun",
      new Vector3(12, -24, -12).normalize(),
      this.scene,
    );
    sun.position.set(-12, 24, 12);
    sun.diffuse = Color3.FromHexString("#fff1ce");
    sun.intensity = 0.45;
    sun.autoUpdateExtends = false;
    sun.orthoLeft = -30;
    sun.orthoRight = 30;
    sun.orthoTop = 30;
    sun.orthoBottom = -30;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 80;
    const shadows = new ShadowGenerator(1024, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.bias = 0.001;
    shadows.normalBias = 0.05;
    this.factory = new Primitives(this.scene);
    this.ground = this.factory.mesh(
      { kind: "plane", w: 80, h: 80 },
      0x79bc64,
      0,
      -0.04,
      0,
    );
    this.ground.rotation.x = -Math.PI / 2;
    buildMap(this.factory, this.blocking);
    sim.obstacles = this.blocking;
    this.factory.mergeStatic(this.ground);
    for (const mesh of this.scene.meshes)
      if (
        mesh !== this.ground &&
        mesh.getBoundingInfo().boundingBox.extendSizeWorld.y > 0.1
      )
        shadows.addShadowCaster(mesh);
    this.player = this.factory.group("hero");
    for (const id of Object.keys(classes) as ClassId[]) {
      const model = this.factory.group(`hero-${id}`);
      buildPlayer(this.factory, model, id);
      this.factory.mergeActor(model);
      model.parent = this.player;
      model.setEnabled(id === sim.save.job);
      this.heroModels.set(id, model);
      for (const mesh of model.getChildMeshes()) shadows.addShadowCaster(mesh);
    }
    this.selection = this.factory.ring(0.94, 0xffe78c);
    this.factory.ring(0.72, 0x91f6ca, this.player);
    this.destination = this.factory.group("destination");
    this.factory.ring(0.33, 0xb0ffdb, this.destination);
    for (const monster of sim.monsters) {
      const actor = creature(this.factory, monster.kind);
      this.factory.mergeActor(actor);
      for (const mesh of actor.getChildMeshes())
        mesh.metadata = { monsterId: monster.id };
      this.monsters.set(monster.id, actor);
      this.warnings.set(monster.id, this.factory.ring(2.2, 0xff564f));
      for (const mesh of actor.getChildMeshes()) shadows.addShadowCaster(mesh);
      const label = document.createElement("div");
      label.className = "world-label monster-label";
      label.dataset.id = String(monster.id);
      label.innerHTML = `<span>${monster.kind}</span><div><i></i></div>`;
      labels.append(label);
      this.monsterLabels.set(monster.id, label);
    }
    this.playerLabel = document.createElement("div");
    this.playerLabel.id = "player-label";
    this.playerLabel.className = "world-label player-label";
    this.playerLabel.innerHTML = "<span>YOU · Sprout</span><div><i></i></div>";
    labels.append(this.playerLabel);
    this.instrumentation = new SceneInstrumentation(this.scene);
    const signal = this.events.signal;
    window.addEventListener("resize", () => this.resize(), { signal });
    canvas.addEventListener("pointerdown", (event) => this.pick(event), {
      signal,
    });
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom = Math.max(
          0.65,
          Math.min(1.6, this.zoom + event.deltaY * 0.0005),
        );
        this.resize();
      },
      { passive: false, signal },
    );
    this.engine.onContextLostObservable.add(() => {
      this.ready = false;
      this.pausedBeforeLoss = sim.paused;
      sim.persist();
      sim.paused = true;
      sim.onEvent("Graphics interrupted. Restoring your adventure…");
    });
    this.engine.onContextRestoredObservable.add(() => {
      this.ready = true;
      sim.paused = this.pausedBeforeLoss;
      sim.onEvent("Graphics restored. Your adventure is ready.");
    });
    this.resize();
    this.update(0);
  }

  get diagnostics() {
    return {
      engine: "Babylon.js",
      drawCalls: this.instrumentation.drawCallsCounter.current,
    };
  }

  private pick(event: PointerEvent) {
    if (!this.ready || this.sim.paused || event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const hit = this.scene.pick(
      event.clientX - rect.left,
      event.clientY - rect.top,
      (mesh) =>
        mesh === this.ground ||
        (mesh.isEnabled() && mesh.metadata?.monsterId !== undefined),
      false,
      this.camera,
    );
    if (!hit?.hit) return;
    const id = hit.pickedMesh?.metadata?.monsterId;
    if (id !== undefined && this.sim.monsters.find((m) => m.id === id)?.alive) {
      this.sim.select(id);
    } else if (hit.pickedPoint) {
      this.sim.target = null;
      this.sim.destination = {
        x: Math.max(-14, Math.min(14, hit.pickedPoint.x)),
        z: Math.max(-13, Math.min(13, hit.pickedPoint.z)),
      };
      this.sim.route = [];
      this.sim.routeTimer = 0;
    }
  }

  resize() {
    if (this.disposed) return;
    this.engine.resize();
    const span = 10.8 * this.zoom;
    const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    this.camera.orthoLeft = -span * aspect;
    this.camera.orthoRight = span * aspect;
    this.camera.orthoTop = span;
    this.camera.orthoBottom = -span;
    this.camera.getProjectionMatrix(true);
  }

  project(x: number, z: number, y = 1.8) {
    const width = this.engine.getRenderWidth(),
      height = this.engine.getRenderHeight();
    const point = Vector3.Project(
      new Vector3(x, y, z),
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(width, height),
    );
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x * rect.width) / width,
      y: rect.top + (point.y * rect.height) / height,
    };
  }

  effect(type: string, x: number, z: number) {
    const mesh = this.factory.group("combat-effect");
    mesh.position.set(x, 0.12, z);
    if (type === "whirl") {
      this.factory.ring(3.6, 0xb298ff, mesh);
      this.factory.ring(2.6, 0xc5ffed, mesh);
    } else if (type === "strike") {
      this.factory.ring(1.2, 0xffd675, mesh);
      this.factory.ball(0.35, 0xffd675, 0, 0.8, 0, mesh).material =
        this.factory.material(0xffd675, true);
    } else this.factory.ring(1, 0xcfff95, mesh);
    this.effects.push({ mesh, time: 0.6 });
  }

  update(dt: number) {
    if (!this.ready || this.disposed) return;
    const moving =
      Math.hypot(this.sim.x - this.lastX, this.sim.z - this.lastZ) > 0.001;
    if (moving)
      this.player.rotation.y = Math.atan2(
        this.sim.x - this.lastX,
        this.sim.z - this.lastZ,
      );
    for (const [id, model] of this.heroModels)
      model.setEnabled(id === this.sim.save.job);
    this.player.rotation.z =
      this.sim.actionTime > 0 ? Math.sin(this.sim.actionTime * 18) * 0.12 : 0;
    this.player.scaling.setAll(this.sim.hurtTime > 0 ? 0.96 : 1);
    this.lastX = this.sim.x;
    this.lastZ = this.sim.z;
    this.player.position.set(
      this.sim.x,
      moving ? Math.abs(Math.sin(this.sim.time * 12)) * 0.06 : 0,
      this.sim.z,
    );
    const focus = new Vector3(this.sim.x * 0.42, 0, this.sim.z * 0.42);
    this.camera.position
      .copyFrom(focus)
      .addInPlace(
        new Vector3(Math.sin(this.angle) * 24, 29, Math.cos(this.angle) * 24),
      );
    this.camera.setTarget(focus);
    this.scene.updateTransformMatrix(true);
    const target = this.sim.monsters.find(
      (m) => m.id === this.sim.target && m.alive,
    );
    this.selection.setEnabled(!!target);
    if (target) this.selection.position.set(target.x, 0.04, target.z);
    this.destination.setEnabled(!!this.sim.destination);
    if (this.sim.destination)
      this.destination.position.set(
        this.sim.destination.x,
        0.05,
        this.sim.destination.z,
      );
    for (const monster of this.sim.monsters) {
      const actor = this.monsters.get(monster.id)!;
      actor.setEnabled(monster.alive);
      actor.position.set(
        monster.x,
        Math.sin(this.sim.time * 2 + monster.id) * 0.05,
        monster.z,
      );
      const warning = this.warnings.get(monster.id)!;
      warning.setEnabled(monster.alive && monster.windup > 0);
      warning.position.set(monster.x, 0.05, monster.z);
      warning.scaling.setAll(0.8 + 0.2 * (1 - monster.windup / 0.65));
      actor.rotation.z =
        monster.stun > 0 ? Math.sin(this.sim.time * 12) * 0.1 : 0;
      const label = this.monsterLabels.get(monster.id)!;
      label.querySelector("span")!.textContent =
        `${monster.kind}${monster.stun > 0 ? " · Stunned" : monster.poison > 0 ? " · Poison" : monster.slow > 0 ? " · Slow" : ""}`;
      const point = this.project(monster.x, monster.z, 1.7);
      label.style.transform = `translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;
      label.style.display = monster.alive ? "" : "none";
      label.classList.toggle("target", this.sim.target === monster.id);
      label.querySelector("i")!.style.width =
        `${(monster.hp / species[monster.kind].hp) * 100}%`;
    }
    const point = this.project(this.sim.x, this.sim.z, 2.5);
    this.playerLabel.style.transform = `translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;
    this.playerLabel.querySelector("i")!.style.width =
      `${(this.sim.save.hp / this.sim.maxHp) * 100}%`;
    while (this.loot.length > this.sim.loot.length) this.loot.pop()!.dispose();
    while (this.loot.length < this.sim.loot.length) {
      const mesh = this.factory.mesh({ kind: "gem", r: 0.16 }, 0xffdf8a);
      mesh.material = this.factory.material(0xffdf8a, true);
      mesh.isPickable = false;
      this.loot.push(mesh);
    }
    this.sim.loot.forEach((drop, index) => {
      this.loot[index].position.set(
        drop.x,
        0.35 + Math.sin(this.sim.time * 4 + index) * 0.1,
        drop.z,
      );
      this.loot[index].rotation.y += dt;
    });
    this.effects = this.effects.filter((effect) => {
      effect.time -= dt;
      effect.mesh.scaling.scaleInPlace(1 + dt * 1.5);
      effect.mesh.rotation.y += dt * 3;
      if (effect.time <= 0) {
        effect.mesh.dispose();
        return false;
      }
      return true;
    });
    this.scene.render();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this.instrumentation.dispose();
    this.scene.dispose();
    this.engine.dispose();
    for (const label of this.monsterLabels.values()) label.remove();
    this.playerLabel.remove();
  }
}
