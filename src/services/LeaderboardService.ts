// Talks to the shared Supabase leaderboard over plain HTTP, so no extra library is needed.
// If the keys aren't set or the network is down, every call quietly does nothing,
// because the game must never wait on (or break because of) the leaderboard.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const TIMEOUT_MS = 4000;

export interface ScoreRow {
  name: string;
  score: number;
}

export const LeaderboardService = {
  get enabled(): boolean {
    return Boolean(URL && KEY);
  },

  /// Returns null on any failure so the screen can show "offline" instead of crashing.
  async top(limit = 10): Promise<ScoreRow[] | null> {
    if (!this.enabled) return null;
    try {
      const res = await fetch(`${URL}/rest/v1/scores?select=name,score&order=score.desc,updated_at.asc&limit=${limit}`, {
        headers: { apikey: KEY! },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return res.ok ? ((await res.json()) as ScoreRow[]) : null;
    } catch {
      return null;
    }
  },

  /// Goes through a database function that only keeps a player's highest score,
  /// so players can't overwrite or delete anyone's entry.
  async submit(name: string, score: number): Promise<void> {
    if (!this.enabled || !name || score <= 0) return;
    try {
      await fetch(`${URL}/rest/v1/rpc/submit_score`, {
        method: "POST",
        headers: { apikey: KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ p_name: name, p_score: score }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return;
    }
  },
};
