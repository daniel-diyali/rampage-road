// The player's name is saved in the browser so they only type it once.
// Names are kept short and simple so they fit the leaderboard and are easy to read.
const KEY = "rampage-road-name";
export const MAX_NAME_LENGTH = 10;

export const PlayerName = {
  get(): string {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },

  set(name: string): void {
    try {
      localStorage.setItem(KEY, PlayerName.clean(name));
    } catch {
      return;
    }
  },

  /// Only letters, numbers, and spaces, uppercased, so the database check never rejects it.
  clean(name: string): string {
    return name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, MAX_NAME_LENGTH);
  },
};
