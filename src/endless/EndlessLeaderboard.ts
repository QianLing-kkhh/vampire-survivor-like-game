import { PassiveLevel } from '../passive/PassiveItem';

export interface EndlessLeaderboardEntry {
  timestamp: string;
  endlessSurvivalTime: number;
  totalSurvivalTime: number;
  finalLevel: number;
  killCount: number;
  weaponIds: string[];
  passiveItems: PassiveLevel[];
  evolutionPath: string[];
}

export class EndlessLeaderboard {
  private static readonly STORAGE_KEY = 'vampire_survivor_like_endless_leaderboard_v1';
  private static readonly MAX_ENTRIES = 10;
  private static memoryEntries: EndlessLeaderboardEntry[] = [];

  static add(entry: EndlessLeaderboardEntry): number | null {
    const entries = [...EndlessLeaderboard.getEntries(), entry]
      .sort((a, b) => b.endlessSurvivalTime - a.endlessSurvivalTime)
      .slice(0, EndlessLeaderboard.MAX_ENTRIES);
    const rank = entries.indexOf(entry) >= 0 ? entries.indexOf(entry) + 1 : null;

    EndlessLeaderboard.save(entries);
    return rank;
  }

  static getEntries(): EndlessLeaderboardEntry[] {
    try {
      const rawEntries = globalThis.localStorage?.getItem(EndlessLeaderboard.STORAGE_KEY);

      if (!rawEntries) {
        return [...EndlessLeaderboard.memoryEntries];
      }

      const parsedEntries = JSON.parse(rawEntries) as EndlessLeaderboardEntry[];

      if (!Array.isArray(parsedEntries)) {
        return [...EndlessLeaderboard.memoryEntries];
      }

      EndlessLeaderboard.memoryEntries = parsedEntries.slice(0, EndlessLeaderboard.MAX_ENTRIES);
      return [...EndlessLeaderboard.memoryEntries];
    } catch {
      return [...EndlessLeaderboard.memoryEntries];
    }
  }

  private static save(entries: EndlessLeaderboardEntry[]): void {
    EndlessLeaderboard.memoryEntries = entries;

    try {
      globalThis.localStorage?.setItem(
        EndlessLeaderboard.STORAGE_KEY,
        JSON.stringify(entries),
      );
    } catch {
      // Memory fallback is enough for environments without localStorage.
    }
  }
}
