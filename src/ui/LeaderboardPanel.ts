import {
  LeaderboardKey,
  parseLeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { LeaderboardStorage } from '../leaderboard/LeaderboardStorage';
import { I18n } from '../i18n/I18n';

import { RecordsPanel } from './RecordsPanel';

const MAX_LEADERBOARD_GROUPS = 8;
const MAX_RECORDS_PER_GROUP = 3;

export class LeaderboardPanel {
  render(panel: RecordsPanel): void {
    const groups = this.getLeaderboardGroups();

    if (groups.length === 0) {
      panel.setContent(I18n.t('records.leaderboards'), [
        I18n.t('records.noRecords'),
      ]);
      return;
    }

    panel.setContent(I18n.t('records.leaderboards'), [
      `Groups: ${groups.length}`,
      ...groups
        .slice(0, MAX_LEADERBOARD_GROUPS)
        .flatMap((group) => this.formatGroup(group.key, group.records)),
      ...(groups.length > MAX_LEADERBOARD_GROUPS
        ? [I18n.t('result.more', { count: groups.length - MAX_LEADERBOARD_GROUPS })]
        : []),
    ]);
  }

  private getLeaderboardGroups(): Array<{ key: LeaderboardKey; records: LeaderboardRecord[] }> {
    return Object.entries(LeaderboardStorage.getAll())
      .map(([serializedKey, records]) => ({
        key: parseLeaderboardKey(serializedKey),
        records: [...records],
      }))
      .filter((group): group is { key: LeaderboardKey; records: LeaderboardRecord[] } => (
        group.key !== null && group.records.length > 0
      ))
      .sort((a, b) => this.getLatestTimestamp(b.records).localeCompare(this.getLatestTimestamp(a.records)));
  }

  private formatGroup(key: LeaderboardKey, records: LeaderboardRecord[]): string[] {
    return [
      '',
      this.formatKey(key),
      ...records
        .slice(0, MAX_RECORDS_PER_GROUP)
        .map((record, index) => this.formatRecord(key, record, index + 1)),
    ];
  }

  private formatKey(key: LeaderboardKey): string {
    const controlMode = key.controlMode ?? 'manual';
    const strategy = key.strategyProfileHash
      ? ` / strategy ${key.strategyProfileHash.slice(0, 8)}`
      : '';
    const speed = key.speedBucket ? ` / ${key.speedBucket}` : '';

    return `${key.mode} / ${controlMode}${speed}${strategy} / ${key.characterId ?? '-'} @ ${key.stageId ?? '-'}`;
  }

  private formatRecord(key: LeaderboardKey, record: LeaderboardRecord, rank: number): string {
    if (key.mode === 'scoreAttack') {
      return `  #${rank} Score ${record.score ?? 0}  Lv.${record.finalLevel}  Kills ${record.killCount}`;
    }

    const time = key.mode === 'endless'
      ? record.endlessSurvivalTime ?? record.survivalTime
      : record.survivalTime;

    return `  #${rank} ${this.formatTime(time)}  Lv.${record.finalLevel}  Kills ${record.killCount}`;
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private getLatestTimestamp(records: LeaderboardRecord[]): string {
    return records.reduce((latest, record) => (
      record.timestamp > latest ? record.timestamp : latest
    ), '');
  }
}
