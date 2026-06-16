import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class ReplayImportPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];
  private lines: readonly string[] = [I18n.t('replay.empty')];

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    this.container = scene.add.container(0, 0);
    this.updateLayout(x, y, width, height);
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    const compact = width <= 420 || height <= 78;
    const paddingX = compact ? 10 : 14;
    const paddingY = compact ? 8 : 12;

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.frame?.destroy(true);
    this.header?.destroy(true);
    this.frame = PanelFrame.create(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      variant: 'card',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: x + width / 2,
      y: y + paddingY + (compact ? 7 : 10),
      width: width - paddingX * 2,
      title: I18n.t('replay.import'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  setMessage(lines: readonly string[]): void {
    this.lines = lines.length > 0 ? lines : [I18n.t('replay.empty')];
    this.renderRows();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 420 || this.height <= 78;
    const paddingX = compact ? 10 : 14;
    const paddingY = compact ? 8 : 12;
    const headerGap = compact ? 34 : 42;
    const rowHeight = compact ? 17 : 21;
    const rowGap = compact ? 3 : 5;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - paddingY - headerGap - 6 + rowGap) / (rowHeight + rowGap)));

    this.lines.slice(0, maxRows).forEach((line, index) => {
      const row = UIStatRow.create(
        this.scene,
        this.x + this.width / 2,
        this.y + paddingY + headerGap + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        index === 0 ? I18n.t('replay.status') : '',
        line,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          labelRatio: 0.26,
          backgroundAlpha: 0.28,
        },
      );
      this.rowObjects.push(row);
      this.container.add(row);
    });
  }

  private clearRows(): void {
    this.rowObjects.forEach((row) => row.destroy(true));
    this.rowObjects.length = 0;
  }
}
