import { SaveManager } from '../save/SaveManager';

import { LeaderboardRecord } from './LeaderboardRecord';

export class LeaderboardStorage {
  static getAll(): Record<string, LeaderboardRecord[]> {
    return {
      ...(SaveManager.get().records.leaderboardsByKey ?? {}),
    };
  }

  static get(serializedKey: string): LeaderboardRecord[] {
    return [...(LeaderboardStorage.getAll()[serializedKey] ?? [])];
  }

  static set(serializedKey: string, records: LeaderboardRecord[]): void {
    SaveManager.update({
      records: {
        leaderboardsByKey: {
          ...LeaderboardStorage.getAll(),
          [serializedKey]: [...records],
        },
      },
    });
  }

  static clear(serializedKey: string): void {
    const nextLeaderboards = LeaderboardStorage.getAll();

    delete nextLeaderboards[serializedKey];
    SaveManager.update({
      records: {
        leaderboardsByKey: nextLeaderboards,
      },
    });
  }

  static clearAll(): void {
    SaveManager.update({
      records: {
        leaderboardsByKey: {},
      },
    });
  }
}
