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
  private temporaryMessage?: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.hud = new HUD(this, () => {
      this.events.emit('HudPausePressed');
    });
    this.events.on('UpdateHUD', this.updateHUD, this);
    this.events.on('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.on('ShowTemporaryMessage', this.showTemporaryMessage, this);
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

    if (options.length === 0) {
      this.levelUpPanel?.destroy();
      this.levelUpPanel = undefined;
      this.showTemporaryMessage('No upgrades available');
      return;
    }

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

  private showTemporaryMessage(message: string): void {
    this.temporaryMessage?.destroy();
    this.temporaryMessage = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.28,
      message,
      {
        color: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 4,
      },
    );
    this.temporaryMessage.setOrigin(0.5);
    this.temporaryMessage.setDepth(3000);

    this.tweens.add({
      targets: this.temporaryMessage,
      alpha: 0,
      y: this.temporaryMessage.y - 24,
      duration: 1400,
      onComplete: () => {
        this.temporaryMessage?.destroy();
        this.temporaryMessage = undefined;
      },
    });
  }

  private cleanup(): void {
    this.events.off('UpdateHUD', this.updateHUD, this);
    this.events.off('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.off('ShowTemporaryMessage', this.showTemporaryMessage, this);
    this.events.off('ShowPauseMenu', this.showPauseMenu, this);
    this.events.off('HidePauseMenu', this.hidePauseMenu, this);
    this.levelUpPanel?.destroy();
    this.levelUpPanel = undefined;
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
    this.helpPanel?.destroy();
    this.helpPanel = undefined;
    this.temporaryMessage?.destroy();
    this.temporaryMessage = undefined;
    this.hud?.destroy();
    this.hud = undefined;
  }
}
