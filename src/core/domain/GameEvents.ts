import {
  EnemyKilledEvent,
  isEnemyKilledEvent,
} from './EnemyTypes';

export interface ExpGainedEvent {
  amount: number;
  currentExp: number;
  totalExp: number;
}

export interface LevelUpEvent {
  previousLevel: number;
  currentLevel: number;
  requiredExp: number;
}

export type GameEventMap = Record<string, unknown> & {
  EnemyKilled: EnemyKilledEvent;
  ExpGained: ExpGainedEvent;
  LevelUp: LevelUpEvent;
};

export { isEnemyKilledEvent };

export function isExpGainedEvent(value: unknown): value is ExpGainedEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<ExpGainedEvent>;

  return (
    typeof event.amount === 'number'
    && typeof event.currentExp === 'number'
    && typeof event.totalExp === 'number'
  );
}

export function isLevelUpEvent(value: unknown): value is LevelUpEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<LevelUpEvent>;

  return (
    typeof event.previousLevel === 'number'
    && typeof event.currentLevel === 'number'
    && typeof event.requiredExp === 'number'
  );
}
