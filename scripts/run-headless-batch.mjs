import { parseArgs, runSimulationBatchFromArgs, writeHeadlessArtifacts, stableStringify, resultToCsvRow, batchCsvHeader, getArg } from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const format = String(args.format ?? 'jsonl').toLowerCase();
const quiet = String(args.quiet ?? 'false').toLowerCase() === 'true';
const artifactOut = getArg(args, ['out', 'outputDir'], undefined);
const { matrix, results } = runSimulationBatchFromArgs(args);

if (!quiet && format === 'summary') {
  console.log('seed,result,survivalTimeSeconds,level,score,kills,damageTaken,bossDamageDealt');

  for (const result of results) {
    console.log([
      result.seed,
      result.result,
      result.survivalTimeSeconds,
      result.level,
      result.score,
      result.kills,
      result.damageTaken,
      result.bossDamageDealt,
    ].join(','));
  }
} else if (!quiet && format === 'csv') {
  console.log(batchCsvHeader);

  for (const result of results) {
    console.log(resultToCsvRow(result));
  }
} else if (!quiet) {
  for (const result of results) {
    console.log(stableStringify(result));
  }
}

if (artifactOut) {
  writeHeadlessArtifacts(artifactOut, {
    matrix,
    results,
    commandArgs: process.argv.slice(2),
  });
}
