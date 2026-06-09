import type { RunSummary } from '../run/RunSummary';

export interface SimulationResult extends RunSummary {
  seed: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyProfileId: string;
  strategyProfileHash: string;
  durationSeconds: number;
  tickMs: number;
}
