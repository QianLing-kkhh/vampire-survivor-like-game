import type {
  StableWeightDistributionEntry,
  StrategyOptimizationAnalysisReport,
  StrategyOptimizationAnalyzerConfig,
  StrategyOptimizationSkippedEntry,
} from './StrategyOptimizationAnalysisReport';

export type StrategyPatternId =
  | 'early-farm'
  | 'evolution-rush'
  | 'survival'
  | 'boss-preparation'
  | 'balanced-transition';

export interface StrategyPatternDiscoveryConfig extends StrategyOptimizationAnalyzerConfig {
  minConfidence: number;
}

export interface StrategyPatternScore {
  patternId: StrategyPatternId;
  name: string;
  score: number;
  confidence: number;
  positiveEvidence: string[];
  negativeEvidence: string[];
}

export interface StrategyPhasePatternDiscovery {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  primaryPatternId: StrategyPatternId;
  primaryPatternName: string;
  confidence: number;
  scores: StrategyPatternScore[];
  stableHighFields: StableWeightDistributionEntry[];
  stableLowFields: StableWeightDistributionEntry[];
  unstableFields: StableWeightDistributionEntry[];
}

export interface StrategyStateMachineRule {
  stateId: string;
  name: string;
  patternId: StrategyPatternId;
  phaseIds: string[];
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  entryConditions: string[];
  exitConditions: string[];
  recommendedFocus: string[];
  evidenceFields: Array<{
    fieldPath: string;
    median: number;
    avg: number;
    stdDev: number;
    stabilityLabel: string;
  }>;
}

export interface StrategyPatternDiscoveryReport {
  schemaVersion: 1;
  config: StrategyPatternDiscoveryConfig;
  sourceOptimizationAnalysis: StrategyOptimizationAnalysisReport;
  phasePatterns: StrategyPhasePatternDiscovery[];
  suggestedStateMachine: {
    version: 1;
    id: string;
    name: 'Discovered Strategy State Machine';
    sourceOptimizationCount: number;
    states: StrategyStateMachineRule[];
    transitions: Array<{
      from: string;
      to: string;
      condition: string;
    }>;
  };
  skipped: StrategyOptimizationSkippedEntry[];
  warnings: string[];
}
