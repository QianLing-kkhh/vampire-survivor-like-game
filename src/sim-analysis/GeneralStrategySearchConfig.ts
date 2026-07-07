import type { StrategySearchPhase } from './StrategyPhaseMetrics';

export type GeneralStrategyMode = 'phased';
export type GeneralStrategyMutationMode = 'uniform' | 'gaussian';
export type GeneralStrategySearchObjective = 'growth' | 'boss' | 'full';

export interface GeneralStrategySearchConfig {
  schemaVersion: 1;
  generatedAt: string;
  scenarioCount: number;
  candidates: number;
  rounds: number;
  seedCount: number;
  durationSeconds: number;
  tickMs: number;
  objective: GeneralStrategySearchObjective;
  minBossKillRate: number;
  minP10Exp?: number;
  maxEarlyCollapseRate?: number;
  strictBossKillGate?: boolean;
  fallbackBelowBossKillRate?: boolean;
  topN: number;
  randomSeed: string;
  phases: StrategySearchPhase[];
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyMode: GeneralStrategyMode;
  initialMutationRadius: number;
  mutationDecay: number;
  mutationMode: GeneralStrategyMutationMode;
  optimizeLayer?: string;
  optimizeWeights?: string[];
  optimizePhases?: string[];
  controlBaseStrategy?: string;
  outputDir: string;
}

export interface GeneralStrategyScenario {
  scenarioId: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  seed: string;
}

export interface GeneralStrategyScenarioSample {
  scenarios: GeneralStrategyScenario[];
  warnings: string[];
  source: {
    characterIds: string[];
    stageIds: string[];
    mapIds: string[];
    difficultyIds: string[];
  };
}
