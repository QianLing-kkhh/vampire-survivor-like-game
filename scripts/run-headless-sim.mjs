import {
  parseArgs,
  runSimulationFromArgs,
  writeHeadlessArtifacts,
  createMatrixFromArgs,
} from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const result = runSimulationFromArgs(args);
const out = args.out;

if (out) {
  writeHeadlessArtifacts(out, {
    matrix: createMatrixFromArgs(args),
    results: [result],
    commandArgs: process.argv.slice(2),
  });
}

console.log(JSON.stringify(result, null, 2));
