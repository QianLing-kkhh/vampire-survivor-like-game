export type UnlockConditionType =
  | 'achievementUnlocked'
  | 'milestoneReached'
  | 'runCompleted'
  | 'endlessSurvivalTime'
  | 'killCount'
  | 'custom';

export interface UnlockCondition {
  type: UnlockConditionType;
  targetId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}
