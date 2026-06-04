import { GameEventType } from '../events/GameEventType';

import { AchievementReward } from './AchievementReward';

export type AchievementId = string;

export type AchievementTriggerType =
  | 'event'
  | 'runEnd'
  | 'counter'
  | 'milestone';

export type AchievementCategory =
  | 'progression'
  | 'combat'
  | 'boss'
  | 'endless'
  | 'collection'
  | 'challenge'
  | 'tutorial'
  | string;

export type AchievementCondition =
  | {
    type: 'eventType';
    eventType: GameEventType | string;
  }
  | {
    type: 'counterAtLeast';
    counterKey: string;
    value: number;
  }
  | {
    type: 'runResult';
    resultType: 'gameOver' | 'victory';
  }
  | {
    type: 'endlessSurvivalTimeAtLeast';
    value: number;
  }
  | {
    type: 'killCountAtLeast';
    value: number;
  }
  | {
    type: 'treasureOpenCountAtLeast';
    value: number;
  }
  | {
    type: 'weaponEvolutionCountAtLeast';
    value: number;
  }
  | {
    type: 'characterEquals';
    characterId: string;
  }
  | {
    type: 'stageEquals';
    stageId: string;
  };

export interface AchievementDefinition {
  id: AchievementId;
  nameKey: string;
  descriptionKey: string;
  hidden?: boolean;
  repeatable?: boolean;
  triggerType: AchievementTriggerType;
  conditions: AchievementCondition[];
  rewards?: AchievementReward[];
  category?: AchievementCategory;
}
