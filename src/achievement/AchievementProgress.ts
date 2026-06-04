export interface AchievementProgress {
  achievementId: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressValue?: number;
  targetValue?: number;
  seen?: boolean;
  repeatCount?: number;
}
