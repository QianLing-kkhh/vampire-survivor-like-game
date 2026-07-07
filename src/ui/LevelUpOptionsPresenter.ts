import Phaser from 'phaser';

import { UpgradeOption } from '../progression/UpgradeOption';

const AUTO_SELECT_DELAY_MS = 300;

export interface LevelUpOptionsAutoSelection {
  optionId?: string;
}

export class LevelUpOptionsPresenter {
  constructor(private readonly uiSceneProvider: () => Phaser.Scene | undefined) {}

  show(options: UpgradeOption[], autoSelection?: LevelUpOptionsAutoSelection): void {
    const uiScene = this.uiSceneProvider();

    if (!uiScene) {
      return;
    }

    if (autoSelection) {
      uiScene.events.emit('ShowLevelUpOptions', {
        options,
        autoSelectOptionId: autoSelection.optionId,
        autoSelectDelayMs: AUTO_SELECT_DELAY_MS,
      });
      return;
    }

    uiScene.events.emit('ShowLevelUpOptions', options);
  }
}
