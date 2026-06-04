import { AchievementReward } from './AchievementReward';
import { MilestoneDefinition } from './MilestoneDefinition';

export interface MilestoneProgress {
  milestoneId: string;
  counterValue: number;
  unlockedThresholds: number[];
}

export class MilestoneManager {
  private readonly progress = new Map<string, MilestoneProgress>();

  constructor(private readonly definitions: readonly MilestoneDefinition[] = []) {}

  updateCounter(counterKey: string, value: number): MilestoneProgress[] {
    const updated: MilestoneProgress[] = [];

    for (const definition of this.definitions) {
      if (definition.counterKey !== counterKey) {
        continue;
      }

      const progress = this.getOrCreateProgress(definition);
      progress.counterValue = Math.max(progress.counterValue, value);

      for (const threshold of definition.thresholds) {
        if (
          progress.counterValue >= threshold
          && !progress.unlockedThresholds.includes(threshold)
        ) {
          progress.unlockedThresholds.push(threshold);
        }
      }

      updated.push({ ...progress, unlockedThresholds: [...progress.unlockedThresholds] });
    }

    return updated;
  }

  getMilestoneProgress(id: string): MilestoneProgress | undefined {
    const progress = this.progress.get(id);

    return progress
      ? { ...progress, unlockedThresholds: [...progress.unlockedThresholds] }
      : undefined;
  }

  getRewardsForThreshold(
    definition: MilestoneDefinition,
    threshold: number,
  ): AchievementReward[] {
    return definition.thresholds.includes(threshold)
      ? [...(definition.rewards ?? [])]
      : [];
  }

  private getOrCreateProgress(definition: MilestoneDefinition): MilestoneProgress {
    const existing = this.progress.get(definition.id);

    if (existing) {
      return existing;
    }

    const created: MilestoneProgress = {
      milestoneId: definition.id,
      counterValue: 0,
      unlockedThresholds: [],
    };

    this.progress.set(definition.id, created);
    return created;
  }
}
