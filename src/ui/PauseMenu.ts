import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { HelpOverlay } from './HelpOverlay';
import { UITheme, toCssColor } from './UITheme';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly autoModeButton: Phaser.GameObjects.Text;
  private readonly fastModeButton: Phaser.GameObjects.Text;
  private readonly soundButton: Phaser.GameObjects.Text;
  private helpOverlay?: HelpOverlay;

  constructor(
    scene: Phaser.Scene,
    onResume: () => void,
    onRestart: () => void,
    onBackToTitle: () => void,
    _onHelp: () => void,
  ) {
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    const background = scene.add.rectangle(
      centerX,
      centerY,
      440,
      540,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    background.setStrokeStyle(2, UITheme.panelBorderColor, 0.8);

    const title = scene.add.text(centerX, centerY - 220, 'Paused', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '34px',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const resumeButton = this.createButton(scene, centerX, centerY - 158, 'Resume', onResume);
    const restartButton = this.createButton(scene, centerX, centerY - 102, 'Restart', onRestart);
    const titleButton = this.createButton(
      scene,
      centerX,
      centerY - 46,
      'Return to Title',
      onBackToTitle,
    );
    this.autoModeButton = this.createButton(scene, centerX, centerY + 30, '', () => {
      PlaytestSettings.toggleAutoMode();
      this.updateSettingsButtons();
    });
    this.fastModeButton = this.createButton(scene, centerX, centerY + 86, '', () => {
      PlaytestSettings.toggleFastMode();
      this.updateSettingsButtons();
    });
    this.soundButton = this.createButton(scene, centerX, centerY + 142, '', () => {
      PlaytestSettings.toggleSoundEnabled();
      this.updateSettingsButtons();
    });
    const helpButton = this.createButton(scene, centerX, centerY + 210, 'Help', () => {
      this.showHelpOverlay(scene);
    });

    this.container = scene.add.container(0, 0, [
      background,
      title,
      resumeButton,
      restartButton,
      titleButton,
      this.autoModeButton,
      this.fastModeButton,
      this.soundButton,
      helpButton,
    ]);
    this.container.setDepth(1200);
    this.updateSettingsButtons();
  }

  destroy(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
    this.container.destroy(true);
  }

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = scene.add.text(x, y, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '20px',
      padding: {
        x: 18,
        y: 10,
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
    button.on('pointerdown', () => {
      AudioManager.play(scene, 'ui_click');
      onClick();
    });

    return button;
  }

  private updateSettingsButtons(): void {
    const settings = PlaytestSettings.get();

    this.autoModeButton.setText(`Auto Mode: ${settings.autoMode ? 'ON' : 'OFF'}`);
    this.fastModeButton.setText(`Fast Mode: ${settings.fastMode ? 'ON' : 'OFF'}`);
    this.soundButton.setText(`Sound: ${settings.soundEnabled ? 'ON' : 'OFF'}`);
  }

  private showHelpOverlay(scene: Phaser.Scene): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(scene, () => {
      this.helpOverlay = undefined;
    });
  }
}
