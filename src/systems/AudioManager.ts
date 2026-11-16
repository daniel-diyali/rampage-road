// Sounds are picked up automatically from src/assets/audio at build time, by filename.
// Any sound that isn't there yet is just skipped, so the game never breaks while
// audio is still being made, and new files work the moment they're dropped in.
import Phaser from "phaser";

const files = import.meta.glob("../assets/audio/*.{ogg,mp3,wav}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/// "../assets/audio/close_call.wav" -> "close_call"
const keyOf = (path: string): string => path.split("/").pop()!.replace(/\.[^.]+$/, "");

export type SoundKey =
  | "hop"
  | "pounce"
  | "snack"
  | "close_call"
  | "rage_ready"
  | "unleash"
  | "smash"
  | "smash_train"
  | "train_warning"
  | "train_pass"
  | "death";

const MUSIC_VOLUME = 0.35;

export class AudioManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /// Called from the first scene's preload so every scene can use the sounds.
  static preload(load: Phaser.Loader.LoaderPlugin): void {
    for (const [path, url] of Object.entries(files)) {
      if (!load.cacheManager.audio.exists(keyOf(path))) load.audio(keyOf(path), url);
    }
  }

  /// Small random pitch changes stop repeated sounds (like hops) from feeling robotic.
  play(key: SoundKey, volume = 0.6): void {
    if (!this.has(key)) return;
    this.scene.sound.play(key, { volume, detune: Phaser.Math.Between(-80, 80) });
  }

  /// The sound manager outlives scenes, so this checks first to avoid stacking
  /// a second copy of the music every time the player restarts.
  startMusic(): void {
    if (!this.has("music") || this.scene.sound.get("music")?.isPlaying) return;
    this.scene.sound.play("music", { loop: true, volume: MUSIC_VOLUME });
  }

  /// Uses the rage track if it exists; otherwise speeds the normal track up a bit.
  setRage(on: boolean): void {
    const music = this.scene.sound.get("music") as Phaser.Sound.WebAudioSound | null;
    if (this.has("music_rage")) {
      const rageTrack = this.scene.sound.get("music_rage");
      if (on && !rageTrack?.isPlaying) {
        music?.pause();
        this.scene.sound.play("music_rage", { loop: true, volume: MUSIC_VOLUME });
      } else if (!on && rageTrack?.isPlaying) {
        rageTrack.stop();
        music?.resume();
      }
      return;
    }
    music?.setRate(on ? 1.15 : 1);
  }

  /// Mute applies to every scene, so it carries over between runs.
  toggleMute(): void {
    this.scene.sound.mute = !this.scene.sound.mute;
  }

  private has(key: string): boolean {
    return this.scene.cache.audio.exists(key);
  }
}
