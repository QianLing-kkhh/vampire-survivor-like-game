import { LeaderboardKey, serializeLeaderboardKey } from './LeaderboardKey';
import { LeaderboardRecord } from './LeaderboardRecord';
import { LeaderboardStorage } from './LeaderboardStorage';

const DEFAULT_MAX_RECORDS = 10;

export class LeaderboardManager {
  static addRecord(key: LeaderboardKey, record: LeaderboardRecord): number | null {
    const serializedKey = serializeLeaderboardKey(key);
    const records = [
      ...LeaderboardStorage.get(serializedKey),
      record,
    ];
    const sortedRecords = LeaderboardManager.sortRecords(key, records)
      .slice(0, DEFAULT_MAX_RECORDS);
    const rank = sortedRecords.findIndex((entry) => entry.id === record.id);

    LeaderboardStorage.set(serializedKey, sortedRecords);
    return rank >= 0 ? rank + 1 : null;
  }

  static getRecords(key: LeaderboardKey): LeaderboardRecord[] {
    const serializedKey = serializeLeaderboardKey(key);

    return LeaderboardManager.sortRecords(key, LeaderboardStorage.get(serializedKey));
  }

  static clearRecords(key: LeaderboardKey): void {
    LeaderboardStorage.clear(serializeLeaderboardKey(key));
  }

  static clearAll(): void {
    LeaderboardStorage.clearAll();
  }

  static getRankForRecord(key: LeaderboardKey, record: LeaderboardRecord): number | null {
    const rank = LeaderboardManager.getRecords(key)
      .findIndex((entry) => entry.id === record.id);

    return rank >= 0 ? rank + 1 : null;
  }

  static trimToTopN(key: LeaderboardKey, n: number): void {
    const serializedKey = serializeLeaderboardKey(key);
    const nextRecords = LeaderboardManager.sortRecords(
      key,
      LeaderboardStorage.get(serializedKey),
    ).slice(0, Math.max(0, n));

    LeaderboardStorage.set(serializedKey, nextRecords);
  }

  private static sortRecords(
    key: LeaderboardKey,
    records: LeaderboardRecord[],
  ): LeaderboardRecord[] {
    return [...records].sort((a, b) => {
      const aScore = LeaderboardManager.getScore(key, a);
      const bScore = LeaderboardManager.getScore(key, b);

      if (bScore !== aScore) {
        return bScore - aScore;
      }

      return b.timestamp.localeCompare(a.timestamp);
    });
  }

  private static getScore(key: LeaderboardKey, record: LeaderboardRecord): number {
    if (key.mode === 'endless') {
      return record.endlessSurvivalTime ?? record.survivalTime;
    }

    return record.survivalTime;
  }
}
