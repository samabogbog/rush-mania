import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
export type Shape =
  | { kind: "box"; w: number; h: number; d: number }
  | { kind: "plane"; w: number; h: number }
  | { kind: "sphere"; r: number; half?: boolean }
  | { kind: "cone"; r: number; h: number; n: number }
  | { kind: "cylinder"; top: number; bottom: number; h: number; n: number }
  | { kind: "disc"; r: number; n: number }
  | { kind: "gem"; r: number };
export class Primitives {
  private materials = new Map<string, StandardMaterial>();
  private serial = 0;
  constructor(public scene: Scene) {}
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
              { diameter: shape.r * 2, segments: 8, slice: 0.5 },
              this.scene,
            )
          : MeshBuilder.CreateIcoSphere(
              name,
              { radius: shape.r, subdivisions: 1, flat: true },
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
  ) {
    const m = this.mesh({ kind: "sphere", r }, color, x, y, z, p);
    m.scaling.y = s;
    return m;
  }
  ring(radius: number, color: number, parent?: TransformNode) {
    const m = MeshBuilder.CreateTorus(
      "selection-ring",
      { diameter: radius * 2 - 0.05, thickness: 0.05, tessellation: 48 },
      this.scene,
    );
    m.position.y = 0.045;
    m.parent = parent ?? null;
    m.material = this.material(color, true);
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
      if (!(m instanceof Mesh) || m === exclude || (included && !included.has(m)) || m.metadata?.npcId) continue;
      m.computeWorldMatrix(true);
      const mat = m.material as StandardMaterial;
      const group = groups.get(mat) ?? [];
      group.push(m);
      groups.set(mat, group);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
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
