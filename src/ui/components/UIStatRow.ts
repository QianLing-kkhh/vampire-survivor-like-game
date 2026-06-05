import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export class UIStatRow {
  static create(scene: Phaser.Scene, x: number, y: number, width: number, label: string, value: string): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, 26, UITheme.colors.panelBase, 0.42);
    bg.setStrokeStyle(1, UITheme.colors.borderPrimary, 0.22);
    const labelText = scene.add.text(-width / 2 + 10, 0, label, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
    });
    labelText.setOrigin(0, 0.5);
    const valueText = scene.add.text(width / 2 - 10, 0, value, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      fontStyle: 'bold',
    });
    valueText.setOrigin(1, 0.5);
    container.add([bg, labelText, valueText]);
    return container;
  }
}
