import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');
export const outDir = path.join(rootDir, '.tmp', 'headless-sim', `process-${process.pid}`);

let loadedRuntime;
let loadedContent;
let loadedVersionInfo;
let compileCleanupRegistered = false;

export function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

export function getArg(args, names, fallback) {
  for (const name of names) {
    if (args[name] !== undefined) {
      return args[name];
    }
  }

  return fallback;
}

export function getListArg(args, names, fallback) {
  const value = getArg(args, names, undefined);

  if (value === undefined) {
    return fallback;
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadHeadlessSimulationRuntime() {
  if (loadedRuntime) {
    return loadedRuntime;
  }

  compileCoreSimulation();

  const requireFromOutput = createRequire(path.join(outDir, 'core-sim', 'CoreSimulation.js'));
  const core = requireFromOutput(path.join(outDir, 'core-sim', 'CoreSimulation.js'));
  const matrix = requireFromOutput(path.join(outDir, 'core-sim', 'SimulationMatrix.js'));
  const aggregate = requireFromOutput(path.join(outDir, 'core-sim', 'SimulationAggregate.js'));
  const compare = requireFromOutput(path.join(outDir, 'core-sim', 'SimulationCompare.js'));
  const stable = requireFromOutput(path.join(outDir, 'core-sim', 'StableJson.js'));
  const strategyCandidate = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyWeightCandidate.js'));
  const strategyPhase = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyPhaseMetrics.js'));
  const strategyReport = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyWeightSearchReport.js'));
  const strategySearch = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyWeightSearch.js'));
  const strategyOptimizationAnalyzer = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyOptimizationAnalyzer.js'));
  const strategyStableProfileBuilder = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyStableProfileBuilder.js'));
  const strategyPatternDiscovery = requireFromOutput(path.join(outDir, 'sim-analysis', 'StrategyPatternDiscovery.js'));
  const generalStrategySearch = requireFromOutput(path.join(outDir, 'sim-analysis', 'GeneralStrategySearch.js'));
  const generalStrategySampler = requireFromOutput(path.join(outDir, 'sim-analysis', 'GeneralStrategyScenarioSampler.js'));
  const generalStrategyEvaluator = requireFromOutput(path.join(outDir, 'sim-analysis', 'GeneralStrategyEvaluator.js'));
  const generatedTestStrategyWriter = requireFromOutput(path.join(outDir, 'sim-analysis', 'GeneratedTestStrategyWriter.js'));
  const defaults = requireFromOutput(path.join(outDir, 'strategy', 'profile', 'AutoStrategyDefaults.js'));

  loadedRuntime = {
    ...core,
    ...matrix,
    ...aggregate,
    ...compare,
    ...stable,
    ...strategyCandidate,
    ...strategyPhase,
    ...strategyReport,
    ...strategySearch,
    ...strategyOptimizationAnalyzer,
    ...strategyStableProfileBuilder,
    ...strategyPatternDiscovery,
    ...generalStrategySearch,
    ...generalStrategySampler,
    ...generalStrategyEvaluator,
    ...generatedTestStrategyWriter,
    profiles: {
      [defaults.DEFAULT_AUTO_STRATEGY_PROFILE_ID]: defaults.DEFAULT_AUTO_STRATEGY_PROFILE,
      [defaults.PLAYTEST_AUTO_STRATEGY_PROFILE_ID]: defaults.PLAYTEST_AUTO_STRATEGY_PROFILE,
    },
  };

  return loadedRuntime;
}

export function loadSimulationContent() {
  if (loadedContent) {
    return loadedContent;
  }

  const characters = readJson('src/data/characters.json');
  const stages = readJson('src/data/stages.json');
  const maps = readJson('src/data/maps.json');
  const enemies = readJson('src/data/enemies.json');
  const weapons = readJson('src/data/weapons.json');
  const waves = readJson('src/data/waves.json');

  loadedContent = {
    characters,
    stages,
    maps,
    enemies,
    weapons,
    waves,
    difficulties: {
      normal: {
        id: 'normal',
        enemyHpMultiplier: 1,
        enemyDamageMultiplier: 1,
        enemySpeedMultiplier: 1,
        spawnRateMultiplier: 1,
        treasureDropMultiplier: 1,
        expMultiplier: 1,
        bossHpMultiplier: 1,
        bossDamageMultiplier: 1,
        bossSkillCooldownMultiplier: 1,
        scoreMultiplier: 1,
      },
      easy: {
        id: 'easy',
        enemyHpMultiplier: 0.85,
        enemyDamageMultiplier: 0.85,
        enemySpeedMultiplier: 0.95,
        spawnRateMultiplier: 0.9,
        treasureDropMultiplier: 1.1,
        expMultiplier: 1,
        bossHpMultiplier: 0.9,
        bossDamageMultiplier: 0.9,
        bossSkillCooldownMultiplier: 1.1,
        scoreMultiplier: 0.8,
      },
      hard: {
        id: 'hard',
        enemyHpMultiplier: 1.25,
        enemyDamageMultiplier: 1.25,
        enemySpeedMultiplier: 1.05,
        spawnRateMultiplier: 1.15,
        treasureDropMultiplier: 0.9,
        expMultiplier: 1,
        bossHpMultiplier: 1.25,
        bossDamageMultiplier: 1.25,
        bossSkillCooldownMultiplier: 0.9,
        scoreMultiplier: 1.25,
      },
    },
  };

  return loadedContent;
}

export function loadSimulationVersionInfo() {
  if (loadedVersionInfo) {
    return loadedVersionInfo;
  }

  loadedVersionInfo = {
    gameVersion: readTsConst('src/version/GameVersion.ts', 'GAME_VERSION', '0.1.0-prototype'),
    contentHash: hashStableJson({
      weapons: loadSimulationContent().weapons,
      enemies: loadSimulationContent().enemies,
      waves: loadSimulationContent().waves,
      characters: loadSimulationContent().characters,
      stages: loadSimulationContent().stages,
      maps: loadSimulationContent().maps,
    }),
    saveSchemaVersion: Number(readTsConst('src/version/SchemaVersion.ts', 'SAVE_SCHEMA_VERSION', '13')),
    csvSchemaVersion: Number(readTsConst('src/version/SchemaVersion.ts', 'CSV_SCHEMA_VERSION', '10')),
    replaySchemaVersion: Number(readTsConst('src/version/SchemaVersion.ts', 'REPLAY_SCHEMA_VERSION', '1')),
    customStageSchemaVersion: Number(readTsConst('src/version/SchemaVersion.ts', 'CUSTOM_STAGE_SCHEMA_VERSION', '1')),
  };

  return loadedVersionInfo;
}

export function createMatrixFromArgs(args, options = {}) {
  const runtime = loadHeadlessSimulationRuntime();
  const content = loadSimulationContent();
  const preset = options.preset ?? getArg(args, ['preset'], undefined);

  if (preset) {
    return applyMatrixArgOverrides(
      runtime.createPresetMatrix(preset, content),
      args,
      content,
    );
  }

  const seedCount = Math.max(1, Math.floor(Number(getArg(args, ['seedCount'], 1))));
  const seedPrefix = String(getArg(args, ['seedPrefix'], 'headless-seed'));
  const seedFallback = seedCount > 1
    ? Array.from({ length: seedCount }, (_, index) => `${seedPrefix}-${String(index + 1).padStart(3, '0')}`)
    : [String(getArg(args, ['seed'], 'headless-test-001'))];
  const stageId = String(getArg(args, ['stageId', 'stage'], 'stage_001'));
  const mapId = String(getArg(args, ['mapId', 'map'], content.stages[stageId]?.mapId ?? 'prototype_field'));

  return {
    presetId: getArg(args, ['presetId'], undefined),
    seeds: getListArg(args, ['seeds'], seedFallback),
    strategyProfileIds: getListArg(args, ['strategyProfileId', 'strategy'], ['balanced_default']),
    characters: getListArg(args, ['characters', 'characterId', 'character'], ['priest']),
    stageMaps: [{ stageId, mapId }],
    difficulties: getListArg(args, ['difficulties', 'difficultyId', 'difficulty'], ['normal']),
    durationsSeconds: getListArg(args, ['durationsSeconds', 'durationSeconds', 'duration'], ['300']).map(Number),
    tickMs: getListArg(args, ['tickMs', 'deltaMs'], ['100']).map(Number),
  };
}

export function createSimulationInputFromArgs(args, overrides = {}) {
  const runtime = loadHeadlessSimulationRuntime();
  const content = loadSimulationContent();
  const matrix = createMatrixFromArgs(args);
  if (matrix.strategyProfileIds.includes('generated_test')) {
    requireGeneratedTestStrategy();
  }
  const catalog = loadHeadlessStrategyCatalog(runtime);
  const runs = runtime.expandSimulationMatrix(matrix, catalog.profiles, content, catalog.phasedStrategies);
  const run = {
    ...runs[0],
    ...overrides,
  };

  return {
    ...run,
    content,
    versionInfo: loadSimulationVersionInfo(),
  };
}

export function expandRunsFromArgs(args) {
  const runtime = loadHeadlessSimulationRuntime();
  const content = loadSimulationContent();
  const matrix = createMatrixFromArgs(args);
  if (matrix.strategyProfileIds.includes('generated_test')) {
    requireGeneratedTestStrategy();
  }
  const catalog = loadHeadlessStrategyCatalog(runtime);
  const runs = runtime.expandSimulationMatrix(matrix, catalog.profiles, content, catalog.phasedStrategies);

  return {
    matrix,
    runs: runs.map((run) => ({
      ...run,
      content,
      versionInfo: loadSimulationVersionInfo(),
    })),
  };
}

export function runSimulationFromInput(input) {
  const { CoreSimulation } = loadHeadlessSimulationRuntime();
  const simulation = new CoreSimulation(input);

  return simulation.run();
}

export function runSimulationFromArgs(args, overrides = {}) {
  return runSimulationFromInput(createSimulationInputFromArgs(args, overrides));
}

export function runSimulationBatchFromArgs(args) {
  const { runs, matrix } = expandRunsFromArgs(args);
  const results = runs.map((run) => runSimulationFromInput(run));

  return { matrix, results };
}

export function createAggregate(results) {
  return loadHeadlessSimulationRuntime().aggregateSimulationResults(results);
}

export function writeHeadlessArtifacts(outPath, input) {
  const outDirPath = path.resolve(rootDir, outPath);
  const aggregate = input.aggregate ?? createAggregate(input.results);
  const manifest = createManifest(input.matrix, input.results, input.commandArgs ?? []);
  const diagnostics = createHeadlessDiagnostics(input.results);

  fs.mkdirSync(outDirPath, { recursive: true });
  fs.writeFileSync(path.join(outDirPath, 'manifest.json'), `${stablePrettyJson(manifest)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'run-results.jsonl'), `${input.results.map((result) => stableStringify(result)).join('\n')}\n`);
  fs.writeFileSync(path.join(outDirPath, 'run-results.csv'), `${batchCsvHeader}\n${input.results.map(resultToCsvRow).join('\n')}\n`);
  fs.writeFileSync(path.join(outDirPath, 'aggregate.json'), `${stablePrettyJson(aggregate)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'aggregate.md'), loadHeadlessSimulationRuntime().aggregateToMarkdown(aggregate, input.results));
  fs.writeFileSync(path.join(outDirPath, 'diagnostics.json'), `${stablePrettyJson(diagnostics)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'diagnostics.md'), diagnosticsToMarkdown(diagnostics));

  return { outDir: outDirPath, manifest, aggregate };
}

export function createHeadlessDiagnostics(results) {
  const runs = results.map((result) => createRunDiagnostics(result));
  const failureBuckets = {};

  for (const run of runs) {
    failureBuckets[run.failureBucket] = (failureBuckets[run.failureBucket] ?? 0) + 1;
  }

  return {
    schemaVersion: 1,
    runCount: runs.length,
    failureBuckets,
    bucketExamples: createBucketExamples(runs),
    runs,
  };
}

function createBucketExamples(runs) {
  const examples = {};

  for (const run of [...runs].sort(compareDiagnosticRuns)) {
    if (!examples[run.failureBucket]) {
      examples[run.failureBucket] = {
        seed: run.seed,
        result: run.result,
        survivalTimeSeconds: run.survivalTimeSeconds,
        level: run.level,
        damageTaken: run.damageTaken,
        bossDamageDealt: run.bossDamageDealt,
        firstCriticalPhaseId: run.firstCriticalPhaseId,
      };
    }
  }

  return examples;
}

function compareDiagnosticRuns(left, right) {
  return left.survivalTimeSeconds - right.survivalTimeSeconds
    || left.level - right.level
    || left.damageTaken - right.damageTaken
    || left.seed.localeCompare(right.seed);
}

function createRunDiagnostics(result) {
  const trace = Array.isArray(result.trace) ? result.trace : [];
  const phaseSummaries = createPhaseSummaries(trace);
  const finalTrace = trace[trace.length - 1];
  const lowGrowthPhase = phaseSummaries.find((phase) => (
    phase.endSeconds <= 180
    && phase.levelEnd <= 6
    && phase.damageTakenDelta >= 45
  ));

  return {
    seed: result.seed,
    strategyProfileId: result.strategyProfileId,
    result: result.result,
    survivalTimeSeconds: result.survivalTimeSeconds,
    level: result.level,
    exp: result.exp,
    damageTaken: result.damageTaken,
    damageDealt: result.damageDealt,
    bossDamageDealt: result.bossDamageDealt,
    bossKilled: result.bossKilled,
    failureBucket: classifyRunFailure(result, phaseSummaries),
    firstCriticalPhaseId: lowGrowthPhase?.phaseId,
    finalSnapshot: finalTrace ? createTraceSnapshot(finalTrace) : undefined,
    phaseSummaries,
  };
}

function createPhaseSummaries(trace) {
  const phases = [
    { phaseId: '0-90', startSeconds: 0, endSeconds: 90 },
    { phaseId: '90-180', startSeconds: 90, endSeconds: 180 },
    { phaseId: '180-300', startSeconds: 180, endSeconds: 300 },
    { phaseId: '300+', startSeconds: 300, endSeconds: Number.POSITIVE_INFINITY },
  ];

  return phases.map((phase) => createPhaseSummary(trace, phase));
}

function createPhaseSummary(trace, phase) {
  const start = findTraceAtOrAfter(trace, phase.startSeconds * 1000) ?? trace[0];
  const end = findTraceAtOrBefore(trace, phase.endSeconds * 1000) ?? trace[trace.length - 1];

  if (!start || !end || end.timeMs < phase.startSeconds * 1000) {
    return {
      phaseId: phase.phaseId,
      startSeconds: phase.startSeconds,
      endSeconds: Number.isFinite(phase.endSeconds) ? phase.endSeconds : undefined,
      observed: false,
      levelStart: 0,
      levelEnd: 0,
      expDelta: 0,
      killsDelta: 0,
      damageTakenDelta: 0,
      damageDealtDelta: 0,
      bossDamageDelta: 0,
      pickupsDelta: 0,
      enemyCountEnd: 0,
      pickupCountEnd: 0,
    };
  }

  return {
    phaseId: phase.phaseId,
    startSeconds: phase.startSeconds,
    endSeconds: Number.isFinite(phase.endSeconds) ? phase.endSeconds : undefined,
    observed: true,
    levelStart: start.level,
    levelEnd: end.level,
    expDelta: Math.max(0, end.exp - start.exp),
    killsDelta: Math.max(0, end.kills - start.kills),
    damageTakenDelta: roundMetric(end.damageTaken - start.damageTaken),
    damageDealtDelta: Math.max(0, end.damageDealt - start.damageDealt),
    bossDamageDelta: Math.max(0, end.bossDamageDealt - start.bossDamageDealt),
    pickupsDelta: Math.max(0, end.pickupsCollected - start.pickupsCollected),
    enemyCountEnd: end.enemyCount,
    pickupCountEnd: end.pickupCount,
  };
}

function classifyRunFailure(result, phaseSummaries) {
  if (result.bossKilled || result.result === 'victory') {
    return 'victory';
  }

  if (result.result === 'completed') {
    return result.bossDamageDealt > 0 ? 'boss-timeout' : 'completed-no-boss-output';
  }

  if (result.survivalTimeSeconds < 180 && result.level <= 6) {
    return 'early-growth-collapse';
  }

  if (result.survivalTimeSeconds < 300) {
    return 'midgame-pressure-death';
  }

  const bossPhase = phaseSummaries.find((phase) => phase.phaseId === '300+');

  if (bossPhase?.observed && bossPhase.damageTakenDelta > 0) {
    return 'boss-phase-death';
  }

  return 'late-run-death';
}

function createTraceSnapshot(point) {
  return {
    timeSeconds: roundMetric(point.timeMs / 1000),
    level: point.level,
    exp: point.exp,
    playerHp: roundMetric(point.playerHp),
    playerMaxHp: roundMetric(point.playerMaxHp),
    enemyCount: point.enemyCount,
    pickupCount: point.pickupCount,
    kills: point.kills,
    damageTaken: roundMetric(point.damageTaken),
    damageDealt: point.damageDealt,
    bossDamageDealt: point.bossDamageDealt,
  };
}

function diagnosticsToMarkdown(diagnostics) {
  const lines = [
    '# Headless Diagnostics',
    '',
    `Run count: ${diagnostics.runCount}`,
    '',
    '## Failure Buckets',
    '',
    '| Bucket | Runs |',
    '| --- | ---: |',
  ];

  for (const [bucket, count] of Object.entries(diagnostics.failureBuckets)) {
    lines.push(`| ${bucket} | ${count} |`);
  }

  lines.push('', '## Bucket Examples', '', '| Bucket | Seed | Result | Survival | Level | Damage | Boss Damage | Critical Phase |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');

  for (const [bucket, example] of Object.entries(diagnostics.bucketExamples ?? {})) {
    lines.push([
      bucket,
      example.seed,
      example.result,
      example.survivalTimeSeconds,
      example.level,
      example.damageTaken,
      example.bossDamageDealt,
      example.firstCriticalPhaseId ?? '',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('', '## Runs', '', '| Seed | Result | Survival | Level | Damage | Boss Damage | Bucket | Critical Phase |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |');

  for (const run of diagnostics.runs) {
    lines.push([
      run.seed,
      run.result,
      run.survivalTimeSeconds,
      run.level,
      run.damageTaken,
      run.bossDamageDealt,
      run.failureBucket,
      run.firstCriticalPhaseId ?? '',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');

  return `${lines.join('\n')}\n`;
}

function findTraceAtOrAfter(trace, timeMs) {
  return trace.find((point) => point.timeMs >= timeMs);
}

function findTraceAtOrBefore(trace, timeMs) {
  if (!Number.isFinite(timeMs)) {
    return trace[trace.length - 1];
  }

  for (let index = trace.length - 1; index >= 0; index -= 1) {
    if (trace[index].timeMs <= timeMs) {
      return trace[index];
    }
  }

  return undefined;
}

function roundMetric(value) {
  return Number((Number(value) || 0).toFixed(2));
}

export function readAggregateFromPath(inputPath) {
  const resolved = path.resolve(rootDir, inputPath);
  const stat = fs.statSync(resolved);
  const aggregatePath = stat.isDirectory() ? path.join(resolved, 'aggregate.json') : resolved;

  return JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));
}

export function writeCompareArtifacts(outPath, report) {
  const outDirPath = path.resolve(rootDir, outPath);

  fs.mkdirSync(outDirPath, { recursive: true });
  fs.writeFileSync(path.join(outDirPath, 'compare.json'), `${stablePrettyJson(report)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'compare.md'), loadHeadlessSimulationRuntime().compareToMarkdown(report));

  return outDirPath;
}

export function resultToCsvRow(result) {
  return [
    result.presetId ?? '',
    result.runIndex,
    result.matrixKey,
    result.strategyProfileId,
    result.seed,
    result.characterId,
    result.stageId,
    result.mapId,
    result.difficultyId,
    result.result,
    result.survivalTimeSeconds,
    result.durationSeconds,
    result.tickMs,
    result.level,
    result.kills,
    result.exp,
    result.score,
    result.damageDealt,
    result.bossDamageDealt ?? 0,
    result.damageTaken,
    result.pickupsCollected,
    result.enemiesSpawned,
    result.bossKilled,
    result.endlessStarted,
    result.endlessScalingLevel,
    result.strategyProfileHash,
    result.metadata.contentHash,
    result.leaderboardKey,
  ].map(escapeCsv).join(',');
}

export const batchCsvHeader = [
  'presetId',
  'runIndex',
  'matrixKey',
  'strategyProfileId',
  'seed',
  'characterId',
  'stageId',
  'mapId',
  'difficultyId',
  'result',
  'survivalTimeSeconds',
  'durationSeconds',
  'tickMs',
  'level',
  'kills',
  'exp',
  'score',
  'damageDealt',
  'bossDamageDealt',
  'damageTaken',
  'pickupsCollected',
  'enemiesSpawned',
  'bossKilled',
  'endlessStarted',
  'endlessScalingLevel',
  'strategyProfileHash',
  'contentHash',
  'leaderboardKey',
].join(',');

function createManifest(matrix, results, commandArgs) {
  const versionInfo = loadSimulationVersionInfo();

  return {
    schemaVersion: 1,
    tool: 'headless-sim',
    generatedAt: new Date(0).toISOString(),
    commandArgs,
    gameVersion: versionInfo.gameVersion,
    contentHash: versionInfo.contentHash,
    csvSchemaVersion: versionInfo.csvSchemaVersion,
    presetId: matrix.presetId,
    matrixConfigHash: hashStableJson(matrix),
    runCount: results.length,
    matrix,
  };
}

function applyMatrixArgOverrides(matrix, args, content) {
  const strategyProfileIds = getArg(args, ['strategyProfileId', 'strategy'], undefined);
  const seedCount = getArg(args, ['seedCount'], undefined);
  const durationSeconds = getArg(args, ['durationSeconds', 'duration'], undefined);
  const tickMs = getArg(args, ['tickMs', 'deltaMs'], undefined);
  const characterIds = getArg(args, ['characters', 'characterId', 'character'], undefined);
  const difficultyIds = getArg(args, ['difficulties', 'difficultyId', 'difficulty'], undefined);
  const stageId = getArg(args, ['stageId', 'stage'], undefined);
  const mapId = getArg(args, ['mapId', 'map'], undefined);
  const next = { ...matrix };

  if (strategyProfileIds !== undefined) {
    next.strategyProfileIds = splitList(strategyProfileIds);
  }

  if (seedCount !== undefined) {
    const count = Math.max(1, Math.floor(Number(seedCount)));
    const seedPrefix = String(getArg(args, ['seedPrefix'], matrix.presetId ?? 'headless-seed'));
    next.seeds = Array.from({ length: count }, (_, index) => `${seedPrefix}-${String(index + 1).padStart(3, '0')}`);
  }

  if (durationSeconds !== undefined) {
    next.durationsSeconds = splitList(durationSeconds).map(Number);
  }

  if (tickMs !== undefined) {
    next.tickMs = splitList(tickMs).map(Number);
  }

  if (characterIds !== undefined) {
    next.characters = splitList(characterIds);
  }

  if (difficultyIds !== undefined) {
    next.difficulties = splitList(difficultyIds);
  }

  if (stageId !== undefined || mapId !== undefined) {
    const resolvedStageId = String(stageId ?? matrix.stageMaps[0]?.stageId ?? 'stage_001');
    const resolvedMapId = String(mapId ?? content.stages[resolvedStageId]?.mapId ?? matrix.stageMaps[0]?.mapId ?? 'prototype_field');
    next.stageMaps = [{ stageId: resolvedStageId, mapId: resolvedMapId }];
  }

  return next;
}

function splitList(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadHeadlessStrategyCatalog(runtime = loadHeadlessSimulationRuntime()) {
  const catalog = {
    profiles: { ...runtime.profiles },
    phasedStrategies: {},
  };
  const generated = loadGeneratedTestStrategyIfRequested();

  if (generated) {
    const firstPhase = generated.phases[0];
    catalog.profiles.generated_test = firstPhase.profile;
    catalog.phasedStrategies.generated_test = {
      phases: generated.phases.map((phase) => ({
        startSeconds: phase.startSeconds,
        endSeconds: phase.endSeconds,
        profile: phase.profile,
      })),
    };
  }

  return catalog;
}

export function loadGeneratedTestStrategyIfRequested() {
  const strategyPath = path.join(rootDir, 'src', 'strategy', 'generated', 'generated-test-strategy.json');

  if (!fs.existsSync(strategyPath)) {
    return undefined;
  }

  const raw = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));

  if (raw.id === 'generated_test' && Array.isArray(raw.phases) && raw.phases.length > 0) {
    return raw;
  }

  return undefined;
}

export function requireGeneratedTestStrategy() {
  const strategyPath = path.join(rootDir, 'src', 'strategy', 'generated', 'generated-test-strategy.json');

  if (!fs.existsSync(strategyPath)) {
    throw new Error('generated_test strategy is not installed. Run npm.cmd run simulate:apply-generated-strategy -- --source <best-general-strategy.json> first.');
  }

  const raw = JSON.parse(fs.readFileSync(strategyPath, 'utf8'));

  if (raw.id !== 'generated_test' || !Array.isArray(raw.phases) || raw.phases.length === 0) {
    throw new Error('generated_test strategy file is not applied or is invalid. Run npm.cmd run simulate:apply-generated-strategy -- --source <best-general-strategy.json> first.');
  }

  return raw;
}

function compileCoreSimulation() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  registerCompileCleanup();

  const compiler = getTypeScriptCompilerCommand();
  const compile = spawnSync(compiler.command, [...compiler.args, '-p', 'tsconfig.core-sim.json', '--outDir', outDir], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
  });

  if (compile.status !== 0) {
    const details = [compile.error?.message, compile.stdout, compile.stderr].filter(Boolean).join('\n').trim();

    throw new Error(`core-sim TypeScript compile failed\n${details}`);
  }

  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
}

function registerCompileCleanup() {
  if (compileCleanupRegistered) {
    return;
  }

  compileCleanupRegistered = true;
  process.once('exit', () => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });
}

function getTypeScriptCompilerCommand() {
  const localCompilerScript = path.join(
    rootDir,
    'node_modules',
    'typescript',
    'bin',
    'tsc',
  );

  if (fs.existsSync(localCompilerScript)) {
    return { command: process.execPath, args: [localCompilerScript] };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['exec', 'tsc', '--'],
  };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function readTsConst(relativePath, constName, fallback) {
  const text = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const stringMatch = text.match(new RegExp(`export const ${constName} = ['"]([^'"]+)['"]`));
  const numberMatch = text.match(new RegExp(`export const ${constName} = ([0-9]+)`));

  return stringMatch?.[1] ?? numberMatch?.[1] ?? fallback;
}

function hashStableJson(value) {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  const text = stableStringify(value);

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash1 = Math.imul(hash1 ^ code, 2654435761);
    hash2 = Math.imul(hash2 ^ code, 1597334677);
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507)
    ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507)
    ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

  const combined = 4294967296 * (2097151 & hash2) + (hash1 >>> 0);
  return `ch_${combined.toString(16)}`;
}

export function stableStringify(value) {
  if (value === undefined) {
    return 'null';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function stablePrettyJson(value) {
  return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
}

function escapeCsv(value) {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
