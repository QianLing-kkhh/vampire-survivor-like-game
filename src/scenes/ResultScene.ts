import Phaser from 'phaser';

import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { PassiveLevel } from '../passive/PassiveItem';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';

interface ResultSceneData {
  runId?: string;
  autoMode?: boolean;
  fastMode?: boolean;
  timeScale?: number;
  survivalTime?: number;
  survivalTimeSeconds?: number;
  resultType?: 'gameOver' | 'victory';
  finalLevel?: number;
  killCount?: number;
  treasureDropCount?: number;
  treasureOpenCount?: number;
  treasureUpgradePath?: string[];
  evolutionPath?: string[];
  bossSpawned?: boolean;
  bossKilled?: boolean;
  bossSpawnTime?: number;
  bossKillTime?: number;
  bossFightDuration?: number;
  weaponIds?: string[];
  passiveItems?: PassiveLevel[];
  upgradePath?: string[];
  playtestCsv?: string;
  bufferedRunsCount?: number;
}

export class ResultScene extends Phaser.Scene {
  private static readonly AUTO_RESTART_SECONDS = 10;

  private hasRestarted = false;
  private settingsText?: Phaser.GameObjects.Text;
  private csvLogText?: Phaser.GameObjects.Text;
  private autoRestartText?: Phaser.GameObjects.Text;
  private autoRestartTimer?: Phaser.Time.TimerEvent;
  private autoRestartRemainingSeconds = ResultScene.AUTO_RESTART_SECONDS;
  private autoRestartCanceled = false;
  private settings = PlaytestSettings.get();

  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    this.hasRestarted = false;
    this.settings = PlaytestSettings.get();
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const survivalTimeSeconds = data.survivalTime ?? data.survivalTimeSeconds ?? 0;
    const isVictory = data.resultType === 'victory';
    const weaponText = data.weaponIds && data.weaponIds.length > 0
      ? data.weaponIds.join(', ')
      : 'None';
    const passiveText = data.passiveItems && data.passiveItems.length > 0
      ? data.passiveItems
        .map((passive) => `${passive.name} Lv${passive.level}`)
        .join(', ')
      : 'None';
    const evolutionPathText = data.evolutionPath && data.evolutionPath.length > 0
      ? data.evolutionPath.join(' > ')
      : 'None';
    const playtestCsv = data.playtestCsv ?? '';

    const title = this.add.text(centerX, centerY - 140, isVictory ? 'Victory' : 'Game Over', {
      color: isVictory ? '#22c55e' : '#ef4444',
      fontSize: '40px',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const result = this.add.text(
      centerX,
      centerY - 56,
      [
        `Result: ${isVictory ? 'Victory' : 'Game Over'}`,
        `Survival Time: ${this.formatTime(survivalTimeSeconds)}`,
        `Final Level: ${data.finalLevel ?? 1}`,
        `Kill Count: ${data.killCount ?? 0}`,
        `Weapons: ${weaponText}`,
        `Passives: ${passiveText}`,
        `Evolution Path: ${evolutionPathText}`,
        `Treasure Drops: ${data.treasureDropCount ?? 0}`,
        `Treasure Opens: ${data.treasureOpenCount ?? 0}`,
      ],
      {
        color: '#ffffff',
        fontSize: '18px',
        align: 'center',
        lineSpacing: 5,
      },
    );
    result.setOrigin(0.5);

    this.csvLogText = this.add.text(
      centerX,
      centerY + 78,
      this.formatCsvLogText(),
      {
      color: '#cbd5e1',
      fontSize: '12px',
      align: 'center',
      wordWrap: { width: 720 },
      },
    );
    this.csvLogText.setOrigin(0.5);

    this.settingsText = this.add.text(centerX, centerY + 130, this.formatSettingsText(), {
      color: '#facc15',
      fontSize: '14px',
      align: 'center',
    });
    this.settingsText.setOrigin(0.5);

    this.autoRestartText = this.add.text(centerX, centerY + 154, '', {
      color: '#93c5fd',
      fontSize: '14px',
      align: 'center',
    });
    this.autoRestartText.setOrigin(0.5);

    const toggleAutoButton = this.add.text(centerX - 300, centerY + 190, 'Toggle Auto Mode', {
      backgroundColor: '#334155',
      color: '#ffffff',
      fontSize: '16px',
      padding: {
        x: 12,
        y: 8,
      },
    });
    toggleAutoButton.setOrigin(0.5);
    toggleAutoButton.setInteractive({ useHandCursor: true });
    toggleAutoButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.settings = PlaytestSettings.toggleAutoMode();
      this.updateSettingsText();
    });

    const toggleFastButton = this.add.text(centerX - 112, centerY + 190, 'Toggle Fast Mode', {
      backgroundColor: '#334155',
      color: '#ffffff',
      fontSize: '16px',
      padding: {
        x: 12,
        y: 8,
      },
    });
    toggleFastButton.setOrigin(0.5);
    toggleFastButton.setInteractive({ useHandCursor: true });
    toggleFastButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.settings = PlaytestSettings.toggleFastMode();
      this.updateSettingsText();
    });

    const copyButton = this.add.text(centerX + 80, centerY + 190, 'Copy Current CSV', {
      backgroundColor: '#334155',
      color: '#ffffff',
      fontSize: '16px',
      padding: {
        x: 12,
        y: 8,
      },
    });
    copyButton.setOrigin(0.5);
    copyButton.setInteractive({ useHandCursor: true });
    copyButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.copyCsv(playtestCsv);
    });

    const copyAllButton = this.add.text(centerX + 258, centerY + 190, 'Copy All CSV', {
      backgroundColor: '#334155',
      color: '#ffffff',
      fontSize: '16px',
      padding: {
        x: 12,
        y: 8,
      },
    });
    copyAllButton.setOrigin(0.5);
    copyAllButton.setInteractive({ useHandCursor: true });
    copyAllButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.copyCsv(PlaytestLogBuffer.getAllCsvWithHeader());
    });

    const clearBufferButton = this.add.text(centerX, centerY + 232, 'Clear CSV Buffer', {
      backgroundColor: '#7f1d1d',
      color: '#ffffff',
      fontSize: '16px',
      padding: {
        x: 12,
        y: 8,
      },
    });
    clearBufferButton.setOrigin(0.5);
    clearBufferButton.setInteractive({ useHandCursor: true });
    clearBufferButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      PlaytestLogBuffer.clear();
      this.updateCsvLogText();
    });

    const restartButton = this.add.text(centerX - 130, centerY + 276, 'Restart', {
      backgroundColor: '#1f2937',
      color: '#ffffff',
      fontSize: '18px',
      padding: {
        x: 16,
        y: 8,
      },
    });
    restartButton.setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.restartGame();
    });

    const titleButton = this.add.text(centerX + 130, centerY + 276, 'Return to Title', {
      backgroundColor: '#1f2937',
      color: '#ffffff',
      fontSize: '18px',
      padding: {
        x: 16,
        y: 8,
      },
    });
    titleButton.setOrigin(0.5);
    titleButton.setInteractive({ useHandCursor: true });
    titleButton.on('pointerdown', () => {
      this.cancelAutoRestart();
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('TitleScene');
    });

    if (data.autoMode) {
      this.startAutoRestartCountdown();
    }
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private formatSettingsText(): string {
    return [
      `Auto Mode: ${this.settings.autoMode ? 'ON' : 'OFF'}`,
      `Fast Mode: ${this.settings.fastMode ? 'ON' : 'OFF'}`,
      `Time Scale: ${this.getDisplayedTimeScale(this.settings)}x`,
    ].join('   ');
  }

  private getDisplayedTimeScale(settings: PlaytestSettingsState): number {
    if (!settings.autoMode || !settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }

  private updateSettingsText(): void {
    this.settingsText?.setText(this.formatSettingsText());
  }

  private formatCsvLogText(): string[] {
    return [
      'CSV hidden. Use buttons to copy.',
      `Buffered Runs Count: ${PlaytestLogBuffer.getCount()}`,
    ];
  }

  private updateCsvLogText(): void {
    this.csvLogText?.setText(this.formatCsvLogText());
  }

  private startAutoRestartCountdown(): void {
    this.autoRestartRemainingSeconds = ResultScene.AUTO_RESTART_SECONDS;
    this.autoRestartCanceled = false;
    this.updateAutoRestartText();

    this.autoRestartTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.autoRestartCanceled) {
          return;
        }

        this.autoRestartRemainingSeconds -= 1;
        this.updateAutoRestartText();

        if (this.autoRestartRemainingSeconds > 0) {
          return;
        }

        this.restartGame();
      },
    });
  }

  private cancelAutoRestart(): void {
    this.autoRestartCanceled = true;
    this.autoRestartTimer?.remove(false);
    this.autoRestartTimer = undefined;
    this.autoRestartText?.setText('Auto Restart: canceled');
  }

  private updateAutoRestartText(): void {
    this.autoRestartText?.setText(
      `Auto Restart in ${this.autoRestartRemainingSeconds}s`,
    );
  }

  private copyCsv(playtestCsv: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(playtestCsv).catch(() => {
        console.log('Playtest CSV:', playtestCsv);
      });
      return;
    }

    console.log('Playtest CSV:', playtestCsv);
  }

  private restartGame(): void {
    if (this.hasRestarted) {
      return;
    }

    this.hasRestarted = true;
    this.autoRestartTimer?.remove(false);
    this.autoRestartTimer = undefined;
    this.scene.stop('UIScene');
    this.scene.start('GameScene');
  }
}
