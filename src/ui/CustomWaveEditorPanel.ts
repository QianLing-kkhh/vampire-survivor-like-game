import Phaser from 'phaser';

import { CustomWaveDefinition } from '../custom/CustomStageSchema';
import { I18n } from '../i18n/I18n';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIListRow, UIListRowTone } from './components/UIListRow';
import { UITheme } from './UITheme';

const MAX_WAVE_ROWS = 9;

type WaveListRowData = {
  label: string;
  value?: string;
  status?: string;
  tone?: UIListRowTone;
};

export class CustomWaveEditorPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];

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
    const compact = width <= 360 || height <= 260;
    this.header = PanelHeader.create(this.scene, {
      x: x + width / 2,
      y: y + (compact ? 17 : 24),
      width: width - (compact ? 24 : 36),
      title: I18n.t('customStage.editWaves'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
  }

  render(
    waves: readonly CustomWaveDefinition[],
    selectedIndex: number,
    onSelect: (index: number) => void,
  ): void {
    this.clearRows();

    if (waves.length === 0) {
      this.addRow({ label: I18n.t('common.none'), tone: 'muted' }, 0, false);
      return;
    }

    const rowLimit = this.getVisibleRowLimit();

    waves.slice(0, rowLimit).forEach((wave, index) => {
      this.addRow(this.formatWave(wave, index), index, index === selectedIndex, () => onSelect(index));
    });

    if (waves.length > rowLimit) {
      this.addRow({ label: I18n.t('result.more', { count: waves.length - rowLimit }), tone: 'muted' }, rowLimit, false);
    }
  }

  destroy(): void {
    this.clearRows();
    this.container.destroy(true);
  }

  private addRow(
    rowData: WaveListRowData,
    index: number,
    selected: boolean,
    onClick?: () => void,
  ): Phaser.GameObjects.Container {
    const compact = this.width <= 360 || this.height <= 260;
    const paddingX = compact ? 12 : 16;
    const rowTop = this.y + (compact ? 40 : 56);
    const rowStride = compact ? 25 : 30;
    const rowHeight = compact ? 22 : 26;
    const rowWidth = this.width - paddingX * 2;
    const row = UIListRow.create(this.scene, {
      x: this.x + this.width / 2,
      y: rowTop + rowHeight / 2 + index * rowStride,
      width: rowWidth,
      height: rowHeight,
      label: rowData.label,
      value: rowData.value,
      status: rowData.status,
      tone: selected ? 'normal' : rowData.tone ?? 'muted',
      selected,
      disabled: !onClick,
      onClick,
      compact,
    });

    this.rowObjects.push(row);
    this.container.add(row);
    return row;
  }

  private getVisibleRowLimit(): number {
    const compact = this.width <= 360 || this.height <= 260;
    const rowTop = compact ? 40 : 56;
    const rowStride = compact ? 25 : 30;
    const availableHeight = Math.max(rowStride, this.height - rowTop - 10);

    return Math.max(1, Math.min(MAX_WAVE_ROWS, Math.floor(availableHeight / rowStride)));
  }

  private clearRows(): void {
    this.rowObjects.forEach((row) => row.destroy(true));
    this.rowObjects.length = 0;
  }

  private formatWave(wave: CustomWaveDefinition, index: number): WaveListRowData {
    return {
      status: `#${index + 1}`,
      label: wave.enemyId,
      value: `t${wave.startTime} / x${wave.count} / ${wave.interval}s / ${wave.duration ?? '-'}`,
      tone: 'normal',
    };
  }
}
