import { ModelLibrary } from "./render/model-library";
import { zones, type ZoneId } from "./game/content";
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
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Simulation, species } from "./simulation";
import { Primitives } from "./render/primitives";
import {
  buildZoneMap,
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
  private readonly models: ModelLibrary;
  private bounds={left:0,top:0,width:1,height:1};
  private readonly identityMatrix=Matrix.Identity();
  private labelClock=0;
  private readonly labelNames=new Map<number,string>();
  private readonly labelBars=new Map<number,HTMLElement>();
  private readonly labelSpans=new Map<number,HTMLElement>();
  private outfitKey="";private outfit:TransformNode[]=[];
  private readonly shadows: ShadowGenerator;
  private currentZone: ZoneId | null=null;
  private mapMeshes: Mesh[]=[];
  private mapNodes: TransformNode[]=[];
  private zoneLabels: {label:HTMLDivElement;x:number;z:number}[]=[];
  private readonly instrumentation: SceneInstrumentation;
  private readonly player: TransformNode;
  private readonly heroModels = new Map<ClassId, TransformNode>();
  private readonly warnings = new Map<number, {circle:Mesh;line:Mesh;cone:Mesh}>();
  private readonly monsters = new Map<number, TransformNode>();
  private readonly monsterLabels = new Map<number, HTMLDivElement>();
  private readonly playerLabel: HTMLDivElement;
  private readonly ground: Mesh;
  private readonly selection: Mesh;
  private readonly destination: TransformNode;
  private readonly loot: Mesh[] = [];
  private effects: { mesh: TransformNode; time: number }[] = [];
  private readonly events = new AbortController();
  private readonly peers = new Map<string, {node: TransformNode; label: HTMLDivElement; job:ClassId}>();
  private lastX = 0;
  private lastZ = 0;
  private ready = true;
  private disposed = false;
  private pausedBeforeLoss = false;
  private visualTime=0;
  private lastFrame = performance.now();
  private frameTimes: number[] = [];
  quality: "auto"|"high"|"low"=(localStorage.getItem("mossvale-quality") as "auto"|"high"|"low")||"auto";
  private autoReduced=false;
  angle = 0;
  zoom = 1;
  blocking: Obstacle[] = [];

  constructor(
    public sim: Simulation,
    public canvas: HTMLCanvasElement,
    public labels: HTMLDivElement,
  ) {
    this.engine = new Engine(canvas, this.quality!=="low", {
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
    const shadows = this.shadows = new ShadowGenerator(1024, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.bias = 0.001;
    shadows.normalBias = 0.05;
    this.factory = new Primitives(this.scene);
    this.models = new ModelLibrary(this.scene);
    this.ground = this.factory.mesh(
      { kind: "plane", w: 80, h: 80 },
      0x79bc64,
      0,
      -0.04,
      0,
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.rebuildMap();
    this.player = this.factory.group("hero");
    for (const id of Object.keys(classes) as ClassId[]) {
      const model = this.factory.group(`hero-${id}`);
      buildPlayer(this.factory, model, id);
      this.factory.mergeActor(model);
      model.parent = this.player;
      model.setEnabled(id === sim.save.job);
      this.heroModels.set(id, model);
      this.models.attach(id,model,root=>{for(const mesh of root.getChildMeshes())this.shadows.addShadowCaster(mesh);});
      for (const mesh of model.getChildMeshes()) shadows.addShadowCaster(mesh);
    }
    this.selection = this.factory.ring(0.94, 0xffe78c);
    this.factory.ring(0.72, 0x91f6ca, this.player);
    this.destination = this.factory.group("destination");
    this.factory.ring(0.33, 0xb0ffdb, this.destination);
    this.rebuildMonsters();
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
    this.setQuality(this.quality);
    this.resize();
    this.update(0);
  }

  private rebuildMap() {
    for(const mesh of this.mapMeshes){this.shadows.removeShadowCaster(mesh);mesh.dispose();}
    for(const node of this.mapNodes)node.dispose();
    for(const entry of this.zoneLabels)entry.label.remove();this.zoneLabels=[];
    const oldMeshes=new Set(this.scene.meshes),oldNodes=new Set(this.scene.transformNodes);
    this.blocking=[];this.currentZone=this.sim.save.zone;
    this.ground.material=this.factory.material(zones[this.currentZone].ground);
    buildZoneMap(this.factory,this.blocking,this.currentZone);this.sim.obstacles=this.blocking;
    const included=new Set(this.scene.meshes.filter((m):m is Mesh=>m instanceof Mesh&&!oldMeshes.has(m)));
    this.factory.mergeStatic(this.ground,included);
    for(const npc of zones[this.currentZone].npcs) {
      const node=this.factory.group('npc-'+npc.id);buildPlayer(this.factory,node,npc.panel==='forge'?'swordsman':npc.panel==='journal'?'mage':'archer');this.factory.mergeActor(node);node.position.set(npc.x,0,npc.z);
      for(const mesh of node.getChildMeshes())mesh.metadata={npcId:npc.id};
      const label=document.createElement('div');label.className='world-label npc-label';label.textContent=npc.name;this.labels.append(label);this.zoneLabels.push({label,x:npc.x,z:npc.z});
    }
    const portalLabel=document.createElement('div');portalLabel.className='world-label npc-label';portalLabel.textContent='NORTH PORTAL · Open Map to travel';this.labels.append(portalLabel);this.zoneLabels.push({label:portalLabel,x:0,z:-12.5});
    this.mapMeshes=this.scene.meshes.filter((m):m is Mesh=>m instanceof Mesh&&!oldMeshes.has(m));
    this.mapNodes=this.scene.transformNodes.filter(n=>!oldNodes.has(n));
    for(const mesh of this.mapMeshes)if(mesh.getBoundingInfo().boundingBox.extendSizeWorld.y>.1)this.shadows.addShadowCaster(mesh);
  }
  private rebuildMonsters() {
    for(const node of this.monsters.values()){for(const mesh of node.getChildMeshes())this.shadows.removeShadowCaster(mesh);node.dispose();}
    for(const warning of this.warnings.values())Object.values(warning).forEach(m=>m.dispose());
    for(const label of this.monsterLabels.values())label.remove();
    this.monsters.clear();this.warnings.clear();this.monsterLabels.clear();this.labelNames.clear();this.labelBars.clear();this.labelSpans.clear();
    for(const monster of this.sim.monsters) {
      const actor=creature(this.factory,monster.kind);this.factory.mergeActor(actor);
      for(const mesh of actor.getChildMeshes()){mesh.metadata={monsterId:monster.id};this.shadows.addShadowCaster(mesh);}
      this.monsters.set(monster.id,actor);
      this.models.attach(monster.kind,actor,root=>{for(const mesh of root.getChildMeshes()){mesh.metadata={monsterId:monster.id};this.shadows.addShadowCaster(mesh);}});
      const spec=species[monster.kind],range=spec.boss?6:spec.range;
      const circle=this.factory.ring(spec.boss?3.5:range,0xff564f),line=this.factory.mesh({kind:'plane',w:1.8,h:range},0xff514f),cone=new Mesh('cone-warning',this.scene);
      line.rotation.x=-Math.PI/2;line.material=this.factory.material(0xff514f,true,.3);line.isPickable=false;
      const positions=[0,0,0],indices:number[]=[];for(let i=0;i<=24;i++){const angle=-.86+1.72*i/24;positions.push(Math.sin(angle)*(spec.boss?4:range),0,Math.cos(angle)*(spec.boss?4:range));if(i<24)indices.push(0,i+2,i+1);}
      const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=[];VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(cone);cone.material=this.factory.material(0xff514f,true,.3);cone.isPickable=false;
      this.warnings.set(monster.id,{circle,line,cone});
      const label=document.createElement('div');label.className='world-label monster-label';label.dataset.id=String(monster.id);label.innerHTML='<span></span><div><i></i></div>';this.labels.append(label);this.monsterLabels.set(monster.id,label);this.labelBars.set(monster.id,label.querySelector("i")!);this.labelSpans.set(monster.id,label.querySelector("span")!);
    }
  }

  setQuality(quality:"auto"|"high"|"low") {this.quality=quality;this.autoReduced=false;this.frameTimes=[];this.lastFrame=performance.now();localStorage.setItem("mossvale-quality",quality);this.applyQuality();this.resize();}
  private applyQuality(){const low=this.quality==='low'||this.autoReduced;this.scene.shadowsEnabled=!low;this.models.setLowQuality(low);this.shadows.getShadowMap()?.resize(this.quality==='high'?1024:512);}

  private updateOutfit() {
    const model=this.heroModels.get(this.sim.save.job)!,nodes=model.getChildTransformNodes(false),spine=nodes.find(n=>n.name.endsWith('-spine')),hand=nodes.find(n=>n.name.endsWith('-right-hand'));
    if(!spine||!hand)return;
    const key=this.sim.save.job+spine.uniqueId+JSON.stringify(this.sim.save.equipped)+this.sim.refinement;if(key===this.outfitKey)return;this.outfitKey=key;
    this.outfit.splice(0).forEach(n=>n.dispose());
    const equipped=(slot:string)=>this.sim.save.items.find(i=>i.id===this.sim.save.equipped[slot as keyof typeof this.sim.save.equipped]);
    const armor=equipped('armor'),accessory=equipped('accessory'),weapon=equipped('weapon');
    if(armor){const coat=this.factory.group('equipped-armor');coat.parent=spine;this.outfit.push(coat);const color=armor.gearId==='root-plate'?0x6ad074:armor.gearId?.includes('wisp')||armor.gearId?.includes('shade')?0xab77e8:armor.gearId==='shell-vest'?0x50cdcc:0xf8b857;
      this.factory.box(.66,.48,.12,color,0,-.02,.25,coat);this.factory.ball(.12,0xffe477,0,.1,.33,coat);}
    if(accessory){const charm=this.factory.group('equipped-charm');charm.parent=spine;this.outfit.push(charm);this.factory.mesh({kind:'gem',r:.1},accessory.gearId==='root-signet'?0xd49bf7:0x99ef6a,0,-.21,.35,charm);}
    if(weapon||this.sim.refinement){const rune=this.factory.group('equipped-weapon-rune');rune.parent=hand;this.outfit.push(rune);const gem=this.factory.mesh({kind:'gem',r:.12+Math.min(20,this.sim.refinement)*.004},weapon?.gearId?.includes('frost')?0x7eefff:0xffd55f,0,.25,0,rune);gem.material=this.factory.material(0xffd55f,true);}
    for(const node of this.outfit)for(const mesh of node.getChildMeshes()){mesh.isPickable=false;this.shadows.addShadowCaster(mesh);}
  }
  get diagnostics() {
    return {
      engine: "Babylon.js",
      quality:this.quality,autoReduced:this.autoReduced,riggedActors:this.models.active,modelErrors:this.models.errors,
      renderWidth:this.engine.getRenderWidth(),renderHeight:this.engine.getRenderHeight(),activeAnimations:this.scene.animatables.length,
      drawCalls: this.instrumentation.drawCallsCounter.current,
      fps: this.frameTimes.length ? 1000 / (this.frameTimes.reduce((a,b)=>a+b,0) / this.frameTimes.length) : 0,
      frameP95: [...this.frameTimes].sort((a,b)=>a-b)[Math.max(0, Math.ceil(this.frameTimes.length * .95) - 1)] || 0,
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
        (mesh.isEnabled() && (mesh.metadata?.monsterId !== undefined || mesh.metadata?.npcId !== undefined)),
      false,
      this.camera,
    );
    if (!hit?.hit) return;
    const npc=hit.pickedMesh?.metadata?.npcId;
    if(npc){this.sim.interact(npc);return;}
    const id = hit.pickedMesh?.metadata?.monsterId;
    if (id !== undefined && this.sim.monsters.find((m) => m.id === id)?.alive) {
      this.sim.select(id);
    } else if (hit.pickedPoint) {
      this.sim.goTo(hit.pickedPoint.x, hit.pickedPoint.z);
    }
  }

  resize() {
    if (this.disposed) return;
    const rect=this.canvas.getBoundingClientRect();this.bounds={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
    const low=this.quality==='low'||this.autoReduced,budget=low?960*540:this.quality==='high'?1920*1080:1280*720;
    const ratio=Math.min(devicePixelRatio,low?1:1.7,Math.sqrt(budget/Math.max(1,rect.width*rect.height)));
    this.engine.setHardwareScalingLevel(1/ratio);this.engine.resize();
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
      this.identityMatrix,
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(width, height),
    );
    const rect = this.bounds;
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
    if(this.currentZone!==this.sim.save.zone){this.rebuildMap();this.rebuildMonsters();this.loot.splice(0).forEach(m=>m.dispose());}
    const frameNow=performance.now();
    this.frameTimes.push(frameNow-this.lastFrame);this.lastFrame=frameNow;if(this.frameTimes.length>120)this.frameTimes.shift();
    if(this.quality==="auto"&&!this.autoReduced&&this.frameTimes.length>=12&&this.frameTimes.slice(-10).reduce((a,b)=>a+b,0)/10>40){this.autoReduced=true;this.applyQuality();this.resize();}
    this.labelClock+=dt;const updateLabels=this.labelClock>=1/(this.quality==='low'||this.autoReduced?20:30)||dt===0;if(updateLabels)this.labelClock=0;
    this.visualTime+=dt;
    const renderX=this.sim.renderX,renderZ=this.sim.renderZ;
    const facingX=renderX-(this.sim.online?this.player.position.x:this.lastX);
    const facingZ=renderZ-(this.sim.online?this.player.position.z:this.lastZ);
    const moving = Math.hypot(facingX,facingZ) > 0.015;
    const blend=this.sim.online && dt>0 ? 1-Math.exp(-dt*16) : 1;
    if (moving)
      this.player.rotation.y = Math.atan2(
        facingX,
        facingZ,
      );
    for (const [id, model] of this.heroModels)
      {model.setEnabled(id === this.sim.save.job);this.models.animate(model,moving,this.sim.save.hp,this.sim.actionTime>0,!!this.sim.cast,dt);}
    this.updateOutfit();
    this.player.rotation.z =
      this.sim.actionTime > 0 ? Math.sin(this.sim.actionTime * 18) * 0.12 : 0;
    this.player.scaling.setAll(this.sim.hurtTime > 0 ? 0.96 : 1);
    this.lastX = renderX;
    this.lastZ = renderZ;
    const heroBlend=Math.hypot(facingX,facingZ)>6?1:blend;
    this.player.position.set(
      this.player.position.x+(renderX-this.player.position.x)*heroBlend,
      moving ? Math.abs(Math.sin(this.visualTime * 12)) * 0.06 : 0,
      this.player.position.z+(renderZ-this.player.position.z)*heroBlend,
    );
    const focus = new Vector3(this.player.position.x * 0.42, 0, this.player.position.z * 0.42);
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
    if(updateLabels)for (const entry of this.zoneLabels){const point=this.project(entry.x,entry.z,2.4);entry.label.style.transform=`translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;}
    for (const monster of this.sim.monsters) {
      const actor = this.monsters.get(monster.id)!;
      actor.setEnabled(monster.alive||monster.respawn>12.1);
      const monsterMoving=Math.hypot(monster.x-actor.position.x,monster.z-actor.position.z)>.015;
      if(monsterMoving)actor.rotation.y=Math.atan2(monster.x-actor.position.x,monster.z-actor.position.z);
      const projected=this.project(actor.position.x+(monster.x-actor.position.x)*blend,actor.position.z+(monster.z-actor.position.z)*blend,1.7),visible=projected.x>this.bounds.left-80&&projected.x<this.bounds.left+this.bounds.width+80&&projected.y>this.bounds.top-80&&projected.y<this.bounds.top+this.bounds.height+80;
      this.models.animate(actor,monsterMoving,monster.alive?monster.hp:0,monster.windup>0,false,dt,visible);
      actor.position.set(
        actor.position.x+(monster.x-actor.position.x)*blend,
        Math.sin(this.visualTime * 2 + monster.id) * 0.05,
        actor.position.z+(monster.z-actor.position.z)*blend,
      );
      const warnings=this.warnings.get(monster.id)!,shape=monster.shape||species[monster.kind].shape;
      for(const [kind,mesh] of Object.entries(warnings))mesh.setEnabled(monster.alive&&monster.windup>0&&kind===shape);
      const warning=warnings[shape],range=species[monster.kind].boss?(shape==='line'?6:shape==='cone'?4:3.5):species[monster.kind].range;
      warning.position.set(monster.x+(shape==='line'?(monster.facingX??0)*range/2:0),.05,monster.z+(shape==='line'?(monster.facingZ??1)*range/2:0));
      warning.rotation.y=shape==='circle'?0:Math.atan2(monster.facingX??0,monster.facingZ??1);
      warning.scaling.setAll(.9+.1*(1-monster.windup/species[monster.kind].windup));
      actor.rotation.z =
        monster.stun > 0 ? Math.sin(this.sim.time * 12) * 0.1 : 0;
      if(updateLabels){const label=this.monsterLabels.get(monster.id)!;
        const text=`${species[monster.kind].boss?"BOSS · ":""}${monster.kind} · Lv ${species[monster.kind].level}${monster.stun>0?" · Stunned":monster.poison>0?" · Poison":monster.slow>0?" · Slow":""}`;
        if(this.labelNames.get(monster.id)!==text){this.labelSpans.get(monster.id)!.textContent=text;this.labelNames.set(monster.id,text);}
        label.style.transform=`translate3d(${projected.x}px,${projected.y}px,0) translate(-50%,-100%)`;
        const display=monster.alive&&visible?'':'none';if(label.style.display!==display)label.style.display=display;
        label.classList.toggle('target',this.sim.target===monster.id);
        const width=`${monster.hp/this.sim.monsterSpec(monster.kind).hp*100}%`,bar=this.labelBars.get(monster.id)!;if(bar.style.width!==width)bar.style.width=width;
      }
    }
    if(updateLabels){const point = this.project(this.player.position.x, this.player.position.z, 2.5);
    this.playerLabel.style.transform = `translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;
    this.playerLabel.querySelector("i")!.style.width =
      `${(this.sim.save.hp / this.sim.maxHp) * 100}%`;}
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
    for(const [id,peer] of this.peers) if(!this.sim.remotePlayers.some(p=>p.id===id && p.job===peer.job)) {peer.node.dispose();peer.label.remove();this.peers.delete(id);}
    for(const player of this.sim.remotePlayers) {
      let peer=this.peers.get(player.id);
      if(!peer) {
        const node=this.factory.group('other-adventurer');node.position.set(player.x,0,player.z);buildPlayer(this.factory,node,player.job);this.factory.mergeActor(node);
        this.models.attach(player.job,node,root=>{for(const mesh of root.getChildMeshes())mesh.isPickable=false;});
        for(const mesh of node.getChildMeshes())mesh.isPickable=false;
        const label=document.createElement('div');label.className='world-label player-label peer-label';
        const name=document.createElement('span');name.textContent=player.name;label.append(name);this.labels.append(label);
        peer={node,label,job:player.job};this.peers.set(player.id,peer);
      }
      const dx=player.x-peer.node.position.x,dz=player.z-peer.node.position.z;
      if(Math.hypot(dx,dz)>.015)peer.node.rotation.y=Math.atan2(dx,dz);
      this.models.animate(peer.node,Math.hypot(dx,dz)>.015,player.hp,false,false,dt);
      peer.node.position.x+=dx*blend;peer.node.position.z+=dz*blend;
      if(updateLabels){const point=this.project(peer.node.position.x,peer.node.position.z,2.5);peer.label.style.transform=`translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;}
    }
    this.engine.beginFrame();
    this.scene.render();
    this.engine.endFrame();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this.instrumentation.dispose();
    this.models.dispose();
    this.scene.dispose();
    this.engine.dispose();
    for (const label of this.monsterLabels.values()) label.remove();
    this.playerLabel.remove();
    for(const peer of this.peers.values())peer.label.remove();
    for(const entry of this.zoneLabels)entry.label.remove();
  }
}
