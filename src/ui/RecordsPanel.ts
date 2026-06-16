import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIListRow, UIListRowTone } from './components/UIListRow';
import { UITheme } from './UITheme';

export type RecordsPanelRowTone = UIListRowTone;

export interface RecordsPanelRow {
  label: string;
  value?: string;
  status?: string;
  tone?: RecordsPanelRowTone;
}

type RecordsPanelEntry = string | RecordsPanelRow;

export class RecordsPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];
  private visibleLineLimit = 12;
  private currentTitle = '';
  private currentRows: readonly RecordsPanelEntry[] = [];
  private x = 0;
  private y = 0;
  private width = 0;
  private height = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(20);
    this.updateLayout(x, y, width, height);
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    const compact = width <= 360 || height <= 260;
    const paddingX = compact ? 14 : 20;
    const paddingTop = compact ? 12 : 16;
    const headerGap = compact ? 42 : 54;
    const rowStride = compact ? 22 : 27;

    this.frame?.destroy(true);
    this.frame = PanelFrame.create(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      variant: 'card',
    });
    this.container.addAt(this.frame, 0);
    this.visibleLineLimit = Math.max(4, Math.floor((height - paddingTop - headerGap - 12) / rowStride));
    this.renderContent();
  }

  setContent(title: string, lines: readonly string[]): void {
    this.currentTitle = title;
    this.currentRows = lines;
    this.renderContent();
  }

  setRows(title: string, rows: readonly RecordsPanelRow[]): void {
    this.currentTitle = title;
    this.currentRows = rows;
    this.renderContent();
  }

  private renderContent(): void {
    this.header?.destroy(true);
    this.header = undefined;
    this.clearRows();

    if (this.width <= 0 || this.height <= 0) {
      return;
    }

    const compact = this.width <= 360 || this.height <= 260;
    const paddingX = compact ? 14 : 20;
    const paddingTop = compact ? 12 : 16;
    const headerGap = compact ? 42 : 54;
    const rowHeight = compact ? 19 : 23;
    const rowStride = compact ? 22 : 27;
    const rowWidth = this.width - paddingX * 2;
    const rowX = this.x + this.width / 2;
    const firstRowY = this.y + paddingTop + headerGap + rowHeight / 2;

    this.header = PanelHeader.create(this.scene, {
      x: this.x + this.width / 2,
      y: this.y + paddingTop + (compact ? 7 : 10),
      width: this.width - paddingX * 2,
      title: this.currentTitle,
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);

    const visibleRows = [...this.currentRows.slice(0, this.visibleLineLimit)];

    if (this.currentRows.length > visibleRows.length) {
      visibleRows.push({
        label: I18n.t('result.more', { count: this.currentRows.length - visibleRows.length }),
        tone: 'muted',
      });
    }

    visibleRows.forEach((entry, index) => {
      const row = this.createRow(rowX, firstRowY + index * rowStride, rowWidth, rowHeight, entry, compact);
      this.rowObjects.push(row);
      this.container.add(row);
    });
  }

  getVisibleLineLimit(): number {
    return this.visibleLineLimit;
  }

  private createRow(
    x: number,
    y: number,
    width: number,
    height: number,
    entry: RecordsPanelEntry,
    compact: boolean,
  ): Phaser.GameObjects.Container {
    if (typeof entry === 'string') {
      return UIListRow.create(this.scene, {
        x,
        y,
        width,
        height,
        label: entry || ' ',
        tone: entry.startsWith('+') ? 'muted' : entry.startsWith('[') ? 'section' : 'normal',
        disabled: true,
        compact,
      });
    }

    return UIListRow.create(this.scene, {
      x,
      y,
      width,
      height,
      label: entry.label,
      value: entry.value,
      status: entry.status,
      tone: entry.tone,
      disabled: true,
      compact,
    });
  }

  private clearRows(): void {
    this.rowObjects.forEach((row) => row.destroy(true));
    this.rowObjects.length = 0;
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
