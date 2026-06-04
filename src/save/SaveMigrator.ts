import {
  SAVE_SCHEMA_VERSION,
  SaveData,
  createDefaultSaveData,
} from './SaveData';
import { isSupportedLocale } from '../i18n/Locale';
import { DEFAULT_AUDIO_SETTINGS } from '../settings/AudioSettings';
import { DEFAULT_DEVELOPER_SETTINGS } from '../settings/DeveloperSettings';
import { DEFAULT_DISPLAY_SETTINGS } from '../settings/DisplaySettings';
import { DEFAULT_GAMEPLAY_SETTINGS } from '../settings/GameplaySettings';
import { DEFAULT_INPUT_SETTINGS } from '../settings/InputSettings';
import {
  createLeaderboardKey,
  serializeLeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';

export class SaveMigrator {
  migrate(rawSave: string | null): SaveData {
    if (!rawSave) {
      return createDefaultSaveData();
    }

    try {
      const parsedSave = JSON.parse(rawSave) as Partial<SaveData>;

      if (
        typeof parsedSave.schemaVersion === 'number'
        && parsedSave.schemaVersion > SAVE_SCHEMA_VERSION
      ) {
        console.warn(
          `Save schema ${parsedSave.schemaVersion} is newer than supported schema ${SAVE_SCHEMA_VERSION}. Falling back to default save.`,
        );
        return createDefaultSaveData();
      }

      if (parsedSave.schemaVersion === SAVE_SCHEMA_VERSION) {
        return this.mergeWithDefaults(parsedSave);
      }

      return this.mergeWithDefaults(parsedSave);
    } catch (error) {
      console.warn('Save data is invalid. Falling back to default save.', error);
      return createDefaultSaveData();
    }
  }

  private mergeWithDefaults(save: Partial<SaveData>): SaveData {
    const defaultSave = createDefaultSaveData();

    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      settings: this.migrateSettings(save.settings),
      progression: this.migrateProgression(save.progression),
      selections: this.migrateSelections(save.selections),
      cosmetics: this.migrateCosmetics(save.cosmetics, save.selections),
      records: this.migrateRecords(save.records),
    };
  }

  private migrateProgression(
    progression: Partial<SaveData['progression']> | undefined,
  ): SaveData['progression'] {
    const defaultProgression = createDefaultSaveData().progression;

    if (!this.isObject(progression)) {
      return defaultProgression;
    }

    return {
      ...defaultProgression,
      unlockedCharacterIds: Array.isArray(progression.unlockedCharacterIds)
        ? this.mergeStringArrays(defaultProgression.unlockedCharacterIds, progression.unlockedCharacterIds)
        : defaultProgression.unlockedCharacterIds,
      unlockedStageIds: Array.isArray(progression.unlockedStageIds)
        ? this.mergeStringArrays(defaultProgression.unlockedStageIds, progression.unlockedStageIds)
        : defaultProgression.unlockedStageIds,
      unlockedMapIds: Array.isArray(progression.unlockedMapIds)
        ? this.mergeStringArrays(defaultProgression.unlockedMapIds, progression.unlockedMapIds)
        : defaultProgression.unlockedMapIds,
      unlockedWeaponIds: Array.isArray(progression.unlockedWeaponIds)
        ? this.readStringArray(progression.unlockedWeaponIds)
        : defaultProgression.unlockedWeaponIds,
      unlockedPassiveIds: Array.isArray(progression.unlockedPassiveIds)
        ? this.readStringArray(progression.unlockedPassiveIds)
        : defaultProgression.unlockedPassiveIds,
      unlockedCosmeticIds: Array.isArray(progression.unlockedCosmeticIds)
        ? this.readStringArray(progression.unlockedCosmeticIds)
        : defaultProgression.unlockedCosmeticIds,
      unlockedThemeIds: Array.isArray(progression.unlockedThemeIds)
        ? this.mergeStringArrays(defaultProgression.unlockedThemeIds, progression.unlockedThemeIds)
        : defaultProgression.unlockedThemeIds,
      unlockedDifficultyIds: Array.isArray(progression.unlockedDifficultyIds)
        ? this.mergeStringArrays(defaultProgression.unlockedDifficultyIds, progression.unlockedDifficultyIds)
        : defaultProgression.unlockedDifficultyIds,
      unlockedChallengeIds: Array.isArray(progression.unlockedChallengeIds)
        ? this.readStringArray(progression.unlockedChallengeIds)
        : defaultProgression.unlockedChallengeIds,
      unlocks: this.isObject(progression.unlocks)
        ? {
          ...defaultProgression.unlocks,
          ...this.normalizeUnlocks(progression.unlocks),
        }
        : defaultProgression.unlocks,
      achievements: this.isObject(progression.achievements)
        ? this.normalizeAchievementProgress(progression.achievements)
        : defaultProgression.achievements,
      milestones: this.isObject(progression.milestones)
        ? progression.milestones
        : defaultProgression.milestones,
    };
  }

  private mergeStringArrays(defaultValues: readonly string[], value: unknown): string[] {
    return [...new Set([...defaultValues, ...this.readStringArray(value)])];
  }

  private normalizeUnlocks(
    unlocks: Record<string, unknown>,
  ): SaveData['progression']['unlocks'] {
    return Object.entries(unlocks).reduce<SaveData['progression']['unlocks']>(
      (result, [unlockId, value]) => {
        if (!this.isObject(value)) {
          return result;
        }

        result[unlockId] = {
          unlocked: value.unlocked === true,
          unlockedAt: this.readOptionalString(value.unlockedAt),
        };

        return result;
      },
      {},
    );
  }

  private normalizeAchievementProgress(
    achievements: Record<string, unknown>,
  ): SaveData['progression']['achievements'] {
    return Object.entries(achievements).reduce<SaveData['progression']['achievements']>(
      (result, [achievementId, value]) => {
        if (!this.isObject(value)) {
          return result;
        }

        result[achievementId] = {
          achievementId: this.readString(value.achievementId, achievementId),
          unlocked: value.unlocked === true,
          unlockedAt: this.readOptionalString(value.unlockedAt),
          progressValue: typeof value.progressValue === 'number'
            ? value.progressValue
            : undefined,
          targetValue: typeof value.targetValue === 'number'
            ? value.targetValue
            : undefined,
          seen: value.seen === true,
          repeatCount: typeof value.repeatCount === 'number'
            ? Math.max(0, value.repeatCount)
            : undefined,
        };

        return result;
      },
      {},
    );
  }

  private migrateSelections(
    selections: Partial<SaveData['selections']> | undefined,
  ): SaveData['selections'] {
    const defaultSelections = createDefaultSaveData().selections;

    if (!this.isObject(selections)) {
      return defaultSelections;
    }

    return {
      ...defaultSelections,
      selectedCharacterId: this.readString(selections.selectedCharacterId, defaultSelections.selectedCharacterId),
      selectedStageId: this.readString(selections.selectedStageId, defaultSelections.selectedStageId),
      selectedMapId: this.readString(selections.selectedMapId, defaultSelections.selectedMapId),
      selectedDifficultyId: this.readOptionalString(selections.selectedDifficultyId)
        ?? defaultSelections.selectedDifficultyId,
      selectedChallengeId: this.readOptionalString(selections.selectedChallengeId),
      selectedCustomStageId: this.readOptionalString(selections.selectedCustomStageId),
      selectedSeed: this.readOptionalString(selections.selectedSeed),
      selectedRulesetId: this.readOptionalString(selections.selectedRulesetId),
      selectedThemeId: this.readString(selections.selectedThemeId, defaultSelections.selectedThemeId),
    };
  }

  private migrateCosmetics(
    cosmetics: unknown,
    selections: Partial<SaveData['selections']> | undefined,
  ): SaveData['cosmetics'] {
    const defaultCosmetics = createDefaultSaveData().cosmetics;

    if (!this.isObject(cosmetics)) {
      return {
        ...defaultCosmetics,
        selectedThemeId: selections?.selectedThemeId ?? defaultCosmetics.selectedThemeId,
      };
    }

    return {
      ...defaultCosmetics,
      ...cosmetics,
      selectedThemeId: typeof cosmetics.selectedThemeId === 'string'
        ? cosmetics.selectedThemeId
        : selections?.selectedThemeId ?? defaultCosmetics.selectedThemeId,
      selectedCharacterSkinByCharacterId: this.isObject(cosmetics.selectedCharacterSkinByCharacterId)
        ? this.readStringRecord(cosmetics.selectedCharacterSkinByCharacterId)
        : defaultCosmetics.selectedCharacterSkinByCharacterId,
      selectedWeaponSkinByWeaponId: this.isObject(cosmetics.selectedWeaponSkinByWeaponId)
        ? this.readStringRecord(cosmetics.selectedWeaponSkinByWeaponId)
        : defaultCosmetics.selectedWeaponSkinByWeaponId,
      selectedEnemySkinByEnemyId: this.isObject(cosmetics.selectedEnemySkinByEnemyId)
        ? this.readStringRecord(cosmetics.selectedEnemySkinByEnemyId)
        : defaultCosmetics.selectedEnemySkinByEnemyId,
      selectedUiThemeId: typeof cosmetics.selectedUiThemeId === 'string'
        ? cosmetics.selectedUiThemeId
        : undefined,
      selectedWorldThemeId: typeof cosmetics.selectedWorldThemeId === 'string'
        ? cosmetics.selectedWorldThemeId
        : undefined,
    };
  }

  private migrateRecords(records: unknown): SaveData['records'] {
    if (!this.isObject(records)) {
      return createDefaultSaveData().records;
    }

    if (this.isObject(records.leaderboardsByKey)) {
      return {
        leaderboardsByKey: this.normalizeLeaderboardsByKey(records.leaderboardsByKey),
      };
    }

    if (this.isObject(records.endlessLeaderboardByStageId)) {
      return {
        leaderboardsByKey: this.migrateLegacyEndlessLeaderboards(
          records.endlessLeaderboardByStageId,
        ),
      };
    }

    return createDefaultSaveData().records;
  }

  private normalizeLeaderboardsByKey(
    leaderboardsByKey: Record<string, unknown>,
  ): Record<string, LeaderboardRecord[]> {
    return Object.entries(leaderboardsByKey).reduce<Record<string, LeaderboardRecord[]>>(
      (result, [key, records]) => {
        if (!Array.isArray(records)) {
          return result;
        }

        result[key] = records
          .map((record, index) => this.normalizeLeaderboardRecord(record, index))
          .filter((record): record is LeaderboardRecord => record !== null)
          .sort((a, b) => (b.endlessSurvivalTime ?? b.survivalTime)
            - (a.endlessSurvivalTime ?? a.survivalTime))
          .slice(0, 10);

        return result;
      },
      {},
    );
  }

  private migrateLegacyEndlessLeaderboards(
    endlessLeaderboardByStageId: Record<string, unknown>,
  ): Record<string, LeaderboardRecord[]> {
    return Object.entries(endlessLeaderboardByStageId).reduce<Record<string, LeaderboardRecord[]>>(
      (result, [stageId, records]) => {
        if (!Array.isArray(records)) {
          return result;
        }

        const key = serializeLeaderboardKey(createLeaderboardKey({
          mode: 'endless',
          characterId: 'default',
          stageId: stageId || 'stage_001',
          mapId: 'prototype_field',
        }));

        result[key] = records
          .map((record, index) => this.normalizeLeaderboardRecord(
            record,
            index,
            stageId || 'stage_001',
          ))
          .filter((record): record is LeaderboardRecord => record !== null)
          .sort((a, b) => (b.endlessSurvivalTime ?? b.survivalTime)
            - (a.endlessSurvivalTime ?? a.survivalTime))
          .slice(0, 10);

        return result;
      },
      {},
    );
  }

  private normalizeLeaderboardRecord(
    record: unknown,
    index: number,
    fallbackStageId = 'stage_001',
  ): LeaderboardRecord | null {
    if (!this.isObject(record)) {
      return null;
    }

    const timestamp = typeof record.timestamp === 'string'
      ? record.timestamp
      : new Date(0).toISOString();
    const survivalTime = this.readNumber(
      record.survivalTime ?? record.totalSurvivalTime,
      0,
      0,
    );
    const endlessSurvivalTime = this.readNumber(
      record.endlessSurvivalTime,
      survivalTime,
      0,
    );
    const characterId = typeof record.characterId === 'string'
      ? record.characterId
      : 'default';
    const stageId = typeof record.stageId === 'string'
      ? record.stageId
      : fallbackStageId;
    const mapId = typeof record.mapId === 'string'
      ? record.mapId
      : 'prototype_field';

    return {
      id: typeof record.id === 'string'
        ? record.id
        : `${timestamp}-${index}`,
      timestamp,
      mode: typeof record.mode === 'string' ? record.mode : 'endless',
      survivalTime,
      endlessSurvivalTime,
      finalLevel: this.readNumber(record.finalLevel, 1, 1),
      killCount: this.readNumber(record.killCount, 0, 0),
      characterId,
      stageId,
      mapId,
      seed: typeof record.seed === 'string' ? record.seed : undefined,
      weaponIds: this.readStringArray(record.weaponIds),
      passiveItems: this.readPassiveItems(record.passiveItems),
      evolutionPath: this.readStringArray(record.evolutionPath),
      metadata: this.isObject(record.metadata) ? record.metadata : undefined,
    };
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private readStringRecord(value: Record<string, unknown>): Record<string, string> {
    return Object.entries(value).reduce<Record<string, string>>((result, [key, item]) => {
      if (typeof item === 'string') {
        result[key] = item;
      }

      return result;
    }, {});
  }

  private readPassiveItems(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (!this.isObject(item)) {
          return null;
        }

        const name = typeof item.name === 'string'
          ? item.name
          : typeof item.id === 'string' ? item.id : null;
        const level = typeof item.level === 'number'
          ? item.level
          : null;

        return name === null
          ? null
          : level === null ? name : `${name} Lv.${level}`;
      })
      .filter((item): item is string => item !== null);
  }

  private migrateSettings(settings: unknown): SaveData['settings'] {
    const defaultSettings = createDefaultSaveData().settings;

    if (!settings || typeof settings !== 'object') {
      return defaultSettings;
    }

    const rawSettings = settings as Record<string, unknown>;

    if (
      this.isObject(rawSettings.gameplay)
      || this.isObject(rawSettings.audio)
      || this.isObject(rawSettings.display)
      || this.isObject(rawSettings.input)
      || this.isObject(rawSettings.developer)
    ) {
      const display = rawSettings.display as Partial<SaveData['settings']['display']> | undefined;

      return {
        gameplay: {
          ...DEFAULT_GAMEPLAY_SETTINGS,
          ...(this.isObject(rawSettings.gameplay) ? rawSettings.gameplay : {}),
        },
        audio: {
          ...DEFAULT_AUDIO_SETTINGS,
          ...(this.isObject(rawSettings.audio) ? rawSettings.audio : {}),
        },
        display: {
          ...DEFAULT_DISPLAY_SETTINGS,
          ...(display ?? {}),
          locale: isSupportedLocale(display?.locale)
            ? display.locale
            : DEFAULT_DISPLAY_SETTINGS.locale,
        },
        input: {
          ...DEFAULT_INPUT_SETTINGS,
          ...(this.isObject(rawSettings.input) ? rawSettings.input : {}),
        },
        developer: {
          ...DEFAULT_DEVELOPER_SETTINGS,
          ...(this.isObject(rawSettings.developer) ? rawSettings.developer : {}),
        },
      };
    }

    const audioEnabled = rawSettings.audioEnabled === undefined
      ? Boolean(rawSettings.soundEnabled)
      : Boolean(rawSettings.audioEnabled);
    const legacyAutoMode = Boolean(rawSettings.autoMode);
    const autoMovement = rawSettings.autoMovement === undefined
      ? legacyAutoMode
      : Boolean(rawSettings.autoMovement);
    const autoUpgrade = rawSettings.autoUpgrade === undefined
      ? legacyAutoMode
      : Boolean(rawSettings.autoUpgrade);

    return {
      gameplay: {
        ...DEFAULT_GAMEPLAY_SETTINGS,
        autoMovement,
        autoUpgrade,
        fastMode: Boolean(rawSettings.fastMode),
        endlessMode: Boolean(rawSettings.endlessMode),
        autoTimeScale: this.readNumber(rawSettings.autoTimeScale, DEFAULT_GAMEPLAY_SETTINGS.autoTimeScale),
      },
      audio: {
        ...DEFAULT_AUDIO_SETTINGS,
        audioEnabled,
        bgmVolume: this.readVolume(rawSettings.bgmVolume),
        sfxVolume: this.readVolume(rawSettings.sfxVolume),
        weaponVolume: this.readVolume(rawSettings.weaponVolume),
        uiVolume: this.readVolume(rawSettings.uiVolume),
      },
      display: {
        ...DEFAULT_DISPLAY_SETTINGS,
        locale: isSupportedLocale(rawSettings.locale)
          ? rawSettings.locale
          : DEFAULT_DISPLAY_SETTINGS.locale,
      },
      input: { ...DEFAULT_INPUT_SETTINGS },
      developer: { ...DEFAULT_DEVELOPER_SETTINGS },
    };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private readVolume(value: unknown): number {
    return this.readNumber(value, 0, 0, 1);
  }

  private readString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
  }

  private readOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private readNumber(
    value: unknown,
    fallback: number,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
  ): number {
    return typeof value === 'number'
      ? Math.max(min, Math.min(max, value))
      : fallback;
  }
}
