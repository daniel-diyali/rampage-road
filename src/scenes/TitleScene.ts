// First thing judges see, so it has to say what the game is and how to play
// within a few seconds. New players type a name once; after that any key starts.
import Phaser from "phaser";
import { COLORS, PIXEL_SCALE, SPRITES, TILE, VIEW_H, VIEW_W } from "../config";
import { HighScore } from "../systems/HighScore";
import { AudioManager } from "../systems/AudioManager";
import { MAX_NAME_LENGTH, PlayerName } from "../systems/PlayerName";
import { LeaderboardService } from "../services/LeaderboardService";

export class TitleScene extends Phaser.Scene {
  private typing = false;
  private draft = "";
  private playerText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;

  constructor() {
    super("Title");
  }

  /// Title is the first scene, so it loads every sprite and sound once for the whole game.
  /// Coming back here from a run skips anything already loaded.
  preload(): void {
    for (const key of SPRITES) {
      if (!this.textures.exists(key)) this.load.image(key, `assets/sprites/${key}.png`);
    }
    AudioManager.preload(this.load);
  }

  /// NEAREST filtering keeps the scaled-up pixel art sharp instead of blurry.
  create(): void {
    for (const key of SPRITES) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.cameras.main.setBackgroundColor(COLORS.fieldA);
    this.drawStripes();

    const cx = VIEW_W / 2;
    const title = this.add
      .text(cx, VIEW_H * 0.14, "RAMPAGE\nROAD", {
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

    this.label(cx, VIEW_H * 0.31, "A cougar loose on the Palouse.\nUnleash the beast.", 18);

    const cougar = this.add.image(cx, VIEW_H * 0.43, "cougar").setScale(PIXEL_SCALE * 2);
    this.tweens.add({ targets: cougar, y: cougar.y - 8, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.label(
      cx,
      VIEW_H * 0.6,
      "ARROWS / WASD  hop\nHUNT jackrabbits + CLOSE CALLS  build rage\nSPACE at 100%  UNLEASH\nDon't let animal control catch you\nM  mute",
      16,
    );

    this.playerText = this.label(cx, VIEW_H * 0.75, "", 18);
    this.bestText = this.label(cx, VIEW_H * 0.8, "", 22, "#ffe066");
    this.prompt = this.label(cx, VIEW_H * 0.89, "", 24);
    this.tweens.add({ targets: this.prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.typing = PlayerName.get() === "";
    this.draft = "";
    this.refresh();

    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => this.onKey(e));
    this.input.on("pointerdown", () => {
      if (!this.typing) this.startGame();
    });
  }

  /// While typing, keys build the name; otherwise N renames and anything else starts.
  private onKey(e: KeyboardEvent): void {
    if (!this.typing) {
      if (e.key.toLowerCase() === "n") {
        this.typing = true;
        this.draft = "";
        this.refresh();
      } else {
        this.startGame();
      }
      return;
    }

    if (e.key === "Enter" && PlayerName.clean(this.draft)) {
      PlayerName.set(this.draft);
      this.typing = false;
    } else if (e.key === "Backspace") {
      this.draft = this.draft.slice(0, -1);
    } else if (e.key.length === 1 && this.draft.length < MAX_NAME_LENGTH) {
      this.draft = PlayerName.clean(this.draft + e.key) + (e.key === " " ? " " : "");
    }
    this.refresh();
  }

  /// Redraws the name/best/prompt lines to match whether we're typing or ready.
  private refresh(): void {
    if (this.typing) {
      this.playerText.setText(`NAME: ${this.draft}_`);
      this.bestText.setText("");
      this.prompt.setText("TYPE YOUR NAME + ENTER");
      return;
    }
    const name = PlayerName.get();
    const best = HighScore.get(name);
    this.playerText.setText(`PLAYER: ${name}   (N to change)`);
    this.bestText.setText(best > 0 ? `YOUR BEST: ${best}` : "");
    this.prompt.setText("PRESS ANY KEY");
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

  /// Skips the leaderboard screen entirely when it isn't set up, so there's no dead screen.
  private startGame(): void {
    this.input.keyboard!.removeAllListeners("keydown");
    this.scene.start(LeaderboardService.enabled ? "Leaderboard" : "Game");
  }
}
