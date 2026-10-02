/** Only this boundary is shared by the DOM HUD and the rendering engine. */
export interface GameWorld {
  quality:"auto"|"high"|"low";
  setQuality(quality:"auto"|"high"|"low"):void;
  angle: number;
  zoom: number;
  blocking: { x: number; z: number; r: number }[];
  readonly diagnostics: { engine: string; drawCalls: number; fps:number; frameP95:number };
  resize(): void;
  project(x: number, z: number, y?: number): { x: number; y: number };
  effect(type: string, x: number, z: number): void;
  update(dt: number): void;
  dispose(): void;
}
