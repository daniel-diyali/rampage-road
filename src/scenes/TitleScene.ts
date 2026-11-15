// First thing judges see, so it has to say what the game is and how to play
// within a few seconds. Any key starts, so nobody gets stuck on a menu.
import Phaser from "phaser";
import { COLORS, PIXEL_SCALE, SPRITES, TILE, VIEW_H, VIEW_W } from "../config";
import { HighScore } from "../systems/HighScore";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  /// Title is the first scene, so it loads every sprite once for the whole game.
  preload(): void {
    for (const key of SPRITES) this.load.image(key, `assets/sprites/${key}.png`);
  }

  /// NEAREST filtering keeps the scaled-up pixel art sharp instead of blurry.
  create(): void {
    for (const key of SPRITES) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.cameras.main.setBackgroundColor(COLORS.fieldA);
    this.drawStripes();

    const cx = VIEW_W / 2;
    const title = this.add
      .text(cx, VIEW_H * 0.16, "RAMPAGE\nROAD", {
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

    this.label(cx, VIEW_H * 0.34, "A cougar loose on the Palouse.\nUnleash the beast.", 18);
    this.label(
      cx,
      VIEW_H * 0.62,
      "ARROWS / WASD  hop\nHUNT jackrabbits + CLOSE CALLS  build rage\nSPACE at 100%  UNLEASH\nDon't let animal control catch you",
      16,
    );

    const cougar = this.add.image(cx, VIEW_H * 0.485, "cougar").setScale(PIXEL_SCALE * 2);
    this.tweens.add({ targets: cougar, y: cougar.y - 8, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const best = HighScore.get();
    if (best > 0) this.label(cx, VIEW_H * 0.76, `YOUR BEST: ${best}`, 22, "#ffe066");

    const prompt = this.label(cx, VIEW_H * 0.86, "PRESS ANY KEY", 24);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard!.once("keydown", () => this.startGame());
    this.input.once("pointerdown", () => this.startGame());
  }

  /// Wheat rows in the background so the title already looks like the game.
  private drawStripes(): void {
    for (let y = 0, i = 0; y < VIEW_H; y += TILE, i++) {
      this.add
        .tileSprite(VIEW_W / 2, y + TILE / 2, VIEW_W / PIXEL_SCALE, 32, i % 2 === 0 ? "fieldA" : "fieldB")
        .setScale(PIXEL_SCALE);
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
