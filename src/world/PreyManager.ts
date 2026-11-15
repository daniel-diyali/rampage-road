// Jackrabbits replace static snacks. The cougar is a predator, so rage comes from
// chasing prey down and cornering it, not just walking over a pickup.
import Phaser from "phaser";
import { COLS, PIXEL_SCALE, TUNING, colX, rowY } from "../config";
import type { Lane } from "../types";
import type { LaneManager } from "./LaneManager";

interface Rabbit {
  row: number;
  col: number;
  body: Phaser.GameObjects.Image;
  cooldown: number;
}

export class PreyManager {
  private rabbits: Rabbit[] = [];
  private scene: Phaser.Scene;
  private lanes!: LaneManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /// Set after construction because LaneManager needs our spawn callback first.
  attach(lanes: LaneManager): void {
    this.lanes = lanes;
  }

  /// Not every field gets a rabbit, so finding one feels like a small chance to go for.
  maybeSpawn(lane: Lane): void {
    if (lane.row <= 2 || Math.random() >= TUNING.rabbitChance) return;
    const free = [...Array(COLS).keys()].filter((c) => !lane.blockers.has(c));
    const col = Phaser.Utils.Array.GetRandom(free) as number;

    const body = this.scene.add.image(colX(col), rowY(lane.row), "rabbit").setScale(PIXEL_SCALE).setDepth(4);
    this.rabbits.push({ row: lane.row, col, body, cooldown: 0 });
  }

  /// Rabbits only react when the cougar gets close, and always run away from it.
  /// A rabbit pinned against a bale or the edge has nowhere to go, which is how you catch it.
  update(dt: number, playerRow: number, playerCol: number): void {
    for (const r of this.rabbits) {
      r.cooldown -= dt;
      const near = Math.abs(r.row - playerRow) <= 1 && Math.abs(r.col - playerCol) <= TUNING.rabbitFleeRange;
      if (!near || r.cooldown > 0) continue;

      r.cooldown = TUNING.rabbitCooldown;
      const away = r.col === playerCol ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(r.col - playerCol);
      const target = r.col + away;
      if (this.isBlocked(r.row, target)) continue;

      r.col = target;
      this.scene.tweens.add({
        targets: r.body,
        x: colX(target),
        y: { from: rowY(r.row) - 10, to: rowY(r.row) },
        duration: TUNING.rabbitHopMs,
        ease: "Quad.easeOut",
      });
    }
  }

  private isBlocked(row: number, col: number): boolean {
    if (col < 0 || col >= COLS) return true;
    return this.lanes.get(row)?.blockers.has(col) ?? true;
  }

  /// A rabbit's col changes the moment it starts hopping, so landing where it
  /// used to be is a miss. You have to actually cut it off.
  tryCatch(row: number, col: number): boolean {
    const r = this.rabbits.find((x) => x.row === row && x.col === col);
    if (!r) return false;
    this.rabbits = this.rabbits.filter((x) => x !== r);
    this.scene.tweens.killTweensOf(r.body);
    this.scene.tweens.add({ targets: r.body, scale: PIXEL_SCALE * 2, alpha: 0, duration: 180, onComplete: () => r.body.destroy() });
    return true;
  }

  cleanupBelow(row: number): void {
    this.rabbits = this.rabbits.filter((r) => {
      if (r.row >= row) return true;
      r.body.destroy();
      return false;
    });
  }
}
