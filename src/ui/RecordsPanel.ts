import Phaser from 'phaser';

import { UITheme, toCssColor } from './UITheme';

export class RecordsPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(20);

    this.background = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.75);

    this.titleText = scene.add.text(x + 24, y + 18, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });

    this.bodyText = scene.add.text(x + 24, y + 64, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      lineSpacing: 8,
      wordWrap: { width: width - 48 },
    });

    this.container.add([this.background, this.titleText, this.bodyText]);
    this.updateLayout(x, y, width, height);
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.titleText.setPosition(x + 24, y + 18);
    this.bodyText.setPosition(x + 24, y + 64);
    this.bodyText.setWordWrapWidth(width - 48);
    this.bodyText.setFixedSize(width - 48, height - 86);
  }

  setContent(title: string, lines: readonly string[]): void {
    this.titleText.setText(title);
    this.bodyText.setText(lines.join('\n'));
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
