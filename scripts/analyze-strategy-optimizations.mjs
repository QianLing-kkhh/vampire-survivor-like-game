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

const runtime = loadHeadlessSimulationRuntime();
const config = createAnalysisConfig(args);
const { optimizations, skipped } = loadOptimizationInputs(config);
const report = runtime.analyzeStrategyOptimizations({
  config,
  optimizations,
  skipped,
});

const outputDir = path.resolve(rootDir, config.outputDir);
writeAnalysisArtifacts(outputDir, report);

if (optimizations.length === 0) {
  console.log(`No strategy optimization directories found under ${path.resolve(rootDir, config.inputDir)}.`);
  console.log(`Empty analysis report written to ${outputDir}.`);
  process.exit(0);
}

console.log(`Strategy optimization analysis complete: ${outputDir}`);
console.log(`optimizations analyzed: ${optimizations.length}`);
console.log(`beat baseline rate: ${report.baselinePerformance.beatBaselineRate}`);

function createAnalysisConfig(parsedArgs) {
  const generatedAt = new Date().toISOString();
  const inputDir = String(getArg(parsedArgs, ['input'], path.join('reports', 'sim-search')));
  const outputDir = String(getArg(
    parsedArgs,
    ['outputDir', 'out'],
    path.join('reports', 'sim-analysis', formatTimestampForPath(generatedAt)),
  ));
  const phaseText = getArg(parsedArgs, ['phase'], undefined);

  return {
    schemaVersion: 1,
    generatedAt,
    inputDir,
    outputDir,
    minRuns: positiveIntegerArg(parsedArgs, 'minRuns', 1),
    phases: phaseText ? runtime.parseStrategyPhases(String(phaseText)) : undefined,
    topN: positiveIntegerArg(parsedArgs, 'topN', 10),
    includePattern: getArg(parsedArgs, ['includePattern'], '*_optimization'),
    excludePattern: getArg(parsedArgs, ['excludePattern'], undefined),
  };
}

function loadOptimizationInputs(analysisConfig) {
  const inputDir = path.resolve(rootDir, analysisConfig.inputDir);
  const skipped = [];

  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    return {
      optimizations: [],
      skipped: [{
        optimizationDir: inputDir,
        reason: 'input directory does not exist',
      }],
    };
  }

  const optimizationDirs = fs.readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(inputDir, entry.name))
    .filter((dir) => matchesDirectoryFilter(dir, inputDir, analysisConfig))
    .sort((a, b) => a.localeCompare(b));
  const optimizations = [];

  for (const optimizationDir of optimizationDirs) {
    const loaded = loadOptimizationInput(optimizationDir);

    if ('skipped' in loaded) {
      skipped.push(loaded.skipped);
    } else {
      optimizations.push(loaded.optimization);
    }
  }

  return { optimizations, skipped };
}

function loadOptimizationInput(optimizationDir) {
  const summaryPath = path.join(optimizationDir, 'optimization-summary.json');
  const bestStrategyPath = path.join(optimizationDir, 'best-phased-strategy.json');

  if (!fs.existsSync(summaryPath)) {
    return {
      skipped: {
        optimizationDir,
        reason: 'missing optimization-summary.json',
      },
    };
  }

  if (!fs.existsSync(bestStrategyPath)) {
    return {
      skipped: {
        optimizationDir,
        reason: 'missing best-phased-strategy.json',
      },
    };
  }

  try {
    const summary = readJson(summaryPath);
    const bestStrategy = readJson(bestStrategyPath);

    if (!bestStrategy?.phases || !Array.isArray(bestStrategy.phases)) {
      return {
        skipped: {
          optimizationDir,
          reason: 'best-phased-strategy.json does not contain phases',
        },
      };
    }

    return {
      optimization: {
        optimizationDir,
        summary,
        bestStrategy,
        rounds: loadRoundSnapshots(optimizationDir, summary),
      },
    };
  } catch (error) {
    return {
      skipped: {
        optimizationDir,
        reason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function loadRoundSnapshots(optimizationDir, summary) {
  return (summary.rounds ?? []).map((round) => {
    const roundDir = resolveRoundDir(optimizationDir, round);
    const configPath = path.join(roundDir, 'config.json');
    const evaluationPath = path.join(roundDir, 'phased-evaluation.json');

    return {
      round: round.round,
      outputDir: roundDir,
      config: fs.existsSync(configPath) ? readJson(configPath) : undefined,
      phasedEvaluation: fs.existsSync(evaluationPath) ? readJson(evaluationPath) : undefined,
    };
  });
}

function resolveRoundDir(optimizationDir, round) {
  const candidates = [
    round.outputDir ? path.resolve(rootDir, round.outputDir) : undefined,
    round.outputDir ? path.join(path.dirname(optimizationDir), path.basename(round.outputDir)) : undefined,
    path.join(path.dirname(optimizationDir), `${path.basename(optimizationDir).replace(/_optimization$/, '')}_round-${round.round}`),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[candidates.length - 1];
}

function matchesDirectoryFilter(dir, inputDir, analysisConfig) {
  const basename = path.basename(dir);
  const relative = normalizePath(path.relative(inputDir, dir));
  const full = normalizePath(dir);
  const includePattern = analysisConfig.includePattern ?? '*_optimization';

  if (!matchesPatternSet([basename, relative, full], includePattern)) {
    return false;
  }

  return !analysisConfig.excludePattern
    || !matchesPatternSet([basename, relative, full], analysisConfig.excludePattern);
}

function matchesPatternSet(values, patternText) {
  return String(patternText)
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .some((pattern) => {
      const regex = globLikePatternToRegex(normalizePath(pattern));

      return values.some((value) => regex.test(normalizePath(value)));
    });
}

function globLikePatternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${escaped}$`, 'i');
}

function writeAnalysisArtifacts(outputDir, report) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'optimization-index.json'), `${stablePrettyJson(report.optimizationIndex)}\n`);
  fs.writeFileSync(path.join(outputDir, 'stable-weight-distribution.json'), `${stablePrettyJson(report.stableWeightDistribution)}\n`);
  fs.writeFileSync(path.join(outputDir, 'variant-win-rate.json'), `${stablePrettyJson(report.variantWinRate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'baseline-performance.json'), `${stablePrettyJson(report.baselinePerformance)}\n`);
  fs.writeFileSync(path.join(outputDir, 'stable-phased-strategy.json'), `${stablePrettyJson(report.stablePhasedStrategy)}\n`);
  fs.writeFileSync(path.join(outputDir, 'stable-phased-strategy.md'), runtime.stablePhasedStrategyMarkdown({
    strategy: report.stablePhasedStrategy,
    distribution: report.stableWeightDistribution,
  }));
  fs.writeFileSync(path.join(outputDir, 'analysis-summary.md'), runtime.analysisSummaryMarkdown(report));
  fs.writeFileSync(path.join(outputDir, 'config.json'), `${stablePrettyJson(report.config)}\n`);
  fs.writeFileSync(path.join(outputDir, 'skipped.json'), `${stablePrettyJson(report.skipped)}\n`);
}

function positiveIntegerArg(parsedArgs, name, fallback) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function formatTimestampForPath(timestamp) {
  return timestamp.replace(/[:.]/g, '-');
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:analyze-optimizations -- --input reports/sim-search --minRuns 3

Options:
  --input           Directory containing *_optimization reports. Default: reports/sim-search
  --outputDir       Analysis output directory. Default: reports/sim-analysis/<timestamp>
  --minRuns         Minimum expected optimization count. Default: 1
  --phase           Optional comma-separated phase filter, e.g. 0-30,30-60
  --topN            Reserved report display limit. Default: 10
  --includePattern  Glob-like directory include pattern. Default: *_optimization
  --excludePattern  Glob-like directory exclude pattern
  --help            Show this help
`);
}
