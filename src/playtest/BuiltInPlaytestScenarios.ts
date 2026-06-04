import { PlaytestScenario } from './PlaytestScenario';

export const BUILT_IN_PLAYTEST_SCENARIOS: readonly PlaytestScenario[] = [
  {
    id: 'default_normal_20',
    name: 'Default Normal 20',
    description: 'Default character, stage, and map with standard auto-test settings.',
    runs: 20,
    selection: {
      characterId: 'default',
      stageId: 'stage_001',
      mapId: 'prototype_field',
      difficultyId: 'normal',
      seedMode: 'random',
    },
    settings: {
      autoMovement: true,
      autoUpgrade: true,
      fastMode: true,
      endlessMode: false,
    },
  },
  {
    id: 'default_endless_20',
    name: 'Default Endless 20',
    description: 'Default content with Endless Mode enabled.',
    runs: 20,
    selection: {
      characterId: 'default',
      stageId: 'stage_001',
      mapId: 'prototype_field',
      difficultyId: 'normal',
      seedMode: 'random',
    },
    settings: {
      autoMovement: true,
      autoUpgrade: true,
      fastMode: true,
      endlessMode: true,
    },
  },
  {
    id: 'default_normal_fixed_seed_5',
    name: 'Default Normal Fixed Seed 5',
    description: 'Small deterministic smoke scenario for seed-sensitive debugging.',
    runs: 5,
    selection: {
      characterId: 'default',
      stageId: 'stage_001',
      mapId: 'prototype_field',
      difficultyId: 'normal',
      seedMode: 'fixed',
      seed: 'default-normal-smoke',
    },
    settings: {
      autoMovement: true,
      autoUpgrade: true,
      fastMode: true,
      endlessMode: false,
    },
  },
];

export function getBuiltInPlaytestScenario(id: string): PlaytestScenario | undefined {
  const scenario = BUILT_IN_PLAYTEST_SCENARIOS.find((item) => item.id === id);

  return scenario
    ? JSON.parse(JSON.stringify(scenario)) as PlaytestScenario
    : undefined;
}

