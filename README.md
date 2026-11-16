# Rampage Road

**A cougar loose on the Palouse. Unleash the beast.**

Made in 48 hours for the [Crimson Game Jam 2026](https://itch.io/jam/crimson-game-jam-2026) (WSU Game Dev Club). Theme: **Unleash the Beast**.

▶️ **Play in your browser:** _add your itch.io link here_

---

## How to play

Hop across wheat fields, roads, rivers, and rail lines. Hunt jackrabbits and survive close calls to build **RAGE**. When the bar hits 100%, unleash it and plow through traffic. Just don't let animal control catch you.

| Key | Action |
|---|---|
| Arrows / WASD | Hop |
| Space (at 100% rage) | **Unleash** the rampage |
| M | Mute |
| R | Run again (after a run ends) |
| L | Leaderboard (after a run ends) |
| T | Back to title / change name |
| N | Change name (on the title screen) |

### Mechanics
- **Hunt jackrabbits.** They run away from you. Corner them against hay bales or the edge of the screen to catch them.
- **Close calls.** When a car or train barely misses you, you get rage. Taking risks fills the bar faster.
- **Tiered rage.** At 100% you're immune to everything. As the bar drains you lose those powers one at a time:
  - Below **75%**, trains can hit you again.
  - Below **50%**, trucks can.
  - Below **25%**, cars can.

  The bar blinks just before each drop, and a banner tells you what changed.
- **Animal control.** The van is always right behind you. Wreck it while raging (50%+) for bonus points and some breathing room.
- **Smash combos.** Ramming several vehicles in a row multiplies your points.
- **Leaderboard.** Enter a name once, and your best score goes on the shared board.

---

## Running it locally

Requires [Node.js](https://nodejs.org/) 20+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Online leaderboard (optional)

The game works fine without it. If it isn't set up, the leaderboard screen is simply skipped.

1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run [`supabase/leaderboard.sql`](supabase/leaderboard.sql). This creates the `scores` table. Players can read the board but can only write through a function that keeps each name's highest score.
3. Copy `.env.example` to `.env.local` and fill in your project URL and **publishable/anon** key. Never use the secret key.
4. Restart `npm run dev`.

`.env.local` is git-ignored. The public key is safe to ship because the database rules limit what it can do.

---

## Building for itch.io

```bash
npm run build
```

Zip the **contents** of `dist/` (not the folder itself), upload it to itch.io as an HTML5 project, and tick "This file will be played in the browser." A viewport of about 640×740 with fullscreen enabled works well.

Build on a machine with `.env.local` if you want the leaderboard turned on. The keys are included in the build.

---

## Project structure

```
src/
  main.ts                    Boots Phaser and registers scenes
  config.ts                  All sizes, colors, and tuning numbers
  types.ts                   Shared lane/mover types
  scenes/
    TitleScene.ts            Title, name entry, asset loading
    LeaderboardScene.ts      Top 10 before each run
    GameScene.ts             The run: cougar, input, collisions, camera
  world/
    LaneManager.ts           Endless lane generation and traffic
    PreyManager.ts           Fleeing jackrabbits
    AnimalControl.ts         The chasing van
  systems/
    RageMeter.ts             Rage rules (no Phaser, easy to test)
    AudioManager.ts          Auto-loads sounds from src/assets/audio
    HighScore.ts             Per-player best, saved in the browser
    PlayerName.ts            Saved player name
  services/
    LeaderboardService.ts    Supabase REST calls
  ui/Hud.ts                  Rage bar, score, banners
  fx/Effects.ts              Particles and pop-up text
  assets/audio/              Sound files (picked up by filename)
public/assets/sprites/       Pixel art (32×32 per tile)
supabase/leaderboard.sql     Database setup
```

Most balancing happens in `src/config.ts`, things like van speed, rage gain and drain, rabbit behavior, and hitbox sizes.

## Tech
- [Phaser 4](https://phaser.io/) + TypeScript
- [Vite](https://vitejs.dev/) for dev server and builds
- [Supabase](https://supabase.com/) for the online leaderboard

---

## Credits

- **Daniel Diyali**: design, programming
- **Adriano Perez**: audio and music
- **Sprites**: Drawn and Edited in [Piskel](https://www.piskelapp.com/).
- **Sound effects**: made in [jsfxr](https://sfxr.me/)
- **Music**: made in [BeepBox](https://www.beepbox.co/)
- **Train horn and train pass sounds**: from [Freesound](https://freesound.org/) (CC0)

Full audio credits, with creators and links, are in [CREDITS.md](CREDITS.md).

Made at Washington State University, Pullman, WA. Go Cougs.
