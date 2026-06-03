import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { UITheme, toCssColor } from './UITheme';

export class HelpOverlay {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(1400);

    const dimmer = scene.add.rectangle(
      centerX,
      centerY,
      scene.scale.width,
      scene.scale.height,
      0x000000,
      0.48,
    );
    dimmer.setInteractive();

    const panel = scene.add.rectangle(
      centerX,
      centerY,
      720,
      500,
      UITheme.panelBgColor,
      0.96,
    );
    panel.setStrokeStyle(2, UITheme.panelBorderColor, 0.9);

    const title = scene.add.text(centerX, centerY - 205, 'Help', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const body = scene.add.text(
      centerX - 300,
      centerY - 150,
      [
        'WASD / Arrow Keys: Move',
        'Hold Left Mouse: Move toward cursor',
        'ESC: Pause',
        'Collect EXP gems to level up',
        'Choose upgrades to strengthen weapons and passives',
        'Open treasure chests for bonus upgrades or evolution',
        'Weapon + matching passive can evolve through treasure chests',
        'Survive until the Boss appears',
        'Defeat the Boss to win',
      ],
      {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.bodyFontSize,
        lineSpacing: 8,
      },
    );

    const closeButton = scene.add.text(centerX, centerY + 205, 'Close', {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      padding: {
        x: 20,
        y: 10,
      },
    });
    closeButton.setOrigin(0.5);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerover', () => {
      closeButton.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    closeButton.on('pointerout', () => {
      closeButton.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    closeButton.on('pointerdown', () => {
      AudioManager.play(scene, 'ui_click');
      this.destroy();
      onClose?.();
    });

    this.container.add([dimmer, panel, title, body, closeButton]);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
