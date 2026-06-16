import Phaser from 'phaser';

import { DebugPanelData } from '../debug/DebugPanelData';
import { DebugPanelManager } from '../debug/DebugPanelManager';
import { I18n } from '../i18n/I18n';
import { UpgradeOption } from '../progression/UpgradeOption';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { HUD, HUDState } from '../ui/HUD';
import { HelpOverlay } from '../ui/HelpOverlay';
import { LevelUpPanel, LevelUpPanelConfig } from '../ui/LevelUpPanel';
import { LiveStrategyControlPanel } from '../ui/LiveStrategyControlPanel';
import type { LiveStrategyPatchPayload } from '../ui/LiveStrategyControlPanel';
import { PauseMenu } from '../ui/PauseMenu';
import { RelicAcquiredPanel } from '../ui/RelicAcquiredPanel';
import { UITemporaryMessage } from '../ui/components/UITemporaryMessage';
import { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import { StatsBuildSnapshotBuilder } from '../ui/stats/StatsBuildSnapshotBuilder';

type LevelUpOptionsPayload = UpgradeOption[] | {
  options: UpgradeOption[];
  autoSelectOptionId?: string;
  autoSelectDelayMs?: number;
};

type TemporaryMessagePayload = string | {
  text: string;
  kind?: 'normal' | 'warning' | 'boss';
  durationMs?: number;
};

export class UIScene extends Phaser.Scene {
  private hud?: HUD;
  private levelUpPanel?: LevelUpPanel;
  private pauseMenu?: PauseMenu;
  private helpOverlay?: HelpOverlay;
  private relicAcquiredPanel?: RelicAcquiredPanel;
  private liveStrategyControlPanel?: LiveStrategyControlPanel;
  private debugPanelManager?: DebugPanelManager;
  private screenManager?: ScreenManager;
  private temporaryMessage?: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.screenManager = new ScreenManager(this);
    this.hud = new HUD(this, () => {
      this.events.emit('HudPausePressed');
    });
    this.debugPanelManager = new DebugPanelManager(this);
    this.events.on('UpdateHUD', this.updateHUD, this);
    this.events.on('UpdateDebugPanel', this.updateDebugPanel, this);
    this.events.on('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.on('ShowTemporaryMessage', this.showTemporaryMessage, this);
    this.events.on('ShowRelicAcquired', this.showRelicAcquired, this);
    this.events.on('ShowPauseMenu', this.showPauseMenu, this);
    this.events.on('HidePauseMenu', this.hidePauseMenu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private updateHUD(state: HUDState): void {
    this.hud?.update(state);
    if (state.liveStrategy?.enabled === true) {
      this.ensureLiveStrategyControlPanel();
    }
    this.liveStrategyControlPanel?.update(state.liveStrategy);
  }

  private ensureLiveStrategyControlPanel(): void {
    if (this.liveStrategyControlPanel) {
      return;
    }

    this.liveStrategyControlPanel = new LiveStrategyControlPanel(
      this,
      (payload: LiveStrategyPatchPayload) => {
        this.events.emit('LiveStrategyPatch', payload);
      },
      {
        onExpandedChanged: (payload) => {
          this.events.emit('StrategyTacticsPanelExpandedChanged', payload);
        },
        onPauseWhenOpenChanged: (pauseWhenOpen) => {
          this.events.emit('StrategyTacticsPanelPauseWhenOpenChanged', pauseWhenOpen);
        },
      },
    );
  }

  private updateDebugPanel(data: DebugPanelData): void {
    this.debugPanelManager?.update(data);
  }

  private showLevelUpOptions(payload: LevelUpOptionsPayload): void {
    this.hidePauseMenu();
    const options = Array.isArray(payload) ? payload : payload.options;

    if (options.length === 0) {
      this.levelUpPanel?.destroy();
      this.levelUpPanel = undefined;
      this.showTemporaryMessage({
        text: I18n.t('levelUp.noUpgrades'),
        durationMs: 1400,
      });
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
      this.levelUpPanel?.destroy();
      this.levelUpPanel = undefined;
      this.events.emit('UpgradeSelected', option);
    }, config);
  }

  private showPauseMenu(statsData?: StatsBuildSnapshot): void {
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
      (sceneKey) => {
        this.events.emit('PauseOpenDeveloperScene', sceneKey);
      },
    );
  }

  private getEmptyPauseStatsData(): StatsBuildSnapshot {
    return StatsBuildSnapshotBuilder.createEmpty();
  }

  private hidePauseMenu(): void {
    this.hideHelpOverlay();
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
  }

  private showHelpPanel(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this, () => {
      this.hideHelpOverlay();
    });
  }

  private hideHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
  }

  private showTemporaryMessage(payload: TemporaryMessagePayload): void {
    const message = typeof payload === 'string' ? payload : payload.text;
    const kind = typeof payload === 'string' ? 'normal' : payload.kind ?? 'normal';
    const screen = this.screenManager;
    if (!screen) {
      return;
    }
    const layout = LayoutConfig.getHudLayout(screen);
    const zone = layout.hudZones.centerMessage;
    const tiny = layout.density === 'tiny';
    const compact = layout.density === 'compact' || layout.density === 'tiny';
    const wrapRatio = kind === 'boss'
      ? tiny ? 0.36 : compact ? 0.5 : 0.42
      : tiny ? 0.38 : compact ? 0.56 : 0.38;

    this.temporaryMessage?.destroy();
    this.temporaryMessage = UITemporaryMessage.show(this, {
      x: zone.x + zone.width / 2,
      y: zone.y + zone.height / 2,
      text: message,
      kind,
      compact,
      durationMs: typeof payload === 'string' ? 1400 : payload.durationMs,
      wordWrapWidth: Math.max(180, Math.min(
        zone.width,
        screen.width * wrapRatio,
      )),
      fontSize: tiny ? kind === 'boss' ? '24px' : '16px' : undefined,
      strokeThickness: tiny ? kind === 'boss' ? 4 : 3 : undefined,
      depth: 3000,
      scrollFactor: 0,
      onComplete: (text) => {
        if (this.temporaryMessage === text) {
          this.temporaryMessage = undefined;
        }
      },
    });
  }

  private showRelicAcquired(payload: {
    id: string;
    name: string;
    description?: string;
    rarity?: string;
    iconKey?: string;
  }): void {
    this.relicAcquiredPanel?.destroy();
    this.relicAcquiredPanel = new RelicAcquiredPanel(this, {
      ...payload,
      onComplete: () => {
        this.relicAcquiredPanel?.destroy();
        this.relicAcquiredPanel = undefined;
      },
    });
  }

  private cleanup(): void {
    this.events.off('UpdateHUD', this.updateHUD, this);
    this.events.off('UpdateDebugPanel', this.updateDebugPanel, this);
    this.events.off('ShowLevelUpOptions', this.showLevelUpOptions, this);
    this.events.off('ShowTemporaryMessage', this.showTemporaryMessage, this);
    this.events.off('ShowRelicAcquired', this.showRelicAcquired, this);
    this.events.off('ShowPauseMenu', this.showPauseMenu, this);
    this.events.off('HidePauseMenu', this.hidePauseMenu, this);
    this.levelUpPanel?.destroy();
    this.levelUpPanel = undefined;
    this.pauseMenu?.destroy();
    this.pauseMenu = undefined;
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
    this.relicAcquiredPanel?.destroy();
    this.relicAcquiredPanel = undefined;
    this.temporaryMessage?.destroy();
    this.temporaryMessage = undefined;
    this.debugPanelManager?.destroy();
    this.debugPanelManager = undefined;
    this.liveStrategyControlPanel?.destroy();
    this.liveStrategyControlPanel = undefined;
    this.hud?.destroy();
    this.hud = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
