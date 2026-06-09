import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');
export const outDir = path.join(rootDir, '.tmp', 'headless-sim');

let loadedRuntime;
let loadedContent;
let loadedVersionInfo;

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
    return runtime.createPresetMatrix(preset, content);
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
  const runs = runtime.expandSimulationMatrix(matrix, runtime.profiles, content);
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
  const runs = runtime.expandSimulationMatrix(matrix, runtime.profiles, content);

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

  fs.mkdirSync(outDirPath, { recursive: true });
  fs.writeFileSync(path.join(outDirPath, 'manifest.json'), `${stablePrettyJson(manifest)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'run-results.jsonl'), `${input.results.map((result) => stableStringify(result)).join('\n')}\n`);
  fs.writeFileSync(path.join(outDirPath, 'run-results.csv'), `${batchCsvHeader}\n${input.results.map(resultToCsvRow).join('\n')}\n`);
  fs.writeFileSync(path.join(outDirPath, 'aggregate.json'), `${stablePrettyJson(aggregate)}\n`);
  fs.writeFileSync(path.join(outDirPath, 'aggregate.md'), loadHeadlessSimulationRuntime().aggregateToMarkdown(aggregate));

  return { outDir: outDirPath, manifest, aggregate };
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

function compileCoreSimulation() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const compiler = getTypeScriptCompilerCommand();
  const compile = spawnSync(compiler.command, [...compiler.args, '-p', 'tsconfig.core-sim.json'], {
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
