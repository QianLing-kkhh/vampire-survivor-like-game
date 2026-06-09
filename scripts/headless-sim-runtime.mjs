import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');
export const outDir = path.join(rootDir, '.tmp', 'headless-sim');

let loadedRuntime;

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

export function loadHeadlessSimulationRuntime() {
  if (loadedRuntime) {
    return loadedRuntime;
  }

  compileCoreSimulation();

  const requireFromOutput = createRequire(path.join(outDir, 'core-sim', 'CoreSimulation.js'));
  const core = requireFromOutput(path.join(outDir, 'core-sim', 'CoreSimulation.js'));
  const defaults = requireFromOutput(path.join(outDir, 'strategy', 'profile', 'AutoStrategyDefaults.js'));

  loadedRuntime = {
    CoreSimulation: core.CoreSimulation,
    profiles: {
      [defaults.DEFAULT_AUTO_STRATEGY_PROFILE_ID]: defaults.DEFAULT_AUTO_STRATEGY_PROFILE,
      [defaults.PLAYTEST_AUTO_STRATEGY_PROFILE_ID]: defaults.PLAYTEST_AUTO_STRATEGY_PROFILE,
    },
  };

  return loadedRuntime;
}

export function createSimulationInputFromArgs(args, overrides = {}) {
  const { profiles } = loadHeadlessSimulationRuntime();
  const strategyProfileId = overrides.strategyProfileId
    ?? getArg(args, ['strategyProfileId', 'strategy'], 'balanced_default');
  const strategyProfile = profiles[strategyProfileId];

  if (!strategyProfile) {
    const available = Object.keys(profiles).join(', ');

    throw new Error(`Unknown strategyProfileId "${strategyProfileId}". Available: ${available}`);
  }

  const durationSeconds = Number(overrides.durationSeconds ?? getArg(args, ['durationSeconds', 'duration'], 300));
  const tickMs = Number(overrides.tickMs ?? getArg(args, ['tickMs', 'deltaMs'], 100));

  return {
    seed: overrides.seed ?? getArg(args, ['seed'], 'headless-test-001'),
    characterId: overrides.characterId ?? getArg(args, ['characterId', 'character'], 'priest'),
    stageId: overrides.stageId ?? getArg(args, ['stageId', 'stage'], 'stage_001'),
    mapId: overrides.mapId ?? getArg(args, ['mapId', 'map'], 'prototype_field'),
    difficultyId: overrides.difficultyId ?? getArg(args, ['difficultyId', 'difficulty'], 'normal'),
    strategyProfileId,
    strategyProfile,
    durationMs: Math.max(1, durationSeconds) * 1000,
    deltaMs: Math.max(16, tickMs),
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

export function resultToCsvRow(result) {
  return [
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
    result.strategyProfileHash,
  ].map(escapeCsv).join(',');
}

export const batchCsvHeader = [
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
  'strategyProfileHash',
].join(',');

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

function escapeCsv(value) {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
