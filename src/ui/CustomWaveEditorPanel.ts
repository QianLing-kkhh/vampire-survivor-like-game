import Phaser from 'phaser';

import { CustomWaveDefinition } from '../custom/CustomStageSchema';
import { I18n } from '../i18n/I18n';

import { UITheme, toCssColor } from './UITheme';

const MAX_WAVE_ROWS = 9;

export class CustomWaveEditorPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly rowTexts: Phaser.GameObjects.Text[] = [];

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
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.7);
    this.titleText = scene.add.text(x + 18, y + 14, I18n.t('customStage.editWaves'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.titleText.setPosition(x + 18, y + 14);
  }

  render(
    waves: readonly CustomWaveDefinition[],
    selectedIndex: number,
    onSelect: (index: number) => void,
  ): void {
    this.clearRows();

    if (waves.length === 0) {
      this.addRow(I18n.t('common.none'), 0, false);
      return;
    }

    waves.slice(0, MAX_WAVE_ROWS).forEach((wave, index) => {
      const row = this.addRow(this.formatWave(wave, index), index, index === selectedIndex);

      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => onSelect(index));
    });

    if (waves.length > MAX_WAVE_ROWS) {
      this.addRow(`+${waves.length - MAX_WAVE_ROWS} more`, MAX_WAVE_ROWS, false);
    }
  }

  destroy(): void {
    this.clearRows();
    this.background.destroy();
    this.titleText.destroy();
  }

  private addRow(
    text: string,
    index: number,
    selected: boolean,
  ): Phaser.GameObjects.Text {
    const row = this.scene.add.text(this.x + 16, this.y + 56 + index * 30, text, {
      backgroundColor: selected ? toCssColor(UITheme.buttonHoverColor) : undefined,
      color: selected ? UITheme.textColor : UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      fixedWidth: this.width - 32,
      fixedHeight: 26,
      padding: { x: 8, y: 4 },
    });

    this.rowTexts.push(row);
    return row;
  }

  private clearRows(): void {
    this.rowTexts.forEach((row) => row.destroy());
    this.rowTexts.length = 0;
  }

  private formatWave(wave: CustomWaveDefinition, index: number): string {
    return `#${index + 1} t=${wave.startTime} ${wave.enemyId} count=${wave.count} interval=${wave.interval} duration=${wave.duration ?? '-'}`;
  }
}
