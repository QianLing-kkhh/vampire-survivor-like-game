import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

import type { StrategySearchPhase } from './StrategyPhaseMetrics';
import type {
  RecommendedPhasedStrategy,
} from './StrategyWeightSearch';
import type {
  StrategyPhasedEvaluationSuiteReport,
  StrategyWeightSearchConfig,
} from './StrategyWeightSearchReport';

export interface StrategyOptimizationAnalyzerConfig {
  schemaVersion: 1;
  generatedAt: string;
  inputDir: string;
  outputDir: string;
  minRuns: number;
  phases?: StrategySearchPhase[];
  topN: number;
  includePattern?: string;
  excludePattern?: string;
}

export interface StrategyOptimizationSummarySnapshot {
  schemaVersion: 1;
  generatedAt?: string;
  optimize?: {
    rounds?: number;
    initialMutationRadius?: number;
    mutationDecay?: number;
    centerStrategyMode?: string;
    carryForwardTop?: number;
  };
  rounds?: Array<{
    round: number;
    outputDir: string;
    searchMode: string;
    centerStrategyId?: string;
    mutationRadius?: number;
    bestStrategyId: string;
    bestGenerationMethod?: string;
    avgScore?: number;
    vsBaselineDelta?: number;
    improvedOverPrevious?: boolean;
  }>;
  bestStrategyId?: string;
  bestRound?: number;
  bestVsBaselineDelta?: number;
  bestAvgScore?: number;
}

export interface StrategyOptimizationRoundSnapshot {
  round: number;
  outputDir: string;
  config?: StrategyWeightSearchConfig;
  phasedEvaluation?: StrategyPhasedEvaluationSuiteReport;
}

export interface StrategyOptimizationInput {
  optimizationDir: string;
  summary: StrategyOptimizationSummarySnapshot;
  bestStrategy: RecommendedPhasedStrategy;
  rounds: StrategyOptimizationRoundSnapshot[];
}

export interface StrategyOptimizationSkippedEntry {
  optimizationDir: string;
  reason: string;
}

export interface StrategyOptimizationIndexEntry {
  optimizationDir: string;
  createdAt: string;
  phaseList: string[];
  rounds: number;
  bestStrategyId: string;
  bestAvgScore: number;
  bestVsBaselineDelta: number;
  beatsBaseline: boolean;
  mutationSettings: {
    initialMutationRadius?: number;
    mutationDecay?: number;
    centerStrategyMode?: string;
    carryForwardTop?: number;
  };
  candidates?: number;
  seedCount?: number;
  durationSeconds?: number;
  tickMs?: number;
}

export type StableWeightStabilityLabel = 'stable-high' | 'stable-low' | 'unstable' | 'neutral';

export interface StableWeightDistributionEntry {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  fieldPath: string;
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p10: number;
  p90: number;
  sampleCount: number;
  stabilityLabel: StableWeightStabilityLabel;
}

export interface VariantWinRateEntry {
  strategyVariantId: string;
  wins: number;
  winRate: number;
  avgScore: number;
  avgVsBaselineDelta: number;
  beatBaselineRate: number;
}

export interface BaselinePerformanceReport {
  totalOptimizations: number;
  beatBaselineCount: number;
  beatBaselineRate: number;
  avgVsBaselineDelta: number;
  medianVsBaselineDelta: number;
  bestVsBaselineDelta: number;
  worstVsBaselineDelta: number;
}

export interface StablePhasedStrategyPhase {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  profile: AutoStrategyProfile;
}

export interface StablePhasedStrategyDraft {
  version: 1;
  id: string;
  name: 'Stable Phased Strategy';
  sourceOptimizationCount: number;
  sourceDirs: string[];
  phases: StablePhasedStrategyPhase[];
}

export interface StrategyOptimizationAnalysisReport {
  schemaVersion: 1;
  config: StrategyOptimizationAnalyzerConfig;
  optimizationIndex: StrategyOptimizationIndexEntry[];
  stableWeightDistribution: StableWeightDistributionEntry[];
  variantWinRate: VariantWinRateEntry[];
  baselinePerformance: BaselinePerformanceReport;
  stablePhasedStrategy: StablePhasedStrategyDraft;
  skipped: StrategyOptimizationSkippedEntry[];
  warnings: string[];
}
