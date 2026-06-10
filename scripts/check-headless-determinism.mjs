import fs from 'node:fs';
import path from 'node:path';

import {
  parseArgs,
  runSimulationFromArgs,
  runSimulationBatchFromArgs,
  writeHeadlessArtifacts,
  readAggregateFromPath,
  writeCompareArtifacts,
  loadHeadlessSimulationRuntime,
  stableStringify,
  rootDir,
} from './headless-sim-runtime.mjs';

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

const smoke = runSimulationBatchFromArgs({ preset: 'smoke' });
const smokeOut = '.tmp/headless-runs/validate-smoke';
const artifact = writeHeadlessArtifacts(smokeOut, {
  matrix: smoke.matrix,
  results: smoke.results,
  commandArgs: ['--preset', 'smoke'],
});
const aggregate = readAggregateFromPath(smokeOut);
const runtime = loadHeadlessSimulationRuntime();
const compare = runtime.compareSimulationAggregates(
  aggregate,
  aggregate,
  runtime.createThresholdPolicy('smoke'),
);
const compareOut = path.join('.tmp', 'headless-runs', 'validate-smoke-compare');

writeCompareArtifacts(compareOut, compare);

const requiredFiles = [
  'manifest.json',
  'run-results.jsonl',
  'run-results.csv',
  'aggregate.json',
  'aggregate.md',
];

for (const file of requiredFiles) {
  const fullPath = path.join(artifact.outDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[validate:sim] Missing artifact ${fullPath}`);
    process.exit(1);
  }
}

if (compare.status === 'fail') {
  console.error('[validate:sim] Smoke self-compare failed.');
  console.error(stableStringify(compare));
  process.exit(1);
}

console.info('[validate:sim] Headless simulation determinism passed.');
console.info(`[validate:sim] Smoke preset produced ${smoke.results.length} runs at ${path.join(rootDir, smokeOut)}.`);
console.info(JSON.stringify(results[0], null, 2));
