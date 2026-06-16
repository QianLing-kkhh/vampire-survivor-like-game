import {
  LeaderboardKey,
  parseLeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { LeaderboardStorage } from '../leaderboard/LeaderboardStorage';
import { I18n } from '../i18n/I18n';

import { RecordsPanel, RecordsPanelRow } from './RecordsPanel';

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

    const rows: RecordsPanelRow[] = [
      {
        label: I18n.t('records.leaderboards'),
        value: `${groups.length}`,
        tone: 'section',
      },
      ...groups
        .slice(0, MAX_LEADERBOARD_GROUPS)
        .flatMap((group) => this.formatGroup(group.key, group.records)),
      ...(groups.length > MAX_LEADERBOARD_GROUPS ? [{
        label: I18n.t('result.more', { count: groups.length - MAX_LEADERBOARD_GROUPS }),
        tone: 'muted' as const,
      }] : []),
    ];

    panel.setRows(I18n.t('records.leaderboards'), rows);
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

  private formatGroup(key: LeaderboardKey, records: LeaderboardRecord[]): RecordsPanelRow[] {
    return [
      {
        label: this.formatKey(key),
        tone: 'section',
      },
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

  private formatRecord(key: LeaderboardKey, record: LeaderboardRecord, rank: number): RecordsPanelRow {
    if (key.mode === 'scoreAttack') {
      return {
        status: `#${rank}`,
        label: `${I18n.t('result.score')} ${record.score ?? 0}`,
        value: `Lv.${record.finalLevel} / ${record.killCount} ${I18n.t('result.kills')}`,
        tone: rank === 1 ? 'success' : 'normal',
      };
    }

    const time = key.mode === 'endless'
      ? record.endlessSurvivalTime ?? record.survivalTime
      : record.survivalTime;

    return {
      status: `#${rank}`,
      label: this.formatTime(time),
      value: `Lv.${record.finalLevel} / ${record.killCount} ${I18n.t('result.kills')}`,
      tone: rank === 1 ? 'success' : 'normal',
    };
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
