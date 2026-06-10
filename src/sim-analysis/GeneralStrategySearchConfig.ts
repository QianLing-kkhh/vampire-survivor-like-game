import type { StrategySearchPhase } from './StrategyPhaseMetrics';

export type GeneralStrategyMode = 'phased';
export type GeneralStrategyMutationMode = 'uniform' | 'gaussian';

export interface GeneralStrategySearchConfig {
  schemaVersion: 1;
  generatedAt: string;
  scenarioCount: number;
  candidates: number;
  rounds: number;
  seedCount: number;
  durationSeconds: number;
  tickMs: number;
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
