import Phaser from 'phaser';

import { FloatingText } from './FloatingText';

export class FloatingTextManager {
  private static readonly MAX_ACTIVE_TEXTS = 60;

  private readonly texts: FloatingText[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  showEnemyDamage(x: number, y: number, damage: number, isBoss = false): void {
    this.spawn(
      x,
      y - (isBoss ? 38 : 18),
      Math.ceil(damage).toString(),
      {
        color: '#f8fafc',
        fontSize: isBoss ? '22px' : '16px',
      },
    );
  }

  showPlayerDamage(x: number, y: number, damage: number): void {
    this.spawn(x, y - 28, `-${Math.ceil(damage)}`, {
      color: '#ef4444',
      fontSize: '22px',
    });
  }

  showPlayerHeal(x: number, y: number, amount: number): void {
    this.spawn(x, y - 34, `+${Math.ceil(amount)}`, {
      color: '#22c55e',
      fontSize: '20px',
    });
  }

  update(deltaMs: number): void {
    for (let index = this.texts.length - 1; index >= 0; index -= 1) {
      if (this.texts[index].update(deltaMs)) {
        continue;
      }

      this.texts.splice(index, 1);
    }
  }

  destroy(): void {
    for (const text of this.texts) {
      text.destroy();
    }

    this.texts.length = 0;
  }

  private spawn(
    x: number,
    y: number,
    value: string,
    config: {
      color: string;
      fontSize: string;
    },
  ): void {
    if (this.texts.length >= FloatingTextManager.MAX_ACTIVE_TEXTS) {
      const oldest = this.texts.shift();
      oldest?.destroy();
    }

    this.texts.push(new FloatingText(this.scene, x, y, value, config));
  }
}
