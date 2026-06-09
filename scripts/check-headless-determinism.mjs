import { parseArgs, runSimulationFromArgs } from './headless-sim-runtime.mjs';

const args = {
  seed: 'determinism-001',
  characterId: 'priest',
  stageId: 'stage_001',
  mapId: 'prototype_field',
  difficultyId: 'normal',
  strategyProfileId: 'balanced_default',
  durationSeconds: '90',
  tickMs: '100',
  ...parseArgs(process.argv.slice(2)),
};
const results = [
  runSimulationFromArgs(args),
  runSimulationFromArgs(args),
  runSimulationFromArgs(args),
];
const stable = results.map((result) => stableStringify(result));
const baseline = stable[0];
const failedIndex = stable.findIndex((value) => value !== baseline);

if (failedIndex >= 0) {
  console.error('[validate:sim] Headless simulation determinism failed.');
  console.error(`[validate:sim] Run 1: ${baseline}`);
  console.error(`[validate:sim] Run ${failedIndex + 1}: ${stable[failedIndex]}`);
  process.exit(1);
}

console.info('[validate:sim] Headless simulation determinism passed.');
console.info(JSON.stringify(results[0], null, 2));

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value;
  const keys = Object.keys(record).sort();

  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
