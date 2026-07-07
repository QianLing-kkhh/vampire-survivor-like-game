import type { RunSummary } from '../run/RunSummary';
import type { RunMetadata } from '../run/RunMetadata';

import type { SimTracePoint } from './SimulationState';

export interface SimulationResult extends RunSummary {
  seed: string;
  presetId?: string;
  runIndex: number;
  matrixKey: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyProfileId: string;
  strategyProfileHash: string;
  leaderboardKey: string;
  metadata: RunMetadata;
  schemaVersions: {
    csv: number;
    save: number;
    replay: number;
    customStage: number;
  };
  durationSeconds: number;
  tickMs: number;
  bossDamageDealt: number;
  bossKilled: boolean;
  endlessStarted: boolean;
  endlessScalingLevel: number;
  trace?: SimTracePoint[];
}
