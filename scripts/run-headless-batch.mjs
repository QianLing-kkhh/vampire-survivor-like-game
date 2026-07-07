import { parseArgs, runSimulationBatchFromArgs, writeHeadlessArtifacts, stableStringify, resultToCsvRow, batchCsvHeader, getArg } from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const format = String(args.format ?? 'jsonl').toLowerCase();
const artifactOut = getArg(args, ['out', 'outputDir'], undefined);
const { matrix, results } = runSimulationBatchFromArgs(args);

if (format === 'csv') {
  console.log(batchCsvHeader);

  for (const result of results) {
    console.log(resultToCsvRow(result));
  }
} else {
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
