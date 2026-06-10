import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../strategy/profile/AutoStrategyDefaults';

import type { SimulationContentBundle, SimulationVersionInfo } from './SimulationContent';

export interface SimulationConfig {
  seed: string;
  presetId?: string;
  runIndex: number;
  matrixKey: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  strategyProfileId: string;
  strategyProfile: AutoStrategyProfile;
  strategyProfileHash?: string;
  phasedStrategy?: SimulationPhasedStrategyConfig;
  durationMs: number;
  deltaMs: number;
  content?: SimulationContentBundle;
  versionInfo?: SimulationVersionInfo;
  worldBounds: {
    width: number;
    height: number;
  };
}

export interface SimulationPhasedStrategyConfig {
  phases: Array<{
    startSeconds: number;
    endSeconds: number;
    profile: AutoStrategyProfile;
  }>;
}

export type SimulationConfigInput = Partial<Omit<SimulationConfig, 'strategyProfile' | 'worldBounds'>> & {
  strategyProfile?: AutoStrategyProfile;
  worldBounds?: Partial<SimulationConfig['worldBounds']>;
};

export function createSimulationConfig(input: SimulationConfigInput = {}): SimulationConfig {
  const map = input.content?.maps[input.mapId ?? 'prototype_field'];

  return {
    seed: input.seed ?? 'headless-test-001',
    presetId: input.presetId,
    runIndex: input.runIndex ?? 1,
    matrixKey: input.matrixKey ?? 'single',
    characterId: input.characterId ?? 'priest',
    stageId: input.stageId ?? 'stage_001',
    mapId: input.mapId ?? 'prototype_field',
    difficultyId: input.difficultyId ?? 'normal',
    strategyProfileId: input.strategyProfileId ?? DEFAULT_AUTO_STRATEGY_PROFILE.id,
    strategyProfile: input.strategyProfile ?? DEFAULT_AUTO_STRATEGY_PROFILE,
    strategyProfileHash: input.strategyProfileHash,
    phasedStrategy: input.phasedStrategy,
    durationMs: input.durationMs ?? 300000,
    deltaMs: input.deltaMs ?? 100,
    content: input.content,
    versionInfo: input.versionInfo,
    worldBounds: {
      width: input.worldBounds?.width ?? map?.worldWidth ?? 1600,
      height: input.worldBounds?.height ?? map?.worldHeight ?? 900,
    },
  };
}
