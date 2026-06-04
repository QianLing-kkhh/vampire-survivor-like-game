import { MutatorConfig } from '../rules/MutatorConfig';

export type PlaytestScenarioSeedMode = 'random' | 'fixed' | 'sequence';

export interface PlaytestScenario {
  id: string;
  name: string;
  description?: string;
  runs: number;
  selection: {
    characterId?: string;
    stageId?: string;
    mapId?: string;
    difficultyId?: string;
    customStageId?: string;
    challengeId?: string;
    seedMode?: PlaytestScenarioSeedMode;
    seed?: string;
  };
  settings: {
    autoMovement: boolean;
    autoUpgrade: boolean;
    fastMode: boolean;
    endlessMode: boolean;
  };
  mutators?: MutatorConfig[];
}

export interface PlaytestScenarioRunConfig {
  scenarioId: string;
  scenarioRunIndex: number;
  scenarioTotalRuns: number;
  selection: PlaytestScenario['selection'];
  settings: PlaytestScenario['settings'];
  mutators: readonly MutatorConfig[];
}

