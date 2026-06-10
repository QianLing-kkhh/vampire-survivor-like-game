import fs from 'node:fs';
import path from 'node:path';

import {
  getArg,
  loadHeadlessSimulationRuntime,
  loadSimulationContent,
  loadSimulationVersionInfo,
  parseArgs,
  rootDir,
  runSimulationFromInput,
  stableStringify,
} from './headless-sim-runtime.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const runtime = loadHeadlessSimulationRuntime();
const content = loadSimulationContent();
const versionInfo = loadSimulationVersionInfo();
const config = createSearchConfig(args);
const scenarioSample = runtime.sampleGeneralStrategyScenarios({ config, content });
const report = executeGeneralSearch(config, scenarioSample);
const outputDir = path.resolve(rootDir, config.outputDir);

writeGeneralSearchArtifacts(outputDir, report);

console.log(`General strategy search complete: ${outputDir}`);
console.log(`best strategy: ${report.bestGeneralStrategy.id}`);
console.log(`general fitness: ${report.bestGeneralStrategy.generalFitnessScore}`);

function executeGeneralSearch(searchConfig, scenarioSampleInput) {
  const warnings = [...scenarioSampleInput.warnings];
  const allRuns = [];
  const allAggregates = [];
  const roundSummary = [];
  const strategyById = new Map();
  let centerStrategy;
  let mutationRadius = searchConfig.initialMutationRadius;
  let bestOverall;

  for (let round = 1; round <= searchConfig.rounds; round += 1) {
    const searchMode = centerStrategy ? 'centered' : 'random';
    const strategies = createRoundStrategies(searchConfig, round, centerStrategy, mutationRadius);
    const candidateRuns = evaluateStrategies(strategies, scenarioSampleInput.scenarios, round);
    const candidateAggregate = runtime.aggregateGeneralStrategyRuns(candidateRuns);
    const rankedStrategies = candidateAggregate
      .map((stats) => strategyById.get(stats.candidateId) ?? strategies.find((strategy) => strategy.candidateId === stats.candidateId))
      .filter(Boolean);
    const variants = runtime.createGeneralStrategyVariants({
      config: searchConfig,
      rankedCandidates: rankedStrategies,
    });
    const variantRuns = evaluateStrategies(variants, scenarioSampleInput.scenarios, round);
    const variantAggregate = runtime.aggregateGeneralStrategyRuns(variantRuns);
    const roundAggregates = [...candidateAggregate, ...variantAggregate].sort((a, b) => (
      b.generalFitnessScore - a.generalFitnessScore
      || b.avgScore - a.avgScore
      || a.candidateId.localeCompare(b.candidateId)
    ));
    const bestRoundStats = roundAggregates[0];
    const bestRoundStrategy = [...strategies, ...variants].find((strategy) => strategy.candidateId === bestRoundStats.candidateId);

    for (const strategy of [...strategies, ...variants]) {
      strategyById.set(strategy.candidateId, strategy);
    }

    allRuns.push(...candidateRuns, ...variantRuns);
    allAggregates.push(...roundAggregates);

    roundSummary.push({
      round,
      searchMode,
      mutationRadius: searchMode === 'centered' ? mutationRadius : undefined,
      candidateCount: strategies.length,
      evaluatedStrategyCount: strategies.length + variants.length,
      bestCandidateId: bestRoundStats.candidateId,
      bestVariantId: bestRoundStats.strategyVariantId,
      bestGeneralFitnessScore: bestRoundStats.generalFitnessScore,
    });

    if (!bestOverall || bestRoundStats.generalFitnessScore > bestOverall.stats.generalFitnessScore) {
      bestOverall = {
        stats: bestRoundStats,
        strategy: bestRoundStrategy,
      };
    }

    centerStrategy = bestRoundStrategy?.phasedStrategy;

    if (searchMode === 'centered') {
      mutationRadius = Number((mutationRadius * searchConfig.mutationDecay).toFixed(6));
    }
  }

  if (!bestOverall?.strategy) {
    throw new Error('No general strategy candidate was evaluated.');
  }

  const bestGeneralStrategy = runtime.createGeneratedGeneralStrategy({
    config: searchConfig,
    strategy: bestOverall.strategy,
    stats: bestOverall.stats,
  });
  const baselineRuns = evaluateBaselineStrategies(searchConfig, scenarioSampleInput.scenarios, bestOverall.strategy);
  const baselineStats = runtime.aggregateGeneralStrategyRuns(baselineRuns);
  const baselineComparison = runtime.createBaselineComparison(baselineStats);

  return {
    schemaVersion: 1,
    config: searchConfig,
    scenarios: scenarioSampleInput.scenarios,
    candidateRuns: allRuns,
    candidateAggregate: allAggregates.sort((a, b) => (
      b.generalFitnessScore - a.generalFitnessScore
      || b.avgScore - a.avgScore
      || a.candidateId.localeCompare(b.candidateId)
    )),
    roundSummary,
    bestGeneralStrategy,
    baselineComparison,
    warnings,
  };
}

function createRoundStrategies(searchConfig, round, centerStrategy, mutationRadius) {
  if (centerStrategy) {
    return runtime.generateCenteredStrategyWeightCandidates({
      count: searchConfig.candidates,
      randomSeed: `${searchConfig.randomSeed}-round-${round}`,
      centerStrategy,
      mutationRadius,
      mutationMode: searchConfig.mutationMode,
    }).map((candidate) => strategyDefinitionFromCandidate(searchConfig, candidate, 'centered-phased'));
  }

  return runtime.generateStrategyWeightCandidates({
    count: searchConfig.candidates,
    randomSeed: `${searchConfig.randomSeed}-round-${round}`,
    baseProfile: runtime.profiles.balanced_default,
  }).map((candidate) => runtime.createGeneralStrategyFromProfile({
    candidateId: candidate.candidateId,
    strategyVariantId: 'random-phased',
    profile: candidate.profile,
    config: searchConfig,
  }));
}

function strategyDefinitionFromCandidate(searchConfig, candidate, fallbackVariantId) {
  if (candidate.phasedStrategy) {
    return {
      candidateId: candidate.candidateId,
      strategyVariantId: candidate.phasedStrategy.generationMethod ?? fallbackVariantId,
      strategyProfileHash: candidate.strategyProfileHash,
      profile: candidate.profile,
      phasedStrategy: {
        version: 1,
        id: candidate.candidateId,
        name: candidate.phasedStrategy.name,
        generationMethod: candidate.phasedStrategy.generationMethod ?? fallbackVariantId,
        phases: candidate.phasedStrategy.phases,
      },
    };
  }

  return runtime.createGeneralStrategyFromProfile({
    candidateId: candidate.candidateId,
    strategyVariantId: fallbackVariantId,
    profile: candidate.profile,
    config: searchConfig,
  });
}

function evaluateStrategies(strategies, scenarios, round) {
  const records = [];
  let runIndex = 1;

  for (const strategy of strategies) {
    for (const scenario of scenarios) {
      const result = runSimulationFromInput({
        seed: scenario.seed,
        runIndex,
        matrixKey: [
          strategy.candidateId,
          scenario.scenarioId,
          scenario.seed,
          scenario.characterId,
          scenario.stageId,
          scenario.mapId,
          scenario.difficultyId,
          config.durationSeconds,
          config.tickMs,
        ].join('|'),
        strategyProfileId: strategy.candidateId,
        strategyProfile: strategy.profile,
        strategyProfileHash: strategy.strategyProfileHash,
        phasedStrategy: {
          phases: strategy.phasedStrategy.phases,
        },
        characterId: scenario.characterId,
        stageId: scenario.stageId,
        mapId: scenario.mapId,
        difficultyId: scenario.difficultyId,
        durationMs: config.durationSeconds * 1000,
        deltaMs: config.tickMs,
        content,
        versionInfo,
      });
      const damageWindow = runtime.calculateDamageWindowMetrics({
        damageTaken: result.damageTaken,
        durationSeconds: result.durationSeconds,
        survivalTimeSeconds: result.survivalTimeSeconds,
        trace: result.trace,
      });

      records.push({
        candidateId: strategy.candidateId,
        strategyVariantId: strategy.strategyVariantId,
        strategyProfileHash: strategy.strategyProfileHash,
        round,
        scenario,
        result: {
          result: result.result,
          score: result.score,
          survivalTimeSeconds: result.survivalTimeSeconds,
          durationSeconds: result.durationSeconds,
          level: result.level,
          kills: result.kills,
          damageTaken: result.damageTaken,
          damageDealt: result.damageDealt,
          pickupsCollected: result.pickupsCollected,
          enemiesSpawned: result.enemiesSpawned,
        },
        damageWindow,
      });
      runIndex += 1;
    }
  }

  return records;
}

function evaluateBaselineStrategies(searchConfig, scenarios, bestStrategy) {
  const baselines = [
    runtime.createGeneralStrategyFromProfile({
      candidateId: 'balanced_default',
      strategyVariantId: 'baseline',
      profile: runtime.profiles.balanced_default,
      config: searchConfig,
    }),
    runtime.createGeneralStrategyFromProfile({
      candidateId: 'playtest_baseline',
      strategyVariantId: 'baseline',
      profile: runtime.profiles.playtest_baseline,
      config: searchConfig,
    }),
    {
      ...bestStrategy,
      candidateId: 'best_general_strategy',
      strategyVariantId: 'best-general',
    },
  ];
  const generated = loadExistingGeneratedTestStrategy(searchConfig);

  if (generated) {
    baselines.push(generated);
  }

  return evaluateStrategies(baselines, scenarios, 0);
}

function loadExistingGeneratedTestStrategy(searchConfig) {
  const generated = runtime.loadGeneratedTestStrategyIfRequested?.();

  if (!generated) {
    return undefined;
  }

  const hash = runtime.hashStableValue('fnv1a', generated);

  return {
    candidateId: 'generated_test',
    strategyVariantId: 'existing-generated-test',
    strategyProfileHash: hash,
    profile: generated.phases[0].profile,
    phasedStrategy: {
      version: 1,
      id: 'generated_test',
      name: generated.name ?? 'Generated Test Strategy',
      generationMethod: 'existing-generated-test',
      phases: generated.phases,
    },
  };
}

function writeGeneralSearchArtifacts(outputDir, report) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'config.json'), `${stablePrettyJson(report.config)}\n`);
  fs.writeFileSync(path.join(outputDir, 'scenario-sample.json'), `${stablePrettyJson(report.scenarios)}\n`);
  fs.writeFileSync(path.join(outputDir, 'candidate-runs.jsonl'), `${report.candidateRuns.map((run) => stableStringify(run)).join('\n')}\n`);
  fs.writeFileSync(path.join(outputDir, 'candidate-aggregate.json'), `${stablePrettyJson(report.candidateAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'candidate-aggregate.csv'), `${runtime.generalStrategyAggregateCsv(report.candidateAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'round-summary.json'), `${stablePrettyJson(report.roundSummary)}\n`);
  fs.writeFileSync(path.join(outputDir, 'round-summary.md'), runtime.roundSummaryMarkdown(report.roundSummary));
  fs.writeFileSync(path.join(outputDir, 'best-general-strategy.json'), `${stablePrettyJson(report.bestGeneralStrategy)}\n`);
  fs.writeFileSync(path.join(outputDir, 'best-general-strategy.md'), runtime.bestGeneralStrategyMarkdown({
    strategy: report.bestGeneralStrategy,
    balancedStats: report.baselineComparison.find((stats) => stats.strategyId === 'balanced_default'),
    scenarioCount: report.scenarios.length,
  }));
  fs.writeFileSync(path.join(outputDir, 'baseline-comparison.json'), `${stablePrettyJson(report.baselineComparison)}\n`);
  fs.writeFileSync(path.join(outputDir, 'baseline-comparison.md'), runtime.baselineComparisonMarkdown(report.baselineComparison));
  fs.writeFileSync(path.join(outputDir, 'warnings.json'), `${stablePrettyJson(report.warnings)}\n`);
}

function createSearchConfig(parsedArgs) {
  const generatedAt = new Date().toISOString();
  const outputDir = String(getArg(
    parsedArgs,
    ['outputDir', 'out'],
    path.join('reports', 'sim-general-search', formatTimestampForPath(generatedAt)),
  ));
  const mutationMode = String(getArg(parsedArgs, ['mutationMode'], 'gaussian')).toLowerCase();

  if (mutationMode !== 'uniform' && mutationMode !== 'gaussian') {
    throw new Error('--mutationMode must be uniform or gaussian.');
  }

  return {
    schemaVersion: 1,
    generatedAt,
    scenarioCount: positiveIntegerArg(parsedArgs, 'scenarioCount', 30),
    candidates: positiveIntegerArg(parsedArgs, 'candidates', 200),
    rounds: positiveIntegerArg(parsedArgs, 'rounds', 3),
    seedCount: positiveIntegerArg(parsedArgs, 'seedCount', 5),
    durationSeconds: positiveNumberArg(parsedArgs, 'durationSeconds', 120),
    tickMs: positiveIntegerArg(parsedArgs, 'tickMs', 50),
    topN: positiveIntegerArg(parsedArgs, 'topN', 10),
    randomSeed: String(getArg(parsedArgs, ['randomSeed'], 'general-strategy-001')),
    phases: runtime.parseStrategyPhases(String(getArg(parsedArgs, ['phase'], '0-30,30-60,60-120'))),
    characterId: String(getArg(parsedArgs, ['characterId'], 'random')),
    stageId: String(getArg(parsedArgs, ['stageId'], 'random')),
    mapId: String(getArg(parsedArgs, ['mapId'], 'random')),
    difficultyId: String(getArg(parsedArgs, ['difficultyId'], 'random')),
    strategyMode: String(getArg(parsedArgs, ['strategyMode'], 'phased')),
    initialMutationRadius: nonNegativeNumberArg(parsedArgs, 'initialMutationRadius', 15),
    mutationDecay: positiveNumberArg(parsedArgs, 'mutationDecay', 0.65),
    mutationMode,
    outputDir,
  };
}

function positiveIntegerArg(parsedArgs, name, fallback) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return value;
}

function positiveNumberArg(parsedArgs, name, fallback) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be a positive number.`);
  }

  return value;
}

function nonNegativeNumberArg(parsedArgs, name, fallback) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative number.`);
  }

  return value;
}

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function formatTimestampForPath(timestamp) {
  return timestamp.replace(/[:.]/g, '-');
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:search-general -- --scenarioCount 50 --candidates 300 --rounds 4 --seedCount 5 --durationSeconds 120 --topN 10

Options:
  --scenarioCount          Random scenario coordinate count
  --candidates             Candidate strategies per round
  --rounds                 Search rounds
  --seedCount              Seeds per sampled coordinate
  --durationSeconds        Simulation duration
  --tickMs                 Fixed tick size
  --topN                   Top candidate count for topN-median variant
  --randomSeed             Deterministic random seed
  --phase                  Phase ranges, e.g. 0-30,30-60,60-120
  --characterId            random or comma-separated ids
  --stageId                random or comma-separated ids
  --mapId                  random or comma-separated ids
  --difficultyId           random or comma-separated ids
  --strategyMode           phased
  --initialMutationRadius  Local search initial mutation radius
  --mutationDecay          Radius decay per centered round
  --mutationMode           uniform or gaussian
  --outputDir              Artifact output directory
  --help                   Show this help
`);
}
