import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export class UIBadge {
  static create(scene: Phaser.Scene, x: number, y: number, label: string, color = UITheme.colors.accentBlue): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const text = scene.add.text(0, 0, label, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.sizes.badgeFontSize,
      fontStyle: 'bold',
      padding: { x: 8, y: 4 },
    });
    text.setOrigin(0.5);
    const width = Math.max(42, text.width + 16);
    const height = 22;
    const bg = scene.add.graphics();
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.badge);
    bg.lineStyle(1, color, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.badge);
    container.add([bg, text]);
    return container;
  }
}
