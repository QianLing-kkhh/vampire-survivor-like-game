import type { PlaytestSettingName, PlaytestSettingsState } from '../settings/PlaytestSettings';

import type { GameplayContext } from './GameplayContext';

export interface RuntimeSettingsSyncContext {
  gameplayContext?: GameplayContext;
  previousSettings: PlaytestSettingsState;
  nextSettings: PlaytestSettingsState;
  settingName: PlaytestSettingName;
  configuredGameplayTimeScale: number;
}

export interface RuntimeSettingsSyncResult {
  shouldHandleAutoMovement: boolean;
  shouldHandleAutoUpgrade: boolean;
  shouldHandleEndlessMode: boolean;
  shouldSyncBgm: boolean;
  shouldEmitHud: boolean;
}

export class RuntimeSettingsSynchronizer {
  sync(context: RuntimeSettingsSyncContext): RuntimeSettingsSyncResult {
    this.syncToGameplayContext(context);

    return {
      shouldHandleAutoMovement: context.settingName === 'autoMode'
        || context.settingName === 'autoMovement',
      shouldHandleAutoUpgrade: context.settingName === 'autoMode'
        || context.settingName === 'autoUpgrade',
      shouldHandleEndlessMode: context.settingName === 'endlessMode',
      shouldSyncBgm: context.settingName === 'audioEnabled'
        || context.settingName === 'bgmVolume'
        || context.settingName === 'settings',
      shouldEmitHud: true,
    };
  }

  private syncToGameplayContext(context: RuntimeSettingsSyncContext): void {
    const gameplayContext = context.gameplayContext;

    if (!gameplayContext) {
      return;
    }

    const safeScale = Math.max(0.1, context.configuredGameplayTimeScale);

    gameplayContext.playtestSettings = context.nextSettings;
    gameplayContext.autoMode = context.nextSettings.autoMode;
    gameplayContext.autoMovementEnabled = context.nextSettings.autoMovement;
    gameplayContext.autoUpgradeEnabled = context.nextSettings.autoUpgrade;
    gameplayContext.fastMode = context.nextSettings.fastMode;
    gameplayContext.endlessMode = context.nextSettings.endlessMode;
    gameplayContext.timeScale = safeScale;
    gameplayContext.effectiveTimeScale = safeScale;
    gameplayContext.runState.endlessMode = context.nextSettings.endlessMode;
  }
}
