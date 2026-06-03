import Phaser from 'phaser';

import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { HelpOverlay } from '../ui/HelpOverlay';
import { UITheme, toCssColor } from '../ui/UITheme';

export class TitleScene extends Phaser.Scene {
  private static readonly AUTO_START_SECONDS = 10;

  private statusText?: Phaser.GameObjects.Text;
  private soundButton?: Phaser.GameObjects.Text;
  private autoStartText?: Phaser.GameObjects.Text;
  private autoStartTimer?: Phaser.Time.TimerEvent;
  private autoStartRemainingSeconds = TitleScene.AUTO_START_SECONDS;
  private autoStartCanceled = false;
  private helpOverlay?: HelpOverlay;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const title = this.add.text(centerX, centerY - 170, 'Vampire Survivor Prototype', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.titleFontSize,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    this.statusText = this.add.text(centerX, centerY - 92, this.formatStatus(), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      align: 'center',
      lineSpacing: 8,
    });
    this.statusText.setOrigin(0.5);

    this.autoStartText = this.add.text(centerX, centerY - 44, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
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

    this.soundButton = this.createButton(centerX, centerY + 190, this.formatSoundLabel(), () => {
      this.cancelAutoStartCountdown();
      PlaytestSettings.toggleSoundEnabled();
      this.refreshSoundButton();
    });

    this.createButton(centerX, centerY + 254, 'Help', () => {
      this.cancelAutoStartCountdown();
      this.showHelpOverlay();
    });

    this.startAutoStartCountdown();
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '22px',
      padding: {
        x: 22,
        y: 12,
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    button.on('pointerdown', onClick);

    return button;
  }

  private refreshStatus(): void {
    this.statusText?.setText(this.formatStatus());
  }

  private refreshSoundButton(): void {
    this.soundButton?.setText(this.formatSoundLabel());
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

  private showHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this, () => {
      this.helpOverlay = undefined;
    });
  }

  private formatStatus(): string {
    const settings = PlaytestSettings.get();

    return [
      `Auto Mode: ${settings.autoMode ? 'ON' : 'OFF'}`,
      `Fast Mode: ${settings.fastMode ? 'ON' : 'OFF'}`,
      `Time Scale: ${this.getDisplayedTimeScale(settings)}x`,
    ].join('\n');
  }

  private formatSoundLabel(): string {
    return `Sound: ${PlaytestSettings.get().soundEnabled ? 'ON' : 'OFF'}`;
  }

  private getDisplayedTimeScale(settings: PlaytestSettingsState): number {
    if (!settings.autoMode || !settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }
}
