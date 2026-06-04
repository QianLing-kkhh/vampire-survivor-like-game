import { DEFAULT_LOCALE, SupportedLocale } from '../i18n/Locale';

export const SAVE_SCHEMA_VERSION = 1;

export interface SaveData {
  schemaVersion: number;
  settings: {
    autoMovement: boolean;
    autoUpgrade: boolean;
    fastMode: boolean;
    endlessMode: boolean;
    audioEnabled: boolean;
    bgmVolume: number;
    sfxVolume: number;
    weaponVolume: number;
    uiVolume: number;
    locale: SupportedLocale;
  };
  progression: {
    unlockedCharacterIds: string[];
    unlockedStageIds: string[];
    unlockedMapIds: string[];
    unlockedCosmeticIds: string[];
  };
  selections: {
    selectedCharacterId: string;
    selectedStageId: string;
    selectedMapId: string;
    selectedThemeId: string;
  };
  cosmetics: {
    selectedCharacterSkinByCharacterId: Record<string, string>;
  };
  records: {
    endlessLeaderboardByStageId: Record<string, unknown[]>;
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    settings: {
      autoMovement: false,
      autoUpgrade: false,
      fastMode: false,
      endlessMode: false,
      audioEnabled: false,
      bgmVolume: 0,
      sfxVolume: 0,
      weaponVolume: 0,
      uiVolume: 0,
      locale: DEFAULT_LOCALE,
    },
    progression: {
      unlockedCharacterIds: ['default'],
      unlockedStageIds: ['stage_001'],
      unlockedMapIds: ['prototype_field'],
      unlockedCosmeticIds: [],
    },
    selections: {
      selectedCharacterId: 'default',
      selectedStageId: 'stage_001',
      selectedMapId: 'prototype_field',
      selectedThemeId: 'default',
    },
    cosmetics: {
      selectedCharacterSkinByCharacterId: {},
    },
    records: {
      endlessLeaderboardByStageId: {},
    },
  };
}
