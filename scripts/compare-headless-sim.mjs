import {
  getArg,
  parseArgs,
  readAggregateFromPath,
  writeCompareArtifacts,
  loadHeadlessSimulationRuntime,
} from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const currentPath = getArg(args, ['current'], undefined);
const baselinePath = getArg(args, ['baseline'], undefined);

if (!currentPath || !baselinePath) {
  console.error('Usage: npm.cmd run simulate:compare -- --current <dir-or-aggregate.json> --baseline <dir-or-aggregate.json> [--threshold regression] [--out <dir>]');
  process.exit(2);
}

const runtime = loadHeadlessSimulationRuntime();
const policy = runtime.createThresholdPolicy(String(getArg(args, ['threshold'], 'regression')));
const report = runtime.compareSimulationAggregates(
  readAggregateFromPath(baselinePath),
  readAggregateFromPath(currentPath),
  policy,
);
const out = getArg(args, ['out'], undefined);

if (out) {
  writeCompareArtifacts(out, report);
}

console.log(runtime.compareToMarkdown(report));

if (report.status === 'fail') {
  process.exit(1);
}
