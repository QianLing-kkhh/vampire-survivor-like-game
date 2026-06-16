import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export type UITemporaryMessageKind = 'normal' | 'warning' | 'boss';

export interface UITemporaryMessageConfig {
  x: number;
  y: number;
  text: string;
  kind?: UITemporaryMessageKind;
  durationMs?: number;
  compact?: boolean;
  depth?: number;
  wordWrapWidth?: number;
  yOffset?: number;
  scrollFactor?: number;
  color?: string;
  fontSize?: string;
  stroke?: string;
  strokeThickness?: number;
  onComplete?: (message: Phaser.GameObjects.Text) => void;
}

export class UITemporaryMessage {
  static show(scene: Phaser.Scene, config: UITemporaryMessageConfig): Phaser.GameObjects.Text {
    const kind = config.kind ?? 'normal';
    const isBoss = kind === 'boss';
    const compact = config.compact === true;
    const text = scene.add.text(config.x, config.y, config.text, {
      color: config.color ?? UITemporaryMessage.getColor(kind),
      fontFamily: UITheme.fontFamily,
      fontSize: config.fontSize ?? (isBoss ? compact ? '30px' : '38px' : compact ? '18px' : '22px'),
      fontStyle: 'bold',
      stroke: config.stroke ?? (isBoss ? '#7f1d1d' : '#111827'),
      strokeThickness: config.strokeThickness ?? (isBoss ? compact ? 5 : 6 : 4),
      align: 'center',
      wordWrap: { width: config.wordWrapWidth ?? 520 },
    });

    text.setOrigin(0.5);
    text.setDepth(config.depth ?? 3000);
    text.setScrollFactor(config.scrollFactor ?? 0);
    scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - (config.yOffset ?? 24),
      duration: config.durationMs ?? (isBoss ? 2200 : 1400),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        config.onComplete?.(text);
        if (text.active) {
          text.destroy();
        }
      },
    });

    return text;
  }

  private static getColor(kind: UITemporaryMessageKind): string {
    switch (kind) {
      case 'boss':
        return '#facc15';
      case 'warning':
        return UITheme.colors.warning;
      case 'normal':
      default:
        return UITheme.textColor;
    }
  }
}
