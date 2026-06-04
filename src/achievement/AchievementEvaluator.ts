import { GameEvent } from '../events/GameEvent';

import {
  AchievementCondition,
  AchievementDefinition,
} from './AchievementDefinition';
import { AchievementProgress } from './AchievementProgress';

export interface AchievementEvaluationContext {
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  customStageId?: string;
  seed?: string;
}

export interface AchievementRunSummary extends AchievementEvaluationContext {
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  endlessSurvivalTime: number;
  killCount: number;
  treasureOpenCount: number;
  evolutionCount: number;
}

export class AchievementEvaluator {
  evaluateEvent(
    event: GameEvent,
    definitions: readonly AchievementDefinition[],
    progressMap: Record<string, AchievementProgress>,
    context: AchievementEvaluationContext,
  ): AchievementDefinition[] {
    return definitions.filter((definition) => (
      definition.triggerType === 'event'
      && this.canUnlock(definition, progressMap)
      && this.matchesConditions(definition.conditions, { event, context })
    ));
  }

  evaluateRunEnd(
    runSummary: AchievementRunSummary,
    definitions: readonly AchievementDefinition[],
    progressMap: Record<string, AchievementProgress>,
    context: AchievementEvaluationContext,
  ): AchievementDefinition[] {
    return definitions.filter((definition) => (
      definition.triggerType === 'runEnd'
      && this.canUnlock(definition, progressMap)
      && this.matchesConditions(definition.conditions, {
        event: {
          id: 'run-summary',
          type: 'run.ended',
          payload: runSummary,
          gameTimeSeconds: runSummary.survivalTime,
          realTimestamp: new Date().toISOString(),
        },
        runSummary,
        context,
      })
    ));
  }

  private canUnlock(
    definition: AchievementDefinition,
    progressMap: Record<string, AchievementProgress>,
  ): boolean {
    return definition.repeatable === true || progressMap[definition.id]?.unlocked !== true;
  }

  private matchesConditions(
    conditions: readonly AchievementCondition[],
    input: {
      event?: GameEvent;
      runSummary?: AchievementRunSummary;
      context: AchievementEvaluationContext;
    },
  ): boolean {
    return conditions.every((condition) => this.matchesCondition(condition, input));
  }

  private matchesCondition(
    condition: AchievementCondition,
    input: {
      event?: GameEvent;
      runSummary?: AchievementRunSummary;
      context: AchievementEvaluationContext;
    },
  ): boolean {
    switch (condition.type) {
      case 'eventType':
        return input.event?.type === condition.eventType;
      case 'counterAtLeast':
        return this.readCounter(condition.counterKey, input) >= condition.value;
      case 'runResult':
        return this.readRunResult(input) === condition.resultType;
      case 'endlessSurvivalTimeAtLeast':
        return this.readNumber('endlessSurvivalTime', input) >= condition.value;
      case 'killCountAtLeast':
        return this.readNumber('killCount', input) >= condition.value;
      case 'treasureOpenCountAtLeast':
        return this.readNumber('treasureOpenCount', input) >= condition.value;
      case 'weaponEvolutionCountAtLeast':
        return this.readNumber('evolutionCount', input) >= condition.value;
      case 'characterEquals':
        return input.context.characterId === condition.characterId;
      case 'stageEquals':
        return input.context.stageId === condition.stageId;
      default:
        return false;
    }
  }

  private readRunResult(input: {
    event?: GameEvent;
    runSummary?: AchievementRunSummary;
  }): string | undefined {
    if (input.runSummary) {
      return input.runSummary.resultType;
    }

    return this.readPayloadString(input.event?.payload, 'resultType');
  }

  private readCounter(
    counterKey: string,
    input: {
      event?: GameEvent;
      runSummary?: AchievementRunSummary;
    },
  ): number {
    return this.readNumber(counterKey, input);
  }

  private readNumber(
    key: string,
    input: {
      event?: GameEvent;
      runSummary?: AchievementRunSummary;
    },
  ): number {
    if (input.runSummary && key in input.runSummary) {
      return Number(input.runSummary[key as keyof AchievementRunSummary]) || 0;
    }

    return this.readPayloadNumber(input.event?.payload, key);
  }

  private readPayloadNumber(payload: unknown, key: string): number {
    if (typeof payload !== 'object' || payload === null || !(key in payload)) {
      return 0;
    }

    const value = (payload as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : 0;
  }

  private readPayloadString(payload: unknown, key: string): string | undefined {
    if (typeof payload !== 'object' || payload === null || !(key in payload)) {
      return undefined;
    }

    const value = (payload as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
}
