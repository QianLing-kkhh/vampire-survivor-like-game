import {
  createLeaderboardKey,
} from '../leaderboard/LeaderboardKey';
import { LeaderboardManager } from '../leaderboard/LeaderboardManager';
import { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { I18n } from '../i18n/I18n';
import { SelectionManager } from '../selection/SelectionManager';

import { RecordsPanel } from './RecordsPanel';

const MAX_LEADERBOARD_ROWS = 10;

export class LeaderboardPanel {
  render(panel: RecordsPanel): void {
    const selection = SelectionManager.getSelection();
    const key = createLeaderboardKey({
      mode: 'endless',
      characterId: selection.characterId,
      stageId: selection.stageId,
      mapId: selection.mapId,
      difficultyId: selection.difficultyId,
      seed: selection.seed,
      challengeId: selection.challengeId,
      customStageId: selection.customStageId,
      rulesetId: selection.rulesetId,
    });
    const records = LeaderboardManager.getRecords(key);
    const header = [
      `Mode: endless`,
      `Stage: ${selection.stageId}`,
      `Character: ${selection.characterId}`,
    ];

    if (records.length === 0) {
      panel.setContent(I18n.t('records.leaderboards'), [
        ...header,
        '',
        I18n.t('records.noRecords'),
      ]);
      return;
    }

    const rows = records
      .slice(0, MAX_LEADERBOARD_ROWS)
      .map((record, index) => this.formatRecord(record, index + 1));

    panel.setContent(I18n.t('records.leaderboards'), [
      ...header,
      '',
      ...rows,
    ]);
  }

  private formatRecord(record: LeaderboardRecord, rank: number): string {
    const time = this.formatTime(record.endlessSurvivalTime ?? record.survivalTime);

    return `#${rank} ${time}  Lv.${record.finalLevel}  Kills ${record.killCount}`;
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
}
