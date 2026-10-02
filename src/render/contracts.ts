/** Only this boundary is shared by the DOM HUD and the rendering engine. */
export interface GameWorld {
  angle: number;
  zoom: number;
  blocking: { x: number; z: number; r: number }[];
  readonly diagnostics: { engine: string; drawCalls: number };
  resize(): void;
  project(x: number, z: number, y?: number): { x: number; y: number };
  effect(type: string, x: number, z: number): void;
  update(dt: number): void;
  dispose(): void;
}
