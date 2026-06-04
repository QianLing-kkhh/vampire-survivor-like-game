export interface GameplaySettingsData {
  autoMovement: boolean;
  autoUpgrade: boolean;
  fastMode: boolean;
  endlessMode: boolean;
  autoTimeScale: number;
}

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettingsData = {
  autoMovement: false,
  autoUpgrade: false,
  fastMode: false,
  endlessMode: false,
  autoTimeScale: 3,
};
