import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../strategy/profile/AutoStrategyDefaults';

export interface SimulationConfig {
  seed: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyProfileId: string;
  strategyProfile: AutoStrategyProfile;
  strategyProfileHash?: string;
  durationMs: number;
  deltaMs: number;
  worldBounds: {
    width: number;
    height: number;
  };
}

export type SimulationConfigInput = Partial<Omit<SimulationConfig, 'strategyProfile' | 'worldBounds'>> & {
  strategyProfile?: AutoStrategyProfile;
  worldBounds?: Partial<SimulationConfig['worldBounds']>;
};

export function createSimulationConfig(input: SimulationConfigInput = {}): SimulationConfig {
  return {
    seed: input.seed ?? 'headless-test-001',
    characterId: input.characterId ?? 'priest',
    stageId: input.stageId ?? 'stage_001',
    mapId: input.mapId ?? 'prototype_field',
    difficultyId: input.difficultyId ?? 'normal',
    strategyProfileId: input.strategyProfileId ?? DEFAULT_AUTO_STRATEGY_PROFILE.id,
    strategyProfile: input.strategyProfile ?? DEFAULT_AUTO_STRATEGY_PROFILE,
    strategyProfileHash: input.strategyProfileHash,
    durationMs: input.durationMs ?? 300000,
    deltaMs: input.deltaMs ?? 100,
    worldBounds: {
      width: input.worldBounds?.width ?? 1600,
      height: input.worldBounds?.height ?? 900,
    },
  };
}
