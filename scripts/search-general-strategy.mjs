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
const scenarioSample = createScenarioSample(config, content, args);
const report = executeGeneralSearch(config, scenarioSample);
const outputDir = path.resolve(rootDir, config.outputDir);

writeGeneralSearchArtifacts(outputDir, report);

console.log(`General strategy search complete: ${outputDir}`);
console.log(`best strategy: ${report.bestGeneralStrategy.id}`);
console.log(`fitness: ${report.bestGeneralStrategy.generalFitnessScore}`);
console.log(`boss kill rate: ${report.bestGeneralStrategy.stats.bossKillRate}`);
if (report.bestGeneralStrategy.stats.bossKillRate < report.config.minBossKillRate) {
  console.log(`boss kill target not met: ${report.bestGeneralStrategy.stats.bossKillRate} < ${report.config.minBossKillRate}`);
}
if (report.bestGeneralStrategy.stats.p10Exp < report.config.minP10Exp) {
  console.log(`p10 exp target not met: ${report.bestGeneralStrategy.stats.p10Exp} < ${report.config.minP10Exp}`);
}
if (report.bestGeneralStrategy.stats.earlyGrowthCollapseRate > report.config.maxEarlyCollapseRate) {
  console.log(`early collapse target not met: ${report.bestGeneralStrategy.stats.earlyGrowthCollapseRate} > ${report.config.maxEarlyCollapseRate}`);
}

function executeGeneralSearch(searchConfig, scenarioSampleInput) {
  const warnings = [...scenarioSampleInput.warnings];
  const controlScope = createControlScope(searchConfig);
  warnings.push(...controlScope.warnings);
  const allRuns = [];
  const allAggregates = [];
  const roundSummary = [];
  const strategyById = new Map();
  let centerStrategy = resolveCenterBaseStrategy(searchConfig, controlScope, warnings);
  let mutationRadius = searchConfig.initialMutationRadius;
  let bestOverall;

  for (let round = 1; round <= searchConfig.rounds; round += 1) {
    const searchMode = centerStrategy ? 'centered' : 'random';
    const strategies = createRoundStrategies(searchConfig, round, centerStrategy, mutationRadius, controlScope);
    const candidateRuns = evaluateStrategies(strategies, scenarioSampleInput.scenarios, round);
    const candidateAggregate = rankStrategyStats(
      runtime.aggregateGeneralStrategyRuns(candidateRuns),
      searchConfig.minBossKillRate,
      searchConfig.objective,
      searchConfig.minP10Exp,
      searchConfig.maxEarlyCollapseRate,
    );
    const rankedStrategies = candidateAggregate
      .map((stats) => strategyById.get(stats.candidateId) ?? strategies.find((strategy) => strategy.candidateId === stats.candidateId))
      .filter(Boolean);
    const variants = runtime.createGeneralStrategyVariants({
      config: searchConfig,
      rankedCandidates: rankedStrategies,
    }).map((strategy) => applyControlVariableScope(strategy, controlScope));
    const variantRuns = evaluateStrategies(variants, scenarioSampleInput.scenarios, round);
    const variantAggregate = runtime.aggregateGeneralStrategyRuns(variantRuns);
    const roundAggregates = rankStrategyStats(
      [...candidateAggregate, ...variantAggregate],
      searchConfig.minBossKillRate,
      searchConfig.objective,
      searchConfig.minP10Exp,
      searchConfig.maxEarlyCollapseRate,
    );
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

    if (
      meetsObjectiveGate(bestRoundStats, searchConfig)
      && (!bestOverall || compareEligibleStrategyStats(bestRoundStats, bestOverall.stats, searchConfig.objective) < 0)
    ) {
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
    const bestAttempt = rankStrategyStats(allAggregates, searchConfig.minBossKillRate, searchConfig.objective, searchConfig.minP10Exp, searchConfig.maxEarlyCollapseRate)[0];
    const bestAttemptStrategy = bestAttempt ? strategyById.get(bestAttempt.candidateId) : undefined;

    if (searchConfig.strictBossKillGate || !bestAttempt || !bestAttemptStrategy) {
      throw new Error(`No candidate met minBossKillRate=${searchConfig.minBossKillRate}, minP10Exp=${searchConfig.minP10Exp}, and maxEarlyCollapseRate=${searchConfig.maxEarlyCollapseRate}. Best observed bossKillRate=${bestAttempt?.bossKillRate ?? 0}, p10Exp=${bestAttempt?.p10Exp ?? 0}, earlyGrowthCollapseRate=${bestAttempt?.earlyGrowthCollapseRate ?? 0}, avgExp=${bestAttempt?.avgExp ?? 0}, avgLevel=${bestAttempt?.avgLevel ?? 0}, avgBossDamageDealt=${bestAttempt?.avgBossDamageDealt ?? 0}.`);
    }

    warnings.push(
      `No candidate met minBossKillRate=${searchConfig.minBossKillRate}, minP10Exp=${searchConfig.minP10Exp}, and maxEarlyCollapseRate=${searchConfig.maxEarlyCollapseRate}; using best fallback candidate ${bestAttempt.candidateId} with bossKillRate=${bestAttempt.bossKillRate}, p10Exp=${bestAttempt.p10Exp}, earlyGrowthCollapseRate=${bestAttempt.earlyGrowthCollapseRate}, avgLevel=${bestAttempt.avgLevel}, avgBossDamageDealt=${bestAttempt.avgBossDamageDealt}, avgSurvivalTimeSeconds=${bestAttempt.avgSurvivalTimeSeconds}.`,
    );

    bestOverall = {
      stats: bestAttempt,
      strategy: bestAttemptStrategy,
    };
  }

  const bestGeneralStrategy = runtime.createGeneratedGeneralStrategy({
    config: searchConfig,
    strategy: bestOverall.strategy,
    stats: bestOverall.stats,
  });
  const baselineRuns = evaluateBaselineStrategies(searchConfig, scenarioSampleInput.scenarios, bestOverall.strategy);
  const baselineStats = runtime.aggregateGeneralStrategyRuns(baselineRuns);
  const baselineComparison = runtime.createBaselineComparison(baselineStats);
  const phaseRuns = allRuns.flatMap((run) => run.phaseMetrics ?? []);
  const phaseAggregate = runtime.aggregateStrategyPhaseMetrics(phaseRuns);
  const topByPhase = runtime.selectTopStrategyPhaseAggregates(phaseAggregate, searchConfig.topN);

  return {
    schemaVersion: 1,
    config: searchConfig,
    scenarios: scenarioSampleInput.scenarios,
    candidateRuns: allRuns,
    candidateAggregate: rankStrategyStats(allAggregates, searchConfig.minBossKillRate, searchConfig.objective, searchConfig.minP10Exp, searchConfig.maxEarlyCollapseRate),
    phaseRuns,
    phaseAggregate,
    topByPhase,
    roundSummary,
    bestGeneralStrategy,
    baselineComparison,
    warnings,
  };
}

function createRoundStrategies(searchConfig, round, centerStrategy, mutationRadius, controlScope) {
  if (centerStrategy) {
    const centeredCandidates = runtime.generateCenteredStrategyWeightCandidates({
      count: searchConfig.candidates,
      randomSeed: `${searchConfig.randomSeed}-round-${round}`,
      centerStrategy,
      mutationRadius,
      mutationMode: searchConfig.mutationMode,
    })
      .map((candidate) => strategyDefinitionFromCandidate(searchConfig, candidate, 'centered-phased'))
      .map((strategy) => applyControlVariableScope(strategy, controlScope));

    if (round === 1 && searchConfig.centerBaseStrategy !== 'none') {
      return [
        createCenterBaseStrategyDefinition(searchConfig, centerStrategy),
        ...centeredCandidates,
      ];
    }

    return centeredCandidates;
  }

  return runtime.generateStrategyWeightCandidates({
    count: searchConfig.candidates,
    randomSeed: `${searchConfig.randomSeed}-round-${round}`,
    baseProfile: runtime.profiles.balanced_default,
  })
    .map((candidate) => runtime.createGeneralStrategyFromProfile({
      candidateId: candidate.candidateId,
      strategyVariantId: 'random-phased',
      profile: candidate.profile,
      config: searchConfig,
    }))
    .map((strategy) => applyControlVariableScope(strategy, controlScope));
}

function createCenterBaseStrategyDefinition(searchConfig, centerStrategy) {
  const candidateId = `${searchConfig.centerBaseStrategy}_center_base`;

  return {
    candidateId,
    strategyVariantId: 'center-base',
    strategyProfileHash: runtime.hashStableValue('fnv1a', centerStrategy),
    profile: JSON.parse(JSON.stringify(centerStrategy.phases[0]?.profile ?? runtime.profiles.balanced_default)),
    phasedStrategy: JSON.parse(JSON.stringify(centerStrategy)),
  };
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
          exp: result.exp,
          damageTaken: result.damageTaken,
          damageDealt: result.damageDealt,
          bossDamageDealt: result.bossDamageDealt,
          pickupsCollected: result.pickupsCollected,
          enemiesSpawned: result.enemiesSpawned,
          bossKilled: result.bossKilled,
        },
        damageWindow,
        phaseMetrics: runtime.computeStrategyPhaseMetrics({
          candidateId: strategy.candidateId,
          strategyProfileHash: strategy.strategyProfileHash,
          result,
          phases: config.phases,
        }),
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

  if (searchConfig.strategyFile) {
    baselines.push({
      ...loadStrategyFileDefinition(searchConfig, 'strategy-file-baseline'),
      candidateId: 'strategy_file',
    });
  }

  return evaluateStrategies(baselines, scenarios, 0);
}

function loadExistingGeneratedTestStrategy(searchConfig) {
  const generatedPath = path.join(rootDir, 'src', 'strategy', 'generated', 'generated-test-strategy.json');

  if (!fs.existsSync(generatedPath)) {
    return undefined;
  }

  const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));

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
  fs.writeFileSync(path.join(outputDir, 'phase-runs.json'), `${stablePrettyJson(report.phaseRuns)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-aggregate.json'), `${stablePrettyJson(report.phaseAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-aggregate.csv'), `${runtime.phaseAggregateCsv(report.phaseAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'top-by-phase.csv'), `${runtime.topByPhaseCsv(report.topByPhase)}\n`);
  fs.writeFileSync(path.join(outputDir, 'round-summary.json'), `${stablePrettyJson(report.roundSummary)}\n`);
  fs.writeFileSync(path.join(outputDir, 'round-summary.md'), runtime.roundSummaryMarkdown(report.roundSummary));
  fs.writeFileSync(path.join(outputDir, 'best-general-strategy.json'), `${stablePrettyJson(report.bestGeneralStrategy)}\n`);
  fs.writeFileSync(path.join(outputDir, 'best-general-strategy.md'), runtime.bestGeneralStrategyMarkdown({
    strategy: report.bestGeneralStrategy,
    balancedStats: report.baselineComparison.find((stats) => stats.strategyId === 'balanced_default'),
    bestBaselineStats: report.baselineComparison.find((stats) => stats.strategyId === 'best_general_strategy'),
    baselineComparisonCount: report.baselineComparison.length,
    scenarioCount: report.scenarios.length,
  }));
  fs.writeFileSync(path.join(outputDir, 'baseline-comparison.json'), `${stablePrettyJson(report.baselineComparison)}\n`);
  fs.writeFileSync(path.join(outputDir, 'baseline-comparison.csv'), `${runtime.baselineComparisonCsv(report.baselineComparison)}\n`);
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
  const explicitSeeds = splitCsv(String(getArg(parsedArgs, ['seeds'], '')));
  const objective = parseSearchObjective(String(getArg(parsedArgs, ['objective'], 'growth')));
  const defaultScenarioCount = usesFixedScenario(parsedArgs) ? 1 : 30;
  const defaultDurationSeconds = objective === 'growth' ? 300 : 600;
  const defaultPhase = objective === 'growth'
    ? '0-300'
    : objective === 'boss'
      ? '300-600'
      : '0-300,300-600';

  if (mutationMode !== 'uniform' && mutationMode !== 'gaussian') {
    throw new Error('--mutationMode must be uniform or gaussian.');
  }

  return {
    schemaVersion: 1,
    generatedAt,
    scenarioCount: explicitSeeds.length > 0
      ? explicitSeeds.length
      : positiveIntegerArg(parsedArgs, 'scenarioCount', defaultScenarioCount),
    candidates: positiveIntegerArg(parsedArgs, 'candidates', 200),
    rounds: positiveIntegerArg(parsedArgs, 'rounds', 3),
    seedCount: explicitSeeds.length > 0
      ? 1
      : positiveIntegerArg(parsedArgs, 'seedCount', 5),
    durationSeconds: positiveNumberArg(parsedArgs, 'durationSeconds', defaultDurationSeconds),
    tickMs: positiveIntegerArg(parsedArgs, 'tickMs', 50),
    objective,
    minBossKillRate: rateArg(parsedArgs, 'minBossKillRate', 0),
    minP10Exp: nonNegativeNumberArg(parsedArgs, 'minP10Exp', 0),
    maxEarlyCollapseRate: rateArg(parsedArgs, 'maxEarlyCollapseRate', 1),
    strictBossKillGate: booleanArg(parsedArgs, 'strictBossKillGate', false),
    fallbackBelowBossKillRate: true,
    topN: positiveIntegerArg(parsedArgs, 'topN', 10),
    randomSeed: String(getArg(parsedArgs, ['randomSeed'], 'general-strategy-001')),
    phases: runtime.parseStrategyPhases(String(getArg(parsedArgs, ['phase'], defaultPhase))),
    characterId: String(getArg(parsedArgs, ['characterId'], 'random')),
    stageId: String(getArg(parsedArgs, ['stageId'], 'random')),
    mapId: String(getArg(parsedArgs, ['mapId'], 'random')),
    difficultyId: String(getArg(parsedArgs, ['difficultyId'], 'random')),
    strategyMode: String(getArg(parsedArgs, ['strategyMode'], 'phased')),
    initialMutationRadius: nonNegativeNumberArg(parsedArgs, 'initialMutationRadius', 15),
    mutationDecay: positiveNumberArg(parsedArgs, 'mutationDecay', 0.65),
    mutationMode,
    optimizeLayer: String(getArg(parsedArgs, ['optimizeLayer'], 'all')).toLowerCase(),
    optimizeWeights: splitCsv(String(getArg(parsedArgs, ['optimizeWeights'], ''))),
    optimizePhases: splitCsv(String(getArg(parsedArgs, ['optimizePhase', 'optimizePhases'], ''))),
    controlBaseStrategy: String(getArg(parsedArgs, ['controlBaseStrategy', 'baseStrategy'], 'balanced_default')),
    centerBaseStrategy: String(getArg(parsedArgs, ['centerBaseStrategy', 'centerStrategy'], 'none')).toLowerCase(),
    strategyFile: getArg(parsedArgs, ['strategyFile'], undefined),
    outputDir,
  };
}

function usesFixedScenario(parsedArgs) {
  return ['characterId', 'stageId', 'mapId', 'difficultyId']
    .every((name) => {
      const raw = getArg(parsedArgs, [name], 'random');

      return String(raw).trim().toLowerCase() !== 'random';
    });
}

function createControlScope(searchConfig) {
  const allPaths = runtime.listNumericWeightPaths(runtime.profiles.balanced_default);
  const optimizedPaths = resolveOptimizedWeightPaths(searchConfig, allPaths);
  const optimizedPhaseIds = new Set(searchConfig.optimizePhases ?? []);
  const enabled = optimizedPaths.size > 0
    && (optimizedPaths.size < allPaths.length || optimizedPhaseIds.size > 0);
  const warnings = [];

  if (!enabled) {
    return {
      enabled: false,
      optimizedPaths,
      optimizedPhaseIds,
      baselineStrategy: undefined,
      warnings,
    };
  }

  const baselineStrategy = resolveControlBaselineStrategy(searchConfig, warnings);

  warnings.push(
    `Control-variable search enabled: optimizing ${[...optimizedPaths].sort().join(', ')}${optimizedPhaseIds.size > 0 ? ` in phases ${[...optimizedPhaseIds].sort().join(', ')}` : ''}; non-optimized weights fixed to ${baselineStrategy.candidateId}.`,
  );

  return {
    enabled,
    optimizedPaths,
    optimizedPhaseIds,
    baselineStrategy,
    warnings,
  };
}

function resolveOptimizedWeightPaths(searchConfig, allPaths) {
  if (searchConfig.optimizeWeights.length > 0) {
    const requested = new Set(searchConfig.optimizeWeights);
    const known = new Set(allPaths);

    for (const pathName of requested) {
      if (!known.has(pathName)) {
        throw new Error(`Unknown --optimizeWeights entry "${pathName}".`);
      }
    }

    return requested;
  }

  const layer = searchConfig.optimizeLayer;

  if (layer === 'all') {
    return new Set(allPaths);
  }

  const sectionLayers = new Set(['movement', 'upgrade', 'treasure', 'relic']);

  if (sectionLayers.has(layer)) {
    return new Set(allPaths.filter((pathName) => pathName.startsWith(`${layer}.`)));
  }

  const layerAliases = {
    strategic: [
      'movement.bossBias',
      'movement.farmBias',
      'movement.loopBias',
      'movement.survivalBias',
      'movement.treasureBias',
    ],
    tactical: [
      'movement.combatBias',
      'movement.loopBias',
      'movement.overKitePenalty',
      'movement.treasureBias',
    ],
    micro: [
      'movement.bossBias',
      'movement.overKitePenalty',
      'movement.riskTolerance',
      'movement.survivalBias',
    ],
  };

  if (layerAliases[layer]) {
    const known = new Set(allPaths);

    return new Set(layerAliases[layer].filter((pathName) => known.has(pathName)));
  }

  throw new Error('--optimizeLayer must be all, movement, upgrade, treasure, relic, strategic, tactical, or micro.');
}

function resolveControlBaselineStrategy(searchConfig, warnings) {
  const requested = String(searchConfig.controlBaseStrategy).toLowerCase();

  if (requested === 'strategy_file') {
    const external = loadStrategyFileDefinition(searchConfig, 'strategy-file-control-base');

    warnings.push(`Control baseline initialized from strategy_file: ${searchConfig.strategyFile}`);

    return external;
  }

  if (requested === 'generated_test') {
    const generated = loadExistingGeneratedTestStrategy(searchConfig);

    if (generated) {
      return generated;
    }

    warnings.push('Requested controlBaseStrategy=generated_test, but no generated strategy was available; falling back to balanced_default.');
  }

  if (requested === 'playtest_baseline') {
    return runtime.createGeneralStrategyFromProfile({
      candidateId: 'playtest_baseline_control_base',
      strategyVariantId: 'control-base',
      profile: runtime.profiles.playtest_baseline,
      config: searchConfig,
    });
  }

  return runtime.createGeneralStrategyFromProfile({
    candidateId: 'balanced_default_control_base',
    strategyVariantId: 'control-base',
    profile: runtime.profiles.balanced_default,
    config: searchConfig,
  });
}

function resolveCenterBaseStrategy(searchConfig, controlScope, warnings) {
  const requested = searchConfig.centerBaseStrategy;

  if (requested === 'none' || requested === '') {
    return undefined;
  }

  if (requested === 'generated_test') {
    const generated = loadExistingGeneratedTestStrategy(searchConfig);

    if (generated) {
      warnings.push('Centered search initialized from generated_test.');

      return applyControlVariableScope(generated, controlScope).phasedStrategy;
    }

    throw new Error('Requested centerBaseStrategy=generated_test, but no generated strategy was available.');
  }

  if (requested === 'strategy_file') {
    const external = loadStrategyFileDefinition(searchConfig, 'strategy-file-center-base');

    warnings.push(`Centered search initialized from strategy_file: ${searchConfig.strategyFile}`);

    return applyControlVariableScope(external, controlScope).phasedStrategy;
  }

  if (requested === 'playtest_baseline') {
    warnings.push('Centered search initialized from playtest_baseline.');

    return applyControlVariableScope(runtime.createGeneralStrategyFromProfile({
      candidateId: 'playtest_baseline_center_base',
      strategyVariantId: 'center-base',
      profile: runtime.profiles.playtest_baseline,
      config: searchConfig,
    }), controlScope).phasedStrategy;
  }

  if (requested === 'balanced_default') {
    warnings.push('Centered search initialized from balanced_default.');

    return applyControlVariableScope(runtime.createGeneralStrategyFromProfile({
      candidateId: 'balanced_default_center_base',
      strategyVariantId: 'center-base',
      profile: runtime.profiles.balanced_default,
      config: searchConfig,
    }), controlScope).phasedStrategy;
  }

  throw new Error('--centerBaseStrategy must be none, generated_test, strategy_file, playtest_baseline, or balanced_default.');
}

function loadStrategyFileDefinition(searchConfig, variantId) {
  if (!searchConfig.strategyFile) {
    throw new Error('Requested strategy_file, but --strategyFile was not provided.');
  }

  const strategyPath = path.resolve(rootDir, searchConfig.strategyFile);

  if (!fs.existsSync(strategyPath)) {
    throw new Error(`Strategy file not found: ${searchConfig.strategyFile}`);
  }

  const strategy = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));

  if (!Array.isArray(strategy.phases) || strategy.phases.length === 0) {
    throw new Error(`Strategy file is invalid or has no phases: ${searchConfig.strategyFile}`);
  }

  return {
    candidateId: strategy.id ?? 'strategy_file',
    strategyVariantId: variantId,
    strategyProfileHash: runtime.hashStableValue('fnv1a', strategy),
    profile: JSON.parse(JSON.stringify(strategy.phases[0].profile)),
    phasedStrategy: {
      version: 1,
      id: strategy.id ?? 'strategy_file',
      name: strategy.name ?? 'Strategy File',
      generationMethod: variantId,
      phases: strategy.phases,
    },
  };
}

function applyControlVariableScope(strategy, controlScope) {
  if (!controlScope.enabled) {
    return strategy;
  }

  const scoped = JSON.parse(JSON.stringify(strategy));
  const phases = scoped.phasedStrategy?.phases ?? [];

  for (const phase of phases) {
    const baselineProfile = findBaselineProfileForPhase(controlScope.baselineStrategy, phase)
      ?? controlScope.baselineStrategy.profile;
    const phaseId = `${phase.startSeconds}-${phase.endSeconds}`;
    const phaseOptimized = controlScope.optimizedPhaseIds.size === 0
      || controlScope.optimizedPhaseIds.has(phaseId)
      || controlScope.optimizedPhaseIds.has(String(phase.phaseId ?? ''));

    if (!phaseOptimized) {
      phase.profile = JSON.parse(JSON.stringify(baselineProfile));
      continue;
    }

    for (const pathName of runtime.listNumericWeightPaths(phase.profile)) {
      if (controlScope.optimizedPaths.has(pathName)) {
        continue;
      }

      setProfileWeight(phase.profile, pathName, getProfileWeight(baselineProfile, pathName));
    }
  }

  scoped.profile = JSON.parse(JSON.stringify(phases[0]?.profile ?? scoped.profile));
  scoped.strategyProfileHash = runtime.hashStableValue('fnv1a', scoped.phasedStrategy ?? scoped.profile);

  return scoped;
}

function findBaselineProfileForPhase(baselineStrategy, phase) {
  const baselinePhases = baselineStrategy.phasedStrategy?.phases ?? [];
  const exact = baselinePhases.find((baselinePhase) => (
    baselinePhase.startSeconds === phase.startSeconds
    && baselinePhase.endSeconds === phase.endSeconds
  ));

  if (exact) {
    return exact.profile;
  }

  return baselinePhases
    .map((baselinePhase) => ({
      phase: baselinePhase,
      overlap: Math.min(baselinePhase.endSeconds, phase.endSeconds) - Math.max(baselinePhase.startSeconds, phase.startSeconds),
    }))
    .filter((candidate) => candidate.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.phase.startSeconds - b.phase.startSeconds)[0]
    ?.phase.profile;
}

function createScenarioSample(searchConfig, contentBundle, parsedArgs) {
  const explicitSeeds = splitCsv(String(getArg(parsedArgs, ['seeds'], '')));

  if (explicitSeeds.length === 0) {
    return runtime.sampleGeneralStrategyScenarios({ config: searchConfig, content: contentBundle });
  }

  const warnings = ['Using explicit --seeds; scenarioCount and seedCount do not generate scenario seeds.'];
  const characterId = resolveExplicitScenarioId({
    raw: searchConfig.characterId,
    available: Object.keys(contentBundle?.characters ?? {}).sort(),
    fallback: 'default',
    label: 'characterId',
    warnings,
  });
  const stageId = resolveExplicitScenarioId({
    raw: searchConfig.stageId,
    available: Object.keys(contentBundle?.stages ?? {}).sort(),
    fallback: 'stage_001',
    label: 'stageId',
    warnings,
  });
  const stageMapId = contentBundle?.stages?.[stageId]?.mapId;
  const mapId = resolveExplicitScenarioId({
    raw: searchConfig.mapId === 'random' && stageMapId ? stageMapId : searchConfig.mapId,
    available: Object.keys(contentBundle?.maps ?? {}).sort(),
    fallback: stageMapId ?? 'prototype_field',
    label: 'mapId',
    warnings,
  });
  const difficultyId = resolveExplicitScenarioId({
    raw: searchConfig.difficultyId,
    available: Object.keys(contentBundle?.difficulties ?? {}).sort(),
    fallback: 'normal',
    label: 'difficultyId',
    warnings,
  });

  return {
    scenarios: explicitSeeds.map((seed, index) => ({
      scenarioId: `scenario_${String(index + 1).padStart(3, '0')}`,
      characterId,
      stageId,
      mapId,
      difficultyId,
      seed,
    })),
    warnings,
    source: {
      characterIds: [characterId],
      stageIds: [stageId],
      mapIds: [mapId],
      difficultyIds: [difficultyId],
    },
  };
}

function resolveExplicitScenarioId(input) {
  const requested = splitCsv(input.raw);
  const firstRequested = requested.find((item) => item !== 'random');

  if (firstRequested) {
    return firstRequested;
  }

  const fallback = input.available[0] ?? input.fallback;
  input.warnings.push(`Explicit --seeds used with random ${input.label}; using ${fallback}.`);

  return fallback;
}

function splitCsv(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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

function rateArg(parsedArgs, name, fallback) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`--${name} must be a number between 0 and 1.`);
  }

  return value;
}

function booleanArg(parsedArgs, name, fallback) {
  const value = getArg(parsedArgs, [name], fallback ? 'true' : 'false');

  if (value === true || value === false) {
    return value;
  }

  const normalized = String(value).toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n') {
    return false;
  }

  throw new Error(`--${name} must be true or false.`);
}

function parseSearchObjective(value) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'growth' || normalized === 'boss' || normalized === 'full' || normalized === 'stability') {
    return normalized;
  }

  throw new Error('--objective must be growth, boss, full, or stability.');
}

function rankStrategyStats(stats, minBossKillRate, objective, minP10Exp = 0, maxEarlyCollapseRate = 1) {
  return [...stats].sort((a, b) => compareStrategyStats(a, b, minBossKillRate, objective, minP10Exp, maxEarlyCollapseRate));
}

function compareStrategyStats(a, b, minBossKillRate, objective, minP10Exp, maxEarlyCollapseRate) {
  const requiresBossKillGate = objective !== 'growth' && minBossKillRate > 0;
  const aBossEligible = !requiresBossKillGate || a.bossKillRate >= minBossKillRate;
  const bBossEligible = !requiresBossKillGate || b.bossKillRate >= minBossKillRate;
  const aStabilityEligible = minP10Exp <= 0 || a.p10Exp >= minP10Exp;
  const bStabilityEligible = minP10Exp <= 0 || b.p10Exp >= minP10Exp;
  const aCollapseEligible = a.earlyGrowthCollapseRate <= maxEarlyCollapseRate;
  const bCollapseEligible = b.earlyGrowthCollapseRate <= maxEarlyCollapseRate;
  const aEligible = aBossEligible && aStabilityEligible && aCollapseEligible;
  const bEligible = bBossEligible && bStabilityEligible && bCollapseEligible;

  if (aEligible !== bEligible) {
    return aEligible ? -1 : 1;
  }

  if (aEligible && bEligible) {
    return compareEligibleStrategyStats(a, b, objective);
  }

  return b.bossKillRate - a.bossKillRate
    || a.earlyGrowthCollapseRate - b.earlyGrowthCollapseRate
    || b.p10Exp - a.p10Exp
    || b.avgBossDamageDealt - a.avgBossDamageDealt
    || b.avgLevel - a.avgLevel
    || b.avgSurvivalTimeSeconds - a.avgSurvivalTimeSeconds
    || b.generalFitnessScore - a.generalFitnessScore
    || a.candidateId.localeCompare(b.candidateId);
}

function compareEligibleStrategyStats(a, b, objective = 'full') {
  if (objective === 'growth') {
    return b.completionRate - a.completionRate
      || b.avgSurvivalTimeSeconds - a.avgSurvivalTimeSeconds
      || a.avgDamageTaken - b.avgDamageTaken
      || b.avgLevel - a.avgLevel
      || b.avgExp - a.avgExp
      || b.avgKills - a.avgKills
      || b.generalFitnessScore - a.generalFitnessScore
      || a.candidateId.localeCompare(b.candidateId);
  }

  if (objective === 'boss') {
    return b.bossKillRate - a.bossKillRate
      || b.avgBossDamageDealt - a.avgBossDamageDealt
      || b.avgSurvivalTimeSeconds - a.avgSurvivalTimeSeconds
      || b.avgLevel - a.avgLevel
      || a.avgDamageTaken - b.avgDamageTaken
      || b.generalFitnessScore - a.generalFitnessScore
      || a.candidateId.localeCompare(b.candidateId);
  }

  if (objective === 'stability') {
    return b.completionRate - a.completionRate
      || a.earlyGrowthCollapseRate - b.earlyGrowthCollapseRate
      || b.avgSurvivalTimeSeconds - a.avgSurvivalTimeSeconds
      || b.p10Exp - a.p10Exp
      || b.avgLevel - a.avgLevel
      || b.avgExp - a.avgExp
      || a.avgDamageTaken - b.avgDamageTaken
      || b.generalFitnessScore - a.generalFitnessScore
      || a.candidateId.localeCompare(b.candidateId);
  }

  return b.generalFitnessScore - a.generalFitnessScore
    || a.candidateId.localeCompare(b.candidateId);
}

function meetsObjectiveGate(stats, searchConfig) {
  if (searchConfig.minP10Exp > 0 && stats.p10Exp < searchConfig.minP10Exp) {
    return false;
  }

  if (stats.earlyGrowthCollapseRate > searchConfig.maxEarlyCollapseRate) {
    return false;
  }

  if (searchConfig.objective === 'growth') {
    return true;
  }

  return stats.bossKillRate >= searchConfig.minBossKillRate;
}

function getProfileWeight(profile, pathName) {
  const [section, key] = pathName.split('.');

  return profile[section]?.[key];
}

function setProfileWeight(profile, pathName, value) {
  const [section, key] = pathName.split('.');

  if (!profile[section] || typeof profile[section][key] !== 'number') {
    throw new Error(`Unknown strategy weight "${pathName}".`);
  }

  profile[section][key] = value;
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
  --objective              growth, boss, full, or stability. Defaults to growth; growth defaults to 0-300s, boss/full/stability to 600s windows
  --minBossKillRate        Required boss kill rate, 0-1
  --minP10Exp              Required p10 exp across sampled runs; default 0 disables this stability gate
  --maxEarlyCollapseRate   Maximum rate of runs ending before 180s at level <= 6; default 1 disables this gate
  --strictBossKillGate     true to fail when no candidate meets minBossKillRate; default false keeps best fallback
  --topN                   Top candidate count for topN-median variant
  --randomSeed             Deterministic random seed
  --seeds                  Comma-separated explicit scenario seeds; overrides generated scenario seeds
  --phase                  Phase ranges, e.g. 0-300,300-600
  --characterId            random or comma-separated ids
  --stageId                random or comma-separated ids
  --mapId                  random or comma-separated ids
  --difficultyId           random or comma-separated ids
  --strategyMode           phased
  --initialMutationRadius  Local search initial mutation radius
  --mutationDecay          Radius decay per centered round
  --mutationMode           uniform or gaussian
  --optimizeLayer          all, movement, upgrade, treasure, relic, strategic, tactical, or micro
  --optimizeWeights        Comma-separated exact weight paths, e.g. movement.farmBias,movement.combatBias
  --controlBaseStrategy    balanced_default, playtest_baseline, generated_test, or strategy_file
  --centerBaseStrategy     none, balanced_default, playtest_baseline, generated_test, or strategy_file; starts round 1 as a centered local search
  --strategyFile           External generated strategy JSON used when a base strategy is strategy_file
  --outputDir              Artifact output directory
  --help                   Show this help
`);
}
