import type { StrategyControlType } from '../runtime/RunModeConfig';

export interface GameplaySettingsData {
  autoMovement: boolean;
  autoUpgrade: boolean;
  autoOpenTreasure: boolean;
  strategyControlType: StrategyControlType;
  fastMode: boolean;
  endlessMode: boolean;
  showDetailedCooldownTime: boolean;
  showDamageNumbers: boolean;
  showStrategyTacticsPanel: boolean;
  pauseWhenStrategyPanelOpen: boolean;
  autoTimeScale: number;
}

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettingsData = {
  autoMovement: false,
  autoUpgrade: false,
  autoOpenTreasure: false,
  strategyControlType: 'fixed',
  fastMode: false,
  endlessMode: false,
  showDetailedCooldownTime: false,
  showDamageNumbers: false,
  showStrategyTacticsPanel: false,
  pauseWhenStrategyPanelOpen: false,
  autoTimeScale: 3,
};
