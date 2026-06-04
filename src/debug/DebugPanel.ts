import Phaser from 'phaser';

import { DeveloperSettingsData } from '../settings/DeveloperSettings';

import { DebugPanelData } from './DebugPanelData';

export class DebugPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.background = scene.add.rectangle(0, 0, 320, 220, 0x020617, 0.75);
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(1, 0x38bdf8, 0.55);

    this.text = scene.add.text(12, 10, '', {
      color: '#dbeafe',
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      lineSpacing: 2,
    });

    this.container = scene.add.container(0, 0, [this.background, this.text]);
    this.container.setDepth(2500);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
    this.layout();
  }

  update(data: DebugPanelData, settings: DeveloperSettingsData): void {
    const lines = this.formatLines(data, settings.debugPanelCompact);
    const width = settings.debugPanelCompact ? 300 : 360;
    const height = Math.max(110, lines.length * 16 + 20);

    this.text.setText(lines.join('\n'));
    this.background.setSize(width, height);
    this.background.setFillStyle(0x020617, settings.debugPanelOpacity);
    this.layout();
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private layout(): void {
    const margin = 12;
    const x = Math.max(margin, this.scene.scale.width - this.background.width - margin);
    const y = Math.max(margin, this.scene.scale.height - this.background.height - margin);

    this.container.setPosition(x, y);
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
      `fps ${this.format(data.fps)} t ${this.format(data.gameTimeSeconds)}s`,
      `enemies ${data.enemyCount ?? 0} bosses ${data.activeBossCount ?? 0}`,
      `endless ${data.endlessStarted ? 'on' : 'off'} ${this.format(data.endlessTimeSeconds)}s lv ${data.endlessScalingLevel ?? 0}`,
      `player Lv.${data.playerLevel ?? 1} HP ${this.format(data.playerHp)}/${this.format(data.playerMaxHp)}`,
      `csv ${data.csvBufferSize ?? 0} events ${data.recentEventCount ?? 0}`,
    ];

    if (!compact) {
      lines.splice(2, 0, `run ${data.runId ?? '-'}`);
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

