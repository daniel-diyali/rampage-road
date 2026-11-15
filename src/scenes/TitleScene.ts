// First thing judges see, so it has to say what the game is and how to play
// within a few seconds. Any key starts, so nobody gets stuck on a menu.
import Phaser from "phaser";
import { COLORS, TILE, VIEW_H, VIEW_W } from "../config";
import { HighScore } from "../systems/HighScore";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.fieldA);
    this.drawStripes();

    const cx = VIEW_W / 2;
    const title = this.add
      .text(cx, VIEW_H * 0.22, "RAMPAGE\nROAD", {
        fontFamily: "monospace",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#981e32",
        align: "center",
        stroke: "#000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.label(cx, VIEW_H * 0.4, "A cougar loose on the Palouse.\nUnleash the beast.", 18);
    this.label(
      cx,
      VIEW_H * 0.58,
      "ARROWS / WASD  hop\nHUNT jackrabbits + CLOSE CALLS  build rage\nSPACE at 100%  UNLEASH\nDon't let animal control catch you",
      16,
    );

    const best = HighScore.get();
    if (best > 0) this.label(cx, VIEW_H * 0.74, `YOUR BEST: ${best}`, 22, "#ffe066");

    const prompt = this.label(cx, VIEW_H * 0.86, "PRESS ANY KEY", 24);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown", () => this.startGame());
    this.input.once("pointerdown", () => this.startGame());
  }

  /// Field rows in the background so the title already looks like the game.
  private drawStripes(): void {
    for (let y = 0; y < VIEW_H; y += TILE * 2) {
      this.add.rectangle(VIEW_W / 2, y + TILE / 2, VIEW_W, TILE, COLORS.fieldB);
    }
  }

  private label(x: number, y: number, text: string, size: number, color = "#ffffff"): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, { fontFamily: "monospace", fontSize: `${size}px`, color, align: "center", stroke: "#000", strokeThickness: 5, lineSpacing: 6 })
      .setOrigin(0.5);
  }

  private startGame(): void {
    this.scene.start("Game");
  }
}
