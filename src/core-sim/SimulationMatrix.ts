import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

import type { SimulationConfigInput } from './SimulationConfig';
import type { SimulationContentBundle } from './SimulationContent';
import { hashStableValue } from './StableJson';

export type HeadlessPresetId = 'smoke' | 'strategy-quick' | 'balance-quick' | 'regression';

export interface SimulationStageMapPair {
  stageId: string;
  mapId: string;
}

export interface SimulationMatrixConfig {
  presetId?: string;
  seeds: string[];
  strategyProfileIds: string[];
  characters: string[];
  stageMaps: SimulationStageMapPair[];
  difficulties: string[];
  durationsSeconds: number[];
  tickMs: number[];
}

export interface SimulationRunInput extends SimulationConfigInput {
  runIndex: number;
  matrixKey: string;
  presetId?: string;
  strategyProfileId: string;
  strategyProfile: AutoStrategyProfile;
  strategyProfileHash: string;
}

export interface StrategyProfileCatalog {
  [profileId: string]: AutoStrategyProfile;
}

export interface StrategyPhasedCatalog {
  [profileId: string]: SimulationConfigInput['phasedStrategy'];
}

export function createPresetMatrix(
  presetId: HeadlessPresetId,
  content: SimulationContentBundle,
): SimulationMatrixConfig {
  const stageMaps = listStageMapPairs(content);
  const characters = Object.keys(content.characters).sort();
  const strategies = ['balanced_default', 'playtest_baseline'];

  if (presetId === 'smoke') {
    return {
      presetId,
      seeds: ['smoke-001', 'smoke-002'],
      strategyProfileIds: ['balanced_default'],
      characters: ['default', 'priest'].filter((id) => content.characters[id]),
      stageMaps: stageMaps.slice(0, 1),
      difficulties: ['normal'],
      durationsSeconds: [60],
      tickMs: [100],
    };
  }

  if (presetId === 'strategy-quick') {
    return {
      presetId,
      seeds: createSequentialSeeds('strategy', 5),
      strategyProfileIds: strategies,
      characters: ['priest'].filter((id) => content.characters[id]),
      stageMaps: stageMaps.slice(0, 1),
      difficulties: ['normal'],
      durationsSeconds: [120],
      tickMs: [100],
    };
  }

  if (presetId === 'balance-quick') {
    return {
      presetId,
      seeds: createSequentialSeeds('balance', 4),
      strategyProfileIds: ['balanced_default'],
      characters,
      stageMaps,
      difficulties: ['normal', 'hard'],
      durationsSeconds: [180],
      tickMs: [100],
    };
  }

  return {
    presetId,
    seeds: createSequentialSeeds('regression', 8),
    strategyProfileIds: strategies,
    characters,
    stageMaps,
    difficulties: ['easy', 'normal', 'hard'],
    durationsSeconds: [300],
    tickMs: [100],
  };
}

export function createMatrixFromSingleRun(input: {
  seed: string;
  strategyProfileId: string;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  durationSeconds: number;
  tickMs: number;
  presetId?: string;
}): SimulationMatrixConfig {
  return {
    presetId: input.presetId,
    seeds: [input.seed],
    strategyProfileIds: [input.strategyProfileId],
    characters: [input.characterId],
    stageMaps: [{ stageId: input.stageId, mapId: input.mapId }],
    difficulties: [input.difficultyId],
    durationsSeconds: [input.durationSeconds],
    tickMs: [input.tickMs],
  };
}

export function expandSimulationMatrix(
  matrix: SimulationMatrixConfig,
  profiles: StrategyProfileCatalog,
  content: SimulationContentBundle,
  phasedStrategies: StrategyPhasedCatalog = {},
): SimulationRunInput[] {
  validateMatrix(matrix, profiles, content);

  const runs: SimulationRunInput[] = [];

  for (const seed of matrix.seeds) {
    for (const strategyProfileId of matrix.strategyProfileIds) {
      for (const characterId of matrix.characters) {
        for (const stageMap of matrix.stageMaps) {
          for (const difficultyId of matrix.difficulties) {
            for (const durationSeconds of matrix.durationsSeconds) {
              for (const tickMs of matrix.tickMs) {
                const strategyProfile = profiles[strategyProfileId];
                const matrixKey = [
                  strategyProfileId,
                  seed,
                  characterId,
                  stageMap.stageId,
                  stageMap.mapId,
                  difficultyId,
                  durationSeconds,
                  tickMs,
                ].join('|');

                runs.push({
                  presetId: matrix.presetId,
                  runIndex: runs.length + 1,
                  matrixKey,
                  seed,
                  strategyProfileId,
                  strategyProfile,
                  strategyProfileHash: hashStableValue('fnv1a', strategyProfile),
                  phasedStrategy: phasedStrategies[strategyProfileId],
                  characterId,
                  stageId: stageMap.stageId,
                  mapId: stageMap.mapId,
                  difficultyId,
                  durationMs: durationSeconds * 1000,
                  deltaMs: tickMs,
                });
              }
            }
          }
        }
      }
    }
  }

  return runs;
}

export function validateMatrix(
  matrix: SimulationMatrixConfig,
  profiles: StrategyProfileCatalog,
  content: SimulationContentBundle,
): void {
  const matrixHashKeys = new Set<string>();

  assertNonEmpty('seeds', matrix.seeds);
  assertNonEmpty('strategyProfileIds', matrix.strategyProfileIds);
  assertNonEmpty('characters', matrix.characters);
  assertNonEmpty('stageMaps', matrix.stageMaps);
  assertNonEmpty('difficulties', matrix.difficulties);
  assertNonEmpty('durationsSeconds', matrix.durationsSeconds);
  assertNonEmpty('tickMs', matrix.tickMs);

  for (const id of matrix.strategyProfileIds) {
    if (!profiles[id]) {
      throw new Error(`Unknown strategy profile "${id}".`);
    }
  }

  for (const id of matrix.characters) {
    if (!content.characters[id]) {
      throw new Error(`Unknown character "${id}".`);
    }
  }

  for (const pair of matrix.stageMaps) {
    const stage = content.stages[pair.stageId];

    if (!stage) {
      throw new Error(`Unknown stage "${pair.stageId}".`);
    }

    if (!content.maps[pair.mapId]) {
      throw new Error(`Unknown map "${pair.mapId}".`);
    }

    if (stage.mapId !== pair.mapId) {
      throw new Error(`Stage/map mismatch: stage "${pair.stageId}" uses "${stage.mapId}", not "${pair.mapId}".`);
    }
  }

  for (const id of matrix.difficulties) {
    if (!content.difficulties[id]) {
      throw new Error(`Unknown difficulty "${id}".`);
    }
  }

  for (const durationSeconds of matrix.durationsSeconds) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`Invalid durationSeconds "${durationSeconds}".`);
    }
  }

  for (const tickMs of matrix.tickMs) {
    if (!Number.isFinite(tickMs) || tickMs < 16) {
      throw new Error(`Invalid tickMs "${tickMs}".`);
    }
  }

  for (const seed of matrix.seeds) {
    for (const strategyProfileId of matrix.strategyProfileIds) {
      for (const characterId of matrix.characters) {
        for (const stageMap of matrix.stageMaps) {
          const key = [
            seed,
            strategyProfileId,
            characterId,
            stageMap.stageId,
            stageMap.mapId,
            matrix.difficulties.join(','),
            matrix.durationsSeconds.join(','),
            matrix.tickMs.join(','),
          ].join('|');
          if (matrixHashKeys.has(key)) {
            throw new Error(`Duplicate matrix coordinate "${key}".`);
          }
          matrixHashKeys.add(key);
        }
      }
    }
  }
}

export function listStageMapPairs(content: SimulationContentBundle): SimulationStageMapPair[] {
  return Object.values(content.stages)
    .map((stage) => ({ stageId: stage.id, mapId: stage.mapId }));
}

function createSequentialSeeds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`);
}

function assertNonEmpty(name: string, value: readonly unknown[]): void {
  if (value.length === 0) {
    throw new Error(`Matrix field "${name}" must not be empty.`);
  }
}
