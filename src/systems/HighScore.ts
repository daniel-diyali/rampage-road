// Personal best is saved in the browser so it survives refreshes and restarts.
// Storage can be blocked (private mode, some embeds), so every access is guarded
// and the game just plays without a saved best if that happens.
const KEY = "rampage-road-best";

export const HighScore = {
  get(): number {
    try {
      return Number(localStorage.getItem(KEY)) || 0;
    } catch {
      return 0;
    }
  },

  /// Returns true only when the score beats the old best, so the game can celebrate it.
  submit(score: number): boolean {
    if (score <= this.get()) return false;
    try {
      localStorage.setItem(KEY, String(score));
    } catch {
      return false;
    }
    return true;
  },
};
