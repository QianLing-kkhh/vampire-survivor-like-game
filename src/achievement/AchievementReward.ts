export type AchievementRewardType =
  | 'unlockCharacter'
  | 'unlockStage'
  | 'unlockMap'
  | 'unlockCosmetic'
  | 'currency'
  | 'none';

export interface AchievementReward {
  type: AchievementRewardType;
  targetId?: string;
  amount?: number;
}
