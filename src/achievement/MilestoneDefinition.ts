import { AchievementReward } from './AchievementReward';

export interface MilestoneDefinition {
  id: string;
  nameKey: string;
  counterKey: string;
  thresholds: number[];
  rewards?: AchievementReward[];
}
