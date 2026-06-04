import { AchievementDefinition } from '../achievement/AchievementDefinition';
import { AchievementRegistry } from '../achievement/AchievementRegistry';
import { AchievementReward } from '../achievement/AchievementReward';
import { I18n } from '../i18n/I18n';
import { SaveManager } from '../save/SaveManager';

import { RecordsPanel } from './RecordsPanel';

const MAX_ACHIEVEMENT_ROWS = 12;

export class AchievementListPanel {
  render(panel: RecordsPanel): void {
    const definitions = AchievementRegistry.list();

    if (definitions.length === 0) {
      panel.setContent(I18n.t('records.achievements'), [I18n.t('records.empty')]);
      return;
    }

    const progressById = SaveManager.get().progression.achievements;
    const rows = definitions.map((definition) => this.formatAchievement(
      definition,
      progressById[definition.id],
    ));
    const visibleRows = rows.slice(0, MAX_ACHIEVEMENT_ROWS);

    if (rows.length > visibleRows.length) {
      visibleRows.push(`+${rows.length - visibleRows.length} more`);
    }

    panel.setContent(I18n.t('records.achievements'), visibleRows);
  }

  private formatAchievement(
    definition: AchievementDefinition,
    progress: {
      unlocked: boolean;
      unlockedAt?: string;
      progressValue?: number;
      targetValue?: number;
    } | undefined,
  ): string {
    const unlocked = progress?.unlocked === true;
    const status = unlocked ? I18n.t('records.unlocked') : I18n.t('records.locked');
    const name = definition.hidden && !unlocked
      ? '???'
      : this.translateOrFallback(definition.nameKey, definition.id);
    const progressText = this.formatProgress(progress);
    const dateText = unlocked && progress?.unlockedAt
      ? ` ${this.formatShortDate(progress.unlockedAt)}`
      : '';
    const rewardText = this.formatRewards(definition.rewards);

    return `${status}  ${name}${progressText}${dateText}${rewardText}`;
  }

  private formatProgress(progress: {
    progressValue?: number;
    targetValue?: number;
  } | undefined): string {
    if (progress?.targetValue === undefined) {
      return '';
    }

    return ` ${progress.progressValue ?? 0}/${progress.targetValue}`;
  }

  private formatRewards(rewards: readonly AchievementReward[] | undefined): string {
    if (!rewards || rewards.length === 0) {
      return '';
    }

    const targets = rewards
      .filter((reward) => reward.type !== 'none')
      .map((reward) => reward.targetId ?? reward.type);

    return targets.length > 0 ? ` -> ${targets.slice(0, 2).join(', ')}` : '';
  }

  private formatShortDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }

  private translateOrFallback(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
