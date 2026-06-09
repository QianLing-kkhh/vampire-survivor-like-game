import { parseArgs, runSimulationFromArgs } from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const result = runSimulationFromArgs(args);

console.log(JSON.stringify(result, null, 2));
