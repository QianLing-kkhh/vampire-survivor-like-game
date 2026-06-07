export interface GameplaySettingsData {
  autoMovement: boolean;
  autoUpgrade: boolean;
  autoOpenTreasure: boolean;
  fastMode: boolean;
  endlessMode: boolean;
  autoTimeScale: number;
}

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettingsData = {
  autoMovement: true,
  autoUpgrade: true,
  autoOpenTreasure: true,
  fastMode: false,
  endlessMode: false,
  autoTimeScale: 3,
};
