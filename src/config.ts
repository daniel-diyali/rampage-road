// Every number worth tweaking during playtesting lives here,
// so balancing the game never means digging through logic.

export const TILE = 48;
export const COLS = 13;
export const VIEW_W = TILE * COLS;
export const VIEW_H = 720;

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
  snack: 0xff7ab8,
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
  ragePerSnack: 25,
  ragePerCloseCall: 8,
  closeCallRange: TILE * 0.6,
  rageDrainPerSec: 6,
  maxRageScale: 0.7,
  snackChance: 0.5,
  comboWindowMs: 1500,
  pounceRows: 2,
  cameraCreep: 14,
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
