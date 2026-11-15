// The van replaces an invisible "hurry up" timer with something the player can see,
// fear, and get revenge on while raging.
import Phaser from "phaser";
import { COLORS, TILE, TUNING, VIEW_W, rowY } from "../config";

export class AnimalControl {
  private van: Phaser.GameObjects.Container;
  private siren: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;
  /** Row of the van's front bumper. A float so it can creep up smoothly. */
  private frontRow = -TUNING.vanMaxGap;
  private speed: number = TUNING.vanStartSpeed;
  private stunned = 0;
  private sirenTime = 0;

  constructor(scene: Phaser.Scene, startX: number) {
    this.scene = scene;
    const body = scene.add.rectangle(0, 0, TILE * 3, TILE * 1.3, COLORS.van).setStrokeStyle(3, COLORS.outline);
    const stripe = scene.add.rectangle(0, 6, TILE * 3, 8, COLORS.crimson);
    this.siren = scene.add.rectangle(0, -TILE * 0.45, TILE * 1.2, 8, COLORS.sirenRed);
    const label = scene.add
      .text(0, 16, "ANIMAL CONTROL", { fontFamily: "monospace", fontSize: "10px", color: "#000000" })
      .setOrigin(0.5);
    this.van = scene.add.container(startX, 0, [body, stripe, this.siren, label]).setDepth(15);
    this.place();
  }

  /// The van speeds up slowly over a run, but never falls more than vanMaxGap rows behind,
  /// so it's always at the bottom of the screen applying pressure.
  update(dt: number, playerRow: number, playerX: number, started: boolean): void {
    this.sirenTime += dt;
    this.siren.setFillStyle(Math.floor(this.sirenTime * 6) % 2 === 0 ? COLORS.sirenRed : COLORS.sirenBlue);
    this.van.x = Phaser.Math.Linear(this.van.x, Phaser.Math.Clamp(playerX, TILE * 1.5, VIEW_W - TILE * 1.5), 0.05);

    if (started) {
      if (this.stunned > 0) {
        this.stunned -= dt;
      } else {
        this.speed += TUNING.vanAccel * dt;
        this.frontRow += this.speed * dt;
      }
      this.frontRow = Math.max(this.frontRow, playerRow - TUNING.vanMaxGap);
    }
    this.place();
  }

  /// A little slack so the van has to visibly touch the cougar, not just its row.
  reached(playerRow: number): boolean {
    return this.stunned <= 0 && this.frontRow >= playerRow - 0.4;
  }

  /// Wrecking it buys real breathing room, which is the reward for turning back.
  wreck(): void {
    this.frontRow -= TUNING.vanKnockback;
    this.stunned = TUNING.vanStunSec;
    this.scene.tweens.add({ targets: this.van, angle: { from: -20, to: 0 }, duration: 600, ease: "Elastic.easeOut" });
  }

  get x(): number {
    return this.van.x;
  }

  get y(): number {
    return this.van.y;
  }

  /// The container's center sits half a van-length behind the front bumper.
  private place(): void {
    this.van.y = rowY(this.frontRow) + TILE * 0.65;
  }
}
