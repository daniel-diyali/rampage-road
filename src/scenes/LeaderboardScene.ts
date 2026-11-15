// Shown right before each run so players see the scores they're trying to beat.
// It never blocks: any key starts the game even while scores are still loading.
import Phaser from "phaser";
import { PIXEL_SCALE, TILE, VIEW_H, VIEW_W } from "../config";
import { LeaderboardService } from "../services/LeaderboardService";
import { PlayerName } from "../systems/PlayerName";

const FONT = "monospace";

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("Leaderboard");
  }

  create(): void {
    for (let y = 0, i = 0; y < VIEW_H; y += TILE, i++) {
      this.add
        .tileSprite(VIEW_W / 2, y + TILE / 2, VIEW_W / PIXEL_SCALE, 32, i % 2 === 0 ? "fieldA" : "fieldB")
        .setScale(PIXEL_SCALE);
    }
    this.add.rectangle(VIEW_W / 2, VIEW_H * 0.47, VIEW_W * 0.8, VIEW_H * 0.66, 0x000000, 0.6);

    this.text(VIEW_W / 2, VIEW_H * 0.1, "TOP COUGARS", 40, "#981e32", 8);
    const status = this.text(VIEW_W / 2, VIEW_H * 0.45, "Loading...", 20);

    const prompt = this.text(VIEW_W / 2, VIEW_H * 0.88, "PRESS ANY KEY TO PLAY", 24);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    LeaderboardService.top(10).then((rows) => {
      if (!this.scene.isActive()) return;
      if (rows === null) return status.setText("Leaderboard offline");
      if (rows.length === 0) return status.setText("No scores yet.\nBe the first!");
      status.destroy();
      this.drawRows(rows);
    });

    this.input.keyboard!.once("keydown", () => this.scene.start("Game"));
    this.input.once("pointerdown", () => this.scene.start("Game"));
  }

  /// The current player's row is highlighted so they can find themselves fast.
  private drawRows(rows: { name: string; score: number }[]): void {
    const me = PlayerName.get();
    rows.forEach((row, i) => {
      const y = VIEW_H * 0.2 + i * 40;
      const color = row.name === me ? "#ffe066" : "#ffffff";
      this.text(VIEW_W * 0.18, y, `${i + 1}.`, 22, color).setOrigin(0, 0.5);
      this.text(VIEW_W * 0.28, y, row.name, 22, color).setOrigin(0, 0.5);
      this.text(VIEW_W * 0.82, y, String(row.score), 22, color).setOrigin(1, 0.5);
    });
  }

  private text(x: number, y: number, value: string, size: number, color = "#ffffff", stroke = 5): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: "center", stroke: "#000", strokeThickness: stroke })
      .setOrigin(0.5);
  }
}
