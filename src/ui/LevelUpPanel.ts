import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { UpgradeOption } from '../progression/UpgradeOption';
import { UITheme } from './UITheme';

type UpgradeSelectedHandler = (option: UpgradeOption) => void;
type UpgradeOptionView = UpgradeOption & {
  preview?: string;
};
export interface LevelUpPanelConfig {
  autoSelectOptionId?: string;
  autoSelectDelayMs?: number;
}

export class LevelUpPanel {
  private readonly container: Phaser.GameObjects.Container;
  private autoSelectTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    options: readonly UpgradeOptionView[],
    onSelected: UpgradeSelectedHandler,
    config: LevelUpPanelConfig = {},
  ) {
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;

    this.container = scene.add.container(centerX, centerY);
    this.container.setDepth(1000);

    const background = scene.add.rectangle(0, 0, 560, 380, UITheme.panelBgColor, 0.94);
    background.setStrokeStyle(2, UITheme.panelBorderColor, 1);
    this.container.add(background);

    const title = scene.add.text(0, -155, 'Level Up', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    options.forEach((option, index) => {
      this.addOption(scene, option, index, onSelected);
    });

    this.scheduleAutoSelect(scene, options, onSelected, config);
  }

  destroy(): void {
    this.autoSelectTimer?.remove(false);
    this.autoSelectTimer = undefined;
    this.container.destroy(true);
  }

  private addOption(
    scene: Phaser.Scene,
    option: UpgradeOptionView,
    index: number,
    onSelected: UpgradeSelectedHandler,
  ): void {
    const y = -82 + index * 100;
    const optionBackground = scene.add.rectangle(0, y, 500, 84, UITheme.buttonBgColor, 1);
    optionBackground.setStrokeStyle(1, UITheme.panelBorderColor, 1);
    optionBackground.setInteractive({ useHandCursor: true });

    const name = scene.add.text(-225, y - 24, option.name, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      fontStyle: 'bold',
    });

    const description = scene.add.text(-225, y + 4, option.preview ?? option.description, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '13px',
      lineSpacing: 4,
      wordWrap: { width: 450 },
    });

    optionBackground.on('pointerover', () => {
      optionBackground.setFillStyle(UITheme.buttonHoverColor, 1);
    });

    optionBackground.on('pointerout', () => {
      optionBackground.setFillStyle(UITheme.buttonBgColor, 1);
    });

    optionBackground.on('pointerdown', () => {
      AudioManager.play(scene, 'ui_click');
      AudioManager.play(scene, 'upgrade_selected');
      onSelected(option);
    });

    this.container.add([optionBackground, name, description]);
  }

  private scheduleAutoSelect(
    scene: Phaser.Scene,
    options: readonly UpgradeOptionView[],
    onSelected: UpgradeSelectedHandler,
    config: LevelUpPanelConfig,
  ): void {
    if (!config.autoSelectOptionId || config.autoSelectDelayMs === undefined) {
      return;
    }

    const selectedOption = options.find((option) => option.id === config.autoSelectOptionId);

    if (!selectedOption) {
      return;
    }

    this.autoSelectTimer = scene.time.delayedCall(config.autoSelectDelayMs, () => {
      AudioManager.play(scene, 'upgrade_selected');
      onSelected(selectedOption);
    });
  }
}
