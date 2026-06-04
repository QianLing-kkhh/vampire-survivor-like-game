import Phaser from 'phaser';

import { ReplayData } from '../replay/ReplayData';

import { I18n } from '../i18n/I18n';
import { UITheme, toCssColor } from './UITheme';

const MAX_REPLAY_ROWS = 8;

export class ReplayListPanel {
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
    this.titleText = scene.add.text(x + 16, y + 12, I18n.t('replay.title'), {
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
    this.titleText.setPosition(x + 16, y + 12);
  }

  render(
    replays: readonly ReplayData[],
    selectedRunId: string | undefined,
    onSelect: (replay: ReplayData) => void,
  ): void {
    this.clearRows();

    if (replays.length === 0) {
      this.addRow(I18n.t('replay.empty'), 0, false);
      return;
    }

    const visibleReplays = replays.slice(0, MAX_REPLAY_ROWS);
    visibleReplays.forEach((replay, index) => {
      const row = this.addRow(
        this.formatReplayRow(replay),
        index,
        replay.runId === selectedRunId,
      );

      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => onSelect(replay));
    });

    if (replays.length > visibleReplays.length) {
      this.addRow(`+${replays.length - visibleReplays.length} more`, visibleReplays.length, false);
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
    const row = this.scene.add.text(this.x + 16, this.y + 58 + index * 34, text, {
      backgroundColor: selected ? toCssColor(UITheme.buttonHoverColor) : undefined,
      color: selected ? UITheme.textColor : UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      fixedWidth: this.width - 32,
      fixedHeight: 28,
      padding: { x: 8, y: 5 },
    });

    this.rowTexts.push(row);
    return row;
  }

  private clearRows(): void {
    this.rowTexts.forEach((row) => row.destroy());
    this.rowTexts.length = 0;
  }

  private formatReplayRow(replay: ReplayData): string {
    const date = this.formatShortDate(replay.createdAt);
    const seed = this.shorten(replay.runSeed);
    const stage = replay.selection.stageId;
    const result = replay.result?.resultType ?? 'pending';
    const time = replay.result ? ` ${this.formatTime(replay.result.survivalTime)}` : '';

    return `${date} ${seed} ${stage} ${result}${time}`;
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
}
