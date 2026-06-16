import Phaser from 'phaser';

import { DeveloperSettingsData } from '../settings/DeveloperSettings';
import { PanelFrame } from '../ui/components/PanelFrame';
import { UITextBlock } from '../ui/components/UITextBlock';

import { DebugPanelData } from './DebugPanelData';

export class DebugPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private width = 260;
  private height = 160;
  private frameAlpha = 0.72;
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2500);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
    this.rebuildFrame(this.width, this.height, 0.72);
    this.text = new UITextBlock(scene, {
      x: 12,
      y: 10,
      text: '',
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      lineSpacing: 1,
      align: 'left',
      width: this.width - 18,
    }).text;
    this.container.add(this.text);
    this.layout();
  }

  update(data: DebugPanelData, settings: DeveloperSettingsData): void {
    const screenCompact = this.scene.scale.width <= 900 || this.scene.scale.height <= 560;
    const compact = settings.debugPanelCompact || screenCompact;
    const rawLines = this.formatLines(data, compact);
    const width = Math.min(
      compact ? 240 : 310,
      Math.max(190, this.scene.scale.width * (compact ? 0.28 : 0.24)),
    );
    const lineHeight = compact ? 13 : 15;
    const maxHeight = Math.max(82, this.scene.scale.height * (compact ? 0.26 : 0.34));
    const maxLines = Math.max(4, Math.floor((maxHeight - 18) / lineHeight));
    const lines = rawLines.length > maxLines
      ? [
        ...rawLines.slice(0, Math.max(1, maxLines - 1)),
        `... +${rawLines.length - maxLines + 1}`,
      ]
      : rawLines;
    const height = Math.max(compact ? 74 : 90, Math.min(maxHeight, lines.length * lineHeight + 18));

    this.text.setText(lines.join('\n'));
    this.text.setFontSize(compact ? '10px' : '11px');
    this.text.setWordWrapWidth(width - 18);
    this.text.setPosition(compact ? 8 : 10, compact ? 7 : 9);
    this.rebuildFrame(width, height, settings.debugPanelOpacity);
    this.layout();
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private layout(): void {
    const margin = this.scene.scale.width <= 900 || this.scene.scale.height <= 560 ? 8 : 12;
    const x = Math.max(margin, this.scene.scale.width - this.width - margin);
    const y = Math.max(margin, this.scene.scale.height - this.height - margin);

    this.container.setPosition(x, y);
  }

  private rebuildFrame(width: number, height: number, alpha: number): void {
    if (this.frame && this.width === width && this.height === height && this.frameAlpha === alpha) {
      return;
    }

    this.frame?.destroy(true);
    this.width = width;
    this.height = height;
    this.frameAlpha = alpha;
    this.frame = PanelFrame.create(this.scene, {
      x: width / 2,
      y: height / 2,
      width,
      height,
      alpha,
      variant: 'hud',
    });
    this.container.addAt(this.frame, 0);
  }

  private formatLines(data: DebugPanelData, compact: boolean): string[] {
    const contentHash = data.contentHash
      ? data.contentHash.slice(0, 12)
      : '-';
    const lines = [
      `v ${data.gameVersion ?? '-'} ${contentHash}`,
      `seed ${data.runSeed ?? '-'}`,
      `stage ${data.stageId ?? '-'} / ${data.mapId ?? '-'}`,
      `char ${data.characterId ?? '-'} diff ${data.difficultyId ?? '-'}`,
      `fps ${this.format(data.fps)} d ${this.format(data.averageDeltaMs)}ms speed ${this.format(data.gameSecondsPerRealSecond)}x`,
      `scale cfg ${this.format(data.configuredTimeScale)} eff ${this.format(data.effectiveTimeScale)} scene ${this.format(data.sceneTimeScale)}`,
      `en ${data.enemyCount ?? 0} pick ${data.pickupCount ?? 0} proj ${data.projectileCount ?? 0} boss ${data.activeBossCount ?? 0} float ${data.floatingTextActiveCount ?? data.floatingTextCount ?? 0}`,
      `endless ${data.endlessStarted ? 'on' : 'off'} ${this.format(data.endlessTimeSeconds)}s lv ${data.endlessScalingLevel ?? 0}`,
      `player Lv.${data.playerLevel ?? 1} HP ${this.format(data.playerHp)}/${this.format(data.playerMaxHp)}`,
      `csv ${data.csvBufferSize ?? 0} events ${data.recentEventCount ?? 0}`,
    ];

    if (!compact) {
      lines.splice(2, 0, `run ${data.runId ?? '-'}`);
      lines.push(
        `objects render ${data.totalRenderableWorldObjects ?? 0} gems ${data.pickupGemCount ?? 0} chests ${data.chestCount ?? 0}`,
        `map visuals ${data.mapMechanicVisualCount ?? 0} slow ${data.slowZoneCount ?? 0} tweens ${data.activeTweenCount ?? 0} timers ${data.activeTimerCount ?? 0}`,
        `spawn ${data.spawnAccumulatorSummary ?? '-'} pickupMerge ${data.pickupMergeCount ?? 0}`,
        `float pool ${data.floatingTextPoolSize ?? 0} total pool ${data.pooledObjectCount ?? 0}`,
        `pool c/r/d ${data.createdObjectCount ?? 0}/${data.reusedObjectCount ?? 0}/${data.destroyedObjectCount ?? 0}`,
      );
    }

    return lines;
  }

  private format(value: number | undefined): string {
    if (value === undefined || Number.isNaN(value)) {
      return '-';
    }

    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(1);
  }
}
