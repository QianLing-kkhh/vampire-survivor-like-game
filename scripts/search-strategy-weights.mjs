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

if (config.optimize) {
  runOptimization(config);
} else {
  const centerStrategy = config.searchMode === 'centered'
    ? loadCenterStrategy(config)
    : undefined;
  const report = executeSearch(config, centerStrategy);

  printConsoleSummary(path.resolve(rootDir, config.outputDir), report);
}

function executeSearch(searchConfig, centerStrategy) {
  const candidates = centerStrategy
  ? runtime.generateCenteredStrategyWeightCandidates({
    count: searchConfig.candidates,
    randomSeed: searchConfig.randomSeed,
    centerStrategy,
    mutationRadius: searchConfig.mutationRadius,
    mutationMode: searchConfig.mutationMode,
    locked: searchConfig.locked,
    ranges: searchConfig.ranges,
  })
  : runtime.generateStrategyWeightCandidates({
    count: searchConfig.candidates,
    randomSeed: searchConfig.randomSeed,
    locked: searchConfig.locked,
    ranges: searchConfig.ranges,
    baseProfile: runtime.profiles.balanced_default,
  });
  const baselineCandidate = createBaselineCandidate();
  const seeds = runtime.createStrategyWeightSearchSeeds(searchConfig.randomSeed, searchConfig.seedCount);
  const phaseRuns = [];
  let runIndex = 1;

  for (const candidate of [...candidates, baselineCandidate]) {
    for (const seed of seeds) {
      const result = runSimulationFromInput({
        seed,
        presetId: searchConfig.presetId,
        runIndex,
        matrixKey: [
          candidate.candidateId,
          seed,
          searchConfig.characterId,
          searchConfig.stageId,
          searchConfig.mapId,
          searchConfig.difficultyId,
          searchConfig.durationSeconds,
          searchConfig.tickMs,
        ].join('|'),
        strategyProfileId: candidate.candidateId,
        strategyProfile: candidate.profile,
        strategyProfileHash: candidate.strategyProfileHash,
        phasedStrategy: candidate.phasedStrategy
          ? { phases: candidate.phasedStrategy.phases }
          : undefined,
        characterId: searchConfig.characterId,
        stageId: searchConfig.stageId,
        mapId: searchConfig.mapId,
        difficultyId: searchConfig.difficultyId,
        durationMs: searchConfig.durationSeconds * 1000,
        deltaMs: searchConfig.tickMs,
        content,
        versionInfo,
      });

      phaseRuns.push(...runtime.computeStrategyPhaseMetrics({
        candidateId: candidate.candidateId,
        strategyProfileHash: candidate.strategyProfileHash,
        result,
        phases: searchConfig.phases,
      }));

      runIndex += 1;
    }
  }

  const phaseAggregate = runtime.aggregateStrategyPhaseMetrics(phaseRuns);
  const topByPhase = runtime.selectTopStrategyPhaseAggregates(
    phaseAggregate,
    searchConfig.topN,
    { excludeCandidateIds: ['balanced_default'] },
  );
  const recommendationTopByPhase = runtime.selectTopStrategyPhaseAggregates(
    phaseAggregate,
    Math.max(searchConfig.topN, 10),
    { excludeCandidateIds: ['balanced_default'] },
  );
  const baselineByPhase = Object.fromEntries(
    searchConfig.phases.map((phase) => [
      phase.phaseId,
      phaseAggregate.find((aggregate) => aggregate.phaseId === phase.phaseId && aggregate.candidateId === 'balanced_default'),
    ]),
  );
  const candidateProfiles = Object.fromEntries(candidates.map((candidate) => [candidate.candidateId, candidate.profile]));
  const candidateProfilesByPhase = Object.fromEntries(candidates.map((candidate) => [
    candidate.candidateId,
    Object.fromEntries(searchConfig.phases.map((phase) => [
      phase.phaseId,
      getCandidateProfileForPhase(candidate, phase),
    ])),
  ]));
  const recommendedStrategies = runtime.createRecommendedPhasedStrategies({
    phases: searchConfig.phases,
    topByPhase: recommendationTopByPhase,
    candidateProfiles,
    candidateProfilesByPhase,
    topN: searchConfig.topN,
  });
  const recommendedStrategy = recommendedStrategies.find((strategy) => strategy.generationMethod === 'top1-phased') ?? recommendedStrategies[0];
  const topWeightDistributionByPhase = runtime.calculateTopWeightDistributionByPhase({
    topByPhase,
    candidates,
  });
  const outputDir = path.resolve(rootDir, searchConfig.outputDir);
  const recommendedStrategyPath = path.join(outputDir, 'recommended-phased-strategy.json');
  const recommendedStrategiesPath = path.join(outputDir, 'recommended-phased-strategies.json');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(recommendedStrategyPath, `${stablePrettyJson(recommendedStrategy)}\n`);
  fs.writeFileSync(recommendedStrategiesPath, `${stablePrettyJson(recommendedStrategies)}\n`);

  const phasedEvaluation = evaluateRecommendedPhasedStrategies(
    JSON.parse(fs.readFileSync(recommendedStrategiesPath, 'utf8')),
    seeds,
    centerStrategy,
    searchConfig,
    baselineCandidate,
  );
  const report = {
    schemaVersion: 1,
    config: searchConfig,
    candidates,
    phaseRuns,
    phaseAggregate,
    topByPhase,
    topWeightDistributionByPhase,
    baselineByPhase,
    phasedEvaluation,
    recommendedStrategy,
    recommendedStrategies,
  };

  writeSearchArtifacts(outputDir, report);

  return report;
}

function runOptimization(baseConfig) {
  const baseOutputDir = baseConfig.outputDir;
  const optimizationDir = path.resolve(rootDir, `${baseOutputDir}_optimization`);
  const rounds = [];
  let centerStrategy = baseConfig.searchMode === 'centered'
    ? loadCenterStrategy(baseConfig)
    : undefined;
  let nextMutationRadius = baseConfig.initialMutationRadius;
  let bestOverall;

  for (let round = 1; round <= baseConfig.rounds; round += 1) {
    const searchMode = centerStrategy ? 'centered' : 'random';
    const roundMutationRadius = centerStrategy ? nextMutationRadius : undefined;
    const roundConfig = {
      ...baseConfig,
      optimize: false,
      generatedAt: baseConfig.generatedAt,
      randomSeed: `${baseConfig.randomSeed}-round-${round}`,
      outputDir: `${baseOutputDir}_round-${round}`,
      searchMode,
      centerProfilePath: centerStrategy ? baseConfig.centerProfilePath : undefined,
      centerStrategyId: centerStrategy?.id,
      mutationRadius: roundMutationRadius,
      mutationMode: centerStrategy ? (baseConfig.mutationMode ?? 'uniform') : undefined,
    };
    const report = executeSearch(roundConfig, centerStrategy);
    const bestRanking = report.phasedEvaluation?.ranking[0];
    const bestStrategy = selectNextCenterStrategy(report, baseConfig.centerStrategyMode);
    const roundSummary = {
      round,
      outputDir: roundConfig.outputDir,
      searchMode,
      centerStrategyId: roundConfig.centerStrategyId,
      mutationRadius: roundMutationRadius,
      bestStrategyId: bestStrategy.id,
      bestGenerationMethod: bestStrategy.generationMethod,
      avgScore: calculateEvaluationAvgScore(report, bestStrategy.id),
      vsBaselineDelta: bestRanking?.totalDeltaFitnessScore ?? 0,
      improvedOverPrevious: rounds.length === 0
        ? true
        : (bestRanking?.totalDeltaFitnessScore ?? 0) > rounds[rounds.length - 1].vsBaselineDelta,
      carryForwardTop: baseConfig.carryForwardTop,
    };

    rounds.push(roundSummary);

    if (!bestOverall || roundSummary.vsBaselineDelta > bestOverall.vsBaselineDelta) {
      bestOverall = {
        ...roundSummary,
        strategy: bestStrategy,
      };
    }

    centerStrategy = bestStrategy;

    if (searchMode === 'centered') {
      nextMutationRadius = Number((nextMutationRadius * baseConfig.mutationDecay).toFixed(6));
    }
  }

  const summary = {
    schemaVersion: 1,
    generatedAt: baseConfig.generatedAt,
    optimize: {
      rounds: baseConfig.rounds,
      initialMutationRadius: baseConfig.initialMutationRadius,
      mutationDecay: baseConfig.mutationDecay,
      centerStrategyMode: baseConfig.centerStrategyMode,
      carryForwardTop: baseConfig.carryForwardTop,
      carryForwardApplied: false,
    },
    rounds,
    bestStrategyId: bestOverall?.strategy.id ?? '',
    bestRound: bestOverall?.round,
    bestVsBaselineDelta: bestOverall?.vsBaselineDelta ?? 0,
    bestAvgScore: bestOverall?.avgScore ?? 0,
  };

  fs.mkdirSync(optimizationDir, { recursive: true });
  fs.writeFileSync(path.join(optimizationDir, 'optimization-summary.json'), `${stablePrettyJson(summary)}\n`);
  fs.writeFileSync(path.join(optimizationDir, 'optimization-summary.md'), optimizationSummaryMarkdown(summary));
  fs.writeFileSync(path.join(optimizationDir, 'best-phased-strategy.json'), `${stablePrettyJson(bestOverall?.strategy ?? {})}\n`);

  console.log(`Strategy optimization complete: ${optimizationDir}`);
  console.log(`best phased strategy: ${summary.bestStrategyId}`);
}

function createSearchConfig(parsedArgs) {
  const presetId = getArg(parsedArgs, ['preset'], undefined);
  const presetMatrix = presetId
    ? runtime.createPresetMatrix(presetId, content)
    : undefined;
  const stageMap = presetMatrix?.stageMaps[0] ?? { stageId: 'stage_001', mapId: content.stages.stage_001?.mapId ?? 'prototype_field' };
  const phases = runtime.parseStrategyPhases(String(getArg(parsedArgs, ['phase'], '0-30,30-60,60-120,120-300')));
  const durationSeconds = Number(getArg(parsedArgs, ['durationSeconds'], presetMatrix?.durationsSeconds[0] ?? Math.max(...phases.map((phase) => phase.endSeconds))));
  const generatedAt = new Date().toISOString();
  const randomSeed = String(getArg(parsedArgs, ['randomSeed'], 'strategy-search-001'));
  const centerProfilePath = getArg(parsedArgs, ['centerProfile'], undefined);
  const mutationMode = String(getArg(parsedArgs, ['mutationMode'], 'uniform')).toLowerCase();
  const optimize = parsedArgs.optimize !== undefined;
  const centerStrategyMode = String(getArg(parsedArgs, ['centerStrategyMode'], 'best'));

  if (mutationMode !== 'uniform' && mutationMode !== 'gaussian') {
    throw new Error('--mutationMode must be either "uniform" or "gaussian".');
  }

  if (!['best', 'top10-average', 'top10-median', 'topN-median'].includes(centerStrategyMode)) {
    throw new Error('--centerStrategyMode must be best, top10-average, top10-median, or topN-median.');
  }

  const outputDir = String(getArg(
    parsedArgs,
    ['outputDir', 'out'],
    path.join('reports', 'sim-search', formatTimestampForPath(generatedAt)),
  ));

  validateContentCoordinate(
    String(getArg(parsedArgs, ['characterId'], presetMatrix?.characters[0] ?? 'priest')),
    String(getArg(parsedArgs, ['stageId'], stageMap.stageId)),
    String(getArg(parsedArgs, ['mapId'], stageMap.mapId)),
    String(getArg(parsedArgs, ['difficultyId'], presetMatrix?.difficulties[0] ?? 'normal')),
  );

  return {
    schemaVersion: 1,
    generatedAt,
    presetId,
    phases,
    candidates: positiveIntegerArg(parsedArgs, 'candidates', 100),
    seedCount: positiveIntegerArg(parsedArgs, 'seedCount', presetMatrix?.seeds.length ?? 10),
    durationSeconds: positiveNumber(durationSeconds, 'durationSeconds'),
    tickMs: positiveIntegerArg(parsedArgs, 'tickMs', presetMatrix?.tickMs[0] ?? 100),
    characterId: String(getArg(parsedArgs, ['characterId'], presetMatrix?.characters[0] ?? 'priest')),
    stageId: String(getArg(parsedArgs, ['stageId'], stageMap.stageId)),
    mapId: String(getArg(parsedArgs, ['mapId'], stageMap.mapId)),
    difficultyId: String(getArg(parsedArgs, ['difficultyId'], presetMatrix?.difficulties[0] ?? 'normal')),
    outputDir,
    randomSeed,
    topN: positiveIntegerArg(parsedArgs, 'topN', 10),
    searchMode: centerProfilePath ? 'centered' : 'random',
    centerProfilePath: centerProfilePath ? String(centerProfilePath) : undefined,
    centerStrategyId: getArg(parsedArgs, ['centerStrategyId'], undefined),
    mutationRadius: centerProfilePath ? nonNegativeNumberArg(parsedArgs, 'mutationRadius', 10) : undefined,
    mutationMode: centerProfilePath ? mutationMode : undefined,
    optimize,
    rounds: optimize ? positiveIntegerArg(parsedArgs, 'rounds', 3) : undefined,
    initialMutationRadius: optimize ? nonNegativeNumberArg(parsedArgs, 'initialMutationRadius', 12) : undefined,
    mutationDecay: optimize ? positiveNumberArg(parsedArgs, 'mutationDecay', 0.6) : undefined,
    centerStrategyMode: optimize ? centerStrategyMode : undefined,
    carryForwardTop: optimize ? positiveIntegerArg(parsedArgs, 'carryForwardTop', 0, { allowZero: true }) : undefined,
    locked: runtime.parseWeightLocks(parsedArgs.locked),
    ranges: runtime.parseWeightRanges(parsedArgs.range),
  };
}

function loadCenterStrategy(searchConfig) {
  const resolvedPath = path.resolve(rootDir, searchConfig.centerProfilePath);
  const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const strategies = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.recommendedStrategies)
      ? raw.recommendedStrategies
      : raw.phases
        ? [raw]
        : [];

  if (strategies.length === 0) {
    throw new Error(`No phased strategy found in center profile "${searchConfig.centerProfilePath}".`);
  }

  const selectedId = searchConfig.centerStrategyId
    ?? (strategies.length > 1 ? findBestStrategyIdNearCenterProfile(resolvedPath) : undefined)
    ?? strategies[0].id;
  const selected = strategies.find((strategy) => strategy.id === selectedId);

  if (!selected) {
    throw new Error(`Center strategy "${selectedId}" was not found in "${searchConfig.centerProfilePath}".`);
  }

  searchConfig.centerStrategyId = selected.id;

  return selected;
}

function findBestStrategyIdNearCenterProfile(centerProfilePath) {
  const evaluationPath = path.join(path.dirname(centerProfilePath), 'phased-evaluation.json');

  if (!fs.existsSync(evaluationPath)) {
    return undefined;
  }

  const evaluation = JSON.parse(fs.readFileSync(evaluationPath, 'utf8'));

  return evaluation.bestStrategyId
    ?? evaluation.ranking?.[0]?.strategyId
    ?? undefined;
}

function validateContentCoordinate(characterId, stageId, mapId, difficultyId) {
  if (!content.characters[characterId]) {
    throw new Error(`Unknown characterId "${characterId}".`);
  }

  if (!content.stages[stageId]) {
    throw new Error(`Unknown stageId "${stageId}".`);
  }

  if (!content.maps[mapId]) {
    throw new Error(`Unknown mapId "${mapId}".`);
  }

  if (content.stages[stageId].mapId !== mapId) {
    throw new Error(`Stage/map mismatch: stage "${stageId}" uses "${content.stages[stageId].mapId}", not "${mapId}".`);
  }

  if (!content.difficulties[difficultyId]) {
    throw new Error(`Unknown difficultyId "${difficultyId}".`);
  }
}

function writeSearchArtifacts(outputDir, report) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'candidates.jsonl'), `${report.candidates.map((candidate) => stableStringify(candidate)).join('\n')}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-runs.jsonl'), `${report.phaseRuns.map((metric) => stableStringify(metric)).join('\n')}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-aggregate.json'), `${stablePrettyJson(report.phaseAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-aggregate.csv'), `${runtime.phaseAggregateCsv(report.phaseAggregate)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phase-weight-distribution.json'), `${stablePrettyJson(report.topWeightDistributionByPhase)}\n`);
  fs.writeFileSync(path.join(outputDir, 'top-by-phase.json'), `${stablePrettyJson(report.topByPhase)}\n`);
  fs.writeFileSync(path.join(outputDir, 'top-by-phase.csv'), `${runtime.topByPhaseCsv(report.topByPhase)}\n`);
  fs.writeFileSync(path.join(outputDir, 'recommended-phased-strategy.json'), `${stablePrettyJson(report.recommendedStrategy)}\n`);
  fs.writeFileSync(path.join(outputDir, 'recommended-phased-strategies.json'), `${stablePrettyJson(report.recommendedStrategies)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phased-evaluation.json'), `${stablePrettyJson(report.phasedEvaluation)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phased-evaluation.csv'), `${runtime.phasedEvaluationCsv(report.phasedEvaluation)}\n`);
  fs.writeFileSync(path.join(outputDir, 'phased-evaluation.md'), runtime.phasedEvaluationMarkdown(report.phasedEvaluation));
  fs.writeFileSync(path.join(outputDir, 'summary.md'), runtime.strategyWeightSearchSummaryMarkdown(report));
  fs.writeFileSync(path.join(outputDir, 'config.json'), `${stablePrettyJson(report.config)}\n`);
}

function evaluateRecommendedPhasedStrategies(
  recommendedStrategies,
  seeds,
  centerStrategyForEvaluation,
  searchConfig,
  baselineCandidate,
) {
  const evaluationPhaseRuns = [];
  let evaluationRunIndex = 1;

  for (const seed of seeds) {
    const baselineResult = runSimulationFromInput({
      seed,
      presetId: searchConfig.presetId,
      runIndex: evaluationRunIndex,
      matrixKey: [
        'balanced_default',
        seed,
        searchConfig.characterId,
        searchConfig.stageId,
        searchConfig.mapId,
        searchConfig.difficultyId,
        searchConfig.durationSeconds,
        searchConfig.tickMs,
        'phased-eval',
      ].join('|'),
      strategyProfileId: baselineCandidate.candidateId,
      strategyProfile: baselineCandidate.profile,
      strategyProfileHash: baselineCandidate.strategyProfileHash,
      characterId: searchConfig.characterId,
      stageId: searchConfig.stageId,
      mapId: searchConfig.mapId,
      difficultyId: searchConfig.difficultyId,
      durationMs: searchConfig.durationSeconds * 1000,
      deltaMs: searchConfig.tickMs,
      content,
      versionInfo,
    });

    evaluationPhaseRuns.push(...runtime.computeStrategyPhaseMetrics({
      candidateId: baselineCandidate.candidateId,
      strategyProfileHash: baselineCandidate.strategyProfileHash,
      result: baselineResult,
      phases: searchConfig.phases,
    }));
    evaluationRunIndex += 1;

    if (centerStrategyForEvaluation) {
      const centerHash = runtime.hashStableValue('fnv1a', centerStrategyForEvaluation);
      const centerResult = runSimulationFromInput({
        seed,
        presetId: searchConfig.presetId,
        runIndex: evaluationRunIndex,
        matrixKey: [
          centerStrategyForEvaluation.id,
          seed,
          searchConfig.characterId,
          searchConfig.stageId,
          searchConfig.mapId,
          searchConfig.difficultyId,
          searchConfig.durationSeconds,
          searchConfig.tickMs,
          'center-eval',
        ].join('|'),
        strategyProfileId: centerStrategyForEvaluation.id,
        strategyProfile: centerStrategyForEvaluation.phases[0]?.profile ?? runtime.profiles.balanced_default,
        strategyProfileHash: centerHash,
        phasedStrategy: {
          phases: centerStrategyForEvaluation.phases,
        },
        characterId: searchConfig.characterId,
        stageId: searchConfig.stageId,
        mapId: searchConfig.mapId,
        difficultyId: searchConfig.difficultyId,
        durationMs: searchConfig.durationSeconds * 1000,
        deltaMs: searchConfig.tickMs,
        content,
        versionInfo,
      });

      evaluationPhaseRuns.push(...runtime.computeStrategyPhaseMetrics({
        candidateId: centerStrategyForEvaluation.id,
        strategyProfileHash: centerHash,
        result: centerResult,
        phases: searchConfig.phases,
      }));
      evaluationRunIndex += 1;
    }

    for (const recommendedStrategy of recommendedStrategies) {
      const phasedCandidateId = recommendedStrategy.id;
      const phasedStrategyHash = runtime.hashStableValue('fnv1a', recommendedStrategy);
      const phasedResult = runSimulationFromInput({
        seed,
        presetId: searchConfig.presetId,
        runIndex: evaluationRunIndex,
        matrixKey: [
          phasedCandidateId,
          seed,
          searchConfig.characterId,
          searchConfig.stageId,
          searchConfig.mapId,
          searchConfig.difficultyId,
          searchConfig.durationSeconds,
          searchConfig.tickMs,
          'phased-eval',
        ].join('|'),
        strategyProfileId: phasedCandidateId,
        strategyProfile: recommendedStrategy.phases[0]?.profile ?? runtime.profiles.balanced_default,
        strategyProfileHash: phasedStrategyHash,
        phasedStrategy: {
          phases: recommendedStrategy.phases,
        },
        characterId: searchConfig.characterId,
        stageId: searchConfig.stageId,
        mapId: searchConfig.mapId,
        difficultyId: searchConfig.difficultyId,
        durationMs: searchConfig.durationSeconds * 1000,
        deltaMs: searchConfig.tickMs,
        content,
        versionInfo,
      });

      evaluationPhaseRuns.push(...runtime.computeStrategyPhaseMetrics({
        candidateId: phasedCandidateId,
        strategyProfileHash: phasedStrategyHash,
        result: phasedResult,
        phases: searchConfig.phases,
      }));
      evaluationRunIndex += 1;
    }
  }

  const evaluationAggregate = runtime.aggregateStrategyPhaseMetrics(evaluationPhaseRuns);
  const centerEvaluation = centerStrategyForEvaluation
    ? runtime.createStrategyPhasedEvaluationReport({
      strategyId: centerStrategyForEvaluation.id,
      generationMethod: centerStrategyForEvaluation.generationMethod ?? 'center-phased',
      baselineCandidateId: baselineCandidate.candidateId,
      phasedCandidateId: centerStrategyForEvaluation.id,
      seeds,
      phaseAggregate: evaluationAggregate.filter((aggregate) => (
        aggregate.candidateId === baselineCandidate.candidateId
        || aggregate.candidateId === centerStrategyForEvaluation.id
      )),
      phases: searchConfig.phases,
    })
    : undefined;
  const evaluations = recommendedStrategies.map((recommendedStrategy) => runtime.createStrategyPhasedEvaluationReport({
    strategyId: recommendedStrategy.id,
    generationMethod: recommendedStrategy.generationMethod,
    baselineCandidateId: baselineCandidate.candidateId,
    phasedCandidateId: recommendedStrategy.id,
    seeds,
    phaseAggregate: evaluationAggregate.filter((aggregate) => (
      aggregate.candidateId === baselineCandidate.candidateId
      || aggregate.candidateId === recommendedStrategy.id
    )),
    phases: searchConfig.phases,
  }));

  return runtime.createStrategyPhasedEvaluationSuiteReport({
    baselineCandidateId: baselineCandidate.candidateId,
    centerEvaluation,
    seeds,
    evaluations,
  });
}

function createBaselineCandidate() {
  return {
    candidateId: 'balanced_default',
    strategyProfileHash: runtime.hashStableValue('fnv1a', runtime.profiles.balanced_default),
    profile: runtime.profiles.balanced_default,
  };
}

function selectNextCenterStrategy(report, centerStrategyMode = 'best') {
  const methodByMode = {
    'top10-average': 'top10-average-phased',
    'top10-median': 'top10-median-phased',
    'topN-median': 'topN-median-phased',
  };
  const targetMethod = methodByMode[centerStrategyMode];
  const targetId = centerStrategyMode === 'best'
    ? report.phasedEvaluation?.bestStrategyId
    : undefined;

  return report.recommendedStrategies.find((strategy) => strategy.id === targetId)
    ?? report.recommendedStrategies.find((strategy) => strategy.generationMethod === targetMethod)
    ?? report.recommendedStrategies[0];
}

function calculateEvaluationAvgScore(report, strategyId) {
  const evaluation = report.phasedEvaluation?.evaluations.find((item) => item.strategyId === strategyId);

  if (!evaluation) {
    return 0;
  }

  const total = evaluation.comparisonByPhase.reduce((sum, comparison) => sum + comparison.phasedAvgScoreGain, 0);

  return Number((total / Math.max(1, evaluation.comparisonByPhase.length)).toFixed(4));
}

function optimizationSummaryMarkdown(summary) {
  const lines = [
    '# Strategy Weight Optimization',
    '',
    `- Rounds: ${summary.optimize.rounds}`,
    `- Initial mutation radius: ${summary.optimize.initialMutationRadius}`,
    `- Mutation decay: ${summary.optimize.mutationDecay}`,
    `- Center strategy mode: ${summary.optimize.centerStrategyMode}`,
    `- Carry forward top: ${summary.optimize.carryForwardTop}`,
    `- Carry forward applied: ${summary.optimize.carryForwardApplied ? 'yes' : 'no'}`,
    `- Best strategy: ${summary.bestStrategyId}`,
    `- Best round: ${summary.bestRound ?? ''}`,
    `- Best vs baseline delta: ${summary.bestVsBaselineDelta}`,
    `- Best avgScore: ${summary.bestAvgScore}`,
    '',
    '| Round | Search Mode | Center Strategy | Mutation Radius | Best Strategy | AvgScore | Vs Baseline Delta | Improved | Output |',
    '| ---: | --- | --- | ---: | --- | ---: | ---: | --- | --- |',
  ];

  for (const round of summary.rounds) {
    lines.push(`| ${round.round} | ${round.searchMode} | ${round.centerStrategyId ?? ''} | ${round.mutationRadius ?? ''} | ${round.bestStrategyId} | ${round.avgScore} | ${round.vsBaselineDelta} | ${round.improvedOverPrevious ? 'yes' : 'no'} | ${round.outputDir} |`);
  }

  return `${lines.join('\n')}\n`;
}

function printConsoleSummary(outputDir, report) {
  console.log(`Strategy weight search complete: ${outputDir}`);

  for (const phase of report.config.phases) {
    const best = report.topByPhase[phase.phaseId]?.[0];

    if (best) {
      console.log(`${phase.phaseId}: ${best.candidateId} fitness=${best.phaseFitnessScore}`);
    }
  }

  if (report.phasedEvaluation?.bestStrategyId) {
    console.log(`best phased strategy: ${report.phasedEvaluation.bestStrategyId}`);
  }
}

function positiveIntegerArg(parsedArgs, name, fallback, options = {}) {
  const value = Number(getArg(parsedArgs, [name], fallback));

  if (!Number.isInteger(value) || (options.allowZero ? value < 0 : value <= 0)) {
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

function positiveNumber(value, name) {
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

function getCandidateProfileForPhase(candidate, phase) {
  const phasedProfile = candidate.phasedStrategy?.phases.find((item) => (
    item.startSeconds === phase.startSeconds
    && item.endSeconds === phase.endSeconds
  ))?.profile;

  return phasedProfile ?? candidate.profile;
}

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function formatTimestampForPath(timestamp) {
  return timestamp.replace(/[:.]/g, '-');
}

function printHelp() {
  console.log(`Usage:
  npm.cmd run simulate:search -- --phase 0-30,30-60,60-120 --candidates 500 --seedCount 10 --durationSeconds 120 --preset strategy-quick

Options:
  --phase             Comma-separated phase ranges in seconds, e.g. 0-30,30-60,60-120
  --candidates        Number of random strategy profiles to generate
  --seedCount         Number of deterministic simulation seeds per candidate
  --durationSeconds   Simulation duration in seconds
  --tickMs            Fixed simulation tick size in milliseconds
  --characterId       Character id
  --stageId           Stage id
  --mapId             Map id
  --difficultyId      Difficulty id
  --preset            Optional matrix preset used for default coordinate values
  --outputDir         Artifact output directory
  --randomSeed        Deterministic candidate and run seed prefix
  --topN              Number of top candidates per phase
  --centerProfile     Optional recommended phased strategy JSON for centered local search
  --centerStrategyId  Strategy id when --centerProfile contains multiple strategies
  --mutationRadius    Local mutation radius for centered search
  --mutationMode      centered search mutation mode: uniform or gaussian
  --optimize          Run global search plus multiple centered local-search rounds
  --rounds            Number of optimization rounds
  --initialMutationRadius  First centered optimization round mutation radius
  --mutationDecay     Multiplier applied after each centered optimization round
  --centerStrategyMode  Next-round center: best, top10-average, top10-median, or topN-median
  --carryForwardTop   Record top candidate carry-forward count; first version does not do multi-center search
  --locked            Fixed weights, e.g. movement.survivalBias=70,upgrade.evolutionPriority=80
  --range             Search ranges, e.g. movement.riskTolerance=10:60,movement.farmBias=40:100
  --help              Show this help
`);
}
