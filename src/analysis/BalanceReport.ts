export interface SchemaGroupSummary {
  key: string;
  csvSchemaVersion: string;
  contentHash: string;
  runCount: number;
}

export interface VictoryMetrics {
  totalRuns: number;
  victoryCount: number;
  gameOverCount: number;
  victoryRate: number;
}

export interface BossMetrics {
  bossSpawnRate: number | null;
  bossKillRate: number | null;
  bossDashHitRate: number | null;
  averageBossPhaseDamage: number | null;
}

export interface EndlessMetrics {
  endlessStartedRate: number | null;
  averageEndlessSurvivalTime: number | null;
  maxEndlessSurvivalTime: number | null;
  averageEndlessRewardCount: number | null;
  averageEndlessLevelIntervalSeconds: number | null;
  rewardBreakdown: Record<string, number>;
}

export interface TreasureMetrics {
  averageTreasureDrops: number | null;
  averageTreasureOpens: number | null;
  averageEndlessTreasureDrops: number | null;
  averageEndlessTreasureOpens: number | null;
}

export interface WeaponMetric {
  weaponId: string;
  totalDamage: number;
  damageShare: number;
}

export interface BalanceReport {
  totalRuns: number;
  schemaGroups: SchemaGroupSummary[];
  victory: VictoryMetrics;
  averageSurvivalTime: number | null;
  deathTimeBuckets: Record<string, number>;
  averageFinalLevel: number | null;
  averageKillCount: number | null;
  evolutionRate: number | null;
  boss: BossMetrics;
  endless: EndlessMetrics;
  treasure: TreasureMetrics;
  weapons: WeaponMetric[];
  warnings: string[];
  suggestedChecks: string[];
}
