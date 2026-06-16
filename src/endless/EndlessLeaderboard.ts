import { CharacterManager } from '../character/CharacterManager';
import {
  createLeaderboardKey,
  LeaderboardKey,
  serializeLeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardManager } from '../leaderboard/LeaderboardManager';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { MapManager } from '../map/MapManager';
import { PassiveLevel } from '../passive/PassiveItem';
import { RunMetadata } from '../run/RunMetadata';
import { LocalStorageAdapter } from '../save/storage/LocalStorageAdapter';
import { StageManager } from '../stage/StageManager';

export interface EndlessLeaderboardEntry {
  timestamp: string;
  endlessSurvivalTime: number;
  totalSurvivalTime: number;
  finalLevel: number;
  killCount: number;
  weaponIds: string[];
  passiveItems: PassiveLevel[] | string[];
  evolutionPath: string[];
  characterId?: string;
  stageId?: string;
  mapId?: string;
  metadata?: RunMetadata;
}

export class EndlessLeaderboard {
  private static readonly LEGACY_STORAGE_KEY = 'vampire_survivor_like_endless_leaderboard_v1';
  private static readonly legacyStorage = new LocalStorageAdapter();
  private static legacyMigrationAttempted = false;

  static add(entry: EndlessLeaderboardEntry, metadata?: RunMetadata): number | null {
    EndlessLeaderboard.migrateLegacyEntries();

    const key = EndlessLeaderboard.getCurrentKey(metadata);
    const record = EndlessLeaderboard.toRecord(entry, key, metadata);

    return LeaderboardManager.addRecord(key, record);
  }

  static getEntries(metadata?: RunMetadata): EndlessLeaderboardEntry[] {
    EndlessLeaderboard.migrateLegacyEntries();

    return LeaderboardManager.getRecords(EndlessLeaderboard.getCurrentKey(metadata))
      .map((record) => EndlessLeaderboard.toEntry(record));
  }

  static getCurrentKey(metadata?: RunMetadata): LeaderboardKey {
    if (metadata) {
      return createLeaderboardKey({
        mode: 'endless',
        controlMode: metadata.controlMode === 'autoStrategy' ? 'autoStrategy' : 'manual',
        autoChallengeType: metadata.autoChallengeType,
        characterId: metadata.characterId,
        stageId: metadata.stageId,
        mapId: metadata.mapId,
        difficultyId: metadata.difficultyId,
        seed: metadata.seed,
        challengeId: metadata.challengeId,
        customStageId: metadata.customStageId,
        rulesetId: metadata.rulesetId,
        strategyProfileHash: metadata.strategyProfileHash,
        speedBucket: metadata.speedBucket,
      });
    }

    return createLeaderboardKey({
      mode: 'endless',
      controlMode: 'manual',
      characterId: new CharacterManager().getSelectedCharacterId(),
      stageId: new StageManager().getSelectedStageId(),
      mapId: new MapManager().getSelectedMapId(),
    });
  }

  static clearLegacyStorage(): void {
    EndlessLeaderboard.legacyMigrationAttempted = true;
    EndlessLeaderboard.legacyStorage.removeItem(EndlessLeaderboard.LEGACY_STORAGE_KEY);
  }

  private static toRecord(
    entry: EndlessLeaderboardEntry,
    key: LeaderboardKey,
    metadata?: RunMetadata,
  ): LeaderboardRecord {
    const timestamp = entry.timestamp || new Date().toISOString();
    const leaderboardKey = serializeLeaderboardKey(key);

    return {
      id: metadata?.runId ?? `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
      runId: metadata?.runId,
      runSeed: metadata?.runSeed,
      gameVersion: metadata?.gameVersion,
      contentHash: metadata?.contentHash,
      timestamp,
      mode: 'endless',
      controlMode: key.controlMode,
      autoChallengeType: key.autoChallengeType,
      strategyProfileId: metadata?.strategyProfileId,
      strategyProfileHash: metadata?.strategyProfileHash ?? key.strategyProfileHash,
      simulationSpeedMultiplier: metadata?.simulationSpeedMultiplier,
      speedBucket: metadata?.speedBucket ?? key.speedBucket,
      survivalTime: entry.totalSurvivalTime ?? entry.endlessSurvivalTime ?? 0,
      endlessSurvivalTime: entry.endlessSurvivalTime ?? 0,
      finalLevel: entry.finalLevel ?? 1,
      killCount: entry.killCount ?? 0,
      characterId: key.characterId ?? 'default',
      stageId: key.stageId ?? 'stage_001',
      mapId: key.mapId ?? 'prototype_field',
      difficultyId: metadata?.difficultyId ?? key.difficultyId,
      customStageId: metadata?.customStageId ?? key.customStageId,
      challengeId: metadata?.challengeId ?? key.challengeId,
      rulesetId: metadata?.rulesetId ?? key.rulesetId,
      seed: metadata?.seed ?? key.seed,
      leaderboardKey,
      weaponIds: Array.isArray(entry.weaponIds) ? [...entry.weaponIds] : [],
      passiveItems: EndlessLeaderboard.formatPassiveItems(entry.passiveItems ?? []),
      evolutionPath: Array.isArray(entry.evolutionPath) ? [...entry.evolutionPath] : [],
    };
  }

  private static toEntry(record: LeaderboardRecord): EndlessLeaderboardEntry {
    return {
      timestamp: record.timestamp,
      endlessSurvivalTime: record.endlessSurvivalTime ?? record.survivalTime,
      totalSurvivalTime: record.survivalTime,
      finalLevel: record.finalLevel,
      killCount: record.killCount,
      weaponIds: [...record.weaponIds],
      passiveItems: [...record.passiveItems],
      evolutionPath: [...record.evolutionPath],
      characterId: record.characterId,
      stageId: record.stageId,
      mapId: record.mapId,
    };
  }

  private static formatPassiveItems(passiveItems: PassiveLevel[] | string[]): string[] {
    return passiveItems.map((passive) => {
      if (typeof passive === 'string') {
        return passive;
      }

      return `${passive.name} Lv.${passive.level}`;
    });
  }

  private static migrateLegacyEntries(): void {
    if (EndlessLeaderboard.legacyMigrationAttempted) {
      return;
    }

    EndlessLeaderboard.legacyMigrationAttempted = true;

    try {
      const rawEntries = EndlessLeaderboard.legacyStorage.getItem(EndlessLeaderboard.LEGACY_STORAGE_KEY);

      if (!rawEntries) {
        return;
      }

      const parsedEntries = JSON.parse(rawEntries) as unknown;

      if (!Array.isArray(parsedEntries)) {
        return;
      }

      const key = EndlessLeaderboard.getCurrentKey();

      parsedEntries
        .filter((entry): entry is EndlessLeaderboardEntry => (
          entry !== null
          && typeof entry === 'object'
          && typeof (entry as EndlessLeaderboardEntry).timestamp === 'string'
          && typeof (entry as EndlessLeaderboardEntry).endlessSurvivalTime === 'number'
        ))
        .forEach((entry) => {
          LeaderboardManager.addRecord(key, EndlessLeaderboard.toRecord(entry, key));
        });

      EndlessLeaderboard.legacyStorage.removeItem(EndlessLeaderboard.LEGACY_STORAGE_KEY);
    } catch {
      // SaveManager provides the active leaderboard storage fallback.
    }
  }
}
