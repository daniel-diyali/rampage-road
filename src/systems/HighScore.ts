// Personal best is saved in the browser per player name, so friends sharing a laptop
// each keep their own best. Storage can be blocked (private mode, some embeds),
// so every access is guarded and the game just plays without a saved best.
const keyFor = (name: string): string => `rampage-road-best:${name}`;

export const HighScore = {
  get(name: string): number {
    try {
      return Number(localStorage.getItem(keyFor(name))) || 0;
    } catch {
      return 0;
    }
  },

  /// Returns true only when the score beats the old best, so the game can celebrate it.
  submit(name: string, score: number): boolean {
    if (score <= this.get(name)) return false;
    try {
      localStorage.setItem(keyFor(name), String(score));
    } catch {
      return false;
    }
    return true;
  },
};
