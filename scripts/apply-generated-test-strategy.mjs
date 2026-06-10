import fs from 'node:fs';
import path from 'node:path';

import {
  getArg,
  loadHeadlessSimulationRuntime,
  parseArgs,
  rootDir,
  stableStringify,
} from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const source = getArg(args, ['source'], undefined);

if (!source) {
  throw new Error('--source is required.');
}

const runtime = loadHeadlessSimulationRuntime();
const sourcePath = path.resolve(rootDir, String(source));
const sourceDoc = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const outputPath = path.join(rootDir, 'src', 'strategy', 'generated', 'generated-test-strategy.json');
const document = runtime.createGeneratedTestStrategyDocument({
  source: sourceDoc,
  sourceReportDir: path.dirname(sourcePath),
  appliedAt: new Date().toISOString(),
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${stablePrettyJson(document)}\n`);

console.log(`Generated test strategy applied: ${outputPath}`);
console.log('generated_test is for headless auto testing only.');

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:apply-generated-strategy -- --source reports/sim-general-search/<timestamp>/best-general-strategy.json

Options:
  --source  Path to best-general-strategy.json
  --help    Show this help
`);
}
