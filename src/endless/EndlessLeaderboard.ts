import { CharacterManager } from '../character/CharacterManager';
import {
  createLeaderboardKey,
  LeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardManager } from '../leaderboard/LeaderboardManager';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { MapManager } from '../map/MapManager';
import { PassiveLevel } from '../passive/PassiveItem';
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
}

export class EndlessLeaderboard {
  private static readonly LEGACY_STORAGE_KEY = 'vampire_survivor_like_endless_leaderboard_v1';
  private static legacyMigrationAttempted = false;

  static add(entry: EndlessLeaderboardEntry): number | null {
    EndlessLeaderboard.migrateLegacyEntries();

    const key = EndlessLeaderboard.getCurrentKey();
    const record = EndlessLeaderboard.toRecord(entry, key);

    return LeaderboardManager.addRecord(key, record);
  }

  static getEntries(): EndlessLeaderboardEntry[] {
    EndlessLeaderboard.migrateLegacyEntries();

    return LeaderboardManager.getRecords(EndlessLeaderboard.getCurrentKey())
      .map((record) => EndlessLeaderboard.toEntry(record));
  }

  static getCurrentKey(): LeaderboardKey {
    return createLeaderboardKey({
      mode: 'endless',
      characterId: new CharacterManager().getSelectedCharacterId(),
      stageId: new StageManager().getSelectedStageId(),
      mapId: new MapManager().getSelectedMapId(),
    });
  }

  private static toRecord(
    entry: EndlessLeaderboardEntry,
    key: LeaderboardKey,
  ): LeaderboardRecord {
    const timestamp = entry.timestamp || new Date().toISOString();

    return {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp,
      mode: 'endless',
      survivalTime: entry.totalSurvivalTime ?? entry.endlessSurvivalTime ?? 0,
      endlessSurvivalTime: entry.endlessSurvivalTime ?? 0,
      finalLevel: entry.finalLevel ?? 1,
      killCount: entry.killCount ?? 0,
      characterId: key.characterId ?? 'default',
      stageId: key.stageId ?? 'stage_001',
      mapId: key.mapId ?? 'prototype_field',
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
      const rawEntries = globalThis.localStorage?.getItem(EndlessLeaderboard.LEGACY_STORAGE_KEY);

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

      globalThis.localStorage?.removeItem(EndlessLeaderboard.LEGACY_STORAGE_KEY);
    } catch {
      // SaveManager provides the active leaderboard storage fallback.
    }
  }
}
