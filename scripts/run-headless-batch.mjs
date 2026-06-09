import { parseArgs, runSimulationBatchFromArgs, writeHeadlessArtifacts, stableStringify, resultToCsvRow, batchCsvHeader } from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const format = String(args.format ?? 'jsonl').toLowerCase();
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

if (args.out) {
  writeHeadlessArtifacts(args.out, {
    matrix,
    results,
    commandArgs: process.argv.slice(2),
  });
}
