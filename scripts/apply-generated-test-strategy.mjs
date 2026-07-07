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
const existingDocument = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : undefined;
let document = runtime.createGeneratedTestStrategyDocument({
  source: sourceDoc,
  sourceReportDir: path.dirname(sourcePath),
  appliedAt: new Date().toISOString(),
});
document = mergePreservedPhases(document, existingDocument, sourceDoc);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${stablePrettyJson(document)}\n`);

console.log(`Generated test strategy applied: ${outputPath}`);
console.log('generated_test is for headless auto testing only.');

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function mergePreservedPhases(document, existingDocument, sourceDoc) {
  const optimizedPhaseIds = new Set(sourceDoc?.searchConfig?.optimizePhases ?? []);

  if (
    optimizedPhaseIds.size === 0
    || !Array.isArray(document?.phases)
    || !Array.isArray(existingDocument?.phases)
  ) {
    return document;
  }

  const optimizedPhases = document.phases.filter((phase) => (
    optimizedPhaseIds.has(phase.phaseId)
    || optimizedPhaseIds.has(`${phase.startSeconds}-${phase.endSeconds}`)
  ));

  if (optimizedPhases.length === 0) {
    return document;
  }

  const preservedPhases = existingDocument.phases.filter((phase) => (
    !optimizedPhases.some((optimizedPhase) => phasesOverlap(phase, optimizedPhase))
  ));
  const phases = [...optimizedPhases, ...preservedPhases]
    .sort((a, b) => a.startSeconds - b.startSeconds || a.endSeconds - b.endSeconds);

  return {
    ...document,
    phases,
    metadata: {
      ...document.metadata,
      preservedPhaseIds: preservedPhases.map((phase) => phase.phaseId),
    },
  };
}

function phasesOverlap(left, right) {
  return left.startSeconds < right.endSeconds && right.startSeconds < left.endSeconds;
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:apply-generated-strategy -- --source reports/sim-general-search/<timestamp>/best-general-strategy.json

Options:
  --source  Path to best-general-strategy.json
  --help    Show this help
`);
}
