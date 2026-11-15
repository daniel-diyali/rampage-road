// Every number worth tweaking during playtesting lives here,
// so balancing the game never means digging through logic.

export const TILE = 48;
export const COLS = 13;
export const VIEW_W = TILE * COLS;
export const VIEW_H = 720;

// Sprites are drawn at 32px per tile and scaled up, so pixel art stays crisp.
export const PIXEL_SCALE = TILE / 32;

export const SPRITES = [
  "cougar", "rabbit", "car", "truck", "train", "log2", "log3", "log4",
  "bale", "sage", "fieldA", "fieldB", "road", "water", "rail",
] as const;

// Tinting the white car sprite gives traffic variety without drawing more cars.
export const CAR_TINTS = [0xffffff, 0xe06060, 0x6a9be0, 0x7cc47a, 0xf2c14e];

// Palouse wheat fields and WSU crimson give the game its own look
// instead of Crossy Road's green grass.
export const COLORS = {
  fieldA: 0xe3c770,
  fieldB: 0xd6b75c,
  hay: 0xa67c32,
  road: 0x44444f,
  river: 0x2f6fb8,
  rail: 0x5a4a42,
  railTie: 0x3a2e28,
  car: 0xf2f2f2,
  truck: 0x6b7a8f,
  train: 0x2b2b33,
  log: 0x9a6a3c,
  outline: 0x1e1612,
  rabbit: 0xd9c7a8,
  rabbitTail: 0xffffff,
  van: 0xe8e8e8,
  sirenRed: 0xff2a2a,
  sirenBlue: 0x2a6bff,
  cougar: 0xc8925a,
  cougarOutline: 0x2a1a10,
  crimson: 0x981e32,
  rageGlow: 0xff3b3b,
  dead: 0x222222,
  warning: 0xff2020,
};

export const TUNING = {
  smashAt: { car: 25, truck: 50, train: 75 },
  smashPoints: { car: 5, truck: 10, train: 25 },
  ragePerRabbit: 25,
  rabbitPoints: 3,
  rabbitChance: 0.5,
  rabbitFleeRange: 2,
  rabbitCooldown: 0.45,
  rabbitHopMs: 140,
  ragePerCloseCall: 8,
  closeCallRange: TILE * 0.6,
  rageDrainPerSec: 6,
  maxRageScale: 0.7,
  comboWindowMs: 1500,
  pounceRows: 1,
  vanStartSpeed: 0.55,
  vanAccel: 0.006,
  vanMaxGap: 4.5,
  vanWreckAt: 50,
  vanWreckPoints: 50,
  vanKnockback: 6,
  vanStunSec: 2.5,
  hitStopMs: 70,
  vehicleTrim: TILE * 0.25,
  playerHalfWidth: TILE * 0.2,
  logGrace: TILE * 0.25,
  hopMs: 110,
  pounceMs: 170,
  backtrackLimit: 4,
  lanesAhead: 22,
  lanesBehind: 12,
};

/// Center of a column in pixels.
export const colX = (c: number): number => c * TILE + TILE / 2;

/// Rows count upward, so higher rows sit at more negative y.
export const rowY = (r: number): number => -r * TILE;
