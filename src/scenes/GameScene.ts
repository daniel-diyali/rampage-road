// The scene only coordinates: lanes, rage, and the HUD each live in their own class.
// What stays here is the cougar itself, input, collisions, and the camera.
import Phaser from "phaser";
import { COLS, COLORS, PIXEL_SCALE, TILE, TUNING, VIEW_H, VIEW_W, colX, rowY } from "../config";
import type { Lane, Mover, VehicleKind } from "../types";
import { LaneManager } from "../world/LaneManager";
import { PreyManager } from "../world/PreyManager";
import { AnimalControl } from "../world/AnimalControl";
import { RageMeter } from "../systems/RageMeter";
import { Hud } from "../ui/Hud";
import { Effects } from "../fx/Effects";
import { HighScore } from "../systems/HighScore";
import { AudioManager } from "../systems/AudioManager";
import { PlayerName } from "../systems/PlayerName";
import { LeaderboardService } from "../services/LeaderboardService";

const TUTORIAL =
  "ARROWS / WASD to hop\nHunt JACKRABBITS + get CLOSE CALLS for RAGE\nSPACE at 100% to UNLEASH\nAnimal control is right behind you...";

export class GameScene extends Phaser.Scene {
  private lanes!: LaneManager;
  private prey!: PreyManager;
  private van!: AnimalControl;
  private rage!: RageMeter;
  private hud!: Hud;
  private fx!: Effects;
  private audio!: AudioManager;
  private wasReady = false;
  private wasUnleashed = false;
  private rageTint!: Phaser.GameObjects.Rectangle;
  /** Hop squash is tweened separately so it can stack on top of the rage size. */
  private squash = { x: 1, y: 1 };
  private freezeUntil = 0;
  /** A hop pressed mid-air is remembered and played on landing, so fast inputs never get eaten. */
  private queuedHop: [number, number] | null = null;
  private player!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private closeCalls!: WeakSet<Mover>;
  private col = 0;
  private row = 0;
  private maxRow = 0;
  private bonus = 0;
  private combo = 0;
  private lastSmashAt = 0;
  private hopping = false;
  private onLog = false;
  private dead = false;

  constructor() {
    super("Game");
  }

  /// Phaser reuses this object on restart, so every field is reset here, not in the constructor.
  create(): void {
    this.col = Math.floor(COLS / 2);
    this.row = 0;
    this.maxRow = 0;
    this.bonus = 0;
    this.combo = 0;
    this.lastSmashAt = 0;
    this.hopping = false;
    this.onLog = false;
    this.dead = false;
    this.closeCalls = new WeakSet();
    this.squash = { x: 1, y: 1 };
    this.freezeUntil = 0;
    this.queuedHop = null;
    this.fx = new Effects(this);
    this.audio = new AudioManager(this);
    this.audio.startMusic();
    this.audio.setRage(false);
    this.wasReady = false;
    this.wasUnleashed = false;

    this.prey = new PreyManager(this);
    this.lanes = new LaneManager(
      this,
      (lane) => this.prey.maybeSpawn(lane),
      (lane) => this.onTrainWarning(lane.row),
    );
    this.prey.attach(this.lanes);
    this.lanes.ensureRange(-6, TUNING.lanesAhead);
    this.rage = new RageMeter();

    this.player = this.add.image(colX(this.col), rowY(this.row), "cougar").setScale(PIXEL_SCALE).setDepth(10);

    this.van = new AnimalControl(this, this.player.x);

    this.keys = this.input.keyboard!.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,R,M,L,T") as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.setBackgroundColor(COLORS.fieldA);
    this.cameras.main.scrollY = this.player.y - VIEW_H * 0.65;

    this.rageTint = this.add
      .rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, COLORS.rageGlow)
      .setScrollFactor(0)
      .setDepth(90)
      .setAlpha(0);

    this.hud = new Hud(this, HighScore.get(PlayerName.get()));
    this.hud.showMessage(TUTORIAL);
  }

  /// Order matters: things move first, then we check what the cougar ran into.
  /// During a hit-stop the world pauses for a few frames so big impacts feel heavy.
  update(time: number, delta: number): void {
    if (this.dead) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.scene.restart();
      else if (Phaser.Input.Keyboard.JustDown(this.keys.L) && LeaderboardService.enabled) this.scene.start("Leaderboard");
      else if (Phaser.Input.Keyboard.JustDown(this.keys.T)) this.scene.start("Title");
      return;
    }
    if (time < this.freezeUntil) return;
    const dt = delta / 1000;
    this.lanes.update(dt);
    this.rideLog(dt);
    this.handleInput();
    this.updateRage(dt);
    this.prey.update(dt, this.row, this.col);
    this.checkCollisions(time);
    if (this.dead) return;
    this.updateVan(dt);
    if (this.dead) return;
    this.updateCamera();
    this.lanes.ensureRange(this.maxRow, this.maxRow + TUNING.lanesAhead);
    this.lanes.cleanupBelow(this.maxRow - TUNING.lanesBehind);
    this.prey.cleanupBelow(this.maxRow - TUNING.lanesBehind);
    this.hud.update(this.rage.percent, this.rage.unleashed, this.rage.ready, this.score);
  }

  private get score(): number {
    return this.maxRow + this.bonus;
  }

  /// Logs carry the cougar sideways; getting pushed off-screen ends the run.
  private rideLog(dt: number): void {
    if (!this.onLog || this.hopping) return;
    const lane = this.lanes.get(this.row)!;
    this.player.x += lane.dir * lane.speed * dt;
    if (this.player.x < 0 || this.player.x > this.scale.width) this.die("SWEPT AWAY");
  }

  /// SPACE is checked even mid-hop so unleashing never feels laggy.
  /// A direction pressed mid-hop is queued instead of dropped.
  private handleInput(): void {
    const k = this.keys;
    const pressed = Phaser.Input.Keyboard.JustDown;
    if (pressed(k.M)) this.audio.toggleMute();
    if (pressed(k.SPACE) && this.rage.unleash()) this.playUnleashFx();

    let dir: [number, number] | null = null;
    if (pressed(k.UP) || pressed(k.W)) dir = [0, 1];
    else if (pressed(k.DOWN) || pressed(k.S)) dir = [0, -1];
    else if (pressed(k.LEFT) || pressed(k.A)) dir = [-1, 0];
    else if (pressed(k.RIGHT) || pressed(k.D)) dir = [1, 0];
    if (!dir) return;

    if (this.hopping) this.queuedHop = dir;
    else this.tryHop(dir[0], dir[1]);
  }

  /// While unleashed, forward hops become pounces that cover two rows,
  /// so the rampage plays differently instead of just being invincible.
  private tryHop(dc: number, dr: number): void {
    const pouncing = this.rage.unleashed && dr > 0;
    const fromCol = Phaser.Math.Clamp(Math.round((this.player.x - TILE / 2) / TILE), 0, COLS - 1);
    const nc = fromCol + dc;
    const nr = this.row + (pouncing ? TUNING.pounceRows : dr);
    if (nc < 0 || nc >= COLS || nr < this.maxRow - TUNING.backtrackLimit) return;
    const target = this.lanes.ensure(nr);
    if (target.type === "field" && target.blockers.has(nc)) return;

    this.hud.hideMessage();
    this.hopping = true;
    this.onLog = false;
    this.squash = { x: 0.8, y: 1.25 };
    this.audio.play(pouncing ? "pounce" : "hop", pouncing ? 0.7 : 0.35);
    this.tweens.add({
      targets: this.player,
      x: colX(nc),
      y: rowY(nr),
      duration: pouncing ? TUNING.pounceMs : TUNING.hopMs,
      ease: pouncing ? "Back.easeOut" : "Quad.easeOut",
      onComplete: () => this.land(nc, nr),
    });
  }

  /// Landing squashes the cougar flat for a moment and kicks up dust,
  /// which makes each hop feel like it has weight.
  private land(col: number, row: number): void {
    this.hopping = false;
    this.squash = { x: 1.25, y: 0.8 };
    this.tweens.add({ targets: this.squash, x: 1, y: 1, duration: 140, ease: "Back.easeOut" });
    if (this.lanes.get(row)?.type === "field") this.fx.burst(this.player.x, this.player.y + TILE * 0.3, COLORS.hay, 4, 18, 4);
    this.col = col;
    this.row = row;
    this.maxRow = Math.max(this.maxRow, row);
    if (this.prey.tryCatch(row, col)) {
      this.rage.add(TUNING.ragePerRabbit);
      this.bonus += TUNING.rabbitPoints;
      this.fx.floatText(this.player.x, this.player.y - TILE / 2, "CAUGHT!", "#ffffff");
      this.audio.play("snack");
      this.fx.burst(this.player.x, this.player.y, COLORS.rabbit, 8, 30, 5);
    }

    this.checkCollisions(this.time.now);
    if (this.dead || !this.queuedHop) return;
    const [dc, dr] = this.queuedHop;
    this.queuedHop = null;
    this.tryHop(dc, dr);
  }

  private playUnleashFx(): void {
    this.audio.play("unleash", 0.9);
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(180, 255, 60, 60);
    this.fx.floatText(this.player.x, this.player.y - TILE, "RAMPAGE!", "#ff3b3b", 28);
    this.fx.burst(this.player.x, this.player.y, COLORS.rageGlow, 16, 70, 8);
  }

  /// The cougar's size and color are the player's main clue to how much power is left.
  /// The pulsing red screen tint makes it obvious to anyone watching that rage is on.
  private updateRage(dt: number): void {
    this.rage.update(dt);
    const s = this.rage.scale * PIXEL_SCALE;
    this.player.setScale(s * this.squash.x, s * this.squash.y);
    if (this.rage.unleashed) this.player.setTint(COLORS.rageGlow);
    else this.player.clearTint();
    const pulse = 0.08 + Math.sin(this.time.now / 120) * 0.04;
    this.rageTint.setAlpha(this.rage.unleashed ? pulse : 0);

    if (this.rage.ready && !this.wasReady) this.audio.play("rage_ready", 0.7);
    if (this.rage.unleashed !== this.wasUnleashed) this.audio.setRage(this.rage.unleashed);
    this.wasReady = this.rage.ready;
    this.wasUnleashed = this.rage.unleashed;
  }

  /// Only trains near the cougar ring the bell, otherwise every offscreen rail would be noisy.
  private onTrainWarning(row: number): void {
    if (Math.abs(row - this.row) <= 6) this.audio.play("train_warning", 0.5);
  }

  /// Vehicle hitboxes are trimmed at both ends so only a real overlap counts as a hit.
  /// A vehicle that just barely passed the cougar counts as a close call and gives rage,
  /// which rewards risky crossings. Each vehicle can only give one close call.
  /// Nothing is checked mid-hop: once you commit to a hop, the lane you left can't kill you.
  /// Water kills instantly with no grace period, so fast tapping can't skip across a river.
  private checkCollisions(time: number): void {
    const lane = this.lanes.get(this.row);
    if (!lane || this.hopping) return;
    const px = this.player.x;

    if (lane.type === "road" || lane.type === "rail") {
      for (const m of [...lane.movers]) {
        const gap = Math.abs(m.body.x - px) - (m.body.displayWidth / 2 - TUNING.vehicleTrim);
        const kind = m.kind as VehicleKind;
        if (gap < TUNING.playerHalfWidth) {
          if (this.rage.canSmash(kind)) this.smash(lane, m, kind, time);
          else return this.die(kind === "train" ? "FLATTENED BY A TRAIN" : "ROADKILL");
          continue;
        }
        const alreadyPassed = (m.body.x - px) * lane.dir > 0;
        if (alreadyPassed && gap < TUNING.playerHalfWidth + TUNING.closeCallRange && !this.closeCalls.has(m)) {
          this.closeCalls.add(m);
          this.rage.add(TUNING.ragePerCloseCall);
          this.fx.floatText(px, this.player.y - TILE / 2, "CLOSE CALL!", "#ffe066");
          this.audio.play("close_call", 0.5);
        }
      }
    }

    if (lane.type === "river") {
      this.onLog = lane.movers.some((m) => Math.abs(m.body.x - px) < m.body.displayWidth / 2 + TUNING.logGrace);
      if (!this.onLog) this.die("SPLASH");
    }
  }

  /// Smashes close together build a combo multiplier to reward going wild during a rampage.
  private smash(lane: Lane, m: Mover, kind: VehicleKind, time: number): void {
    this.lanes.removeMover(lane, m);
    this.combo = time - this.lastSmashAt < TUNING.comboWindowMs ? this.combo + 1 : 1;
    this.lastSmashAt = time;
    const points = TUNING.smashPoints[kind] * this.combo;
    this.bonus += points;
    this.cameras.main.shake(140, 0.008);
    this.freezeUntil = time + TUNING.hitStopMs;
    this.audio.play(kind === "train" ? "smash_train" : "smash", 0.8);
    this.fx.burst(m.body.x, m.body.y, COLORS[kind], 10, 60, 7);

    const label = this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`;
    this.fx.floatText(m.body.x, m.body.y - TILE / 2, label, "#ffffff");
    this.tweens.add({
      targets: m.body,
      angle: Phaser.Math.Between(-200, 200),
      x: m.body.x + Phaser.Math.Between(-150, 150),
      y: m.body.y - 120,
      alpha: 0,
      duration: 450,
      onComplete: () => m.body.destroy(),
    });
  }

  /// The van doesn't start until the first hop, so reading the tutorial is safe.
  /// With enough rage, it gets wrecked instead of catching you.
  private updateVan(dt: number): void {
    this.van.update(dt, this.row, this.player.x, this.maxRow > 0);
    if (!this.van.reached(this.row)) return;
    if (this.rage.unleashed && this.rage.percent >= TUNING.vanWreckAt) {
      this.van.wreck();
      this.audio.play("smash_train", 0.9);
      this.bonus += TUNING.vanWreckPoints;
      this.cameras.main.shake(300, 0.015);
      this.fx.floatText(this.van.x, this.van.y - TILE, `VAN WRECKED +${TUNING.vanWreckPoints}`, "#ffe066", 22);
      this.fx.burst(this.van.x, this.van.y, COLORS.van, 14, 80, 8);
      return;
    }
    this.die("CAUGHT BY ANIMAL CONTROL");
  }

  /// The camera only follows upward; the van is what forces you to keep moving.
  private updateCamera(): void {
    const cam = this.cameras.main;
    const target = this.player.y - VIEW_H * 0.65;
    if (target < cam.scrollY) cam.scrollY = Phaser.Math.Linear(cam.scrollY, target, 0.12);
  }

  /// The guard stops a second collision in the same frame from running this twice.
  private die(reason: string): void {
    if (this.dead) return;
    this.dead = true;
    this.tweens.killTweensOf(this.player);
    this.player.setTint(COLORS.dead);
    this.rageTint.setAlpha(0);
    this.audio.play("death", 0.8);
    this.audio.setRage(false);
    this.cameras.main.shake(350, 0.015);
    this.fx.burst(this.player.x, this.player.y, COLORS.cougar, 12, 50, 6);

    this.hud.update(this.rage.percent, false, false, this.score);
    const name = PlayerName.get();
    const newBest = HighScore.submit(name, this.score);
    if (newBest) this.hud.setBest(this.score);
    void LeaderboardService.submit(name, this.score);

    const bestLine = newBest ? "NEW BEST!" : `BEST ${HighScore.get(name)}`;
    const boardLine = LeaderboardService.enabled ? "\nL for leaderboard" : "";
    this.hud.showMessage(
      `${reason}\n\n${name}  SCORE ${this.score}\n${bestLine}\n\nR to run again${boardLine}\nT for title / change name`,
    );
  }
}
