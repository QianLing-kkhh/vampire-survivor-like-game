import Phaser from 'phaser';

import { UpgradeOption } from '../progression/UpgradeOption';
import { HUD, HUDState } from '../ui/HUD';
import { HelpPanel } from '../ui/HelpPanel';
import { LevelUpPanel, LevelUpPanelConfig } from '../ui/LevelUpPanel';
import { PauseMenu } from '../ui/PauseMenu';
import { PauseMenuStatsData } from '../ui/PauseMenu';

type LevelUpOptionsPayload = UpgradeOption[] | {
  options: UpgradeOption[];
  autoSelectOptionId?: string;
  autoSelectDelayMs?: number;
};

export class UIScene extends Phaser.Scene {
  private hud?: HUD;
  private levelUpPanel?: LevelUpPanel;
  private pauseMenu?: PauseMenu;
  private helpPanel?: HelpPanel;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new HUD(this);
    this.events.on('UpdateHUD', this.updateHUD, this);
    this.events.on('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.on('ShowPauseMenu', this.showPauseMenu, this);
    this.events.on('HidePauseMenu', this.hidePauseMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private updateHUD(state: HUDState): void {
    this.hud?.update(state);
  }

  private showLevelUpOptions(payload: LevelUpOptionsPayload): void {
    this.hidePauseMenu();
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

  private showPauseMenu(statsData?: PauseMenuStatsData): void {
    if (this.levelUpPanel) {
      return;
    }

    this.pauseMenu?.destroy();
    this.pauseMenu = new PauseMenu(
      this,
      statsData ?? this.getEmptyPauseStatsData(),
      () => {
        this.events.emit('PauseResume');
      },
      () => {
        this.events.emit('PauseRestart');
      },
      () => {
        this.events.emit('PauseBackToTitle');
      },
      () => {
        this.showHelpPanel();
      },
    );
  }

  private getEmptyPauseStatsData(): PauseMenuStatsData {
    return {
      character: {
        currentHp: 0,
        maxHp: 0,
        moveSpeed: 0,
        pickupRange: 0,
        expMultiplier: 1,
        level: 1,
        currentExp: 0,
        requiredExp: 1,
        damageTaken: 0,
        killCount: 0,
        treasureOpenCount: 0,
        bossPhaseDamageTaken: 0,
        endlessMode: false,
        endlessStarted: false,
        endlessTimeSeconds: 0,
      },
      weapons: [],
      passives: [],
    };
  }

  private hidePauseMenu(): void {
    this.hideHelpPanel();
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
  }

  private showHelpPanel(): void {
    this.helpPanel?.destroy();
    this.helpPanel = new HelpPanel(this, () => {
      this.hideHelpPanel();
    });
  }

  private hideHelpPanel(): void {
    this.helpPanel?.destroy();
    this.helpPanel = undefined;
  }

  private cleanup(): void {
    this.events.off('UpdateHUD', this.updateHUD, this);
    this.events.off('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.off('ShowPauseMenu', this.showPauseMenu, this);
    this.events.off('HidePauseMenu', this.hidePauseMenu, this);
    this.levelUpPanel?.destroy();
    this.levelUpPanel = undefined;
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
    this.helpPanel?.destroy();
    this.helpPanel = undefined;
    this.hud?.destroy();
    this.hud = undefined;
  }
}
