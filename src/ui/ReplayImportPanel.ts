import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';

import { UITheme } from './UITheme';

export class ReplayImportPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly bodyText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    this.background = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      UITheme.panelBgColor,
      0.72,
    );
    this.background.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);
    this.bodyText = scene.add.text(x + 14, y + 12, I18n.t('replay.empty'), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      lineSpacing: 5,
      wordWrap: { width: width - 28 },
    });
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.bodyText.setPosition(x + 14, y + 12);
    this.bodyText.setWordWrapWidth(width - 28);
    this.bodyText.setFixedSize(width - 28, height - 18);
  }

  setMessage(lines: readonly string[]): void {
    this.bodyText.setText(lines.join('\n'));
  }

  destroy(): void {
    this.background.destroy();
    this.bodyText.destroy();
  }
}
