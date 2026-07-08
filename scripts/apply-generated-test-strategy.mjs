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
const allowLowerFidelity = String(getArg(args, ['allowLowerFidelity'], 'false')).toLowerCase() === 'true';

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
assertSourceFidelityAllowed(sourceDoc, existingDocument, allowLowerFidelity);
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

function assertSourceFidelityAllowed(sourceDoc, existingDocument, allowLowerFidelity) {
  if (allowLowerFidelity || !existingDocument?.searchConfig || !sourceDoc?.searchConfig) {
    return;
  }

  const sourceConfig = sourceDoc.searchConfig;
  const existingConfig = existingDocument.searchConfig;
  const reasons = [];
  const sourceObjectiveRank = objectiveRank(sourceConfig.objective);
  const existingObjectiveRank = objectiveRank(existingConfig.objective);
  const sourceSampleCount = sampleCount(sourceConfig);
  const existingSampleCount = sampleCount(existingConfig);

  if (sourceObjectiveRank < existingObjectiveRank) {
    reasons.push(`objective ${sourceConfig.objective ?? 'unknown'} < ${existingConfig.objective ?? 'unknown'}`);
  }

  if (numberValue(sourceConfig.durationSeconds) < numberValue(existingConfig.durationSeconds)) {
    reasons.push(`durationSeconds ${sourceConfig.durationSeconds} < ${existingConfig.durationSeconds}`);
  }

  if (sourceSampleCount < existingSampleCount) {
    reasons.push(`sampleCount ${sourceSampleCount} < ${existingSampleCount}`);
  }

  if (numberValue(sourceConfig.minBossKillRate) < numberValue(existingConfig.minBossKillRate)) {
    reasons.push(`minBossKillRate ${sourceConfig.minBossKillRate ?? 0} < ${existingConfig.minBossKillRate ?? 0}`);
  }

  if (numberValue(sourceConfig.minP10Exp) < numberValue(existingConfig.minP10Exp)) {
    reasons.push(`minP10Exp ${sourceConfig.minP10Exp ?? 0} < ${existingConfig.minP10Exp ?? 0}`);
  }

  if (numberValue(sourceConfig.maxEarlyCollapseRate) > numberValue(existingConfig.maxEarlyCollapseRate)) {
    reasons.push(`maxEarlyCollapseRate ${sourceConfig.maxEarlyCollapseRate ?? 1} > ${existingConfig.maxEarlyCollapseRate ?? 1}`);
  }

  if (bossGateRank(sourceConfig) < bossGateRank(existingConfig)) {
    reasons.push('boss gate strictness was weakened');
  }

  if (reasons.length === 0) {
    return;
  }

  throw new Error(`Refusing to apply lower-fidelity generated strategy source: ${reasons.join('; ')}. Re-run with --allowLowerFidelity true to override intentionally.`);
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

function objectiveRank(objective) {
  switch (objective) {
    case 'full':
      return 3;
    case 'boss':
      return 2;
    case 'growth':
      return 1;
    default:
      return 0;
  }
}

function sampleCount(config) {
  return numberValue(config?.scenarioCount) * Math.max(1, numberValue(config?.seedCount));
}

function bossGateRank(config) {
  if (config?.strictBossKillGate) {
    return 2;
  }

  if (config?.fallbackBelowBossKillRate === false) {
    return 1;
  }

  return 0;
}

function numberValue(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:apply-generated-strategy -- --source reports/sim-general-search/<timestamp>/best-general-strategy.json

Options:
  --source               Path to best-general-strategy.json
  --allowLowerFidelity   Set true to intentionally apply a lower-fidelity source than the existing generated_test
  --help                 Show this help
`);
}
