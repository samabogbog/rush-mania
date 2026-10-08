import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { SurfaceMaterials, type Surface } from "./surface-materials";
export type Shape =
  | { kind: "box"; w: number; h: number; d: number }
  | { kind: "plane"; w: number; h: number }
  | { kind: "sphere"; r: number; half?: boolean; segments?: number }
  | { kind: "cone"; r: number; h: number; n: number }
  | { kind: "cylinder"; top: number; bottom: number; h: number; n: number }
  | { kind: "disc"; r: number; n: number }
  | { kind: "gem"; r: number };
export class Primitives {
  private materials = new Map<string, StandardMaterial>();
  private serial = 0;
  readonly surfaces: SurfaceMaterials;
  constructor(public scene: Scene) { this.surfaces = new SurfaceMaterials(scene); }
  surface(mesh: Mesh, surface: Surface) {
    mesh.metadata = { ...mesh.metadata, surface };
    this.surfaces.projectUV(mesh, surface);
    return mesh;
  }
  material(color: number, unlit = false, alpha = 1) {
    const key = `${color}:${unlit}:${alpha}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, this.scene);
      m.diffuseColor = Color3.FromInts(
        (color >> 16) & 255,
        (color >> 8) & 255,
        color & 255,
      );
      m.specularColor = Color3.Black();
      m.alpha = alpha;
      m.backFaceCulling = true;
      if (unlit) {
        m.disableLighting = true;
        m.emissiveColor = m.diffuseColor.clone();
      }
      this.materials.set(key, m);
    }
    return m;
  }
  group(name = "group") {
    return new TransformNode(name, this.scene);
  }
  mesh(
    shape: Shape,
    color: number,
    x = 0,
    y = 0,
    z = 0,
    parent?: TransformNode,
  ) {
    const name = `${shape.kind}-${this.serial++}`;
    let m: Mesh;
    switch (shape.kind) {
      case "box":
        m = MeshBuilder.CreateBox(
          name,
          { width: shape.w, height: shape.h, depth: shape.d },
          this.scene,
        );
        break;
      case "plane":
        m = MeshBuilder.CreatePlane(
          name,
          { width: shape.w, height: shape.h, sideOrientation: Mesh.DOUBLESIDE },
          this.scene,
        );
        break;
      case "sphere":
        m = shape.half
          ? MeshBuilder.CreateSphere(
              name,
              { diameter: shape.r * 2, segments: 12, slice: 0.5 },
              this.scene,
            )
          : MeshBuilder.CreateSphere(
              name,
              { diameter: shape.r * 2, segments: shape.segments ?? (shape.r < .15 ? 6 : 12) },
              this.scene,
            );
        break;
      case "cone":
        m = MeshBuilder.CreateCylinder(
          name,
          {
            height: shape.h,
            diameterTop: 0,
            diameterBottom: shape.r * 2,
            tessellation: shape.n,
          },
          this.scene,
        );
        break;
      case "cylinder":
        m = MeshBuilder.CreateCylinder(
          name,
          {
            height: shape.h,
            diameterTop: shape.top * 2,
            diameterBottom: shape.bottom * 2,
            tessellation: shape.n,
          },
          this.scene,
        );
        break;
      case "disc":
        m = MeshBuilder.CreateDisc(
          name,
          {
            radius: shape.r,
            tessellation: shape.n,
            sideOrientation: Mesh.DOUBLESIDE,
          },
          this.scene,
        );
        break;
      case "gem":
        m = MeshBuilder.CreatePolyhedron(
          name,
          { type: 1, size: shape.r },
          this.scene,
        );
        break;
    }
    m.material = this.material(color);
    m.position.set(x, y, z);
    m.parent = parent ?? null;
    m.receiveShadows = true;
    return m;
  }
  box(
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    p?: TransformNode,
  ) {
    return this.mesh({ kind: "box", w, h, d }, color, x, y, z, p);
  }
  ball(
    r: number,
    color: number,
    x: number,
    y: number,
    z: number,
    p?: TransformNode,
    s = 1,
    segments?: number,
  ) {
    const m = this.mesh({ kind: "sphere", r, segments }, color, x, y, z, p);
    m.scaling.y = s;
    return m;
  }
  ring(radius: number, color: number, parent?: TransformNode) {
    // Ground markers need a flat outline, not a 48×48 torus (2,401 vertices).
    const m=new Mesh("selection-ring",this.scene),positions:number[]=[],normals:number[]=[],indices:number[]=[];
    for(let i=0;i<=32;i++){const angle=i*Math.PI*2/32;for(const r of [radius,Math.max(.01,radius-.05)]){positions.push(Math.sin(angle)*r,0,Math.cos(angle)*r);normals.push(0,1,0);}if(i<32)indices.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);}
    const data=new VertexData();data.positions=positions;data.normals=normals;data.indices=indices;data.applyToMesh(m);
    m.position.y = 0.045;
    m.parent = parent ?? null;
    m.material = this.material(color, true);
    m.material.backFaceCulling=false;
    m.isPickable = false;
    return m;
  }
  /** Bake the procedural actor's palette into vertex colors: one draw per actor. */
  mergeActor(actor: TransformNode) {
    const position=actor.position.clone(),rotation=actor.rotation.clone(),scaling=actor.scaling.clone(),quaternion=actor.rotationQuaternion?.clone()||null,parent=actor.parent;
    actor.parent=null;actor.position.setAll(0);actor.rotation.setAll(0);actor.scaling.setAll(1);actor.rotationQuaternion=null;
    actor.computeWorldMatrix(true);
    const meshes = actor
      .getChildMeshes()
      .filter((mesh): mesh is Mesh => mesh instanceof Mesh);
    for (const mesh of meshes) {
      const color = (mesh.material as StandardMaterial).diffuseColor;
      const colors: number[] = [];
      for (let i = 0; i < mesh.getTotalVertices(); i++)
        colors.push(color.r, color.g, color.b, 1);
      mesh.setVerticesData("color", colors);
      mesh.material = this.material(0xffffff);
      mesh.computeWorldMatrix(true);
    }
    const merged = Mesh.MergeMeshes(
      meshes,
      true,
      true,
      undefined,
      false,
      false,
    );
    if (merged) {
      merged.parent = actor;
      merged.receiveShadows = true;
    }
    actor.parent=parent;actor.position.copyFrom(position);actor.rotation.copyFrom(rotation);actor.scaling.copyFrom(scaling);actor.rotationQuaternion=quaternion;
    actor.computeWorldMatrix(true);
  }

  mergeStatic(exclude: Mesh, included?:Set<Mesh>) {
    const groups = new Map<StandardMaterial, Mesh[]>();
    for (const m of this.scene.meshes) {
      if (!(m instanceof Mesh) || m === exclude || (included && !included.has(m)) || m.metadata?.npcId || !m.getTotalVertices()) continue;
      m.computeWorldMatrix(true);
      const original=m.material as StandardMaterial;
      const color=original.diffuseColor,colors:number[]=[],paint=m.getVerticesData("color");
      // Preserve authored ground gradients while still baking the material palette.
      for(let vertex=0;vertex<m.getTotalVertices();vertex++)colors.push(color.r*(paint?.[vertex*4]??1),color.g*(paint?.[vertex*4+1]??1),color.b*(paint?.[vertex*4+2]??1),paint?.[vertex*4+3]??1);
      m.setVerticesData("color",colors);
      const surface=!original.disableLighting&&original.alpha===1?this.surfaces.classify(m,((Math.round(color.r*255)<<16)|(Math.round(color.g*255)<<8)|Math.round(color.b*255))):null;
      if(surface){this.surfaces.projectUV(m,surface);m.metadata={...m.metadata,surface};}
      const mat=surface?this.surfaces.material(surface):this.material(0xffffff,original.disableLighting,original.alpha);m.material=mat;
      const group = groups.get(mat) ?? [];
      group.push(m);
      groups.set(mat, group);
    }
    for (const list of groups.values()) {
      if (list.length < 2) {list[0].isPickable=false;list[0].freezeWorldMatrix();continue;}
      const merged = Mesh.MergeMeshes(
        list,
        true,
        true,
        undefined,
        false,
        false,
      );
      if (merged) {
        merged.receiveShadows = true;
        merged.isPickable = false;
        merged.freezeWorldMatrix();
      }
    }
  }
}
