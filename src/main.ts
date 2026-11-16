// Entry point: just boots Phaser. Game settings live in config.ts.
import Phaser from "phaser";
import { VIEW_H, VIEW_W } from "./config";
import { GameScene } from "./scenes/GameScene";
import { TitleScene } from "./scenes/TitleScene";
import { LeaderboardScene } from "./scenes/LeaderboardScene";
import { TutorialScene } from "./scenes/TutorialScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: "app",
  backgroundColor: "#14141c",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, TutorialScene, LeaderboardScene, GameScene],
});
