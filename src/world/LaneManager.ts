// Lanes are generated just ahead of the player and destroyed behind them,
// so the road is endless without memory growing forever.
import Phaser from "phaser";
import { COLS, COLORS, TILE, TUNING, VIEW_W, colX, rowY } from "../config";
import type { Lane, LaneType, Mover, MoverKind } from "../types";

export class LaneManager {
  private lanes = new Map<number, Lane>();
  private snacks = new Map<string, Phaser.GameObjects.Rectangle>();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get(row: number): Lane | undefined {
    return this.lanes.get(row);
  }

  ensureRange(from: number, to: number): void {
    for (let r = from; r <= to; r++) this.ensure(r);
  }

  /// Safe to call on any row; it only builds the lane the first time.
  ensure(r: number): Lane {
    const existing = this.lanes.get(r);
    if (existing) return existing;

    const type = this.pickType(r);
    const lane: Lane = {
      row: r,
      type,
      bg: this.scene.add.rectangle(VIEW_W / 2, rowY(r), VIEW_W, TILE, this.laneColor(type, r)).setDepth(0),
      movers: [],
      blockers: new Set(),
      decor: [],
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 0,
      spawnTimer: 0,
      spawnEvery: 0,
      gapTiles: [0, 0],
      logTiles: 0,
    };
    this.lanes.set(r, lane);

    if (type === "field") this.fillField(lane);
    if (type === "road") this.setupTraffic(lane, 70, 160, [2, 4.5]);
    if (type === "river") {
      lane.logTiles = Phaser.Math.Between(2, 4);
      this.setupTraffic(lane, 50, 95, [1, 2]);
    }
    if (type === "rail") this.setupRail(lane);
    return lane;
  }

  /// The first rows are always fields so a new run never starts with an instant death.
  private pickType(r: number): LaneType {
    if (r <= 2) return "field";
    const roll = Math.random();
    if (roll < 0.33) return "field";
    if (roll < 0.68) return "road";
    if (roll < 0.87) return "river";
    return "rail";
  }

  /// Alternating field shades make each row easy to count.
  private laneColor(type: LaneType, r: number): number {
    if (type === "field") return r % 2 === 0 ? COLORS.fieldA : COLORS.fieldB;
    return COLORS[type];
  }

  /// Rows behind the start are solid hay so the player can't wander off the bottom.
  /// Snacks only spawn on fields because that's the safe place to grab them.
  private fillField(lane: Lane): void {
    const r = lane.row;
    const baleCount = r < 0 ? COLS : r <= 2 ? 0 : Phaser.Math.Between(0, 3);
    while (lane.blockers.size < baleCount) lane.blockers.add(Phaser.Math.Between(0, COLS - 1));

    for (const c of lane.blockers) {
      lane.decor.push(this.scene.add.rectangle(colX(c), rowY(r), TILE * 0.75, TILE * 0.6, COLORS.hay).setDepth(5));
    }

    if (r <= 2 || Math.random() >= TUNING.snackChance) return;
    const free = [...Array(COLS).keys()].filter((c) => !lane.blockers.has(c));
    const c = Phaser.Utils.Array.GetRandom(free) as number;
    const snack = this.scene.add.rectangle(colX(c), rowY(r), TILE * 0.3, TILE * 0.3, COLORS.snack).setDepth(4);
    this.scene.tweens.add({ targets: snack, angle: 360, duration: 2000, repeat: -1 });
    this.snacks.set(this.key(r, c), snack);
  }

  /// Lanes start already full of traffic so the screen never looks empty on load.
  /// Movers are placed outward from the side they enter on, and spacing is measured
  /// edge to edge, so the first new arrival can never overlap one already there.
  private setupTraffic(lane: Lane, minSpeed: number, maxSpeed: number, gapTiles: [number, number]): void {
    lane.speed = Phaser.Math.Between(minSpeed, maxSpeed);
    lane.gapTiles = gapTiles;
    const firstOffset = Phaser.Math.Between(0, TILE * 3);
    let offset = firstOffset;
    while (offset < VIEW_W + TILE * 2) {
      const { kind, w } = this.pickMover(lane);
      const x = lane.dir > 0 ? offset + w / 2 : VIEW_W - offset - w / 2;
      this.spawn(lane, kind, w, x);
      offset += w + this.randomGap(lane);
    }
    lane.spawnTimer = Math.max(0, this.randomGap(lane) - firstOffset) / lane.speed;
  }

  private randomGap(lane: Lane): number {
    return Phaser.Math.FloatBetween(lane.gapTiles[0], lane.gapTiles[1]) * TILE;
  }

  /// Trains are too fast to react to, so a blinking light warns the player first.
  private setupRail(lane: Lane): void {
    const y = rowY(lane.row);
    lane.speed = 950;
    lane.spawnEvery = Phaser.Math.FloatBetween(3.5, 6.5);
    lane.spawnTimer = Phaser.Math.FloatBetween(2, 5);
    lane.warning = this.scene.add
      .rectangle(lane.dir > 0 ? 10 : VIEW_W - 10, y, 12, 12, COLORS.warning)
      .setDepth(7)
      .setVisible(false);
    lane.decor.push(lane.warning);
    for (let i = 0; i < COLS * 2; i++) {
      lane.decor.push(this.scene.add.rectangle(i * (TILE / 2) + TILE / 4, y, 6, TILE * 0.8, COLORS.railTie).setDepth(1));
    }
  }

  /// Decides what kind of mover a lane gets and how wide it is.
  private pickMover(lane: Lane): { kind: MoverKind; w: number } {
    if (lane.type === "road") {
      const kind: MoverKind = Math.random() < 0.3 ? "truck" : "car";
      return { kind, w: kind === "truck" ? TILE * 2 : TILE * 0.95 };
    }
    if (lane.type === "river") return { kind: "log", w: TILE * lane.logTiles };
    return { kind: "train", w: TILE * 12 };
  }

  /// With no x given, the mover starts just offscreen on the side it drives in from.
  private spawn(lane: Lane, kind: MoverKind, w: number, atX?: number): void {
    const x = atX ?? (lane.dir > 0 ? -w / 2 : VIEW_W + w / 2);
    const h = kind === "log" ? TILE * 0.7 : TILE * 0.8;
    const body = this.scene.add
      .rectangle(x, rowY(lane.row), w, h, COLORS[kind])
      .setStrokeStyle(3, COLORS.outline)
      .setDepth(kind === "log" ? 2 : 6);
    lane.movers.push({ body, kind });
  }

  update(dt: number): void {
    for (const lane of this.lanes.values()) {
      if (lane.type === "field") continue;
      for (const m of lane.movers) m.body.x += lane.dir * lane.speed * dt;
      lane.movers = lane.movers.filter((m) => {
        const off = m.body.x < -m.body.width || m.body.x > VIEW_W + m.body.width;
        if (off) m.body.destroy();
        return !off;
      });
      lane.spawnTimer -= dt;
      if (lane.warning) lane.warning.setVisible(lane.spawnTimer < 1.2 && Math.floor(lane.spawnTimer * 8) % 2 === 0);
      if (lane.spawnTimer <= 0) {
        const { kind, w } = this.pickMover(lane);
        this.spawn(lane, kind, w);
        lane.spawnTimer = lane.type === "rail" ? lane.spawnEvery : (w + this.randomGap(lane)) / lane.speed;
      }
    }
  }

  /// Only unlinks the mover; the scene destroys it after the smash animation.
  removeMover(lane: Lane, mover: Mover): void {
    lane.movers = lane.movers.filter((m) => m !== mover);
  }

  /// Returns true when a snack was eaten so the scene can add rage.
  takeSnack(row: number, col: number): boolean {
    const key = this.key(row, col);
    const snack = this.snacks.get(key);
    if (!snack) return false;
    this.snacks.delete(key);
    this.scene.tweens.killTweensOf(snack);
    this.scene.tweens.add({ targets: snack, scale: 2.5, alpha: 0, duration: 150, onComplete: () => snack.destroy() });
    return true;
  }

  cleanupBelow(row: number): void {
    for (const [r, lane] of this.lanes) {
      if (r >= row) continue;
      lane.bg.destroy();
      lane.movers.forEach((m) => m.body.destroy());
      lane.decor.forEach((d) => d.destroy());
      for (let c = 0; c < COLS; c++) {
        this.snacks.get(this.key(r, c))?.destroy();
        this.snacks.delete(this.key(r, c));
      }
      this.lanes.delete(r);
    }
  }

  private key(row: number, col: number): string {
    return `${row}:${col}`;
  }
}
