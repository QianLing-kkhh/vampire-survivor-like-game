import Phaser from 'phaser';

import { UITemporaryMessage } from './components/UITemporaryMessage';

export interface CenterMessageOptions {
  kind?: 'normal' | 'boss';
  durationMs?: number;
}

export class CenterMessageController {
  private readonly messages = new Set<Phaser.GameObjects.Text>();

  constructor(private readonly scene: Phaser.Scene) {}

  show(message: string, options: CenterMessageOptions = {}): void {
    const camera = this.scene.cameras.main;
    const isBoss = options.kind === 'boss';
    const compact = camera.width < 900 || camera.height < 520;
    const text = UITemporaryMessage.show(this.scene, {
      x: camera.scrollX + camera.width / 2,
      y: camera.scrollY + camera.height * (isBoss ? 0.34 : 0.5),
      text: message,
      kind: options.kind ?? 'normal',
      compact,
      durationMs: options.durationMs ?? (isBoss ? 2200 : 1600),
      depth: 100,
      scrollFactor: 1,
      wordWrapWidth: Math.max(240, camera.width * 0.72),
      yOffset: 28,
      color: isBoss ? '#facc15' : '#ffffff',
      fontSize: isBoss ? compact ? '34px' : '42px' : compact ? '28px' : '36px',
      stroke: isBoss ? '#7f1d1d' : '#111827',
      strokeThickness: isBoss ? 7 : 6,
      onComplete: (completedText) => {
        this.messages.delete(completedText);
      },
    });

    this.messages.add(text);
  }

  clear(): void {
    for (const message of this.messages) {
      this.scene.tweens.killTweensOf(message);

      if (message.active) {
        message.destroy();
      }
    }

    this.messages.clear();
  }
}
