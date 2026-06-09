import {
  batchCsvHeader,
  getArg,
  parseArgs,
  resultToCsvRow,
  runSimulationFromArgs,
} from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const strategyProfileIds = String(getArg(args, ['strategyProfileId', 'strategy'], 'balanced_default'))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const seedCount = Math.max(1, Math.floor(Number(getArg(args, ['seedCount'], 10))));
const seedPrefix = String(getArg(args, ['seedPrefix'], 'headless-seed'));
const format = String(getArg(args, ['format'], 'jsonl')).toLowerCase();
const results = [];

for (const strategyProfileId of strategyProfileIds) {
  for (let index = 1; index <= seedCount; index += 1) {
    const seed = `${seedPrefix}-${String(index).padStart(3, '0')}`;
    const result = runSimulationFromArgs(args, {
      seed,
      strategyProfileId,
    });

    results.push(result);
  }
}

if (format === 'csv') {
  console.log(batchCsvHeader);

  for (const result of results) {
    console.log(resultToCsvRow(result));
  }
} else {
  for (const result of results) {
    console.log(JSON.stringify(result));
  }
}
