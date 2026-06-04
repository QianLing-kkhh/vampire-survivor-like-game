import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { ReplayData } from '../replay/ReplayData';
import { ReplaySerializer } from '../replay/ReplaySerializer';
import { CompatibilityCheck } from '../version/CompatibilityCheck';

import { UITheme } from './UITheme';

export class ReplayDetailPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
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
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.7);
    this.titleText = scene.add.text(x + 16, y + 12, I18n.t('replay.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(x + 16, y + 54, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      lineSpacing: 7,
      wordWrap: { width: width - 32 },
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
    this.bodyText.setPosition(x + 16, y + 54);
    this.bodyText.setWordWrapWidth(width - 32);
    this.bodyText.setFixedSize(width - 32, height - 70);
  }

  render(replay: ReplayData | undefined): void {
    if (!replay) {
      this.titleText.setText(I18n.t('replay.title'));
      this.bodyText.setText(I18n.t('replay.empty'));
      return;
    }

    const validation = ReplaySerializer.validate(replay);
    const compatibility = CompatibilityCheck.checkReplayCompatibility(replay);
    const compatibilityText = validation.valid && compatibility.compatible
      ? I18n.t('replay.compatible')
      : validation.errors.length > 0 || compatibility.errors.length > 0
        ? I18n.t('replay.invalid')
        : I18n.t('replay.warning');
    const lines = [
      `Replay v${replay.replayVersion}`,
      `Game: ${replay.versionInfo?.gameVersion ?? replay.gameVersion ?? ''}`,
      `Content: ${this.shorten(replay.versionInfo?.contentHash ?? replay.contentHash ?? '')}`,
      `Seed: ${replay.runSeed}`,
      `Character: ${replay.selection.characterId}`,
      `Stage: ${replay.selection.stageId}`,
      `Map: ${replay.selection.mapId}`,
      `Result: ${replay.result?.resultType ?? ''}`,
      `Survival: ${replay.result ? this.formatTime(replay.result.survivalTime) : ''}`,
      `Events: ${replay.events.length}`,
      `Inputs: ${replay.inputSamples.length}`,
      `Compatibility: ${compatibilityText}`,
    ];

    this.titleText.setText(I18n.t('replay.title'));
    this.bodyText.setText(lines.join('\n'));
  }

  destroy(): void {
    this.background.destroy();
    this.titleText.destroy();
    this.bodyText.destroy();
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
}
