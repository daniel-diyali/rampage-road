// Small reusable effects. Built from plain shapes and tweens so they keep
// working when the rectangles are swapped for real sprites later.
import Phaser from "phaser";

export class Effects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /// Bits fly outward and fade. Used for dust on landing and debris on smashes.
  burst(x: number, y: number, color: number, count: number, spread: number, size = 6): void {
    for (let i = 0; i < count; i++) {
      const bit = this.scene.add.rectangle(x, y, size, size, color).setDepth(19);
      const angle = Math.random() * Math.PI * 2;
      const dist = spread * (0.5 + Math.random() * 0.5);
      this.scene.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: 0.3,
        duration: 300 + Math.random() * 200,
        ease: "Quad.easeOut",
        onComplete: () => bit.destroy(),
      });
    }
  }

  /// Short pop-up text for feedback that should be noticed but not block play.
  floatText(x: number, y: number, text: string, color: string, size = 18): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: "monospace", fontSize: `${size}px`, color, stroke: "#000", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }
}
