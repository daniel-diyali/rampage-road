// A short animated "how to play" shown before a player's first run, because new players
// didn't realize jackrabbits were food or how many it takes to fill rage.
// Each slide is built from the real game sprites so it looks exactly like what they'll play.
import Phaser from "phaser";
import { COLORS, PIXEL_SCALE, TILE, TUNING, VIEW_H, VIEW_W } from "../config";
import { LeaderboardService } from "../services/LeaderboardService";

const SEEN_KEY = "rampage-road-tutorial-seen";
const FONT = "monospace";
const CX = VIEW_W / 2;
const CY = VIEW_H * 0.42;
const RABBITS_TO_FILL = Math.ceil(100 / TUNING.ragePerRabbit);

interface Slide {
  title: string;
  caption: string;
  build: (stage: Phaser.GameObjects.Container) => void;
}

export class TutorialScene extends Phaser.Scene {
  private index = 0;
  private stage!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private captionText!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Arc[] = [];
  private returnToTitle = false;

  constructor() {
    super("Tutorial");
  }

  static get seen(): boolean {
    try {
      return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      return false;
    }
  }

  private static markSeen(): void {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return;
    }
  }

  /// Opened from the title's "H" key it returns to the title; otherwise it leads into a run.
  init(data: { returnToTitle?: boolean }): void {
    this.returnToTitle = data.returnToTitle ?? false;
    this.index = 0;
    this.dots = [];
  }

  create(): void {
    for (let y = 0, i = 0; y < VIEW_H; y += TILE, i++) {
      this.add
        .tileSprite(VIEW_W / 2, y + TILE / 2, VIEW_W / PIXEL_SCALE, 32, i % 2 === 0 ? "fieldA" : "fieldB")
        .setScale(PIXEL_SCALE);
    }
    this.add.rectangle(CX, VIEW_H * 0.47, VIEW_W * 0.9, VIEW_H * 0.8, 0x000000, 0.55);

    this.titleText = this.text(CX, VIEW_H * 0.13, "", 34, "#ff5a5a");
    this.captionText = this.text(CX, VIEW_H * 0.7, "", 17);
    this.stage = this.add.container(0, 0);

    const slides = this.slides();
    slides.forEach((_, i) => this.dots.push(this.add.circle(CX + (i - (slides.length - 1) / 2) * 22, VIEW_H * 0.84, 6, 0xffffff)));
    this.text(CX, VIEW_H * 0.92, "< A / D >  browse     ENTER  play     S  skip", 15, "#ffe066");

    this.show(0);
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => this.onKey(e.key));
  }

  /// Only left/right (or A/D) move between slides, so players can't skip past one by accident.
  /// Moving right from the last slide starts the game, same as Enter.
  private onKey(key: string): void {
    const k = key.toLowerCase();
    const last = this.slides().length - 1;
    if (k === "arrowright" || k === "d") {
      if (this.index >= last) this.finish();
      else this.show(this.index + 1);
    } else if ((k === "arrowleft" || k === "a") && this.index > 0) {
      this.show(this.index - 1);
    } else if (k === "enter" || k === " " || k === "s" || k === "escape") {
      this.finish();
    } else if (k === "m") {
      this.sound.mute = !this.sound.mute;
    }
  }

  /// Clears the old slide's looping animations first so they don't pile up.
  private show(i: number): void {
    this.index = i;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.stage.removeAll(true);
    const slide = this.slides()[i];
    this.titleText.setText(slide.title);
    this.captionText.setText(slide.caption);
    this.dots.forEach((d, n) => d.setFillStyle(n === i ? 0xff5a5a : 0xffffff, n === i ? 1 : 0.4));
    slide.build(this.stage);
  }

  private finish(): void {
    TutorialScene.markSeen();
    this.input.keyboard!.removeAllListeners("keydown");
    if (this.returnToTitle) this.scene.start("Title");
    else this.scene.start(LeaderboardService.enabled ? "Leaderboard" : "Game");
  }

  private slides(): Slide[] {
    return [
      {
        title: "1. HUNT",
        caption: `Jackrabbits run from you. Corner them against\nhay bales or the edge to catch them.\nEach one = +${TUNING.ragePerRabbit}% RAGE.  ${RABBITS_TO_FILL} rabbits = FULL RAGE!`,
        build: (stage) => this.buildHunt(stage),
      },
      {
        title: "2. CLOSE CALLS",
        caption: `Let a car or train barely miss you\nfor a CLOSE CALL: +${TUNING.ragePerCloseCall}% RAGE.\nRisky, but it fills the bar fast.`,
        build: (stage) => this.buildCloseCall(stage),
      },
      {
        title: "3. UNLEASH",
        caption: "When RAGE hits 100%,\npress SPACE to unleash the beast!",
        build: (stage) => this.buildUnleash(stage),
      },
      {
        title: "4. RAMPAGE",
        caption:
          "Smash through traffic and wreck animal control.\nYour powers fade as the bar drains,\nso dodge whatever can hurt you again.",
        build: (stage) => this.buildRampage(stage),
      },
    ];
  }

  /// Hops exactly like the in-game cougar: a quick arc with a squash on landing.
  private hop(target: Phaser.GameObjects.Image, dx: number, dy: number, base: number): void {
    const x = target.x + dx;
    const y = target.y + dy;
    this.tweens.add({ targets: target, x, duration: 140, ease: "Quad.easeOut" });
    this.tweens.add({ targets: target, y: y - 12, duration: 70, ease: "Quad.easeOut" });
    this.time.delayedCall(70, () => this.tweens.add({ targets: target, y, duration: 70, ease: "Quad.easeIn" }));
    this.time.delayedCall(140, () => {
      target.setScale(base * 1.2, base * 0.8);
      this.tweens.add({ targets: target, scaleX: base, scaleY: base, duration: 120, ease: "Back.easeOut" });
    });
  }

  /// The cougar hops tile by tile up to a rabbit cornered by a hay bale and eats it.
  private buildHunt(stage: Phaser.GameObjects.Container): void {
    stage.add(this.strip(CY, "fieldA"));
    const startX = CX - TILE * 2;
    const rabbitX = CX + TILE;
    const bale = this.sprite(rabbitX + TILE, CY, "bale");
    const rabbit = this.sprite(rabbitX, CY, "rabbit");
    const cougar = this.sprite(startX, CY, "cougar");
    const bar = this.bar(CY + 110, 0);
    stage.add([bale, rabbit, cougar, ...bar.parts]);

    let filled = 0;
    const loop = (): void => {
      rabbit.setPosition(rabbitX, CY).setAlpha(1).setScale(PIXEL_SCALE);
      cougar.setPosition(startX, CY);
      for (let i = 0; i < 3; i++) this.time.delayedCall(300 + i * 380, () => this.hop(cougar, TILE, 0, PIXEL_SCALE));
      this.time.delayedCall(300 + 2 * 380 + 140, () => {
        this.tweens.add({ targets: rabbit, scale: PIXEL_SCALE * 2, alpha: 0, duration: 200 });
        this.float(stage, rabbitX, CY - 40, `CAUGHT! +${TUNING.ragePerRabbit}%`, "#ffffff");
        filled = filled >= 100 ? TUNING.ragePerRabbit : Math.min(100, filled + TUNING.ragePerRabbit);
        bar.set(filled);
      });
    };
    loop();
    this.time.addEvent({ delay: 2200, loop: true, callback: loop });
  }

  /// A car speeds past, and the cougar hops into the road right behind it.
  /// That's how a close call works in the game: the car has to pass you while you're in its lane.
  private buildCloseCall(stage: Phaser.GameObjects.Container): void {
    stage.add(this.strip(CY - TILE, "fieldA"));
    stage.add(this.strip(CY, "road"));
    stage.add(this.strip(CY + TILE, "fieldB"));
    const cougar = this.sprite(CX, CY + TILE, "cougar");
    const car = this.sprite(-40, CY, "car").setTint(0x6a9be0);
    stage.add([cougar, car]);

    const loop = (): void => {
      cougar.setPosition(CX, CY + TILE);
      car.setPosition(-40, CY);
      this.tweens.add({ targets: car, x: VIEW_W + 60, duration: 1100, ease: "Linear" });
      this.time.delayedCall(580, () => this.hop(cougar, 0, -TILE, PIXEL_SCALE));
      this.time.delayedCall(740, () => this.float(stage, CX, CY - 40, `CLOSE CALL! +${TUNING.ragePerCloseCall}%`, "#ffe066"));
      this.time.delayedCall(1300, () => this.hop(cougar, 0, -TILE, PIXEL_SCALE));
    };
    loop();
    this.time.addEvent({ delay: 2400, loop: true, callback: loop });
  }

  /// Full bar blinks "PRESS SPACE", then the cougar turns red and grows.
  private buildUnleash(stage: Phaser.GameObjects.Container): void {
    stage.add(this.strip(CY, "fieldA"));
    const cougar = this.sprite(CX, CY, "cougar");
    const bar = this.bar(CY + 110, 100);
    const key = this.text(CX, CY - 90, "[ SPACE ]", 26, "#ffffff");
    stage.add([cougar, ...bar.parts, key]);

    const loop = (): void => {
      cougar.clearTint().setScale(PIXEL_SCALE);
      key.setScale(1).setColor("#ffffff");
      this.time.delayedCall(700, () => {
        key.setScale(0.85).setColor("#ff5a5a");
        cougar.setTint(COLORS.rageGlow);
        this.tweens.add({ targets: cougar, scale: PIXEL_SCALE * 1.7, duration: 250, ease: "Back.easeOut" });
        this.float(stage, CX, CY - 50, "RAMPAGE!", "#ff3b3b", 26);
        this.cameras.main.flash(150, 255, 60, 60);
      });
    };
    loop();
    this.time.addEvent({ delay: 2000, loop: true, callback: loop });
  }

  /// Walks through the tiers in order using the real smash rules: high rage smashes trucks,
  /// lower rage only smashes cars, and once a vehicle can hurt you again the cougar has to dodge it.
  private buildRampage(stage: Phaser.GameObjects.Container): void {
    stage.add(this.strip(CY - TILE, "fieldA"));
    stage.add(this.strip(CY, "road"));
    const cougar = this.sprite(CX - 60, CY, "cougar").setTint(COLORS.rageGlow);
    const vehicle = this.sprite(VIEW_W + 60, CY, "truck").setFlipX(true);
    const bar = this.bar(CY + 110, 100);
    const note = this.text(CX, CY - 95, "", 17, "#ffffff");
    stage.add([vehicle, cougar, ...bar.parts, note]);

    const steps: { rage: number; kind: "truck" | "car"; note: string }[] = [
      { rage: 80, kind: "truck", note: "Above 50%: trucks get smashed" },
      { rage: 40, kind: "car", note: "25-50%: only cars get smashed" },
      { rage: 40, kind: "truck", note: "Trucks can hit you now. DODGE!" },
      { rage: 15, kind: "car", note: "Under 25%: dodge everything!" },
    ];
    let i = 0;
    const loop = (): void => {
      const step = steps[i % steps.length];
      i++;
      const smash = step.rage >= TUNING.smashAt[step.kind];
      const scale = PIXEL_SCALE * (1 + (step.rage / 100) * TUNING.maxRageScale);
      cougar.setPosition(CX - 60, CY).setScale(scale);
      vehicle.setTexture(step.kind).setPosition(VIEW_W + 60, CY).setAngle(0).setAlpha(1);
      if (step.kind === "car") vehicle.setTint(0xe06060);
      else vehicle.clearTint();
      bar.set(step.rage);
      note.setText(step.note).setColor(smash ? "#7dff7a" : "#ff5a5a");

      this.tweens.add({ targets: vehicle, x: smash ? CX - 10 : -120, duration: smash ? 600 : 1300, ease: "Linear" });
      if (smash) {
        this.time.delayedCall(600, () => {
          this.tweens.add({ targets: vehicle, x: CX + 140, y: CY - 120, angle: 200, alpha: 0, duration: 450 });
          this.float(stage, CX - 10, CY - 40, step.kind === "truck" ? "+10" : "+5", "#ffffff");
          this.cameras.main.shake(120, 0.008);
        });
      } else {
        this.time.delayedCall(350, () => this.hop(cougar, 0, -TILE, scale));
      }
    };
    loop();
    this.time.addEvent({ delay: 2000, loop: true, callback: loop });
  }

  /// A one-tile-tall lane that fills the panel width, like a row in the real game.
  private strip(y: number, texture: string): Phaser.GameObjects.TileSprite {
    return this.add.tileSprite(CX, y, (VIEW_W * 0.9) / PIXEL_SCALE, 32, texture).setScale(PIXEL_SCALE);
  }

  private sprite(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.add.image(x, y, key).setScale(PIXEL_SCALE);
  }

  /// A mini copy of the HUD rage bar with the same tier marks, so players learn to read the real one.
  private bar(y: number, start: number): { parts: Phaser.GameObjects.GameObject[]; set: (pct: number) => void } {
    const w = 260;
    const x = CX - w / 2;
    const bg = this.add.rectangle(x, y, w, 20, 0x000000, 0.7).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x, y, w, 20, COLORS.crimson).setOrigin(0, 0.5).setScale(start / 100, 1);
    const label = this.text(CX, y - 26, `RAGE ${start}%`, 16);
    const marks = [TUNING.smashAt.car, TUNING.smashAt.truck, TUNING.smashAt.train].map((p) =>
      this.add.rectangle(x + (w * p) / 100, y, 2, 24, 0xffffff),
    );
    const set = (pct: number): void => {
      this.tweens.add({ targets: fill, scaleX: pct / 100, duration: 300 });
      label.setText(`RAGE ${pct}%`);
    };
    return { parts: [bg, fill, ...marks, label], set };
  }

  private float(stage: Phaser.GameObjects.Container, x: number, y: number, value: string, color: string, size = 18): void {
    const t = this.text(x, y, value, size, color);
    stage.add(t);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private text(x: number, y: number, value: string, size: number, color = "#ffffff"): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: "center", stroke: "#000", strokeThickness: 5, lineSpacing: 6 })
      .setOrigin(0.5);
  }
}
