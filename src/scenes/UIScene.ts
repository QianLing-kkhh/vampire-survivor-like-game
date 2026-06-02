import Phaser from 'phaser';

import { UpgradeOption } from '../progression/UpgradeOption';
import { HUD, HUDState } from '../ui/HUD';
import { LevelUpPanel, LevelUpPanelConfig } from '../ui/LevelUpPanel';

type LevelUpOptionsPayload = UpgradeOption[] | {
  options: UpgradeOption[];
  autoSelectOptionId?: string;
  autoSelectDelayMs?: number;
};

export class UIScene extends Phaser.Scene {
  private hud?: HUD;
  private levelUpPanel?: LevelUpPanel;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new HUD(this);
    this.events.on('UpdateHUD', this.updateHUD, this);
    this.events.on('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private updateHUD(state: HUDState): void {
    this.hud?.update(state);
  }

  private showLevelUpOptions(payload: LevelUpOptionsPayload): void {
    const options = Array.isArray(payload) ? payload : payload.options;
    const config: LevelUpPanelConfig = Array.isArray(payload)
      ? {}
      : {
        autoSelectOptionId: payload.autoSelectOptionId,
        autoSelectDelayMs: payload.autoSelectDelayMs,
      };

    this.levelUpPanel?.destroy();
    this.levelUpPanel = new LevelUpPanel(this, options, (option) => {
      console.log('UpgradeSelected', option);
      this.levelUpPanel?.destroy();
      this.levelUpPanel = undefined;
      this.events.emit('UpgradeSelected', option);
    }, config);
  }

  private cleanup(): void {
    this.events.off('UpdateHUD', this.updateHUD, this);
    this.events.off('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.levelUpPanel?.destroy();
    this.levelUpPanel = undefined;
    this.hud = undefined;
  }
}
