import {
  DEFAULT_AUDIO_SETTINGS,
  AudioSettingsData,
} from '../settings/AudioSettings';
import {
  DEFAULT_DEVELOPER_SETTINGS,
  DeveloperSettingsData,
} from '../settings/DeveloperSettings';
import {
  DEFAULT_DISPLAY_SETTINGS,
  DisplaySettingsData,
} from '../settings/DisplaySettings';
import {
  DEFAULT_GAMEPLAY_SETTINGS,
  GameplaySettingsData,
} from '../settings/GameplaySettings';
import {
  DEFAULT_INPUT_SETTINGS,
  InputSettingsData,
} from '../settings/InputSettings';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';

export const SAVE_SCHEMA_VERSION = 4;

export interface SaveData {
  schemaVersion: number;
  settings: {
    gameplay: GameplaySettingsData;
    audio: AudioSettingsData;
    display: DisplaySettingsData;
    input: InputSettingsData;
    developer: DeveloperSettingsData;
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
    selectedDifficultyId: string;
    selectedThemeId: string;
  };
  cosmetics: {
    selectedCharacterSkinByCharacterId: Record<string, string>;
  };
  records: {
    leaderboardsByKey: Record<string, LeaderboardRecord[]>;
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    settings: {
      gameplay: { ...DEFAULT_GAMEPLAY_SETTINGS },
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      display: { ...DEFAULT_DISPLAY_SETTINGS },
      input: { ...DEFAULT_INPUT_SETTINGS },
      developer: { ...DEFAULT_DEVELOPER_SETTINGS },
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
      selectedDifficultyId: 'normal',
      selectedThemeId: 'default',
    },
    cosmetics: {
      selectedCharacterSkinByCharacterId: {},
    },
    records: {
      leaderboardsByKey: {},
    },
  };
}
