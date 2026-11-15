// Everything here is pinned to the camera so it stays put while the world scrolls.
import Phaser from "phaser";
import { COLORS, TUNING, VIEW_H, VIEW_W } from "../config";

const BAR_X = 16;
const BAR_Y = 22;
const BAR_W = 260;
const FONT = "monospace";

export class Hud {
  private fill: Phaser.GameObjects.Rectangle;
  private rageText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private banner?: Phaser.GameObjects.Container;

  /// Tier marks are drawn from TUNING so the bar always matches the real smash rules.
  constructor(scene: Phaser.Scene, best: number) {
    this.scene = scene;
    const pin = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, depth: number): T => {
      o.setScrollFactor(0);
      o.setDepth(depth);
      return o;
    };

    pin(scene.add.rectangle(BAR_X, BAR_Y, BAR_W, 20, 0x000000, 0.6).setOrigin(0, 0.5), 100);
    this.fill = pin(scene.add.rectangle(BAR_X, BAR_Y, BAR_W, 20, COLORS.crimson).setOrigin(0, 0.5).setScale(0, 1), 101);

    const tiers: [number, string][] = [
      [TUNING.smashAt.car, "CAR"],
      [TUNING.smashAt.truck, "TRUCK"],
      [TUNING.smashAt.train, "TRAIN"],
    ];
    for (const [pct, label] of tiers) {
      const tx = BAR_X + (BAR_W * pct) / 100;
      pin(scene.add.rectangle(tx, BAR_Y, 2, 24, 0xffffff), 102);
      pin(scene.add.text(tx, BAR_Y + 16, label, { fontFamily: FONT, fontSize: "11px", color: "#ffffff" }).setOrigin(0.5, 0), 102);
    }

    this.rageText = pin(
      scene.add
        .text(BAR_X + BAR_W + 10, BAR_Y, "RAGE 0%", { fontFamily: FONT, fontSize: "16px", color: "#ffffff", stroke: "#000", strokeThickness: 3 })
        .setOrigin(0, 0.5),
      102,
    );
    this.scoreText = pin(
      scene.add
        .text(VIEW_W - 16, BAR_Y, "0", { fontFamily: FONT, fontSize: "28px", color: "#ffffff", stroke: "#000", strokeThickness: 4 })
        .setOrigin(1, 0.5),
      102,
    );
    this.bestText = pin(
      scene.add
        .text(VIEW_W - 16, BAR_Y + 24, `BEST ${best}`, { fontFamily: FONT, fontSize: "14px", color: "#ffe066", stroke: "#000", strokeThickness: 3 })
        .setOrigin(1, 0.5),
      102,
    );
    this.message = pin(
      scene.add
        .text(VIEW_W / 2, VIEW_H / 2, "", {
          fontFamily: FONT,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          stroke: "#000",
          strokeThickness: 5,
        })
        .setOrigin(0.5),
      103,
    );
  }

  /// The label changes so players know exactly when to press SPACE.
  /// The bar blinks right before a power drops, so the banner is never a surprise.
  update(rage: number, unleashed: boolean, ready: boolean, score: number, warning = false): void {
    this.fill.setScale(rage / 100, 1);
    this.fill.setAlpha(warning && Math.floor(this.scene.time.now / 120) % 2 === 0 ? 0.25 : 1);
    this.fill.setFillStyle(unleashed ? COLORS.rageGlow : COLORS.crimson);
    const label = unleashed ? "UNLEASHED" : ready ? "PRESS SPACE!" : "RAGE";
    this.rageText.setText(`${label} ${Math.ceil(rage)}%`);
    this.scoreText.setText(`${score}`);
  }

  /// Only called on a new record, so the live BEST counter never lies mid-run.
  setBest(best: number): void {
    this.bestText.setText(`BEST ${best}`);
  }

  /// A short banner under the rage bar. It pops in, holds for a moment, and fades,
  /// so it's easy to notice mid-run without covering the road.
  showBanner(text: string, color: string): void {
    this.banner?.destroy();
    const label = this.scene.add
      .text(0, 0, text, { fontFamily: FONT, fontSize: "24px", fontStyle: "bold", color, stroke: "#000", strokeThickness: 5 })
      .setOrigin(0.5);
    const bg = this.scene.add.rectangle(0, 0, label.width + 28, label.height + 12, 0x000000, 0.65);
    const banner = this.scene.add.container(VIEW_W / 2, 92, [bg, label]).setScrollFactor(0).setDepth(104).setScale(0.6);
    this.banner = banner;
    this.scene.tweens.add({ targets: banner, scale: 1, duration: 180, ease: "Back.easeOut" });
    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 1200,
      duration: 300,
      onComplete: () => banner.destroy(),
    });
  }

  showMessage(text: string): void {
    this.message.setText(text).setVisible(true);
  }

  hideMessage(): void {
    this.message.setVisible(false);
  }
}
