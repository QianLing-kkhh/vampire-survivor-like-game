import type { SimulationContentBundle } from '../core-sim/SimulationContent';

import type {
  GeneralStrategyScenario,
  GeneralStrategyScenarioSample,
  GeneralStrategySearchConfig,
} from './GeneralStrategySearchConfig';

class GeneralSearchRandom {
  private state: number;

  constructor(seed: string) {
    this.state = GeneralSearchRandom.hashSeed(seed);
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;

    return this.state / 0x100000000;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  private static hashSeed(seed: string): number {
    let hash = 2166136261;

    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0 || 1;
  }
}

export function sampleGeneralStrategyScenarios(input: {
  config: GeneralStrategySearchConfig;
  content?: SimulationContentBundle;
}): GeneralStrategyScenarioSample {
  const warnings: string[] = [];
  const characterIds = resolveIds({
    raw: input.config.characterId,
    available: Object.keys(input.content?.characters ?? {}).sort(),
    fallback: ['default'],
    label: 'characterId',
    warnings,
  });
  const stageIds = resolveIds({
    raw: input.config.stageId,
    available: Object.keys(input.content?.stages ?? {}).sort(),
    fallback: ['stage_001'],
    label: 'stageId',
    warnings,
  });
  const mapIds = resolveIds({
    raw: input.config.mapId,
    available: Object.keys(input.content?.maps ?? {}).sort(),
    fallback: ['prototype_field'],
    label: 'mapId',
    warnings,
  });
  const difficultyIds = resolveIds({
    raw: input.config.difficultyId,
    available: Object.keys(input.content?.difficulties ?? {}).sort(),
    fallback: ['normal'],
    label: 'difficultyId',
    warnings,
  });
  const random = new GeneralSearchRandom(input.config.randomSeed);
  const scenarios: GeneralStrategyScenario[] = [];
  let scenarioIndex = 1;

  for (let coordinateIndex = 0; coordinateIndex < input.config.scenarioCount; coordinateIndex += 1) {
    const stageId = random.pick(stageIds);
    const mapId = chooseMapId(stageId, mapIds, input.content, random, warnings);
    const characterId = random.pick(characterIds);
    const difficultyId = random.pick(difficultyIds);

    for (let seedIndex = 0; seedIndex < input.config.seedCount; seedIndex += 1) {
      scenarios.push({
        scenarioId: `scenario_${String(scenarioIndex).padStart(3, '0')}`,
        characterId,
        stageId,
        mapId,
        difficultyId,
        seed: `${input.config.randomSeed}-general-${String(coordinateIndex + 1).padStart(3, '0')}-${String(seedIndex + 1).padStart(3, '0')}`,
      });
      scenarioIndex += 1;
    }
  }

  return {
    scenarios,
    warnings: unique(warnings),
    source: {
      characterIds,
      stageIds,
      mapIds,
      difficultyIds,
    },
  };
}

function resolveIds(input: {
  raw: string;
  available: string[];
  fallback: string[];
  label: string;
  warnings: string[];
}): string[] {
  const requested = splitCsv(input.raw);

  if (requested.includes('random')) {
    if (input.available.length > 0) {
      return input.available;
    }

    input.warnings.push(`No ${input.label} list was available in content; using fallback ${input.fallback.join(',')}.`);
    return input.fallback;
  }

  const filtered = requested.filter(Boolean);

  if (filtered.length > 0) {
    return filtered;
  }

  if (input.available.length > 0) {
    return input.available;
  }

  input.warnings.push(`No ${input.label} input or content list was available; using fallback ${input.fallback.join(',')}.`);
  return input.fallback;
}

function chooseMapId(
  stageId: string,
  mapIds: readonly string[],
  content: SimulationContentBundle | undefined,
  random: GeneralSearchRandom,
  warnings: string[],
): string {
  const stageMapId = content?.stages[stageId]?.mapId;

  if (stageMapId && mapIds.includes(stageMapId)) {
    return stageMapId;
  }

  if (stageMapId && mapIds.length === 1 && mapIds[0] === 'prototype_field' && stageMapId !== mapIds[0]) {
    warnings.push(`Stage "${stageId}" uses map "${stageMapId}", overriding fallback map "${mapIds[0]}".`);
    return stageMapId;
  }

  if (stageMapId && !mapIds.includes(stageMapId)) {
    warnings.push(`Map list does not include stage "${stageId}" map "${stageMapId}"; sampled from provided map list.`);
  }

  return random.pick(mapIds);
}

function splitCsv(value: string): string[] {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}
