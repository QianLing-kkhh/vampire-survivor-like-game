import Phaser from 'phaser';

import { ReplayData } from '../replay/ReplayData';

import { I18n } from '../i18n/I18n';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIListRow, UIListRowTone } from './components/UIListRow';
import { UITheme } from './UITheme';

const MAX_REPLAY_ROWS = 8;

type ReplayListRowData = {
  label: string;
  value?: string;
  status?: string;
  tone?: UIListRowTone;
};

export class ReplayListPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowContainers: Phaser.GameObjects.Container[] = [];

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
      y: y + (compact ? 22 : 28),
      width: width - (compact ? 18 : 26),
      title: I18n.t('replay.title'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
  }

  render(
    replays: readonly ReplayData[],
    selectedRunId: string | undefined,
    onSelect: (replay: ReplayData) => void,
  ): void {
    this.clearRows();

    if (replays.length === 0) {
      this.addRow({ label: I18n.t('replay.empty'), tone: 'muted' }, 0, false);
      return;
    }

    const visibleLimit = this.getVisibleRowLimit();
    const visibleReplays = replays.slice(0, visibleLimit);
    visibleReplays.forEach((replay, index) => {
      this.addRow(
        this.formatReplayRow(replay),
        index,
        replay.runId === selectedRunId,
        () => onSelect(replay),
      );
    });

    if (replays.length > visibleReplays.length) {
      this.addRow(
        { label: I18n.t('selection.more', { count: replays.length - visibleReplays.length }), tone: 'muted' },
        visibleReplays.length,
        false,
      );
    }
  }

  destroy(): void {
    this.clearRows();
    this.container.destroy(true);
  }

  private addRow(
    rowData: ReplayListRowData,
    index: number,
    selected: boolean,
    onClick?: () => void,
  ): void {
    const compact = this.width <= 360 || this.height <= 260;
    const paddingX = compact ? 12 : 16;
    const rowHeight = compact ? 24 : 28;
    const rowStride = compact ? 28 : 34;
    const rowTop = this.y + (compact ? 50 : 64);
    const rowWidth = this.width - paddingX * 2;
    const rowY = rowTop + index * rowStride + rowHeight / 2;
    const row = UIListRow.create(this.scene, {
      x: this.x + this.width / 2,
      y: rowY,
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
    this.rowContainers.push(row);
    this.container.add(row);
  }

  private getVisibleRowLimit(): number {
    const compact = this.width <= 360 || this.height <= 260;
    const rowTop = compact ? 50 : 64;
    const rowStride = compact ? 28 : 34;
    const availableHeight = Math.max(rowStride, this.height - rowTop - 12);

    return Math.max(1, Math.min(MAX_REPLAY_ROWS, Math.floor(availableHeight / rowStride)));
  }

  private clearRows(): void {
    this.rowContainers.forEach((row) => row.destroy(true));
    this.rowContainers.length = 0;
  }

  private formatReplayRow(replay: ReplayData): ReplayListRowData {
    const date = this.formatShortDate(replay.createdAt);
    const seed = this.shorten(replay.runSeed);
    const stage = replay.selection.stageId;
    const result = replay.result?.resultType ?? 'pending';
    const time = replay.result ? this.formatTime(replay.result.survivalTime) : undefined;

    return {
      status: this.formatResultStatus(result),
      label: `${date} ${seed}`,
      value: time ? `${stage} / ${time}` : stage,
      tone: this.getResultTone(result),
    };
  }

  private formatShortDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private shorten(value: string): string {
    return value.length <= 10 ? value : `${value.slice(0, 10)}...`;
  }

  private formatResultStatus(result: string): string {
    const key = `result.${result}`;
    const translated = I18n.t(key);
    if (translated !== key) {
      return translated;
    }

    return result;
  }

  private getResultTone(result: string): UIListRowTone {
    if (result === 'victory') {
      return 'success';
    }
    if (result === 'gameOver') {
      return 'danger';
    }

    return 'muted';
  }
}
