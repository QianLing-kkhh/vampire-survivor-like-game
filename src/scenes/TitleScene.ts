import Phaser from 'phaser';

import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';

export class TitleScene extends Phaser.Scene {
  private static readonly AUTO_START_SECONDS = 10;

  private statusText?: Phaser.GameObjects.Text;
  private autoStartText?: Phaser.GameObjects.Text;
  private autoStartTimer?: Phaser.Time.TimerEvent;
  private autoStartRemainingSeconds = TitleScene.AUTO_START_SECONDS;
  private autoStartCanceled = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const title = this.add.text(centerX, centerY - 170, 'Vampire Survivor Prototype', {
      color: '#facc15',
      fontSize: '40px',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    this.statusText = this.add.text(centerX, centerY - 92, this.formatStatus(), {
      color: '#cbd5e1',
      fontSize: '18px',
      align: 'center',
      lineSpacing: 8,
    });
    this.statusText.setOrigin(0.5);

    this.autoStartText = this.add.text(centerX, centerY - 44, '', {
      color: '#93c5fd',
      fontSize: '18px',
      align: 'center',
    });
    this.autoStartText.setOrigin(0.5);

    this.createButton(centerX, centerY - 8, 'Start Game', () => {
      this.cancelAutoStartCountdown();
      PlaytestSettings.setAutoMode(false);
      PlaytestSettings.setFastMode(false);
      this.refreshStatus();
      this.scene.start('GameScene');
    });

    this.createButton(centerX, centerY + 58, 'Start Auto Test', () => {
      this.cancelAutoStartCountdown();
      PlaytestSettings.setAutoMode(true);
      PlaytestSettings.setFastMode(true);
      this.refreshStatus();
      this.scene.start('GameScene');
    });

    this.createButton(centerX - 150, centerY + 132, 'Toggle Auto Mode', () => {
      this.cancelAutoStartCountdown();
      PlaytestSettings.toggleAutoMode();
      this.refreshStatus();
    });

    this.createButton(centerX + 150, centerY + 132, 'Toggle Fast Mode', () => {
      this.cancelAutoStartCountdown();
      PlaytestSettings.toggleFastMode();
      this.refreshStatus();
    });

    this.startAutoStartCountdown();
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const button = this.add.text(x, y, label, {
      backgroundColor: '#1f2937',
      color: '#ffffff',
      fontSize: '22px',
      padding: {
        x: 22,
        y: 12,
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', onClick);
  }

  private refreshStatus(): void {
    this.statusText?.setText(this.formatStatus());
  }

  private startAutoStartCountdown(): void {
    this.autoStartRemainingSeconds = TitleScene.AUTO_START_SECONDS;
    this.autoStartCanceled = false;
    this.updateAutoStartText();

    this.autoStartTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.autoStartCanceled) {
          return;
        }

        this.autoStartRemainingSeconds -= 1;
        this.updateAutoStartText();

        if (this.autoStartRemainingSeconds > 0) {
          return;
        }

        this.startAutoTest();
      },
    });
  }

  private cancelAutoStartCountdown(): void {
    this.autoStartCanceled = true;
    this.autoStartTimer?.remove(false);
    this.autoStartTimer = undefined;
    this.autoStartText?.setText('Auto test canceled');
  }

  private updateAutoStartText(): void {
    this.autoStartText?.setText(
      `Auto test starts in ${this.autoStartRemainingSeconds}s`,
    );
  }

  private startAutoTest(): void {
    this.autoStartTimer?.remove(false);
    this.autoStartTimer = undefined;
    PlaytestSettings.setAutoMode(true);
    PlaytestSettings.setFastMode(true);
    this.refreshStatus();
    this.scene.start('GameScene');
  }

  private formatStatus(): string {
    const settings = PlaytestSettings.get();

    return [
      `Auto Mode: ${settings.autoMode ? 'ON' : 'OFF'}`,
      `Fast Mode: ${settings.fastMode ? 'ON' : 'OFF'}`,
      `Time Scale: ${this.getDisplayedTimeScale(settings)}x`,
    ].join('\n');
  }

  private getDisplayedTimeScale(settings: PlaytestSettingsState): number {
    if (!settings.autoMode || !settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }
}
