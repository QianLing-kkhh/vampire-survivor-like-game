export interface GameplaySettingsData {
  autoMovement: boolean;
  autoUpgrade: boolean;
  autoOpenTreasure: boolean;
  fastMode: boolean;
  endlessMode: boolean;
  showDetailedCooldownTime: boolean;
  showDamageNumbers: boolean;
  autoTimeScale: number;
}

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettingsData = {
  autoMovement: false,
  autoUpgrade: false,
  autoOpenTreasure: false,
  fastMode: false,
  endlessMode: false,
  showDetailedCooldownTime: false,
  showDamageNumbers: false,
  autoTimeScale: 3,
};
