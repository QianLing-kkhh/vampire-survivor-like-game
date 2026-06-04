import { GameEvent } from '../events/GameEvent';
import { GameEventBus } from '../events/GameEventBus';
import { SaveManager } from '../save/SaveManager';

import { AchievementDefinition } from './AchievementDefinition';
import {
  AchievementEvaluationContext,
  AchievementEvaluator,
  AchievementRunSummary,
} from './AchievementEvaluator';
import { AchievementProgress } from './AchievementProgress';
import { AchievementRegistry } from './AchievementRegistry';

export type AchievementListener = (
  progress: AchievementProgress,
  definition: AchievementDefinition,
) => void;

export class AchievementManager {
  private readonly evaluator = new AchievementEvaluator();
  private readonly listeners = new Set<AchievementListener>();
  private unsubscribeGameEvents?: () => void;

  constructor(private readonly context: AchievementEvaluationContext) {
    AchievementRegistry.ensureBuiltInsRegistered();
  }

  initialize(gameEventBus?: GameEventBus): void {
    if (!gameEventBus) {
      return;
    }

    this.unsubscribeGameEvents?.();
    this.unsubscribeGameEvents = gameEventBus.subscribeAll((event) => {
      this.handleGameEvent(event);
    });
  }

  destroy(): void {
    this.unsubscribeGameEvents?.();
    this.unsubscribeGameEvents = undefined;
    this.listeners.clear();
  }

  handleGameEvent(event: GameEvent): AchievementProgress[] {
    if (event.type === 'run.ended') {
      const runSummary = this.getRunSummaryFromEvent(event);

      if (runSummary) {
        return this.handleRunEnd(runSummary);
      }
    }

    const save = SaveManager.get();
    const unlocked = this.evaluator.evaluateEvent(
      event,
      AchievementRegistry.list(),
      save.progression.achievements,
      this.context,
    );

    if (unlocked.length === 0) {
      return [];
    }

    return this.unlockAchievements(unlocked);
  }

  private getRunSummaryFromEvent(event: GameEvent): AchievementRunSummary | null {
    if (typeof event.payload !== 'object' || event.payload === null) {
      return null;
    }

    const payload = event.payload as Record<string, unknown>;
    const resultType = payload.resultType === 'victory' || payload.resultType === 'gameOver'
      ? payload.resultType
      : null;

    if (resultType === null) {
      return null;
    }

    return {
      ...this.context,
      resultType,
      survivalTime: this.readNumber(payload.survivalTime),
      endlessSurvivalTime: this.readNumber(payload.endlessSurvivalTime),
      killCount: this.readNumber(payload.killCount),
      treasureOpenCount: this.readNumber(payload.treasureOpenCount),
      evolutionCount: this.readNumber(payload.evolutionCount),
    };
  }

  handleRunEnd(runSummary: AchievementRunSummary): AchievementProgress[] {
    const save = SaveManager.get();
    const unlocked = this.evaluator.evaluateRunEnd(
      runSummary,
      AchievementRegistry.list(),
      save.progression.achievements,
      this.context,
    );

    if (unlocked.length === 0) {
      return [];
    }

    return this.unlockAchievements(unlocked);
  }

  getProgress(id: string): AchievementProgress | undefined {
    const progress = SaveManager.get().progression.achievements[id];

    return progress ? { ...progress } : undefined;
  }

  listProgress(): AchievementProgress[] {
    return Object.values(SaveManager.get().progression.achievements)
      .map((progress) => ({ ...progress }));
  }

  markSeen(id: string): void {
    const save = SaveManager.get();
    const progress = save.progression.achievements[id];

    if (!progress) {
      return;
    }

    SaveManager.update({
      progression: {
        achievements: {
          ...save.progression.achievements,
          [id]: {
            ...progress,
            seen: true,
          },
        },
      },
    });
  }

  resetProgress(): void {
    SaveManager.update({
      progression: {
        achievements: {},
        milestones: {},
      },
    });
  }

  subscribe(listener: AchievementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private unlockAchievements(
    definitions: readonly AchievementDefinition[],
  ): AchievementProgress[] {
    const save = SaveManager.get();
    const nextProgress = { ...save.progression.achievements };
    const unlockedProgress: AchievementProgress[] = [];

    for (const definition of definitions) {
      const previous = nextProgress[definition.id];
      const progress: AchievementProgress = {
        achievementId: definition.id,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
        progressValue: 1,
        targetValue: 1,
        seen: previous?.seen ?? false,
        repeatCount: definition.repeatable
          ? (previous?.repeatCount ?? 0) + 1
          : previous?.repeatCount,
      };

      nextProgress[definition.id] = progress;
      unlockedProgress.push(progress);
    }

    SaveManager.update({
      progression: {
        achievements: nextProgress,
      },
    });

    for (const progress of unlockedProgress) {
      const definition = AchievementRegistry.get(progress.achievementId);

      if (!definition) {
        continue;
      }

      console.info(`Achievement unlocked: ${definition.id}`);
      this.notify(progress, definition);
    }

    return unlockedProgress;
  }

  private notify(
    progress: AchievementProgress,
    definition: AchievementDefinition,
  ): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...progress }, definition);
      } catch (error) {
        console.warn(`Achievement listener failed for ${definition.id}`, error);
      }
    }
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }
}
