import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { ReplayData } from '../replay/ReplayData';
import { ReplaySerializer } from '../replay/ReplaySerializer';
import { CompatibilityCheck } from '../version/CompatibilityCheck';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class ReplayDetailPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];
  private rows: Array<{ label: string; value: string }> = [];

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
    const compact = width <= 360 || height <= 260;
    const paddingX = compact ? 12 : 16;
    const paddingTop = compact ? 10 : 12;

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.frame?.destroy(true);
    this.frame = PanelFrame.create(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      variant: 'card',
    });
    this.container.addAt(this.frame, 0);
    this.header?.destroy(true);
    this.header = PanelHeader.create(this.scene, {
      x: x + width / 2,
      y: y + paddingTop + (compact ? 7 : 10),
      width: width - paddingX * 2,
      title: I18n.t('replay.title'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  render(replay: ReplayData | undefined): void {
    if (!replay) {
      this.rows = [{ label: I18n.t('replay.status'), value: I18n.t('replay.empty') }];
      this.renderRows();
      return;
    }

    const validation = ReplaySerializer.validate(replay);
    const compatibility = CompatibilityCheck.checkReplayCompatibility(replay);
    const compatibilityText = validation.valid && compatibility.compatible
      ? I18n.t('replay.compatible')
      : validation.errors.length > 0 || compatibility.errors.length > 0
        ? I18n.t('replay.invalid')
        : I18n.t('replay.warning');
    this.rows = [
      { label: I18n.t('replay.version'), value: `v${replay.replayVersion}` },
      { label: I18n.t('replay.game'), value: replay.versionInfo?.gameVersion ?? replay.gameVersion ?? '' },
      { label: I18n.t('replay.content'), value: this.shorten(replay.versionInfo?.contentHash ?? replay.contentHash ?? '') },
      { label: I18n.t('replay.seed'), value: replay.runSeed },
      { label: I18n.t('replay.character'), value: replay.selection.characterId },
      { label: I18n.t('replay.stage'), value: replay.selection.stageId },
      { label: I18n.t('replay.map'), value: replay.selection.mapId },
      { label: I18n.t('replay.result'), value: replay.result?.resultType ?? '' },
      { label: I18n.t('replay.survival'), value: replay.result ? this.formatTime(replay.result.survivalTime) : '' },
      { label: I18n.t('replay.events'), value: `${replay.events.length}` },
      { label: I18n.t('replay.inputs'), value: `${replay.inputSamples.length}` },
      { label: I18n.t('replay.compatibility'), value: compatibilityText },
    ];
    this.renderRows();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private shorten(value: string): string {
    return value.length <= 12 ? value : `${value.slice(0, 12)}...`;
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 360 || this.height <= 260;
    const paddingX = compact ? 12 : 16;
    const paddingTop = compact ? 10 : 12;
    const headerGap = compact ? 42 : 54;
    const rowHeight = compact ? 18 : 23;
    const rowGap = compact ? 4 : 6;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - paddingTop - headerGap - 10 + rowGap) / (rowHeight + rowGap)));

    this.rows.slice(0, maxRows).forEach((row, index) => {
      const rowObject = UIStatRow.create(
        this.scene,
        this.x + this.width / 2,
        this.y + paddingTop + headerGap + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        row.label,
        row.value,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          labelRatio: 0.34,
          backgroundAlpha: 0.32,
        },
      );
      this.rowObjects.push(rowObject);
      this.container.add(rowObject);
    });
  }

  private clearRows(): void {
    this.rowObjects.forEach((row) => row.destroy(true));
    this.rowObjects.length = 0;
  }
}
