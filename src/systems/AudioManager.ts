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

  /// Music tracks are created once and reused. Creating a new copy each time caused a bug where
  /// an old stopped copy got found instead of the playing one, so rage music never stopped.
  private track(key: "music" | "music_rage"): Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null {
    if (!this.has(key)) return null;
    const existing = this.scene.sound.get(key) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null;
    return existing ?? (this.scene.sound.add(key, { loop: true, volume: MUSIC_VOLUME }) as Phaser.Sound.WebAudioSound);
  }

  /// Browsers block audio until the first key press or click, so while it's locked
  /// the music waits and starts the moment it's allowed.
  /// Does nothing if the music is already playing or paused for a rampage.
  startMusic(): void {
    if (this.scene.sound.locked) {
      this.scene.sound.once("unlocked", () => this.startMusic());
      return;
    }
    const music = this.track("music");
    if (music && !music.isPlaying && !music.isPaused) music.play();
  }

  /// Swaps to the rage track while unleashed and back to the normal track after.
  /// Turning rage off stops every copy of the rage track, so nothing can be left playing.
  /// Without a rage track, the normal music just speeds up a bit instead.
  setRage(on: boolean): void {
    const music = this.track("music");
    const rage = this.track("music_rage");
    if (!rage) {
      music?.setRate(on ? 1.15 : 1);
      return;
    }
    if (on) {
      if (music?.isPlaying) music.pause();
      if (!rage.isPlaying) rage.play();
      return;
    }
    this.scene.sound.getAll("music_rage").forEach((s) => s.stop());
    if (music?.isPaused) music.resume();
    else if (music && !music.isPlaying) music.play();
  }

  /// Mute applies to every scene, so it carries over between runs.
  toggleMute(): void {
    this.scene.sound.mute = !this.scene.sound.mute;
  }

  private has(key: string): boolean {
    return this.scene.cache.audio.exists(key);
  }
}
