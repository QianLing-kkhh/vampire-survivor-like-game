import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import type { SimulationResult } from '../core-sim/SimulationResult';

import type { GeneralStrategyScenario, GeneralStrategySearchConfig } from './GeneralStrategySearchConfig';

export interface GeneralStrategyRunRecord {
  candidateId: string;
  strategyVariantId: string;
  strategyProfileHash: string;
  round: number;
  scenario: GeneralStrategyScenario;
  result: Pick<
    SimulationResult,
    | 'result'
    | 'score'
    | 'survivalTimeSeconds'
    | 'durationSeconds'
    | 'level'
    | 'kills'
    | 'exp'
    | 'damageTaken'
    | 'damageDealt'
    | 'bossDamageDealt'
    | 'pickupsCollected'
    | 'enemiesSpawned'
    | 'bossKilled'
  >;
  damageWindow: GeneralStrategyDamageWindowMetrics;
}

export interface GeneralStrategyDamageWindowMetrics {
  windowSeconds: 30;
  maxDamageRatioLimit: 0.15;
  passed: boolean;
  violationCount: number;
  maxWindowDamage: number;
  maxWindowDamageRatio: number;
  totalExcessDamage: number;
  totalExcessDamageRatio: number;
}

export interface GeneralStrategyCandidateStats {
  candidateId: string;
  strategyVariantId: string;
  strategyProfileHash: string;
  runs: number;
  scenarioCount: number;
  avgScore: number;
  medianScore: number;
  p10Score: number;
  p90Score: number;
  minScore: number;
  maxScore: number;
  avgSurvivalTimeSeconds: number;
  earlyGrowthCollapseRate: number;
  completionRate: number;
  avgLevel: number;
  avgKills: number;
  bossKillRate: number;
  avgExp: number;
  medianExp: number;
  p10Exp: number;
  p90Exp: number;
  expStdDev: number;
  avgDamageDealt: number;
  medianDamageDealt: number;
  p10DamageDealt: number;
  p90DamageDealt: number;
  avgBossDamageDealt: number;
  medianBossDamageDealt: number;
  p10BossDamageDealt: number;
  p90BossDamageDealt: number;
  avgDamageTaken: number;
  damageWindowPassRate: number;
  avgDamageWindowViolationCount: number;
  avgMaxDamageWindowRatio: number;
  damageSafetyPenalty: number;
  damageDealtStdDev: number;
  scoreStdDev: number;
  consistencyScore: number;
  generalFitnessScore: number;
}

export interface GeneralStrategyPhase {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  profile: AutoStrategyProfile;
}

export interface GeneratedGeneralStrategy {
  version: 1;
  id: string;
  name: 'Generated General Strategy';
  source: 'headless-general-search';
  simulationKind: 'core-sim-simplified';
  createdAt: string;
  searchConfig: GeneralStrategySearchConfig;
  generalFitnessScore: number;
  stats: GeneralStrategyCandidateStats;
  phases: GeneralStrategyPhase[];
}

export interface GeneralStrategyRoundSummary {
  round: number;
  searchMode: 'random' | 'centered';
  mutationRadius?: number;
  candidateCount: number;
  evaluatedStrategyCount: number;
  bestCandidateId: string;
  bestVariantId: string;
  bestGeneralFitnessScore: number;
}

export interface GeneralStrategyBaselineComparisonEntry {
  strategyId: string;
  avgScore: number;
  medianScore: number;
  p10Score: number;
  completionRate: number;
  avgSurvivalTimeSeconds: number;
  earlyGrowthCollapseRate: number;
  bossKillRate: number;
  avgExp: number;
  medianExp: number;
  p10Exp: number;
  avgDamageDealt: number;
  medianDamageDealt: number;
  p10DamageDealt: number;
  avgBossDamageDealt: number;
  medianBossDamageDealt: number;
  p10BossDamageDealt: number;
  avgDamageTaken: number;
  damageWindowPassRate: number;
  damageSafetyPenalty: number;
  generalFitnessScore: number;
  deltaVsBalancedDefault: number;
  deltaPctVsBalancedDefault: number;
}

export interface GeneralStrategySearchReport {
  schemaVersion: 1;
  config: GeneralStrategySearchConfig;
  scenarios: GeneralStrategyScenario[];
  candidateRuns: GeneralStrategyRunRecord[];
  candidateAggregate: GeneralStrategyCandidateStats[];
  roundSummary: GeneralStrategyRoundSummary[];
  bestGeneralStrategy: GeneratedGeneralStrategy;
  baselineComparison: GeneralStrategyBaselineComparisonEntry[];
  warnings: string[];
}
