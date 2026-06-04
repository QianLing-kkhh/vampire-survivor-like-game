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
import { AchievementProgress } from '../achievement/AchievementProgress';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';

export const SAVE_SCHEMA_VERSION = 8;

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
    unlockedWeaponIds: string[];
    unlockedPassiveIds: string[];
    unlockedCosmeticIds: string[];
    unlockedThemeIds: string[];
    unlockedDifficultyIds: string[];
    unlockedChallengeIds: string[];
    unlocks: Record<string, {
      unlocked: boolean;
      unlockedAt?: string;
    }>;
    achievements: Record<string, AchievementProgress>;
    milestones: Record<string, unknown>;
  };
  selections: {
    selectedCharacterId: string;
    selectedStageId: string;
    selectedMapId: string;
    selectedDifficultyId?: string;
    selectedChallengeId?: string;
    selectedCustomStageId?: string;
    selectedSeed?: string;
    selectedRulesetId?: string;
    selectedThemeId: string;
  };
  cosmetics: {
    selectedThemeId: string;
    selectedCharacterSkinByCharacterId: Record<string, string>;
    selectedWeaponSkinByWeaponId: Record<string, string>;
    selectedEnemySkinByEnemyId: Record<string, string>;
    selectedUiThemeId?: string;
    selectedWorldThemeId?: string;
  };
  records: {
    leaderboardsByKey: Record<string, LeaderboardRecord[]>;
  };
}

export interface SaveSummary {
  schemaVersion: number;
  selectedCharacterId: string;
  selectedStageId: string;
  selectedMapId: string;
  selectedDifficultyId: string;
  selectedThemeId: string;
  settingsCount?: number;
  unlockCount?: number;
  achievementCount?: number;
  leaderboardCount: number;
  customStageCount?: number;
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
      unlockedWeaponIds: [],
      unlockedPassiveIds: [],
      unlockedCosmeticIds: [],
      unlockedThemeIds: ['default'],
      unlockedDifficultyIds: ['normal'],
      unlockedChallengeIds: [],
      unlocks: {
        'character:default': {
          unlocked: true,
        },
        'stage:stage_001': {
          unlocked: true,
        },
        'map:prototype_field': {
          unlocked: true,
        },
        'theme:default': {
          unlocked: true,
        },
      },
      achievements: {},
      milestones: {},
    },
    selections: {
      selectedCharacterId: 'default',
      selectedStageId: 'stage_001',
      selectedMapId: 'prototype_field',
      selectedDifficultyId: 'normal',
      selectedThemeId: 'default',
    },
    cosmetics: {
      selectedThemeId: 'default',
      selectedCharacterSkinByCharacterId: {},
      selectedWeaponSkinByWeaponId: {},
      selectedEnemySkinByEnemyId: {},
    },
    records: {
      leaderboardsByKey: {},
    },
  };
}
