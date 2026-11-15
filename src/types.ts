// Shared shapes so the lane code and the scene agree on what a lane holds.
import type Phaser from "phaser";

export type LaneType = "field" | "road" | "river" | "rail";
export type VehicleKind = "car" | "truck" | "train";
export type MoverKind = VehicleKind | "log";

export interface Mover {
  body: Phaser.GameObjects.Rectangle;
  kind: MoverKind;
}

export interface Lane {
  row: number;
  type: LaneType;
  bg: Phaser.GameObjects.Rectangle;
  movers: Mover[];
  /** Columns with hay bales, which the cougar can't hop onto. */
  blockers: Set<number>;
  /** Static extras (bales, rail ties) kept so they can be destroyed with the lane. */
  decor: Phaser.GameObjects.GameObject[];
  /** 1 = moving right, -1 = moving left. */
  dir: number;
  speed: number;
  spawnTimer: number;
  spawnEvery: number;
  warning?: Phaser.GameObjects.Rectangle;
}
