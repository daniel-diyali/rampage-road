// Rage rules live here with no Phaser code, so the tier logic
// can be tested or tuned without running the game.
import { TUNING } from "../config";
import type { VehicleKind } from "../types";

export class RageMeter {
  private value = 0;
  private active = false;

  get percent(): number {
    return this.value;
  }

  get unleashed(): boolean {
    return this.active;
  }

  get ready(): boolean {
    return !this.active && this.value >= 100;
  }

  /// Gains are halved during a rampage so players can't chain it forever.
  add(amount: number): void {
    const gain = this.active ? amount / 2 : amount;
    this.value = Math.min(100, this.value + gain);
  }

  /// Returns false if the bar isn't full, so the caller knows whether to play effects.
  unleash(): boolean {
    if (!this.ready) return false;
    this.active = true;
    return true;
  }

  /// Rage only drains while unleashed; filling up is never punished.
  update(dt: number): void {
    if (!this.active) return;
    this.value = Math.max(0, this.value - TUNING.rageDrainPerSec * dt);
    if (this.value === 0) this.active = false;
  }

  /// Each vehicle has a rage threshold, so power fades in steps as the bar drains.
  canSmash(kind: VehicleKind): boolean {
    return this.active && this.value >= TUNING.smashAt[kind];
  }

  /// The cougar shrinks with the bar so players can feel their power running out.
  get scale(): number {
    return this.active ? 1 + (this.value / 100) * TUNING.maxRageScale : 1;
  }
}
